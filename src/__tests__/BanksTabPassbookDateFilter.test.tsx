import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BanksTab } from "../components/tabs/BanksTab";
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

describe("BanksTab Passbook Date Filter Defaults", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 14)); // 2026-09-14
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults date filter to 'All Time' when viewing Passbook / Ledger", async () => {
    const mockState = {
      bankAccounts: [
        {
          id: "bank-1",
          bankName: "Kotak Mahindra Bank",
          type: "Salary",
          accountNumber: "2513",
          balance: 171394,
        },
      ],
      transactions: [
        {
          id: "tx-old",
          accountId: "bank-1",
          date: "2026-01-15",
          amount: 50000,
          type: "credit",
          category: "Salary",
          note: "January Salary",
        },
        {
          id: "tx-current",
          accountId: "bank-1",
          date: "2026-09-05",
          amount: 55000,
          type: "credit",
          category: "Salary",
          note: "September Salary",
        },
      ],
    };

    const container = await mount(
      <PrivacyProvider>
        <BanksTab
          state={mockState}
          dispatch={vi.fn()}
          showToast={vi.fn()}
        />
      </PrivacyProvider>
    );

    // Find "View Passbook (2)" button on the bank account card
    const viewPassbookBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("View Passbook")
    );
    expect(viewPassbookBtn).toBeDefined();
    expect(viewPassbookBtn?.textContent).toContain("View Passbook (2)");

    // Click "View Passbook"
    await act(async () => {
      viewPassbookBtn?.click();
    });

    // Check that "All Time" preset button has aria-pressed="true"
    const allTimeBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "All Time"
    );
    expect(allTimeBtn).toBeDefined();
    expect(allTimeBtn?.getAttribute("aria-pressed")).toBe("true");

    // Check that BOTH transactions (January and September) are rendered in the ledger table
    expect(container.textContent).toContain("January Salary");
    expect(container.textContent).toContain("September Salary");
  });
});
