import { useState, useCallback, useEffect } from "react";
import { SEED_CARDS } from "../data/seed";

const KEY       = "gsd_pipeline_v1";
const SAVED_KEY = "gsd_pipeline_savedAt_v1";
const CLOUD_URL = "/pipeline.json";

export const QUEUE_CAP = 20;

const TIER_WEIGHT = { "A+": 0, A: 1, B: 2, C: 3 };

// Top QUEUE_CAP cards by weight → TARGETED. Rest → PROSPECT. IN_PROGRESS untouched.
function rebalanceQueue(cards) {
  const preApply = cards.filter(c => c.status === "TARGETED" || c.status === "PROSPECT");
  const rest     = cards.filter(c => c.status !== "TARGETED" && c.status !== "PROSPECT");
  const sorted   = [...preApply].sort((a, b) => {
    const ta = TIER_WEIGHT[a.tier] ?? 9, tb = TIER_WEIGHT[b.tier] ?? 9;
    if (ta !== tb) return ta - tb;
    const ra = (a.location||"").toLowerCase().includes("remote") ? 0 : 1;
    const rb = (b.location||"").toLowerCase().includes("remote") ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (a.dateAdded||"").localeCompare(b.dateAdded||"");
  });
  const rebalanced = sorted.map((c, idx) => ({ ...c, status: idx < QUEUE_CAP ? "TARGETED" : "PROSPECT" }));
  return [...rest, ...rebalanced];
}

function loadLocal() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch {}
  return null;
}
function saveLocal(cards) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards));
    localStorage.setItem(SAVED_KEY, String(Date.now()));
  } catch {}
}
export function getLastSavedAt() {
  try { const v = localStorage.getItem(SAVED_KEY); return v ? Number(v) : null; } catch { return null; }
}

// Cloud is source of truth (pipeline.json is always an explicit export).
// Existing cards take their state from cloud; locally-added cards not yet
// exported are appended so no in-session work is lost.
function mergeCards(local, cloud) {
  if (!Array.isArray(cloud) || !cloud.length) return local;
  const cloudIds = new Set(cloud.map(c => c.id));
  const localOnly = local.filter(c => !cloudIds.has(c.id));
  return [...cloud, ...localOnly];
}

async function fetchCloud() {
  try {
    const res = await fetch(`${CLOUD_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function usePipeline() {
  const [cards, setCards] = useState(() => rebalanceQueue(loadLocal() ?? SEED_CARDS));
  const [cloudSynced, setCloudSynced] = useState(false);

  const syncFromCloud = useCallback(async () => {
    const cloud = await fetchCloud();
    if (!cloud) return;
    setCards(prev => {
      const merged     = mergeCards(prev, cloud);
      const rebalanced = rebalanceQueue(merged);
      saveLocal(rebalanced); // always persist so next reload reflects cloud
      return rebalanced;
    });
    setCloudSynced(true);
  }, []);

  // Sync on mount
  useEffect(() => { syncFromCloud(); }, [syncFromCloud]);


  const _set = useCallback((fn) => {
    setCards(prev => { const next = fn(prev); saveLocal(next); return next; });
  }, []);

  const addCard = useCallback((card) => {
    _set(prev => {
      const dupe = prev.some(c =>
        c.company.toLowerCase() === card.company.toLowerCase() &&
        c.title.toLowerCase() === card.title.toLowerCase()
      );
      if (dupe) return prev;
      return rebalanceQueue([{ ...card, id: `card_${Date.now()}` }, ...prev]);
    });
  }, [_set]);

  const updateCard = useCallback((id, updates) => {
    _set(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [_set]);

  const moveCard = useCallback((id, status) => {
    _set(prev => rebalanceQueue(prev.map(c => c.id === id ? { ...c, status } : c)));
  }, [_set]);

  const deleteCard = useCallback((id) => {
    _set(prev => prev.filter(c => c.id !== id));
  }, [_set]);

  const isDuplicate = useCallback((company, title) =>
    cards.some(c =>
      c.company.toLowerCase() === company.toLowerCase() &&
      c.title.toLowerCase() === title.toLowerCase()
    ), [cards]);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gsd-pipeline-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [cards]);

  const importData = useCallback((data) => {
    if (Array.isArray(data)) { saveLocal(data); setCards(data); return true; }
    return false;
  }, []);

  const lastSavedAt = getLastSavedAt();

  return { cards, addCard, updateCard, moveCard, deleteCard, isDuplicate, exportData, importData, cloudSynced, lastSavedAt };
}
