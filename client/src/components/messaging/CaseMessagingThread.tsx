import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { MessageSquare, Send, Loader2, Clock } from 'lucide-react';
import { messagingAPI } from '../../api';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import { AuthContext } from '../../context/AuthContext';
import { parseJwtSubjectId } from '../../utils/jwtSubject';

type ApiMessage = {
  _id: string;
  senderId: string | { _id: string };
  text: string;
  createdAt: string;
};

type ConvPayload = {
  _id: string;
  parentId?: string;
  therapistId?: string;
};

function senderIdStr(msg: ApiMessage): string {
  const s = msg.senderId as unknown;
  if (s && typeof s === 'object' && '_id' in (s as object)) {
    return String((s as { _id: string })._id);
  }
  return String(s);
}

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

type Props = {
  caseId: string;
  childLabel?: string;
};

/**
 * Single-case messaging strip for parents (e.g. Child Case page). Uses the same API as the full inbox.
 */
export function CaseMessagingThread({ caseId, childLabel }: Props) {
  const { user } = useContext(AuthContext);
  const parentUserId = useMemo(() => parseJwtSubjectId(user?.token), [user?.token]);

  const [conv, setConv] = useState<ConvPayload | null>(null);
  const [convError, setConvError] = useState<string | null>(null);
  const [convLoading, setConvLoading] = useState(true);

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversation = useCallback(async () => {
    if (!caseId) return;
    setConvLoading(true);
    setConvError(null);
    try {
      const { data: body } = await messagingAPI.getOrCreateConversation(caseId);
      const data = body?.data as ConvPayload | undefined;
      if (data?._id) {
        setConv(data);
      } else {
        setConv(null);
        setConvError('Could not open this conversation.');
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setConv(null);
      setConvError(ax.response?.data?.message || 'Could not open messaging for this case.');
    } finally {
      setConvLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const { data: body } = await messagingAPI.listMessages(conversationId);
      const raw = body?.data;
      setMessages(Array.isArray(raw) ? (raw as ApiMessage[]) : []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!conv?._id) {
      setMessages([]);
      return;
    }
    void loadMessages(conv._id);
    const id = window.setInterval(() => void loadMessages(conv._id), 20000);
    return () => window.clearInterval(id);
  }, [conv?._id, loadMessages]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !conv?._id) return;
    try {
      setSending(true);
      await messagingAPI.sendMessage({ conversationId: conv._id, text });
      setMessageText('');
      await loadMessages(conv._id);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const isMine = (msg: ApiMessage) =>
    parentUserId != null && senderIdStr(msg) === parentUserId;

  return (
    <Card className="border-blue-100 bg-card shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Messages to your therapist</CardTitle>
        </div>
        <CardDescription>
          {childLabel
            ? `Private thread for ${childLabel}. Your clinician may also follow this case.`
            : 'Private thread for this case. Your clinician may also follow this case.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {convLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading conversation…
          </div>
        ) : convError ? (
          <p className="text-sm text-muted-foreground" role="status">
            {convError}
          </p>
        ) : !conv ? (
          <p className="text-sm text-muted-foreground">Messaging is unavailable right now.</p>
        ) : (
          <>
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border bg-background/40 p-3">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No messages yet — say hello below.</p>
              ) : (
                messages.map((msg) => {
                  const mine = isMine(msg);
                  return (
                    <div key={msg._id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                          mine
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md border bg-card text-foreground'
                        )}
                      >
                        <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                        <div className={cn('mt-1 flex items-center gap-1', mine ? 'justify-end' : 'justify-start')}>
                          <Clock className={cn('h-3 w-3', mine ? 'text-primary-foreground/80' : 'text-muted-foreground')} />
                          <span className={cn('text-[10px]', mine ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                            {formatMsgTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write a message…"
                rows={2}
                disabled={sending}
                className="input h-auto min-h-[44px] flex-1 resize-none px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={!messageText.trim() || sending}
                onClick={() => void handleSend()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
