import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../../ui/collapsible";
import { Button } from "../../../ui/button";
import { ChevronDown } from "lucide-react";

export function ReadMoreSection(props: { label?: string; children: React.ReactNode }) {
  const { label = "Read more", children } = props;
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-muted/20">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            {open ? "Hide" : "Show"}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="px-4 pb-4 text-sm text-muted-foreground">{children}</CollapsibleContent>
    </Collapsible>
  );
}

