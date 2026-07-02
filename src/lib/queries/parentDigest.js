import { useCallback, useEffect, useState } from 'react';

const CACHE_KEY_PREFIX = 'mw_parent_digest_v1_';
const STALE_DAYS = 7;

function cacheKey(childId) {
  return `${CACHE_KEY_PREFIX}${childId}`;
}

function readCache(childId) {
  try {
    const raw = localStorage.getItem(cacheKey(childId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ageDays = (Date.now() - parsed.generatedAt) / 86400000;
    if (ageDays > STALE_DAYS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(childId, digest, dinnerCards) {
  try {
    localStorage.setItem(cacheKey(childId), JSON.stringify({ digest, dinnerCards, generatedAt: Date.now() }));
  } catch {
    // localStorage unavailable — just regenerates next visit, not fatal
  }
}

// Weekly AI Parent Digest (blueprint 3.6/4.3) — no cron, generated on
// portal visit if the cached one is stale (>7 days), same on-demand
// pattern as the Story Engine. Cached client-side (no new Supabase table
// — this is ephemeral, regenerable content, not something that needs to
// survive across devices/browsers).
export function useParentDigest(childId, summary) {
  const [digest, setDigest] = useState(null);
  const [dinnerCards, setDinnerCards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async () => {
    if (!childId || !summary) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/parent-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary),
      });
      if (!response.ok) throw new Error(`parent-digest returned ${response.status}`);
      const data = await response.json();
      setDigest(data.digest);
      setDinnerCards(data.dinnerCards);
      writeCache(childId, data.digest, data.dinnerCards);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [childId, summary]);

  useEffect(() => {
    if (!childId) return;
    const cached = readCache(childId);
    if (cached) {
      setDigest(cached.digest);
      setDinnerCards(cached.dinnerCards);
    } else {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  return { digest, dinnerCards, loading, error, regenerate: generate };
}
