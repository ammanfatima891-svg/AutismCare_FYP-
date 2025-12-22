import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Download, 
  Share2, 
  Calendar,
  Sparkles,
  TrendingUp,
  Eye,
  Smile,
  Users
} from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';

interface FacialScreeningResultsProps {
  results: any;
  child: any;
}

export function FacialScreeningResults({ results, child }: FacialScreeningResultsProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'green';
      case 'medium':
      case 'moderate':
        return 'yellow';
      case 'high':
      case 'atypical':
        return 'red';
      default:
        return 'blue';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'moderate':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'atypical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const color = getRiskColor(results.riskLevel);

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card className={`border-2 border-${color}-300 bg-gradient-to-br from-${color}-50 to-purple-50`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-${color}-100 flex items-center justify-center`}>
                <Camera className={`w-8 h-8 text-${color}-600`} />
              </div>
              <div>
                <CardTitle className={`text-${color}-900 flex items-center gap-2`}>
                  Facial Screening Complete! 🎉
                </CardTitle>
                <CardDescription className="mt-1">
                  AI Analysis for {child?.firstName} {child?.lastName}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`bg-${color}-600 text-white mb-2`}>
                {results.riskLevel.toUpperCase()} RISK
              </Badge>
              <p className="text-xs text-gray-600">
                Confidence: {results.confidence}%
              </p>
              <p className="text-xs text-gray-600">
                {new Date(results.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg overflow-hidden border-2 border-purple-200">
              <img
                src={results.image}
                alt="Analyzed photo"
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="flex flex-col justify-center space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-2">Overall Analysis Score</p>
                <div className="flex items-center gap-3">
                  <Progress value={results.overallScore} className="h-3 flex-1" />
                  <span className={`text-xl font-bold text-${color}-700`}>
                    {results.overallScore}%
                  </span>
                </div>
              </div>
              <Alert className={`bg-${color}-100 border-${color}-300`}>
                <Sparkles className={`h-4 w-4 text-${color}-600`} />
                <AlertDescription className={`text-${color}-900 text-sm`}>
                  AI analysis complete with {results.confidence}% confidence level
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Detailed Feature Analysis
          </CardTitle>
          <CardDescription>
            AI assessment of developmental markers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(results.features).map(([key, feature]: [string, any]) => {
            const featureColor = getRiskColor(feature.status);
            const icons: { [key: string]: any } = {
              eyeContact: Eye,
              facialSymmetry: Smile,
              facialExpressions: Smile,
              socialEngagement: Users,
            };
            const Icon = icons[key] || CheckCircle;

            return (
              <div key={key} className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-${featureColor}-100 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${featureColor}-600`} />
                    </div>
                    <div>
                      <h4 className={`text-${featureColor}-900 capitalize`}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`bg-${featureColor}-500 mb-1`}>
                      {feature.status}
                    </Badge>
                    <p className="text-sm text-gray-900">{feature.score}%</p>
                  </div>
                </div>
                <Progress value={feature.score} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <Sparkles className="w-5 h-5" />
            AI-Powered Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-blue-900">Recommendations:</h4>
            <ul className="space-y-2">
              {results.recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex gap-2 text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-blue-600">{index + 1}</span>
                  </div>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <Alert className="bg-blue-100 border-blue-300 mt-4">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              This facial analysis is a screening tool and not a diagnostic assessment. 
              Please consult with a healthcare professional for comprehensive evaluation.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-600">
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-auto py-6 flex-col gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              <Calendar className="w-6 h-6" />
              <span>Schedule Appointment</span>
              <span className="text-xs opacity-90">with a Specialist</span>
            </Button>

            <Button
              className="h-auto py-6 flex-col gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <TrendingUp className="w-6 h-6" />
              <span>Complete Full Screening</span>
              <span className="text-xs opacity-90">M-CHAT-R or ASQ-3</span>
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

      {/* Disclaimer */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <p className="font-medium mb-1">Important Notice:</p>
          This AI-powered facial screening is a preliminary assessment tool and should not replace 
          professional medical diagnosis. Results should be reviewed by qualified healthcare professionals.
        </AlertDescription>
      </Alert>
    </div>
  );
}
