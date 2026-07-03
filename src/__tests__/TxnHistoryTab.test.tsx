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
});
