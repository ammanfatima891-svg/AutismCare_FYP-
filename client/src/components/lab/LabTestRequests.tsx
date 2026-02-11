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
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
    UPLOADED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: FileUp },
    RELEASED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
};

// Skeleton loader component
function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                </div>
            </div>
            <div className="h-9 bg-gray-200 rounded-lg w-full"></div>
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
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Test Requests</h2>
                <p className="text-gray-500 mt-1">View and manage laboratory test requests from clinicians</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Filters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                        >
                            <option value="">All Statuses</option>
                            {STATUS_OPTIONS.filter(Boolean).map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Test Type</label>
                        <select
                            value={testTypeFilter}
                            onChange={(e) => setTestTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                        >
                            <option value="">All Types</option>
                            {TEST_TYPE_OPTIONS.filter(Boolean).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 text-center">
                    <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium text-lg">No test requests found</p>
                    <p className="text-gray-400 text-sm mt-1">Adjust your filters or check back later</p>
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
                                    className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                                    onClick={() => onViewRequest(req._id)}
                                >
                                    {/* Header with status */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Baby className="w-4 h-4 text-teal-600" />
                                                <h3 className="text-lg font-bold text-gray-900">{req.childName}</h3>
                                            </div>
                                            <p className="text-xs text-gray-500">Age: {req.childAge} years</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {req.status}
                                        </span>
                                    </div>

                                    {/* Test type badge */}
                                    <div className="mb-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200">
                                            <ClipboardList className="w-3.5 h-3.5" />
                                            {req.testType}
                                        </span>
                                    </div>

                                    {/* Info grid */}
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Stethoscope className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-400">Clinician</p>
                                                <p className="text-sm font-medium text-gray-700 truncate">
                                                    {req.clinicianId
                                                        ? `${req.clinicianId.firstName} ${req.clinicianId.lastName}`
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-400">Requested</p>
                                                <p className="text-sm font-medium text-gray-700">{formatDate(req.createdAt)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* View button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewRequest(req._id);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all shadow-sm group-hover:shadow-md"
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
                        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4">
                            <p className="text-sm text-gray-500">
                                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchRequests(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => fetchRequests(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.pages}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
