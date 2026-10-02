import { diffDays, RELATIONSHIP_START } from "../data/canonicalTimeline";

export function localDateFromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function todayISO(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

export type Breakdown = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
  totalHours: number;
  totalSeconds: number;
  future: boolean;
};

/** Calendar-aware breakdown between two dates. */
export function breakdown(from: Date, to: Date): Breakdown {
  let a = from;
  let b = to;
  const future = a > b;
  if (future) [a, b] = [b, a];

  let years = b.getFullYear() - a.getFullYear();
  let months = b.getMonth() - a.getMonth();
  let days = b.getDate() - a.getDate();
  let hours = b.getHours() - a.getHours();
  let minutes = b.getMinutes() - a.getMinutes();
  let seconds = b.getSeconds() - a.getSeconds();

  if (seconds < 0) { seconds += 60; minutes--; }
  if (minutes < 0) { minutes += 60; hours--; }
  if (hours < 0) { hours += 24; days--; }
  if (days < 0) {
    const prevMonth = new Date(b.getFullYear(), b.getMonth(), 0).getDate();
    days += prevMonth;
    months--;
  }
  if (months < 0) { months += 12; years--; }

  const ms = b.getTime() - a.getTime();
  return {
    years, months, days, hours, minutes, seconds,
    totalDays: Math.floor(ms / 86_400_000),
    totalHours: Math.floor(ms / 3_600_000),
    totalSeconds: Math.floor(ms / 1000),
    future,
  };
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return localDateFromISO(iso).toLocaleDateString("en-GB", opts);
}

export function weekday(iso: string) {
  return localDateFromISO(iso).toLocaleDateString("en-GB", { weekday: "long" });
}

/** Day number in the relationship (day 1 = start date). */
export function dayOfUs(iso: string) {
  return diffDays(RELATIONSHIP_START, iso) + 1;
}

/** Next occurrence of a month/day (from ISO) at or after today. */
export function nextAnniversary(iso: string, now = new Date()): Date {
  const [, m, d] = iso.split("-").map(Number);
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    next = new Date(now.getFullYear() + 1, m - 1, d);
  }
  return next;
}

export function nextMonthiversary(iso: string, now = new Date()): Date {
  const [, , d] = iso.split("-").map(Number);
  let next = new Date(now.getFullYear(), now.getMonth(), d);
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next = new Date(now.getFullYear(), now.getMonth() + 1, d);
  }
  return next;
}
