import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { HealthInsuranceTab, annualPremium, isParentsPolicy, waitingPeriodInfo, hasRoomRentCap } from "../components/tabs/HealthInsuranceTab";

// Mock MasterData
vi.mock("../utils/masterData", () => ({
  useMasterData: () => ({
    familyProfiles: [
      { id: "p1", name: "Anand Mohta", relationship: "Self", dob: "1990-01-01" },
      { id: "p2", name: "Sunita Mohta", relationship: "Mother", dob: "1960-05-15" },
    ],
  }),
  formatProfileOption: (p: any) => `${p.name} (${p.relationship})`,
  calculateAge: (dob: string) => {
    const d = new Date(dob);
    return Math.floor((new Date("2026-09-14").getTime() - d.getTime()) / (365.25 * 86400000));
  },
  formatAge: (dob: string) => "36y",
}));

describe("Health Insurance Utility Math", () => {
  it("calculates annual premium across various frequencies", () => {
    expect(annualPremium(2000, "monthly")).toBe(24000);
    expect(annualPremium(5000, "quarterly")).toBe(20000);
    expect(annualPremium(12000, "semi_annual")).toBe(24000);
    expect(annualPremium(35000, "annual")).toBe(35000);
  });

  it("identifies parent policies based on insured relations", () => {
    const parentPolicy = {
      insuredMembers: [{ name: "Sunita Mohta", relation: "mother" }],
    };
    const selfPolicy = {
      insuredMembers: [{ name: "Anand Mohta", relation: "self" }],
    };
    expect(isParentsPolicy(parentPolicy)).toBe(true);
    expect(isParentsPolicy(selfPolicy)).toBe(false);
  });

  it("calculates waiting period elapsed months and completion", () => {
    const policy = {
      startDate: "2024-09-14",
      waitingPeriodYears: "2",
    };
    const info = waitingPeriodInfo(policy);
    expect(info).not.toBeNull();
    expect(info?.totalMonths).toBe(24);
    expect(info?.done).toBe(true);
  });

  it("detects room rent sub-limits", () => {
    expect(hasRoomRentCap({ roomRentLimit: "1% of Sum Insured" })).toBe(true);
    expect(hasRoomRentCap({ roomRentLimit: "No Sub-limit" })).toBe(false);
    expect(hasRoomRentCap({ roomRentLimit: "Single Private Room" })).toBe(false);
    expect(hasRoomRentCap({ roomRentLimit: "" })).toBe(false);
  });
});

describe("HealthInsuranceTab Component", () => {
  const mockState = {
    healthInsurance: [
      {
        id: "hi-1",
        insurer: "Star Health",
        policyName: "Comprehensive Floater",
        policyNumber: "SH-987654",
        policyType: "family_floater",
        owner: "p1",
        sumInsured: 1000000,
        premium: 22000,
        premiumFrequency: "annual",
        renewalDate: "2026-10-10",
        cashless: true,
        preExistingCovered: true,
        tpaName: "Medi Assist",
        insuredMembers: [
          { name: "Anand Mohta", relation: "self" },
        ],
        claims: [
          {
            id: "cl-1",
            hospitalName: "Apollo Hospital",
            patientName: "Anand Mohta",
            claimDate: "2026-03-15",
            amount: 45000,
            settledAmount: 42000,
            settled: true,
            status: "settled",
            claimType: "cashless",
          },
        ],
      },
      {
        id: "hi-2",
        insurer: "HDFC ERGO",
        policyName: "Senior Citizen Suraksha",
        policyNumber: "HE-123456",
        policyType: "individual",
        owner: "p2",
        sumInsured: 1500000,
        premium: 35000,
        premiumFrequency: "annual",
        renewalDate: "2026-11-20",
        cashless: true,
        preExistingCovered: false,
        insuredMembers: [
          { name: "Sunita Mohta", relation: "mother" },
        ],
        claims: [],
      },
    ],
  };

  it("renders hero statistics cockpit with sum insured, premium outgo, and 80D savings", () => {
    const html = renderToString(
      <HealthInsuranceTab
        state={mockState}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
        showToast={vi.fn()}
      />
    );

    expect(html).toContain("Health Insurance Portfolio");
    expect(html).toContain("Total Combined Cover");
    expect(html).toContain("Annual Outgo");
    expect(html).toContain("80D Tax Deduction");
    expect(html).toContain("Star Health");
    expect(html).toContain("HDFC ERGO");
  });

  it("renders empty state when no policies exist", () => {
    const html = renderToString(
      <HealthInsuranceTab
        state={{ healthInsurance: [] }}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
        showToast={vi.fn()}
      />
    );

    expect(html).toContain("No Health Insurance Policies Yet");
  });
});
