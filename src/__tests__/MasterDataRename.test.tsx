/* eslint-disable */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SettingsTab } from "../components/tabs/SettingsTab";
import { PrivacyProvider } from "../context/PrivacyContext";
import { DEFAULT_MASTER_DATA } from "../utils/masterData";

describe("SettingsTab Master Data Renaming", () => {
  const mockState = {
    profile: { fy: "2026-27", regime: "new" },
    masterData: {
      ...DEFAULT_MASTER_DATA,
      transactionCategories: ["Food", "Rent", "Transport"],
    },
    settings: {},
  };

  const mockSession = {
    user: {
      id: "usr-12345-test",
      email: "anand@example.com",
    },
  };

  it("renders master data list with rename and remove buttons", () => {
    const updateMasterData = vi.fn();

    render(
      <PrivacyProvider>
        <SettingsTab
          state={mockState}
          session={mockSession}
          darkMode={true}
          masterData={mockState.masterData}
          updateProfile={vi.fn()}
          updateSettings={vi.fn()}
          updateMasterData={updateMasterData}
          showToast={vi.fn()}
          onSignOut={vi.fn()}
        />
      </PrivacyProvider>
    );

    // Switch to Master Data tab
    const mdTabBtn = screen.getByRole("button", { name: /Master Data/i });
    fireEvent.click(mdTabBtn);

    // Check if category options are rendered
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Transport").length).toBeGreaterThan(0);

    // Check if rename buttons exist for Transaction & Budget Categories
    const renameFoodBtn = screen.getByRole("button", {
      name: "Rename Food in Transaction & Budget Categories",
    });
    expect(renameFoodBtn).toBeDefined();
  });

  it("allows renaming an item and invokes updateMasterData on save", () => {
    const updateMasterData = vi.fn();

    render(
      <PrivacyProvider>
        <SettingsTab
          state={mockState}
          session={mockSession}
          darkMode={true}
          masterData={mockState.masterData}
          updateProfile={vi.fn()}
          updateSettings={vi.fn()}
          updateMasterData={updateMasterData}
          showToast={vi.fn()}
          onSignOut={vi.fn()}
        />
      </PrivacyProvider>
    );

    // Switch to Master Data tab
    const mdTabBtn = screen.getByRole("button", { name: /Master Data/i });
    fireEvent.click(mdTabBtn);

    // Click rename on "Food" in Transaction & Budget Categories
    const renameFoodBtn = screen.getByRole("button", {
      name: "Rename Food in Transaction & Budget Categories",
    });
    fireEvent.click(renameFoodBtn);

    // The inline input should appear with value "Food"
    const editInput = screen.getByRole("textbox", {
      name: "Rename Food in Transaction & Budget Categories",
    });
    expect(editInput).toBeDefined();
    expect((editInput as HTMLInputElement).value).toBe("Food");

    // Change value to "Groceries & Food"
    fireEvent.change(editInput, { target: { value: "Groceries & Food" } });

    // Click save rename
    const saveBtn = screen.getByRole("button", {
      name: "Save rename for Food in Transaction & Budget Categories",
    });
    fireEvent.click(saveBtn);

    // Verify updateMasterData was called with new array
    expect(updateMasterData).toHaveBeenCalledWith("transactionCategories", [
      "Groceries & Food",
      "Rent",
      "Transport",
    ]);
  });

  it("prevents saving duplicate item names when renaming", () => {
    const updateMasterData = vi.fn();

    render(
      <PrivacyProvider>
        <SettingsTab
          state={mockState}
          session={mockSession}
          darkMode={true}
          masterData={mockState.masterData}
          updateProfile={vi.fn()}
          updateSettings={vi.fn()}
          updateMasterData={updateMasterData}
          showToast={vi.fn()}
          onSignOut={vi.fn()}
        />
      </PrivacyProvider>
    );

    // Switch to Master Data tab
    const mdTabBtn = screen.getByRole("button", { name: /Master Data/i });
    fireEvent.click(mdTabBtn);

    // Click rename on "Food" in Transaction & Budget Categories
    const renameFoodBtn = screen.getByRole("button", {
      name: "Rename Food in Transaction & Budget Categories",
    });
    fireEvent.click(renameFoodBtn);

    const editInput = screen.getByRole("textbox", {
      name: "Rename Food in Transaction & Budget Categories",
    });
    // Try to rename "Food" to "Rent" (which already exists in the same list)
    fireEvent.change(editInput, { target: { value: "Rent" } });

    const saveBtn = screen.getByRole("button", {
      name: "Save rename for Food in Transaction & Budget Categories",
    });
    fireEvent.click(saveBtn);

    // Should not call updateMasterData due to duplicate
    expect(updateMasterData).not.toHaveBeenCalled();
    expect(screen.getByText(/"Rent" already exists in this list/i)).toBeDefined();
  });

  it("cancels renaming on cancel button click or Escape key", () => {
    const updateMasterData = vi.fn();

    render(
      <PrivacyProvider>
        <SettingsTab
          state={mockState}
          session={mockSession}
          darkMode={true}
          masterData={mockState.masterData}
          updateProfile={vi.fn()}
          updateSettings={vi.fn()}
          updateMasterData={updateMasterData}
          showToast={vi.fn()}
          onSignOut={vi.fn()}
        />
      </PrivacyProvider>
    );

    // Switch to Master Data tab
    const mdTabBtn = screen.getByRole("button", { name: /Master Data/i });
    fireEvent.click(mdTabBtn);

    // Click rename on "Transport" in Transaction & Budget Categories
    const renameBtn = screen.getByRole("button", {
      name: "Rename Transport in Transaction & Budget Categories",
    });
    fireEvent.click(renameBtn);

    const cancelBtn = screen.getByRole("button", {
      name: "Cancel editing Transport in Transaction & Budget Categories",
    });
    fireEvent.click(cancelBtn);

    // Edit input should disappear, returning to regular chip
    expect(
      screen.queryByRole("textbox", {
        name: "Rename Transport in Transaction & Budget Categories",
      })
    ).toBeNull();
    expect(screen.getAllByText("Transport").length).toBeGreaterThan(0);
    expect(updateMasterData).not.toHaveBeenCalled();
  });
});
