import { Flame, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/sales";
import { type AgentProgress } from "@/lib/gamification";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { AgentRankMark } from "@/components/gamification/AgentRankMark";

export interface RankedAgent {
  agent_id: string;
  agent_name: string;
  revenue: number;
  count: number;
  progress?: AgentProgress | null;
}

export function TopAgentsBoard({ agents, highlightId }: { agents: RankedAgent[]; highlightId?: string }) {
  const top30 = agents.slice(0, 30);
  const columns = [
    top30.slice(0, 10),
    top30.slice(10, 20),
    top30.slice(20, 30),
  ];

  return (
    <div className="game-panel p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Top 30 Agents</h2>
          <p className="text-xs text-muted-foreground">
            Always visible — updates live — ranks 1–30 of {agents.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="space-y-2">
            {col.map((agent, i) => {
              const rank = colIdx * 10 + i + 1;
              const isTop3 = rank <= 3;
              const isMe = agent.agent_id === highlightId;
              return (
                <div
                  key={agent.agent_id}
                  className={
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors " +
                    (isTop3
                      ? "border-[var(--game-orange)]/40 bg-[var(--game-orange)]/5"
                      : "border-border/50 bg-black/20") +
                    (isMe ? " ring-1 ring-primary/40" : "")
                  }
                >
                  <span className="num w-6 shrink-0 text-xs font-semibold text-muted-foreground">
                    #{rank}
                  </span>
                  <AgentRankMark progress={agent.progress} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{agent.agent_name}</span>
                      <LevelBadge progress={agent.progress} showCrest={false} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      {agent.progress && agent.progress.current_streak > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[var(--game-orange)]">
                          <Flame className="h-3 w-3" />
                          {agent.progress.current_streak}
                        </span>
                      ) : (
                        <span>no streak</span>
                      )}
                      <span className="inline-flex items-center gap-0.5">
                        <ShoppingBag className="h-3 w-3" />
                        {agent.count} sales
                      </span>
                    </div>
                    {agent.progress && agent.progress.xp_to_next > 0 && (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/40">
                        <div
                          className="h-full bg-[var(--game-orange)]/80"
                          style={{ width: `${agent.progress.level_progress_pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="num shrink-0 text-right text-sm font-semibold">
                    {formatCurrency(agent.revenue)}
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
