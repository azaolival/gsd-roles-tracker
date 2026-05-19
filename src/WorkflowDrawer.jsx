import { useState } from "react";

const STEPS = [
  {
    key: "tailor",
    num: 1,
    label: "Tailor ATS.txt",
    desc: "Swap Summary + Core Competencies to match JD language.",
    detail: "File: Desktop/Aza_Olival_MBA_MortgageTech_PM_BSA_AI_Agentic_SME_ATS.txt\n\nScan JD for AI signals, platform language, specific LOS/tool names. Mirror their exact terminology in Summary + top 3 Core Competency bullets. Don't over-optimize — just align the language.",
    action: null,
  },
  {
    key: "apply",
    num: 2,
    label: "Apply",
    desc: "Submit tailored resume to ATS. Don't skip this — it's the ATS checkbox.",
    detail: "Attach PDF ColorVersion for any 'upload resume' field.\nUse ATS.txt content for copy-paste text fields.\nScreenshot or note the confirmation number if provided.",
    action: "applyUrl",
  },
  {
    key: "peopleSweep",
    num: 3,
    label: "People Sweep",
    desc: "Find the real POC via LinkedIn Sales Navigator.",
    detail: "Filter: Company + title keywords:\n• VP Product\n• Director of Product\n• SVP Technology\n• Head of AI / Chief AI Officer\n• Chief Digital Officer\n\nBackup: Google \"[Company] VP Product LinkedIn\"\nNote name + title for outreach.",
    action: "linkedinSearch",
  },
  {
    key: "outreach",
    num: 4,
    label: "Outreach",
    desc: "Direct LinkedIn connection request to POC. Under 5 sentences. No filler.",
    detail: "Framework:\n• Open with something real and specific to them or their tech initiative\n• One sentence on relevance: MISMO + BytePro + agentic AI at CMG = rare combination in mortgage PM\n• One soft ask: \"Open to a conversation if there's alignment\"\n\nIf it reads like a cover letter — rewrite it.",
    action: null,
  },
  {
    key: "logged",
    num: 5,
    label: "Log It",
    desc: "Record: company, role, POC name/title, date applied, date messaged, response status.",
    detail: "This card IS the log. Marking this step done confirms it's tracked here in the pipeline. Also CC azaolival@gmail.com on any email outreach — label: Work - GitShitDone Candidates.",
    action: null,
  },
  {
    key: "threeFronts",
    num: 6,
    label: "Confirm 3 Fronts",
    desc: "All three fronts covered before moving to the next target.",
    detail: "Three fronts required:\n✓ Online application submitted (ATS checkbox)\n✓ LinkedIn POC direct message sent\n✓ Leadership page secondary contact identified (or N/A documented)\n\nOne front is a lottery ticket. Three fronts is a campaign.",
    action: null,
  },
];

const STATUSES = [
  { key:"TARGETED",      label:"Targeted" },
  { key:"IN_PROGRESS",   label:"Working" },
  { key:"APPLIED",       label:"Applied" },
  { key:"CALLBACK",      label:"Callback" },
  { key:"INTERVIEW",     label:"Interview" },
  { key:"OFFER",         label:"Offer!" },
  { key:"COLD_OUTREACH", label:"Cold Outreach" },
  { key:"NO_THANKS",     label:"No Thanks" },
  { key:"GHOSTED",       label:"Ghosted" },
];

const STATUS_COLOR = {
  TARGETED:"#6b7280", IN_PROGRESS:"#b45309", APPLIED:"#1d4ed8",
  CALLBACK:"#7c3aed", INTERVIEW:"#059669", OFFER:"#92400e",
  COLD_OUTREACH:"#c2410c", NO_THANKS:"#dc2626", GHOSTED:"#94a3b8",
};

