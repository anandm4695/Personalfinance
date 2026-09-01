import { useState, useEffect, useRef } from "react";
import {
  PieChart as PieIcon,
  Landmark,
  TrendingUp,
  CreditCard,
  Menu,
  X,
  ChevronRight,
  Search,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { NAV_GROUPS } from "../../utils/appConstants";

interface MobileNavProps {
  tab: string;
  setTab: (tab: string) => void;
  setSubTab: (subTab: any) => void;
}

const PRIMARY_TABS = [
  { id: "analytics", label: "Home", icon: PieIcon },
  { id: "banks", label: "Banks", icon: Landmark },
  { id: "demat", label: "Stocks", icon: TrendingUp },
  { id: "cc", label: "Credit", icon: CreditCard },
];

const DRAWER_FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function MobileNav({ tab, setTab, setSubTab }: MobileNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const drawerMouseDownOnBackdrop = useRef(false);

  // Body scroll lock, initial focus, and focus-restore-on-close — same
  // contract as Modal.tsx/ConfirmDialog/CommandKModal, which this drawer's
  // own comment already implied ("matching .drawer-backdrop") but never had.
  useEffect(() => {
    if (drawerOpen) {
      const previouslyFocused = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      setTimeout(() => searchInputRef.current?.focus(), 300);
      return () => {
        document.body.style.overflow = "";
        previouslyFocused?.focus?.();
      };
    } else {
      setDrawerSearch("");
      setExpandedGroup(null);
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR)
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  const findActiveLabel = () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.id === tab) return item.label;
        if (item.children) {
          for (const child of item.children) {
            if (child.id === tab) return child.label;
          }
        }
      }
    }
    return tab;
  };

  // Truncate only when the first word of the active label actually exceeds the
  // bottom-nav tab width — a bare `slice(0,6) + "…"` was appending an ellipsis
  // even to short labels like "AI" or "Bills" that never needed truncating.
  const activeLabelShort = () => {
    const word = findActiveLabel().split(" ")[0];
    return word.length > 7 ? `${word.slice(0, 6)}…` : word;
  };

  const navigateTo = (id: string) => {
    setTab(id);
    setSubTab(null);
    setDrawerOpen(false);
  };

  const filteredGroups = drawerSearch.trim()
    ? NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const q = drawerSearch.toLowerCase();
          if (item.label.toLowerCase().includes(q)) return true;
          if (item.children) {
            return item.children.some((c) => c.label.toLowerCase().includes(q));
          }
          return false;
        }),
      })).filter((g) => g.items.length > 0)
    : NAV_GROUPS;

  const isPrimaryActive = PRIMARY_TABS.some((t) => t.id === tab);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" style={{ justifyContent: "space-around" }}>
        {PRIMARY_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => navigateTo(t.id)}
              aria-current={active ? "page" : undefined}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 0",
                color: active ? THEME.accent : THEME.muted,
                fontFamily: "inherit",
                transition: "color 0.2s ease",
                minWidth: 0,
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  background: active
                    ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                    : "transparent",
                  transition: "background 0.2s ease",
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "0.03em",
                  lineHeight: 1,
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}

        {/* More / Menu button */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-current={!isPrimaryActive ? "page" : undefined}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "6px 0",
            color: !isPrimaryActive ? THEME.accent : THEME.muted,
            fontFamily: "inherit",
            transition: "color 0.2s ease",
            minWidth: 0,
            flex: 1,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 36,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: !isPrimaryActive
                ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                : "transparent",
              transition: "background 0.2s ease",
            }}
          >
            <Menu size={18} strokeWidth={!isPrimaryActive ? 2.5 : 1.8} />
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: !isPrimaryActive ? 700 : 500,
              letterSpacing: "0.03em",
              lineHeight: 1,
            }}
          >
            {!isPrimaryActive ? activeLabelShort() : "More"}
          </span>
        </button>
      </nav>

      {/* Full-screen Navigation Drawer */}
      {drawerOpen && (
        <div
          className="mobile-nav-drawer-backdrop"
          onMouseDown={(e) => {
            drawerMouseDownOnBackdrop.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (drawerMouseDownOnBackdrop.current && e.target === e.currentTarget) {
              setDrawerOpen(false);
            }
            drawerMouseDownOnBackdrop.current = false;
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: "var(--z-drawer)",
            background: "rgba(7, 8, 10, 0.72)",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            ref={drawerRef}
            className="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            tabIndex={-1}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "88vh",
              background: "var(--surface-0)",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -8px 32px rgba(15,23,42,0.16)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "mobileDrawerSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Drawer handle */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "10px 0 4px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: "var(--t-line)",
                }}
              />
            </div>

            {/* Drawer header with search */}
            <div
              style={{
                padding: "8px 20px 12px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "color-mix(in srgb, var(--t-line) 50%, transparent)",
                  border: "1.5px solid var(--t-line)",
                  borderRadius: 12,
                  padding: "9px 12px",
                }}
              >
                <Search size={14} style={{ color: THEME.muted, flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search sections…"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 14,
                    color: "var(--t-ink)",
                    fontFamily: "inherit",
                    width: "100%",
                    minWidth: 0,
                  }}
                />
                {drawerSearch && (
                  <button
                    onClick={() => setDrawerSearch("")}
                    aria-label="Clear search"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: THEME.muted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 12,
                      margin: -12,
                      flexShrink: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1.5px solid var(--t-line)",
                  background: "transparent",
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable nav groups */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "4px 16px 120px",
                WebkitOverflowScrolling: "touch",
              }}
              className="no-scrollbar"
            >
              {filteredGroups.map((group) => (
                <div key={group.title} style={{ marginBottom: 20 }}>
                  {/* Group title */}
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: THEME.muted,
                      padding: "0 8px",
                      marginBottom: 8,
                    }}
                  >
                    {group.title}
                  </div>

                  {/* Items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const hasChildren = item.children && item.children.length > 0;
                      const isDirect = (item as any).directChildren;
                      const isActive = isDirect
                        ? item.children?.some((c) => c.id === tab)
                        : tab === item.id;
                      const isExpanded =
                        expandedGroup === item.id ||
                        (drawerSearch.trim() && hasChildren) ||
                        (hasChildren && isActive);

                      return (
                        <div key={item.id}>
                          <button
                            onClick={() => {
                              if (hasChildren) {
                                if (isDirect) {
                                  if (expandedGroup === item.id) {
                                    setExpandedGroup(null);
                                  } else {
                                    setExpandedGroup(item.id);
                                  }
                                } else {
                                  navigateTo(item.id);
                                }
                              } else {
                                navigateTo(item.id);
                              }
                            }}
                            aria-current={isActive && !hasChildren ? "page" : undefined}
                            aria-expanded={hasChildren ? isExpanded : undefined}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "12px 12px",
                              borderRadius: 12,
                              border: "none",
                              background: isActive
                                ? "color-mix(in srgb, var(--t-accent) 10%, transparent)"
                                : "transparent",
                              color: isActive ? THEME.accent : "var(--t-ink)",
                              fontWeight: isActive ? 700 : 500,
                              fontSize: 14,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              textAlign: "left",
                              transition: "background 0.15s ease",
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: isActive
                                  ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)`
                                  : "color-mix(in srgb, var(--t-muted) 8%, transparent)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "background 0.15s ease",
                              }}
                            >
                              <Icon
                                size={16}
                                strokeWidth={isActive ? 2.5 : 2}
                                style={{ color: isActive ? THEME.accent : THEME.muted }}
                              />
                            </div>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {hasChildren && (
                              <ChevronRight
                                size={14}
                                style={{
                                  color: THEME.muted,
                                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                  transition: "transform 0.2s ease",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            {!hasChildren && isActive && (
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: THEME.accent,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </button>

                          {/* Children */}
                          {hasChildren && isExpanded && (
                            <div
                              style={{
                                marginLeft: 24,
                                paddingLeft: 16,
                                borderLeft: `2px solid color-mix(in srgb, var(--t-accent) 20%, transparent)`,
                                marginTop: 2,
                                marginBottom: 4,
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                              }}
                            >
                              {item
                                .children!.filter((child) =>
                                  drawerSearch.trim()
                                    ? child.label.toLowerCase().includes(drawerSearch.toLowerCase())
                                    : true
                                )
                                .map((child) => {
                                  const ChildIcon = child.icon;
                                  const childActive = tab === child.id;
                                  return (
                                    <button
                                      key={child.id}
                                      onClick={() => {
                                        if (isDirect) {
                                          navigateTo(child.id);
                                        } else {
                                          setTab(item.id);
                                          setSubTab(child.id);
                                          setDrawerOpen(false);
                                        }
                                      }}
                                      aria-current={childActive ? "page" : undefined}
                                      style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "none",
                                        background: childActive
                                          ? "color-mix(in srgb, var(--t-accent) 8%, transparent)"
                                          : "transparent",
                                        color: childActive ? THEME.accent : "var(--t-ink)",
                                        fontWeight: childActive ? 700 : 500,
                                        fontSize: 13,
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                        textAlign: "left",
                                        transition: "background 0.15s ease",
                                      }}
                                    >
                                      <ChildIcon
                                        size={14}
                                        strokeWidth={childActive ? 2.5 : 2}
                                        style={{
                                          color: childActive ? THEME.accent : THEME.muted,
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span style={{ flex: 1 }}>{child.label}</span>
                                      {childActive && (
                                        <div
                                          style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: THEME.accent,
                                            flexShrink: 0,
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
                </div>
              ))}

              {filteredGroups.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: THEME.muted,
                  }}
                >
                  <Search size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No sections found</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search term</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
