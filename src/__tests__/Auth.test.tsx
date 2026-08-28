/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import Auth from "../Auth";

describe("Auth Component UI & Rendering", () => {
  it("renders the redesigned executive layout with brand headline and portfolio preview", () => {
    const onLogin = vi.fn();
    const onOffline = vi.fn();

    const html = renderToString(
      <Auth onLogin={onLogin} onOffline={onOffline} />
    );

    // Brand Panel & Live Preview
    expect(html).toContain("ArthaDrishti");
    expect(html).toContain("Private Wealth Operating System");
    expect(html).toContain("Unify your wealth.");
    expect(html).toContain("Live Portfolio Summary");
    expect(html).toContain("1,48,50,000");

    // Form Panel elements
    expect(html).toContain("Sign In");
    expect(html).toContain("Create Account");
    expect(html).toContain("Email address");
    expect(html).toContain("Password");
    expect(html).toContain("Remember my email");
    expect(html).toContain("Forgot password?");
    expect(html).toContain("Open Interactive Sandbox Demo");
    expect(html).toContain("256-bit Encryption");
  });
});
