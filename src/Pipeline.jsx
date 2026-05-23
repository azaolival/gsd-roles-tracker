// Pipeline.jsx — GSD job search kanban · unified grid view with search
import { QUEUE_CAP } from "./hooks/usePipeline";

const TIER_COLOR = { "A+":"#7c3aed", A:"#b45309", B:"#1d4ed8", C:"#4b5563" };
const TIER_BG    = { "A+":"#faf5ff", A:"#fef3c7", B:"#dbeafe", C:"#f3f4f6" };

const FLOW_COLS = [
  { key:"PROSPECT",     label:"Prospects",     sub:"Auto-fills queue by weight", color:"#64748b", bg:"#f8fafc", border:"#e2e8f0" },
  { key:"TARGETED",     label:"Queue",         sub:`Active — top ${QUEUE_CAP} by tier weight`, color:"#6366f1", bg:"#eef2ff", border:"#c7d2fe", action:true },
  { key:"IN_PROGRESS",  label:"Working",       sub:"Tailor & apply in progress", color:"#b45309", bg:"#fffbeb", border:"#fde68a", action:true },
  { key:"APPLIED",      label:"Applied",       sub:"Submitted — monitoring",     color:"#0891b2", bg:"#f0f9ff", border:"#bae6fd" },
  { key:"COLD_OUTREACH",label:"Cold Outreach", sub:"No open role — radar only",  color:"#c2410c", bg:"#fff7ed", border:"#fed7aa" },
];

