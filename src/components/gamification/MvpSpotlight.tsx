import { formatCurrency } from "@/lib/sales";
import { type AgentProgress } from "@/lib/gamification";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { AgentRankMark } from "@/components/gamification/AgentRankMark";
import { Flame } from "lucide-react";

export function MvpSpotlight({
  name,
  revenue,
  salesCount,
  progress,
  tags = [],
}: {
  name: string;
  revenue: number;
  salesCount: number;
  progress?: AgentProgress | null;
  tags?: string[];
}) {
  return (
    <div className="game-panel h-full p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--game-orange)]">
        This Week&apos;s MVP
      </p>
      <div className="mt-4 flex items-start gap-4">
        <AgentRankMark progress={progress} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-bold">{name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {progress && progress.current_streak > 0 && (
              <span className="inline-flex items-center gap-1 text-[var(--game-orange)]">
                <Flame className="h-3.5 w-3.5" />
                {progress.current_streak}-day streak
              </span>
            )}
            <span>{formatCurrency(revenue)} in sales</span>
            <span>·</span>
            <span>{salesCount} sales</span>
            {progress && (
              <>
                <span>·</span>
                <LevelBadge progress={progress} size="md" showCrest={false} />
              </>
            )}
          </div>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
