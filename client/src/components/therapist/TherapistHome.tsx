import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Users, 
  Calendar, 
  ClipboardCheck, 
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

interface TherapistHomeProps {
  onNavigate: (section: string) => void;
}

const progressData = [
  { month: 'Jan', sessions: 45, completed: 42 },
  { month: 'Feb', sessions: 48, completed: 46 },
  { month: 'Mar', sessions: 52, completed: 50 },
  { month: 'Apr', sessions: 50, completed: 48 },
  { month: 'May', sessions: 55, completed: 53 },
  { month: 'Jun', sessions: 58, completed: 56 },
];

export function TherapistHome({ onNavigate }: TherapistHomeProps) {
  const assignedClients = [
    {
      id: 1,
      name: 'Emma Johnson',
      age: 4,
      therapyType: 'Speech Therapy',
      progress: 75,
      sessionsCompleted: 12,
      totalSessions: 15,
      nextSession: '2024-11-05',
    },
    {
      id: 2,
      name: 'Noah Smith',
      age: 3,
      therapyType: 'Occupational Therapy',
      progress: 60,
      sessionsCompleted: 8,
      totalSessions: 12,
      nextSession: '2024-11-06',
    },
    {
      id: 3,
      name: 'Liam Davis',
      age: 5,
      therapyType: 'Speech Therapy',
      progress: 85,
      sessionsCompleted: 17,
      totalSessions: 20,
      nextSession: '2024-11-07',
    },
  ];

  const upcomingSessions = [
    {
      id: 1,
      client: 'Emma Johnson',
      type: 'Speech Therapy',
      time: '10:00 AM',
      date: '2024-11-05',
      duration: '45 min',
    },
    {
      id: 2,
      client: 'Liam Davis',
      type: 'Speech Therapy',
      time: '2:00 PM',
      date: '2024-11-05',
      duration: '60 min',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-green-600 mb-2">Welcome Back, Dr. Johnson</h2>
        <p className="text-gray-600">Here's your therapy overview for today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-green-600">Active Clients</span>
              <Users className="w-5 h-5 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{assignedClients.length}</p>
            <p className="text-sm text-gray-600">Assigned to you</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-orange-600">Today's Sessions</span>
              <Calendar className="w-5 h-5 text-orange-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{upcomingSessions.length}</p>
            <p className="text-sm text-gray-600">Scheduled</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-blue-600">This Week</span>
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">12</p>
            <p className="text-sm text-gray-600">Sessions completed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-purple-600">Reports Pending</span>
              <FileText className="w-5 h-5 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">3</p>
            <p className="text-sm text-gray-600">Need completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Clients & Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Clients */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  My Clients
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('clients')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignedClients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-400 flex items-center justify-center text-white text-xl">
                        {client.name[0]}
                      </div>
                      <div>
                        <h4 className="text-green-600">{client.name}</h4>
                        <p className="text-sm text-gray-600">
                          {client.age} years • {client.therapyType}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-600">Active</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="text-gray-900">
                        {client.sessionsCompleted}/{client.totalSessions} sessions
                      </span>
                    </div>
                    <Progress value={client.progress} className="h-2" />
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Next session: {new Date(client.nextSession).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Session Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Session Activity
              </CardTitle>
              <CardDescription>Monthly session tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-orange-600">{session.time}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {session.duration}
                    </Badge>
                  </div>
                  <h4 className="text-gray-900 mb-1">{session.client}</h4>
                  <p className="text-sm text-gray-600">{session.type}</p>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate('sessions')}
              >
                View Full Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start bg-green-600 hover:bg-green-700"
                onClick={() => onNavigate('plans')}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Create Therapy Plan
              </Button>
              <Button
                className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                onClick={() => onNavigate('sessions')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Submit Session Report
              </Button>
              <Button
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                onClick={() => onNavigate('clients')}
              >
                <Users className="w-4 h-4 mr-2" />
                Assign Activities
              </Button>
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-900">Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-yellow-900">3 session reports to complete</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-yellow-900">2 therapy plans to review</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-yellow-900">1 parent message to respond</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
