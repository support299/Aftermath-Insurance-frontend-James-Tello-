/** IANA timezones available for company reporting (curated US + IST + UTC). */
export const REPORTING_TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (America/New_York)" },
  { value: "America/Chicago", label: "Central Time (America/Chicago)" },
  { value: "America/Denver", label: "Mountain Time (America/Denver)" },
  { value: "America/Phoenix", label: "Arizona (America/Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific Time (America/Los_Angeles)" },
  { value: "America/Anchorage", label: "Alaska (America/Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Pacific/Honolulu)" },
  { value: "Asia/Kolkata", label: "IST — Indian Standard Time (Asia/Kolkata)" },
  { value: "UTC", label: "UTC" },
] as const;

export const DEFAULT_REPORTING_TIMEZONE = "America/New_York";

export function isValidReportingTimezone(tz: string): boolean {
  return REPORTING_TIMEZONE_OPTIONS.some((o) => o.value === tz);
}

export function reportingTimezoneOptionLabel(tz: string): string {
  return REPORTING_TIMEZONE_OPTIONS.find((o) => o.value === tz)?.label ?? tz;
}
