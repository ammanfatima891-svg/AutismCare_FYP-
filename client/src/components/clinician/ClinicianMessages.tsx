import { CaseMessagingInbox } from '../messaging/CaseMessagingInbox';

type ClinicianMessagesProps = {
  initialConversationId?: string | null;
  onInitialConversationHandled?: () => void;
};

export function ClinicianMessages({
  initialConversationId,
  onInitialConversationHandled,
}: ClinicianMessagesProps) {
  return (
    <CaseMessagingInbox
      variant="clinician"
      title="Messages"
      subtitle="Case-scoped threads for families you coordinate (parent, therapist, and you)"
      initialConversationId={initialConversationId}
      onInitialConversationHandled={onInitialConversationHandled}
    />
  );
}
