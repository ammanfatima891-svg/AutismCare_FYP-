import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  Search,
  ArrowLeft,
  Activity,
  ClipboardList,
  Home,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { messagingAPI } from '../../api';
import { toast } from 'sonner';
import { cn } from '../ui/utils';

type ApiConversation = {
  _id: string;
  caseId?: string;
  parentName?: string;
  childName?: string;
  preview?: string;
  previewAt?: string;
  lastMessageAt?: string;
  therapistId?: string;
};

type ApiMessage = {
  _id: string;
  conversationId?: string;
  senderId: string;
  text: string;
  createdAt: string;
};

const quickTemplates = [
  {
    label: 'Session Feedback',
    icon: <ClipboardList className="h-4 w-4" />,
    text: "Today's session went well. Here are the key observations and activities we covered...",
  },
  {
    label: 'Home Activity',
    icon: <Home className="h-4 w-4" />,
    text: 'Here is a home activity to practice this week:\n\nActivity: \nDuration: 10-15 minutes\nFrequency: Daily\nInstructions: ',
  },
  {
    label: 'Progress Update',
    icon: <Activity className="h-4 w-4" />,
    text: "I wanted to share an update on your child's progress. Over the past week, we've seen improvements in...",
  },
];

function formatListTime(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function TherapistMessages() {
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ApiConversation | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(async () => {
    try {
      setListError(null);
      const { data: body } = await messagingAPI.listConversations();
      const raw = body?.data;
      const list = Array.isArray(raw) ? raw : [];
      setConversations(list as ApiConversation[]);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setListError(ax.response?.data?.message || 'Could not load conversations');
      setConversations([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const id = window.setInterval(() => void loadConversations(), 60000);
    return () => window.clearInterval(id);
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const { data: body } = await messagingAPI.listMessages(conversationId);
      const raw = body?.data;
      setMessages(Array.isArray(raw) ? (raw as ApiMessage[]) : []);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setMessagesError(ax.response?.data?.message || 'Could not load messages');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected?._id) {
      setMessages([]);
      return;
    }
    void loadMessages(selected._id);
    const id = window.setInterval(() => void loadMessages(selected._id), 20000);
    return () => window.clearInterval(id);
  }, [selected?._id, loadMessages]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const hay = `${c.parentName || ''} ${c.childName || ''} ${c.preview || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, searchQuery]);

  const handleSelectConversation = (conv: ApiConversation) => {
    setSelected(conv);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    setMobileShowChat(false);
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !selected?._id) return;
    try {
      setSending(true);
      await messagingAPI.sendMessage({ conversationId: selected._id, text });
      setMessageText('');
      await loadMessages(selected._id);
      await loadConversations();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTemplate = (text: string) => {
    setMessageText(text);
  };

  const isTherapistSender = (msg: ApiMessage) => {
    if (!selected?.therapistId) return false;
    return String(msg.senderId) === String(selected.therapistId);
  };

  const ConversationList = () => (
    <div
      className={cn(
        'flex w-full flex-col border-r border-slate-200 bg-white lg:w-[340px]',
        mobileShowChat ? 'hidden lg:flex' : 'flex'
      )}
    >
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-sky-400/40">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm leading-normal text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {listLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          </div>
        ) : listError ? (
          <p className="px-4 py-6 text-sm text-red-700">{listError}</p>
        ) : filteredConversations.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            {conversations.length === 0
              ? 'No message threads yet. Threads appear when you have an active case with a parent.'
              : 'No matches.'}
          </p>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = selected?._id === conv._id;
            const lastAt = conv.previewAt || conv.lastMessageAt;
            return (
              <button
                key={conv._id}
                type="button"
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  'w-full border-b border-slate-50 p-4 text-left transition-colors',
                  isActive ? 'bg-sky-50' : 'hover:bg-slate-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      isActive ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-700'
                    )}
                  >
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate text-sm font-semibold text-slate-900">{conv.parentName || 'Parent'}</h4>
                      <span className="shrink-0 text-xs text-slate-400">{formatListTime(lastAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500">Re: {conv.childName || 'Child'}</p>
                    <p className="mt-1 truncate text-sm text-slate-600">{conv.preview || '—'}</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const ChatArea = () => {
    if (!selected) {
      return (
        <div className="hidden min-h-[400px] flex-1 items-center justify-center bg-slate-50/50 lg:flex">
          <div className="space-y-3 text-center text-slate-400">
            <MessageSquare className="mx-auto h-16 w-16 opacity-30" />
            <p className="text-lg font-medium text-slate-500">Select a conversation</p>
            <p className="text-sm">Choose a parent thread from the list to view and send messages</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'flex min-h-[400px] flex-1 flex-col bg-slate-50/30 lg:min-h-[600px]',
          !mobileShowChat ? 'hidden lg:flex' : 'flex'
        )}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white p-4">
          <button type="button" onClick={handleBack} className="rounded-md p-1 hover:bg-slate-100 lg:hidden">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
            <User className="h-5 w-5 text-sky-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-slate-900">{selected.parentName || 'Parent'}</h4>
            <p className="truncate text-xs text-slate-500">Re: {selected.childName || 'Child'}</p>
          </div>
          {selected.caseId ? (
            <Link
              to={`/therapist/case/${selected.caseId}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-50"
            >
              Case <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messagesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
            </div>
          ) : messagesError ? (
            <p className="text-sm text-red-700">{messagesError}</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-slate-500">No messages yet. Say hello below.</p>
          ) : (
            messages.map((msg) => {
              const isTherapist = isTherapistSender(msg);
              return (
                <motion.div
                  key={msg._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', isTherapist ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-3',
                      isTherapist
                        ? 'rounded-br-md bg-sky-600 text-white'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm'
                    )}
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text}</p>
                    <div
                      className={cn(
                        'mt-2 flex items-center gap-1.5',
                        isTherapist ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <Clock className={cn('h-3 w-3', isTherapist ? 'text-sky-200' : 'text-slate-400')} />
                      <span className={cn('text-[10px]', isTherapist ? 'text-sky-200' : 'text-slate-400')}>
                        {formatMsgTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickTemplates.map((tpl) => (
              <Button
                key={tpl.label}
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-sky-200 text-xs text-sky-800 hover:bg-sky-50"
                onClick={() => handleTemplate(tpl.text)}
              >
                {tpl.icon}
                <span className="ml-1">{tpl.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                rows={2}
                disabled={sending}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={!messageText.trim() || sending}
              className="h-11 w-11 shrink-0 rounded-xl bg-sky-600 p-0 hover:bg-sky-700"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div className="mx-auto max-w-7xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-sky-800">
          <MessageSquare className="h-6 w-6" />
          Messages
        </h2>
        <p className="mt-1 text-sm text-slate-600">Secure messaging with parents for your assigned cases</p>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-3">
          <CardTitle className="text-base font-medium text-slate-800">Inbox</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex min-h-[min(600px,calc(100vh-14rem))]">
            <ConversationList />
            <ChatArea />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
