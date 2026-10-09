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

describe("BanksTab Transaction Saving and Modal State", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 27));
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("handles record transaction saving instantly and calls addItem with correct parameters", async () => {
    const addItemMock = vi.fn().mockResolvedValue({ success: true, id: "test-uuid" });
    const showToastMock = vi.fn();

    const mockState = {
      bankAccounts: [
        {
          id: "bank-1",
          bankName: "HDFC Bank",
          type: "Savings",
          accountNumber: "1234",
          balance: 10000,
          owner: "self",
        },
      ],
      transactions: [],
    };

    const container = await mount(
      <PrivacyProvider>
        <BanksTab
          state={mockState}
          addItem={addItemMock}
          showToast={showToastMock}
          activeProfile="self"
        />
      </PrivacyProvider>
    );

    // Click on "Record Transaction" button in top toolbar
    const recordBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Record Transaction")
    );
    expect(recordBtn).toBeDefined();

    await act(async () => {
      recordBtn?.click();
    });

    expect(document.body.textContent).toContain("Record Bank Transaction");

    // Fill in amount using prototype value setter
    const amountInput = document.body.querySelector('input[type="number"]') as HTMLInputElement;
    expect(amountInput).toBeDefined();

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(amountInput, "2500");
      amountInput.dispatchEvent(new Event("input", { bubbles: true }));
      amountInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Submit modal: find the save button inside the modal actions (last Record Transaction button)
    const saveButtons = Array.from(document.body.querySelectorAll("button")).filter((b) =>
      b.textContent?.trim() === "Record Transaction"
    );
    const saveBtn = saveButtons[saveButtons.length - 1];
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn?.click();
    });

    // Modal closes instantly without waiting for network
    expect(document.body.textContent).not.toContain("Record Bank Transaction");

    expect(addItemMock).toHaveBeenCalledWith(
      "transactions",
      expect.objectContaining({
        accountId: "bank-1",
        amount: 2500,
        type: "debit",
      })
    );

    // Fast-forward timers for toast / async state
    await act(async () => {
      vi.runAllTimers();
    });

    expect(showToastMock).toHaveBeenCalledWith("Transaction recorded successfully", "success");
  });

  it("handles transfer transaction via addTransactions for atomic batch execution", async () => {
    const addTransactionsMock = vi.fn().mockResolvedValue(undefined);
    const showToastMock = vi.fn();

    const mockState = {
      bankAccounts: [
        { id: "bank-src", bankName: "HDFC Bank", type: "Savings", balance: 50000, owner: "self" },
        { id: "bank-dest", bankName: "ICICI Bank", type: "Salary", balance: 10000, owner: "self" },
      ],
      transactions: [],
    };

    const container = await mount(
      <PrivacyProvider>
        <BanksTab
          state={mockState}
          addTransactions={addTransactionsMock}
          showToast={showToastMock}
          activeProfile="self"
        />
      </PrivacyProvider>
    );

    const recordBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Record Transaction")
    );
    await act(async () => {
      recordBtn?.click();
    });

    // Switch to Transfer tab inside modal
    const modal = document.body.querySelector(".modal, [role='dialog'], [style*='position: fixed']") || document.body;
    const transferTabBtn = Array.from(modal.querySelectorAll("button")).find((b) =>
      b.textContent?.trim().includes("Transfer")
    );
    await act(async () => {
      transferTabBtn?.click();
    });

    const amountInput = document.body.querySelector('input[type="number"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(amountInput, "5000");
      amountInput.dispatchEvent(new Event("input", { bubbles: true }));
      amountInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const saveButtons = Array.from(document.body.querySelectorAll("button")).filter((b) =>
      b.textContent?.trim() === "Record Transaction"
    );
    const saveBtn = saveButtons[saveButtons.length - 1];

    await act(async () => {
      saveBtn?.click();
    });

    expect(addTransactionsMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: "debit", amount: 5000 }),
        expect.objectContaining({ type: "credit", amount: 5000 }),
      ])
    );
  });

  it("hides Sync Cloud button when all transactions are synced", async () => {
    const resyncMock = vi.fn().mockResolvedValue({ totalChecked: 5, unsyncedFound: 0, syncedCount: 0 });
    const mockState = {
      bankAccounts: [
        { id: "bank-1", bankName: "HDFC Bank", type: "Savings", balance: 10000, owner: "self" },
      ],
      transactions: [{ id: "t1", amount: 1000, type: "debit", date: "2026-09-27", accountId: "bank-1" }],
    };

    const container = await mount(
      <PrivacyProvider>
        <BanksTab
          state={mockState}
          resyncTransactions={resyncMock}
          isResyncingTxns={false}
          unsyncedTxnIds={new Set()}
          activeProfile="self"
        />
      </PrivacyProvider>
    );

    const syncBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Sync Cloud")
    );
    expect(syncBtn).toBeUndefined();
  });

  it("renders Sync Cloud button only when unsynced transactions exist and calls resyncTransactions", async () => {
    const resyncMock = vi.fn().mockResolvedValue({ totalChecked: 5, unsyncedFound: 1, syncedCount: 1 });
    const mockState = {
      bankAccounts: [
        { id: "bank-1", bankName: "HDFC Bank", type: "Savings", balance: 10000, owner: "self" },
      ],
      transactions: [{ id: "t-unsynced", amount: 1200, type: "debit", date: "2026-09-27", accountId: "bank-1", note: "Grocery" }],
    };

    const container = await mount(
      <PrivacyProvider>
        <BanksTab
          state={mockState}
          resyncTransactions={resyncMock}
          isResyncingTxns={false}
          unsyncedTxnIds={new Set(["t-unsynced"])}
          activeProfile="self"
        />
      </PrivacyProvider>
    );

    const syncBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Sync Cloud (1 Pending)")
    );
    expect(syncBtn).toBeDefined();

    await act(async () => {
      syncBtn?.click();
    });

    expect(resyncMock).toHaveBeenCalledTimes(1);
  });

  it("sorts Link to Credit Card dropdown options alphabetically from A to Z", async () => {
    const mockState = {
      bankAccounts: [
        { id: "bank-1", bankName: "HDFC Bank", type: "Savings", balance: 10000, owner: "self" },
      ],
      creditCards: [
        { id: "cc-sbi", issuer: "SBI SimplyCLICK", last4: "1111", outstanding: 5000, status: "active" },
        { id: "cc-axis", issuer: "Axis Bank Atlas", last4: "2222", outstanding: 12000, status: "active" },
        { id: "cc-hsbc", issuer: "HSBC Cashback", last4: "0838", outstanding: -923, status: "active" },
        { id: "cc-hdfc", issuer: "HDFC Regalia Gold", last4: "4444", outstanding: 3000, status: "active" },
      ],
      transactions: [],
    };

    const container = await mount(
      <PrivacyProvider>
        <BanksTab
          state={mockState}
          addItem={vi.fn()}
          showToast={vi.fn()}
          activeProfile="self"
        />
      </PrivacyProvider>
    );

    const recordBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Record Transaction")
    );
    await act(async () => {
      recordBtn?.click();
    });

    // Select category "Credit Card"
    const selects = Array.from(document.body.querySelectorAll("select"));
    const categorySelect = selects.find((s) =>
      Array.from(s.options).some((o) => o.value === "Credit Card")
    );
    expect(categorySelect).toBeDefined();

    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(categorySelect, "Credit Card");
      categorySelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Find the Link to Credit Card select dropdown
    const linkSelect = Array.from(document.body.querySelectorAll("select")).find((s) =>
      Array.from(s.options).some((o) => o.value.startsWith("creditCards:"))
    );
    expect(linkSelect).toBeDefined();

    const ccOptionLabels = Array.from(linkSelect!.options)
      .filter((o) => o.value.startsWith("creditCards:"))
      .map((o) => o.textContent?.trim() || "");

    expect(ccOptionLabels).toHaveLength(4);
    expect(ccOptionLabels[0]).toContain("Axis Bank Atlas");
    expect(ccOptionLabels[1]).toContain("HDFC Regalia Gold");
    expect(ccOptionLabels[2]).toContain("HSBC Cashback");
    expect(ccOptionLabels[3]).toContain("SBI SimplyCLICK");
  });
});



