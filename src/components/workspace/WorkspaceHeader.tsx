import React from "react";
import { Search, Eye, EyeOff, Plus, Bell, Command, Sparkles } from "lucide-react";
import { getNavBreadcrumb } from "../../utils/appConstants";

interface WorkspaceHeaderProps {
  activeTab: string;
  activeSubTab?: string;
  onOpenCmdK: () => void;
  isPrivacyMode: boolean;
  togglePrivacy: () => void;
  onOpenQuickAdd?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  activeTab,
  activeSubTab,
  onOpenCmdK,
  isPrivacyMode,
  togglePrivacy,
  onOpenQuickAdd,
}) => {
  const breadcrumb = getNavBreadcrumb(activeTab, activeSubTab) || "Workspace";

  return (
    <header
      style={{
        height: "60px",
        borderBottom: "1px solid var(--t-line, rgba(255, 255, 255, 0.08))",
        background: "var(--surface-0, rgba(18, 18, 21, 0.85))",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
      }}
    >
      {/* Left: Breadcrumbs & Active Location */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--t-muted, #94a3b8)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Sparkles size={15} style={{ color: "var(--t-accent, #6366f1)" }} />
          <span>{breadcrumb}</span>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* ⌘K Trigger Button */}
        <button
          onClick={onOpenCmdK}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--t-line, rgba(255, 255, 255, 0.08))",
            borderRadius: "8px",
            padding: "6px 12px",
            color: "var(--t-muted, #94a3b8)",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Search size={14} />
          <span>Search or Command...</span>
          <kbd
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "11px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <Command size={10} />K
          </kbd>
        </button>

        {/* Privacy Toggle */}
        <button
          onClick={togglePrivacy}
          title={isPrivacyMode ? "Show monetary amounts" : "Hide monetary amounts"}
          style={{
            background: isPrivacyMode ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--t-line, rgba(255, 255, 255, 0.08))",
            borderRadius: "8px",
            padding: "8px",
            color: isPrivacyMode ? "var(--t-accent, #6366f1)" : "var(--t-muted, #94a3b8)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPrivacyMode ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>

        {/* Quick Add CTA */}
        {onOpenQuickAdd && (
          <button
            onClick={onOpenQuickAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--t-accent, #6366f1)",
              border: "none",
              borderRadius: "8px",
              padding: "6px 14px",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)",
            }}
          >
            <Plus size={16} />
            <span>Quick Action</span>
          </button>
        )}
      </div>
    </header>
  );
};
