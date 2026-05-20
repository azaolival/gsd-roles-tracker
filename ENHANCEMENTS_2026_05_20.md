# 5/20/2026 — GSD Portal Enhancement Efforts

**Session:** 2026-05-20 | **Owner:** Aza Olival | **Executor:** Claude

---

## Status Legend
`DONE` · `IN PROGRESS` · `PENDING` · `BLOCKED`

---

## Action Items

| # | Area | Item | Status | Notes |
|---|------|------|--------|-------|
| 1 | Pipeline.jsx | Header freeze framework — frozen stats bar + hot signals, scrollable kanban body | DONE | Matches RolesBoard pattern. Baked into standard layout going forward. |
| 2 | App.jsx | Rename "Pipeline" tab → "Activity Log" | DONE | Label + count updated |
| 3 | App.jsx | Rename landing tab → "Mortgage Prospect Board" (tab label + page H1) | DONE | Tab count = untouched prospects only |
| 4 | App.jsx | Logic: Prospect Board hides roles moved past TARGETED in Activity Log | DONE | Once any action beyond TARGETED = disappears from Prospect Board, lives in Activity Log only |
| 5 | App.jsx | Count: Prospect Board = untouched TARGETED-or-untracked count only | DONE | "in pipeline" counter removed from Prospect Board header |
| 6 | App.jsx | Count: Activity Log = all tracked cards | DONE | Already was pipeline.cards.length — confirmed |
| 7 | App.jsx | Clock: Simplified to HH:MM only (no weekday/date in nav) | DONE | Clean time display |
| 8 | App.jsx | ✕ no-thanks dismiss button — already existed, confirmed wired correctly | DONE | Distinct from Activity Log routing — for "not a fit" permanent removal |
| 9 | App.jsx | Non-Mortgage Prospect Board — 3rd tab, reuses RolesBoard with boardId="non-mortgage", empty job set, independent dismissed state | DONE | Framework shell ready. Populate when net cast wider. Uses contingency resume. |
| 10 | Memory | Doctrine update: proactive UX/UI best practice recommendations baked into Aza Riz + project rules | DONE | New feedback memory written |
| 11 | Deploy | Restore pipeline to ~88 → commit all pending files → /u_deploy | PENDING | Blocked on manual pipeline recovery first. 4 pending code files + today's enhancements. |

---

## Framework Rule (permanent — bake into all future pages/tabs/drawers)

Every new page, tab, slideout, or UI surface follows this layout pattern:

```
<div style={{ height:"100%", overflow:"hidden", display:"flex", flexDirection:"column" }}>
  {/* FROZEN HEADER — always visible */}
  <div style={{ flexShrink:0 }}>...</div>

  {/* SCROLLABLE BODY — content scrolls here */}
  <div style={{ flex:1, overflowY:"auto" }}>...</div>
</div>
```

No exceptions. Header freeze + scrollable body = standard. Never use `minHeight: calc(100vh - N)` as a layout hack.

---

## Architecture Notes

**Mortgage Prospect Board (landing):**
- Shows ONLY: roles with no pipeline action, OR roles with status = TARGETED
- Hides: any role in Activity Log past TARGETED status
- Count reflects actual untouched prospects
- ✕ no-thanks = permanent dismiss (localStorage), separate from pipeline routing

**Activity Log (formerly Pipeline):**
- Shows all tracked cards regardless of status
- Count = all pipeline cards
- Hot signals zone frozen at top

**Non-Mortgage Prospect Board:**
- Independent dismissed state (gsd-dismissed-non-mortgage)
- Empty job set — populate via /u_job_scan expanded criteria or manual add
- Different resume context: industry-agnostic contingency version
- Behaves identically to Mortgage Prospect Board

**Universal connection rule:**
- Moving a card BACK to TARGETED in Activity Log = role re-appears on Mortgage Prospect Board
- Bidirectional sync is automatic — the filter is live, not cached

---

## Pre-Deploy Checklist

- [ ] Restore pipeline.json to ~88 cards manually via GSD board
- [ ] Confirm WorkflowDrawer.jsx save button works as expected
- [ ] Confirm import backstop guard in Pipeline.jsx written
- [ ] Confirm scrollbar / UI consistency carries across all 3 pages
- [ ] Run /u_deploy from GSDRolesTracker directory
- [ ] Verify live at gsd-roles-tracker.vercel.app

---

*Last updated: 2026-05-20 morning session*
