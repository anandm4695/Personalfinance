/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DividendCalendarTab } from "../components/tabs/DividendCalendarTab";
import { PrivacyProvider } from "../context/PrivacyContext";

// Mounts the component into a real DOM (via act) so useEffect-driven fetches fire,
// unlike renderToString which only produces static markup.
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

describe("DividendCalendarTab Premium UI Statically", () => {
  const mockState = {
    stocks: [
      { id: "s1", symbol: "TCS.NS", exchange: "NSE", qty: 50, avgPrice: 3500, currentPrice: 3800 },
    ],
    dividends: [
      {
        id: "d1",
        symbol: "TCS.NS",
        amount: 15,
        recordDate: "2026-03-01",
        paymentDate: "2026-03-15",
      },
    ],
  };

  it("should render projected dividend stats, ex-date timelines, and holding detail lists", () => {
    const html = renderToString(<DividendCalendarTab state={mockState} />);

    // Verify key titles and card details render correctly
    expect(html).toContain("Dividend Calendar");
    expect(html).toContain("Est. Annual Dividend");
    expect(html).toContain("Portfolio Div. Yield");
    expect(html).toContain("Upcoming Ex-dates");
    expect(html).toContain("Dividend Payers");
    expect(html).toContain("All Holdings — Dividend Details");
    expect(html).toContain("Refresh Ex-dates");
  });
});

describe("DividendCalendarTab data-fetch correctness", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({ symbol: url, exDividendDate: null, dividendDate: null }),
    }));
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests Yahoo Finance data using the exchange-suffixed symbol (base symbols resolve to the wrong/foreign security)", async () => {
    const stateNoSuffix = {
      stocks: [
        { id: "s1", symbol: "INFY", exchange: "NSE", qty: 10, avgPrice: 1400, currentPrice: 1500 },
        { id: "s2", symbol: "RELIANCE", exchange: "BSE", qty: 5, avgPrice: 2900, currentPrice: 3000 },
      ],
      dividends: [],
    };

    await mount(<DividendCalendarTab state={stateNoSuffix} />);

    const requestedUrls = fetchMock.mock.calls.map((c: any[]) => decodeURIComponent(c[0]));
    expect(requestedUrls.some((u: string) => u.includes("symbol=INFY.NS"))).toBe(true);
    expect(requestedUrls.some((u: string) => u.includes("symbol=RELIANCE.BO"))).toBe(true);
    // Must never call Yahoo with the bare, unsuffixed symbol
    expect(requestedUrls.some((u: string) => u.endsWith("symbol=INFY"))).toBe(false);
    expect(requestedUrls.some((u: string) => u.endsWith("symbol=RELIANCE"))).toBe(false);
  });

  it("consolidates multiple buy-lots of the same stock into a single row instead of duplicating it", async () => {
    const stateMultiLot = {
      stocks: [
        { id: "l1", symbol: "TCS.NS", exchange: "NSE", qty: 10, avgPrice: 3400, currentPrice: 3800 },
        { id: "l2", symbol: "TCS.NS", exchange: "NSE", qty: 20, avgPrice: 3600, currentPrice: 3800 },
      ],
      dividends: [],
    };

    const container = await mount(<DividendCalendarTab state={stateMultiLot} />);

    // Only one ex-date fetch should be issued for the combined TCS.NS position.
    // (Scoped to /api/stock-exdate specifically — the holdings table also
    // renders a StockLogo per row, which independently hits /api/stock-logo
    // for the same symbol; that's a separate, correctly-single fetch and
    // shouldn't be conflated with the ex-date consolidation this test covers.)
    const requestedUrls = fetchMock.mock.calls.map((c: any[]) => decodeURIComponent(c[0]));
    expect(
      requestedUrls.filter(
        (u: string) => u.includes("/api/stock-exdate") && u.includes("symbol=TCS.NS")
      ).length
    ).toBe(1);

    // Only one row should exist for TCS in the holdings table, with combined 30-share qty
    const symbolCells = Array.from(container.querySelectorAll("td")).filter((td) =>
      (td.textContent || "").startsWith("TCS")
    );
    expect(symbolCells.length).toBe(1);
    expect(container.textContent).toContain("30");
  });

  it("falls back to live marketData price when the stock's stored currentPrice is stale/zero, instead of showing Current Value as zero", async () => {
    const stateStalePrice = {
      stocks: [
        { id: "s1", symbol: "TCS.NS", exchange: "NSE", qty: 10, avgPrice: 3000, currentPrice: 0 },
      ],
      dividends: [],
    };
    const marketData = { "TCS.NS": { price: 3800 } };

    const container = await mount(
      <PrivacyProvider>
        <DividendCalendarTab state={stateStalePrice} marketData={marketData} />
      </PrivacyProvider>
    );

    // 10 shares * live price 3800 = 38,000 — Current Value must reflect the
    // live marketData price, not render as ₹0 because the stored
    // currentPrice field on the lot is stale/unset.
    expect(container.textContent).toContain("₹38,000");
  });

  it("falls back to avgPrice when neither live marketData nor stored currentPrice is available", async () => {
    const stateNoPriceAtAll = {
      stocks: [
        { id: "s1", symbol: "TCS.NS", exchange: "NSE", qty: 10, avgPrice: 3000, currentPrice: 0 },
      ],
      dividends: [],
    };

    const container = await mount(
      <PrivacyProvider>
        <DividendCalendarTab state={stateNoPriceAtAll} />
      </PrivacyProvider>
    );

    // 10 shares * avgPrice 3000 = 30,000 — with no live price and a zeroed
    // stored currentPrice, Current Value must still fall back to avgPrice
    // rather than showing ₹0.
    expect(container.textContent).toContain("₹30,000");
  });
});
