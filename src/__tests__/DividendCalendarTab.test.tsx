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
    expect(html).toContain("Passive Income Freedom Target");
    expect(html).toContain("Section 194 TDS Intelligence");
  });
});

describe("DividendCalendarTab data-fetch correctness", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        symbol: url,
        exDividendDate: 1775000000,
        dividendDate: 1776000000,
        dividendRate: 28.5,
        dividendYield: 0.015,
      }),
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

    // 10 shares * live price 3800 = 38,000
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

    // 10 shares * avgPrice 3000 = 30,000
    expect(container.textContent).toContain("₹30,000");
  });

  it("switches to Month Calendar, Seasonality, and Mutual Fund views smoothly", async () => {
    const state = {
      stocks: [
        { id: "s1", symbol: "ITC.NS", exchange: "NSE", qty: 100, avgPrice: 400, currentPrice: 450 },
      ],
      dividends: [
        {
          id: "mf1",
          fundName: "SBI Bluechip IDCW",
          type: "mf",
          amount: 2500,
          tds: 250,
          recordDate: "2026-02-10",
          paymentDate: "2026-02-15",
        },
      ],
    };

    const container = await mount(<DividendCalendarTab state={state} />);

    // Click Month Calendar button
    const calBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Month Calendar")
    );
    expect(calBtn).toBeDefined();
    await act(async () => {
      calBtn?.click();
    });
    expect(container.textContent).toContain("Ex-Dividend Date");

    // Click Seasonality button
    const seasonBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Monthly Seasonality")
    );
    expect(seasonBtn).toBeDefined();
    await act(async () => {
      seasonBtn?.click();
    });
    expect(container.textContent).toContain("Estimated Monthly Dividend Seasonality");

    // Click MF IDCW button
    const mfBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("MF IDCW Ledger")
    );
    expect(mfBtn).toBeDefined();
    await act(async () => {
      mfBtn?.click();
    });
    expect(container.textContent).toContain("SBI Bluechip IDCW");
    expect(container.textContent).toContain("Gross Received");
  });

  it("allows recording a dividend into state.dividends via 1-click log action", async () => {
    const addItemMock = vi.fn(async () => ({}));
    const showToastMock = vi.fn();

    const state = {
      stocks: [
        { id: "s1", symbol: "VEDL.NS", exchange: "NSE", qty: 200, avgPrice: 300, currentPrice: 420 },
      ],
      dividends: [],
    };

    const container = await mount(
      <DividendCalendarTab
        state={state}
        addItem={addItemMock}
        showToast={showToastMock}
      />
    );

    // Find and click the "+ Log" button on the holding row
    const logBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("+ Log")
    );
    expect(logBtn).toBeDefined();
    await act(async () => {
      logBtn?.click();
    });

    // Verify modal appeared in document
    const modalHeader = document.querySelector(".modal-header");
    expect(modalHeader?.textContent).toContain("Record Dividend");

    // Click Record Payout inside modal
    const saveBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Record Payout")
    );
    expect(saveBtn).toBeDefined();
    await act(async () => {
      saveBtn?.click();
    });

    expect(addItemMock).toHaveBeenCalledWith(
      "dividends",
      expect.objectContaining({
        symbol: "VEDL",
        type: "stock",
      })
    );
    expect(showToastMock).toHaveBeenCalled();
  });
});
