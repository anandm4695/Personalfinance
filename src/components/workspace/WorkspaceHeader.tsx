import React from "react";
import {
  Search,
  X,
  Sun,
  Moon,
  LogOut,
  CheckCheck,
  Clock,
  Download,
  Bell,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  Settings,
  Command,
  Sparkles,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { formatProfileOption } from "../../utils/masterData";
import { alertDismissKey } from "../../utils/finance";
import { getNavBreadcrumb } from "../../utils/appConstants";
import { getIsDemoMode } from "../../supabaseClient";
import { usePrivacy } from "../../context/PrivacyContext";
import { BrandMark } from "../ui/BrandMark";

const input: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid var(--t-line)",
  background: "var(--t-card-bg)",
  fontFamily: "inherit",
  fontSize: "var(--app-font-size, 14px)",
  color: "var(--t-ink)",
  borderRadius: 10,
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  outline: "none",
};

interface WorkspaceHeaderProps {
  tab: string;
  subTab: string | null;
  setTab: (id: string) => void;
  greeting: { title: string; subtitle?: string };
  search: string;
  setSearch: (v: string) => void;
  showSearch: boolean;
  setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
  searchResults: any[];
  setShowCmdPalette: (v: boolean) => void;
  activeProfile: string;
  setActiveProfile: (v: string) => void;
  familyProfiles: any[];
  showMobileSearch: boolean;
  setShowMobileSearch: React.Dispatch<React.SetStateAction<boolean>>;
  alertsMenuRef: React.RefObject<HTMLDivElement>;
  showAlerts: boolean;
  setShowAlerts: React.Dispatch<React.SetStateAction<boolean>>;
  alerts: any[];
  state: any;
  updateDismissedAlerts: (next: Record<string, number>) => void;
  darkMode: boolean;
  updateSettings: (updates: any) => void;
  exportJSON: () => void;
  profileMenuRef: React.RefObject<HTMLDivElement>;
  showProfileMenu: boolean;
  setShowProfileMenu: React.Dispatch<React.SetStateAction<boolean>>;
  session: any;
  /** Runs the full sign-out sequence (demo vs. real session, state reset) — owned by App.tsx. */
  onSignOut: () => void;
}

/**
 * The app's sticky top bar — extracted verbatim from App.tsx (where it lived
 * as ~1,050 lines of inline JSX with no way to reuse or test it in
 * isolation). Behavior unchanged: demo banner, live search dropdown, profile
 * switcher, alerts panel (snooze/dismiss/clear-all), privacy/theme/export
 * toggles, and account menu. Sign-out is now a passed-in callback instead of
 * inlining Supabase/demo-session logic directly in the JSX.
 */
