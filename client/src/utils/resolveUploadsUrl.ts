/**
 * Open uploaded files using the API origin. Relative `/uploads/...` paths must not use the SPA host
 * (e.g. Vite preview on :4173), which does not serve Express static uploads.
 */
export function resolveUploadsHref(url: string | undefined | null): string {
  if (url == null || String(url).trim() === '') return '';
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  const raw = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').trim();
  const base = raw.replace(/\/api\/?$/i, '') || 'http://localhost:4000';
  return `${base}${u.startsWith('/') ? u : `/${u}`}`;
}
