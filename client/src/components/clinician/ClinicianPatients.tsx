import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search, 
  Filter, 
  Users, 
  Eye,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { PatientProfileView } from './PatientProfileView';

export function ClinicianPatients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const patients = [
    {
      id: 1,
      childName: 'Emma Johnson',
      age: 4,
      gender: 'Female',
      parent: 'Jane Doe',
      parentEmail: 'jane.doe@email.com',
      parentPhone: '+1 (555) 123-4567',
      screenings: 3,
      lastScreening: 'M-CHAT-R',
      lastScreeningDate: '2024-11-02',
      riskLevel: 'high',
      status: 'active',
      nextAppointment: '2024-11-05',
      assignedTherapist: 'Dr. Sarah Johnson',
    },
    {
      id: 2,
      childName: 'Noah Smith',
      age: 3,
      gender: 'Male',
      parent: 'John Smith',
      parentEmail: 'john.smith@email.com',
      parentPhone: '+1 (555) 234-5678',
      screenings: 2,
      lastScreening: 'ASQ-3',
      lastScreeningDate: '2024-11-01',
      riskLevel: 'medium',
      status: 'active',
      nextAppointment: null,
      assignedTherapist: 'Alex Martinez',
    },
    {
      id: 3,
      childName: 'Olivia Brown',
      age: 2,
      gender: 'Female',
      parent: 'Sarah Brown',
      parentEmail: 'sarah.brown@email.com',
      parentPhone: '+1 (555) 345-6789',
      screenings: 1,
      lastScreening: 'Facial Analysis',
      lastScreeningDate: '2024-11-01',
      riskLevel: 'medium',
      status: 'pending-review',
      nextAppointment: null,
      assignedTherapist: null,
    },
    {
      id: 4,
      childName: 'Liam Davis',
      age: 5,
      gender: 'Male',
      parent: 'Michael Davis',
      parentEmail: 'michael.davis@email.com',
      parentPhone: '+1 (555) 456-7890',
      screenings: 4,
      lastScreening: 'ASQ-3',
      lastScreeningDate: '2024-10-28',
      riskLevel: 'low',
      status: 'monitoring',
      nextAppointment: '2024-11-10',
      assignedTherapist: 'Dr. Sarah Johnson',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'blue';
      case 'pending-review':
        return 'yellow';
      case 'monitoring':
        return 'green';
      default:
        return 'gray';
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = patient.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.parent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === 'all' || patient.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  if (selectedPatient) {
    return (
      <PatientProfileView
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-teal-600 mb-2">Patient Management</h2>
        <p className="text-gray-600">View and manage your patient cases</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by child name or parent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-2xl text-teal-600">{patients.length}</p>
              </div>
              <Users className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-2xl text-red-600">
                  {patients.filter(p => p.riskLevel === 'high').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl text-yellow-600">
                  {patients.filter(p => p.status === 'pending-review').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Cases</p>
                <p className="text-2xl text-blue-600">
                  {patients.filter(p => p.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Patient List ({filteredPatients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPatients.map((patient) => {
              const riskColor = getRiskColor(patient.riskLevel);
              const statusColor = getStatusColor(patient.status);
              
              return (
                <div
                  key={patient.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-blue-400 flex items-center justify-center text-white text-xl">
                    {patient.childName[0]}
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-teal-600 mb-1">{patient.childName}</h4>
                      <p className="text-sm text-gray-600">
                        {patient.age} years • {patient.gender}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Parent: {patient.parent}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Last Screening</p>
                      <p className="text-sm text-gray-900">{patient.lastScreening}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(patient.lastScreeningDate).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Status</p>
                      <div className="flex flex-col gap-1">
                        <Badge className={`bg-${riskColor}-500 w-fit`}>
                          {patient.riskLevel} risk
                        </Badge>
                        <Badge variant="outline" className={`border-${statusColor}-500 text-${statusColor}-700 w-fit`}>
                          {patient.status.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        {patient.nextAppointment && (
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-gray-600 mb-1">
                              <Calendar className="w-3 h-3" />
                              <span>Next Visit</span>
                            </div>
                            <p className="text-xs text-gray-900">
                              {new Date(patient.nextAppointment).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
