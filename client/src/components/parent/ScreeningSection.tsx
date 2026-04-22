import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { QuestionnaireSelection } from './screening/QuestionnaireSelection';
import { ScreeningIntro } from './screening/ScreeningIntro';
import { MCHATForm } from './screening/MCHATForm';
import { ASQ3Form } from './screening/ASQ3Form';
import { ScreeningResults } from './screening/ScreeningResults';
import ScreeningGuide from '../../pages/parent/ScreeningGuide';

type View = 'selection' | 'guide' | 'intro' | 'MCHAT-R' | 'ASQ-3' | 'results';

export function ScreeningSection() {
  const [currentView, setCurrentView] = useState<View>('selection');
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [screeningType, setScreeningType] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const [flowContext, setFlowContext] = useState<any>(null);

  const handleStartScreening = (type: string, child: any) => {
    setScreeningType(type);
    setSelectedChild(child);
    setCurrentView('guide');
  };

  const handleScreeningComplete = (screeningResults: any) => {
    setResults(screeningResults);
    setCurrentView('results');
  };

  const handleStartFromGuide = (type: string) => {
    setScreeningType(type);
    setFlowContext(null);
    if (type === 'MCHAT-R') setCurrentView('MCHAT-R');
    else if (type === 'ASQ-3') setCurrentView('ASQ-3');
    else setCurrentView('selection');
  };

  const handleStartFromGuideWithContext = (type: string, context: any) => {
    setScreeningType(type);
    setFlowContext(context || null);
    if (type === 'MCHAT-R') setCurrentView('MCHAT-R');
    else if (type === 'ASQ-3') setCurrentView('ASQ-3');
    else setCurrentView('selection');
  };

  const handleBack = () => {
    if (currentView === 'intro') {
      setCurrentView('selection');
      setSelectedChild(null);
      setScreeningType('');
    } else {
      setCurrentView('selection');
      setSelectedChild(null);
      setScreeningType('');
      setResults(null);
    }
  };

  function handleIntroComplete(): void {
    if (screeningType === 'MCHAT-R') setCurrentView('MCHAT-R');
    else if (screeningType === 'ASQ-3') setCurrentView('ASQ-3');
    else setCurrentView('selection');
  }

  function handleIntroCancel(): void {
    setCurrentView('selection');
    setSelectedChild(null);
    setScreeningType('');
  }

  return (
    <div className="max-w-4xl mx-auto">
      {currentView !== 'selection' && currentView !== 'intro' && (
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

      {currentView === 'guide' && (
        <ScreeningGuide
          child={selectedChild}
          selectedType={screeningType}
          onBack={handleBack}
          onStart={handleStartFromGuideWithContext}
        />
      )}

      {currentView === 'intro' && (
        <ScreeningIntro
          onStart={handleIntroComplete}
          onCancel={handleIntroCancel}
          questionnaireType={screeningType}
        />
      )}

      {currentView === 'MCHAT-R' && (
        <MCHATForm
          child={selectedChild}
          flowContext={flowContext}
          onComplete={handleScreeningComplete}
        />
      )}

      {currentView === 'ASQ-3' && (
        <ASQ3Form
          child={selectedChild}
          flowContext={flowContext}
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
