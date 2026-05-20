// Pipeline.jsx — GSD job search kanban with session-aware queue UX

const TIER_COLOR = { A:"#b45309", B:"#1d4ed8", C:"#4b5563" };
const TIER_BG    = { A:"#fef3c7", B:"#dbeafe", C:"#f3f4f6" };

// Columns the user actively works through (left → right)
const FLOW_COLS = [
  { key:"TARGETED",    label:"Queue",        sub:"Identified — not applied", color:"#6366f1", bg:"#eef2ff", border:"#c7d2fe", action:true },
  { key:"IN_PROGRESS", label:"Working",      sub:"Tailor & apply in progress", color:"#b45309", bg:"#fffbeb", border:"#fde68a", action:true },
  { key:"APPLIED",     label:"Applied",      sub:"Submitted — monitoring",   color:"#0891b2", bg:"#f0f9ff", border:"#bae6fd" },
  { key:"COLD_OUTREACH",label:"Cold Outreach",sub:"No open role — radar only",color:"#c2410c", bg:"#fff7ed", border:"#fed7aa" },
];

// Hot signals — these get a separate elevated zone
const HOT_COLS = [
  { key:"CALLBACK",  label:"Callback",   color:"#7c3aed", bg:"#faf5ff", border:"#ddd6fe" },
  { key:"INTERVIEW", label:"Interview!", color:"#059669", bg:"#ecfdf5", border:"#a7f3d0" },
  { key:"OFFER",     label:"Offer!",     color:"#92400e", bg:"#fefce8", border:"#fde047" },
];

// Dead — collapsed by default
const DEAD_COLS = [
  { key:"NO_THANKS", label:"No Thanks", color:"#dc2626", bg:"#fef2f2", border:"#fecaca" },
  { key:"GHOSTED",   label:"Ghosted",   color:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0" },
];

function stepsCount(steps) {
  if (!steps) return 0;
  return Object.values(steps).filter(Boolean).length;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Card({ card, onOpen, compact }) {
  const done = stepsCount(card.steps);
  const allDone = done === 6;
  const tier = card.tier;

  return (
    <div
      onClick={() => onOpen(card)}
      style={{
        background: "#ffffff",
        border: `1.5px solid ${allDone ? "#bbf7d0" : "#e2e8f0"}`,
        borderRadius: 10,
        padding: compact ? "9px 11px" : "12px 13px",
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "box-shadow .15s, transform .1s",
        userSelect: "none",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.10)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3,
        fontFamily: "'Inter',sans-serif", marginBottom: 2 }}>
        {card.title}
      </div>
      <div style={{ fontSize: 12, color: "#475569", fontFamily: "'Inter',sans-serif",
        marginBottom: compact ? 5 : 8 }}>
        {card.company}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(done / 6) * 100}%`,
            background: allDone ? "#22c55e" : "#0891b2", borderRadius: 2,
            transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace",
          color: allDone ? "#16a34a" : "#94a3b8", whiteSpace: "nowrap" }}>
          {done}/6
        </span>
        {tier && (
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace",
            color: TIER_COLOR[tier] || "#4b5563", background: TIER_BG[tier] || "#f3f4f6",
            padding: "1px 6px", borderRadius: 4 }}>
            {tier}
          </span>
        )}
      </div>

      {!compact && card.notes && (
        <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Inter',sans-serif",
          marginTop: 6, lineHeight: 1.35,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {card.notes}
        </div>
      )}

      {!compact && card.pocName && (
        <div style={{ fontSize: 10, color: "#7c3aed", fontFamily: "'IBM Plex Mono',monospace",
          marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          ◎ {card.pocName}
        </div>
      )}
    </div>
  );
}

function QueueCard({ card, onOpen, position }) {
  const done = stepsCount(card.steps);
  const tier = card.tier;
  const isNext = position === 0;

  return (
    <div
      onClick={() => onOpen(card)}
      style={{
        background: isNext ? "#fefce8" : "#ffffff",
        border: `2px solid ${isNext ? "#fde047" : "#e2e8f0"}`,
        borderRadius: 10,
        padding: "13px 14px",
        cursor: "pointer",
        boxShadow: isNext ? "0 2px 12px rgba(234,179,8,0.2)" : "0 1px 3px rgba(0,0,0,0.05)",
        transition: "box-shadow .15s, transform .1s",
        position: "relative",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = isNext
          ? "0 4px 18px rgba(234,179,8,0.3)"
          : "0 4px 14px rgba(0,0,0,0.10)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = isNext ? "0 2px 12px rgba(234,179,8,0.2)" : "0 1px 3px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {isNext && (
        <div style={{ position: "absolute", top: -10, left: 12,
          fontSize: 11, fontWeight: 700, color: "#92400e",
          background: "#fde047", padding: "1px 9px", borderRadius: 10,
          fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.05em" }}>
          ▶ NEXT UP
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3,
            fontFamily: "'Inter',sans-serif", marginBottom: 2 }}>
            {card.title}
          </div>
          <div style={{ fontSize: 12, color: "#475569", fontFamily: "'Inter',sans-serif",
            marginBottom: 8 }}>
            {card.company}
            {card.location && <span style={{ color: "#94a3b8" }}> · {card.location}</span>}
          </div>
        </div>
        {tier && (
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace",
            color: TIER_COLOR[tier] || "#4b5563", background: TIER_BG[tier] || "#f3f4f6",
            padding: "2px 8px", borderRadius: 5, flexShrink: 0, marginTop: 1 }}>
            {tier === "A" ? "★ A" : tier}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(done / 6) * 100}%`,
            background: "#6366f1", borderRadius: 2, transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace",
          color: "#94a3b8", whiteSpace: "nowrap" }}>
          {done}/6 steps
        </span>
      </div>

      {card.notes && (
        <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Inter',sans-serif",
          marginTop: 6, lineHeight: 1.35,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {card.notes}
        </div>
      )}
    </div>
  );
}

