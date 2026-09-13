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
    expect(html).toContain("Loan Simulation Source");
    expect(html).toContain("Monthly EMI");
    expect(html).toContain("Total Interest Payable");
    expect(html).toContain("Total Loan Cost");
    expect(html).toContain("Payoff Timeline");
    expect(html).toContain("Outstanding Balance Trajectory");
    expect(html).toContain("Annual Principal vs Interest Split");
    expect(html).toContain("Amortization Ledger");
  });
});

describe("generateAmortization", () => {
  it("reports each row's emi as the actual cash paid that month, so the schedule's emi column sums to total principal + total interest even when a prepayment caps the final installment", () => {
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

    const totalPrincipal = last.totalPrincipal;
    const sumEmi = schedule.reduce((s, r) => s + r.emi, 0);
    expect(Math.abs(sumEmi - (totalPrincipal + totalInterest))).toBeLessThanOrEqual(
      schedule.length
    );
  });

  it("returns zero interest, zero schedule, and totalMonths 0 for a non-positive tenure or non-positive principal", () => {
    const resultTenure = generateAmortization(100000, 8, 0);
    expect(resultTenure).toEqual({ emi: 0, schedule: [], totalInterest: 0, totalMonths: 0 });

    const resultPrincipal = generateAmortization(0, 8, 120);
    expect(resultPrincipal).toEqual({ emi: 0, schedule: [], totalInterest: 0, totalMonths: 0 });
  });

  it("calculates crossover month and halfway month correctly", () => {
    const result = generateAmortization(5000000, 8.5, 240);
    expect(result.crossoverMonth).toBeDefined();
    expect(result.halfwayMonth).toBeDefined();
    expect(result.crossoverMonth).toBeGreaterThan(0);
    expect(result.halfwayMonth).toBeGreaterThan(result.crossoverMonth || 0);
  });

  it("handles recurring annual bonus prepayment properly", () => {
    const standard = generateAmortization(2500000, 8.5, 240);
    const withAnnualBonus = generateAmortization(2500000, 8.5, 240, 0, null, 100000);

    expect(withAnnualBonus.totalMonths).toBeLessThan(standard.totalMonths);
    expect(withAnnualBonus.totalInterest).toBeLessThan(standard.totalInterest);
  });
});
