import { useState, useEffect, useRef } from "react";

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
  { key:"TARGETED",           label:"Targeted" },
  { key:"IN_PROGRESS",        label:"Working" },
  { key:"APPLIED",            label:"Applied" },
  { key:"CALLBACK",           label:"Callback" },
  { key:"INTERVIEW",          label:"Interview" },
  { key:"OFFER",              label:"Offer!" },
  { key:"COLD_OUTREACH",      label:"Cold Outreach" },
  { key:"NO_THANKS",          label:"No Thanks" },
  { key:"NOT_MOVING_FORWARD", label:"Not Moving Forward" },
  { key:"GHOSTED",            label:"Ghosted" },
];

const STATUS_COLOR = {
  TARGETED:"#6b7280", IN_PROGRESS:"#b45309", APPLIED:"#1d4ed8",
  CALLBACK:"#7c3aed", INTERVIEW:"#059669", OFFER:"#92400e",
  COLD_OUTREACH:"#c2410c", NO_THANKS:"#dc2626",
  NOT_MOVING_FORWARD:"#be185d", GHOSTED:"#94a3b8",
};

export function WorkflowDrawer({ open, onClose, role, card, onAddToPipeline, onUpdateCard, onMoveCard }) {
  const [expandedStep, setExpandedStep]       = useState(null);
  const [pocText, setPocText]                 = useState("");
  const [pocTitleText, setPocTitleText]       = useState("");
  const [notesText, setNotesText]             = useState("");
  const [followUpDateText, setFollowUpDate]   = useState("");
  const [savedFlash, setSavedFlash]           = useState(false);
  const [stepSaved, setStepSaved]             = useState(null);
  const [addedFlash, setAddedFlash]           = useState(false);
  const [actionNoteText, setActionNoteText]   = useState("");
  const saveTimerRef                          = useRef(null);
  const stepTimerRef                          = useRef(null);

  const isInPipeline  = !!card;
  const isColdOutreach = card?.status === "COLD_OUTREACH";
  const steps = card?.steps
    ? (isColdOutreach ? { ...card.steps, apply: true } : card.steps)
    : {};
  const completedCount = STEPS.filter(s => steps[s.key]).length;
  const allDone = completedCount === STEPS.length;

  const display = card || role;

  // Sync local editable fields whenever the open card changes
  useEffect(() => {
    if (card) {
      setPocText(card.pocName || "");
      setPocTitleText(card.pocTitle || "");
      setNotesText(card.notes || "");
      setFollowUpDate(card.followUpDate || "");
      setActionNoteText(card.actionNote || "");
    }
    setExpandedStep(null);
    setSavedFlash(false);
    setStepSaved(null);
  }, [card?.id, open]);

  if (!open || !display) return null;

  const hasChanges = card && (
    pocText          !== (card.pocName      || "") ||
    pocTitleText     !== (card.pocTitle     || "") ||
    notesText        !== (card.notes        || "") ||
    followUpDateText !== (card.followUpDate || "") ||
    actionNoteText   !== (card.actionNote   || "")
  );

  function addDays(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function followUpStatus(dateStr) {
    if (!dateStr) return null;
    const today = new Date().toISOString().slice(0, 10);
    const diff  = Math.round((new Date(dateStr) - new Date(today)) / 86400000);
    if (diff < 0)  return { label:`OVERDUE ${Math.abs(diff)}d`, color:"#ef4444", bg:"#fef2f2" };
    if (diff === 0) return { label:"Due today",                  color:"#d97706", bg:"#fffbeb" };
    if (diff <= 2)  return { label:`Due in ${diff}d`,            color:"#d97706", bg:"#fffbeb" };
    return               { label:`${diff} days out`,             color:"#0891b2", bg:"#f0f9ff" };
  }

  function flashSaved() {
    setSavedFlash(true);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSavedFlash(false), 2200);
  }

  function handleSaveChanges() {
    if (!card) return;
    onUpdateCard(card.id, {
      pocName:      pocText.trim(),
      pocTitle:     pocTitleText.trim(),
      notes:        notesText,
      followUpDate: followUpDateText || null,
      actionNote:   actionNoteText.trim() || null,
      actionNeeded: actionNoteText.trim().length > 0,
    });
    flashSaved();
  }

  function toggleStep(stepKey) {
    if (!card) return;
    const stepIdx = STEPS.findIndex(s => s.key === stepKey);
    const prevStep = stepIdx > 0 ? STEPS[stepIdx - 1] : null;
    if (!steps[stepKey] && prevStep && !steps[prevStep.key]) return;

    const newSteps = { ...steps, [stepKey]: !steps[stepKey] };
    const updates  = { steps: newSteps };
    if (stepKey === "apply" && !steps[stepKey] && card.status === "TARGETED") {
      updates.status = "IN_PROGRESS";
    }
    onUpdateCard(card.id, updates);
    if (stepKey === "apply" && !steps[stepKey] && card.status === "TARGETED") {
      onMoveCard(card.id, "IN_PROGRESS");
    }

    // Flash the step row to confirm save
    setStepSaved(stepKey);
    clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => setStepSaved(null), 1500);
  }

  function handleAddToPipeline() {
    if (!role) return;
    onAddToPipeline({
      roleId:      role.id || null,
      title:       role.title,
      company:     role.company,
      location:    role.city || role.location || "",
      tier:        role.tier || "B",
      salary:      role.salary || role.est || "",
      family:      role.family || "",
      applyUrl:    role.url || role.applyUrl || "",
      status:      "TARGETED",
      dateAdded:   new Date().toISOString().slice(0, 10),
      dateApplied: null,
      pocName:     "",
      pocTitle:    "",
      pdfSent:     false,
      notes:       "",
      steps:       { tailor:false, apply:false, peopleSweep:false, outreach:false, logged:false, threeFronts:false },
    });
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 2500);
  }

  function linkedinUrl(company) {
    const q = encodeURIComponent(`${company} VP Product Director Product SVP Technology Head AI`);
    return `https://www.linkedin.com/search/results/people/?keywords=${q}`;
  }

  const applyUrl = card?.applyUrl || role?.url || role?.applyUrl || "";
  const tierColor = { A:"#b45309", B:"#1d4ed8", C:"#4b5563" };
  const tierBg    = { A:"#fef3c7", B:"#dbeafe", C:"#f3f4f6" };
  const tier      = card?.tier || role?.tier;

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

        {/* ── HEADER ───────────────────────────────────────────────── */}
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
            <button
              onClick={handleAddToPipeline}
              disabled={addedFlash}
              style={{
                marginTop:14, width:"100%", padding:"11px", borderRadius:8, border:"none",
                background: addedFlash ? "#059669" : "#0891b2",
                color:"#ffffff", fontWeight:700, fontSize:14,
                fontFamily:"'Inter',sans-serif", cursor: addedFlash ? "default" : "pointer",
                boxShadow: addedFlash ? "0 2px 8px rgba(5,150,105,0.35)" : "0 2px 8px rgba(8,145,178,0.35)",
                transition:"background .2s",
              }}>
              {addedFlash ? "Added to Pipeline — tracked in system of record" : "+ Add to Pipeline & Start Workflow"}
            </button>
          )}
        </div>

        {/* ── SCROLLABLE BODY ──────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px 24px" }}>

          {/* Action Needed banner */}
          {card?.actionNeeded && (
            <div style={{ marginBottom:14, padding:"10px 14px", borderRadius:9,
              background:"#fef2f2", border:"2px solid #fecaca",
              display:"flex", alignItems:"flex-start", gap:9 }}>
              <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#dc2626",
                  fontFamily:"'Inter',sans-serif", marginBottom:3 }}>
                  Action Required — Your Decision
                </div>
                <div style={{ fontSize:12, color:"#9f1239", fontFamily:"'Inter',sans-serif",
                  lineHeight:1.5 }}>
                  {card.actionNote || "Review this card and take action."}
                </div>
                <button onClick={() => {
                  setActionNoteText("");
                  onUpdateCard(card.id, { actionNeeded: false, actionNote: null });
                }} style={{ marginTop:8, fontSize:11, fontWeight:700, color:"#dc2626",
                  background:"transparent", border:"1px solid #fecaca", borderRadius:5,
                  padding:"3px 10px", cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" }}>
                  Clear Flag
                </button>
              </div>
            </div>
          )}

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

          {/* ── STEPS ────────────────────────────────────────────────── */}
          {STEPS.map((step, idx) => {
            const isColdSkip  = isColdOutreach && step.key === "apply";
            const done        = isColdSkip ? true : !!steps[step.key];
            const locked      = isInPipeline && !done && idx > 0 && !steps[STEPS[idx-1].key] && !isColdSkip;
            const isExpanded  = expandedStep === step.key;
            const canInteract = isInPipeline && !locked && !isColdSkip;
            const justSaved   = stepSaved === step.key;

            return (
              <div key={step.key} style={{
                marginBottom:9, borderRadius:10,
                border:`1.5px solid ${justSaved ? "#22c55e" : isColdSkip ? "#fed7aa" : done ? "#bbf7d0" : "#e2e8f0"}`,
                background: justSaved ? "#f0fdf4" : isColdSkip ? "#fff7ed" : done ? "#f0fdf4" : "#ffffff",
                overflow:"hidden", opacity: locked ? 0.5 : 1,
                transition:"border-color .2s, background .2s, opacity .15s",
              }}>
                <div style={{
                  display:"flex", alignItems:"center", gap:11, padding:"11px 14px",
                  cursor: canInteract ? "pointer" : "default",
                }}
                  onClick={() => canInteract && setExpandedStep(isExpanded ? null : step.key)}
                >
                  {/* Checkbox */}
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

                  {/* Saved flash badge */}
                  {justSaved && (
                    <span style={{
                      fontSize:10, fontWeight:700, color:"#16a34a",
                      fontFamily:"'IBM Plex Mono',monospace",
                      background:"#dcfce7", padding:"2px 7px", borderRadius:5,
                      flexShrink:0, letterSpacing:"0.03em",
                    }}>
                      Saved
                    </span>
                  )}

                  {canInteract && !justSaved && (
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

          {/* ── POC ──────────────────────────────────────────────────── */}
          {isInPipeline && (
            <div style={{ marginTop:18 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:.6, textTransform:"uppercase",
                color:"#64748b", fontFamily:"'IBM Plex Mono',monospace", marginBottom:7 }}>
                Point of Contact
              </div>
              <input
                value={pocText}
                onChange={e => setPocText(e.target.value)}
                placeholder="Name"
                style={{ width:"100%", padding:"8px 11px", fontSize:13,
                  fontFamily:"'Inter',sans-serif",
                  border:`1.5px solid ${pocText !== (card.pocName||"") ? "#0891b2" : "#e2e8f0"}`,
                  borderRadius:7, marginBottom:6, boxSizing:"border-box", color:"#0f172a",
                  background:"#f8fafc", outline:"none", transition:"border-color .15s" }}
              />
              <input
                value={pocTitleText}
                onChange={e => setPocTitleText(e.target.value)}
                placeholder="Title"
                style={{ width:"100%", padding:"8px 11px", fontSize:13,
                  fontFamily:"'Inter',sans-serif",
                  border:`1.5px solid ${pocTitleText !== (card.pocTitle||"") ? "#0891b2" : "#e2e8f0"}`,
                  borderRadius:7, boxSizing:"border-box", color:"#0f172a",
                  background:"#f8fafc", outline:"none", transition:"border-color .15s" }}
              />
            </div>
          )}

          {/* ── NOTES ────────────────────────────────────────────────── */}
          {isInPipeline && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:.6, textTransform:"uppercase",
                color:"#64748b", fontFamily:"'IBM Plex Mono',monospace", marginBottom:7 }}>
                Notes
              </div>
              <textarea
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                placeholder="Add notes…"
                style={{ width:"100%", minHeight:80, padding:"9px 11px", fontSize:13,
                  fontFamily:"'Inter',sans-serif",
                  border:`1.5px solid ${notesText !== (card.notes||"") ? "#0891b2" : "#e2e8f0"}`,
                  borderRadius:8, resize:"vertical", color:"#0f172a", boxSizing:"border-box",
                  lineHeight:1.6, background:"#f8fafc", outline:"none", transition:"border-color .15s" }}
              />
            </div>
          )}

          {/* ── FOLLOW-UP DATE ───────────────────────────────────────── */}
          {isInPipeline && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:.6, textTransform:"uppercase",
                color:"#64748b", fontFamily:"'IBM Plex Mono',monospace", marginBottom:7 }}>
                Follow-Up Date
              </div>

              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:7 }}>
                <input
                  type="date"
                  value={followUpDateText}
                  onChange={e => setFollowUpDate(e.target.value)}
                  style={{ flex:1, padding:"8px 11px", fontSize:13,
                    fontFamily:"'Inter',sans-serif",
                    border:`1.5px solid ${followUpDateText !== (card.followUpDate||"") ? "#0891b2" : "#e2e8f0"}`,
                    borderRadius:7, boxSizing:"border-box", color:"#0f172a",
                    background:"#f8fafc", outline:"none", transition:"border-color .15s" }}
                />
                {followUpDateText && (
                  <button onClick={() => setFollowUpDate("")}
                    style={{ padding:"7px 12px", fontSize:12, fontWeight:600,
                      border:"1px solid #e2e8f0", borderRadius:7, background:"#ffffff",
                      color:"#94a3b8", cursor:"pointer", fontFamily:"'Inter',sans-serif",
                      whiteSpace:"nowrap" }}>
                    Clear
                  </button>
                )}
              </div>

              {/* Quick presets */}
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:7 }}>
                {[["Tomorrow", 1],["+3d", 3],["+5d", 5],["+7d", 7],["+14d", 14]].map(([label, days]) => (
                  <button key={label} onClick={() => setFollowUpDate(addDays(days))}
                    style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:6,
                      border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b",
                      cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace",
                      transition:"background .1s, color .1s" }}
                    onMouseEnter={e => { e.currentTarget.style.background="#0891b2"; e.currentTarget.style.color="#ffffff"; e.currentTarget.style.borderColor="#0891b2"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.color="#64748b"; e.currentTarget.style.borderColor="#e2e8f0"; }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Live status */}
              {followUpDateText && (() => {
                const fs = followUpStatus(followUpDateText);
                return (
                  <div style={{ fontSize:12, fontWeight:700, color:fs.color,
                    background:fs.bg, fontFamily:"'IBM Plex Mono',monospace",
                    padding:"5px 10px", borderRadius:6, display:"inline-block",
                    border:`1px solid ${fs.color}30` }}>
                    {fs.label}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── ACTION NEEDED FLAG ──────────────────────────────────── */}
          {isInPipeline && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:.6, textTransform:"uppercase",
                color: actionNoteText.trim() ? "#dc2626" : "#64748b",
                fontFamily:"'IBM Plex Mono',monospace", marginBottom:7,
                display:"flex", alignItems:"center", gap:6 }}>
                {actionNoteText.trim() ? "⚠ Action Needed" : "⚠ Flag for Action"}
              </div>
              <textarea
                value={actionNoteText}
                onChange={e => setActionNoteText(e.target.value)}
                placeholder="Describe what needs your attention — leave blank to clear the flag…"
                style={{ width:"100%", minHeight:60, padding:"9px 11px", fontSize:13,
                  fontFamily:"'Inter',sans-serif",
                  border:`1.5px solid ${actionNoteText.trim() ? "#ef4444" : actionNoteText !== (card.actionNote||"") ? "#0891b2" : "#e2e8f0"}`,
                  borderRadius:8, resize:"vertical", color:"#dc2626", boxSizing:"border-box",
                  lineHeight:1.6, background: actionNoteText.trim() ? "#fef2f2" : "#f8fafc",
                  outline:"none", transition:"border-color .15s, background .15s" }}
              />
              <div style={{ fontSize:11, color:"#94a3b8", fontFamily:"'Inter',sans-serif", marginTop:4 }}>
                Type to set flag. Clear text to remove it. Saves with the card.
              </div>
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

        {/* ── SAVE FOOTER (pipeline cards only) ───────────────────── */}
        {isInPipeline && (
          <div style={{
            padding:"14px 24px",
            borderTop:"1px solid #e2e8f0",
            flexShrink:0,
            background: savedFlash ? "#f0fdf4" : "#f8fafc",
            transition:"background .3s",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <button
              onClick={handleSaveChanges}
              disabled={!hasChanges && !savedFlash}
              style={{
                flex:1, padding:"10px 0", borderRadius:8, border:"none", cursor: hasChanges ? "pointer" : "default",
                background: savedFlash
                  ? "#059669"
                  : hasChanges
                    ? "#0891b2"
                    : "#e2e8f0",
                color: (savedFlash || hasChanges) ? "#ffffff" : "#94a3b8",
                fontWeight:700, fontSize:14,
                fontFamily:"'Inter',sans-serif",
                transition:"background .2s, color .2s",
                boxShadow: hasChanges ? "0 2px 8px rgba(8,145,178,0.25)" : "none",
              }}>
              {savedFlash ? "Saved to system of record" : hasChanges ? "Save Changes" : "No changes"}
            </button>
            {hasChanges && (
              <span style={{ fontSize:11, color:"#94a3b8", fontFamily:"'IBM Plex Mono',monospace", whiteSpace:"nowrap" }}>
                unsaved
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
