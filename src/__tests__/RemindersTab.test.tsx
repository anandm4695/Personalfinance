import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RemindersTab } from "../components/tabs/RemindersTab";
import { PrivacyProvider } from "../context/PrivacyContext";

const mockState = {
  creditCards: [
    {
      id: "cc1",
      issuer: "HDFC Bank",
      name: "Infinia",
      outstanding: 45000,
      dueDate: 20,
      status: "active",
      autoPay: false,
    },
    {
      id: "cc2",
      issuer: "ICICI Bank",
      name: "Amazon Pay",
      outstanding: 12000,
      dueDate: 15,
      status: "active",
      autoPay: true,
    },
  ],
  subscriptions: [
    {
      id: "sub1",
      name: "Netflix Premium",
      amount: 649,
      renewalDate: "2026-09-25",
      cycle: "Monthly",
      paused: false,
    },
  ],
  fixedDeposits: [
    {
      id: "fd1",
      bank: "SBI",
      principal: 200000,
      maturityDate: "2026-10-15",
      interestRate: 7.1,
    },
  ],
  bonds: [
    {
      id: "bond1",
      name: "SGB 2026 Series IV",
      faceValue: 150000,
      maturityDate: "2026-11-20",
    },
  ],
  lic: [
    {
      id: "lic1",
      planName: "Jeevan Labh",
      policyNumber: "LIC-12345",
      annualPremium: 54000,
      commencementDate: "2020-09-18",
      policyTerm: "16",
      maturityDate: "2036-09-18",
    },
  ],
  termPlans: [
    {
      id: "term1",
      planName: "ICICI iProtect Smart",
      insurer: "ICICI Prudential",
      annualPremium: 18000,
      commencementDate: "2021-09-22",
      term: "30",
      coverAmount: 10000000,
      expiryDate: "2051-09-22",
    },
  ],
  investmentPlans: [
    {
      id: "inv1",
      planName: "Max Life Guaranteed Wealth",
      insurer: "Max Life",
      annualPremium: 100000,
      commencementDate: "2022-09-30",
      policyTerm: "10",
      expectedMaturityAmount: 2000000,
      maturityDate: "2032-09-30",
    },
  ],
  loansGiven: [
    {
      id: "loan1",
      borrower: "Rahul Sharma",
      outstanding: 50000,
      dueDate: "2026-09-28",
    },
  ],
  rentedProperties: [
    {
      id: "rent1",
      propertyName: "Koramangala Flat",
      monthlyRent: 35000,
      dueDay: "5",
      isActive: true,
      payments: [],
    },
  ],
  rentalProperties: [
    {
      id: "rental1",
      propertyName: "Indiranagar Commercial",
      monthlyRent: 65000,
      dueDay: "10",
      isActive: true,
      receipts: [],
    },
  ],
  reminders: [
    {
      id: "rem1",
      title: "Car Insurance Renewal",
      category: "Vehicle",
      amount: 18500,
      date: "2026-09-20",
      note: "Renew with Royal Sundaram",
      priority: "High",
    },
    {
      id: "rem2",
      title: "Quarterly Advance Tax Installment",
      category: "Tax",
      amount: 45000,
      date: "2026-09-15",
      note: "Pay 2nd installment of FY 2026-27",
    },
  ],
  dismissedAlerts: {},
};

