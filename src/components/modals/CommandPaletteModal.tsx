import React, { useEffect, useState, useRef } from "react";
import { Modal } from "../ui/Modal";
import { Search, Plus, Home, PieChart, Landmark, Target, RefreshCw } from "lucide-react";
import { THEME } from "../../utils/constants";

export const CommandPaletteModal = ({ isOpen, onClose, onNavigate, onAction }: { isOpen: boolean, onClose: () => void, onNavigate: (tab: string) => void, onAction: (action: string) => void }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
    }
  }, [isOpen]);

  const actions = [
    { id: "nav-home", type: "nav", icon: <Home size={16} />, label: "Go to Dashboard", tab: "analytics" },
    { id: "nav-txn", type: "nav", icon: <RefreshCw size={16} />, label: "Transactions", tab: "transactions" },
    { id: "nav-inv", type: "nav", icon: <PieChart size={16} />, label: "Investments", tab: "investments" },
    { id: "nav-tax", type: "nav", icon: <Landmark size={16} />, label: "Tax Vault", tab: "tax" },
    { id: "nav-goals", type: "nav", icon: <Target size={16} />, label: "Goals & Planning", tab: "goals" },
    { id: "act-add", type: "action", icon: <Plus size={16} />, label: "Add New Transaction", action: "quick-add" },
  ];

  const filtered = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh"
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: "100%",
          maxWidth: 600,
          background: "var(--t-darkInk)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid color-mix(in srgb, var(--t-line) 50%, transparent)",
          boxShadow: "var(--shadow-2xl)",
          overflow: "hidden",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--t-line)" }}>
          <Search size={20} color="var(--t-muted)" style={{ marginRight: 12 }} />
          <input
            ref={inputRef}
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 18,
              color: "var(--t-ink)",
              boxShadow: "none",
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--surface-1)", borderRadius: 4, color: "var(--t-muted)", fontWeight: 600 }}>esc</span>
          </div>
        </div>

        <div style={{ maxHeight: "50vh", overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--t-muted)" }}>
              No commands found for "{query}"
            </div>
          ) : (
            filtered.map((act, i) => (
              <div
                key={act.id}
                onClick={() => {
                  if (act.type === "nav") onNavigate(act.tab as string);
                  if (act.type === "action") onAction(act.action as string);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "color-mix(in srgb, var(--t-accent) 8%, transparent)";
                  e.currentTarget.style.color = "var(--t-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--t-ink)";
                }}
              >
                <div style={{ color: "var(--t-muted)", display: "flex" }}>{act.icon}</div>
                <div style={{ flex: 1, fontWeight: 500 }}>{act.label}</div>
                {act.type === "nav" && <span style={{ fontSize: 11, color: "var(--t-muted)" }}>Navigation</span>}
                {act.type === "action" && <span style={{ fontSize: 11, color: "var(--t-accent)" }}>Action</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
