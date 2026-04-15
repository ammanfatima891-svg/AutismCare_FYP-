import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    FileText, Download, Clock, CheckCircle, AlertCircle,
    FlaskConical, Eye, Send, Baby, User, ChevronDown, ChevronUp,
    Filter, X, ShieldCheck, Plus, Search, Loader2, Sparkles
} from 'lucide-react';
import { labAPI, caseAPI } from '../../api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

interface Report {
    _id: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    releasedAt: string | null;
    labTechnicianId?: { firstName: string; lastName: string };
}

interface TestRequest {
    _id: string;
    childId: string;
    childName: string;
    childAge: number;
    testType: string;
    requestPurpose?: string;
    priority?: string;
    requestSummary?: string;
    requestedItems?: Array<{
        category: string;
        code?: string;
        name: string;
        whenIndicatedOnly?: boolean;
        typicalForASDWorkup?: boolean;
        indications?: string[];
        notes?: string;
    }>;
    notes: string;
    status: string;
    releasedToParent: boolean;
    createdAt: string;
    updatedAt: string;
    reportCount: number;
    parentId?: { firstName: string; lastName: string; email: string; phoneNumber?: string };
    reports?: Report[];
}

interface ParentChild {
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    age: number;
    /** Server-computed label e.g. "8 months old" for infants */
    ageLabel?: string;
}

interface ParentResult {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    children: ParentChild[];
}

type StatusFilter = 'ALL' | 'PENDING' | 'UPLOADED' | 'RELEASED';

const TEST_TYPES = ['EEG', 'Genetic', 'Behavioral', 'Blood', 'Urine', 'Imaging', 'Other'];

type RequestPurpose = 'ASD_DIAGNOSTIC_WORKUP' | 'CO_OCCURRING_CONDITIONS' | 'OTHER';
type Priority = 'ROUTINE' | 'URGENT';

