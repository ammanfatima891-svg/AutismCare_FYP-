import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function TestRequests() {
  const [selectedTest, setSelectedTest] = useState<any>(null);

  const tests = [
    {
      id: 1,
      testName: 'Hearing Assessment',
      childName: 'Emma Johnson',
      age: 4,
      requestedBy: 'Dr. Emily Chen',
      requestDate: '2024-11-03',
      priority: 'high',
      status: 'pending',
      notes: 'Check for any hearing sensitivity issues',
    },
    {
      id: 2,
      testName: 'Audiometry Test',
      childName: 'Noah Smith',
      age: 3,
      requestedBy: 'Dr. Emily Chen',
      requestDate: '2024-11-02',
      priority: 'medium',
      status: 'pending',
      notes: 'Standard audiometry evaluation',
    },
    {
      id: 3,
      testName: 'Hearing Test',
      childName: 'Liam Davis',
      age: 5,
      requestedBy: 'Dr. Emily Chen',
      requestDate: '2024-10-28',
      priority: 'medium',
      status: 'completed',
      result: 'Normal hearing sensitivity',
      completedDate: '2024-11-01',
    },
  ];

  const handleUpdateStatus = (testId: number, newStatus: string) => {
    console.log(`Updating test ${testId} to status: ${newStatus}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-cyan-600 mb-2">Test Requests</h2>
        <p className="text-gray-600">View and manage laboratory test requests</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({tests.filter(t => t.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing (0)
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({tests.filter(t => t.status === 'completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {tests.filter(t => t.status === 'pending').map((test) => (
            <Card key={test.id} className="border-l-4 border-l-yellow-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-cyan-600 mb-2">{test.testName}</CardTitle>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Patient: {test.childName} ({test.age} years)</p>
                      <p>Requested by: {test.requestedBy}</p>
                      <p>Date: {new Date(test.requestDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge className={test.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}>
                    {test.priority} priority
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {test.notes && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Notes:</p>
                    <p className="text-sm text-gray-900">{test.notes}</p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Select onValueChange={(value) => handleUpdateStatus(test.id, value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">Mark as Processing</SelectItem>
                      <SelectItem value="completed">Mark as Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No tests currently in processing</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {tests.filter(t => t.status === 'completed').map((test) => (
            <Card key={test.id} className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-cyan-600 mb-2">{test.testName}</CardTitle>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Patient: {test.childName} ({test.age} years)</p>
                      <p>Completed: {test.completedDate && new Date(test.completedDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-green-50 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-1">Result:</p>
                  <p className="text-sm text-gray-900">{test.result}</p>
                </div>
                <Button variant="outline">
                  Download Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
