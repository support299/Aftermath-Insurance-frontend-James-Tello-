import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { DEFAULT_REPORTING_TIMEZONE } from "@/lib/timezone-options";

let _reportingTimezone = DEFAULT_REPORTING_TIMEZONE;

/** Active company reporting timezone (IANA, e.g. America/New_York). */
export function getReportingTimezone(): string {
  return _reportingTimezone;
}

/** Sync module-level timezone after loading or updating company settings. */
export function setReportingTimezone(tz: string): void {
  _reportingTimezone = tz || DEFAULT_REPORTING_TIMEZONE;
}

/** @deprecated Use getReportingTimezone() — kept for gradual migration. */
export const APP_TIMEZONE = DEFAULT_REPORTING_TIMEZONE;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function tz(): string {
  return getReportingTimezone();
}

/** Short zone label for display (e.g. EST, EDT, CST). */
export function reportingTimezoneLabel(zone?: string): string {
  const z = zone ?? tz();
  try {
    return formatInTimeZone(new Date(), z, "zzz");
  } catch {
    return z;
  }
}

/** Shift a yyyy-MM-dd calendar day in the reporting timezone (DST-safe via noon anchor). */
export function addReportingCalendarDays(ymd: string, delta: number): string {
  const zone = tz();
  const noon = fromZonedTime(`${ymd}T12:00:00`, zone);
  return formatInTimeZone(
    new Date(noon.getTime() + delta * 86_400_000),
    zone,
    "yyyy-MM-dd",
  );
}

/** @deprecated Alias for addReportingCalendarDays */
export const addEasternCalendarDays = addReportingCalendarDays;

export function startOfReportingDay(date: Date = new Date()): Date {
  const zone = tz();
  const d = formatInTimeZone(date, zone, "yyyy-MM-dd");
  return fromZonedTime(`${d}T00:00:00.000`, zone);
}

/** @deprecated Alias */
export const startOfDayEastern = startOfReportingDay;

export function endOfReportingDay(date: Date = new Date()): Date {
  const zone = tz();
  const d = formatInTimeZone(date, zone, "yyyy-MM-dd");
  return fromZonedTime(`${d}T23:59:59.999`, zone);
}

/** @deprecated Alias */
export const endOfDayEastern = endOfReportingDay;

export function startOfReportingWeek(date: Date = new Date()): Date {
  const zone = tz();
  const isoDow = parseInt(formatInTimeZone(date, zone, "i"), 10);
  let ymd = formatInTimeZone(date, zone, "yyyy-MM-dd");
  for (let i = 1; i < isoDow; i++) {
    ymd = addReportingCalendarDays(ymd, -1);
  }
  return fromZonedTime(`${ymd}T00:00:00.000`, zone);
}

/** @deprecated Alias */
export const startOfWeekEastern = startOfReportingWeek;

export function startOfReportingMonth(date: Date = new Date()): Date {
  const zone = tz();
  const ym = formatInTimeZone(date, zone, "yyyy-MM");
  return fromZonedTime(`${ym}-01T00:00:00.000`, zone);
}

/** @deprecated Alias */
export const startOfMonthEastern = startOfReportingMonth;

export function startOfReportingYear(date: Date = new Date()): Date {
  const zone = tz();
  const y = formatInTimeZone(date, zone, "yyyy");
  return fromZonedTime(`${y}-01-01T00:00:00.000`, zone);
}

/** @deprecated Alias */
export const startOfYearEastern = startOfReportingYear;

export function subReportingDays(days: number, from: Date = new Date()): Date {
  const zone = tz();
  const ymd = formatInTimeZone(from, zone, "yyyy-MM-dd");
  const startYmd = addReportingCalendarDays(ymd, -days);
  return fromZonedTime(`${startYmd}T00:00:00.000`, zone);
}

/** @deprecated Alias */
export const subDaysEastern = subReportingDays;

/** Interpret a calendar pick (local Date from date picker) as a reporting-day start. */
export function reportingStartFromCalendarDate(date: Date): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return fromZonedTime(`${y}-${pad2(m)}-${pad2(d)}T00:00:00.000`, tz());
}

/** @deprecated Alias */
export const easternStartFromCalendarDate = reportingStartFromCalendarDate;

/** Interpret a calendar pick as a reporting-day end. */
export function reportingEndFromCalendarDate(date: Date): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return fromZonedTime(`${y}-${pad2(m)}-${pad2(d)}T23:59:59.999`, tz());
}

/** @deprecated Alias */
export const easternEndFromCalendarDate = reportingEndFromCalendarDate;

/** Value for `<input type="datetime-local">` — reporting wall time. */
export function toDatetimeLocalValue(date: Date = new Date()): string {
  return formatInTimeZone(date, tz(), "yyyy-MM-dd'T'HH:mm");
}

/** Parse datetime-local input as reporting wall time → UTC instant for storage. */
export function fromDatetimeLocalValue(value: string): Date {
  return fromZonedTime(value, tz());
}

/** Format a stored sale timestamp for display in the reporting timezone. */
export function formatSaleDateTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const zone = tz();
  return `${formatInTimeZone(d, zone, "MMM d, yyyy h:mm a")} ${reportingTimezoneLabel(zone)}`;
}

/** Reporting calendar date key yyyy-MM-dd for bucketing. */
export function reportingDateKey(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return formatInTimeZone(d, tz(), "yyyy-MM-dd");
}

/** @deprecated Alias */
export const easternDateKey = reportingDateKey;

/** Reporting hour 0–23 for hourly trend buckets. */
export function reportingHour(value: Date | string): number {
  const d = typeof value === "string" ? new Date(value) : value;
  return parseInt(formatInTimeZone(d, tz(), "H"), 10);
}

/** @deprecated Alias */
export const easternHour = reportingHour;

/** yyyy-MM-dd strings for date-only DB columns aligned to reporting range bounds. */
export function reportingDateString(date: Date): string {
  return formatInTimeZone(date, tz(), "yyyy-MM-dd");
}

/** @deprecated Alias */
export const easternDateString = reportingDateString;
