import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  MutualFundsSection,
  liveMfNav,
  mfInvestedValue,
  mfCurrentValueOf,
  getCategoryColor,
} from "../components/investments/MutualFundsSection";

describe("MutualFundsSection & Portfolio Math Suite", () => {
  const mockMutualFunds = [
    {
      id: "mf_1",
      name: "Parag Parikh Flexi Cap Fund - Direct Plan",
      category: "Flexi Cap",
      mfType: "Direct Growth",
      folioNumber: "1029384756",
      mfCode: "122639",
      buyDate: "2023-01-15",
      buyNav: "48.50",
      units: "200",
      currentNav: "72.40",
      invested: "9700",
      owner: "self",
    },
    {
      id: "mf_2",
      name: "Mirae Asset ELSS Tax Saver Fund - Direct Plan",
      category: "ELSS",
      mfType: "Direct Growth",
      folioNumber: "5544332211",
      mfCode: "135781",
      buyDate: "2022-03-10",
      buyNav: "30.00",
      units: "500",
      currentNav: "45.00",
      invested: "15000",
      owner: "self",
    },
    {
      id: "mf_3",
      name: "HDFC Small Cap Fund - Regular Growth",
      category: "Small Cap",
      mfType: "Regular Growth",
      folioNumber: "9988776655",
      mfCode: "105822",
      buyDate: "2024-06-01",
      buyNav: "100.00",
      units: "100",
      currentNav: "115.00",
      invested: "10000",
      owner: "spouse",
    },
  ];

  const mockMfSells = [
    {
      id: "mfs_1",
      scheme: "Parag Parikh Flexi Cap Fund - Direct Plan",
      category: "Flexi Cap",
      units: 50,
      buyNav: 40.0,
      sellNav: 60.0,
      buyDate: "2022-01-10",
      sellDate: "2024-05-15",
      profit: 1000.0,
      owner: "self",
    },
  ];

  it("calculates liveMfNav correctly preferring live market data over currentNav", () => {
    const fund = { mfCode: "122639", currentNav: "70.00" };
    const marketData = { "122639": { nav: "72.40" } };
    expect(liveMfNav(fund, marketData)).toBe(72.4);
    expect(liveMfNav(fund, {})).toBe(70.0);
  });

  it("calculates invested value accurately", () => {
    const fundWithInvested = { invested: "9700", units: "200", buyNav: "48.50" };
    expect(mfInvestedValue(fundWithInvested)).toBe(9700);

    const fundWithoutInvested = { units: "200", buyNav: "50.00" };
    expect(mfInvestedValue(fundWithoutInvested)).toBe(10000);
  });

  it("calculates current valuation and detects staleness", () => {
    const getLiveNavFn = (m: any) => Number(m.currentNav) || 0;
    const fund = { units: "200", currentNav: "72.40" };
    const val = mfCurrentValueOf(fund, getLiveNavFn);
    expect(val.value).toBeCloseTo(14480, 2);
    expect(val.isStale).toBe(false);

    const staleFund = { units: "200", currentNav: "0", buyNav: "40.0" };
    const staleVal = mfCurrentValueOf(staleFund, getLiveNavFn);
    expect(staleVal.value).toBe(8000);
    expect(staleVal.isStale).toBe(true);
  });

  it("assigns appropriate color for mutual fund categories", () => {
    expect(getCategoryColor("Flexi Cap")).toBeDefined();
    expect(getCategoryColor("ELSS")).toBeDefined();
    expect(getCategoryColor("Small Cap")).toBeDefined();
    expect(getCategoryColor("Unknown Category")).toBeDefined();
  });

  it("renders MutualFundsSection without crashing", () => {
    const html = renderToString(
      React.createElement(MutualFundsSection, {
        items: mockMutualFunds,
        mfSells: mockMfSells,
        addItem: vi.fn(),
        removeItem: vi.fn(),
        updateItem: vi.fn(),
        activeProfile: "all",
      })
    );

    expect(html).toContain("Parag Parikh Flexi Cap");
    expect(html).toContain("Total Invested");
    expect(html).toContain("Current Valuation");
    expect(html).toContain("Holdings &amp; Folios");
    expect(html).toContain("Portfolio Analytics");
    expect(html).toContain("TER &amp; Direct Optimizer");
    expect(html).toContain("Tax &amp; ELSS Lock-in");
  });
});
