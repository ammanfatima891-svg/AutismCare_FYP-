import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users, 
  ClipboardCheck, 
  TrendingUp, 
  Activity,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

interface AdminHomeProps {
  onNavigate: (section: string) => void;
}

const screeningTrends = [
  { month: 'Jan', total: 156, highRisk: 12 },
  { month: 'Feb', total: 178, highRisk: 15 },
  { month: 'Mar', total: 195, highRisk: 18 },
  { month: 'Apr', total: 185, highRisk: 14 },
  { month: 'May', total: 210, highRisk: 20 },
  { month: 'Jun', total: 225, highRisk: 22 },
];

const userDistribution = [
  { name: 'Parents', value: 450, color: '#ec4899' },
  { name: 'Clinicians', value: 25, color: '#14b8a6' },
  { name: 'Therapists', value: 35, color: '#10b981' },
  { name: 'Labs', value: 8, color: '#06b6d4' },
];

export function AdminHome({ onNavigate }: AdminHomeProps) {
  const systemStats = {
    totalUsers: 518,
    totalScreenings: 1249,
    activeParents: 450,
    activeClinicians: 25,
    activeTherapists: 35,
    activeLabs: 8,
    highRiskCases: 101,
    contentItems: 125,
    therapyTemplates: 15,
  };

  const recentActivity = [
    {
      id: 1,
      type: 'user',
      action: 'New parent registered',
      user: 'Jane Doe',
      time: '5 minutes ago',
      icon: Users,
      color: 'text-pink-600',
    },
    {
      id: 2,
      type: 'screening',
      action: 'High-risk screening flagged',
      user: 'Emma Johnson',
      time: '15 minutes ago',
      icon: AlertCircle,
      color: 'text-red-600',
    },
    {
      id: 3,
      type: 'content',
      action: 'New educational content uploaded',
      user: 'Admin',
      time: '1 hour ago',
      icon: BookOpen,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-indigo-600 mb-2">System Dashboard</h2>
        <p className="text-gray-600">Monitor and manage the AutismCare platform</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-indigo-600">Total Users</span>
              <Users className="w-5 h-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{systemStats.totalUsers}</p>
            <p className="text-sm text-gray-600">All platform users</p>
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
            <p className="text-gray-900">{systemStats.totalScreenings}</p>
            <p className="text-sm text-gray-600">Total completed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-red-600">High Risk</span>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{systemStats.highRiskCases}</p>
            <p className="text-sm text-gray-600">Flagged cases</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-green-600">Content</span>
              <BookOpen className="w-5 h-5 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{systemStats.contentItems}</p>
            <p className="text-sm text-gray-600">Educational resources</p>
          </CardContent>
        </Card>
      </div>

      {/* User Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Parents</p>
                <p className="text-2xl text-pink-600">{systemStats.activeParents}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clinicians</p>
                <p className="text-2xl text-teal-600">{systemStats.activeClinicians}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Therapists</p>
                <p className="text-2xl text-green-600">{systemStats.activeTherapists}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Labs</p>
                <p className="text-2xl text-cyan-600">{systemStats.activeLabs}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Screening Trends */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Screening Trends
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('analytics')}>
                  View Analytics <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <CardDescription>Monthly screening activity across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={screeningTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} name="Total Screenings" />
                  <Line type="monotone" dataKey="highRisk" stroke="#ef4444" strokeWidth={2} name="High Risk" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                User Distribution
              </CardTitle>
              <CardDescription>Active users by role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={userDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {userDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-sm text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & Quick Actions */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${activity.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-600">{activity.user}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                onClick={() => onNavigate('users')}
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button
                className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                onClick={() => onNavigate('content')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Content Library
              </Button>
              <Button
                className="w-full justify-start bg-green-600 hover:bg-green-700"
                onClick={() => onNavigate('templates')}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Therapy Templates
              </Button>
              <Button
                className="w-full justify-start bg-orange-600 hover:bg-orange-700"
                onClick={() => onNavigate('analytics')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <CheckCircle className="w-5 h-5 text-green-600" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-green-900">
              <div className="flex items-center justify-between">
                <span>API Status</span>
                <Badge className="bg-green-600">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Database</span>
                <Badge className="bg-green-600">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Storage</span>
                <Badge className="bg-green-600">75% Available</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
