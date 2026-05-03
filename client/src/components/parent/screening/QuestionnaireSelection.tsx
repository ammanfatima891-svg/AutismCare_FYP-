import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { ClipboardList, Baby, Info, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { childAPI } from '../../../api';
import { getAgeDisplayString } from '../../../utils/ageUtils';
import API from '../../../api';

interface QuestionnaireSelectionProps {
  onStartScreening: (type: string, child: any) => void;
}

export function QuestionnaireSelection({ onStartScreening }: QuestionnaireSelectionProps) {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>('');
  const [availableQuestionnaires, setAvailableQuestionnaires] = useState<any[]>([]);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await childAPI.getChildren();
        setChildren(response.data.data || []);
      } catch (error) {
        console.error('Error fetching children:', error);
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  useEffect(() => {
    const fetchAvailableQuestionnaires = async () => {
      if (!selectedChild) {
        setAvailableQuestionnaires([]);
        return;
      }

      const child = children.find((c: any) => c.id.toString() === selectedChild);
      if (!child) return;

      try {
        const response = await API.get(
          `/screening/available-questionnaires?childId=${encodeURIComponent(selectedChild)}`
        );
        setAvailableQuestionnaires(response.data.data || []);
      } catch (error) {
        console.error('Error fetching available questionnaires:', error);
        setAvailableQuestionnaires([]);
      }
    };

    fetchAvailableQuestionnaires();
  }, [selectedChild, children]);

  useEffect(() => {
    setSelectedQuestionnaire('');
  }, [selectedChild]);

  const handleStart = () => {
    if (!selectedChild || !selectedQuestionnaire) return;
    const child = children.find((c: any) => c.id.toString() === selectedChild);
    onStartScreening(selectedQuestionnaire, child);
  };

  const questionnaireOptions = useMemo(() => {
    const types = new Set<string>();
    for (const q of availableQuestionnaires) {
      if (q?.type) types.add(q.type);
    }
    return Array.from(types);
  }, [availableQuestionnaires]);

  const selectedIsEligible =
    !!selectedChild &&
    !!selectedQuestionnaire &&
    availableQuestionnaires.some((q: any) => String(q.childId) === selectedChild && q.type === selectedQuestionnaire);

  if (loading) {
    return <div className="text-center py-8">Loading children...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-primary mb-2">Developmental Screening</h2>
        <p className="text-muted-foreground">
          Complete a screening questionnaire to assess your child's development
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          These screenings help identify children who may benefit from further evaluation.
          Results are not a diagnosis but can guide next steps in care.
        </AlertDescription>
      </Alert>

      {/* Selection Card */}
      <Card className="border-2">
        <CardHeader className="ds-card-header-strip border-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-primary">
            <ClipboardList className="w-6 h-6" />
            Select Screening
          </CardTitle>
          <CardDescription>
            Choose a child and questionnaire to begin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          {/* Child Selection */}
          <div className="space-y-2">
            <Label htmlFor="child">Select Child *</Label>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger id="child" className="mt-0">
                <SelectValue placeholder="Choose a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child: any) => (
                  <SelectItem key={child.id} value={child.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Baby className="w-4 h-4 text-primary" />
                      {child.firstName} {child.lastName} ({getAgeDisplayString(child.dateOfBirth)})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Questionnaire Selection — only tools that match this child’s age */}
          <div className="space-y-2">
            <Label htmlFor="questionnaire">Select Questionnaire *</Label>
            <Select
              value={selectedQuestionnaire}
              onValueChange={setSelectedQuestionnaire}
              disabled={!selectedChild || questionnaireOptions.length === 0}
            >
              <SelectTrigger id="questionnaire" className="mt-0">
                <SelectValue
                  placeholder={
                    !selectedChild
                      ? 'Choose a child first'
                      : questionnaireOptions.length === 0
                        ? 'No questionnaires for this age right now'
                        : 'Choose a questionnaire'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {questionnaireOptions.includes('MCHAT-R') && (
                  <SelectItem value="MCHAT-R">
                    <div>
                      <div className="font-medium">M-CHAT-R™</div>
                      <div className="text-xs text-muted-foreground">
                        Modified Checklist for Autism (16–30 months)
                      </div>
                    </div>
                  </SelectItem>
                )}
                {questionnaireOptions.includes('ASQ-3') && (
                  <SelectItem value="ASQ-3">
                    <div>
                      <div className="font-medium">ASQ-3™</div>
                      <div className="text-xs text-muted-foreground">
                        Ages & Stages Questionnaire (age-based intervals)
                      </div>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedChild && questionnaireOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No standard questionnaire is scheduled for this child’s exact age window. Try again in a few weeks or ask
                your clinician.
              </p>
            )}
          </div>

          <div className="border-t border-border pt-6 mt-2">
            <Button
              onClick={handleStart}
              disabled={!selectedChild || !selectedQuestionnaire || !selectedIsEligible}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              Start Screening
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {!selectedIsEligible && selectedChild && selectedQuestionnaire ? (
              <p className="mt-3 text-center text-sm text-destructive">
                This questionnaire is not available for the selected child’s age window. Choose another tool or child.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
