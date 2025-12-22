import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, MapPin, User, Plus, Edit, X, Eye } from 'lucide-react';

interface Appointment {
  id: number;
  patientName: string;
  patientAge: number;
  type: 'initial_assessment' | 'follow_up' | 'therapy_session' | 'screening_review';
  date: string;
  time: string;
  duration: number; // in minutes
  location: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

const mockAppointments: Appointment[] = [
  {
    id: 1,
    patientName: 'Emma Johnson',
    patientAge: 4,
    type: 'initial_assessment',
    date: '2024-01-25',
    time: '10:00',
    duration: 60,
    location: 'Room 101',
    status: 'confirmed',
    notes: 'First evaluation session'
  },
  {
    id: 2,
    patientName: 'Noah Smith',
    patientAge: 3,
    type: 'follow_up',
    date: '2024-01-22',
    time: '14:30',
    duration: 45,
    location: 'Room 102',
    status: 'scheduled',
    notes: 'Progress review after M-CHAT results'
  },
  {
    id: 3,
    patientName: 'Sophia Davis',
    patientAge: 5,
    type: 'therapy_session',
    date: '2024-01-28',
    time: '11:00',
    duration: 50,
    location: 'Room 103',
    status: 'scheduled'
  },
  {
    id: 4,
    patientName: 'Liam Wilson',
    patientAge: 2,
    type: 'screening_review',
    date: '2024-01-20',
    time: '09:00',
    duration: 30,
    location: 'Room 101',
    status: 'completed',
    notes: 'ASQ-3 results discussed with parents'
  }
];

export function AppointmentsManagement() {
  const [selectedDate, setSelectedDate] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAppointments = mockAppointments.filter(appointment => {
    const matchesDate = selectedDate === 'all' || appointment.date === selectedDate;
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'initial_assessment': return 'bg-purple-100 text-purple-800';
      case 'follow_up': return 'bg-blue-100 text-blue-800';
      case 'therapy_session': return 'bg-green-100 text-green-800';
      case 'screening_review': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-blue-600 mb-2">Appointments Management</h2>
          <p className="text-gray-600">Schedule and manage patient appointments</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Appointment
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="2024-01-20">January 20, 2024</SelectItem>
                <SelectItem value="2024-01-22">January 22, 2024</SelectItem>
                <SelectItem value="2024-01-25">January 25, 2024</SelectItem>
                <SelectItem value="2024-01-28">January 28, 2024</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <div className="grid gap-4">
        {filteredAppointments.map((appointment) => (
          <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {appointment.patientName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{appointment.patientName}</h3>
                    <p className="text-gray-600">Age: {appointment.patientAge}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getTypeColor(appointment.type)}>
                        {formatType(appointment.type)}
                      </Badge>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(appointment.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Clock className="h-4 w-4" />
                      <span>{appointment.time} ({appointment.duration}min)</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{appointment.location}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {appointment.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{appointment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredAppointments.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-500 text-center">
                {selectedDate !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filter criteria.'
                  : 'No appointments have been scheduled yet.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
