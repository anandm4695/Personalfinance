import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RealEstateTab } from "../components/tabs/RealEstateTab";
import { MasterDataContext, DEFAULT_MASTER_DATA } from "../utils/masterData";
import { PrivacyProvider } from "../context/PrivacyContext";

const mockProfiles = [
  { id: "self", name: "Anand Mohta", relation: "Self" },
  { id: "wife", name: "Pooja Mohta", relation: "Spouse" },
];

const mockState = {
  profile: { name: "Anand Mohta", fy: "2024-2025" },
  bankAccounts: [
    { id: "bank-1", bankName: "HDFC Bank", accountNumber: "1234567890", balance: 5000000 },
  ],
  creditCards: [
    { id: "cc-1", cardName: "HDFC Infinia", bank: "HDFC", cardNumber: "4321", outstanding: 50000, transactions: [] },
  ],
  transactions: [],
  realEstateProperties: [
    {
      id: "prop-1",
      name: "Lodha World One Flat 401",
      type: "residential",
      status: "under-construction",
      location: "Lower Parel, Mumbai",
      developerName: "Lodha",
      areaSqft: 2200,
      purchaseDate: "2023-01-15",
      agreementValue: 50000000,
      agreementValuePaid: 30000000,
      stampDuty: 2500000,
      stampDutyPaid: 2500000,
      tdsAmount: 500000,
      tdsValue: 300000,
      marketValue: 60000000,
      owners: [
        { id: "self", sharePct: 60 },
        { id: "wife", sharePct: 40 },
      ],
      owner: "self",
    },
    {
      id: "prop-2",
      name: "DLF Cybercity Office",
      type: "commercial",
      status: "owned",
      location: "Gurgaon",
      developerName: "DLF",
      areaSqft: 1500,
      purchaseDate: "2021-06-10",
      agreementValue: 20000000,
      agreementValuePaid: 20000000,
      stampDuty: 1200000,
      stampDutyPaid: 1200000,
      tdsAmount: 200000,
      tdsValue: 200000,
      marketValue: 28000000,
      owners: [{ id: "self", sharePct: 100 }],
      owner: "self",
    },
  ],
  realEstateDemands: [
    {
      id: "dem-1",
      propertyId: "prop-1",
      demandDate: "2024-03-01",
      dueDate: "2024-03-25",
      milestone: "15th Slab Cast",
      amount: 5000000,
      gstAmount: 250000,
      totalAmount: 5250000,
      status: "pending",
    },
  ],
  realEstatePayments: [
    {
      id: "pay-1",
      propertyId: "prop-1",
      demandId: "dem-1",
      paymentDate: "2024-03-15",
      amount: 3000000,
      paymentMode: "NEFT",
      referenceNumber: "UTR987654321",
      paymentSource: "bank:bank-1",
      linkedTxnId: "txn-1",
      postToAccount: true,
    },
  ],
};

const masterDataValue = {
  ...DEFAULT_MASTER_DATA,
  familyProfiles: mockProfiles,
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <PrivacyProvider>
      <MasterDataContext.Provider value={masterDataValue}>
        {ui}
      </MasterDataContext.Provider>
    </PrivacyProvider>
  );
};

