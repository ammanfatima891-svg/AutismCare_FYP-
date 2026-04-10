/**
 * Single source of truth for parsing session childResponse into a 0–100 score (clinician analytics + validation).
 */

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseResponseScore(raw) {
  if (raw == null) return null;
  const input = String(raw).trim();
  if (!input) return null;

  /** Explicit 1–5 scale (new sessions); avoids clashing with legacy plain "5" → 50% mapping. */
  const scaleMatch = input.match(/^scale\s*:\s*([1-5])$/i);
  if (scaleMatch) {
    const n = Number(scaleMatch[1]);
    return Math.round((n / 5) * 100);
  }

  const numberMatch = input.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const n = Number(numberMatch[1]);
    if (!Number.isNaN(n)) {
      if (input.includes('%')) return Math.max(0, Math.min(100, n));
      if (n <= 10) return Math.max(0, Math.min(100, n * 10));
      return Math.max(0, Math.min(100, n));
    }
  }

  const value = normalizeText(input);
  if (value.includes('excellent')) return 90;
  if (value.includes('very good')) return 85;
  if (value.includes('good') || value.includes('positive')) return 75;
  if (value.includes('moderate') || value.includes('fair')) return 55;
  if (value.includes('poor') || value.includes('low') || value.includes('negative')) return 30;
  return null;
}

/** Explicit 1–5 scale from `scale:N` session logs; otherwise null (caller may fall back to parseResponseScore). */
function parseScale1to5(raw) {
  if (raw == null) return null;
  const input = String(raw).trim();
  if (!input) return null;
  const scaleMatch = input.match(/^scale\s*:\s*([1-5])$/i);
  return scaleMatch ? Number(scaleMatch[1]) : null;
}

module.exports = { parseResponseScore, parseScale1to5, normalizeText };
