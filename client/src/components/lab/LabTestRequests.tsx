import { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, AlertCircle, ClipboardList, Clock, FileUp, CheckCircle, Calendar, User as UserIcon, Baby, Stethoscope } from 'lucide-react';
import { labAPI } from '../../api';

interface LabTestRequestsProps {
    onViewRequest: (requestId: string) => void;
}

interface TestRequest {
    _id: string;
    childName: string;
    childAge: number;
    testType: string;
    status: string;
    createdAt: string;
    clinicianId?: { firstName: string; lastName: string; email: string };
    parentId?: { firstName: string; lastName: string; email: string };
}

interface Pagination {
    total: number;
    page: number;
    pages: number;
}

const STATUS_OPTIONS = ['', 'PENDING', 'UPLOADED', 'RELEASED'];
const TEST_TYPE_OPTIONS = ['', 'EEG', 'Genetic', 'Behavioral', 'Blood', 'Urine', 'Imaging', 'Other'];

// Enhanced status badge with icons
const statusConfig: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    PENDING: { bg: 'bg-accent/10', text: 'text-accent-foreground', border: 'border-border', icon: Clock },
    UPLOADED: { bg: 'bg-secondary/60', text: 'text-primary', border: 'border-border', icon: FileUp },
    RELEASED: { bg: 'bg-secondary', text: 'text-primary', border: 'border-border', icon: CheckCircle },
};

// Skeleton loader component
function SkeletonCard() {
    return (
        <div className="bg-card rounded-xl shadow-sm border p-6 animate-pulse">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="h-5 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                </div>
                <div className="h-6 bg-muted rounded-full w-20"></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="h-3 bg-muted rounded w-16 mb-1"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                </div>
                <div>
                    <div className="h-3 bg-muted rounded w-16 mb-1"></div>
                    <div className="h-4 bg-muted rounded w-28"></div>
                </div>
            </div>
            <div className="h-9 bg-muted rounded-lg w-full"></div>
        </div>
    );
}

export function LabTestRequests({ onViewRequest }: LabTestRequestsProps) {
    const [requests, setRequests] = useState<TestRequest[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [testTypeFilter, setTestTypeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchRequests(1);
    }, [statusFilter, testTypeFilter, startDate, endDate]);

    const fetchRequests = async (page: number) => {
        try {
            setLoading(true);
            setError('');
            const params: any = { page, limit: 12 };
            if (statusFilter) params.status = statusFilter;
            if (testTypeFilter) params.testType = testTypeFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const { data } = await labAPI.getRequests(params);
            setRequests(data.data);
            setPagination(data.pagination);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load test requests');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">Test Requests</h2>
                <p className="text-muted-foreground mt-1">View and manage laboratory test requests from clinicians</p>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-xl shadow-sm border p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Filters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input w-full px-3 py-2 text-sm"
                        >
                            <option value="">All Statuses</option>
                            {STATUS_OPTIONS.filter(Boolean).map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Test Type</label>
                        <select
                            value={testTypeFilter}
                            onChange={(e) => setTestTypeFilter(e.target.value)}
                            className="input w-full px-3 py-2 text-sm"
                        >
                            <option value="">All Types</option>
                            {TEST_TYPE_OPTIONS.filter(Boolean).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="input w-full px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="input w-full px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 flex items-center gap-3 p-4 bg-muted text-destructive rounded-lg border">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Loading State - Skeleton Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-card rounded-xl shadow-sm border py-16 text-center">
                    <ClipboardList className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium text-lg">No test requests found</p>
                    <p className="text-muted-foreground text-sm mt-1">Adjust your filters or check back later</p>
                </div>
            ) : (
                <>
                    {/* Enhanced Card Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        {requests.map((req) => {
                            const statusCfg = statusConfig[req.status] || statusConfig.PENDING;
                            const StatusIcon = statusCfg.icon;

                            return (
                                <div
                                    key={req._id}
                                    className="group bg-card rounded-xl shadow-sm border p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                                    onClick={() => onViewRequest(req._id)}
                                >
                                    {/* Header with status */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Baby className="w-4 h-4 text-primary" />
                                                <h3 className="text-lg font-bold text-foreground">{req.childName}</h3>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Age: {req.childAge} years</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {req.status}
                                        </span>
                                    </div>

                                    {/* Test type badge */}
                                    <div className="mb-4">
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
                                            <ClipboardList className="w-3.5 h-3.5" />
                                            {req.testType}
                                        </span>
                                    </div>

                                    {/* Info grid */}
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Stethoscope className="w-4 h-4 text-primary flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground">Clinician</p>
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {req.clinicianId
                                                        ? `${req.clinicianId.firstName} ${req.clinicianId.lastName}`
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-xs text-muted-foreground">Requested</p>
                                                <p className="text-sm font-medium text-foreground">{formatDate(req.createdAt)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* View button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewRequest(req._id);
                                        }}
                                        className="group-hover:shadow-md flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View Details
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-between bg-card rounded-xl shadow-sm border px-6 py-4">
                            <p className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchRequests(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="p-2 rounded-lg border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => fetchRequests(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.pages}
                                    className="p-2 rounded-lg border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
