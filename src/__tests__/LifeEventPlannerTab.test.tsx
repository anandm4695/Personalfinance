/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import {
  LifeEventPlannerTab,
  getGlidePathAllocation,
  calculateStepUpSIP,
  calculateLumpsumNeeded,
  INDIAN_PRESETS,
  EVENT_TYPES,
} from "../components/tabs/LifeEventPlannerTab";
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
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
  Cell: () => <div />,
  Line: () => <div />,
  ComposedChart: ({ children }: any) => <div>{children}</div>,
}));

const noop = () => {};

describe("LifeEventPlannerTab calculations and financial engineering", () => {
  it("does not blow up to Infinity/NaN for the Monthly SIP Needed when an event is under a month away", () => {
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
          metrics={{ monthIncome: 150000, monthExpense: 80000 }}
          addItem={noop}
          removeItem={noop}
          updateItem={noop}
        />
      </PrivacyProvider>
    );

    expect(html).toContain("Monthly SIP Needed");
    expect(html).not.toContain("∞");
    expect(html).not.toContain("Infinity");
    expect(html).not.toContain("NaN");
    expect(html).toContain("₹1,00,1");
  });

  it("calculates Step-Up SIP and Lumpsum needed correctly", () => {
    const gap = 1200000; // 12 Lakhs
    const nMonths = 60; // 5 years
    const returnRate = 12; // 12% p.a.

    const stepUpSIP = calculateStepUpSIP(gap, nMonths, returnRate, 10);
    const lumpsum = calculateLumpsumNeeded(gap, nMonths, returnRate);

    // Initial step-up SIP should be positive and less than gap / 60 because of compounding & step-up
    expect(stepUpSIP).toBeGreaterThan(0);
    expect(stepUpSIP).toBeLessThan(gap / nMonths);

    // Lumpsum should be discounted future value
    expect(lumpsum).toBeGreaterThan(0);
    expect(lumpsum).toBeLessThan(gap);
    expect(Math.round(lumpsum)).toBe(660540);
  });

  it("provides correct de-risking glide-path allocation based on horizon", () => {
    // Immediate (< 0 months)
    const allocImmediate = getGlidePathAllocation(0);
    expect(allocImmediate.equity).toBe(0);
    expect(allocImmediate.debt).toBe(100);

    // Ultra short term (6 months)
    const allocShort = getGlidePathAllocation(6);
    expect(allocShort.equity).toBe(0);
    expect(allocShort.debt).toBe(100);

    // Medium term (24 months)
    const allocMedium = getGlidePathAllocation(24);
    expect(allocMedium.equity).toBe(20);
    expect(allocMedium.debt).toBe(70);

    // Balanced (48 months)
    const allocBalanced = getGlidePathAllocation(48);
    expect(allocBalanced.equity).toBe(50);
    expect(allocBalanced.debt).toBe(40);

    // Long term (84 months)
    const allocLong = getGlidePathAllocation(84);
    expect(allocLong.equity).toBe(75);
    expect(allocLong.debt).toBe(15);
  });

  it("renders empty state with Indian starter templates when no events exist", () => {
    const state = { lifeEvents: [] };

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

    expect(html).toContain("No Life Events Scheduled Yet");
    expect(html).toContain("Popular Indian Milestone Starter Templates");
    expect(html).toContain("Undergraduate Degree (India)");
    expect(html).toContain("Master&#x27;s / MBA Abroad (US/EU)");
  });

  it("renders multi-view navigation tabs and executive ribbon when events exist", () => {
    const now = new Date();
    const targetDate1 = new Date(now.getTime() + 730 * 86400000).toISOString().slice(0, 10); // 2 yrs
    const targetDate2 = new Date(now.getTime() + 1825 * 86400000).toISOString().slice(0, 10); // 5 yrs

    const state = {
      lifeEvents: [
        {
          id: "ev1",
          name: "Son's Higher Education",
          type: "education",
          targetDate: targetDate1,
          estimatedCost: 2000000,
          currentSaved: 500000,
          notes: "Engineering entrance coaching & tuition",
          priority: "high",
          owner: "self",
          inflationRate: 10,
        },
        {
          id: "ev2",
          name: "Villa Down Payment",
          type: "home",
          targetDate: targetDate2,
          estimatedCost: 4000000,
          currentSaved: 1000000,
          notes: "20% down payment",
          priority: "high",
          owner: "self",
          inflationRate: 7,
        },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <LifeEventPlannerTab
          state={state}
          metrics={{ monthIncome: 250000, monthExpense: 100000 }}
          addItem={noop}
          removeItem={noop}
          updateItem={noop}
        />
      </PrivacyProvider>
    );

    // Check Executive KPI Ribbon
    expect(html).toContain("Total Future Outflow");
    expect(html).toContain("Dedicated Capital");
    expect(html).toContain("Net Capital Gap");
    expect(html).toContain("Required Monthly SIP");

    // Check View Tabs
    expect(html).toContain("Milestone Journey");
    expect(html).toContain("Studio Grid");
    expect(html).toContain("Peak Outflow &amp; Collision");
    expect(html).toContain("Stress Simulator");
    expect(html).toContain("Data Matrix");

    // Check Event Content
    expect(html).toContain("Son&#x27;s Higher Education");
    expect(html).toContain("Villa Down Payment");
    expect(html).toContain("Recommended De-Risking Strategy");
  });
});
