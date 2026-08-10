import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  PieChart,
  TrendingUp,
  Landmark,
  ScrollText,
  FileBarChart,
  Settings as SettingsIcon,
  Shield,
  Layers,
  ChevronLeft,
} from "lucide-react";
import { NAV_GROUPS } from "../../utils/appConstants";

interface WorkspaceSidebarProps {
  activeTab: string;
  activeSubTab?: string;
  onSelectTab: (tabId: string, subTabId?: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  activeTab,
  activeSubTab,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Overview: true,
    "Wealth & Assets": true,
    "Liabilities & Credit": false,
    "Planning & Spends": false,
    "Reports & Tools": false,
    System: false,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      className="workspace-sidebar"
      style={{
        width: isCollapsed ? "64px" : "260px",
        height: "100vh",
        background: "var(--surface-0, #09090b)",
        borderRight: "1px solid var(--t-line, rgba(255, 255, 255, 0.08))",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        zIndex: 30,
        transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        userSelect: "none",
      }}
    >
      {/* App Header Brand */}
      <div
        style={{
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: isCollapsed ? "0" : "0 16px",
          borderBottom: "1px solid var(--t-line, rgba(255, 255, 255, 0.08))",
        }}
      >
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--t-ink, #f4f4f5)", letterSpacing: "-0.01em" }}>
                Finance OS
              </div>
              <div style={{ fontSize: "10px", color: "var(--t-muted, #71717a)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Pro 2026 Edition
              </div>
            </div>
          </div>
        )}

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--t-muted, #71717a)",
              padding: "6px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Navigation Group Items */}
      <div style={{ flex: 1, overflowY: "auto", padding: isCollapsed ? "12px 6px" : "12px 10px" }}>
        {NAV_GROUPS.map((group) => {
          const isOpen = openGroups[group.title] ?? true;

          return (
            <div key={group.title} style={{ marginBottom: "16px" }}>
              {!isCollapsed && (
                <div
                  onClick={() => toggleGroup(group.title)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--t-muted, #71717a)",
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  <span>{group.title}</span>
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </div>
              )}

              {(isOpen || isCollapsed) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                  {group.items.map((item) => {
                    const Icon = item.icon || Layers;
                    const isActive = activeTab === item.id;

                    return (
                      <React.Fragment key={item.id}>
                        <div
                          onClick={() => onSelectTab(item.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: isCollapsed ? "10px 0" : "8px 10px",
                            justifyContent: isCollapsed ? "center" : "flex-start",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? "var(--t-ink, #ffffff)" : "var(--t-muted, #94a3b8)",
                            background: isActive
                              ? "rgba(99, 102, 241, 0.12)"
                              : "transparent",
                            borderLeft: isActive && !isCollapsed ? "3px solid var(--t-accent, #6366f1)" : "3px solid transparent",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Icon
                            size={16}
                            style={{
                              color: isActive ? "var(--t-accent, #6366f1)" : "var(--t-muted, #94a3b8)",
                              flexShrink: 0,
                            }}
                          />
                          {!isCollapsed && (
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.label}
                            </span>
                          )}
                        </div>

                        {/* Child Sub-tabs */}
                        {!isCollapsed && isActive && item.children && (
                          <div style={{ paddingLeft: "26px", display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
                            {item.children.map((child) => {
                              const ChildIcon = child.icon || Layers;
                              const isChildActive = activeSubTab === child.id;

                              return (
                                <div
                                  key={child.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectTab(item.id, child.id);
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: isChildActive ? 600 : 400,
                                    color: isChildActive ? "var(--t-accent, #6366f1)" : "var(--t-muted, #94a3b8)",
                                    background: isChildActive ? "rgba(99, 102, 241, 0.08)" : "transparent",
                                  }}
                                >
                                  <ChildIcon size={13} />
                                  <span>{child.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
