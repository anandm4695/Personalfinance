/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import Auth from "../Auth";

describe("Auth Component UI & Rendering", () => {
  it("renders the redesigned executive layout with brand headline and portfolio preview", () => {
    const onLogin = vi.fn();

    const html = renderToString(
      <Auth onLogin={onLogin} />
    );

    // Brand Panel & Live Preview
    expect(html).toContain("ArthaDrishti");
    expect(html).toContain("Private Wealth Operating System");
    expect(html).toContain("Unify your wealth.");
    expect(html).toContain("Live Portfolio Summary");
    expect(html).toContain("1,48,50,000");
    expect(html).toContain("+18.4% YoY");
    expect(html).toContain("Equities ₹62.3L");

    // Pillars & Security
    expect(html).toContain("Automated Multi-Account Reconciliation");
    expect(html).toContain("Family Entities &amp; Nominee Tracking");
    expect(html).toContain("Zero-Telemetry 256-Bit Vault Security");

    // Form Panel elements
    expect(html).toContain("Sign In");
    expect(html).toContain("Create Account");
    expect(html).toContain("Email address");
    expect(html).toContain("Password");
    expect(html).toContain("Remember my email");
    expect(html).toContain("Forgot password?");
    expect(html).toContain("256-bit Encryption • Zero-Telemetry Privacy • End-to-End Secure");
  });
});
