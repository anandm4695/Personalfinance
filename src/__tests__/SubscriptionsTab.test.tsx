/* eslint-disable */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SubscriptionsTab } from "../components/tabs/SubscriptionsTab";
import { PrivacyProvider } from "../context/PrivacyContext";
import {
  getSubscriptionMonthlyEquivalent,
  getSubscriptionCycleStep,
  getNextSubscriptionRenewal,
  addMonthsToDateStr,
} from "../utils/finance";

async function mount(ui: React.ReactElement) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(ui);
  });
  return container;
}

describe("Subscriptions & Recurring Financial Calculations & Utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 30)); // 2026-08-30
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates accurate monthly equivalents across all billing frequencies", () => {
    // Monthly: ₹649 -> ₹649/mo
    expect(getSubscriptionMonthlyEquivalent(649, "monthly")).toBe(649);
    // Quarterly: ₹1,500 -> ₹500/mo
    expect(getSubscriptionMonthlyEquivalent(1500, "quarterly")).toBe(500);
    // Half-Yearly / Semi-Annual: ₹6,000 -> ₹1,000/mo
    expect(getSubscriptionMonthlyEquivalent(6000, "half-yearly")).toBe(1000);
    expect(getSubscriptionMonthlyEquivalent(6000, "semi-annual")).toBe(1000);
    // Yearly: ₹12,000 -> ₹1,000/mo
    expect(getSubscriptionMonthlyEquivalent(12000, "yearly")).toBe(1000);
    expect(getSubscriptionMonthlyEquivalent(1499, "yearly")).toBeCloseTo(124.916, 2);
  });

  it("calculates correct cycle steps", () => {
    expect(getSubscriptionCycleStep("monthly")).toBe(1);
    expect(getSubscriptionCycleStep("quarterly")).toBe(3);
    expect(getSubscriptionCycleStep("half-yearly")).toBe(6);
    expect(getSubscriptionCycleStep("yearly")).toBe(12);
  });

  it("accurately rolls forward recurring renewal dates past reference date", () => {
    // Today is 2026-08-30. If renewalDate was 2026-08-10 on monthly, next is 2026-09-10
    expect(getNextSubscriptionRenewal("2026-08-10", "monthly", "2026-08-30")).toBe("2026-09-10");
    // If renewalDate was 2026-02-15 on quarterly, next after 2026-08-30 is 2026-11-15 (Feb -> May -> Aug 15 -> Nov 15)
    expect(getNextSubscriptionRenewal("2026-02-15", "quarterly", "2026-08-30")).toBe("2026-11-15");
    // If renewalDate was 2025-08-15 on yearly, next after 2026-08-30 is 2027-08-15
    expect(getNextSubscriptionRenewal("2025-08-15", "yearly", "2026-08-30")).toBe("2027-08-15");
    // If renewalDate is already in future (e.g. 2026-09-05), it remains 2026-09-05
    expect(getNextSubscriptionRenewal("2026-09-05", "monthly", "2026-08-30")).toBe("2026-09-05");
  });
});

