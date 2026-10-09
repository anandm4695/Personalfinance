import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalsTab } from "../components/tabs/GoalsTab";
import { GoalModal } from "../components/modals/GoalModal";
import { MasterDataContext, DEFAULT_MASTER_DATA } from "../utils/masterData";

const mockGoals = [
  {
    id: "g1",
    name: "Retirement Freedom Fund",
    category: "Retirement",
    priority: "High",
    targetAmount: 20000000,
    currentAmount: 8000000,
    startDate: "2020-01-01",
    targetDate: "2035-12-31",
    owner: "self",
    goalType: "target",
  },
  {
    id: "g2",
    name: "DPS School Annual Fees (Grade 1-5)",
    category: "Education",
    priority: "High",
    goalType: "recurring",
    recurringFrequency: "yearly",
    installmentsCount: 5,
    amountPerInstallment: 100000,
    installmentsPaid: 1,
    targetAmount: 500000,
    currentAmount: 60000,
    startDate: "2024-04-01",
    nextDueDate: "2025-04-01",
    disbursements: [
      {
        id: "disb-1",
        date: "2024-04-01",
        amount: 100000,
        installmentNumber: 1,
        notes: "Year 1 Fee Paid",
      },
    ],
    owner: "self",
  },
  {
    id: "g3",
    name: "Dream Home Down Payment",
    category: "Home",
    priority: "High",
    targetAmount: 3000000,
    currentAmount: 1500000,
    startDate: "2023-01-01",
    targetDate: "2027-06-30",
    owner: "wife",
    goalType: "target",
  },
  {
    id: "g4",
    name: "Emergency Reserve Fund",
    category: "Emergency Fund",
    priority: "High",
    targetAmount: 600000,
    currentAmount: 600000, // Completed
    startDate: "2022-01-01",
    targetDate: "2024-01-01",
    owner: "self",
    goalType: "target",
  },
  {
    id: "g5",
    name: "Luxury Vacation",
    category: "Travel",
    priority: "Low",
    targetAmount: 400000,
    currentAmount: 100000,
    startDate: "2024-01-01",
    targetDate: "2025-12-31",
    owner: "self",
    goalType: "target",
  },
];

const mockMetrics = {
  monthIncome: 250000,
  monthExpense: 120000,
  totalGoalTarget: 24500000,
  totalGoalSaved: 10260000,
};

describe("GoalsTab UI/UX & Multi-Year Recurring Cash-Flow Support", () => {
  it("renders the Goal Mastery Cockpit with core portfolio metrics including recurring goals", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();

    render(
      <GoalsTab
        state={{ goals: mockGoals }}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        metrics={mockMetrics}
      />
    );

    expect(screen.getByRole("heading", { name: /Financial Goals/i })).toBeDefined();
    expect(screen.getByText(/Goal Mastery Velocity/i)).toBeDefined();
    expect(screen.getByText(/All Goals/i)).toBeDefined();
    expect(screen.getByText(/Retirement Freedom Fund/i)).toBeDefined();
    expect(screen.getByText(/DPS School Annual Fees/i)).toBeDefined();
    expect(screen.getByText(/5-Yr Multi-Year/i)).toBeDefined();
    expect(screen.getByText(/1 of 5 Paid/i)).toBeDefined();
  });

  it("switches between Cards, Roadmap, Priority Matrix, and Table view modes", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();

    render(
      <GoalsTab
        state={{ goals: mockGoals }}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        metrics={mockMetrics}
      />
    );

    // Switch to Roadmap view
    const roadmapBtn = screen.getByTitle(/Milestone Roadmap Timeline/i);
    fireEvent.click(roadmapBtn);
    expect(screen.getByText(/Immediate & Near-Term/i)).toBeDefined();

    // Switch to Priority Matrix view
    const matrixBtn = screen.getByTitle(/Priority Urgency Wealth Matrix/i);
    fireEvent.click(matrixBtn);
    expect(screen.getByText(/Urgent & High Priority/i)).toBeDefined();
    expect(screen.getByText(/Strategic Long-Term Wealth/i)).toBeDefined();

    // Switch to Table view
    const tableBtn = screen.getByTitle(/High-Density Table View/i);
    fireEvent.click(tableBtn);
    expect(screen.getByText(/Goal Name & Owner/i)).toBeDefined();
    expect(screen.getByText(/1\/5 Paid/i)).toBeDefined();
  });

  it("filters goals by structure type (Lump Sum vs Multi-Year Recurring)", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();

    render(
      <GoalsTab
        state={{ goals: mockGoals }}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        metrics={mockMetrics}
      />
    );

    // Click Multi-Year Recurring filter
    const recurringFilterBtn = screen.getByRole("button", { name: /Multi-Year Recurring/i });
    fireEvent.click(recurringFilterBtn);

    expect(screen.getByText(/DPS School Annual Fees/i)).toBeDefined();
    expect(screen.queryByText(/Retirement Freedom Fund/i)).toBeNull();

    // Click Lump Sum filter
    const lumpSumFilterBtn = screen.getByRole("button", { name: /Lump Sum/i });
    fireEvent.click(lumpSumFilterBtn);

    expect(screen.getByText(/Retirement Freedom Fund/i)).toBeDefined();
    expect(screen.queryByText(/DPS School Annual Fees/i)).toBeNull();
  });

  it("handles 1-click quick top-up contribution", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();
    const showToast = vi.fn();

    render(
      <GoalsTab
        state={{ goals: mockGoals }}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        metrics={mockMetrics}
        showToast={showToast}
      />
    );

    // Click +₹10K on one of the active goal cards
    const topUpButtons = screen.getAllByText(/\+₹10K/i);
    expect(topUpButtons.length).toBeGreaterThan(0);
    fireEvent.click(topUpButtons[0]);
    expect(updateItem).toHaveBeenCalledWith("goals", expect.any(String), expect.objectContaining({
      currentAmount: expect.any(Number),
    }));
  });

  it("opens Record Installment Payout modal and logs disbursement for recurring goal", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();
    const showToast = vi.fn();

    render(
      <GoalsTab
        state={{ goals: mockGoals }}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        metrics={mockMetrics}
        showToast={showToast}
      />
    );

    // Click on Record Payout button for the school fee goal
    const recordPayoutBtn = screen.getByText(/Record Payout \(Yr 2\)/i);
    fireEvent.click(recordPayoutBtn);

    expect(screen.getByText(/Record Installment Payout — DPS School Annual Fees/i)).toBeDefined();
    expect(screen.getByText(/Installment #2 of 5/i)).toBeDefined();

    // Submit payment
    const recordBtn = screen.getByRole("button", { name: /^Record Payment$/i });
    fireEvent.click(recordBtn);

    expect(updateItem).toHaveBeenCalledWith(
      "goals",
      "g2",
      expect.objectContaining({
        installmentsPaid: 2,
        disbursements: expect.arrayContaining([
          expect.objectContaining({
            installmentNumber: 2,
            amount: 100000,
          }),
        ]),
      })
    );
  });

  it("opens What-If Simulator modal and interacts with step-up rate", () => {
    const addItem = vi.fn();
    const removeItem = vi.fn();
    const updateItem = vi.fn();

    render(
      <GoalsTab
        state={{ goals: mockGoals }}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        metrics={mockMetrics}
      />
    );

    const simulatorBtn = screen.getByText(/What-If Simulator/i);
    fireEvent.click(simulatorBtn);

    expect(screen.getByText(/Interactive Goal Realization & Step-Up Simulator/i)).toBeDefined();
    expect(screen.getByText(/Annual Step-Up Percentage/i)).toBeDefined();

    const closeBtn = screen.getByText(/Close Simulator/i);
    fireEvent.click(closeBtn);
  });
});

