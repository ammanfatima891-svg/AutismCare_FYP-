import { useState, useEffect } from 'react';
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
        const response = await API.get(`/screening/available-questionnaires?dob=${child.dateOfBirth}`);
        setAvailableQuestionnaires(response.data.data || []);
      } catch (error) {
        console.error('Error fetching available questionnaires:', error);
        setAvailableQuestionnaires([]);
      }
    };

    fetchAvailableQuestionnaires();
  }, [selectedChild, children]);

  const handleStart = () => {
    if (!selectedChild || !selectedQuestionnaire) return;
    const child = children.find((c: any) => c.id.toString() === selectedChild);
    onStartScreening(selectedQuestionnaire, child);
  };

  if (loading) {
    return <div className="text-center py-8">Loading children...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-purple-600 mb-2">Developmental Screening</h2>
        <p className="text-gray-600">
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
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2 text-purple-600">
            <ClipboardList className="w-6 h-6" />
            Select Screening
          </CardTitle>
          <CardDescription>
            Choose a child and questionnaire to begin
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Child Selection */}
          <div>
            <Label htmlFor="child">Select Child *</Label>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger id="child" className="mt-1">
                <SelectValue placeholder="Choose a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child: any) => (
                  <SelectItem key={child.id} value={child.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Baby className="w-4 h-4 text-pink-600" />
                      {child.firstName} {child.lastName} ({getAgeDisplayString(child.dateOfBirth)})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Questionnaire Selection */}
          <div>
            <Label htmlFor="questionnaire">Select Questionnaire *</Label>
            <Select value={selectedQuestionnaire} onValueChange={setSelectedQuestionnaire}>
              <SelectTrigger id="questionnaire" className="mt-1">
                <SelectValue placeholder="Choose a questionnaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MCHAT-R">
                  <div>
                    <div className="font-medium">M-CHAT-R™</div>
                    <div className="text-xs text-gray-600">
                      Modified Checklist for Autism (16-30 months)
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="ASQ-3">
                  <div>
                    <div className="font-medium">ASQ-3™</div>
                    <div className="text-xs text-gray-600">
                      Ages & Stages Questionnaire (2-66 months)
                    </div>
                  </div>
                </SelectItem>

              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleStart}
            disabled={!selectedChild || !selectedQuestionnaire}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Start Screening
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Questionnaire Info Cards */}
      {availableQuestionnaires.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableQuestionnaires.map((q: any) => (
            <Card
              key={q.type}
              className={`cursor-pointer transition-all ${selectedQuestionnaire === q.type ? 'border-2 border-purple-500 shadow-lg' : 'hover:shadow-md'}`}
              onClick={() => setSelectedQuestionnaire(q.type)}
            >
              <CardHeader>
                <CardTitle className="text-purple-600">{q.name}</CardTitle>
                <CardDescription>{q.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {q.type === 'MCHAT-R' && (
                  <>
                    <p className="text-gray-600">• 20 yes/no questions</p>
                    <p className="text-gray-600">• Takes 5-10 minutes</p>
                    <p className="text-gray-600">• For children 16-30 months</p>
                    <p className="text-gray-600">• Screens for autism spectrum disorder</p>
                  </>
                )}
                {q.type === 'ASQ-3' && (
                  <>
                    <p className="text-gray-600">• 30 questions across 5 domains</p>
                    <p className="text-gray-600">• Takes 10-15 minutes</p>
                    <p className="text-gray-600">• For children 2-66 months</p>
                    <p className="text-gray-600">• Assesses overall development</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
