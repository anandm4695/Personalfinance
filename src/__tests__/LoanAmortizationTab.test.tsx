/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { LoanAmortizationTab, generateAmortization } from "../components/tabs/LoanAmortizationTab";

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

describe("generateAmortization", () => {
  it("reports each row's emi as the actual cash paid that month, so the schedule's emi column sums to total principal + total interest even when a prepayment caps the final installment", () => {
    // Bug: the final (capped) installment's displayed "emi" was computed as
    // Math.round(emi + (balance > 0 ? extraMonthly : 0)) — since balance hits exactly 0
    // on the closing month, this dropped the extra prepayment from the last row's emi
    // and didn't reflect the true (smaller) final payment, i.e. interest + principal.
    const { schedule, totalInterest } = generateAmortization(
      50000,
      10,
      24,
      5000 // aggressive prepayment forces early payoff with a capped final installment
    );

    expect(schedule.length).toBeGreaterThan(0);
    const last = schedule[schedule.length - 1];
    expect(last.balance).toBe(0);
    // Actual cash paid that month must equal interest + principal for that row.
    expect(last.emi).toBe(last.principal + last.interest);

    // Sum of displayed monthly emi values should reconcile with total principal +
    // total interest (within per-row rounding tolerance), which fails under the old
    // formula whenever a prepayment caps the final installment.
    const totalPrincipal = last.totalPrincipal;
    const sumEmi = schedule.reduce((s, r) => s + r.emi, 0);
    expect(Math.abs(sumEmi - (totalPrincipal + totalInterest))).toBeLessThanOrEqual(
      schedule.length
    );
  });

  it("returns zero interest, zero schedule, and totalMonths 0 for a non-positive tenure", () => {
    const result = generateAmortization(100000, 8, 0);
    expect(result).toEqual({ emi: 0, schedule: [], totalInterest: 0, totalMonths: 0 });
  });
});
