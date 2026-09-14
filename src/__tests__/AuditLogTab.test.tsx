/* eslint-disable */
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuditLogTab } from "../components/tabs/AuditLogTab";

// Chainable Supabase query-builder mock: every filter method returns the
// builder itself, and the builder resolves like a Promise (matching how the
// real supabase-js PostgrestFilterBuilder can be `await`-ed directly).
function makeQueryBuilder(result: { data: any[]; error: null }) {
  const builder: any = {};
  ["select", "eq", "gte", "order", "range"].forEach((fn) => {
    builder[fn] = () => builder;
  });
  builder.then = (resolve: any) => resolve(result);
  return builder;
}

let mockLogs: any[] = [];

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: () => makeQueryBuilder({ data: mockLogs, error: null }),
  },
}));

let container: HTMLDivElement;
let root: Root;
let originalTZ: string | undefined;

beforeEach(() => {
  originalTZ = process.env.TZ;
  // Fix the timezone so "today"/"yesterday" bucketing is deterministic.
  process.env.TZ = "Asia/Kolkata"; // IST, UTC+5:30
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container.remove();
  process.env.TZ = originalTZ;
});

describe("AuditLogTab UI & Functionality", () => {
  it("groups a log entry under 'Today' using the LOCAL calendar day, not the UTC day", async () => {
    const now = new Date();
    const localMidnightToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const oneAmLocalToday = new Date(localMidnightToday.getTime() + 60 * 60 * 1000);

    mockLogs = [
      {
        id: "log-1",
        action_type: "ADD_FIXEDDEPOSITS",
        description: "Added a fixed deposit",
        created_at: oneAmLocalToday.toISOString(),
        metadata: { bank: "HDFC Bank", amount: 50000 },
      },
    ];

    await act(async () => {
      root = createRoot(container);
      root.render(<AuditLogTab session={{ user: { id: "test-user" } }} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Today");
    expect(container.textContent).not.toContain("Yesterday");
    expect(container.textContent).toContain("Audit & Activity Log");
    expect(container.textContent).toContain("Immutable Trail");
    expect(container.textContent).toContain("Total Audit Events");
  });

  it("displays executive KPI stats, module badges, and high-impact tags", async () => {
    const now = new Date();
    mockLogs = [
      {
        id: "log-add-1",
        action_type: "ADD_STOCKS",
        description: "Added Reliance Industries shares",
        created_at: now.toISOString(),
        metadata: { symbol: "RELIANCE", qty: 10, buy_price: 2800 },
      },
      {
        id: "log-upd-1",
        action_type: "UPDATE_SETTINGS",
        description: "Updated theme preferences",
        created_at: now.toISOString(),
        metadata: { patch: { darkMode: true } },
      },
      {
        id: "log-del-1",
        action_type: "BULK_DELETE_TRANSACTIONS",
        description: "Deleted 5 duplicate transactions",
        created_at: now.toISOString(),
        metadata: { count: 5 },
      },
    ];

    await act(async () => {
      root = createRoot(container);
      root.render(<AuditLogTab session={{ user: { id: "test-user" } }} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Check KPI Ribbon values
    expect(container.textContent).toContain("Total Audit Events");
    expect(container.textContent).toContain("Additions & Creates");
    expect(container.textContent).toContain("Modifications");
    expect(container.textContent).toContain("High-Impact Deletions");

    // Check High Impact Tag
    expect(container.textContent).toContain("High Impact");

    // Check Module Filter Buttons
    expect(container.textContent).toContain("All Modules");
    expect(container.textContent).toContain("Investments");
    expect(container.textContent).toContain("Banking & Txns");
    expect(container.textContent).toContain("System & Settings");
  });

  it("renders guest mode guidance when offline or session is missing", async () => {
    mockLogs = [];

    await act(async () => {
      root = createRoot(container);
      root.render(<AuditLogTab session={{ user: { id: "offline-user" } }} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Cloud Audit Synchronization Inactive");
  });
});
