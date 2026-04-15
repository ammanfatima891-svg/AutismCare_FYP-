import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Clock, User, FileText, CheckCircle, XCircle } from 'lucide-react';
import { AppointmentDecisionUI } from './AppointmentDecisionUI';
import API from '../../api';

interface AppointmentRequest {
  _id: string;
  childId: string;
  childName: string;
  parentName: string;
  appointmentType: string;
  preferred_date: string;
  preferred_time: string;
  reason: string;
  urgency: string;
  status: string;
  createdAt: string;
}

interface AppointmentRequestsListProps {
  onSelectAppointment?: (appointment: AppointmentRequest) => void;
}

export function AppointmentRequestsList({ onSelectAppointment }: AppointmentRequestsListProps) {
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRequest | null>(null);

  useEffect(() => {
    fetchAppointmentRequests();
  }, []);

  const fetchAppointmentRequests = async () => {
    try {
      const response = await API.get('/appointment/clinician');
      setAppointments(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch appointment requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, status: string) => {
    try {
      await API.put(`/appointment/${appointmentId}/status`, { status: status === 'approved' ? 'Approved' : 'Rejected' });
      // Refresh the list
      fetchAppointmentRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update appointment status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-accent/10 text-accent-foreground';
      case 'approved': return 'bg-secondary text-primary';
      case 'scheduled': return 'bg-secondary/70 text-primary';
      case 'completed': return 'bg-muted text-foreground';
      case 'cancelled': return 'bg-muted text-destructive';
      default: return 'bg-muted text-foreground';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-muted text-destructive';
      case 'high': return 'bg-accent/10 text-accent-foreground';
      case 'normal': return 'bg-secondary/70 text-primary';
      case 'low': return 'bg-secondary text-primary';
      default: return 'bg-muted text-foreground';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading appointment requests...</div>;
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={fetchAppointmentRequests}>Try Again</Button>
      </div>
    );
  }

  if (selectedAppointment) {
    return (
      <AppointmentDecisionUI
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onDecision={() => {
          setSelectedAppointment(null);
          fetchAppointmentRequests();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Appointment Requests</h2>
        <Button onClick={fetchAppointmentRequests} variant="outline">
          Refresh
        </Button>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No appointment requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appointment) => (
            <Card key={appointment._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {appointment.appointmentType ? appointment.appointmentType.replace('-', ' ').toUpperCase() : 'APPOINTMENT REQUEST'}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                    <Badge className={getUrgencyColor(appointment.urgency)}>
                      {appointment.urgency}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Child: {appointment.childName} | Parent: {appointment.parentName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Preferred: {new Date(appointment.preferred_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Time: {appointment.preferred_time}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Reason:</p>
                    <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Requested on: {new Date(appointment.createdAt).toLocaleDateString()}
                </div>

                {appointment.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(appointment._id, 'approved')}
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStatusUpdate(appointment._id, 'cancelled')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      Review & Decide
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
