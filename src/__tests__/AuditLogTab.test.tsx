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

// NOTE: @testing-library/dom (a peer dep of @testing-library/react) is not
// installed in this project, so this file drives the component with plain
// react-dom + jsdom (same approach as CalculatorsTab.test.tsx).

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

describe("AuditLogTab date bucketing", () => {
  it("groups a log entry under 'Today' using the LOCAL calendar day, not the UTC day", async () => {
    // Regression test: created_at is a UTC timestamptz from Supabase. A log written at
    // 1:00 AM IST today is still 7:30 PM UTC on the PREVIOUS calendar day — bucketing by
    // the raw UTC date (old behavior: `created_at.slice(0, 10)`) would file it under
    // "Yesterday" even though, for an IST user, it happened today.
    const now = new Date();
    const localMidnightToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const oneAmLocalToday = new Date(localMidnightToday.getTime() + 60 * 60 * 1000);

    mockLogs = [
      {
        id: "log-1",
        action_type: "ADD",
        description: "Added a fixed deposit",
        created_at: oneAmLocalToday.toISOString(),
        metadata: null,
      },
    ];

    await act(async () => {
      root = createRoot(container);
      root.render(<AuditLogTab session={{ user: { id: "test-user" } }} />);
      // let the fetchLogs() promise chain resolve
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Today");
    expect(container.textContent).not.toContain("Yesterday");
  });
});