const STANDARD_WORKUP_CATALOG: Array<{
    category: string;
    name: string;
    typicalForASDWorkup: boolean;
    whenIndicatedOnly: boolean;
    indications: string[];
}> = [
    // Core assessments / investigations (globally common in clinical pathways)
    { category: 'Audiology', name: 'Formal hearing assessment (audiology)', typicalForASDWorkup: true, whenIndicatedOnly: false, indications: ['Speech/language delay', 'Any concern for hearing', 'Baseline assessment'] },
    { category: 'Vision', name: 'Vision assessment / screening', typicalForASDWorkup: true, whenIndicatedOnly: false, indications: ['Developmental concerns', 'Any concern for vision'] },

    // Genetics (often recommended in many settings; still requires clinical context and local policy)
    { category: 'Genetics', name: 'Chromosomal microarray (CMA)', typicalForASDWorkup: true, whenIndicatedOnly: true, indications: ['Neurodevelopmental disorder', 'Dysmorphism / congenital anomalies', 'Family history'] },
    { category: 'Genetics', name: 'Fragile X testing (FMR1)', typicalForASDWorkup: true, whenIndicatedOnly: true, indications: ['Male with ASD / ID', 'Family history of Fragile X'] },
    { category: 'Genetics', name: 'Exome / genome sequencing (per genetics service)', typicalForASDWorkup: false, whenIndicatedOnly: true, indications: ['Negative first-tier testing', 'Syndromic features', 'Multiple congenital anomalies'] },

    // Labs (generally targeted)
    { category: 'Laboratory', name: 'Lead level (blood) – if exposure risk / pica', typicalForASDWorkup: false, whenIndicatedOnly: true, indications: ['Pica', 'High-risk housing/environment', 'Developmental delay with exposure risk'] },
    { category: 'Laboratory', name: 'Iron studies / ferritin – if pica / sleep issues', typicalForASDWorkup: false, whenIndicatedOnly: true, indications: ['Pica', 'Restless sleep', 'Suspected iron deficiency'] },
    { category: 'Laboratory', name: 'Thyroid function tests – if growth/motor delay or symptoms', typicalForASDWorkup: false, whenIndicatedOnly: true, indications: ['Motor delay', 'Symptoms of thyroid disease', 'Growth concerns'] },

    // Neurology / imaging (not routine)
    { category: 'Neurology', name: 'EEG (sleep-deprived if possible) – evaluate seizures/regression', typicalForASDWorkup: false, whenIndicatedOnly: true, indications: ['Seizure-like episodes', 'Language regression', 'Abnormal movements'] },
    { category: 'Imaging', name: 'Brain MRI – if focal neurologic signs / regression', typicalForASDWorkup: false, whenIndicatedOnly: true, indications: ['Focal neurologic signs', 'Macro/microcephaly', 'Developmental regression'] },

    // Co-occurring conditions tracking (coordination)
    { category: 'Sleep', name: 'Sleep assessment (questionnaire / referral) – insomnia, OSA symptoms', typicalForASDWorkup: false, whenIndicatedOnly: true, indications: ['Snoring', 'Daytime sleepiness', 'Severe insomnia'] },
    { category: 'GI', name: 'GI symptom evaluation / referral', typicalForASDWorkup: false, whenIndicatedOnly: true, indications: ['Chronic constipation', 'Abdominal pain', 'Feeding restriction'] },
    { category: 'Psychiatry', name: 'Screen for ADHD/anxiety/depression (age-appropriate tools)', typicalForASDWorkup: false, whenIndicatedOnly: true, indications: ['Inattention/hyperactivity', 'Anxiety symptoms', 'Mood concerns'] },
    { category: 'Developmental', name: 'Speech-language assessment / referral', typicalForASDWorkup: true, whenIndicatedOnly: false, indications: ['Communication delay', 'Baseline functional profile'] },
    { category: 'Developmental', name: 'Occupational therapy assessment (sensory/motor)', typicalForASDWorkup: true, whenIndicatedOnly: false, indications: ['Fine motor delay', 'Sensory concerns', 'ADLs difficulties'] },
];

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
    PENDING: { color: 'text-accent-foreground', bg: 'bg-accent/10', border: 'border-border', icon: Clock, label: 'Pending' },
    UPLOADED: { color: 'text-primary', bg: 'bg-secondary/60', border: 'border-border', icon: FileText, label: 'Report Uploaded' },
    RELEASED: { color: 'text-primary', bg: 'bg-secondary', border: 'border-border', icon: ShieldCheck, label: 'Reviewed & Released' },
};

