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
      color: "text-primary",
      bgColor: "bg-yellow-50",
      borderColor: "border"
    },
    {
      icon: Brain,
      title: "Every child develops at their own pace",
      description: "Children grow and learn in different ways. These screenings are just one way to get helpful information.",
      color: "text-primary",
      bgColor: "bg-muted",
      borderColor: "border"
    },
    {
      icon: Users,
      title: "You're the expert on your child",
      description: "Your observations and experiences are incredibly valuable. No one knows your child like you do.",
      color: "text-primary",
      bgColor: "bg-secondary",
      borderColor: "border-border"
    },
    {
      icon: Shield,
      title: "This is not a diagnosis",
      description: "These results are screening tools only. They can help guide next steps, but they're not medical diagnoses.",
      color: "text-primary",
      bgColor: "bg-primary/20",
      borderColor: "border"
    },
    {
      icon: Sparkles,
      title: "Take your time - there's no rush",
      description: "Answer based on what you've observed. You can pause anytime and come back later.",
      color: "text-primary",
      bgColor: "bg-secondary",
      borderColor: "border-border"
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
    <div className="ds-app-shell">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Progress Indicator */}
            <div className="flex justify-center mb-8">
              <div className="flex space-x-2">
                {steps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-3 w-3 rounded-full ${
                      index <= currentStep ? "bg-primary" : "bg-muted"
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
                  className="text-2xl font-semibold text-foreground"
                >
                  {currentStepData.title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed"
                >
                  {currentStepData.description}
                </motion.p>

                {/* Additional Info for Last Step */}
                {currentStep === steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mx-auto max-w-md rounded-xl border border-border bg-secondary/50 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2 text-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">About this screening</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
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
                  <Button onClick={onStart} className="w-full py-4 text-lg" size="lg" variant="default">
                    I'm Ready to Start
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <button
                      onClick={onCancel}
                      className="hover:text-foreground transition-colors"
                    >
                      Maybe Later
                    </button>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-primary" />
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
