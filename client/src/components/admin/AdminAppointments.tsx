import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, Clock, Users, CheckCircle, XCircle, BarChart3, Filter, ChevronLeft, ChevronRight, Activity, Clock3 } from 'lucide-react';
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

interface Stats {
    total: number;
    byStatus: {
        pending: number;
        approved: number;
        rejected: number;
        completed: number;
        cancelled: number;
        rescheduled: number;
    };
    byType: Record<string, number>;
    byRole: Record<string, number>;
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
    parent?: { firstName: string; lastName: string; email: string };
    professional?: { firstName?: string; lastName?: string; labName?: string; role: string };
    createdAt: string;
}

export function AdminAppointments() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 0 });

    const fetchStats = async () => {
        try {
            const res = await appointmentAPI.getStats();
            setStats(res.data.data);
        } catch { setStats(null); }
    };

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: 15 };
            if (statusFilter) params.status = statusFilter;
            if (typeFilter) params.type = typeFilter;
            const res = await appointmentAPI.getAll(params);
            setAppointments(res.data.data);
            setPagination(res.data.pagination);
        } catch { setAppointments([]); }
        finally { setLoading(false); }
    }, [page, statusFilter, typeFilter]);

    useEffect(() => { fetchStats(); fetchAppointments(); }, [fetchAppointments]);

    const getProfName = (a: Appointment) => a.professional ? (a.professional.labName || `${a.professional.firstName} ${a.professional.lastName}`) : 'N/A';
    const getParentName = (a: Appointment) => a.parent ? `${a.parent.firstName} ${a.parent.lastName}` : 'N/A';

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Statistics & Overview</h2>
                <p className="text-gray-600">Monitor all appointments across the system</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-indigo-600 font-medium">Total</p>
                                    <p className="text-3xl font-bold text-indigo-900">{stats.total}</p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-indigo-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-yellow-600 font-medium">Pending</p>
                                    <p className="text-3xl font-bold text-yellow-900">{stats.byStatus.pending}</p>
                                </div>
                                <Clock3 className="h-8 w-8 text-yellow-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Completed</p>
                                    <p className="text-3xl font-bold text-green-900">{stats.byStatus.completed}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-600 font-medium">Cancelled</p>
                                    <p className="text-3xl font-bold text-red-900">{stats.byStatus.cancelled}</p>
                                </div>
                                <XCircle className="h-8 w-8 text-red-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Detailed Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base">By Type</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {Object.entries(TYPE_LABELS).map(([key, label]) => {
                                    const count = stats.byType[key] || 0;
                                    const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                    return (
                                        <div key={key}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">{label}</span>
                                                <span className="font-medium">{count}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-base">By Status</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(stats.byStatus).map(([key, count]) => {
                                    const scKey = key === 'pending' ? 'PENDING_APPROVAL' : key.toUpperCase();
                                    const sc = STATUS_CONFIG[scKey] || { bg: 'bg-gray-100', color: 'text-gray-700', label: key };
                                    return (
                                        <div key={key} className={`${sc.bg} px-3 py-2 rounded-lg flex justify-between items-center`}>
                                            <span className={`text-sm capitalize ${sc.color}`}>{key}</span>
                                            <span className={`text-lg font-bold ${sc.color}`}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* All Appointments Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">All Appointments</CardTitle>
                        <div className="flex gap-3 items-center">
                            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                className="px-3 py-1.5 border rounded-lg text-sm">
                                <option value="">All Statuses</option>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                                className="px-3 py-1.5 border rounded-lg text-sm">
                                <option value="">All Types</option>
                                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No appointments found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                        <th className="pb-3 font-medium">Date</th>
                                        <th className="pb-3 font-medium">Type</th>
                                        <th className="pb-3 font-medium">Parent</th>
                                        <th className="pb-3 font-medium">Professional</th>
                                        <th className="pb-3 font-medium">Mode</th>
                                        <th className="pb-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map(apt => {
                                        const sc = STATUS_CONFIG[apt.status] || { bg: 'bg-gray-100', color: 'text-gray-700', label: apt.status };
                                        return (
                                            <tr key={apt._id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-3">
                                                    <div>{new Date(apt.finalDate || apt.preferredDate).toLocaleDateString()}</div>
                                                    <div className="text-xs text-gray-400">{apt.finalTime || apt.preferredTime}</div>
                                                </td>
                                                <td className="py-3">
                                                    <Badge className="bg-purple-100 text-purple-800 border-0">{TYPE_LABELS[apt.appointmentType] || apt.appointmentType}</Badge>
                                                </td>
                                                <td className="py-3">{getParentName(apt)}</td>
                                                <td className="py-3">{getProfName(apt)}</td>
                                                <td className="py-3">{apt.mode === 'ONLINE' ? 'Online' : 'In-Person'}</td>
                                                <td className="py-3"><Badge className={`${sc.bg} ${sc.color} border-0`}>{sc.label}</Badge></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                            <span className="text-sm text-gray-600">Page {page} of {pagination.pages}</span>
                            <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
