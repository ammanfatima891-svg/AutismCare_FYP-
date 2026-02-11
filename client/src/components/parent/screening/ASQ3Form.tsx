import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import {
  ClipboardCheck,
  Baby,
  CheckCircle,
  XCircle,
  Minus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Heart,
  MessageSquare,
  Activity,
  Hand,
  Brain,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import API from '../../../api';
import { BehavioralAnimation, useVoiceGuidance, ProgressIndicator } from './BehavioralAnimations';

interface ASQ3FormProps {
  child: any;
  onComplete: (results: any) => void;
}

// ASQ-3 domains configuration with educational content
const domainConfig: Record<string, {
  name: string;
  color: string;
  icon: any;
  educationalContent: {
    title: string;
    content: string;
    asdImpact: string;
    tips: string;
  };
}> = {
  'Communication': {
    name: 'Communication',
    color: 'blue',
    icon: MessageSquare,
    educationalContent: {
      title: 'Communication & ASD',
      content: 'Children with ASD may experience challenges in verbal and nonverbal communication. This can include delayed speech development, difficulty understanding social cues, or challenges with reciprocal conversation. Early intervention focusing on communication skills can significantly improve outcomes.',
      asdImpact: 'ASD can affect communication in various ways: delayed language development, atypical speech patterns, difficulty with social communication, or nonverbal communication challenges.',
      tips: 'Encourage communication through visual supports, sign language, or augmentative communication devices if needed.'
    }
  },
  'Gross Motor': {
    name: 'Gross Motor',
    color: 'green',
    icon: Activity,
    educationalContent: {
      title: 'Gross Motor Skills & ASD',
      content: 'Gross motor skills involve large muscle movements and coordination. Some children with ASD may have challenges with motor planning, balance, or coordination, while others may excel in certain physical activities.',
      asdImpact: 'Motor difficulties in ASD can include challenges with coordination, balance, motor planning, or unusual movement patterns. However, many children with ASD show typical or advanced motor development.',
      tips: 'Provide opportunities for physical activities, consider occupational therapy for motor challenges, and adapt activities to your child\'s interests.'
    }
  },
  'Fine Motor': {
    name: 'Fine Motor',
    color: 'purple',
    icon: Hand,
    educationalContent: {
      title: 'Fine Motor Skills & ASD',
      content: 'Fine motor skills involve small muscle movements and dexterity. These skills are important for daily activities like writing, buttoning clothes, and using utensils.',
      asdImpact: 'Some children with ASD may experience fine motor challenges, including difficulty with handwriting, using utensils, or manipulating small objects. Others may show typical or advanced fine motor skills.',
      tips: 'Practice fine motor activities through play, consider adaptive tools if needed, and break down complex tasks into smaller steps.'
    }
  },
  'Problem Solving': {
    name: 'Problem Solving',
    color: 'orange',
    icon: Brain,
    educationalContent: {
      title: 'Problem Solving & ASD',
      content: 'Problem-solving skills involve thinking critically, planning, and finding solutions. Children with ASD may approach problem-solving differently, often showing strengths in visual thinking or pattern recognition.',
      asdImpact: 'Many children with ASD demonstrate strong visual-spatial skills and pattern recognition. However, they may need support with flexible thinking, planning, or understanding social contexts in problem-solving.',
      tips: 'Use visual supports, provide clear structure, and build on your child\'s strengths in visual or logical thinking.'
    }
  },
  'Personal-Social': {
    name: 'Personal-Social',
    color: 'pink',
    icon: Users,
    educationalContent: {
      title: 'Social Skills & ASD',
      content: 'Personal-social skills involve interacting with others, understanding emotions, and developing relationships. These skills are crucial for social communication and emotional development.',
      asdImpact: 'Social communication challenges are a core feature of ASD. Children may have difficulty understanding social cues, maintaining conversations, or interpreting others\' emotions and intentions.',
      tips: 'Use social stories, role-play social situations, teach explicit social rules, and provide opportunities for positive social interactions.'
    }
  },
};

export function ASQ3Form({ child, onComplete }: ASQ3FormProps) {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [enableVoice, setEnableVoice] = useState(false);

  const { speak } = useVoiceGuidance();

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      try {
        const response = await API.get(`/screening/questionnaires/ASQ-3?dob=${child.dateOfBirth}`);
        setQuestionnaire(response.data.data);
      } catch (error) {
        console.error('Error fetching ASQ-3 questionnaire:', error);
        toast.error('Failed to load questionnaire');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaire();
  }, [child.dateOfBirth]);

  // Group questions by domain
  const questionsByDomain = questionnaire?.questions?.reduce((acc: any, question: any) => {
    if (!acc[question.domain]) {
      acc[question.domain] = [];
    }
    acc[question.domain].push(question);
    return acc;
  }, {}) || {};

  const domains = Object.keys(questionsByDomain);
  const currentDomain = domains[currentDomainIndex];
  const currentDomainQuestions = questionsByDomain[currentDomain] || [];
  const totalDomains = domains.length;

  // Check if all questions in current domain are answered
  const isDomainAnswered = currentDomainQuestions.every((question: any) => answers[question.questionId] !== undefined);

  useEffect(() => {
    if (enableVoice && currentDomainQuestions.length > 0) {
      const domainText = `${currentDomain} domain. ${currentDomainQuestions.map((q: any, idx: number) => `Question ${idx + 1}: ${q.text}`).join('. ')}`;
      speak(domainText);
    }
  }, [currentDomainIndex, enableVoice, currentDomainQuestions, speak]);

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // Show success animation
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 600);
  };

  const handleBack = () => {
    if (currentDomainIndex > 0) {
      setCurrentDomainIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentDomainIndex < totalDomains - 1) {
      setCurrentDomainIndex(prev => prev + 1);
    }
  };

  const handleSubmit = async (finalAnswers = answers) => {
    const totalQuestions = questionnaire.questions.length;
    if (Object.keys(finalAnswers).length < totalQuestions) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const responses = Object.entries(finalAnswers).map(([questionId, answer]) => ({
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
      const results = {
        riskLevel: submission.riskLevel,
        type: "ASQ-3",
        date: submission.createdAt,
        scores: submission.scores,
        result: submission.result,
        resultDescription: submission.resultDescription,
        submissionId: submission.submissionId,
      };
      onComplete(results);
    } catch (err) {
      console.error('Error submitting screening:', err);
      toast.error("Failed to submit screening. Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDomainColor = (domain: string) => {
    const colors: { [key: string]: string } = {
      'Communication': 'blue',
      'Gross Motor': 'green',
      'Fine Motor': 'purple',
      'Problem Solving': 'orange',
      'Personal-Social': 'pink'
    };
    return colors[domain] || 'purple';
  };

  const getDomainIcon = (domain: string) => {
    const icons: { [key: string]: any } = {
      'Communication': MessageSquare,
      'Gross Motor': Activity,
      'Fine Motor': Hand,
      'Problem Solving': Brain,
      'Personal-Social': Users
    };
    return icons[domain] || ClipboardCheck;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-purple-100 px-6 py-4"
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center"
            >
              <ClipboardCheck className="w-5 h-5 text-purple-600" />
            </motion.div>
            <div>
              <h1 className="text-lg font-semibold text-purple-800">ASQ-3™ Screening</h1>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Baby className="w-3 h-3" />
                {child?.firstName} {child?.lastName}
              </p>
              {questionnaire && (
                <p className="text-xs text-purple-600 mt-1">
                  Age Interval: {questionnaire.intervalMonths} months
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEnableVoice(!enableVoice)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
                enableVoice
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {enableVoice ? 'Voice On' : 'Voice Off'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Progress Indicator */}
      <div className="px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <ProgressIndicator
            current={currentDomainIndex + 1}
            total={totalDomains}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full max-w-4xl mx-auto">
          {isSubmitting ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"
              />
              <div>
                <h2 className="text-xl font-semibold text-purple-800 mb-2">Analyzing Your Responses</h2>
                <p className="text-gray-600">Creating your personalized screening report...</p>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentDomainIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Domain Header */}
                <Card className="border-2 border-purple-200 shadow-lg">
                  <CardContent className="p-4 text-center space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="flex items-center justify-center gap-3"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br from-${getDomainColor(currentDomain)}-400 to-${getDomainColor(currentDomain)}-500 rounded-full flex items-center justify-center text-white text-lg font-bold`}>
                        {React.createElement(getDomainIcon(currentDomain), { className: "w-5 h-5" })}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-800">{currentDomain}</h2>
                        <p className="text-sm text-gray-600">{currentDomainQuestions.length} questions</p>
                      </div>
                    </motion.div>

                    {/* Behavioral Animation */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex justify-center"
                    >
                      <BehavioralAnimation
                        behavior={getDomainColor(currentDomain) === 'blue' ? 'smiling' :
                                 getDomainColor(currentDomain) === 'green' ? 'pointing' :
                                 getDomainColor(currentDomain) === 'purple' ? 'waving' :
                                 getDomainColor(currentDomain) === 'orange' ? 'smiling' : 'pointing'}
                        size={80}
                      />
                    </motion.div>
                  </CardContent>
                </Card>

                {/* Educational Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold text-blue-800 text-sm">
                            {domainConfig[currentDomain]?.educationalContent?.title || 'Developmental Insights'}
                          </h3>
                          <p className="text-xs text-blue-700 leading-relaxed">
                            {domainConfig[currentDomain]?.educationalContent?.content || 'This domain focuses on important developmental skills for your child.'}
                          </p>
                          <div className="bg-blue-100 rounded-lg p-2">
                            <p className="text-xs text-blue-800 font-medium mb-1">ASD Impact:</p>
                            <p className="text-xs text-blue-700">
                              {domainConfig[currentDomain]?.educationalContent?.asdImpact || 'Children with ASD may show different patterns in this area.'}
                            </p>
                          </div>
                          <div className="bg-green-100 rounded-lg p-2">
                            <p className="text-xs text-green-800 font-medium mb-1">Tips for Parents:</p>
                            <p className="text-xs text-green-700">
                              {domainConfig[currentDomain]?.educationalContent?.tips || 'Observe your child\'s natural development and consult with professionals as needed.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Questions List */}
                <div className="space-y-6">
                  {currentDomainQuestions.map((question: any, index: number) => (
                    <motion.div
                      key={question.questionId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <Card className="border border-gray-200 shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 space-y-3">
                              <h3 className="text-base font-medium text-gray-800 leading-relaxed">
                                {question.text}
                              </h3>

                              {/* Answer Buttons */}
                              <div className="grid grid-cols-3 gap-2">
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                  <Button
                                    onClick={() => handleAnswer(question.questionId, 'yes')}
                                    variant={answers[question.questionId] === 'yes' ? 'default' : 'outline'}
                                    className={`w-full h-12 ${
                                      answers[question.questionId] === 'yes'
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : 'border-green-500 text-green-600 hover:bg-green-50'
                                    }`}
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <CheckCircle className="w-4 h-4" />
                                      <span className="text-xs">Yes</span>
                                    </div>
                                  </Button>
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                  <Button
                                    onClick={() => handleAnswer(question.questionId, 'sometimes')}
                                    variant={answers[question.questionId] === 'sometimes' ? 'default' : 'outline'}
                                    className={`w-full h-12 ${
                                      answers[question.questionId] === 'sometimes'
                                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                        : 'border-yellow-500 text-yellow-600 hover:bg-yellow-50'
                                    }`}
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <Minus className="w-4 h-4" />
                                      <span className="text-xs">Sometimes</span>
                                    </div>
                                  </Button>
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                  <Button
                                    onClick={() => handleAnswer(question.questionId, 'not-yet')}
                                    variant={answers[question.questionId] === 'not-yet' ? 'default' : 'outline'}
                                    className={`w-full h-12 ${
                                      answers[question.questionId] === 'not-yet'
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'border-red-500 text-red-600 hover:bg-red-50'
                                    }`}
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <XCircle className="w-4 h-4" />
                                      <span className="text-xs">Not Yet</span>
                                    </div>
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Navigation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex justify-between bg-white p-6 rounded-lg shadow-lg border border-gray-200"
                >
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentDomainIndex === 0}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous Domain
                  </Button>

                  {currentDomainIndex === totalDomains - 1 ? (
                    <Button
                      onClick={() => handleSubmit()}
                      disabled={!isDomainAnswered}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8"
                    >
                      Submit Screening
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!isDomainAnswered}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    >
                      Next Domain
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Gentle Reminder */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="bg-white border-t border-purple-100 px-6 py-4"
      >
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            Take your time - there's no rush. Answer based on what you've observed.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

