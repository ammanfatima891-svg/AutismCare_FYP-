import type { NavigateFunction } from 'react-router-dom';

/** Matches server `NOTIFICATION_TYPES.CASE_MESSAGE` */
export const CASE_MESSAGE_NOTIFICATION_TYPE = 'case_message';

export function getCaseMessageConversationId(n: {
  type?: string;
  relatedResourceId?: unknown;
}): string | null {
  if (String(n.type) !== CASE_MESSAGE_NOTIFICATION_TYPE) return null;
  if (n.relatedResourceId == null || n.relatedResourceId === '') return null;
  return String(n.relatedResourceId);
}

/**
 * Jump to the role dashboard Messages tab with a thread pre-selected (conversation Mongo id).
 */
export function navigateToCaseMessageInbox(
  navigate: NavigateFunction,
  role: string | undefined,
  conversationId: string
): void {
  const r = String(role || '').toLowerCase();
  const state = { section: 'messages', openConversationId: conversationId };
  if (r === 'parent') navigate('/parent-dashboard', { state });
  else if (r === 'therapist') navigate('/therapist-dashboard', { state });
  else if (r === 'clinician') navigate('/clinician-dashboard', { state });
}
