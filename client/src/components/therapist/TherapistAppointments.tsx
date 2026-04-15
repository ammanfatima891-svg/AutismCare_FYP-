import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Calendar, Clock, CheckCircle, X, RefreshCw, Filter, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { appointmentAPI } from '../../api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    PENDING_APPROVAL: { color: 'text-accent-foreground', bg: 'bg-accent/10', label: 'Pending' },
    APPROVED: { color: 'text-primary', bg: 'bg-secondary', label: 'Approved' },
    REJECTED: { color: 'text-destructive', bg: 'bg-muted', label: 'Rejected' },
    RESCHEDULED: { color: 'text-primary', bg: 'bg-secondary/70', label: 'Rescheduled' },
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
                case 'approve': await appointmentAPI.approve(id, { finalDate: modalData.finalDate, finalTime: modalData.finalTime }); break;
                case 'reject':
                    if (!modalData.rejectionReason?.trim()) { setActionError('Rejection reason is required'); setActionLoading(false); return; }
                    await appointmentAPI.reject(id, { rejectionReason: modalData.rejectionReason }); break;
                case 'reschedule':
                    if (!modalData.newDate || !modalData.newTime) { setActionError('Date and time are required'); setActionLoading(false); return; }
                    await appointmentAPI.reschedule(id, { newDate: modalData.newDate, newTime: modalData.newTime }); break;
                case 'complete':
                    await appointmentAPI.complete(id, { completionNotes: modalData.completionNotes || '' }); break;
            }
            setActiveModal(null); setModalData({}); fetchAppointments();
        } catch (err: any) {
            setActionError(err.response?.data?.message || 'Action failed');
        } finally { setActionLoading(false); }
    };

    const getChildName = (a: Appointment) => a.childInfo ? `${a.childInfo.firstName} ${a.childInfo.lastName}` : 'N/A';
    const getParentName = (a: Appointment) => a.parent ? `${a.parent.firstName} ${a.parent.lastName}` : 'N/A';

    return (
        <div className="space-y-6">
            <div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">Therapy Appointments</h2>
                <p className="text-muted-foreground">Manage therapy session requests and schedules</p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            className="input h-9 w-auto px-3 py-1.5 text-sm">
                            <option value="">All Statuses</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        {statusFilter && <button onClick={() => { setStatusFilter(''); setPage(1); }} className="text-xs text-primary hover:underline">Clear</button>}
                        <span className="ml-auto text-sm text-muted-foreground">{pagination.total} session(s)</span>
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : appointments.length === 0 ? (
                <Card><CardContent className="py-16 text-center text-muted-foreground"><Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium text-foreground mb-2">No sessions found</h3></CardContent></Card>
            ) : (
                <div className="grid gap-4">
                    {appointments.map(apt => {
                        const sc = STATUS_CONFIG[apt.status] || { color: 'text-foreground', bg: 'bg-muted', label: apt.status };
                        return (
                            <Card key={apt._id} className="hover:shadow-lg transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-12 w-12"><AvatarFallback className="bg-secondary text-primary font-semibold">{getChildName(apt).split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                                            <div>
                                                <h3 className="font-semibold text-lg text-foreground">{getChildName(apt)}</h3>
                                                <p className="text-sm text-muted-foreground">Parent: {getParentName(apt)}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge className={`${sc.bg} ${sc.color} border-0`}>{sc.label}</Badge>
                                                    <Badge className="bg-secondary/70 text-primary border-0">Therapy</Badge>
                                                    <Badge className={apt.mode === 'ONLINE' ? 'bg-secondary text-primary border-0' : 'bg-muted text-foreground border-0'}>{apt.mode === 'ONLINE' ? 'Online' : 'In-Person'}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> {new Date(apt.finalDate || apt.preferredDate).toLocaleDateString()}</div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1"><Clock className="h-4 w-4" /> {apt.finalTime || apt.preferredTime}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                {apt.status === 'PENDING_APPROVAL' && (
                                                    <>
                                                        <Button size="sm" variant="default" onClick={() => { setActiveModal({ type: 'approve', appointment: apt }); setModalData({}); setActionError(''); }}><CheckCircle className="h-4 w-4 mr-1" /> Approve</Button>
                                                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setActiveModal({ type: 'reject', appointment: apt }); setModalData({}); setActionError(''); }}><X className="h-4 w-4 mr-1" /> Reject</Button>
                                                    </>
                                                )}
                                                {(apt.status === 'APPROVED' || apt.status === 'RESCHEDULED') && (
                                                    <>
                                                        <Button size="sm" variant="default" onClick={() => { setActiveModal({ type: 'complete', appointment: apt }); setModalData({}); setActionError(''); }}><CheckCircle className="h-4 w-4 mr-1" /> Complete</Button>
                                                        <Button size="sm" variant="outline" onClick={() => { setActiveModal({ type: 'reschedule', appointment: apt }); setModalData({}); setActionError(''); }}><RefreshCw className="h-4 w-4 mr-1" /> Reschedule</Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 p-3 bg-muted rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Reason</p>
                                        <p className="text-sm text-foreground">{apt.reason}</p>
                                    </div>
                                    {apt.rejectionReason && <div className="mt-2 p-3 bg-muted rounded-lg"><p className="text-xs text-destructive mb-1">Rejection Reason</p><p className="text-sm text-destructive">{apt.rejectionReason}</p></div>}
                                    {apt.completionNotes && <div className="mt-2 p-3 bg-primary/20 rounded-lg"><p className="text-xs text-primary mb-1">Session Notes</p><p className="text-sm text-primary">{apt.completionNotes}</p></div>}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-4"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button><span className="text-sm text-muted-foreground">Page {page} of {pagination.pages}</span><Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button></div>
            )}

            {/* Action Modal */}
            {activeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-bold text-foreground capitalize">{activeModal.type} Session</h3>
                            <button onClick={() => setActiveModal(null)} className="p-2 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 form">
                            {actionError && <div className="p-3 bg-muted border rounded-lg flex items-center gap-2 text-destructive text-sm"><AlertCircle className="w-4 h-4" /> {actionError}</div>}
                            <div className="p-3 bg-muted rounded-lg text-sm">
                                <p><span className="font-medium">Patient:</span> {getChildName(activeModal.appointment)}</p>
                                <p><span className="font-medium">Date:</span> {new Date(activeModal.appointment.preferredDate).toLocaleDateString()}</p>
                                <p><span className="font-medium">Time:</span> {activeModal.appointment.preferredTime}</p>
                            </div>
                            {activeModal.type === 'approve' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">Optionally set final date/time:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="date" onChange={e => setModalData((p: any) => ({ ...p, finalDate: e.target.value }))} className="input" />
                                        <input type="time" onChange={e => setModalData((p: any) => ({ ...p, finalTime: e.target.value }))} className="input" />
                                    </div>
                                </div>
                            )}
                            {activeModal.type === 'reject' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Rejection Reason *</label>
                                    <textarea rows={3} onChange={e => setModalData((p: any) => ({ ...p, rejectionReason: e.target.value }))} className="input h-auto py-3" placeholder="Provide a reason..." />
                                </div>
                            )}
                            {activeModal.type === 'reschedule' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-foreground mb-1">New Date *</label><input type="date" min={new Date().toISOString().split('T')[0]} onChange={e => setModalData((p: any) => ({ ...p, newDate: e.target.value }))} className="input" /></div>
                                    <div><label className="block text-sm font-medium text-foreground mb-1">New Time *</label><input type="time" onChange={e => setModalData((p: any) => ({ ...p, newTime: e.target.value }))} className="input" /></div>
                                </div>
                            )}
                            {activeModal.type === 'complete' && (
                                <div><label className="block text-sm font-medium text-foreground mb-1">Session Notes</label><textarea rows={3} onChange={e => setModalData((p: any) => ({ ...p, completionNotes: e.target.value }))} className="input h-auto py-3" placeholder="Notes from the session..." /></div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setActiveModal(null)}>Cancel</Button>
                                <Button variant={activeModal.type === 'reject' ? 'destructive' : 'default'} className="flex-1" disabled={actionLoading} onClick={() => handleAction(activeModal.type, activeModal.appointment._id)}>
                                    {actionLoading ? 'Processing...' : `Confirm`}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
