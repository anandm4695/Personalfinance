import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { InsuranceSummaryTab } from "../components/tabs/InsuranceSummaryTab";

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

describe("InsuranceSummaryTab Card Layout Statically", () => {
  const mockState = {
    lic: [],
    termPlans: [],
    investmentPlans: [
      {
        id: "1",
        planName: "Kotak Guaranteed Benefits Plan",
        insurer: "Kotak",
        owner: "self",
        annualPremium: 100000,
        expectedMaturityAmount: 1679320,
        policyTerm: 15,
        premiumPayingTerm: 10,
        commencementDate: "2021-12-13",
        maturityDate: "2036-12-13",
        transactions: [],
      },
    ],
  };

  const mockMetrics = {
    annualIncome: 1200000,
  };

  it("should output the rendered HTML string for verification", () => {
    const html = renderToString(
      <InsuranceSummaryTab
        state={mockState}
        metrics={mockMetrics}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
      />
    );

    // Look for the Kotak card container in the rendered HTML string
    console.log("--- RENDERED HTML STRING START ---");
    console.log(html);
    console.log("--- RENDERED HTML STRING END ---");

    expect(html).toContain("Kotak Guaranteed Benefits Plan");
  });
});
