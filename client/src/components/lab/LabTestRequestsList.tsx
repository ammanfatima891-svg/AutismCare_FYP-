import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Clock, User, FileText, Upload } from 'lucide-react';
import API from '../../api';

interface LabTestRequest {
  _id: string;
  childId: string;
  childName: string;
  parentName: string;
  clinicianName: string;
  appointmentType: string;
  labTest: string;
  status: string;
  createdAt: string;
}

interface LabTestRequestsListProps {
  onUploadReport?: (request: LabTestRequest) => void;
}

export function LabTestRequestsList({ onUploadReport }: LabTestRequestsListProps) {
  const [requests, setRequests] = useState<LabTestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await API.get('/appointment/lab/requests');
      setRequests(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch lab test requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading lab test requests...</div>;
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={fetchRequests}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Lab Test Requests</h2>
        <Button onClick={fetchRequests} variant="outline">
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No lab test requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {request.appointmentType.replace('-', ' ').toUpperCase()}
                  </CardTitle>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Child: {request.childName} | Parent: {request.parentName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Clinician: {request.clinicianName}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Requested Test:</p>
                    <p className="text-sm text-gray-600">{request.labTest}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Requested on: {new Date(request.createdAt).toLocaleDateString()}
                </div>

                {request.status !== 'completed' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => onUploadReport?.(request)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
