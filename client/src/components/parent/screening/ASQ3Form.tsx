import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Label } from '../../ui/label';
import { Progress } from '../../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ClipboardCheck, Baby } from 'lucide-react';
import { toast } from 'sonner';

interface ASQ3FormProps {
  child: any;
  onComplete: (results: any) => void;
}

const domains = {
  communication: {
    name: 'Communication',
    color: 'blue',
    questions: [
      'Does your child say eight or more words in addition to "Mama" and "Dada"?',
      'When you ask your child to, does they point to pictures in a book?',
      'Does your child say two-word phrases?',
      'Without showing them first, does your child point to the correct picture?',
      'Does your child say three-word sentences?',
      'Can you understand most of what your child says?',
    ],
  },
  gross_motor: {
    name: 'Gross Motor',
    color: 'green',
    questions: [
      'Does your child walk down stairs if you hold one hand?',
      'Does your child run fairly well?',
      'Can your child kick a ball by swinging their leg forward?',
      'Can your child jump with both feet leaving the floor?',
      'Does your child walk upstairs using one foot on each stair?',
      'Can your child pedal a tricycle?',
    ],
  },
  fine_motor: {
    name: 'Fine Motor',
    color: 'purple',
    questions: [
      'Does your child stack small blocks on top of each other?',
      'Can your child turn pages in a book?',
      'Can your child use their fingers to pick up small objects?',
      'Does your child hold a crayon or pencil?',
      'Can your child copy a circle on paper?',
      'Does your child cut with scissors?',
    ],
  },
  problem_solving: {
    name: 'Problem Solving',
    color: 'orange',
    questions: [
      'If you put three blocks in front of your child, does they copy you?',
      'Does your child match objects that are the same?',
      'Does your child understand the concept of "one"?',
      'Does your child point to five or more pictures you name?',
      'Does your child sort objects by color or shape?',
      'Can your child count three objects correctly?',
    ],
  },
  personal_social: {
    name: 'Personal-Social',
    color: 'pink',
    questions: [
      'Does your child drink from a cup?',
      'Does your child play with a doll or stuffed animal?',
      'Does your child help with simple household tasks?',
      'Does your child show affection to familiar people?',
      'Does your child play make-believe with other children?',
      'Does your child follow simple rules in games?',
    ],
  },
};

export function ASQ3Form({ child, onComplete }: ASQ3FormProps) {
  const [answers, setAnswers] = useState<{ [key: string]: { [key: number]: string } }>({
    communication: {},
    gross_motor: {},
    fine_motor: {},
    problem_solving: {},
    personal_social: {},
  });
  const [currentDomain, setCurrentDomain] = useState('communication');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalQuestions = Object.values(domains).reduce((sum, domain) => sum + domain.questions.length, 0);
  const answeredQuestions = Object.values(answers).reduce(
    (sum, domainAnswers) => sum + Object.keys(domainAnswers).length,
    0
  );
  const progress = (answeredQuestions / totalQuestions) * 100;

  const handleAnswer = (domain: string, questionIndex: number, value: string) => {
    setAnswers({
      ...answers,
      [domain]: {
        ...answers[domain],
        [questionIndex]: value,
      },
    });
  };

  const handleSubmit = () => {
    if (answeredQuestions < totalQuestions) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setIsSubmitting(true);

    // Simulate AI analysis
    setTimeout(() => {
      const domainScores: { [key: string]: any } = {};
      
      Object.entries(domains).forEach(([domainKey, domain]) => {
        const domainAnswers = answers[domainKey];
        let score = 0;
        
        Object.values(domainAnswers).forEach((answer) => {
          if (answer === 'yes') score += 10;
          else if (answer === 'sometimes') score += 5;
        });

        const maxScore = domain.questions.length * 10;
        const percentage = (score / maxScore) * 100;
        
        let risk = 'low';
        if (percentage < 40) risk = 'high';
        else if (percentage < 70) risk = 'medium';

        domainScores[domainKey] = {
          name: domain.name,
          score: score,
          maxScore: maxScore,
          percentage: percentage,
          risk: risk,
        };
      });

      const overallRisk = Object.values(domainScores).some((d: any) => d.risk === 'high')
        ? 'high'
        : Object.values(domainScores).some((d: any) => d.risk === 'medium')
        ? 'medium'
        : 'low';

      const results = {
        type: 'ASQ-3',
        child: child,
        date: new Date().toISOString(),
        totalQuestions: totalQuestions,
        answeredQuestions: answeredQuestions,
        riskLevel: overallRisk,
        domainScores: domainScores,
        answers: answers,
      };

      onComplete(results);
      setIsSubmitting(false);
    }, 2000);
  };

  if (isSubmitting) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-purple-600 mb-2">Analyzing Responses...</h3>
          <p className="text-gray-600">
            Our AI is processing your answers across all developmental domains
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-6 h-6 text-purple-600" />
              <div>
                <CardTitle className="text-purple-600">ASQ-3™ Screening</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Baby className="w-4 h-4" />
                  {child?.name}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {answeredQuestions}/{totalQuestions} answered
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Domain Tabs */}
      <Tabs value={currentDomain} onValueChange={setCurrentDomain}>
        <TabsList className="grid w-full grid-cols-5">
          {Object.entries(domains).map(([key, domain]) => (
            <TabsTrigger key={key} value={key} className="relative">
              {domain.name.split(' ')[0]}
              {Object.keys(answers[key]).length === domain.questions.length && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(domains).map(([domainKey, domain]) => (
          <TabsContent key={domainKey} value={domainKey}>
            <Card>
              <CardHeader>
                <CardTitle className={`text-${domain.color}-600`}>{domain.name}</CardTitle>
                <CardDescription>
                  Answer questions about your child's {domain.name.toLowerCase()} skills
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {domain.questions.map((question, index) => (
                  <div
                    key={index}
                    className={`p-6 rounded-lg bg-gradient-to-r from-${domain.color}-50 to-purple-50 border border-${domain.color}-200`}
                  >
                    <Label className="text-gray-900 mb-4 block">
                      <span className={`inline-block w-8 h-8 rounded-full bg-${domain.color}-600 text-white text-center leading-8 mr-3`}>
                        {index + 1}
                      </span>
                      {question}
                    </Label>
                    <RadioGroup
                      value={answers[domainKey][index]}
                      onValueChange={(value) => handleAnswer(domainKey, index, value)}
                      className="flex gap-4 mt-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id={`${domainKey}-${index}-yes`} />
                        <Label
                          htmlFor={`${domainKey}-${index}-yes`}
                          className="cursor-pointer text-green-700 px-4 py-2 rounded-md hover:bg-green-100"
                        >
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sometimes" id={`${domainKey}-${index}-sometimes`} />
                        <Label
                          htmlFor={`${domainKey}-${index}-sometimes`}
                          className="cursor-pointer text-yellow-700 px-4 py-2 rounded-md hover:bg-yellow-100"
                        >
                          Sometimes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id={`${domainKey}-${index}-no`} />
                        <Label
                          htmlFor={`${domainKey}-${index}-no`}
                          className="cursor-pointer text-red-700 px-4 py-2 rounded-md hover:bg-red-100"
                        >
                          Not Yet
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={answeredQuestions < totalQuestions}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        Submit Screening
      </Button>
    </div>
  );
}
