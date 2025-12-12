import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Users, Search, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

export function ManageUsers() {
  const [searchQuery, setSearchQuery] = useState('');

  const users = {
    parents: [
      { id: 1, name: 'Jane Doe', email: 'jane.doe@email.com', children: 2, status: 'active', joinDate: '2024-01-15' },
      { id: 2, name: 'John Smith', email: 'john.smith@email.com', children: 1, status: 'active', joinDate: '2024-02-20' },
    ],
    clinicians: [
      { id: 1, name: 'Dr. Emily Chen', email: 'emily.chen@clinic.com', specialty: 'Developmental Pediatrician', patients: 45, status: 'active' },
      { id: 2, name: 'Dr. Michael Brown', email: 'michael.brown@clinic.com', specialty: 'Child Psychologist', patients: 38, status: 'active' },
    ],
    therapists: [
      { id: 1, name: 'Dr. Sarah Johnson', email: 'sarah.johnson@therapy.com', specialty: 'Speech-Language Pathologist', clients: 28, status: 'active' },
      { id: 2, name: 'Alex Martinez', email: 'alex.martinez@therapy.com', specialty: 'Occupational Therapist', clients: 25, status: 'active' },
    ],
    labs: [
      { id: 1, name: 'AudioCare Lab', email: 'contact@audiocare.com', type: 'Audiology', testsCompleted: 156, status: 'active' },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-blue-600 mb-2">User Management</h2>
          <p className="text-gray-600">Manage all platform users</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* User Tables by Role */}
      <Tabs defaultValue="parents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="parents">Parents ({users.parents.length})</TabsTrigger>
          <TabsTrigger value="clinicians">Clinicians ({users.clinicians.length})</TabsTrigger>
          <TabsTrigger value="therapists">Therapists ({users.therapists.length})</TabsTrigger>
          <TabsTrigger value="labs">Labs ({users.labs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="parents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-600" />
                Parent Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.parents.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <div>
                      <h4 className="text-pink-600">{user.name}</h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.children} children • Joined {new Date(user.joinDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={user.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                        {user.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {user.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinicians">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Clinician Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.clinicians.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <div>
                      <h4 className="text-teal-600">{user.name}</h4>
                      <p className="text-sm text-gray-600">{user.specialty}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.email} • {user.patients} patients
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {user.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="therapists">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Therapist Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.therapists.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <div>
                      <h4 className="text-green-600">{user.name}</h4>
                      <p className="text-sm text-gray-600">{user.specialty}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.email} • {user.clients} clients
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {user.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-600" />
                Laboratory Partners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.labs.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <div>
                      <h4 className="text-cyan-600">{user.name}</h4>
                      <p className="text-sm text-gray-600">{user.type}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.email} • {user.testsCompleted} tests completed
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {user.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
