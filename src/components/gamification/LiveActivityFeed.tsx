import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Coins,
  Flame,
  Radio,
  ShoppingBag,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { relativeTime, type ActivityEvent } from "@/lib/gamification";

type EventStyle = {
  dot: string;
  card: string;
  icon: React.ReactNode;
  label: string;
};

function eventStyle(type: string): EventStyle {
  switch (type) {
    case "first_blood":
      return {
        dot: "bg-[var(--game-orange)] shadow-[0_0_8px_var(--game-orange)]",
        card: "border-[var(--game-orange)]/25 bg-[var(--game-orange)]/8",
        icon: <Zap className="h-3.5 w-3.5 text-[var(--game-orange)]" />,
        label: "First Blood",
      };
    case "level_up":
      return {
        dot: "bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]",
        card: "border-[var(--gold)]/25 bg-[var(--gold)]/8",
        icon: <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" />,
        label: "Level Up",
      };
    case "streak_milestone":
      return {
        dot: "bg-[var(--game-teal)] shadow-[0_0_8px_var(--game-teal)]",
        card: "border-[var(--game-teal)]/25 bg-[var(--game-teal)]/8",
        icon: <Flame className="h-3.5 w-3.5 text-[var(--game-teal)]" />,
        label: "Streak",
      };
    case "achievement_unlocked":
      return {
        dot: "bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]",
        card: "border-[var(--gold)]/25 bg-[var(--gold)]/8",
        icon: <Trophy className="h-3.5 w-3.5 text-[var(--gold)]" />,
        label: "Badge",
      };
    default:
      if (type === "sale_logged" || type === "sale") {
        return {
          dot: "bg-[var(--success)] shadow-[0_0_6px_var(--success)]",
          card: "border-[var(--success)]/20 bg-[var(--success)]/5",
          icon: <ShoppingBag className="h-3.5 w-3.5 text-[var(--success)]" />,
          label: "Sale",
        };
      }
      return {
        dot: "bg-[var(--game-teal)] shadow-[0_0_6px_var(--game-teal)]",
        card: "border-border/40 bg-black/25",
        icon: <Coins className="h-3.5 w-3.5 text-[var(--game-teal)]" />,
        label: "Activity",
      };
  }
}

export function LiveActivityFeed({
  events,
  loading,
  limit = 30,
}: {
  events: ActivityEvent[];
  loading?: boolean;
  limit?: number;
}) {
  const shown = events.slice(0, limit);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollHeight > el.clientHeight + 2;
    setCanScroll(overflow);
    setAtBottom(!overflow || el.scrollHeight - el.scrollTop - el.clientHeight < 12);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown, loading, updateScrollState]);

  return (
    <div className="game-panel relative flex h-80 flex-col overflow-hidden p-5 sm:p-6">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--game-orange)]/15 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--game-orange)]/30 bg-[var(--game-orange)]/10">
            <Radio className="h-4 w-4 text-[var(--game-orange)]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--game-orange)]">
              Live Activity
            </p>
            <p className="text-[10px] text-muted-foreground">Real-time squad feed</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--game-orange)]/30 bg-[var(--game-orange)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--game-orange)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--game-orange)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--game-orange)]" />
            </span>
            Live
          </span>
          {shown.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{shown.length} events</span>
          )}
        </div>
      </div>

      {/* Scrollable feed */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="game-activity-scroll mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5"
      >
        {loading && shown.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading activity…</p>
        )}
        {!loading && shown.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No recent activity yet.</p>
        )}

        {shown.length > 0 && (
          <div className="relative space-y-2 pb-1 pl-1">
            <div
              className="pointer-events-none absolute bottom-1 left-[13px] top-2 w-px bg-gradient-to-b from-[var(--game-orange)]/50 via-[var(--game-teal)]/25 to-transparent"
              aria-hidden
            />
            {shown.map((event, index) => {
              const style = eventStyle(event.event_type);
              return (
                <div key={event.id} className="relative flex gap-3 pl-0.5">
                  <div className="relative z-10 mt-3 flex flex-col items-center">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[oklch(0.14_0.02_260)] ${style.dot}`} />
                  </div>
                  <div
                    className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 transition-colors ${style.card} ${
                      index === 0 ? "ring-1 ring-[var(--game-orange)]/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {style.icon}
                        {style.label}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {event.created_at ? relativeTime(event.created_at) : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-snug">{event.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll affordance */}
      {canScroll && !atBottom && (
        <>
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[oklch(0.14_0.02_260)] via-[oklch(0.14_0.02_260/0.85)] to-transparent"
            aria-hidden
          />
          <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--game-orange)]/25 bg-black/50 px-2.5 py-1 text-[10px] font-medium text-[var(--game-orange)] backdrop-blur-sm">
              <ChevronDown className="h-3 w-3 animate-bounce" />
              Scroll for more
            </span>
          </div>
        </>
      )}
    </div>
  );
}
