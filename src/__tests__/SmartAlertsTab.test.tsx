/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SmartAlertsTab } from "../components/tabs/SmartAlertsTab";

describe("SmartAlertsTab day-count math", () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "Asia/Kolkata"; // UTC+5:30
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = originalTZ;
  });

  it("counts a goal deadline exactly tomorrow as '1 days' away, not '2 days', when checked in the early morning", () => {
    // Bug: `days = Math.ceil((new Date(targetDate).getTime() - now.getTime()) / 86400000)` mixed
    // targetDate's UTC-midnight parse (≈5:30am local in IST) with the real current instant `now`
    // (which carries today's actual time-of-day). Checked at 2am IST, a deadline that is
    // literally tomorrow calendar-wise landed 27.5 real hours away, which Math.ceil rounds up to
    // "2 days" instead of the correct "1 days".
    vi.setSystemTime(new Date(2026, 6, 13, 2, 0, 0)); // 13 Jul 2026, 02:00 local (IST)

    const state = {
      goals: [
        {
          id: "g1",
          name: "Vacation Fund",
          targetDate: "2026-07-14", // exactly tomorrow
          targetAmount: 100000,
          currentAmount: 0,
        },
      ],
    };

    const html = renderToString(<SmartAlertsTab state={state} metrics={{}} />);

    expect(html).toContain('deadline in 1 days');
    expect(html).not.toContain('deadline in 2 days');
  });
});
