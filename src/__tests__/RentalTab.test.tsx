 
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RentalTab } from "../components/tabs/RentalTab";
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

describe("RentalTab — Executive Redesign and Financial Calculations", () => {
  beforeEach(() => {
    // Fix "today" to 2026-07-15 — inside FY 2026-27 (Apr 2026 – Mar 2027),
    // 4 months (Apr, May, Jun, Jul) after the FY start.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15)); // July is month index 6
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sums each month's escalation-tier rent for the FY instead of multiplying today's rent by 12", async () => {
    const state = {
      rentalProperties: [
        {
          id: "p1",
          propertyName: "Sea View Flat",
          isActive: true,
          agreementStart: "2026-04-01",
          monthlyRent: 20000,
          escalationTiers: [
            { amount: 20000, durationMonths: 4 },
            { amount: 22000, durationMonths: 100 },
          ],
          tenantName: "Tenant A",
          receipts: [],
          depositTransactions: [],
          depositDeductions: [],
          depositReturned: 0,
          municipalTax: 0,
          propertyValue: 0,
        },
      ],
      rentedProperties: [],
    };

    const container = await mount(
      <PrivacyProvider>
        <RentalTab state={state} addItem={() => {}} removeItem={() => {}} updateItem={() => {}} />
      </PrivacyProvider>
    );

    const expectedCorrect = 20000 * 4 + 22000 * 8;
    expect(expectedCorrect).toBe(256000);

    expect(container.textContent).toContain("of ₹2,56,000 expected");
    expect(container.textContent).not.toContain("of ₹2,40,000 expected");
  });

  it("does not show current period or active escalation tier when agreement is expired", async () => {
    const state = {
      rentalProperties: [
        {
          id: "p_expired",
          propertyName: "Grand Residency Shop 4",
          isActive: true,
          agreementStart: "2023-01-01",
          agreementEnd: "2025-12-31", // Expired relative to 2026-07-15
          monthlyRent: 15000,
          escalationTiers: [
            { amount: 15000, durationMonths: 12 },
            { amount: 18000, durationMonths: 12 },
            { amount: 20000, durationMonths: 12 },
          ],
          tenantName: "Rajesh Kumar",
          receipts: [],
          depositTransactions: [],
          depositDeductions: [],
          depositReturned: 0,
          municipalTax: 0,
          propertyValue: 5000000,
        },
      ],
      rentedProperties: [
        {
          id: "p_in_expired",
          propertyName: "Apartment 102",
          isActive: true,
          agreementStart: "2023-01-01",
          agreementEnd: "2025-12-31",
          monthlyRent: 25000,
          escalationTiers: [
            { amount: 25000, durationMonths: 12 },
            { amount: 28000, durationMonths: 12 },
          ],
          landlordName: "Venkatesh Rao",
          payments: [],
          depositTransactions: [],
          depositReturned: 0,
        },
      ],
    };

    const container = await mount(
      <PrivacyProvider>
        <RentalTab state={state} addItem={() => {}} removeItem={() => {}} updateItem={() => {}} />
      </PrivacyProvider>
    );

    expect(container.textContent).not.toContain("Y3 of 3");
    expect(container.textContent).toContain("Tiers Expired");
    expect(container.textContent).toContain("Expired");
    expect(container.textContent).not.toContain("escalates in");
  });

  it("renders multi-tenant splits, deposit lifecycle balances, and quick action controls", async () => {
    const state = {
      rentalProperties: [
        {
          id: "p_multi",
          propertyName: "Commercial Complex Floor 2",
          isActive: true,
          agreementStart: "2026-01-01",
          agreementEnd: "2027-12-31",
          monthlyRent: 60000,
          tenants: [
            { name: "Acme Corp", monthlyRent: 35000, phone: "9876543210" },
            { name: "Zenith Studio", monthlyRent: 25000, phone: "9876543211" },
          ],
          securityDeposit: 200000,
          depositTransactions: [
            { id: "d1", amount: 100000, date: "2026-01-05", note: "Advance tranche 1" },
            { id: "d2", amount: 100000, date: "2026-01-15", note: "Advance tranche 2" },
          ],
          depositDeductions: [{ id: "dec1", amount: 15000, reason: "Glass partition fix", date: "2026-05-10" }],
          depositReturned: 25000,
          receipts: [{ id: "r1", month: "2026-04", amount: 60000, date: "2026-04-05" }],
          municipalTax: 10000,
          propertyValue: 12000000,
        },
      ],
      rentedProperties: [],
    };

    const container = await mount(
      <PrivacyProvider>
        <RentalTab state={state} addItem={() => {}} removeItem={() => {}} updateItem={() => {}} />
      </PrivacyProvider>
    );

    // Multi-tenant names
    expect(container.textContent).toContain("2 Tenants");
    expect(container.textContent).toContain("Acme Corp");
    expect(container.textContent).toContain("Zenith Studio");

    // Net Deposit Held = 200,000 (actual transactions) - 15,000 (deductions) - 25,000 (returned) = 160,000
    expect(container.textContent).toContain("₹1,60,000");

    // Quick Action button to view ledger
    expect(container.textContent).toContain("View Ledger (1)");

    // Executive overview cashflow
    expect(container.textContent).toContain("Monthly Rental Inflow");
    expect(container.textContent).toContain("Rental Net Cashflow");
  });

  it("renders bank accounts and sync tags in ledger modal when bank is linked", async () => {
    const state = {
      bankAccounts: [
        { id: "bank_hdfc", bankName: "HDFC Bank", accountNumber: "1234567890", type: "Savings" },
      ],
      rentalProperties: [
        {
          id: "p_synced",
          propertyName: "Sunset Villa",
          isActive: true,
          agreementStart: "2026-04-01",
          monthlyRent: 45000,
          tenantName: "Sunita Verma",
          receipts: [
            {
              id: "rec1",
              month: "2026-04",
              amount: 45000,
              date: "2026-04-05",
              bankAccountId: "bank_hdfc",
              linkedTxnId: "txn_rent_1",
            },
          ],
          depositTransactions: [
            {
              id: "dep1",
              amount: 150000,
              date: "2026-04-01",
              bankAccountId: "bank_hdfc",
              linkedTxnId: "txn_dep_1",
            },
          ],
          depositDeductions: [],
          depositReturned: 0,
        },
      ],
      rentedProperties: [],
      transactions: [
        {
          id: "txn_rent_1",
          accountId: "bank_hdfc",
          type: "credit",
          amount: 45000,
          category: "Rental Income",
          linkedType: "rentalProperties",
          linkedId: "p_synced",
        },
      ],
    };

    const container = await mount(
      <PrivacyProvider>
        <RentalTab state={state} addItem={() => {}} removeItem={() => {}} updateItem={() => {}} />
      </PrivacyProvider>
    );

    // Click "View Ledger"
    const ledgerBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("View Ledger")
    );
    expect(ledgerBtn).toBeDefined();

    await act(async () => {
      ledgerBtn?.click();
    });

    // In the opened ledger modal, HDFC Bank sync badge should be visible for the synced receipt
    expect(document.body.textContent).toContain("HDFC Bank");
  });
});