describe("RealEstateTab UI Redesign & Auto-Sync", () => {
  const addItem = vi.fn();
  const removeItem = vi.fn();
  const updateItem = vi.fn();

  it("renders empty state when no properties exist", () => {
    renderWithProviders(
      <RealEstateTab
        state={{ realEstateProperties: [], realEstateDemands: [], realEstatePayments: [] }}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
      />
    );

    expect(screen.getByText(/No Properties In Portfolio Yet/i)).toBeDefined();
    expect(screen.getByText(/Add First Property/i)).toBeDefined();
  });

  it("renders properties and portfolio valuation in Showcase Cards view", () => {
    renderWithProviders(
      <RealEstateTab
        state={mockState}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
      />
    );

    expect(screen.getByText("Lodha World One Flat 401")).toBeDefined();
    expect(screen.getByText("DLF Cybercity Office")).toBeDefined();
    expect(screen.getByText(/Real Estate Asset Valuation/i)).toBeDefined();
  });

  it("switches to Table View and renders all properties in table format", () => {
    renderWithProviders(
      <RealEstateTab
        state={mockState}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
      />
    );

    const tableBtn = screen.getByRole("button", { name: /Portfolio Table/i });
    fireEvent.click(tableBtn);

    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText(/Portfolio Total/i)).toBeDefined();
  });

  it("switches to Demands Roadmap view and shows demand milestones with Pay button", () => {
    renderWithProviders(
      <RealEstateTab
        state={mockState}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
      />
    );

    const roadmapBtn = screen.getByRole("button", { name: /Demands Roadmap/i });
    fireEvent.click(roadmapBtn);

    expect(screen.getByText("15th Slab Cast")).toBeDefined();
    const payBtn = screen.getByRole("button", { name: /Pay Demand/i });
    expect(payBtn).toBeDefined();

    // Clicking Pay Demand opens PaymentModal pre-linked to demand and bank account
    fireEvent.click(payBtn);
    expect(screen.getByText(/Record Payment — Lodha World One Flat 401/i)).toBeDefined();
    expect(screen.getByText(/Auto-Sync to HDFC Bank/i)).toBeDefined();
  });

  it("auto-posts transaction to bank when recording a payment", async () => {
    addItem.mockClear();
    updateItem.mockClear();

    renderWithProviders(
      <RealEstateTab
        state={mockState}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
      />
    );

    const roadmapBtn = screen.getByRole("button", { name: /Demands Roadmap/i });
    fireEvent.click(roadmapBtn);

    const payBtn = screen.getByRole("button", { name: /Pay Demand/i });
    fireEvent.click(payBtn);

    const amountInput = screen.getByPlaceholderText("0");
    fireEvent.change(amountInput, { target: { value: "2250000" } });

    const saveBtn = screen.getByRole("button", { name: /Record Payment & Auto-Sync/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // 1. Adds transaction to bank account
      expect(addItem).toHaveBeenCalledWith(
        "transactions",
        expect.objectContaining({
          accountId: "bank-1",
          amount: 2250000,
          category: "Real Estate",
          type: "debit",
        })
      );
      // 2. Adds realEstatePayment
      expect(addItem).toHaveBeenCalledWith(
        "realEstatePayments",
        expect.objectContaining({
          amount: "2250000",
          propertyId: "prop-1",
          paymentSource: "bank:bank-1",
          postToAccount: true,
        })
      );
      // 3. Updates property agreementValuePaid
      expect(updateItem).toHaveBeenCalledWith(
        "realEstateProperties",
        "prop-1",
        expect.objectContaining({
          agreementValuePaid: 32250000,
        })
      );
    });
  });

  it("switches to Analytics view", () => {
    renderWithProviders(
      <RealEstateTab
        state={mockState}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
      />
    );

    const analyticsBtn = screen.getByRole("button", { name: /Analytics & Allocation/i });
    fireEvent.click(analyticsBtn);

    expect(screen.getByText(/Property Type Allocation/i)).toBeDefined();
    expect(screen.getByText(/Builder \/ Developer Exposure/i)).toBeDefined();
  });

  it("toggles value view between My Net Share and Full Property Value", () => {
    renderWithProviders(
      <RealEstateTab
        state={mockState}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
      />
    );

    const fullValBtn = screen.getByRole("button", { name: /Full Property Value/i });
    fireEvent.click(fullValBtn);
    expect(fullValBtn.className).toContain("active");

    const shareBtn = screen.getByRole("button", { name: /My Net Share/i });
    fireEvent.click(shareBtn);
    expect(shareBtn.className).toContain("active");
  });

  it("opens Add Property modal on click", () => {
    renderWithProviders(
      <RealEstateTab
        state={mockState}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
      />
    );

    const addBtns = screen.getAllByRole("button", { name: /Add Property/i });
    fireEvent.click(addBtns[0]);

    expect(screen.getByText("Add Real Estate Property")).toBeDefined();
    expect(screen.getByPlaceholderText(/Sky Villa/i)).toBeDefined();
  });
});
