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

  it("handles record transaction saving and calls addItem with correct parameters", async () => {
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

  it("keeps transaction modal open and preserves entered values if save fails", async () => {
    const addItemMock = vi.fn().mockRejectedValue(new Error("Network connection lost"));
    const showToastMock = vi.fn();

    const mockState = {
      bankAccounts: [
        {
          id: "bank-1",
          bankName: "SBI Bank",
          type: "Savings",
          accountNumber: "5678",
          balance: 20000,
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

    const recordBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Record Transaction")
    );
    await act(async () => {
      recordBtn?.click();
    });

    const amountInput = document.body.querySelector('input[type="number"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(amountInput, "7500");
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

    await act(async () => {
      vi.runAllTimers();
    });

    // Modal is still present in document.body
    expect(document.body.textContent).toContain("Record Bank Transaction");

    // The user's typed amount is still preserved
    const preservedInput = document.body.querySelector('input[type="number"]') as HTMLInputElement;
    expect(preservedInput.value).toBe("7500");

    // Error toast was triggered with error explanation
    expect(showToastMock).toHaveBeenCalledWith(
      expect.stringContaining("Failed to save transaction: Network connection lost"),
      "error"
    );
  });
});
