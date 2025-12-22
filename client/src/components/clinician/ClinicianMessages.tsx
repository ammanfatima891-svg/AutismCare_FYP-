import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MessageSquare, Send, User, Clock, AlertCircle } from 'lucide-react';

interface Message {
  id: number;
  from: string;
  fromRole: 'parent' | 'therapist' | 'admin';
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
  patientName?: string;
}

const mockMessages: Message[] = [
  {
    id: 1,
    from: 'Sarah Johnson',
    fromRole: 'parent',
    subject: 'Concern about Emma\'s progress',
    content: 'Hi Dr. Smith, I wanted to discuss Emma\'s recent therapy sessions. She seems more withdrawn lately and I\'m worried about her progress.',
    timestamp: '2024-01-20T10:30:00Z',
    read: false,
    urgent: true,
    patientName: 'Emma Johnson'
  },
  {
    id: 2,
    from: 'Dr. Michael Chen',
    fromRole: 'therapist',
    subject: 'Weekly progress report - Noah Smith',
    content: 'Noah has shown significant improvement in his communication skills this week. Please review the attached assessment.',
    timestamp: '2024-01-19T14:15:00Z',
    read: true,
    urgent: false,
    patientName: 'Noah Smith'
  },
  {
    id: 3,
    from: 'Admin Office',
    fromRole: 'admin',
    subject: 'Updated clinic policies',
    content: 'Please review the updated clinic policies regarding patient confidentiality and emergency procedures.',
    timestamp: '2024-01-18T09:00:00Z',
    read: true,
    urgent: false
  },
  {
    id: 4,
    from: 'Lisa Wilson',
    fromRole: 'parent',
    subject: 'Appointment rescheduling request',
    content: 'Hi, I need to reschedule Sophia\'s appointment for next week due to a family emergency.',
    timestamp: '2024-01-17T16:45:00Z',
    read: false,
    urgent: false,
    patientName: 'Sophia Wilson'
  }
];

export function ClinicianMessages() {
  const [selectedTab, setSelectedTab] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [newMessage, setNewMessage] = useState({ to: '', subject: '', content: '' });

  const unreadCount = mockMessages.filter(m => !m.read).length;
  const urgentCount = mockMessages.filter(m => m.urgent).length;

  const filteredMessages = mockMessages.filter(message => {
    if (selectedTab === 'inbox') return true;
    if (selectedTab === 'unread') return !message.read;
    if (selectedTab === 'urgent') return message.urgent;
    return true;
  });

  const handleSendReply = () => {
    if (!replyContent.trim()) return;
    // Handle sending reply
    console.log('Sending reply:', replyContent);
    setReplyContent('');
  };

  const handleSendNewMessage = () => {
    if (!newMessage.to || !newMessage.subject || !newMessage.content) return;
    // Handle sending new message
    console.log('Sending new message:', newMessage);
    setNewMessage({ to: '', subject: '', content: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-600 mb-2">Messages</h2>
        <p className="text-gray-600">Communicate with parents, therapists, and staff</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="inbox">Inbox ({mockMessages.length})</TabsTrigger>
                  <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
                  <TabsTrigger value="urgent">Urgent ({urgentCount})</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                      selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                    } ${!message.read ? 'bg-blue-25' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {message.from.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${!message.read ? 'font-bold' : ''}`}>
                            {message.from}
                          </span>
                          {message.urgent && <AlertCircle className="h-3 w-3 text-red-500" />}
                          {!message.read && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                        </div>
                        <p className={`text-sm truncate ${!message.read ? 'font-medium' : 'text-gray-600'}`}>
                          {message.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {message.fromRole}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Content */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <span>From: {selectedMessage.from}</span>
                      <Badge variant="outline">{selectedMessage.fromRole}</Badge>
                      {selectedMessage.patientName && (
                        <>
                          <span>•</span>
                          <span>Patient: {selectedMessage.patientName}</span>
                        </>
                      )}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(selectedMessage.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  {selectedMessage.urgent && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Urgent
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>

                {/* Reply Section */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Reply</h4>
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={handleSendReply} className="bg-blue-600 hover:bg-blue-700">
                    <Send className="h-4 w-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a message</h3>
                <p className="text-gray-500 text-center">
                  Choose a message from the list to view its contents and reply.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Message Button */}
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <MessageSquare className="h-4 w-4 mr-2" />
          Compose New Message
        </Button>
      </div>
    </div>
  );
}
