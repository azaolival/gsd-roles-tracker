#!/usr/bin/env python3
"""
inject_prospect_board.py
========================
Bridges the static App.jsx roles board → pipeline.json apply queue.

The job_hunter only injects roles found via API. The 70 hardcoded roles in
App.jsx (the Prospect Board) are never fed into the pipeline automatically.
This script closes that gap.

Logic:
  1. Parse jobs + tier data directly from App.jsx (regex extraction)
  2. Load pipeline.json
  3. Build a set of "already tracked" companies (applied/rejected/etc.)
  4. Build dead-company list (confirmed dead from session handoff)
  5. For each App.jsx role not already tracked and not dead: inject as PROSPECT
  6. Run rebalanceQueue() in Python → top QUEUE_CAP cards become TARGETED
  7. Write back to pipeline.json

Run: python inject_prospect_board.py
"""

import json
import re
import sys
from datetime import date
from pathlib import Path

APP_JSX_PATH   = Path(r"C:\Users\azaol\GSDRolesTracker\src\App.jsx")
PIPELINE_PATH  = Path(r"C:\Users\azaol\GSDRolesTracker\public\pipeline.json")

QUEUE_CAP   = 20
TIER_WEIGHT = {"A+": 0, "A": 1, "B": 2, "C": 3}

# ─────────────────────────────────────────────────────────────────────────────
# DEAD COMPANIES — confirmed dead/skipped per session handoff + doctrine
# Normalized to lowercase substrings for fuzzy match
# ─────────────────────────────────────────────────────────────────────────────
DEAD_COMPANIES = {
    "ncino", "simplenexus", "simple nexus",
    "newrez", "shellpoint",
    "uwm", "united wholesale",
    "loandepot", "loan depot",
    "freddie mac",
    "better.com", "better mortgage",
    "pennymac", "penny mac",
    "ice mortgage technology",  # full name required — don't want to kill "ICE" as a substring
    "mgic",
    "mr. cooper", "mr cooper",
    "blend labs",
    "carrington",
    "tomo mortgage", "tomo ",
    "reggora",
    "brace.ai", "brace ",   # trailing space to avoid "Embrace"
    "plat.ai",
    "treliant",
    "onity",
    "figure technologies",  # figure has manual/reCAPTCHA TARGETED cards already
    "clarifire",
    "docmagic",
    "servicemac",
    "situsamc", "situs amc",
    "experian",             # already APPLIED
    "upstart",
    "national mi",
    "fairway independent",
    "aspen grove",
    "benchmark mortgage",
    "credible ",            # trailing space avoids "Incredible", etc.
    "redfin",
    "deloitte",             # consulting - skip
    "nityo",                # staffing agency
}

# Some companies have ALREADY been applied to in pipeline — detected dynamically.
# These are NOT hardcoded here; we detect them below from pipeline.json.

# ─────────────────────────────────────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

def cnorm(s: str) -> str:
    """Lowercase, strip, collapse whitespace."""
    return re.sub(r"\s+", " ", (s or "").lower().strip())

def is_dead(company: str) -> bool:
    cn = cnorm(company)
    for d in DEAD_COMPANIES:
        if d in cn or cn in d:
            return True
    return False

def company_already_tracked(company: str, tracked_companies: set) -> bool:
    """Fuzzy match: if any tracked company name is a substring of (or equals) ours."""
    cn = cnorm(company)
    for tc in tracked_companies:
        # both-direction substring check on normalized names
        if len(tc) >= 4 and (tc in cn or cn in tc):
            return True
    return False

def rebalance_queue(cards: list) -> list:
    """
    Python mirror of usePipeline.js rebalanceQueue().
    Top QUEUE_CAP cards from PROSPECT+TARGETED pool → TARGETED.
    Rest → PROSPECT. All other statuses untouched.
    Respects existing actionNeeded flags — actionNeeded TARGETED cards
    stay TARGETED (they're already in the queue, just blocked).
    """
    pre_apply = [c for c in cards if c.get("status") in ("TARGETED", "PROSPECT")]
    rest      = [c for c in cards if c.get("status") not in ("TARGETED", "PROSPECT")]

    def sort_key(c):
        tier   = TIER_WEIGHT.get(c.get("tier") or "C", 9)
        loc    = cnorm(c.get("location") or "")
        remote = 0 if "remote" in loc else 1
        added  = c.get("dateAdded") or "9999-99-99"
        return (tier, remote, added)

    pre_apply.sort(key=sort_key)

    for i, card in enumerate(pre_apply):
        card["status"] = "TARGETED" if i < QUEUE_CAP else "PROSPECT"

    return rest + pre_apply

