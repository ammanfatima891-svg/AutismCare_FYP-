import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertTriangle, CheckCircle, Clock, Eye, FileText } from 'lucide-react';
import { clinicianAPI, screeningAPI } from '../../api';

type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';
type ScreeningStatus = 'pending' | 'reviewed' | 'needs_attention';

interface ClinicianScreeningReview {
  id: string;
  parent: {
    id: string | null;
    name: string;
    email: string;
  };
  child: {
    id: string | null;
    name: string;
    ageYears: number | null;
  };
  questionnaireType: 'ASQ-3' | 'MCHAT-R' | string;
  score: number | null;
  result: string;
  riskLevel: RiskLevel;
  status: ScreeningStatus;
  createdAt: string;
}

export function ScreeningReviews() {
  const [selectedTab, setSelectedTab] = useState('pending');
  const [screenings, setScreenings] = useState<ClinicianScreeningReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScreeningId, setSelectedScreeningId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const fetchScreenings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await clinicianAPI.getScreeningReviews();
        const data = response.data?.data || [];
        setScreenings(data);
      } catch (err: any) {
        console.error('Failed to load screening reviews:', err);
        setError(err.response?.data?.message || 'Failed to load screening reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchScreenings();
  }, []);

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

  const filteredScreenings = screenings.filter((screening) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'pending') return screening.status === 'pending';
    if (selectedTab === 'needs_attention') return screening.status === 'needs_attention';
    if (selectedTab === 'reviewed') return screening.status === 'reviewed';
    return true;
  });

  const handleViewDetails = async (id: string) => {
    try {
      setSelectedScreeningId(id);
      setLoadingDetail(true);
      setSelectedSubmission(null);
      const res = await screeningAPI.getSubmissionById(id);
      const submission = res.data?.data || res.data;
      setSelectedSubmission(submission);
    } catch (err: any) {
      console.error('Failed to load submission details:', err);
      setError(err.response?.data?.message || 'Failed to load screening details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetails = () => {
    setSelectedScreeningId(null);
    setSelectedSubmission(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-600 mb-2">Screening Reviews</h2>
        <p className="text-gray-600">Review and analyze screening test results submitted by parents</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">
            {error}
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-6 text-sm text-gray-600">
            Loading screening reviews...
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({screenings.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({screenings.filter(s => s.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="needs_attention">
            Needs Attention ({screenings.filter(s => s.status === 'needs_attention').length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({screenings.filter(s => s.status === 'reviewed').length})
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
                        {screening.child.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{screening.child.name}</CardTitle>
                      <CardDescription>
                        {screening.child.ageYears ?? '—'} years old • {screening.questionnaireType} • Submitted {new Date(screening.createdAt).toLocaleDateString()}
                      </CardDescription>
                      <p className="text-xs text-gray-500 mt-1">
                        Parent: <span className="font-medium">{screening.parent.name}</span> ({screening.parent.email})
                      </p>
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
                      <span className="font-medium">Score:</span> {screening.score ?? 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Result:</span> {screening.result}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(screening.id)}>
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

          {!loading && filteredScreenings.length === 0 && (
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

      {selectedScreeningId && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Screening Details</CardTitle>
            <CardDescription>
              Full questionnaire responses and scoring details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingDetail && (
              <p className="text-sm text-gray-600">Loading details...</p>
            )}

            {!loadingDetail && selectedSubmission && (
              <>
                <div className="text-sm text-gray-700">
                  <div>
                    <span className="font-medium">Questionnaire:</span>{' '}
                    {selectedSubmission.questionnaireType}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="text-sm text-gray-700">
                  <span className="font-medium">Total Score:</span>{' '}
                  {selectedSubmission.scores?.totalScore ?? 'N/A'}
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto border-t pt-3">
                  <h4 className="text-sm font-semibold text-gray-800">
                    Questionnaire Responses
                  </h4>
                  {(selectedSubmission.responses || []).map((resp: any, idx: number) => (
                    <div
                      key={resp.questionId || idx}
                      className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-800"
                    >
                      <div className="font-medium mb-1">
                        Q{idx + 1}. {resp.questionId}
                      </div>
                      <div>
                        Answer:{' '}
                        <span className="font-semibold">
                          {String(resp.answer)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={closeDetails}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
