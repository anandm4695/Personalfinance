/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { FinancialCalendarTab } from "../components/tabs/FinancialCalendarTab";

describe("FinancialCalendarTab date bucketing", () => {
  it("shows a credit card annual fee due exactly today as 'Today', not pushed a year forward", () => {
    // Bug: the fee-due-date comparison built `now` from a plain "YYYY-MM-DD" string (parsed as
    // UTC midnight) but `feeDate` from the multi-arg Date constructor (LOCAL midnight). In a
    // positive-UTC-offset timezone (IST, +5:30) UTC midnight is ~5:30am local — LATER than
    // feeDate's local 00:00 — so a fee due exactly today looked "already past" and got bumped a
    // full year ahead, silently vanishing from the (default 6-month) forecast window.
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
});
