import { useState, useMemo, useCallback, useEffect } from "react";
import { Pipeline } from "./Pipeline";
import { WorkflowDrawer } from "./WorkflowDrawer";
import { usePipeline } from "./hooks/usePipeline";

// ─────────────────────────────────────────────────────────────────────────────
// MORTGAGE PRODUCT ROLE ECOSYSTEM · Compiled May 17, 2026
//
// THREE GEOGRAPHIC BUCKETS:
//   🌉 BAY AREA HYBRID    — SF / Oakland / East Bay / Peninsula (2–3 days/wk)
//   🏢 SOUTH BAY ONSITE   — San Jose / SC / Sunnyvale / Palo Alto / Pleasanton (daily)
//   🌐 REMOTE NATIONAL    — Fully remote, open to CA / Paso Robles area applicants
//
// EXPANDED ROLE FAMILIES — same core DNA, different titles.
// Search body text, not just title. Key shared traits:
//   • Mortgage domain (LOS, servicing, origination, secondary)
//   • Requirements ownership (user stories, epics, acceptance criteria)
//   • Agile delivery (sprints, backlog, ceremonies, roadmap)
//   • Cross-functional bridge (business ↔ tech ↔ vendor ↔ ops)
//   • Stakeholder management & executive communication
//   • UAT coordination, process documentation, change management
//   • Vendor/system evaluation (Encompass, MSP, LoanServ, Blend, etc.)
//
// ROLE FAMILY LEGEND:
//   PM/PO/BA    Product Manager / Product Owner / Business Analyst / Sr. BSA
//   DELIVERY    Delivery Manager / Agile Delivery Lead / Program Manager / TPM
//   SCRUM       Scrum Master / RTE / Agile Coach
//   IMPL        Implementation Manager / Consultant / Functional Consultant
//   SOLNS       Solutions Consultant / Solutions Architect / Engagement Manager
//   CSM         Customer Success Manager / Client Delivery Manager (enterprise)
//   OPS         Product Operations / Strategy & Operations / Process Excellence
//   CHANGE      Change Manager / Change Consultant / Transformation Lead
//   QA          UAT Lead / QA Analyst (functional / mortgage domain)
//   DATA        Data/Reporting Analyst (mortgage tech, Power BI, LOS data)
//   COMPLIANCE  Mortgage Compliance Analyst / Regulatory Analyst (tech-facing)
// ─────────────────────────────────────────────────────────────────────────────

const B = {
  REM: "🌐 Remote — National",
  BAY: "🌉 Bay Area Hybrid",
  SB:  "🏢 South Bay / Silicon Valley Onsite",
};

const META = {
  [B.BAY]: { c:"#0369a1", bg:"#e0f2fe", sub:"SF · East Bay · Peninsula · 2–3 days/wk in office" },
  [B.SB]:  { c:"#6d28d9", bg:"#ede9fe", sub:"San Jose · Santa Clara · Palo Alto · Pleasanton · daily commute" },
  [B.REM]: { c:"#047857", bg:"#d1fae5", sub:"Fully remote — open to Paso Robles / CA applicants" },
};

const FAMILY_COLORS = {
  "PM/PO/BA":   "#0369a1",
  "DELIVERY":   "#b45309",
  "SCRUM":      "#c2410c",
  "IMPL":       "#065f46",
  "SOLNS":      "#4c1d95",
  "CSM":        "#1e40af",
  "OPS":        "#3f6212",
  "CHANGE":     "#78350f",
  "QA":         "#155e75",
  "DATA":       "#1e293b",
  "COMPLIANCE": "#881337",
};

// ─────────────────────────────────────────────────────────────────────────────
// SALARY TIERS — San Jose CA cost-of-living calibrated
//   A = $175K+  Attack now. No ceiling.
//   B = $130K–$174K  Solid ground. Livable but tight in SJ.
//   C = $115K–$129K  Survival floor only. Last resort.
// est = estimated base salary range (when not listed in posting)
// ─────────────────────────────────────────────────────────────────────────────
const TIER_META = {
  A: { label:"A  $175K+", color:"#b45309", bg:"#fef3c7", desc:"Attack now" },
  B: { label:"B  $130K–$174K", color:"#1d4ed8", bg:"#dbeafe", desc:"Solid ground" },
  C: { label:"C  $115K–$129K", color:"#4b5563", bg:"#f3f4f6", desc:"Floor only" },
};

// ─────────────────────────────────────────────────────────────────────────────
// ORG QUALITY — traffic-light tier for every company in the board
//   G = Top Tier    market leader · strong growth · best ROI on effort
//   Y = Mid Tier    solid company · secondary priority
//   R = Contingency generic / small / low-value without green alternatives
//
// Logic: name-match against known leaders; manual overrides for "Various" entries
// ─────────────────────────────────────────────────────────────────────────────
const ORG_QUALITY_OVERRIDES = {
  B12:"R",  // "Various CA Lenders" — generic aggregator
  R04:"Y",  // GoodLeap — solar/green lending, not core mortgage
  R10:"R",  // Nityo — staffing agency
  R33:"Y",  // Various Software Delivery roles
  R34:"Y",  // Various TPM Mortgage/Fintech
  R35:"Y",  // Various Sr. Program Manager Fintech
  R36:"R",  // Benchmark Mortgage — small regional IMB
  R37:"Y",  // Various Scrum Master contract
  R38:"R",  // Various Agile Delivery Manager contract
  R42:"Y",  // Dovenmuehle / Various Servicers
  R47:"Y",  // Various Consulting (Deloitte, Accenture, Capco)
  R49:"G",  // Various (ICE, MeridianLink, Snapdocs, nCino, Maxwell) — greens in mix
  R52:"G",  // Various (Blend, Snapdocs, Polly, Better, Rocket) — greens in mix
  R53:"G",  // Various (Airwallex, SoFi, loanDepot) — greens in mix
  R54:"Y",  // Various IMBs/Servicers
  R55:"Y",  // Various (ICE, Treliant, Rocket, Freedom)
  R56:"G",  // Various (Rocket, ICE, CrossCountry, loanDepot) — top-tier anchors
  R59:"Y",  // Various Servicers/IMBs
  R60:"Y",  // Various (Pennymac, Freedom, Rocket, Blend)
};

const GREEN_ORG_KEYWORDS = [
  "blend","figure","snapdocs","sofi","redfin","upstart","opendoor","airwallex",
  "block, inc","block inc","sagent","ncino","meridianlink","polly","situsamc",
  "situs amc","ocrolus","docusign","ice mortgage","ice mortgage technology",
  "rocket","uwm","united wholesale","pennymac","loandepot","loan depot",
  "freddie mac","fannie mae","paypal","robinhood","salesforce","experian",
  "lendingtree","lending tree","zillow","better.com","better mortgage",
  "realtor.com","optimal blue","mr. cooper","guaranteed rate","guild mortgage",
  "corelogic","loanpro","movement mortgage",
];

function orgQuality(jobId, company) {
  if (ORG_QUALITY_OVERRIDES[jobId]) return ORG_QUALITY_OVERRIDES[jobId];
  if (!company) return "Y";
  const c = company.toLowerCase();
  if (c.startsWith("various") || c.includes("multiple companies")) return "Y";
  if (GREEN_ORG_KEYWORDS.some(k => c.includes(k))) return "G";
  return "Y";
}

const ORG_QUALITY_META = {
  G: { label:"Top Tier",    short:"Green",  color:"#15803d", bg:"#f0fdf4", dot:"#22c55e",
       desc:"Market leader · strong growth · attack first" },
  Y: { label:"Mid Tier",    short:"Yellow", color:"#b45309", bg:"#fffbeb", dot:"#f59e0b",
       desc:"Solid company · work after Green exhausted" },
  R: { label:"Contingency", short:"Red",    color:"#b91c1c", bg:"#fef2f2", dot:"#ef4444",
       desc:"Backup only — low priority without alternatives" },
};

const SALARY_EST = {
  // ── BAY AREA ────────────────────────────────────────────────────────────────
  B01:{ tier:"B", est:"~$145K–$175K" },   // Blend PO Digital Close
  B02:{ tier:"A", est:"$141K–$197K" },    // Figure Sr. PM HELOC (listed)
  B03:{ tier:"B", est:"~$140K–$170K" },   // Snapdocs PM Origination
  B04:{ tier:"B", est:"~$150K–$175K" },   // Polly PM Capital Markets
  B05:{ tier:"A", est:"~$155K–$190K" },   // SoFi PM Home Loans
  B06:{ tier:"A", est:"~$160K–$195K" },   // Redfin Lead PM
  B07:{ tier:"A", est:"~$165K–$205K" },   // Upstart Sr. PM (AI lending, Peninsula)
  B08:{ tier:"B", est:"~$135K–$165K" },   // Credible PM (Fox Corp)
  B09:{ tier:"A", est:"~$155K–$185K" },   // Opendoor PM
  B10:{ tier:"A", est:"~$185K–$230K" },   // Airwallex Staff PM (Staff = very senior)
  B11:{ tier:"C", est:"~$95K–$125K"  },   // ICE BSA — BSA title, not PM
  B12:{ tier:"C", est:"~$95K–$120K"  },   // Various CA Lenders BA
  B13:{ tier:"B", est:"~$110K–$140K" },   // CMG BA/PM
  B14:{ tier:"A", est:"~$175K–$220K" },   // Block Sr. Financial Platform PM
  B15:{ tier:"B", est:"~$135K–$165K" },   // ICE Agile Delivery Manager
  B16:{ tier:"B", est:"~$150K–$180K" },   // Blend Sr. Program Manager
  B17:{ tier:"B", est:"~$135K–$160K" },   // Deloitte Payments Delivery Lead
  B18:{ tier:"C", est:"$100K–$125K"  },   // SavvyMoney Sr. Impl. Manager (listed)
  B19:{ tier:"C", est:"$90K–$125K"   },   // SavvyMoney Sr. Impl. Lead (listed)
  B20:{ tier:"C", est:"$100K–$125K"  },   // SavvyMoney Partner Impl. Manager (listed)
  B21:{ tier:"C", est:"$90K–$120K"   },   // SavvyMoney Sr. Solutions Consultant (listed)
  B22:{ tier:"B", est:"$125K–$140K"  },   // SavvyMoney Sr. Manager Partner Onboarding (listed)
  B23:{ tier:"B", est:"$145K–$170K"  },   // SavvyMoney Sr. Technical PM (listed)
  B24:{ tier:"A", est:"$146K–$235K"  },   // DocuSign Sr. PM Agentic Experiences (listed)
  // ── SOUTH BAY ───────────────────────────────────────────────────────────────
  S01:{ tier:"B", est:"~$145K–$175K" },   // ICE PM Mortgage Servicing
  S02:{ tier:"B", est:"~$140K–$175K" },   // PayPal Sr. Product Analyst
  S03:{ tier:"A", est:"~$165K–$200K" },   // Robinhood PM Money Movement
  S04:{ tier:"A", est:"~$155K–$200K" },   // Loancrate TPM AI Mortgage
  S05:{ tier:"A", est:"~$160K–$195K" },   // Salesforce Sr. Program Manager
  // ── REMOTE ──────────────────────────────────────────────────────────────────
  R01:{ tier:"B", est:"~$125K–$150K" },   // MeridianLink PM Mortgage
  R02:{ tier:"B", est:"~$125K–$150K" },   // MeridianLink PM Mortgage (2nd opening)
  R03:{ tier:"C", est:"~$100K–$130K" },   // MeridianLink Product BA
  R04:{ tier:"A", est:"~$155K–$185K" },   // GoodLeap Sr. PM Mortgage
  R05:{ tier:"A", est:"~$160K–$190K" },   // Realtor.com Lead PM
  R06:{ tier:"B", est:"$130K–$150K"  },   // NAF Sr. PO Consumer Web (listed)
  R07:{ tier:"C", est:"$110K–$130K"  },   // NAF PO Internal Apps (listed)
  R08:{ tier:"A", est:"~$160K–$195K" },   // Experian Sr. PM Digital Mortgage
  R09:{ tier:"B", est:"~$140K–$170K" },   // Better PM Digital Mortgage
  R10:{ tier:"C", est:"~$70–90/hr"   },   // Nityo PO/BA contract
  R11:{ tier:"C", est:"~$90K–$125K"  },   // Pennymac Product Analyst
  R12:{ tier:"B", est:"~$120K–$145K" },   // Plaza Home PO Servicing
  R13:{ tier:"A", est:"~$160K–$195K" },   // Loancrate PM AI LOS (remote)
  R14:{ tier:"B", est:"~$145K–$175K" },   // Sagent Sr. PM Mortgage Servicing
  R15:{ tier:"B", est:"~$145K–$175K" },   // Optimal Blue Sr. PM Data
  R16:{ tier:"B", est:"~$120K–$145K" },   // Maxwell PO Digital Mortgage
  R17:{ tier:"B", est:"~$135K–$165K" },   // nCino PM Digital Lending
  R18:{ tier:"B", est:"~$140K–$170K" },   // Snapdocs PM eClosing (remote)
  R19:{ tier:"B", est:"~$130K–$160K" },   // LendingTree PM Home Loan Marketplace
  R20:{ tier:"B", est:"~$130K–$160K" },   // Reggora PM Appraisal
  R21:{ tier:"B", est:"~$135K–$170K" },   // Plat.ai PM AI LOS
  R22:{ tier:"A", est:"~$155K–$185K" },   // Rocket PO Consumer Lending AI
  R23:{ tier:"A", est:"~$180K–$220K" },   // Tomo Principal PM
  R24:{ tier:"B", est:"~$145K–$175K" },   // Brace PM Mortgage Servicing
  R25:{ tier:"B", est:"~$145K–$175K" },   // Fannie Mae PM AI/GSE Tech
  R26:{ tier:"B", est:"~$145K–$175K" },   // Freddie Mac PO Loan Advisor Suite
  R27:{ tier:"A", est:"$141K–$197K"  },   // Figure Sr. PM HELOC (remote, listed)
  R28:{ tier:"C", est:"~$95K–$120K"  },   // Freedom Mortgage BA
  R29:{ tier:"C", est:"~$100K–$130K" },   // CrossCountry Sr. BA
  R30:{ tier:"C", est:"~$90K–$115K"  },   // Mutual of Omaha BA
  R31:{ tier:"C", est:"~$90K–$115K"  },   // PRMG BA Encompass SME
  R32:{ tier:"C", est:"~$100K–$130K" },   // Clarifire PO/BA
  R33:{ tier:"B", est:"~$130K–$160K" },   // Software Delivery Manager (various)
  R34:{ tier:"A", est:"~$165K–$200K" },   // Sr. TPM Mortgage/Fintech
  R35:{ tier:"A", est:"~$155K–$185K" },   // Sr. Program Manager Fintech
  R36:{ tier:"C", est:"~$100K–$125K" },   // Benchmark Scrum Master
  R37:{ tier:"C", est:"~$45–60/hr"   },   // Sr. Scrum Master contract
  R38:{ tier:"C", est:"contract"      },   // Agile Delivery Manager IV contract
  R39:{ tier:"C", est:"$100K–$125K"  },   // SavvyMoney Sr. Impl. Manager (remote, listed)
  R40:{ tier:"C", est:"~$115K–$140K" },   // ICE Implementation Consultant
  R41:{ tier:"C", est:"$90K–$125K"   },   // SavvyMoney Sr. Impl. Lead (remote, listed)
  R42:{ tier:"B", est:"~$115K–$140K" },   // Implementation Manager Mortgage Servicing
  R43:{ tier:"C", est:"$110K–$130K"  },   // SitusAMC Sr. BSA (listed)
  R44:{ tier:"C", est:"~$100K–$135K" },   // Treliant Technology Consultant
  R45:{ tier:"C", est:"~$100K–$125K" },   // Aspen Grove PO/BA
  R46:{ tier:"C", est:"$90K–$120K"   },   // SavvyMoney Sr. Solutions Consultant (remote, listed)
  R47:{ tier:"B", est:"~$135K–$170K" },   // Engagement Manager Fintech Consulting
  R48:{ tier:"A", est:"~$165K–$200K" },   // ICE Sr. Solutions Architect
  R49:{ tier:"B", est:"~$125K–$155K" },   // Sr. CSM Mortgage Tech (various)
  R50:{ tier:"C", est:"~$115K–$140K" },   // Client Delivery Manager Sagent
  R51:{ tier:"C", est:"~$100K–$125K" },   // SavvyMoney Partner Manager
  R52:{ tier:"B", est:"~$130K–$160K" },   // Product Ops Manager (various)
  R53:{ tier:"B", est:"~$140K–$170K" },   // Strategy & Ops Manager (various)
  R54:{ tier:"C", est:"~$110K–$135K" },   // Process Excellence Manager
  R55:{ tier:"C", est:"~$115K–$140K" },   // Change Manager Mortgage Tech
  R56:{ tier:"C", est:"~$100K–$130K" },   // UAT Lead / QA Analyst Functional
  R57:{ tier:"C", est:"$60/hr"        },   // Ocrolus Product Analyst contract
  R58:{ tier:"C", est:"~$90K–$120K"  },   // Treliant Compliance Analyst
  R59:{ tier:"C", est:"~$100K–$130K" },   // Sr. Data/Reporting Analyst
  R60:{ tier:"C", est:"~$100K–$130K" },   // Product Data Analyst
  R61:{ tier:"B", est:"~$125K–$155K" },   // Zillow Mortgage Compliance Manager
  R62:{ tier:"C", est:"~$85K–$110K"  },   // Orion Lending UAT Specialist
  // ── EXPANDED REMOTE — NEW ORGS ───────────────────────────────────────────
  R63:{ tier:"A", est:"~$155K–$195K" },   // Mr. Cooper Sr. PM Servicing Technology
  R64:{ tier:"A", est:"~$145K–$180K" },   // Guaranteed Rate Sr. PM Digital Mortgage
  R65:{ tier:"B", est:"~$130K–$165K" },   // Guild Mortgage PM Technology Platform
  R66:{ tier:"B", est:"~$140K–$175K" },   // LoanPro Sr. PM Lending SaaS
  R67:{ tier:"B", est:"~$135K–$165K" },   // Movement Mortgage Sr. BSA/PM
  R68:{ tier:"B", est:"~$125K–$155K" },   // Planet Home Lending Sr. PM Servicing
  R69:{ tier:"A", est:"~$155K–$190K" },   // CoreLogic Sr. PM Mortgage Data & Analytics
  R70:{ tier:"B", est:"~$130K–$160K" },   // LendingTree PM Home Loan Marketplace
};

