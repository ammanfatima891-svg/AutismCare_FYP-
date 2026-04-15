import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Plus, Eye, Edit, Phone, Mail } from 'lucide-react';

interface Patient {
  id: number;
  name: string;
  age: number;
  parent: string;
  status: 'active' | 'inactive' | 'pending';
  riskLevel: 'low' | 'medium' | 'high';
  lastVisit: string;
  nextAppointment?: string;
}

const mockPatients: Patient[] = [];

export function PatientManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredPatients = mockPatients;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-secondary text-primary font-medium';
      case 'inactive': return 'bg-muted text-muted-foreground font-medium';
      case 'pending': return 'bg-accent/10 text-accent font-medium';
      default: return 'bg-muted text-muted-foreground font-medium';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-primary/10 text-primary font-medium';
      case 'medium': return 'bg-accent/10 text-accent font-medium';
      case 'high': return 'bg-destructive/10 text-destructive font-medium';
      default: return 'bg-muted text-muted-foreground font-medium';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Patient Management</h2>
          <p className="text-muted-foreground">Manage patient records and information</p>
        </div>
        <Button variant="accent">
          <Plus className="h-4 w-4 mr-2" />
          Add New Patient
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search patients or parents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patient List */}
      <div className="grid gap-4">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-secondary text-primary">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{patient.name}</h3>
                    <p className="text-muted-foreground">Age: {patient.age} • Parent: {patient.parent}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getStatusColor(patient.status)}>
                        {patient.status}
                      </Badge>
                      <Badge className={getRiskColor(patient.riskLevel)}>
                        {patient.riskLevel} risk
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Last visit: {new Date(patient.lastVisit).toLocaleDateString()}</p>
                    {patient.nextAppointment && (
                      <p>Next: {new Date(patient.nextAppointment).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPatients.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No patients found</h3>
              <p className="text-muted-foreground text-center">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No patients have been added yet.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
