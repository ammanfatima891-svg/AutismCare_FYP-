import { useState, useEffect } from 'react';
import { ArrowLeft, Info, Camera } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Alert, AlertDescription } from '../../ui/alert';
import { childAPI } from '../../../api';
import { getAgeDisplayString } from '../../../utils/ageUtils';
import { FacialScreening } from './FacialScreening';
import { FacialScreeningResults } from './FacialScreeningResults';

type Step = 'select' | 'capture' | 'results';

/**
 * Parent module entry for facial screening: pick child → capture/analyze → results.
 */
export function FacialScreeningSection() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('select');
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [flowKey, setFlowKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await childAPI.getChildren();
        setChildren(res.data.data || []);
      } catch (e) {
        console.error(e);
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleContinue = () => {
    const child = children.find((c: any) => String(c.id) === selectedChildId);
    if (!child) return;
    setSelectedChild(child);
    setStep('capture');
  };

  const handleComplete = (r: any) => {
    setResults(r);
    setStep('results');
  };

  const backToSelect = () => {
    setStep('select');
    setSelectedChild(null);
    setSelectedChildId('');
    setResults(null);
  };

  const tryAgain = () => {
    setResults(null);
    setFlowKey((k) => k + 1);
    setStep('capture');
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl py-8 text-center text-muted-foreground">Loading children…</div>;
  }

  if (children.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 py-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Add a child profile under <span className="font-medium">My Children</span> before running facial screening.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-primary mb-2 flex items-center gap-2">
          <Camera className="h-7 w-7" />
          Facial screening
        </h2>
        <p className="text-muted-foreground">
          Optional AI-assisted photo screening—use alongside questionnaires (M-CHAT-R, ASQ-3), not instead of them.
        </p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          This feature is for caregiver use with clinician follow-up. Results are not a diagnosis.
        </AlertDescription>
      </Alert>

      {step === 'select' && (
        <Card className="border-2">
          <CardHeader className="ds-card-header-strip border-0">
            <CardTitle className="text-primary">Choose child</CardTitle>
            <CardDescription>Select who this screening is for.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Child</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.firstName} {c.lastName} ({getAgeDisplayString(c.dateOfBirth)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              disabled={!selectedChildId}
              onClick={handleContinue}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'capture' && selectedChild && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={backToSelect} className="mb-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Change child
          </Button>
          <FacialScreening key={flowKey} child={selectedChild} onComplete={handleComplete} />
        </div>
      )}

      {step === 'results' && results && selectedChild && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={backToSelect}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Screen another child
            </Button>
            <Button variant="outline" onClick={tryAgain}>
              New photo, same child
            </Button>
          </div>
          <FacialScreeningResults results={results} child={selectedChild} />
        </div>
      )}
    </div>
  );
}
