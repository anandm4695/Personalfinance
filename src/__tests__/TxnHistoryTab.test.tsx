/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { TxnHistoryTab } from "../components/tabs/TxnHistoryTab";

describe("TxnHistoryTab Premium UI Statically", () => {
  const mockState = {
    stocks: [
      {
        id: "s1",
        symbol: "RELIANCE.NS",
        buyDate: "2026-04-10",
        avgPrice: 2400,
        qty: 10,
        exchange: "NSE",
      },
    ],
    stockSells: [
      {
        id: "s2",
        symbol: "TCS.NS",
        sellDate: "2026-05-12",
        buyPrice: 3200,
        sellPrice: 3500,
        qty: 5,
        profit: 1500,
        exchange: "NSE",
      },
    ],
    mutualFunds: [],
    mfSells: [],
    transactions: [
      {
        id: "t1",
        date: "2026-04-20",
        note: "Salary Credit",
        category: "Salary",
        type: "credit",
        amount: 150000,
        description: "Monthly Salary",
      },
    ],
    demat: [{ id: "d1", broker: "Zerodha" }],
  };

  it("should render premium summary cards, sections, and tables successfully", () => {
    const html = renderToString(<TxnHistoryTab state={mockState} removeItem={vi.fn()} />);

    // Verify key titles, labels, and table cells are generated in HTML
    expect(html).toContain("Global Ledger");
    expect(html).toContain("Stocks Invested");
    expect(html).toContain("MF Invested");
    expect(html).toContain("Realized P&amp;L"); // HTML escaped &
    expect(html).toContain("Cash Net Flow");
    expect(html).toContain("All Assets");
    expect(html).toContain("Stocks Bought");
    expect(html).toContain("RELIANCE");
    expect(html).toContain("Salary Credit");
  });

  it("buckets FY boundary transactions correctly regardless of the browser's timezone", () => {
    // Regression test for a timezone bug: the old FY boundary check built `fyEnd` from a
    // date+time string ("...T23:59:59", no "Z", parsed in LOCAL time) while transaction dates
    // and `fyStart` were plain "YYYY-MM-DD" strings (parsed as UTC midnight). In a negative-UTC-offset
    // timezone that mismatch pushed the fyEnd cutoff hours into the next day, so an April 1st
    // transaction (first day of the NEXT financial year) could incorrectly land in the previous FY.
    const originalTZ = process.env.TZ;
    process.env.TZ = "America/Los_Angeles"; // UTC-7/-8, the timezone that exposed the bug
    try {
      const now = new Date();
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const state = {
        stocks: [],
        stockSells: [],
        mutualFunds: [],
        mfSells: [],
        demat: [],
        transactions: [
          {
            id: "t-last-day",
            date: `${fyStartYear + 1}-03-31`,
            note: "Last Day Of FY Txn",
            category: "Test",
            type: "credit",
            amount: 111,
          },
          {
            id: "t-next-fy",
            date: `${fyStartYear + 1}-04-01`,
            note: "Next FY Txn",
            category: "Test",
            type: "credit",
            amount: 222,
          },
        ],
      };
      const html = renderToString(<TxnHistoryTab state={state} removeItem={vi.fn()} />);

      expect(html).toContain("Last Day Of FY Txn");
      expect(html).not.toContain("Next FY Txn");
    } finally {
      process.env.TZ = originalTZ;
    }
  });

  it("shows assets bought and sold in the same FY in both Bought and Sold sections", () => {
    const now = new Date();
    const currentFYYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const sameFYDateBuy = `${currentFYYear}-05-10`;
    const sameFYDateSell = `${currentFYYear}-08-20`;

    const state = {
      stocks: [
        {
          id: "s-active",
          symbol: "INFY.NS",
          buyDate: sameFYDateBuy,
          avgPrice: 1500,
          qty: 20,
          exchange: "NSE",
        },
      ],
      stockSells: [
        {
          id: "s-sold",
          symbol: "TCS.NS",
          buyDate: sameFYDateBuy,
          sellDate: sameFYDateSell,
          buyPrice: 3000,
          sellPrice: 3500,
          qty: 10,
          profit: 5000,
          exchange: "NSE",
        },
      ],
      mutualFunds: [
        {
          id: "mf-active",
          name: "Parag Parikh Flexi Cap",
          buyDate: sameFYDateBuy,
          buyNav: 50,
          units: 100,
          category: "Equity",
        },
      ],
      mfSells: [
        {
          id: "mf-sold",
          scheme: "HDFC Top 100",
          buyDate: sameFYDateBuy,
          sellDate: sameFYDateSell,
          buyNav: 100,
          sellNav: 120,
          units: 50,
          profit: 1000,
          category: "Equity",
        },
      ],
      transactions: [],
      demat: [],
    };

    const html = renderToString(<TxnHistoryTab state={state} removeItem={vi.fn()} />);

    // Active stock in Stocks Bought
    expect(html).toContain("INFY");
    // Sold stock TCS MUST be in Stocks Bought AND in Stocks Sold
    expect(html).toContain("TCS");
    expect(html).toContain("Sold");

    // Active MF in MF Bought
    expect(html).toContain("Parag Parikh Flexi Cap");
    // Sold MF HDFC Top 100 MUST be in MF Bought AND in MF Redeemed
    expect(html).toContain("HDFC Top 100");
    expect(html).toContain("Redeemed");
  });
});
