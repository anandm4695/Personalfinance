import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  EPFSection,
  computeEPFAccountMetrics,
  calcTotalServiceYears,
  getFinancialYear,
  DEFAULT_EPFO_INTEREST_RATE,
  EPF_ANNUAL_TAX_FREE_THRESHOLD,
  EPS_WAGE_CEILING,
  MAX_EPS_MONTHLY_CONTRIBUTION,
} from "../components/investments/EPFSection";
import { PrivacyProvider } from "../context/PrivacyContext";

// Mock resize observer and recharts responsive container for testing environment
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

describe("EPF (EPFO) Section & Computation Logic", () => {
  const mockEPFItems = [
    {
      id: "epf-1",
      employer: "Tata Consultancy Services",
      uan: "101234567890",
      owner: "Self",
      establishments: [
        {
          id: "est-1",
          employerName: "Infosys Ltd",
          estId: "KDM0012345",
          memberId: "KDM00123450001",
          joiningDate: "2018-04-01",
          exitDate: "2021-03-31",
          ncpDays: 0,
        },
        {
          id: "est-2",
          employerName: "Tata Consultancy Services",
          estId: "TCS0054321",
          memberId: "TCS00543210002",
          joiningDate: "2021-04-01",
          exitDate: "",
          ncpDays: 0,
        },
      ],
      transactions: [
        {
          id: "tx-1",
          date: "2024-04-30",
          type: "monthly_contribution",
          wageMonth: "Apr-2024",
          epfWages: 50000,
          epsWages: 15000,
          employeeShare: 6000,
          employerShare: 4750,
          pensionShare: 1250,
          estId: "est-2",
        },
        {
          id: "tx-2",
          date: "2024-05-31",
          type: "monthly_contribution",
          wageMonth: "May-2024",
          epfWages: 50000,
          epsWages: 15000,
          employeeShare: 6000,
          employerShare: 4750,
          pensionShare: 1250,
          estId: "est-2",
        },
        {
          id: "tx-3",
          date: "2025-03-31",
          type: "interest_credit",
          particulars: "EPFO Interest FY 2024-25 @ 8.25%",
          employeeShare: 990,
          employerShare: 780,
          pensionShare: 0,
          amount: 1770,
          estId: "est-2",
        },
      ],
    },
  ];

  it("accurately computes EPF metrics from passbook dual shares and interest", () => {
    const metrics = computeEPFAccountMetrics(mockEPFItems[0]);
    expect(metrics.hasPassbook).toBe(true);
    // Employee: 6000 + 6000 + 990 = 12990
    expect(metrics.closingEmployee).toBe(12990);
    // Employer: 4750 + 4750 + 780 = 10280
    expect(metrics.closingEmployer).toBe(10280);
    // Pension: 1250 + 1250 = 2500
    expect(metrics.closingPension).toBe(2500);
    // Total Corpus: 12990 + 10280 + 2500 = 25770
    expect(metrics.finalCorpus).toBe(25770);
    expect(metrics.totalInterest).toBe(1770);
  });

  it("computes service duration and continuous service eligibility for tax exemptions", () => {
    const ests = mockEPFItems[0].establishments;
    const serviceYears = calcTotalServiceYears(ests);
    // 2018-04 to present is > 6 years
    expect(serviceYears).toBeGreaterThanOrEqual(5.0);
  });

  it("verifies statutory constants for EPS-95 and Section 10(11)/(12)", () => {
    expect(DEFAULT_EPFO_INTEREST_RATE).toBe(8.25);
    expect(EPS_WAGE_CEILING).toBe(15000);
    expect(MAX_EPS_MONTHLY_CONTRIBUTION).toBe(1250);
    expect(EPF_ANNUAL_TAX_FREE_THRESHOLD).toBe(250000);
  });

  it("correctly identifies Indian Financial Years", () => {
    expect(getFinancialYear("2024-04-15")).toBe("FY 2024-25");
    expect(getFinancialYear("2025-03-20")).toBe("FY 2024-25");
    expect(getFinancialYear("2025-05-10")).toBe("FY 2025-26");
  });

  it("renders the redesigned EPF section with all 7 navigation tabs", () => {
    const removeItem = vi.fn();
    const updateItem = vi.fn();
    const onAdd = vi.fn();

    render(
      <PrivacyProvider>
        <EPFSection
          items={mockEPFItems}
          removeItem={removeItem}
          updateItem={updateItem}
          onAdd={onAdd}
        />
      </PrivacyProvider>
    );

    // Verify main header and brand badge
    expect(screen.getByText("Employees' Provident Fund (EPFO)")).toBeDefined();
    expect(screen.getByText("Sovereign 8.25%")).toBeDefined();

    // Verify sub-navigation buttons
    expect(screen.getByText("Overview & Accounts")).toBeDefined();
    expect(screen.getByText("EPFO Passbook")).toBeDefined();
    expect(screen.getByText("Service History")).toBeDefined();
    expect(screen.getByText("Analytics & Growth")).toBeDefined();
    expect(screen.getByText("EPF & EPS Calculators")).toBeDefined();
    expect(screen.getByText("Tax Engine (₹2.5L Limit)")).toBeDefined();
    expect(screen.getByText("EPFO Rules & Claims")).toBeDefined();

    // Switch to Calculators view
    fireEvent.click(screen.getByText("EPF & EPS Calculators"));
    expect(screen.getByText("EPF & VPF Retirement Corpus Projector")).toBeDefined();
    expect(screen.getByText("EPS-95 Statutory Monthly Pension Estimator")).toBeDefined();

    // Switch to Tax Engine view
    fireEvent.click(screen.getByText("Tax Engine (₹2.5L Limit)"));
    expect(screen.getByText(/Section 10\(11\) & 10\(12\) ₹2\.5 Lakh Annual Tax Threshold Tracker/)).toBeDefined();

    // Switch to Guide view
    fireEvent.click(screen.getByText("EPFO Rules & Claims"));
    expect(screen.getByText("EPFO Online Claims & Withdrawal Forms Guide")).toBeDefined();
    expect(screen.getByText("Form 19")).toBeDefined();
    expect(screen.getByText("Form 10C")).toBeDefined();
    expect(screen.getByText("Form 31")).toBeDefined();
  });
});
