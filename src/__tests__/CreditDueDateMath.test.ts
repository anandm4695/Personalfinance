/* eslint-disable */
// Focused calculation tests for the credit-card annual-fee due-date math
// (CreditTab.tsx) and the utility-bill due-date math (BillPaymentTab.tsx).
// Both compute "next occurrence of day-of-month N" and must clamp N to the
// last day of a shorter month (Feb, or any 30-day month) instead of letting
// the native Date constructor overflow into the following month.
import { describe, it, expect, vi, afterEach } from "vitest";
import { getNextFeeDate } from "../components/tabs/CreditTab";
import { dueStatus } from "../components/tabs/BillPaymentTab";

afterEach(() => {
  vi.useRealTimers();
});

describe("getNextFeeDate (CreditTab annual fee countdown)", () => {
  it("returns null when there's no annual fee or no feeMonth set", () => {
    expect(getNextFeeDate({})).toBeNull();
    expect(getNextFeeDate({ annualFee: "0", feeMonth: "2" })).toBeNull();
    expect(getNextFeeDate({ annualFee: "500" })).toBeNull();
  });

  it("clamps feeDay 31 in February to Feb 28 in a non-leap year instead of rolling into March", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 1, 10)); // Feb 10, 2025 (not a leap year)
    const result = getNextFeeDate({ annualFee: "500", feeMonth: "2", feeDay: "31" });
    expect(result).not.toBeNull();
    expect(result!.dateStr).toBe("28 Feb");
  });

  it("clamps feeDay 31 in February to Feb 29 in a leap year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 1, 10)); // Feb 10, 2024 (leap year)
    const result = getNextFeeDate({ annualFee: "500", feeMonth: "2", feeDay: "31" });
    expect(result!.dateStr).toBe("29 Feb");
  });

  it("computes a normal (non-overflowing) fee date correctly and rolls to next year once passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 20)); // Jun 20, 2025
    // Fee day already passed this year (March 15) -> should roll to March 15, 2026
    const result = getNextFeeDate({ annualFee: "500", feeMonth: "3", feeDay: "15" });
    expect(result!.dateStr).toBe("15 Mar");
    expect(result!.daysLeft).toBeGreaterThan(250); // ~9 months out
  });
});

describe("dueStatus (BillPaymentTab due-day countdown)", () => {
  it("clamps dueDay 31 to Feb 28 in a non-leap year instead of rolling into March", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 1, 10)); // Feb 10, 2025
    const result = dueStatus(31);
    // Feb 10 -> Feb 28 is 18 days away, NOT ~21 days (which Mar 3 would be)
    expect(result.daysLeft).toBe(18);
  });

  it("clamps dueDay 31 to Apr 30 in a 30-day month instead of rolling into May", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 3, 5)); // Apr 5, 2025
    const result = dueStatus(31);
    expect(result.daysLeft).toBe(25); // Apr 5 -> Apr 30
  });

  it("shows due today (not next month) when today IS the clamped due date, regardless of time of day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 1, 28, 12)); // Feb 28, 2025, midday
    const result = dueStatus(31);
    // dueDay 31 clamps to Feb 28 in a non-leap Feb, and today IS Feb 28 — comparing
    // dates only (not time-of-day) this must read as due today (0 days left), not
    // rolled to Mar 31. Comparing the midnight due-date against a midday "now"
    // timestamp used to always look "already passed" on the actual due date, which
    // showed "~30 days" instead of "Due Today".
    expect(result.daysLeft).toBe(0);
    expect(result.label).toBe("Due Today");
  });

  it("rolls over into next month once the (clamped) due day has actually passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 1)); // Mar 1, 2025 — the day after the clamped Feb 28 due date
    const result = dueStatus(31);
    // Next occurrence is Mar 31, 2025 (not clamped, March has 31 days)
    expect(result.daysLeft).toBe(30);
  });
});
