import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ClipboardList, Upload, Bell, TrendingUp, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import API from '../../api';

interface LabHomeProps {
    onNavigate: (section: 'home' | 'orders' | 'upload' | 'notifications', orderId?: string) => void;
}

interface Stats {
    pending: number;
    inProgress: number;
    completedToday: number;
    urgent: number;
}

interface RecentOrder {
    _id: string;
    childName: string;
    testName: string;
    status: string;
    priority: string;
    createdAt: string;
}

export function LabHome({ onNavigate }: LabHomeProps) {
    const [stats, setStats] = useState<Stats>({ pending: 0, inProgress: 0, completedToday: 0, urgent: 0 });
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, ordersRes] = await Promise.all([
                API.get('/lab/stats'),
                API.get('/lab/orders?limit=5')
            ]);

            if (statsRes.data.success) {
                setStats(statsRes.data.data);
            }

            if (ordersRes.data.success) {
                setRecentOrders(ordersRes.data.data.slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching lab data:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Pending Orders',
            value: stats.pending.toString(),
            description: 'Awaiting processing',
            icon: Clock,
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-50'
        },
        {
            title: 'In Progress',
            value: stats.inProgress.toString(),
            description: 'Currently processing',
            icon: ClipboardList,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'Completed Today',
            value: stats.completedToday.toString(),
            description: 'Tests finished today',
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            title: 'Urgent Orders',
            value: stats.urgent.toString(),
            description: 'High priority tests',
            icon: AlertCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50'
        }
    ];

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-gray-100 text-gray-800'
        };
        return variants[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-cyan-600 mb-2">Lab Technician Dashboard</h2>
                <p className="text-gray-600">Welcome back! Here's your overview for today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-cyan-600" />
                            Recent Test Orders
                        </CardTitle>
                        <CardDescription>Latest test orders requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-4 text-gray-500">Loading...</div>
                        ) : recentOrders.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No recent orders</div>
                        ) : (
                            <div className="space-y-4">
                                {recentOrders.map((order) => (
                                    <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {order.priority === 'urgent' && <AlertCircle className="h-4 w-4 text-red-500" />}
                                            <div>
                                                <p className="font-medium text-gray-900">{order.childName}</p>
                                                <p className="text-sm text-gray-600">{order.testName}</p>
                                            </div>
                                        </div>
                                        <Badge className={getStatusBadge(order.status)}>
                                            {order.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common tasks and shortcuts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col items-center gap-2"
                                onClick={() => onNavigate('orders')}
                            >
                                <ClipboardList className="h-6 w-6 text-blue-600" />
                                <span className="text-sm">View Orders</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col items-center gap-2"
                                onClick={() => onNavigate('upload')}
                            >
                                <Upload className="h-6 w-6 text-green-600" />
                                <span className="text-sm">Upload Report</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col items-center gap-2"
                                onClick={() => onNavigate('notifications')}
                            >
                                <Bell className="h-6 w-6 text-orange-600" />
                                <span className="text-sm">Notifications</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col items-center gap-2"
                                onClick={() => onNavigate('orders')}
                            >
                                <AlertCircle className="h-6 w-6 text-red-600" />
                                <span className="text-sm">Urgent Tests</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
