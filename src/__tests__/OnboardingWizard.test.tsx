/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { OnboardingWizard } from "../components/modals/OnboardingWizard";

describe("OnboardingWizard Component UI", () => {
  it("renders 5-step guided setup with brand header and input fields", () => {
    const html = renderToString(
      <OnboardingWizard
        updateProfile={vi.fn()}
        addItem={vi.fn()}
        updateSettings={vi.fn()}
        updateMasterData={vi.fn()}
        onComplete={vi.fn()}
        showToast={vi.fn()}
      />
    );

    // Verify Brand & Step Headers
    expect(html).toContain("Welcome to ArthaDrishti");
    expect(html).toContain("Guided Wealth Setup");
    expect(html).toContain("Profile");
    expect(html).toContain("Your Full Name");
    expect(html).toContain("Active Financial Year");
    expect(html).toContain("Tax Regime Preference");
    expect(html).toContain("Continue");
  });
});
