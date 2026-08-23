import { THEME } from "./constants";

export function dueStatus(
  dueDayOfMonth: number,
  lastPaidDate?: string | null
): { label: string; color: string; daysLeft: number; paid: boolean } {
  const now = new Date();
  // Clamp to the last day of the target month so a dueDay of 29/30/31 doesn't
  // overflow into the following month (e.g. Feb 31 -> Mar 3) when the target
  // month is shorter (Feb, or any 30-day month).
  const clampedDue = (year: number, month: number) =>
    new Date(year, month, Math.min(dueDayOfMonth, new Date(year, month + 1, 0).getDate()));
  const thisMonthDue = clampedDue(now.getFullYear(), now.getMonth());
  // Compare dates only (not time-of-day) so that when today IS the due date, it isn't
  // treated as already-passed (midnight due date vs later "now" timestamp) and bumped
  // to next month, which previously showed "~30 days" instead of "Due Today".
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = thisMonthDue;
  if (target.getTime() < todayMidnight.getTime()) {
    target = clampedDue(now.getFullYear(), now.getMonth() + 1);
  }
  // If a payment was logged after the due date that opened the current billing
  // cycle (one clamped due-day occurrence before `target`), this bill is already
  // settled for this cycle — surface "Paid" instead of nagging with a due-in-Nd
  // countdown all the way until next month's due date rolls around. Without this,
  // a bill paid on the 1st still showed "Due in 12d" (etc.) and kept appearing in
  // the urgent "Due This Week" list/banner right up until the following cycle.
  if (lastPaidDate) {
    const cycleStart = clampedDue(target.getFullYear(), target.getMonth() - 1);
    const paidAt = new Date(lastPaidDate + "T00:00:00");
    if (!isNaN(paidAt.getTime()) && paidAt.getTime() > cycleStart.getTime()) {
      return { label: "Paid", color: THEME.success, daysLeft: Infinity, paid: true };
    }
  }
  const days = Math.ceil((target.getTime() - todayMidnight.getTime()) / 86400000);
  if (days <= 0) return { label: "Due Today", color: THEME.danger, daysLeft: 0, paid: false };
  if (days <= 3) return { label: `Due in ${days}d`, color: THEME.danger, daysLeft: days, paid: false };
  if (days <= 7) return { label: `Due in ${days}d`, color: THEME.warning, daysLeft: days, paid: false };
  return { label: `Due in ${days}d`, color: THEME.success, daysLeft: days, paid: false };
}
