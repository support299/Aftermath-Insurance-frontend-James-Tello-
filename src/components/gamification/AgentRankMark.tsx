import { Users } from "lucide-react";
import {
  RANK_CREST_LABEL,
  crestKeyForRank,
  rankCrestSrc,
  type AgentProgress,
  type RankCrestKey,
} from "@/lib/gamification";

export type RankMarkProgress = Pick<
  AgentProgress,
  "level_rank" | "level_name" | "level_tier"
> | null | undefined;

/** Compact crest for agent lists / headers — falls back to generic icon if unranked. */
export function AgentRankMark({
  progress,
  levelRank,
  levelName,
  levelTier,
  size = "md",
  className = "",
}: {
  progress?: RankMarkProgress;
  /** Alternate to progress object when only scalar fields are available. */
  levelRank?: number | null;
  levelName?: string | null;
  levelTier?: AgentProgress["level_tier"] | string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const rank = progress?.level_rank ?? levelRank ?? 0;
  const name = progress?.level_name ?? levelName ?? "";
  const tier = (progress?.level_tier ?? levelTier ?? "level") as AgentProgress["level_tier"];

  const dim =
    size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const img =
    size === "lg" ? "h-11 w-11" : size === "sm" ? "h-6 w-6" : "h-8 w-8";

  if (!rank || rank <= 0) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground ${dim} ${className}`}
        title="Unranked"
      >
        <Users className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </div>
    );
  }

  const key: RankCrestKey = crestKeyForRank(rank, tier);
  const metal = RANK_CREST_LABEL[key];
  const title = name ? `${name} · ${metal}` : metal;

  return (
    <img
      src={rankCrestSrc(key)}
      alt={title}
      title={title}
      className={`shrink-0 object-contain ${img} ${className}`}
    />
  );
}
