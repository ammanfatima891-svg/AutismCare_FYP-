import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// SVG Animation Components
const PointingAnimation = ({ size }: { size: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    initial={{ scale: 0.8 }}
    animate={{ scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Arm */}
    <motion.path
      d="M30 70 L40 50 L50 70 L45 85 L35 85 Z"
      fill="#4A90E2"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
    {/* Hand */}
    <motion.g
      animate={{ rotate: [0, 10, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="40" cy="45" r="8" fill="#FFD93D" />
      <rect x="35" y="35" width="10" height="15" rx="2" fill="#FFD93D" />
      {/* Fingers */}
      <rect x="32" y="30" width="3" height="8" rx="1" fill="#FFD93D" />
      <rect x="37" y="28" width="3" height="10" rx="1" fill="#FFD93D" />
      <rect x="42" y="30" width="3" height="8" rx="1" fill="#FFD93D" />
      {/* Pointing finger */}
      <rect x="37" y="20" width="3" height="12" rx="1" fill="#FFD93D" />
    </motion.g>
  </motion.svg>
);

const WavingAnimation = ({ size }: { size: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    initial={{ scale: 0.8 }}
    animate={{ scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Arm */}
    <motion.path
      d="M30 70 L40 50 L50 70 L45 85 L35 85 Z"
      fill="#FF6B6B"
      animate={{ x: [0, 5, -5, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
    />
    {/* Hand */}
    <motion.g
      animate={{ rotate: [0, 20, -20, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="40" cy="45" r="8" fill="#FFD93D" />
      <rect x="35" y="35" width="10" height="15" rx="2" fill="#FFD93D" />
      {/* Fingers */}
      <rect x="32" y="30" width="3" height="8" rx="1" fill="#FFD93D" />
      <rect x="37" y="28" width="3" height="10" rx="1" fill="#FFD93D" />
      <rect x="42" y="30" width="3" height="8" rx="1" fill="#FFD93D" />
    </motion.g>
  </motion.svg>
);

const SmilingAnimation = ({ size }: { size: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    initial={{ scale: 0.8 }}
    animate={{ scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Face */}
    <circle cx="50" cy="50" r="40" fill="#FFD93D" stroke="#FFA500" strokeWidth="2" />

    {/* Eyes */}
    <circle cx="35" cy="40" r="3" fill="#333" />
    <circle cx="65" cy="40" r="3" fill="#333" />

    {/* Smile */}
    <motion.path
      d="M 30 60 Q 50 75 70 60"
      stroke="#333"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
    />

    {/* Cheeks */}
    <motion.circle
      cx="25"
      cy="55"
      r="4"
      fill="#FF9999"
      opacity="0.6"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.circle
      cx="75"
      cy="55"
      r="4"
      fill="#FF9999"
      opacity="0.6"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
    />
  </motion.svg>
);

interface BehavioralAnimationProps {
  behavior: 'pointing' | 'waving' | 'smiling' | null;
  size?: number;
  className?: string;
}

export function BehavioralAnimation({ behavior, size = 200, className = '' }: BehavioralAnimationProps) {
  if (!behavior) {
    return null;
  }

  const renderAnimation = () => {
    switch (behavior) {
      case 'pointing':
        return <PointingAnimation size={size} />;
      case 'waving':
        return <WavingAnimation size={size} />;
      case 'smiling':
        return <SmilingAnimation size={size} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      className={`flex items-center justify-center ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
    >
      {renderAnimation()}
    </motion.div>
  );
}

// Voice guidance hook
export function useVoiceGuidance() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
      setIsSupported(true);
    }
  }, []);

  const speak = (text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
  } = {}) => {
    if (!isSupported || !speechSynthesisRef.current) return;

    // Stop any current speech
    speechSynthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice settings for child-friendly speech
    utterance.rate = options.rate || 0.8; // Slightly slower for clarity
    utterance.pitch = options.pitch || 1.1; // Slightly higher pitch
    utterance.volume = options.volume || 0.8; // Comfortable volume
    utterance.lang = 'en-US'; // Default to US English

    // Try to find a child-friendly voice
    if (options.voice) {
      utterance.voice = options.voice;
    } else if (speechSynthesisRef.current.getVoices().length > 0) {
      const voices = speechSynthesisRef.current.getVoices();
      // Prefer female voices for nurturing feel
      const preferredVoice = voices.find(voice =>
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('susan')
      ) || voices[0];
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesisRef.current.speak(utterance);
  };

  const stop = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const pause = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.pause();
    }
  };

  const resume = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.resume();
    }
  };

  return {
    isSupported,
    isSpeaking,
    speak,
    stop,
    pause,
    resume
  };
}

// Combined component for question animations and voice
interface QuestionBehaviorProps {
  questionText: string;
  behaviorType?: 'pointing' | 'waving' | 'smiling';
  enableVoice?: boolean;
  voiceText?: string;
  size?: number;
  className?: string;
}

export function QuestionBehavior({
  questionText,
  behaviorType = 'smiling',
  enableVoice = false,
  voiceText,
  size = 150,
  className = ''
}: QuestionBehaviorProps) {
  const { speak, isSpeaking } = useVoiceGuidance();

  useEffect(() => {
    if (enableVoice && voiceText) {
      // Small delay to let the animation start first
      const timer = setTimeout(() => {
        speak(voiceText);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [enableVoice, voiceText, speak]);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <BehavioralAnimation
        behavior={behaviorType}
        size={size}
      />
      {isSpeaking && (
        <motion.div
          className="flex items-center gap-2 text-sm text-teal-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="w-2 h-2 bg-teal-500 rounded-full"
          />
          <span>Speaking...</span>
        </motion.div>
      )}
    </div>
  );
}

// Progress indicator with calming animations
interface ProgressIndicatorProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressIndicator({ current, total, showPercentage = true, className = '' }: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>Question {current} of {total}</span>
        {showPercentage && <span>{percentage}% complete</span>}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-center">
        <div className="flex space-x-1">
          {Array.from({ length: total }, (_, i) => (
            <motion.div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < current ? 'bg-teal-500' : 'bg-gray-300'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
