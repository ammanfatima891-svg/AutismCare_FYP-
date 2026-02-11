import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    ClipboardList,
    Search,
    Filter,
    Eye,
    Play,
    Upload,
    AlertCircle,
    User,
    Calendar
} from 'lucide-react';
import API from '../../api';

interface TestOrderManagementProps {
    onNavigate: (section: 'home' | 'orders' | 'upload' | 'notifications', orderId?: string) => void;
}

interface TestOrder {
    _id: string;
    childId: string;
    childName: string;
    parentId: {
        firstName: string;
        lastName: string;
        email: string;
    };
    clinicianId: {
        firstName: string;
        lastName: string;
        specialization: string;
    };
    testType: string;
    testName: string;
    testDetails: string;
    priority: string;
    status: string;
    reportUrl?: string;
    results?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export function TestOrderManagement({ onNavigate }: TestOrderManagementProps) {
    const [orders, setOrders] = useState<TestOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);

    useEffect(() => {
        fetchOrders();
    }, [statusFilter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
            const response = await API.get(`/lab/orders${params}`);

            if (response.data.success) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignOrder = async (orderId: string) => {
        try {
            const response = await API.post(`/lab/orders/${orderId}/assign`);
            if (response.data.success) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Error assigning order:', error);
        }
    };

    const filteredOrders = orders.filter(order =>
        order.childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.testName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-gray-100 text-gray-800'
        };
        return variants[status] || 'bg-gray-100 text-gray-800';
    };

    const getPriorityBadge = (priority: string) => {
        return priority === 'urgent'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-blue-600 mb-2">Test Order Management</h2>
                <p className="text-gray-600">View and manage patient test orders</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by patient name or test..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Orders List */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-blue-600" />
                            Test Orders
                        </CardTitle>
                        <CardDescription>{filteredOrders.length} orders found</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading orders...</div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No orders found</div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {filteredOrders.map((order) => (
                                    <div
                                        key={order._id}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedOrder?._id === order._id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                            }`}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                {order.priority === 'urgent' && (
                                                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900">{order.childName}</p>
                                                    <p className="text-sm text-gray-600">{order.testName}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge className={getStatusBadge(order.status)}>
                                                    {order.status.replace('_', ' ')}
                                                </Badge>
                                                {order.priority === 'urgent' && (
                                                    <Badge className={getPriorityBadge(order.priority)}>
                                                        Urgent
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            <Calendar className="h-3 w-3 inline mr-1" />
                                            {formatDate(order.createdAt)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Order Details */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5 text-cyan-600" />
                            Order Details
                        </CardTitle>
                        <CardDescription>
                            {selectedOrder ? 'View and manage selected order' : 'Select an order to view details'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!selectedOrder ? (
                            <div className="text-center py-12 text-gray-500">
                                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Select an order from the list to view details</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Patient Name</label>
                                        <p className="font-medium text-gray-900">{selectedOrder.childName}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Test Type</label>
                                        <p className="font-medium text-gray-900 capitalize">{selectedOrder.testType}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-500">Test Name</label>
                                    <p className="font-medium text-gray-900">{selectedOrder.testName}</p>
                                </div>

                                {selectedOrder.testDetails && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Test Details</label>
                                        <p className="text-gray-700">{selectedOrder.testDetails}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Ordering Clinician</label>
                                        <p className="font-medium text-gray-900">
                                            Dr. {selectedOrder.clinicianId?.firstName} {selectedOrder.clinicianId?.lastName}
                                        </p>
                                        <p className="text-sm text-gray-600">{selectedOrder.clinicianId?.specialization}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Parent Contact</label>
                                        <p className="font-medium text-gray-900">
                                            {selectedOrder.parentId?.firstName} {selectedOrder.parentId?.lastName}
                                        </p>
                                        <p className="text-sm text-gray-600">{selectedOrder.parentId?.email}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-6">
                                    {selectedOrder.status === 'pending' && (
                                        <Button
                                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            onClick={() => handleAssignOrder(selectedOrder._id)}
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            Start Processing
                                        </Button>
                                    )}
                                    {selectedOrder.status === 'in_progress' && (
                                        <Button
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            onClick={() => onNavigate('upload', selectedOrder._id)}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Report
                                        </Button>
                                    )}
                                    {selectedOrder.reportUrl && (
                                        <Button
                                            variant="outline"
                                            onClick={() => window.open(selectedOrder.reportUrl, '_blank')}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Report
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
