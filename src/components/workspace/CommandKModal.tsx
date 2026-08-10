import React, { useState, useEffect, useRef } from "react";
import { Search, ArrowRight, Eye, EyeOff } from "lucide-react";
import { NAV_GROUPS } from "../../utils/appConstants";

interface CommandKModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string, subTab?: string) => void;
  togglePrivacy?: () => void;
  isPrivacyMode?: boolean;
}

export const CommandKModal: React.FC<CommandKModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  togglePrivacy,
  isPrivacyMode,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Flatten nav items for searching
  const allNavItems: { id: string; label: string; group: string; icon: any; subTab?: string }[] = [];
  NAV_GROUPS.forEach((group) => {
    group.items.forEach((item) => {
      allNavItems.push({
        id: item.id,
        label: item.label,
        group: group.title,
        icon: item.icon,
      });
      if (item.children) {
        item.children.forEach((child) => {
          allNavItems.push({
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

  const filteredItems = query.trim()
    ? allNavItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.group.toLowerCase().includes(query.toLowerCase())
      )
    : allNavItems.slice(0, 10);

  return (
    <div
      className="cmd-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
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
        className="cmd-modal-container"
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
            return (
              <div
                key={`${item.id}-${item.subTab || idx}`}
                className="cmd-item"
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
                  transition: "background 0.15s ease",
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
