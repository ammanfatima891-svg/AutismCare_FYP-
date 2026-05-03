import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Calendar, Clock, CheckCircle, RefreshCw, Filter, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { appointmentAPI } from '../../api';

/** Align with server `APPOINTMENT_STATUS` (PENDING, not legacy PENDING_APPROVAL). */
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: 'text-accent-foreground', bg: 'bg-accent/10', label: 'Pending' },
  APPROVED: { color: 'text-primary', bg: 'bg-secondary', label: 'Approved' },
  REJECTED: { color: 'text-destructive', bg: 'bg-muted', label: 'Rejected' },
  COMPLETED: { color: 'text-foreground', bg: 'bg-muted', label: 'Completed' },
  CANCELLED: { color: 'text-destructive', bg: 'bg-muted', label: 'Cancelled' },
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
  parent: { _id: string; firstName: string; lastName: string; email: string };
  childInfo?: { firstName: string; lastName: string; dateOfBirth: string; gender?: string };
  createdAt: string;
}

export function TherapistAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [activeModal, setActiveModal] = useState<{ type: string; appointment: Appointment } | null>(null);
  const [modalData, setModalData] = useState<Record<string, unknown>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 10 };
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

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const closeModal = () => {
    setActiveModal(null);
    setModalData({});
    setActionError('');
  };

  const handleAction = async (type: string, id: string) => {
    setActionLoading(true);
    setActionError('');
    try {
      switch (type) {
        case 'approve':
          await appointmentAPI.approve(id, {
            finalDate: modalData.finalDate as string | undefined,
            finalTime: modalData.finalTime as string | undefined,
          });
          break;
        case 'reject':
          if (!String(modalData.rejectionReason || '').trim()) {
            setActionError('Rejection reason is required');
            setActionLoading(false);
            return;
          }
          await appointmentAPI.reject(id, { rejectionReason: String(modalData.rejectionReason).trim() });
          break;
        case 'reschedule':
          if (!modalData.newDate || !modalData.newTime) {
            setActionError('Date and time are required');
            setActionLoading(false);
            return;
          }
          await appointmentAPI.reschedule(id, { newDate: modalData.newDate, newTime: modalData.newTime });
          break;
        case 'complete':
          await appointmentAPI.complete(id, { completionNotes: String(modalData.completionNotes || '') });
          break;
        default:
          break;
      }
      closeModal();
      fetchAppointments();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getChildName = (a: Appointment) =>
    a.childInfo ? `${a.childInfo.firstName} ${a.childInfo.lastName}` : 'N/A';
  const getParentName = (a: Appointment) => (a.parent ? `${a.parent.firstName} ${a.parent.lastName}` : 'N/A');

  const modalOpen = Boolean(activeModal);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Therapy Appointments</h2>
        <p className="text-muted-foreground">Manage therapy session requests and schedules</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input h-9 w-auto px-3 py-1.5 text-sm"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            {statusFilter ? (
              <button type="button" onClick={() => { setStatusFilter(''); setPage(1); }} className="text-xs text-primary hover:underline">
                Clear
              </button>
            ) : null}
            <span className="ml-auto text-sm text-muted-foreground">{pagination.total} session(s)</span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium text-foreground">No sessions found</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map((apt) => {
            const sc = STATUS_CONFIG[apt.status] || { color: 'text-foreground', bg: 'bg-muted', label: apt.status };
            return (
              <Card key={apt._id} className="transition-shadow hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-secondary font-semibold text-primary">
                          {getChildName(apt)
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{getChildName(apt)}</h3>
                        <p className="text-sm text-muted-foreground">Parent: {getParentName(apt)}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge className={`${sc.bg} ${sc.color} border-0`}>{sc.label}</Badge>
                          <Badge className="border-0 bg-secondary/70 text-primary">Therapy</Badge>
                          <Badge
                            className={
                              apt.mode === 'ONLINE' ? 'border-0 bg-secondary text-primary' : 'border-0 bg-muted text-foreground'
                            }
                          >
                            {apt.mode === 'ONLINE' ? 'Online' : 'In-Person'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 text-right">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" /> {new Date(apt.finalDate || apt.preferredDate).toLocaleDateString()}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" /> {apt.finalTime || apt.preferredTime}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {apt.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setActiveModal({ type: 'approve', appointment: apt });
                                setModalData({});
                                setActionError('');
                              }}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => {
                                setActiveModal({ type: 'reject', appointment: apt });
                                setModalData({});
                                setActionError('');
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {apt.status === 'APPROVED' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setActiveModal({ type: 'complete', appointment: apt });
                                setModalData({});
                                setActionError('');
                              }}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" /> Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveModal({ type: 'reschedule', appointment: apt });
                                setModalData({});
                                setActionError('');
                              }}
                            >
                              <RefreshCw className="mr-1 h-4 w-4" /> Reschedule
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Reason</p>
                    <p className="text-sm text-foreground">{apt.reason}</p>
                  </div>
                  {apt.rejectionReason ? (
                    <div className="mt-2 rounded-lg bg-muted p-3">
                      <p className="mb-1 text-xs text-destructive">Rejection Reason</p>
                      <p className="text-sm text-destructive">{apt.rejectionReason}</p>
                    </div>
                  ) : null}
                  {apt.completionNotes ? (
                    <div className="mt-2 rounded-lg bg-primary/20 p-3">
                      <p className="mb-1 text-xs text-primary">Session Notes</p>
                      <p className="text-sm text-primary">{apt.completionNotes}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pagination.pages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          {activeModal ? (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize">{activeModal.type} session</DialogTitle>
                <DialogDescription>Confirm the action for this appointment request.</DialogDescription>
              </DialogHeader>
              {actionError ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
                </div>
              ) : null}
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>
                  <span className="font-medium">Patient:</span> {getChildName(activeModal.appointment)}
                </p>
                <p>
                  <span className="font-medium">Date:</span> {new Date(activeModal.appointment.preferredDate).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-medium">Time:</span> {activeModal.appointment.preferredTime}
                </p>
              </div>
              {activeModal.type === 'approve' ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Optionally set final date/time:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      className="input"
                      autoFocus
                      onChange={(e) => setModalData((p) => ({ ...p, finalDate: e.target.value }))}
                    />
                    <input
                      type="time"
                      className="input"
                      onChange={(e) => setModalData((p) => ({ ...p, finalTime: e.target.value }))}
                    />
                  </div>
                </div>
              ) : null}
              {activeModal.type === 'reject' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Rejection reason *</label>
                  <textarea
                    rows={3}
                    className="input h-auto py-3"
                    autoFocus
                    placeholder="Provide a reason..."
                    onChange={(e) => setModalData((p) => ({ ...p, rejectionReason: e.target.value }))}
                  />
                </div>
              ) : null}
              {activeModal.type === 'reschedule' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">New date *</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      className="input"
                      autoFocus
                      onChange={(e) => setModalData((p) => ({ ...p, newDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">New time *</label>
                    <input type="time" className="input" onChange={(e) => setModalData((p) => ({ ...p, newTime: e.target.value }))} />
                  </div>
                </div>
              ) : null}
              {activeModal.type === 'complete' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Session notes</label>
                  <textarea
                    rows={3}
                    className="input h-auto py-3"
                    autoFocus
                    placeholder="Notes from the session..."
                    onChange={(e) => setModalData((p) => ({ ...p, completionNotes: e.target.value }))}
                  />
                </div>
              ) : null}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={activeModal.type === 'reject' ? 'destructive' : 'default'}
                  disabled={actionLoading}
                  onClick={() => handleAction(activeModal.type, activeModal.appointment._id)}
                >
                  {actionLoading ? 'Processing…' : 'Confirm'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
