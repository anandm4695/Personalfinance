/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { Section80TrackerTab } from "../components/tabs/Section80TrackerTab";
import { getCurrentFY } from "../utils/appConstants";
import { PrivacyProvider } from "../context/PrivacyContext";

// Simple mock for recharts ResponsiveContainer (same pattern as SalarySlipTab.test.tsx)
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

const fyStartYear = Number(getCurrentFY().split("-")[0]);

describe("Section80TrackerTab — PPF 80C contribution source", () => {
  it("counts a PPF ledger deposit made in the current FY toward 80C (not just the legacy thisYearContribution field)", () => {
    const state = {
      ppf: [], // no legacy thisYearContribution field set
      ppfLedger: [
        { date: `${fyStartYear}-06-15`, amount: 60000, type: "deposit" },
        // outside the current FY — must be excluded
        { date: `${fyStartYear - 1}-06-15`, amount: 99999, type: "deposit" },
      ],
    };
    const html = renderToString(
      <PrivacyProvider>
        <Section80TrackerTab state={state} metrics={{}} />
      </PrivacyProvider>
    );
    expect(html).toContain("60,000");
  });

  it("falls back to ppf[].thisYearContribution when the ledger has no entries this FY", () => {
    const state = {
      ppf: [{ thisYearContribution: 40000 }],
      ppfLedger: [],
    };
    const html = renderToString(
      <PrivacyProvider>
        <Section80TrackerTab state={state} metrics={{}} />
      </PrivacyProvider>
    );
    expect(html).toContain("40,000");
  });
});
