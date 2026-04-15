import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Clock, User, FileText } from 'lucide-react';
import API from '../../api';

interface Appointment {
  _id: string;
  child: string;
  childInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  } | null;
  appointmentType: 'DIAGNOSTIC' | 'THERAPY' | 'LAB_TEST' | string;
  preferredDate: string;
  preferredTime: string;
  finalDate?: string | null;
  finalTime?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED' | string;
  professional?: {
    firstName?: string;
    lastName?: string;
    labName?: string;
    role?: string;
  } | null;
  createdAt: string;
  additionalNotes?: string;
  rejectionReason?: string;
  completionNotes?: string;
}

interface AppointmentStatusPageProps {
  onBack?: () => void;
}

export function AppointmentStatusPage({ onBack }: AppointmentStatusPageProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await API.get('/appointments/my');
      setAppointments(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const statusKey = (status: string) => String(status || '').trim().toUpperCase();

  const getStatusColor = (status: string) => {
    switch (statusKey(status)) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-50 text-primary';
      case 'REJECTED': return 'bg-muted text-destructive';
      case 'COMPLETED': return 'bg-muted text-foreground';
      case 'CANCELLED': return 'bg-muted text-destructive';
      default: return 'bg-muted text-foreground';
    }
  };

  const displayStatus = (status: string) =>
    statusKey(status).toLowerCase().replace('_', ' ');

  const displayAppointmentType = (t: string) =>
    String(t || '')
      .trim()
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .toUpperCase();

  const childName = (a: Appointment) => {
    const first = a.childInfo?.firstName || '';
    const last = a.childInfo?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || 'Child';
  };

  const professionalName = (a: Appointment) => {
    const labName = a.professional?.labName;
    if (labName && String(labName).trim()) return String(labName).trim();
    const first = a.professional?.firstName || '';
    const last = a.professional?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || 'Professional';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading appointments...</div>;
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={fetchAppointments}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Appointment Requests</h2>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
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
            <Card key={appointment._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {displayAppointmentType(appointment.appointmentType)}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {displayStatus(appointment.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Child: {childName(appointment)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Preferred: {new Date(appointment.preferredDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Time: {appointment.preferredTime}</span>
                  </div>
                  {appointment.professional && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Professional: {professionalName(appointment)} ({appointment.professional.role})
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Reason:</p>
                    <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                  </div>
                </div>

                {appointment.additionalNotes && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Notes:</p>
                      <p className="text-sm text-muted-foreground">{appointment.additionalNotes}</p>
                    </div>
                  </div>
                )}

                {appointment.rejectionReason && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Rejection reason:</p>
                      <p className="text-sm text-muted-foreground">{appointment.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {appointment.completionNotes && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Completion notes:</p>
                      <p className="text-sm text-muted-foreground">{appointment.completionNotes}</p>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Requested on: {new Date(appointment.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
