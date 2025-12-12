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
  Sparkles,
  TrendingUp,
  BookOpen,
  Users
} from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';

interface ScreeningResultsProps {
  results: any;
  screeningType: string;
  child: any;
}

export function ScreeningResults({ results, screeningType, child }: ScreeningResultsProps) {
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

  const getRiskMessage = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'Development appears to be on track';
      case 'medium':
        return 'Some areas may benefit from monitoring';
      case 'high':
        return 'Further evaluation is recommended';
      default:
        return '';
    }
  };

  const color = getRiskColor(results.riskLevel);

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
                  {results.type} for {child?.name}
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
              {getRiskMessage(results.riskLevel)}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Domain Scores (ASQ-3 only) */}
      {results.domainScores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Domain Analysis
            </CardTitle>
            <CardDescription>
              Detailed breakdown by developmental area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(results.domainScores).map(([key, domain]: [string, any]) => {
              const domainColor = getRiskColor(domain.risk);
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900">{domain.name}</span>
                      <Badge className={`bg-${domainColor}-500`}>
                        {domain.risk}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-600">
                      {domain.score}/{domain.maxScore}
                    </span>
                  </div>
                  <Progress value={domain.percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <Sparkles className="w-5 h-5" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-blue-900">Key Observations:</h4>
            <ul className="space-y-2 text-gray-700">
              {results.riskLevel === 'low' ? (
                <>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Child is meeting expected developmental milestones for their age</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Continue with regular developmental monitoring</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Maintain current activities and routines</span>
                  </li>
                </>
              ) : results.riskLevel === 'medium' ? (
                <>
                  <li className="flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span>Some developmental areas show potential for improvement</span>
                  </li>
                  <li className="flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span>Consider targeted activities in specific domains</span>
                  </li>
                  <li className="flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span>Follow-up screening recommended in 2-3 months</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Further professional evaluation is strongly recommended</span>
                  </li>
                  <li className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Early intervention can make a significant difference</span>
                  </li>
                  <li className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>We've prepared referrals to specialists in your area</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-600">
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-auto py-6 flex-col gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              <Calendar className="w-6 h-6" />
              <span>Schedule Appointment</span>
              <span className="text-xs opacity-90">with a Specialist</span>
            </Button>

            <Button
              className="h-auto py-6 flex-col gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            >
              <BookOpen className="w-6 h-6" />
              <span>View Activities</span>
              <span className="text-xs opacity-90">Personalized for {child?.name}</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2 border-2"
            >
              <Download className="w-6 h-6" />
              <span>Download Report</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2 border-2"
            >
              <Share2 className="w-6 h-6" />
              <span>Share with Provider</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Specialists */}
      {results.riskLevel !== 'low' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-600">
              <Users className="w-5 h-5" />
              Suggested Specialists
            </CardTitle>
            <CardDescription>
              Healthcare professionals who can help
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Dr. Sarah Johnson', specialty: 'Developmental Pediatrician', rating: 4.9, available: 'Next week' },
              { name: 'Dr. Emily Chen', specialty: 'Child Psychologist', rating: 4.8, available: 'In 2 weeks' },
              { name: 'Alex Martinez', specialty: 'Speech Therapist', rating: 4.9, available: 'Tomorrow' },
            ].map((specialist, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white">
                    {specialist.name[0]}
                  </div>
                  <div>
                    <h4 className="text-indigo-600">{specialist.name}</h4>
                    <p className="text-sm text-gray-600">{specialist.specialty}</p>
                    <p className="text-xs text-gray-500 mt-1">Available: {specialist.available}</p>
                  </div>
                </div>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  Book
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
