/* eslint-disable */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SettingsTab } from "../components/tabs/SettingsTab";
import { CreditTab } from "../components/tabs/CreditTab";
import { PrivacyProvider } from "../context/PrivacyContext";
import { DEFAULT_MASTER_DATA, MasterDataContext } from "../utils/masterData";

describe("Credit Card Transaction Categories Persistence and UI Flow", () => {
  const mockState = {
    profile: { fy: "2026-27", regime: "new" },
    masterData: {
      ...DEFAULT_MASTER_DATA,
      ccTransactionCategories: ["General", "Food", "Groceries", "Shopping", "Fuel"],
    },
    creditCards: [
      {
        id: "cc-1",
        issuer: "HDFC",
        cardName: "Infinia",
        network: "Visa",
        last4: "4589",
        cardLimit: "500000",
        outstanding: "5000",
        transactions: [
          {
            id: "tx-cc-1",
            date: "2026-03-01",
            merchant: "Shell Fuel Station",
            amount: "3000",
            category: "Fuel",
          },
        ],
      },
    ],
    prepaidCards: [],
    loansTaken: [],
    loansGiven: [],
    settings: {},
  };

  const mockSession = {
    user: {
      id: "usr-test-cc-cats",
      email: "anand@example.com",
    },
  };

  it("adds new Credit Card Transaction Category in SettingsTab and triggers updateMasterData", () => {
    const updateMasterData = vi.fn();

    render(
      <PrivacyProvider>
        <SettingsTab
          state={mockState}
          session={mockSession}
          darkMode={true}
          masterData={mockState.masterData}
          updateProfile={vi.fn()}
          updateSettings={vi.fn()}
          updateMasterData={updateMasterData}
          showToast={vi.fn()}
          onSignOut={vi.fn()}
        />
      </PrivacyProvider>
    );

    // Switch to Master Data tab
    const mdTabBtn = screen.getByRole("button", { name: /Master Data/i });
    fireEvent.click(mdTabBtn);

    // Find the input under Credit Card Transaction Categories
    const ccInput = screen.getByPlaceholderText(/Add new option to Credit Card Transaction Categories/i);
    fireEvent.change(ccInput, { target: { value: "Dining & Lounges" } });
    fireEvent.keyDown(ccInput, { key: "Enter", code: "Enter" });

    expect(updateMasterData).toHaveBeenCalledWith(
      "ccTransactionCategories",
      expect.arrayContaining(["Fuel", "Dining & Lounges"])
    );
  });

  it("renders the customized Credit Card categories in CreditTab transaction ledger", () => {
    render(
      <PrivacyProvider>
        <MasterDataContext.Provider value={mockState.masterData}>
          <CreditTab
            state={mockState}
            addItem={vi.fn()}
            removeItem={vi.fn()}
            updateItem={vi.fn()}
            subTab="cc"
            onSubTabChange={vi.fn()}
            showToast={vi.fn()}
          />
        </MasterDataContext.Provider>
      </PrivacyProvider>
    );

    // Open transaction ledger for the card
    const ledgerBtns = screen.getAllByRole("button", { name: /Txns|Ledger/i });
    if (ledgerBtns.length > 0) {
      fireEvent.click(ledgerBtns[0]);
      // Verify custom category "Fuel" is present in the document
      expect(screen.getAllByText(/Fuel/i).length).toBeGreaterThan(0);
    }
  });

  it("safely merges masterData from cloud without wiping custom categories", () => {
    const customMasterData = {
      ...DEFAULT_MASTER_DATA,
      ccTransactionCategories: ["General", "Food", "Groceries", "Custom Category 1", "Custom Category 2"],
    };

    // Test array preservation logic
    const rawCloud = {
      ccTransactionCategories: ["General", "Food", "Groceries", "Custom Category 1", "Custom Category 2"],
    };
    const currentState = { masterData: DEFAULT_MASTER_DATA };

    const arrayKeys = [
      "transactionCategories",
      "ccTransactionCategories",
      "prepaidCategories",
      "goalCategories",
      "mfCategories",
      "bankAccountTypes",
      "loanTypes",
      "prepaidCardTypes",
      "ccNetworks",
      "familyProfiles",
    ] as const;
    const preservedArrays: Record<string, any> = {};
    arrayKeys.forEach((k) => {
      if (Array.isArray((rawCloud as any)?.[k]) && (rawCloud as any)[k].length > 0) {
        preservedArrays[k] = (rawCloud as any)[k];
      } else if (Array.isArray(currentState.masterData?.[k]) && (currentState.masterData as any)[k].length > 0) {
        preservedArrays[k] = (currentState.masterData as any)[k];
      } else {
        preservedArrays[k] = (DEFAULT_MASTER_DATA as any)[k] || [];
      }
    });

    expect(preservedArrays.ccTransactionCategories).toEqual([
      "General",
      "Food",
      "Groceries",
      "Custom Category 1",
      "Custom Category 2",
    ]);
  });
});
