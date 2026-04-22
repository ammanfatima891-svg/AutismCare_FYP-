import { useMemo } from "react";
import { Card, CardContent } from "../../../ui/card";
import { Heart, Info, Sparkles } from "lucide-react";

type CardTone = "info" | "progress" | "friendly";

function toneClasses(tone: CardTone) {
  if (tone === "info") return "border-blue-200 bg-blue-50/60 text-blue-950";
  if (tone === "progress") return "border-green-200 bg-green-50/60 text-green-950";
  return "border-yellow-200 bg-yellow-50/60 text-yellow-950";
}

function toneIcon(tone: CardTone) {
  if (tone === "info") return Info;
  if (tone === "progress") return Sparkles;
  return Heart;
}

export function GuidanceCards(props: {
  items: Array<{ tone: CardTone; title: string; body: string }>;
  currentIndex?: number;
}) {
  const { items, currentIndex = 0 } = props;
  const activeItem = useMemo(() => {
    if (!items.length) return null;
    const normalizedIndex = ((currentIndex % items.length) + items.length) % items.length;
    return items[normalizedIndex];
  }, [currentIndex, items]);

  if (!activeItem) return null;

  const Icon = toneIcon(activeItem.tone);

  return (
    <Card className={`rounded-xl border ${toneClasses(activeItem.tone)}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 rounded-lg bg-white/60 p-1.5">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">{activeItem.title}</div>
            <div className="mt-0.5 text-xs leading-snug opacity-90">{activeItem.body}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

