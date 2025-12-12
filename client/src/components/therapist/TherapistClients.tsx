import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Users, Calendar, TrendingUp } from 'lucide-react';

export function TherapistClients() {
  const clients = [
    {
      id: 1,
      name: 'Emma Johnson',
      age: 4,
      therapyType: 'Speech Therapy',
      progress: 75,
      sessionsCompleted: 12,
      totalSessions: 15,
      lastSession: '2024-11-02',
    },
    {
      id: 2,
      name: 'Noah Smith',
      age: 3,
      therapyType: 'Occupational Therapy',
      progress: 60,
      sessionsCompleted: 8,
      totalSessions: 12,
      lastSession: '2024-11-01',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-green-600 mb-2">My Clients</h2>
        <p className="text-gray-600">Manage your assigned clients and their therapy progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clients.map((client) => (
          <Card key={client.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-400 flex items-center justify-center text-white text-xl">
                    {client.name[0]}
                  </div>
                  <div>
                    <CardTitle className="text-green-600">{client.name}</CardTitle>
                    <p className="text-sm text-gray-600">{client.age} years • {client.therapyType}</p>
                  </div>
                </div>
                <Badge className="bg-green-600">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-900">
                    {client.sessionsCompleted}/{client.totalSessions} sessions
                  </span>
                </div>
                <Progress value={client.progress} className="h-2" />
              </div>
              
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  View Profile
                </Button>
                <Button variant="outline" className="flex-1">
                  Assign Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