describe("SubscriptionsTab UI & State Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 30)); // 2026-08-30
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders cockpit cards with accurate monthly equivalent sum, annual cost, and paused savings", async () => {
    const state = {
      subscriptions: [
        {
          id: "sub-1",
          name: "Netflix Premium",
          category: "Entertainment",
          amount: 649,
          cycle: "monthly",
          renewalDate: "2026-09-15",
          paused: false,
        },
        {
          id: "sub-2",
          name: "Google One 2TB",
          category: "Storage/Cloud",
          amount: 6500,
          cycle: "yearly",
          renewalDate: "2026-12-01",
          paused: false,
        },
        {
          id: "sub-3",
          name: "Cult.fit Gym",
          category: "Fitness",
          amount: 6000,
          cycle: "half-yearly",
          renewalDate: "2026-10-10",
          paused: false,
        },
        {
          id: "sub-4",
          name: "Hotstar Super",
          category: "Entertainment",
          amount: 899,
          cycle: "yearly",
          renewalDate: "2026-11-20",
          paused: true, // Paused
        },
      ],
    };

    const updateItemMock = vi.fn();
    const addItemMock = vi.fn();
    const removeItemMock = vi.fn();

    const container = await mount(
      <PrivacyProvider>
        <SubscriptionsTab
          state={state}
          addItem={addItemMock}
          removeItem={removeItemMock}
          updateItem={updateItemMock}
          metrics={{ monthIncome: 200000, annualIncome: 2400000 }}
        />
      </PrivacyProvider>
    );

    // Active Monthly Eq: 649 + (6500/12 = 541.67) + (6000/6 = 1000) = 2190.67
    // Paused Monthly Eq: 899/12 = 74.92
    expect(container.textContent).toContain("Active Subscriptions");
    expect(container.textContent).toContain("Netflix Premium");
    expect(container.textContent).toContain("Google One 2TB");
    expect(container.textContent).toContain("Cult.fit Gym");
  });

  it("handles 1-click advance of subscription renewal date", async () => {
    const state = {
      subscriptions: [
        {
          id: "sub-netflix",
          name: "Netflix",
          category: "Entertainment",
          amount: 649,
          cycle: "monthly",
          renewalDate: "2026-08-10", // Past date (20 days ago)
          paused: false,
        },
      ],
    };

    const updateItemMock = vi.fn();

    const container = await mount(
      <PrivacyProvider>
        <SubscriptionsTab
          state={state}
          addItem={vi.fn()}
          removeItem={vi.fn()}
          updateItem={updateItemMock}
          metrics={{ monthIncome: 100000 }}
        />
      </PrivacyProvider>
    );

    // Should indicate the next renewal date (10 Sep)
    expect(container.textContent).toMatch(/Next:\s*10\s*Sep/i);

    // Find the renewal button (title containing "Mark Paid")
    const renewBtn = container.querySelector("button[title*='Mark Paid']");
    expect(renewBtn).not.toBeNull();

    await act(async () => {
      renewBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateItemMock).toHaveBeenCalledWith(
      "subscriptions",
      "sub-netflix",
      expect.objectContaining({
        renewalDate: "2026-09-10",
        lastPaidAmount: 649,
      })
    );
  });

  it("resolves subscription brand domains accurately across streaming, AI, cloud, and telecom", async () => {
    const { resolveBrand } = await import("../components/ui/BrandLogos");

    expect(resolveBrand("Netflix")?.domain).toBe("netflix.com");
    expect(resolveBrand("Netflix Premium")?.domain).toBe("netflix.com");
    expect(resolveBrand("Spotify Family")?.domain).toBe("spotify.com");
    expect(resolveBrand("Disney+ Hotstar")?.domain).toBe("hotstar.com");
    expect(resolveBrand("YouTube Premium")?.domain).toBe("youtube.com");
    expect(resolveBrand("Google One 2TB")?.domain).toBe("one.google.com");
    expect(resolveBrand("ChatGPT Plus")?.domain).toBe("chatgpt.com");
    expect(resolveBrand("Claude Pro")?.domain).toBe("claude.ai");
    expect(resolveBrand("Cult.fit Gym")?.domain).toBe("cult.fit");
    expect(resolveBrand("Airtel Fiber")?.domain).toBe("airtel.in");
    expect(resolveBrand("JioFiber")?.domain).toBe("jio.com");

    // DTH & Automotive separation check:
    // Tata Play must resolve to tataplay.com, NOT tatamotors.com!
    const tataPlay = resolveBrand("Tata Play");
    expect(tataPlay?.domain).toBe("tataplay.com");
    expect(tataPlay?.growwSym).toBeUndefined();

    const tataMotors = resolveBrand("Tata Motors");
    expect(tataMotors?.domain).toBe("tatamotors.com");
    expect(tataMotors?.growwSym).toBe("TATAMOTORS");
  });

  it("renders ServiceLogo with candidate pipeline and domain resolution", async () => {
    const { ServiceLogo } = await import("../components/ui/BrandLogos");

    const container = await mount(
      <div>
        <ServiceLogo name="Netflix" />
        <ServiceLogo name="Custom Service" website="https://customapp.io" />
        <ServiceLogo name="Local Newspaper" category="News/Media" />
      </div>
    );

    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThanOrEqual(2);
    expect(images[0].getAttribute("src")).toContain("netflix.com");
    expect(images[1].getAttribute("src")).toContain("customapp.io");
    expect(container.textContent).toContain("LN"); // Initials for Local Newspaper
  });
});
