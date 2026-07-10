import { tierColor, type AgentProgress } from "@/lib/gamification";

export function LevelBadge({
  progress,
  size = "sm",
}: {
  progress?: AgentProgress | null;
  size?: "sm" | "md";
}) {
  if (!progress || progress.level_rank === 0) return null;
  const color = tierColor(progress.level_tier);
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wider ${pad}`}
      style={{
        color,
        backgroundColor: `color-mix(in oklch, ${color} 18%, transparent)`,
        border: `1px solid color-mix(in oklch, ${color} 35%, transparent)`,
      }}
    >
      {progress.level_name}
    </span>
  );
}
