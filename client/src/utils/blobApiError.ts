/**
 * When axios uses responseType: 'blob', error bodies are often a JSON Blob — parse for a user-facing message.
 */
export async function messageFromAxiosBlobError(error: unknown): Promise<string> {
  const ax = error as {
    response?: { data?: unknown; status?: number };
    message?: string;
  };
  const data = ax.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      if (data.type?.includes('json') || text.trim().startsWith('{')) {
        const j = JSON.parse(text) as { message?: string };
        if (typeof j.message === 'string' && j.message.trim()) return j.message.trim();
      }
      const t = text.trim().slice(0, 240);
      if (t) return t;
    } catch {
      /* fall through */
    }
  }
  if (data != null && typeof data === 'object' && 'message' in data) {
    const m = (data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  if (typeof ax.message === 'string' && ax.message.trim()) return ax.message.trim();
  return 'Something went wrong. Please try again.';
}
