import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  BondsSection,
  isBondMatured,
  bondAnnualCoupon,
  bondCurrentValue,
  maturityCountdown,
} from "../components/investments/BondsSection";

describe("BondsSection Comprehensive Suite", () => {
  const mockBonds = [
    {
      id: "b1",
      name: "NHAI 54EC Capital Gains Bond",
      issuer: "NHAI",
      isin: "INE906J07FD0",
      securityNature: "54EC Capital Gains Bond",
      creditRating: "CRISIL AAA",
      coupon: 5.25,
      ytmRate: 5.25,
      numberOfUnits: 10,
      faceValuePerUnit: 10000,
      totalPrincipalAmount: 100000,
      totalInvestmentAmount: 100000,
      orderDate: "2023-01-01",
      maturityDate: "2028-01-01", // Active
      interestPaymentDate: "Annually",
      principalRepayment: "At Maturity",
      taxCategory: "54ec",
    },
    {
      id: "b2",
      name: "IIFL Samasta Secured NCD 2023",
      issuer: "IIFL",
      isin: "INE413U07335",
      securityNature: "Senior Secured Bond",
      creditRating: "CRISIL AA",
      coupon: 10.5,
      ytmRate: 10.5,
      numberOfUnits: 50,
      faceValuePerUnit: 1000,
      totalPrincipalAmount: 50000,
      totalInvestmentAmount: 50000,
      orderDate: "2021-01-01",
      maturityDate: "2023-01-01", // Matured
      interestPaymentDate: "Monthly",
      principalRepayment: "At Maturity",
      taxCategory: "taxable_ncd",
    },
    {
      id: "b3",
      name: "7.18% GS 2033 Benchmark G-Sec",
      issuer: "Government of India",
      isin: "IN0020230085",
      securityNature: "Central Govt Security",
      creditRating: "Sovereign (GOI)",
      coupon: 7.18,
      ytmRate: 7.12,
      numberOfUnits: 500,
      faceValuePerUnit: 100,
      totalPrincipalAmount: 50000,
      totalInvestmentAmount: 50000,
      orderDate: "2023-06-01",
      maturityDate: "2033-06-01", // Active
      interestPaymentDate: "Semi-Annually",
      principalRepayment: "At Maturity",
      taxCategory: "gsec",
    },
  ];

  it("evaluates maturity status and accounting calculations accurately", () => {
    expect(isBondMatured(mockBonds[0])).toBe(false);
    expect(isBondMatured(mockBonds[1])).toBe(true);
    expect(isBondMatured(mockBonds[2])).toBe(false);

    // Active annual coupon
    const nHindustanCoupon = bondAnnualCoupon(mockBonds[0]);
    expect(nHindustanCoupon).toBe(5250);

    const gSecCoupon = bondAnnualCoupon(mockBonds[2]);
    expect(gSecCoupon).toBe(3590);

    // Matured bond valuation includes full term realized coupon
    const maturedBond = mockBonds[1];
    const maturedBondVal = bondCurrentValue(maturedBond);
    expect(maturedBondVal).toBe(50000 + (50000 * 0.105 * 2));
  });

  it("renders BondsSection with KPI cards and multi-view navigation", () => {
    const html = renderToString(
      <BondsSection
        items={mockBonds}
        removeItem={() => {}}
        updateItem={() => {}}
        onAdd={() => {}}
      />
    );

    // KPI Dashboard checks
    expect(html).toContain("Total Invested");
    expect(html).toContain("Annual Coupon");
    expect(html).toContain("Weighted Avg Coupon");
    expect(html).toContain("1 Matured");

    // View mode navigation tabs
    expect(html).toContain("Cards");
    expect(html).toContain("Ledger");
    expect(html).toContain("Bond Ladder");
    expect(html).toContain("Coupon Calendar");
    expect(html).toContain("Analytics");
    expect(html).toContain("YTM &amp; Tax");

    // Filter pills
    expect(html).toContain("All (3)");
    expect(html).toContain("Active (2)");
    expect(html).toContain("Matured (1)");
    expect(html).toContain("Tax-Free &amp; 54EC");
    expect(html).toContain("Govt / Sovereign");
    expect(html).toContain("Corporate NCDs");

    // Bond details rendered
    expect(html).toContain("NHAI 54EC Capital Gains Bond");
    expect(html).toContain("INE906J07FD0");
    expect(html).toContain("CRISIL AAA");
    expect(html).toContain("IIFL Samasta Secured NCD 2023");
    expect(html).toContain("7.18% GS 2033 Benchmark G-Sec");
  });

  it("handles maturity countdown accurately for different remaining durations", () => {
    const past = maturityCountdown("2020-01-01");
    expect(past?.matured).toBe(true);
    expect(past?.text).toBe("Matured");

    const future = maturityCountdown("2030-01-01");
    expect(future?.matured).toBe(false);
    expect(future?.text).toBeDefined();
  });
});
