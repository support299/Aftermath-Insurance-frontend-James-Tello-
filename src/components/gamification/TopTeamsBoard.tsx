import { ShoppingBag, Users } from "lucide-react";
import { formatCurrency } from "@/lib/sales";

export interface RankedTeam {
  team_id: string | null;
  team_name: string;
  revenue: number;
  count: number;
  avgDeal: number;
  cpa: number;
  agent_count: number;
}

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MEDAL = ["var(--gold)", "var(--silver)", "var(--bronze)"] as const;

export function TopTeamsBoard({
  teams,
  highlightTeamId,
}: {
  teams: RankedTeam[];
  highlightTeamId?: string | null;
}) {
  const ranked = teams.filter((t) => t.count > 0 || t.revenue > 0);
  const top = ranked.slice(0, 12);
  const leaderRevenue = top[0]?.revenue || 1;
  const columns = [top.slice(0, 4), top.slice(4, 8), top.slice(8, 12)];

  if (top.length === 0) {
    return (
      <div className="game-panel p-8 text-center text-sm text-muted-foreground">
        No team sales in this period yet.
      </div>
    );
  }

  return (
    <div className="game-panel p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--game-teal)]">
            Clan war
          </p>
          <h2 className="text-lg font-bold">Top Teams</h2>
          <p className="text-xs text-muted-foreground">
            Ranked by revenue — updates live — showing {top.length} of {ranked.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="space-y-2">
            {col.map((team, i) => {
              const rank = colIdx * 4 + i + 1;
              const isTop3 = rank <= 3;
              const key = team.team_id ?? "none";
              const isMine = highlightTeamId != null && key === highlightTeamId;
              const pct = Math.min(100, (team.revenue / leaderRevenue) * 100);
              const medalColor = isTop3 ? MEDAL[rank - 1] : undefined;
              return (
                <div
                  key={key + rank}
                  className={
                    "relative overflow-hidden rounded-lg border px-3 py-3 transition-colors " +
                    (isTop3
                      ? "border-[var(--game-teal)]/35 bg-gradient-to-br from-[var(--game-teal)]/10 to-transparent"
                      : "border-border/50 bg-black/20") +
                    (isMine ? " ring-1 ring-primary/40" : "")
                  }
                >
                  {isTop3 && (
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${medalColor}, transparent)`,
                      }}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <span
                      className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                      style={
                        isTop3
                          ? {
                              color: medalColor,
                              backgroundColor: `color-mix(in oklch, ${medalColor} 18%, transparent)`,
                              border: `1px solid color-mix(in oklch, ${medalColor} 40%, transparent)`,
                            }
                          : undefined
                      }
                    >
                      #{rank}
                    </span>
                    <div
                      className={
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold " +
                        (isTop3
                          ? "bg-[var(--game-teal)]/15 text-[var(--game-teal)]"
                          : "bg-secondary text-muted-foreground")
                      }
                    >
                      {teamInitials(team.team_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{team.team_name}</span>
                        {isMine && (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                            Your team
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5">
                          <Users className="h-3 w-3" />
                          {team.agent_count} active
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <ShoppingBag className="h-3 w-3" />
                          {team.count} sales
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
                        <div
                          className={
                            "h-full rounded-full transition-all " +
                            (isTop3 ? "bg-[var(--game-teal)]" : "bg-[var(--game-orange)]/70")
                          }
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num text-sm font-bold text-[var(--game-orange)]">
                        {formatCurrency(team.revenue)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        avg {formatCurrency(team.avgDeal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
