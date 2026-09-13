/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, it, expect, vi } from "vitest";
import { DividendsSection } from "../components/investments/DividendsSection";
import { PrivacyProvider } from "../context/PrivacyContext";

async function mount(ui: React.ReactElement) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(ui);
  });
  return container;
}

describe("DividendsSection Component", () => {
  const mockState = {
    stocks: [
      { id: "s1", symbol: "TCS.NS", exchange: "NSE", qty: 50, avgPrice: 3000, currentPrice: 3500 },
      { id: "s2", symbol: "INFY.NS", exchange: "NSE", qty: 100, avgPrice: 1200, currentPrice: 1500 },
    ],
    mutualFunds: [
      { id: "m1", name: "HDFC Top 100 IDCW", units: 1000, buyNav: 50 },
    ],
    dividends: [
      {
        id: "d1",
        symbol: "TCS",
        amount: 2500,
        tds: 250,
        paymentDate: "2026-02-15",
        fy: "2025-26",
        type: "stock",
      },
      {
        id: "d2",
        fundName: "HDFC Top 100 IDCW",
        amount: 3000,
        tds: 300,
        paymentDate: "2026-01-10",
        fy: "2025-26",
        type: "mf",
      },
    ],
    transactions: [
      {
        id: "tx1",
        type: "credit",
        category: "Dividend",
        amount: 1500,
        date: "2026-03-01",
        note: "ITC Limited Div Payout",
        account: "HDFC Bank",
      },
    ],
  };

  it("renders executive KPI hero cards, visual analytics tabs, and DRIP simulator", () => {
    const html = renderToString(
      <PrivacyProvider>
        <DividendsSection
          state={mockState}
          addItem={vi.fn()}
          removeItem={vi.fn()}
        />
      </PrivacyProvider>
    );

    expect(html).toContain("Dividend Tracker &amp; Income Hub");
    expect(html).toContain("Total Gross Dividends");
    expect(html).toContain("Net Realized (Post-TDS)");
    expect(html).toContain("Total TDS Withheld");
    expect(html).toContain("Yield on Cost (YoC)");
    expect(html).toContain("DRIP Simulator 2.0");
    expect(html).toContain("Indian Income Tax &amp; TDS Advisory");
  });

  it("detects bank credits as auto-dividends and renders the reconciliation hub", async () => {
    const container = await mount(
      <PrivacyProvider>
        <DividendsSection
          state={mockState}
          addItem={vi.fn()}
          removeItem={vi.fn()}
        />
      </PrivacyProvider>
    );

    expect(container.textContent).toContain("Auto-Detected Dividend Credit");
    expect(container.textContent).toContain("ITC Limited Div Payout");
    expect(container.textContent).toContain("Verify & Log TDS");
  });

  it("calculates net dividend correctly (Gross - TDS)", async () => {
    const container = await mount(
      <PrivacyProvider>
        <DividendsSection
          state={mockState}
          addItem={vi.fn()}
          removeItem={vi.fn()}
        />
      </PrivacyProvider>
    );

    // TCS: 2500 - 250 = 2250; HDFC MF: 3000 - 300 = 2700; Auto: 1500; Total Net = 6450
    expect(container.textContent).toContain("₹6,450");
  });
});
