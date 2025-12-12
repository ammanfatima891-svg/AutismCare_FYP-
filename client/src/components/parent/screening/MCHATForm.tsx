import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Label } from '../../ui/label';
import { Progress } from '../../ui/progress';
import { ClipboardCheck, Baby } from 'lucide-react';
import { toast } from 'sonner';

interface MCHATFormProps {
  child: any;
  onComplete: (results: any) => void;
}

const questions = [
  'If you point at something across the room, does your child look at it?',
  'Have you ever wondered if your child might be deaf?',
  'Does your child play pretend or make-believe?',
  'Does your child like climbing on things?',
  'Does your child make unusual finger movements near their eyes?',
  'Does your child point with one finger to ask for something or to get help?',
  'Does your child point with one finger to show you something interesting?',
  'Is your child interested in other children?',
  'Does your child show you things by bringing them to you or holding them up?',
  'Does your child respond when you call their name?',
  'When you smile at your child, does they smile back at you?',
  'Does your child get upset by everyday noises?',
  'Does your child walk?',
  'Does your child look you in the eye when you are talking or playing?',
  'Does your child try to copy what you do?',
  'If you turn your head to look at something, does your child look around to see what you are looking at?',
  'Does your child try to get you to watch them?',
  'Does your child understand when you tell them to do something?',
  'If something new happens, does your child look at your face to see how you feel about it?',
  'Does your child like movement activities?'
];

export function MCHATForm({ child, onComplete }: MCHATFormProps) {
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionsPerPage = 5;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage
  );

  const progress = (Object.keys(answers).length / questions.length) * 100;

  const handleAnswer = (questionIndex: number, value: string) => {
    setAnswers({ ...answers, [questionIndex]: value });
  };

  const handleNext = () => {
    const startIndex = currentPage * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    const currentPageAnswered = Array.from(
      { length: Math.min(questionsPerPage, questions.length - startIndex) },
      (_, i) => startIndex + i
    ).every((i) => answers[i]);

    if (!currentPageAnswered) {
      toast.error('Please answer all questions before continuing');
      return;
    }

    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setIsSubmitting(true);

    // Simulate AI analysis
    setTimeout(() => {
      // Calculate score (simplified)
      const criticalItems = [1, 4, 6, 9, 13, 14];
      let riskScore = 0;

      Object.entries(answers).forEach(([index, answer]) => {
        const questionIndex = parseInt(index);
        const isCritical = criticalItems.includes(questionIndex);
        
        // Reverse scoring for some questions
        if ([1, 4, 11].includes(questionIndex)) {
          if (answer === 'yes') riskScore++;
        } else {
          if (answer === 'no') riskScore++;
          if (isCritical && answer === 'no') riskScore += 2;
        }
      });

      const riskLevel = riskScore >= 8 ? 'high' : riskScore >= 3 ? 'medium' : 'low';

      const results = {
        type: 'M-CHAT-R',
        child: child,
        date: new Date().toISOString(),
        totalQuestions: questions.length,
        answeredQuestions: Object.keys(answers).length,
        score: riskScore,
        riskLevel: riskLevel,
        answers: answers,
      };

      onComplete(results);
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-6 h-6 text-purple-600" />
              <div>
                <CardTitle className="text-purple-600">M-CHAT-R™ Screening</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Baby className="w-4 h-4" />
                  {child?.name}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {Object.keys(answers).length}/{questions.length} answered
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Questions */}
      {!isSubmitting ? (
        <Card>
          <CardContent className="pt-6 space-y-8">
            {currentQuestions.map((question, index) => {
              const questionIndex = currentPage * questionsPerPage + index;
              return (
                <div
                  key={questionIndex}
                  className="p-6 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200"
                >
                  <Label className="text-purple-900 mb-4 block">
                    <span className="inline-block w-8 h-8 rounded-full bg-purple-600 text-white text-center leading-8 mr-3">
                      {questionIndex + 1}
                    </span>
                    {question}
                  </Label>
                  <RadioGroup
                    value={answers[questionIndex]}
                    onValueChange={(value) => handleAnswer(questionIndex, value)}
                    className="flex gap-6 mt-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="yes"
                        id={`q${questionIndex}-yes`}
                        className="border-2"
                      />
                      <Label
                        htmlFor={`q${questionIndex}-yes`}
                        className="cursor-pointer text-green-700 px-4 py-2 rounded-md hover:bg-green-100"
                      >
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="no"
                        id={`q${questionIndex}-no`}
                        className="border-2"
                      />
                      <Label
                        htmlFor={`q${questionIndex}-no`}
                        className="cursor-pointer text-red-700 px-4 py-2 rounded-md hover:bg-red-100"
                      >
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-purple-200">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-purple-600 mb-2">Analyzing Responses...</h3>
            <p className="text-gray-600">
              Our AI is processing your answers to generate a comprehensive screening report
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {!isSubmitting && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentPage === 0}
            className="flex-1"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {currentPage === totalPages - 1 ? 'Submit Screening' : 'Next Page'}
          </Button>
        </div>
      )}
    </div>
  );
}
