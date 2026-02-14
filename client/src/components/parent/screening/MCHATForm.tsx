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

interface MCHATFormProps {
  child: any;
  onComplete: (results: any) => void;
}

// M-CHAT-R behavioral domains for animations
const behaviorDomains: Record<string, {
  icon: any;
  color: string;
  animation: 'smiling' | 'pointing' | 'waving';
  voiceText: string;
  educationalContent: {
    title: string;
    content: string;
    asdImpact: string;
    tips: string;
  };
}> = {
  'social-communication': {
    icon: MessageSquare,
    color: 'blue',
    animation: 'smiling',
    voiceText: "Does your child enjoy playing peek-a-boo or other social games?",
    educationalContent: {
      title: 'Social Communication in ASD',
      content: 'Social communication involves using language and nonverbal cues to interact with others. Children with ASD may have challenges with back-and-forth conversation, understanding social cues, or using gestures appropriately.',
      asdImpact: 'Many children with ASD show delays or differences in social communication skills. This can include difficulty initiating or maintaining conversations, understanding sarcasm or jokes, or using appropriate eye contact.',
      tips: 'Model clear communication, use visual supports, and practice social skills through play. Early intervention can significantly improve social communication abilities.'
    }
  },
  'pointing': {
    icon: Hand,
    color: 'purple',
    animation: 'pointing',
    voiceText: "Does your child point to show you things they're interested in?",
    educationalContent: {
      title: 'Pointing & Joint Attention',
      content: 'Pointing is an important communication skill that helps children share interests and attention with others. It develops the foundation for joint attention and social interaction.',
      asdImpact: 'Children with ASD may be less likely to point to share interests or may use pointing differently. This can affect their ability to engage in joint attention activities with caregivers.',
      tips: 'Encourage pointing by modeling the behavior and responding enthusiastically when your child points. Use gestures and visual cues to support communication.'
    }
  },
  'joint-attention': {
    icon: Users,
    color: 'green',
    animation: 'waving',
    voiceText: "Does your child follow your gaze or point when you look at something?",
    educationalContent: {
      title: 'Joint Attention Skills',
      content: 'Joint attention involves sharing focus on an object or activity with another person. This skill is crucial for learning, language development, and social interaction.',
      asdImpact: 'Joint attention challenges are common in ASD. Children may have difficulty following others\' gaze, sharing attention on objects, or coordinating attention between people and objects.',
      tips: 'Practice joint attention through games like "look at this" or following your child\'s lead in play. Use visual supports and clear gestures to help your child understand shared attention.'
    }
  },
  'pretend-play': {
    icon: Sparkles,
    color: 'pink',
    animation: 'smiling',
    voiceText: "Does your child pretend with toys, like feeding a doll or talking on a phone?",
    educationalContent: {
      title: 'Pretend Play & Imagination',
      content: 'Pretend play involves using imagination to create scenarios and roles with toys. This type of play helps children understand emotions, develop language, and practice social skills.',
      asdImpact: 'Many children with ASD show differences in pretend play, which may include repetitive play patterns, difficulty understanding pretend scenarios, or challenges with imaginative play.',
      tips: 'Model pretend play by narrating actions and scenarios. Start with simple pretend activities and gradually increase complexity. Use your child\'s interests to motivate pretend play.'
    }
  },
  'motor-skills': {
    icon: Activity,
    color: 'orange',
    animation: 'pointing',
    voiceText: "Does your child walk steadily and climb stairs without holding on?",
    educationalContent: {
      title: 'Motor Skills & ASD',
      content: 'Motor skills include both gross motor (large movements like walking and jumping) and fine motor (small movements like grasping and writing) abilities. These skills support daily activities and can influence other areas of development.',
      asdImpact: 'Some children with ASD may experience motor challenges, including difficulties with coordination, balance, or motor planning. Others may show typical or advanced motor development. Motor skills can also be affected by sensory processing differences.',
      tips: 'Provide opportunities for physical activities appropriate to your child\'s abilities. Consider occupational therapy if motor challenges are present. Adapt activities to your child\'s sensory preferences and interests.'
    }
  }
};

