import { useState, useEffect } from 'react';
import { ClipboardList, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { labAPI } from '../../api';

interface LabHomeProps {
    onNavigate: (section: string) => void;
}

interface Stats {
    pending: number;
    uploaded: number;
    released: number;
    totalReports: number;
}

export function LabHome({ onNavigate }: LabHomeProps) {
    const [stats, setStats] = useState<Stats>({ pending: 0, uploaded: 0, released: 0, totalReports: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const { data } = await labAPI.getStats();
            setStats(data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    const summaryCards = [
        {
            title: 'Pending Requests',
            value: stats.pending,
            icon: Clock,
            color: 'from-accent to-accent',
            bgLight: 'bg-accent/15',
            textColor: 'text-accent-foreground',
            onClick: () => onNavigate('requests')
        },
        {
            title: 'Uploaded Reports',
            value: stats.uploaded,
            icon: FileText,
            color: 'from-primary to-primary',
            bgLight: 'bg-secondary',
            textColor: 'text-primary',
            onClick: () => onNavigate('reports')
        },
        {
            title: 'Released Reports',
            value: stats.released,
            icon: CheckCircle,
            color: 'from-primary to-primary',
            bgLight: 'bg-secondary',
            textColor: 'text-primary',
            onClick: () => onNavigate('reports')
        },
        {
            title: 'Total Reports',
            value: stats.totalReports,
            icon: ClipboardList,
            color: 'from-primary to-primary',
            bgLight: 'bg-muted',
            textColor: 'text-primary',
            onClick: () => onNavigate('reports')
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">Lab Overview</h2>
                <p className="text-muted-foreground mt-1">Welcome to your laboratory dashboard</p>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-muted text-destructive rounded-lg border">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <button
                            key={card.title}
                            onClick={card.onClick}
                            className="text-left bg-card rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg ${card.bgLight}`}>
                                    <Icon className={`w-6 h-6 ${card.textColor}`} />
                                </div>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                            <p className="text-3xl font-bold text-foreground mt-1">{card.value}</p>
                        </button>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => onNavigate('requests')}
                        className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                    >
                        <ClipboardList className="w-5 h-5 text-primary" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">View Test Requests</p>
                            <p className="text-xs text-muted-foreground">Review and process pending lab requests</p>
                        </div>
                    </button>
                    <button
                        onClick={() => onNavigate('reports')}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
                    >
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">View Reports</p>
                            <p className="text-xs text-muted-foreground">Browse all uploaded lab reports</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
