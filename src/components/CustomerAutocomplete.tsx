import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Mail, Phone, Plus, User, X } from "lucide-react";
import { toast } from "sonner";

export interface Contact {
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

const TRUSTED_ORIGIN_SUFFIXES = [".leadconnectorhq.com", ".gohighlevel.com"];
const TRUSTED_ORIGINS = new Set([
  "https://calendar.pinnaclewellnessagencies.com",
  "https://api.leadconnectorhq.com",
  "https://services.leadconnectorhq.com",
  "https://backend.leadconnectorhq.com",
]);

function isTrustedOrigin(origin: string) {
  if (TRUSTED_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return TRUSTED_ORIGIN_SUFFIXES.some((suffix) => hostname.endsWith(suffix.slice(1)));
  } catch {
    return false;
  }
}

function extractContactId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  if (typeof d.contactId === "string") return d.contactId;
  if (typeof d.contact_id === "string") return d.contact_id;

  if (d.contact && typeof d.contact === "object") {
    const c = d.contact as Record<string, unknown>;
    if (typeof c.id === "string") return c.id;
  }

  const event = d.event ?? d.type ?? d.msg;
  const isFormEvent =
    event === "formSubmit" ||
    event === "form_submitted" ||
    event === "formSubmission" ||
    event === "setContact" ||
    event === "contactCreated";

  if (isFormEvent) {
    if (typeof d.id === "string") return d.id;
    if (d.payload && typeof d.payload === "object") {
      const p = d.payload as Record<string, unknown>;
      if (typeof p.contactId === "string") return p.contactId;
      if (typeof p.contact_id === "string") return p.contact_id;
      if (typeof p.id === "string") return p.id;
    }
  }

  return null;
}

function looksLikeFormSubmit(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (extractContactId(data)) return true;
  const event = String(d.event ?? d.type ?? d.msg ?? "").toLowerCase();
  return (
    event === "formsubmit" ||
    event === "form_submitted" ||
    event === "formsubmission" ||
    event === "contactcreated"
  );
}

async function fetchContactById(id: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from("ghl_contacts")
    .select("id, name, email, phone, user_id")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[CustomerAutocomplete]", error);
    return null;
  }
  return data as Contact | null;
}

async function fetchLatestContact(userId: string | null, since: string): Promise<Contact | null> {
  let q = supabase
    .from("ghl_contacts")
    .select("id, name, email, phone, user_id, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (userId) q = q.eq("user_id", userId);

  const { data, error } = await q;
  if (error) {
    console.error("[CustomerAutocomplete]", error);
    return null;
  }
  return (data?.[0] as Contact | undefined) ?? null;
}

function ContactOption({ contact }: { contact: Contact }) {
  return (
    <>
      <div className="font-medium">{contact.name || "(unnamed)"}</div>
      <div className="mt-0.5 space-y-0.5">
        {contact.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{contact.phone}</span>
          </div>
        )}
        {contact.user_id && (
          <div className="text-xs text-muted-foreground/80">User ID: {contact.user_id}</div>
        )}
      </div>
    </>
  );
}