export function MCHATForm({ child, onComplete }: MCHATFormProps) {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [enableVoice, setEnableVoice] = useState(false);

  const { speak } = useVoiceGuidance();

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      try {
        const response = await API.get(`/screening/questionnaires/MCHAT-R?dob=${child.dateOfBirth}`);
        setQuestionnaire(response.data.data);
      } catch (error) {
        console.error('Error fetching MCHAT-R questionnaire:', error);
        toast.error('Failed to load questionnaire');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaire();
  }, [child.dateOfBirth]);

  const totalQuestions = questionnaire ? questionnaire.questions.length : 0;
  const questionsPerPage = 5;
  const totalPages = Math.ceil(totalQuestions / questionsPerPage);

  // Get questions for current page
  const startQuestionIndex = currentPageIndex * questionsPerPage;
  const endQuestionIndex = Math.min(startQuestionIndex + questionsPerPage, totalQuestions);
  const currentPageQuestions = questionnaire?.questions.slice(startQuestionIndex, endQuestionIndex) || [];

  // Check if all questions on current page are answered
  const isPageAnswered = currentPageQuestions.every((question: any) => answers[question.questionId] !== undefined);

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // Show success animation
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 600);

    // Speak encouragement if voice is enabled
    if (enableVoice) {
      setTimeout(() => {
        speak("Great job answering that question! Let's continue.");
      }, 800);
    }
  };

  const handleBack = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handleSubmit = async (finalAnswers = answers) => {
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
        questionnaireType: 'MCHAT-R',
        dob: child.dateOfBirth,
        weeksPreterm: 0,
        responses,
      });

      const submission = res.data.data;
      const results = {
        submissionId: submission.submissionId,
        riskLevel: submission.riskLevel,
        type: "M-CHAT-R",
        date: submission.createdAt,
        scores: submission.scores,
        result: submission.result,
        resultDescription: submission.resultDescription,
        reportEmailed: submission.reportEmailed === true,
        reportEmailError: submission.reportEmailError || null,
      };
      onComplete(results);
    } catch (err) {
      console.error('Error submitting screening:', err);
      toast.error("Failed to submit screening. Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-teal-100 px-6 py-4"
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center"
            >
              <ClipboardCheck className="w-5 h-5 text-teal-600" />
            </motion.div>
            <div>
              <h1 className="text-lg font-semibold text-teal-800">M-CHAT-R™ Screening</h1>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Baby className="w-3 h-3" />
                {child?.firstName} {child?.lastName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEnableVoice(!enableVoice)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
                enableVoice
                  ? 'bg-teal-100 text-teal-700'
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
            current={currentPageIndex + 1}
            total={totalPages}
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
                className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full mx-auto"
              />
              <div>
                <h2 className="text-xl font-semibold text-teal-800 mb-2">Analyzing Your Responses</h2>
                <p className="text-gray-600">Creating your personalized screening report...</p>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Page Header */}
                <Card className="border-2 border-teal-200 shadow-lg">
                  <CardContent className="p-4 text-center space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="flex items-center justify-center gap-3"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full flex items-center justify-center text-white text-lg font-bold">
                        {currentPageIndex + 1}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-800">Page {currentPageIndex + 1} of {totalPages}</h2>
                        <p className="text-sm text-gray-600">{currentPageQuestions.length} questions</p>
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
                        behavior="smiling"
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
                            Understanding M-CHAT-R Questions
                          </h3>
                          <p className="text-xs text-blue-700 leading-relaxed">
                            The M-CHAT-R is designed to identify early signs of autism spectrum disorder. These questions focus on social communication, interaction, and behavioral patterns that are important for development.
                          </p>
                          <div className="bg-blue-100 rounded-lg p-2">
                            <p className="text-xs text-blue-800 font-medium mb-1">Why These Questions Matter:</p>
                            <p className="text-xs text-blue-700">
                              Early identification of developmental concerns allows for timely intervention and support. Not all children who screen positive will have ASD, and not all children with ASD will screen positive.
                            </p>
                          </div>
                          <div className="bg-green-100 rounded-lg p-2">
                            <p className="text-xs text-green-800 font-medium mb-1">Next Steps:</p>
                            <p className="text-xs text-green-700">
                              If your child screens positive, discuss the results with your pediatrician. They may recommend further evaluation or developmental monitoring.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Questions List */}
                <div className="space-y-6">
                  {currentPageQuestions.map((question: any, index: number) => (
                    <motion.div
                      key={question.questionId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <Card className="border border-gray-200 shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-xs flex-shrink-0">
                              {startQuestionIndex + index + 1}
                            </div>
                            <div className="flex-1 space-y-3">
                              <h3 className="text-base font-medium text-gray-800 leading-relaxed">
                                {question.text}
                              </h3>

                              {/* Answer Buttons */}
                              <div className="grid grid-cols-2 gap-2">
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
                                    onClick={() => handleAnswer(question.questionId, 'no')}
                                    variant={answers[question.questionId] === 'no' ? 'default' : 'outline'}
                                    className={`w-full h-12 ${
                                      answers[question.questionId] === 'no'
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'border-red-500 text-red-600 hover:bg-red-50'
                                    }`}
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <XCircle className="w-4 h-4" />
                                      <span className="text-xs">No</span>
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
                    disabled={currentPageIndex === 0}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous Page
                  </Button>

                  {currentPageIndex === totalPages - 1 ? (
                    <Button
                      onClick={() => handleSubmit()}
                      disabled={!isPageAnswered}
                      className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8"
                    >
                      Submit Screening
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!isPageAnswered}
                      className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                    >
                      Next Page
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
        className="bg-white border-t border-teal-100 px-6 py-4"
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
