import { CaseMessagingInbox } from '../messaging/CaseMessagingInbox';

type ParentMessagesProps = {
  initialConversationId?: string | null;
  onInitialConversationHandled?: () => void;
};

export function ParentMessages({
  initialConversationId,
  onInitialConversationHandled,
}: ParentMessagesProps) {
  return (
    <CaseMessagingInbox
      variant="parent"
      title="Messages"
      subtitle="Message your child's therapist on active cases (same threads as Child Case)"
      caseHref={(id) => `/parent/case/${id}`}
      initialConversationId={initialConversationId}
      onInitialConversationHandled={onInitialConversationHandled}
    />
  );
}
