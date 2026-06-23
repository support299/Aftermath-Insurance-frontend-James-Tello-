import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  DEFAULT_REPORTING_TIMEZONE,
  isValidReportingTimezone,
} from "@/lib/timezone-options";
import { setReportingTimezone } from "@/lib/timezone";

interface CompanySettingsState {
  reportingTimezone: string;
  loading: boolean;
  updateReportingTimezone: (tz: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CompanySettingsContext = createContext<CompanySettingsState | undefined>(undefined);

const SETTINGS_ID = 1;

export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [reportingTimezone, setReportingTimezoneState] = useState(DEFAULT_REPORTING_TIMEZONE);
  const [loading, setLoading] = useState(true);

  const applyTimezone = useCallback((tz: string) => {
    const safe = isValidReportingTimezone(tz) ? tz : DEFAULT_REPORTING_TIMEZONE;
    setReportingTimezone(safe);
    setReportingTimezoneState(safe);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      applyTimezone(DEFAULT_REPORTING_TIMEZONE);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("company_settings")
      .select("reporting_timezone")
      .eq("id", SETTINGS_ID)
      .maybeSingle();
    applyTimezone(data?.reporting_timezone ?? DEFAULT_REPORTING_TIMEZONE);
    setLoading(false);
  }, [user, applyTimezone]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const updateReportingTimezone = useCallback(
    async (tz: string) => {
      if (!isValidReportingTimezone(tz)) {
        throw new Error("Invalid reporting timezone");
      }
      const { error } = await supabase
        .from("company_settings")
        .update({ reporting_timezone: tz })
        .eq("id", SETTINGS_ID);
      if (error) throw error;
      applyTimezone(tz);
    },
    [applyTimezone],
  );

  const value = useMemo(
    () => ({ reportingTimezone, loading, updateReportingTimezone, refresh }),
    [reportingTimezone, loading, updateReportingTimezone, refresh],
  );

  return (
    <CompanySettingsContext.Provider value={value}>{children}</CompanySettingsContext.Provider>
  );
}

export function useCompanySettings() {
  const ctx = useContext(CompanySettingsContext);
  if (!ctx) {
    throw new Error("useCompanySettings must be used within CompanySettingsProvider");
  }
  return ctx;
}
