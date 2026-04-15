import React from 'react';
import { CaseMessagingInbox } from '../messaging/CaseMessagingInbox';

type TherapistMessagesProps = {
  initialConversationId?: string | null;
  onInitialConversationHandled?: () => void;
};

export function TherapistMessages({
  initialConversationId,
  onInitialConversationHandled,
}: TherapistMessagesProps) {
  return (
    <CaseMessagingInbox
      variant="therapist"
      title="Messages"
      subtitle="Secure messaging with parents for your assigned cases"
      showTemplates
      caseHref={(id) => `/therapist/case/${id}`}
      initialConversationId={initialConversationId}
      onInitialConversationHandled={onInitialConversationHandled}
    />
  );
}
