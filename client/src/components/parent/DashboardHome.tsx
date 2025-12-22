import { useState, useEffect, useContext } from 'react';
import {
  Baby,
  ClipboardCheck,
  Calendar,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { childAPI } from '../../api';
import { getAgeDisplayString } from '../../utils/ageUtils';
import { AuthContext } from '../../context/AuthContext';

interface DashboardHomeProps {
  onNavigate: (section: string) => void;
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { user } = useContext(AuthContext);
  const [children, setChildren] = useState<any[]>([]);
  const [screeningStats, setScreeningStats] = useState({ totalScreenings: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [childrenResponse, screeningResponse] = await Promise.all([
          childAPI.getChildren(),
          // TODO: Add API call for screening history when implemented
          Promise.resolve({ data: { data: [] } }) // Placeholder for screening history
        ]);

        setChildren(childrenResponse.data.data || []);

        // Calculate screening stats from children data
        let totalScreenings = 0;
        let thisMonthScreenings = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // For now, we'll set basic stats - this will be enhanced when screening history API is available
        setScreeningStats({
          totalScreenings,
          thisMonth: thisMonthScreenings
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setChildren([]);
        setScreeningStats({ totalScreenings: 0, thisMonth: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Mock data removed - will be replaced with real appointment and activity data when implemented
  const upcomingAppointments: any[] = [];
  const recentActivities: any[] = [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 right-10 w-48 h-48 bg-white/10 rounded-full"></div>
        <div className="relative z-10">
          <h2 className="mb-2">Welcome Back, {user?.firstName || 'Parent'}! 👋</h2>
          <p className="text-xl opacity-90 mb-6">Here's what's happening with your children today</p>
          <Button
            onClick={() => onNavigate('children')}
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Child Profile
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-pink-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-pink-600">Children</span>
              <Baby className="w-5 h-5 text-pink-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{loading ? '...' : children.length}</p>
            <p className="text-sm text-gray-600">Profiles created</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-purple-600">Screenings</span>
              <ClipboardCheck className="w-5 h-5 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{screeningStats.thisMonth}</p>
            <p className="text-sm text-gray-600">Completed this month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-orange-600">Appointments</span>
              <Calendar className="w-5 h-5 text-orange-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{upcomingAppointments.length}</p>
            <p className="text-sm text-gray-600">Upcoming this week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-indigo-600">Messages</span>
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">0</p>
            <p className="text-sm text-gray-600">Unread messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Children Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Children Cards */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Baby className="w-5 h-5 text-pink-600" />
                  Your Children
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('children')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading children...</div>
              ) : children.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Baby className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No children profiles yet</p>
                  <Button
                    onClick={() => onNavigate('children')}
                    className="mt-4 bg-pink-600 hover:bg-pink-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Child
                  </Button>
                </div>
              ) : (
                children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onNavigate('children')}
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-xl">
                      {child.firstName[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-pink-600">{child.firstName} {child.lastName}</h3>
                      <p className="text-sm text-gray-600">{getAgeDisplayString(child.dateOfBirth)}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="bg-yellow-500">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending Screening
                      </Badge>
                      <p className="text-xs text-gray-600 mt-1">Not started</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Upcoming Appointments
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('appointments')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex flex-col items-center justify-center text-orange-600">
                    <span className="text-xs">NOV</span>
                    <span>{appointment.date.split('-')[2]}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-orange-600">{appointment.type}</h4>
                    <p className="text-sm text-gray-600">{appointment.provider}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Baby className="w-3 h-3" />
                        {appointment.child}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {appointment.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                onClick={() => onNavigate('screening')}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Start Screening
              </Button>
              <Button
                className="w-full justify-start bg-orange-600 hover:bg-orange-700"
                onClick={() => onNavigate('appointments')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
              <Button
                className="w-full justify-start bg-green-600 hover:bg-green-700"
                onClick={() => onNavigate('education')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Learning Activities
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${activity.completed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.title}</p>
                    <p className="text-xs text-gray-500">
                      {activity.child} • {activity.date}
                    </p>
                  </div>
                  {activity.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tips & Resources */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <AlertCircle className="w-5 h-5" />
                Tip of the Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-3">
                Consistent daily routines can help children with autism feel more secure and reduce anxiety.
              </p>
              <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => onNavigate('education')}>
                Learn more <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
function setScreeningStats(arg0: { totalScreenings: number; thisMonth: number; }) {
  throw new Error('Function not implemented.');
}

