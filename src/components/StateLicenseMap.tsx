import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { MapPinned } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { US_MAP_VIEWBOX, US_STATE_SHAPES } from "@/lib/us-state-paths";
import { US_STATE_NAME, US_STATES } from "@/lib/us-states";
import { cn } from "@/lib/utils";

type Props = {
  agentId: string;
  /** When true, clicking a state toggles license and saves. */
  editable?: boolean;
  className?: string;
};

export function StateLicenseMap({ agentId, editable = false, className }: Props) {
  const [licensed, setLicensed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("profiles")
      .select("licensed_states")
      .eq("id", agentId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("[licensed_states]", error);
          setLicensed([]);
        } else {
          const raw = (data as { licensed_states?: string[] | null } | null)?.licensed_states;
          setLicensed(Array.isArray(raw) ? raw.map((c) => c.toUpperCase()) : []);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [agentId]);

  const licensedSet = useMemo(() => new Set(licensed), [licensed]);

  const persist = useCallback(
    async (next: string[]) => {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({ licensed_states: next })
        .eq("id", agentId);
      setSaving(false);
      if (error) {
        console.error("[licensed_states save]", error);
        toast.error("Could not save licensed states");
        return false;
      }
      return true;
    },
    [agentId],
  );

  const toggle = useCallback(
    async (code: string) => {
      if (!editable || saving || loading) return;
      const prev = licensed;
      const next = licensedSet.has(code)
        ? licensed.filter((c) => c !== code)
        : [...licensed, code].sort();
      setLicensed(next);
      const ok = await persist(next);
      if (!ok) setLicensed(prev);
    },
    [editable, saving, loading, licensed, licensedSet, persist],
  );

  const activeList = useMemo(
    () =>
      licensed
        .filter((c) => US_STATE_NAME[c])
        .sort((a, b) => (US_STATE_NAME[a] ?? a).localeCompare(US_STATE_NAME[b] ?? b)),
    [licensed],
  );

  return (
    <div className={cn("game-panel overflow-hidden", className)}>
      <div className="flex flex-col gap-3 border-b border-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20">
            <MapPinned className="h-4 w-4 text-[var(--game-teal)]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--game-teal)]">
              Licenses
            </p>
            <h2 className="text-sm font-bold">Licensed states</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {editable
                ? "Click a state on the map to mark it licensed (green) or clear it."
                : "Active licenses for this agent."}
              {hover ? ` · ${US_STATE_NAME[hover] ?? hover}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/90" /> Active
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/10" /> Inactive
          </span>
          <span className="num font-semibold text-foreground">
            {loading ? "…" : `${activeList.length} / ${US_STATES.length}`}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div
          className={cn(
            "mx-auto w-full max-w-4xl",
            (loading || saving) && "pointer-events-none opacity-60",
          )}
          role="group"
          aria-label="United States license map"
        >
          <svg
            viewBox={US_MAP_VIEWBOX}
            className="h-auto w-full"
            role="img"
            aria-label="Map of the United States"
          >
            {US_STATE_SHAPES.map((shape) => {
              const active = licensedSet.has(shape.code);
              const isHover = hover === shape.code;
              const fill = active
                ? isHover
                  ? "oklch(0.72 0.14 155)"
                  : "oklch(0.65 0.15 155 / 0.85)"
                : isHover
                  ? "oklch(0.35 0.02 260)"
                  : "oklch(0.28 0.02 260)";
              const stroke = active ? "oklch(0.78 0.12 155)" : "oklch(0.42 0.02 260)";
              const common = {
                key: shape.code,
                fill,
                stroke,
                strokeWidth: 1,
                style: {
                  cursor: editable && !saving ? "pointer" : "default",
                  transition: "fill 120ms ease, stroke 120ms ease",
                } as const,
                onMouseEnter: () => setHover(shape.code),
                onMouseLeave: () => setHover((h) => (h === shape.code ? null : h)),
                onClick: () => void toggle(shape.code),
                onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void toggle(shape.code);
                  }
                },
                tabIndex: editable ? 0 : -1,
                role: editable ? ("button" as const) : undefined,
                "aria-label": `${shape.name}${active ? " (licensed)" : ""}`,
                "aria-pressed": editable ? active : undefined,
              };
              if ("d" in shape) {
                return <path {...common} d={shape.d} />;
              }
              return <circle {...common} cx={shape.cx} cy={shape.cy} r={shape.r} />;
            })}
          </svg>
        </div>

        {activeList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeList.map((code) => (
              <button
                key={code}
                type="button"
                disabled={!editable || saving}
                onClick={() => void toggle(code)}
                className={cn(
                  "inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200",
                  editable && "hover:border-emerald-400/50",
                )}
                title={editable ? `Remove ${US_STATE_NAME[code]}` : US_STATE_NAME[code]}
              >
                {code}
                <span className="ml-1 hidden text-emerald-200/70 sm:inline">
                  {US_STATE_NAME[code]}
                </span>
              </button>
            ))}
          </div>
        )}

        {!loading && activeList.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {editable
              ? "No licensed states yet — click states on the map to add them."
              : "No licensed states recorded."}
          </p>
        )}
      </div>
    </div>
  );
}
