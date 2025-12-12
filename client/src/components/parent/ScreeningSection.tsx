import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { QuestionnaireSelection } from './screening/QuestionnaireSelection';
import { MCHATForm } from './screening/MCHATForm';
import { ASQ3Form } from './screening/ASQ3Form';
import { FacialScreening } from './screening/FacialScreening';
import { ScreeningResults } from './screening/ScreeningResults';
import { FacialScreeningResults } from './screening/FacialScreeningResults';

type View = 'selection' | 'mchat' | 'asq3' | 'facial' | 'results' | 'facial-results';

export function ScreeningSection() {
  const [currentView, setCurrentView] = useState<View>('selection');
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [screeningType, setScreeningType] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const handleStartScreening = (type: string, child: any) => {
    setScreeningType(type);
    setSelectedChild(child);
    if (type === 'mchat') setCurrentView('mchat');
    else if (type === 'asq3') setCurrentView('asq3');
    else if (type === 'facial') setCurrentView('facial');
  };

  const handleScreeningComplete = (screeningResults: any) => {
    setResults(screeningResults);
    if (screeningType === 'facial') {
      setCurrentView('facial-results');
    } else {
      setCurrentView('results');
    }
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

      {currentView === 'mchat' && (
        <MCHATForm
          child={selectedChild}
          onComplete={handleScreeningComplete}
        />
      )}

      {currentView === 'asq3' && (
        <ASQ3Form
          child={selectedChild}
          onComplete={handleScreeningComplete}
        />
      )}

      {currentView === 'facial' && (
        <FacialScreening
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

      {currentView === 'facial-results' && (
        <FacialScreeningResults
          results={results}
          child={selectedChild}
        />
      )}
    </div>
  );
}
