import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ScreeningProgressType = "mchat" | "asq";

export type ScreeningProgress = {
  type: ScreeningProgressType;
  currentStep: number;
  answers: Record<string, string>;
  lastUpdated: string;
};

const STORAGE_VERSION = 1;

function nowIso() {
  return new Date().toISOString();
}

function safeParse(raw: string | null): ScreeningProgress | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ScreeningProgress;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.type || typeof parsed.currentStep !== "number") return null;
    if (!parsed.answers || typeof parsed.answers !== "object") return null;
    if (!parsed.lastUpdated || typeof parsed.lastUpdated !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function storageKey(type: ScreeningProgressType, childId: string) {
  return `autismcare_screening_progress_v${STORAGE_VERSION}:${type}:${childId}`;
}

export function useScreeningProgress(params: {
  type: ScreeningProgressType;
  childId: string | number | undefined;
  initialStep?: number;
}) {
  const { type, childId, initialStep = 0 } = params;
  const childKey = useMemo(() => (childId == null ? "" : String(childId)), [childId]);
  const key = useMemo(() => (childKey ? storageKey(type, childKey) : ""), [type, childKey]);

  const [resumeCandidate, setResumeCandidate] = useState<ScreeningProgress | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const hydratedRef = useRef(false);

  const clear = useCallback(() => {
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setAnswers({});
    setCurrentStep(initialStep);
    setResumeCandidate(null);
    setShowResumeDialog(false);
  }, [initialStep, key]);

  const persist = useCallback(
    (next: { step?: number; answers?: Record<string, string> }) => {
      if (!key) return;
      const data: ScreeningProgress = {
        type,
        currentStep: typeof next.step === "number" ? next.step : currentStep,
        answers: next.answers ?? answers,
        lastUpdated: nowIso(),
      };
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // ignore quota / private mode
      }
    },
    [answers, currentStep, key, type],
  );

  const setStep = useCallback(
    (nextStep: number) => {
      setCurrentStep(nextStep);
      persist({ step: nextStep });
    },
    [persist],
  );

  const setAnswer = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: value };
        persist({ answers: next });
        return next;
      });
    },
    [persist],
  );

  const hydrateFromStored = useCallback(
    (stored: ScreeningProgress) => {
      setAnswers(stored.answers || {});
      setCurrentStep(typeof stored.currentStep === "number" ? stored.currentStep : initialStep);
    },
    [initialStep],
  );

  const resume = useCallback(() => {
    if (!resumeCandidate) return;
    hydrateFromStored(resumeCandidate);
    setShowResumeDialog(false);
  }, [hydrateFromStored, resumeCandidate]);

  const startOver = useCallback(() => {
    clear();
  }, [clear]);

  // Load candidate once per child+type
  useEffect(() => {
    hydratedRef.current = false;
    setResumeCandidate(null);
    setShowResumeDialog(false);
    setAnswers({});
    setCurrentStep(initialStep);
  }, [initialStep, key]);

  useEffect(() => {
    if (!key || hydratedRef.current) return;
    hydratedRef.current = true;
    const candidate = safeParse(localStorage.getItem(key));
    const hasProgress = !!candidate && Object.keys(candidate.answers || {}).length > 0;
    if (candidate && candidate.type === type && hasProgress) {
      setResumeCandidate(candidate);
      setShowResumeDialog(true);
    }
  }, [key, type]);

  return {
    key,
    answers,
    currentStep,
    setAnswer,
    setStep,
    persist,
    clear,
    resumeCandidate,
    showResumeDialog,
    setShowResumeDialog,
    resume,
    startOver,
  };
}

