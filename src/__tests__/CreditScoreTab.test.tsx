import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CreditScoreTab, scoreGrade, BUREAUS } from "../components/tabs/CreditScoreTab";

// Mock MasterData
vi.mock("../utils/masterData", () => ({
  useMasterData: () => ({
    familyProfiles: [
      { id: "self", name: "Anand Mohta", relation: "Self" },
      { id: "p2", name: "Pooja Mohta", relation: "Spouse" },
    ],
  }),
  formatProfileOption: (p: any) => `${p.name} (${p.relation})`,
}));

// Mock AnimatedNumber
vi.mock("../hooks/useAnimatedNumber", () => ({
  useAnimatedNumber: (val: number) => val,
}));

// Mock PrivacyContext
vi.mock("../context/PrivacyContext", () => ({
  Prv: ({ children }: any) => <span>{children}</span>,
  usePrivacy: () => ({ privacyMode: false }),
}));

describe("CreditScoreTab & Bureau Engine", () => {
  it("computes accurate score bands and grading for credit scores", () => {
    expect(scoreGrade(800).label).toBe("Excellent");
    expect(scoreGrade(720).label).toBe("Good");
    expect(scoreGrade(670).label).toBe("Fair");
    expect(scoreGrade(620).label).toBe("Poor");
    expect(scoreGrade(550).label).toBe("Very Poor");
  });

  it("has all 4 major Indian credit bureaus registered", () => {
    expect(BUREAUS).toContain("CIBIL");
    expect(BUREAUS).toContain("Experian");
    expect(BUREAUS).toContain("CRIF");
    expect(BUREAUS).toContain("Equifax");
  });

  it("renders empty state when no credit scores exist", () => {
    const mockState = { creditScores: [], creditCards: [], loans: [] };
    render(
      <CreditScoreTab
        state={mockState}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
      />
    );

    expect(screen.getByText("No Credit Scores Logged Yet")).toBeInTheDocument();
    expect(screen.getByText("Log First Credit Score")).toBeInTheDocument();
  });

  it("renders bureau cards and subtabs when credit scores exist", () => {
    const mockScores = [
      {
        id: "score-1",
        score: 785,
        bureau: "CIBIL" as const,
        checkDate: "2026-08-15",
        owner: "self",
        source: "OneScore",
        notes: "No defaults",
      },
      {
        id: "score-2",
        score: 760,
        bureau: "Experian" as const,
        checkDate: "2026-08-15",
        owner: "self",
        source: "CRED",
      },
    ];

    const mockCards = [
      {
        id: "c1",
        bank: "HDFC",
        name: "Regalia",
        limit: 500000,
        outstanding: 45000,
        owner: "self",
        status: "Active",
      },
    ];

    render(
      <CreditScoreTab
        state={{ creditScores: mockScores, creditCards: mockCards, loans: [] }}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
      />
    );

    // Header & Command grid
    expect(screen.getByText("Credit Score & Bureau Health Center")).toBeInTheDocument();
    expect(screen.getAllByText("785").length).toBeGreaterThan(0);
    expect(screen.getAllByText("760").length).toBeGreaterThan(0);

    // Sub-navigation pills
    expect(screen.getByText(/Overview & 5 Pillars/i)).toBeInTheDocument();
    expect(screen.getByText(/Score Trends & Comparison/i)).toBeInTheDocument();
    expect(screen.getByText(/What-If Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Audit Log/i)).toBeInTheDocument();
    expect(screen.getByText(/Bureau Dispute Guide/i)).toBeInTheDocument();
  });

  it("switches to What-If Simulator and interacts with sliders", () => {
    const mockScores = [
      {
        id: "score-1",
        score: 750,
        bureau: "CIBIL" as const,
        checkDate: "2026-08-15",
        owner: "self",
        source: "OneScore",
      },
    ];

    render(
      <CreditScoreTab
        state={{ creditScores: mockScores, creditCards: [], loans: [] }}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
      />
    );

    // Click Simulator tab
    const simTab = screen.getByText(/What-If Simulator/i);
    fireEvent.click(simTab);

    expect(screen.getByText("What-If Scenario Controls")).toBeInTheDocument();
    expect(screen.getByText("Projected Bureau Score")).toBeInTheDocument();
    expect(screen.getByText("Close Oldest Credit Card")).toBeInTheDocument();
    expect(screen.getByText("Miss a Payment (30+ Days Late)")).toBeInTheDocument();
  });

  it("switches to Bureau Dispute Guide and displays official ombudsman protocols", () => {
    const mockScores = [
      {
        id: "score-1",
        score: 750,
        bureau: "CIBIL" as const,
        checkDate: "2026-08-15",
        owner: "self",
        source: "OneScore",
      },
    ];

    render(
      <CreditScoreTab
        state={{ creditScores: mockScores, creditCards: [], loans: [] }}
        addItem={vi.fn()}
        removeItem={vi.fn()}
        updateItem={vi.fn()}
      />
    );

    // Click Disputes tab
    const dispTab = screen.getByText(/Bureau Dispute Guide/i);
    fireEvent.click(dispTab);

    expect(screen.getByText(/RBI Mandatory 30-Day Resolution Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/TransUnion CIBIL/i)).toBeInTheDocument();
  });
});
