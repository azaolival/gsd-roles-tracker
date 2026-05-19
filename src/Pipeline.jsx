const STATUSES = [
  { key:"TARGETED",      label:"Targeted",      color:"#6b7280", bg:"#f9fafb", border:"#e5e7eb" },
  { key:"IN_PROGRESS",   label:"Working",       color:"#b45309", bg:"#fffbeb", border:"#fde68a" },
  { key:"APPLIED",       label:"Applied",       color:"#1d4ed8", bg:"#eff6ff", border:"#bfdbfe" },
  { key:"CALLBACK",      label:"Callback",      color:"#7c3aed", bg:"#faf5ff", border:"#ddd6fe" },
  { key:"INTERVIEW",     label:"Interview!",    color:"#059669", bg:"#ecfdf5", border:"#a7f3d0" },
  { key:"OFFER",         label:"Offer!",        color:"#92400e", bg:"#fefce8", border:"#fde047" },
  { key:"COLD_OUTREACH", label:"Cold Outreach", color:"#c2410c", bg:"#fff7ed", border:"#fed7aa" },
  { key:"NO_THANKS",     label:"No Thanks",     color:"#dc2626", bg:"#fef2f2", border:"#fecaca" },
  { key:"GHOSTED",       label:"Ghosted",       color:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0" },
];

const TIER_COLOR = { A:"#b45309", B:"#1d4ed8", C:"#4b5563" };
const TIER_BG    = { A:"#fef3c7", B:"#dbeafe", C:"#f3f4f6" };

function stepsCount(steps) {
  if (!steps) return 0;
  return Object.values(steps).filter(Boolean).length;
}

export function Pipeline({ cards, moveCard, deleteCard, exportData, importData, onOpenDrawer }) {
  const byStatus = {};
  STATUSES.forEach(s => { byStatus[s.key] = []; });
  (cards || []).forEach(c => {
    if (byStatus[c.status]) byStatus[c.status].push(c);
    else byStatus["GHOSTED"].push(c);
  });

  const total = (cards || []).length;
  const fullyWorked = (cards || []).filter(c => stepsCount(c.steps) === 6).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"calc(100vh - 120px)",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif" }}>

      {/* Stats bar */}
      <div style={{ display:"flex", alignItems:"center", gap:0, padding:"12px 28px",
        borderBottom:"1px solid #e2e8f0", background:"#ffffff", overflowX:"auto", flexShrink:0 }}>
        {STATUSES.map((s, i) => (
          <div key={s.key} style={{ textAlign:"center", padding:"0 18px",
            borderRight: i < STATUSES.length - 1 ? "1px solid #f1f5f9" : "none",
            flexShrink:0 }}>
            <div style={{ fontSize:22, fontWeight:800, color:s.color,
              fontFamily:"'IBM Plex Mono',monospace", lineHeight:1 }}>
              {byStatus[s.key].length}
            </div>
            <div style={{ fontSize:11, color:"#64748b", fontFamily:"'Inter',sans-serif",
              marginTop:2, whiteSpace:"nowrap" }}>
              {s.label}
            </div>
          </div>
        ))}
        <div style={{ marginLeft:"auto", flexShrink:0, display:"flex", alignItems:"center", gap:10, paddingLeft:16 }}>
          <span style={{ fontSize:12, color:"#94a3b8", fontFamily:"'IBM Plex Mono',monospace", whiteSpace:"nowrap" }}>
            {total} total · {fullyWorked} fully worked
          </span>
          <button onClick={exportData} style={{
            padding:"7px 14px", background:"#f8fafc", border:"1.5px solid #e2e8f0",
            borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer",
            color:"#475569", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap",
          }}>
            Export JSON
          </button>
          <label style={{
            padding:"7px 14px", background:"#f0fdf4", border:"1.5px solid #bbf7d0",
            borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer",
            color:"#15803d", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap",
          }}>
            Import JSON
            <input type="file" accept=".json" style={{ display:"none" }} onChange={e => {
              const file = e.target.files[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => { try { importData(JSON.parse(ev.target.result)); } catch(err) { alert("Invalid JSON file"); } };
              reader.readAsText(file);
              e.target.value = "";
            }} />
          </label>
        </div>
      </div>

      {/* Kanban columns */}
      <div style={{ display:"flex", gap:14, padding:"20px 28px 32px",
        overflowX:"auto", alignItems:"flex-start", flex:1 }}>
        {STATUSES.map(s => {
          const colCards = byStatus[s.key];
          return (
            <div key={s.key} style={{ flexShrink:0, width:252, display:"flex", flexDirection:"column", gap:9 }}>

              {/* Column header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"8px 12px", background:s.bg, borderRadius:8, border:`1.5px solid ${s.border}`,
                flexShrink:0 }}>
                <span style={{ fontSize:13, fontWeight:700, color:s.color,
                  fontFamily:"'Inter',sans-serif" }}>
                  {s.label}
                </span>
                <span style={{ fontSize:12, fontWeight:700, color:s.color,
                  fontFamily:"'IBM Plex Mono',monospace",
                  background:"rgba(255,255,255,0.65)", padding:"1px 7px", borderRadius:4 }}>
                  {colCards.length}
                </span>
              </div>

              {/* Cards */}
              {colCards.map(card => {
                const done = stepsCount(card.steps);
                const allDone = done === 6;
                return (
                  <div key={card.id}
                    onClick={() => onOpenDrawer(card)}
                    style={{
                      background:"#ffffff",
                      border:`1.5px solid ${allDone ? "#bbf7d0" : "#e2e8f0"}`,
                      borderRadius:10, padding:"12px 13px", cursor:"pointer",
                      boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
                      transition:"box-shadow .15s, transform .1s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.1)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", lineHeight:1.35,
                      fontFamily:"'Inter',sans-serif", marginBottom:3 }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize:12, color:"#475569", fontFamily:"'Inter',sans-serif",
                      marginBottom:8 }}>
                      {card.company}
                    </div>

                    {/* Progress + tier */}
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ flex:1, height:4, background:"#f1f5f9", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(done/6)*100}%`,
                          background: allDone ? "#22c55e" : "#0891b2", borderRadius:2,
                          transition:"width .3s" }}/>
                      </div>
                      <span style={{ fontSize:10, fontFamily:"'IBM Plex Mono',monospace",
                        color: allDone ? "#16a34a" : "#94a3b8", whiteSpace:"nowrap" }}>
                        {done}/6
                      </span>
                      {card.tier && (
                        <span style={{ fontSize:10, fontWeight:700,
                          fontFamily:"'IBM Plex Mono',monospace",
                          color: TIER_COLOR[card.tier] || "#4b5563",
                          background: TIER_BG[card.tier] || "#f3f4f6",
                          padding:"1px 6px", borderRadius:4 }}>
                          {card.tier}
                        </span>
                      )}
                    </div>

                    {/* Notes snippet */}
                    {card.notes && (
                      <div style={{ fontSize:11, color:"#94a3b8", fontFamily:"'Inter',sans-serif",
                        marginTop:6, lineHeight:1.35,
                        overflow:"hidden", textOverflow:"ellipsis",
                        display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                        {card.notes}
                      </div>
                    )}

                    {/* POC indicator */}
                    {card.pocName && (
                      <div style={{ fontSize:10, color:"#7c3aed", fontFamily:"'IBM Plex Mono',monospace",
                        marginTop:5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        ◎ {card.pocName}
                      </div>
                    )}
                  </div>
                );
              })}

              {colCards.length === 0 && (
                <div style={{ padding:"18px 12px", textAlign:"center", color:"#cbd5e1",
                  fontSize:12, fontFamily:"'Inter',sans-serif",
                  border:"1.5px dashed #e2e8f0", borderRadius:8 }}>
                  Empty
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
