import type { LevelInfo, AgentProgress, RankCrestKey } from "@/lib/gamification";
import {
  RANK_CREST_LABEL,
  rankCrestForLevel,
  rankCrestKey,
  rankCrestSrc,
  tierColor,
} from "@/lib/gamification";

function formatXp(n: number) {
  return n.toLocaleString();
}

const CREST_ORDER: RankCrestKey[] = ["bronze", "silver", "gold", "prestige", "hof"];

export function TierLadder({
  levels,
  progress,
}: {
  levels: LevelInfo[];
  progress: AgentProgress;
}) {
  const currentRank = progress.level_rank || 1;
  const currentCrest = rankCrestKey(progress);
  const ladder = levels.slice(0, 9);

  return (
    <div className="game-panel p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {currentCrest && (
            <img
              src={rankCrestSrc(currentCrest)}
              alt={progress.level_name}
              className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(255,140,0,0.25)]"
            />
          )}
          <div>
            <h2 className="text-lg font-bold">Agent Tier Progress</h2>
            <p className="text-xs text-muted-foreground">
              Crest upgrades as you climb XP — hover any rank to preview
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {progress.next_level_name && (
            <p className="text-xs text-[var(--game-orange)]">
              {progress.xp_to_next.toLocaleString()} XP to {progress.next_level_name}
            </p>
          )}
          <div className="flex items-center gap-1.5">
            {CREST_ORDER.map((key) => (
              <div
                key={key}
                className="flex flex-col items-center"
                title={RANK_CREST_LABEL[key]}
              >
                <img
                  src={rankCrestSrc(key)}
                  alt={RANK_CREST_LABEL[key]}
                  className="h-6 w-6 object-contain"
                />
                <span className="text-[7px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {RANK_CREST_LABEL[key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative hidden sm:block">
        <div className="absolute left-0 right-0 top-7 h-1 rounded-full bg-black/40" />
        <div
          className="absolute left-0 top-7 h-1 rounded-full bg-[var(--game-orange)] transition-all"
          style={{
            width: `${Math.min(100, ((currentRank - 1) / Math.max(1, ladder.length - 1)) * 100)}%`,
          }}
        />
        <div className="relative flex justify-between gap-1">
          {ladder.map((level) => {
            const reached = currentRank >= level.rank;
            const isCurrent = currentRank === level.rank;
            const color = tierColor(level.tier_type as AgentProgress["level_tier"]);
            const crest = rankCrestForLevel(level);
            const metal = RANK_CREST_LABEL[crest];
            return (
              <div
                key={level.slug}
                className="group relative flex max-w-[5rem] flex-1 flex-col items-center text-center"
              >
                <div
                  className={
                    "relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-black/30 transition-all duration-200 " +
                    (isCurrent
                      ? "border-[var(--game-orange)] shadow-[0_0_16px_rgba(255,140,0,0.35)] scale-105"
                      : reached
                        ? "border-[var(--game-orange)]/50"
                        : "border-white/10 opacity-75 group-hover:opacity-100 group-hover:border-white/30 group-hover:scale-110 group-hover:z-20")
                  }
                >
                  <img
                    src={rankCrestSrc(crest)}
                    alt={`${level.name} — ${metal}`}
                    className="h-10 w-10 object-contain transition duration-200 group-hover:brightness-110"
                  />
                </div>

                <p
                  className={
                    "mt-2 text-[11px] font-bold leading-tight " +
                    (isCurrent
                      ? "text-[var(--game-orange)]"
                      : reached
                        ? ""
                        : "text-muted-foreground group-hover:text-foreground")
                  }
                  style={reached || isCurrent ? { color } : undefined}
                >
                  {level.name}
                </p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/80 group-hover:text-[var(--game-orange)]/90">
                  {metal}
                </p>
                {!reached && (
                  <p className="mt-0.5 text-[9px] text-muted-foreground/60 group-hover:text-muted-foreground">
                    {formatXp(level.xp_required)} XP
                  </p>
                )}
                {isCurrent && (
                  <span className="mt-1 rounded bg-[var(--game-orange)]/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--game-orange)]">
                    You
                  </span>
                )}

                <div className="pointer-events-none absolute left-1/2 top-[4.25rem] z-30 w-44 -translate-x-1/2 translate-y-1 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="rounded-lg border border-[var(--game-orange)]/30 bg-[oklch(0.16_0.02_260)] p-3 shadow-xl shadow-black/50">
                    <div className="flex items-center gap-2">
                      <img
                        src={rankCrestSrc(crest)}
                        alt=""
                        className="h-11 w-11 object-contain"
                      />
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-bold">{level.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--game-orange)]">
                          {metal} crest
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-left text-[11px] text-muted-foreground">
                      {level.description || "Keep closing to unlock."}
                    </p>
                    <p className="mt-1.5 text-left text-[10px] text-muted-foreground">
                      Unlocks at{" "}
                      <span className="font-semibold text-foreground">
                        {formatXp(level.xp_required)} XP
                      </span>
                    </p>
                    {isCurrent && (
                      <p className="mt-1 text-left text-[10px] font-semibold text-[var(--game-orange)]">
                        Current rank
                      </p>
                    )}
                    {!reached && !isCurrent && (
                      <p className="mt-1 text-left text-[10px] text-muted-foreground">
                        Locked — preview only
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sm:hidden">
        <div className="mb-3 flex items-center gap-3">
          {currentCrest && (
            <img
              src={rankCrestSrc(currentCrest)}
              alt=""
              className="h-10 w-10 shrink-0 object-contain"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--game-orange)]">{progress.level_name}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full bg-[var(--game-orange)]"
                style={{ width: `${progress.level_progress_pct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {ladder.map((level) => {
            const reached = currentRank >= level.rank;
            const isCurrent = currentRank === level.rank;
            const crest = rankCrestForLevel(level);
            return (
              <div
                key={level.slug}
                className={
                  "flex w-[4.5rem] shrink-0 flex-col items-center rounded-lg border px-1.5 py-2 " +
                  (isCurrent
                    ? "border-[var(--game-orange)]/50 bg-[var(--game-orange)]/10"
                    : "border-white/5 bg-black/20")
                }
              >
                <img
                  src={rankCrestSrc(crest)}
                  alt={level.name}
                  className="h-9 w-9 object-contain"
                />
                <p className="mt-1 text-center text-[10px] font-bold leading-tight">{level.name}</p>
                <p className="text-[8px] uppercase tracking-wider text-muted-foreground">
                  {RANK_CREST_LABEL[crest]}
                </p>
                {!reached && (
                  <p className="text-[8px] text-muted-foreground/70">{formatXp(level.xp_required)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
