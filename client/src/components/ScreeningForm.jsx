import { useMemo } from "react";
import { ScreeningSection } from "./parent/ScreeningSection";
import { MCHATForm } from "./parent/screening/MCHATForm";
import { ASQ3Form } from "./parent/screening/ASQ3Form";

export default function ScreeningForm({
  selectedChild = null,
  questionnaireType: initialQuestionnaireType = null,
  onComplete = null,
}) {
  const normalizedType = useMemo(() => {
    if (!initialQuestionnaireType) return null;
    const t = String(initialQuestionnaireType).toUpperCase();
    if (t.includes("MCHAT")) return "MCHAT-R";
    if (t.includes("ASQ")) return "ASQ-3";
    return null;
  }, [initialQuestionnaireType]);

  if (selectedChild && normalizedType === "MCHAT-R") {
    return <MCHATForm child={selectedChild} onComplete={(r) => onComplete?.(r)} />;
  }

  if (selectedChild && normalizedType === "ASQ-3") {
    return <ASQ3Form child={selectedChild} onComplete={(r) => onComplete?.(r)} />;
  }

  return <ScreeningSection />;
}