const jobs = [

  // ══════════════════════════════════════════════════════════════════════════
  // 🌉  BAY AREA HYBRID
  // ══════════════════════════════════════════════════════════════════════════

  { id:"B01", bucket:B.BAY, family:"PM/PO/BA",
    title:"Product Owner, Digital Close",
    company:"Blend Labs", city:"San Francisco CA",
    salary:null, posted:"~Apr 2026",
    url:"https://blend.com/company/careers/", source:"Built In SF",
    tags:["eClosing","product owner","mortgage","SaaS","digital close"],
    notes:"Drive strategy for Blend's digital closings product. 330+ FI clients incl. Wells Fargo, US Bank." },

  { id:"B02", bucket:B.BAY, family:"PM/PO/BA",
    title:"Sr. Product Manager — Home Equity / HELOC (blockchain-native)",
    company:"Figure Finance", city:"San Francisco CA",
    salary:"$141K–$197K", posted:"Active Apr–May 2026",
    url:"https://www.figure.com/careers/", source:"Figure Careers",
    tags:["HELOC","blockchain","home equity","product","fintech","secured lending"],
    notes:"NASDAQ: FIGR. $22B+ originated on blockchain-native platform. SF HQ hybrid." },

  { id:"B03", bucket:B.BAY, family:"PM/PO/BA",
    title:"Product Manager — Mortgage Origination / eClosing",
    company:"Snapdocs", city:"San Francisco CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.snapdocs.com/careers", source:"Snapdocs Careers",
    tags:["eClosing","eVault","notary","product","automation","SF"],
    notes:"eClosing market leader. SF HQ. Actively hiring PM and PO across product lines." },

  { id:"B04", bucket:B.BAY, family:"PM/PO/BA",
    title:"Product Manager — Capital Markets / Mortgage Pricing (PPE)",
    company:"Polly", city:"San Francisco CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.polly.io/careers", source:"Polly Careers",
    tags:["PPE","capital markets","pricing","product","fintech","SF"],
    notes:"Mortgage product & eligibility engine. SF fintech. Strong capital markets fit." },

  { id:"B05", bucket:B.BAY, family:"PM/PO/BA",
    title:"Product Manager — Home Loans (Strategy, AI, Roadmap)",
    company:"SoFi Technologies", city:"San Francisco CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.sofi.com/careers/", source:"SoFi Careers",
    tags:["home loans","digital mortgage","AI","fintech","product"],
    notes:"Lead SoFi Home Loans product. Full-stack digital bank. NASDAQ: SOFI." },

  { id:"B06", bucket:B.BAY, family:"PM/PO/BA",
    title:"Lead Product Manager — Home Loans Local Market Sales",
    company:"Redfin Home Loans", city:"San Francisco CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.redfin.com/about/jobs", source:"Built In SF",
    tags:["home loans","mortgage","AI","automation","product","proptech"],
    notes:"Strategy + roadmap for home loans local market sales. AI and automation focus." },

  { id:"B07", bucket:B.BAY, family:"PM/PO/BA",
    title:"Sr. Product Manager — Consumer Mortgage / Home Loans",
    company:"Upstart", city:"San Mateo CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.upstart.com/careers", source:"Upstart Careers",
    tags:["AI","lending","home loans","product","consumer","fintech","San Mateo"],
    notes:"Expanding into home loans. AI-driven underwriting. San Mateo (Peninsula) HQ." },

  { id:"B08", bucket:B.BAY, family:"PM/PO/BA",
    title:"Product Manager — Consumer Finance & Mortgage Marketplace",
    company:"Credible (Fox Corp)", city:"San Francisco CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.credible.com/careers", source:"Credible Careers",
    tags:["marketplace","consumer","mortgage","fintech","product","SF"],
    notes:"Mortgage & student loan marketplace. Fox Corp subsidiary. SF Bay Area hybrid." },

  { id:"B09", bucket:B.BAY, family:"PM/PO/BA",
    title:"Product Manager — Real Estate & Mortgage Platform",
    company:"Opendoor", city:"San Francisco CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.opendoor.com/w/careers", source:"Opendoor Careers",
    tags:["real estate","fintech","product","iBuyer","mortgage","SF"],
    notes:"Real estate / mortgage product. SF Bay Area hybrid. iBuyer platform." },

  { id:"B10", bucket:B.BAY, family:"PM/PO/BA",
    title:"Staff Product Manager — Embedded Finance / API Platform",
    company:"Airwallex", city:"San Francisco CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.airwallex.com/us/careers", source:"Built In SF",
    tags:["embedded finance","API","fintech","product","SF","payments","lending"],
    notes:"Fintech platform PM — embedded lending & payments suite. SF hybrid." },

  { id:"B11", bucket:B.BAY, family:"PM/PO/BA",
    title:"Business Analyst — Mortgage Technology (Encompass HQ)",
    company:"ICE Mortgage Technology", city:"Pleasanton CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.ice.com/careers", source:"ICE Careers",
    tags:["Encompass","LOS","BSA","mortgage","ICE","Pleasanton","East Bay"],
    notes:"ICE MT HQ at 4420 Rosewood Dr, Pleasanton CA. 62 active LinkedIn jobs. Hybrid for some roles." },

  { id:"B12", bucket:B.BAY, family:"PM/PO/BA",
    title:"Business Analyst — Mortgage Technology (Encompass / hybrid)",
    company:"Various CA Lenders (Application Engineer profile)", city:"Pleasanton / East Bay CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.simplyhired.com/search?q=ice+mortgage+technology", source:"SimplyHired",
    tags:["Encompass","LOS","BSA","systems analyst","application engineer","East Bay"],
    notes:"Encompass admin/config + BSA. 'Reports to Director of Software Engineering.' East Bay hybrid." },

  { id:"B13", bucket:B.BAY, family:"PM/PO/BA",
    title:"Business Analyst / Product Manager — Mortgage IS Team",
    company:"CMG Financial", city:"Dublin CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.cmgfi.com/about/careers", source:"CMG Careers",
    tags:["BSA","Encompass","LOS","mortgage","IS","Dublin CA","East Bay"],
    notes:"CMG HQ in Dublin CA (East Bay / Tri-Valley). Product + IS teams. Encompass-heavy." },

  { id:"B14", bucket:B.BAY, family:"PM/PO/BA",
    title:"Sr. Financial Platform Product Manager (Subledger / Mortgage-adjacent)",
    company:"Block, Inc. (Square Financial Services)", city:"San Francisco CA",
    salary:null, posted:"Active Apr 2026",
    url:"https://www.block.xyz/careers", source:"Indeed SF Fintech",
    tags:["fintech","financial platform","subledger","product","SF","lending-adjacent"],
    notes:"Financial platform PM — subledger, GL, reconciliation. Mortgage sales exp a plus per job desc." },

  // ── BAY AREA · DELIVERY / PROGRAM MANAGEMENT ──────────────────────────────

  { id:"B15", bucket:B.BAY, family:"DELIVERY",
    title:"Agile Delivery Manager — Mortgage Technology Platform",
    company:"ICE Mortgage Technology", city:"Pleasanton CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.ice.com/careers", source:"ICE Careers",
    tags:["delivery manager","agile","mortgage","LOS","Encompass","scrum","Pleasanton"],
    notes:"ICE MT delivery management across Encompass and MSP product lines. Agile/Scrum leadership." },

  { id:"B16", bucket:B.BAY, family:"DELIVERY",
    title:"Senior Program Manager — Mortgage / Fintech Delivery",
    company:"Blend Labs", city:"San Francisco CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://blend.com/company/careers/", source:"Blend Careers",
    tags:["program manager","delivery","mortgage","SaaS","fintech","SF","cross-functional"],
    notes:"Program delivery roles overseeing cross-functional execution across mortgage origination & banking platforms." },

  { id:"B17", bucket:B.BAY, family:"DELIVERY",
    title:"Payments Delivery Lead — Banking / Fintech",
    company:"Deloitte (Financial Services practice)", city:"San Francisco CA",
    salary:null, posted:"Active (role ends 5/25/2026)",
    url:"https://www.indeed.com/q-fintech-l-san-francisco-bay-area,-ca-jobs.html", source:"Indeed SF",
    tags:["delivery lead","payments","banking","consulting","Deloitte","SF"],
    notes:"Deloitte banking/payments delivery lead — 'reimagining operations and processes critical to businesses.' SF office. Consulting-side delivery role." },

  // ── BAY AREA · IMPLEMENTATION ─────────────────────────────────────────────

  { id:"B18", bucket:B.BAY, family:"IMPL",
    title:"Sr. Implementation Manager — Fintech Lending / LOS",
    company:"SavvyMoney", city:"Dublin CA (East Bay / Tri-Valley)",
    salary:"$100K–$125K", posted:"Active Apr–May 2026",
    url:"https://careers.spectrumequity.com/companies/savvymoney-inc/", source:"Spectrum Equity / Teal HQ",
    tags:["implementation manager","lending","LOS","fintech","SaaS","Jira","APIs","digital banking"],
    notes:"Leads end-to-end delivery of lending & deposit implementations for 1,500+ bank/CU partners. REST/JSON API, LOS/digital banking knowledge. Dublin CA hybrid or remote." },

  { id:"B19", bucket:B.BAY, family:"IMPL",
    title:"Senior Implementation Lead — Fintech (Digital Banking / LOS)",
    company:"SavvyMoney", city:"Dublin CA (East Bay / Tri-Valley)",
    salary:"$90K–$125K", posted:"Active (2 days ago as of May 2026)",
    url:"https://www.tealhq.com/job/senior-implementation-analyst_7ea1a7f6e808fbde951892888870a6065bd25", source:"Teal HQ",
    tags:["implementation lead","fintech","LOS","digital banking","SSO","REST APIs","credit","agile"],
    notes:"Cross-functional onboarding across product, dev, partnership. Credit bureau, LOS, digital banking knowledge. Hybrid Dublin or remote." },

  { id:"B20", bucket:B.BAY, family:"IMPL",
    title:"Partner Implementation Manager — Fintech / Lending",
    company:"SavvyMoney", city:"Dublin CA (East Bay / Tri-Valley)",
    salary:"$100K–$125K + Equity", posted:"Active May 2026",
    url:"https://careers.spectrumequity.com/companies/savvymoney-inc/jobs/56372918-partner-implementation-manager-dublin-ca-or-usa-remote", source:"Spectrum Equity",
    tags:["implementation manager","partner","fintech","lending","LOS","project manager"],
    notes:"Client-facing PM for FI partner onboarding. LOS, digital banking, API integration knowledge. Hybrid Dublin or remote." },

  // ── BAY AREA · SOLUTIONS / DELIVERY LEADERSHIP ───────────────────────────

  { id:"B21", bucket:B.BAY, family:"SOLNS",
    title:"Sr. Solutions Consultant — Fintech (Lending / Banking)",
    company:"SavvyMoney", city:"Dublin CA (East Bay / Tri-Valley)",
    salary:"$90K–$120K + Equity", posted:"Jan 9, 2026 (active May 2026)",
    url:"https://careers.spectrumequity.com/companies/savvymoney-inc/jobs/64816729-senior-solutions-consultant-dublin-ca-or-usa-remote", source:"Spectrum Equity",
    tags:["solutions consultant","fintech","lending","digital banking","pre-sales","SaaS"],
    notes:"Pre-sales and post-sales solutions role. LOS and digital banking platform fluency valued. Hybrid Dublin or remote." },

  // ── BAY AREA · DELIVERY LEADERSHIP (PARTNER ONBOARDING) ──────────────────

  { id:"B22", bucket:B.BAY, family:"DELIVERY",
    title:"Sr. Manager, Partner Onboarding (Delivery Lead)",
    company:"SavvyMoney", city:"Dublin CA (East Bay / Tri-Valley)",
    salary:"$125K–$140K + Equity", posted:"Active ~12 days ago (May 2026)",
    url:"https://www.builtinla.com/job/senior-manager-partner-onboarding-dublin-ca-or-usa-remote/7857987", source:"Built In / Spectrum Equity",
    tags:["delivery lead","partner onboarding","implementation manager","fintech","SaaS","ARR","PMO"],
    notes:"Leads team implementing new FI partners from signed contract to launch. ARR forecasting, technical readiness, cross-functional coordination. Hybrid Dublin or remote." },

  // ── BAY AREA · TECHNICAL PM ────────────────────────────────────────────────

  { id:"B23", bucket:B.BAY, family:"PM/PO/BA",
    title:"Sr. Technical Product Manager — Lending / Digital Banking",
    company:"SavvyMoney", city:"Dublin CA (East Bay / Tri-Valley)",
    salary:"$145K–$170K + Equity", posted:"Active May 2026",
    url:"https://careers.spectrumequity.com/companies/savvymoney-inc/jobs/50573227-senior-technical-product-manager-dublin-ca-or-usa-remote", source:"Spectrum Equity",
    tags:["technical PM","product manager","lending","digital banking","SaaS","fintech","APIs"],
    notes:"Technical PM for credit score + PF products integrated with 43+ digital banking platforms. $145K–$170K + equity. Hybrid Dublin CA or fully remote." },

  { id:"B24", bucket:B.BAY, family:"PM/PO/BA",
    title:"Senior Product Manager — Agentic Experiences",
    company:"DocuSign", city:"San Francisco CA (Hybrid)",
    salary:"$146K–$235K + RSUs + Bonus", posted:"Active May 2026",
    url:"https://uscareers-docusign.icims.com/jobs/29181/senior-product-manager---agentic-experiences/job",
    source:"iCIMS / DocuSign Careers",
    tags:["agentic AI","product manager","LLM","procurement","intelligent agreements","CLM","enterprise SaaS","AI agents","workflow automation"],
    notes:"Lead agentic AI experiences for DocuSign Navigator — AI agents for procurement workflows (savings identification, renewal optimization, vendor analysis). Reports to Sr. Director PM. 8+ yrs PM req. Agentic AI + enterprise SaaS required. LLM/agentic systems preferred. SF/Chicago/Seattle hybrid." },

  // ══════════════════════════════════════════════════════════════════════════
  // 🏢  SOUTH BAY / SILICON VALLEY ONSITE
  // ══════════════════════════════════════════════════════════════════════════

  { id:"S01", bucket:B.SB, family:"PM/PO/BA",
    title:"Product Manager — Mortgage Servicing Platform",
    company:"ICE Mortgage Technology", city:"Pleasanton CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.ice.com/careers", source:"ICE Careers",
    tags:["MSP","servicing","product","ICE","Encompass","Pleasanton","LOS"],
    notes:"ICE MT HQ. Some roles still onsite per employee reviews. MSP + Encompass product lines. 2,000 employees." },

  { id:"S02", bucket:B.SB, family:"PM/PO/BA",
    title:"Sr. Product Analyst — Financial Services / Lending",
    company:"PayPal", city:"San Jose CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.paypal.com/us/webapps/mpp/jobs", source:"Indeed",
    tags:["fintech","product analyst","payments","lending","San Jose","onsite"],
    notes:"SJ HQ. Payment rails, financial services product. Not pure mortgage but highly transferable skills." },

  { id:"S03", bucket:B.SB, family:"PM/PO/BA",
    title:"Product Manager — Money Movement / Payments & Lending",
    company:"Robinhood", city:"Menlo Park CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://careers.robinhood.com/", source:"Indeed / CareerBuilder",
    tags:["fintech","product","payments","lending","money movement","Menlo Park","onsite"],
    notes:"Define products for money flows — payment rails, data aggregators, lending. Menlo Park. 3 days onsite required." },

  { id:"S04", bucket:B.SB, family:"IMPL",
    title:"Technical Product Manager — AI Mortgage Workflow Automation",
    company:"Loancrate", city:"Menlo Park CA",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://jobs.ashbyhq.com/loancrate/f58e74ca-b2b3-40d0-a1d7-ae0aaf7b0449", source:"Ashby ATS",
    tags:["AI","LOS","mortgage automation","technical PM","startup","Menlo Park"],
    notes:"AI-native mortgage LOS startup. $85B+ in loans powered. Menlo Park. Remote-first but accessible." },

  { id:"S05", bucket:B.SB, family:"DELIVERY",
    title:"Senior Program Manager — Financial Platform Delivery",
    company:"Salesforce (Financial Services Cloud)", city:"San Francisco / Palo Alto CA",
    salary:null, posted:"Active Apr 15, 2026",
    url:"https://careers.salesforce.com/en/jobs/jr336692/product-manager/", source:"Salesforce Careers",
    tags:["program manager","financial services","SaaS","Salesforce","mortgage-adjacent","delivery"],
    notes:"Salesforce Financial Services Cloud — mortgage, banking, insurance vertical. SF or Palo Alto. Strong FSC mortgage domain crossover." },

  // ══════════════════════════════════════════════════════════════════════════
  // 🌐  REMOTE NATIONAL
  // ══════════════════════════════════════════════════════════════════════════

  // ── CORE PM / PO / BA ─────────────────────────────────────────────────────

  { id:"R01", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager, Mortgage Lending Technology",
    company:"MeridianLink", city:"Remote",
    salary:null, posted:"Apr 12, 2026",
    url:"https://jobs.ashbyhq.com/meridianlink/072f5744-db8f-4a23-81c7-4d95a14cdab1", source:"Ashby ATS",
    tags:["LOS","product","mortgage","SaaS","roadmap","GTM"],
    notes:"Owns roadmap, GTM strategy, and pricing for a mortgage LOS product line." },

  { id:"R02", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager (Mortgage Product) — separate role",
    company:"MeridianLink", city:"Remote",
    salary:null, posted:"Apr 2026",
    url:"https://jobs.ashbyhq.com/meridianlink/f3fa32bb-ac8d-4174-b567-cb4cca236cc1", source:"Ashby ATS",
    tags:["LOS","product","mortgage","SaaS"],
    notes:"Distinct from R01 — separate mortgage product area. Two concurrent openings." },

  { id:"R03", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Business Analyst — Mortgage Product",
    company:"MeridianLink", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://jobs.lever.co/meridianlink/8d480aee-83ea-4e83-9a74-dabad013c9c8", source:"Lever ATS",
    tags:["BSA","product BA","mortgage","LOS","user stories","requirements","SDLC"],
    notes:"Authors product requirements for mortgage products. SME role guiding R&D teams." },

  { id:"R04", bucket:B.REM, family:"PM/PO/BA",
    title:"Senior Product Manager, Mortgage",
    company:"GoodLeap", city:"Remote",
    salary:null, posted:"Feb 3, 2026",
    url:"https://jobs.lever.co/goodleap/b9d63f44-cf2e-417c-8113-60367adc5c57", source:"Lever ATS",
    tags:["mortgage","fintech","product","origination","roadmap","green lending"],
    notes:"Shape roadmap for Mortgage Lending ecosystem. Home improvement / solar lending platform." },

  { id:"R05", bucket:B.REM, family:"PM/PO/BA",
    title:"Lead Product Manager, Consumer Finance & Mortgage Experience",
    company:"Realtor.com (Move, Inc.)", city:"Remote (Santa Clara HQ)",
    salary:null, posted:"Feb 6, 2026",
    url:"https://job-boards.greenhouse.io/rdccareers/jobs/7621921003", source:"Greenhouse ATS",
    tags:["mortgage marketplace","product","lead gen","consumer","fintech","RESPA"],
    notes:"Own mortgage product strategy — pre-approval, rate shopping, lead volume." },

  { id:"R06", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Product Owner — Consumer Web Portal (NAF Hub)",
    company:"New American Funding", city:"Remote (Tustin CA HQ)",
    salary:"$130K–$150K", posted:"Active Apr–May 2026",
    url:"https://careers-nafinc.icims.com/jobs/7090/senior-product-owner/job", source:"iCIMS ATS",
    tags:["product owner","POS","consumer web","mortgage","digital application"],
    notes:"Owns consumer-facing digital mortgage application portal. Remote outside Southern CA." },

  { id:"R07", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Owner — NAF Internal Apps (HR, Finance, Secondary Markets)",
    company:"New American Funding", city:"Remote (Tustin CA HQ)",
    salary:"$110K–$130K", posted:"Active Apr–May 2026",
    url:"https://careers-nafinc.icims.com/jobs/7090/senior-product-owner/job", source:"iCIMS ATS",
    tags:["product owner","internal apps","HRIS","secondary market","mortgage","backlog"],
    notes:"Internal-facing PO — HR, accounting, secondary markets tooling." },

  { id:"R08", bucket:B.REM, family:"PM/PO/BA",
    title:"Senior Product Manager, Digital Mortgage (B2B2C)",
    company:"Experian Mortgage", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://jobs.experian.com/job/senior-product-manager-digital-mortgage-remote-in-united-states-jid-2739", source:"Experian Jobs",
    tags:["data","credit","consumer mortgage","B2B2C","digital","product","lifecycle"],
    notes:"Owns consumer mortgage product strategy at Experian — lifecycle, data, personalization." },

  { id:"R09", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — Digital Mortgage (Consumer, AI-first)",
    company:"Better Mortgage", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.better.com/careers", source:"Better Careers",
    tags:["digital mortgage","consumer","AI","origination","product","BETR"],
    notes:"NASDAQ: BETR. Digital-first mortgage lender. Partners with Ocrolus, Blend, and others." },

  { id:"R10", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Owner / Business Analyst — Mortgage Loan Servicing",
    company:"Nityo Infotech (for undisclosed IMB)", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://jobs.recruiter.com/jobs/10131608106-business-analyst-product-owner", source:"Recruiter.com",
    tags:["product owner","BSA","servicing","default","foreclosure","LOS","Encompass"],
    notes:"10+ yrs IT; 8+ yrs mortgage servicing/default/foreclosure; 5+ yrs Encompass. Contract." },

  { id:"R11", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Analyst — Mortgage Technology (multiple openings)",
    company:"Pennymac", city:"Remote / Westlake Village CA",
    salary:null, posted:"Active Apr–May 2026 (83 listed)",
    url:"https://www.pennymac.com/techjobs", source:"Pennymac Tech Careers",
    tags:["product analyst","mortgage","LOS","Agile","tech","multiple openings"],
    notes:"Pennymac tech portal shows 83 active BA/analyst listings May 2026. Multiple levels/roles." },

  { id:"R12", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Owner — Mortgage Servicing (Front + Back Office)",
    company:"Plaza Home Mortgage", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.plazahomemortgage.com/careers", source:"Glassdoor",
    tags:["product owner","servicing","front office","back office","mortgage"],
    notes:"Strategic PO with deep mortgage servicing expertise across front and back office channels." },

  { id:"R13", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — Mortgage Origination Automation (AI-native LOS)",
    company:"Loancrate", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://jobs.ashbyhq.com/loancrate/f58e74ca-b2b3-40d0-a1d7-ae0aaf7b0449", source:"Ashby ATS",
    tags:["AI","LOS","mortgage automation","technical PM","startup"],
    notes:"Remote-first. AI-native mortgage workflow automation. $85B+ in loans powered." },

  { id:"R14", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Product Manager — Mortgage Servicing Platform",
    company:"Sagent (ICE subsidiary)", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://sagent.com/careers/", source:"Sagent Careers",
    tags:["LoanServ","servicing","product","MSP","ICE","remote"],
    notes:"Sagent powers LoanServ servicing platform. Remote-first workforce." },

  { id:"R15", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Product Manager — Mortgage Data & Analytics (PPE)",
    company:"Optimal Blue (ICE)", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.optimalblue.com/careers/", source:"Optimal Blue Careers",
    tags:["PPE","data","analytics","capital markets","product","ICE"],
    notes:"Mortgage PPE and analytics under ICE umbrella. Remote product roles open." },

  { id:"R16", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Owner — Digital Mortgage POS / Workflow",
    company:"Maxwell Financial Labs", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://himaxwell.com/careers/", source:"Maxwell Careers",
    tags:["POS","digital mortgage","product owner","workflow","fintech"],
    notes:"Digital mortgage platform for community lenders. PO + BA hybrid. Fully remote." },

  { id:"R17", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — Digital Lending / Mortgage Suite",
    company:"nCino (SimpleNexus)", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.ncino.com/careers/", source:"nCino Careers",
    tags:["origination","mobile","SaaS","LOS","digital lending","product"],
    notes:"SimpleNexus rebranded as nCino Mortgage Suite. Fully remote product roles." },

  { id:"R18", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — eClosing & Digital Notarization",
    company:"Snapdocs", city:"Remote (SF HQ)",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.snapdocs.com/careers", source:"Snapdocs Careers",
    tags:["eClosing","eVault","notary","product","automation","remote"],
    notes:"Remote version of the Snapdocs PM role. Multiple product lines." },

  { id:"R19", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — Home Loan Marketplace",
    company:"LendingTree", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.lendingtree.com/careers/", source:"LendingTree Careers",
    tags:["marketplace","mortgage","product","B2C","fintech","lead gen"],
    notes:"Consumer mortgage marketplace. Remote PM roles. NASDAQ: TREE." },

  { id:"R20", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — Appraisal Management Platform",
    company:"Reggora", city:"Remote (Boston HQ)",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.reggora.com/careers", source:"Reggora Careers",
    tags:["appraisal","valuation","AMC","product","vendor","virtual inspection"],
    notes:"Acquired Appreeze (virtual inspections) Feb 2026. Digital valuation product expansion." },

  { id:"R21", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — AI Loan Origination (LOS Platform)",
    company:"Plat.ai", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://plat.ai/careers", source:"Plat.ai Careers",
    tags:["AI","LOS","origination","product owner","Agile","Jira"],
    notes:"AI-driven LOS for banks and specialty lenders. PO/PM hybrid role. Fully remote." },

  { id:"R22", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Owner — Consumer Lending AI / LOS",
    company:"Rocket Mortgage", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.rocketcompanies.com/careers/", source:"Rocket Careers",
    tags:["product owner","AI","LOS","origination","Agile","remote"],
    notes:"Rocket's TPO + consumer direct platform. Active PM/PO hiring." },

  { id:"R23", bucket:B.REM, family:"PM/PO/BA",
    title:"Principal Product Manager — Mortgage Integration",
    company:"Tomo Mortgage", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.tomo.com/careers", source:"Tomo Careers",
    tags:["mortgage","AI","origination","principal PM","fintech","purchase"],
    notes:"VC-backed (Ribbit, Citi Ventures, NFX). AI-driven purchase mortgage. Principal-level." },

  { id:"R24", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — Mortgage Servicing Automation",
    company:"Brace", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://brace.ai/careers/", source:"Brace Careers",
    tags:["servicing","loss mitigation","AI","product","fintech","Point72","8vc"],
    notes:"Backed by Point72 Ventures, 8vc, Crosslink. Modernizing borrower hardship / loss mitigation." },

  { id:"R25", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — Mortgage AI / GSE Technology (DU / LPA)",
    company:"Fannie Mae", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.fanniemae.com/careers", source:"Fannie Mae Careers",
    tags:["GSE","DU","AI","automation","product","data","mortgage"],
    notes:"Fannie tech PM roles on Desktop Underwriter (DU) and mortgage AI/automation products." },

  { id:"R26", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Owner — Freddie Mac Loan Advisor Suite",
    company:"Freddie Mac", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.freddiemac.com/careers", source:"Freddie Mac Careers",
    tags:["GSE","LPA","product owner","automation","mortgage","AI"],
    notes:"Freddie Mac tech product roles on Loan Product Advisor. AI/automation focus." },

  { id:"R27", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Product Manager — Home Equity / HELOC (blockchain-native)",
    company:"Figure Finance", city:"Remote (SF HQ)",
    salary:"$141K–$197K", posted:"Active Apr–May 2026",
    url:"https://www.figure.com/careers/", source:"Figure Careers",
    tags:["HELOC","blockchain","home equity","product","fintech","secured lending"],
    notes:"NASDAQ: FIGR. $22B+ originated on blockchain-native platform. Remote option available." },

  // ── REMOTE · BSA / ANALYST ROLES ─────────────────────────────────────────

  { id:"R28", bucket:B.REM, family:"PM/PO/BA",
    title:"Business Analyst — Mortgage Servicing",
    company:"Freedom Mortgage", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://careers.freedommortgage.com/", source:"Glassdoor",
    tags:["BSA","servicing","mortgage","remote","agile"],
    notes:"Top company actively hiring remote mortgage BA per Glassdoor April 2026." },

  { id:"R29", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Business Analyst — Mortgage Technology",
    company:"CrossCountry Mortgage", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.crosscountrymortgage.com/about/careers/", source:"Glassdoor",
    tags:["BSA","mortgage","LOS","tech","remote"],
    notes:"Top active remote mortgage BA hiring company per Glassdoor April 2026." },

  { id:"R30", bucket:B.REM, family:"PM/PO/BA",
    title:"Business Analyst — Mortgage Technology",
    company:"Mutual of Omaha Mortgage", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.mutualofomaha.com/careers", source:"Glassdoor",
    tags:["BSA","mortgage","bank","LOS","remote"],
    notes:"Listed among top active hiring companies for remote mortgage BA May 2026." },

  { id:"R31", bucket:B.REM, family:"PM/PO/BA",
    title:"Business Analyst — Encompass SME",
    company:"PRMG / Paramount Residential", city:"Remote (Corona CA HQ)",
    salary:null, posted:"Active Apr 2026",
    url:"https://www.prmg.net/careers/", source:"Glassdoor",
    tags:["Encompass","LOS","BSA","SME","mortgage","requirements"],
    notes:"Encompass SME; Jira, requirements analysis. Remote-eligible." },

  { id:"R32", bucket:B.REM, family:"PM/PO/BA",
    title:"Business Analyst / Product Owner — LOS (Central Servicing Platform)",
    company:"Clarifire", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.glassdoor.com/Job/remote-mortgage-business-analyst-jobs-SRCH_IL.0,6_IS11047_KO7,32.htm", source:"Glassdoor",
    tags:["product owner","BSA","LOS","Encompass","Agile","servicing"],
    notes:"Shapes future of central servicing platform. Product requirements + tool enhancements." },

  // ── REMOTE · DELIVERY / PROGRAM MANAGEMENT ────────────────────────────────

  { id:"R33", bucket:B.REM, family:"DELIVERY",
    title:"Software Delivery Manager — Agile (leads BA/Scrum teams)",
    company:"Various Fintech / Mortgage Tech",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://www.indeed.com/q-delivery-manager-l-remote-jobs.html", source:"Indeed",
    tags:["delivery manager","scrum master","BSA","agile","SDLC","Jira","Confluence","stakeholder"],
    notes:"Leads BA and Scrum Master teams end-to-end. Software delivery from intake to deployment. 7+ yrs exp target. Mortgage tech domain." },

  { id:"R34", bucket:B.REM, family:"DELIVERY",
    title:"Sr. Technical Program Manager — Mortgage / Fintech Delivery",
    company:"Various Mortgage Tech Companies", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://builtin.com/jobs/remote/project-management/search/technical-program-manager", source:"Built In",
    tags:["TPM","technical program manager","fintech","mortgage","delivery","cross-functional","agile"],
    notes:"TPM roles in fintech/mortgage — cross-functional, roadmap-level execution, engineering bridge. Strong market for experienced mortgage domain TPMs." },

  { id:"R35", bucket:B.REM, family:"DELIVERY",
    title:"Senior Program Manager — Fintech / Financial Services",
    company:"Various (Airwallex, Blend, Figure, Rocket, Fannie)",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://builtin.com/jobs/remote/project-management/search/senior-program-manager", source:"Built In",
    tags:["program manager","delivery","fintech","financial services","agile","roadmap"],
    notes:"Senior PM / Delivery roles at mortgage and fintech companies. Cross-cutting across multiple companies already listed." },

  // ── REMOTE · SCRUM / AGILE ────────────────────────────────────────────────

  { id:"R36", bucket:B.REM, family:"SCRUM",
    title:"Lending Application Scrum Master",
    company:"Benchmark Mortgage", city:"Remote (Plano TX HQ)",
    salary:null, posted:"Active May 2026 (1 week ago)",
    url:"https://www.linkedin.com/jobs/view/lending-application-scrum-master-remote-at-benchmark-mortgage-nmls-%232143-4411974629", source:"LinkedIn",
    tags:["scrum master","lending","agile","LOS","mortgage","requirements","sprint"],
    notes:"Leads agile delivery for lending application strategic initiatives. Drives requirements, timelines, sprint ceremonies. Fully remote." },

  { id:"R37", bucket:B.REM, family:"SCRUM",
    title:"Sr. Scrum Master — Mortgage / Fintech Platform",
    company:"Various IMBs / Vendors (Freedom, CrossCountry, ICE, nCino)",
    city:"Remote", salary:"$45–$60/hr (contract ranges)",
    posted:"Active Apr–May 2026",
    url:"https://www.ziprecruiter.com/Jobs/Remote-Scrum-Master", source:"ZipRecruiter",
    tags:["scrum master","agile","fintech","mortgage","LOS","SAFe","Jira","Confluence"],
    notes:"Strong demand for experienced Scrum Masters with mortgage domain + Agile toolkit. Multiple companies listing." },

  { id:"R38", bucket:B.REM, family:"SCRUM",
    title:"Agile Delivery Manager IV — Remote Contract",
    company:"Various / Contract", city:"Remote",
    salary:null, posted:"Start date 4/13/2026 (active)",
    url:"https://www.ziprecruiter.com/Jobs/Remote-Agile-Delivery-Manager", source:"ZipRecruiter",
    tags:["delivery manager","scrum master","Jira","Jira Align","Confluence","agile","contract"],
    notes:"'Delivery Manager IV' — Scrum Master adjacent. Jira Align, Confluence. 10-month remote contract. Mortgage/fintech domain valued." },

  // ── REMOTE · IMPLEMENTATION / CONSULTING ──────────────────────────────────

  { id:"R39", bucket:B.REM, family:"IMPL",
    title:"Sr. Implementation Manager — Fintech (Lending / LOS)",
    company:"SavvyMoney", city:"Remote (Dublin CA HQ)",
    salary:"$100K–$125K", posted:"Active Apr–May 2026",
    url:"https://careers.spectrumequity.com/companies/savvymoney-inc/", source:"Spectrum Equity",
    tags:["implementation manager","lending","LOS","fintech","SaaS","APIs","digital banking"],
    notes:"Fully remote for non-Dublin CA candidates. Same role as B18." },

  { id:"R40", bucket:B.REM, family:"IMPL",
    title:"Implementation Consultant — Mortgage Servicing (ICE / LoanServ)",
    company:"ICE Mortgage Technology", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.ice.com/careers", source:"ICE / Glassdoor",
    tags:["implementation consultant","LoanServ","servicing","LOS","ICE","Encompass","UAT"],
    notes:"Owns full implementation lifecycle: discovery, solution design, configuration, UAT, go-live, post-launch. Mortgage SaaS implementation." },

  { id:"R41", bucket:B.REM, family:"IMPL",
    title:"Sr. Implementation Lead — Digital Banking / LOS (SavvyMoney remote)",
    company:"SavvyMoney", city:"Remote",
    salary:"$90K–$125K", posted:"Active May 2026",
    url:"https://www.tealhq.com/job/senior-implementation-analyst_7ea1a7f6e808fbde951892888870a6065bd25", source:"Teal HQ",
    tags:["implementation lead","fintech","LOS","digital banking","SSO","REST APIs","agile"],
    notes:"Remote option for non-Dublin candidates. Same role as B19." },

  { id:"R42", bucket:B.REM, family:"IMPL",
    title:"Implementation Manager — Mortgage Servicing / LOS Conversion",
    company:"Dovenmuehle / Various Servicers", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.glassdoor.com/Job/mortgage-servicing-analyst-remote-jobs-SRCH_KO0,33.htm", source:"Glassdoor",
    tags:["implementation manager","LoanServ","servicing","LOS","conversion","MSP"],
    notes:"Expert-level MSP or LoanServ implementation and conversion. ST leads, data transformation, servicer coordination." },

  { id:"R43", bucket:B.REM, family:"IMPL",
    title:"Sr. Business Analyst — Mortgage / Loan Servicing (Consulting)",
    company:"SitusAMC", city:"Remote",
    salary:"$110K–$130K", posted:"Active Apr 2026",
    url:"https://www.situsamc.com/careers", source:"Glassdoor / Indeed",
    tags:["BSA","QA","servicing","secondary market","mortgage tech","consulting"],
    notes:"5+ yrs mortgage / tech / secondary market. QA/BA hybrid. Fully remote." },

  { id:"R44", bucket:B.REM, family:"IMPL",
    title:"Technology Consultant — Mortgage / Banking (Testing & Implementation)",
    company:"Treliant Consulting", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://treliant.com/careers/", source:"Treliant Careers / Indeed",
    tags:["consulting","mortgage","BSA","MSP","UDAAP","complaints testing","servicing","Treliant"],
    notes:"Treliant serves banks, mortgage originators, servicers, fintechs. Testing, consulting, implementation. MSP fluency valued. Remote." },

  { id:"R45", bucket:B.REM, family:"IMPL",
    title:"Product Owner / BA — Workflow & Loan Management Platform",
    company:"Aspen Grove Solutions", city:"Remote",
    salary:null, posted:"Active May 1, 2026",
    url:"https://www.aspengrovesolutions.com/careers", source:"Indeed",
    tags:["product analyst","loan management","workflow","servicer","proptech","agile"],
    notes:"Property, workflow & loan mgmt platform. US mortgage servicers / banks as clients. Agile environment." },

  // ── REMOTE · SOLUTIONS / ENGAGEMENT ──────────────────────────────────────

  { id:"R46", bucket:B.REM, family:"SOLNS",
    title:"Sr. Solutions Consultant — Fintech (Lending / Banking) — remote option",
    company:"SavvyMoney", city:"Remote",
    salary:"$90K–$120K + Equity", posted:"Jan 9, 2026 (active May 2026)",
    url:"https://careers.spectrumequity.com/companies/savvymoney-inc/jobs/64816729-senior-solutions-consultant-dublin-ca-or-usa-remote", source:"Spectrum Equity",
    tags:["solutions consultant","fintech","lending","digital banking","pre-sales","SaaS"],
    notes:"Fully remote for non-Dublin candidates. Pre-sales and post-sales solutions." },

  { id:"R47", bucket:B.REM, family:"SOLNS",
    title:"Engagement Manager — Fintech / Financial Services Delivery",
    company:"Various Consulting (Deloitte, Accenture, Capco)", city:"Remote / Hybrid",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://builtin.com/jobs/remote/project-management/fintech", source:"Built In",
    tags:["engagement manager","consulting","fintech","delivery","implementation","client-facing"],
    notes:"Consulting-side engagement manager for financial services clients. 'Lead client onboarding and implementation projects from initiation through go-live.' Mortgage/lending vertical strong fit." },

  { id:"R48", bucket:B.REM, family:"SOLNS",
    title:"Sr. Solutions Architect — Mortgage / LOS Platform",
    company:"ICE Mortgage Technology", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.ice.com/careers", source:"ICE Careers / ZipRecruiter",
    tags:["solutions architect","LOS","Encompass","MSP","mortgage","technical","pre-sales"],
    notes:"Technical, product, and functional support for ICE MT Sales and Professional Services. Deep Encompass + MSP platform knowledge required." },

  // ── REMOTE · CUSTOMER SUCCESS (ENTERPRISE / FINTECH VENDOR) ──────────────

  { id:"R49", bucket:B.REM, family:"CSM",
    title:"Sr. Customer Success Manager — Mortgage Tech / LOS Vendor",
    company:"Various (ICE, MeridianLink, Snapdocs, nCino, Maxwell)",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://builtin.com/jobs/customer-success/fintech", source:"Built In",
    tags:["customer success","CSM","mortgage","LOS","SaaS","implementation","product adoption"],
    notes:"Enterprise CSM at mortgage tech vendors — manages client onboarding, product adoption, renewal. Requires mortgage domain + LOS system fluency. Acts as post-implementation PO proxy." },

  { id:"R50", bucket:B.REM, family:"CSM",
    title:"Client Delivery Manager — Mortgage Servicing Platform",
    company:"Sagent / Various Servicer Vendors", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://sagent.com/careers/", source:"Sagent / Glassdoor",
    tags:["client delivery","CSM","servicing","LoanServ","mortgage","SaaS","relationship"],
    notes:"Post-implementation relationship + delivery owner for servicer clients. Sagent LoanServ platform." },

  { id:"R51", bucket:B.REM, family:"CSM",
    title:"Partner Manager — Fintech / FI Partner Delivery",
    company:"SavvyMoney", city:"Remote",
    salary:null, posted:"Active May 2026",
    url:"https://jobs.recruiter.com/jobs/11051997496-partner-manager-dublin-ca-or-usa-remote", source:"Recruiter.com",
    tags:["partner manager","CSM","implementation","fintech","lending","FI","digital banking"],
    notes:"PM for initial FI partner implementation + subsequent product enhancements. PM, CSM, and delivery roles combined." },

  // ── REMOTE · PRODUCT OPERATIONS / STRATEGY ────────────────────────────────

  { id:"R52", bucket:B.REM, family:"OPS",
    title:"Product Operations Manager — Mortgage / Fintech Platform",
    company:"Various (Blend, Snapdocs, Polly, Better, Rocket)",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://builtin.com/jobs/remote/project-management/fintech", source:"Built In",
    tags:["product ops","product operations","mortgage","fintech","tooling","process","metrics","PDLC"],
    notes:"'Lead improvement of product development operating system: planning rhythms, decision pathways, cross-functional alignment, PDLC standards.' Bridge between PM and delivery. High fit for mortgage tech ops experience." },

  { id:"R53", bucket:B.REM, family:"OPS",
    title:"Strategy & Operations Manager — Mortgage / Lending",
    company:"Various Fintech (Airwallex, SoFi, GoodLeap, loanDepot)",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://builtin.com/jobs/remote/project-management/fintech", source:"Built In",
    tags:["strategy ops","mortgage","fintech","process improvement","stakeholder","OKR","Jira"],
    notes:"'Lead high-impact projects and improve operational efficiency while managing stakeholder alignment.' Internal Biz Ops role requiring mortgage or lending domain. Strong PM DNA crossover." },

  { id:"R54", bucket:B.REM, family:"OPS",
    title:"Process Excellence Manager — Mortgage Technology",
    company:"Various IMBs / Servicers (Pennymac, Freedom, CrossCountry)",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://www.glassdoor.com/Job/remote-mortgage-business-analyst-jobs-SRCH_IL.0,6_IS11047_KO7,32.htm", source:"Glassdoor",
    tags:["process improvement","process excellence","mortgage","lean","Six Sigma","workflow","BSA"],
    notes:"'Lead cross-functional initiatives, driving operational readiness and improving efficiency through data-driven process designs.' Mortgage ops + tech overlap. BSA/PM skill crossover." },

  // ── REMOTE · CHANGE MANAGEMENT ────────────────────────────────────────────

  { id:"R55", bucket:B.REM, family:"CHANGE",
    title:"Change Manager / Transformation Lead — Mortgage Tech",
    company:"Various (ICE, Treliant, Rocket, Freedom)",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://www.indeed.com/q-delivery-manager-l-remote-jobs.html", source:"Indeed",
    tags:["change manager","change management","transformation","mortgage","LOS","stakeholder","adoption"],
    notes:"Change management tied to LOS implementations, platform migrations, Agile transformations. Requires mortgage domain + stakeholder engagement skills. Often posted alongside PM/BA roles." },

  // ── REMOTE · QA / UAT LEAD ────────────────────────────────────────────────

  { id:"R56", bucket:B.REM, family:"QA",
    title:"UAT Lead / QA Analyst — Mortgage Technology (Functional)",
    company:"Various (Rocket, ICE, CrossCountry, loanDepot)",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://www.roberthalf.com/us/en/jobs/all/qa-analyst", source:"Robert Half",
    tags:["UAT","QA","functional testing","mortgage","LOS","Encompass","test plan","acceptance criteria"],
    notes:"Functional QA / UAT Lead — NOT code-based testing. Owns test plans, acceptance criteria coordination, defect triage. Mortgage LOS domain required. High overlap with BSA / product analyst skill set." },

  { id:"R57", bucket:B.REM, family:"QA",
    title:"Product Analyst — 3-Month Contract (Mortgage UW, AI Testing)",
    company:"Ocrolus (AI mortgage fintech)", city:"Remote",
    salary:"$60/hr contract", posted:"Active (recurring)",
    url:"https://job-boards.greenhouse.io/ocrolusinc/jobs/5631845004", source:"Greenhouse ATS",
    tags:["product analyst","AI","mortgage underwriting","FHA","VA","contract","income analysis","QA"],
    notes:"5+ yrs UW exp. Tests AI income/fraud tools. $60/hr. 400+ lender clients incl. SoFi, Better, PayPal." },

  { id:"R58", bucket:B.REM, family:"QA",
    title:"Analyst — Mortgage Complaints & UDAAP Testing",
    company:"Treliant Consulting", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://treliant.com/careers/", source:"Indeed / Treliant",
    tags:["UDAAP","complaints","compliance testing","QA","mortgage","MSP","call center","audit"],
    notes:"Tests mortgage customer service calls for UDAAP compliance. MSP, MSP proficiency required. Treliant consulting." },

  // ── REMOTE · DATA / REPORTING ANALYST ────────────────────────────────────

  { id:"R59", bucket:B.REM, family:"DATA",
    title:"Sr. Data / Reporting Analyst — Mortgage Servicing Technology",
    company:"Various Servicers / IMBs (SitusAMC, Pennymac, NewRez)",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://www.glassdoor.com/Job/mortgage-servicing-analyst-remote-jobs-SRCH_KO0,33.htm", source:"Glassdoor",
    tags:["data analyst","Power BI","reporting","MSP","servicing","Encompass","Snowflake","SQL"],
    notes:"Mortgage servicing data/reporting roles. MSP, Encompass, Power BI, SQL. Pipeline analytics, investor reporting, KPI dashboards. Functional overlap with BSA and product analyst roles." },

  { id:"R60", bucket:B.REM, family:"DATA",
    title:"Product Data Analyst — Mortgage / Lending Platform",
    company:"Various (Pennymac, Freedom, Rocket, Blend)",
    city:"Remote", salary:null, posted:"Active Apr–May 2026",
    url:"https://www.pennymac.com/techjobs", source:"Pennymac Tech / Glassdoor",
    tags:["product analyst","data","mortgage","LOS","analytics","Power BI","Tableau","SQL"],
    notes:"Data-side of product analyst — supports product teams with metrics, dashboards, funnel analysis. Mortgage LOS and servicing domain." },

  // ── REMOTE · COMPLIANCE / REGULATORY (TECH-FACING) ───────────────────────

  { id:"R61", bucket:B.REM, family:"COMPLIANCE",
    title:"Mortgage Compliance Manager — Technology & Examinations",
    company:"Zillow (Home Loans) / Various", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.indeed.com/q-the-mortgage-leaders-l-remote-jobs.html", source:"Indeed",
    tags:["compliance","RESPA","TRID","mortgage","regulatory","examinations","LOS","BSA"],
    notes:"Mortgage compliance + regulatory leader with audit/examination management. 'Technology-facing' compliance overlaps with BSA/PM skill set. RESPA, TRID, UDAAP, agency guidelines." },

  { id:"R62", bucket:B.REM, family:"COMPLIANCE",
    title:"Mortgage UAT Specialist — Regulatory / LOS Compliance",
    company:"Orion Lending / Various", city:"Remote",
    salary:null, posted:"Active Apr–May 2026",
    url:"https://www.indeed.com/q-the-mortgage-leaders-l-remote-jobs.html", source:"Indeed",
    tags:["UAT","compliance","LOS","disclosure","TRID","mortgage","Non-QM","wholesale"],
    notes:"Combines UAT and compliance — tests mortgage LOS for regulatory compliance. 2+ yrs LOS exp required. Wholesale / Non-QM background a plus." },

  // ── REMOTE · EXPANDED TARGETS — NEW ORGS ────────────────────────────────

  { id:"R63", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Product Manager — Mortgage Servicing Technology",
    company:"Mr. Cooper Group", city:"Remote (Dallas TX HQ)",
    salary:null, posted:"Active May 2026",
    url:"https://www.mrcooper.com/careers", source:"Mr. Cooper Careers / LinkedIn",
    tags:["servicing","LOS","MSP","product manager","mortgage","AI","digital","Mr. Cooper"],
    notes:"Largest non-bank mortgage servicer in the US (4M+ customers). Heavy tech transformation investment. ServiceMac platform. Remote-friendly for PM/product roles. Tier A target." },

  { id:"R64", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Product Manager — Digital Mortgage Platform",
    company:"Guaranteed Rate", city:"Remote (Chicago IL HQ)",
    salary:null, posted:"Active May 2026",
    url:"https://www.rate.com/careers", source:"Guaranteed Rate Careers / Indeed",
    tags:["digital mortgage","LOS","product manager","fintech","AI","origination","Guaranteed Rate"],
    notes:"Top 5 U.S. retail mortgage lender. Heavy tech investment in digital origination. Known for tech-forward culture. Rate.com rebrand. Remote PM roles active." },

  { id:"R65", bucket:B.REM, family:"PM/PO/BA",
    title:"Product Manager — Mortgage Technology Platform",
    company:"Guild Mortgage", city:"Remote (San Diego CA HQ)",
    salary:null, posted:"Active May 2026",
    url:"https://www.guildmortgage.com/careers/", source:"Guild Mortgage Careers",
    tags:["mortgage","product manager","LOS","origination","POS","technology","Guild"],
    notes:"Top 20 retail mortgage lender. IPO 2020 (GMFS). Growing tech team. Strong culture ratings. SD HQ — remote for many product roles. Encompass-based LOS." },

  { id:"R66", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Product Manager — Modern Lending SaaS Platform",
    company:"LoanPro", city:"Remote (Draper UT HQ)",
    salary:null, posted:"Active May 2026",
    url:"https://loanpro.io/careers/", source:"LoanPro Careers / Built In",
    tags:["LMS","SaaS","lending","product manager","API","fintech","servicing","LoanPro"],
    notes:"Modern loan management system (LMS) — rapidly displacing legacy servicing platforms. API-first, cloud-native. Clients: mortgage, auto, BNPL, consumer. Remote-first culture. High growth." },

  { id:"R67", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Business Analyst / Product Owner — Mortgage Technology",
    company:"Movement Mortgage", city:"Remote (Indian Land SC HQ)",
    salary:null, posted:"Active May 2026",
    url:"https://movement.com/careers/", source:"Movement Mortgage Careers / Indeed",
    tags:["BSA","product owner","mortgage","LOS","origination","Encompass","agile","Movement"],
    notes:"Fast-growing retail IMB with strong culture (Best Places to Work). Encompass-based LOS. Heavy investment in process optimization and digital tools. Remote BSA/PO roles active." },

  { id:"R68", bucket:B.REM, family:"PM/PO/BA",
    title:"Sr. Product Manager — Mortgage Servicing Technology",
    company:"Planet Home Lending", city:"Remote (Meriden CT HQ)",
    salary:null, posted:"Active May 2026",
    url:"https://www.planethomelending.com/careers/", source:"Planet Home Lending Careers",
    tags:["servicing","MSP","LoanServ","product manager","mortgage","digital","Planet Home"],
    notes:"Growing servicer / originator. Significant MSP and servicing platform investment. Remote-friendly for product and technology roles. Tier B target with room to grow." },

  { id:"R69", bucket:B.REM, family:"DATA",
    title:"Sr. Product Manager — Mortgage Data & Analytics Platform",
    company:"CoreLogic", city:"Remote (Irvine CA HQ)",
    salary:null, posted:"Active May 2026",
    url:"https://www.corelogic.com/careers/", source:"CoreLogic Careers / LinkedIn",
    tags:["data","analytics","mortgage","product manager","property","AVM","risk","CoreLogic"],
    notes:"Leading provider of property data, analytics, and workflow solutions for mortgage, title, and insurance. Deep LOS data integrations. Remote PM roles active. Tier A — strong brand, stable market position." },

  { id:"R70", bucket:B.REM, family:"CSM",
    title:"Product Manager — Home Loan Marketplace Platform",
    company:"LendingTree", city:"Remote (Charlotte NC HQ)",
    salary:null, posted:"Active May 2026",
    url:"https://www.lendingtree.com/careers/", source:"LendingTree Careers",
    tags:["marketplace","home loans","product manager","fintech","lead generation","mortgage","LendingTree"],
    notes:"Largest online loan marketplace. 30M+ users. PM roles spanning consumer home loan experience, partner integrations, and ML-driven matching. Remote-friendly. NASDAQ: TREE." },
];

