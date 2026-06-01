#!/usr/bin/env python3
"""
Operation Git Shit Done — Mortgage Job Hunter  v2
=================================================
Aggregates job postings from Greenhouse + Lever public APIs (no auth needed),
scores every result against Aza's resume profile using compound keyword matching,
applies geo filtering (Bay Area hybrid/onsite OK | all else must be remote),
flags stale requisitions open >60 days as cold-outreach targets,
and outputs a single ranked markdown report + ready-to-click search URLs.

Usage:
    python job_hunter.py               # Full scan, all companies
    python job_hunter.py --tier 1      # Tier 1 companies only (fastest)
    python job_hunter.py --tier 2      # Tier 1 + 2
    python job_hunter.py --quick       # Skip API calls, search URLs only
    python job_hunter.py --type imb    # Filter by type: imb|bank|tech_vendor|fintech|consulting|servicer|gse|mi|title|data
    python job_hunter.py --min 30      # Min score threshold (default: 20)
    python job_hunter.py --all-geo     # Include geo-mismatch jobs (normally hidden)
    python job_hunter.py --stale-only  # Only show stale reqs (>60 days) for cold outreach

Output:
    job_hunter/output/job_report_YYYYMMDD_HHMM.md
"""

import json
import re
import sys
import time
import requests
from datetime import datetime, date
from pathlib import Path
from pathlib import Path
from urllib.parse import quote_plus

# ─────────────────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────────────────

BASE_DIR   = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

REGISTRY_FILE  = BASE_DIR / "company_registry.json"
KEYWORDS_FILE  = BASE_DIR / "keyword_matrix.json"
RESUME_PROFILE = BASE_DIR / "resume_profile.json"

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_MIN_SCORE    = 18
REQUEST_TIMEOUT      = 10     # seconds
REQUEST_DELAY        = 0.3    # seconds between calls
MAX_SNIPPET_CHARS    = 350
MAX_JOBS_PER_SECTION = 50
STALE_REQ_DAYS       = 60     # flag if open longer than this

# Bay Area location terms — hybrid/onsite OK for these
BAY_AREA_TERMS = [
    "san jose", "san francisco", "sf bay", "bay area", "silicon valley",
    "santa clara", "san mateo", "palo alto", "mountain view", "sunnyvale",
    "fremont", "hayward", "oakland", "berkeley", "emeryville",
    "pleasanton", "walnut creek", "san ramon", "concord", "dublin",
    "redwood city", "menlo park", "foster city", "milpitas", "cupertino",
    "campbell", "los gatos", "saratoga", "san leandro", "livermore",
    "alameda", "marin", "san rafael", "novato",
    # broad California fallback (most CA offices are driveable for hybrid)
    ", ca", "california",
]

REMOTE_TERMS = [
    "remote", "anywhere", "distributed", "work from home", "wfh",
    "fully remote", "100% remote", "virtual", "telecommute",
    "remote-first", "remote first", "remote/hybrid", "hybrid/remote",
]

# ─────────────────────────────────────────────────────────────────────────────
# GEO CLASSIFIER
# ─────────────────────────────────────────────────────────────────────────────

def classify_geo(location: str) -> dict:
    """
    Bay Area / hybrid = OK.
    Remote (anywhere) = OK.
    Specific out-of-area onsite = MISMATCH (hidden by default, flagged for cold outreach).
    """
    if not location:
        return {"geo_ok": True, "label": "Remote/Unspecified — OK", "remote": True, "bay_area": False}

    loc = location.lower()

    is_remote   = any(t in loc for t in REMOTE_TERMS)
    is_bay_area = any(t in loc for t in BAY_AREA_TERMS)

    if is_remote:
        return {"geo_ok": True,  "label": "Remote — OK",                     "remote": True,  "bay_area": False}
    if is_bay_area:
        return {"geo_ok": True,  "label": "Bay Area Hybrid/Onsite — OK",     "remote": False, "bay_area": True}

    # Workday "N Locations" — treat as unknown/remote-possible
    import re as _re
    if _re.match(r'^\d+\s+location', loc):
        return {"geo_ok": True, "label": f"Multi-Location (verify): {location}", "remote": False, "bay_area": False}

    # Out-of-area, not flagged remote
    return     {"geo_ok": False, "label": f"Out-of-Area: {location}",        "remote": False, "bay_area": False}


# ─────────────────────────────────────────────────────────────────────────────
# STALE REQ DETECTOR
# ─────────────────────────────────────────────────────────────────────────────

def days_open(posted_date: str) -> int:
    """Returns days since posting, or -1 if unknown."""
    if not posted_date:
        return -1
    try:
        posted = datetime.strptime(posted_date[:10], "%Y-%m-%d")
        return (datetime.now() - posted).days
    except Exception:
        return -1


