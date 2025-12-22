import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Users, ClipboardList, Calendar, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';

interface ClinicianHomeProps {
  onNavigate: (section: 'home' | 'patients' | 'screenings' | 'appointments' | 'messages') => void;
}

export function ClinicianHome({ onNavigate }: ClinicianHomeProps) {
  const stats = [
    {
      title: 'Active Patients',
      value: '24',
      description: 'Currently under care',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pending Reviews',
      value: '8',
      description: 'Screening results to review',
      icon: ClipboardList,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Today\'s Appointments',
      value: '6',
      description: 'Scheduled for today',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Unread Messages',
      value: '12',
      description: 'From parents and staff',
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const recentActivities = [
    { patient: 'Emma Johnson', action: 'Screening completed', time: '2 hours ago', urgent: false },
    { patient: 'Noah Smith', action: 'Appointment rescheduled', time: '4 hours ago', urgent: false },
    { patient: 'Sophia Davis', action: 'High-risk screening result', time: '6 hours ago', urgent: true },
    { patient: 'Liam Wilson', action: 'New patient intake', time: '1 day ago', urgent: false }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-600 mb-2">Clinician Dashboard</h2>
        <p className="text-gray-600">Welcome back! Here's your overview for today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest patient activities and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {activity.urgent && <AlertCircle className="h-4 w-4 text-red-500" />}
                    <div>
                      <p className="font-medium text-gray-900">{activity.patient}</p>
                      <p className="text-sm text-gray-600">{activity.action}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {activity.time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => onNavigate('patients')}
              >
                <Users className="h-6 w-6 text-blue-600" />
                <span className="text-sm">View Patients</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => onNavigate('screenings')}
              >
                <ClipboardList className="h-6 w-6 text-purple-600" />
                <span className="text-sm">Review Screenings</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => onNavigate('appointments')}
              >
                <Calendar className="h-6 w-6 text-green-600" />
                <span className="text-sm">Manage Appointments</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => onNavigate('messages')}
              >
                <MessageSquare className="h-6 w-6 text-orange-600" />
                <span className="text-sm">Check Messages</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
