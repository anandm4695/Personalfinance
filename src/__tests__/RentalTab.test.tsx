/* eslint-disable */
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

describe("RentalTab — FY expected-rent calculation with mid-year escalation", () => {
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
          // Tier 0: ₹20,000/mo for the first 4 months (Apr–Jul, covers "today")
          // Tier 1: ₹22,000/mo from month 5 onward (Aug–Mar within this FY)
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

    // Correct FY-expected total: 4 months @ ₹20,000 + 8 months @ ₹22,000
    // = ₹80,000 + ₹1,76,000 = ₹2,56,000. The buggy calculation (today's
    // effective rent × 12) would instead have shown "of ₹2,40,000 expected"
    // in the per-property FY Collection progress bar.
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

    // Should NOT say "Y3 of 3" as active period for the expired property
    expect(container.textContent).not.toContain("Y3 of 3");
    expect(container.textContent).toContain("Tiers Expired");
    expect(container.textContent).toContain("Expired");
    // Should NOT show "escalates in"
    expect(container.textContent).not.toContain("escalates in");
  });
});
