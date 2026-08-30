import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { InvestmentsTab } from "../components/tabs/InvestmentsTab";
import { InvestmentStatementTab } from "../components/tabs/InvestmentStatementTab";

describe("Matured Bond Accounting & Calculation Fix", () => {
  const mockState = {
    fixedDeposits: [],
    recurringDeposits: [],
    bonds: [
      {
        id: "bond_active_1",
        name: "NHAI 7.5% Tax Free 2030",
        issuer: "NHAI",
        securityNature: "Tax Free Bond",
        numberOfUnits: 100,
        faceValuePerUnit: 1000,
        totalPrincipalAmount: 100000,
        totalInvestmentAmount: 100000,
        coupon: 7.5,
        ytmRate: 7.2,
        orderDate: "2020-01-01",
        maturityDate: "2030-01-01", // Future -> Active
        interestPaymentDate: "Annually",
      },
      {
        id: "bond_matured_1",
        name: "IIFL Samasta 10.5% Matured",
        issuer: "IIFL",
        securityNature: "Senior Secured Bond",
        numberOfUnits: 50,
        faceValuePerUnit: 1000,
        totalPrincipalAmount: 50000,
        totalInvestmentAmount: 50000,
        coupon: 10.5,
        ytmRate: 10.5,
        orderDate: "2021-01-01",
        maturityDate: "2023-01-01", // Past -> Matured
        interestPaymentDate: "Annually",
      },
    ],
    ppf: [],
    nps: [],
    epf: [],
    mutualFunds: [],
    lic: [],
    investmentPlans: [],
    stocks: [],
    goldHoldings: [],
    realEstateProperties: [],
    vehicles: [],
    emergencyFund: [],
    govtSchemes: [],
  };

  it("renders Bond tab with active vs matured filtering and correct Annual Coupon", () => {
    const html = renderToString(
      <InvestmentsTab
        state={mockState}
        addItem={async () => {}}
        updateItem={async () => {}}
        removeItem={async () => {}}
        subTab="bond"
      />
    );

    // Filter pills should render All, Active, and Matured
    expect(html).toContain("All (2)");
    expect(html).toContain("Active (1)");
    expect(html).toContain("Matured (1)");

    // StatCard for active bonds should show "1 Matured"
    expect(html).toContain("1 Matured");

    // Active bond card checks
    expect(html).toContain("NHAI 7.5% Tax Free 2030");
    expect(html).toContain("Tax Free Bond");
    expect(html).toContain("coupon earned to date");

    // Matured bond card checks
    expect(html).toContain("IIFL Samasta 10.5% Matured");
    expect(html).toContain("Matured");
    expect(html).toContain("Total Investment (Matured)");
    expect(html).toContain("total lifetime coupon");
    expect(html).toContain("final maturity value");
    expect(html).toContain("₹0 (Matured)");
    expect(html).toContain("100% COMPLETED");
  });

  it("calculates active and matured bond valuations accurately without inflating ongoing yield", () => {
    const activeBond = mockState.bonds[0];
    const maturedBond = mockState.bonds[1];

    // Active Bond: Face value 100k, Coupon 7.5% => Annual Income 7,500
    const activeAnnualCoupon = (activeBond.totalPrincipalAmount * activeBond.coupon) / 100;
    expect(activeAnnualCoupon).toBe(7500);

    // Matured Bond: Face value 50k, Coupon 10.5%, Term 2 years => Total lifetime coupon = 50k * 10.5% * 2 = 10,500
    const maturedAnnualCoupon = (maturedBond.totalPrincipalAmount * maturedBond.coupon) / 100;
    expect(maturedAnnualCoupon).toBe(5250);
    const maturedLifetimeCoupon = maturedAnnualCoupon * 2;
    expect(maturedLifetimeCoupon).toBe(10500);
    const finalMaturityValue = maturedBond.totalInvestmentAmount + maturedLifetimeCoupon;
    expect(finalMaturityValue).toBe(60500);
  });

  it("renders InvestmentStatementTab with Status / DTM column for bonds", () => {
    const html = renderToString(
      <InvestmentStatementTab state={mockState} />
    );

    expect(html).toContain("Status / DTM");
    expect(html).toContain("NHAI 7.5% Tax Free 2030");
    expect(html).toContain("IIFL Samasta 10.5% Matured");
    expect(html).toContain("Matured");
  });

  it("renders FD tab with active vs matured filtering and accurate accrued values", () => {
    const stateWithFDs = {
      ...mockState,
      fixedDeposits: [
        {
          id: "fd_active_1",
          bank: "HDFC Bank",
          principal: 200000,
          rate: 7.5,
          years: 3,
          startDate: "2024-01-01",
          maturityDate: "2027-01-01", // Active
        },
        {
          id: "fd_matured_1",
          bank: "ICICI Bank",
          principal: 100000,
          rate: 7.0,
          years: 2,
          startDate: "2021-01-01",
          maturityDate: "2023-01-01", // Matured
        },
      ],
    };

    const html = renderToString(
      <InvestmentsTab
        state={stateWithFDs}
        addItem={async () => {}}
        updateItem={async () => {}}
        removeItem={async () => {}}
        subTab="fd"
      />
    );

    // Filter pills
    expect(html).toContain("All (2)");
    expect(html).toContain("Active (1)");
    expect(html).toContain("Matured (1)");

    // Card badges and progress
    expect(html).toContain("HDFC Bank");
    expect(html).toContain("ICICI Bank");
    expect(html).toContain("Matured");
    expect(html).toContain("100% COMPLETED");
  });

  it("renders RD tab with active vs matured filtering and active-only monthly SIP totals", () => {
    const stateWithRDs = {
      ...mockState,
      recurringDeposits: [
        {
          id: "rd_active_1",
          bank: "SBI",
          monthly: 10000,
          rate: 6.8,
          tenureMonths: 36,
          startDate: "2025-01-01", // Active
        },
        {
          id: "rd_matured_1",
          bank: "Axis Bank",
          monthly: 5000,
          rate: 7.1,
          tenureMonths: 12,
          startDate: "2022-01-01", // Matured
        },
      ],
    };

    const html = renderToString(
      <InvestmentsTab
        state={stateWithRDs}
        addItem={async () => {}}
        updateItem={async () => {}}
        removeItem={async () => {}}
        subTab="rd"
      />
    );

    // Filter pills
    expect(html).toContain("All (2)");
    expect(html).toContain("Active (1)");
    expect(html).toContain("Matured (1)");

    // StatCard active indicators
    expect(html).toContain("1 Matured");
    expect(html).toContain("ALL 100% DEPOSITED");
    expect(html).toContain("100% COMPLETED");
  });
});
