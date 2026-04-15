import * as React from 'react';
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
            pending: 'bg-accent/10 text-accent-foreground',
            in_progress: 'bg-secondary/70 text-primary',
            completed: 'bg-secondary text-primary',
            cancelled: 'bg-muted text-foreground'
        };
        return variants[status] || 'bg-muted text-foreground';
    };

    const getPriorityBadge = (priority: string) => {
        return priority === 'urgent'
            ? 'bg-muted text-destructive'
            : 'bg-muted text-foreground';
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
                <h2 className="mb-2 text-2xl font-bold text-foreground">Test Order Management</h2>
                <p className="text-muted-foreground">View and manage patient test orders</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                        className="input h-10 w-auto px-4 py-2"
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
                            <ClipboardList className="h-5 w-5 text-primary" />
                            Test Orders
                        </CardTitle>
                        <CardDescription>{filteredOrders.length} orders found</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No orders found</div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {filteredOrders.map((order) => (
                                    <div
                                        key={order._id}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedOrder?._id === order._id
                                                ? 'border-primary bg-secondary/30'
                                                : 'border-border hover:border-primary/40 hover:bg-muted'
                                            }`}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                {order.priority === 'urgent' && (
                                                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-foreground">{order.childName}</p>
                                                    <p className="text-sm text-muted-foreground">{order.testName}</p>
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
                                        <p className="text-xs text-muted-foreground mt-2">
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
                            <Eye className="h-5 w-5 text-primary" />
                            Order Details
                        </CardTitle>
                        <CardDescription>
                            {selectedOrder ? 'View and manage selected order' : 'Select an order to view details'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!selectedOrder ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p>Select an order from the list to view details</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Patient Name</label>
                                        <p className="font-medium text-foreground">{selectedOrder.childName}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Test Type</label>
                                        <p className="font-medium text-foreground capitalize">{selectedOrder.testType}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Test Name</label>
                                    <p className="font-medium text-foreground">{selectedOrder.testName}</p>
                                </div>

                                {selectedOrder.testDetails && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Test Details</label>
                                        <p className="text-foreground">{selectedOrder.testDetails}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Ordering Clinician</label>
                                        <p className="font-medium text-foreground">
                                            Dr. {selectedOrder.clinicianId?.firstName} {selectedOrder.clinicianId?.lastName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{selectedOrder.clinicianId?.specialization}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Parent Contact</label>
                                        <p className="font-medium text-foreground">
                                            {selectedOrder.parentId?.firstName} {selectedOrder.parentId?.lastName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{selectedOrder.parentId?.email}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-6">
                                    {selectedOrder.status === 'pending' && (
                                        <Button
                                            className="flex-1"
                                            variant="default"
                                            onClick={() => handleAssignOrder(selectedOrder._id)}
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            Start Processing
                                        </Button>
                                    )}
                                    {selectedOrder.status === 'in_progress' && (
                                        <Button
                                            className="flex-1"
                                            variant="default"
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