describe("GoalModal UI/UX Redesign", () => {
  it("renders with one-click templates and creates a recurring multi-year goal", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <MasterDataContext.Provider value={DEFAULT_MASTER_DATA}>
        <GoalModal onClose={onClose} onSave={onSave} />
      </MasterDataContext.Provider>
    );

    expect(screen.getByRole("heading", { name: /Create Financial Goal/i })).toBeDefined();
    expect(screen.getByText(/Quick Goal Templates/i)).toBeDefined();

    // Click on template "Child School Annual Fees (5 Years)"
    const schoolTemplate = screen.getByText(/Child School Annual Fees/i);
    fireEvent.click(schoolTemplate);

    // Verify recurring fields populated
    expect(screen.getByDisplayValue(/Child School Annual Fees \(5 Years\)/i)).toBeDefined();
    expect(screen.getByText(/Live Goal Financial Intelligence \(Multi-Year Cash Flow\)/i)).toBeDefined();
    expect(screen.getByText(/Recurring Schedule & Yearly Amounts/i)).toBeDefined();

    // Click create goal
    const createBtn = screen.getByRole("button", { name: /Create Financial Goal/i });
    fireEvent.click(createBtn);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Child School Annual Fees (5 Years)",
        goalType: "recurring",
        installmentsCount: 5,
        amountPerInstallment: 120000,
        targetAmount: 600000,
      })
    );
  });

  it("supports creating a goal with different variable amounts for each year", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <MasterDataContext.Provider value={DEFAULT_MASTER_DATA}>
        <GoalModal onClose={onClose} onSave={onSave} />
      </MasterDataContext.Provider>
    );

    // Switch to Recurring Cash Flow
    const recurringStructureBtn = screen.getByText(/Multi-Year \/ Periodic Cash Flow/i);
    fireEvent.click(recurringStructureBtn);

    // Switch to Variable Schedule Mode
    const variableScheduleBtn = screen.getByRole("button", { name: /Different Amount \/ Year/i });
    fireEvent.click(variableScheduleBtn);

    expect(screen.getByText(/Annual Fee Escalation Hike/i)).toBeDefined();

    // Set Goal Name
    const nameInput = screen.getByPlaceholderText(/e.g. School Annual Fees/i);
    fireEvent.change(nameInput, { target: { value: "Engineering College Tuition" } });

    // Click create
    const createBtn = screen.getByRole("button", { name: /Create Financial Goal/i });
    fireEvent.click(createBtn);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Engineering College Tuition",
        goalType: "recurring",
        schedule: expect.arrayContaining([
          expect.objectContaining({
            installmentNumber: 1,
            amount: expect.any(Number),
          }),
        ]),
      })
    );
  });
});

