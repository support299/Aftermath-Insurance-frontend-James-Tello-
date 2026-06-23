import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { X, Plus } from "lucide-react";

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (c: Contact) => void;
  placeholder?: string;
}

export function CustomerAutocomplete({ value, onChange, onSelect, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [ghlUserId, setGhlUserId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);
  const { user } = useAuth();

  const query = value.trim();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ghl_users")
        .select("id")
        .eq("app_user_id", user.id)
        .maybeSingle();
      if (!cancelled) setGhlUserId(data?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (query.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      // Strip chars that would break the PostgREST or-group syntax.
      const term = query.replace(/[(),]/g, " ").trim();
      const like = `%${term}%`;
      const { data, error } = await supabase
        .from("ghl_contacts")
        .select("id, name, email, phone, user_id")
        .or(
          `name.ilike.${like},email.ilike.${like},id.ilike.${like},phone.ilike.${like},user_id.ilike.${like}`,
        )
        .order("name")
        .limit(8);
      if (cancelled) return;
      if (error) {
        console.error("[CustomerAutocomplete]", error);
        setResults([]);
      } else {
        setResults((data ?? []) as Contact[]);
        setHighlight(0);
      }
      setLoading(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const showList = open && query.length >= 2;

  const pick = (c: Contact) => {
    skipNextSearch.current = true;
    onChange(c.name ?? "");
    onSelect?.(c);
    setOpen(false);
    setResults([]);
  };

  const formUrl = ghlUserId
    ? `https://calendar.pinnaclewellnessagencies.com/widget/form/gPzkXchRgBxBPrEbjYxj?id=${ghlUserId}`
    : `https://calendar.pinnaclewellnessagencies.com/widget/form/gPzkXchRgBxBPrEbjYxj`;

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && results[highlight]) {
            e.preventDefault();
            pick(results[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        autoComplete="off"
      />
      {showList && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No contacts found</div>
          )}
          {!loading && results.map((c, i) => (
            <button
              type="button"
              key={c.id}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(c)}
              className={cn(
                "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                i === highlight && "bg-muted/60",
              )}
            >
              <div className="font-medium">{c.name || "(unnamed)"}</div>
              {c.user_id && (
                <div className="text-xs text-muted-foreground">User ID: {c.user_id}</div>
              )}
              {(c.email || c.phone) && (
                <div className="text-xs text-muted-foreground">
                  {[c.email, c.phone].filter(Boolean).join(" · ")}
                </div>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              skipNextSearch.current = true;
              onChange("");
              setResults([]);
              setShowAddModal(true);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Add contact
          </button>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/30 p-4 backdrop-blur-md"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="relative h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute right-2 top-2 z-10 rounded-md bg-background/90 p-1.5 text-foreground shadow hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <iframe
              src={formUrl}
              className="h-full w-full border-0"
              title="Add contact"
            />
          </div>
        </div>
      )}
    </div>
  );
}
