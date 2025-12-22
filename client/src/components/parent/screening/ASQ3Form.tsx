import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Label } from '../../ui/label';
import { Progress } from '../../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ClipboardCheck, Baby } from 'lucide-react';
import { toast } from 'sonner';
import API from '../../../api';

interface ASQ3FormProps {
  child: any;
  onComplete: (results: any) => void;
}

// ASQ-3 domains configuration
const domainConfig = {
  'Communication': { name: 'Communication', color: 'blue' },
  'Gross Motor': { name: 'Gross Motor', color: 'green' },
  'Fine Motor': { name: 'Fine Motor', color: 'purple' },
  'Problem Solving': { name: 'Problem Solving', color: 'orange' },
  'Personal-Social': { name: 'Personal-Social', color: 'pink' },
};

export function ASQ3Form({ child, onComplete }: ASQ3FormProps) {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [currentDomain, setCurrentDomain] = useState('communication');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      try {
        const response = await API.get(`/screening/questionnaires/ASQ-3?dob=${child.dateOfBirth}`);
        setQuestionnaire(response.data.data);
        setCurrentDomain('Communication'); // Default to first domain
      } catch (error) {
        console.error('Error fetching ASQ-3 questionnaire:', error);
        toast.error('Failed to load questionnaire');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaire();
  }, [child.dateOfBirth]);

  const totalQuestions = questionnaire ? questionnaire.questions.length : 0;
  const answeredQuestions = Object.keys(answers).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
  };

  const getQuestionsByDomain = (domain: string) => {
    if (!questionnaire) return [];
    return questionnaire.questions.filter((q: any) => q.domain === domain);
  };

  const handleSubmit = async () => {
    if (answeredQuestions < totalQuestions) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const responses = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const res = await API.post("/screening/calculate-screening", {
        childId: child.id,
        questionnaireType: 'ASQ-3',
        dob: child.dateOfBirth,
        weeksPreterm: 0, // Default to 0 for ASQ-3
        intervalMonths: questionnaire.intervalMonths,
        responses,
      });

      const submission = res.data.data;
      const domainStatuses = submission.scores?.domainStatuses || {};
      const domainScores = submission.scores?.domainScores || {};

      const results = {
        riskLevel: submission.riskLevel,
        type: "ASQ-3",
        date: submission.createdAt,
        domainScores,
        domainStatuses,
        resultDescription: submission.resultDescription,
      };
      onComplete(results);
    } catch (err) {
      console.error('Error submitting screening:', err);
      toast.error("Failed to submit screening. Check console.");
    } finally {
      setIsSubmitting(false);
    }
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
                  {child?.firstName} {child?.lastName}
                  {questionnaire?.intervalMonths && (
                    <span className="text-sm text-gray-600">
                      (Interval: {questionnaire.intervalMonths} months)
                    </span>
                  )}
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
      {questionnaire && (
        <Tabs value={currentDomain} onValueChange={setCurrentDomain}>
          <TabsList className="grid w-full grid-cols-5">
            {Object.keys(domainConfig).map((domainKey: string) => {
              const domainQuestions = getQuestionsByDomain(domainKey);
              const answeredCount = domainQuestions.filter((q: any) => answers[q.questionId]).length;
              return (
                <TabsTrigger key={domainKey} value={domainKey} className="relative">
                  {domainConfig[domainKey as keyof typeof domainConfig].name.split(' ')[0]}
                  {answeredCount === domainQuestions.length && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(domainConfig).map((domainKey: string) => {
            const domainQuestions = getQuestionsByDomain(domainKey);
            const domainIndex = Object.keys(domainConfig).indexOf(domainKey);
            const colors = ['blue', 'green', 'purple', 'orange', 'pink'];
            const color = colors[domainIndex % colors.length];
            const domain = domainConfig[domainKey as keyof typeof domainConfig];

            return (
              <TabsContent key={domainKey} value={domainKey}>
                <Card>
                  <CardHeader>
                    <CardTitle className={`text-${color}-600`}>{domain.name}</CardTitle>
                    <CardDescription>
                      Answer questions about your child's {domain.name.toLowerCase()} skills
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {domainQuestions.map((question: any, index: number) => (
                      <div
                        key={question.questionId}
                        className={`p-6 rounded-lg bg-gradient-to-r from-${color}-50 to-purple-50 border border-${color}-200`}
                      >
                        <Label className="text-gray-900 mb-4 block">
                          <span className={`inline-block w-8 h-8 rounded-full bg-${color}-600 text-white text-center leading-8 mr-3`}>
                            {index + 1}
                          </span>
                          {question.text}
                        </Label>
                        <RadioGroup
                          value={answers[question.questionId]}
                          onValueChange={(value) => handleAnswer(question.questionId, value)}
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
                            <RadioGroupItem value="not_yet" id={`${domainKey}-${index}-not_yet`} />
                            <Label
                              htmlFor={`${domainKey}-${index}-not_yet`}
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
            );
          })}
        </Tabs>
      )}

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