describe("RemindersTab UI/UX Redesign", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    // Mock Notification in global
    (global as any).Notification = {
      permission: "granted",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    };
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      state: mockState,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateItem: vi.fn(),
      showToast: vi.fn(),
    };
    return render(
      <PrivacyProvider>
        <RemindersTab {...defaultProps} {...props} />
      </PrivacyProvider>
    );
  };

  it("renders the redesigned Reminders & Alerts header and executive stat cards", () => {
    renderComponent();

    expect(screen.getByText("Reminders & Alerts")).toBeDefined();
    expect(screen.getByText("Upcoming Alerts")).toBeDefined();
    expect(screen.getByText("Due in ≤7 Days")).toBeDefined();
    expect(screen.getByText("Past Due / Overdue")).toBeDefined();
    expect(screen.getByText("30-Day Outflow")).toBeDefined();
  });

  it("renders 30-day liquidity forecast breakdown", () => {
    renderComponent();

    expect(screen.getByText("30-Day Liquidity Forecast")).toBeDefined();
    expect(screen.getByText("Expected Outflow")).toBeDefined();
    expect(screen.getByText("Net Balance Burden")).toBeDefined();
  });

  it("renders reminders across different categories (Credit Cards, Subscriptions, Rent, Manual, etc.)", () => {
    renderComponent();

    // Check credit card bill
    expect(screen.getByText(/HDFC Bank/i)).toBeDefined();

    // Check subscription
    expect(screen.getByText(/Netflix Premium Renewal/i)).toBeDefined();

    // Check custom manual reminders
    expect(screen.getByText(/Car Insurance Renewal/i)).toBeDefined();
    expect(screen.getByText(/Quarterly Advance Tax Installment/i)).toBeDefined();
  });

  it("switches view modes between Timeline, Categories, and Cash Flow", () => {
    renderComponent();

    // Switch to Categories View
    const categoriesBtn = screen.getByRole("button", { name: /Categories/i });
    fireEvent.click(categoriesBtn);
    expect(screen.getAllByText(/Credit Card/i).length).toBeGreaterThan(0);

    // Switch to Cash Flow View
    const cashFlowBtn = screen.getByRole("button", { name: /Cash Flow/i });
    fireEvent.click(cashFlowBtn);
    expect(screen.getByText(/Upcoming Outflows/i)).toBeDefined();
    expect(screen.getByText(/Upcoming Inflows/i)).toBeDefined();

    // Switch back to Timeline
    const timelineBtn = screen.getByRole("button", { name: /Timeline/i });
    fireEvent.click(timelineBtn);
    expect(timelineBtn).toBeDefined();
  });

  it("filters reminders using search box", () => {
    renderComponent();

    const searchInput = screen.getByLabelText("Search reminders");
    fireEvent.change(searchInput, { target: { value: "Netflix" } });

    expect(screen.getByText(/Netflix Premium Renewal/i)).toBeDefined();
    expect(screen.queryByText(/Quarterly Advance Tax/i)).toBeNull();
  });

  it("filters reminders using flow and urgency pills", () => {
    renderComponent();

    // Filter by Outflows only
    const outflowsBtn = screen.getByRole("button", { name: /Outflows Only/i });
    fireEvent.click(outflowsBtn);

    // Filter by Auto-Pay Only
    const autoPayBtn = screen.getByRole("button", { name: /Auto-Pay Only/i });
    fireEvent.click(autoPayBtn);
    expect(screen.getByText(/Amazon Pay/i)).toBeDefined();
  });

  it("toggles reminder completion and archives it", async () => {
    const showToast = vi.fn();
    renderComponent({ showToast });

    const markDoneButtons = screen.getAllByTitle("Mark as Completed");
    expect(markDoneButtons.length).toBeGreaterThan(0);

    fireEvent.click(markDoneButtons[0]);
    expect(showToast).toHaveBeenCalledWith("Marked as completed ✓", "info");
  });

  it("opens add reminder modal with presets", () => {
    renderComponent();

    const addBtn = screen.getByRole("button", { name: /Add Reminder/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Create Financial Alert & Reminder")).toBeDefined();
    expect(screen.getByText("Car Insurance / PUC")).toBeDefined();

    // Click a preset
    fireEvent.click(screen.getByText("Car Insurance / PUC"));
    const titleInput = screen.getByPlaceholderText(/e.g. Car Insurance Renewal/i);
    expect((titleInput as HTMLInputElement).value).toBe("Car Insurance / PUC");
  });

  it("opens and toggles notification preferences drawer", () => {
    renderComponent();

    const notifBtn = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(notifBtn);

    expect(screen.getByText("Push Notification Center")).toBeDefined();
  });
});
