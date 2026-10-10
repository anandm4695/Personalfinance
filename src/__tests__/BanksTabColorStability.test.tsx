import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BanksTab } from "../components/tabs/BanksTab";
import { PrivacyProvider } from "../context/PrivacyContext";

describe("BanksTab Allocation Bar Color Stability", () => {
  const defaultProps = {
    addItem: () => {},
    addTransactions: () => {},
    removeItem: () => {},
    bulkRemoveTransactions: () => {},
    updateItem: () => {},
    showToast: () => {},
  };

  const accounts = [
    { id: "acc-1", bankName: "Kotak Mahindra Bank", balance: 4080000, isActive: true },
    { id: "acc-2", bankName: "IDFC Bank", balance: 160000, isActive: true },
    { id: "acc-3", bankName: "HDFC Bank", balance: 140000, isActive: true },
    { id: "acc-4", bankName: "Kotak Mahindra Bank", balance: 0, isActive: true },
    { id: "acc-5", bankName: "HDFC Bank", balance: 0, isActive: true },
  ];

  it("maintains deterministic segment colors regardless of bankAccounts array input ordering", () => {
    // Render with order 1
    const { container: container1 } = render(
      <PrivacyProvider>
        <BanksTab state={{ bankAccounts: accounts, transactions: [] }} {...defaultProps} />
      </PrivacyProvider>
    );

    // Get color sequence of segmented bar
    const bars1 = Array.from(
      container1.querySelectorAll('div[title*="Kotak Mahindra Bank"], div[title*="IDFC Bank"], div[title*="HDFC Bank"]')
    ).map((el) => ({
      title: el.getAttribute("title"),
      background: (el as HTMLElement).style.background,
    }));

    // Render with reversed / shuffled order (simulating different login/fetch row orders)
    const shuffledAccounts = [accounts[3], accounts[1], accounts[4], accounts[0], accounts[2]];
    const { container: container2 } = render(
      <PrivacyProvider>
        <BanksTab state={{ bankAccounts: shuffledAccounts, transactions: [] }} {...defaultProps} />
      </PrivacyProvider>
    );

    const bars2 = Array.from(
      container2.querySelectorAll('div[title*="Kotak Mahindra Bank"], div[title*="IDFC Bank"], div[title*="HDFC Bank"]')
    ).map((el) => ({
      title: el.getAttribute("title"),
      background: (el as HTMLElement).style.background,
    }));

    // Both should have identical segment orders and colors
    expect(bars1.length).toBeGreaterThan(0);
    expect(bars1).toEqual(bars2);
  });
});
