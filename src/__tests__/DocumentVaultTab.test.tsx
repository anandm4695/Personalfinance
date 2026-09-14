/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { DocumentVaultTab } from "../components/tabs/DocumentVaultTab";

describe("DocumentVaultTab Senior UI/UX Redesign", () => {
  const mockEmptyState = {
    documents: [],
    bankAccounts: [],
    vehicles: [],
    lic: [],
    realEstateProperties: [],
  };

  const mockPopulatedState = {
    bankAccounts: [
      { id: "ba1", bankName: "HDFC Bank", accountNumber: "1234567890", balance: 150000 },
    ],
    vehicles: [
      { id: "veh1", make: "Honda", model: "City", registrationNumber: "MH02CB1234" },
    ],
    lic: [
      { id: "lic1", policyName: "Jeevan Anand", policyNumber: "LIC987654", sumAssured: 1000000 },
    ],
    realEstateProperties: [
      { id: "prop1", name: "Palm Grove Apt 402", address: "Mumbai" },
    ],
    documents: [
      {
        id: "doc1",
        name: "Passport - Self",
        category: "Identity",
        subcategory: "Passport",
        documentNumber: "Z9876543",
        issuer: "Ministry of External Affairs",
        issueDate: "2020-01-15",
        expiryDate: "2030-01-14",
        owner: "self",
        location: "Home Safe",
        tags: ["travel", "kyc"],
        notes: "Original kept in fireproof locker",
      },
      {
        id: "doc2",
        name: "HDFC Bank Statement",
        category: "Financial",
        subcategory: "Bank Statement",
        documentNumber: "STMT-2026-Q1",
        issuer: "HDFC Bank",
        issueDate: "2026-03-31",
        expiryDate: "",
        owner: "self",
        linkedAssetType: "bankAccount",
        linkedAsset: "ba1",
        location: "Digital / Soft Copy Only",
      },
      {
        id: "doc3",
        name: "Honda City RC Book",
        category: "Vehicle",
        subcategory: "RC Book (Smart Card)",
        documentNumber: "MH02-2021-9988",
        issuer: "RTO Andheri",
        issueDate: "2021-06-10",
        expiryDate: "2026-09-20", // Expiring soon
        owner: "self",
        linkedAssetType: "vehicle",
        linkedAsset: "veh1",
        location: "Document Binder #1",
      },
      {
        id: "doc4",
        name: "Old PUC Certificate",
        category: "Vehicle",
        subcategory: "PUC Certificate",
        documentNumber: "PUC-9988-OLD",
        issuer: "Authorized Center",
        issueDate: "2025-01-01",
        expiryDate: "2025-07-01", // Expired
        owner: "self",
        location: "Vehicle Glovebox",
      },
      // Ensure Will & Key contact records from NomineeTracker are ignored
      {
        id: "w1",
        type: "will",
        name: "Registered Will",
      },
      {
        id: "kc1",
        type: "key_contact",
        name: "Family Lawyer",
      },
    ],
  };

  it("renders empty state with 7-category preview when no documents exist", () => {
    const html = renderToString(
      <DocumentVaultTab
        state={mockEmptyState}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
      />
    );

    expect(html).toContain("Document Vault &amp; Fortress");
    expect(html).toContain("Digital Fortress is Ready");
    expect(html).toContain("Secure First Document");
    expect(html).toContain("Identity");
    expect(html).toContain("Financial");
    expect(html).toContain("Insurance");
    expect(html).toContain("Property");
    expect(html).toContain("Vehicle");
    expect(html).toContain("Legal");
  });

  it("renders executive metrics, 5-pillar deck navigation, and filtered document cards", () => {
    const html = renderToString(
      <DocumentVaultTab
        state={mockPopulatedState}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
      />
    );

    // Header & Section Title
    expect(html).toContain("Document Vault &amp; Fortress");

    // Key metrics
    expect(html).toContain("Secured Documents");
    expect(html).toContain("Vault Health Rate");
    expect(html).toContain("Attention Required");
    expect(html).toContain("Asset Link Coverage");

    // 5-Pillar Navigation Buttons
    expect(html).toContain("Vault Explorer");
    expect(html).toContain("Expiry &amp; Renewals");
    expect(html).toContain("Asset Link Matrix");
    expect(html).toContain("Family Dossiers");
    expect(html).toContain("Physical Lockers &amp; Storage");

    // Documents (excluding will and key_contact)
    expect(html).toContain("Passport - Self");
    expect(html).toContain("HDFC Bank Statement");
    expect(html).toContain("Honda City RC Book");
    expect(html).not.toContain("Registered Will");
  });
});
