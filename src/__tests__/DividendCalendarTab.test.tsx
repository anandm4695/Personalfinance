/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { DividendCalendarTab } from "../components/tabs/DividendCalendarTab";

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
