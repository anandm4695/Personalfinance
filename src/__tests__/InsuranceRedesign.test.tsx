import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { InsuranceSummaryTab } from "../components/tabs/InsuranceSummaryTab";
import { addYearsClamped, getNextPremiumDueDate } from "../components/insurance/InsuranceTypes";

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

describe("Insurance Redesign & Calculations", () => {
  const mockState = {
    lic: [
      {
        id: "lic-1",
        planName: "LIC Jeevan Anand",
        sumAssured: 1000000,
        annualPremium: 45000,
        policyTerm: 20,
        commencementDate: "2018-05-15",
        maturityDate: "2038-05-15",
        owner: "self",
        transactions: [
          { id: "t1", date: "2018-05-15", amount: 45000 },
          { id: "t2", date: "2019-05-15", amount: 45000 },
        ],
      },
    ],
    termPlans: [
      {
        id: "term-1",
        planName: "HDFC Click 2 Protect 3D",
        insurer: "HDFC Life",
        coverAmount: 15000000,
        annualPremium: 18000,
        term: 35,
        startDate: "2020-02-29",
        expiryDate: "2055-02-28",
        owner: "self",
        transactions: [],
      },
    ],
    investmentPlans: [
      {
        id: "inv-1",
        planName: "Kotak Guaranteed Benefits Plan",
        insurer: "Kotak",
        owner: "spouse",
        annualPremium: 100000,
        expectedMaturityAmount: 1850000,
        policyTerm: 15,
        premiumPayingTerm: 10,
        commencementDate: "2021-12-13",
        maturityDate: "2036-12-13",
        transactions: [],
      },
    ],
  };

  const mockMetrics = {
    annualIncome: 1500000,
  };

  it("should render all sub-tabs, KPI stat cards, and policy cards cleanly", () => {
    const html = renderToString(
      <InsuranceSummaryTab
        state={mockState}
        metrics={mockMetrics}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
        showToast={vi.fn()}
      />
    );

    expect(html).toContain("Insurance Command Center");
    expect(html).toContain("LIC Jeevan Anand");
    expect(html).toContain("HDFC Click 2 Protect 3D");
    expect(html).toContain("Kotak Guaranteed Benefits Plan");
    expect(html).toContain("Total Life Cover");
    expect(html).toContain("Annual Premium");
    expect(html).toContain("Cover Adequacy");
    expect(html).toContain("Export CSV");
  });

  it("should safely clamp Feb 29 commencement leap years when calculating maturity", () => {
    const leapDate = new Date("2020-02-29T00:00:00");
    const matDate1 = addYearsClamped(leapDate, 1);
    expect(matDate1.getFullYear()).toBe(2021);
    expect(matDate1.getMonth()).toBe(1); // February (0-indexed)
    expect(matDate1.getDate()).toBe(28); // Non-leap year clamped to 28th

    const matDate4 = addYearsClamped(leapDate, 4);
    expect(matDate4.getFullYear()).toBe(2024);
    expect(matDate4.getMonth()).toBe(1);
    expect(matDate4.getDate()).toBe(29); // Leap year retains 29th
  });

  it("should compute next premium due dates properly", () => {
    const dueInfo = getNextPremiumDueDate("2021-08-15", "2041-08-15");
    expect(dueInfo).not.toBeNull();
    expect(dueInfo?.dateStr).toBeDefined();
    expect(typeof dueInfo?.days).toBe("number");
  });
});