def stale_label(days: int) -> str:
    if days < 0:
        return "Posted: unknown"
    if days > STALE_REQ_DAYS:
        return f"STALE REQ — {days}d open — COLD OUTREACH TARGET"
    return f"{days}d open"


# ─────────────────────────────────────────────────────────────────────────────
# API FETCHERS
# ─────────────────────────────────────────────────────────────────────────────

def fetch_greenhouse_jobs(slug: str, company_name: str) -> list[dict]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
    try:
        r = requests.get(url, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            return [
                {
                    "title":       j.get("title", ""),
                    "company":     company_name,
                    "location":    j.get("location", {}).get("name", ""),
                    "url":         j.get("absolute_url", ""),
                    "description": _strip_html(j.get("content", "")),
                    "posted":      (j.get("updated_at") or "")[:10],
                    "source":      "Greenhouse",
                }
                for j in r.json().get("jobs", [])
            ]
        if r.status_code == 404:
            print(f"    [MISS ] {company_name}: Greenhouse slug '{slug}' not found")
        else:
            print(f"    [WARN ] {company_name}: Greenhouse HTTP {r.status_code}")
    except requests.exceptions.Timeout:
        print(f"    [TIMEOUT] {company_name} Greenhouse")
    except Exception as e:
        print(f"    [ERROR] {company_name} Greenhouse: {e}")
    return []


def fetch_workday_jobs(tenant: str, wday_n: int, site: str, company_name: str) -> list[dict]:
    from datetime import timedelta
    base = f"https://{tenant}.wd{wday_n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs"
    headers = {"Content-Type": "application/json"}
    searches = ["product manager", "business analyst", "program manager"]
    seen_urls: set = set()
    results: list[dict] = []

    for term in searches:
        try:
            r = requests.post(base, json={"limit": 20, "offset": 0, "searchText": term},
                              headers=headers, timeout=REQUEST_TIMEOUT)
            if r.status_code == 200:
                for j in r.json().get("jobPostings", []):
                    ext = j.get("externalPath", "")
                    url = f"https://{tenant}.wd{wday_n}.myworkdayjobs.com{ext}"
                    if url in seen_urls:
                        continue
                    seen_urls.add(url)
                    posted = ""
                    ps = (j.get("postedOn") or "").lower()
                    if "today" in ps:
                        posted = datetime.now().strftime("%Y-%m-%d")
                    else:
                        m = re.search(r"(\d+)\s+day", ps)
                        if m:
                            posted = (datetime.now() - timedelta(days=int(m.group(1)))).strftime("%Y-%m-%d")
                        else:
                            m2 = re.search(r"(\d+)\s+month", ps)
                            if m2:
                                posted = (datetime.now() - timedelta(days=int(m2.group(1))*30)).strftime("%Y-%m-%d")
                    results.append({
                        "title":       j.get("title", ""),
                        "company":     company_name,
                        "location":    j.get("locationsText", ""),
                        "url":         url,
                        "description": " ".join(str(x) for x in j.get("bulletFields", [])),
                        "posted":      posted,
                        "source":      "Workday",
                    })
            elif r.status_code == 404:
                print(f"    [MISS ] {company_name}: Workday tenant '{tenant}' / site '{site}' not found")
                return []
            else:
                print(f"    [WARN ] {company_name}: Workday HTTP {r.status_code}")
                return []
        except requests.exceptions.Timeout:
            print(f"    [TIMEOUT] {company_name} Workday")
            return []
        except Exception as e:
            print(f"    [ERROR] {company_name} Workday: {e}")
            return []
        time.sleep(REQUEST_DELAY)

    return results


def fetch_chrisman_jobs() -> list[dict]:
    """
    Fetch from Chrisman Commentary mortgage job board (Niceboard API, board_id=3934).
    Fetches all jobs across pages and lets the scoring engine filter by role + domain.
    Mortgage-specific board — most postings are industry-relevant by definition.
    """
    base = "https://jobs.chrismancommentary.com/api/jobs"
    seen_ids: set = set()
    results: list[dict] = []
    page = 1

    while True:
        try:
            params = {
                "keyword": "",
                "limit": 100,
                "page": page,
                "sortby": "newest",
                "company": "all",
                "jobtype": "[]",
                "category": "[]",
                "secondary_category": "[]",
                "tags": "[]",
                "city": "[]",
                "state": "[]",
                "country": "[]",
                "remote_ok": "false",
                "remote_only": "false",
                "salary_timeframe": "",
                "salary_min": "",
                "salary_max": "",
                "custom_fields": "{}",
            }
            r = requests.get(base, params=params, timeout=REQUEST_TIMEOUT)
            if r.status_code != 200:
                print(f"    [WARN ] Chrisman Commentary: HTTP {r.status_code}")
                break

            data = r.json()
            jobs = data.get("jobs", [])
            if not jobs:
                break

            for j in jobs:
                jid = str(j.get("id", ""))
                if jid in seen_ids:
                    continue
                seen_ids.add(jid)

                listing_url = f"https://jobs.chrismancommentary.com/job/{jid}-{j.get('slug', '')}"
                ats_url = j.get("apply_url") or listing_url

                location = j.get("location_name", "")
                if j.get("is_remote") or j.get("remote_only"):
                    location = (location + " (Remote)").strip() if location else "Remote"

                results.append({
                    "title":       j.get("title", ""),
                    "company":     j.get("company_name", ""),
                    "location":    location,
                    "url":         ats_url,
                    "description": _strip_html(j.get("description_html", "")),
                    "posted":      (j.get("published_at") or "")[:10],
                    "source":      "Chrisman Commentary",
                })

            total_count = data.get("count", 0)
            if len(seen_ids) >= total_count or len(jobs) < 100:
                break
            page += 1
            time.sleep(REQUEST_DELAY)

        except requests.exceptions.Timeout:
            print(f"    [TIMEOUT] Chrisman Commentary (page {page})")
            break
        except Exception as e:
            print(f"    [ERROR] Chrisman Commentary: {e}")
            break

    return results


def fetch_lever_jobs(slug: str, company_name: str) -> list[dict]:
    url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
    try:
        r = requests.get(url, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            jobs = r.json()
            if not isinstance(jobs, list):
                return []
            results = []
            for j in jobs:
                desc_parts = [j.get("descriptionPlain", "")]
                for block in j.get("lists", []):
                    content = block.get("content", [])
                    if isinstance(content, list):
                        desc_parts.extend(content)
                    desc_parts.append(block.get("text", ""))
                desc_parts.append(j.get("additional", ""))
                description = _strip_html(" ".join(str(p) for p in desc_parts))

                posted = ""
                if j.get("createdAt"):
                    try:
                        posted = datetime.fromtimestamp(j["createdAt"] / 1000).strftime("%Y-%m-%d")
                    except Exception:
                        pass

                results.append({
                    "title":       j.get("text", ""),
                    "company":     company_name,
                    "location":    j.get("categories", {}).get("location", ""),
                    "url":         j.get("hostedUrl", ""),
                    "description": description,
                    "posted":      posted,
                    "source":      "Lever",
                })
            return results
        if r.status_code == 404:
            print(f"    [MISS ] {company_name}: Lever slug '{slug}' not found")
        else:
            print(f"    [WARN ] {company_name}: Lever HTTP {r.status_code}")
    except requests.exceptions.Timeout:
        print(f"    [TIMEOUT] {company_name} Lever")
    except Exception as e:
        print(f"    [ERROR] {company_name} Lever: {e}")
    return []


def fetch_ashby_jobs(org: str, company_name: str) -> list[dict]:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{org}"
    try:
        r = requests.get(url, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            postings = r.json().get("jobPostings", [])
            results = []
            for j in postings:
                loc = ""
                if j.get("isRemote"):
                    loc = "Remote"
                elif j.get("locationName"):
                    loc = j["locationName"]
                posted = (j.get("publishedDate") or "")[:10]
                results.append({
                    "title":       j.get("title", ""),
                    "company":     company_name,
                    "location":    loc,
                    "url":         j.get("jobUrl", ""),
                    "description": _strip_html(j.get("descriptionHtml", "")),
                    "posted":      posted,
                    "source":      "Ashby",
                })
            return results
        if r.status_code == 404:
            print(f"    [MISS ] {company_name}: Ashby org '{org}' not found")
        else:
            print(f"    [WARN ] {company_name}: Ashby HTTP {r.status_code}")
    except requests.exceptions.Timeout:
        print(f"    [TIMEOUT] {company_name} Ashby")
    except Exception as e:
        print(f"    [ERROR] {company_name} Ashby: {e}")
    return []


# ─────────────────────────────────────────────────────────────────────────────
# SCORING ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def score_job(job: dict, keyword_matrix: dict, resume: dict) -> tuple[int, list[str]]:
    """
    Score against keyword matrix + resume bonus keywords.
    Hard filters: must match role_titles AND mortgage_domain groups.
    Returns (score, matched_groups).
    """
    MORTGAGE_COMPANY_TYPES = {"imb", "servicer", "mi", "mi_insurer", "gse", "consulting", "tech_vendor"}
    domain_hint = " mortgage home loans loan origination" if job.get("company_type", "") in MORTGAGE_COMPANY_TYPES else ""
    text = (job.get("title", "") + " " + job.get("description", "") + " " + job.get("company", "") + domain_hint).lower()
    total_score  = 0
    matched_groups = []
    has_role   = False
    has_domain = False

    for group_name, group_data in keyword_matrix.items():
        weight  = group_data.get("weight", 1)
        terms   = group_data.get("terms", [])
        matched = [t for t in terms if t.lower() in text]

        if matched:
            group_score = weight * min(len(matched), 3)
            total_score += group_score
            matched_groups.append(f"{group_name}({len(matched)})")
            if group_name == "role_titles":
                has_role = True
            if group_name == "mortgage_domain":
                has_domain = True

    if not has_role or not has_domain:
        return 0, []

    # Resume bonus: specific rare skills in JD
    bonus_matched = [k for k in resume.get("score_bonus_keywords", []) if k.lower() in text]
    if bonus_matched:
        bonus = min(len(bonus_matched) * 3, 15)
        total_score += bonus
        matched_groups.append(f"RESUME_BONUS(+{bonus}:{','.join(bonus_matched[:4])})")

    return total_score, matched_groups


# ─────────────────────────────────────────────────────────────────────────────
# SEARCH URL GENERATORS
# ─────────────────────────────────────────────────────────────────────────────

LINKEDIN_QUERIES = [
    ('("Product Manager" OR "Platform Owner" OR "Product Owner") AND ("mortgage" OR "LOS" OR "loan origination")',
     "PM / Platform Owner × Mortgage LOS"),
    ('("Technical Product Manager" OR "TPM") AND ("mortgage" OR "fintech" OR "lending")',
     "Technical PM × Mortgage / Fintech"),
    ('("Business Systems Analyst" OR "BSA" OR "Sr. BA" OR "Lead BA") AND ("mortgage" OR "LOS" OR "Encompass")',
     "BSA / Sr. BA × Mortgage / Encompass"),
    ('("Product Manager" OR "Product Owner") AND ("AI" OR "agentic" OR "automation") AND "mortgage"',
     "PM × AI / Agentic × Mortgage"),
    ('("Encompass" OR "BytePro" OR "MISMO" OR "ICE Mortgage") AND ("Product Manager" OR "Business Analyst")',
     "LOS Platform Expertise × PM / BA"),
    ('("Delivery Lead" OR "Program Manager" OR "Product Lead") AND ("mortgage" OR "LOS") AND ("AI" OR "technology")',
     "Delivery Lead × MortgageTech"),
    ('("Director" OR "VP" OR "Head of") AND "Product" AND ("mortgage" OR "home lending" OR "residential lending")',
     "Director / VP Product × Mortgage"),
    ('("document intelligence" OR "OCR" OR "document automation") AND ("mortgage" OR "lending")',
     "Document Intelligence × Mortgage"),
    ('"MISMO" AND ("product" OR "analyst" OR "architect" OR "integration")',
     "MISMO Specialist Roles"),
    ('("workflow orchestration" OR "agentic AI") AND ("mortgage" OR "fintech" OR "financial services")',
     "Agentic AI / Workflow × FinServ"),
    ('("GSE" OR "Fannie Mae" OR "Freddie Mac") AND ("product manager" OR "business analyst" OR "technology")',
     "GSE Technology × PM / BA"),
    ('"MISMO" OR "Encompass" ("TPO" OR "wholesale" OR "correspondent") "product" OR "platform"',
     "TPO / Wholesale Channel Platform"),
]

INDEED_QUERIES = [
    ('"product manager" mortgage LOS technology',
     "PM × Mortgage LOS"),
    ('"platform owner" OR "product owner" mortgage technology',
     "Platform/Product Owner × MortgageTech"),
    ('"business systems analyst" mortgage OR LOS OR Encompass',
     "BSA × Mortgage / LOS"),
    ('"technical product manager" mortgage OR fintech',
     "TPM × Mortgage / Fintech"),
    ('"sr BA" OR "senior business analyst" OR "lead BA" mortgage technology',
     "Sr/Lead BA × MortgageTech"),
    ('"product manager" AI agentic mortgage',
     "PM × AI/Agentic × Mortgage"),
    ('MISMO OR Encompass "product manager" OR "business analyst"',
     "MISMO/Encompass × PM/BA"),
    ('"document intelligence" OR "OCR" mortgage product',
     "Doc Intelligence × Mortgage Product"),
    ('"loan origination" "product owner" OR "platform owner"',
     "LOS Platform Owner"),
    ('"mortgage technology" "product" "AI" OR "automation"',
     "MortgageTech × Product × AI"),
    ('"Fannie Mae" OR "Freddie Mac" "product manager" OR "technology"',
     "GSE Technology PM"),
    ('"TPO" OR "wholesale lending" "product manager" OR "platform"',
     "TPO / Wholesale Platform"),
]


def generate_search_urls() -> tuple[list[dict], list[dict]]:
    li_base = "https://www.linkedin.com/jobs/search/?keywords="
    in_base = "https://www.indeed.com/jobs?q="
    linkedin = [{"label": lbl, "url": li_base + quote_plus(q)} for q, lbl in LINKEDIN_QUERIES]
    indeed   = [{"label": lbl, "url": in_base + quote_plus(q) + "&l=Remote&sort=date"} for q, lbl in INDEED_QUERIES]
    return linkedin, indeed


# ─────────────────────────────────────────────────────────────────────────────
# REPORT GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def generate_report(
    matched_jobs:     list[dict],
    stale_outreach:   list[dict],
    geo_mismatch:     list[dict],
    direct_companies: list[dict],
    total_fetched:    int,
    linkedin_urls:    list[dict],
    indeed_urls:      list[dict],
    min_score:        int,
    run_args:         dict,
) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    L   = []

    L += [
        "# Operation Git Shit Done — Mortgage Job Hunter Report",
        f"**Profile:** Aza Olival, MBA — TPM | BSA | AI/Agentic Delivery Lead | MortgageTech  ",
        f"**Generated:** {now}  ",
        f"**Geo Rule:** Bay Area/CA hybrid or onsite OK | All other locations must be 100% Remote  ",
        f"**Scope:** {run_args.get('scope', 'All companies')}  ",
        "",
        "---",
        "",
        "## Run Summary",
        "| Metric | Value |",
        "|--------|-------|",
        f"| API companies scanned | {run_args.get('api_companies', 0)} |",
        f"| Chrisman Commentary board | {run_args.get('chrisman_fetched', 0)} jobs fetched |",
        f"| Total jobs fetched | {total_fetched} |",
        f"| Geo-OK matches (score ≥ {min_score}) | **{len(matched_jobs)}** |",
        f"| Stale reqs (>{STALE_REQ_DAYS}d open) = cold outreach targets | **{len(stale_outreach)}** |",
        f"| Geo mismatch (out-of-area, not remote) | {len(geo_mismatch)} |",
        f"| Direct-check companies (no public API) | {len(direct_companies)} |",
        "",
    ]

    # ── MATCHED JOBS ──────────────────────────────────────────────────────────
    if matched_jobs:
        L += ["---", "", f"## Matched Opportunities — {len(matched_jobs)} results", ""]

        tier_labels = {1: "Tier 1 — Priority Targets", 2: "Tier 2 — Strong Fit", 3: "Tier 3 — Worth Watching"}
        for tier_num, tier_label in tier_labels.items():
            tier_jobs = [j for j in matched_jobs if j.get("company_tier") == tier_num]
            if not tier_jobs:
                continue
            L += [f"### {tier_label} ({len(tier_jobs)} matches)", ""]
            for job in sorted(tier_jobs, key=lambda x: x.get("score", 0), reverse=True)[:MAX_JOBS_PER_SECTION]:
                d      = days_open(job.get("posted", ""))
                stale  = "🚨 STALE REQ — COLD OUTREACH" if d > STALE_REQ_DAYS else ""
                geo    = job.get("geo", {})
                L += [
                    f"#### [{job['score']} pts] {job['company']} — {job['title']}",
                    f"- **Location:** {job.get('location', 'N/A')}  |  **Geo:** {geo.get('label', '')} {stale}",
                    f"- **Days Open:** {d if d >= 0 else 'unknown'} {('← ' + stale) if stale else ''}",
                    f"- **Source:** {job.get('source', '')}",
                    f"- **Matches:** `{'` `'.join(job.get('matched_groups', []))}`",
                ]
                url = job.get("url", "")
                if url:
                    L.append(f"- **Apply:** [{url}]({url})")
                desc = job.get("description", "")
                if desc:
                    snippet = " ".join(desc.split())[:MAX_SNIPPET_CHARS]
                    L.append(f"- **Preview:** _{snippet}..._")
                L.append("")
    else:
        L += ["> No geo-OK API matches this run. Use the stale outreach list and search URLs below.", ""]

    # ── STALE REQ COLD OUTREACH TABLE ─────────────────────────────────────────
    if stale_outreach:
        L += [
            "---", "",
            f"## 🚨 Stale Requisition Cold Outreach Targets",
            f"_These roles have been open >{STALE_REQ_DAYS} days with no hire._  ",
            "_This = their local/onsite talent pool is exhausted. Reach out directly._  ",
            "_Template: 'I see you've had [Role] open for [X] days. Deep MISMO + agentic AI in mortgage is rare._  ",
            "_I have it. Happy to discuss remote or hybrid arrangements.' — Lead with value, not ask._",
            "",
            "| Company | Role | Days Open | Location | Geo | Score | Apply |",
            "|---------|------|-----------|----------|-----|-------|-------|",
        ]
        for job in sorted(stale_outreach, key=lambda x: days_open(x.get("posted", "")), reverse=True):
            d     = days_open(job.get("posted", ""))
            geo   = job.get("geo", {})
            url   = job.get("url", "")
            link  = f"[Apply]({url})" if url else "—"
            L.append(f"| {job['company']} | {job['title']} | **{d}d** | {job.get('location','?')} | {geo.get('label','')} | {job['score']} | {link} |")
        L.append("")

    # ── GEO MISMATCH (shown for awareness / cold outreach context) ─────────────
    if geo_mismatch:
        L += [
            "---", "",
            "## Out-of-Area Non-Remote Roles (Geo Mismatch — Hidden from Main Results)",
            "_These require onsite outside the Bay Area. Not a fit for Aza's current situation._  ",
            "_If a company shows up here repeatedly, it signals they need help but their local pool is thin._  ",
            "_Consider cold outreach to offer remote consulting or fractional PM engagement._",
            "",
            "| Company | Role | Location | Days Open | Score |",
            "|---------|------|----------|-----------|-------|",
        ]
        for job in sorted(geo_mismatch, key=lambda x: x.get("score", 0), reverse=True)[:30]:
            d = days_open(job.get("posted", ""))
            L.append(f"| {job['company']} | {job['title']} | {job.get('location','?')} | {d if d>=0 else '?'}d | {job['score']} |")
        L.append("")

    # ── DIRECT COMPANY CHECKS ──────────────────────────────────────────────────
    if direct_companies:
        L += [
            "---", "",
            "## Direct Career Page Checks (No Public API — Visit Manually)",
            "",
            "| Company | Tier | Type | Career Page | Notes |",
            "|---------|------|------|-------------|-------|",
        ]
        for c in sorted(direct_companies, key=lambda x: x.get("tier", 9)):
            url  = c.get("url", "")
            link = f"[Careers]({url})" if url else "—"
            L.append(f"| {c['name']} | {c.get('tier','?')} | {c.get('type','?')} | {link} | {c.get('notes','')} |")
        L.append("")

    # ── LINKEDIN SEARCH URLS ───────────────────────────────────────────────────
    L += ["---", "", "## Targeted LinkedIn Job Search URLs", "_Compound keyword queries:_", ""]
    for item in linkedin_urls:
        L.append(f"- **[{item['label']}]({item['url']})**")
    L.append("")

    # ── INDEED SEARCH URLS ────────────────────────────────────────────────────
    L += ["---", "", "## Targeted Indeed Job Search URLs _(sorted by date, Remote filter)_", ""]
    for item in indeed_urls:
        L.append(f"- **[{item['label']}]({item['url']})**")
    L.append("")

    # ── SCORING REFERENCE ─────────────────────────────────────────────────────
    L += [
        "---", "",
        "## Keyword Scoring Reference",
        "",
        "| Group | Weight | Notes |",
        "|-------|--------|-------|",
        "| role_titles | 10 | **REQUIRED** — PM, BSA, TPM, Platform Owner, Delivery Lead... |",
        "| mortgage_domain | 8 | **REQUIRED** — mortgage, LOS, origination, servicing... |",
        "| ai_agentic | 7 | agentic, OCR, document intelligence, generative AI... |",
        "| los_pos_platforms | 6 | Encompass, BytePro, MISMO, DU, LPA, Blend... |",
        "| api_integrations | 5 | API, XML, JSON, MISMO, data mapping... |",
        "| delivery_tools | 4 | Agile, Jira, Azure DevOps, GitHub, user stories... |",
        "| fintech_adjacent | 4 | fintech, mortgage technology, digital lending... |",
        "| data_analytics | 3 | SQL, HMDA, data model, BI... |",
        "| compliance_risk | 3 | TILA-RESPA, QM, PMIERs, Fannie Mae, credit risk... |",
        "| **Resume Bonus** | +3 each (max 15) | MISMO · BytePro · agentic · Claude Code · OCR · Encompass |",
        "",
        f"*Stale req threshold: {STALE_REQ_DAYS} days | Geo: Bay Area/CA hybrid OK | Elsewhere must be Remote*",
        "",
        "---",
        f"*Operation Git Shit Done — job_hunter.py v2 | {now}*",
    ]

    return "\n".join(L)


# ─────────────────────────────────────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

def _strip_html(text: str) -> str:
    clean = re.sub(r"<[^>]+>", " ", text or "")
    clean = re.sub(r"&[a-zA-Z]+;", " ", clean)
    return re.sub(r"\s+", " ", clean).strip()


def _load_json5(path: Path) -> any:
    """Load JSON that may contain // line comments (JSON5-ish)."""
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    # Strip single-line comments (// ...) but not URLs (://)
    stripped = re.sub(r'(?<!:)//[^\n]*', '', raw)
    return json.loads(stripped)


def _parse_args(args: list[str]) -> dict:
    cfg = {
        "tier_max":    None,
        "quick":       "--quick"      in args,
        "all_geo":     "--all-geo"    in args,
        "stale_only":  "--stale-only" in args,
        "type_filter": None,
        "min_score":   DEFAULT_MIN_SCORE,
    }
    for flag, key in [("--tier", "tier_max"), ("--type", "type_filter"), ("--min", "min_score")]:
        if flag in args:
            idx = args.index(flag)
            if idx + 1 < len(args):
                val = args[idx + 1]
                cfg[key] = int(val) if key in ("tier_max", "min_score") else val.lower()
    return cfg


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    # Windows cp1252 terminals crash on Unicode box-drawing chars — force utf-8
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    cfg = _parse_args(sys.argv[1:])

    registry       = _load_json5(REGISTRY_FILE)
    keyword_matrix = _load_json5(KEYWORDS_FILE)
    resume         = _load_json5(RESUME_PROFILE)

    # Always exclude mega bank conglomerates — not Aza's target market
    registry = [c for c in registry if c.get("type", "").lower() != "bank_mega"]

    if cfg["tier_max"] is not None:
        registry = [c for c in registry if c.get("tier", 99) <= cfg["tier_max"]]
    if cfg["type_filter"]:
        registry = [c for c in registry if c.get("type", "").lower() == cfg["type_filter"]]

    API_ATS = {"greenhouse", "lever", "workday", "ashby"}
    api_companies    = [c for c in registry if c.get("ats") in API_ATS]
    direct_companies = [c for c in registry if c.get("ats") not in API_ATS]

    tier_label = f"Tier ≤{cfg['tier_max']}" if cfg["tier_max"] else "All Tiers"
    type_label = cfg["type_filter"] or "all types"
    scope_str  = f"{tier_label} | {type_label} | {len(registry)} companies"

    print(f"\n{'═'*64}")
    print(f"  Operation Git Shit Done — Mortgage Job Hunter v2")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Scope: {scope_str}")
    print(f"  API-scannable: {len(api_companies)} | Direct-only: {len(direct_companies)}")
    print(f"{'═'*64}\n")

    all_jobs      = []
    total_fetched = 0
    chrisman_fetched = 0

    if not cfg["quick"]:
        # ── Chrisman Commentary board (mortgage-specific aggregator) ──────────
        print(f"  [ C  ] Chrisman Commentary Job Board")
        chrisman_raw = fetch_chrisman_jobs()
        chrisman_fetched = len(chrisman_raw)
        total_fetched += chrisman_fetched
        for job in chrisman_raw:
            job["company_type"] = "imb"  # mortgage board — treat all as mortgage domain
            score, matched = score_job(job, keyword_matrix, resume)
            if score >= cfg["min_score"]:
                job["score"]          = score
                job["matched_groups"] = matched
                job["company_tier"]   = 2  # aggregator — default tier 2, score ranks them
                job["geo"]            = classify_geo(job.get("location", ""))
                all_jobs.append(job)

        for i, company in enumerate(api_companies, 1):
            name = company["name"]
            ats  = company["ats"]
            tier = company.get("tier", 3)
            print(f"  [{i:>2}/{len(api_companies)}] {name}")

            raw_jobs = []
            if ats == "greenhouse":
                raw_jobs = fetch_greenhouse_jobs(company["slug"], name)
            elif ats == "lever":
                raw_jobs = fetch_lever_jobs(company["slug"], name)
            elif ats == "workday":
                raw_jobs = fetch_workday_jobs(company["tenant"], company.get("wday_n", 1), company["site"], name)
            elif ats == "ashby":
                raw_jobs = fetch_ashby_jobs(company["org"], name)

            total_fetched += len(raw_jobs)

            for job in raw_jobs:
                job["company_type"] = company.get("type", "")
                score, matched = score_job(job, keyword_matrix, resume)
                if score >= cfg["min_score"]:
                    job["score"]          = score
                    job["matched_groups"] = matched
                    job["company_tier"]   = tier
                    job["geo"]            = classify_geo(job.get("location", ""))
                    all_jobs.append(job)

            if i < len(api_companies):
                time.sleep(REQUEST_DELAY)

    # Partition results
    geo_ok_jobs    = [j for j in all_jobs if j["geo"]["geo_ok"]]
    geo_miss_jobs  = [j for j in all_jobs if not j["geo"]["geo_ok"]]
    stale_jobs     = [j for j in all_jobs if days_open(j.get("posted", "")) > STALE_REQ_DAYS]

    if cfg["stale_only"]:
        display_jobs = stale_jobs
    elif cfg["all_geo"]:
        display_jobs = sorted(all_jobs, key=lambda x: x.get("score", 0), reverse=True)
    else:
        display_jobs = sorted(geo_ok_jobs, key=lambda x: x.get("score", 0), reverse=True)

    linkedin_urls, indeed_urls = generate_search_urls()

    report = generate_report(
        matched_jobs     = display_jobs,
        stale_outreach   = stale_jobs,
        geo_mismatch     = geo_miss_jobs,
        direct_companies = direct_companies,
        total_fetched    = total_fetched,
        linkedin_urls    = linkedin_urls,
        indeed_urls      = indeed_urls,
        min_score        = cfg["min_score"],
        run_args         = {"scope": scope_str, "api_companies": len(api_companies), "chrisman_fetched": chrisman_fetched},
    )

    ts          = datetime.now().strftime("%Y%m%d_%H%M")
    report_path = OUTPUT_DIR / f"job_report_{ts}.md"

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    # Auto-inject new matches into pipeline.json (runs every scan — no flag needed)
    injected, flagged = inject_to_pipeline(geo_ok_jobs)

    print(f"\n{'═'*64}")
    print(f"  Jobs fetched:      {total_fetched} ({chrisman_fetched} from Chrisman Commentary)")
    print(f"  Geo-OK matches:    {len(geo_ok_jobs)}")
    print(f"  Stale reqs:        {len(stale_jobs)} (cold outreach targets)")
    print(f"  Geo mismatches:    {len(geo_miss_jobs)} (hidden)")
    print(f"  Pipeline inject:   {injected} new TARGETED cards added")
    if flagged:
        print(f"  ⚠ Resurface flags: {flagged} dead cards re-appeared — ACTION NEEDED in board")
    print(f"  Report saved:      {report_path}")
    print(f"{'═'*64}\n")


PIPELINE_PATH = Path(r"C:\Users\azaol\GSDRolesTracker\public\pipeline.json")
INJECT_MIN_SCORE = 35
DEAD_STATUSES = {"NO_THANKS", "NOT_MOVING_FORWARD", "GHOSTED"}


def inject_to_pipeline(geo_ok_jobs):
    """Auto-inject new geo-OK matches (score >= INJECT_MIN_SCORE) into pipeline.json as TARGETED.
    - Skips any role already tracked at any live status (no duplicates).
    - If a role is tracked as dead AND the posting is fresh (<= 14 days), flags it ACTION NEEDED
      instead of injecting a duplicate — resurface check for Aza.
    - Never removes or modifies existing cards except to add the ACTION NEEDED flag.
    """
    if not PIPELINE_PATH.exists():
        print("  [INJECT] pipeline.json not found — skipping inject")
        return 0, 0

    with open(PIPELINE_PATH, encoding="utf-8") as f:
        cards = json.load(f)

    def norm(s):
        return re.sub(r"[^a-z0-9]", "", (s or "").lower())

    existing = {}
    for c in cards:
        key = (norm(c.get("company", "")), norm(c.get("title", "")))
        existing[key] = c

    injected = 0
    flagged  = 0
    today_str = str(date.today())

    for job in geo_ok_jobs:
        if job.get("score", 0) < INJECT_MIN_SCORE:
            continue

        jkey = (norm(job.get("company", "")), norm(job.get("title", "")))

        # Check for substring match (handles "NewRez" vs "NewRez / Shellpoint")
        matched_card = None
        for (ec, et), card in existing.items():
            if (jkey[0] in ec or ec in jkey[0]) and (jkey[1] in et or et in jkey[1]):
                matched_card = card
                break

        if matched_card:
            if matched_card.get("status") in DEAD_STATUSES:
                # Posting is fresh and role was archived — flag it for Aza
                age = days_open(job.get("posted", ""))
                if age <= 14 and not matched_card.get("actionNeeded"):
                    matched_card["actionNeeded"] = True
                    matched_card["actionNote"] = (
                        f"Job scanner resurface {today_str} — role re-appeared as active "
                        f"({age}d old, {job['score']}pts). Card is currently {matched_card['status']}. "
                        f"Confirm if genuinely dead or should move back to TARGETED."
                    )
                    flagged += 1
            # Either way, skip injection — card already exists
            continue

        # Build new TARGETED card
        tier = "A" if job.get("score", 0) >= 50 else "B" if job.get("score", 0) >= 35 else "C"
        loc  = job.get("location", "Remote")
        new_card = {
            "id":          f"jh_{norm(job.get('company',''))[:12]}_{today_str.replace('-','')}_{injected}",
            "title":       job.get("title", ""),
            "company":     job.get("company", ""),
            "location":    loc,
            "tier":        tier,
            "salary":      "",
            "family":      "PM/PO/BA",
            "applyUrl":    job.get("url", job.get("apply_url", "")),
            "status":      "TARGETED",
            "dateAdded":   today_str,
            "dateApplied": None,
            "pocName":     "",
            "pocTitle":    "",
            "pdfSent":     False,
            "notes":       f"Auto-injected by job_hunter {today_str}. Score: {job.get('score', 0)}pts. "
                           f"Posted: {job.get('posted', 'unknown')}. "
                           f"Matches: {', '.join(job.get('matched_groups', []))}.",
            "steps":       {"tailor": False, "apply": False, "peopleSweep": False,
                            "outreach": False, "logged": False, "threeFronts": False},
            "source":      "job_hunter_auto",
        }
        cards.insert(0, new_card)
        existing[(norm(new_card["company"]), norm(new_card["title"]))] = new_card
        injected += 1

    if injected > 0 or flagged > 0:
        with open(PIPELINE_PATH, "w", encoding="utf-8") as f:
            json.dump(cards, f, indent=2, ensure_ascii=False)

    return injected, flagged


if __name__ == "__main__":
    main()
