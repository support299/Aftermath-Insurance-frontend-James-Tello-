import {
  rankCrestKey,
  rankCrestSrc,
  tierColor,
  type AgentProgress,
} from "@/lib/gamification";

export function LevelBadge({
  progress,
  size = "sm",
  showName = true,
  showCrest = true,
}: {
  progress?: AgentProgress | null;
  size?: "sm" | "md";
  /** When false, only the crest image is shown (tooltip still has the name). */
  showName?: boolean;
  /** When false, hide the crest (useful next to AgentRankMark). */
  showCrest?: boolean;
}) {
  if (!progress || progress.level_rank === 0) return null;

  const crest = showCrest ? rankCrestKey(progress) : null;
  const color = tierColor(progress.level_tier);
  const imgSize = size === "md" ? "h-7 w-7" : "h-5 w-5";
  const pad = size === "md" ? "px-2 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]";
  const title = progress.level_name;

  if (!showName && crest) {
    return (
      <img
        src={rankCrestSrc(crest)}
        alt={title}
        title={title}
        className={`${imgSize} shrink-0 object-contain`}
      />
    );
  }

  if (!showName && !crest) {
    return (
      <span className={`font-semibold uppercase tracking-wider ${pad}`} style={{ color }} title={title}>
        {progress.level_name}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wider ${pad}`}
      style={{
        color,
        backgroundColor: `color-mix(in oklch, ${color} 18%, transparent)`,
        border: `1px solid color-mix(in oklch, ${color} 35%, transparent)`,
      }}
      title={title}
    >
      {crest && (
        <img
          src={rankCrestSrc(crest)}
          alt=""
          aria-hidden
          className={`${imgSize} shrink-0 object-contain`}
        />
      )}
      <span className="leading-none">{progress.level_name}</span>
    </span>
  );
}
