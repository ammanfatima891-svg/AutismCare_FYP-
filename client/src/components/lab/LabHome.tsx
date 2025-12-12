import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  Upload,
  TrendingUp,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LabHomeProps {
  onNavigate: (section: string) => void;
}

const monthlyData = [
  { month: 'Jan', completed: 45, pending: 8 },
  { month: 'Feb', completed: 52, pending: 6 },
  { month: 'Mar', completed: 48, pending: 9 },
  { month: 'Apr', completed: 55, pending: 7 },
  { month: 'May', completed: 60, pending: 5 },
  { month: 'Jun', completed: 58, pending: 10 },
];

export function LabHome({ onNavigate }: LabHomeProps) {
  const pendingTests = [
    {
      id: 1,
      testName: 'Hearing Assessment',
      childName: 'Emma Johnson',
      age: 4,
      requestedBy: 'Dr. Emily Chen',
      requestDate: '2024-11-03',
      priority: 'high',
    },
    {
      id: 2,
      testName: 'Audiometry Test',
      childName: 'Noah Smith',
      age: 3,
      requestedBy: 'Dr. Emily Chen',
      requestDate: '2024-11-02',
      priority: 'medium',
    },
  ];

  const recentlyCompleted = [
    {
      id: 1,
      testName: 'Hearing Test',
      childName: 'Liam Davis',
      completedDate: '2024-11-01',
      result: 'Normal',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-cyan-600 mb-2">Laboratory Dashboard</h2>
        <p className="text-gray-600">Manage test requests and upload results</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-cyan-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-cyan-600">Total Requests</span>
              <ClipboardList className="w-5 h-5 text-cyan-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{pendingTests.length + recentlyCompleted.length}</p>
            <p className="text-sm text-gray-600">This month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-yellow-600">Pending</span>
              <Clock className="w-5 h-5 text-yellow-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{pendingTests.length}</p>
            <p className="text-sm text-gray-600">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-green-600">Completed</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{recentlyCompleted.length}</p>
            <p className="text-sm text-gray-600">This week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-red-600">High Priority</span>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">
              {pendingTests.filter(t => t.priority === 'high').length}
            </p>
            <p className="text-sm text-gray-600">Urgent tests</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pending Tests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Test Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  Pending Test Requests
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('requests')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-400 flex items-center justify-center text-white text-xl">
                    {test.childName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-cyan-600">{test.testName}</h4>
                      <Badge className={test.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}>
                        {test.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Patient: {test.childName} ({test.age} years)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested by {test.requestedBy} • {new Date(test.requestDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                    Process
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Monthly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Monthly Activity
              </CardTitle>
              <CardDescription>Test processing trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
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
                className="w-full justify-start bg-cyan-600 hover:bg-cyan-700"
                onClick={() => onNavigate('requests')}
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                View All Requests
              </Button>
              <Button
                className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                onClick={() => onNavigate('upload')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Test Results
              </Button>
            </CardContent>
          </Card>

          {/* Recently Completed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Recently Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentlyCompleted.map((test) => (
                <div
                  key={test.id}
                  className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 border border-green-200"
                >
                  <h4 className="text-green-600 mb-1">{test.testName}</h4>
                  <p className="text-sm text-gray-600">{test.childName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge className="bg-green-500">{test.result}</Badge>
                    <p className="text-xs text-gray-500">
                      {new Date(test.completedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
