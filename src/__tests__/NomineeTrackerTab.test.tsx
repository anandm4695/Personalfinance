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
});
