import { Progress } from "../../../ui/progress";
import { Card, CardContent } from "../../../ui/card";

function encouragement(pct: number) {
  if (pct < 34) return "Great start 🌱";
  if (pct < 75) return "You’re doing great 💙";
  return "Almost done ✨";
}

export function ProgressHeader(props: {
  title: string;
  subtitle?: string;
  stepLabel: string;
  current: number;
  total: number;
}) {
  const { title, subtitle, stepLabel, current, total } = props;
  const pct = total <= 0 ? 0 : Math.round((current / total) * 100);

  return (
    <Card className="rounded-xl border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-base font-semibold text-foreground">{title}</div>
            {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
          </div>
          <div className="text-sm font-medium text-foreground">{encouragement(pct)}</div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{stepLabel}</span>
          <span>
            {current}/{total}
          </span>
        </div>
        <div className="mt-2">
          <Progress value={pct} />
        </div>
      </CardContent>
    </Card>
  );
}

