import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import API from '../../api';

interface Child {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Clinician {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string;
}

interface AppointmentRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialClinicianId?: string;
  initialChildId?: string;
}

export function AppointmentRequestForm({ onSuccess, onCancel, initialClinicianId, initialChildId }: AppointmentRequestFormProps) {
  const [formData, setFormData] = useState({
    childId: '',
    clinicianId: '',
    appointmentType: '',
    preferredDate: '',
    preferredTime: '',
    reason: '',
    urgency: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [children, setChildren] = useState([]);
  const [clinicians, setClinicians] = useState([]);

  useEffect(() => {
    fetchChildren();
    fetchClinicians();
  }, []);

  useEffect(() => {
    if (initialClinicianId) {
      setFormData(prev => ({ ...prev, clinicianId: initialClinicianId }));
    }
  }, [initialClinicianId]);

  useEffect(() => {
    if (initialChildId) {
      setFormData(prev => ({ ...prev, childId: initialChildId }));
    }
  }, [initialChildId]);

  const fetchChildren = async () => {
    try {
      const response = await API.get('/child');
      setChildren(response.data.data);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const fetchClinicians = async () => {
    try {
      const response = await API.get('/appointment/clinicians');
      setClinicians(response.data.data);
    } catch (error) {
      console.error('Error fetching clinicians:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await API.post('/appointment/request', {
        childId: formData.childId,
        clinicianId: formData.clinicianId,
        preferred_date: formData.preferredDate,
        preferred_time: formData.preferredTime,
        appointmentType: formData.appointmentType,
        reason: formData.reason,
        urgency: formData.urgency
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit appointment request');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Request Appointment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="childId">Child</Label>
            <Select value={formData.childId} onValueChange={(value) => handleChange('childId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child: Child) => (
                  <SelectItem key={child._id} value={child._id}>
                    {child.firstName} {child.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="clinicianId">Clinician</Label>
            <Select value={formData.clinicianId} onValueChange={(value) => handleChange('clinicianId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a clinician" />
              </SelectTrigger>
              <SelectContent>
                {clinicians.map((clinician: Clinician) => (
                  <SelectItem key={clinician._id} value={clinician._id}>
                    Dr. {clinician.firstName} {clinician.lastName} - {clinician.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="appointmentType">Appointment Type</Label>
            <Select value={formData.appointmentType} onValueChange={(value) => handleChange('appointmentType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="initial-consultation">Initial Consultation</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="screening-review">Screening Review</SelectItem>
                <SelectItem value="therapy-session">Therapy Session</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preferredDate">Preferred Date</Label>
              <Input
                id="preferredDate"
                type="date"
                value={formData.preferredDate}
                onChange={(e) => handleChange('preferredDate', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="preferredTime">Preferred Time</Label>
              <Input
                id="preferredTime"
                type="time"
                value={formData.preferredTime}
                onChange={(e) => handleChange('preferredTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="urgency">Urgency Level</Label>
            <Select value={formData.urgency} onValueChange={(value) => handleChange('urgency', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Appointment</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Please describe the reason for this appointment..."
              rows={4}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