const HOT_COLS = [
  { key:"CALLBACK",  label:"Callback",   sub:"They reached out",  color:"#7c3aed", bg:"#faf5ff", border:"#ddd6fe", isHot:true },
  { key:"INTERVIEW", label:"Interview!", sub:"In the process",    color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", isHot:true },
  { key:"OFFER",     label:"Offer!",     sub:"Offer in hand",     color:"#92400e", bg:"#fefce8", border:"#fde047", isHot:true },
];

const DEAD_COLS = [
  { key:"NO_THANKS",          label:"No Thanks",          sub:"My call — passed",      color:"#dc2626", bg:"#fef2f2", border:"#fecaca", isDead:true },
  { key:"NOT_MOVING_FORWARD", label:"Not Moving Forward", sub:"Company passed on me",  color:"#be185d", bg:"#fdf2f8", border:"#fbcfe8", isDead:true },
  { key:"GHOSTED",            label:"Ghosted",            sub:"No response",           color:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0", isDead:true },
];

const ALL_COLS = [...FLOW_COLS, ...HOT_COLS, ...DEAD_COLS];

function stepsCount(steps) {
  if (!steps) return 0;
  return Object.values(steps).filter(Boolean).length;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function followUpBadge(dateStr) {
  if (!dateStr) return null;
  const today = new Date().toISOString().slice(0, 10);
  const diff  = Math.round((new Date(dateStr) - new Date(today)) / 86400000);
  if (diff < 0)   return { label:`OVERDUE ${Math.abs(diff)}d`, color:"#ef4444", bg:"#fef2f2" };
  if (diff === 0) return { label:"Follow up TODAY",            color:"#d97706", bg:"#fffbeb" };
  if (diff <= 2)  return { label:`Follow up in ${diff}d`,      color:"#d97706", bg:"#fffbeb" };
  return               { label:`Follow up ${diff}d`,           color:"#0891b2", bg:"#eff6ff" };
}

function Card({ card, onOpen, compact }) {
  const done = stepsCount(card.steps);
  const allDone = done === 6;
  const tier = card.tier;

  const ageDays = daysAgo(card.dateApplied || card.dateAdded);
  const staleColor = ageDays >= 30 ? "#ef4444"
    : ageDays >= 15 ? "#f97316"
    : ageDays >= 8  ? "#f59e0b"
    : null;

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
        marginBottom: 4 }}>
        {card.company}
      </div>

      {/* Action needed badge */}
      {card.actionNeeded && (
        <div title={card.actionNote || "Action required — open card for details"}
          style={{ fontSize:10, fontWeight:700, color:"#dc2626",
            background:"#fef2f2", padding:"2px 7px", borderRadius:4, marginBottom:5,
            fontFamily:"'IBM Plex Mono',monospace", display:"inline-block",
            border:"1px solid #fecaca", cursor:"help" }}>
          ⚠ ACTION NEEDED
        </div>
      )}

      {/* Follow-up date badge */}
      {card.followUpDate && (() => {
        const fb = followUpBadge(card.followUpDate);
        return (
          <div style={{ fontSize:10, fontWeight:700, color:fb.color,
            background:fb.bg, padding:"2px 7px", borderRadius:4, marginBottom:5,
            fontFamily:"'IBM Plex Mono',monospace", display:"inline-block",
            border:`1px solid ${fb.color}30` }}>
            {fb.label}
          </div>
        );
      })()}

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
        {staleColor && (
          <span title={`${ageDays} days since added/applied`}
            style={{ fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace",
              color: staleColor, background: `${staleColor}18`,
              padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
            {ageDays}d
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
  const isAutoPriority = card.source === "job_hunter_auto" && (tier === "A+" || tier === "A") && daysAgo(card.dateAdded) <= 2;
  const ageDays = daysAgo(card.dateAdded);
  const staleColor = ageDays >= 14 ? "#f97316" : ageDays >= 7 ? "#f59e0b" : null;

  return (
    <div
      onClick={() => onOpen(card)}
      style={{
        background: isNext ? "#fefce8" : "#ffffff",
        border: `2px solid ${isNext ? "#fde047" : tier === "A+" ? "#ddd6fe" : "#e2e8f0"}`,
        borderRadius: 10,
        padding: "13px 14px",
        cursor: "pointer",
        boxShadow: isNext ? "0 2px 12px rgba(234,179,8,0.2)" : tier === "A+" ? "0 2px 8px rgba(124,58,237,0.12)" : "0 1px 3px rgba(0,0,0,0.05)",
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
      {!isNext && isAutoPriority && (
        <div style={{ position: "absolute", top: -10, left: 12,
          fontSize: 10, fontWeight: 700, color: "#7c3aed",
          background: "#faf5ff", padding: "1px 9px", borderRadius: 10,
          fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.04em",
          border: "1px solid #ddd6fe" }}>
          ⚡ AUTO-PRIORITY
        </div>
      )}
      {card.actionNeeded && (
        <div title={card.actionNote || "Action required — open card for details"}
          style={{ position: "absolute", top: -10, right: 12,
            fontSize: 10, fontWeight: 700, color: "#dc2626",
            background: "#fef2f2", padding: "1px 9px", borderRadius: 10,
            fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.04em",
            border: "1px solid #fecaca", cursor: "help" }}>
          ⚠ ACTION
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3,
            fontFamily: "'Inter',sans-serif", marginBottom: 2 }}>
            {card.title}
          </div>
          <div style={{ fontSize: 12, color: "#475569", fontFamily: "'Inter',sans-serif",
            marginBottom: card.followUpDate ? 4 : 8 }}>
            {card.company}
            {card.location && <span style={{ color: "#94a3b8" }}> · {card.location}</span>}
          </div>
          {card.followUpDate && (() => {
            const fb = followUpBadge(card.followUpDate);
            return (
              <div style={{ fontSize:10, fontWeight:700, color:fb.color,
                background:fb.bg, padding:"2px 7px", borderRadius:4, marginBottom:7,
                fontFamily:"'IBM Plex Mono',monospace", display:"inline-block",
                border:`1px solid ${fb.color}30` }}>
                {fb.label}
              </div>
            );
          })()}
        </div>
        {tier && (
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace",
            color: TIER_COLOR[tier] || "#4b5563", background: TIER_BG[tier] || "#f3f4f6",
            padding: "2px 8px", borderRadius: 5, flexShrink: 0, marginTop: 1,
            border: tier === "A+" ? "1px solid #c4b5fd" : "none",
            boxShadow: tier === "A+" ? "0 0 6px rgba(124,58,237,0.2)" : "none" }}>
            {tier === "A+" ? "⚡ A+" : tier === "A" ? "★ A" : tier}
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
        {staleColor && (
          <span title={`${ageDays} days in queue`}
            style={{ fontSize: 10, fontWeight: 700, color: staleColor,
              background: `${staleColor}18`, padding: "1px 6px",
              borderRadius: 4, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "nowrap" }}>
            {ageDays}d
          </span>
        )}
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
        marginBottom: card.followUpDate ? 4 : 8 }}>
        {card.company}
      </div>

      {card.followUpDate && (() => {
        const fb = followUpBadge(card.followUpDate);
        return (
          <div style={{ fontSize:10, fontWeight:700, color:fb.color,
            background:fb.bg, padding:"2px 7px", borderRadius:4, marginBottom:7,
            fontFamily:"'IBM Plex Mono',monospace", display:"inline-block",
            border:`1px solid ${fb.color}30` }}>
            {fb.label}
          </div>
        );
      })()}

      {card.actionNeeded && (
        <div title={card.actionNote || "Action required — open card for details"}
          style={{ fontSize:10, fontWeight:700, color:"#dc2626",
            background:"#fef2f2", padding:"2px 7px", borderRadius:4, marginBottom:7,
            fontFamily:"'IBM Plex Mono',monospace", display:"inline-block",
            border:"1px solid #fecaca", cursor:"help" }}>
          ⚠ ACTION NEEDED
        </div>
      )}

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
  const [logSearch, setLogSearch]         = React.useState("");
  const [showTypeahead, setShowTypeahead] = React.useState(false);
  const [deadOpen, setDeadOpen]           = React.useState(false);
  const [actionCenterOpen, setActionCenterOpen] = React.useState(true);

  const byStatus = {};
  ALL_COLS.forEach(s => { byStatus[s.key] = []; });
  (cards || []).forEach(c => {
    if (byStatus[c.status] !== undefined) byStatus[c.status].push(c);
    else byStatus["GHOSTED"].push(c);
  });

  const tierOrder = { "A+": 0, A: 1, B: 2, C: 3 };
  const queueSort = (a, b) => {
    const ta = tierOrder[a.tier] ?? 9, tb = tierOrder[b.tier] ?? 9;
    if (ta !== tb) return ta - tb;
    const ra = (a.location || "").toLowerCase().includes("remote") ? 0 : 1;
    const rb = (b.location || "").toLowerCase().includes("remote") ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (a.dateAdded || "").localeCompare(b.dateAdded || "");
  };
  byStatus["TARGETED"].sort(queueSort);
  byStatus["PROSPECT"].sort(queueSort);

  const totalCards      = (cards || []).length;
  const appliedToday    = (cards || []).filter(c => c.dateApplied === today()).length;
  const hotCount        = HOT_COLS.reduce((n, col) => n + byStatus[col.key].length, 0);
  const targetedCount   = byStatus["TARGETED"].length;
  const queueCount      = targetedCount + byStatus["IN_PROGRESS"].length;
  const submittedCount  = byStatus["APPLIED"].length + hotCount;
  const deadCount       = DEAD_COLS.reduce((n, col) => n + byStatus[col.key].length, 0);
  const deadStatuses = new Set(DEAD_COLS.map(c => c.key));
  const actionNeedCount  = (cards || []).filter(c => c.actionNeeded && !deadStatuses.has(c.status)).length;
  const actionNeededCards = (cards || []).filter(c => c.actionNeeded && !deadStatuses.has(c.status));

  const q = logSearch.trim().toLowerCase();
  const filterCards = (list) => {
    if (!q) return list;
    return list.filter(c =>
      (c.title   || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.notes   || "").toLowerCase().includes(q) ||
      (c.pocName || "").toLowerCase().includes(q)
    );
  };
  const isFiltered = q !== "";

  const suggestions = React.useMemo(() => {
    if (logSearch.trim().length < 2) return [];
    const lq = logSearch.trim().toLowerCase();
    const seen = new Set();
    const out  = [];
    (cards || []).forEach(c => {
      [["company", c.company], ["title", c.title]].forEach(([type, val]) => {
        if (!val) return;
        const key = `${type}:${val}`;
        if (!seen.has(key) && val.toLowerCase().includes(lq)) {
          seen.add(key);
          out.push({ type, value: val });
        }
      });
    });
    return out.slice(0, 6);
  }, [logSearch, cards]);

  const filteredTotal = isFiltered
    ? ALL_COLS.reduce((n, col) => n + filterCards(byStatus[col.key]).length, 0)
    : totalCards;

  const visibleCols = deadOpen ? ALL_COLS : ALL_COLS.filter(c => !c.isDead);
  const colTemplate = visibleCols.map(col =>
    col.isDead ? "minmax(160px, 0.85fr)" : "minmax(0, 1fr)"
  ).join(" ");

  const FIRST_DEAD_IDX = FLOW_COLS.length + HOT_COLS.length;
  const FIRST_HOT_IDX  = FLOW_COLS.length;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif",
      background:"#f8fafc" }}>

      {/* ── STATS BAR ────────────────────────────────────────────────── */}
      <div style={{ background:"#0f172a", padding:"10px 20px",
        display:"flex", alignItems:"center", flexShrink:0, gap:0, overflowX:"auto" }}>
        {[
          { label:"Queue",          value:`${targetedCount}/${QUEUE_CAP}`, color:targetedCount>=QUEUE_CAP?"#ef4444":targetedCount>=QUEUE_CAP-5?"#f97316":targetedCount>0?"#fde047":"#475569", sub:targetedCount>=QUEUE_CAP?"at cap — bump lower tier":targetedCount>0?"ready to work":"all clear" },
          { label:"Action Needed",  value:actionNeedCount, color:actionNeedCount>0?"#ef4444":"#475569", sub:actionNeedCount>0?"your decision required":"all clear" },
          { label:"Applied Today",  value:appliedToday,    color:"#38bdf8",                               sub:"this session" },
          { label:"Submitted",      value:submittedCount,  color:"#94a3b8",                               sub:"applied + callbacks" },
          { label:"Active Signals", value:hotCount,        color:hotCount>0?"#4ade80":"#475569",          sub:hotCount>0?"callback · interview · offer":"monitoring" },
        ].map((s,i,arr) => (
          <div key={s.label} style={{ textAlign:"center", padding:"0 20px",
            borderRight: i<arr.length-1 ? "1px solid #1e293b":"none", flexShrink:0 }}>
            <div style={{ fontSize:24, fontWeight:800, color:s.color, lineHeight:1, fontFamily:"'IBM Plex Mono',monospace" }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#64748b", marginTop:3, fontFamily:"'Inter',sans-serif" }}>{s.label}</div>
            <div style={{ fontSize:10, color:"#334155", marginTop:1, fontFamily:"'IBM Plex Mono',monospace" }}>{s.sub}</div>
          </div>
        ))}
        <div style={{ marginLeft:"auto", flexShrink:0, display:"flex", gap:8, alignItems:"center", paddingLeft:20 }}>
          <button onClick={exportData} style={{ padding:"7px 14px", background:"transparent",
            border:"1px solid #334155", borderRadius:7, fontSize:12, fontWeight:600,
            cursor:"pointer", color:"#94a3b8", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap" }}>
            Export
          </button>
          <label style={{ padding:"7px 14px", background:"transparent", border:"1px solid #334155",
            borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer",
            color:"#94a3b8", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap" }}>
            Import
            <input type="file" accept=".json" style={{ display:"none" }} onChange={e => {
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

      {/* ── ACTION CENTER STRIP ──────────────────────────────────────── */}
      {actionNeedCount > 0 && (
        <div style={{ background:"#fef2f2", borderBottom:"1.5px solid #fecaca", flexShrink:0 }}>
          <div
            onClick={() => setActionCenterOpen(s => !s)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 16px",
              cursor:"pointer", userSelect:"none" }}>
            <span style={{ fontSize:14 }}>⚠️</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#dc2626",
              fontFamily:"'IBM Plex Mono',monospace" }}>
              {actionNeedCount} Action{actionNeedCount > 1 ? "s" : ""} Required — Your Decision
            </span>
            <span style={{ fontSize:10, color:"#ef4444", marginLeft:"auto",
              fontFamily:"'IBM Plex Mono',monospace" }}>
              {actionCenterOpen ? "▲ Hide" : "▼ Show"}
            </span>
          </div>
          {actionCenterOpen && actionNeededCards.map(c => (
            <div key={c.id} style={{ display:"flex", alignItems:"flex-start", gap:12,
              padding:"8px 16px 10px 36px", borderTop:"1px solid #fecaca",
              background:"#fff5f5" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#0f172a",
                  fontFamily:"'Inter',sans-serif", marginBottom:3 }}>
                  {c.company}
                  <span style={{ fontWeight:400, color:"#475569" }}> — {c.title}</span>
                </div>
                <div style={{ fontSize:12, color:"#9f1239", fontFamily:"'Inter',sans-serif",
                  lineHeight:1.5 }}>
                  {c.actionNote || "Review this card and take action."}
                </div>
              </div>
              <button onClick={() => onOpenDrawer(c)}
                style={{ flexShrink:0, padding:"6px 14px", background:"#dc2626",
                  color:"#ffffff", border:"none", borderRadius:6, fontSize:11, fontWeight:700,
                  fontFamily:"'IBM Plex Mono',monospace", cursor:"pointer",
                  whiteSpace:"nowrap", boxShadow:"0 1px 4px rgba(220,38,38,0.25)" }}>
                Open Card →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── SEARCH + ARCHIVE TOGGLE ──────────────────────────────────── */}
      <div style={{ background:"#ffffff", borderBottom:"1px solid #e2e8f0",
        padding:"9px 16px", display:"flex", alignItems:"center", gap:12,
        flexShrink:0, position:"relative", zIndex:20 }}>

        <div style={{ position:"relative", flex:1 }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
            fontSize:14, color:"#94a3b8", pointerEvents:"none" }}>🔍</span>
          <input
            value={logSearch}
            onChange={e => { setLogSearch(e.target.value); setShowTypeahead(true); }}
            onBlur={() => setTimeout(() => setShowTypeahead(false), 160)}
            onFocus={() => setShowTypeahead(true)}
            placeholder="Search company · role · POC · notes…"
            style={{ width:"100%", boxSizing:"border-box", paddingLeft:32,
              paddingRight: logSearch ? 32 : 12, paddingTop:8, paddingBottom:8,
              border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13,
              fontFamily:"'Inter',sans-serif", color:"#0f172a",
              background:"#f8fafc", outline:"none" }}
          />
          {logSearch && (
            <button onClick={() => setLogSearch("")}
              style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", cursor:"pointer",
                color:"#94a3b8", fontSize:18, lineHeight:1, padding:0 }}>×</button>
          )}
          {showTypeahead && suggestions.length > 0 && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
              background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:8,
              boxShadow:"0 8px 24px rgba(0,0,0,0.12)", zIndex:100, overflow:"hidden" }}>
              {suggestions.map((s, i) => (
                <div key={i}
                  onClick={() => { setLogSearch(s.value); setShowTypeahead(false); }}
                  style={{ padding:"8px 14px", cursor:"pointer", fontSize:13,
                    fontFamily:"'Inter',sans-serif", display:"flex", alignItems:"center", gap:8,
                    borderTop: i > 0 ? "1px solid #f1f5f9":"none",
                    background:"#ffffff" }}
                  onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background="#ffffff"}>
                  <span style={{ fontSize:10, fontWeight:600, flexShrink:0,
                    color: s.type==="company" ? "#0891b2":"#6366f1",
                    background: s.type==="company" ? "#e0f9ff":"#eef2ff",
                    padding:"1px 6px", borderRadius:4, fontFamily:"'IBM Plex Mono',monospace" }}>
                    {s.type === "company" ? "co.":"role"}
                  </span>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#0f172a" }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isFiltered && (
          <span style={{ fontSize:12, color:"#64748b",
            fontFamily:"'IBM Plex Mono',monospace", whiteSpace:"nowrap" }}>
            {filteredTotal} of {totalCards}
          </span>
        )}

        <div style={{ flex:1 }} />

        <button onClick={() => setDeadOpen(s => !s)}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
            background: deadOpen ? "#fdf2f8":"#f8fafc",
            border:`1px solid ${deadOpen ? "#fbcfe8":"#e2e8f0"}`,
            borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600,
            color: deadOpen ? "#be185d":"#94a3b8",
            fontFamily:"'IBM Plex Mono',monospace", whiteSpace:"nowrap" }}>
          <span style={{ fontSize:9 }}>{deadOpen ? "▲":"▼"}</span>
          Archive
          <span style={{ fontSize:11, padding:"1px 6px", borderRadius:4,
            background: deadOpen ? "#fbcfe8":"#e2e8f0",
            color: deadOpen ? "#be185d":"#94a3b8" }}>
            {deadCount}
          </span>
        </button>
      </div>

      {/* ── UNIFIED KANBAN GRID ───────────────────────────────────────── */}
      <div style={{ flex:1, minHeight:0, overflow:"hidden", display:"grid",
        gridTemplateColumns: colTemplate,
        borderTop:"1px solid #e2e8f0" }}>

        {visibleCols.map((col, colIdx) => {
          const allColCards = byStatus[col.key];
          const colCards    = isFiltered ? filterCards(allColCards) : allColCards;
          const isProspect  = col.key === "PROSPECT";
          const isQueue     = col.key === "TARGETED";
          const isWorking   = col.key === "IN_PROGRESS";
          const isFirstHot  = colIdx === FIRST_HOT_IDX;
          const isFirstDead = deadOpen && colIdx === FIRST_DEAD_IDX;
          const isLast      = colIdx === visibleCols.length - 1;

          return (
            <div key={col.key} style={{ display:"flex", flexDirection:"column", height:"100%",
              overflow:"hidden", minWidth:0,
              borderRight: isLast ? "none" : "1px solid #e2e8f0",
              borderLeft: (isFirstHot || isFirstDead) ? "2px solid #cbd5e1":"none",
              background: col.isDead ? "#f8fafc" : "#ffffff" }}>

              {/* Column header */}
              <div style={{ padding:"9px 10px 7px", flexShrink:0,
                borderBottom:"1px solid #e2e8f0",
                borderTop:`3px solid ${col.isDead ? "#e2e8f0" : col.color}`,
                background: col.isDead ? "#f1f5f9" : col.bg }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:4 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700,
                      color: col.isDead ? "#94a3b8" : col.color,
                      fontFamily:"'Inter',sans-serif",
                      display:"flex", alignItems:"center", gap:4,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {col.isHot && <span>🔥</span>}
                      {col.label}
                    </div>
                    {col.sub && (
                      <div style={{ fontSize:10, color: col.isDead ? "#cbd5e1" : col.color, opacity:.75,
                        fontFamily:"'IBM Plex Mono',monospace", marginTop:1,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {col.sub}
                      </div>
                    )}
                  </div>
                  {isQueue && !isFiltered ? (
                    <span style={{ fontSize:12, fontWeight:800, flexShrink:0,
                      fontFamily:"'IBM Plex Mono',monospace",
                      padding:"2px 7px", borderRadius:5,
                      background:"rgba(255,255,255,0.7)",
                      color: allColCards.length >= QUEUE_CAP ? "#dc2626" : allColCards.length >= QUEUE_CAP - 5 ? "#f97316" : col.color,
                      border: allColCards.length >= QUEUE_CAP ? "1px solid #fca5a5" : "none" }}>
                      {allColCards.length}/{QUEUE_CAP}
                    </span>
                  ) : (
                    <span style={{ fontSize:12, fontWeight:800, flexShrink:0,
                      color: col.isDead ? "#cbd5e1" : col.color,
                      fontFamily:"'IBM Plex Mono',monospace",
                      background:"rgba(255,255,255,0.7)", padding:"2px 7px", borderRadius:5 }}>
                      {isFiltered ? `${colCards.length}/${allColCards.length}` : colCards.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Cards (independently scrollable) */}
              <div style={{ flex:1, overflowY:"auto", minHeight:0,
                padding:"10px 8px", display:"flex", flexDirection:"column", gap:8 }}>

                {/* Prospect: empty state */}
                {isProspect && allColCards.length === 0 && !isFiltered && (
                  <div style={{ padding:"18px 8px", textAlign:"center",
                    border:"1.5px dashed #e2e8f0", borderRadius:9,
                    background:"rgba(248,250,252,0.5)" }}>
                    <div style={{ fontSize:18, marginBottom:5 }}>✅</div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#64748b",
                      fontFamily:"'Inter',sans-serif", marginBottom:3 }}>Queue has capacity</div>
                    <div style={{ fontSize:10, color:"#94a3b8",
                      fontFamily:"'IBM Plex Mono',monospace", lineHeight:1.5 }}>
                      All prospects are in the active queue
                    </div>
                  </div>
                )}

                {/* Prospect: cards (standard Card, sorted by tier weight) */}
                {isProspect && colCards.map(card => (
                  <Card key={card.id} card={card} onOpen={onOpenDrawer}
                    compact={colCards.length > 10} />
                ))}

                {/* Queue: empty state */}
                {isQueue && allColCards.length === 0 && !isFiltered && (
                  <div style={{ padding:"18px 8px", textAlign:"center",
                    border:"1.5px dashed #c7d2fe", borderRadius:9,
                    background:"rgba(238,242,255,0.5)" }}>
                    <div style={{ fontSize:18, marginBottom:5 }}>✅</div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#6366f1",
                      fontFamily:"'Inter',sans-serif", marginBottom:3 }}>Queue empty</div>
                    <div style={{ fontSize:10, color:"#818cf8",
                      fontFamily:"'IBM Plex Mono',monospace", lineHeight:1.5 }}>
                      Run /u_job_scan<br/>to load new targets
                    </div>
                  </div>
                )}

                {/* Queue cards with NEXT UP treatment */}
                {isQueue && colCards.map((card, idx) => (
                  <QueueCard key={card.id} card={card} onOpen={onOpenDrawer} position={idx} />
                ))}

                {/* Working: empty state */}
                {isWorking && allColCards.length === 0 && !isFiltered && (
                  <div style={{ padding:"16px 8px", textAlign:"center", color:"#fbbf24",
                    fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
                    border:"1.5px dashed #fde68a", borderRadius:8 }}>
                    Nothing in progress
                  </div>
                )}

                {/* Hot cols: use HotCard */}
                {col.isHot && colCards.map(card => (
                  <HotCard key={card.id} card={card} onOpen={onOpenDrawer}
                    colColor={col.color} colBg={col.bg} colBorder={col.border} />
                ))}
                {col.isHot && allColCards.length === 0 && (
                  <div style={{ padding:"14px 8px", textAlign:"center",
                    color:col.color, opacity:.35, fontSize:11,
                    fontFamily:"'IBM Plex Mono',monospace",
                    border:`1.5px dashed ${col.border}`, borderRadius:8 }}>
                    monitoring
                  </div>
                )}

                {/* Standard cards */}
                {!isProspect && !isQueue && !col.isHot && colCards.map(card => (
                  <Card key={card.id} card={card} onOpen={onOpenDrawer}
                    compact={colCards.length > 10} />
                ))}

                {/* Empty states for standard / dead cols */}
                {!isProspect && !isQueue && !isWorking && !col.isHot && allColCards.length === 0 && (
                  <div style={{ padding:"14px 8px", textAlign:"center",
                    color: col.isDead ? "#e2e8f0":"#cbd5e1", fontSize:11,
                    fontFamily:"'Inter',sans-serif",
                    border:`1.5px dashed ${col.isDead ? "#f1f5f9":"#e2e8f0"}`,
                    borderRadius:8 }}>
                    {col.isDead ? "—" : "Empty"}
                  </div>
                )}

                {/* No-match state when filtered */}
                {isFiltered && colCards.length === 0 && allColCards.length > 0 && !isWorking && (
                  <div style={{ padding:"12px 8px", textAlign:"center",
                    color:"#94a3b8", fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
                    border:"1.5px dashed #e2e8f0", borderRadius:8 }}>
                    no matches
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// React import for useState in this file
import React from "react";
