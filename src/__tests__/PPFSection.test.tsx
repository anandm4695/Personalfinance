import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  PPFSection,
  calculatePPFMaturityDate,
  getPPFElapsedYears,
  getFinancialYear,
  getCurrentFinancialYear,
  getFinancialYearDates,
  PPFItem,
} from "../components/investments/PPFSection";

describe("PPFSection & Sovereign Math Suite", () => {
  const mockPPFItems: PPFItem[] = [
    {
      id: "ppf_1",
      institution: "State Bank of India",
      accountNumber: "10982348712",
      balance: 350000,
      openingDate: "2018-06-15",
      rate: 7.1,
      owner: "Primary",
      extensionYears: 0,
      transactions: [
        {
          id: "tx_1",
          date: "2025-04-05",
          type: "deposit",
          amount: 150000,
          note: "FY 2025-26 80C deposit",
        },
        {
          id: "tx_2",
          date: "2025-03-31",
          type: "interest",
          amount: 24850,
          note: "Annual Interest FY 2024-25",
        },
      ],
    },
    {
      id: "ppf_2",
      institution: "India Post (Post Office)",
      accountNumber: "9876543210",
      balance: 1200000,
      openingDate: "2008-04-10",
      rate: 7.1,
      owner: "Spouse",
      extensionYears: 5,
      extensionWithContribution: true,
      transactions: [
        {
          id: "tx_3",
          date: "2025-05-02",
          type: "deposit",
          amount: 50000,
          note: "Early May deposit",
        },
        {
          id: "tx_4",
          date: "2026-01-10",
          type: "withdrawal",
          amount: 100000,
          note: "Partial withdrawal for education",
        },
      ],
    },
  ];

  it("calculates statutory 15-year PPF maturity dates accurately (from end of FY)", () => {
    // Opened in June 2018 (FY 2018-19 ends March 31, 2019) -> 15 full FYs ends March 31, 2034
    const matDate1 = calculatePPFMaturityDate("2018-06-15", 0);
    expect(matDate1).toBe("2034-03-31");

    // Opened in Jan 2020 (FY 2019-20 ends March 31, 2020) -> 15 full FYs ends March 31, 2035
    const matDate2 = calculatePPFMaturityDate("2020-01-15", 0);
    expect(matDate2).toBe("2035-03-31");

    // Account opened in 2008 with 5-year extension block:
    // FY 2008-09 ends March 31, 2009 -> 15 + 5 = 20 FYs ends March 31, 2029
    const matDateExt = calculatePPFMaturityDate("2008-04-10", 5);
    expect(matDateExt).toBe("2029-03-31");
  });

  it("evaluates elapsed financial years accurately", () => {
    // An account opened in 2018
    const elapsed = getPPFElapsedYears("2018-06-15");
    expect(elapsed).toBeGreaterThanOrEqual(7);
  });

  it("correctly identifies financial year labels and date boundaries", () => {
    expect(getFinancialYear("2025-04-05")).toBe("FY 2025-26");
    expect(getFinancialYear("2026-02-14")).toBe("FY 2025-26");
    expect(getFinancialYear("2026-04-01")).toBe("FY 2026-27");

    const fyDates = getFinancialYearDates("2025-06-15");
    expect(fyDates.start).toBe("2025-04-01");
    expect(fyDates.end).toBe("2026-03-31");
    expect(fyDates.fyLabel).toBe("FY 2025-26");
  });

  it("renders PPFSection with KPIs, view tabs, and account cards", () => {
    const html = renderToString(
      <PPFSection
        items={mockPPFItems}
        removeItem={() => {}}
        updateItem={() => {}}
        addItem={() => {}}
        onAdd={() => {}}
      />
    );

    expect(html).toContain("Public Provident Fund (PPF)");
    expect(html).toContain("State Bank of India");
    expect(html).toContain("India Post (Post Office)");
    expect(html).toContain("Total PPF Portfolio");
    expect(html).toContain("Section 80C Tax Saved");
    expect(html).toContain("Cards View");
    expect(html).toContain("Data Table");
    expect(html).toContain("15-Yr Roadmap");
    expect(html).toContain("PPF Calculator");
    expect(html).toContain("80C Optimizer");
    expect(html).toContain("Rules &amp; Guide");
  });

  it("renders empty state gracefully when no PPF accounts exist", () => {
    const html = renderToString(
      <PPFSection
        items={[]}
        removeItem={() => {}}
        updateItem={() => {}}
        addItem={() => {}}
        onAdd={() => {}}
      />
    );

    expect(html).toContain("No Public Provident Fund (PPF) Accounts Added");
    expect(html).toContain("Add Your First PPF Account");
  });
});
