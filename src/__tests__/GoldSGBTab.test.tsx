import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoldSGBTab } from "../components/tabs/GoldSGBTab";
import { PrivacyProvider } from "../context/PrivacyContext";

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div className="recharts-responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Legend: () => <div />,
}));

const mockState = {
  settings: {
    goldPricePerGram: 7500,
  },
  goldHoldings: [
    {
      id: "gold-1",
      name: "Tanishq 22K Bangle",
      type: "physical",
      grams: 20,
      grossGrams: 22,
      purity: "22K",
      purchasePrice: 120000,
      purchaseDate: "2023-01-15",
      vaultLocation: "HDFC Locker #42",
      hallmarkUid: "HUID982134",
      owner: "self",
    },
    {
      id: "sgb-1",
      name: "SGB 2020-21 Series I",
      type: "sgb",
      grams: 50,
      purchasePrice: 231950, // 50 * 4639
      purchaseDate: "2020-04-28",
      maturityDate: "2028-04-28",
      interestRate: 2.5,
      owner: "self",
    },
    {
      id: "etf-1",
      name: "Nippon India Gold ETF",
      type: "etf",
      grams: 10,
      purchasePrice: 70000,
      purchaseDate: "2024-01-10",
      owner: "self",
    },
  ],
};

describe("GoldSGBTab UI/UX Suite", () => {
  const mockAddItem = vi.fn();
  const mockRemoveItem = vi.fn();
  const mockUpdateItem = vi.fn();
  const mockUpdateSettings = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (customState = mockState) => {
    return render(
      <PrivacyProvider>
        <GoldSGBTab
          state={customState}
          addItem={mockAddItem}
          removeItem={mockRemoveItem}
          updateItem={mockUpdateItem}
          updateSettings={mockUpdateSettings}
          showToast={mockShowToast}
        />
      </PrivacyProvider>
    );
  };

  it("renders the redesigned Gold & SGB Portfolio tab with executive cockpit and live rate info", () => {
    const { container } = renderComponent();

    expect(container.textContent).toContain("Gold & SGB Portfolio");
    expect(container.textContent).toContain("Precious Metals & Gold Portfolio Valuation");
    expect(container.textContent).toContain("24K Fine Gold");
    expect(container.textContent).toContain("Overview & Analytics");
    expect(container.textContent).toContain("SGB Hub & Radar");
    expect(container.textContent).toContain("Physical & Locker");
    expect(container.textContent).toContain("Master Ledger");
    expect(container.textContent).toContain("8-Yr Returns Simulator");
    expect(container.textContent).toContain("Budget 2024 Tax Guide");
  });

  it("displays correct top metrics (weight, valuation, and holdings)", () => {
    const { container } = renderComponent();

    // Total grams: 20 + 50 + 10 = 80.00 grams
    expect(container.textContent).toContain("80.00 grams");

    // Holdings rendered
    expect(container.textContent).toContain("Tanishq 22K Bangle");
    expect(container.textContent).toContain("SGB 2020-21 Series I");
    expect(container.textContent).toContain("Nippon India Gold ETF");
  });

  it("switches to SGB Hub & Radar and displays premature exit eligibility and RBI 2.5% coupon", () => {
    const { container } = renderComponent();

    const sgbTabBtn = screen.getByText(/SGB Hub & Radar/i);
    fireEvent.click(sgbTabBtn);

    expect(container.textContent).toContain("Sovereign Gold Bond (SGB) Strategic Edge");
    expect(container.textContent).toContain("Annual 2.5% RBI Coupon");
    expect(container.textContent).toContain("SGB 2020-21 Series I");
  });

  it("switches to Physical Gold & Locker Vault view with locker location and purity breakdown", () => {
    const { container } = renderComponent();

    const physicalTabBtn = screen.getByText(/Physical & Locker/i);
    fireEvent.click(physicalTabBtn);

    expect(container.textContent).toContain("Tanishq 22K Bangle");
    expect(container.textContent).toContain("HDFC Locker #42");
    expect(container.textContent).toContain("HUID982134");
  });

  it("switches to Master Table Ledger and shows all columns with tabular data", () => {
    const { container } = renderComponent();

    const tableTabBtn = screen.getByText(/Master Ledger/i);
    fireEvent.click(tableTabBtn);

    expect(container.textContent).toContain("Asset Name");
    expect(container.textContent).toContain("Category");
    expect(container.textContent).toContain("Cost Basis");
    expect(container.textContent).toContain("Current Valuation");
  });

  it("switches to 8-Year Returns Simulator and calculates compound returns", () => {
    const { container } = renderComponent();

    const simTabBtn = screen.getByText(/8-Yr Returns Simulator/i);
    fireEvent.click(simTabBtn);

    expect(container.textContent).toContain("SGB vs Physical Gold vs Gold ETF Returns Simulator");
    expect(container.textContent).toContain("Top Compounding Choice");
  });

  it("switches to Budget 2024 Tax Guide and explains Section 47(viic) and 12.5% LTCG", () => {
    const { container } = renderComponent();

    const taxTabBtn = screen.getByText(/Budget 2024 Tax Guide/i);
    fireEvent.click(taxTabBtn);

    expect(container.textContent).toContain("Indian Taxation Guide for Gold & SGBs (Union Budget 2024 Updated)");
    expect(container.textContent).toContain("Section 47(viic)");
  });

  it("opens Add Holding modal and allows creating a new SGB or Physical holding", async () => {
    renderComponent();

    const addBtn = screen.getByText("Add Holding");
    fireEvent.click(addBtn);

    expect(document.body.textContent).toContain("Add Gold / Sovereign Gold Bond Holding");
    expect(document.body.textContent).toContain("Asset Category");
    expect(document.body.textContent).toContain("Holding Name");
    expect(document.body.textContent).toContain("Net Weight");
  });

  it("renders EmptyState when there are no holdings in state", () => {
    const { container } = renderComponent({ settings: { goldPricePerGram: 7500 }, goldHoldings: [] });

    expect(container.textContent).toContain("No Gold or Sovereign Gold Bonds Added");
    expect(container.textContent).toContain("Add First Holding");
  });
});
