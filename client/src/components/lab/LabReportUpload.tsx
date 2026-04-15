import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    Upload,
    FileText,
    CheckCircle,
    AlertCircle,
    X,
    Image as ImageIcon
} from 'lucide-react';
import API from '../../api';

interface LabReportUploadProps {
    selectedOrderId: string | null;
    onNavigate: (section: 'home' | 'orders' | 'upload' | 'notifications', orderId?: string) => void;
}

interface TestOrder {
    _id: string;
    childName: string;
    testName: string;
    testType: string;
    status: string;
    reportUrl?: string;
}

export function LabReportUpload({ selectedOrderId, onNavigate }: LabReportUploadProps) {
    const [orders, setOrders] = useState<TestOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [results, setResults] = useState('');
    const [notes, setNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchInProgressOrders();
    }, []);

    useEffect(() => {
        if (selectedOrderId && orders.length > 0) {
            const order = orders.find(o => o._id === selectedOrderId);
            if (order) setSelectedOrder(order);
        }
    }, [selectedOrderId, orders]);

    const fetchInProgressOrders = async () => {
        try {
            const response = await API.get('/lab/orders?status=in_progress');
            if (response.data.success) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(selectedFile.type)) {
                setError('Only PDF and image files (JPEG, PNG) are allowed');
                return;
            }
            // Validate file size (25MB per requirements)
            if (selectedFile.size > 25 * 1024 * 1024) {
                setError('File size must be less than 25MB');
                return;
            }
            setFile(selectedFile);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!selectedOrder || !file) {
            setError('Please select an order and a file');
            return;
        }

        setUploading(true);
        setError('');

        try {
            // Upload report
            const formData = new FormData();
            formData.append('report', file);

            await API.post(`/lab/orders/${selectedOrder._id}/report`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Complete the order
            await API.post(`/lab/orders/${selectedOrder._id}/complete`, {
                results,
                notes
            });

            setUploadSuccess(true);
            setFile(null);
            setResults('');
            setNotes('');

            // Refresh orders
            fetchInProgressOrders();

            setTimeout(() => {
                setUploadSuccess(false);
                setSelectedOrder(null);
            }, 3000);
        } catch (error: any) {
            console.error('Error uploading report:', error);
            setError(error.response?.data?.message || 'Failed to upload report');
        } finally {
            setUploading(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-primary mb-2">Upload Test Reports</h2>
                <p className="text-muted-foreground">Upload completed test results and reports</p>
            </div>

            {uploadSuccess && (
                <div className="bg-primary/20 border rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <p className="text-primary">Report uploaded and order completed successfully!</p>
                </div>
            )}

            {error && (
                <div className="bg-muted border rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="text-destructive">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Select Order */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Select Test Order
                        </CardTitle>
                        <CardDescription>Choose an in-progress order to upload results</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {orders.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p>No in-progress orders available</p>
                                <Button
                                    variant="link"
                                    className="mt-2"
                                    onClick={() => onNavigate('orders')}
                                >
                                    Go to Test Orders
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {orders.map((order) => (
                                    <div
                                        key={order._id}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedOrder?._id === order._id
                                            ? 'border-primary bg-primary/20'
                                            : 'border hover:border hover:bg-muted'
                                            }`}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-foreground">{order.childName}</p>
                                                <p className="text-sm text-muted-foreground">{order.testName}</p>
                                            </div>
                                            <Badge className="bg-secondary/70 text-primary capitalize">
                                                {order.testType}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upload Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            Upload Report
                        </CardTitle>
                        <CardDescription>
                            {selectedOrder
                                ? `Uploading for: ${selectedOrder.childName} - ${selectedOrder.testName}`
                                : 'Select an order first'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!selectedOrder ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p>Select an order to upload report</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* File Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Report File (PDF or Image)
                                    </label>
                                    {!file ? (
                                        <div
                                            className="cursor-pointer rounded-lg border-2 border-dashed border-primary p-8 text-center transition-colors hover:border-primary hover:bg-primary/10"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                                            <p className="text-muted-foreground">Click to upload or drag and drop</p>
                                            <p className="text-sm text-muted-foreground mt-1">PDF, JPEG, or PNG (max 25MB)</p>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-4 bg-primary/20 rounded-lg border">
                                            {file.type.startsWith('image/') ? (
                                                <ImageIcon className="h-8 w-8 text-primary" />
                                            ) : (
                                                <FileText className="h-8 w-8 text-primary" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-foreground">{file.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                onClick={removeFile}
                                                className="rounded p-1 hover:bg-muted"
                                            >
                                                <X className="h-5 w-5 text-muted-foreground" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Results */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Test Results Summary
                                    </label>
                                    <textarea
                                        value={results}
                                        onChange={(e) => setResults(e.target.value)}
                                        placeholder="Enter brief summary of test results..."
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus-visible:ring-ring/50 resize-none"
                                        rows={3}
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Additional Notes (Optional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Any additional notes for the clinician..."
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus-visible:ring-ring/50 resize-none"
                                        rows={2}
                                    />
                                </div>

                                {/* Submit Button */}
                                <Button
                                    className="w-full bg-primary hover:bg-primary/90"
                                    disabled={!file || uploading}
                                    onClick={handleUpload}
                                >
                                    {uploading ? (
                                        <>
                                            <span className="animate-spin mr-2">⏳</span>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Upload & Complete Order
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
