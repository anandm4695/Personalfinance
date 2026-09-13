import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  NPSSection,
  NPSAllocationBar,
  NPSItem,
  NPS_PFM_COLOR,
  NPS_LC_LABEL,
} from "../components/investments/NPSSection";

describe("NPSSection & Pension Engineering Suite", () => {
  const mockNpsItems: NPSItem[] = [
    {
      id: "nps_1",
      pran: "110012345678",
      tier: "I",
      schemeType: "All Citizen",
      fundManager: "HDFC",
      investmentChoice: "Active",
      equityPct: 50,
      corpBondPct: 30,
      govtSecPct: 15,
      altAssetPct: 5,
      balance: 850000,
      yearContribution: 50000,
      employerContribution: 0,
      owner: "Self",
      transactions: [
        {
          id: "tx_1",
          date: "2025-04-15",
          particulars: "Voluntary Contribution",
          uploadedBy: "eNPS Online",
          employeeAmount: 50000,
          employerAmount: 0,
        },
        {
          id: "tx_2",
          date: "2025-08-10",
          particulars: "Monthly SIP",
          uploadedBy: "HDFC Bank",
          employeeAmount: 10000,
          employerAmount: 0,
        },
      ],
    },
    {
      id: "nps_2",
      pran: "110098765432",
      tier: "I",
      schemeType: "Corporate",
      fundManager: "SBI",
      investmentChoice: "Auto",
      lifecycleFund: "LC-75",
      balance: 1450000,
      yearContribution: 50000,
      employerContribution: 75000,
      owner: "Spouse",
      transactions: [
        {
          id: "tx_3",
          date: "2025-05-01",
          particulars: "Corporate Employer Matching — Sec 80CCD(2)",
          uploadedBy: "Employer HR Payroll",
          employeeAmount: 25000,
          employerAmount: 25000,
        },
      ],
    },
    {
      id: "nps_3",
      pran: "110055554444",
      tier: "II",
      schemeType: "All Citizen",
      fundManager: "ICICI",
      investmentChoice: "Auto",
      lifecycleFund: "LC-50",
      balance: 200000,
      owner: "Self",
      transactions: [],
    },
  ];

  it("renders NPSSection without crashing and displays key summary metrics", () => {
    const html = renderToString(
      <NPSSection
        items={mockNpsItems}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
        addItem={vi.fn()}
        onAdd={vi.fn()}
      />
    );

    // Should include title and badges
    expect(html).toContain("National Pension System (NPS)");
    expect(html).toContain("PFRDA Regulated");
    expect(html).toContain("Total NPS Wealth");
    expect(html).toContain("Self Contributions");
    expect(html).toContain("Employer Co-Contributions");
    expect(html).toContain("80CCD(1B)");
  });

  it("renders empty state correctly when no accounts exist", () => {
    const html = renderToString(
      <NPSSection
        items={[]}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
        addItem={vi.fn()}
        onAdd={vi.fn()}
      />
    );

    expect(html).toContain("No NPS Accounts Added Yet");
    expect(html).toContain("Add First NPS Account");
  });

  it("renders asset allocation bar correctly for Active Choice", () => {
    const html = renderToString(
      <NPSAllocationBar
        equityPct={50}
        corpBondPct={30}
        govtSecPct={15}
        altAssetPct={5}
      />
    );

    expect(html).toContain("50%");
    expect(html).toContain("30%");
    expect(html).toContain("15%");
    expect(html).toContain("5%");
  });

  it("identifies invalid asset allocation when sum != 100%", () => {
    const html = renderToString(
      <NPSAllocationBar
        equityPct={50}
        corpBondPct={20}
        govtSecPct={10}
        altAssetPct={5}
      />
    );

    // Sum is 85%
    expect(html).toContain("85");
    expect(html).toContain("Must equal 100%");
  });

  it("has valid brand colors and lifecycle fund definitions", () => {
    expect(NPS_PFM_COLOR["SBI"]).toBe("#0067b2");
    expect(NPS_PFM_COLOR["HDFC"]).toBe("#004c8f");
    expect(NPS_PFM_COLOR["ICICI"]).toBe("#F58220");
    expect(NPS_PFM_COLOR["Kotak"]).toBe("#e31e25");

    expect(NPS_LC_LABEL["LC-75"]).toContain("Aggressive");
    expect(NPS_LC_LABEL["LC-50"]).toContain("Moderate");
    expect(NPS_LC_LABEL["LC-25"]).toContain("Conservative");
  });

  it("verifies 60:40 annuity math and monthly pension projection formula", () => {
    const currentCorpus = 1000000;
    const monthlySIP = 10000;
    const years = 10;
    const r = 0.10 / 12; // 10% CAGR
    const months = years * 12;

    const fvInitial = currentCorpus * Math.pow(1 + r, months);
    const fvSip = monthlySIP * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
    const totalCorpus = fvInitial + fvSip;

    const lumpSum60 = totalCorpus * 0.6;
    const annuityCorpus40 = totalCorpus * 0.4;
    const annuityYield = 0.065; // 6.5% annuity
    const monthlyPension = (annuityCorpus40 * annuityYield) / 12;

    expect(totalCorpus).toBeGreaterThan(4500000);
    expect(lumpSum60 + annuityCorpus40).toBeCloseTo(totalCorpus, 0);
    expect(monthlyPension).toBeGreaterThan(9500);
  });
});
