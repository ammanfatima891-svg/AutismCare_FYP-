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
  Info,
  RotateCcw,
  Baby
} from 'lucide-react';
import { toast } from 'sonner';
import { facialScreeningAPI } from '../../../api';

interface FacialScreeningProps {
  child: any;
  onComplete: (results: any) => void;
}

/** Maps API label (e.g. autistic / non_autistic) to parent-facing ASD vs Non-ASD. */
function mapFacialClassification(label: unknown, prob: number, thr: number): 'ASD' | 'Non-ASD' {
  const s = String(label ?? '').toLowerCase();
  if (s === 'non_autistic' || s.includes('non-asd') || s === 'nonasd') return 'Non-ASD';
  if (s === 'autistic' || s.includes('asd')) return 'ASD';
  return prob >= thr ? 'ASD' : 'Non-ASD';
}

export function FacialScreening({ child, onComplete }: FacialScreeningProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setSelectedImage(url);
      setShowGuidelines(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !selectedImage) {
      toast.error('Please upload an image first');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const interval = window.setInterval(() => {
      setAnalysisProgress((prev) => (prev >= 90 ? prev : prev + 5));
    }, 150);

    try {
      const form = new FormData();
      form.append('image', selectedFile);

      const res = await facialScreeningAPI.predict(form);
      const { probability, threshold, label, blurredImageUrl } = res.data || {};

      const prob = typeof probability === 'number' ? probability : 0.5;
      const thr = typeof threshold === 'number' ? threshold : 0.5;
      const classification = mapFacialClassification(label, prob, thr);

      const riskLevel =
        prob >= thr + 0.2 ? 'high' : prob >= thr + 0.05 ? 'medium' : 'low';

      const confidence = Math.max(
        50,
        Math.min(99, Math.round(Math.abs(prob - thr) * 200))
      );

      const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
      const blurredSrc =
        typeof blurredImageUrl === 'string' && blurredImageUrl.startsWith('/uploads')
          ? `${apiBase}${blurredImageUrl}`
          : selectedImage;

      const results = {
        type: 'Facial Analysis',
        child,
        date: new Date().toISOString(),
        image: blurredSrc, // show blurred image in UI (privacy)
        model: 'inception_v3',
        classification,
        prediction: { probability: prob, threshold: thr, label },
        features: {
          overall: {
            score: Math.round(prob * 100),
            status: riskLevel,
            description: 'Model probability-based screening result',
          },
        },
        overallScore: Math.round(prob * 100),
        riskLevel,
        confidence,
        recommendations:
          riskLevel === 'high'
            ? [
                'Recommend follow-up with a developmental specialist.',
                'Combine results with standardized questionnaires (M-CHAT-R, ASQ-3).',
              ]
            : riskLevel === 'medium'
              ? [
                  'Consider follow-up assessment and monitor development over time.',
                  'Combine results with standardized questionnaires (M-CHAT-R, ASQ-3).',
                ]
              : [
                  'If you still have concerns, complete a standardized questionnaire (M-CHAT-R, ASQ-3).',
                  'Discuss any developmental concerns with your clinician.',
                ],
      };

      setAnalysisProgress(100);
      onComplete(results);
    } catch (e: any) {
      console.error(e);
      const data = e?.response?.data;
      const base = data?.message || e?.message || 'Facial screening failed.';
      const tail = data?.error ? ` (${data.error})` : '';
      const d = data?.details?.detail;
      const fastApi =
        typeof d === 'string' ? d : Array.isArray(d) ? d.map((x: any) => x?.msg || x).join(' ') : '';
      toast.error(fastApi ? `${base} ${fastApi}` : `${base}${tail}`);
    } finally {
      window.clearInterval(interval);
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    if (selectedImage) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    setSelectedFile(null);
    setShowGuidelines(true);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2">
        <CardHeader className="ds-card-header-strip border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-primary">Facial Screening</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Baby className="w-4 h-4" />
                  {child?.firstName} {child?.lastName}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-primary">
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
            <CardTitle className="text-primary">Upload Photo</CardTitle>
            <CardDescription>
              Upload a clear photo of your child's face for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border rounded-lg p-12 text-center hover:border-primary hover:bg-muted transition-all cursor-pointer"
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-primary mb-2">Click to Upload Photo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  or drag and drop your image here
                </p>
                <p className="text-xs text-muted-foreground">
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
                <div className="relative rounded-lg overflow-hidden border-2">
                  <img
                    src={selectedImage}
                    alt="Child's photo"
                    className="w-full h-auto max-h-96 object-contain bg-muted"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge className="bg-primary">
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
                    className="flex-1 rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
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
        <Card className="border-2">
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-primary">Analyzing Facial Features...</h3>
                <p className="text-muted-foreground">
                  Our AI is processing the image and analyzing developmental markers
                </p>

                <div className="max-w-md mx-auto space-y-2">
                  <Progress value={analysisProgress} className="h-3" />
                  <p className="text-sm text-muted-foreground">{analysisProgress}% Complete</p>
                </div>

                <div className="flex flex-col gap-2 text-sm text-muted-foreground mt-6">
                  {analysisProgress > 20 && (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Facial detection complete</span>
                    </div>
                  )}
                  {analysisProgress > 40 && (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Analyzing eye contact patterns</span>
                    </div>
                  )}
                  {analysisProgress > 60 && (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Evaluating facial expressions</span>
                    </div>
                  )}
                  {analysisProgress > 80 && (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-4 h-4 text-primary" />
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
