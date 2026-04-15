import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { User, Calendar, FileText, Search } from 'lucide-react';
import API from '../../api';

interface Client {
  parent: {
    firstName: string;
    lastName: string;
  };
  child: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    clinicalNotes: Array<{
      note: string;
      addedBy: string;
      addedAt: string;
    }>;
    therapyRecommendations: Array<{
      recommendation: string;
      addedBy: string;
      addedAt: string;
    }>;
    labReports: Array<{
      name: string;
      url: string;
      uploadedAt: string;
    }>;
  };
  recommendations: Array<{
    recommendation: string;
    addedBy: string;
    addedAt: string;
  }>;
}

interface TherapistClientsListProps {
  onSelectClient?: (client: Client) => void;
}

export function TherapistClientsList({ onSelectClient }: TherapistClientsListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(client =>
      `${client.child.firstName} ${client.child.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [clients, searchTerm]);

  const fetchClients = async () => {
    try {
      const response = await API.get('/appointment/therapist/children');
      setClients(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading clients...</div>;
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={fetchClients}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Clients</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'No clients found matching your search.' : 'No clients assigned yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => (
            <Card key={client.child.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {client.child.firstName} {client.child.lastName}
                  </CardTitle>
                  <Badge variant="outline">
                    Age: {calculateAge(client.child.dateOfBirth)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Clinical Notes: {client.child.clinicalNotes?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Recommendations: {client.recommendations?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Lab Reports: {client.child.labReports?.length || 0}
                    </span>
                  </div>
                </div>

                {client.child.clinicalNotes && client.child.clinicalNotes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Latest Clinical Note:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {client.child.clinicalNotes[client.child.clinicalNotes.length - 1].note}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(client.child.clinicalNotes[client.child.clinicalNotes.length - 1].addedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => onSelectClient?.(client)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {/* TODO: Open therapy session */}}
                  >
                    Start Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
