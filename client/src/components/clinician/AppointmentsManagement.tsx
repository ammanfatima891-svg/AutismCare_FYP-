import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Calendar, Clock, MapPin, Video, CheckCircle, X, RefreshCw, Eye, ChevronLeft, ChevronRight, Filter, AlertCircle } from 'lucide-react';
import { appointmentAPI } from '../../api';
import { APPOINTMENT_STATUS, normalizeAppointmentStatus } from '../../utils/workflowStatus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: 'text-accent-foreground', bg: 'bg-accent/10', label: 'Pending' },
  APPROVED: { color: 'text-primary', bg: 'bg-secondary', label: 'Approved' },
  REJECTED: { color: 'text-destructive', bg: 'bg-muted', label: 'Rejected' },
  COMPLETED: { color: 'text-foreground', bg: 'bg-muted', label: 'Completed' },
  CANCELLED: { color: 'text-destructive', bg: 'bg-muted', label: 'Cancelled' },
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

// ─── Main Component ──────────────────────────────────────────────────────────

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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Appointments Management</h2>
        <p className="text-muted-foreground">Review and manage patient appointment requests</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter:</span>
            </div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="input h-9 w-auto px-3 py-1.5 text-sm"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            {statusFilter && (
              <button onClick={() => { setStatusFilter(''); setPage(1); }} className="text-xs text-primary hover:underline">
                Clear
              </button>
            )}
            <div className="ml-auto text-sm text-muted-foreground">
              {pagination.total} appointment(s)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No appointments found</h3>
            <p className="text-muted-foreground">{statusFilter ? 'Try adjusting your filters.' : 'No appointments have been assigned to you yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map(apt => {
            const normStatus = normalizeAppointmentStatus(apt.status);
            const sc = STATUS_CONFIG[normStatus] || { color: 'text-foreground', bg: 'bg-muted', label: normStatus || String(apt.status) };
            return (
              <Card key={apt._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left: Patient info */}
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-secondary text-primary font-semibold">
                          {getChildName(apt).split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{getChildName(apt)}</h3>
                        <p className="text-sm text-muted-foreground">Parent: {getParentName(apt)}</p>
                        {apt.parent?.email && <p className="text-xs text-muted-foreground">{apt.parent.email}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`${sc.bg} ${sc.color} border-0`}>{sc.label}</Badge>
                          <Badge className="bg-muted text-foreground border-0">
                            {TYPE_LABELS[apt.appointmentType] || apt.appointmentType}
                          </Badge>
                          <Badge className={apt.mode === 'ONLINE' ? 'bg-secondary text-primary border-0' : 'bg-muted text-foreground border-0'}>
                            {apt.mode === 'ONLINE' ? 'Online' : 'In-Person'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Right: Date + Actions */}
                    <div className="text-right flex flex-col items-end gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(apt.finalDate || apt.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-4 w-4" />
                          {apt.finalTime || apt.preferredTime}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {normStatus === APPOINTMENT_STATUS.PENDING && (
                          <>
                            <Button size="sm" variant="default" onClick={() => openModal('approve', apt)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-muted" onClick={() => openModal('reject', apt)}>
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {normStatus === APPOINTMENT_STATUS.APPROVED && (
                          <>
                            <Button size="sm" variant="default" onClick={() => openModal('complete', apt)}>
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
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Reason / Symptoms</p>
                    <p className="text-sm text-foreground">{apt.reason}</p>
                  </div>

                  {apt.rejectionReason && (
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-destructive mb-1">Rejection Reason</p>
                      <p className="text-sm text-destructive">{apt.rejectionReason}</p>
                    </div>
                  )}
                  {apt.completionNotes && (
                    <div className="mt-2 p-3 bg-primary/20 rounded-lg">
                      <p className="text-xs text-primary mb-1">Completion Notes</p>
                      <p className="text-sm text-primary">{apt.completionNotes}</p>
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
          <span className="text-sm text-muted-foreground">Page {page} of {pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Portaled dialog: `fixed` inside `main` with backdrop-blur would paint at document end */}
      <Dialog
        open={Boolean(activeModal)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setModalData({});
            setActionError('');
          }
        }}
      >
        <DialogContent
          key={activeModal ? `${activeModal.appointment._id}-${activeModal.type}` : 'appointment-action'}
          className="max-h-[min(90dvh,48rem)] gap-4 overflow-y-auto bg-card p-6 sm:max-w-lg"
        >
          {activeModal ? (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize">{activeModal.type} appointment</DialogTitle>
                <DialogDescription>
                  {getChildName(activeModal.appointment)} —{' '}
                  {TYPE_LABELS[activeModal.appointment.appointmentType] || activeModal.appointment.appointmentType}
                </DialogDescription>
              </DialogHeader>

              {actionError && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
                </div>
              )}

              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>
                  <span className="font-medium">Patient:</span> {getChildName(activeModal.appointment)}
                </p>
                <p>
                  <span className="font-medium">Type:</span> {TYPE_LABELS[activeModal.appointment.appointmentType]}
                </p>
                <p>
                  <span className="font-medium">Date:</span>{' '}
                  {new Date(activeModal.appointment.preferredDate).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-medium">Time:</span> {activeModal.appointment.preferredTime}
                </p>
              </div>

              {activeModal.type === 'approve' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Optionally set a different date/time:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      placeholder="Final date"
                      onChange={(e) => setModalData((p: any) => ({ ...p, finalDate: e.target.value }))}
                      className="input"
                    />
                    <input
                      type="time"
                      onChange={(e) => setModalData((p: any) => ({ ...p, finalTime: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
              )}

              {activeModal.type === 'reject' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Rejection reason *</label>
                  <textarea
                    rows={3}
                    required
                    onChange={(e) => setModalData((p: any) => ({ ...p, rejectionReason: e.target.value }))}
                    className="input h-auto py-3"
                    placeholder="Provide a reason..."
                  />
                </div>
              )}

              {activeModal.type === 'reschedule' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">New date *</label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setModalData((p: any) => ({ ...p, newDate: e.target.value }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">New time *</label>
                      <input
                        type="time"
                        required
                        onChange={(e) => setModalData((p: any) => ({ ...p, newTime: e.target.value }))}
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeModal.type === 'complete' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Completion notes</label>
                  <textarea
                    rows={3}
                    onChange={(e) => setModalData((p: any) => ({ ...p, completionNotes: e.target.value }))}
                    className="input h-auto py-3"
                    placeholder="Session notes, observations..."
                  />
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    setActiveModal(null);
                    setModalData({});
                    setActionError('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={activeModal.type === 'reject' ? 'destructive' : 'default'}
                  className="flex-1 sm:flex-none"
                  disabled={actionLoading}
                  onClick={() => handleAction(activeModal.type, activeModal.appointment._id)}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${activeModal.type}`}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <DialogHeader>
              <DialogTitle className="sr-only">Appointment action</DialogTitle>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
