import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Calendar, Clock, MapPin, Video, CheckCircle, X, RefreshCw, Eye, ChevronLeft, ChevronRight, Filter, AlertCircle } from 'lucide-react';
import { appointmentAPI } from '../../api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING_APPROVAL: { color: 'text-yellow-800', bg: 'bg-yellow-100', label: 'Pending' },
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
  parent: { _id: string; firstName: string; lastName: string; email: string; phoneNumber?: string };
  childInfo?: { firstName: string; lastName: string; dateOfBirth: string; gender?: string };
  rescheduleHistory?: any[];
  auditTrail?: any[];
  createdAt: string;
}


// ─── Action Modal ────────────────────────────────────────────────────────────

function ActionModal({ title, appointment, onClose, onSubmit, children: content }: {
  title: string;
  appointment: Appointment;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {content}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const mockAppointments: Appointment[] = [];


export function AppointmentsManagement() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });


  // Modal states
  const [activeModal, setActiveModal] = useState<{ type: string; appointment: Appointment } | null>(null);
  const [modalData, setModalData] = useState<any>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const filteredAppointments = mockAppointments;


  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await appointmentAPI.getProfessionalAppointments(params);
      setAppointments(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleAction = async (type: string, id: string) => {
    setActionLoading(true);
    setActionError('');
    try {
      switch (type) {
        case 'approve':
          await appointmentAPI.approve(id, {
            finalDate: modalData.finalDate,
            finalTime: modalData.finalTime
          });
          break;
        case 'reject':
          if (!modalData.rejectionReason?.trim()) {
            setActionError('Rejection reason is required');
            setActionLoading(false);
            return;
          }
          await appointmentAPI.reject(id, { rejectionReason: modalData.rejectionReason });
          break;
        case 'reschedule':
          if (!modalData.newDate || !modalData.newTime) {
            setActionError('New date and time are required');
            setActionLoading(false);
            return;
          }
          await appointmentAPI.reschedule(id, { newDate: modalData.newDate, newTime: modalData.newTime });
          break;
        case 'complete':
          await appointmentAPI.complete(id, { completionNotes: modalData.completionNotes || '' });
          break;
      }
      setActiveModal(null);
      setModalData({});
      fetchAppointments();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (type: string, appointment: Appointment) => {
    setActiveModal({ type, appointment });
    setModalData({});
    setActionError('');
  };

  const getChildName = (apt: Appointment) =>
    apt.childInfo ? `${apt.childInfo.firstName} ${apt.childInfo.lastName}` : 'N/A';

  const getParentName = (apt: Appointment) =>
    apt.parent ? `${apt.parent.firstName} ${apt.parent.lastName}` : 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-blue-600 mb-2">Appointments Management</h2>
        <p className="text-gray-600">Review and manage patient appointment requests</p>
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
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            {statusFilter && (
              <button onClick={() => { setStatusFilter(''); setPage(1); }} className="text-xs text-blue-600 hover:underline">
                Clear
              </button>
            )}
            <div className="ml-auto text-sm text-gray-500">
              {pagination.total} appointment(s)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-500">{statusFilter ? 'Try adjusting your filters.' : 'No appointments have been assigned to you yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map(apt => {
            const sc = STATUS_CONFIG[apt.status] || { color: 'text-gray-800', bg: 'bg-gray-100', label: apt.status };
            return (
              <Card key={apt._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left: Patient info */}
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                          {getChildName(apt).split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{getChildName(apt)}</h3>
                        <p className="text-sm text-gray-500">Parent: {getParentName(apt)}</p>
                        {apt.parent?.email && <p className="text-xs text-gray-400">{apt.parent.email}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`${sc.bg} ${sc.color} border-0`}>{sc.label}</Badge>
                          <Badge className="bg-purple-100 text-purple-800 border-0">
                            {TYPE_LABELS[apt.appointmentType] || apt.appointmentType}
                          </Badge>
                          <Badge className={apt.mode === 'ONLINE' ? 'bg-blue-50 text-blue-700 border-0' : 'bg-green-50 text-green-700 border-0'}>
                            {apt.mode === 'ONLINE' ? 'Online' : 'In-Person'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Right: Date + Actions */}
                    <div className="text-right flex flex-col items-end gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {new Date(apt.finalDate || apt.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Clock className="h-4 w-4" />
                          {apt.finalTime || apt.preferredTime}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {apt.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openModal('approve', apt)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => openModal('reject', apt)}>
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {(apt.status === 'APPROVED' || apt.status === 'RESCHEDULED') && (
                          <>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => openModal('complete', apt)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openModal('reschedule', apt)}>
                              <RefreshCw className="h-4 w-4 mr-1" /> Reschedule
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Reason / Symptoms</p>
                    <p className="text-sm text-gray-700">{apt.reason}</p>
                  </div>

                  {apt.rejectionReason && (
                    <div className="mt-2 p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-700">{apt.rejectionReason}</p>
                    </div>
                  )}
                  {apt.completionNotes && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-500 mb-1">Completion Notes</p>
                      <p className="text-sm text-green-700">{apt.completionNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">Page {page} of {pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Action Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900 capitalize">{activeModal.type} Appointment</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4" /> {actionError}
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p><span className="font-medium">Patient:</span> {getChildName(activeModal.appointment)}</p>
                <p><span className="font-medium">Type:</span> {TYPE_LABELS[activeModal.appointment.appointmentType]}</p>
                <p><span className="font-medium">Date:</span> {new Date(activeModal.appointment.preferredDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Time:</span> {activeModal.appointment.preferredTime}</p>
              </div>

              {activeModal.type === 'approve' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Optionally set a different date/time:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" placeholder="Final date"
                      onChange={e => setModalData((p: any) => ({ ...p, finalDate: e.target.value }))}
                      className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="time"
                      onChange={e => setModalData((p: any) => ({ ...p, finalTime: e.target.value }))}
                      className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              )}

              {activeModal.type === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
                  <textarea rows={3} required
                    onChange={e => setModalData((p: any) => ({ ...p, rejectionReason: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Provide a reason..." />
                </div>
              )}

              {activeModal.type === 'reschedule' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Date *</label>
                      <input type="date" required
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setModalData((p: any) => ({ ...p, newDate: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Time *</label>
                      <input type="time" required
                        onChange={e => setModalData((p: any) => ({ ...p, newTime: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {activeModal.type === 'complete' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes</label>
                  <textarea rows={3}
                    onChange={e => setModalData((p: any) => ({ ...p, completionNotes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Session notes, observations..." />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setActiveModal(null)}>Cancel</Button>
                <Button
                  className={`flex-1 ${activeModal.type === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    activeModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                      activeModal.type === 'reschedule' ? 'bg-blue-600 hover:bg-blue-700' :
                        'bg-green-600 hover:bg-green-700'
                    }`}
                  disabled={actionLoading}
                  onClick={() => handleAction(activeModal.type, activeModal.appointment._id)}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${activeModal.type}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
