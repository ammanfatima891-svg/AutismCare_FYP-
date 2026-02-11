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
            color: 'from-amber-500 to-orange-600',
            bgLight: 'bg-amber-50',
            textColor: 'text-amber-700',
            onClick: () => onNavigate('requests')
        },
        {
            title: 'Uploaded Reports',
            value: stats.uploaded,
            icon: FileText,
            color: 'from-blue-500 to-indigo-600',
            bgLight: 'bg-blue-50',
            textColor: 'text-blue-700',
            onClick: () => onNavigate('reports')
        },
        {
            title: 'Released Reports',
            value: stats.released,
            icon: CheckCircle,
            color: 'from-emerald-500 to-teal-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-700',
            onClick: () => onNavigate('reports')
        },
        {
            title: 'Total Reports',
            value: stats.totalReports,
            icon: ClipboardList,
            color: 'from-purple-500 to-violet-600',
            bgLight: 'bg-purple-50',
            textColor: 'text-purple-700',
            onClick: () => onNavigate('reports')
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Lab Overview</h2>
                <p className="text-gray-500 mt-1">Welcome to your laboratory dashboard</p>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
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
                            className="text-left bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg ${card.bgLight}`}>
                                    <Icon className={`w-6 h-6 ${card.textColor}`} />
                                </div>
                            </div>
                            <p className="text-sm font-medium text-gray-500">{card.title}</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                        </button>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => onNavigate('requests')}
                        className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 transition-colors border border-teal-100"
                    >
                        <ClipboardList className="w-5 h-5 text-teal-600" />
                        <div>
                            <p className="text-sm font-semibold text-teal-800">View Test Requests</p>
                            <p className="text-xs text-teal-600">Review and process pending lab requests</p>
                        </div>
                    </button>
                    <button
                        onClick={() => onNavigate('reports')}
                        className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-colors border border-purple-100"
                    >
                        <FileText className="w-5 h-5 text-purple-600" />
                        <div>
                            <p className="text-sm font-semibold text-purple-800">View Reports</p>
                            <p className="text-xs text-purple-600">Browse all uploaded lab reports</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
