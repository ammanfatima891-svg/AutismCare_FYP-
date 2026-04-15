import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, User, FileText } from 'lucide-react';
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

interface AppointmentDecisionUIProps {
  appointment: AppointmentRequest;
  onClose: () => void;
  onDecision: () => void;
}

export function AppointmentDecisionUI({ appointment, onClose, onDecision }: AppointmentDecisionUIProps) {
  const [decision, setDecision] = useState<'approve' | 'decline' | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!decision) return;

    setLoading(true);
    setError('');

    try {
      const status = decision === 'approve' ? 'approved' : 'cancelled';
      const updateData: any = { status };

      if (decision === 'approve' && scheduledDate && scheduledTime) {
        updateData.scheduledDate = scheduledDate;
        updateData.scheduledTime = scheduledTime;
      }

      if (notes.trim()) {
        updateData.notes = notes.trim();
      }

      await API.put(`/appointment/${appointment._id}/status`, { status: updateData.status });
      onDecision();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process appointment decision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appointment Request Details</CardTitle>
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
            <div>
              <span className="text-sm font-medium">Type: </span>
              <span className="text-sm">{appointment.appointmentType.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Reason:</p>
              <p className="text-sm text-muted-foreground">{appointment.reason}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Make Decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Decision</Label>
            <Select value={decision || ''} onValueChange={(value: 'approve' | 'decline') => setDecision(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">Approve Request</SelectItem>
                <SelectItem value="decline">Decline Request</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {decision === 'approve' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledDate">Scheduled Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduledTime">Scheduled Time</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this decision..."
              rows={3}
            />
          </div>

          {error && (
            <div className="text-destructive text-sm">{error}</div>
          )}

          <div className="flex gap-4">
            <Button onClick={handleSubmit} disabled={loading || !decision}>
              {loading ? 'Processing...' : 'Submit Decision'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
