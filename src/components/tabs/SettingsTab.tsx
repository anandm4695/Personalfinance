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
  Edit3,
  Trash2,
  Users,
} from "lucide-react";
import { THEME, ACCENT_PALETTES, THEME_PRESETS } from "../../utils/constants";
import { DEFAULT_MASTER_DATA } from "../../utils/masterData";
import { exportArrayToCSV } from "../../utils/finance";
import { supabase } from "../../supabaseClient";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";

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

const MD_ICONS: Record<string, string> = {
  transactionCategories: "🏷️",
  ccTransactionCategories: "💳",
  prepaidCategories: "🎫",
  ccNetworks: "🌐",
  prepaidCardTypes: "🃏",
  bankAccountTypes: "🏦",
  mfCategories: "📈",
  loanTypes: "🏠",
  goalCategories: "🎯",
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
                borderRadius: 20,
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
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 10,
                border: active ? `2px solid ${THEME.accent}` : `1.5px solid ${THEME.line}`,
                background: active ? `${THEME.accent}15` : "var(--surface-0)",
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
    if (!v || items.includes(v)) return;
    onUpdate(listKey, [...items, v]);
    setVal("");
  };

  const remove = (item: string) =>
    onUpdate(
      listKey,
      items.filter((x: string) => x !== item)
    );

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
          background: `${THEME.accent}09`,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{MD_ICONS[listKey]}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
            {MD_LABELS[listKey]}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: 20,
              background: `${THEME.accent}22`,
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
              onClick={() => {
                onUpdate(listKey, [...defaultItems]);
                setSortDir("");
              }}
              title="Reset to default values"
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
        {items.map((item: string) => (
          <span
            key={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 8px 5px 12px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              background: `${THEME.accent}15`,
              border: `1px solid ${THEME.accent}33`,
              color: THEME.ink,
            }}
          >
            {item}
            <button
              onClick={() => remove(item)}
              style={{
                background: `${THEME.muted}14`,
                border: "none",
                cursor: "pointer",
                color: THEME.muted,
                padding: 3,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                borderRadius: "50%",
                transition: "all 0.12s",
              }}
              title={`Remove ${item}`}
            >
              <XIcon size={10} />
            </button>
          </span>
        ))}
      </div>

      {/* Add row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          borderTop: `1px solid ${THEME.line}`,
          background: focused ? `${THEME.accent}05` : "var(--t-paper)",
          transition: "background 0.15s",
        }}
      >
        <Plus size={14} style={{ marginLeft: 14, flexShrink: 0, color: THEME.muted }} />
        <input
          ref={inputRef}
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
  bgStyle: _bgStyle,
  setBgStyle: _setBgStyle,
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
                  borderRadius: 20,
                }}
              >
                Custom
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>
            10 accent colors × light & dark — one click sets color, mode & font
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
                      boxShadow: isActive ? `0 0 0 3px ${pal?.light || THEME.accent}33` : "none",
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
                          background: pal?.light || "#4F46E5",
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
                          background: pal?.light || "#4F46E5",
                          boxShadow: `0 2px 5px ${pal?.light || "#4F46E5"}66`,
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
                            borderRadius: 20,
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
                      boxShadow: isActive ? `0 0 0 3px ${pal?.light || THEME.accent}33` : "none",
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
                          background: pal?.light || "#4F46E5",
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
                          background: pal?.light || "#4F46E5",
                          boxShadow: `0 2px 5px ${pal?.light || "#4F46E5"}66`,
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
                            borderRadius: 20,
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
      </div>
    </Card>
  );
}

// ─── Section: Profile ─────────────────────────────────────────────────────────
function ProfileSection({ state, updateProfile }: any) {
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

  const saveProfile = () => {
    updateProfile(prof);
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 2200);
  };

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
    borderRadius: 10,
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
            background: `${THEME.accent}22`,
            border: `2px solid ${THEME.accent}44`,
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
            Personal Finance Dashboard
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
            onChange={(e) => setProf({ ...prof, savingsTarget: Number(e.target.value) })}
            placeholder="e.g. 20"
          />
        </Field>
      </div>

      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
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
          icon={saved ? <Check size={15} /> : undefined}
          style={saved ? { background: THEME.sage } : isDirty ? {} : { opacity: 0.6 }}
        >
          {saved ? "Saved!" : "Save Profile"}
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

  const save = () => {
    updateMasterData("familyProfiles", rows);
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 2200);
  };

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
                  background: `${THEME.accent}22`,
                  border: `2px solid ${THEME.accent}44`,
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
                  value={p.name}
                  onChange={(e) => setName(p.id, e.target.value)}
                  placeholder={p.relation}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
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
        <Button
          onClick={save}
          icon={saved ? <Check size={15} /> : undefined}
          style={saved ? { background: THEME.sage } : isDirty ? {} : { opacity: 0.6 }}
        >
          {saved ? "Saved!" : "Save Family Profiles"}
        </Button>
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
          background: `${THEME.accent}09`,
          border: `1px solid ${THEME.accent}22`,
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

// ─── Section: Document Vault ─────────────────────────────────────────────────
const DOC_CATEGORIES = [
  { id: "all", label: "All", icon: Database },
  { id: "insurance", label: "Insurance", icon: Shield },
  { id: "tax", label: "Tax", icon: Receipt },
  { id: "property", label: "Property", icon: Home },
  { id: "identity", label: "Identity", icon: User },
  { id: "banking", label: "Banking", icon: Landmark },
  { id: "vehicle", label: "Vehicle", icon: Car },
  { id: "other", label: "Other", icon: FileText },
] as const;

const DOC_CATEGORY_COLORS: Record<string, string> = {
  insurance: "#059669",
  tax: "#d97706",
  property: "#4F46E5",
  identity: "#0284C7",
  banking: "#3b82f6",
  vehicle: "#8b5cf6",
  other: "#6b7280",
};

const DOC_OWNERS = ["Self", "Wife", "Daughter", "HUF"];
const DOC_SORT_OPTIONS = [
  { value: "date-desc", label: "Date (Newest)" },
  { value: "date-asc", label: "Date (Oldest)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "category", label: "Category" },
];

function DocumentVaultSection({ state, addItem, removeItem }: any) {
  const [showForm, setShowForm] = useState(false);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("tax");
  const [docTags, setDocTags] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [docOwner, setDocOwner] = useState("Self");
  const [docFileRef, setDocFileRef] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docRelated, setDocRelated] = useState("");

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editFileRef, setEditFileRef] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editRelated, setEditRelated] = useState("");

  const documents: any[] = state.documents || [];

  // Build related account options from state
  const relatedOptions: { value: string; label: string }[] = [{ value: "", label: "-- None --" }];
  (state.bankAccounts || []).forEach((b: any) =>
    relatedOptions.push({
      value: `bank:${b.id}`,
      label: `Bank: ${b.bankName || b.name || "Account"}`,
    })
  );
  (state.termPlans || []).forEach((p: any) =>
    relatedOptions.push({
      value: `insurance:${p.id}`,
      label: `Insurance: ${p.company || p.policyName || "Policy"}`,
    })
  );
  (state.investmentPlans || []).forEach((p: any) =>
    relatedOptions.push({
      value: `insurance:${p.id}`,
      label: `Insurance: ${p.company || p.planName || "Plan"}`,
    })
  );
  (state.realEstateProperties || []).forEach((p: any) =>
    relatedOptions.push({
      value: `property:${p.id}`,
      label: `Property: ${p.name || p.address || "Property"}`,
    })
  );
  (state.vehicles || []).forEach((v: any) =>
    relatedOptions.push({
      value: `vehicle:${v.id}`,
      label: `Vehicle: ${v.name || v.make || "Vehicle"}`,
    })
  );

  const getCategoryIcon = (cat: string) => {
    const found = DOC_CATEGORIES.find((c) => c.id === cat);
    return found ? found.icon : FileText;
  };

  const getCategoryColor = (cat: string) => DOC_CATEGORY_COLORS[cat] || "#6b7280";

  const resetForm = () => {
    setDocName("");
    setDocCategory("tax");
    setDocTags("");
    setDocDate(new Date().toISOString().slice(0, 10));
    setDocOwner("Self");
    setDocFileRef("");
    setDocNotes("");
    setDocRelated("");
  };

  const handleAddDoc = () => {
    if (!docName.trim()) return;
    addItem("documents", {
      name: docName.trim(),
      category: docCategory,
      tags: docTags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean),
      date: docDate,
      owner: docOwner,
      fileRef: docFileRef.trim(),
      notes: docNotes.trim(),
      relatedAccount: docRelated,
      // Keep legacy field for backward compat
      linkedType: docCategory,
      note: docNotes.trim(),
    });
    resetForm();
    setShowForm(false);
  };

  const startEdit = (doc: any) => {
    setEditingDoc(doc.id);
    setEditName(doc.name || "");
    setEditCategory(doc.category || doc.linkedType || "other");
    setEditTags((doc.tags || []).join(", "));
    setEditDate(doc.date || "");
    setEditOwner(doc.owner || "Self");
    setEditFileRef(doc.fileRef || "");
    setEditNotes(doc.notes || doc.note || "");
    setEditRelated(doc.relatedAccount || "");
  };

  const saveEdit = (doc: any) => {
    removeItem("documents", doc.id);
    addItem("documents", {
      id: doc.id,
      name: editName.trim(),
      category: editCategory,
      tags: editTags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean),
      date: editDate,
      owner: editOwner,
      fileRef: editFileRef.trim(),
      notes: editNotes.trim(),
      relatedAccount: editRelated,
      linkedType: editCategory,
      note: editNotes.trim(),
    });
    setEditingDoc(null);
  };

  // Normalize category from legacy data
  const getDocCategory = (doc: any) => doc.category || doc.linkedType || "other";

  // Filter and search
  const filtered = documents.filter((doc: any) => {
    const cat = getDocCategory(doc);
    if (activeFilter !== "all" && cat !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inName = (doc.name || "").toLowerCase().includes(q);
      const inTags = (doc.tags || []).some((t: string) => t.toLowerCase().includes(q));
      const inNotes = (doc.notes || doc.note || "").toLowerCase().includes(q);
      if (!inName && !inTags && !inNotes) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a: any, b: any) => {
    switch (sortBy) {
      case "date-desc":
        return (b.date || "").localeCompare(a.date || "");
      case "date-asc":
        return (a.date || "").localeCompare(b.date || "");
      case "name-asc":
        return (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" });
      case "name-desc":
        return (b.name || "").localeCompare(a.name || "", "en", { sensitivity: "base" });
      case "category":
        return getDocCategory(a).localeCompare(getDocCategory(b));
      default:
        return 0;
    }
  });

  // Category counts for filter pills
  const catCounts: Record<string, number> = { all: documents.length };
  documents.forEach((doc: any) => {
    const c = getDocCategory(doc);
    catCounts[c] = (catCounts[c] || 0) + 1;
  });

  // Last added date
  const lastAdded =
    documents.length > 0
      ? [...documents].sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""))[0]
          ?.date || "N/A"
      : null;

  const getRelatedLabel = (val: string) => {
    const opt = relatedOptions.find((o) => o.value === val);
    return opt ? opt.label : val || "None";
  };

  // ── Empty State ──
  if (documents.length === 0 && !showForm) {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Database size={30} color="#fff" />
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
            No Documents Added Yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 380,
              margin: "0 auto 12px",
              lineHeight: 1.6,
            }}
          >
            Keep all your important financial documents organized in one place — insurance policies,
            tax filings, property deeds, and more.
          </div>
          <div
            style={{
              fontSize: 12,
              color: THEME.muted,
              marginBottom: 24,
              display: "flex",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {[
              "Insurance Policies",
              "Tax Returns",
              "Property Deeds",
              "Identity Docs",
              "Vehicle RC",
            ].map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: THEME.accent,
                    display: "inline-block",
                  }}
                />
                {t}
              </span>
            ))}
          </div>
          <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>
            Add First Document
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* ── Summary Stats ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        <Card style={{ padding: "16px 20px", borderTop: `3px solid ${THEME.accent}` }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 4,
            }}
          >
            Total Documents
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: THEME.ink }}>{documents.length}</div>
        </Card>
        <Card style={{ padding: "16px 20px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            By Category
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {DOC_CATEGORIES.filter((c) => c.id !== "all" && (catCounts[c.id] || 0) > 0).map((c) => (
              <span
                key={c.id}
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: `${getCategoryColor(c.id)}15`,
                  color: getCategoryColor(c.id),
                  fontWeight: 700,
                }}
              >
                {c.label} {catCounts[c.id]}
              </span>
            ))}
          </div>
        </Card>
        <Card style={{ padding: "16px 20px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 4,
            }}
          >
            Last Added
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
            {lastAdded
              ? new Date(lastAdded).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "N/A"}
          </div>
        </Card>
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="demat-portfolio-bar no-scrollbar">
        {DOC_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeFilter === cat.id;
          const count = catCounts[cat.id] || 0;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className={`demat-portfolio-pill ${isActive ? "active" : ""}`}
            >
              <Icon size={14} /> {cat.label}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 20,
                    background: isActive
                      ? `color-mix(in srgb, var(--t-accent) 16%, transparent)`
                      : `${THEME.muted}15`,
                    color: isActive ? "var(--t-accent)" : THEME.muted,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Search + Sort Bar ── */}
      <Card style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: THEME.muted,
                pointerEvents: "none",
              }}
            />
            <input
              className="form-input"
              placeholder="Search documents by name, tags, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: THEME.muted }}>Sort:</span>
            <select
              className="form-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: "auto", minWidth: 130, fontSize: 12 }}
            >
              {DOC_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowForm((p) => !p)}>
            {showForm ? "Cancel" : "Add Document"}
          </Button>
        </div>
      </Card>

      {/* ── Add Document Form ── */}
      {showForm && (
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
            <Plus size={16} color={THEME.accent} /> Add New Document
          </div>
          <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 16, marginTop: 4 }}>
            Fill in the details below to add a document record to your vault.
          </p>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}
          >
            <Field label="Document Name">
              <input
                className="form-input"
                placeholder="e.g. ITR AY 2025-26"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </Field>
            <Field label="Category">
              <select
                className="form-input"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
              >
                {DOC_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tags (comma-separated)">
              <input
                className="form-input"
                placeholder="e.g. FY2025, filing, section80C"
                value={docTags}
                onChange={(e) => setDocTags(e.target.value)}
              />
            </Field>
            <Field label="Date Added">
              <input
                className="form-input"
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
              />
            </Field>
            <Field label="Owner">
              <select
                className="form-input"
                value={docOwner}
                onChange={(e) => setDocOwner(e.target.value)}
              >
                {DOC_OWNERS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Related Account (optional)">
              <select
                className="form-input"
                value={docRelated}
                onChange={(e) => setDocRelated(e.target.value)}
              >
                {relatedOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="File Reference (URL, path, or location note)">
              <input
                className="form-input"
                placeholder="e.g. Google Drive link or 'Filed in Almirah #2'"
                value={docFileRef}
                onChange={(e) => setDocFileRef(e.target.value)}
              />
            </Field>
            <Field label="Notes">
              <textarea
                className="form-input"
                placeholder="Additional notes about this document..."
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                rows={2}
                style={{ resize: "vertical", minHeight: 38 }}
              />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="accent" onClick={handleAddDoc} disabled={!docName.trim()}>
              Save Document
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── Document Cards Grid ── */}
      {sorted.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 14,
          }}
        >
          {sorted.map((doc: any) => {
            const cat = getDocCategory(doc);
            const CatIcon = getCategoryIcon(cat);
            const catColor = getCategoryColor(cat);
            const isExpanded = expandedDoc === doc.id;
            const isEditing = editingDoc === doc.id;

            if (isEditing) {
              return (
                <Card
                  key={doc.id}
                  style={{
                    padding: 20,
                    borderLeft: `4px solid ${catColor}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
                    Edit Document
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Field label="Name">
                      <input
                        className="form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </Field>
                    <Field label="Category">
                      <select
                        className="form-input"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                      >
                        {DOC_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tags">
                      <input
                        className="form-input"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                      />
                    </Field>
                    <Field label="Date">
                      <input
                        className="form-input"
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                    </Field>
                    <Field label="Owner">
                      <select
                        className="form-input"
                        value={editOwner}
                        onChange={(e) => setEditOwner(e.target.value)}
                      >
                        {DOC_OWNERS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Related">
                      <select
                        className="form-input"
                        value={editRelated}
                        onChange={(e) => setEditRelated(e.target.value)}
                      >
                        {relatedOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="File Reference">
                    <input
                      className="form-input"
                      value={editFileRef}
                      onChange={(e) => setEditFileRef(e.target.value)}
                    />
                  </Field>
                  <Field label="Notes">
                    <textarea
                      className="form-input"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      style={{ resize: "vertical" }}
                    />
                  </Field>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Button
                      variant="accent"
                      onClick={() => saveEdit(doc)}
                      disabled={!editName.trim()}
                    >
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingDoc(null)}>
                      Cancel
                    </Button>
                  </div>
                </Card>
              );
            }

            return (
              <Card
                key={doc.id}
                style={{
                  padding: 0,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  borderLeft: `4px solid ${catColor}`,
                }}
                onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
              >
                {/* Card Header */}
                <div
                  style={{
                    padding: "16px 18px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `${catColor}12`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <CatIcon size={18} color={catColor} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: THEME.ink,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {doc.name}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: `${catColor}15`,
                            color: catColor,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {cat}
                        </span>
                        {doc.owner && doc.owner !== "Self" && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: `${THEME.accent}12`,
                              color: THEME.accent,
                              fontWeight: 600,
                            }}
                          >
                            {doc.owner}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                    {isExpanded ? (
                      <ChevronUp size={14} color={THEME.muted} />
                    ) : (
                      <ChevronDown size={14} color={THEME.muted} />
                    )}
                  </div>
                </div>

                {/* Card Footer — Date + Tags */}
                <div
                  style={{
                    padding: "0 18px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 11, color: THEME.muted }}>
                    {doc.date
                      ? new Date(doc.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "No date"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {(doc.tags || []).slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 9,
                          padding: "1px 7px",
                          borderRadius: 8,
                          background: `${THEME.muted}12`,
                          color: THEME.muted,
                          fontWeight: 600,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {(doc.tags || []).length > 3 && (
                      <span style={{ fontSize: 9, color: THEME.muted }}>
                        +{doc.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "14px 18px",
                      borderTop: `1px solid ${THEME.line}`,
                      background: `${THEME.muted}06`,
                    }}
                  >
                    <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                      {doc.owner && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: THEME.muted, fontWeight: 600 }}>Owner</span>
                          <span style={{ color: THEME.ink, fontWeight: 600 }}>{doc.owner}</span>
                        </div>
                      )}
                      {(doc.notes || doc.note) && (
                        <div>
                          <span style={{ color: THEME.muted, fontWeight: 600, fontSize: 11 }}>
                            Notes
                          </span>
                          <div style={{ color: THEME.ink, marginTop: 2, lineHeight: 1.5 }}>
                            {doc.notes || doc.note}
                          </div>
                        </div>
                      )}
                      {doc.fileRef && (
                        <div>
                          <span style={{ color: THEME.muted, fontWeight: 600, fontSize: 11 }}>
                            File Reference
                          </span>
                          <div
                            style={{ color: THEME.accent, marginTop: 2, wordBreak: "break-all" }}
                          >
                            {doc.fileRef}
                          </div>
                        </div>
                      )}
                      {doc.relatedAccount && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: THEME.muted, fontWeight: 600 }}>Related</span>
                          <span style={{ color: THEME.ink }}>
                            {getRelatedLabel(doc.relatedAccount)}
                          </span>
                        </div>
                      )}
                      {(doc.tags || []).length > 0 && (
                        <div>
                          <span style={{ color: THEME.muted, fontWeight: 600, fontSize: 11 }}>
                            All Tags
                          </span>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                            {doc.tags.map((tag: string) => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: 10,
                                  padding: "2px 8px",
                                  borderRadius: 8,
                                  background: `${catColor}12`,
                                  color: catColor,
                                  fontWeight: 600,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: `1px solid ${THEME.line}`,
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(doc);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: `1px solid ${THEME.line}`,
                          background: "transparent",
                          color: THEME.accent,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem("documents", doc.id);
                          setExpandedDoc(null);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: `1px solid ${THEME.line}`,
                          background: "transparent",
                          color: THEME.rust,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card style={{ padding: "32px 24px", textAlign: "center" }}>
          <Search size={24} color={THEME.muted} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
            No Documents Found
          </div>
          <div style={{ fontSize: 13, color: THEME.muted }}>
            {searchQuery
              ? `No documents matching "${searchQuery}"${activeFilter !== "all" ? ` in ${activeFilter}` : ""}`
              : `No documents in the ${activeFilter} category yet`}
          </div>
        </Card>
      )}
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
}: any) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [cleaning, setCleaning] = useState(false);

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
        { key: "folio", label: "Folio" },
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
        { key: "cardLimit", label: "Limit" },
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
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 20, marginTop: 4 }}>
          Export all your data as a JSON file or restore from a previous backup.
        </p>
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
              background: `${THEME.rust}15`,
              border: `1px solid ${THEME.rust}44`,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.rust, marginBottom: 12 }}>
              Are you sure? This will delete ALL your financial data.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
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
          <button
            onClick={onSignOut}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: `1.5px solid ${THEME.line}`,
              borderRadius: 8,
              cursor: "pointer",
              color: THEME.muted,
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 16px",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
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

function EmailSummarySection({ state, emailSettings, updateEmailSettings }: any) {
  const es = emailSettings || {};
  const enabled = !!es.emailEnabled;
  const frequency = es.emailFrequency || "weekly";
  const day = Number(es.emailDay ?? 1);
  const address = es.emailAddress || "";

  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"" | "ok" | "err">("");
  const [errMsg, setErrMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<any>(null);

  // Sender email — persisted in Supabase (user_settings.from_email) so cron job can use it too.
  // Migrate any existing localStorage value to Supabase on first load.
  const fromEmail: string = es.fromEmail || "";
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
          state,
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
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `linear-gradient(135deg,${THEME.accent},#8b5cf6)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 18 }}>✉️</span>
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
              background: `${THEME.accent}09`,
              borderRadius: 12,
              border: `1px solid ${THEME.accent}22`,
              fontSize: 12,
              color: THEME.muted,
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: THEME.accent }}>Setup required:</strong> Add{" "}
            <code
              style={{
                background: `${THEME.accent}15`,
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
                background: `${THEME.accent}15`,
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
                  value={address}
                  onChange={(e) => updateEmailSettings({ emailAddress: e.target.value })}
                />
              </Field>
              <Field label="Sender Email (From) — verified custom domain email (optional)">
                <input
                  style={inp}
                  type="email"
                  placeholder="e.g. reports@yourdomain.com (Leave blank to use default onboarding@resend.dev)"
                  value={fromEmail}
                  onChange={(e) => updateEmailSettings({ fromEmail: e.target.value })}
                />
              </Field>
              {!fromEmail && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: `${THEME.sage}09`,
                    border: `1px solid ${THEME.sage}33`,
                    fontSize: 12,
                    color: THEME.ink,
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: THEME.sage }}>💡 Default Mode:</strong> Sending from{" "}
                  <strong>onboarding@resend.dev</strong>. Resend restriction: onboarding@resend.dev
                  can <strong>only</strong> deliver to your Resend registration email.
                </div>
              )}
              {fromEmail && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: `${THEME.gold}15`,
                    border: `1px solid ${THEME.gold}44`,
                    fontSize: 12,
                    color: THEME.ink,
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: THEME.gold }}>⚠ Verification Required:</strong> You must
                  own and verify the domain of <strong>{fromEmail}</strong> in your{" "}
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
                    style={{
                      flex: "1 1 140px",
                      padding: "12px 16px",
                      borderRadius: 12,
                      border:
                        frequency === f.value
                          ? `2px solid ${THEME.accent}`
                          : `1.5px solid ${THEME.line}`,
                      background: frequency === f.value ? `${THEME.accent}15` : "var(--surface-0)",
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
                        background: day === d.value ? `${THEME.accent}15` : "var(--surface-0)",
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
                    value={day || ""}
                    onChange={(e) => updateEmailSettings({ emailDay: Number(e.target.value) })}
                  />
                </Field>
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
                <span>⏰</span>
                <span>
                  Emails are delivered at <strong style={{ color: THEME.ink }}>8:00 AM IST</strong> on
                  your chosen day.
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
                  icon: "💰",
                  title: "Net Worth Snapshot",
                  desc: "Assets vs liabilities with full breakdown",
                  color: THEME.sage,
                },
                {
                  icon: "💸",
                  title: "Monthly Cash Flow",
                  desc: "Income vs expenses + savings rate",
                  color: THEME.accent,
                },
                {
                  icon: "📈",
                  title: "Investment Portfolio",
                  desc: "MF, stocks, FD, RD, PPF, NPS, EPF, bonds, LIC",
                  color: THEME.sage,
                },
                {
                  icon: "🏦",
                  title: "Other Assets",
                  desc: "Real estate, vehicles, loans given, deposits",
                  color: THEME.sage,
                },
                {
                  icon: "📋",
                  title: "Liabilities",
                  desc: "Loans, CC dues, borrowings with total",
                  color: THEME.rust,
                },
                {
                  icon: "💳",
                  title: "Credit Card Status",
                  desc: "Outstanding + utilization % per card",
                  color: THEME.rust,
                },
                {
                  icon: "📊",
                  title: "Budget Health",
                  desc: "Category budgets with progress bars",
                  color: THEME.gold,
                },
                {
                  icon: "🛍️",
                  title: "Top Spending",
                  desc: "Your biggest expense categories",
                  color: THEME.gold,
                },
                {
                  icon: "🎯",
                  title: "Goals Progress",
                  desc: "How close you are to each goal",
                  color: THEME.accent,
                },
                {
                  icon: "📅",
                  title: "Upcoming Dues",
                  desc: "Bills, EMIs and subscriptions in 7 days",
                  color: THEME.gold,
                },
                {
                  icon: "⚡",
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
                    borderTop: `3px solid ${item.color}44`,
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
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
              Send a test email right now using your current financial data.
              {!address && (
                <span style={{ color: THEME.rust }}> Add your email address above first.</span>
              )}
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}
            >
              <button
                onClick={handleSendTest}
                disabled={sending || !address}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: !address ? THEME.line : sending ? THEME.muted : THEME.accent,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: !address ? "default" : "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? "Sending…" : "Send Test Email Now"}
              </button>
              {sendStatus === "ok" && (
                <span style={{ fontSize: 13, color: THEME.sage, fontWeight: 600 }}>
                  ✓ Email sent to {address}
                </span>
              )}
              {sendStatus === "err" && (
                <span style={{ fontSize: 13, color: THEME.rust, fontWeight: 600, maxWidth: 480 }}>
                  ✕ {errMsg || "Failed to send. Check RESEND_API_KEY in Vercel."}
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
              <button
                onClick={handleCheckConfig}
                disabled={checking}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--t-paper)",
                  color: THEME.ink,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: checking ? "default" : "pointer",
                  fontFamily: "inherit",
                  opacity: checking ? 0.6 : 1,
                }}
              >
                {checking ? "Checking…" : "Check Config"}
              </button>
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
                      background: row.ok ? `${THEME.sage}09` : `${THEME.rust}09`,
                      border: row.ok ? `1px solid ${THEME.sage}33` : `1px solid ${THEME.rust}33`,
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>
                      {row.ok ? "✅" : "❌"}
                    </span>
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
    </div>
  );
}

// ─── Section: AI Advisor ──────────────────────────────────────────────────────
function AIAssistantSection({ geminiApiKey, updateSettings }: any) {
  const [showKey, setShowKey] = useState(false);

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
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, var(--t-accent) 65%, white))`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 18 }}>🤖</span>
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
              value={geminiApiKey || ""}
              onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              title={showKey ? "Hide key" : "Show key"}
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
          </div>
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
          — free tier supports up to 15 requests/minute.
        </div>

        {geminiApiKey ? (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: `${THEME.sage}09`,
              border: `1px solid ${THEME.sage}33`,
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
              background: `${THEME.gold}09`,
              border: `1px solid ${THEME.gold}33`,
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
  sidebarNav: _sidebarNav,
  setSidebarNav: _setSidebarNav,
  radiusKey: _radiusKey,
  setRadiusKey: _setRadiusKey,
  fontKey,
  setFontKey,
  bgStyle: _bgStyle2,
  setBgStyle: _setBgStyle2,
  animSpeed: _animSpeed,
  setAnimSpeed: _setAnimSpeed,
  chartStyle: _chartStyle,
  setChartStyle: _setChartStyle,
  masterData,
  updateMasterData,
  emailSettings,
  updateEmailSettings,
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
              <div
                key={label}
                className="card-lift"
                style={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${color}1f`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
                {sub && <div style={{ fontSize: 10, color: THEME.muted }}>{sub}</div>}
              </div>
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
            bgStyle={_bgStyle2}
            setBgStyle={_setBgStyle2}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        </div>
      )}

      {tab === "profile" && (
        <div key="profile" className="tab-content-enter">
          <ProfileSection state={state} updateProfile={updateProfile} />
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
          <DocumentVaultSection state={state} addItem={addItem} removeItem={removeItem} />
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
          />
        </div>
      )}
    </div>
  );
}
