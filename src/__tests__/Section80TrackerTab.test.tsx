/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { Section80TrackerTab } from "../components/tabs/Section80TrackerTab";
import { getCurrentFY } from "../utils/appConstants";
import { PrivacyProvider } from "../context/PrivacyContext";

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

const fyStartYear = Number(getCurrentFY().split("-")[0]);

describe("Section80TrackerTab — Comprehensive Test Suite", () => {
  it("counts a PPF ledger deposit made in the current FY toward 80C (not just the legacy thisYearContribution field)", () => {
    const state = {
      ppf: [],
      ppfLedger: [
        { date: `${fyStartYear}-06-15`, amount: 60000, type: "deposit" },
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

  it("renders 80C, 80D, 80CCD, and Section 24 deduction sections correctly", () => {
    const state = {
      mutualFunds: [
        { category: "ELSS Tax Saver", invested: 50000, buyDate: `${fyStartYear}-05-10` },
      ],
      healthInsurance: [
        { premium: 22000, premiumFrequency: "annual", insuredMembers: [{ relation: "self" }] },
      ],
      nps: [
        { thisYearContribution: 50000, employerContribution: 60000 },
      ],
    };
    const html = renderToString(
      <PrivacyProvider>
        <Section80TrackerTab state={state} metrics={{}} />
      </PrivacyProvider>
    );
    expect(html).toContain("Section 80C");
    expect(html).toContain("50,000");
    expect(html).toContain("22,000");
    expect(html).toContain("60,000");
  });

  it("handles empty state gracefully without errors", () => {
    const state = {};
    const html = renderToString(
      <PrivacyProvider>
        <Section80TrackerTab state={state} metrics={{}} />
      </PrivacyProvider>
    );
    expect(html).toContain("Section 80C / 80D &amp; Tax Deductions Tracker");
    expect(html).toContain("Total Eligible Deductions");
  });
});
