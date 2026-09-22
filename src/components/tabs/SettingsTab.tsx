import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Database,
  User,
  Check,
  Download,
  RefreshCw,
  X as XIcon,
  LogOut,
  Tags,
  Palette,
  RotateCcw,
  Plus,
  AlertTriangle,
  ArrowUpAZ,
  ArrowDownAZ,
  Mail,
  Bot,
  HardDrive,
  Eye,
  EyeOff,
  Calendar,
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  Smartphone,
  Fingerprint,
  AlertCircle,
  Receipt,
  Home,
  Landmark,
  Car,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Users,
  CreditCard,
  Ticket,
  Globe,
  TrendingUp,
  Target,
  Lightbulb,
  Wallet,
  Banknote,
  ClipboardList,
  BarChart3,
  ShoppingBag,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  IdCard,
  FolderOpen,
  Sliders,
  Sparkles,
  SlidersHorizontal,
  Server,
  FileSpreadsheet,
  ExternalLink,
  Layers,
  Activity,
  CheckCheck,
  CheckSquare,
  Square,
  Sun,
  Moon,
} from "lucide-react";
import { THEME, ACCENT_PALETTES, THEME_PRESETS } from "../../utils/constants";
import {
  DEFAULT_MASTER_DATA,
  calculateAge,
  formatAge,
  isSeniorCitizen,
  isMinor,
} from "../../utils/masterData";
import { exportArrayToCSV, today } from "../../utils/finance";
import { supabase } from "../../supabaseClient";
import { usePrivacy } from "../../context/PrivacyContext";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";
import { Modal } from "../ui/Modal";
import { useAsyncAction } from "../../hooks/useAsyncAction";

// ─── Master Data Metadata ─────────────────────────────────────────────────────
const MD_GROUPS = [
  {
    id: "transactions",
    label: "Transactions & Cash Flow",
    keys: ["transactionCategories", "ccTransactionCategories", "prepaidCategories"],
    icon: Banknote,
    description: "Categories for bank deposits, expenses, credit cards & prepaid spends",
  },
  {
    id: "cards",
    label: "Cards & Payment Networks",
    keys: ["ccNetworks", "prepaidCardTypes"],
    icon: CreditCard,
    description: "Card payment networks and prepaid wallet classification types",
  },
  {
    id: "banking",
    label: "Banking & Mutual Funds",
    keys: ["bankAccountTypes", "mfCategories"],
    icon: Landmark,
    description: "Account varieties, AMFI asset classes and SIP sub-categories",
  },
  {
    id: "other",
    label: "Loans & Financial Goals",
    keys: ["loanTypes", "goalCategories"],
    icon: Target,
    description: "Liability loan classifications and long-term milestone goals",
  },
];

const MD_LABELS: Record<string, string> = {
  transactionCategories: "Transaction & Budget Categories",
  ccTransactionCategories: "Credit Card Transaction Categories",
  prepaidCategories: "Prepaid Card Categories",
  ccNetworks: "Card Networks",
  prepaidCardTypes: "Prepaid Card Types",
  bankAccountTypes: "Bank Account Types",
  mfCategories: "Mutual Fund / SIP Categories",
  loanTypes: "Loan Types",
  goalCategories: "Financial Goal Categories",
};

const MD_ICONS: Record<string, any> = {
  transactionCategories: Tags,
  ccTransactionCategories: CreditCard,
  prepaidCategories: Ticket,
  ccNetworks: Globe,
  prepaidCardTypes: IdCard,
  bankAccountTypes: Landmark,
  mfCategories: TrendingUp,
  loanTypes: Home,
  goalCategories: Target,
};

// ─── Navigation Sub-Tabs ──────────────────────────────────────────────────────
const TOP_TABS = [
  { id: "appearance", label: "Appearance", icon: Palette, badge: "Custom" },
  { id: "profile", label: "Profile & Tax", icon: User },
  { id: "security", label: "Security & Privacy", icon: Shield, badge: "Vault" },
  { id: "family", label: "Family Profiles", icon: Users },
  { id: "masterdata", label: "Master Data", icon: Tags },
  { id: "ai", label: "AI Advisor", icon: Bot, badge: "Gemini" },
  { id: "email", label: "Email Reports", icon: Mail },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "data", label: "Data & Account", icon: HardDrive },
];

