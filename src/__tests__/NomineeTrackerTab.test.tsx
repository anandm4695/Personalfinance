/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { NomineeTrackerTab } from "../components/tabs/NomineeTrackerTab";

describe("NomineeTrackerTab Premium UI Statically", () => {
  const mockState = {
    bankAccounts: [
      {
        id: "ba1",
        bankName: "SBI",
        accountNumber: "123456",
        balance: 50000,
        nominee: "Spouse Name",
        nomineeRelation: "Spouse",
      },
    ],
    documents: [
      {
        id: "w1",
        type: "will",
        date: "2026-01-01",
        location: "Home locker",
        witnesses: "Witness A",
        lawyerName: "Lawyer Name",
      },
      {
        id: "c1",
        type: "key_contact",
        name: "CA Name",
        role: "CA",
        phone: "9876543210",
        email: "ca@example.com",
      },
    ],
  };

  it("should render nominee coverage stats, active assets nominee list, will details, and key contacts", () => {
    const html = renderToString(
      <NomineeTrackerTab
        state={mockState}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
      />
    );

    // Verify key titles and card details render correctly
    expect(html).toContain("Will &amp; Nominee Tracker");
    expect(html).toContain("Nominee Coverage Status");
    expect(html).toContain("Assets Covered");
    expect(html).toContain("Without Nominee");
    expect(html).toContain("Value at Risk");
    expect(html).toContain("Search assets, nominees...");
    expect(html).toContain("Will Documents");
    expect(html).toContain("Key Contacts");
  });

  it("groups stocks under their demat account and mutual fund schemes under their folio, instead of listing each individually", () => {
    const state = {
      demat: [{ id: "d1", broker: "Zerodha", dpId: "DP123", nominee: "Spouse Name" }],
      stocks: [
        { id: "s1", dematId: "d1", symbol: "TCS", qty: 10, currentPrice: 3500 },
        { id: "s2", dematId: "d1", symbol: "INFY", qty: 20, currentPrice: 1500 },
      ],
      mutualFunds: [
        {
          id: "m1",
          name: "Mirae Asset Large Cap Fund",
          folioNumber: "12345",
          units: 100,
          currentNav: 90,
          nominee: "Spouse Name",
          nomineeRelation: "Spouse",
        },
        {
          id: "m2",
          name: "Mirae Asset ELSS Fund",
          folioNumber: "12345",
          units: 50,
          currentNav: 40,
        },
      ],
    };

    const html = renderToString(
      <NomineeTrackerTab state={state} addItem={() => {}} removeItem={() => {}} updateItem={() => {}} />
    );

    // One demat account entry, not two separate stock entries
    expect(html).toContain("Zerodha");
    expect(html).not.toContain("TCS");
    expect(html).not.toContain("INFY");

    // One folio-grouped mutual fund entry, not two separate scheme entries
    // (the folio/account identifier itself renders behind privacy masking)
    expect(html).toContain("Mirae Asset Large Cap Fund +1 more");
    expect(html).not.toContain("Mirae Asset ELSS Fund");

    // Both roll-ups inherit an existing nominee assigned on any linked record
    expect(html).toContain("Investments");
    expect((html.match(/No Nominee Assigned/g) || []).length).toBe(0);
  });
});