export function ClinicianLabReports() {
    const [requests, setRequests] = useState<TestRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<StatusFilter>('ALL');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [detailData, setDetailData] = useState<Record<string, TestRequest>>({});
    const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
    const [releasing, setReleasing] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [confirmReleaseId, setConfirmReleaseId] = useState<string | null>(null);

    // ── Request form state ──
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [parentSearch, setParentSearch] = useState('');
    const [parentResults, setParentResults] = useState<ParentResult[]>([]);
    const [searchingParents, setSearchingParents] = useState(false);
    const [selectedParent, setSelectedParent] = useState<ParentResult | null>(null);
    const [selectedChild, setSelectedChild] = useState<ParentChild | null>(null);
    const [selectedTestType, setSelectedTestType] = useState('');
    const [requestPurpose, setRequestPurpose] = useState<RequestPurpose>('ASD_DIAGNOSTIC_WORKUP');
    const [priority, setPriority] = useState<Priority>('ROUTINE');
    const [catalogQuery, setCatalogQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<Array<{ category: string; name: string; typicalForASDWorkup: boolean; whenIndicatedOnly: boolean; indications: string[] }>>([]);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemCategory, setCustomItemCategory] = useState('Other');
    const [requestNotes, setRequestNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [resolvedCaseId, setResolvedCaseId] = useState<string | null>(null);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!selectedChild) {
            setResolvedCaseId(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await caseAPI.list();
                const rows = (data?.data || []) as Array<{ _id: string; childId: string }>;
                const match = rows.find((c) => String(c.childId) === String(selectedChild._id));
                if (!cancelled) setResolvedCaseId(match?._id ? String(match._id) : null);
            } catch {
                if (!cancelled) setResolvedCaseId(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedChild]);

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            setError('');
            const params: any = {};
            if (filter !== 'ALL') params.status = filter;
            const { data } = await labAPI.getClinicianRequests(params);
            setRequests(data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load lab requests');
        } finally {
            setLoading(false);
        }
    };

    // ── Parent search with debounce ──
    const handleParentSearch = (value: string) => {
        setParentSearch(value);
        setSelectedParent(null);
        setSelectedChild(null);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (value.trim().length < 2) {
            setParentResults([]);
            return;
        }
        searchTimeout.current = setTimeout(async () => {
            try {
                setSearchingParents(true);
                const { data } = await labAPI.searchParents(value.trim());
                setParentResults(data.data);
            } catch {
                setParentResults([]);
            } finally {
                setSearchingParents(false);
            }
        }, 400);
    };

    const selectParent = (parent: ParentResult) => {
        setSelectedParent(parent);
        setParentResults([]);
        setParentSearch(`${parent.firstName} ${parent.lastName}`);
        setSelectedChild(null);
    };

    const handleCreateRequest = async () => {
        if (!selectedParent || !selectedChild) return;

        const hasStructured = selectedItems.length > 0;
        const hasLegacy = !!selectedTestType;
        if (!hasStructured && !hasLegacy) return;
        try {
            setSubmitting(true);
            await labAPI.createTestRequest({
                parentId: selectedParent._id,
                childId: selectedChild._id,
                childName: `${selectedChild.firstName} ${selectedChild.lastName}`,
                childAge: selectedChild.age,
                ...(hasLegacy ? { testType: selectedTestType } : {}),
                requestPurpose,
                priority,
                ...(hasStructured
                    ? {
                        requestedItems: selectedItems.map((it) => ({
                            category: it.category,
                            name: it.name,
                            typicalForASDWorkup: it.typicalForASDWorkup,
                            whenIndicatedOnly: it.whenIndicatedOnly,
                            indications: it.indications,
                        })),
                    }
                    : {}),
                notes: requestNotes,
                ...(resolvedCaseId ? { caseId: resolvedCaseId } : {}),
            });
            setSuccessMsg('Lab test request created successfully!');
            setTimeout(() => setSuccessMsg(''), 4000);
            resetRequestForm();
            fetchRequests();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create test request');
        } finally {
            setSubmitting(false);
        }
    };

    const resetRequestForm = () => {
        setShowRequestForm(false);
        setParentSearch('');
        setParentResults([]);
        setSelectedParent(null);
        setSelectedChild(null);
        setSelectedTestType('');
        setRequestPurpose('ASD_DIAGNOSTIC_WORKUP');
        setPriority('ROUTINE');
        setCatalogQuery('');
        setSelectedItems([]);
        setCustomItemName('');
        setCustomItemCategory('Other');
        setRequestNotes('');
    };

    const toggleExpand = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);

        // Fetch detail if not cached
        if (!detailData[id]) {
            try {
                setLoadingDetail(id);
                const { data } = await labAPI.getClinicianRequestById(id);
                setDetailData(prev => ({ ...prev, [id]: data.data }));
            } catch (err) {
                console.error('Failed to load request detail:', err);
            } finally {
                setLoadingDetail(null);
            }
        }
    };

    const handleRelease = async (requestId: string) => {
        try {
            setReleasing(requestId);
            await labAPI.releaseReport(requestId);
            setSuccessMsg('Report released to parent successfully!');
            setTimeout(() => setSuccessMsg(''), 4000);

            // Refresh data
            await fetchRequests();
            // Clear cached detail so it refreshes on next expand
            setDetailData(prev => {
                const copy = { ...prev };
                delete copy[requestId];
                return copy;
            });
            setExpandedId(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to release report');
        } finally {
            setReleasing(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const filterTabs: { value: StatusFilter; label: string; count: number }[] = [
        { value: 'ALL', label: 'All Requests', count: requests.length },
        { value: 'PENDING', label: 'Pending', count: requests.filter(r => r.status === 'PENDING').length },
        { value: 'UPLOADED', label: 'Ready for Review', count: requests.filter(r => r.status === 'UPLOADED').length },
        { value: 'RELEASED', label: 'Released', count: requests.filter(r => r.status === 'RELEASED').length },
    ];

    if (loading && requests.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="rounded-xl bg-primary p-2.5 text-primary-foreground">
                            <FlaskConical className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground tracking-tight">Lab Reports</h2>
                            <p className="text-muted-foreground text-sm">Review and release lab test reports</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowRequestForm(true)}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                    >
                        <Plus className="w-4 h-4" />
                        Request Lab Test
                    </button>
                </div>
            </div>

            {/* Success message */}
            {successMsg && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-primary">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{successMsg}</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-muted text-destructive rounded-lg border">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground" />
                {filterTabs.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${filter === tab.value
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Empty state */}
            {requests.length === 0 ? (
                <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/[0.06] via-card to-card p-12 text-center shadow-sm">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-secondary blur-2xl" />
                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md ring-4 ring-primary/15">
                        <FlaskConical className="h-8 w-8" strokeWidth={1.75} />
                    </div>
                    <div className="relative mt-5 flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="text-lg font-semibold text-foreground">No lab requests yet</p>
                    </div>
                    <p className="relative mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
                        {filter !== 'ALL'
                            ? 'Nothing matches this filter. Try All requests or another status.'
                            : 'When you request investigations for a family, orders and uploads will show up here for review and release.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowRequestForm(true)}
                        className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        Request a lab test
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => {
                        const cfg = statusConfig[request.status] || statusConfig.PENDING;
                        const StatusIcon = cfg.icon;
                        const isExpanded = expandedId === request._id;
                        const detail = detailData[request._id];
                        const isLoadingThis = loadingDetail === request._id;

                        return (
                            <div
                                key={request._id}
                                className="bg-card rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Summary row */}
                                <button
                                    onClick={() => toggleExpand(request._id)}
                                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted transition-colors"
                                >
                                    {/* Test type badge */}
                                    <div className="flex-shrink-0 rounded-lg bg-muted p-2.5">
                                        <FlaskConical className="w-5 h-5 text-muted-foreground" />
                                    </div>

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-foreground">{request.testType}</span>
                                            <span className="text-muted-foreground">·</span>
                                            <span className="text-sm text-muted-foreground">{request.childName}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>Requested {formatDate(request.createdAt)}</span>
                                            {request.reportCount > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-3 h-3" />
                                                    {request.reportCount} report{request.reportCount > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                        <StatusIcon className="w-3.5 h-3.5" />
                                        {cfg.label}
                                    </span>

                                    {/* Expand icon */}
                                    {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                    )}
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="border-t border bg-muted/50 p-5">
                                        {isLoadingThis ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            </div>
                                        ) : detail ? (
                                            <div className="space-y-5">
                                                {/* Info cards */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Child info */}
                                                    <div className="bg-card rounded-lg border p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Baby className="w-4 h-4 text-primary" />
                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Child</span>
                                                        </div>
                                                        <p className="text-sm font-medium text-foreground">{detail.childName}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{detail.childAge} years old</p>
                                                    </div>

                                                    {/* Parent info */}
                                                    <div className="bg-card rounded-lg border p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <User className="w-4 h-4 text-primary" />
                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parent / Guardian</span>
                                                        </div>
                                                        {detail.parentId ? (
                                                            <>
                                                                <p className="text-sm font-medium text-foreground">
                                                                    {detail.parentId.firstName} {detail.parentId.lastName}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-0.5">{detail.parentId.email}</p>
                                                            </>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">Not available</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                {detail.notes && (
                                                    <div className="bg-card rounded-lg border p-4">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Notes</p>
                                                        <p className="text-sm text-foreground">{detail.notes}</p>
                                                    </div>
                                                )}

                                                {/* Reports */}
                                                {detail.reports && detail.reports.length > 0 ? (
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                                            Uploaded Reports ({detail.reports.length})
                                                        </p>
                                                        <div className="space-y-2">
                                                            {detail.reports.map(report => (
                                                                <div key={report._id} className="flex items-center gap-3 bg-card rounded-lg border p-3">
                                                                    <div className="p-2 rounded-lg bg-secondary">
                                                                        <FileText className="w-4 h-4 text-primary" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-foreground truncate">{report.fileName}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {formatFileSize(report.fileSize)} · Uploaded {formatDate(report.uploadedAt)}
                                                                            {report.labTechnicianId && (
                                                                                <> · by {report.labTechnicianId.firstName} {report.labTechnicianId.lastName}</>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <a
                                                                        href={`${(import.meta as any).env?.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:4000'}${report.fileUrl}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-secondary/80"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        View
                                                                    </a>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6 bg-card rounded-lg border">
                                                        <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                                        <p className="text-sm text-muted-foreground">No reports uploaded yet</p>
                                                    </div>
                                                )}

                                                {/* Release button — only for UPLOADED status */}
                                                {detail.status === 'UPLOADED' && (
                                                    <button
                                                        onClick={() => setConfirmReleaseId(detail._id)}
                                                        disabled={releasing === detail._id}
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                        {releasing === detail._id ? 'Releasing...' : 'Review & Release to Parent'}
                                                    </button>
                                                )}

                                                {detail.status === 'RELEASED' && (
                                                    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-primary">
                                                        <ShieldCheck className="w-4 h-4 text-primary" />
                                                        <span className="text-sm font-medium">
                                                            This report has been reviewed and released to the parent
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">Failed to load details</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Confirmation Modal (portaled to body) ── */}
            {confirmReleaseId && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    {/* Backdrop */}
                    <div
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setConfirmReleaseId(null)}
                    />
                    {/* Modal */}
                    <div style={{ position: 'relative', zIndex: 1 }} className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6">
                        {/* Close */}
                        <button
                            onClick={() => setConfirmReleaseId(null)}
                            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="rounded-full bg-secondary p-3">
                                <ShieldCheck className="w-8 h-8 text-primary" />
                            </div>
                        </div>

                        {/* Title & description */}
                        <h3 className="text-lg font-bold text-foreground text-center mb-2">
                            Release Report to Parent?
                        </h3>
                        <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
                            This will mark the report as <strong>Reviewed &amp; Released</strong> and
                            notify the parent via email that the results are available.
                            This action cannot be undone.
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmReleaseId(null)}
                                className="flex-1 py-2.5 px-4 rounded-lg font-medium text-foreground bg-muted hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleRelease(confirmReleaseId);
                                    setConfirmReleaseId(null);
                                }}
                                disabled={releasing === confirmReleaseId}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Yes, Release
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* ── Request Lab Test (dialog: scrollable body, fits small viewports) ── */}
            <Dialog open={showRequestForm} onOpenChange={(open) => { if (!open) resetRequestForm(); }}>
                <DialogContent className="flex h-[min(92vh,880px)] max-h-[min(92vh,880px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
                    <DialogHeader className="shrink-0 space-y-3 border-b border-border px-6 py-5 text-left">
                        <div className="flex items-start gap-3 pr-8">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
                                <FlaskConical className="h-5 w-5" strokeWidth={2} />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <DialogTitle className="text-xl font-semibold tracking-tight">Request investigations</DialogTitle>
                                <DialogDescription className="text-sm leading-relaxed">
                                    Choose a family, select a child, then pick studies. Everything stays in this window — scroll each section as needed.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                        <div className="mx-auto max-w-xl space-y-5">
                            {/* Parent search */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Search Parent</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={parentSearch}
                                        onChange={(e) => handleParentSearch(e.target.value)}
                                        className="input w-full pl-10 pr-4 py-2.5 text-sm"
                                    />
                                    {searchingParents && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                                    )}
                                </div>
                                {/* Dropdown results */}
                                {parentResults.length > 0 && !selectedParent && (
                                    <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                                        {parentResults.map(p => (
                                            <button
                                                key={p._id}
                                                onClick={() => selectParent(p)}
                                                className="w-full border-b border-border px-4 py-2.5 text-left transition-colors hover:bg-muted last:border-0"
                                            >
                                                <p className="text-sm font-medium text-foreground">{p.firstName} {p.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{p.email} · {p.children.length} child{p.children.length !== 1 ? 'ren' : ''}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected parent info */}
                            {selectedParent && (
                                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-medium text-foreground">{selectedParent.firstName} {selectedParent.lastName}</span>
                                            <span className="text-xs text-muted-foreground">({selectedParent.email})</span>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedParent(null); setParentSearch(''); setSelectedChild(null); }}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Child selection */}
                            {selectedParent && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Select Child</label>
                                    {selectedParent.children.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">This parent has no registered children</p>
                                    ) : (
                                        <div className="max-h-[min(40vh,260px)] space-y-2 overflow-y-auto overscroll-contain rounded-xl border border-border bg-muted/20 p-2">
                                            {selectedParent.children.map(child => (
                                                <button
                                                    key={child._id}
                                                    type="button"
                                                    onClick={() => setSelectedChild(child)}
                                                    className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${selectedChild?._id === child._id
                                                            ? 'border-primary bg-card shadow-sm ring-1 ring-ring/40'
                                                            : 'border-transparent bg-card hover:border-border hover:bg-muted/50'
                                                        }`}
                                                >
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                        <Baby className="h-4 w-4" strokeWidth={2} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-foreground">{child.firstName} {child.lastName}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">
                                                            {child.ageLabel ?? `${child.age} year${child.age === 1 ? '' : 's'} old`} · {child.gender}
                                                        </p>
                                                    </div>
                                                    {selectedChild?._id === child._id && (
                                                        <CheckCircle className="ml-auto h-4 w-4 shrink-0 text-primary" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Test type */}
                            {selectedChild && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Request Type</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Purpose</label>
                                            <select
                                                value={requestPurpose}
                                                onChange={(e) => setRequestPurpose(e.target.value as RequestPurpose)}
                                                className="input w-full px-3 py-2 text-sm"
                                            >
                                                <option value="ASD_DIAGNOSTIC_WORKUP">ASD diagnostic workup</option>
                                                <option value="CO_OCCURRING_CONDITIONS">Co-occurring conditions</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                                            <select
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value as Priority)}
                                                className="input w-full px-3 py-2 text-sm"
                                            >
                                                <option value="ROUTINE">Routine</option>
                                                <option value="URGENT">Urgent</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Autism diagnosis is primarily <strong>clinical</strong>. Investigations are generally <strong>targeted</strong> (only when indicated)
                                                and guided by exam/history and local pathways. Use this list to coordinate workups across modules.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Recommended catalog (multi-select)</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                placeholder="Search e.g. hearing, CMA, EEG, lead..."
                                                value={catalogQuery}
                                                onChange={(e) => setCatalogQuery(e.target.value)}
                                                className="input w-full pl-10 pr-4 py-2.5 text-sm"
                                            />
                                        </div>

                                        <div className="mt-3 grid max-h-[min(42vh,320px)] min-h-0 gap-2 overflow-y-auto overscroll-contain pr-1">
                                            {STANDARD_WORKUP_CATALOG
                                                .filter((x) => {
                                                    const q = catalogQuery.trim().toLowerCase();
                                                    if (!q) return true;
                                                    return (
                                                        x.name.toLowerCase().includes(q) ||
                                                        x.category.toLowerCase().includes(q) ||
                                                        x.indications.some((i) => i.toLowerCase().includes(q))
                                                    );
                                                })
                                                .map((item) => {
                                                    const selected = selectedItems.some((s) => s.category === item.category && s.name === item.name);
                                                    return (
                                                        <button
                                                            key={`${item.category}:${item.name}`}
                                                            onClick={() => {
                                                                setSelectedTestType(''); // prefer structured model when using catalog
                                                                setSelectedItems((prev) => {
                                                                    if (selected) return prev.filter((p) => !(p.category === item.category && p.name === item.name));
                                                                    return [...prev, item];
                                                                });
                                                            }}
                                                            className={`w-full rounded-xl border p-3 text-left transition-all ${selected
                                                                ? 'border-primary bg-secondary/60 ring-1 ring-ring/50'
                                                                : 'border-border hover:bg-muted'
                                                                }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {item.category} · {item.whenIndicatedOnly ? 'When indicated' : 'Usually included'}{item.typicalForASDWorkup ? ' · Common in ASD pathways' : ''}
                                                                    </p>
                                                                    {item.indications?.length ? (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            Indications: {item.indications.slice(0, 2).join(' · ')}{item.indications.length > 2 ? '…' : ''}
                                                                        </p>
                                                                    ) : null}
                                                                </div>
                                                                {selected && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="text"
                                                    placeholder="Add custom investigation (optional)"
                                                    value={customItemName}
                                                    onChange={(e) => setCustomItemName(e.target.value)}
                                                    className="input w-full px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <select
                                                    value={customItemCategory}
                                                    onChange={(e) => setCustomItemCategory(e.target.value)}
                                                    className="input w-full px-3 py-2 text-sm"
                                                >
                                                    <option value="Audiology">Audiology</option>
                                                    <option value="Vision">Vision</option>
                                                    <option value="Genetics">Genetics</option>
                                                    <option value="Laboratory">Laboratory</option>
                                                    <option value="Neurology">Neurology</option>
                                                    <option value="Imaging">Imaging</option>
                                                    <option value="Sleep">Sleep</option>
                                                    <option value="GI">GI</option>
                                                    <option value="Nutrition">Nutrition</option>
                                                    <option value="Psychiatry">Psychiatry</option>
                                                    <option value="Developmental">Developmental</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const name = customItemName.trim();
                                                if (!name) return;
                                                setSelectedTestType('');
                                                setSelectedItems((prev) => [...prev, { category: customItemCategory, name, typicalForASDWorkup: false, whenIndicatedOnly: true, indications: [] }]);
                                                setCustomItemName('');
                                            }}
                                            className="mt-2 w-full rounded-xl border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                                        >
                                            Add custom item
                                        </button>

                                        {/* Legacy fallback */}
                                        <div className="mt-4 pt-4 border-t border-border">
                                            <label className="block text-xs font-medium text-muted-foreground mb-2">Legacy quick-select (single type)</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {TEST_TYPES.map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => { setSelectedTestType(type); setSelectedItems([]); }}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${selectedTestType === type
                                                            ? 'border-primary bg-secondary/60 text-primary ring-1 ring-ring/50'
                                                            : 'border text-muted-foreground hover:border hover:bg-muted'
                                                            }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {(selectedTestType || selectedItems.length > 0) && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Notes (optional)</label>
                                    <textarea
                                        placeholder="Add any relevant clinical notes..."
                                        value={requestNotes}
                                        onChange={(e) => setRequestNotes(e.target.value)}
                                        rows={3}
                                        className="input h-auto resize-none px-4 py-2.5 text-sm"
                                    />
                                </div>
                            )}

                            {/* Submit */}
                            {(selectedTestType || selectedItems.length > 0) && (
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={resetRequestForm}
                                        className="flex-1 py-2.5 px-4 rounded-lg font-medium text-foreground bg-muted hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateRequest}
                                        disabled={submitting}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                                        ) : (
                                            <><Send className="w-4 h-4" /> Create Request</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
