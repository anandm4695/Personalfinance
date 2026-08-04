/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { TaxFilingHelperTab } from "../components/tabs/TaxFilingHelperTab";
import { PrivacyProvider } from "../context/PrivacyContext";

describe("TaxFilingHelperTab — deductions are scoped to the selected FY", () => {
  it("only counts ELSS purchases and EPF employee contributions made within the selected FY, not all-time totals", () => {
    // Bug: the deductions useMemo previously had no FY scoping at all — it
    // summed ELSS "invested" and EPF employee contributions across ALL TIME
    // regardless of which FY was selected in the dropdown, overstating 80C
    // usage for anyone with prior-year ELSS/EPF history.
    const state = {
      profile: { fy: "2025-26" },
      mutualFunds: [
        { category: "ELSS", invested: 40000, buyDate: "2025-06-01" }, // in FY 2025-26
        { category: "ELSS", invested: 999999, buyDate: "2024-06-01" }, // prior FY — must be excluded
      ],
      epf: [
        {
          transactions: [
            { type: "employee_contribution", amount: 20000, date: "2025-07-01" }, // in FY
            { type: "employee_contribution", amount: 888888, date: "2023-07-01" }, // prior FY — excluded
          ],
        },
      ],
    };
    const html = renderToString(
      <PrivacyProvider>
        <TaxFilingHelperTab state={state} metrics={{}} updateMasterData={() => {}} />
      </PrivacyProvider>
    );
    // 80C total should be ELSS(40,000) + EPF(20,000) = 60,000 — not the
    // inflated all-time total of over a million rupees.
    expect(html).toContain("60,000");
    expect(html).not.toContain("999,999");
    expect(html).not.toContain("888,888");
  });

  it("caps parents' Section 80D premium at ₹25,000 separately from self, not a shared ₹75,000 pool", () => {
    const state = {
      profile: { fy: "2025-26" },
      // 80D must be sourced from healthInsurance policies, not termPlans
      // (termPlans is TERM LIFE cover, already 80C-eligible — see the bug
      // fix note above sec80D in TaxFilingHelperTab.tsx).
      healthInsurance: [
        { premium: 60000, premiumFrequency: "annual", insuredMembers: [{ relation: "Self" }] },
      ], // no parents plan at all
    };
    const html = renderToString(
      <PrivacyProvider>
        <TaxFilingHelperTab state={state} metrics={{}} updateMasterData={() => {}} />
      </PrivacyProvider>
    );
    // Self-only premium of 60,000 must be capped at the 25,000 self limit,
    // not allowed up to the old shared 75,000 ceiling.
    expect(html).toContain("25,000");
    expect(html).not.toContain("60,000");
  });
});