export function CustomerAutocomplete({ value, onChange, onSelect, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncingContact, setSyncingContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [ghlUserId, setGhlUserId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);
  const modalOpenedAtRef = useRef<string | null>(null);
  const baselineContactIdRef = useRef<string | null>(null);
  const resolvedContactRef = useRef(false);
  const resolvingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();

  const query = value.trim();

  useEffect(() => {
    if (!value.trim()) setSelectedContact(null);
  }, [value]);

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
    if (selectedContact) return;
    if (query.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
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
  }, [query, selectedContact]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = useCallback(
    (c: Contact, { auto = false }: { auto?: boolean } = {}) => {
      skipNextSearch.current = true;
      setSelectedContact(c);
      onChange(c.name ?? "");
      onSelect?.(c);
      setOpen(false);
      setResults([]);
      if (auto) toast.success("Contact created and selected", { id: "ghl-contact-created" });
    },
    [onChange, onSelect],
  );

  const finishWithContact = useCallback(
    (c: Contact) => {
      if (resolvedContactRef.current) return;
      resolvedContactRef.current = true;
      resolvingRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setSyncingContact(false);
      setShowAddModal(false);
      pick(c, { auto: true });
    },
    [pick],
  );

  const clearSelection = () => {
    setSelectedContact(null);
    skipNextSearch.current = true;
    onChange("");
    setOpen(true);
  };

  const resolveNewContact = useCallback(
    async (contactId?: string | null) => {
      if (resolvedContactRef.current || resolvingRef.current) return;
      resolvingRef.current = true;

      try {
        if (contactId) {
          const byId = await fetchContactById(contactId);
          if (byId) {
            finishWithContact(byId);
            return;
          }
        }

        const since = modalOpenedAtRef.current;
        if (!since) return;

        const latest = await fetchLatestContact(ghlUserId, since);
        if (latest && latest.id !== baselineContactIdRef.current) {
          finishWithContact(latest);
        }
      } finally {
        if (!resolvedContactRef.current) resolvingRef.current = false;
      }
    },
    [ghlUserId, finishWithContact],
  );

  useEffect(() => {
    if (!showAddModal) {
      setSyncingContact(false);
      resolvedContactRef.current = false;
      resolvingRef.current = false;
      modalOpenedAtRef.current = null;
      baselineContactIdRef.current = null;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const openedAt = new Date(Date.now() - 2000).toISOString();
    modalOpenedAtRef.current = openedAt;
    resolvedContactRef.current = false;
    resolvingRef.current = false;
    setSyncingContact(false);

    (async () => {
      const latest = await fetchLatestContact(ghlUserId, openedAt);
      baselineContactIdRef.current = latest?.id ?? null;
    })();

    const poll = () => {
      if (resolvedContactRef.current) return;
      void resolveNewContact();
    };

    pollIntervalRef.current = setInterval(poll, 1500);
    poll();

    const onMessage = (event: MessageEvent) => {
      if (!isTrustedOrigin(event.origin)) return;
      if (!looksLikeFormSubmit(event.data)) return;
      setSyncingContact(true);
      void resolveNewContact(extractContactId(event.data));
    };

    window.addEventListener("message", onMessage);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      window.removeEventListener("message", onMessage);
    };
  }, [showAddModal, ghlUserId, resolveNewContact]);

  const showList = open && !selectedContact && (query.length >= 2 || results.length > 0);

  const openAddModal = () => {
    skipNextSearch.current = true;
    setOpen(false);
    setShowAddModal(true);
  };

  const formUrl = ghlUserId
    ? `https://calendar.pinnaclewellnessagencies.com/widget/form/gPzkXchRgBxBPrEbjYxj?id=${ghlUserId}`
    : `https://calendar.pinnaclewellnessagencies.com/widget/form/gPzkXchRgBxBPrEbjYxj`;

  if (selectedContact) {
    return (
      <div ref={wrapRef} className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="font-medium leading-tight">{selectedContact.name || "(unnamed)"}</div>
            {selectedContact.email && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{selectedContact.email}</span>
              </div>
            )}
            {selectedContact.phone && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{selectedContact.phone}</span>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-muted-foreground"
            onClick={clearSelection}
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex gap-2">
        <Input
          value={value}
          placeholder={placeholder}
          className="flex-1"
          onChange={(e) => {
            setSelectedContact(null);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showList && e.key !== "Escape") return;
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
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={openAddModal}
          title="Add new contact"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {open && !showList && query.length < 2 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Type at least 2 characters to search, or add a new contact.
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Add contact
          </button>
        </div>
      )}

      {showList && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No contacts found</div>
          )}
          {!loading &&
            results.map((c, i) => (
              <button
                type="button"
                key={c.id}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(c)}
                className={cn(
                  "block w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
                  i === highlight && "bg-muted/60",
                )}
              >
                <ContactOption contact={c} />
              </button>
            ))}
          <button
            type="button"
            onClick={openAddModal}
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
          onClick={() => !syncingContact && setShowAddModal(false)}
        >
          <div
            className="relative h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !syncingContact && setShowAddModal(false)}
              className="absolute right-2 top-2 z-10 rounded-md bg-background/90 p-1.5 text-foreground shadow hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            {syncingContact && (
              <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 px-4 py-3 text-center text-sm text-muted-foreground">
                Contact submitted — syncing to your sale form…
              </div>
            )}
            <iframe src={formUrl} className="h-full w-full border-0" title="Add contact" />
          </div>
        </div>
      )}
    </div>
  );
}
