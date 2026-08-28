/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { GovtSchemesTab } from "../components/tabs/GovtSchemesTab";
import { PrivacyProvider } from "../context/PrivacyContext";
import {
  calculateSSYProjection,
  calculateSCSSProjection,
  calculatePOMISProjection,
  calculateCompoundingScheme,
  SCHEME_RULES,
} from "../utils/govtSchemes";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("GovtSchemesTab — UI & Rendering", () => {
  it("renders the redesigned portfolio overview with hero stats and category pills", () => {
    const state = {
      govtSchemes: [
        {
          id: "ssy-1",
          schemeType: "SSY",
          schemeName: "Ananya Sukanya Account",
          memberName: "Ananya",
          currentBalance: 350000,
          interestRate: 8.2,
          contributionAmount: 150000,
          frequency: "annual",
          startDate: "2020-01-01",
          maturityDate: "2041-01-01",
          owner: "self",
        },
        {
          id: "scss-1",
          schemeType: "SCSS",
          schemeName: "Father SCSS",
          currentBalance: 1500000,
          interestRate: 8.2,
          owner: "father",
        },
        {
          id: "pmjjby-1",
          schemeType: "PMJJBY",
          schemeName: "Life Cover",
          coverageAmount: 200000,
          premium: 436,
          owner: "self",
        },
      ],
    };

    const html = renderToString(
      <PrivacyProvider>
        <GovtSchemesTab
          state={state}
          addItem={vi.fn()}
          removeItem={vi.fn()}
          updateItem={vi.fn()}
        />
      </PrivacyProvider>
    );

    // Verify Title & Overview Headers
    expect(html).toContain("Government Schemes Portfolio");
    expect(html).toContain("Total Sovereign Corpus");
    expect(html).toContain("Ananya Sukanya Account");
    expect(html).toContain("Father SCSS");
    expect(html).toContain("All Schemes");

    // Verify formatted values (Corpus: 3.5L + 15L = 18.5L)
    expect(html).toContain("18,50,000");

    // Verify category badges and pills
    expect(html).toContain("Girl Child");
    expect(html).toContain("Guaranteed Savings");
  });

  it("renders an intuitive empty state with guidance when no schemes exist", () => {
    const state = { govtSchemes: [] };
    const html = renderToString(
      <PrivacyProvider>
        <GovtSchemesTab
          state={state}
          addItem={vi.fn()}
          removeItem={vi.fn()}
          updateItem={vi.fn()}
        />
      </PrivacyProvider>
    );

    expect(html).toContain("No Government Schemes in Portfolio");
    expect(html).toContain("Track First Government Scheme");
  });
});

describe("Govt Schemes Calculator Utilities", () => {
  it("calculates SSY maturity accurately for 15y deposit and 21y maturity", () => {
    const res = calculateSSYProjection(150000, 8.2);
    expect(res.totalInvested).toBe(2250000); // 15 * 1.5L
    expect(res.maturityAmount).toBeGreaterThan(6000000); // ~65-70 Lakhs
    expect(res.totalInterest).toBe(res.maturityAmount - res.totalInvested);
  });

  it("calculates SCSS quarterly payout accurately", () => {
    const res = calculateSCSSProjection(1500000, 8.2);
    // 15,00,000 * 8.2% / 4 = 30,750 per quarter
    expect(res.quarterlyPayout).toBe(30750);
    expect(res.annualIncome).toBe(123000);
    expect(res.total5YearInterest).toBe(615000);
  });

  it("calculates POMIS monthly payout accurately", () => {
    const res = calculatePOMISProjection(900000, 7.4);
    // 9,00,000 * 7.4% / 12 = 5,550 per month
    expect(res.monthlyPayout).toBe(5550);
    expect(res.annualIncome).toBe(66600);
    expect(res.total5YearInterest).toBe(333000);
  });

  it("calculates NSC 5-year compounding return", () => {
    const res = calculateCompoundingScheme(500000, 7.7, 5);
    expect(res.depositAmount).toBe(500000);
    expect(res.maturityAmount).toBeCloseTo(724517, -2);
    expect(res.totalInterest).toBe(res.maturityAmount - 500000);
  });
});
