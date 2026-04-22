import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Shield, Activity, AlertTriangle, CheckCircle } from "lucide-react";

function toneForUrgency(urgencyLevel) {
  if (urgencyLevel === "red") return "bad";
  if (urgencyLevel === "orange") return "warn";
  return "good";
}

function badgeClass(tone) {
  if (tone === "bad") return "bg-destructive text-destructive-foreground";
  if (tone === "warn")
    return "border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
  return "bg-primary text-primary-foreground";
}

function labelRisk(risk) {
  if (risk === "IGNORED") return "Not applicable";
  if (risk === "INCOMPLETE") return "Incomplete";
  return risk || "—";
}

export function DecisionSummaryCard({ decisionSupport }) {
  if (!decisionSupport) return null;

  const tone = toneForUrgency(decisionSupport.urgencyLevel);
  const icon =
    tone === "bad" ? <AlertTriangle className="h-5 w-5" /> : tone === "warn" ? <Activity className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />;

  return (
    <Card className="border-2">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5 text-primary" />
          Decision support summary
        </CardTitle>
        <CardDescription>Guidance only. This is not a diagnosis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Autism risk</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{labelRisk(decisionSupport.autismRisk)}</span>
              <Badge className={badgeClass(tone)}>{decisionSupport.urgencyLevel}</Badge>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Development</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{decisionSupport.developmentStatus}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommendation</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{decisionSupport.recommendation}</div>
          </div>
        </div>

        <Alert className="border-border bg-card">
          <div className="mt-0.5 text-primary">{icon}</div>
          <AlertDescription className="text-foreground">
            {decisionSupport.safetyNote || "This summary is decision support only and not a diagnosis."}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

