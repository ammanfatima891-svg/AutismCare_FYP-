import { Card, CardContent } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { CheckCircle2 } from "lucide-react";

type Option = { value: string; label: string };

export function QuestionCard(props: {
  indexLabel: string;
  text: string;
  value?: string;
  options: Option[];
  active?: boolean;
  answered?: boolean;
  hint?: string | null;
  showHint?: boolean;
  onSelect: (value: string) => void;
  containerRef?: (el: HTMLDivElement | null) => void;
}) {
  const { indexLabel, text, value, options, active, answered, hint, showHint, onSelect, containerRef } = props;
  const gridCols =
    options.length <= 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3";

  return (
    <Card
      ref={containerRef as any}
      tabIndex={-1}
      className={[
        "rounded-xl border transition-colors",
        active ? "border-primary/40 bg-secondary/20" : "bg-card",
      ].join(" ")}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-foreground">
            {indexLabel}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium leading-relaxed text-foreground">{text}</div>
              {answered ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /> : null}
            </div>

            {showHint && hint ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-950">
                {hint}
              </div>
            ) : null}

            <div className={`grid ${gridCols} gap-2`}>
              {options.map((opt) => {
                const selected = value === opt.value;
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    className="h-11 rounded-xl"
                    onClick={() => onSelect(opt.value)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

