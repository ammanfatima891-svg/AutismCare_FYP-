import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { QuestionnaireSelection } from './screening/QuestionnaireSelection';
import { MCHATForm } from './screening/MCHATForm';
import { ASQ3Form } from './screening/ASQ3Form';
import { ScreeningResults } from './screening/ScreeningResults';

type View = 'selection' | 'MCHAT-R' | 'ASQ-3' | 'results';

export function ScreeningSection() {
  const [currentView, setCurrentView] = useState<View>('selection');
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [screeningType, setScreeningType] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const handleStartScreening = (type: string, child: any) => {
    setScreeningType(type);
    setSelectedChild(child);
    if (type === 'MCHAT-R') setCurrentView('MCHAT-R');
    else if (type === 'ASQ-3') setCurrentView('ASQ-3');
  };

  const handleScreeningComplete = (screeningResults: any) => {
    setResults(screeningResults);
    setCurrentView('results');
  };

  const handleBack = () => {
    setCurrentView('selection');
    setSelectedChild(null);
    setScreeningType('');
    setResults(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {currentView !== 'selection' && (
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      )}

      {currentView === 'selection' && (
        <QuestionnaireSelection onStartScreening={handleStartScreening} />
      )}

      {currentView === 'MCHAT-R' && (
        <MCHATForm
          child={selectedChild}
          onComplete={handleScreeningComplete}
        />
      )}

      {currentView === 'ASQ-3' && (
        <ASQ3Form
          child={selectedChild}
          onComplete={handleScreeningComplete}
        />
      )}

      {currentView === 'results' && (
        <ScreeningResults
          results={results}
          screeningType={screeningType}
          child={selectedChild}
        />
      )}
    </div>
  );
}
