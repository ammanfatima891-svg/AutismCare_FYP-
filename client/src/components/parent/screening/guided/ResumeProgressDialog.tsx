import { Button } from "../../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
import { Card, CardContent } from "../../../ui/card";
import type { ScreeningProgress } from "./useScreeningProgress";

function niceTypeLabel(type: ScreeningProgress["type"]) {
  return type === "mchat" ? "M-CHAT-R" : "ASQ-3";
}

export function ResumeProgressDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: ScreeningProgress | null;
  onResume: () => void;
  onStartOver: () => void;
}) {
  const { open, onOpenChange, progress, onResume, onStartOver } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton>
        <DialogHeader>
          <DialogTitle>Continue where you left off?</DialogTitle>
          <DialogDescription>
            We found saved progress for <span className="font-medium text-foreground">{niceTypeLabel(progress?.type ?? "mchat")}</span>.
          </DialogDescription>
        </DialogHeader>

        <Card className="rounded-xl border bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Last updated</span>
              <span className="text-foreground">
                {progress?.lastUpdated ? new Date(progress.lastUpdated).toLocaleString() : "—"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Saved answers</span>
              <span className="text-foreground">{Object.keys(progress?.answers ?? {}).length}</span>
            </div>
          </CardContent>
        </Card>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onStartOver}>
            Start Over
          </Button>
          <Button type="button" onClick={onResume}>
            Resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

