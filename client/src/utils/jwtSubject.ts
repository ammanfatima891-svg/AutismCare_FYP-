/**
 * Read `id` from JWT payload (client-only, for UI alignment). Auth remains server-verified on each request.
 */
export function parseJwtSubjectId(token: string | null | undefined): string | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  try {
    const payload = token.split('.')[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(padded)) as { id?: string; userId?: string; _id?: string };
    const id = json.id ?? json.userId ?? json._id;
    return id != null && id !== '' ? String(id) : null;
  } catch {
    return null;
  }
}
