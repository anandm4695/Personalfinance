import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, ArrowRight, Eye, EyeOff } from "lucide-react";
import { NAV_GROUPS } from "../../utils/appConstants";

interface CommandKModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string, subTab?: string) => void;
  togglePrivacy?: () => void;
  isPrivacyMode?: boolean;
}

const CMDK_FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Subsequence fuzzy match: a literal substring hit scores highest (earlier
// match position wins ties), falling back to an in-order character
// subsequence match (with a bonus for consecutive runs) so terse queries
// like "invtx" still find "Investments". Returns null on no match at all.
function fuzzyScore(text: string, query: string): number | null {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 0;

  const literalIdx = t.indexOf(q);
  if (literalIdx !== -1) return 1000 - literalIdx;

  let tIdx = 0;
  let score = 0;
  let consecutive = 0;
  for (let i = 0; i < q.length; i++) {
    const foundIdx = t.indexOf(q[i], tIdx);
    if (foundIdx === -1) return null;
    consecutive = foundIdx === tIdx ? consecutive + 1 : 0;
    score += 2 + consecutive;
    tIdx = foundIdx + 1;
  }
  return score;
}

export const CommandKModal: React.FC<CommandKModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  togglePrivacy,
  isPrivacyMode,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Body scroll lock, initial focus, and focus-restore-on-close — same
  // contract as Modal.tsx/ConfirmDialog, which this palette never had
  // despite being a full-screen dialog opened via a global shortcut.
  useEffect(() => {
    if (isOpen) {
      const previouslyFocused = document.activeElement as HTMLElement | null;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        document.body.style.overflow = previousOverflow;
        previouslyFocused?.focus?.();
      };
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Flatten nav items for searching (static — only depends on NAV_GROUPS).
  const allNavItems = useMemo(() => {
    const items: { id: string; label: string; group: string; icon: any; subTab?: string }[] = [];
    NAV_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        items.push({
          id: item.id,
          label: item.label,
          group: group.title,
          icon: item.icon,
        });
        if (item.children) {
          item.children.forEach((child) => {
            items.push({
              id: item.id,
              subTab: child.id,
              label: `${item.label} › ${child.label}`,
              group: group.title,
              icon: child.icon || item.icon,
            });
          });
        }
      });
    });
    return items;
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim();
    if (!q) return allNavItems.slice(0, 10);
    return allNavItems
      .map((item) => {
        const labelScore = fuzzyScore(item.label, q);
        const groupScore = fuzzyScore(item.group, q);
        if (labelScore === null && groupScore === null) return null;
        // Label matches rank above group-only matches.
        const score = Math.max(labelScore ?? -Infinity, (groupScore ?? -Infinity) - 500);
        return { item, score };
      })
      .filter((x): x is { item: (typeof allNavItems)[number]; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);
  }, [allNavItems, query]);

  // Keep the selection in range whenever the result set changes, and reset
  // to the top result whenever the query itself changes.
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        return;
      }
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (filteredItems.length ? (i + 1) % filteredItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) =>
          filteredItems.length ? (i - 1 + filteredItems.length) % filteredItems.length : 0
        );
      } else if (e.key === "Enter") {
        const item = filteredItems[selectedIndex];
        if (item) {
          e.preventDefault();
          onSelectTab(item.id, item.subTab);
          onClose();
        }
      } else if (e.key === "Tab" && containerRef.current) {
        const focusable = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(CMDK_FOCUSABLE_SELECTOR)
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex, onSelectTab]);

  if (!isOpen) return null;

  return (
    <div
      className="cmd-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-cmdk)",
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        paddingLeft: "16px",
        paddingRight: "16px",
        animation: "fadeIn 0.15s ease-out",
      }}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="cmd-modal-container"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "var(--surface-0, #121215)",
          border: "1px solid var(--t-line, rgba(255,255,255,0.12))",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--t-line, rgba(255,255,255,0.08))",
          }}
        >
          <Search size={20} style={{ color: "var(--t-muted, #71717a)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search workspaces, holdings, tax tools, or commands... (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--t-ink, #f4f4f5)",
              fontSize: "15px",
              fontWeight: 500,
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: "6px",
              padding: "4px 8px",
              color: "var(--t-muted)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            ESC
          </button>
        </div>

        {/* Quick Commands & Navigation List */}
        <div style={{ maxHeight: "400px", overflowY: "auto", padding: "12px" }}>
          {!query && (
            <div style={{ padding: "8px 12px 6px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--t-muted)" }}>
              Quick Actions
            </div>
          )}

          {!query && togglePrivacy && (
            <div
              className="cmd-item"
              onClick={() => {
                togglePrivacy();
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              {isPrivacyMode ? <Eye size={16} /> : <EyeOff size={16} />}
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "var(--t-ink)" }}>
                {isPrivacyMode ? "Disable Privacy Mode (Show Amounts)" : "Enable Privacy Mode (Hide Amounts)"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--t-muted)", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px" }}>
                P
              </span>
            </div>
          )}

          <div style={{ padding: "12px 12px 6px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--t-muted)" }}>
            {query ? "Search Results" : "Top Navigation"}
          </div>

          {filteredItems.map((item, idx) => {
            const Icon = item.icon || ArrowRight;
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={`${item.id}-${item.subTab || idx}`}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                className="cmd-item"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  onSelectTab(item.id, item.subTab);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "var(--t-ink)",
                  background: isSelected ? "rgba(99, 102, 241, 0.14)" : "transparent",
                  transition: "background 0.1s ease",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "rgba(99, 102, 241, 0.12)",
                    color: "var(--t-accent, #6366f1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: "11px", color: "var(--t-muted)" }}>{item.group}</div>
                </div>
                <ArrowRight size={14} style={{ color: "var(--t-muted)", opacity: 0.6 }} />
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--t-muted)", fontSize: "14px" }}>
              No matching commands or pages found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(0,0,0,0.2)",
            borderTop: "1px solid var(--t-line, rgba(255,255,255,0.06))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--t-muted)",
          }}
        >
          <div>
            Press <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 5px", borderRadius: "4px", fontSize: "11px" }}>↑</kbd> <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 5px", borderRadius: "4px", fontSize: "11px" }}>↓</kbd> to navigate
          </div>
          <div>Personal Finance AI OS</div>
        </div>
      </div>
    </div>
  );
};
