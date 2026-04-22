import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { ArrowLeft, ArrowRight, ClipboardList, Info, Sparkles } from "lucide-react";
import { parentAPI, screeningAPI } from "../../api";

function ageMonthsFromDob(dob) {
  const dt = dob ? new Date(dob) : null;
  if (!dt || Number.isNaN(dt.getTime())) return null;
  const ageMs = Date.now() - dt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays / 30.44;
}

function formatAge(ageMonths) {
  if (typeof ageMonths !== "number" || !Number.isFinite(ageMonths)) return "—";
  const months = Math.max(0, Math.round(ageMonths));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years <= 0) return `${months} months`;
  if (rem === 0) return `${years} years`;
  return `${years}y ${rem}m`;
}

export default function ScreeningGuide({ child, selectedType, onBack, onStart }) {
  const ageMonths = useMemo(() => ageMonthsFromDob(child?.dateOfBirth), [child?.dateOfBirth]);
  const [plan, setPlan] = useState(null);
  const [caseRow, setCaseRow] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!child?.id) return;
      try {
        const res = await screeningAPI.getScreeningPlan(child.id);
        const data = res?.data?.data;
        if (!cancelled && data?.plan) setPlan(data.plan);
      } catch {
        if (!cancelled) setPlan(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [child?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadCase() {
      if (!child?.id) return;
      try {
        const res = await parentAPI.getCases();
        const rows = res?.data?.data || [];
        const match = rows.find((r) => String(r.childId) === String(child.id));
        if (!cancelled) setCaseRow(match || null);
      } catch {
        if (!cancelled) setCaseRow(null);
      }
    }
    loadCase();
    return () => {
      cancelled = true;
    };
  }, [child?.id]);

  const mchatAllowed = !!plan?.mchatAllowed || (typeof ageMonths === "number" && ageMonths >= 16 && ageMonths <= 30);
  const suggestMchatFirst = mchatAllowed;
  const screeningProgress = caseRow?.screeningProgress || {};
  const mchatCompleted = screeningProgress?.mchatCompleted === true;
  const asqCompleted = screeningProgress?.asqCompleted === true;
  const bothCompleted = mchatCompleted && asqCompleted;

  const recommendedFlow = suggestMchatFirst ? ["M-CHAT-R", "ASQ-3"] : ["ASQ-3"];

  const startMchat = () => onStart("MCHAT-R", { origin: "guide", flow: "guided", skippedMchat: false, orderFollowed: true });
  const startAsq = (opts) => onStart("ASQ-3", { origin: "guide", flow: "guided", ...(opts || {}) });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-2 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-foreground">Before you start</div>
            <div className="text-sm text-muted-foreground">
              A quick guide to the screening tools for {child?.firstName} {child?.lastName}
            </div>
          </div>
        </div>

        <Button variant="ghost" onClick={onBack} className="shrink-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Alert className="border-border bg-card">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground">
          These questionnaires are <span className="font-medium">screening tools</span>. They can help guide next steps,
          but they do <span className="font-medium">not</span> diagnose autism or any medical condition.
        </AlertDescription>
      </Alert>

      <Card className="border border-border bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Child age</CardTitle>
          <CardDescription>Used only to guide which screening is most appropriate</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatAge(ageMonths)}</Badge>
            {mchatAllowed ? (
              <span>M-CHAT-R is typically used for 16–30 months.</span>
            ) : (
              <span>For this age, ASQ-3 is recommended. (M-CHAT-R is usually 16–30 months.)</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">1) What is ASQ-3?</CardTitle>
            <CardDescription>Development across 5 skill areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-1">
              <li>Checks communication, motor skills, problem solving, and social skills</li>
              <li>Results are shown by area (on track / monitoring / below cutoff)</li>
              <li>Useful for routine developmental monitoring at many ages</li>
            </ul>
            <Badge variant="secondary">Recommended for most ages</Badge>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">2) What is M-CHAT-R?</CardTitle>
            <CardDescription>Autism screening for toddlers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-1">
              <li>20 yes/no questions about social communication behaviors</li>
              <li>Only valid for about <span className="font-medium">16–30 months</span></li>
              <li>Higher scores mean higher likelihood and need for clinician review</li>
            </ul>
            <Badge className={mchatAllowed ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}>
              {mchatAllowed ? "Available for this age" : "Not used for this age"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">3) Which should I take first?</CardTitle>
            <CardDescription>Age-aware guidance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {!mchatAllowed && (
              <p>
                For this age, we’ll use <span className="font-medium">ASQ-3</span>. (M-CHAT-R is only for 16–30 months.)
              </p>
            )}
            {suggestMchatFirst && (
              <p>
                For toddlers 16–30 months, it’s usually helpful to start with{" "}
                <span className="font-medium">M-CHAT-R</span>, then complete <span className="font-medium">ASQ-3</span>.
              </p>
            )}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your selection</div>
              <div className="mt-1 text-sm text-foreground">{selectedType || "—"}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommended flow</div>
              <div className="mt-1 text-sm text-foreground">{recommendedFlow.join(" → ")}</div>
              {plan?.message ? <div className="mt-1 text-xs text-muted-foreground">{plan.message}</div> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-secondary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            Optional: AI Facial Morphology Screening
          </CardTitle>
          <CardDescription>Experimental / Research Use Only</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This feature is optional and <span className="font-medium">does not affect</span> screening scores or decision
          support recommendations. If you choose to try it, results are stored separately.
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {bothCompleted ? (
          <Badge className="bg-primary text-primary-foreground">All recommended screening completed</Badge>
        ) : mchatAllowed && !mchatCompleted ? (
          <>
            <Button onClick={startMchat} className="sm:order-2">
              Start M-CHAT-R
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => startAsq({ skippedMchat: true, orderFollowed: false })}
              className="sm:order-1"
            >
              Skip to ASQ-3
            </Button>
          </>
        ) : (
          <Button
            onClick={() => startAsq({ skippedMchat: mchatAllowed && !mchatCompleted, orderFollowed: true })}
            className="sm:order-2"
            disabled={asqCompleted}
          >
            Start ASQ-3
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

