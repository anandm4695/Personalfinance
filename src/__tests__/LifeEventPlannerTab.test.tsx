/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { LifeEventPlannerTab } from "../components/tabs/LifeEventPlannerTab";
import { PrivacyProvider } from "../context/PrivacyContext";

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  CartesianGrid: () => <div />,
  Legend: () => <div />,
}));

const noop = () => {};

describe("LifeEventPlannerTab calculations", () => {
  it("does not blow up to Infinity/NaN for the Monthly SIP Needed when an event is under a month away", () => {
    // Bug: monthlySIP = (gap * r) / ((1+r)^n - 1) used `yearsAway > 0` as its guard, but an
    // event 10 days away has yearsAway > 0 while n = Math.round(yearsAway * 12) rounds down to
    // 0 months — dividing by (1+r)^0 - 1 === 0 produced Infinity (or NaN when gap is 0 too).
    const now = new Date();
    const targetDate = new Date(now.getTime() + 10 * 86400000).toISOString().slice(0, 10);

    const state = {
      lifeEvents: [
        {
          id: "e1",
          name: "Imminent Expense",
          type: "other",
          targetDate,
          estimatedCost: 100000,
          currentSaved: 0,
          notes: "",
          priority: "high",
        },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <LifeEventPlannerTab
          state={state}
          metrics={{}}
          addItem={noop}
          removeItem={noop}
          updateItem={noop}
        />
      </PrivacyProvider>
    );

    expect(html).toContain("Monthly SIP Needed");
    // fmtINRFull renders JS Infinity/NaN via toLocaleString, which prints "∞" / "NaN" — assert
    // against both the raw values and that glyph so the regression is actually caught.
    expect(html).not.toContain("∞");
    expect(html).not.toContain("Infinity");
    expect(html).not.toContain("NaN");
    // The gap is due almost immediately, so the SIP figure should equal the (near) full gap.
    expect(html).toContain("₹1,00,1");
  });
});
