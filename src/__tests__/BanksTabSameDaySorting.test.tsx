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

describe("BanksTab Same-Day Credit & Debit Sorting and Passbook Balances", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 27));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockBankAccounts = [
    {
      id: "kotak-4958",
      bankName: "Kotak Mahindra Bank",
      accountNumber: "4958",
      type: "current",
      balance: 0,
      owner: "Anand Mohta",
    },
  ];

  // Exactly reproduce the user's screenshot scenario:
  // On 2021-06-22:
  // 5 credits received (+30372, +37991, +67155, +1018, +31529) totalling 1,68,065
  // 1 contra debit (-168065)
  // On 2021-06-11:
  // 1 credit (+95521), 1 contra debit (-95521)
  const mockTransactions = [
    {
      id: "tx-c1",
      accountId: "kotak-4958",
      date: "2021-06-22",
      type: "credit",
      amount: 31529,
      note: "Reimbursement Payment Received From Company A/C",
      narration: "FUND TRANSFER FROM SHREERAJ DEVELOPER LLP",
      category: "Reimbursement",
    },
    {
      id: "tx-c2",
      accountId: "kotak-4958",
      date: "2021-06-22",
      type: "credit",
      amount: 1018,
      note: "Reimbursement Payment Received From Company A/C",
      narration: "FUND TRANSFER FROM ADITYA SHYAMSUNDER CHANDAK",
      category: "Reimbursement",
    },
    {
      id: "tx-c3",
      accountId: "kotak-4958",
      date: "2021-06-22",
      type: "credit",
      amount: 67155,
      note: "Reimbursement Payment Received From Company A/C",
      narration: "FUND TRANSFER FROM ABHAY SHYAM SUNDER CHANDAK",
      category: "Reimbursement",
    },
    {
      id: "tx-c4",
      accountId: "kotak-4958",
      date: "2021-06-22",
      type: "credit",
      amount: 37991,
      note: "Reimbursement Payment Received From Company A/C",
      narration: "FUND TRANSFER FROM SAROJ SALES ORGANISATION",
      category: "Reimbursement",
    },
    {
      id: "tx-c5",
      accountId: "kotak-4958",
      date: "2021-06-22",
      type: "credit",
      amount: 30372,
      note: "Reimbursement Payment Received From Company A/C",
      narration: "FUND TRANSFER FROM SAROJ LANDMARK REALTY LLP",
      category: "Reimbursement",
    },
    {
      id: "tx-d1",
      accountId: "kotak-4958",
      date: "2021-06-22",
      type: "debit",
      amount: 168065,
      note: "Contra Money Transfer From 4958 to 2118",
      narration: "MB:TRANSFER",
      category: "Transfer",
    },
    {
      id: "tx-d2",
      accountId: "kotak-4958",
      date: "2021-06-11",
      type: "debit",
      amount: 95521,
      note: "Contra Money Transfer From 4958 to 2118",
      narration: "MB:TRANSFER",
      category: "Transfer",
    },
    {
      id: "tx-c6",
      accountId: "kotak-4958",
      date: "2021-06-11",
      type: "credit",
      amount: 95521,
      note: "Reimbursement Payment Received From Company A/C",
      narration: "FUND TRANSFER FROM SAROJ SALES ORGANISATION",
      category: "Reimbursement",
    },
  ];

  const mockState = {
    bankAccounts: mockBankAccounts,
    transactions: mockTransactions,
    profile: { name: "Anand Mohta", baseCurrency: "INR" },
  };

  it("calculates positive running balances without negative balance dips on same-day credits & debits", async () => {
    const container = await mount(
      <PrivacyProvider>
        <BanksTab
          state={mockState}
          fullState={mockState}
          addItem={vi.fn()}
          updateItem={vi.fn()}
          deleteItem={vi.fn()}
          showToast={vi.fn()}
        />
      </PrivacyProvider>
    );

    // Switch to ledger view
    const viewPassbookBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("View Passbook")
    );
    expect(viewPassbookBtn).toBeDefined();

    await act(async () => {
      viewPassbookBtn?.click();
    });

    const ledgerText = container.textContent || "";
    // Passbook title is present
    expect(ledgerText).toContain("Passbook Transaction Ledger");

    // Ensure no negative balances are displayed (e.g. ₹-1,68,065 or ₹-31,529)
    expect(ledgerText).not.toContain("₹-1,68,065");
    expect(ledgerText).not.toContain("₹-31,529");
    expect(ledgerText).not.toContain("₹-32,547");
    expect(ledgerText).not.toContain("₹-99,702");
    expect(ledgerText).not.toContain("₹-1,37,693");

    // Verify all transactions rendered
    expect(ledgerText).toContain("Contra Money Transfer From 4958 to 2118");
    expect(ledgerText).toContain("FUND TRANSFER FROM SHREERAJ DEVELOPER LLP");
  });

  it("orders multiple same-day credits in reverse chronological order so latest balance is on top", async () => {
    // Starting balance ₹1 after 01 Mar transfer
    const twoCreditsState = {
      bankAccounts: mockBankAccounts,
      transactions: [
        {
          id: "tx-init-credit",
          accountId: "kotak-4958",
          date: "2025-03-01",
          type: "credit",
          amount: 96628,
          note: "Payment Received From Shrinath",
        },
        {
          id: "tx-init-debit",
          accountId: "kotak-4958",
          date: "2025-03-01",
          type: "debit",
          amount: 96627, // Leaves balance = ₹1
          note: "Contra Money Transfer From 4958 to 3014",
        },
        {
          id: "tx-food-1",
          accountId: "kotak-4958",
          date: "2025-09-13",
          type: "credit",
          amount: 300,
          note: "Payment Received For Group Food (Anju)",
        },
        {
          id: "tx-food-2",
          accountId: "kotak-4958",
          date: "2025-09-13",
          type: "credit",
          amount: 300,
          note: "Payment Received For Group Food (Sachin)",
        },
      ],
      profile: { name: "Anand Mohta", baseCurrency: "INR" },
    };

    const container = await mount(
      <PrivacyProvider>
        <BanksTab
          state={twoCreditsState}
          fullState={twoCreditsState}
          addItem={vi.fn()}
          updateItem={vi.fn()}
          deleteItem={vi.fn()}
          showToast={vi.fn()}
        />
      </PrivacyProvider>
    );

    const viewPassbookBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("View Passbook")
    );
    await act(async () => {
      viewPassbookBtn?.click();
    });

    const rows = Array.from(container.querySelectorAll("table tbody tr"));
    expect(rows.length).toBeGreaterThanOrEqual(4);

    // Row 0 (top row) should be Sachin (the 2nd credit on Sep 13) with closing balance ₹601
    expect(rows[0].textContent).toContain("Sachin");
    expect(rows[0].textContent).toContain("₹601");

    // Row 1 (2nd row) should be Anju (the 1st credit on Sep 13) with balance ₹301
    expect(rows[1].textContent).toContain("Anju");
    expect(rows[1].textContent).toContain("₹301");

    // Row 2 should be the debit on Mar 01 with balance ₹1
    expect(rows[2].textContent).toContain("Contra Money Transfer");
    expect(rows[2].textContent).toContain("₹1");

    // Row 3 should be the credit on Mar 01 with balance ₹96,628
    expect(rows[3].textContent).toContain("Shrinath");
    expect(rows[3].textContent).toContain("₹96,628");
  });
});
