import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { ClipboardList, Baby, Info, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';

interface QuestionnaireSelectionProps {
  onStartScreening: (type: string, child: any) => void;
}

const mockChildren = [
  { id: 1, name: 'Emma Johnson', age: 4 },
  { id: 2, name: 'Noah Johnson', age: 3 },
];

export function QuestionnaireSelection({ onStartScreening }: QuestionnaireSelectionProps) {
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>('');

  const handleStart = () => {
    if (!selectedChild || !selectedQuestionnaire) return;
    const child = mockChildren.find(c => c.id.toString() === selectedChild);
    onStartScreening(selectedQuestionnaire, child);
  };

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
                {mockChildren.map((child) => (
                  <SelectItem key={child.id} value={child.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Baby className="w-4 h-4 text-pink-600" />
                      {child.name} ({child.age} years old)
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
                <SelectItem value="mchat">
                  <div>
                    <div className="font-medium">M-CHAT-R™</div>
                    <div className="text-xs text-gray-600">
                      Modified Checklist for Autism (16-30 months)
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="asq3">
                  <div>
                    <div className="font-medium">ASQ-3™</div>
                    <div className="text-xs text-gray-600">
                      Ages & Stages Questionnaire (2-66 months)
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="facial">
                  <div>
                    <div className="font-medium">Facial Screening (AI)</div>
                    <div className="text-xs text-gray-600">
                      AI-powered facial analysis (All ages)
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={`cursor-pointer transition-all ${selectedQuestionnaire === 'mchat' ? 'border-2 border-purple-500 shadow-lg' : 'hover:shadow-md'}`}
          onClick={() => setSelectedQuestionnaire('mchat')}
        >
          <CardHeader>
            <CardTitle className="text-purple-600">M-CHAT-R™</CardTitle>
            <CardDescription>Autism Screening Tool</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-gray-600">
              • 20 yes/no questions
            </p>
            <p className="text-gray-600">
              • Takes 5-10 minutes
            </p>
            <p className="text-gray-600">
              • For children 16-30 months
            </p>
            <p className="text-gray-600">
              • Screens for autism spectrum disorder
            </p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${selectedQuestionnaire === 'asq3' ? 'border-2 border-purple-500 shadow-lg' : 'hover:shadow-md'}`}
          onClick={() => setSelectedQuestionnaire('asq3')}
        >
          <CardHeader>
            <CardTitle className="text-purple-600">ASQ-3™</CardTitle>
            <CardDescription>Developmental Screening</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-gray-600">
              • 30 questions across 5 domains
            </p>
            <p className="text-gray-600">
              • Takes 10-15 minutes
            </p>
            <p className="text-gray-600">
              • For children 2-66 months
            </p>
            <p className="text-gray-600">
              • Assesses overall development
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
