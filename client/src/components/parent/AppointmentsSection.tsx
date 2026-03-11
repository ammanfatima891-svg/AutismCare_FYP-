import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar as CalendarIcon, Clock, MapPin, Video, Plus, Filter, X, ChevronLeft, ChevronRight, FileText, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { appointmentAPI } from '../../api';
import { childAPI } from '../../api';

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING_APPROVAL: { color: 'text-yellow-800', bg: 'bg-yellow-100', label: 'Pending Approval' },
  APPROVED: { color: 'text-green-800', bg: 'bg-green-100', label: 'Approved' },
  REJECTED: { color: 'text-red-800', bg: 'bg-red-100', label: 'Rejected' },
  RESCHEDULED: { color: 'text-blue-800', bg: 'bg-blue-100', label: 'Rescheduled' },
  COMPLETED: { color: 'text-gray-800', bg: 'bg-gray-100', label: 'Completed' },
  CANCELLED: { color: 'text-red-800', bg: 'bg-red-200', label: 'Cancelled' },
};

const TYPE_LABELS: Record<string, string> = {
  DIAGNOSTIC: 'Diagnostic',
  THERAPY: 'Therapy',
  LAB_TEST: 'Lab Test',
};

interface Child {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

interface Professional {
  _id: string;
  name: string;
  email: string;
  specialization: string | null;
  role: string;
}

interface Appointment {
  _id: string;
  appointmentType: string;
  preferredDate: string;
  preferredTime: string;
  finalDate?: string;
  finalTime?: string;
  mode: string;
  reason: string;
  status: string;
  rejectionReason?: string;
  completionNotes?: string;
  additionalNotes?: string;
  documents?: string[];
  professional: {
    _id: string;
    firstName?: string;
    lastName?: string;
    labName?: string;
    specialization?: string;
    role: string;
  };
  childInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  rescheduleHistory?: Array<{
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    changedAt: string;
  }>;
  auditTrail?: Array<{
    action: string;
    timestamp: string;
    details?: string;
  }>;
  createdAt: string;
}

// ─── Booking Form Component ──────────────────────────────────────────────────

function BookingForm({ children, onClose, onSuccess }: {
  children: Child[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    childId: '',
    appointmentType: '',
    professionalId: '',
    preferredDate: '',
    preferredTime: '',
    reason: '',
    mode: 'IN_PERSON',
    additionalNotes: '',
  });
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);

