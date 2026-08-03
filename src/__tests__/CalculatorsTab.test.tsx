/* eslint-disable */
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CalculatorsTab } from "../components/tabs/CalculatorsTab";
import { PrivacyProvider } from "../context/PrivacyContext";

// Simple mock for recharts ResponsiveContainer (jsdom has no layout engine, so
// recharts renders nothing useful / can throw on zero-size containers).
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

// NOTE: @testing-library/dom (a peer dep of @testing-library/react) is not
// installed in this project, and this task is scoped to only touch
// CalculatorsTab.tsx + this test file (no package.json changes). So this
// file drives the component with plain react-dom + jsdom instead.

const baseMetrics = {
  netWorth: 1000000,
  monthIncome: 100000,
  monthExpense: 50000,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(
      <PrivacyProvider>
        <CalculatorsTab metrics={baseMetrics} state={{}} />
      </PrivacyProvider>
    );
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

// Finds a "leaf" element (no element children) whose trimmed textContent
// exactly matches `text`. Avoids matching ancestor wrappers whose
// textContent includes descendant text too.
function findByText(text: string): HTMLElement {
  const all = Array.from(container.querySelectorAll<HTMLElement>("*"));
  const matches = all.filter((el) => el.children.length === 0 && el.textContent?.trim() === text);
  if (matches.length === 0) throw new Error(`Text not found: "${text}"`);
  return matches[0];
}

// inpRow(): label <div> and <input> are direct siblings.
function inputForLabel(label: string): HTMLInputElement {
  return findByText(label).nextElementSibling as HTMLInputElement;
}

// sliderRow(): label is a <span> inside a row <div>; the <input type=range>
// is that row div's next sibling.
function sliderForLabel(label: string): HTMLInputElement {
  return findByText(label).parentElement!.nextElementSibling as HTMLInputElement;
}

// Sets a controlled <input>'s value the way a real user interaction would,
// so React's onChange fires (plain `.value = x` does not trigger React).
function setInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function clickButtonWithText(text: string) {
  const btn = findByText(text).closest("button");
  if (!btn) throw new Error(`No <button> ancestor for text "${text}"`);
  act(() => {
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("CalculatorsTab formula correctness", () => {
  it("EMI Calculator: matches the standard EMI formula for a known case (P=1,00,000 @10% for 12 months = ~8,792)", () => {
    // EMI tab is the default active tab.
    setInputValue(inputForLabel("Loan Principal (₹)"), "100000");
    setInputValue(sliderForLabel("Interest Rate"), "10");
    setInputValue(sliderForLabel("Tenure"), "12");

    // Hand-verified: EMI = P*r*(1+r)^n / ((1+r)^n - 1), r = 10/12/100, n = 12
    // => 8791.5887... => rounds (via fmtINRFull) to ₹8,792
    const emiValue = findByText("Monthly EMI Due").nextElementSibling!.textContent;
    expect(emiValue).toBe("₹8,792");
  });

  it("EMI Calculator: does not blow up (NaN/Infinity) at the low end of the rate slider", () => {
    setInputValue(inputForLabel("Loan Principal (₹)"), "120000");
    setInputValue(sliderForLabel("Interest Rate"), "1");
    setInputValue(sliderForLabel("Tenure"), "12");

    const emiValue = findByText("Monthly EMI Due").nextElementSibling!.textContent;
    expect(emiValue).not.toContain("NaN");
    expect(emiValue).not.toContain("Infinity");
  });

  it("FIRE Planner: projects a valid FIRE year (not stuck on N/A) when post-retirement yield exactly equals inflation (real return = 0)", () => {
    clickButtonWithText("FIRE Planner");

    // Bug (fixed): when realPostReturn === (1+postRet)/(1+infl) - 1 === 0,
    // the "Projected FIRE Year" loop computed
    // `(1 - (1+realPostReturn)^-y) / (realPostReturn || 1)`, and with
    // realPostReturn = 0 the numerator is always 0 regardless of the `|| 1`
    // guard, so inflAdjReq collapsed to 0 and the `inflAdjReq > 0` check
    // never passed - the UI was permanently stuck on "N/A" no matter how
    // well funded the plan was. Setting inflation == post-retirement yield
    // triggers this exact edge case.
    setInputValue(sliderForLabel("Inflation Rate"), "6");
    setInputValue(sliderForLabel("Post-Retirement Yield"), "6");

    const projectedYear = findByText("Projected FIRE Year").nextElementSibling!.textContent;
    expect(projectedYear).not.toBe("N/A");
    expect(projectedYear).toMatch(/^\d{4}$/);
  });
});
