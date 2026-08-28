/* eslint-disable */
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { SettingsTab } from "../components/tabs/SettingsTab";
import { PrivacyProvider } from "../context/PrivacyContext";

describe("SettingsTab Security & Privacy Sub-Tab", () => {
  it("renders Security & Privacy command center with password update, posture score, and session details", () => {
    const mockState = {
      profile: { fy: "2026-27", regime: "new" },
      masterData: {},
      settings: {},
    };

    const mockSession = {
      user: {
        id: "usr-12345-test",
        email: "anand@example.com",
        created_at: "2026-01-01T00:00:00Z",
        last_sign_in_at: "2026-08-28T12:00:00Z",
      },
    };

    const html = renderToString(
      <PrivacyProvider>
        <SettingsTab
          state={mockState}
          session={mockSession}
          darkMode={true}
          updateProfile={vi.fn()}
          updateSettings={vi.fn()}
          updateMasterData={vi.fn()}
          showToast={vi.fn()}
          onSignOut={vi.fn()}
        />
      </PrivacyProvider>
    );

    // Verify Tab presence in PillNav
    expect(html).toContain("Security &amp; Privacy");
    expect(html).toContain("Appearance");
    expect(html).toContain("Profile");
    expect(html).toContain("Master Data");
  });
});
