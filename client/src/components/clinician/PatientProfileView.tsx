import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  ClipboardCheck,
  FileText,
  Activity,
  Calendar,
  Send,
  Download,
  AlertCircle
} from 'lucide-react';
import { Progress } from '../ui/progress';

interface PatientProfileViewProps {
  patient: any;
  onBack: () => void;
}

export function PatientProfileView({ patient, onBack }: PatientProfileViewProps) {
  const [clinicalNotes, setClinicalNotes] = useState('');

  const screeningHistory = [
    {
      id: 1,
      type: 'M-CHAT-R',
      date: '2024-11-02',
      riskLevel: 'high',
      score: 12,
      assessedBy: 'Parent Questionnaire',
    },
    {
      id: 2,
      type: 'ASQ-3',
      date: '2024-10-15',
      riskLevel: 'medium',
      score: 65,
      assessedBy: 'Parent Questionnaire',
    },
  ];

  const testReports = [
    {
      id: 1,
      name: 'Hearing Test',
      date: '2024-10-20',
      lab: 'AudioCare Lab',
      status: 'completed',
      result: 'Normal hearing sensitivity',
    },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patient List
      </Button>

      {/* Patient Header */}
      <Card className="border-2 border-teal-200">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-blue-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-blue-400 flex items-center justify-center text-white text-3xl">
                {patient.childName[0]}
              </div>
              <div>
                <h2 className="text-teal-600 mb-1">{patient.childName}</h2>
                <p className="text-gray-600">{patient.age} years old • {patient.gender}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={`bg-${patient.riskLevel === 'high' ? 'red' : patient.riskLevel === 'medium' ? 'yellow' : 'green'}-500`}>
                    {patient.riskLevel} risk
                  </Badge>
                  <Badge variant="outline">
                    {patient.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Appointment
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Records
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="screenings">Screenings</TabsTrigger>
          <TabsTrigger value="reports">Test Reports</TabsTrigger>
          <TabsTrigger value="therapy">Therapy Plan</TabsTrigger>
          <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-600" />
                  Parent Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-gray-900">{patient.parent}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-900">{patient.parentEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-900">{patient.parentPhone}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Case Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Screenings</span>
                  <span className="text-gray-900">{patient.screenings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Screening</span>
                  <span className="text-gray-900">{patient.lastScreening}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Assigned Therapist</span>
                  <span className="text-gray-900">{patient.assignedTherapist || 'Not assigned'}</span>
                </div>
                {patient.nextAppointment && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Appointment</span>
                    <span className="text-gray-900">
                      {new Date(patient.nextAppointment).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Screenings Tab */}
        <TabsContent value="screenings" className="space-y-4">
          {screeningHistory.map((screening) => (
            <Card key={screening.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-teal-600">{screening.type}</CardTitle>
                    <CardDescription>
                      {new Date(screening.date).toLocaleDateString()} • {screening.assessedBy}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge className={`bg-${screening.riskLevel === 'high' ? 'red' : 'yellow'}-500 mb-2`}>
                      {screening.riskLevel} risk
                    </Badge>
                    <p className="text-sm text-gray-600">Score: {screening.score}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Test Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {testReports.map((report) => (
            <Card key={report.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-teal-600 mb-1">{report.name}</h4>
                    <p className="text-sm text-gray-600">{report.lab}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(report.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-500 mb-2">{report.status}</Badge>
                    <p className="text-sm text-gray-600">{report.result}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button className="w-full bg-purple-600 hover:bg-purple-700">
            Prescribe New Test
          </Button>
        </TabsContent>

        {/* Therapy Plan Tab */}
        <TabsContent value="therapy">
          <Card>
            <CardHeader>
              <CardTitle>Therapy Plan</CardTitle>
              <CardDescription>
                {patient.assignedTherapist ? `Managed by ${patient.assignedTherapist}` : 'No therapy plan assigned'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patient.assignedTherapist ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-900">
                      Active therapy plan in progress. View detailed progress in therapy section.
                    </p>
                  </div>
                  <Button variant="outline">View Therapy Details</Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No therapy plan assigned yet</p>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    Assign Therapist & Create Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinical Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Add Clinical Notes</CardTitle>
              <CardDescription>Document observations and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter clinical observations, assessment notes, or recommendations..."
                rows={6}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
              />
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Send className="w-4 h-4 mr-2" />
                Save Notes
              </Button>

              <div className="mt-6 space-y-3">
                <h4 className="font-medium">Previous Notes</h4>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">2024-10-20 • Dr. Emily Chen</p>
                  <p className="text-sm text-gray-900">
                    Child shows good progress in social communication. Recommend continuing current therapy plan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
