import { Sparkles } from "lucide-react";
import { Switch } from "../../../ui/switch";
import { Card, CardContent } from "../../../ui/card";

export function GuideToggle(props: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  const { enabled, onChange } = props;
  return (
    <Card className="rounded-xl border bg-card">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-secondary p-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">✨ Guide Me</div>
            <div className="text-xs text-muted-foreground">Show gentle hints while answering</div>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onChange} />
      </CardContent>
    </Card>
  );
}

