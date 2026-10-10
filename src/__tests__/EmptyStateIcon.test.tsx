import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Heart, Shield } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";

describe("EmptyState Icon Rendering", () => {
  it("correctly renders when icon is passed as a Lucide Component type", () => {
    const { container } = render(
      <EmptyState
        icon={Heart}
        title="No Policies"
        description="Add your first policy"
      />
    );

    // Should render the svg icon
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains("lucide-heart") || svg?.getAttribute("class")?.includes("lucide")).toBe(true);
  });

  it("correctly renders when icon is passed as a React Element", () => {
    const { container } = render(
      <EmptyState
        icon={<Shield data-testid="custom-shield" />}
        title="Protected"
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});
