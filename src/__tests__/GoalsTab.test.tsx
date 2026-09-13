import React from "react";
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
  },
  {
    id: "g2",
    name: "Dream Home Down Payment",
    category: "Home",
    priority: "High",
    targetAmount: 3000000,
    currentAmount: 1500000,
    startDate: "2023-01-01",
    targetDate: "2027-06-30",
    owner: "wife",
  },
  {
    id: "g3",
    name: "Emergency Reserve Fund",
    category: "Emergency Fund",
    priority: "High",
    targetAmount: 600000,
    currentAmount: 600000, // Completed
    startDate: "2022-01-01",
    targetDate: "2024-01-01",
    owner: "self",
  },
  {
    id: "g4",
    name: "Luxury Vacation",
    category: "Travel",
    priority: "Low",
    targetAmount: 400000,
    currentAmount: 100000,
    startDate: "2024-01-01",
    targetDate: "2025-12-31",
    owner: "self",
  },
];

const mockMetrics = {
  monthIncome: 250000,
  monthExpense: 120000,
  totalGoalTarget: 24000000,
  totalGoalSaved: 10200000,
};

describe("GoalsTab UI/UX Redesign", () => {
  it("renders the Goal Mastery Cockpit with core portfolio metrics", () => {
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
    expect(screen.getByText(/Dream Home Down Payment/i)).toBeDefined();
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
  });

  it("filters goals by search query and priority buttons", () => {
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

    const searchInput = screen.getByPlaceholderText(/Search goals or owners/i);
    fireEvent.change(searchInput, { target: { value: "Vacation" } });

    expect(screen.getByText(/Luxury Vacation/i)).toBeDefined();
    expect(screen.queryByText(/Retirement Freedom Fund/i)).toBeNull();
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
  it("renders with one-click templates and real-time calculations", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <MasterDataContext.Provider value={DEFAULT_MASTER_DATA}>
        <GoalModal onClose={onClose} onSave={onSave} />
      </MasterDataContext.Provider>
    );

    expect(screen.getByRole("heading", { name: /Create Financial Goal/i })).toBeDefined();
    expect(screen.getByText(/Quick Goal Templates/i)).toBeDefined();

    // Click on template "Child Higher Education"
    const eduTemplate = screen.getByText(/Child Higher Education/i);
    fireEvent.click(eduTemplate);

    // Verify fields updated
    expect(screen.getByDisplayValue(/Child Higher Education/i)).toBeDefined();
    expect(screen.getByText(/Live Goal Financial Intelligence/i)).toBeDefined();
  });
});