// ─── Primitive Components ─────────────────────────────────────────────────────
const PillNav = ({ tabs, active, onChange }: any) => (
  <div
    className="demat-portfolio-bar no-scrollbar"
    style={{
      display: "flex",
      gap: 6,
      overflowX: "auto",
      padding: "4px 2px",
      marginBottom: 20,
      borderBottom: `1px solid ${THEME.line}`,
    }}
  >
    {tabs.map((t: any) => {
      const Icon = t.icon;
      const isActive = active === t.id;
      return (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`demat-portfolio-pill ${isActive ? "active" : ""}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 16px",
            borderRadius: "var(--t-radius, 10px)",
            border: isActive
              ? `1.5px solid var(--t-accent, ${THEME.accent})`
              : `1px solid ${THEME.line}`,
            background: isActive
              ? `color-mix(in srgb, var(--t-accent, ${THEME.accent}) 12%, transparent)`
              : "var(--surface-0)",
            color: isActive ? `var(--t-accent, ${THEME.accent})` : THEME.muted,
            fontWeight: isActive ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          {Icon && <Icon size={14} />}
          <span>{t.label}</span>
          {t.count != null && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                padding: "1px 7px",
                borderRadius: 99,
                background: isActive
                  ? `var(--t-accent, ${THEME.accent})`
                  : `color-mix(in srgb, var(--t-accent, ${THEME.accent}) 16%, transparent)`,
                color: isActive ? "#fff" : `var(--t-accent, ${THEME.accent})`,
                marginLeft: 2,
              }}
            >
              {t.count}
            </span>
          )}
          {t.badge && !t.count && (
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                padding: "1px 6px",
                borderRadius: 4,
                background: isActive
                  ? `var(--t-accent, ${THEME.accent})`
                  : `color-mix(in srgb, var(--t-muted, ${THEME.muted}) 14%, transparent)`,
                color: isActive ? "#fff" : THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {t.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// ─── OptionRow — Horizontal option selector with preview indicators ──────────
function OptionRow({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: { value: string; label: string; icon?: any; badge?: string }[];
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: THEME.muted,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: hint ? 2 : 10,
        }}
      >
        {label}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: THEME.muted, marginBottom: 10 }}>{hint}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((opt) => {
          const active = value === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: "var(--t-radius, 10px)",
                border: active ? `2px solid ${THEME.accent}` : `1.5px solid ${THEME.line}`,
                background: active
                  ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)`
                  : "var(--surface-0)",
                color: active ? THEME.accent : THEME.ink,
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.16s ease",
                fontFamily: "inherit",
                boxShadow: active
                  ? `0 2px 8px color-mix(in srgb, ${THEME.accent} 15%, transparent)`
                  : "none",
              }}
            >
              {Icon && <Icon size={13} />}
              <span>{opt.label}</span>
              {opt.badge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: active
                      ? THEME.accent
                      : `color-mix(in srgb, ${THEME.muted} 15%, transparent)`,
                    color: active ? "#fff" : THEME.muted,
                  }}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── EditableList for Master Data ─────────────────────────────────────────────
function EditableList({ listKey, items, onUpdate }: any) {
  const [val, setVal] = useState("");
  const [focused, setFocused] = useState(false);
  const [sortDir, setSortDir] = useState<"" | "asc" | "desc">("");
  const [query, setQuery] = useState("");
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [dupWarning, setDupWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultItems: string[] = (DEFAULT_MASTER_DATA as Record<string, any>)[listKey] || [];
  const isDirty = JSON.stringify([...items].sort()) !== JSON.stringify([...defaultItems].sort());

  const sortAZ = () => {
    onUpdate(
      listKey,
      [...items].sort((a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" }))
    );
    setSortDir("asc");
  };
  const sortZA = () => {
    onUpdate(
      listKey,
      [...items].sort((a: string, b: string) => b.localeCompare(a, "en", { sensitivity: "base" }))
    );
    setSortDir("desc");
  };

  const add = () => {
    const v = val.trim();
    if (!v) return;
    if (items.some((x: string) => x.toLowerCase() === v.toLowerCase())) {
      setDupWarning(true);
      setTimeout(() => setDupWarning(false), 2500);
      return;
    }
    onUpdate(listKey, [...items, v]);
    setVal("");
    setSortDir("");
  };

  const confirmRemove = () => {
    if (!pendingRemove) return;
    onUpdate(
      listKey,
      items.filter((x: string) => x !== pendingRemove)
    );
    setPendingRemove(null);
  };

  const confirmReset = () => {
    onUpdate(listKey, [...defaultItems]);
    setSortDir("");
    setPendingReset(false);
  };

  const visibleItems = query.trim()
    ? items.filter((x: string) => x.toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  const MdIcon = MD_ICONS[listKey] || Tags;

  return (
    <div
      style={{
        background: "var(--t-paper)",
        borderRadius: "var(--t-radius, 12px)",
        border: `1px solid ${THEME.line}`,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "12px 18px",
          borderBottom: `1px solid ${THEME.line}`,
          background: `color-mix(in srgb, ${THEME.accent} 4%, var(--surface-0))`,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
              color: THEME.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MdIcon size={15} />
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
            {MD_LABELS[listKey] || listKey}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: 99,
              background: `color-mix(in srgb, ${THEME.accent} 14%, transparent)`,
              color: THEME.accent,
            }}
          >
            {items.length} options
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={sortAZ}
            title="Sort A to Z"
            aria-label="Sort A to Z"
            aria-pressed={sortDir === "asc"}
            disabled={items.length < 2}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: sortDir === "asc" ? THEME.accent : "var(--surface-0)",
              border: `1px solid ${sortDir === "asc" ? THEME.accent : THEME.line}`,
              cursor: items.length < 2 ? "default" : "pointer",
              color: sortDir === "asc" ? "#fff" : THEME.muted,
              fontSize: 11,
              fontWeight: sortDir === "asc" ? 700 : 500,
              padding: "4px 10px",
              borderRadius: 6,
              fontFamily: "inherit",
              transition: "all 0.15s",
              opacity: items.length < 2 ? 0.4 : 1,
            }}
          >
            <ArrowUpAZ size={12} /> A→Z
          </button>

          <button
            onClick={sortZA}
            title="Sort Z to A"
            aria-label="Sort Z to A"
            aria-pressed={sortDir === "desc"}
            disabled={items.length < 2}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: sortDir === "desc" ? THEME.accent : "var(--surface-0)",
              border: `1px solid ${sortDir === "desc" ? THEME.accent : THEME.line}`,
              cursor: items.length < 2 ? "default" : "pointer",
              color: sortDir === "desc" ? "#fff" : THEME.muted,
              fontSize: 11,
              fontWeight: sortDir === "desc" ? 700 : 500,
              padding: "4px 10px",
              borderRadius: 6,
              fontFamily: "inherit",
              transition: "all 0.15s",
              opacity: items.length < 2 ? 0.4 : 1,
            }}
          >
            <ArrowDownAZ size={12} /> Z→A
          </button>

          {isDirty && (
            <button
              onClick={() => setPendingReset(true)}
              title="Reset to system default values"
              aria-label="Reset to system default values"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                cursor: "pointer",
                fontSize: 11,
                color: THEME.muted,
                padding: "4px 9px",
                borderRadius: 6,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {items.length > 5 && (
        <div
          style={{
            padding: "8px 18px 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Search size={13} color={THEME.muted} style={{ flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${items.length} items…`}
            aria-label={`Search ${MD_LABELS[listKey] || "items"}`}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: THEME.ink,
              fontSize: 12.5,
              padding: "6px 0",
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: THEME.muted,
                padding: 2,
              }}
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
      )}

      {/* Chips Area */}
      <div
        style={{
          padding: "14px 18px",
          display: "flex",
          flexWrap: "wrap",
          gap: 7,
          minHeight: 56,
        }}
      >
        {items.length === 0 && (
          <span
            style={{
              fontSize: 13,
              color: THEME.muted,
              fontStyle: "italic",
              alignSelf: "center",
            }}
          >
            No items yet — add one below
          </span>
        )}
        {items.length > 0 && visibleItems.length === 0 && (
          <span
            style={{
              fontSize: 13,
              color: THEME.muted,
              fontStyle: "italic",
              alignSelf: "center",
            }}
          >
            No items match "{query}"
          </span>
        )}
        {visibleItems.map((item: string) => (
          <span
            key={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 9px 5px 12px",
              borderRadius: "var(--t-radius, 8px)",
              fontSize: 13,
              fontWeight: 500,
              background: `color-mix(in srgb, ${THEME.accent} 8%, var(--surface-0))`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
              color: THEME.ink,
              transition: "transform 0.15s ease",
            }}
          >
            <span>{item}</span>
            <button
              onClick={() => setPendingRemove(item)}
              style={{
                background: `color-mix(in srgb, ${THEME.muted} 12%, transparent)`,
                border: "none",
                cursor: "pointer",
                color: THEME.muted,
                padding: 3,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                borderRadius: "50%",
                transition: "all 0.15s",
              }}
              title={`Remove ${item}`}
              aria-label={`Remove ${item}`}
            >
              <XIcon size={10} />
            </button>
          </span>
        ))}
      </div>

      {dupWarning && (
        <div
          style={{
            margin: "0 18px 12px",
            padding: "8px 12px",
            borderRadius: 8,
            background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.gold} 27%, transparent)`,
            fontSize: 12,
            color: THEME.gold,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertCircle size={14} /> That value already exists in this list (case-insensitive).
        </div>
      )}

      {pendingRemove && (
        <ConfirmDialog
          message={`Remove "${pendingRemove}" from ${MD_LABELS[listKey] || "this list"}?\n\nIt will disappear from future dropdown options immediately. Existing records that already use this value will preserve it.`}
          confirmLabel="Yes, remove"
          onConfirm={confirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      {pendingReset && (
        <ConfirmDialog
          message={`Reset ${MD_LABELS[listKey] || "this list"} to system default options?\n\n${
            items.filter((x: string) => !defaultItems.includes(x)).length > 0
              ? `This will remove ${items.filter((x: string) => !defaultItems.includes(x)).length} custom item(s) you added. `
              : ""
          }Existing records that already use a removed value will retain their saved data.`}
          confirmLabel="Yes, reset to defaults"
          onConfirm={confirmReset}
          onCancel={() => setPendingReset(false)}
        />
      )}

      {/* Add Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          borderTop: `1px solid ${THEME.line}`,
          background: focused
            ? `color-mix(in srgb, ${THEME.accent} 3%, var(--t-paper))`
            : "var(--t-paper)",
          transition: "background 0.15s",
        }}
      >
        <Plus size={15} style={{ marginLeft: 16, flexShrink: 0, color: THEME.muted }} />
        <input
          ref={inputRef}
          aria-label={`Add new ${MD_LABELS[listKey] || "item"}`}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            color: THEME.ink,
            fontSize: 13,
            padding: "12px 12px",
            fontFamily: "inherit",
          }}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={`Add new option to ${MD_LABELS[listKey] || "list"} (Press Enter)…`}
        />
        <button
          onClick={add}
          disabled={!val.trim()}
          style={{
            background: val.trim() ? THEME.accent : "transparent",
            border: "none",
            cursor: val.trim() ? "pointer" : "default",
            color: val.trim() ? "#fff" : THEME.muted,
            fontWeight: 700,
            fontSize: 12.5,
            padding: "12px 18px",
            fontFamily: "inherit",
            transition: "all 0.15s",
            borderLeft: `1px solid ${THEME.line}`,
            opacity: val.trim() ? 1 : 0.5,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Section: Appearance & Experience ─────────────────────────────────────────
function AppearanceSection({
  accentKey,
  setAccentKey,
  density,
  setDensity,
  fontKey,
  setFontKey,
  radiusKey,
  setRadiusKey,
  bgStyle,
  setBgStyle,
  animSpeed,
  setAnimSpeed,
  darkMode,
  toggleDarkMode,
}: any) {
  const divider = <div style={{ borderTop: `1px solid ${THEME.line}` }} />;

  const activePreset = THEME_PRESETS.find(
    (p) => p.darkMode === darkMode && p.accentKey === (accentKey || "blue")
  );

  const applyPreset = (preset: any) => {
    if (preset.darkMode !== darkMode) toggleDarkMode();
    setAccentKey(preset.accentKey);
    setFontKey(preset.fontKey);
  };

  const activePalette = (ACCENT_PALETTES as any)[accentKey || "blue"];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* ── Live Interactive Theme Playground ── */}
      <Card
        style={{
          padding: 24,
          background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.accent} 6%, var(--surface-0)) 0%, var(--surface-0) 100%)`,
          borderTop: `4px solid ${THEME.accent}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Sparkles size={18} color={THEME.accent} /> Live Theme &amp; UI Preview
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
              Real-time preview of buttons, cards, tags, and typography matching your active styling
              tokens.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: "var(--t-radius, 10px)",
              background: "var(--t-paper)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: activePalette?.light || THEME.accent,
              }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
              {activePreset?.label || "Custom Theme"} • {darkMode ? "Dark" : "Light"}
            </span>
          </div>
        </div>

        {/* Miniature Mockup Sandbox */}
        <div
          style={{
            padding: 18,
            borderRadius: "var(--t-radius, 12px)",
            background: "var(--t-paper)",
            border: `1px solid ${THEME.line}`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            alignItems: "center",
          }}
        >
          {/* Sample Card */}
          <div
            style={{
              padding: 14,
              borderRadius: "var(--t-radius, 10px)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
              Sample Portfolio KPI
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, marginTop: 4 }}>
              ₹24,50,000
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11.5,
                fontWeight: 700,
                color: THEME.sage,
                marginTop: 6,
              }}
            >
              <TrendingUp size={12} /> +14.2% Annualized Return
            </div>
          </div>

          {/* Sample Buttons & Tags */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{
                  flex: 1,
                  padding: "8px 14px",
                  borderRadius: "var(--t-radius, 8px)",
                  background: THEME.accent,
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Check size={13} /> Primary Action
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "8px 14px",
                  borderRadius: "var(--t-radius, 8px)",
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  color: THEME.ink,
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Secondary
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "var(--t-radius, 6px)",
                  background: `color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                  color: THEME.accent,
                }}
              >
                Active Pill
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "var(--t-radius, 6px)",
                  background: `color-mix(in srgb, ${THEME.sage} 15%, transparent)`,
                  color: THEME.sage,
                }}
              >
                Verified
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "var(--t-radius, 6px)",
                  background: `color-mix(in srgb, ${THEME.gold} 15%, transparent)`,
                  color: THEME.gold,
                }}
              >
                Pending
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Main Appearance Settings ── */}
      <Card style={{ padding: 28 }}>
        <div style={{ display: "grid", gap: 26 }}>
          {/* ── Dark Mode Switch ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 2,
                }}
              >
                Interface Mode
              </div>
              <div style={{ fontSize: 12, color: THEME.muted }}>
                Toggle between light and dark visual aesthetics across all dashboard charts and
                tables.
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              role="switch"
              aria-checked={darkMode}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                position: "relative",
                width: 56,
                height: 30,
                borderRadius: 99,
                background: darkMode ? THEME.accent : THEME.line,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.2s ease",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: darkMode ? 29 : 4,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: darkMode ? THEME.accent : "#888",
                  fontSize: 11,
                }}
              >
                {darkMode ? <Moon size={12} color={THEME.accent} /> : <Sun size={12} color="#888" />}
              </div>
            </button>
          </div>

          {divider}

          {/* ── Theme Presets Gallery ── */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Curated Theme Presets
              </div>
              {!activePreset && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: THEME.muted,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    padding: "2px 10px",
                    borderRadius: "var(--radius-xs)",
                  }}
                >
                  Custom Configuration
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: THEME.muted, marginBottom: 16 }}>
              Select a professionally calibrated color palette and mode with harmonious contrast
              ratios.
            </div>

            {/* Light Presets */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sun size={14} color={THEME.accent} style={{ flexShrink: 0 }} />
                <span>Light Mode Palettes</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
                  gap: 10,
                }}
              >
                {THEME_PRESETS.filter((p) => !p.darkMode).map((preset) => {
                  const isActive = activePreset?.id === preset.id;
                  const pal = (ACCENT_PALETTES as any)[preset.accentKey];
                  return (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      aria-pressed={isActive}
                      aria-label={`${preset.label} theme preset${isActive ? " (active)" : ""}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0,
                        border: isActive
                          ? `2px solid ${pal?.light || THEME.accent}`
                          : `1.5px solid ${THEME.line}`,
                        borderRadius: "var(--t-radius, 12px)",
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "var(--t-paper)",
                        transition: "all 0.18s ease",
                        padding: 0,
                        textAlign: "left",
                        fontFamily: "inherit",
                        boxShadow: isActive
                          ? `0 4px 14px color-mix(in srgb, ${pal?.light || THEME.accent} 25%, transparent)`
                          : "none",
                        transform: isActive ? "translateY(-1px)" : "none",
                      }}
                    >
                      <div
                        style={{
                          height: 48,
                          display: "flex",
                          alignItems: "flex-end",
                          padding: "0 10px 6px",
                          background: preset.bgPreview,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 5,
                            background: pal?.light || THEME.accent,
                          }}
                        />
                        <div
                          style={{
                            width: "50%",
                            height: 18,
                            borderRadius: 4,
                            marginLeft: 8,
                            background: "rgba(255,255,255,0.92)",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            right: 10,
                            top: 8,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: pal?.light || THEME.accent,
                          }}
                        />
                        {isActive && (
                          <div
                            style={{
                              position: "absolute",
                              top: 4,
                              left: 10,
                              fontSize: 8,
                              fontWeight: 900,
                              color: "#fff",
                              background: pal?.light || THEME.accent,
                              padding: "1px 5px",
                              borderRadius: 4,
                              letterSpacing: "0.05em",
                            }}
                          >
                            ACTIVE
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "8px 10px 10px" }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: isActive ? pal?.light || THEME.accent : THEME.ink,
                            marginBottom: 2,
                          }}
                        >
                          {preset.label}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: THEME.muted,
                            lineHeight: 1.3,
                            marginBottom: 6,
                          }}
                        >
                          {preset.description}
                        </div>
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: pal?.light,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 9.5, color: THEME.muted }}>{pal?.label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dark Presets */}
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Moon size={14} color={THEME.accent} style={{ flexShrink: 0 }} />
                <span>Dark Mode Palettes</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
                  gap: 10,
                }}
              >
                {THEME_PRESETS.filter((p) => p.darkMode).map((preset) => {
                  const isActive = activePreset?.id === preset.id;
                  const pal = (ACCENT_PALETTES as any)[preset.accentKey];
                  return (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      aria-pressed={isActive}
                      aria-label={`${preset.label} theme preset${isActive ? " (active)" : ""}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0,
                        border: isActive
                          ? `2px solid ${pal?.light || THEME.accent}`
                          : `1.5px solid ${THEME.line}`,
                        borderRadius: "var(--t-radius, 12px)",
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "var(--t-paper)",
                        transition: "all 0.18s ease",
                        padding: 0,
                        textAlign: "left",
                        fontFamily: "inherit",
                        boxShadow: isActive
                          ? `0 4px 14px color-mix(in srgb, ${pal?.light || THEME.accent} 25%, transparent)`
                          : "none",
                        transform: isActive ? "translateY(-1px)" : "none",
                      }}
                    >
                      <div
                        style={{
                          height: 48,
                          display: "flex",
                          alignItems: "flex-end",
                          padding: "0 10px 6px",
                          background: preset.bgPreview,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 5,
                            background: pal?.light || THEME.accent,
                          }}
                        />
                        <div
                          style={{
                            width: "50%",
                            height: 18,
                            borderRadius: 4,
                            marginLeft: 8,
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.14)",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            right: 10,
                            top: 8,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: pal?.light || THEME.accent,
                          }}
                        />
                        {isActive && (
                          <div
                            style={{
                              position: "absolute",
                              top: 4,
                              left: 10,
                              fontSize: 8,
                              fontWeight: 900,
                              color: "#fff",
                              background: pal?.light || THEME.accent,
                              padding: "1px 5px",
                              borderRadius: 4,
                              letterSpacing: "0.05em",
                            }}
                          >
                            ACTIVE
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "8px 10px 10px" }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: isActive ? pal?.light || THEME.accent : THEME.ink,
                            marginBottom: 2,
                          }}
                        >
                          {preset.label}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: THEME.muted,
                            lineHeight: 1.3,
                            marginBottom: 6,
                          }}
                        >
                          {preset.description}
                        </div>
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: pal?.light,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 9.5, color: THEME.muted }}>{pal?.label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {divider}

          {/* Density */}
          <OptionRow
            label="Layout Density"
            hint="Controls card margins, table cell padding, and grid spacing throughout the interface"
            value={density || "normal"}
            onChange={setDensity}
            options={[
              { value: "compact", label: "Compact", badge: "Dense" },
              { value: "normal", label: "Normal", badge: "Balanced" },
              { value: "comfortable", label: "Comfortable", badge: "Spacious" },
            ]}
          />

          {divider}

          {/* Font Family */}
          <OptionRow
            label="Interface Typography"
            hint="Curated fonts optimized for financial data readability, high-DPI displays, and clean numbers"
            value={fontKey || "inter"}
            onChange={setFontKey}
            options={[
              { value: "inter", label: "Inter", badge: "Clean" },
              { value: "outfit", label: "Outfit", badge: "Modern" },
              { value: "roboto", label: "Roboto", badge: "Precise" },
              { value: "poppins", label: "Poppins", badge: "Friendly" },
              { value: "dm-sans", label: "DM Sans", badge: "Geometric" },
              { value: "nunito", label: "Nunito", badge: "Soft" },
              { value: "space-grotesk", label: "Space Grotesk", badge: "Tech" },
              { value: "lato", label: "Lato", badge: "Classic" },
              { value: "sf-pro", label: "SF Pro (System)", badge: "Native" },
            ]}
          />

          {divider}

          {/* Corner Radius */}
          <OptionRow
            label="Corner Geometry"
            hint="Adjust the curvature of cards, action buttons, modals, and input fields"
            value={radiusKey || "modern"}
            onChange={setRadiusKey}
            options={[
              { value: "sharp", label: "Sharp (4px)", badge: "Crisp" },
              { value: "modern", label: "Modern (10px)", badge: "Standard" },
              { value: "round", label: "Round (16px)", badge: "Fluid" },
            ]}
          />

          {divider}

          {/* Background Style */}
          <OptionRow
            label="Background Texture"
            hint="Subtle ambient backdrop styling behind the dashboard canvas"
            value={bgStyle || "plain"}
            onChange={setBgStyle}
            options={[
              { value: "plain", label: "Plain Canvas" },
              { value: "dots", label: "Dot Matrix" },
              { value: "mesh", label: "Subtle Mesh" },
            ]}
          />

          {divider}

          {/* Animation Speed */}
          <OptionRow
            label="Micro-Animation Velocity"
            hint="Fine-tune the pacing of page transitions, modal reveals, and hover micro-animations"
            value={animSpeed || "smooth"}
            onChange={setAnimSpeed}
            options={[
              { value: "snappy", label: "Snappy (100ms)" },
              { value: "smooth", label: "Smooth (220ms)" },
              { value: "relaxed", label: "Relaxed (350ms)" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

// ─── Section: Profile & Tax Preferences ───────────────────────────────────────
function ProfileSection({ state, updateProfile, showToast }: any) {
  const [prof, setProf] = useState({ ...state.profile });
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setProf((p: any) => ({ ...p, ...state.profile }));
  }, [state.profile?.name]);

  const initials = (prof.name || "User")
    .split(" ")
    .map((w: string) => w[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isDirty = JSON.stringify(prof) !== JSON.stringify(state.profile);

  const { run: saveProfile, loading: saving } = useAsyncAction(
    async () => {
      const res = await updateProfile(prof);
      if (res?.success === false) {
        throw new Error(res.error || "Unknown error");
      }
    },
    {
      onSuccess: () => {
        setSaved(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSaved(false), 2200);
      },
      onError: (e: any) =>
        showToast?.(`Failed to save profile: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const fyOptions = useMemo(() => {
    const fySet = new Set<number>();
    const addDate = (d: string) => {
      if (!d) return;
      const dt = new Date(d + "T00:00:00");
      fySet.add(dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1);
    };
    (state?.income || []).forEach((i: any) => addDate(i.date));
    (state?.transactions || []).forEach((t: any) => addDate(t.date));
    (state?.stockSells || []).forEach((s: any) => addDate(s.sellDate));
    (state?.mfSells || []).forEach((m: any) => addDate(m.sellDate));
    (state?.stocks || []).forEach((s: any) => addDate(s.buyDate));
    (state?.mutualFunds || []).forEach((m: any) => addDate(m.buyDate || m.purchaseDate));
    (state?.taxPayments || []).forEach((t: any) => {
      if (t.fy) {
        const y = Number(t.fy.split("-")[0]);
        if (y) fySet.add(y);
      }
    });
    const now = new Date();
    const currentFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    fySet.add(currentFYStart);
    fySet.add(currentFYStart + 1);
    return Array.from(fySet)
      .sort((a, b) => b - a)
      .map((y) => `${y}-${String(y + 1).slice(-2)}`);
  }, [
    state?.income,
    state?.transactions,
    state?.stockSells,
    state?.mfSells,
    state?.stocks,
    state?.mutualFunds,
    state?.taxPayments,
  ]);

  const inp = {
    width: "100%",
    padding: "10px 14px",
    background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`,
    borderRadius: "var(--t-radius, 10px)",
    color: THEME.ink,
    fontSize: 14,
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  const savingsTargetVal = prof.savingsTarget ?? 20;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card style={{ padding: 26, borderTop: `4px solid ${THEME.accent}` }}>
        {/* User Persona Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 24,
            paddingBottom: 22,
            borderBottom: `1px solid ${THEME.line}`,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.accent} 20%, transparent), color-mix(in srgb, ${THEME.accent} 8%, transparent))`,
              border: `2.5px solid ${THEME.accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 900,
              color: THEME.accent,
              flexShrink: 0,
              boxShadow: `0 4px 12px color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 21, fontWeight: 800, color: THEME.ink }}>
              {prof.name || "Primary Account Holder"}
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 3 }}>
              Fiscal Profile • FY {prof.fy || "Current"} •{" "}
              {prof.regime === "new" ? "New Tax Regime" : "Old Tax Regime"}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            marginBottom: 26,
          }}
        >
          <Field label="Full Legal / Display Name">
            <input
              style={inp}
              value={prof.name || ""}
              onChange={(e) => setProf({ ...prof, name: e.target.value })}
              placeholder="Your Full Name"
            />
          </Field>

          <Field label="Active Fiscal Financial Year">
            <select
              style={inp}
              value={prof.fy || ""}
              onChange={(e) => setProf({ ...prof, fy: e.target.value })}
            >
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy} (Assessment Year {Number(fy.split("-")[0]) + 1}-
                  {String(Number(fy.split("-")[0]) + 2).slice(-2)})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Income Tax Regime Preference">
            <select
              style={inp}
              value={prof.regime || "new"}
              onChange={(e) => setProf({ ...prof, regime: e.target.value })}
            >
              <option value="new">New Tax Regime (Default, Lower Slabs)</option>
              <option value="old">Old Tax Regime (Section 80C/80D/HRA)</option>
            </select>
          </Field>
        </div>

        {/* Savings Target Slider & Interactive Gauge */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "var(--t-radius, 12px)",
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                Monthly Savings Target
              </div>
              <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                Target percentage of post-tax income dedicated to investments &amp; savings
              </div>
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: THEME.accent,
                padding: "4px 12px",
                borderRadius: 8,
                background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
              }}
            >
              {savingsTargetVal}%
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={savingsTargetVal}
            onChange={(e) => {
              const n = Number(e.target.value);
              setProf({ ...prof, savingsTarget: n });
            }}
            style={{
              width: "100%",
              accentColor: THEME.accent,
              cursor: "pointer",
              margin: "8px 0",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: THEME.muted,
              fontWeight: 600,
            }}
          >
            <span>0% (No Savings)</span>
            <span>20% (Recommended Minimum)</span>
            <span>50%+ (Aggressive FIRE)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Tax Regime Comparison Note */}
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.accent} 5%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.accent} 18%, transparent)`,
            fontSize: 12.5,
            color: THEME.ink,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: THEME.accent,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <Lightbulb size={15} /> Tax Regime Guidelines (India)
          </div>
          <div>
            • <strong>New Regime:</strong> Features standard ₹75,000 deduction, ₹25,000 rebate up to
            ₹7,00,000, and lower tax brackets without tracking complex investment receipts.
            <br />• <strong>Old Regime:</strong> Best if you claim substantial home loan interest
            (Sec 24b up to ₹2L), 80C (₹1.5L), 80D medical health insurance, and HRA exemptions.
          </div>
        </div>

        {/* Save Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {isDirty ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: THEME.gold,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: THEME.gold,
                  display: "inline-block",
                }}
              />
              Unsaved profile changes
            </span>
          ) : (
            <span style={{ fontSize: 12, color: THEME.muted }}>
              All profile preferences are saved to your account.
            </span>
          )}
          <Button
            onClick={saveProfile}
            disabled={saving}
            icon={saved ? <Check size={15} /> : undefined}
            style={saved ? { background: THEME.sage } : isDirty ? {} : { opacity: 0.6 }}
          >
            {saving ? "Saving Changes..." : saved ? "Profile Saved!" : "Save Profile"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Section: Security & Privacy ──────────────────────────────────────────────
function SecuritySection({
  session,
  onSignOut,
  lastBackupTs,
  setAppTab,
  showToast,
}: any) {
  const { privacyMode, setPrivacyMode } = usePrivacy();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const criteria = {
    minLength: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
  };

  const criteriaMetCount = Object.values(criteria).filter(Boolean).length;
  const isPasswordValid = criteriaMetCount === 4 && newPassword === confirmPassword;

  const onCapsLockKey = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"));

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setPassError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Passwords do not match.");
      return;
    }

    setUpdatingPass(true);
    setPassError(null);
    setPassSuccess(null);

    try {
      if (session?.user?.id === "offline-user") {
        await new Promise((r) => setTimeout(r, 600));
        setPassSuccess("Local session password updated successfully.");
        showToast?.("Password updated successfully.", "success");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setPassSuccess("Password updated successfully! You can now use your new password.");
        showToast?.("Account password updated successfully.", "success");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPassError(err.message || "Failed to update password. Please try again.");
    } finally {
      setUpdatingPass(false);
    }
  };

  const isLocalUser = session?.user?.id === "offline-user" || !session?.user?.id;
  const userEmail =
    session?.user?.email || (isLocalUser ? "user@arthadrishti.local" : "Account user");
  const createdAt = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Active";
  const lastSignIn = session?.user?.last_sign_in_at
    ? new Date(session.user.last_sign_in_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Current session";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const daysSinceBackup =
    lastBackupTs != null
      ? Math.floor((Date.now() - new Date(lastBackupTs).getTime()) / DAY_MS)
      : null;
  const isBackupRecent = daysSinceBackup !== null && daysSinceBackup <= 7;

  let securityScore = 75;
  if (privacyMode) securityScore += 10;
  if (isBackupRecent) securityScore += 10;
  if (!isLocalUser) securityScore += 5;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* ── Security Posture & Trust Overview ── */}
      <Card style={{ padding: 24, borderTop: `4px solid ${THEME.accent}` }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ShieldCheck size={22} color={THEME.accent} /> Security &amp; Privacy Command Center
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
              Enterprise-grade data encryption, zero-telemetry private storage, and client-side
              masking.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              borderRadius: "var(--t-radius, 12px)",
              background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
            }}
          >
            <Shield size={18} color={THEME.accent} />
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                }}
              >
                Security Posture
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: THEME.accent }}>
                {securityScore}% Strong
              </div>
            </div>
          </div>
        </div>

        {/* Security Badges */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: "var(--t-radius, 10px)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: THEME.muted,
                marginBottom: 4,
              }}
            >
              Encryption Architecture
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CheckCircle2 size={15} color={THEME.sage} /> 256-bit In-Transit &amp; Rest
            </div>
            <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 3 }}>
              Zero third-party trackers or ad telemetry
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: "var(--t-radius, 10px)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: THEME.muted,
                marginBottom: 4,
              }}
            >
              Authentication State
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CheckCircle2 size={15} color={THEME.sage} />{" "}
              {isLocalUser ? "Local Browser Session" : "Supabase Cloud Vault"}
            </div>
            <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 3 }}>
              {isLocalUser ? "Local storage session" : "Encrypted token authorization"}
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: "var(--t-radius, 10px)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: THEME.muted,
                marginBottom: 4,
              }}
            >
              Screen Privacy Shield
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: privacyMode ? THEME.sage : THEME.gold,
                }}
              />
              {privacyMode ? "Privacy Mask Active" : "Unmasked Display"}
            </div>
            <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 3 }}>
              {privacyMode ? "Numbers obscured in public" : "Values visible on screen"}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Privacy Mode & Screen Shield Simulation ── */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ maxWidth: 560 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <EyeOff size={16} color={THEME.accent} /> Privacy Mode (Public Workspace Masking)
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.5 }}>
              Automatically obscures Net Worth, bank balances, mutual fund units, and salary slip
              figures with •••• bullets. Ideal when viewing your portfolio in cafes or office
              environments.
            </div>
          </div>
          <Button
            variant={privacyMode ? "accent" : "secondary"}
            onClick={() => {
              setPrivacyMode(!privacyMode);
              showToast?.(
                privacyMode ? "Privacy mode deactivated" : "Privacy mode activated",
                "info"
              );
            }}
            icon={privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
          >
            {privacyMode ? "Privacy Mode: Active (Masked)" : "Privacy Mode: Inactive (Unmasked)"}
          </Button>
        </div>

        {/* Live Simulation Box */}
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "var(--t-radius, 10px)",
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: THEME.muted }}>
            Preview of numbers across dashboard:
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
              Net Worth: {privacyMode ? "••••••••" : "₹42,80,000"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
              Bank: {privacyMode ? "••••••" : "₹3,40,500"}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Change Password Form ── */}
      <Card style={{ padding: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <KeyRound size={16} color={THEME.accent} /> Change Account Password
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
            Update your account password with real-time complexity criteria verification.
          </div>
        </div>

        {passError && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#B91C1C",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={15} /> {passError}
          </div>
        )}

        {passSuccess && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              color: "#15803D",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={15} /> {passSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} style={{ display: "grid", gap: 16, maxWidth: 540 }}>
          <Field label="New Password">
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPass ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={onCapsLockKey}
                onKeyUp={onCapsLockKey}
                placeholder="Enter new password (min 8 characters)"
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: "var(--t-radius, 10px)",
                  border: `1.5px solid ${THEME.line}`,
                  fontSize: 14,
                  background: "var(--t-paper)",
                  color: THEME.ink,
                  fontFamily: "inherit",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {capsLockOn && (
            <div
              style={{
                fontSize: 12,
                color: THEME.gold,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <AlertCircle size={12} /> Caps Lock is turned on
            </div>
          )}

          {/* Password Strength Checklist */}
          {newPassword && (
            <div
              style={{
                padding: 12,
                borderRadius: "var(--t-radius, 8px)",
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px 12px",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  color: criteria.minLength ? THEME.sage : THEME.muted,
                  fontWeight: criteria.minLength ? 600 : 400,
                }}
              >
                {criteria.minLength ? <Check size={12} /> : <XIcon size={12} />} 8+ characters
              </span>
              <span
                style={{
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  color: criteria.hasUpper ? THEME.sage : THEME.muted,
                  fontWeight: criteria.hasUpper ? 600 : 400,
                }}
              >
                {criteria.hasUpper ? <Check size={12} /> : <XIcon size={12} />} Uppercase letter
              </span>
              <span
                style={{
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  color: criteria.hasNumber ? THEME.sage : THEME.muted,
                  fontWeight: criteria.hasNumber ? 600 : 400,
                }}
              >
                {criteria.hasNumber ? <Check size={12} /> : <XIcon size={12} />} Number (0-9)
              </span>
              <span
                style={{
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  color: criteria.hasSpecial ? THEME.sage : THEME.muted,
                  fontWeight: criteria.hasSpecial ? 600 : 400,
                }}
              >
                {criteria.hasSpecial ? <Check size={12} /> : <XIcon size={12} />} Special symbol
              </span>
            </div>
          )}

          <Field label="Confirm New Password">
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showConfirmPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: "var(--t-radius, 10px)",
                  border: `1.5px solid ${THEME.line}`,
                  fontSize: 14,
                  background: "var(--t-paper)",
                  color: THEME.ink,
                  fontFamily: "inherit",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {confirmPassword && confirmPassword === newPassword && (
            <div
              style={{
                fontSize: 12,
                color: THEME.sage,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <CheckCircle2 size={13} /> Passwords match perfectly
            </div>
          )}

          <div style={{ marginTop: 6 }}>
            <Button
              type="submit"
              variant="accent"
              disabled={updatingPass || !isPasswordValid}
              icon={<Lock size={14} />}
            >
              {updatingPass ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Active Session & Logs ── */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Smartphone size={16} color={THEME.accent} /> Active Session &amp; System Logs
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: "var(--t-radius, 10px)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: THEME.muted,
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Signed In As
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: THEME.ink,
                marginTop: 4,
                wordBreak: "break-all",
              }}
            >
              {userEmail}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
              Account UID: {session?.user?.id?.slice(0, 12) || "local-user"}...
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: "var(--t-radius, 10px)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: THEME.muted,
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Last Authentication
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginTop: 4 }}>
              {lastSignIn}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
              Account registered: {createdAt}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {setAppTab && (
            <Button
              variant="secondary"
              icon={<ClipboardList size={14} />}
              onClick={() => setAppTab("auditlog")}
            >
              View System Audit Log
            </Button>
          )}
          <Button variant="danger" onClick={onSignOut} icon={<LogOut size={14} />}>
            Sign Out of Account
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Section: Family Profiles ──────────────────────────────────────────────────
function FamilyProfilesSection({ masterData, updateMasterData }: any) {
  const savedProfiles: any[] = masterData?.familyProfiles || DEFAULT_MASTER_DATA.familyProfiles;
  const [rows, setRows] = useState(savedProfiles);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setRows(masterData?.familyProfiles || DEFAULT_MASTER_DATA.familyProfiles);
  }, [masterData?.familyProfiles]);

  const isDirty = JSON.stringify(rows) !== JSON.stringify(savedProfiles);

  const setName = (id: string, name: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, name } : r)));

  const setDob = (id: string, dob: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, dob } : r)));

  const trimmedNames = rows.map((r) => (r.name || "").trim());
  const hasEmptyName = trimmedNames.some((n) => !n);
  const lowerNames = trimmedNames.map((n) => n.toLowerCase());
  const hasDuplicateName = lowerNames.some((n, i) => n && lowerNames.indexOf(n) !== i);

  const todayStr = today();
  const hasFutureDob = rows.some((r) => r.dob && r.dob > todayStr);
  const isValid = !hasEmptyName && !hasDuplicateName && !hasFutureDob;

  const save = () => {
    if (!isValid) return;
    updateMasterData("familyProfiles", rows);
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 2200);
  };

  const cancel = () => setRows(savedProfiles);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const inp = {
    width: "100%",
    padding: "9px 12px",
    background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`,
    borderRadius: "var(--t-radius, 10px)",
    color: THEME.ink,
    fontSize: 13.5,
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  return (
    <Card style={{ padding: 26, borderTop: `4px solid ${THEME.accent}` }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink }}>
            Family Profiles &amp; Age Demographics
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 6,
              background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
              color: THEME.accent,
            }}
          >
            DOB &amp; Age Integrated
          </span>
        </div>
        <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
          Manage family members and dates of birth. DOB dynamically powers age-based tax deductions
          (Section 80D senior citizen caps &amp; Section 80TTB), Government Scheme eligibility (SSY,
          APY, SCSS), milestone ages in Life Event Planner, and retirement projections.
        </div>
      </div>

      <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
        {rows.map((p) => {
          const initials = (p.name || "?")
            .split(" ")
            .map((w: string) => w[0] || "")
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const isHuf = p.relation === "HUF" || p.id === "huf";
          const ageFormatted = !isHuf ? formatAge(p.dob) : null;
          const isSenior = !isHuf && isSeniorCitizen(p.dob);
          const minor = !isHuf && isMinor(p.dob);

          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "16px 18px",
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                borderRadius: "var(--t-radius, 12px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
                      border: `2px solid color-mix(in srgb, ${THEME.accent} 27%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      fontWeight: 900,
                      color: THEME.accent,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: THEME.ink }}>
                        {p.relation}
                      </span>
                      {isHuf && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "var(--t-muted)15",
                            color: THEME.muted,
                          }}
                        >
                          Entity
                        </span>
                      )}
                      {isSenior && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: `color-mix(in srgb, ${THEME.gold} 18%, transparent)`,
                            color: THEME.gold,
                          }}
                        >
                          Senior Citizen (60+)
                        </span>
                      )}
                      {minor && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: `color-mix(in srgb, ${THEME.violet || THEME.accent} 18%, transparent)`,
                            color: THEME.violet || THEME.accent,
                          }}
                        >
                          Minor
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                      {ageFormatted ? (
                        <span style={{ fontWeight: 600, color: THEME.ink }}>
                          Age: {ageFormatted}
                        </span>
                      ) : isHuf ? (
                        "Hindu Undivided Family (Entity)"
                      ) : (
                        "DOB not set — age will not be calculated"
                      )}
                    </div>
                  </div>
                </div>

                {ageFormatted && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                      color: THEME.accent,
                      border: `1px solid color-mix(in srgb, ${THEME.accent} 22%, transparent)`,
                    }}
                  >
                    <Calendar size={12} style={{ flexShrink: 0 }} />
                    <span>{ageFormatted}</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginTop: 2,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 4,
                    }}
                  >
                    Display Name
                  </label>
                  <input
                    style={inp}
                    aria-label={`Display name for ${p.relation}`}
                    value={p.name}
                    onChange={(e) => setName(p.id, e.target.value)}
                    placeholder={p.relation}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 4,
                    }}
                  >
                    {isHuf ? "Formation Date (Optional)" : "Date of Birth"}
                  </label>
                  <input
                    style={inp}
                    type="date"
                    max={todayStr}
                    aria-label={`Date of birth for ${p.relation}`}
                    value={p.dob ? p.dob.split("T")[0] : ""}
                    onChange={(e) => setDob(p.id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(hasEmptyName || hasDuplicateName || hasFutureDob) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.rust} 27%, transparent)`,
            fontSize: 12,
            color: THEME.rust,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          {hasEmptyName
            ? "Every profile needs a name — it cannot be left blank."
            : hasDuplicateName
              ? "Two profiles cannot share the exact same name."
              : "Date of birth cannot be in the future."}
        </div>
      )}

      {/* Connected Modules Callout */}
      <div
        style={{
          background: `color-mix(in srgb, ${THEME.accent} 5%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.accent} 18%, transparent)`,
          borderRadius: "var(--t-radius, 10px)",
          padding: "14px 18px",
          marginBottom: 20,
          fontSize: 12.5,
          color: THEME.ink,
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: THEME.accent,
          }}
        >
          <Lightbulb size={15} />
          <span>Automated Cross-Module Date of Birth Integrations</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
            color: THEME.muted,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Shield size={14} color={THEME.accent} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <strong style={{ color: THEME.ink }}>Tax Deductions:</strong> Auto-elevates 80D limit
              to ₹50,000 for senior citizens (60+) &amp; 80TTB
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Landmark size={14} color={THEME.accent} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <strong style={{ color: THEME.ink }}>Govt Schemes:</strong> Checks SSY (girl child
              &le;10y), APY (18–40y), SCSS (60+y) eligibility
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Target size={14} color={THEME.accent} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <strong style={{ color: THEME.ink }}>Life Event Milestones:</strong> Computes exact
              member age at future milestone target dates
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <TrendingUp size={14} color={THEME.accent} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <strong style={{ color: THEME.ink }}>Retirement / FIRE:</strong> Synchronizes current
              age for precise compounding projections
            </div>
          </div>
        </div>
      </div>

      {/* Save Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {isDirty ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: THEME.gold,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: THEME.gold,
                display: "inline-block",
              }}
            />
            Unsaved family profile changes
          </span>
        ) : (
          <span style={{ fontSize: 12, color: THEME.muted }}>
            Family profiles are synchronized across all modules.
          </span>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isDirty && (
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={save}
            disabled={!isValid}
            icon={saved ? <Check size={15} /> : undefined}
            style={
              saved
                ? { background: THEME.sage }
                : isDirty && isValid
                  ? {}
                  : { opacity: 0.6 }
            }
          >
            {saved ? "Family Profiles Saved!" : "Save Family Profiles"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Section: Master Data ─────────────────────────────────────────────────────
function MasterDataSection({ masterData, updateMasterData }: any) {
  const md = masterData || DEFAULT_MASTER_DATA;
  const [mdTab, setMdTab] = useState("transactions");

  const activeGroup = MD_GROUPS.find((g) => g.id === mdTab) || MD_GROUPS[0];

  const tabsWithCounts = MD_GROUPS.map((g) => ({
    ...g,
    count: g.keys.reduce((s, k) => s + (md[k]?.length || 0), 0),
  }));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          padding: "14px 18px",
          borderRadius: "var(--t-radius, 10px)",
          background: `color-mix(in srgb, ${THEME.accent} 4%, var(--surface-0))`,
          border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
          fontSize: 13,
          color: THEME.ink,
          lineHeight: 1.6,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <Tags size={18} color={THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: THEME.accent }}>Master Data Command Hub:</strong> Customize every
          single dropdown option across transaction forms, bank ledgers, credit cards, mutual funds,
          and loan categories. Changes reflect in real-time everywhere.
        </div>
      </div>

      <PillNav tabs={tabsWithCounts} active={mdTab} onChange={setMdTab} />

      <div style={{ display: "grid", gap: 14 }}>
        {activeGroup.keys.map((key) => (
          <EditableList
            key={key}
            listKey={key}
            items={md[key] || []}
            onUpdate={updateMasterData}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Section: Data & Account Management ───────────────────────────────────────
function DataSection({
  exportJSON,
  onRestoreBackup,
  resetAll,
  onSignOut,
  cleanupOrphaned,
  state,
  lastBackupTs,
}: any) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const daysSinceBackup =
    lastBackupTs != null
      ? Math.floor((Date.now() - new Date(lastBackupTs).getTime()) / DAY_MS)
      : null;
  const backupStatus =
    daysSinceBackup === null
      ? { label: "Never backed up on this device", color: THEME.rust }
      : daysSinceBackup < 7
        ? { label: `Last backup: ${new Date(lastBackupTs).toLocaleString()}`, color: THEME.sage }
        : daysSinceBackup <= 30
          ? { label: `Last backup: ${new Date(lastBackupTs).toLocaleString()}`, color: THEME.gold }
          : { label: `Last backup: ${new Date(lastBackupTs).toLocaleString()}`, color: THEME.rust };

  const csvExports = [
    {
      label: "Bank Transactions",
      key: "transactions",
      icon: Banknote,
      cols: [
        { key: "date", label: "Date" },
        { key: "type", label: "Type" },
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount" },
        { key: "note", label: "Note" },
        { key: "narration", label: "Narration" },
        { key: "referenceNumber", label: "Reference" },
        { key: "owner", label: "Owner" },
      ],
    },
    {
      label: "Stock Holdings",
      key: "stocks",
      icon: TrendingUp,
      cols: [
        { key: "symbol", label: "Symbol" },
        { key: "qty", label: "Qty" },
        { key: "avgPrice", label: "Avg Price" },
        { key: "currentPrice", label: "Current Price" },
        { key: "owner", label: "Owner" },
      ],
    },
    {
      label: "Mutual Funds",
      key: "mutualFunds",
      icon: BarChart3,
      cols: [
        { key: "name", label: "Scheme" },
        { key: "folioNumber", label: "Folio" },
        { key: "units", label: "Units" },
        { key: "buyNav", label: "Buy NAV" },
        { key: "currentNav", label: "Current NAV" },
        { key: "mfCode", label: "AMFI Code" },
        { key: "owner", label: "Owner" },
      ],
    },
    {
      label: "Fixed Deposits",
      key: "fixedDeposits",
      icon: Landmark,
      cols: [
        { key: "bank", label: "Bank" },
        { key: "principal", label: "Principal" },
        { key: "rate", label: "Rate %" },
        { key: "years", label: "Years" },
        { key: "startDate", label: "Start" },
        { key: "maturityDate", label: "Maturity" },
      ],
    },
    {
      label: "Financial Goals",
      key: "goals",
      icon: Target,
      cols: [
        { key: "name", label: "Goal" },
        { key: "category", label: "Category" },
        { key: "targetAmount", label: "Target" },
        { key: "currentAmount", label: "Saved" },
        { key: "priority", label: "Priority" },
        { key: "targetDate", label: "Target Date" },
      ],
    },
    {
      label: "Tax Payments",
      key: "taxPayments",
      icon: Receipt,
      cols: [
        { key: "date", label: "Date" },
        { key: "type", label: "Type" },
        { key: "amount", label: "Amount" },
        { key: "note", label: "Note" },
      ],
    },
    {
      label: "Insurance (LIC)",
      key: "lic",
      icon: Shield,
      cols: [
        { key: "planName", label: "Plan" },
        { key: "policyNumber", label: "Policy No" },
        { key: "sumAssured", label: "Sum Assured" },
        { key: "annualPremium", label: "Annual Premium" },
      ],
    },
    {
      label: "Loans Taken",
      key: "loansTaken",
      icon: Home,
      cols: [
        { key: "type", label: "Type" },
        { key: "principal", label: "Principal" },
        { key: "outstanding", label: "Outstanding" },
        { key: "emi", label: "EMI" },
        { key: "rate", label: "Rate %" },
      ],
    },
    {
      label: "Credit Cards",
      key: "creditCards",
      icon: CreditCard,
      cols: [
        { key: "issuer", label: "Issuer" },
        { key: "network", label: "Network" },
        { key: "limit", label: "Limit" },
        { key: "outstanding", label: "Outstanding" },
        { key: "billDate", label: "Bill Date" },
      ],
    },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Backup & Restore Hub */}
      <Card style={{ padding: 24, borderTop: `4px solid ${THEME.sage}` }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Database size={18} color={THEME.sage} /> Complete JSON Backup &amp; Restore
        </div>
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 14, marginTop: 4 }}>
          Export your entire encrypted financial database as a portable `.json` snapshot or restore
          from a previously exported backup file.
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: backupStatus.color,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: backupStatus.color,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {backupStatus.label}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => exportJSON()} icon={<Download size={15} />}>
            Export Full Backup (.json)
          </Button>
          <div style={{ position: "relative" }}>
            <Button variant="secondary" icon={<RefreshCw size={15} />}>
              Restore from Backup
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={onRestoreBackup}
              aria-label="Restore from backup JSON file"
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
            />
          </div>
        </div>
      </Card>

      {/* Domain CSV Exports */}
      <Card style={{ padding: 24, borderTop: `4px solid ${THEME.accent}` }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileSpreadsheet size={18} color={THEME.accent} /> Domain CSV Data Exports
        </div>
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 16, marginTop: 4 }}>
          Download individual ledgers and tables as standard CSV spreadsheets compatible with Microsoft
          Excel, Google Sheets, and Apple Numbers.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: 10,
          }}
        >
          {csvExports.map((exp) => {
            const count = (state?.[exp.key] || []).length;
            const Icon = exp.icon;
            return (
              <button
                key={exp.key}
                disabled={count === 0}
                onClick={() => {
                  const ts = new Date().toISOString().slice(0, 10);
                  exportArrayToCSV(state[exp.key] || [], exp.cols, `${exp.key}_${ts}.csv`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "var(--t-radius, 10px)",
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  color: count === 0 ? THEME.muted : THEME.ink,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: count === 0 ? "default" : "pointer",
                  fontFamily: "inherit",
                  opacity: count === 0 ? 0.5 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon size={14} color={count > 0 ? THEME.accent : THEME.muted} />
                  <span>{exp.label}</span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: `color-mix(in srgb, ${THEME.muted} 15%, transparent)`,
                    color: THEME.muted,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Database Maintenance */}
      <Card style={{ padding: 24, borderTop: `4px solid ${THEME.gold}` }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <RotateCcw size={16} color={THEME.gold} /> Database Maintenance &amp; Cleanup
        </div>
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 16, marginTop: 4 }}>
          Scan and remove orphaned historical records (e.g. corporate action logs without a parent
          stock or sold position).
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            setCleaning(true);
            await cleanupOrphaned();
            setCleaning(false);
          }}
          icon={<RefreshCw size={14} className={cleaning ? "animate-spin" : ""} />}
        >
          {cleaning ? "Cleaning up records..." : "Cleanup Orphaned Portfolio Records"}
        </Button>
      </Card>

      {/* Danger Zone */}
      <Card style={{ padding: 24, borderTop: `4px solid ${THEME.rust}` }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: THEME.rust,
          }}
        >
          <AlertTriangle size={16} /> Danger Zone (Irreversible Data Actions)
        </div>
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 18, marginTop: 4 }}>
          Permanently clear all financial ledger entries, investments, goals, and profiles from
          this account.
        </p>

        {!confirmReset ? (
          <Button
            variant="danger"
            onClick={() => setConfirmReset(true)}
            icon={<AlertTriangle size={14} />}
          >
            Reset All Financial Data
          </Button>
        ) : (
          <div
            style={{
              padding: "16px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.rust} 27%, transparent)`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: THEME.rust,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertTriangle size={16} color={THEME.rust} style={{ flexShrink: 0 }} />
              <span>Are you absolutely certain? This will permanently delete ALL data records.</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button
                variant="danger"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                }}
              >
                Yes, delete everything permanently
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Sign Out Card */}
      <Card style={{ padding: "18px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: THEME.ink, marginBottom: 2 }}>
              End Session &amp; Sign Out
            </div>
            <div style={{ fontSize: 12, color: THEME.muted }}>
              Safely terminates your active token session and redirects to the login screen.
            </div>
          </div>
          <Button variant="secondary" onClick={onSignOut} icon={<LogOut size={14} />}>
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Section: Email Summary Reports ───────────────────────────────────────────
const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function nextScheduledSendIST(frequency: string, day: number): Date {
  const IST_OFFSET_MS = 330 * 60000;
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const curDate = ist.getUTCDate();
  const curDay = ist.getUTCDay();
  const pastCutoff = ist.getUTCHours() >= 8;
  const at8AmIST = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 2, 30, 0));
  const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  if (frequency === "daily") {
    const t = new Date(ist.getTime());
    t.setUTCDate(t.getUTCDate() + (pastCutoff ? 1 : 0));
    return at8AmIST(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  }

  if (frequency === "weekly") {
    let delta = (day - curDay + 7) % 7;
    if (delta === 0 && pastCutoff) delta = 7;
    const t = new Date(ist.getTime());
    t.setUTCDate(t.getUTCDate() + delta);
    return at8AmIST(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  }

  let y = ist.getUTCFullYear();
  let m = ist.getUTCMonth();
  let effDay = Math.min(day, daysInMonth(y, m));
  if (!(curDate < effDay || (curDate === effDay && !pastCutoff))) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    effDay = Math.min(day, daysInMonth(y, m));
  }
  return at8AmIST(y, m, effDay);
}

function EmailSummarySection({ state, emailSettings, updateEmailSettings }: any) {
  const es = emailSettings || {};
  const enabled = !!es.emailEnabled;
  const rawFrequency = es.emailFrequency || "weekly";
  const savedAddress = es.emailAddress || "";
  const savedFromEmail = es.fromEmail || "";

  // Multi-select cadence parsing
  const selectedFrequencies = useMemo(() => {
    if (!rawFrequency) return ["weekly"];
    const parts = String(rawFrequency)
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => ["daily", "weekly", "monthly"].includes(s));
    return parts.length > 0 ? parts : ["weekly"];
  }, [rawFrequency]);

  const [activePreviewCadence, setActivePreviewCadence] = useState<string>("weekly");
  useEffect(() => {
    if (!selectedFrequencies.includes(activePreviewCadence)) {
      setActivePreviewCadence(selectedFrequencies[0] || "weekly");
    }
  }, [selectedFrequencies, activePreviewCadence]);

  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"" | "ok" | "err">("");
  const [errMsg, setErrMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    try {
      const local = localStorage.getItem("finance-email-from");
      if (local && local.trim() && !es.fromEmail) {
        updateEmailSettings({ fromEmail: local.trim() });
        localStorage.removeItem("finance-email-from");
      }
    } catch {}
  }, []);

  const [addrBuf, setAddrBuf] = useState({ emailAddress: savedAddress, fromEmail: savedFromEmail });
  const [addrSaved, setAddrSaved] = useState(false);
  const addrSavedTimerRef = useRef<any>(null);
  useEffect(() => {
    setAddrBuf({ emailAddress: savedAddress, fromEmail: savedFromEmail });
  }, [savedAddress, savedFromEmail]);
  useEffect(
    () => () => {
      if (addrSavedTimerRef.current) clearTimeout(addrSavedTimerRef.current);
    },
    []
  );
  const addrDirty =
    addrBuf.emailAddress !== savedAddress || addrBuf.fromEmail !== savedFromEmail;
  function saveAddress() {
    updateEmailSettings({
      emailAddress: addrBuf.emailAddress.trim(),
      fromEmail: addrBuf.fromEmail.trim(),
    });
    setAddrSaved(true);
    if (addrSavedTimerRef.current) clearTimeout(addrSavedTimerRef.current);
    addrSavedTimerRef.current = setTimeout(() => setAddrSaved(false), 2200);
  }

  const [dayBuf, setDayBuf] = useState(String(Number(es.emailDay ?? 1)));
  useEffect(() => {
    setDayBuf(String(Number(es.emailDay ?? 1)));
  }, [es.emailDay]);
  const day = Number(es.emailDay ?? 1);

  const address = savedAddress;
  const fromEmail = savedFromEmail;

  function toggleFrequency(val: string) {
    const exists = selectedFrequencies.includes(val);
    let next: string[];
    if (exists) {
      if (selectedFrequencies.length <= 1) {
        // Keep at least one cadence selected
        return;
      }
      next = selectedFrequencies.filter((f: string) => f !== val);
    } else {
      const order = ["daily", "weekly", "monthly"];
      next = [...selectedFrequencies, val].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }
    updateEmailSettings({ emailFrequency: next.join(",") });
  }

  const scheduledDeliveries = useMemo(() => {
    return selectedFrequencies
      .map((f: string) => {
        const next = nextScheduledSendIST(f, day);
        const hoursAway = (next.getTime() - Date.now()) / 3600000;
        const timeLabel =
          hoursAway < 20
            ? "Today at 8:00 AM IST"
            : hoursAway < 44
              ? "Tomorrow at 8:00 AM IST"
              : `${next.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                })} at 8:00 AM IST`;
        const label =
          f === "daily" ? "Daily Digest" : f === "weekly" ? "Weekly Briefing" : "Monthly Executive";
        const desc =
          f === "daily"
            ? "Every morning at 8:00 AM IST"
            : f === "weekly"
              ? `Every ${WEEKDAYS.find((w) => w.value === day)?.label || "Monday"} at 8:00 AM IST`
              : `Day ${day} of every month at 8:00 AM IST`;
        return { freq: f, date: next, hoursAway, timeLabel, label, desc };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedFrequencies, day]);

  const inp: any = {
    width: "100%",
    padding: "10px 14px",
    boxSizing: "border-box",
    background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`,
    borderRadius: "var(--t-radius, 10px)",
    color: THEME.ink,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  };

  async function handleSendTest(targetCadence?: string) {
    if (!address) return;
    const chosenFreq = targetCadence || activePreviewCadence || selectedFrequencies[0] || "weekly";
    setSending(true);
    setSendStatus("");
    setErrMsg("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/send-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          emailTo: address,
          frequency: chosenFreq,
          recipientName: state?.profile?.name || "there",
          fromEmail: fromEmail.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.sent) {
        setSendStatus("ok");
      } else {
        setSendStatus("err");
        setErrMsg(json.hint ? `${json.error} — ${json.hint}` : json.error || "Unknown error");
      }
    } catch (e: any) {
      setSendStatus("err");
      setErrMsg(e.message);
    } finally {
      setSending(false);
      setTimeout(() => setSendStatus(""), 12000);
    }
  }

  async function handleCheckConfig() {
    setChecking(true);
    setHealth(null);
    try {
      const params = fromEmail.trim()
        ? `?action=healthcheck&fromEmail=${encodeURIComponent(fromEmail.trim())}`
        : "?action=healthcheck";
      const res = await fetch(`/api/send-summary${params}`);
      const json = await res.json();
      setHealth(json);
    } catch (e: any) {
      setHealth({ error: e.message });
    } finally {
      setChecking(false);
    }
  }

  async function handlePreview(targetCadence?: string) {
    const chosenFreq = targetCadence || activePreviewCadence || selectedFrequencies[0] || "weekly";
    setActivePreviewCadence(chosenFreq);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml(null);
    setPreviewError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const params = new URLSearchParams({ action: "preview", frequency: chosenFreq });
      const res = await fetch(`/api/send-summary?${params.toString()}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}) as any);
        throw new Error(json.error || `Preview failed (${res.status})`);
      }
      setPreviewHtml(await res.text());
    } catch (e: any) {
      setPreviewError(e.message || "Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  const freqOptions = [
    { value: "daily", label: "Daily Digest", desc: "Every morning at 8:00 AM IST" },
    { value: "weekly", label: "Weekly Briefing", desc: "Once a week on your chosen weekday" },
    { value: "monthly", label: "Monthly Executive", desc: "Once a month on your chosen calendar date" },
  ];

  const earliestDelivery = scheduledDeliveries[0];

  function getCadenceIcon(cadence: string, size = 16, color?: string) {
    if (cadence === "daily") {
      return <Sun size={size} color={color || THEME.accent} style={{ flexShrink: 0 }} />;
    }
    if (cadence === "weekly") {
      return <BarChart3 size={size} color={color || THEME.accent} style={{ flexShrink: 0 }} />;
    }
    return <TrendingUp size={size} color={color || THEME.accent} style={{ flexShrink: 0 }} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Enable Toggle Card */}
      <Card style={{ padding: 24, borderTop: `4px solid ${THEME.accent}` }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: THEME.accent,
                  flexShrink: 0,
                }}
              >
                <Mail size={22} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink }}>
                Automated Financial Email Reports
              </div>
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.6, maxWidth: 520 }}>
              Get your complete wealth picture delivered straight to your inbox — Net Worth, cash
              flow, investment returns, upcoming bill dues, budget health, and AI alerts.
            </div>
          </div>
          <button
            onClick={() => updateEmailSettings({ emailEnabled: !enabled })}
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? "Disable email summary reports" : "Enable email summary reports"}
            style={{
              position: "relative",
              width: 56,
              height: 30,
              borderRadius: 99,
              background: enabled ? THEME.accent : THEME.line,
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.2s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 3,
                left: enabled ? 29 : 4,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
              }}
            />
          </button>
        </div>

        {enabled && (
          <div
            style={{
              marginTop: 20,
              padding: "14px 18px",
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              borderRadius: 12,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
              fontSize: 12.5,
              color: THEME.muted,
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: THEME.accent }}>Backend Dispatch Engine:</strong> Automated
            reports are delivered via Resend API and Supabase Edge cron triggers. Multi-cadence
            scheduling allows receiving daily, weekly, and monthly reports concurrently.
          </div>
        )}
      </Card>

      {enabled && (
        <>
          {/* Delivery History & Next Schedule */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Delivery Status &amp; Timeline
            </div>
            {(() => {
              const lastAt = es.lastEmailSentAt ? new Date(es.lastEmailSentAt) : null;
              const failed = es.lastEmailStatus === "failed";
              const daysSince = lastAt
                ? Math.floor((Date.now() - lastAt.getTime()) / 86400000)
                : null;
              const color = !lastAt ? THEME.muted : failed ? THEME.rust : THEME.sage;
              return (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {!lastAt ? (
                    <Clock size={18} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : failed ? (
                    <XCircle size={18} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : (
                    <CheckCircle2
                      size={18}
                      color={color}
                      style={{ flexShrink: 0, marginTop: 1 }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color }}>
                      {!lastAt
                        ? "No automated email sent yet"
                        : failed
                          ? "Last send attempt failed"
                          : `Last digest delivered ${daysSince === 0 ? "today" : daysSince === 1 ? "yesterday" : `${daysSince} days ago`}`}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      {!lastAt
                        ? "Automated reports trigger at 8:00 AM IST according to your active schedules."
                        : failed
                          ? es.lastEmailError || "Delivery failure. Check server health check below."
                          : lastAt.toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {address && earliestDelivery && (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: `1px solid ${THEME.line}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <Calendar size={18} color={THEME.accent} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>Next Scheduled Delivery</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 99,
                          background: `color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                          color: THEME.accent,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {getCadenceIcon(earliestDelivery.freq, 12, THEME.accent)}
                        <span>{earliestDelivery.label}</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      {earliestDelivery.timeLabel}
                    </div>
                  </div>
                </div>

                {scheduledDeliveries.length > 1 && (
                  <div
                    style={{
                      marginTop: 4,
                      padding: "10px 14px",
                      background: "var(--surface-0)",
                      borderRadius: 8,
                      border: `1px solid ${THEME.line}`,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                      Active Cadences:
                    </span>
                    {scheduledDeliveries.map((s) => (
                      <div
                        key={s.freq}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          color: THEME.ink,
                          fontWeight: 600,
                        }}
                      >
                        {getCadenceIcon(s.freq, 13, THEME.accent)}
                        <span>{s.label}:</span>
                        <span style={{ color: THEME.muted, fontWeight: 500 }}>{s.timeLabel}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Delivery Address Setup */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Recipient &amp; Sender Configuration
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Recipient Email (Where to send reports)">
                <input
                  style={inp}
                  type="email"
                  placeholder="your.email@example.com"
                  value={addrBuf.emailAddress}
                  onChange={(e) => setAddrBuf((b) => ({ ...b, emailAddress: e.target.value }))}
                />
              </Field>
              <Field label="Sender Email (Verified Custom Domain - Optional)">
                <input
                  style={inp}
                  type="email"
                  placeholder="e.g. reports@yourdomain.com (Leave blank for default onboarding@resend.dev)"
                  value={addrBuf.fromEmail}
                  onChange={(e) => setAddrBuf((b) => ({ ...b, fromEmail: e.target.value }))}
                />
              </Field>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={saveAddress}
                  disabled={!addrDirty}
                  icon={addrSaved ? <Check size={14} /> : undefined}
                  style={
                    addrSaved
                      ? { background: THEME.sage }
                      : !addrDirty
                        ? { opacity: 0.6 }
                        : {}
                  }
                >
                  {addrSaved ? "Address Saved!" : "Save Email Settings"}
                </Button>
                {addrDirty && !addrSaved && (
                  <span style={{ fontSize: 12, color: THEME.gold, fontWeight: 600 }}>
                    Unsaved changes — save before sending test or previewing
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Frequency & Schedule */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Frequency &amp; Timing Schedule
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                  color: THEME.accent,
                }}
              >
                Multi-Select Enabled
              </span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginBottom: 10 }}>
                Select Cadences (Choose one or multiple)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {freqOptions.map((f) => {
                  const isSelected = selectedFrequencies.includes(f.value);
                  const isOnlyOne = isSelected && selectedFrequencies.length === 1;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => toggleFrequency(f.value)}
                      aria-pressed={isSelected}
                      title={isOnlyOne ? "At least one frequency must remain selected" : undefined}
                      style={{
                        padding: "16px 18px",
                        borderRadius: "var(--t-radius, 12px)",
                        border: isSelected
                          ? `2px solid ${THEME.accent}`
                          : `1.5px solid ${THEME.line}`,
                        background: isSelected
                          ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                          : "var(--surface-0)",
                        cursor: "pointer",
                        textAlign: "left" as const,
                        fontFamily: "inherit",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected
                          ? `0 2px 12px color-mix(in srgb, ${THEME.accent} 15%, transparent)`
                          : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {getCadenceIcon(f.value, 18, isSelected ? THEME.accent : THEME.muted)}
                          <div
                            style={{
                              fontSize: 14.5,
                              fontWeight: 700,
                              color: isSelected ? THEME.accent : THEME.ink,
                            }}
                          >
                            {f.label}
                          </div>
                        </div>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isSelected ? THEME.accent : "var(--t-paper)",
                            border: `1.5px solid ${isSelected ? THEME.accent : THEME.line}`,
                            color: "#fff",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.4 }}>
                        {f.desc}
                      </div>
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: isSelected
                              ? `color-mix(in srgb, ${THEME.accent} 16%, transparent)`
                              : `color-mix(in srgb, ${THEME.line} 60%, transparent)`,
                            color: isSelected ? THEME.accent : THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {isSelected ? "Active Cadence" : "Click to Enable"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Lightbulb size={13} color={THEME.accent} style={{ flexShrink: 0 }} />
                <span>You can select multiple schedules (Daily, Weekly, Monthly) to receive reports at multiple intervals.</span>
              </div>
            </div>

            {/* Timing controls for Weekly schedule */}
            {selectedFrequencies.includes("weekly") && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "16px 18px",
                  background: "var(--surface-0)",
                  borderRadius: "var(--t-radius, 10px)",
                  border: `1px solid ${THEME.line}`,
                  borderLeft: `4px solid ${THEME.accent}`,
                }}
              >
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: THEME.ink,
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <BarChart3 size={15} color={THEME.accent} style={{ flexShrink: 0 }} />
                  <span>Weekly Schedule: Preferred Delivery Day</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => updateEmailSettings({ emailDay: d.value })}
                      aria-pressed={day === d.value}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 8,
                        cursor: "pointer",
                        border:
                          day === d.value
                            ? `2px solid ${THEME.accent}`
                            : `1.5px solid ${THEME.line}`,
                        fontFamily: "inherit",
                        fontSize: 13,
                        fontWeight: 600,
                        background:
                          day === d.value
                            ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                            : "var(--t-paper)",
                        color: day === d.value ? THEME.accent : THEME.muted,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timing controls for Monthly schedule */}
            {selectedFrequencies.includes("monthly") && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "16px 18px",
                  background: "var(--surface-0)",
                  borderRadius: "var(--t-radius, 10px)",
                  border: `1px solid ${THEME.line}`,
                  borderLeft: `4px solid ${THEME.accent}`,
                }}
              >
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: THEME.ink,
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <TrendingUp size={15} color={THEME.accent} style={{ flexShrink: 0 }} />
                  <span>Monthly Schedule: Day of Month (1 - 28)</span>
                </div>
                <div style={{ maxWidth: 260 }}>
                  <input
                    style={inp}
                    type="number"
                    min="1"
                    max="28"
                    placeholder="e.g. 1"
                    value={dayBuf}
                    onChange={(e) => setDayBuf(e.target.value)}
                    onBlur={() => {
                      const n = Math.round(Number(dayBuf));
                      const clamped = Number.isFinite(n) ? Math.min(28, Math.max(1, n)) : day;
                      setDayBuf(String(clamped));
                      if (clamped !== day) updateEmailSettings({ emailDay: clamped });
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                  Capped to 28 so scheduled deliveries run consistently every month without leap year skips.
                </div>
              </div>
            )}

            {/* Daily schedule indicator */}
            {selectedFrequencies.includes("daily") && (
              <div
                style={{
                  padding: "14px 18px",
                  background: "var(--surface-0)",
                  borderRadius: "var(--t-radius, 10px)",
                  border: `1px solid ${THEME.line}`,
                  borderLeft: `4px solid ${THEME.accent}`,
                  fontSize: 12.5,
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Sun size={15} color={THEME.accent} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ color: THEME.ink }}>Daily Schedule:</strong> Dispatches automatically every morning at 8:00 AM IST.
                </div>
              </div>
            )}
          </Card>

          {/* 11 Modules Included Grid */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              11 Financial Modules Included in Every Report
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 10,
              }}
            >
              {[
                {
                  icon: Wallet,
                  title: "Net Worth Breakdown",
                  desc: "Assets vs liabilities with MoM change",
                  color: THEME.sage,
                },
                {
                  icon: Banknote,
                  title: "Monthly Cash Flow",
                  desc: "Income vs expenses & savings rate",
                  color: THEME.accent,
                },
                {
                  icon: TrendingUp,
                  title: "Investments Portfolio",
                  desc: "MF, Stocks, FD, RD, PPF, NPS, EPF, Bonds",
                  color: THEME.sage,
                },
                {
                  icon: Landmark,
                  title: "Physical Assets",
                  desc: "Real estate & vehicle valuation",
                  color: THEME.sage,
                },
                {
                  icon: ClipboardList,
                  title: "Liabilities Ledger",
                  desc: "Home, auto & personal loans balance",
                  color: THEME.rust,
                },
                {
                  icon: CreditCard,
                  title: "Credit Card Health",
                  desc: "Utilization % and upcoming statements",
                  color: THEME.rust,
                },
                {
                  icon: BarChart3,
                  title: "Budget Gauges",
                  desc: "Category budgets with alert bars",
                  color: THEME.gold,
                },
                {
                  icon: ShoppingBag,
                  title: "Top Expense Drivers",
                  desc: "Largest outflow categories this period",
                  color: THEME.gold,
                },
                {
                  icon: Target,
                  title: "Goal Milestones",
                  desc: "Progress trajectory toward FIRE & savings",
                  color: THEME.accent,
                },
                {
                  icon: Calendar,
                  title: "Upcoming Dues",
                  desc: "Bills, EMIs & insurance due in 7 days",
                  color: THEME.gold,
                },
                {
                  icon: Zap,
                  title: "Smart System Alerts",
                  desc: "FD maturities, emergency fund & debt ratio",
                  color: THEME.rust,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 14px",
                    background: "var(--surface-0)",
                    borderRadius: "var(--t-radius, 10px)",
                    border: `1px solid ${THEME.line}`,
                    borderTop: `3px solid color-mix(in srgb, ${item.color} 30%, transparent)`,
                  }}
                >
                  <item.icon size={18} style={{ flexShrink: 0 }} color={item.color} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Test & Live Preview Actions */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Verification &amp; Test Dispatch
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 16 }}>
              Send an immediate test digest using current portfolio state, or render the live HTML
              email in a modal. Select the cadence format to test.
            </div>

            {/* Cadence format selector for test & preview */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>
                Report Format:
              </span>
              {freqOptions.map((f) => {
                const isActive = activePreviewCadence === f.value;
                const isSubscribed = selectedFrequencies.includes(f.value);
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setActivePreviewCadence(f.value)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isActive ? `2px solid ${THEME.accent}` : `1px solid ${THEME.line}`,
                      background: isActive
                        ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                        : "var(--surface-0)",
                      color: isActive ? THEME.accent : THEME.ink,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {getCadenceIcon(f.value, 13, isActive ? THEME.accent : THEME.muted)}
                    <span>{f.label}</span>
                    {isSubscribed && (
                      <span
                        style={{
                          fontSize: 9.5,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: `color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
                          color: THEME.accent,
                          fontWeight: 700,
                        }}
                      >
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                onClick={() => handlePreview(activePreviewCadence)}
                loading={previewLoading}
              >
                Preview Live HTML Email ({freqOptions.find((f) => f.value === activePreviewCadence)?.label})
              </Button>
              <Button
                variant="accent"
                onClick={() => handleSendTest(activePreviewCadence)}
                disabled={!address || addrDirty}
                loading={sending}
              >
                Send Test Email ({freqOptions.find((f) => f.value === activePreviewCadence)?.label})
              </Button>
              <Button
                variant="secondary"
                onClick={handleCheckConfig}
                loading={checking}
                icon={<Activity size={14} />}
              >
                Server Health Check
              </Button>
              {sendStatus === "ok" && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 13,
                    color: THEME.sage,
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> Email dispatched
                  successfully to {address}
                </span>
              )}
              {sendStatus === "err" && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 13,
                    color: THEME.rust,
                    fontWeight: 600,
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} /> {errMsg}
                </span>
              )}
            </div>

            {health && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: THEME.ink,
                }}
              >
                <strong>Diagnostic Result:</strong> {JSON.stringify(health)}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <Modal
          title={`Live Email Preview — ${freqOptions.find((f) => f.value === activePreviewCadence)?.label || "Briefing"}`}
          onClose={() => setPreviewOpen(false)}
          maxWidth={820}
        >
          {/* Quick tab switcher inside modal */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
              borderBottom: `1px solid ${THEME.line}`,
              paddingBottom: 10,
              flexWrap: "wrap",
            }}
          >
            {freqOptions.map((f) => {
              const isCurrent = activePreviewCadence === f.value;
              const isSubscribed = selectedFrequencies.includes(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handlePreview(f.value)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: isCurrent ? `2px solid ${THEME.accent}` : `1px solid ${THEME.line}`,
                    background: isCurrent
                      ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                      : "var(--surface-0)",
                    color: isCurrent ? THEME.accent : THEME.ink,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  {getCadenceIcon(f.value, 14, isCurrent ? THEME.accent : THEME.muted)}
                  <span>{f.label}</span>
                  {isSubscribed && (
                    <span
                      style={{
                        fontSize: 9.5,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: `color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
                        color: THEME.accent,
                      }}
                    >
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {previewLoading && (
            <div
              style={{ padding: "40px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}
            >
              Rendering live financial data into email template…
            </div>
          )}
          {previewError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 14px",
                borderRadius: 8,
                background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                fontSize: 13,
                color: THEME.rust,
                fontWeight: 600,
              }}
            >
              <XCircle size={15} style={{ flexShrink: 0 }} /> {previewError}
            </div>
          )}
          {previewHtml && !previewLoading && (
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              sandbox=""
              style={{
                width: "100%",
                height: "70vh",
                border: `1px solid ${THEME.line}`,
                borderRadius: 10,
                background: "#fff",
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Section: AI Advisor ──────────────────────────────────────────────────────
function AIAssistantSection({ geminiApiKey, updateSettings }: any) {
  const [showKey, setShowKey] = useState(false);
  const [keyVal, setKeyVal] = useState(geminiApiKey || "");
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setKeyVal(geminiApiKey || "");
  }, [geminiApiKey]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const isDirty = keyVal !== (geminiApiKey || "");
  const looksValid = !keyVal || keyVal.trim().length >= 20;

  const saveKey = () => {
    updateSettings({ geminiApiKey: keyVal.trim() });
    setShowKey(false);
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 2200);
  };

  const inp: any = {
    flex: 1,
    padding: "10px 14px",
    boxSizing: "border-box",
    background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`,
    borderRadius: "var(--t-radius, 10px)",
    color: THEME.ink,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: 26, borderTop: `4px solid ${THEME.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: THEME.accent,
              flexShrink: 0,
            }}
          >
            <Bot size={24} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink }}>
            Google Gemini AI Financial Advisor
          </div>
        </div>
        <div
          style={{
            fontSize: 13,
            color: THEME.muted,
            lineHeight: 1.6,
            maxWidth: 560,
            marginBottom: 24,
          }}
        >
          Configure your personal Gemini API key to activate instant portfolio analysis, tax
          optimization strategies, and real-time FIRE wealth recommendations.
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          API Key Configuration
        </div>
        <Field label="Google Gemini API Key">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={inp}
              type={showKey ? "text" : "password"}
              placeholder="AIzaSy..."
              value={keyVal}
              onChange={(e) => setKeyVal(e.target.value)}
              onBlur={() => setShowKey(false)}
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              title={showKey ? "Hide key" : "Show key"}
              aria-label={showKey ? "Hide API key" : "Show API key"}
              style={{
                padding: "0 14px",
                borderRadius: "var(--t-radius, 10px)",
                border: `1.5px solid ${THEME.line}`,
                background: "var(--t-paper)",
                cursor: "pointer",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
              }}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <Button
              onClick={saveKey}
              disabled={!isDirty}
              icon={saved ? <Check size={15} /> : undefined}
              style={
                saved ? { background: THEME.sage } : !isDirty ? { opacity: 0.6 } : {}
              }
            >
              {saved ? "Saved!" : "Save Key"}
            </Button>
          </div>
          {!looksValid && (
            <div style={{ marginTop: 8, fontSize: 11, color: THEME.gold, fontWeight: 600 }}>
              Key length seems short for a Gemini API key — verify before saving.
            </div>
          )}
        </Field>
        <div style={{ marginTop: 12, fontSize: 12, color: THEME.muted }}>
          Get a free API key with generous rate limits from{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            style={{ color: THEME.accent, textDecoration: "none", fontWeight: 600 }}
          >
            Google AI Studio <ExternalLink size={11} style={{ verticalAlign: -1 }} />
          </a>
          . Keys remain strictly stored in your private browser database.
        </div>

        {geminiApiKey ? (
          <div
            style={{
              marginTop: 18,
              padding: "12px 16px",
              borderRadius: "var(--t-radius, 8px)",
              background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} color={THEME.sage} />
            <span style={{ fontSize: 12.5, color: THEME.sage, fontWeight: 700 }}>
              Gemini API Connected — AI Financial Advisor is active and ready for consultations.
            </span>
          </div>
        ) : (
          <div
            style={{
              marginTop: 18,
              padding: "12px 16px",
              borderRadius: "var(--t-radius, 8px)",
              background: `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={16} color={THEME.gold} />
            <span style={{ fontSize: 12.5, color: THEME.gold, fontWeight: 600 }}>
              No API Key Set — Paste your Google Gemini API key above to unlock AI Advisor insights.
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main Settings Tab ────────────────────────────────────────────────────────
export function SettingsTab({
  state,
  addItem,
  removeItem,
  updateItem,
  exportJSON,
  onRestoreBackup,
  resetAll,
  onSignOut,
  cleanupOrphaned,
  updateProfile,
  updateSettings,
  accentKey,
  setAccentKey,
  darkMode,
  toggleDarkMode,
  density,
  setDensity,
  radiusKey,
  setRadiusKey,
  fontKey,
  setFontKey,
  bgStyle,
  setBgStyle,
  animSpeed,
  setAnimSpeed,
  masterData,
  updateMasterData,
  emailSettings,
  updateEmailSettings,
  session,
  showToast,
  lastBackupTs,
  setAppTab,
}: any) {
  const [tab, setTab] = useState("appearance");

  const activePreset = THEME_PRESETS.find(
    (p) => p.darkMode === darkMode && p.accentKey === (accentKey || "blue")
  );

  const fontLabels: Record<string, string> = {
    inter: "Inter",
    outfit: "Outfit",
    roboto: "Roboto",
    poppins: "Poppins",
    "dm-sans": "DM Sans",
    nunito: "Nunito",
    "space-grotesk": "Space Grotesk",
    lato: "Lato",
    "sf-pro": "SF Pro",
  };

  const regime = state?.profile?.regime || "new";

  const tiles = [
    {
      label: "Active Theme",
      value: activePreset?.label || "Custom",
      sub: darkMode ? "Dark mode active" : "Light mode active",
      color: THEME.accent,
      Icon: Palette,
      onClick: () => setTab("appearance"),
    },
    {
      label: "Interface Font & Density",
      value: fontLabels[fontKey || "inter"] || "Inter",
      sub:
        density === "compact"
          ? "Compact density"
          : density === "comfortable"
            ? "Comfortable density"
            : "Normal density",
      color: THEME.muted,
      Icon: ArrowUpAZ,
      onClick: () => setTab("appearance"),
    },
    {
      label: "Active Fiscal Year",
      value: `FY ${state?.profile?.fy || "Current"}`,
      sub: "Tax & reports baseline",
      color: THEME.gold,
      Icon: Calendar,
      onClick: () => setTab("profile"),
    },
    {
      label: "Tax Regime",
      value: regime === "new" ? "New Regime" : "Old Regime",
      sub: regime === "new" ? "Standard ₹75K rebate" : "Exemptions & 80C/80D",
      color: THEME.sage,
      Icon: Tags,
      onClick: () => setTab("profile"),
    },
  ];

  return (
    <div className="animate-fade-in-up" style={{ display: "grid", gap: 20 }}>
      {/* ── Executive Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <SectionTitle sub="Manage visual design, financial fiscal profile, account security, and master dropdowns">
            Settings &amp; Preferences
          </SectionTitle>
        </div>
      </div>

      {/* ── Executive KPI Quick Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
        }}
      >
        {tiles.map(({ label, value, sub, color, Icon, onClick }) => (
          <div
            key={label}
            onClick={onClick}
            style={{ cursor: "pointer", transition: "transform 0.15s ease" }}
          >
            <StatCard
              label={label}
              value={value}
              sub={sub}
              icon={<Icon />}
              color={color}
              maskInPrivacyMode={false}
            />
          </div>
        ))}
      </div>

      {/* ── Segmented Navigation ── */}
      <PillNav tabs={TOP_TABS} active={tab} onChange={setTab} />

      {/* ── Sub-Tabs Content ── */}
      {tab === "appearance" && (
        <div key="appearance" className="tab-content-enter">
          <AppearanceSection
            accentKey={accentKey}
            setAccentKey={setAccentKey}
            density={density}
            setDensity={setDensity}
            fontKey={fontKey}
            setFontKey={setFontKey}
            radiusKey={radiusKey}
            setRadiusKey={setRadiusKey}
            bgStyle={bgStyle}
            setBgStyle={setBgStyle}
            animSpeed={animSpeed}
            setAnimSpeed={setAnimSpeed}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        </div>
      )}

      {tab === "profile" && (
        <div key="profile" className="tab-content-enter">
          <ProfileSection state={state} updateProfile={updateProfile} showToast={showToast} />
        </div>
      )}

      {tab === "security" && (
        <div key="security" className="tab-content-enter">
          <SecuritySection
            session={session}
            onSignOut={onSignOut}
            lastBackupTs={lastBackupTs}
            setAppTab={setAppTab}
            showToast={showToast}
          />
        </div>
      )}

      {tab === "family" && (
        <div key="family" className="tab-content-enter">
          <FamilyProfilesSection masterData={masterData} updateMasterData={updateMasterData} />
        </div>
      )}

      {tab === "masterdata" && (
        <div key="masterdata" className="tab-content-enter">
          <MasterDataSection masterData={masterData} updateMasterData={updateMasterData} />
        </div>
      )}

      {tab === "ai" && (
        <div key="ai" className="tab-content-enter">
          <AIAssistantSection
            geminiApiKey={state?.settings?.geminiApiKey}
            updateSettings={updateSettings}
          />
        </div>
      )}

      {tab === "email" && (
        <div key="email" className="tab-content-enter">
          <EmailSummarySection
            state={state}
            emailSettings={emailSettings}
            updateEmailSettings={updateEmailSettings}
          />
        </div>
      )}

      {tab === "documents" && (
        <div key="documents" className="tab-content-enter">
          <Card style={{ padding: "48px 24px", textAlign: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: "var(--t-muted)",
              }}
            >
              <FolderOpen size={44} strokeWidth={1.5} color={THEME.accent} />
            </div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: THEME.ink,
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              Centralized Document Vault
            </div>
            <div
              style={{
                fontSize: 13.5,
                color: THEME.muted,
                maxWidth: 420,
                margin: "0 auto 24px",
                lineHeight: 1.6,
              }}
            >
              Wills, insurance policy PDFs, identity proofs, and property deeds are stored securely
              under System &rarr; Document Vault.
            </div>
            <Button
              variant="accent"
              icon={<FolderOpen size={15} />}
              onClick={() => setAppTab?.("docvault")}
            >
              Open Document Vault
            </Button>
          </Card>
        </div>
      )}

      {tab === "data" && (
        <div key="data" className="tab-content-enter">
          <DataSection
            exportJSON={exportJSON}
            onRestoreBackup={onRestoreBackup}
            resetAll={resetAll}
            onSignOut={onSignOut}
            cleanupOrphaned={cleanupOrphaned}
            state={state}
            lastBackupTs={lastBackupTs}
          />
        </div>
      )}
    </div>
  );
}