  // Fetch professionals when type changes
  useEffect(() => {
    if (!formData.appointmentType) {
      setProfessionals([]);
      setFormData(prev => ({ ...prev, professionalId: '' }));
      return;
    }
    setLoadingProfessionals(true);
    appointmentAPI.getAvailableProfessionals(formData.appointmentType)
      .then(res => {
        setProfessionals(res.data.data);
        setFormData(prev => ({ ...prev, professionalId: '' }));
      })
      .catch(() => setProfessionals([]))
      .finally(() => setLoadingProfessionals(false));
  }, [formData.appointmentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('childId', formData.childId);
      fd.append('appointmentType', formData.appointmentType);
      fd.append('professionalId', formData.professionalId);
      fd.append('preferredDate', formData.preferredDate);
      fd.append('preferredTime', formData.preferredTime);
      fd.append('reason', formData.reason);
      fd.append('mode', formData.mode);
      fd.append('additionalNotes', formData.additionalNotes);
      if (files) {
        Array.from(files).forEach(file => fd.append('documents', file));
      }

      await appointmentAPI.create(fd);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  // Get min date (tomorrow)
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const minDate = today.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Book Appointment</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Child Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Child *</label>
            <select
              required
              value={formData.childId}
              onChange={e => setFormData(prev => ({ ...prev, childId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Choose a child...</option>
              {children.map(c => (
                <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>

          {/* Appointment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type *</label>
            <select
              required
              value={formData.appointmentType}
              onChange={e => setFormData(prev => ({ ...prev, appointmentType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Choose type...</option>
              <option value="DIAGNOSTIC">Diagnostic (Clinician)</option>
              <option value="THERAPY">Therapy (Therapist)</option>
              <option value="LAB_TEST">Lab Test (Laboratory)</option>
            </select>
          </div>

          {/* Professional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Professional *</label>
            <select
              required
              value={formData.professionalId}
              onChange={e => setFormData(prev => ({ ...prev, professionalId: e.target.value }))}
              disabled={!formData.appointmentType || loadingProfessionals}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
            >
              <option value="">{loadingProfessionals ? 'Loading...' : 'Choose professional...'}</option>
              {professionals.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}{p.specialization ? ` — ${p.specialization}` : ''}
                </option>
              ))}
            </select>
            {formData.appointmentType && professionals.length === 0 && !loadingProfessionals && (
              <p className="text-xs text-red-500 mt-1">No approved professionals available for this type</p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date *</label>
              <input
                type="date"
                required
                min={minDate}
                value={formData.preferredDate}
                onChange={e => setFormData(prev => ({ ...prev, preferredDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time *</label>
              <input
                type="time"
                required
                value={formData.preferredTime}
                onChange={e => setFormData(prev => ({ ...prev, preferredTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="IN_PERSON"
                  checked={formData.mode === 'IN_PERSON'}
                  onChange={e => setFormData(prev => ({ ...prev, mode: e.target.value }))}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm">In-Person</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="ONLINE"
                  checked={formData.mode === 'ONLINE'}
                  onChange={e => setFormData(prev => ({ ...prev, mode: e.target.value }))}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <Video className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Online</span>
              </label>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Symptoms *</label>
            <textarea
              required
              rows={3}
              maxLength={2000}
              value={formData.reason}
              onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Describe symptoms, concerns, or reason for appointment..."
            />
          </div>

          {/* Documents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Documents (optional)</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{files ? `${files.length} file(s)` : 'Upload files'}</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setFiles(e.target.files)}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-gray-400">Max 25MB per file</span>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              rows={2}
              maxLength={1000}
              value={formData.additionalNotes}
              onChange={e => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Any additional information..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              {loading ? 'Submitting...' : 'Book Appointment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Timeline Component ──────────────────────────────────────────────────────

function AppointmentTimeline({ appointment }: { appointment: Appointment }) {
  const entries = [
    ...(appointment.auditTrail || []).map(a => ({
      action: a.action,
      date: a.timestamp,
      details: a.details || ''
    })),
    ...(appointment.rescheduleHistory || []).map(r => ({
      action: 'RESCHEDULED',
      date: r.changedAt,
      details: `From ${new Date(r.oldDate).toLocaleDateString()} ${r.oldTime} → ${new Date(r.newDate).toLocaleDateString()} ${r.newTime}`
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (entries.length === 0) return null;

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
      <p className="text-xs font-semibold text-gray-600 mb-2">Timeline</p>
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-orange-400 mt-1 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-700">{entry.action}</span>
              <span className="text-gray-500 ml-2">{new Date(entry.date).toLocaleString()}</span>
              {entry.details && <p className="text-gray-500 mt-0.5">{entry.details}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface AppointmentsSectionProps {
  initialShowBooking?: boolean;
  formOnly?: boolean;
}

export function AppointmentsSection({ initialShowBooking = false, formOnly = false }: AppointmentsSectionProps = {}) {
  const [showBooking, setShowBooking] = useState(initialShowBooking);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const res = await appointmentAPI.getMyAppointments(params);
      setAppointments(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  const fetchChildren = async () => {
    try {
      const res = await childAPI.getChildren();
      setChildren(res.data.data || []);
    } catch {
      setChildren([]);
    }
  };

  useEffect(() => { if (!formOnly) fetchAppointments(); }, [fetchAppointments, formOnly]);
  useEffect(() => { fetchChildren(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await appointmentAPI.cancel(id);
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleBookingSuccess = () => {
    setShowBooking(false);
    setPage(1);
    setStatusFilter('');
    fetchAppointments();
  };

  const getProfName = (prof: Appointment['professional']) =>
    prof.labName || `Dr. ${prof.firstName} ${prof.lastName}`;

  const upcomingStatuses = ['PENDING_APPROVAL', 'APPROVED', 'RESCHEDULED'];
  const pastStatuses = ['COMPLETED', 'REJECTED', 'CANCELLED'];

  const upcoming = appointments.filter(a => upcomingStatuses.includes(a.status));
  const past = appointments.filter(a => pastStatuses.includes(a.status));

  if (formOnly) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {showBooking ? (
          <BookingForm
            children={children}
            onClose={() => setShowBooking(false)}
            onSuccess={handleBookingSuccess}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CalendarIcon className="h-12 w-12 text-orange-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Book Appointment</h2>
              <p className="text-gray-600 text-center mb-6">Schedule a healthcare appointment for your child</p>
              <Button
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                onClick={() => setShowBooking(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-orange-600 mb-1">Appointments</h2>
        <p className="text-gray-600">Manage your children's healthcare appointments</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Filter:</span>
            </div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val}</option>
              ))}
            </select>
            {(statusFilter || typeFilter) && (
              <button
                onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1); }}
                className="text-xs text-orange-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appointments */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarIcon className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-500 text-center mb-4">
              {statusFilter || typeFilter ? 'Try adjusting your filters.' : 'No appointments found. Use the Book Appointment menu to schedule one.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Active ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>

          {[{ key: 'upcoming', items: upcoming }, { key: 'past', items: past }].map(({ key, items }) => (
            <TabsContent key={key} value={key} className="space-y-4 mt-4">
              {items.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No {key} appointments
                  </CardContent>
                </Card>
              ) : items.map(apt => {
                const sc = STATUS_CONFIG[apt.status] || { color: 'text-gray-800', bg: 'bg-gray-100', label: apt.status };
                const isExpanded = expandedId === apt._id;

                return (
                  <Card key={apt._id} className={`border-l-4 hover:shadow-lg transition-shadow ${apt.status === 'APPROVED' ? 'border-l-green-500' :
                      apt.status === 'PENDING_APPROVAL' ? 'border-l-yellow-500' :
                        apt.status === 'REJECTED' ? 'border-l-red-500' :
                          apt.status === 'COMPLETED' ? 'border-l-gray-400' :
                            apt.status === 'RESCHEDULED' ? 'border-l-blue-500' :
                              'border-l-orange-500'
                    }`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <CardTitle className="text-lg text-gray-900">
                              {TYPE_LABELS[apt.appointmentType] || apt.appointmentType}
                            </CardTitle>
                            <Badge className={`${sc.bg} ${sc.color} border-0`}>{sc.label}</Badge>
                            <Badge className={apt.mode === 'ONLINE' ? 'bg-blue-100 text-blue-800 border-0' : 'bg-green-100 text-green-800 border-0'}>
                              {apt.mode === 'ONLINE' ? <><Video className="w-3 h-3 mr-1" /> Online</> : <><MapPin className="w-3 h-3 mr-1" /> In-Person</>}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{getProfName(apt.professional)}</p>
                          {apt.professional.specialization && (
                            <p className="text-xs text-gray-500">{apt.professional.specialization}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <div className="flex items-center gap-1 justify-end">
                            <CalendarIcon className="w-4 h-4" />
                            {new Date(apt.finalDate || apt.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <Clock className="w-4 h-4" />
                            {apt.finalTime || apt.preferredTime}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Patient</p>
                          <p className="font-medium text-gray-900">
                            {apt.childInfo ? `${apt.childInfo.firstName} ${apt.childInfo.lastName}` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Reason</p>
                          <p className="text-gray-700 line-clamp-2">{apt.reason}</p>
                        </div>
                      </div>

                      {apt.rejectionReason && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs text-red-600 font-medium mb-1">Rejection Reason:</p>
                          <p className="text-sm text-red-800">{apt.rejectionReason}</p>
                        </div>
                      )}

                      {apt.completionNotes && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-green-600 font-medium mb-1">Completion Notes:</p>
                          <p className="text-sm text-green-800">{apt.completionNotes}</p>
                        </div>
                      )}

                      {isExpanded && <AppointmentTimeline appointment={apt} />}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : apt._id)}
                        >
                          {isExpanded ? 'Hide Details' : 'View History'}
                        </Button>
                        {(apt.status === 'PENDING_APPROVAL' || apt.status === 'APPROVED' || apt.status === 'RESCHEDULED') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleCancel(apt._id)}
                          >
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.pages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Booking Modal - only shown in formOnly (Book Appointment) view */}
      {formOnly && showBooking && (
        <BookingForm
          children={children}
          onClose={() => setShowBooking(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