export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  tab,
  subTab,
  setTab,
  greeting,
  search,
  setSearch,
  showSearch,
  setShowSearch,
  searchResults,
  setShowCmdPalette,
  activeProfile,
  setActiveProfile,
  familyProfiles,
  showMobileSearch,
  setShowMobileSearch,
  alertsMenuRef,
  showAlerts,
  setShowAlerts,
  alerts,
  state,
  updateDismissedAlerts,
  darkMode,
  updateSettings,
  exportJSON,
  profileMenuRef,
  showProfileMenu,
  setShowProfileMenu,
  session,
  onSignOut,
}) => {
  const { privacyMode, setPrivacyMode } = usePrivacy();
  return (
          <header
            className="glass"
            style={{
              borderBottom: `1px solid ${THEME.line}`,
              position: "sticky",
              top: 0,
              zIndex: 40,
              paddingTop: "env(safe-area-inset-top, 0px)",
              // Design tokens already flip their rgba values inside .dark-theme
              // (see styles.css), so this no longer needs to branch on darkMode itself.
              boxShadow: "var(--shadow-sm)",
              backdropFilter: "blur(16px) saturate(180%)",
              WebkitBackdropFilter: "blur(16px) saturate(180%)",
            }}
          >
            {/* Demo mode indicator — sample data in an isolated sandbox, not the user's real account */}
            {getIsDemoMode() && (
              <div
                className="demo-banner"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  padding: "6px 16px",
                  background: `color-mix(in srgb, var(--t-gold) 12%, transparent)`,
                  borderBottom: `1px solid color-mix(in srgb, var(--t-gold) 30%, transparent)`,
                  color: THEME.gold,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  textAlign: "center",
                }}
              >
                <Sparkles size={12} style={{ flexShrink: 0 }} />
                Demo Mode — exploring with sample data in an isolated sandbox
              </div>
            )}
            <div
              className="app-header-bar"
              style={{
                padding: "14px 32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              {/* Mobile logo — shown only on small screens */}
              <BrandMark size={30} className="mobile-only" style={{ flexShrink: 0 }} />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}
              >
                <div
                  className="desktop-only"
                  style={{
                    fontWeight: 800,
                    fontSize: 18,
                    color: THEME.ink,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {greeting.title}
                </div>
                {greeting.subtitle && (
                  <div
                    className="desktop-only"
                    style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}
                  >
                    {greeting.subtitle}
                  </div>
                )}
                {(() => {
                  const crumb = getNavBreadcrumb(tab, subTab || undefined);
                  return crumb ? (
                    <div
                      className="desktop-only"
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                        opacity: 0.75,
                      }}
                    >
                      {crumb}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* GLOBAL SEARCH */}
              <div
                className="header-search"
                style={{ position: "relative", flex: 1, maxWidth: 280, minWidth: 0 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: `color-mix(in srgb, var(--t-line) 40%, transparent)`,
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 10,
                    padding: "8px 12px",
                  }}
                >
                  <Search size={13} style={{ color: THEME.muted, flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search…"
                    aria-label="Search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowSearch(true);
                    }}
                    onFocus={() => setShowSearch(true)}
                    onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 13,
                      color: THEME.ink,
                      fontFamily: "inherit",
                      width: "100%",
                      minWidth: 0,
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setShowSearch(false);
                      }}
                      aria-label="Clear search"
                      title="Clear search"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.muted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        // Padding + negative margin enlarges the tap target to ~36px
                        // (matches .header-icon-btn) without growing the visible icon
                        // or nudging the layout — same trick used in MobileNav.
                        padding: 12,
                        margin: -12,
                        flexShrink: 0,
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                  {!search && (
                    <button
                      type="button"
                      onClick={() => setShowCmdPalette(true)}
                      aria-label="Open command palette"
                      title="Command palette (⌘K)"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 2,
                        border: `1.5px solid ${THEME.line}`,
                        borderRadius: 6,
                        background: "transparent",
                        padding: "2px 6px",
                        fontSize: 10.5,
                        fontWeight: 700,
                        fontFamily: "inherit",
                        color: THEME.muted,
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `color-mix(in srgb, var(--t-accent) 8%, transparent)`;
                        e.currentTarget.style.borderColor = THEME.accent;
                        e.currentTarget.style.color = THEME.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = THEME.line;
                        e.currentTarget.style.color = THEME.muted;
                      }}
                    >
                      <Command size={10} />K
                    </button>
                  )}
                </div>
                {showSearch && search.trim() && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: 0,
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 12,
                      zIndex: 200,
                      boxShadow: "var(--shadow-xl)",
                      overflow: "hidden",
                    }}
                  >
                    {searchResults.length > 0 ? (
                      searchResults.map((r, i) => (
                        <div
                          key={`${r.tab}-${r.name}-${i}`}
                          onMouseDown={() => {
                            setTab(r.tab);
                            setSearch("");
                            setShowSearch(false);
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            borderBottom:
                              i < searchResults.length - 1 ? `1px solid ${THEME.line}` : "none",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = `color-mix(in srgb, var(--t-accent) 5%, transparent)`)
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                              {r.name}
                            </div>
                            <div style={{ fontSize: 11, color: THEME.muted }}>{r.type}</div>
                          </div>
                          <div style={{ fontSize: 12, color: THEME.accent, flexShrink: 0 }}>
                            {r.detail}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: "16px 14px",
                          textAlign: "center",
                          fontSize: 12.5,
                          color: THEME.muted,
                        }}
                      >
                        No matches for &ldquo;{search}&rdquo; — try a different term.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {/* PROFILE SWITCHER — compact (hidden on mobile) */}
                <select
                  className="desktop-only"
                  style={{
                    ...input,
                    padding: "7px 10px",
                    width: "auto",
                    fontSize: 12,
                    borderRadius: 8,
                    background: "transparent",
                    borderColor: THEME.line,
                    color: THEME.ink,
                    maxWidth: 110,
                  }}
                  value={activeProfile}
                  onChange={(e) => setActiveProfile(e.target.value)}
                  title="Switch profile"
                  aria-label="Switch profile"
                >
                  <option value="all">All</option>
                  {familyProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatProfileOption(p)}
                    </option>
                  ))}
                </select>
                {/* Mobile search toggle — .header-search is hidden below 768px */}
                <button
                  onClick={() => setShowMobileSearch((v) => !v)}
                  className="header-icon-btn mobile-only"
                  aria-label="Search"
                  aria-expanded={showMobileSearch}
                  title="Search"
                >
                  <Search size={15} />
                </button>
                {/* Bell / Alerts */}
                <div ref={alertsMenuRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowAlerts((v) => !v)}
                    className="header-icon-btn"
                    style={{ position: "relative" }}
                    aria-label={`Alerts${alerts.length > 0 ? ` (${alerts.length} unread)` : ""}`}
                    aria-haspopup="true"
                    aria-expanded={showAlerts}
                    title="Alerts"
                  >
                    <Bell size={15} />
                    {alerts.length > 0 && (
                      <span
                        className="notif-badge"
                        style={{ position: "absolute", top: -5, right: -5 }}
                      >
                        {alerts.length > 9 ? "9+" : alerts.length}
                      </span>
                    )}
                  </button>
                  {showAlerts && (
                    <div className="alerts-panel" role="dialog" aria-label="Alerts">
                      <div
                        style={{
                          padding: "14px 16px",
                          borderBottom: `1px solid ${THEME.line}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                          Alerts
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {alerts.length > 0 && (
                            <button
                              className="icon-btn"
                              onClick={() => {
                                const newDismissed = { ...(state.dismissedAlerts || {}) };
                                alerts.forEach((a) => {
                                  newDismissed[alertDismissKey(a.title)] = 253402300799000;
                                });
                                updateDismissedAlerts(newDismissed);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: THEME.muted,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                              title="Clear All"
                              aria-label="Clear all alerts"
                            >
                              <CheckCheck size={14} /> Clear All
                            </button>
                          )}
                          <button
                            className="icon-btn"
                            onClick={() => setShowAlerts(false)}
                            aria-label="Close alerts"
                            title="Close alerts"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: THEME.muted,
                              display: "flex",
                              padding: 4,
                              borderRadius: 6,
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      {alerts.length === 0 ? (
                        <div
                          style={{
                            padding: "24px 16px",
                            textAlign: "center",
                            color: THEME.muted,
                            fontSize: 13,
                          }}
                        >
                          All clear — no alerts right now
                        </div>
                      ) : (
                        <div style={{ maxHeight: 340, overflowY: "auto" }}>
                          {alerts.map((a, i) => (
                            <div
                              key={`${a.tab}-${a.title}-${i}`}
                              className="alert-item"
                              style={{
                                padding: "12px 16px",
                                borderBottom: `1px solid ${THEME.line}`,
                                display: "flex",
                                gap: 10,
                                alignItems: "flex-start",
                                transition: "background 0.15s",
                                position: "relative",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = `color-mix(in srgb, var(--t-accent) 4%, transparent)`)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "transparent")
                              }
                            >
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background:
                                    a.level === "error"
                                      ? THEME.rust
                                      : a.level === "warn"
                                        ? THEME.gold
                                        : THEME.accent,
                                  flexShrink: 0,
                                  marginTop: 4,
                                }}
                              />
                              <div
                                style={{ minWidth: 0, flex: 1, cursor: "pointer" }}
                                onClick={() => {
                                  // Viewing/navigating to an alert must not silently snooze it —
                                  // only the explicit clock/7d/trash controls below dismiss.
                                  setTab(a.tab);
                                  setShowAlerts(false);
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: THEME.ink,
                                    marginBottom: 2,
                                  }}
                                >
                                  {a.title}
                                </div>
                                <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                                  {a.detail}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <button
                                  className="icon-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTab(a.tab);
                                    setShowAlerts(false);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: THEME.muted,
                                    padding: 4,
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title={`Go to ${a.tab}`}
                                  aria-label={`Go to ${a.tab}`}
                                >
                                  <ChevronRight size={14} />
                                </button>
                                <button
                                  className="icon-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateDismissedAlerts({
                                      ...(state.dismissedAlerts || {}),
                                      [alertDismissKey(a.title)]: Date.now() + 24 * 60 * 60 * 1000,
                                    });
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: THEME.muted,
                                    padding: 4,
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Snooze 24h"
                                  aria-label="Snooze alert for 24 hours"
                                >
                                  <Clock size={14} />
                                </button>
                                <button
                                  className="icon-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateDismissedAlerts({
                                      ...(state.dismissedAlerts || {}),
                                      [alertDismissKey(a.title)]: Date.now() + 7 * 24 * 60 * 60 * 1000,
                                    });
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: THEME.muted,
                                    padding: 4,
                                    borderRadius: 6,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    fontFamily: "inherit",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Snooze 7 days"
                                  aria-label="Snooze alert for 7 days"
                                >
                                  7d
                                </button>
                                <button
                                  className="icon-btn danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateDismissedAlerts({
                                      ...(state.dismissedAlerts || {}),
                                      [alertDismissKey(a.title)]: 253402300799000,
                                    });
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: THEME.muted,
                                    padding: 4,
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Dismiss permanently"
                                  aria-label="Dismiss alert permanently"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Privacy toggle */}
                <button
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className="header-icon-btn"
                  aria-label={privacyMode ? "Reveal financial data" : "Hide financial data"}
                  title={privacyMode ? "Unhide data" : "Hide data"}
                  style={privacyMode ? { color: THEME.rust, borderColor: THEME.rust } : {}}
                >
                  {privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>

                {/* Dark mode toggle */}
                <button
                  onClick={() => updateSettings({ darkMode: !darkMode })}
                  className="header-icon-btn"
                  aria-label="Toggle theme"
                  title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                <button
                  onClick={exportJSON}
                  className="header-icon-btn desktop-only"
                  title="Export backup"
                  aria-label="Export backup"
                >
                  <Download size={15} />
                </button>

                {/* Divider — separates utility actions from the account cluster */}
                <div
                  className="desktop-only"
                  aria-hidden="true"
                  style={{
                    width: 1,
                    height: 20,
                    background: THEME.line,
                    margin: "0 4px",
                    flexShrink: 0,
                  }}
                />

                {/* Profile Avatar + Dropdown */}
                <div ref={profileMenuRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowProfileMenu((v) => !v)}
                    title="Profile & Settings"
                    aria-label="Profile & Settings"
                    aria-haspopup="menu"
                    aria-expanded={showProfileMenu}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "50%",
                    }}
                  >
                    {(() => {
                      const avatarUrl = session?.user?.user_metadata?.avatar_url;
                      const profileDisplayName =
                        state.profile?.name && state.profile.name !== "there"
                          ? state.profile.name
                          : "";
                      const name =
                        profileDisplayName ||
                        session?.user?.user_metadata?.full_name ||
                        session?.user?.user_metadata?.name ||
                        (session?.user?.email ? session.user.email.split("@")[0] : "A");
                      const initials = name
                        .split(/[\s.]+/)
                        .map((w: string) => w[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      return avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={name}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: `2px solid ${showProfileMenu ? THEME.accent : THEME.line}`,
                            transition: "border-color 0.15s",
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: `color-mix(in srgb, var(--t-accent) 15%, transparent)`,
                            border: `2px solid ${showProfileMenu ? THEME.accent : THEME.line}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            color: THEME.accent,
                            transition: "border-color 0.15s",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {initials}
                        </div>
                      );
                    })()}
                  </button>

                  {showProfileMenu && (
                    <div
                      role="menu"
                      aria-label="Profile & Settings"
                      className="profile-dropdown-menu"
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "calc(100% + 10px)",
                        width: 240,
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 14,
                        boxShadow: "var(--shadow-xl)",
                        zIndex: 300,
                        overflow: "hidden",
                      }}
                    >
                      {/* User info header */}
                      <div
                        style={{
                          padding: "16px 16px 12px",
                          borderBottom: `1px solid ${THEME.line}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {(() => {
                          const avatarUrl = session?.user?.user_metadata?.avatar_url;
                          const profileDisplayName =
                            state.profile?.name && state.profile.name !== "there"
                              ? state.profile.name
                              : "";
                          const name =
                            profileDisplayName ||
                            session?.user?.user_metadata?.full_name ||
                            session?.user?.user_metadata?.name ||
                            "";
                          const email = session?.user?.email || "";
                          const displayName = name || (email ? email.split("@")[0] : "My Account");
                          const initials = displayName
                            .split(/[\s.]+/)
                            .map((w: string) => w[0])
                            .filter(Boolean)
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();
                          return (
                            <>
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={displayName}
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    border: `2px solid ${THEME.line}`,
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: "50%",
                                    background: `color-mix(in srgb, var(--t-accent) 15%, transparent)`,
                                    border: `2px solid ${THEME.line}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 16,
                                    fontWeight: 800,
                                    color: THEME.accent,
                                    flexShrink: 0,
                                  }}
                                >
                                  {initials}
                                </div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {displayName}
                                </div>
                                {email && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: THEME.muted,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      marginTop: 2,
                                    }}
                                  >
                                    {email}
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      {/* Menu items */}
                      <div style={{ padding: "6px 0" }}>
                        {[
                          {
                            icon: <Settings size={14} />,
                            label: "Settings",
                            action: () => {
                              setTab("settings");
                              setShowProfileMenu(false);
                            },
                            active: tab === "settings",
                          },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={item.action}
                            role="menuitem"
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "9px 16px",
                              background: item.active
                                ? `color-mix(in srgb, var(--t-accent) 8%, transparent)`
                                : "none",
                              border: "none",
                              cursor: "pointer",
                              color: item.active ? THEME.accent : THEME.ink,
                              fontSize: 13,
                              fontWeight: 600,
                              textAlign: "left" as const,
                              transition: "background 0.12s",
                            }}
                            onMouseEnter={(e) => {
                              if (!item.active)
                                e.currentTarget.style.background = `color-mix(in srgb, var(--t-muted) 8%, transparent)`;
                            }}
                            onMouseLeave={(e) => {
                              if (!item.active) e.currentTarget.style.background = "none";
                            }}
                          >
                            <span style={{ color: item.active ? THEME.accent : THEME.muted }}>
                              {item.icon}
                            </span>
                            {item.label}
                          </button>
                        ))}
                        {session && (
                          <>
                            <div
                              style={{ margin: "6px 16px", borderTop: `1px solid ${THEME.line}` }}
                            />
                            <button
                              role="menuitem"
                              onClick={() => {
                                setShowProfileMenu(false);
                                onSignOut();
                              }}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 16px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: THEME.rust,
                                fontSize: 13,
                                fontWeight: 600,
                                textAlign: "left" as const,
                                transition: "background 0.12s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = `color-mix(in srgb, var(--t-rust) 8%, transparent)`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "none";
                              }}
                            >
                              <LogOut size={14} />
                              Sign Out
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile search bar — expands below header when toggled */}
            {showMobileSearch && (
              <div
                className="mobile-only"
                style={{
                  padding: "0 16px 14px",
                  borderTop: `1px solid ${THEME.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: `color-mix(in srgb, var(--t-line) 40%, transparent)`,
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginTop: 12,
                  }}
                >
                  <Search size={13} style={{ color: THEME.muted, flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search…"
                    aria-label="Search"
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 14,
                      color: THEME.ink,
                      fontFamily: "inherit",
                      width: "100%",
                      minWidth: 0,
                    }}
                  />
                  <button
                    onClick={() => {
                      setSearch("");
                      setShowMobileSearch(false);
                    }}
                    aria-label="Close search"
                    title="Close search"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: THEME.muted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      // Enlarge the tap target to ~36px on this touch-only surface
                      // without changing the visible icon size or layout.
                      padding: 11,
                      margin: -11,
                      flexShrink: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
                {search && searchResults.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "var(--surface-0)",
                    }}
                  >
                    {searchResults.map((r, i) => (
                      <div
                        key={`${r.tab}-${r.name}-${i}-mobile`}
                        onClick={() => {
                          setTab(r.tab);
                          setSearch("");
                          setShowMobileSearch(false);
                        }}
                        style={{
                          padding: "12px 14px",
                          cursor: "pointer",
                          borderBottom:
                            i < searchResults.length - 1 ? `1px solid ${THEME.line}` : "none",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>{r.type}</div>
                        </div>
                        <div style={{ fontSize: 12, color: THEME.accent, flexShrink: 0 }}>
                          {r.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {search && searchResults.length === 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: THEME.muted,
                      textAlign: "center",
                      padding: "16px 0",
                    }}
                  >
                    No matches for &ldquo;{search}&rdquo; — try a different term.
                  </div>
                )}
              </div>
            )}
          </header>
  );
};
