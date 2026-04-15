import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  MessageSquare, 
  Send, 
  Bell, 
  Calendar, 
  ClipboardCheck,
  User,
  Paperclip
} from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export function CommunicationSection() {
  const [newMessage, setNewMessage] = useState('');
  const [selectedThread, setSelectedThread] = useState<number | null>(1);

  const threads = [
    {
      id: 1,
      provider: 'Dr. Sarah Johnson',
      role: 'Speech Therapist',
      child: 'Emma',
      lastMessage: 'Great progress this week!',
      time: '2 hours ago',
      unread: 2,
      avatar: 'SJ',
    },
    {
      id: 2,
      provider: 'Alex Martinez',
      role: 'Occupational Therapist',
      child: 'Emma',
      lastMessage: 'Please practice the exercises we discussed',
      time: '1 day ago',
      unread: 0,
      avatar: 'AM',
    },
    {
      id: 3,
      provider: 'Dr. Emily Chen',
      role: 'Developmental Pediatrician',
      child: 'Noah',
      lastMessage: 'Assessment results are ready',
      time: '2 days ago',
      unread: 1,
      avatar: 'EC',
    },
  ];

  const messages = [
    {
      id: 1,
      sender: 'Dr. Sarah Johnson',
      text: 'Hi! I wanted to update you on Emma\'s progress this week. She\'s doing wonderfully with the new communication exercises.',
      time: '10:30 AM',
      isProvider: true,
    },
    {
      id: 2,
      sender: 'You',
      text: 'That\'s great to hear! We\'ve been practicing at home too. She seems more engaged.',
      time: '11:15 AM',
      isProvider: false,
    },
    {
      id: 3,
      sender: 'Dr. Sarah Johnson',
      text: 'Excellent! Keep up the home practice. I\'ve attached some new activities for you to try this week.',
      time: '11:20 AM',
      isProvider: true,
    },
    {
      id: 4,
      sender: 'Dr. Sarah Johnson',
      text: 'Great progress this week!',
      time: '2 hours ago',
      isProvider: true,
    },
  ];

  const notifications = [
    {
      id: 1,
      type: 'appointment',
      icon: Calendar,
      title: 'Appointment Reminder',
      message: 'Emma has a Speech Therapy session tomorrow at 10:00 AM',
      time: '1 hour ago',
      color: 'orange',
      unread: true,
    },
    {
      id: 2,
      type: 'screening',
      icon: ClipboardCheck,
      title: 'Screening Complete',
      message: 'M-CHAT-R results are available for Emma',
      time: '3 hours ago',
      color: 'purple',
      unread: true,
    },
    {
      id: 3,
      type: 'message',
      icon: MessageSquare,
      title: 'New Message',
      message: 'Dr. Sarah Johnson sent you a message',
      time: '5 hours ago',
      color: 'blue',
      unread: false,
    },
    {
      id: 4,
      type: 'appointment',
      icon: Calendar,
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Emily Chen has been confirmed',
      time: '1 day ago',
      color: 'green',
      unread: false,
    },
  ];

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // Send message logic here
    setNewMessage('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="mb-2 text-foreground">Messages & Notifications</h2>
        <p className="text-muted-foreground">Stay connected with your care team</p>
      </div>

      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages">
            Messages
            {threads.reduce((sum, t) => sum + t.unread, 0) > 0 && (
              <Badge className="ml-2 bg-destructive">
                {threads.reduce((sum, t) => sum + t.unread, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {notifications.filter(n => n.unread).length > 0 && (
              <Badge className="ml-2 bg-destructive">
                {notifications.filter(n => n.unread).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
            {/* Threads List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-blue-600">Conversations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread.id)}
                      className={`p-4 border-b border cursor-pointer transition-colors ${
                        selectedThread === thread.id
                          ? 'bg-blue-50 border-l-4 border-l-blue-600'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-blue-600 text-white">
                            {thread.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-blue-600 truncate">{thread.provider}</h4>
                            {thread.unread > 0 && (
                              <Badge className="bg-destructive w-5 h-5 p-0 flex items-center justify-center">
                                {thread.unread}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{thread.role}</p>
                          <p className="text-sm text-foreground truncate">{thread.lastMessage}</p>
                          <p className="text-xs text-muted-foreground mt-1">{thread.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Messages Area */}
            <Card className="md:col-span-2 flex flex-col">
              {selectedThread ? (
                <>
                  <CardHeader className="border-b">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {threads.find(t => t.id === selectedThread)?.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-blue-600">
                          {threads.find(t => t.id === selectedThread)?.provider}
                        </CardTitle>
                        <CardDescription>
                          {threads.find(t => t.id === selectedThread)?.role} - Treating{' '}
                          {threads.find(t => t.id === selectedThread)?.child}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 p-4">
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isProvider ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.isProvider
                                  ? 'bg-muted text-foreground'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              <p className="text-sm mb-1">{message.text}</p>
                              <p
                                className={`text-xs ${
                                  message.isProvider ? 'text-muted-foreground' : 'text-blue-100'
                                }`}
                              >
                                {message.time}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button
                        onClick={handleSendMessage}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                All Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                      notification.unread
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-card border hover:bg-muted'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full bg-${notification.color}-100 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 text-${notification.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-foreground mb-1">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                    </div>
                    {notification.unread && (
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
