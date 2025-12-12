import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Progress } from '../../ui/progress';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Info,
  RotateCcw,
  Baby
} from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { toast } from 'sonner';

interface FacialScreeningProps {
  child: any;
  onComplete: (results: any) => void;
}

export function FacialScreening({ child, onComplete }: FacialScreeningProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setShowGuidelines(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    if (!selectedImage) {
      toast.error('Please upload an image first');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate AI analysis with progress
    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const results = {
              type: 'Facial Analysis',
              child: child,
              date: new Date().toISOString(),
              image: selectedImage,
              features: {
                eyeContact: { score: 75, status: 'moderate', description: 'Moderate eye gaze patterns detected' },
                facialSymmetry: { score: 85, status: 'normal', description: 'Typical facial symmetry observed' },
                facialExpressions: { score: 60, status: 'atypical', description: 'Limited range of expressions noted' },
                socialEngagement: { score: 70, status: 'moderate', description: 'Some signs of social awareness' },
              },
              overallScore: 72.5,
              riskLevel: 'medium',
              confidence: 87,
              recommendations: [
                'Follow-up assessment with developmental specialist recommended',
                'Monitor social interaction patterns',
                'Consider speech and language evaluation',
              ],
            };
            onComplete(results);
            setIsAnalyzing(false);
          }, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setShowGuidelines(true);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Camera className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-purple-600">Facial Screening</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Baby className="w-4 h-4" />
                  {child?.name}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-purple-600">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Guidelines */}
      {showGuidelines && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <p className="font-medium mb-2">Photo Guidelines for Best Results:</p>
            <ul className="space-y-1 text-sm ml-4">
              <li>• Clear, well-lit photo of child's face</li>
              <li>• Face should be clearly visible and centered</li>
              <li>• Child should be looking toward the camera</li>
              <li>• Avoid blurry or low-quality images</li>
              <li>• Remove glasses or accessories that cover the face</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      {!isAnalyzing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-purple-600">Upload Photo</CardTitle>
            <CardDescription>
              Upload a clear photo of your child's face for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-300 rounded-lg p-12 text-center hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer"
              >
                <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-purple-600 mb-2">Click to Upload Photo</h3>
                <p className="text-sm text-gray-600 mb-4">
                  or drag and drop your image here
                </p>
                <p className="text-xs text-gray-500">
                  Supports: JPG, PNG, HEIC (Max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border-2 border-purple-200">
                  <img
                    src={selectedImage}
                    alt="Child's photo"
                    className="w-full h-auto max-h-96 object-contain bg-gray-50"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Photo Uploaded
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Choose Different Photo
                  </Button>
                  <Button
                    onClick={handleAnalyze}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start AI Analysis
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card className="border-2 border-purple-200">
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-purple-600" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-purple-600">Analyzing Facial Features...</h3>
                <p className="text-gray-600">
                  Our AI is processing the image and analyzing developmental markers
                </p>

                <div className="max-w-md mx-auto space-y-2">
                  <Progress value={analysisProgress} className="h-3" />
                  <p className="text-sm text-gray-500">{analysisProgress}% Complete</p>
                </div>

                <div className="flex flex-col gap-2 text-sm text-gray-600 mt-6">
                  {analysisProgress > 20 && (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Facial detection complete</span>
                    </div>
                  )}
                  {analysisProgress > 40 && (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Analyzing eye contact patterns</span>
                    </div>
                  )}
                  {analysisProgress > 60 && (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Evaluating facial expressions</span>
                    </div>
                  )}
                  {analysisProgress > 80 && (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Generating recommendations</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Your child's photo is processed securely and is not stored permanently. 
          Results are saved to your child's profile for healthcare provider review.
        </AlertDescription>
      </Alert>
    </div>
  );
}
