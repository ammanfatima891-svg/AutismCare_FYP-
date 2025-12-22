import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertTriangle, CheckCircle, Clock, Eye, FileText } from 'lucide-react';

interface ScreeningResult {
  id: number;
  patientName: string;
  patientAge: number;
  testType: 'ASQ-3' | 'M-CHAT';
  submittedDate: string;
  status: 'pending' | 'reviewed' | 'needs_attention';
  score: string;
  riskLevel: 'low' | 'medium' | 'high';
  reviewer?: string;
}

const mockScreenings: ScreeningResult[] = [
  {
    id: 1,
    patientName: 'Emma Johnson',
    patientAge: 4,
    testType: 'ASQ-3',
    submittedDate: '2024-01-20',
    status: 'pending',
    score: '85/100',
    riskLevel: 'medium'
  },
  {
    id: 2,
    patientName: 'Noah Smith',
    patientAge: 3,
    testType: 'M-CHAT',
    submittedDate: '2024-01-19',
    status: 'needs_attention',
    score: '12/20',
    riskLevel: 'high'
  },
  {
    id: 3,
    patientName: 'Sophia Davis',
    patientAge: 5,
    testType: 'ASQ-3',
    submittedDate: '2024-01-18',
    status: 'reviewed',
    score: '95/100',
    riskLevel: 'low',
    reviewer: 'Dr. Johnson'
  },
  {
    id: 4,
    patientName: 'Liam Wilson',
    patientAge: 2,
    testType: 'ASQ-3',
    submittedDate: '2024-01-17',
    status: 'pending',
    score: '78/100',
    riskLevel: 'medium'
  }
];

export function ScreeningReviews() {
  const [selectedTab, setSelectedTab] = useState('pending');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'reviewed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'needs_attention': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-green-100 text-green-800';
      case 'needs_attention': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredScreenings = mockScreenings.filter(screening => {
    if (selectedTab === 'all') return true;
    return screening.status === selectedTab;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-600 mb-2">Screening Reviews</h2>
        <p className="text-gray-600">Review and analyze screening test results</p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({mockScreenings.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({mockScreenings.filter(s => s.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="needs_attention">
            Needs Attention ({mockScreenings.filter(s => s.status === 'needs_attention').length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({mockScreenings.filter(s => s.status === 'reviewed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredScreenings.map((screening) => (
            <Card key={screening.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {screening.patientName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{screening.patientName}</CardTitle>
                      <CardDescription>
                        {screening.patientAge} years old • {screening.testType} • Submitted {new Date(screening.submittedDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(screening.status)}>
                      {getStatusIcon(screening.status)}
                      <span className="ml-1 capitalize">{screening.status.replace('_', ' ')}</span>
                    </Badge>
                    <Badge className={getRiskColor(screening.riskLevel)}>
                      {screening.riskLevel} risk
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Score:</span> {screening.score}
                    </div>
                    {screening.reviewer && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Reviewed by:</span> {screening.reviewer}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {screening.status === 'pending' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <FileText className="h-4 w-4 mr-2" />
                        Review Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredScreenings.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No screenings found</h3>
                <p className="text-gray-500 text-center">
                  {selectedTab === 'all'
                    ? 'No screening results available.'
                    : `No screenings with status "${selectedTab}".`
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
