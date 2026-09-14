import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { CASImportTab } from "../components/tabs/CASImportTab";

// Mock useMasterData
vi.mock("../utils/masterData", () => ({
  useMasterData: () => ({
    familyProfiles: [
      { id: "self", name: "Anand Mohta", relation: "Self" },
      { id: "spouse", name: "Pooja Mohta", relation: "Spouse" },
    ],
  }),
  formatProfileOption: (p: any) => `${p.name} (${p.relation})`,
}));

// Mock useCasPdfExtract
vi.mock("../hooks/useCasPdfExtract", () => ({
  useCasPdfExtract: (onExtracted: (text: string) => void) => ({
    busy: false,
    error: "",
    setError: vi.fn(),
    fileName: "",
    needsPassword: false,
    passwordIncorrect: false,
    selectFile: vi.fn(),
    submitPassword: vi.fn(),
    cancelPassword: vi.fn(),
  }),
}));

describe("CASImportTab Redesign Suite", () => {
  const mockState = {
    mutualFunds: [
      {
        id: "mf-1",
        name: "HDFC Flexi Cap Fund - Direct Plan - Growth",
        folioNumber: "10845623/91",
        units: "400.000",
        currentNav: "1800.00",
        invested: "600000",
        owner: "self",
      },
    ],
  };

  const mockAddItem = vi.fn().mockResolvedValue(undefined);
  const mockUpdateItem = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the executive header, privacy badge, and workflow stepper", () => {
    render(
      <CASImportTab
        state={mockState}
        addItem={mockAddItem}
        updateItem={mockUpdateItem}
        activeProfile="self"
      />
    );

    expect(screen.getByText(/CAS Import Tracker/i)).toBeDefined();
    expect(screen.getByText(/100% Client-Side Privacy/i)).toBeDefined();
    expect(screen.getByText(/1. Source & Ingest/i)).toBeDefined();
    expect(screen.getByText(/2. Reconcile & Diff/i)).toBeDefined();
    expect(screen.getByText(/3. Portfolio Sync/i)).toBeDefined();
    expect(screen.getByText(/How to get CAS PDF/i)).toBeDefined();
  });

  it("toggles the CAS guide with CAMS and KFintech instructions", () => {
    render(
      <CASImportTab
        state={mockState}
        addItem={mockAddItem}
        updateItem={mockUpdateItem}
        activeProfile="self"
      />
    );

    const guideBtn = screen.getByText(/How to get CAS PDF/i);
    fireEvent.click(guideBtn);

    expect(screen.getByText(/How to Download Official CAS Statements/i)).toBeDefined();
    expect(screen.getAllByText(/CAMS Online/i).length).toBeGreaterThan(0);

    const kfinTab = screen.getByRole("tab", { name: /KFintech/i });
    fireEvent.click(kfinTab);
    expect(screen.getByText(/KFintech Investor Portal/i)).toBeDefined();
  });

  it("loads and parses sample CAS data with one-click button", async () => {
    render(
      <CASImportTab
        state={mockState}
        addItem={mockAddItem}
        updateItem={mockUpdateItem}
        activeProfile="self"
      />
    );

    const loadSampleBtn = screen.getByText(/Load Sample CAS/i);
    fireEvent.click(loadSampleBtn);

    // Verify parsed funds appear in table
    expect(await screen.findByText(/Statement Holdings Reconciler/i)).toBeDefined();
    expect(screen.getAllByText(/HDFC Flexi Cap Fund/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Parag Parikh Flexi Cap Fund/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ICICI Prudential Bluechip Fund/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SBI Small Cap Fund/i).length).toBeGreaterThan(0);

    // Verify analytics cards
    expect(screen.getByText(/Funds Ingested/i)).toBeDefined();
    expect(screen.getByText(/Selected for Import/i)).toBeDefined();
    expect(screen.getByText(/Asset Allocation & Fund House Footprint/i)).toBeDefined();

    // Verify match status detection (HDFC matches folio, others are new)
    expect(screen.getByText(/Folio Match/i)).toBeDefined();
    expect(screen.getAllByText(/New Fund/i).length).toBeGreaterThan(0);
  });

  it("supports search filtering across parsed funds", async () => {
    render(
      <CASImportTab
        state={mockState}
        addItem={mockAddItem}
        updateItem={mockUpdateItem}
        activeProfile="self"
      />
    );

    fireEvent.click(screen.getByText(/Load Sample CAS/i));
    expect(await screen.findByText(/Statement Holdings Reconciler/i)).toBeDefined();

    const searchInput = screen.getByPlaceholderText(/Search scheme, folio, or AMC/i);
    fireEvent.change(searchInput, { target: { value: "Parag Parikh" } });

    // In table, Parag Parikh is visible and ICICI Prudential is not
    const table = screen.getByRole("table");
    expect(within(table).getByText(/Parag Parikh Flexi Cap Fund/i)).toBeDefined();
    expect(within(table).queryByText(/ICICI Prudential Bluechip Fund/i)).toBeNull();
  });

  it("supports status filtering (New Only vs Updates Only)", async () => {
    render(
      <CASImportTab
        state={mockState}
        addItem={mockAddItem}
        updateItem={mockUpdateItem}
        activeProfile="self"
      />
    );

    fireEvent.click(screen.getByText(/Load Sample CAS/i));
    expect(await screen.findByText(/Statement Holdings Reconciler/i)).toBeDefined();

    const table = screen.getByRole("table");

    // Filter to Updates Only (HDFC matches existing)
    const updatesBtn = screen.getByText(/Updates Only/i);
    fireEvent.click(updatesBtn);

    expect(within(table).getByText(/HDFC Flexi Cap Fund/i)).toBeDefined();
    expect(within(table).queryByText(/Parag Parikh Flexi Cap Fund/i)).toBeNull();

    // Filter to New Only
    const newBtn = screen.getByText(/New Only/i);
    fireEvent.click(newBtn);

    expect(within(table).getByText(/Parag Parikh Flexi Cap Fund/i)).toBeDefined();
    expect(within(table).queryByText(/HDFC Flexi Cap Fund/i)).toBeNull();
  });

  it("allows inline editing of parsed fund properties", async () => {
    render(
      <CASImportTab
        state={mockState}
        addItem={mockAddItem}
        updateItem={mockUpdateItem}
        activeProfile="self"
      />
    );

    fireEvent.click(screen.getByText(/Load Sample CAS/i));
    expect(await screen.findByText(/Statement Holdings Reconciler/i)).toBeDefined();

    // Click edit button on first holding
    const editBtns = screen.getAllByLabelText(/Edit holding/i);
    fireEvent.click(editBtns[0]);

    // Check that inline inputs exist
    const numberInputs = screen.getAllByRole("spinbutton");
    expect(numberInputs.length).toBeGreaterThan(0);
  });

  it("executes import and syncs with state correctly", async () => {
    render(
      <CASImportTab
        state={mockState}
        addItem={mockAddItem}
        updateItem={mockUpdateItem}
        activeProfile="self"
      />
    );

    fireEvent.click(screen.getByText(/Load Sample CAS/i));
    expect(await screen.findByText(/Statement Holdings Reconciler/i)).toBeDefined();

    const syncBtn = screen.getByText(/Sync 6 Holdings/i);
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(mockUpdateItem).toHaveBeenCalledWith(
        "mutualFunds",
        "mf-1",
        expect.objectContaining({
          name: expect.stringContaining("HDFC"),
          units: 485.62,
        })
      );
      expect(mockAddItem).toHaveBeenCalled();
    });

    // Check success banner
    expect(screen.getByText(/Portfolio Successfully Synchronized!/i)).toBeDefined();
  });
});