# ─────────────────────────────────────────────────────────────────────────────
# PARSE App.jsx → extract jobs + salary tiers
# ─────────────────────────────────────────────────────────────────────────────

def parse_app_jsx(path: Path) -> list[dict]:
    """
    Extract job entries from App.jsx using regex.
    Returns list of dicts: {id, title, company, location, family, url, tier, est}
    """
    src = path.read_text(encoding="utf-8")

    # ── 1. Extract SALARY_EST map: id → {tier, est} ──────────────────────────
    salary_section = re.search(r"const SALARY_EST\s*=\s*\{(.*?)\};", src, re.DOTALL)
    salary_map: dict[str, dict] = {}
    if salary_section:
        for m in re.finditer(
            r'(\w+):\s*\{\s*tier:\s*"([^"]+)".*?est:\s*"([^"]+)"',
            salary_section.group(1),
            re.DOTALL,
        ):
            salary_map[m.group(1)] = {"tier": m.group(2), "est": m.group(3)}

    # ── 2. Extract jobs array entries ─────────────────────────────────────────
    jobs_section = re.search(r"const jobs\s*=\s*\[(.*?)\];\s*//.*?nonMortgageJobs", src, re.DOTALL)
    if not jobs_section:
        jobs_section = re.search(r"const jobs\s*=\s*\[(.*?)\];", src, re.DOTALL)
    if not jobs_section:
        print("[ERROR] Could not find jobs array in App.jsx", file=sys.stderr)
        return []

    jobs_text = jobs_section.group(1)
    results: list[dict] = []

    for entry in re.finditer(r'\{([^{}]+)\}', jobs_text, re.DOTALL):
        raw = entry.group(1)

        def get_field(name):
            m = re.search(rf'{name}:\s*"([^"]*)"', raw)
            return m.group(1) if m else ""

        def get_field_B(name):
            m = re.search(rf'{name}:B\.(\w+)', raw)
            return m.group(1) if m else ""

        job_id  = get_field("id")
        title   = get_field("title")
        company = get_field("company")
        city    = get_field("city")
        family  = get_field("family")
        url     = get_field("url")

        if not job_id or not company or not title:
            continue

        sal = salary_map.get(job_id, {})
        tier = sal.get("tier", "C")
        est  = sal.get("est", "")

        # Determine location label
        bucket_key = get_field_B("bucket")
        if bucket_key == "REM":
            location = "Remote"
        elif bucket_key == "BAY":
            location = f"{city} (Bay Area Hybrid)"
        elif bucket_key == "SB":
            location = f"{city} (South Bay Onsite)"
        else:
            location = city or "Remote"

        results.append({
            "id":       job_id,
            "title":    title,
            "company":  company,
            "location": location,
            "family":   family,
            "url":      url,
            "tier":     tier,
            "est":      est,
        })

    return results

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    today_str = str(date.today())

    # ── Load pipeline ─────────────────────────────────────────────────────────
    with open(PIPELINE_PATH, encoding="utf-8") as f:
        pipeline = json.load(f)

    # ── Build tracked-company set (non-PROSPECT, non-TARGETED) ───────────────
    DEAD_STATUSES = {"APPLIED", "CALLBACK", "INTERVIEW", "OFFER",
                     "NOT_MOVING_FORWARD", "NO_THANKS", "GHOSTED", "COLD_OUTREACH",
                     "IN_PROGRESS"}
    tracked_companies: set[str] = set()
    for card in pipeline:
        if card.get("status") in DEAD_STATUSES:
            tracked_companies.add(cnorm(card.get("company", "")))

    # Build existing pipeline keys to avoid duplication by title+company
    existing_keys: set[tuple] = set()
    for card in pipeline:
        existing_keys.add((cnorm(card.get("company", "")), cnorm(card.get("title", ""))))

    # ── Parse App.jsx jobs ────────────────────────────────────────────────────
    jobs = parse_app_jsx(APP_JSX_PATH)
    print(f"  Parsed {len(jobs)} jobs from App.jsx")

    # ── Inject eligible jobs as PROSPECT ─────────────────────────────────────
    injected  = 0
    skipped_dead     = 0
    skipped_tracked  = 0
    skipped_dupe     = 0

    new_cards: list[dict] = []
    for job in jobs:
        company = job["company"]
        title   = job["title"]

        if is_dead(company):
            skipped_dead += 1
            continue

        if company_already_tracked(company, tracked_companies):
            skipped_tracked += 1
            continue

        key = (cnorm(company), cnorm(title))
        if key in existing_keys:
            skipped_dupe += 1
            continue

        # Skip "Various" aggregate entries — can't apply directly
        if "various" in company.lower() or "multiple" in company.lower():
            skipped_dead += 1
            continue

        # Build PROSPECT card
        card = {
            "id":          f"pb_{job['id'].lower()}_{today_str.replace('-','')}",
            "title":       title,
            "company":     company,
            "location":    job["location"],
            "tier":        job["tier"],
            "salary":      job["est"],
            "family":      job["family"] or "PM/PO/BA",
            "applyUrl":    job["url"],
            "status":      "PROSPECT",
            "dateAdded":   today_str,
            "dateApplied": None,
            "pocName":     "",
            "pocTitle":    "",
            "pdfSent":     False,
            "notes":       f"Auto-injected from Prospect Board (App.jsx id: {job['id']}) on {today_str}.",
            "steps": {
                "tailor": False, "apply": False, "peopleSweep": False,
                "outreach": False, "logged": False, "threeFronts": False,
            },
            "source": "prospect_board_sync",
        }
        new_cards.append(card)
        existing_keys.add(key)
        injected += 1

    print(f"  Dead/skip:        {skipped_dead}")
    print(f"  Already tracked:  {skipped_tracked}")
    print(f"  Duplicate key:    {skipped_dupe}")
    print(f"  New PROSPECT cards to inject: {injected}")

    if injected == 0:
        print("  Nothing to inject — pipeline is already in sync with prospect board.")
        return

    # ── Merge new cards + rebalance ───────────────────────────────────────────
    pipeline = new_cards + pipeline          # prepend so new cards are visible first
    pipeline = rebalance_queue(pipeline)

    # Count results
    targeted_count = sum(1 for c in pipeline if c.get("status") == "TARGETED")
    prospect_count = sum(1 for c in pipeline if c.get("status") == "PROSPECT")
    # Count actionNeeded TARGETED cards (blocked)
    blocked_count  = sum(1 for c in pipeline if c.get("status") == "TARGETED" and c.get("actionNeeded"))
    workable_count = targeted_count - blocked_count

    # ── Write back ────────────────────────────────────────────────────────────
    with open(PIPELINE_PATH, "w", encoding="utf-8") as f:
        json.dump(pipeline, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"  Injected {injected} new PROSPECT cards")
    print(f"  TARGETED after rebalance: {targeted_count} ({workable_count} Playwright-workable, {blocked_count} blocked)")
    print(f"  PROSPECT (queue reservoir): {prospect_count}")
    print(f"  Pipeline total: {len(pipeline)}")
    print(f"{'='*60}")

    if workable_count > 0:
        # List the top workable TARGETED cards
        workable = [c for c in pipeline if c.get("status") == "TARGETED" and not c.get("actionNeeded")]
        print(f"\n  Top {min(20, workable_count)} Playwright-workable cards:")
        for i, c in enumerate(workable[:20], 1):
            print(f"  {i:>2}. [{c.get('tier','?')}] {c.get('company','')} — {c.get('title','')} | {c.get('location','')}")
    else:
        print("\n  All TARGETED cards are manually blocked. Queue needs manual submissions to clear blocker.")


if __name__ == "__main__":
    main()