function HotCard({ card, onOpen, colColor, colBg, colBorder }) {
  const done = stepsCount(card.steps);

  return (
    <div
      onClick={() => onOpen(card)}
      style={{
        background: colBg,
        border: `2px solid ${colBorder}`,
        borderRadius: 10,
        padding: "13px 14px",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        transition: "box-shadow .15s, transform .1s",
        minWidth: 220,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.14)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3,
        fontFamily: "'Inter',sans-serif", marginBottom: 2 }}>
        {card.title}
      </div>
      <div style={{ fontSize: 12, color: "#475569", fontFamily: "'Inter',sans-serif",
        marginBottom: 8 }}>
        {card.company}
      </div>

      {card.notes && (
        <div style={{ fontSize: 11, color: colColor, fontFamily: "'Inter',sans-serif",
          lineHeight: 1.4, marginBottom: 8,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {card.notes}
        </div>
      )}

      {card.pocName && (
        <div style={{ fontSize: 10, color: colColor, fontFamily: "'IBM Plex Mono',monospace",
          marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          ◎ {card.pocName}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: "rgba(0,0,0,0.08)", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${(done / 6) * 100}%`,
            background: colColor, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace",
          color: colColor, whiteSpace: "nowrap" }}>{done}/6</span>
      </div>
    </div>
  );
}

export function Pipeline({ cards, moveCard, deleteCard, exportData, importData, lastSavedAt, onOpenDrawer }) {
  const byStatus = {};
  [...FLOW_COLS, ...HOT_COLS, ...DEAD_COLS].forEach(s => { byStatus[s.key] = []; });
  (cards || []).forEach(c => {
    const key = c.status;
    if (byStatus[key]) byStatus[key].push(c);
    else byStatus["GHOSTED"].push(c);
  });

  // Sort queue by tier (A first), then date added
  const tierOrder = { A: 0, B: 1, C: 2 };
  byStatus["TARGETED"].sort((a, b) => {
    const ta = tierOrder[a.tier] ?? 9;
    const tb = tierOrder[b.tier] ?? 9;
    if (ta !== tb) return ta - tb;
    return (a.dateAdded || "").localeCompare(b.dateAdded || "");
  });

  const totalCards = (cards || []).length;
  const appliedToday = (cards || []).filter(c => c.dateApplied === today()).length;
  const hotCount = HOT_COLS.reduce((n, col) => n + byStatus[col.key].length, 0);
  const queueCount = byStatus["TARGETED"].length + byStatus["IN_PROGRESS"].length;
  const appliedCount = byStatus["APPLIED"].length;

  const [deadOpen, setDeadOpen] = React.useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif",
      background: "#f8fafc" }}>

      {/* ── SESSION STATS BAR ─────────────────────────────────────────── */}
      <div style={{ background: "#0f172a", padding: "12px 28px",
        display: "flex", alignItems: "center", gap: 0, overflowX: "auto", flexShrink: 0 }}>

        {[
          { label: "Queue", value: queueCount, color: queueCount > 0 ? "#fde047" : "#475569",
            sub: queueCount > 0 ? "ready to work" : "all clear" },
          { label: "Applied Today", value: appliedToday, color: "#38bdf8", sub: "this session" },
          { label: "Total Applied", value: appliedCount + byStatus["APPLIED"].length > 0 ? appliedCount : totalCards - hotCount - queueCount, color: "#94a3b8", sub: "all time" },
          { label: "Active Signals", value: hotCount, color: hotCount > 0 ? "#4ade80" : "#475569",
            sub: hotCount > 0 ? "callback / interview / offer" : "monitoring" },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ textAlign: "center", padding: "0 24px",
            borderRight: i < arr.length - 1 ? "1px solid #1e293b" : "none", flexShrink: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1,
              fontFamily: "'IBM Plex Mono',monospace" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3,
              fontFamily: "'Inter',sans-serif" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 10, color: "#334155", marginTop: 1,
              fontFamily: "'IBM Plex Mono',monospace" }}>
              {s.sub}
            </div>
          </div>
        ))}

        {/* Export / Import */}
        <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", gap: 8, alignItems: "center", paddingLeft: 20 }}>
          <button onClick={exportData} style={{
            padding: "7px 14px", background: "transparent", border: "1px solid #334155",
            borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
            color: "#94a3b8", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
            Export
          </button>
          <label style={{
            padding: "7px 14px", background: "transparent", border: "1px solid #334155",
            borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
            color: "#94a3b8", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
            Import
            <input type="file" accept=".json" style={{ display: "none" }} onChange={e => {
              const file = e.target.files[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => {
                try {
                  const data = JSON.parse(ev.target.result);
                  if (Array.isArray(data)) {
                    const importCount = data.length;
                    const currentCount = (cards || []).length;
                    const fileOlderThanSave = lastSavedAt && file.lastModified < lastSavedAt;
                    const fewerCards = importCount < currentCount;
                    if (fileOlderThanSave || fewerCards) {
                      const lines = [];
                      if (fewerCards) lines.push(`  • Import: ${importCount} cards  /  Current: ${currentCount} cards  (net -${currentCount - importCount})`);
                      if (fileOlderThanSave) lines.push(`  • File is older than your last local save`);
                      const ok = window.confirm(`Import Backstop\n\n${lines.join("\n")}\n\nThis will overwrite your current pipeline. Continue?`);
                      if (!ok) return;
                    }
                  }
                  importData(data);
                } catch { alert("Invalid JSON"); }
              };
              reader.readAsText(file);
              e.target.value = "";
            }} />
          </label>
        </div>
      </div>

      {/* ── HOT SIGNALS ZONE ──────────────────────────────────────────── */}
      {hotCount > 0 && (
        <div style={{ background: "#fffbeb", borderBottom: "2px solid #fde68a",
          padding: "14px 28px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#92400e",
              fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.1em" }}>
              🔥 ACTIVE SIGNALS
            </span>
            <span style={{ fontSize: 11, color: "#b45309", fontFamily: "'IBM Plex Mono',monospace" }}>
              {hotCount} live — work these first
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
            {HOT_COLS.map(col => (
              byStatus[col.key].map(card => (
                <div key={card.id} style={{ flexShrink: 0, width: 260 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: col.color,
                    fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.08em",
                    marginBottom: 6, textTransform: "uppercase" }}>
                    {col.label}
                  </div>
                  <HotCard card={card} onOpen={onOpenDrawer}
                    colColor={col.color} colBg={col.bg} colBorder={col.border} />
                </div>
              ))
            ))}
          </div>
        </div>
      )}

      {/* ── SCROLLABLE BODY (kanban + dead section) ──────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

      {/* ── MAIN KANBAN ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16, padding: "20px 28px 12px",
        overflowX: "auto", alignItems: "flex-start", flexShrink: 0 }}>

        {FLOW_COLS.map(col => {
          const colCards = byStatus[col.key];
          const isQueue = col.key === "TARGETED";
          const isWorking = col.key === "IN_PROGRESS";

          return (
            <div key={col.key} style={{ flexShrink: 0, width: isQueue ? 272 : 252,
              display: "flex", flexDirection: "column", gap: 9 }}>

              {/* Column header */}
              <div style={{ background: col.bg, border: `1.5px solid ${col.border}`,
                borderRadius: 9, padding: "9px 12px", display: "flex",
                alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: col.color,
                    fontFamily: "'Inter',sans-serif" }}>
                    {col.label}
                    {col.action && colCards.length === 0 && (
                      <span style={{ fontSize: 10, color: col.color, opacity: .6,
                        fontFamily: "'IBM Plex Mono',monospace", marginLeft: 6 }}>
                        empty
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: col.color, opacity: .7,
                    fontFamily: "'IBM Plex Mono',monospace", marginTop: 1 }}>
                    {col.sub}
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: col.color,
                  fontFamily: "'IBM Plex Mono',monospace",
                  background: "rgba(255,255,255,0.65)", padding: "2px 8px", borderRadius: 5 }}>
                  {colCards.length}
                </span>
              </div>

              {/* Empty queue state */}
              {isQueue && colCards.length === 0 && (
                <div style={{ padding: "20px 14px", textAlign: "center",
                  border: "1.5px dashed #c7d2fe", borderRadius: 9,
                  background: "rgba(238,242,255,0.5)" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1",
                    fontFamily: "'Inter',sans-serif", marginBottom: 4 }}>
                    Queue empty
                  </div>
                  <div style={{ fontSize: 11, color: "#818cf8",
                    fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1.5 }}>
                    Run /u_job_scan to load<br/>new targets from the 139-<br/>company list
                  </div>
                </div>
              )}

              {/* Queue cards with NEXT UP treatment */}
              {isQueue && colCards.map((card, idx) => (
                <QueueCard key={card.id} card={card} onOpen={onOpenDrawer} position={idx} />
              ))}

              {/* Working column */}
              {isWorking && colCards.length === 0 && (
                <div style={{ padding: "18px 12px", textAlign: "center", color: "#fbbf24",
                  fontSize: 11, fontFamily: "'IBM Plex Mono',monospace",
                  border: "1.5px dashed #fde68a", borderRadius: 8 }}>
                  Nothing in progress
                </div>
              )}

              {/* Standard cards for non-queue columns */}
              {!isQueue && colCards.map(card => (
                <Card key={card.id} card={card} onOpen={onOpenDrawer}
                  compact={col.key === "APPLIED" && colCards.length > 12} />
              ))}

              {!isQueue && !isWorking && colCards.length === 0 && (
                <div style={{ padding: "18px 12px", textAlign: "center", color: "#cbd5e1",
                  fontSize: 12, fontFamily: "'Inter',sans-serif",
                  border: "1.5px dashed #e2e8f0", borderRadius: 8 }}>
                  Empty
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DEAD COLUMNS (collapsed) ──────────────────────────────────── */}
      <div style={{ padding: "0 28px 32px" }}>
        <button onClick={() => setDeadOpen(s => !s)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
            background: deadOpen ? "#f1f5f9" : "transparent",
            border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer",
            fontSize: 12, color: "#94a3b8", fontFamily: "'IBM Plex Mono',monospace",
            marginBottom: deadOpen ? 12 : 0 }}>
          <span style={{ fontSize: 10 }}>{deadOpen ? "▲" : "▼"}</span>
          Closed / No Response
          <span style={{ color: "#cbd5e1" }}>
            ({DEAD_COLS.reduce((n, c) => n + byStatus[c.key].length, 0)})
          </span>
        </button>

        {deadOpen && (
          <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
            {DEAD_COLS.map(col => (
              <div key={col.key} style={{ flexShrink: 0, width: 252, display: "flex",
                flexDirection: "column", gap: 9 }}>
                <div style={{ background: col.bg, border: `1.5px solid ${col.border}`,
                  borderRadius: 9, padding: "9px 12px", display: "flex",
                  alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: col.color,
                    fontFamily: "'Inter',sans-serif" }}>{col.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: col.color,
                    fontFamily: "'IBM Plex Mono',monospace",
                    background: "rgba(255,255,255,0.65)", padding: "1px 7px", borderRadius: 4 }}>
                    {byStatus[col.key].length}
                  </span>
                </div>
                {byStatus[col.key].map(card => (
                  <Card key={card.id} card={card} onOpen={onOpenDrawer} compact />
                ))}
                {byStatus[col.key].length === 0 && (
                  <div style={{ padding: "14px 12px", textAlign: "center", color: "#e2e8f0",
                    fontSize: 12, border: "1.5px dashed #e2e8f0", borderRadius: 8 }}>
                    Empty
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      </div>{/* end scrollable body */}
    </div>
  );
}

// React import for useState in this file
import React from "react";