// ─────────────────────────────────────────────────────────────────────────────
// NON-MORTGAGE JOBS — populate when net must be cast wider (contingency resume)
// ─────────────────────────────────────────────────────────────────────────────
const nonMortgageJobs = [];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ALL_FAMILIES = ["All", ...Object.keys(FAMILY_COLORS)];
const ALL_BUCKETS  = ["All", ...Object.values(B)];
const TIER_ORDER   = { A: 0, B: 1, C: 2 };

const FAMILY_LABELS = {
  "PM/PO/BA":   "PM · PO · BA · Sr. BSA",
  "DELIVERY":   "Delivery Mgr · Program Mgr · TPM",
  "SCRUM":      "Scrum Master · RTE · Agile Coach",
  "IMPL":       "Implementation · Functional Consultant",
  "SOLNS":      "Solutions Consultant · Architect · Engagement",
  "CSM":        "Customer Success · Client Delivery",
  "OPS":        "Product Ops · Strategy & Ops · Process",
  "CHANGE":     "Change Manager · Transformation Lead",
  "QA":         "UAT Lead · QA Analyst (Functional)",
  "DATA":       "Data / Reporting Analyst (Mortgage Tech)",
  "COMPLIANCE": "Compliance Analyst (Tech-facing)",
};

const PIPELINE_STATUS_META = {
  TARGETED:           { label:"Targeted",            color:"#6b7280", bg:"#f1f5f9" },
  IN_PROGRESS:        { label:"Working",             color:"#b45309", bg:"#fef3c7" },
  APPLIED:            { label:"Applied",             color:"#1d4ed8", bg:"#dbeafe" },
  CALLBACK:           { label:"Callback",            color:"#7c3aed", bg:"#ede9fe" },
  INTERVIEW:          { label:"Interview!",          color:"#059669", bg:"#d1fae5" },
  OFFER:              { label:"Offer!",              color:"#92400e", bg:"#fef9c3" },
  COLD_OUTREACH:      { label:"Outreach",            color:"#c2410c", bg:"#fff7ed" },
  NO_THANKS:          { label:"No Thanks",           color:"#dc2626", bg:"#fee2e2" },
  NOT_MOVING_FORWARD: { label:"Not Moving Forward",  color:"#be185d", bg:"#fdf2f8" },
  GHOSTED:            { label:"Ghosted",             color:"#94a3b8", bg:"#f8fafc" },
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD ROLE FORM — modal form for self-sourcing any role into either board
// ─────────────────────────────────────────────────────────────────────────────
function AddRoleForm({ boardId, onSubmit, onCancel }) {
  const [title, setTitle]           = useState("");
  const [company, setCompany]       = useState("");
  const [city, setCity]             = useState("Remote");
  const [bucket, setBucket]         = useState(B.REM);
  const [family, setFamily]         = useState("PM/PO/BA");
  const [salaryTier, setSalaryTier] = useState("");
  const [salaryEst, setSalaryEst]   = useState("");
  const [url, setUrl]               = useState("");
  const [posted, setPosted]         = useState("");
  const [notes, setNotes]           = useState("");
  const [tags, setTags]             = useState("");

  const canSubmit = title.trim() && company.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      title:      title.trim(),
      company:    company.trim(),
      city:       city.trim() || "Remote",
      bucket,
      family,
      salaryTier: salaryTier || null,
      salaryEst:  salaryEst.trim() || null,
      url:        url.trim() || "#",
      posted:     posted.trim() || new Date().toLocaleDateString("en-US", { month:"short", year:"numeric" }),
      source:     "Self-sourced",
      notes:      notes.trim() || null,
      tags:       tags.split(",").map(t => t.trim()).filter(Boolean),
    });
  };

  const inp = {
    width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:7,
    border:"1px solid #e2e8f0", fontSize:14, fontFamily:"'Inter',sans-serif",
    color:"#0f172a", background:"#f8fafc", outline:"none",
  };
  const lbl = {
    display:"block", fontSize:12, fontWeight:600, color:"#374151",
    fontFamily:"'Inter',sans-serif", marginBottom:4,
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize:18, fontWeight:700, color:"#0f172a", fontFamily:"'Inter',sans-serif", marginBottom:4 }}>+ Add Role</div>
      <div style={{ fontSize:13, color:"#64748b", fontFamily:"'Inter',sans-serif", marginBottom:20 }}>
        Self-sourced roles land on this board and work with all filters, tracking, and the Activity Log.
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        <div style={{ gridColumn:"1 / -1" }}>
          <label style={lbl}>Job Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Sr. Product Manager — Mortgage Technology" style={inp} autoFocus />
        </div>
        <div style={{ gridColumn:"1 / -1" }}>
          <label style={lbl}>Company *</label>
          <input value={company} onChange={e => setCompany(e.target.value)}
            placeholder="Company name" style={inp} />
        </div>
        <div>
          <label style={lbl}>City / Location</label>
          <input value={city} onChange={e => setCity(e.target.value)}
            placeholder="Remote" style={inp} />
        </div>
        <div>
          <label style={lbl}>Geographic Bucket</label>
          <select value={bucket} onChange={e => setBucket(e.target.value)} style={inp}>
            <option value={B.REM}>{B.REM}</option>
            <option value={B.BAY}>{B.BAY}</option>
            <option value={B.SB}>{B.SB}</option>
          </select>
        </div>
        <div>
          <label style={lbl}>Role Family</label>
          <select value={family} onChange={e => setFamily(e.target.value)} style={inp}>
            {Object.entries(FAMILY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{k} — {v}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Salary Tier</label>
          <select value={salaryTier} onChange={e => setSalaryTier(e.target.value)} style={inp}>
            <option value="">— Unknown</option>
            {Object.entries(TIER_META).map(([t, m]) => (
              <option key={t} value={t}>{t} — {m.desc}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Salary Est.</label>
          <input value={salaryEst} onChange={e => setSalaryEst(e.target.value)}
            placeholder="~$140K–$175K" style={inp} />
        </div>
        <div>
          <label style={lbl}>Date Found / Posted</label>
          <input value={posted} onChange={e => setPosted(e.target.value)}
            placeholder="May 2026" style={inp} />
        </div>
        <div style={{ gridColumn:"1 / -1" }}>
          <label style={lbl}>Apply URL</label>
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://company.com/careers/job-id" style={inp} />
        </div>
        <div style={{ gridColumn:"1 / -1" }}>
          <label style={lbl}>Tags (comma-separated)</label>
          <input value={tags} onChange={e => setTags(e.target.value)}
            placeholder="product manager, mortgage, LOS, remote" style={inp} />
        </div>
        <div style={{ gridColumn:"1 / -1" }}>
          <label style={lbl}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Key details, why this is a fit, recruiter name, where you found it…"
            style={{ ...inp, resize:"vertical" }} />
        </div>
      </div>

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button type="button" onClick={onCancel}
          style={{ padding:"9px 20px", borderRadius:7, border:"1px solid #e2e8f0",
            background:"#fff", color:"#6b7280", fontSize:14, fontFamily:"'Inter',sans-serif",
            cursor:"pointer", fontWeight:600 }}>
          Cancel
        </button>
        <button type="submit" disabled={!canSubmit}
          style={{ padding:"9px 24px", borderRadius:7, border:"none",
            background: canSubmit ? "#0891b2" : "#e2e8f0",
            color: canSubmit ? "#fff" : "#94a3b8",
            fontSize:14, fontFamily:"'Inter',sans-serif",
            cursor: canSubmit ? "pointer" : "default", fontWeight:700 }}>
          Add to Board
        </button>
      </div>
    </form>
  );
}

export function RolesBoard({ onSelectRole, pipelineStatusMap = new Map(), boardId = "mortgage", boardTitle = "Mortgage Prospect Board", jobsList = jobs, pipelineCards = [] }) {
  const dismissedKey = boardId === "mortgage" ? "gsd-dismissed" : `gsd-dismissed-${boardId}`;
  const pipelineRoleIds = useMemo(() => new Set(pipelineStatusMap.keys()), [pipelineStatusMap]);
  const [search, setSearch]       = useState("");
  const [bucketFilter, setBucket] = useState("All");
  const [familyFilter, setFamily] = useState("All");
  const [tierFilter, setTier]     = useState("All");
  const [orgFilter, setOrgFilter] = useState("All");
  const [showNotes, setNotes]     = useState(true);
  const [collapsed, setCollapsed] = useState({});
  const [dismissed, setDismissed]   = useState(() => new Set(JSON.parse(localStorage.getItem(dismissedKey) || "[]")));
  const [customRoles, setCustomRoles] = useState(() => JSON.parse(localStorage.getItem(`gsd-custom-${boardId}`) || "[]"));
  const [showAddModal, setShowAddModal] = useState(false);

  // Companies that company passed on Aza — flag on prospect board for awareness
  const flaggedCompanies = useMemo(() => {
    const s = new Set();
    pipelineCards.forEach(c => {
      if ((c.status === "NOT_MOVING_FORWARD" || c.status === "NO_THANKS") && c.company)
        s.add(c.company.toLowerCase().trim());
    });
    return s;
  }, [pipelineCards]);

  const dismissRole = (id) => setDismissed(prev => {
    const next = new Set(prev);
    next.add(id);
    localStorage.setItem(dismissedKey, JSON.stringify([...next]));
    return next;
  });

  const restoreAll = () => {
    localStorage.removeItem(dismissedKey);
    setDismissed(new Set());
  };

  const getSalary = useCallback((job) =>
    SALARY_EST[job.id] || (job.salaryTier ? { tier: job.salaryTier, est: job.salaryEst || "" } : null),
  []);

  const addCustomRole = useCallback((data) => {
    const role = { ...data, id: `CUSTOM_${boardId.toUpperCase()}_${Date.now()}`, _custom: true };
    setCustomRoles(prev => {
      const next = [...prev, role];
      localStorage.setItem(`gsd-custom-${boardId}`, JSON.stringify(next));
      return next;
    });
  }, [boardId]);

  const deleteCustomRole = useCallback((id) => {
    setCustomRoles(prev => {
      const next = prev.filter(r => r.id !== id);
      localStorage.setItem(`gsd-custom-${boardId}`, JSON.stringify(next));
      return next;
    });
  }, [boardId]);

  const allJobs = useMemo(() => [...jobsList, ...customRoles], [jobsList, customRoles]);

  const ORG_TIER_ORDER = { G: 0, Y: 1, R: 2 };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allJobs
      .filter(j => {
        if (dismissed.has(j.id)) return false;
        if (pipelineStatusMap.has(j.id) && pipelineStatusMap.get(j.id) !== "TARGETED") return false;
        const ms = !q || [j.title, j.company, j.city, j.family, ...(j.tags||[]), j.notes||""]
          .join(" ").toLowerCase().includes(q);
        const mb = bucketFilter === "All" || j.bucket === bucketFilter;
        const mf = familyFilter === "All" || j.family === familyFilter;
        const mt = tierFilter === "All" || (getSalary(j)?.tier === tierFilter);
        const mo = orgFilter === "All" || orgQuality(j.id, j.company) === orgFilter;
        return ms && mb && mf && mt && mo;
      })
      .sort((a, b) => {
        const ta = TIER_ORDER[getSalary(a)?.tier] ?? 9;
        const tb = TIER_ORDER[getSalary(b)?.tier] ?? 9;
        if (ta !== tb) return ta - tb;
        const oa = ORG_TIER_ORDER[orgQuality(a.id, a.company)] ?? 9;
        const ob = ORG_TIER_ORDER[orgQuality(b.id, b.company)] ?? 9;
        return oa - ob;
      });
  }, [search, bucketFilter, familyFilter, tierFilter, orgFilter, pipelineRoleIds, pipelineStatusMap, dismissed, allJobs, getSalary]);

  const byBucket = useMemo(() => {
    const g = {};
    Object.values(B).forEach(b => { g[b] = []; });
    filtered.forEach(j => g[j.bucket].push(j));
    return g;
  }, [filtered]);

  const tierCounts = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0 };
    allJobs.forEach(j => { const sd = getSalary(j); if (sd?.tier) counts[sd.tier]++; });
    return counts;
  }, [allJobs, getSalary]);

  const toggle = b => setCollapsed(s => ({ ...s, [b]: !s[b] }));

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden", background:"#f8fafc", fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif", color:"#0f172a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{ background:"#ffffff", borderBottom:"1px solid #e2e8f0", zIndex:20, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", flexShrink:0 }}>
        <div style={{ padding:"10px 24px 8px" }}>

          {/* Title + stats row */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap", marginBottom:8 }}>
            <div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:"#0891b2", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>
                {boardId === "mortgage" ? "Mortgage Product Role Ecosystem · Verified Active · May 2026" : "Industry-Agnostic Prospects · Activate When Net Cast Wider"}
              </div>
              <h1 style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:700, margin:0, color:"#0f172a", lineHeight:1.2, letterSpacing:"-0.01em" }}>
                {boardTitle}
              </h1>
              <div style={{ fontSize:12, color:"#64748b", marginTop:2, lineHeight:1.4 }}>
                {boardId === "mortgage"
                  ? "PM · PO · BA · Delivery · Scrum · Implementation · Solutions · CSM · Ops · QA · Compliance"
                  : "Platform · Delivery · Product · Program · Strategy · Implementation · Consulting"}
              </div>
            </div>

            {/* Bucket counts + total */}
            <div style={{ display:"flex", gap:14, alignItems:"center", flexShrink:0 }}>
              {Object.values(B).map(b => {
                const m = META[b]; const ct = byBucket[b]?.length ?? 0;
                return (
                  <div key={b} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:700, color:m.c, lineHeight:1 }}>{ct}</div>
                    <div style={{ fontSize:10, color:"#94a3b8", marginTop:2, fontFamily:"'IBM Plex Mono',monospace" }}>{b.split(" ")[0]}</div>
                  </div>
                );
              })}
              <div style={{ borderLeft:"2px solid #e2e8f0", paddingLeft:14 }}>
                <div style={{ fontSize:22, fontWeight:700, color:"#0891b2", lineHeight:1 }}>{filtered.length}</div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:2, fontFamily:"'IBM Plex Mono',monospace" }}>prospects</div>
              </div>
              {dismissed.size > 0 && (
                <div style={{ borderLeft:"2px solid #e2e8f0", paddingLeft:14, textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:700, color:"#94a3b8", lineHeight:1 }}>{dismissed.size}</div>
                  <div style={{ fontSize:10, color:"#94a3b8", marginTop:2, fontFamily:"'IBM Plex Mono',monospace" }}>hidden</div>
                  <button onClick={restoreAll} style={{ fontSize:10, color:"#0891b2", background:"none", border:"none", cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", padding:0, marginTop:2 }}>
                    restore all
                  </button>
                </div>
              )}
              <div style={{ borderLeft:"2px solid #e2e8f0", paddingLeft:14 }}>
                <button onClick={() => setShowAddModal(true)}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
                    borderRadius:7, border:"1.5px solid #0891b2", background:"#e0f9ff",
                    color:"#0891b2", fontSize:13, fontWeight:700, cursor:"pointer",
                    fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap" }}>
                  + Add Role
                </button>
                {customRoles.length > 0 && (
                  <div style={{ fontSize:10, color:"#94a3b8", marginTop:3, textAlign:"center",
                    fontFamily:"'IBM Plex Mono',monospace" }}>
                    {customRoles.length} custom
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter bar row 1: search + salary + org — full width */}
          <div style={{ display:"flex", gap:6, marginBottom:4, alignItems:"center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title · company · skill · city…"
              style={{ flex:1, padding:"6px 12px", borderRadius:6,
                border:"1px solid #e2e8f0", background:"#f8fafc", color:"#0f172a",
                fontSize:12, fontFamily:"'Inter',sans-serif", outline:"none" }} />
            <select value={bucketFilter} onChange={e => setBucket(e.target.value)}
              style={{ padding:"6px 10px", borderRadius:6, border:"1px solid #e2e8f0",
                background:"#f8fafc", color:"#374151", fontSize:12,
                fontFamily:"'Inter',sans-serif", cursor:"pointer" }}>
              {ALL_BUCKETS.map(b => <option key={b}>{b}</option>)}
            </select>

            {/* Salary divider */}
            <span style={{ fontSize:10, color:"#cbd5e1", fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>SALARY</span>
            <button onClick={() => setTier("All")}
              style={{ fontSize:11, fontWeight:600, padding:"4px 9px", borderRadius:5,
                border:"1.5px solid #e2e8f0",
                background: tierFilter === "All" ? "#0f172a" : "#ffffff",
                color: tierFilter === "All" ? "#ffffff" : "#6b7280",
                cursor:"pointer", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap" }}>
              All ({allJobs.length})
            </button>
            {Object.entries(TIER_META).map(([tier, tm2]) => (
              <button key={tier} onClick={() => setTier(tierFilter === tier ? "All" : tier)}
                style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:5,
                  border:`1.5px solid ${tm2.color}`,
                  background: tierFilter === tier ? tm2.color : "#ffffff",
                  color: tierFilter === tier ? "#ffffff" : tm2.color,
                  cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Inter',sans-serif" }}>
                {tier === "A" ? "★ " : ""}{tm2.label} ({tierCounts[tier]})
              </button>
            ))}

            {/* Org divider */}
            <span style={{ fontSize:10, color:"#cbd5e1", fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>ORG</span>
            <button onClick={() => setOrgFilter("All")}
              style={{ fontSize:11, fontWeight:600, padding:"4px 9px", borderRadius:5,
                border:"1.5px solid #e2e8f0",
                background: orgFilter === "All" ? "#0f172a" : "#ffffff",
                color: orgFilter === "All" ? "#ffffff" : "#6b7280",
                cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
              All
            </button>
            {Object.entries(ORG_QUALITY_META).map(([key, om]) => (
              <button key={key} onClick={() => setOrgFilter(orgFilter === key ? "All" : key)}
                style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:5,
                  border:`1.5px solid ${om.color}`,
                  background: orgFilter === key ? om.color : "#ffffff",
                  color: orgFilter === key ? "#ffffff" : om.color,
                  cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Inter',sans-serif",
                  display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%",
                  background: orgFilter === key ? "#ffffff" : om.dot,
                  display:"inline-block", flexShrink:0 }} />
                {om.label}
              </button>
            ))}

            {/* Notes + Clear */}
            <button onClick={() => setNotes(s => !s)}
              style={{ padding:"4px 10px", borderRadius:5,
                border:`1.5px solid ${showNotes ? "#0891b2" : "#e2e8f0"}`,
                background: showNotes ? "#e0f9ff" : "#ffffff",
                color: showNotes ? "#0891b2" : "#6b7280",
                fontSize:11, fontFamily:"'Inter',sans-serif", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>
              Notes
            </button>
            {(search || bucketFilter !== "All" || familyFilter !== "All" || tierFilter !== "All" || orgFilter !== "All") && (
              <button onClick={() => { setSearch(""); setBucket("All"); setFamily("All"); setTier("All"); setOrgFilter("All"); }}
                style={{ padding:"4px 10px", borderRadius:5, border:"1px solid #e2e8f0",
                  background:"#ffffff", color:"#6b7280", fontSize:11,
                  fontFamily:"'Inter',sans-serif", cursor:"pointer", whiteSpace:"nowrap" }}>
                Clear
              </button>
            )}
          </div>

          {/* Filter bar row 2: family tags + disclaimer — full width */}
          <div style={{ display:"flex", gap:4, alignItems:"center", marginBottom:6 }}>
            {Object.entries(FAMILY_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setFamily(familyFilter === k ? "All" : k)}
                style={{ fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:4,
                  border:`1.5px solid ${FAMILY_COLORS[k]}`,
                  background: familyFilter === k ? FAMILY_COLORS[k] : "#ffffff",
                  color: familyFilter === k ? "#ffffff" : FAMILY_COLORS[k],
                  cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Inter',sans-serif" }}>
                {k}
              </button>
            ))}
            <div style={{ flex:1, background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:5,
              padding:"3px 10px", fontSize:10, color:"#0369a1", fontFamily:"'IBM Plex Mono',monospace",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginLeft:4 }}>
              All listings confirmed active Apr–May 2026 · Verify before applying
            </div>
            {(search || bucketFilter !== "All" || familyFilter !== "All" || tierFilter !== "All" || orgFilter !== "All") && (
              <span style={{ fontSize:10, color:"#64748b", fontFamily:"'IBM Plex Mono',monospace",
                whiteSpace:"nowrap" }}>
                {filtered.length} of {allJobs.filter(j => !dismissed.has(j.id) && !(pipelineStatusMap.has(j.id) && pipelineStatusMap.get(j.id) !== "TARGETED")).length} shown
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE AREA (body + footer) ────────────────────── */}
      <div style={{ flex:1, overflowY:"auto" }}>

      {/* ── BODY ───────────────────────────────────────────────── */}
      <div style={{ padding:"14px 24px 40px" }}>
        {Object.values(B).map(bucket => {
          const m = META[bucket];
          const items = byBucket[bucket];
          if (!items.length) return null;
          const isOpen = !collapsed[bucket];

          return (
            <div key={bucket} style={{ marginBottom:16 }}>
              {/* Bucket header button */}
              <button onClick={() => toggle(bucket)}
                style={{ width:"100%", background:"none", border:"none", cursor:"pointer", textAlign:"left", padding:0 }}>
                <div style={{ background:m.c, borderRadius: isOpen ? "8px 8px 0 0" : "8px", padding:"9px 16px",
                  display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <span style={{ fontSize:14, fontWeight:700, color:"#ffffff", fontFamily:"'Inter',sans-serif" }}>
                      {bucket}
                      <span style={{ fontSize:11, fontWeight:500, background:"rgba(255,255,255,0.2)",
                        padding:"2px 8px", borderRadius:4, marginLeft:8 }}>
                        {items.length} roles
                      </span>
                    </span>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", marginTop:2, fontFamily:"'Inter',sans-serif" }}>{m.sub}</div>
                  </div>
                  <span style={{ color:"rgba(255,255,255,0.8)", fontSize:12, fontFamily:"'IBM Plex Mono',monospace" }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div style={{ border:`1px solid ${m.c}35`, borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                  {items.map((job, idx) => {
                    const fc = FAMILY_COLORS[job.family] || "#64748b";
                    const sd = getSalary(job);
                    const tm = sd ? TIER_META[sd.tier] : null;
                    return (
                      <div key={job.id}
                        style={{ background: sd?.tier === "A" ? "#fffef5" : "#ffffff",
                          borderLeft:`3px solid ${tm ? tm.color : m.c}`,
                          borderTop: idx === 0 ? "none" : "2px solid #e2e8f0",
                          transition:"background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.background = sd?.tier === "A" ? "#fffef5" : "#ffffff"}>

                        {/* 2-line tile — clean, uniform, no column dividers */}
                        {(() => {
                          const oq = orgQuality(job.id, job.company);
                          const om = ORG_QUALITY_META[oq];
                          const pSt = pipelineStatusMap.has(job.id) ? pipelineStatusMap.get(job.id) : null;
                          const pSm = pSt ? (PIPELINE_STATUS_META[pSt] || {}) : null;
                          const visibleTags = (job.tags||[]).slice(0, 5);
                          const extraTags = (job.tags||[]).length - visibleTags.length;
                          const salaryColor = sd?.tier === "A" ? "#b45309" : sd?.tier === "B" ? "#1d4ed8" : "#4b5563";
                          return (
                            <div style={{ display:"flex", alignItems:"center", gap:12,
                              padding:"7px 14px", minHeight:52 }}>

                              {/* Left: 2-line content block */}
                              <div style={{ flex:1, minWidth:0 }}>

                                {/* Line 1: grade → title → color-coded badges */}
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                                  {/* org dot */}
                                  <span title={`${om.label}: ${om.desc}`}
                                    style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                                      background:om.dot, boxShadow:`0 0 0 2px ${om.dot}40`, cursor:"help" }} />
                                  {/* tier / grade badge */}
                                  {tm && (
                                    <span style={{ fontSize:10, fontWeight:800, color:"#fff", flexShrink:0,
                                      background: sd.tier==="A" ? "#b45309" : sd.tier==="B" ? "#1d4ed8" : "#4b5563",
                                      padding:"2px 7px", borderRadius:4, fontFamily:"'IBM Plex Mono',monospace" }}>
                                      {sd.tier==="A" ? "★ A" : sd.tier}
                                    </span>
                                  )}
                                  {/* TITLE — dominant, immediately after grade */}
                                  <span style={{ fontSize:13, fontWeight:700, color:"#0f172a",
                                    fontFamily:"'Inter',sans-serif", lineHeight:1.3 }}>
                                    {job.title}
                                  </span>
                                  {/* color-coded family badge */}
                                  <span style={{ fontSize:10, fontWeight:600, flexShrink:0, whiteSpace:"nowrap",
                                    fontFamily:"'IBM Plex Mono',monospace", color:fc,
                                    background:fc+"18", border:`1px solid ${fc}35`,
                                    padding:"1px 6px", borderRadius:3 }}>
                                    {job.family}
                                  </span>
                                  {/* pipeline status badge */}
                                  {pSm && (
                                    <span style={{ fontSize:10, fontWeight:700, flexShrink:0, whiteSpace:"nowrap",
                                      color:pSm.color, background:pSm.bg, border:`1px solid ${pSm.color}40`,
                                      padding:"1px 6px", borderRadius:3, fontFamily:"'IBM Plex Mono',monospace" }}>
                                      {pSm.label || pSt}
                                    </span>
                                  )}
                                  {/* prior history flag */}
                                  {flaggedCompanies.has(job.company?.toLowerCase().trim()) && (
                                    <span title="Prior engagement — marked No Thanks or Not Moving Forward"
                                      style={{ fontSize:10, color:"#be185d", flexShrink:0, cursor:"help" }}>⚠</span>
                                  )}
                                </div>

                                {/* Line 2: company · city · salary · tags */}
                                <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                                  <span style={{ fontSize:12, fontWeight:600, color:"#334155",
                                    fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap" }}>
                                    {job.company}
                                  </span>
                                  {job.city && <>
                                    <span style={{ fontSize:11, color:"#cbd5e1" }}>·</span>
                                    <span style={{ fontSize:11, color:"#64748b", fontFamily:"'Inter',sans-serif",
                                      whiteSpace:"nowrap" }}>
                                      {job.city}
                                    </span>
                                  </>}
                                  {sd && <>
                                    <span style={{ fontSize:11, color:"#cbd5e1" }}>·</span>
                                    <span style={{ fontSize:11, fontWeight:700, whiteSpace:"nowrap",
                                      fontFamily:"'IBM Plex Mono',monospace", color:salaryColor }}>
                                      {sd.est}
                                    </span>
                                  </>}
                                  {visibleTags.map(t => (
                                    <span key={t} style={{ fontSize:10, fontFamily:"'IBM Plex Mono',monospace",
                                      background:m.bg, color:m.c, whiteSpace:"nowrap",
                                      padding:"1px 6px", borderRadius:3, border:`1px solid ${m.c}20` }}>
                                      {t}
                                    </span>
                                  ))}
                                  {extraTags > 0 && (
                                    <span title={(job.tags||[]).slice(5).join(", ")}
                                      style={{ fontSize:10, color:"#94a3b8", fontFamily:"'IBM Plex Mono',monospace",
                                        cursor:"help" }}>
                                      +{extraTags} more
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right: actions pinned */}
                              <div style={{ flexShrink:0, display:"flex", flexDirection:"column",
                                alignItems:"flex-end", gap:5 }}>
                                <span style={{ fontSize:10, color:"#94a3b8",
                                  fontFamily:"'IBM Plex Mono',monospace", whiteSpace:"nowrap" }}>
                                  {job.posted}
                                </span>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  <button
                                    onClick={() => onSelectRole ? onSelectRole(job) : window.open(job.url,"_blank")}
                                    style={{ fontSize:11, fontWeight:700, color:"#fff",
                                      background: pSt==="TARGETED" ? "#6366f1"
                                        : pipelineRoleIds.has(job.id) ? "#059669" : "#0891b2",
                                      padding:"5px 13px", borderRadius:6, border:"none",
                                      cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Inter',sans-serif" }}>
                                    {pSt==="TARGETED" ? "Queued →" : pipelineRoleIds.has(job.id) ? "In Log ✓" : "Track →"}
                                  </button>
                                  {job._custom && (
                                    <span style={{ fontSize:9, fontWeight:700, color:"#7c3aed",
                                      background:"#ede9fe", border:"1px solid #c4b5fd",
                                      padding:"1px 5px", borderRadius:3, fontFamily:"'IBM Plex Mono',monospace" }}>
                                      CUSTOM
                                    </span>
                                  )}
                                  <button onClick={() => dismissRole(job.id)} title="Not a fit"
                                    style={{ fontSize:13, color:"#cbd5e1", background:"none", border:"none",
                                      cursor:"pointer", padding:0, lineHeight:1, transition:"color .15s" }}
                                    onMouseEnter={e => e.currentTarget.style.color="#ef4444"}
                                    onMouseLeave={e => e.currentTarget.style.color="#cbd5e1"}>
                                    ✕
                                  </button>
                                  {job._custom && (
                                    <button onClick={() => deleteCustomRole(job.id)} title="Delete permanently"
                                      style={{ fontSize:13, color:"#cbd5e1", background:"none", border:"none",
                                        cursor:"pointer", padding:0, lineHeight:1, transition:"color .15s" }}
                                      onMouseEnter={e => e.currentTarget.style.color="#be185d"}
                                      onMouseLeave={e => e.currentTarget.style.color="#cbd5e1"}>
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {allJobs.length === 0 && (
          <div style={{ textAlign:"center", padding:"80px 28px" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#0f172a", fontFamily:"'Inter',sans-serif", marginBottom:8 }}>
              {boardTitle} is Ready
            </div>
            <div style={{ fontSize:14, color:"#64748b", lineHeight:1.7, maxWidth:480, margin:"0 auto", fontFamily:"'Inter',sans-serif", marginBottom:24 }}>
              {boardId === "non-mortgage"
                ? "Add any role you find yourself — platform PM, TPM, delivery, strategy, or anything else outside mortgage. Same transferable skills, no mortgage-specific language required."
                : "Run /u_job_scan with expanded search criteria to populate this board. Or add a self-sourced role you found on your own."
              }
            </div>
            <button onClick={() => setShowAddModal(true)}
              style={{ padding:"12px 28px", borderRadius:9, border:"none",
                background:"#0891b2", color:"#fff", fontSize:15, fontWeight:700,
                cursor:"pointer", fontFamily:"'Inter',sans-serif",
                boxShadow:"0 2px 10px rgba(8,145,178,0.35)" }}>
              + Add Your First Role
            </button>
          </div>
        )}
        {allJobs.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:80, color:"#94a3b8", fontSize:16, fontFamily:"'Inter',sans-serif" }}>
            No matches. Try clearing a filter.
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop:"1px solid #e2e8f0", padding:"16px 28px", textAlign:"center",
        fontSize:12, color:"#94a3b8", background:"#ffffff",
        fontFamily:"'IBM Plex Mono',monospace", lineHeight:1.6 }}>
        Compiled May 17, 2026 · Sources: Greenhouse, Lever, Ashby, Glassdoor, Indeed, Built In SF, LinkedIn, Spectrum Equity, Teal HQ, company career pages · Verify before applying
      </div>

      </div>{/* end scrollable area */}

      {/* ── ADD ROLE MODAL ─────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200,
          display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={{ background:"#ffffff", borderRadius:12, padding:28, width:"100%",
            maxWidth:560, maxHeight:"90vh", overflowY:"auto",
            boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <AddRoleForm
              boardId={boardId}
              onSubmit={(data) => { addCustomRole(data); setShowAddModal(false); }}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GSD PORTAL — unified shell: Roles Board + Pipeline Kanban + Workflow Drawer
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const pipeline = usePipeline();
  const [tab, setTab] = useState("board");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("gsd-dark") === "1");
  const toggleDark = () => setDarkMode(d => { const n = !d; localStorage.setItem("gsd-dark", n ? "1" : "0"); return n; });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerJob, setDrawerJob] = useState(null);    // board job object
  const [drawerCardId, setDrawerCardId] = useState(null); // pipeline card id

  // Derive the pipeline card to show in drawer — auto-updates when cards change
  const drawerCard = useMemo(() => {
    if (drawerCardId) return pipeline.cards.find(c => c.id === drawerCardId) || null;
    if (drawerJob) return pipeline.cards.find(c =>
      c.roleId === drawerJob.id ||
      (c.company.toLowerCase() === drawerJob.company.toLowerCase() &&
       c.title.toLowerCase() === drawerJob.title.toLowerCase())
    ) || null;
    return null;
  }, [pipeline.cards, drawerCardId, drawerJob]);

  // Map of board role IDs → pipeline status (for badge + button state in RolesBoard)
  const pipelineStatusMap = useMemo(() => {
    const m = new Map();
    pipeline.cards.forEach(c => { if (c.roleId) m.set(c.roleId, c.status); });
    return m;
  }, [pipeline.cards]);

  const prospectCount = useMemo(() =>
    jobs.filter(j => !pipelineStatusMap.has(j.id) || pipelineStatusMap.get(j.id) === "TARGETED").length,
    [pipelineStatusMap]
  );

  const handleSelectRole = useCallback((job) => {
    setDrawerJob(job);
    setDrawerCardId(null);
    setDrawerOpen(true);
  }, []);

  const handleOpenCard = useCallback((card) => {
    setDrawerCardId(card.id);
    setDrawerJob(null);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setDrawerJob(null);
    setDrawerCardId(null);
  }, []);

  const handleAddToPipeline = useCallback((cardData) => {
    pipeline.addCard(cardData);
    // drawerCard useMemo will auto-find the new card and switch to edit mode
  }, [pipeline]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const pstClock = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric", minute: "2-digit",
    hour12: true,
  });

  const tabStyle = (active) => ({
    padding:"9px 20px", borderRadius:7, border:"none", cursor:"pointer",
    fontSize:14, fontWeight:600, fontFamily:"'Inter',sans-serif",
    background: active ? "#0891b2" : "transparent",
    color: active ? "#ffffff" : "#64748b",
    transition:"background .15s, color .15s",
  });

  const iconBtn = {
    padding:"6px 10px", borderRadius:7, border:"1px solid #e2e8f0",
    background:"transparent", cursor:"pointer", fontSize:16, lineHeight:1,
    color:"#64748b", transition:"background .15s",
  };

  return (
    <div style={{ height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column", background:"#f8fafc",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif",
      filter: darkMode ? "invert(1) hue-rotate(180deg)" : "none",
      transition:"filter .25s" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* Top nav */}
      <div style={{ background:"#ffffff", borderBottom:"1px solid #e2e8f0",
        zIndex:30, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", flexShrink:0 }}>
        <div style={{ padding:"10px 24px",
          display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#0f172a",
            fontFamily:"'Inter',sans-serif", letterSpacing:-.3, marginRight:16 }}>
            GSD Portal
          </div>
          <button onClick={() => setTab("board")} style={tabStyle(tab === "board")}>
            Mortgage Prospect Board
            <span style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
              marginLeft:7, opacity:.7 }}>
              {prospectCount}
            </span>
          </button>
          <button onClick={() => setTab("pipeline")} style={tabStyle(tab === "pipeline")}>
            Activity Log
            <span style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
              marginLeft:7, opacity:.7 }}>
              {pipeline.cards.length}
            </span>
          </button>
          <button onClick={() => setTab("non-mortgage")} style={tabStyle(tab === "non-mortgage")}>
            Non-Mortgage
            <span style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
              marginLeft:7, opacity:.7 }}>
              {nonMortgageJobs.length || "—"}
            </span>
          </button>
          {pipeline.cards.filter(c => ["CALLBACK","INTERVIEW","OFFER","COLD_OUTREACH"].includes(c.status)).length > 0 && (
            <span style={{ marginLeft:4, fontSize:12, fontWeight:700, color:"#059669",
              fontFamily:"'IBM Plex Mono',monospace",
              background:"#f0fdf4", border:"1.5px solid #bbf7d0",
              padding:"3px 10px", borderRadius:20 }}>
              {pipeline.cards.filter(c => ["CALLBACK","INTERVIEW","OFFER","COLD_OUTREACH"].includes(c.status)).length} active
            </span>
          )}

          {/* Live PST clock + controls */}
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", flexShrink:0,
              boxShadow:"0 0 0 2px rgba(34,197,94,0.25)",
              animation:"pulse 2s ease-in-out infinite" }}/>
            <span style={{ fontSize:12, fontFamily:"'IBM Plex Mono',monospace", color:"#64748b",
              letterSpacing:.2, whiteSpace:"nowrap" }}>
              {pstClock} PST
            </span>
            <button onClick={() => window.location.reload()} title="Refresh page" style={iconBtn}>
              ↻
            </button>
            <button onClick={toggleDark} title={darkMode ? "Switch to light mode" : "Switch to dark mode"} style={iconBtn}>
              {darkMode ? "☀" : "🌙"}
            </button>
          </div>
          <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 2px rgba(34,197,94,.25)} 50%{box-shadow:0 0 0 5px rgba(34,197,94,.1)} }`}</style>
        </div>
      </div>

      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {tab === "board" && (
          <RolesBoard onSelectRole={handleSelectRole} pipelineStatusMap={pipelineStatusMap} pipelineCards={pipeline.cards} />
        )}
        {tab === "pipeline" && (
          <Pipeline
            cards={pipeline.cards}
            moveCard={pipeline.moveCard}
            deleteCard={pipeline.deleteCard}
            exportData={pipeline.exportData}
            importData={pipeline.importData}
            lastSavedAt={pipeline.lastSavedAt}
            onOpenDrawer={handleOpenCard}
          />
        )}
        {tab === "non-mortgage" && (
          <RolesBoard
            onSelectRole={handleSelectRole}
            pipelineStatusMap={pipelineStatusMap}
            pipelineCards={pipeline.cards}
            boardId="non-mortgage"
            boardTitle="Non-Mortgage Prospect Board"
            jobsList={nonMortgageJobs}
          />
        )}
      </div>

      <WorkflowDrawer
        open={drawerOpen}
        onClose={handleClose}
        role={drawerJob || drawerCard}
        card={drawerCard}
        onAddToPipeline={handleAddToPipeline}
        onUpdateCard={pipeline.updateCard}
        onMoveCard={pipeline.moveCard}
      />
    </div>
  );
}
