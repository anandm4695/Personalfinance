/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { DataExportTab, DOMAIN_CATEGORIES, EXPORT_PRESETS, ALL_DATA_SECTIONS } from "../components/tabs/DataExportTab";
import { PrivacyProvider } from "../context/PrivacyContext";

describe("DataExportTab Senior UI/UX Redesign", () => {
  const mockState = {
    profile: { name: "Anand Mohta", email: "anand@example.com" },
    bankAccounts: [{ id: "b1", bankName: "HDFC Bank", balance: 150000 }],
    transactions: [{ id: "t1", amount: 5000, category: "Groceries" }],
    mutualFunds: [{ id: "mf1", name: "Parag Parikh Flexi Cap", units: 100 }],
    stocks: [{ id: "s1", symbol: "RELIANCE", qty: 25 }],
    taxPayments: [{ id: "tx1", amount: 25000, type: "Advance Tax" }],
    lic: [{ id: "lic1", planName: "Jeevan Labh", sumAssured: 1000000 }],
    loansTaken: [{ id: "l1", type: "Home Loan", outstanding: 2500000 }],
    goals: [{ id: "g1", name: "Retirement", targetAmount: 50000000 }],
  };

  it("exports valid domain categories and presets", () => {
    expect(DOMAIN_CATEGORIES.length).toBe(6);
    expect(EXPORT_PRESETS.length).toBe(5);
    expect(ALL_DATA_SECTIONS.length).toBeGreaterThan(40);
  });

  it("renders the Executive Backup Health Center, hero cards, and format selectors", () => {
    const html = renderToString(
      <PrivacyProvider>
        <DataExportTab
          state={mockState}
          exportJSON={vi.fn()}
          onRestoreBackup={vi.fn()}
          showToast={vi.fn()}
          lastBackupTs={Date.now() - 2 * 24 * 60 * 60 * 1000}
          isCloudSynced={true}
        />
      </PrivacyProvider>
    );

    expect(html).toContain("Data Export &amp; Backup Hub");
    expect(html).toContain("Backup Health Status");
    expect(html).toContain("Cloud Synced");
    expect(html).toContain("Total Database Records");
    expect(html).toContain("Export Hub &amp; Spreadsheets");
    expect(html).toContain("Restore &amp; Disaster Recovery");
    expect(html).toContain("Privacy &amp; Storage Insights");
    expect(html).toContain("Full Backup (.json)");
    expect(html).toContain("Selective JSON (.json)");
    expect(html).toContain("Spreadsheets (.csv)");
    expect(html).toContain("Banking, Cash &amp; Cards");
    expect(html).toContain("Wealth, Stocks &amp; Markets");
    expect(html).toContain("Insurance, Tax &amp; Income");
  });

  it("renders with unbacked status when lastBackupTs is null", () => {
    const html = renderToString(
      <PrivacyProvider>
        <DataExportTab
          state={mockState}
          exportJSON={vi.fn()}
          onRestoreBackup={vi.fn()}
          showToast={vi.fn()}
          lastBackupTs={null}
          isCloudSynced={false}
        />
      </PrivacyProvider>
    );

    expect(html).toContain("Never Backed Up");
    expect(html).toContain("Local Only");
  });
});