export function WorkflowDrawer({ open, onClose, role, card, onAddToPipeline, onUpdateCard, onMoveCard }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [editNotes, setEditNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [editPoc, setEditPoc] = useState(false);
  const [pocText, setPocText] = useState("");
  const [pocTitleText, setPocTitleText] = useState("");

  const isInPipeline = !!card;
  const isColdOutreach = card?.status === "COLD_OUTREACH";
  // For cold outreach cards, step 2 (apply) is treated as N/A — auto-counted as complete
  const steps = card?.steps
    ? (isColdOutreach ? { ...card.steps, apply: true } : card.steps)
    : {};
  const completedCount = STEPS.filter(s => steps[s.key]).length;
  const allDone = completedCount === STEPS.length;

  const display = card || role;
  if (!open || !display) return null;

  function toggleStep(stepKey) {
    if (!card) return;
    const stepIdx = STEPS.findIndex(s => s.key === stepKey);
    const prevStep = stepIdx > 0 ? STEPS[stepIdx - 1] : null;
    if (!steps[stepKey] && prevStep && !steps[prevStep.key]) return; // enforce sequence
    const newSteps = { ...steps, [stepKey]: !steps[stepKey] };
    const updates = { steps: newSteps };
    if (stepKey === "apply" && !steps[stepKey] && card.status === "TARGETED") {
      updates.status = "IN_PROGRESS";
    }
    onUpdateCard(card.id, updates);
    if (stepKey === "apply" && !steps[stepKey] && card.status === "TARGETED") {
      onMoveCard(card.id, "IN_PROGRESS");
    }
  }

  function handleAddToPipeline() {
    if (!role) return;
    onAddToPipeline({
      roleId: role.id || null,
      title: role.title,
      company: role.company,
      location: role.city || role.location || "",
      tier: role.tier || "B",
      salary: role.salary || role.est || "",
      family: role.family || "",
      applyUrl: role.url || role.applyUrl || "",
      status: "TARGETED",
      dateAdded: new Date().toISOString().slice(0, 10),
      dateApplied: null,
      pocName: "",
      pocTitle: "",
      pdfSent: false,
      notes: "",
      steps: { tailor:false, apply:false, peopleSweep:false, outreach:false, logged:false, threeFronts:false },
    });
  }

  function linkedinUrl(company) {
    const q = encodeURIComponent(`${company} VP Product Director Product SVP Technology Head AI`);
    return `https://www.linkedin.com/search/results/people/?keywords=${q}`;
  }

  const applyUrl = card?.applyUrl || role?.url || role?.applyUrl || "";
  const tierColor = { A:"#b45309", B:"#1d4ed8", C:"#4b5563" };
  const tierBg = { A:"#fef3c7", B:"#dbeafe", C:"#f3f4f6" };
  const tier = card?.tier || role?.tier;

  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", zIndex:40,
        backdropFilter:"blur(2px)",
      }}/>

      <div style={{
        position:"fixed", top:0, right:0, height:"100vh", width:520, maxWidth:"95vw",
        background:"#ffffff", zIndex:50, boxShadow:"-4px 0 28px rgba(0,0,0,0.14)",
        display:"flex", flexDirection:"column", overflow:"hidden",
        fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif",
      }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                {display.family && (
                  <span style={{ fontSize:11, fontWeight:700, letterSpacing:.7, color:"#64748b",
                    textTransform:"uppercase", fontFamily:"'IBM Plex Mono',monospace" }}>
                    {display.family}
                  </span>
                )}
                {tier && (
                  <span style={{ fontSize:11, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace",
                    color: tierColor[tier] || "#4b5563",
                    background: tierBg[tier] || "#f3f4f6",
                    padding:"1px 8px", borderRadius:4 }}>
                    Tier {tier}
                  </span>
                )}
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:"#0f172a", lineHeight:1.3,
                fontFamily:"'Inter',sans-serif", marginBottom:3 }}>
                {display.title}
              </div>
              <div style={{ fontSize:15, color:"#475569", fontFamily:"'Inter',sans-serif" }}>
                {display.company}
                {(display.city || display.location) && ` · ${display.city || display.location}`}
              </div>
              {(card?.salary || role?.est) && (
                <div style={{ fontSize:13, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace",
                  color: tierColor[tier] || "#64748b", marginTop:3 }}>
                  {card?.salary || role?.est}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{
              background:"none", border:"none", fontSize:22, cursor:"pointer",
              color:"#94a3b8", padding:"2px 8px", marginLeft:12, flexShrink:0, lineHeight:1,
            }}>✕</button>
          </div>

          {isInPipeline && (
            <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:10 }}>
              <select value={card.status} onChange={e => onMoveCard(card.id, e.target.value)}
                style={{ fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace",
                  color: STATUS_COLOR[card.status] || "#0f172a",
                  border:"1.5px solid #e2e8f0", borderRadius:6, padding:"6px 10px",
                  background:"#f8fafc", cursor:"pointer", flexShrink:0 }}>
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <div style={{ flex:1, height:7, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(completedCount/6)*100}%`,
                  background: allDone ? "#22c55e" : "#0891b2",
                  borderRadius:4, transition:"width .3s ease" }}/>
              </div>
              <span style={{ fontSize:12, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace",
                color: allDone ? "#059669" : "#0891b2", whiteSpace:"nowrap" }}>
                {completedCount}/6
              </span>
            </div>
          )}

          {!isInPipeline && (
            <button onClick={handleAddToPipeline} style={{
              marginTop:14, width:"100%", padding:"11px", borderRadius:8, border:"none",
              background:"#0891b2", color:"#ffffff", fontWeight:700, fontSize:14,
              fontFamily:"'Inter',sans-serif", cursor:"pointer",
              boxShadow:"0 2px 8px rgba(8,145,178,0.35)",
            }}>
              + Add to Pipeline &amp; Start Workflow
            </button>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px 24px" }}>

          {/* Cold outreach banner */}
          {isColdOutreach && (
            <div style={{ marginBottom:14, padding:"10px 14px", borderRadius:9,
              background:"#fff7ed", border:"1.5px solid #fed7aa",
              display:"flex", alignItems:"center", gap:9 }}>
              <span style={{ fontSize:16 }}>🎯</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#c2410c",
                  fontFamily:"'Inter',sans-serif" }}>
                  Cold Outreach — Role Closed
                </div>
                <div style={{ fontSize:12, color:"#9a3412", fontFamily:"'Inter',sans-serif", lineHeight:1.4 }}>
                  ATS is closed. Skip Apply — go straight to People Sweep and outreach.
                </div>
              </div>
            </div>
          )}

          {/* Steps */}
          {STEPS.map((step, idx) => {
            const isColdSkip = isColdOutreach && step.key === "apply";
            const done = isColdSkip ? true : !!steps[step.key];
            const locked = isInPipeline && !done && idx > 0 && !steps[STEPS[idx-1].key] && !isColdSkip;
            const isExpanded = expandedStep === step.key;
            const canInteract = isInPipeline && !locked && !isColdSkip;

            return (
              <div key={step.key} style={{
                marginBottom:9, borderRadius:10,
                border:`1.5px solid ${isColdSkip ? "#fed7aa" : done ? "#bbf7d0" : "#e2e8f0"}`,
                background: isColdSkip ? "#fff7ed" : done ? "#f0fdf4" : "#ffffff",
                overflow:"hidden", opacity: locked ? 0.5 : 1,
                transition:"opacity .15s",
              }}>
                <div style={{
                  display:"flex", alignItems:"center", gap:11, padding:"11px 14px",
                  cursor: canInteract ? "pointer" : "default",
                }}
                  onClick={() => canInteract && setExpandedStep(isExpanded ? null : step.key)}
                >
                  <div
                    onClick={e => { e.stopPropagation(); if (canInteract) toggleStep(step.key); }}
                    style={{
                      width:24, height:24, borderRadius:6, flexShrink:0,
                      border:`2px solid ${isColdSkip ? "#fb923c" : done ? "#22c55e" : locked ? "#cbd5e1" : "#0891b2"}`,
                      background: isColdSkip ? "#fb923c" : done ? "#22c55e" : "transparent",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      cursor: canInteract ? "pointer" : "default",
                      transition:"background .15s, border-color .15s",
                    }}>
                    {isColdSkip
                      ? <span style={{ color:"#fff", fontSize:11, fontWeight:800, lineHeight:1 }}>N/A</span>
                      : done && <span style={{ color:"#fff", fontSize:13, fontWeight:800, lineHeight:1 }}>✓</span>
                    }
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ fontSize:11, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace",
                        color: isColdSkip ? "#c2410c" : done ? "#16a34a" : locked ? "#94a3b8" : "#0891b2" }}>
                        {step.num}
                      </span>
                      <span style={{ fontSize:14, fontWeight:600, fontFamily:"'Inter',sans-serif",
                        color: isColdSkip ? "#9a3412" : done ? "#166534" : locked ? "#94a3b8" : "#0f172a",
                        textDecoration: (done && !isColdSkip) ? "line-through" : "none" }}>
                        {isColdSkip ? "Apply — N/A (Role Closed)" : step.label}
                      </span>
                    </div>
                    {!isExpanded && (
                      <div style={{ fontSize:12,
                        color: isColdSkip ? "#c2410c" : locked ? "#94a3b8" : "#64748b",
                        fontFamily:"'Inter',sans-serif", marginTop:2, lineHeight:1.4 }}>
                        {isColdSkip ? "ATS closed — outreach only. People Sweep + DM = the play." : step.desc}
                      </div>
                    )}
                  </div>

                  {canInteract && (
                    <span style={{ fontSize:11, color:"#94a3b8", flexShrink:0 }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ padding:"0 14px 14px 49px" }}>
                    <div style={{ fontSize:13, color:"#475569", fontFamily:"'Inter',sans-serif",
                      lineHeight:1.7, whiteSpace:"pre-line", marginBottom: step.action ? 10 : 0 }}>
                      {step.detail}
                    </div>
                    {step.action === "applyUrl" && applyUrl && (
                      <a href={applyUrl} target="_blank" rel="noreferrer"
                        style={{ display:"inline-block", marginTop:8, padding:"8px 16px",
                          background:"#0891b2", color:"#fff", borderRadius:7, fontSize:13,
                          fontWeight:700, fontFamily:"'Inter',sans-serif", textDecoration:"none",
                          boxShadow:"0 2px 6px rgba(8,145,178,0.3)" }}>
                        Go to Application →
                      </a>
                    )}
                    {step.action === "linkedinSearch" && (
                      <a href={linkedinUrl(display.company)} target="_blank" rel="noreferrer"
                        style={{ display:"inline-block", marginTop:8, padding:"8px 16px",
                          background:"#1d4ed8", color:"#fff", borderRadius:7, fontSize:13,
                          fontWeight:700, fontFamily:"'Inter',sans-serif", textDecoration:"none",
                          boxShadow:"0 2px 6px rgba(29,78,216,0.3)" }}>
                        Search LinkedIn →
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* POC */}
          {isInPipeline && (
            <div style={{ marginTop:18 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:.6, textTransform:"uppercase",
                color:"#64748b", fontFamily:"'IBM Plex Mono',monospace", marginBottom:7 }}>
                Point of Contact
              </div>
              {editPoc ? (
                <>
                  <input value={pocText} onChange={e => setPocText(e.target.value)}
                    placeholder="Name" style={{ width:"100%", padding:"8px 11px", fontSize:13,
                      fontFamily:"'Inter',sans-serif", border:"1.5px solid #0891b2", borderRadius:7,
                      marginBottom:6, boxSizing:"border-box", color:"#0f172a" }}/>
                  <input value={pocTitleText} onChange={e => setPocTitleText(e.target.value)}
                    placeholder="Title" style={{ width:"100%", padding:"8px 11px", fontSize:13,
                      fontFamily:"'Inter',sans-serif", border:"1.5px solid #e2e8f0", borderRadius:7,
                      marginBottom:8, boxSizing:"border-box", color:"#0f172a" }}/>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => {
                      onUpdateCard(card.id, { pocName: pocText, pocTitle: pocTitleText });
                      setEditPoc(false);
                    }} style={{ padding:"6px 14px", background:"#0891b2", color:"#fff",
                      border:"none", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                      Save
                    </button>
                    <button onClick={() => setEditPoc(false)}
                      style={{ padding:"6px 14px", background:"#f1f5f9", color:"#475569",
                        border:"none", borderRadius:6, fontSize:13, cursor:"pointer" }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div onClick={() => { setPocText(card.pocName || ""); setPocTitleText(card.pocTitle || ""); setEditPoc(true); }}
                  style={{ padding:"9px 12px", background:"#f8fafc", borderRadius:8, fontSize:13,
                    color: card.pocName ? "#0f172a" : "#94a3b8", fontFamily:"'Inter',sans-serif",
                    cursor:"pointer", border:"1.5px solid #e2e8f0", lineHeight:1.55 }}>
                  {card.pocName ? `${card.pocName}${card.pocTitle ? ` — ${card.pocTitle}` : ""}` : "Click to add POC…"}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {isInPipeline && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:.6, textTransform:"uppercase",
                color:"#64748b", fontFamily:"'IBM Plex Mono',monospace", marginBottom:7 }}>
                Notes
              </div>
              {editNotes ? (
                <>
                  <textarea value={notesText} onChange={e => setNotesText(e.target.value)}
                    style={{ width:"100%", minHeight:80, padding:"9px 11px", fontSize:13,
                      fontFamily:"'Inter',sans-serif", border:"1.5px solid #0891b2", borderRadius:8,
                      resize:"vertical", color:"#0f172a", boxSizing:"border-box", lineHeight:1.6 }}/>
                  <div style={{ display:"flex", gap:8, marginTop:6 }}>
                    <button onClick={() => { onUpdateCard(card.id, { notes: notesText }); setEditNotes(false); }}
                      style={{ padding:"6px 14px", background:"#0891b2", color:"#fff",
                        border:"none", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                      Save
                    </button>
                    <button onClick={() => setEditNotes(false)}
                      style={{ padding:"6px 14px", background:"#f1f5f9", color:"#475569",
                        border:"none", borderRadius:6, fontSize:13, cursor:"pointer" }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div onClick={() => { setNotesText(card.notes || ""); setEditNotes(true); }}
                  style={{ padding:"9px 12px", background:"#f8fafc", borderRadius:8, fontSize:13,
                    color: card.notes ? "#475569" : "#94a3b8", fontFamily:"'Inter',sans-serif",
                    cursor:"pointer", border:"1.5px solid #e2e8f0", lineHeight:1.6, minHeight:46 }}>
                  {card.notes || "Click to add notes…"}
                </div>
              )}
            </div>
          )}

          {/* All-done banner */}
          {isInPipeline && allDone && (
            <div style={{ marginTop:20, padding:"14px 16px", background:"#f0fdf4",
              border:"1.5px solid #bbf7d0", borderRadius:10, textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#16a34a", fontFamily:"'Inter',sans-serif" }}>
                Three fronts confirmed. Target fully worked.
              </div>
              <div style={{ fontSize:12, color:"#22c55e", fontFamily:"'IBM Plex Mono',monospace", marginTop:4 }}>
                Update status above · Watch for callbacks
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
