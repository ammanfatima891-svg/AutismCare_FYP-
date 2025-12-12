import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  Edit, 
  Calendar, 
  Activity, 
  FileText, 
  TrendingUp,
  ClipboardCheck,
  Pill,
  AlertCircle,
  Phone
} from 'lucide-react';
import { Progress } from '../../ui/progress';

interface ChildProfileProps {
  childId: number;
}

export function ChildProfile({ childId }: ChildProfileProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Mock data
  const child = {
    id: childId,
    firstName: 'Emma',
    lastName: 'Johnson',
    fullName: 'Emma Johnson',
    age: 4,
    dateOfBirth: '2020-03-15',
    gender: 'Female',
    medicalHistory: 'No significant medical history',
    allergies: 'None',
    currentMedications: 'None',
    emergencyContact: 'John Johnson',
    emergencyPhone: '+1 (555) 123-4567',
  };

  const screeningHistory = [
    {
      id: 1,
      type: 'M-CHAT-R',
      date: '2024-10-15',
      score: 'Low Risk',
      status: 'completed',
      details: 'All developmental milestones on track',
    },
    {
      id: 2,
      type: 'ASQ-3',
      date: '2024-09-01',
      score: 'Low Risk',
      status: 'completed',
      details: 'Age-appropriate development',
    },
  ];

  const appointments = [
    {
      id: 1,
      type: 'Speech Therapy',
      provider: 'Dr. Sarah Johnson',
      date: '2024-11-05',
      time: '10:00 AM',
      status: 'upcoming',
    },
    {
      id: 2,
      type: 'Occupational Therapy',
      provider: 'Alex Martinez',
      date: '2024-11-07',
      time: '2:00 PM',
      status: 'upcoming',
    },
    {
      id: 3,
      type: 'Follow-up Assessment',
      provider: 'Dr. Emily Chen',
      date: '2024-10-01',
      time: '3:00 PM',
      status: 'completed',
    },
  ];

  const activities = [
    { id: 1, name: 'Daily Routine Practice', completed: 12, total: 15, category: 'Life Skills' },
    { id: 2, name: 'Color Recognition', completed: 8, total: 10, category: 'Cognitive' },
    { id: 3, name: 'Social Skills', completed: 5, total: 8, category: 'Social' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-pink-200">
        <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-3xl">
                {child.firstName[0]}
              </div>
              <div>
                <h2 className="text-pink-600 mb-1">{child.fullName}</h2>
                <p className="text-gray-600">{child.age} years old • {child.gender}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="text-pink-600 border-pink-600 hover:bg-pink-50"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="screening">Screening</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-600">
                  <FileText className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Full Name</span>
                  <span className="text-gray-900">{child.fullName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Age</span>
                  <span className="text-gray-900">{child.age} years</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Gender</span>
                  <span className="text-gray-900">{child.gender}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Date of Birth</span>
                  <span className="text-gray-900">
                    {new Date(child.dateOfBirth).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Activity className="w-5 h-5" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="py-2 border-b border-gray-100">
                  <p className="text-gray-600 text-sm mb-1">Medical History</p>
                  <p className="text-gray-900">{child.medicalHistory}</p>
                </div>
                <div className="flex items-center gap-2 py-2 border-b border-gray-100">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 text-sm">Allergies:</span>
                  <span className="text-gray-900">{child.allergies}</span>
                </div>
                <div className="flex items-center gap-2 py-2">
                  <Pill className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 text-sm">Medications:</span>
                  <span className="text-gray-900">{child.currentMedications}</span>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Phone className="w-5 h-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Contact Name</span>
                  <span className="text-gray-900">{child.emergencyContact}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Phone Number</span>
                  <span className="text-gray-900">{child.emergencyPhone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                  Progress Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Screenings Completed</span>
                    <span className="text-gray-900">{screeningHistory.length}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Appointments Attended</span>
                    <span className="text-gray-900">1 of 3</span>
                  </div>
                  <Progress value={33} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Activities Progress</span>
                    <span className="text-gray-900">25 of 33</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Screening History Tab */}
        <TabsContent value="screening" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-purple-600">Screening History</h3>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              New Screening
            </Button>
          </div>
          {screeningHistory.map((screening) => (
            <Card key={screening.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-purple-600">{screening.type}</h4>
                      <Badge className="bg-green-500">{screening.score}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{screening.details}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(screening.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">View Report</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-orange-600">Appointments</h3>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </div>
          {appointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-orange-100 flex flex-col items-center justify-center text-orange-600">
                    <span className="text-xs">
                      {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-xl">
                      {new Date(appointment.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-orange-600">{appointment.type}</h4>
                      <Badge
                        variant={appointment.status === 'upcoming' ? 'default' : 'secondary'}
                        className={appointment.status === 'upcoming' ? 'bg-blue-500' : 'bg-gray-500'}
                      >
                        {appointment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{appointment.provider}</p>
                    <p className="text-xs text-gray-500 mt-1">{appointment.time}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <h3 className="text-green-600 mb-4">Learning Activities</h3>
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-green-600">{activity.name}</h4>
                    <p className="text-sm text-gray-600">{activity.category}</p>
                  </div>
                  <span className="text-sm text-gray-900">
                    {activity.completed}/{activity.total}
                  </span>
                </div>
                <Progress value={(activity.completed / activity.total) * 100} className="h-2" />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
