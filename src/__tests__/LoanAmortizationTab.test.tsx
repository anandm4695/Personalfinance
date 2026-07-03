/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { LoanAmortizationTab } from "../components/tabs/LoanAmortizationTab";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("LoanAmortizationTab Premium UI Statically", () => {
  const mockState = {
    loansTaken: [
      {
        id: "l1",
        lender: "SBI",
        principal: 2500000,
        outstanding: 2400000,
        rate: 8.4,
        tenureMonths: 240,
        emi: 22000,
        monthsRemaining: 230,
        type: "Home Loan",
      },
    ],
  };

  it("should render monthly EMI, total interest, balance charts, and full schedule toggles", () => {
    const html = renderToString(<LoanAmortizationTab state={mockState} />);

    // Verify key elements and classes render correctly
    expect(html).toContain("Loan Amortization");
    expect(html).toContain("Loan Source");
    expect(html).toContain("Monthly EMI");
    expect(html).toContain("Total Interest");
    expect(html).toContain("Total Payment");
    expect(html).toContain("Loan Closes In");
    expect(html).toContain("Balance Over Time");
    expect(html).toContain("Yearly Principal vs Interest");
    expect(html).toContain("Full Amortization Schedule");
  });
});
