import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Download,
  Share2,
  Calendar,
  TrendingUp,
  Target,
  FileText,
  Sparkles,
  EyeOff,
  Eye,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { useState, useEffect } from 'react';
import API, { screeningAPI } from '../../../api';
import jsPDF from 'jspdf';

interface ScreeningResultsProps {
  results: any;
  screeningType: string;
  child: any;
}

export function ScreeningResults({ results, screeningType, child }: ScreeningResultsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [cliniciansAndTherapists, setCliniciansAndTherapists] = useState({ clinicians: [], therapists: [] });
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<any>(null);



  useEffect(() => {
    if (screeningType === 'M-CHAT-R') {
      const fetchQuestions = async () => {
        try {
          const response = await API.get(`/screening/questionnaires/MCHAT-R?dob=${child.dateOfBirth}`);
          setQuestions(response.data.data.questions || []);
        } catch (error) {
          console.error('Error fetching questions:', error);
        }
      };
      fetchQuestions();
    }
  }, [screeningType, child.dateOfBirth]);

  useEffect(() => {
    const fetchCliniciansAndTherapists = async () => {
      setLoading(true);
      try {
        const response = await screeningAPI.getAvailableCliniciansAndTherapists();
        setCliniciansAndTherapists(response.data.data);
      } catch (error) {
        console.error('Error fetching clinicians and therapists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCliniciansAndTherapists();
  }, []);

  useEffect(() => {
    if ((screeningType === 'M-CHAT-R' || screeningType === 'ASQ-3') && results.submissionId) {
      const fetchSubmission = async () => {
        try {
          const response = await screeningAPI.getSubmissionById(results.submissionId);
          setSubmission(response.data.data);
        } catch (error) {
          console.error('Error fetching submission:', error);
        }
      };
      fetchSubmission();
    }
  }, [screeningType, results.submissionId]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'high':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="w-6 h-6" />;
      case 'medium':
        return <AlertTriangle className="w-6 h-6" />;
      case 'high':
        return <AlertCircle className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getRiskMessage = (risk: string, type: string) => {
    if (type === 'M-CHAT-R') {
      switch (risk) {
        case 'low':
          return 'Low likelihood for autism. No Follow-Up needed.';
        case 'medium':
          return 'Needs follow-up.';
        case 'high':
          return 'High risk. Immediate evaluation needed by professional.';
        default:
          return '';
      }
    } else {
      // ASQ-3 uses domain statuses, but overall risk message
      switch (risk) {
        case 'low':
          return 'Child developing within expected range';
        case 'medium':
          return 'Development should be monitored and rescreened';
        case 'high':
          return 'Further developmental evaluation recommended';
        default:
          return '';
      }
    }
  };

  const color = getRiskColor(results.riskLevel);

  const downloadReport = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(`${screeningType} Screening Report`, 20, 30);

    // Child info
    doc.setFontSize(12);
    doc.text(`Child: ${child?.firstName} ${child?.lastName}`, 20, 50);
    doc.text(`Date: ${new Date(results.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 20, 60);

    // Results
    doc.setFontSize(14);
    doc.text('Results:', 20, 80);
    doc.setFontSize(12);

    if (screeningType === 'M-CHAT-R') {
      doc.text(`Total Score: ${results.scores?.totalScore || 0}/20`, 20, 95);
      doc.text(`Result: ${(results.result || 'UNKNOWN').toUpperCase()}`, 20, 105);
      doc.text(`Risk Level: ${results.riskLevel.toUpperCase()}`, 20, 115);

      if (results.resultDescription) {
        doc.text(`Description: ${results.resultDescription}`, 20, 130);
      }

      if (submission?.result) {
        doc.text(`Database Result: ${submission.result}`, 20, 145);
      }

      if (results.scores?.elevatedItems && results.scores.elevatedItems.length > 0) {
        let yPos = submission?.result ? 160 : 145;
        doc.text('Elevated Items:', 20, yPos);
        results.scores.elevatedItems.forEach((item: any, index: number) => {
          doc.text(`  ${index + 1}. Question ${item}`, 30, yPos + 10 + index * 10);
        });
      }
    } else if (screeningType === 'ASQ-3') {
      doc.text(`Overall Risk Level: ${results.riskLevel.toUpperCase()}`, 20, 95);

      if (results.scores?.domainScores && results.scores?.domainStatuses) {
        doc.text('Domain Scores:', 20, 110);
        let yPos = 125;
        Object.entries(results.scores.domainScores).forEach(([domain, score]: [string, any]) => {
          const status = results.scores.domainStatuses[domain];
          doc.text(`${domain}: ${score}/60 (${status})`, 30, yPos);
          yPos += 15;
        });
      }
    }

    // Save the PDF
    doc.save(`${screeningType}_Report_${child?.firstName}_${new Date(results.date).toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card className={`border-2 border-${color}-300 bg-gradient-to-br from-${color}-50 to-purple-50`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-600`}>
                {getRiskIcon(results.riskLevel)}
              </div>
              <div>
                <CardTitle className={`text-${color}-900 flex items-center gap-2`}>
                  Screening Complete! 🎉
                </CardTitle>
                <CardDescription className="mt-1">
                  {results.type} for {child?.firstName} {child?.lastName}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`bg-${color}-600 text-white`}>
                {results.riskLevel.toUpperCase()} RISK
              </Badge>
              <p className="text-xs text-gray-600 mt-2">
                {new Date(results.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className={`bg-${color}-100 border-${color}-300`}>
            <Sparkles className={`h-4 w-4 text-${color}-600`} />
            <AlertDescription className={`text-${color}-900`}>
              {(screeningType === 'MCHAT-R' || screeningType === 'M-CHAT-R') && results.resultDescription ? results.resultDescription : getRiskMessage(results.riskLevel, screeningType)}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* MCHAT-R Scores */}
      {screeningType === 'M-CHAT-R' && results.scores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              M-CHAT-R Scores
            </CardTitle>
            <CardDescription>
              Total score, result, and elevated items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-900 font-medium">Total Score</span>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {results.scores.totalScore}/20
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-900 font-medium">Result</span>
              <Badge className={`bg-${getRiskColor(results.riskLevel)}-500 text-white`}>
                {results.result}
              </Badge>
            </div>
            {results.scores.elevatedItems && results.scores.elevatedItems.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-900 font-medium">Elevated Items</span>
                <ul className="mt-2 list-disc list-inside text-sm text-gray-600">
                  {results.scores.elevatedItems.map((item: any, index: number) => (
                    <li key={index}>Question {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MCHAT-R Score Object */}
      {screeningType === 'M-CHAT-R' && submission?.scores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              M-CHAT-R Score Object
            </CardTitle>
            <CardDescription>
              Complete score object from the M-CHAT-R submission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
              {JSON.stringify(submission.scores, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Domain Scores (ASQ-3 only) */}
      {results.scores?.domainScores && results.scores?.domainStatuses && screeningType === 'ASQ-3' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Domain Scores & Recommendations
            </CardTitle>
            <CardDescription>
              Individual domain scores with developmental recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(results.scores.domainScores).map(([domain, score]: [string, any]) => {
              const status = results.scores.domainStatuses[domain];
              let statusColor = 'gray';
              let statusText = '';

              switch (status) {
                case 'normal development':
                  statusColor = 'green';
                  statusText = 'Normal';
                  break;
                case 'need monitoring':
                  statusColor = 'yellow';
                  statusText = 'Needs Monitoring';
                  break;
                case 'referral for further evaluation':
                  statusColor = 'red';
                  statusText = 'Referral';
                  break;
                default:
                  statusColor = 'gray';
                  statusText = 'Unknown';
              }

              return (
                <div key={domain} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-900 font-medium capitalize">{domain}</span>
                    <Badge className={`bg-${statusColor}-500 text-white`}>
                      {statusText}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {score}/60
                    </div>
                    <div className="text-sm text-gray-600">
                      {status === 'normal development' && 'Normal development'}
                      {status === 'need monitoring' && 'Needs monitoring'}
                      {status === 'referral for further evaluation' && 'Referral recommended'}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Clinicians and Therapists */}
      {(cliniciansAndTherapists.clinicians.length > 0 || cliniciansAndTherapists.therapists.length > 0) && (screeningType === 'ASQ-3' || screeningType === 'MCHAT-R') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <User className="w-5 h-5" />
              Available Specialists
            </CardTitle>
            <CardDescription>
              Schedule appointments with approved clinicians and therapists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Clinicians */}
            {cliniciansAndTherapists.clinicians.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Clinicians
                </h4>
                <div className="grid gap-4">
                  {cliniciansAndTherapists.clinicians.map((clinician: any) => (
                    <div key={clinician._id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">
                            Dr. {clinician.firstName} {clinician.lastName}
                          </h5>
                          <p className="text-sm text-gray-600 capitalize">
                            {clinician.specialization}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {clinician.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {clinician.phoneNumber}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Book Appointment
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Therapists */}
            {cliniciansAndTherapists.therapists.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Therapists
                </h4>
                <div className="grid gap-4">
                  {cliniciansAndTherapists.therapists.map((therapist: any) => (
                    <div key={therapist._id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {therapist.firstName} {therapist.lastName}
                          </h5>
                          <p className="text-sm text-gray-600 capitalize">
                            {therapist.specialization}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {therapist.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {therapist.phoneNumber}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Book Appointment
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-600">
            <FileText className="w-5 h-5" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" className="flex items-center gap-2" onClick={downloadReport}>
              <Download className="w-4 h-4" />
              Download Report
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

