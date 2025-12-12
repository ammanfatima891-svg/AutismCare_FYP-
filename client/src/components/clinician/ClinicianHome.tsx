import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Users, 
  ClipboardCheck, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  FileText,
  ArrowRight,
  Clock,
  Activity
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface ClinicianHomeProps {
  onNavigate: (section: string) => void;
}

const screeningData = [
  { month: 'Jan', screenings: 12, highRisk: 2 },
  { month: 'Feb', screenings: 15, highRisk: 3 },
  { month: 'Mar', screenings: 18, highRisk: 4 },
  { month: 'Apr', screenings: 14, highRisk: 2 },
  { month: 'May', screenings: 20, highRisk: 5 },
  { month: 'Jun', screenings: 22, highRisk: 4 },
];

const riskDistribution = [
  { name: 'Low Risk', value: 45, color: '#10b981' },
  { name: 'Medium Risk', value: 28, color: '#f59e0b' },
  { name: 'High Risk', value: 12, color: '#ef4444' },
];

export function ClinicianHome({ onNavigate }: ClinicianHomeProps) {
  const pendingCases = [
    {
      id: 1,
      childName: 'Emma Johnson',
      age: 4,
      screening: 'M-CHAT-R',
      riskLevel: 'high',
      date: '2024-11-02',
      parent: 'Jane Doe',
      status: 'pending-review',
    },
    {
      id: 2,
      childName: 'Noah Smith',
      age: 3,
      screening: 'ASQ-3',
      riskLevel: 'medium',
      date: '2024-11-01',
      parent: 'John Smith',
      status: 'pending-review',
    },
    {
      id: 3,
      childName: 'Olivia Brown',
      age: 2,
      screening: 'Facial Analysis',
      riskLevel: 'medium',
      date: '2024-11-01',
      parent: 'Sarah Brown',
      status: 'pending-review',
    },
  ];

  const upcomingAppointments = [
    {
      id: 1,
      childName: 'Emma Johnson',
      type: 'Follow-up Assessment',
      time: '10:00 AM',
      date: '2024-11-05',
    },
    {
      id: 2,
      childName: 'Liam Davis',
      type: 'Initial Consultation',
      time: '2:00 PM',
      date: '2024-11-05',
    },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-teal-600 mb-2">Welcome Back, Dr. Chen</h2>
        <p className="text-gray-600">Here's your clinical overview for today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-teal-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-teal-600">Total Patients</span>
              <Users className="w-5 h-5 text-teal-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">85</p>
            <p className="text-sm text-gray-600">Active cases</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-purple-600">New Screenings</span>
              <ClipboardCheck className="w-5 h-5 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">12</p>
            <p className="text-sm text-gray-600">This week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-red-600">Pending Reviews</span>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{pendingCases.length}</p>
            <p className="text-sm text-gray-600">Requires attention</p>
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
            <p className="text-sm text-gray-600">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pending Cases */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Screening Reviews */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Pending Screening Reviews
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('patients')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingCases.map((case_) => {
                const riskColor = getRiskColor(case_.riskLevel);
                return (
                  <div
                    key={case_.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-400 flex items-center justify-center text-white text-xl">
                      {case_.childName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-teal-600">{case_.childName}</h4>
                        <Badge className={`bg-${riskColor}-500`}>
                          {case_.riskLevel} risk
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {case_.screening} • {case_.age} years • Parent: {case_.parent}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Submitted: {new Date(case_.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                      Review
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Screening Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Screening Trends
              </CardTitle>
              <CardDescription>Monthly screening activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={screeningData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="screenings" stroke="#14b8a6" strokeWidth={2} />
                  <Line type="monotone" dataKey="highRisk" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Today's Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-3 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-orange-600">{appointment.time}</span>
                  </div>
                  <h4 className="text-gray-900 mb-1">{appointment.childName}</h4>
                  <p className="text-sm text-gray-600">{appointment.type}</p>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate('appointments')}
              >
                View Full Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Risk Distribution
              </CardTitle>
              <CardDescription>Current patient portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {riskDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-gray-900">{item.value} patients</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start bg-teal-600 hover:bg-teal-700"
                onClick={() => onNavigate('patients')}
              >
                <Users className="w-4 h-4 mr-2" />
                View All Patients
              </Button>
              <Button
                className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                onClick={() => onNavigate('reports')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
