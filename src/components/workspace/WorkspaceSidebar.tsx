import React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { THEME } from "../../utils/constants";
import { NAV_GROUPS } from "../../utils/appConstants";

interface WorkspaceSidebarProps {
  tab: string;
  subTab: string | null;
  setTab: (id: string) => void;
  setSubTab: (id: string | null) => void;
  sidebarMinimized: boolean;
  setSidebarMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarHovered: boolean;
  setSidebarHovered: (v: boolean) => void;
  isSidebarCompact: boolean;
  collapsedGroups: Record<string, boolean>;
  setCollapsedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

/**
 * The app's persistent left rail — extracted verbatim from App.tsx (where it
 * lived as ~350 lines of inline JSX with no way to reuse or test it in
 * isolation). Behavior is unchanged: same collapse/hover-to-preview
 * mechanics, same NAV_GROUPS-driven rendering, same directChildren handling.
 */
export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  tab,
  subTab,
  setTab,
  setSubTab,
  sidebarMinimized,
  setSidebarMinimized,
  sidebarHovered,
  setSidebarHovered,
  isSidebarCompact,
  collapsedGroups,
  setCollapsedGroups,
}) => {
  return (
        <aside
          className="glass app-sidebar"
          onMouseEnter={() => sidebarMinimized && setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          style={{
            width: isSidebarCompact ? 72 : 280,
            minWidth: isSidebarCompact ? 72 : 280,
            borderRight: `1px solid ${THEME.line}`,
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            transition:
              "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
          }}
        >
          {/* ── Header + Toggle ── */}
          <div
            style={{
              padding: isSidebarCompact ? "16px 0" : "20px 24px 16px",
              position: "relative",
              transition: "padding 0.3s ease",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: isSidebarCompact ? "center" : "flex-start",
              }}
            >
              <img
                src="/logo.png"
                alt="Personal Finance by Anand Mohta"
                style={{
                  width: 40,
                  height: 40,
                  objectFit: "contain",
                  flexShrink: 0,
                  filter: "drop-shadow(0 2px 8px rgba(197,161,82,0.3))",
                }}
              />
              {!isSidebarCompact && (
                <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      color: THEME.ink,
                      lineHeight: 1.2,
                    }}
                  >
                    Personal Finance
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500, marginTop: 1 }}>
                    by Anand Mohta
                  </div>
                </div>
              )}
            </div>

            {/* Toggle arrow button */}
            <button
              onClick={() => {
                setSidebarMinimized((v) => !v);
                setSidebarHovered(false);
              }}
              title={sidebarMinimized ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarMinimized ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                position: "absolute",
                top: 16,
                right: isSidebarCompact ? "50%" : 10,
                transform: isSidebarCompact ? "translateX(50%)" : "none",
                width: 26,
                height: 26,
                borderRadius: 8,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--t-paper)",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.25s ease",
                flexShrink: 0,
                zIndex: 10,
                boxShadow: "var(--shadow-sm)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  `color-mix(in srgb, var(--t-accent) 10%, transparent)`;
                (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.accent;
                (e.currentTarget as HTMLButtonElement).style.color = THEME.accent;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--t-paper)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.line;
                (e.currentTarget as HTMLButtonElement).style.color = THEME.muted;
              }}
            >
              {sidebarMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          <nav
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: isSidebarCompact ? "0 8px" : "0 16px",
              transition: "padding 0.3s ease",
            }}
            className="no-scrollbar"
          >
            {NAV_GROUPS.map((group) => {
              const isCollapsed = collapsedGroups[group.title];
              return (
                <div key={group.title} style={{ marginBottom: 20 }}>
                  {/* Group label — hidden in compact mode */}
                  {!isSidebarCompact && (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.title} section`}
                      onClick={() =>
                        setCollapsedGroups((prev) => ({
                          ...prev,
                          [group.title]: !prev[group.title],
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setCollapsedGroups((prev) => ({
                            ...prev,
                            [group.title]: !prev[group.title],
                          }));
                        }
                      }}
                      className="sidebar-nav-btn"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        padding: "5px 16px",
                        marginBottom: 8,
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.15em",
                          color: THEME.muted,
                        }}
                      >
                        {group.title}
                      </div>
                      <ChevronDown
                        size={14}
                        color={THEME.muted}
                        style={{
                          transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      />
                    </div>
                  )}
                  {/* In compact mode always show icons; in expanded respect collapse state */}
                  {(isSidebarCompact || !isCollapsed) &&
                    group.items.map((t) => {
                      const Icon = t.icon;
                      const hasChildren = t.children && t.children.length > 0;
                      const isDirect = t.directChildren;
                      const active = isDirect
                        ? (t.children?.some((c) => c.id === tab) ?? false)
                        : tab === t.id;
                      return (
                        <div key={t.id}>
                          <button
                            onClick={() => {
                              if (isDirect && hasChildren) {
                                setTab(t.children![0].id);
                                setSubTab(null);
                              } else {
                                setTab(t.id);
                                setSubTab(hasChildren ? t.children![0].id : null);
                              }
                              if (isSidebarCompact) {
                                setSidebarMinimized(false);
                                setSidebarHovered(false);
                              }
                            }}
                            title={isSidebarCompact ? t.label : undefined}
                            aria-label={t.label}
                            aria-current={active ? "page" : undefined}
                            className={`nav-item ${active ? "active" : ""}`}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              background: active
                                ? `color-mix(in srgb, var(--t-accent) 10%, transparent)`
                                : "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: isSidebarCompact ? "10px 0" : "10px 16px",
                              borderRadius: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: isSidebarCompact ? "center" : "flex-start",
                              gap: 12,
                              marginBottom: 4,
                              color: active ? THEME.accent : THEME.muted,
                              fontWeight: active ? 800 : 600,
                              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          >
                            <Icon
                              size={18}
                              strokeWidth={active ? 2.5 : 2}
                              style={{ flexShrink: 0 }}
                            />
                            {!isSidebarCompact && (
                              <>
                                <span
                                  style={{
                                    fontSize: 13.5,
                                    flex: 1,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {t.label}
                                </span>
                                {hasChildren ? (
                                  <ChevronDown
                                    size={13}
                                    style={{
                                      transform: active ? "rotate(0deg)" : "rotate(-90deg)",
                                      transition: "transform 0.2s ease",
                                      opacity: 0.5,
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : (
                                  active && (
                                    <div
                                      style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: THEME.accent,
                                        flexShrink: 0,
                                      }}
                                    />
                                  )
                                )}
                              </>
                            )}
                          </button>

                          {/* ── Sub-items — only in expanded mode ── */}
                          {!isSidebarCompact && hasChildren && active && (
                            <div
                              style={{
                                marginLeft: 18,
                                paddingLeft: 14,
                                borderLeft: `2px solid color-mix(in srgb, var(--t-accent) 22%, transparent)`,
                                marginBottom: 6,
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                              }}
                            >
                              {t.children!.map((child) => {
                                const ChildIcon = child.icon;
                                const childActive = isDirect
                                  ? tab === child.id
                                  : subTab === child.id;
                                return (
                                  <button
                                    key={child.id}
                                    onClick={() => {
                                      if (isDirect) {
                                        setTab(child.id);
                                        setSubTab(null);
                                      } else {
                                        setTab(t.id);
                                        setSubTab(child.id);
                                      }
                                    }}
                                    aria-label={child.label}
                                    aria-current={childActive ? "page" : undefined}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      padding: "7px 10px",
                                      borderRadius: 8,
                                      border: "none",
                                      background: childActive
                                        ? `color-mix(in srgb, var(--t-accent) 8%, transparent)`
                                        : "transparent",
                                      color: childActive ? THEME.accent : THEME.muted,
                                      fontWeight: childActive ? 700 : 500,
                                      cursor: "pointer",
                                      width: "100%",
                                      textAlign: "left",
                                      fontSize: 12.5,
                                      transition: "all 0.15s ease",
                                      fontFamily: "inherit",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <ChildIcon size={13} strokeWidth={childActive ? 2.5 : 2} />
                                    <span style={{ flex: 1 }}>{child.label}</span>
                                    {childActive && (
                                      <div
                                        style={{
                                          width: 4,
                                          height: 4,
                                          borderRadius: "50%",
                                          background: THEME.accent,
                                        }}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </nav>
        </aside>
  );
};
