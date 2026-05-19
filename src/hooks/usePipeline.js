import { useState, useCallback, useEffect } from "react";
import { SEED_CARDS } from "../data/seed";

const KEY = "gsd_pipeline_v1";
const CLOUD_URL = "/pipeline.json";

function loadLocal() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch {}
  return null;
}
function saveLocal(cards) {
  try { localStorage.setItem(KEY, JSON.stringify(cards)); } catch {}
}

// Cloud adds new cards (by id). Local version of existing cards is preserved
// so user's kanban status moves / notes edits are never overwritten.
function mergeCards(local, cloud) {
  if (!Array.isArray(cloud) || !cloud.length) return local;
  const localIds = new Set(local.map(c => c.id));
  const newCards = cloud.filter(c => !localIds.has(c.id));
  if (!newCards.length) return local;
  return [...newCards, ...local];
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
  const [cards, setCards] = useState(() => loadLocal() ?? SEED_CARDS);
  const [cloudSynced, setCloudSynced] = useState(false);

  const syncFromCloud = useCallback(async () => {
    const cloud = await fetchCloud();
    if (!cloud) return;
    setCards(prev => {
      const merged = mergeCards(prev, cloud);
      if (merged.length !== prev.length) saveLocal(merged);
      return merged;
    });
    setCloudSynced(true);
  }, []);

  // Sync on mount
  useEffect(() => { syncFromCloud(); }, [syncFromCloud]);

  // Re-sync whenever the tab regains focus (catches deploys that happened while away)
  useEffect(() => {
    const onFocus = () => syncFromCloud();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncFromCloud]);

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
      return [{ ...card, id: `card_${Date.now()}` }, ...prev];
    });
  }, [_set]);

  const updateCard = useCallback((id, updates) => {
    _set(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [_set]);

  const moveCard = useCallback((id, status) => {
    _set(prev => prev.map(c => c.id === id ? { ...c, status } : c));
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

  return { cards, addCard, updateCard, moveCard, deleteCard, isDuplicate, exportData, importData, cloudSynced };
}
