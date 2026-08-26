// @ts-nocheck
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
} from "lucide-react";
import { THEME, ACCENT_PALETTES, THEME_PRESETS } from "../../utils/constants";
import { DEFAULT_MASTER_DATA } from "../../utils/masterData";
import { exportArrayToCSV } from "../../utils/finance";
import { supabase } from "../../supabaseClient";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";
import { Modal } from "../ui/Modal";
import { useAsyncAction } from "../../hooks/useAsyncAction";

// ─── Master data metadata ─────────────────────────────────────────────────────
const MD_GROUPS = [
  {
    id: "transactions",
    label: "Transactions",
    keys: ["transactionCategories", "ccTransactionCategories", "prepaidCategories"],
  },
  {
    id: "cards",
    label: "Cards",
    keys: ["ccNetworks", "prepaidCardTypes"],
  },
  {
    id: "banking",
    label: "Banking & Funds",
    keys: ["bankAccountTypes", "mfCategories"],
  },
  {
    id: "other",
    label: "Loans & Goals",
    keys: ["loanTypes", "goalCategories"],
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

// ─── Primitive components ─────────────────────────────────────────────────────
const PillNav = ({ tabs, active, onChange }: any) => (
  <div className="demat-portfolio-bar no-scrollbar">
    {tabs.map((t: any) => {
      const Icon = t.icon;
      const isActive = active === t.id;
      return (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`demat-portfolio-pill ${isActive ? "active" : ""}`}
        >
          {Icon && <Icon size={14} />} {t.label}
          {t.count != null && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "1px 6px",
                borderRadius: "var(--radius-xs)",
                background: `color-mix(in srgb, var(--t-accent) 16%, transparent)`,
                color: "var(--t-accent)",
              }}
            >
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// ─── OptionRow — a horizontal row of pill buttons ────────────────────────────
function OptionRow({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: { value: string; label: string; icon?: any }[];
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
      {hint && <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 10 }}>{hint}</div>}
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
                gap: 6,
                padding: "8px 16px",
                borderRadius: 10,
                border: active ? `2px solid ${THEME.accent}` : `1.5px solid ${THEME.line}`,
                background: active
                  ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                  : "var(--surface-0)",
                color: active ? THEME.accent : THEME.muted,
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              {Icon && <Icon size={13} />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── EditableList ─────────────────────────────────────────────────────────────
function EditableList({ listKey, items, onUpdate }: any) {
  const [val, setVal] = useState("");
  const [focused, setFocused] = useState(false);
  const [sortDir, setSortDir] = useState<"" | "asc" | "desc">("");
  const [query, setQuery] = useState("");
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [dupWarning, setDupWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultItems: string[] = DEFAULT_MASTER_DATA[listKey] || [];
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
    // New item is appended, not inserted in sorted position — the A→Z/Z→A
    // active indicator would otherwise stay lit while the list is no longer sorted.
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

  return (
    <div
      style={{
        background: "var(--t-paper)",
        borderRadius: 12,
        border: `1px solid ${THEME.line}`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "12px 16px",
          borderBottom: `1px solid ${THEME.line}`,
          background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(() => {
            const MdIcon = MD_ICONS[listKey];
            return <MdIcon size={16} />;
          })()}
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
            {MD_LABELS[listKey]}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: "var(--radius-xs)",
              background: `color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
              color: THEME.accent,
            }}
          >
            {items.length}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
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
              background: sortDir === "asc" ? THEME.accent : "none",
              border: `1px solid ${sortDir === "asc" ? THEME.accent : THEME.line}`,
              cursor: items.length < 2 ? "default" : "pointer",
              color: sortDir === "asc" ? "#fff" : THEME.muted,
              fontSize: 11,
              fontWeight: sortDir === "asc" ? 700 : 500,
              padding: "3px 9px",
              borderRadius: 6,
              fontFamily: "inherit",
              transition: "all 0.15s",
              opacity: items.length < 2 ? 0.4 : 1,
            }}
          >
            <ArrowUpAZ size={11} /> A→Z
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
              background: sortDir === "desc" ? THEME.accent : "none",
              border: `1px solid ${sortDir === "desc" ? THEME.accent : THEME.line}`,
              cursor: items.length < 2 ? "default" : "pointer",
              color: sortDir === "desc" ? "#fff" : THEME.muted,
              fontSize: 11,
              fontWeight: sortDir === "desc" ? 700 : 500,
              padding: "3px 9px",
              borderRadius: 6,
              fontFamily: "inherit",
              transition: "all 0.15s",
              opacity: items.length < 2 ? 0.4 : 1,
            }}
          >
            <ArrowDownAZ size={11} /> Z→A
          </button>

          {isDirty && (
            <button
              onClick={() => setPendingReset(true)}
              title="Reset to default values"
              aria-label="Reset to default values"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: `1px solid ${THEME.line}`,
                cursor: "pointer",
                fontSize: 11,
                color: THEME.muted,
                padding: "3px 8px",
                borderRadius: 6,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Search — only shown once the list is long enough to benefit */}
      {items.length > 6 && (
        <div
          style={{
            padding: "10px 16px 0",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Search size={13} color={THEME.muted} style={{ flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${items.length} items…`}
            aria-label={`Search ${MD_LABELS[listKey] || "items"}`}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: THEME.ink,
              fontSize: 12,
              padding: "4px 0",
              fontFamily: "inherit",
            }}
          />
        </div>
      )}

      {/* Chips */}
      <div
        style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 6, minHeight: 52 }}
      >
        {items.length === 0 && (
          <span
            style={{ fontSize: 13, color: THEME.muted, fontStyle: "italic", alignSelf: "center" }}
          >
            No items yet — add one below
          </span>
        )}
        {items.length > 0 && visibleItems.length === 0 && (
          <span
            style={{ fontSize: 13, color: THEME.muted, fontStyle: "italic", alignSelf: "center" }}
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
              gap: 5,
              padding: "5px 8px 5px 12px",
              borderRadius: "var(--radius-xs)",
              fontSize: 13,
              fontWeight: 500,
              background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
              color: THEME.ink,
            }}
          >
            {item}
            <button
              onClick={() => setPendingRemove(item)}
              className="icon-btn danger"
              style={{
                background: `color-mix(in srgb, ${THEME.muted} 8%, transparent)`,
                border: "none",
                cursor: "pointer",
                color: THEME.muted,
                padding: 3,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                borderRadius: "50%",
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
            margin: "0 16px 12px",
            padding: "8px 12px",
            borderRadius: 8,
            background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.gold} 27%, transparent)`,
            fontSize: 12,
            color: THEME.gold,
            fontWeight: 600,
          }}
        >
          That value already exists (case-insensitive match).
        </div>
      )}

      {pendingRemove && (
        <ConfirmDialog
          message={`Remove "${pendingRemove}" from ${MD_LABELS[listKey] || "this list"}?\n\nIt will disappear from every dropdown immediately. Any existing records already saved with this value will keep it as-is, so they may no longer match an option in the list.`}
          confirmLabel="Yes, remove"
          onConfirm={confirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      {pendingReset && (
        <ConfirmDialog
          message={`Reset ${MD_LABELS[listKey] || "this list"} to its default values?\n\n${
            items.filter((x: string) => !defaultItems.includes(x)).length > 0
              ? `This removes ${items.filter((x: string) => !defaultItems.includes(x)).length} custom item(s) you added. `
              : ""
          }Any existing records already saved with a removed value will keep it as-is, so they may no longer match an option in the list.`}
          confirmLabel="Yes, reset"
          onConfirm={confirmReset}
          onCancel={() => setPendingReset(false)}
        />
      )}

      {/* Add row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          borderTop: `1px solid ${THEME.line}`,
          background: focused
            ? `color-mix(in srgb, ${THEME.accent} 2%, transparent)`
            : "var(--t-paper)",
          transition: "background 0.15s",
        }}
      >
        <Plus size={14} style={{ marginLeft: 14, flexShrink: 0, color: THEME.muted }} />
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
            padding: "12px 10px",
            fontFamily: "inherit",
          }}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Type and press Enter to add…"
        />
        <button
          onClick={add}
          style={{
            background: val.trim() ? THEME.accent : "transparent",
            border: "none",
            cursor: val.trim() ? "pointer" : "default",
            color: val.trim() ? "#fff" : THEME.muted,
            fontWeight: 700,
            fontSize: 12,
            padding: "10px 16px",
            fontFamily: "inherit",
            transition: "all 0.15s",
            borderLeft: `1px solid ${THEME.line}`,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Section: Appearance ──────────────────────────────────────────────────────
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

  // Match on darkMode + accentKey only. fontKey is excluded intentionally:
  // manually changing the font should not break the active-preset indicator.
  const activePreset = THEME_PRESETS.find(
    (p) => p.darkMode === darkMode && p.accentKey === (accentKey || "blue")
  );

  const applyPreset = (preset: any) => {
    if (preset.darkMode !== darkMode) toggleDarkMode();
    setAccentKey(preset.accentKey);
    setFontKey(preset.fontKey);
  };

  return (
    <Card style={{ padding: 28 }}>
      <div style={{ display: "grid", gap: 28 }}>
        {/* ── Dark Mode ── */}
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
              Dark Mode
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Switch to dark interface — or pick a preset below
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            role="switch"
            aria-checked={darkMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              position: "relative",
              width: 52,
              height: 28,
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
                top: 4,
                left: darkMode ? 26 : 4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s ease",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              }}
            />
          </button>
        </div>

        {divider}

        {/* ── Preset Themes ── */}
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
              Theme Presets
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
                Custom
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>
            11 accent colors × light & dark — one click sets color, mode & font
          </div>

          {/* Light presets */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              Light Mode
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
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
                      borderRadius: 14,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "var(--t-paper)",
                      transition: "all 0.18s",
                      padding: 0,
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <div
                      style={{
                        height: 50,
                        display: "flex",
                        alignItems: "flex-end",
                        padding: "0 12px 8px",
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
                          width: "52%",
                          height: 20,
                          borderRadius: 5,
                          marginLeft: 10,
                          background: "rgba(255,255,255,0.88)",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      />
                      <div
                        style={{
                          width: "28%",
                          height: 14,
                          borderRadius: 5,
                          marginLeft: 6,
                          background: "rgba(255,255,255,0.65)",
                          border: "1px solid rgba(0,0,0,0.04)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          right: 12,
                          top: 10,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: pal?.light || THEME.accent,
                          boxShadow: `0 2px 5px color-mix(in srgb, ${pal?.light || THEME.accent} 40%, transparent)`,
                        }}
                      />
                      {isActive && (
                        <div
                          style={{
                            position: "absolute",
                            top: 5,
                            left: 10,
                            fontSize: 8,
                            fontWeight: 800,
                            color: "#fff",
                            background: pal?.light || THEME.accent,
                            padding: "2px 6px",
                            borderRadius: "var(--radius-xs)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          ACTIVE
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "9px 12px 11px" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isActive ? pal?.light || THEME.accent : THEME.ink,
                          marginBottom: 1,
                        }}
                      >
                        {preset.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.muted,
                          lineHeight: 1.35,
                          marginBottom: 7,
                        }}
                      >
                        {preset.description}
                      </div>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <div
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            background: pal?.light,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 9, color: THEME.muted }}>{pal?.label}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark presets */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              Dark Mode
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
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
                      borderRadius: 14,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "var(--t-paper)",
                      transition: "all 0.18s",
                      padding: 0,
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <div
                      style={{
                        height: 50,
                        display: "flex",
                        alignItems: "flex-end",
                        padding: "0 12px 8px",
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
                          width: "52%",
                          height: 20,
                          borderRadius: 5,
                          marginLeft: 10,
                          background: "rgba(255,255,255,0.09)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      />
                      <div
                        style={{
                          width: "28%",
                          height: 14,
                          borderRadius: 5,
                          marginLeft: 6,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          right: 12,
                          top: 10,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: pal?.light || THEME.accent,
                          boxShadow: `0 2px 5px color-mix(in srgb, ${pal?.light || THEME.accent} 40%, transparent)`,
                        }}
                      />
                      {isActive && (
                        <div
                          style={{
                            position: "absolute",
                            top: 5,
                            left: 10,
                            fontSize: 8,
                            fontWeight: 800,
                            color: "#fff",
                            background: pal?.light || THEME.accent,
                            padding: "2px 6px",
                            borderRadius: "var(--radius-xs)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          ACTIVE
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "9px 12px 11px" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isActive ? pal?.light || THEME.accent : THEME.ink,
                          marginBottom: 1,
                        }}
                      >
                        {preset.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.muted,
                          lineHeight: 1.35,
                          marginBottom: 7,
                        }}
                      >
                        {preset.description}
                      </div>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <div
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            background: pal?.light,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 9, color: THEME.muted }}>{pal?.label}</span>
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
          label="Density"
          hint="Controls card padding and spacing throughout the app"
          value={density || "normal"}
          onChange={setDensity}
          options={[
            { value: "compact", label: "Compact" },
            { value: "normal", label: "Normal" },
            { value: "comfortable", label: "Comfortable" },
          ]}
        />

        {divider}

        {/* Font */}
        <OptionRow
          label="Font"
          value={fontKey || "inter"}
          onChange={setFontKey}
          options={[
            { value: "inter", label: "Inter" },
            { value: "outfit", label: "Outfit" },
            { value: "roboto", label: "Roboto" },
            { value: "poppins", label: "Poppins" },
            { value: "dm-sans", label: "DM Sans" },
            { value: "nunito", label: "Nunito" },
            { value: "space-grotesk", label: "Space Grotesk" },
            { value: "lato", label: "Lato" },
            { value: "sf-pro", label: "SF Pro (System)" },
          ]}
        />

        {divider}

        {/* Corner Radius */}
        <OptionRow
          label="Corner Radius"
          hint="Controls how sharp or rounded cards and buttons look"
          value={radiusKey || "modern"}
          onChange={setRadiusKey}
          options={[
            { value: "sharp", label: "Sharp" },
            { value: "modern", label: "Modern" },
            { value: "round", label: "Round" },
          ]}
        />

        {divider}

        {/* Background Style */}
        <OptionRow
          label="Background Style"
          hint="Subtle ambient texture behind the app content"
          value={bgStyle || "plain"}
          onChange={setBgStyle}
          options={[
            { value: "plain", label: "Plain" },
            { value: "dots", label: "Dots" },
            { value: "mesh", label: "Mesh" },
          ]}
        />

        {divider}

        {/* Animation Speed */}
        <OptionRow
          label="Animation Speed"
          hint="Controls how fast transitions and hover effects animate"
          value={animSpeed || "smooth"}
          onChange={setAnimSpeed}
          options={[
            { value: "snappy", label: "Snappy" },
            { value: "smooth", label: "Smooth" },
            { value: "relaxed", label: "Relaxed" },
          ]}
        />
      </div>
    </Card>
  );
}

// ─── Section: Profile ─────────────────────────────────────────────────────────
function ProfileSection({ state, updateProfile, showToast }: any) {
  const [prof, setProf] = useState({ ...state.profile });
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<any>(null);

  // Sync if parent profile changes (e.g., DB load after mount). Keyed on name only so
  // in-progress edits aren't wiped on every keystroke that triggers a parent re-render.
  useEffect(() => {
    setProf((p) => ({ ...p, ...state.profile }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.profile?.name]);

  const initials = (prof.name || "U")
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

  // Dynamic FY list: built from actual data + always current FY
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
    padding: "10px 12px",
    background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`,
    borderRadius: "var(--t-radius, 10px)",
    color: THEME.ink,
    fontSize: 14,
    boxSizing: "border-box" as const,
  };

  return (
    <Card style={{ padding: 24 }}>
      {/* Avatar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 28,
          paddingBottom: 24,
          borderBottom: `1px solid ${THEME.line}`,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
            border: `2px solid color-mix(in srgb, ${THEME.accent} 27%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 900,
            color: THEME.accent,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.ink }}>
            {prof.name || "Your Name"}
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 3 }}>
            ArthaDrishti Dashboard
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <Field label="Display Name">
          <input
            style={inp}
            value={prof.name || ""}
            onChange={(e) => setProf({ ...prof, name: e.target.value })}
            placeholder="Your Name"
          />
        </Field>
        <Field label="Financial Year">
          <select
            style={inp}
            value={prof.fy || ""}
            onChange={(e) => setProf({ ...prof, fy: e.target.value })}
          >
            {fyOptions.map((fy) => (
              <option key={fy} value={fy}>
                FY {fy}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tax Regime">
          <select
            style={inp}
            value={prof.regime || "new"}
            onChange={(e) => setProf({ ...prof, regime: e.target.value })}
          >
            <option value="new">New Regime</option>
            <option value="old">Old Regime</option>
          </select>
        </Field>
        <Field label="Monthly Savings Target (%)">
          <input
            style={inp}
            type="number"
            min="0"
            max="100"
            value={prof.savingsTarget ?? 20}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
              setProf({ ...prof, savingsTarget: clamped });
            }}
            placeholder="e.g. 20"
          />
        </Field>
      </div>

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
              fontSize: 11,
              fontWeight: 700,
              color: THEME.gold,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: THEME.gold,
                display: "inline-block",
              }}
            />
            Unsaved changes
          </span>
        ) : (
          <span style={{ fontSize: 11, color: THEME.muted }}>Profile settings</span>
        )}
        <Button
          onClick={saveProfile}
          disabled={saving}
          icon={saved ? <Check size={15} /> : undefined}
          style={saved ? { background: THEME.sage } : isDirty ? {} : { opacity: 0.6 }}
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Profile"}
        </Button>
      </div>
    </Card>
  );
}

// ─── Section: Family Profiles ──────────────────────────────────────────────────
function FamilyProfilesSection({ masterData, updateMasterData }: any) {
  const savedProfiles: any[] = masterData?.familyProfiles || DEFAULT_MASTER_DATA.familyProfiles;
  const [rows, setRows] = useState(savedProfiles);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<any>(null);

  // Sync if parent masterData changes (e.g., DB load after mount).
  useEffect(() => {
    setRows(masterData?.familyProfiles || DEFAULT_MASTER_DATA.familyProfiles);
  }, [masterData?.familyProfiles]);

  const isDirty = JSON.stringify(rows) !== JSON.stringify(savedProfiles);

  const setName = (id: string, name: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, name } : r)));

  const trimmedNames = rows.map((r) => (r.name || "").trim());
  const hasEmptyName = trimmedNames.some((n) => !n);
  const lowerNames = trimmedNames.map((n) => n.toLowerCase());
  const hasDuplicateName = lowerNames.some((n, i) => n && lowerNames.indexOf(n) !== i);
  const isValid = !hasEmptyName && !hasDuplicateName;

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
    padding: "10px 12px",
    background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`,
    borderRadius: 10,
    color: THEME.ink,
    fontSize: 14,
    boxSizing: "border-box" as const,
  };

  return (
    <Card style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>Family Profiles</div>
        <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 4 }}>
          These names appear across owner selectors, filters, and reports wherever records are
          tagged by family member. The four relations (Self / Wife / Daughter / HUF) are fixed since
          existing records are linked to them, but you can rename each one.
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        {rows.map((p) => {
          const initials = (p.name || "?")
            .split(" ")
            .map((w: string) => w[0] || "")
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                borderRadius: 12,
              }}
            >
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
                  fontSize: 14,
                  fontWeight: 900,
                  color: THEME.accent,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ width: 90, flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                  }}
                >
                  Relation
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
                  {p.relation}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  style={inp}
                  aria-label={`Display name for ${p.relation}`}
                  value={p.name}
                  onChange={(e) => setName(p.id, e.target.value)}
                  placeholder={p.relation}
                />
              </div>
            </div>
          );
        })}
      </div>

      {(hasEmptyName || hasDuplicateName) && (
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
            ? "Every profile needs a name — it can't be left blank."
            : "Two profiles can't share the same name."}
        </div>
      )}

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
              fontSize: 11,
              fontWeight: 700,
              color: THEME.gold,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: THEME.gold,
                display: "inline-block",
              }}
            />
            Unsaved changes
          </span>
        ) : (
          <span style={{ fontSize: 11, color: THEME.muted }}>Family profile names</span>
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
            {saved ? "Saved!" : "Save Family Profiles"}
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

  const activeGroup = MD_GROUPS.find((g) => g.id === mdTab)!;

  const tabsWithCounts = MD_GROUPS.map((g) => ({
    ...g,
    count: g.keys.reduce((s, k) => s + (md[k]?.length || 0), 0),
  }));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
          fontSize: 13,
          color: THEME.ink,
          lineHeight: 1.6,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <Tags size={16} color={THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>Master Data</strong> controls every dropdown in the app — categories, types,
          networks. Add or remove values here and they reflect instantly everywhere.
        </span>
      </div>

      <PillNav tabs={tabsWithCounts} active={mdTab} onChange={setMdTab} />

      <div style={{ display: "grid", gap: 12 }}>
        {activeGroup.keys.map((key) => (
          <EditableList key={key} listKey={key} items={md[key] || []} onUpdate={updateMasterData} />
        ))}
      </div>
    </div>
  );
}

// ─── Section: Data & Account ──────────────────────────────────────────────────
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
      label: "Stocks",
      key: "stocks",
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
      label: "Goals",
      key: "goals",
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
      cols: [
        { key: "planName", label: "Plan" },
        { key: "policyNumber", label: "Policy No" },
        { key: "sumAssured", label: "Sum Assured" },
        { key: "annualPremium", label: "Annual Premium" },
      ],
    },
    {
      label: "Loans",
      key: "loansTaken",
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
      {/* Cleanup */}
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
          <RotateCcw size={16} color={THEME.gold} /> Cleanup & Maintenance
        </div>
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 20, marginTop: 4 }}>
          Scan and remove historical data records (like corporate actions) that no longer have a
          matching stock or sale history.
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
          {cleaning ? "Cleaning up..." : "Cleanup Orphaned Portfolio Data"}
        </Button>
      </Card>

      {/* Backup */}
      <Card style={{ padding: 24, borderTop: `4px solid ${THEME.sage}` }}>
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
          <Database size={16} color={THEME.sage} /> Backup & Restore
        </div>
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 12, marginTop: 4 }}>
          Export all your data as a JSON file or restore from a previous backup.
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
              width: 6,
              height: 6,
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
            Export Backup (.json)
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

      {/* CSV Exports */}
      <Card style={{ padding: 24, borderTop: `4px solid ${THEME.accent}` }}>
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
          <Download size={16} color={THEME.accent} /> Export as CSV
        </div>
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 16, marginTop: 4 }}>
          Download individual data sections as CSV files for use in Excel or Google Sheets.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {csvExports.map((exp) => {
            const count = (state?.[exp.key] || []).length;
            return (
              <Button
                key={exp.key}
                variant="secondary"
                disabled={count === 0}
                onClick={() => {
                  const ts = new Date().toISOString().slice(0, 10);
                  exportArrayToCSV(state[exp.key] || [], exp.cols, `${exp.key}_${ts}.csv`);
                }}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                {exp.label} ({count})
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Danger zone */}
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
          <AlertTriangle size={16} /> Danger Zone
        </div>
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 20, marginTop: 4 }}>
          These actions are permanent and cannot be undone.
        </p>

        {!confirmReset ? (
          <Button
            variant="danger"
            onClick={() => setConfirmReset(true)}
            icon={<AlertTriangle size={14} />}
          >
            Reset All Data
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
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.rust, marginBottom: 12 }}>
              Are you sure? This will delete ALL your financial data.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button
                variant="danger"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                }}
              >
                Yes, delete everything
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Sign out */}
      <Card style={{ padding: "18px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 2 }}>
              Sign Out
            </div>
            <div style={{ fontSize: 12, color: THEME.muted }}>
              You'll be redirected to the login page
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

// ─── Section: Email Summary ───────────────────────────────────────────────────
const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

// Cron fires once daily at 8:00 AM IST (see api/send-summary.js's shouldSendNow +
// vercel.json's "30 2 * * *" = 2:30 UTC = 8:00 IST). Mirrors the backend's own
// nowIST() shift-trick so "next scheduled" always agrees with when the cron
// actually evaluates shouldSendNow, instead of drifting from the viewer's local time zone.
function nextScheduledSendIST(frequency: string, day: number): Date {
  const IST_OFFSET_MS = 330 * 60000;
  const ist = new Date(Date.now() + IST_OFFSET_MS); // read via getUTC* as if it were IST wall-clock
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

  // monthly — same last-day-of-month clamp as the backend's shouldSendNow
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
  const frequency = es.emailFrequency || "weekly";
  const savedAddress = es.emailAddress || "";
  const savedFromEmail = es.fromEmail || "";

  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"" | "ok" | "err">("");
  const [errMsg, setErrMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");

  // Migrate any existing localStorage sender-email value to Supabase on first load.
  useEffect(() => {
    try {
      const local = localStorage.getItem("finance-email-from");
      if (local && local.trim() && !es.fromEmail) {
        updateEmailSettings({ fromEmail: local.trim() });
        localStorage.removeItem("finance-email-from");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recipient/Sender email are buffered locally and only written to Supabase on
  // explicit Save (matching the Profile/AI-key pattern elsewhere in this file).
  // Without this, every keystroke immediately upserted to user_settings — a
  // half-typed address could briefly become the address the cron job sends to.
  const [addrBuf, setAddrBuf] = useState({ emailAddress: savedAddress, fromEmail: savedFromEmail });
  const [addrSaved, setAddrSaved] = useState(false);
  const addrSavedTimerRef = useRef<any>(null);
  useEffect(() => {
    setAddrBuf({ emailAddress: savedAddress, fromEmail: savedFromEmail });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Day-of-month is buffered too — commits on blur instead of every keystroke.
  const [dayBuf, setDayBuf] = useState(String(Number(es.emailDay ?? 1)));
  useEffect(() => {
    setDayBuf(String(Number(es.emailDay ?? 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [es.emailDay]);
  const day = Number(es.emailDay ?? 1);

  // Only meaningful to test-send / preview against the address actually saved
  // server-side — the manual-send API ignores whatever the client claims and
  // always looks up the stored user_settings.email_address for security.
  const address = savedAddress;
  const fromEmail = savedFromEmail;

  const inp: any = {
    width: "100%",
    padding: "10px 14px",
    boxSizing: "border-box",
    background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`,
    borderRadius: 10,
    color: THEME.ink,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  };

  async function handleSendTest() {
    if (!address) return;
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
          frequency,
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

  async function handlePreview() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml(null);
    setPreviewError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const params = new URLSearchParams({ action: "preview", frequency });
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
    { value: "daily", label: "Daily", desc: "Every day at your chosen time" },
    { value: "weekly", label: "Weekly", desc: "Once a week — pick a day" },
    { value: "monthly", label: "Monthly", desc: "Once a month — pick a date" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Enable toggle card */}
      <Card style={{ padding: 24 }}>
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
              <div style={{ display: "flex", alignItems: "center", color: THEME.accent, flexShrink: 0 }}>
                <Mail size={22} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink }}>
                Email Summary Reports
              </div>
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.6, maxWidth: 480 }}>
              Get your complete financial picture delivered straight to your inbox — net worth, cash
              flow, investments, upcoming dues, goals, and smart alerts.
            </div>
          </div>
          <button
            onClick={() => updateEmailSettings({ emailEnabled: !enabled })}
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? "Disable email summary reports" : "Enable email summary reports"}
            style={{
              position: "relative",
              width: 52,
              height: 28,
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
                top: 4,
                left: enabled ? 26 : 4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s ease",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              }}
            />
          </button>
        </div>

        {enabled && (
          <div
            style={{
              marginTop: 20,
              padding: "16px 20px",
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              borderRadius: 12,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
              fontSize: 12,
              color: THEME.muted,
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: THEME.accent }}>Setup required:</strong> Add{" "}
            <code
              style={{
                background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                padding: "1px 5px",
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              Resend_Email_API
            </code>{" "}
            and{" "}
            <code
              style={{
                background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                padding: "1px 5px",
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              SUPABASE_SERVICE_EMAIL_ROLE_KEY
            </code>{" "}
            to your Vercel environment variables.
          </div>
        )}
      </Card>

      {enabled && (
        <>
          {/* Last send status — closes the "did my automated email actually go out?" gap;
              the cron runs unattended once a day, so without this the only way to notice
              a broken sender/domain was to realize an email never arrived. */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Delivery History
            </div>
            {(() => {
              const lastAt = es.lastEmailSentAt ? new Date(es.lastEmailSentAt) : null;
              const failed = es.lastEmailStatus === "failed";
              const daysSince = lastAt ? Math.floor((Date.now() - lastAt.getTime()) / 86400000) : null;
              const color = !lastAt ? THEME.muted : failed ? THEME.rust : THEME.sage;
              return (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  {!lastAt ? (
                    <Clock size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : failed ? (
                    <XCircle size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : (
                    <CheckCircle2 size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color }}>
                      {!lastAt
                        ? "No email sent yet"
                        : failed
                          ? "Last send failed"
                          : `Last email sent ${daysSince === 0 ? "today" : daysSince === 1 ? "1 day ago" : `${daysSince} days ago`}`}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      {!lastAt
                        ? "Automated reports run at 8:00 AM IST on your chosen schedule — this updates after the first one goes out (or use \"Send Test Email Now\" below)."
                        : failed
                          ? es.lastEmailError || "Unknown error — check Configuration Check below."
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
            {address && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${THEME.line}`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Calendar size={16} color={THEME.accent} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                    Next scheduled send
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    {(() => {
                      const next = nextScheduledSendIST(frequency, day);
                      const hoursAway = (next.getTime() - Date.now()) / 3600000;
                      const label =
                        hoursAway < 20
                          ? "Today, 8:00 AM IST"
                          : hoursAway < 44
                            ? "Tomorrow, 8:00 AM IST"
                            : `${next.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}, 8:00 AM IST`;
                      return label;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Email address */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Delivery Address
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Recipient Email (Send To)">
                <input
                  style={inp}
                  type="email"
                  placeholder="you@example.com"
                  value={addrBuf.emailAddress}
                  onChange={(e) => setAddrBuf((b) => ({ ...b, emailAddress: e.target.value }))}
                />
              </Field>
              <Field label="Sender Email (From) — verified custom domain email (optional)">
                <input
                  style={inp}
                  type="email"
                  placeholder="e.g. reports@yourdomain.com (Leave blank to use default onboarding@resend.dev)"
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
                  style={addrSaved ? { background: THEME.sage } : !addrDirty ? { opacity: 0.6 } : {}}
                >
                  {addrSaved ? "Saved!" : "Save"}
                </Button>
                {addrDirty && !addrSaved && (
                  <span style={{ fontSize: 12, color: THEME.gold, fontWeight: 600 }}>
                    Unsaved changes — save before sending a test or previewing
                  </span>
                )}
              </div>
              {!addrBuf.fromEmail && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
                    fontSize: 12,
                    color: THEME.ink,
                    lineHeight: 1.6,
                  }}
                >
                  <Lightbulb
                    size={13}
                    style={{ verticalAlign: -2, marginRight: 2, flexShrink: 0 }}
                  />{" "}
                  <strong style={{ color: THEME.sage }}>Default Mode:</strong> Sending from{" "}
                  <strong>onboarding@resend.dev</strong>. Resend restriction: onboarding@resend.dev
                  can <strong>only</strong> deliver to your Resend registration email.
                </div>
              )}
              {addrBuf.fromEmail && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.gold} 27%, transparent)`,
                    fontSize: 12,
                    color: THEME.ink,
                    lineHeight: 1.6,
                  }}
                >
                  <AlertTriangle
                    size={13}
                    style={{ verticalAlign: -2, marginRight: 2, flexShrink: 0 }}
                  />{" "}
                  <strong style={{ color: THEME.gold }}>Verification Required:</strong> You must
                  own and verify the domain of <strong>{addrBuf.fromEmail}</strong> in your{" "}
                  <a
                    href="https://resend.com/domains"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: THEME.accent, textDecoration: "none", fontWeight: 600 }}
                  >
                    Resend account →
                  </a>
                  <br />
                  Note: Resend will reject public email domains (like Gmail, Yahoo, etc.) as
                  senders.
                </div>
              )}
            </div>
          </Card>

          {/* Frequency + timing */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Schedule
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginBottom: 10 }}>
                How often?
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
                {freqOptions.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => updateEmailSettings({ emailFrequency: f.value })}
                    aria-pressed={frequency === f.value}
                    style={{
                      flex: "1 1 140px",
                      padding: "12px 16px",
                      borderRadius: 12,
                      border:
                        frequency === f.value
                          ? `2px solid ${THEME.accent}`
                          : `1.5px solid ${THEME.line}`,
                      background:
                        frequency === f.value
                          ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                          : "var(--surface-0)",
                      cursor: "pointer",
                      textAlign: "left" as const,
                      fontFamily: "inherit",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: frequency === f.value ? THEME.accent : THEME.ink,
                      }}
                    >
                      {f.label}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {frequency === "weekly" && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginBottom: 10 }}
                >
                  Which day?
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.value}
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
                            ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                            : "var(--surface-0)",
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

            {frequency === "monthly" && (
              <div style={{ marginBottom: 20 }}>
                <Field label="Day of Month">
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
                </Field>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: -12 }}>
                  1–28, so it stays valid every month including February
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 8,
                padding: "10px 14px",
                background: "var(--surface-0)",
                borderRadius: 10,
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Clock size={13} />
                <span>
                  Emails are delivered at <strong style={{ color: THEME.ink }}>8:00 AM IST</strong>{" "}
                  on your chosen day.
                </span>
              </div>
            </div>
          </Card>

          {/* What's included */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              What's in each email
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
                  title: "Net Worth Snapshot",
                  desc: "Assets vs liabilities with full breakdown",
                  color: THEME.sage,
                },
                {
                  icon: Banknote,
                  title: "Monthly Cash Flow",
                  desc: "Income vs expenses + savings rate",
                  color: THEME.accent,
                },
                {
                  icon: TrendingUp,
                  title: "Investment Portfolio",
                  desc: "MF, stocks, FD, RD, PPF, NPS, EPF, bonds, LIC",
                  color: THEME.sage,
                },
                {
                  icon: Landmark,
                  title: "Other Assets",
                  desc: "Real estate, vehicles, loans given, deposits",
                  color: THEME.sage,
                },
                {
                  icon: ClipboardList,
                  title: "Liabilities",
                  desc: "Loans, CC dues, borrowings with total",
                  color: THEME.rust,
                },
                {
                  icon: CreditCard,
                  title: "Credit Card Status",
                  desc: "Outstanding + utilization % per card",
                  color: THEME.rust,
                },
                {
                  icon: BarChart3,
                  title: "Budget Health",
                  desc: "Category budgets with progress bars",
                  color: THEME.gold,
                },
                {
                  icon: ShoppingBag,
                  title: "Top Spending",
                  desc: "Your biggest expense categories",
                  color: THEME.gold,
                },
                {
                  icon: Target,
                  title: "Goals Progress",
                  desc: "How close you are to each goal",
                  color: THEME.accent,
                },
                {
                  icon: Calendar,
                  title: "Upcoming Dues",
                  desc: "Bills, EMIs and subscriptions in 7 days",
                  color: THEME.gold,
                },
                {
                  icon: Zap,
                  title: "Smart Alerts",
                  desc: "FD maturity, emergency fund, debt ratio + more",
                  color: THEME.rust,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--surface-0)",
                    borderRadius: 10,
                    border: `1px solid ${THEME.line}`,
                    borderTop: `3px solid color-mix(in srgb, ${item.color} 27%, transparent)`,
                  }}
                >
                  <item.icon size={18} style={{ flexShrink: 0 }} color={item.color} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
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

          {/* Send test email */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Test Your Email
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 16 }}>
              Send a test email right now using your current financial data, or preview it without
              sending anything.
              {!address && (
                <span style={{ color: THEME.rust }}> Add your email address above first.</span>
              )}
              {address && addrDirty && (
                <span style={{ color: THEME.gold }}> Save your address changes before sending a test.</span>
              )}
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}
            >
              <Button variant="secondary" onClick={handlePreview} loading={previewLoading}>
                Preview Email
              </Button>
              <Button
                variant="accent"
                onClick={handleSendTest}
                disabled={!address || addrDirty}
                loading={sending}
              >
                Send Test Email Now
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
                  <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> Email sent to {address}
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
                    maxWidth: 480,
                  }}
                >
                  <XCircle size={14} style={{ flexShrink: 0 }} />{" "}
                  {errMsg || "Failed to send. Check RESEND_API_KEY in Vercel."}
                </span>
              )}
            </div>
          </Card>

          {/* Config diagnostics */}
          <Card style={{ padding: 24, border: `1px solid ${THEME.line}` }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Configuration Check
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Diagnose why emails may not be delivering
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={handleCheckConfig} loading={checking}>
                Check Config
              </Button>
            </div>

            {health && !health.error && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    ok: health.resendKey,
                    label: "Resend API Key",
                    pass: "Configured in Vercel",
                    fail: "Missing — add Resend_Email_API to Vercel Environment Variables",
                  },
                  {
                    ok: health.supabaseServiceKey,
                    label: "Supabase Service Role Key",
                    pass: "Configured in Vercel",
                    fail: "Missing — add SUPABASE_SERVICE_EMAIL_ROLE_KEY to Vercel",
                  },
                  {
                    ok: health.supabaseUrl,
                    label: "Supabase URL",
                    pass: "Configured",
                    fail: "Missing VITE_SUPABASE_URL",
                  },
                  {
                    ok: !health.usingTestDomain,
                    label: "From Email (Sender)",
                    pass: `Sending from: ${health.fromEmail}`,
                    fail:
                      health.testDomainWarning ||
                      `Using test sender (onboarding@resend.dev) — enter your Resend account email in the 'Sender Email' field above`,
                  },
                  {
                    ok: health.ready,
                    label: "Overall Status",
                    pass: "All checks passed — emails will deliver correctly",
                    fail: "Fix the From Email above to enable reliable email delivery",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: row.ok
                        ? `color-mix(in srgb, ${THEME.sage} 4%, transparent)`
                        : `color-mix(in srgb, ${THEME.rust} 4%, transparent)`,
                      border: row.ok
                        ? `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`
                        : `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                    }}
                  >
                    {row.ok ? (
                      <CheckCircle2
                        size={15}
                        color={THEME.sage}
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                    ) : (
                      <XCircle
                        size={15}
                        color={THEME.rust}
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                        {row.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: row.ok ? THEME.sage : THEME.rust,
                          marginTop: 2,
                          lineHeight: 1.5,
                        }}
                      >
                        {row.ok ? row.pass : row.fail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {health?.error && (
              <div style={{ fontSize: 13, color: THEME.rust }}>
                Could not reach API: {health.error}
              </div>
            )}
            {!health && !checking && (
              <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>
                {fromEmail
                  ? `Will check config using sender: ${fromEmail}`
                  : 'Click "Check Config" to diagnose. Enter your Sender Email above first for accurate results.'}
              </div>
            )}
          </Card>
        </>
      )}

      {previewOpen && (
        <Modal
          title="Email Preview"
          onClose={() => setPreviewOpen(false)}
          maxWidth={760}
        >
          {previewLoading && (
            <div style={{ padding: "40px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
              Rendering your latest data…
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

  // Sync local buffer if the saved key changes elsewhere (e.g. DB load after mount).
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
    borderRadius: 10,
    color: THEME.ink,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", color: THEME.accent, flexShrink: 0 }}>
            <Bot size={22} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink }}>
            AI Financial Advisor
          </div>
        </div>
        <div
          style={{
            fontSize: 13,
            color: THEME.muted,
            lineHeight: 1.6,
            maxWidth: 480,
            marginBottom: 24,
          }}
        >
          Configure your Gemini API key to enable the AI Financial Advisor. Your data will be
          anonymized before being sent to Google's Gemini API for personalized insights and advice.
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          API Settings
        </div>
        <Field label="Gemini API Key">
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
                borderRadius: 10,
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
              style={saved ? { background: THEME.sage } : !isDirty ? { opacity: 0.6 } : {}}
            >
              {saved ? "Saved!" : "Save"}
            </Button>
          </div>
          {!looksValid && (
            <div style={{ marginTop: 8, fontSize: 11, color: THEME.gold, fontWeight: 600 }}>
              That doesn't look like a full Gemini API key — double-check before saving.
            </div>
          )}
        </Field>
        <div style={{ marginTop: 12, fontSize: 12, color: THEME.muted }}>
          Get a free API key from{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            style={{ color: THEME.accent, textDecoration: "none" }}
          >
            Google AI Studio
          </a>{" "}
          — free tier supports up to 15 requests/minute. The key is sent directly from your
          browser to Google when you use the AI Advisor, so it's visible in your browser's network
          traffic — this is expected for a bring-your-own-key setup.
        </div>

        {geminiApiKey ? (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check size={14} color={THEME.sage} />
            <span style={{ fontSize: 12, color: THEME.sage, fontWeight: 600 }}>
              API key configured — AI Financial Advisor is active
            </span>
          </div>
        ) : (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: `color-mix(in srgb, ${THEME.gold} 4%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} color={THEME.gold} />
            <span style={{ fontSize: 12, color: THEME.gold, fontWeight: 600 }}>
              No key set — enter your Gemini API key above to enable AI analysis
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TOP_TABS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "profile", label: "Profile", icon: User },
  { id: "family", label: "Family Profiles", icon: Users },
  { id: "masterdata", label: "Master Data", icon: Tags },
  { id: "ai", label: "AI Advisor", icon: Bot },
  { id: "email", label: "Email Reports", icon: Mail },
  { id: "documents", label: "Documents", icon: Database },
  { id: "data", label: "Data & Account", icon: HardDrive },
];

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

  return (
    <div className="animate-fade-in-up">
      <SectionTitle sub="Customize your experience, manage dropdown values, and control your data">
        Settings
      </SectionTitle>

      {(() => {
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
            sub: darkMode ? "Dark mode" : "Light mode",
            color: THEME.accent,
            Icon: Palette,
          },
          {
            label: "Interface Font",
            value: fontLabels[fontKey || "inter"] || "Inter",
            sub:
              density === "compact"
                ? "Compact density"
                : density === "comfortable"
                  ? "Comfortable density"
                  : "Normal density",
            color: THEME.muted,
            Icon: ArrowUpAZ,
          },
          {
            label: "Financial Year",
            value: `FY ${state?.profile?.fy || "—"}`,
            sub: "Active fiscal year for reports",
            color: THEME.gold,
            Icon: Calendar,
          },
          {
            label: "Tax Regime",
            value: regime === "new" ? "New Regime" : "Old Regime",
            sub: regime === "new" ? "Default from FY 2024-25" : "Deductions & exemptions",
            color: THEME.sage,
            Icon: Tags,
          },
        ];
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            {tiles.map(({ label, value, sub, color, Icon }) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                sub={sub}
                icon={<Icon />}
                color={color}
                maskInPrivacyMode={false}
              />
            ))}
          </div>
        );
      })()}

      <PillNav tabs={TOP_TABS} active={tab} onChange={setTab} />

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
          {/* This used to embed the full DocumentVaultTab here as a second copy of the same
              page — one nav entry showed all profiles' documents, the other showed only the
              active profile's, so the "same" screen looked different depending on where you
              opened it from. Document Vault (System) is the single source of truth now; this
              is just a shortcut to it. */}
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
              <FolderOpen size={40} strokeWidth={1.5} />
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: THEME.ink,
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              Document Vault
            </div>
            <div
              style={{
                fontSize: 13,
                color: THEME.muted,
                maxWidth: 380,
                margin: "0 auto 24px",
                lineHeight: 1.6,
              }}
            >
              Wills, policies, IDs, and every other document now live in one place under System →
              Document Vault, so what you see there always matches the rest of the app.
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
