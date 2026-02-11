import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import {
  Heart,
  Brain,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';

interface ScreeningIntroProps {
  onStart: () => void;
  onCancel: () => void;
  questionnaireType: string;
}

export function ScreeningIntro({ onStart, onCancel, questionnaireType }: ScreeningIntroProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showStartButton, setShowStartButton] = useState(false);

  const steps = [
    {
      icon: Heart,
      title: "This is about understanding your child better",
      description: "These questions help us learn about your child's development and how they interact with the world around them.",
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200"
    },
    {
      icon: Brain,
      title: "Every child develops at their own pace",
      description: "Children grow and learn in different ways. These screenings are just one way to get helpful information.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      icon: Users,
      title: "You're the expert on your child",
      description: "Your observations and experiences are incredibly valuable. No one knows your child like you do.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      icon: Shield,
      title: "This is not a diagnosis",
      description: "These results are screening tools only. They can help guide next steps, but they're not medical diagnoses.",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      icon: Sparkles,
      title: "Take your time - there's no rush",
      description: "Answer based on what you've observed. You can pause anytime and come back later.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    }
  ];

  useEffect(() => {
    if (currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 2500); // 2.5 seconds per step
      return () => clearTimeout(timer);
    } else {
      // Show start button after last step
      const timer = setTimeout(() => {
        setShowStartButton(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, steps.length]);

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Progress Indicator */}
            <div className="flex justify-center mb-8">
              <div className="flex space-x-2">
                {steps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  />
                ))}
              </div>
            </div>

            {/* Animated Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-8"
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className={`w-24 h-24 mx-auto rounded-full ${currentStepData.bgColor} border-2 ${currentStepData.borderColor} flex items-center justify-center`}
                >
                  <Icon className={`w-12 h-12 ${currentStepData.color}`} />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-semibold text-gray-800"
                >
                  {currentStepData.title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed"
                >
                  {currentStepData.description}
                </motion.p>

                {/* Additional Info for Last Step */}
                {currentStep === steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto"
                  >
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">About this screening</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {questionnaireType === 'MCHAT-R' ?
                        '20 simple yes/no questions about your child\'s behavior and development.' :
                        'Questions about your child\'s skills in different areas of development.'
                      }
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Start Button */}
            <AnimatePresence>
              {showStartButton && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-8 space-y-4"
                >
                  <Button
                    onClick={onStart}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 text-lg font-medium"
                    size="lg"
                  >
                    I'm Ready to Start
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <button
                      onClick={onCancel}
                      className="hover:text-gray-700 transition-colors"
                    >
                      Maybe Later
                    </button>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>You can pause anytime</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
