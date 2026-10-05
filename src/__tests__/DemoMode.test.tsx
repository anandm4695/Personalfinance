import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Auth from "../Auth";
import { getDemoState, DEMO_USER_SESSION, isDemoSession } from "../utils/demoData";

describe("Demo Mode & Dummy Data Suite", () => {
  it("generates a rich, complete dummy state covering all financial modules", () => {
    const demoState = getDemoState();
    expect(demoState).toBeDefined();
    expect(demoState.profile.name).toBe("Aarav");
    expect(demoState.bankAccounts.length).toBeGreaterThan(0);
    expect(demoState.mutualFunds.length).toBeGreaterThan(0);
    expect(demoState.stocks.length).toBeGreaterThan(0);
    expect(demoState.fixedDeposits.length).toBeGreaterThan(0);
    expect(demoState.recurringDeposits.length).toBeGreaterThan(0);
    expect(demoState.bonds.length).toBeGreaterThan(0);
    expect(demoState.ppf.length).toBeGreaterThan(0);
    expect(demoState.epf.length).toBeGreaterThan(0);
    expect(demoState.nps.length).toBeGreaterThan(0);
    expect(demoState.creditCards.length).toBeGreaterThan(0);
    expect(demoState.loansTaken.length).toBeGreaterThan(0);
    expect(demoState.realEstateProperties.length).toBeGreaterThan(0);
    expect(demoState.subscriptions.length).toBeGreaterThan(0);
    expect(demoState.goals.length).toBeGreaterThan(0);
    expect(demoState.income.length).toBeGreaterThan(0);
    expect(demoState.transactions.length).toBeGreaterThan(0);
    expect(demoState.goldHoldings.length).toBeGreaterThan(0);
    expect(demoState.healthInsurance.length).toBeGreaterThan(0);
    expect(demoState.creditScores.length).toBeGreaterThan(0);
    expect(demoState.reminders.length).toBeGreaterThan(0);
    expect(demoState.netWorthHistory.length).toBe(12);
  });

  it("correctly identifies demo sessions via isDemoSession", () => {
    expect(isDemoSession(DEMO_USER_SESSION)).toBe(true);
    expect(isDemoSession({ user: { id: "offline-user" } })).toBe(true);
    expect(isDemoSession({ user: { id: "real-uuid", email: "user@example.com" } })).toBe(false);
    expect(isDemoSession(null)).toBe(false);
  });

  it("renders demo section in Auth component and allows one-click login without credentials", () => {
    const onLoginMock = vi.fn();
    render(<Auth onLogin={onLoginMock} />);

    // Check that Demo section is visible
    expect(screen.getByText(/Explore Interactive Demo/i)).toBeDefined();
    expect(screen.getByText(/No Password/i)).toBeDefined();

    // Click Launch Demo button
    const demoBtn = screen.getByRole("button", { name: /Launch Demo with Dummy Data/i });
    expect(demoBtn).toBeDefined();
    fireEvent.click(demoBtn);

    // Verify onLogin was invoked with demo session
    expect(onLoginMock).toHaveBeenCalledTimes(1);
    expect(onLoginMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "offline-user",
          email: "demo@arthadrishti.internal",
        }),
      })
    );
  });
});
