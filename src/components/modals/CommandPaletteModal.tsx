import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import { NAV_GROUPS } from "../../utils/appConstants";

interface CmdItem {
  id: string;
  type: "nav" | "action";
  icon: React.ReactNode;
  label: string;
  keywords: string;
  tab?: string;
  subTab?: string;
  action?: string;
}

// Hand-curated search keywords for items that predate the auto-generated list below,
// keyed by the nav item's own id (stable across sidebar restructuring). Anything not
// listed here falls back to its label + group title, which is still searchable, just
// less richly so - add an override here if a destination needs better synonyms.
const KEYWORD_OVERRIDES: Record<string, string> = {
  analytics: "dashboard home overview analytics",
  ai: "ai assistant chatbot advisor",
  txnhistory: "ledger transactions history all",
  banks: "banks accounts savings current transactions",
  demat: "demat stocks shares equity portfolio broker",
  investments: "investments portfolio fixed income deposits",
  fd: "fd fixed deposit interest maturity",
  rd: "rd recurring deposit monthly",
  bond: "bonds sgb government corporate",
  ppf: "ppf public provident fund",
  nps: "nps national pension system",
  epf: "epf epfo employee provident fund pf",
  mf: "mutual funds mf sip nav units",
  income: "yield tracker income interest returns",
  goals: "goals target planning savings",
  realestate: "real estate property house flat land",
  vehicles: "vehicles car bike auto service",
  cc: "credit cards outstanding due limit",
  prepaid: "prepaid cards wallet balance",
  taken: "loans taken emi home car personal",
  given: "loans given lent",
  borrowed: "borrowed from people informal debt",
  lent: "lent to people informal credit",
  optimizer: "payoff optimizer debt strategy snowball",
  tax: "tax vault 80c deductions itr filing",
  sip: "sip tracker systematic investment plan monthly",
  insurance: "insurance health life term lic premium",
  budget: "budget budgeting expenses spending",
  rental: "rental rent tenant property lease",
  subs: "subscriptions recurring netflix spotify ott",
  reminders: "reminders alerts notifications due",
  calculators: "calculators emi sip fd compound interest",
  settings: "settings preferences theme export import backup",
};

export const CommandPaletteModal = ({
  isOpen,
  onClose,
  onNavigate,
  onAction,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, subTab?: string) => void;
  onAction: (action: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Generated from NAV_GROUPS (the sidebar's own source of truth) rather than a
  // hand-maintained duplicate list, so every destination the sidebar can reach is
  // reachable here too, and new nav items show up automatically.
  const actions: CmdItem[] = useMemo(() => {
    const list: CmdItem[] = [];
    const keywordsFor = (id: string, label: string, groupTitle: string) =>
      KEYWORD_OVERRIDES[id] || `${label} ${groupTitle}`.toLowerCase();

    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        const Icon = item.icon;
        if (item.children && item.children.length > 0) {
          if (!item.directChildren) {
            // Parent itself is a real tab (e.g. Investments Portfolio, Govt Schemes).
            list.push({
              id: `nav-${item.id}`,
              type: "nav",
              icon: <Icon size={16} />,
              label: item.label,
              keywords: keywordsFor(item.id, item.label, group.title),
              tab: item.id,
            });
            for (const child of item.children) {
              const ChildIcon = child.icon;
              list.push({
                id: `nav-${item.id}-${child.id}`,
                type: "nav",
                icon: <ChildIcon size={16} />,
                label: child.label,
                keywords: keywordsFor(child.id, child.label, group.title),
                tab: item.id,
                subTab: child.id,
              });
            }
          } else {
            // Group header isn't itself a navigable tab - only its children are
            // (e.g. Tax & Compliance groups Tax Vault/Tax Tools/... as standalone tabs).
            for (const child of item.children) {
              const ChildIcon = child.icon;
              list.push({
                id: `nav-${child.id}`,
                type: "nav",
                icon: <ChildIcon size={16} />,
                label: child.label,
                keywords: keywordsFor(child.id, child.label, group.title),
                tab: child.id,
              });
            }
          }
        } else {
          list.push({
            id: `nav-${item.id}`,
            type: "nav",
            icon: <Icon size={16} />,
            label: item.label,
            keywords: keywordsFor(item.id, item.label, group.title),
            tab: item.id,
          });
        }
      }
    }
    return list;
  }, []);

  const filtered = query.trim()
    ? actions.filter((a) => {
        const q = query.toLowerCase();
        return a.label.toLowerCase().includes(q) || a.keywords.toLowerCase().includes(q);
      })
    : actions;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setActiveIdx(0);
    }
  }, [isOpen]);

  // Body scroll lock while the palette is open — matches the shared Modal's behavior.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const execute = useCallback(
    (item: CmdItem) => {
      if (item.type === "nav" && item.tab) onNavigate(item.tab, item.subTab);
      if (item.type === "action" && item.action) onAction(item.action);
      onClose();
    },
    [onNavigate, onAction, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        // The search input is the only natively focusable element in this
        // palette (results are click/arrow-key driven), so Tab must not be
        // allowed to escape to the page behind the overlay.
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        execute(filtered[activeIdx]);
      }
    },
    [filtered, activeIdx, execute, onClose]
  );

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

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
        paddingTop: "12vh",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: "100%",
          maxWidth: 600,
          background: "var(--surface-0)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid color-mix(in srgb, var(--t-line) 50%, transparent)",
          boxShadow: "var(--shadow-2xl)",
          overflow: "hidden",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--t-line)",
          }}
        >
          <Search size={20} color="var(--t-muted)" style={{ marginRight: 12 }} />
          <input
            ref={inputRef}
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-palette-listbox"
            aria-autocomplete="list"
            aria-activedescendant={filtered[activeIdx] ? `cmd-item-${filtered[activeIdx].id}` : undefined}
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
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                background: "var(--surface-1)",
                borderRadius: 4,
                color: "var(--t-muted)",
                fontWeight: 600,
              }}
            >
              esc
            </span>
          </div>
        </div>

        <div
          ref={listRef}
          id="cmd-palette-listbox"
          role="listbox"
          aria-label="Commands"
          style={{ maxHeight: "50vh", overflowY: "auto", padding: 8 }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--t-muted)" }}>
              No commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((act, idx) => (
              <div
                key={act.id}
                id={`cmd-item-${act.id}`}
                role="option"
                aria-selected={idx === activeIdx}
                onClick={() => execute(act)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  background:
                    idx === activeIdx
                      ? "color-mix(in srgb, var(--t-accent) 8%, transparent)"
                      : "transparent",
                  color: idx === activeIdx ? "var(--t-accent)" : "var(--t-ink)",
                }}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <div style={{ color: "var(--t-muted)", display: "flex" }}>{act.icon}</div>
                <div style={{ flex: 1, fontWeight: 500, fontSize: 13.5 }}>{act.label}</div>
                {act.subTab && (
                  <span style={{ fontSize: 10, color: "var(--t-muted)", opacity: 0.7 }}>
                    Sub-section
                  </span>
                )}
                {!act.subTab && act.type === "nav" && (
                  <span style={{ fontSize: 10, color: "var(--t-muted)" }}>Navigation</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
