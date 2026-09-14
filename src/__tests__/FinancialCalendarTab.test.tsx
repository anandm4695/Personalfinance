/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { FinancialCalendarTab } from "../components/tabs/FinancialCalendarTab";

describe("FinancialCalendarTab", () => {
  it("shows a credit card annual fee due exactly today as 'Today', not pushed a year forward", () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = "Asia/Kolkata";
    try {
      const now = new Date();
      const feeMonth = now.getMonth() + 1;
      const feeDay = now.getDate();

      const state = {
        creditCards: [
          {
            id: "cc1",
            issuer: "Test Bank",
            annualFee: 599,
            feeMonth,
            feeDay,
          },
        ],
      };

      const html = renderToString(<FinancialCalendarTab state={state} metrics={{}} />);

      expect(html).not.toContain("No Upcoming Events");
      expect(html).toContain("Annual Fee");
      expect(html).toContain("Today");
    } finally {
      process.env.TZ = originalTZ;
    }
  });

  it("renders empty state gracefully when no events exist in state", () => {
    const state = {
      fixedDeposits: [],
      recurringDeposits: [],
      bonds: [],
      lic: [],
      termPlans: [],
      healthInsurance: [],
      creditCards: [],
      subscriptions: [],
      vehicles: [],
    };
    const html = renderToString(<FinancialCalendarTab state={state} metrics={{}} />);
    expect(html).toContain("No Upcoming Financial Events");
  });

  it("renders multiple financial event types (FD, Insurance, Subscriptions) with Inflows & Outflows stats", () => {
    const now = new Date();
    const futureDate = new Date(now.getFullYear(), now.getMonth() + 2, 15).toISOString().slice(0, 10);
    const state = {
      fixedDeposits: [
        {
          id: "fd1",
          bank: "HDFC Bank FD",
          principal: 200000,
          rate: 7.5,
          maturityDate: futureDate,
        },
      ],
      subscriptions: [
        {
          id: "sub1",
          name: "Netflix Premium",
          amount: 649,
          cycle: "quarterly",
          renewalDate: futureDate,
        },
      ],
    };

    const html = renderToString(<FinancialCalendarTab state={state} metrics={{}} />);
    expect(html).toContain("HDFC Bank FD");
    expect(html).toContain("Netflix Premium");
    expect(html).toContain("Expected Inflows");
    expect(html).toContain("Expected Outflows");
    expect(html).toContain("Net Cash Trajectory");
    expect(html).toContain("Agenda Timeline");
    expect(html).toContain("Calendar Grid");
    expect(html).toContain("Cashflow Radar");
  });
});
