/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SmartAlertsTab } from "../components/tabs/SmartAlertsTab";

describe("SmartAlertsTab UI & Intelligence", () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "Asia/Kolkata"; // UTC+5:30
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = originalTZ;
  });

  it("counts a goal deadline exactly tomorrow as '1 days' away, not '2 days', when checked in the early morning", () => {
    vi.setSystemTime(new Date(2026, 6, 13, 2, 0, 0)); // 13 Jul 2026, 02:00 local (IST)

    const state = {
      goals: [
        {
          id: "g1",
          name: "Vacation Fund",
          targetDate: "2026-07-14", // exactly tomorrow
          targetAmount: 100000,
          currentAmount: 0,
        },
      ],
    };

    const html = renderToString(
      <SmartAlertsTab
        state={state}
        metrics={{ emergencyFund: { liquidAssets: 0, monthlyExpense: 0, monthsCovered: 0 } }}
      />
    );

    expect(html).toContain("deadline in 1 days");
    expect(html).not.toContain("deadline in 2 days");
  });

  it("calculates Health Index and displays AI Diagnostic Briefing", () => {
    vi.setSystemTime(new Date(2026, 6, 13, 10, 0, 0));

    const state = {
      transactions: [],
      goals: [],
      subscriptions: [],
      bonds: [],
    };

    const html = renderToString(
      <SmartAlertsTab
        state={state}
        metrics={{ monthExpense: 0 }}
      />
    );

    expect(html).toContain("Health Index");
    expect(html).toContain("100");
    expect(html).toContain("Optimal Health");
    expect(html).toContain("AI Diagnostic Briefing");
  });

  it("flags low emergency runway when liquid cash is below safety threshold", () => {
    vi.setSystemTime(new Date(2026, 6, 13, 10, 0, 0));

    const state = {
      bankAccounts: [{ id: "b1", balance: 25000 }],
      transactions: [],
    };

    const html = renderToString(
      <SmartAlertsTab
        state={state}
        metrics={{ monthExpense: 50000 }}
      />
    );

    expect(html).toContain("Low Emergency Runway");
    expect(html).toContain("0.5 Months");
    expect(html).toContain("Take Action");
  });

  it("detects potential duplicate charges on the same day", () => {
    vi.setSystemTime(new Date(2026, 6, 13, 10, 0, 0));

    const state = {
      transactions: [
        { id: "t1", type: "debit", date: "2026-07-10", amount: 2500, category: "Dining" },
        { id: "t2", type: "debit", date: "2026-07-10", amount: 2500, category: "Dining" },
      ],
    };

    const html = renderToString(
      <SmartAlertsTab
        state={state}
        metrics={{ monthExpense: 10000 }}
      />
    );

    expect(html).toContain("Potential duplicate charge");
    expect(html).toContain("2x ₹2500");
  });

  it("flags high credit card utilization", () => {
    vi.setSystemTime(new Date(2026, 6, 13, 10, 0, 0));

    const state = {
      creditCards: [
        { id: "c1", issuer: "HDFC Regalia", outstanding: 180000, limit: 200000 },
      ],
    };

    const html = renderToString(
      <SmartAlertsTab
        state={state}
        metrics={{ monthExpense: 30000 }}
      />
    );

    expect(html).toContain("High credit utilization on HDFC Regalia");
    expect(html).toContain("90%");
  });
});
