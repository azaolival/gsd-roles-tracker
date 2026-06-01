# Operation Git Shit Done — Mortgage Job Hunter

Scans Greenhouse + Lever public APIs across 90+ mortgage/fintech companies.
Scores every job against Aza's resume profile using compound keyword matching.
Outputs a single ranked markdown report + ready-to-click LinkedIn/Indeed URLs.

## Quick Start

```powershell
# Install dependency (one time)
pip install requests

# Full scan — all companies
python job_hunter.py

# Tier 1 priority targets only (fastest — ~15 companies)
python job_hunter.py --tier 1

# Skip API calls, just get search URLs
python job_hunter.py --quick

# IMB companies only
python job_hunter.py --type imb

# Tech vendors only
python job_hunter.py --type tech_vendor

# Set minimum score threshold
python job_hunter.py --min 30

# Combine filters
python job_hunter.py --tier 2 --type imb --min 25
```

## Output

Reports land in `output/job_report_YYYYMMDD_HHMM.md` — one file per run.

Each matched job shows:
- Score (points)
- Company + role title
- Location
- Date posted + **days open** (flag if >60 days — stale req = cold outreach target)
- Geo flag (Bay Area/hybrid OK vs. Remote-only required)
- Matched keyword groups
- Apply URL
- Job description snippet

## Files

| File | Purpose |
|------|---------|
| `job_hunter.py` | Main script |
| `company_registry.json` | 90+ companies with ATS type + slug |
| `keyword_matrix.json` | Compound keyword groups + weights |
| `resume_profile.json` | Aza's extracted skills for bonus scoring |
| `output/` | Generated reports |

## Adding Companies

Edit `company_registry.json`. ATS types:
- `"greenhouse"` — uses Greenhouse Job Board API (needs slug)
- `"lever"` — uses Lever public postings API (needs slug)
- `"direct"` — no public API, listed in direct-check table with URL

To find a Greenhouse slug: visit a company's job page, look for `boards.greenhouse.io/{slug}` in the URL.  
To find a Lever slug: look for `jobs.lever.co/{slug}` in job URLs.

## Scoring Logic

| Keyword Group | Weight | Notes |
|--------------|--------|-------|
| role_titles | 10 | REQUIRED — must match |
| mortgage_domain | 8 | REQUIRED — must match |
| ai_agentic | 7 | Agentic/OCR/automation |
| los_pos_platforms | 6 | Encompass, BytePro, MISMO |
| api_integrations | 5 | API, XML, JSON, data mapping |
| delivery_tools | 4 | Agile, Jira, Azure DevOps |
| fintech_adjacent | 4 | Fintech, digital lending |
| data_analytics | 3 | SQL, HMDA, BI |
| compliance_risk | 3 | TILA-RESPA, QM, PMIERs |
| Resume bonus | +3 each | MISMO, BytePro, agentic, Claude Code... |

Minimum score to appear in report: 20 (adjustable with `--min`)
