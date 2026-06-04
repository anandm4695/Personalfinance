// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Database, User, Check, Download, RefreshCw,
  X as XIcon, LogOut, Tags, Palette,
  RotateCcw, Plus, AlertTriangle, Settings,
  ArrowUpAZ, ArrowDownAZ, Mail, Bot, HardDrive,
  Eye, EyeOff,
} from "lucide-react";
import { THEME, ACCENT_PALETTES, DENSITY, THEME_PRESETS } from "../../utils/constants";
import { DEFAULT_MASTER_DATA } from "../../utils/masterData";
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
  transactionCategories:   "Transaction & Budget Categories",
  ccTransactionCategories: "Credit Card Transaction Categories",
  prepaidCategories:       "Prepaid Card Categories",
  ccNetworks:              "Card Networks",
  prepaidCardTypes:        "Prepaid Card Types",
  bankAccountTypes:        "Bank Account Types",
  mfCategories:            "Mutual Fund / SIP Categories",
  loanTypes:               "Loan Types",
  goalCategories:          "Financial Goal Categories",
};

const MD_ICONS: Record<string, string> = {
  transactionCategories:   "🏷️",
  ccTransactionCategories: "💳",
  prepaidCategories:       "🎫",
  ccNetworks:              "🌐",
  prepaidCardTypes:        "🃏",
  bankAccountTypes:        "🏦",
  mfCategories:            "📈",
  loanTypes:               "🏠",
  goalCategories:          "🎯",
};

// ─── Primitive components ─────────────────────────────────────────────────────
const PillNav = ({ tabs, active, onChange }: any) => (
  <div style={{
    display: "flex", gap: 4, padding: 4,
    background: "var(--surface-0)", borderRadius: 14,
    border: `1px solid ${THEME.line}`, width: "fit-content", flexWrap: "wrap",
  }}>
    {tabs.map((t: any) => {
      const Icon = t.icon;
      const isActive = active === t.id;
      return (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 10,
            border: isActive ? `1.5px solid ${THEME.accent}33` : "1.5px solid transparent",
            background: isActive ? `${THEME.accent}15` : "transparent",
            color: isActive ? THEME.accent : THEME.muted,
            fontWeight: isActive ? 700 : 500, fontSize: 13,
            cursor: "pointer", transition: "all 0.18s", fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          {Icon && <Icon size={14} />} {t.label}
          {t.count != null && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "1px 6px",
              borderRadius: 20,
              background: `${THEME.accent}22`,
              color: THEME.accent,
            }}>{t.count}</span>
          )}
        </button>
      );
    })}
  </div>
);

// ─── OptionRow — a horizontal row of pill buttons ────────────────────────────
function OptionRow({ label, options, value, onChange, hint }: {
  label: string;
  options: { value: string; label: string; icon?: any }[];
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: hint ? 2 : 10 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 10 }}>{hint}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map(opt => {
          const active = value === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10,
                border: active ? `2px solid ${THEME.accent}` : `1.5px solid ${THEME.line}`,
                background: active ? `${THEME.accent}15` : "var(--surface-0)",
                color: active ? THEME.accent : THEME.muted,
                fontWeight: active ? 700 : 500, fontSize: 13,
                cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
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
    onUpdate(listKey, [...items].sort((a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" })));
    setSortDir("asc");
  };
  const sortZA = () => {
    onUpdate(listKey, [...items].sort((a: string, b: string) => b.localeCompare(a, "en", { sensitivity: "base" })));
    setSortDir("desc");
  };

  const add = () => {
    const v = val.trim();
    if (!v || items.includes(v)) return;
    onUpdate(listKey, [...items, v]);
    setVal("");
  };

  const remove = (item: string) =>
    onUpdate(listKey, items.filter((x: string) => x !== item));

  return (
    <div style={{
      background: "var(--t-paper)", borderRadius: 12,
      border: `1px solid ${THEME.line}`, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        padding: "12px 16px", borderBottom: `1px solid ${THEME.line}`,
        background: `${THEME.accent}09`,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{MD_ICONS[listKey]}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{MD_LABELS[listKey]}</span>
          <span style={{
            fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
            background: `${THEME.accent}22`,
            color: THEME.accent,
          }}>{items.length}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button
            onClick={sortAZ}
            title="Sort A to Z"
            disabled={items.length < 2}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: sortDir === "asc" ? THEME.accent : "none",
              border: `1px solid ${sortDir === "asc" ? THEME.accent : THEME.line}`,
              cursor: items.length < 2 ? "default" : "pointer",
              color: sortDir === "asc" ? "#fff" : THEME.muted,
              fontSize: 11, fontWeight: sortDir === "asc" ? 700 : 500,
              padding: "3px 9px", borderRadius: 6,
              fontFamily: "inherit", transition: "all 0.15s",
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
              display: "flex", alignItems: "center", gap: 4,
              background: sortDir === "desc" ? THEME.accent : "none",
              border: `1px solid ${sortDir === "desc" ? THEME.accent : THEME.line}`,
              cursor: items.length < 2 ? "default" : "pointer",
              color: sortDir === "desc" ? "#fff" : THEME.muted,
              fontSize: 11, fontWeight: sortDir === "desc" ? 700 : 500,
              padding: "3px 9px", borderRadius: 6,
              fontFamily: "inherit", transition: "all 0.15s",
              opacity: items.length < 2 ? 0.4 : 1,
            }}
          >
            <ArrowDownAZ size={11} /> Z→A
          </button>

          {isDirty && (
            <button
              onClick={() => { onUpdate(listKey, [...defaultItems]); setSortDir(""); }}
              title="Reset to default values"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: `1px solid ${THEME.line}`, cursor: "pointer",
                fontSize: 11, color: THEME.muted, padding: "3px 8px", borderRadius: 6,
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Chips */}
      <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 6, minHeight: 52 }}>
        {items.length === 0 && (
          <span style={{ fontSize: 13, color: THEME.muted, fontStyle: "italic", alignSelf: "center" }}>
            No items yet — add one below
          </span>
        )}
        {items.map((item: string) => (
          <span
            key={item}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 8px 5px 12px", borderRadius: 20, fontSize: 13, fontWeight: 500,
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
                border: "none", cursor: "pointer", color: THEME.muted,
                padding: 3, lineHeight: 1, display: "flex", alignItems: "center",
                borderRadius: "50%", transition: "all 0.12s",
              }}
              title={`Remove ${item}`}
            >
              <XIcon size={10} />
            </button>
          </span>
        ))}
      </div>

      {/* Add row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        borderTop: `1px solid ${THEME.line}`,
        background: focused ? `${THEME.accent}05` : "var(--t-paper)",
        transition: "background 0.15s",
      }}>
        <Plus size={14} style={{ marginLeft: 14, flexShrink: 0, color: THEME.muted }} />
        <input
          ref={inputRef}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: THEME.ink, fontSize: 13, padding: "12px 10px",
            fontFamily: "inherit",
          }}
          value={val}
          onChange={e => setVal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Type and press Enter to add…"
        />
        <button
          onClick={add}
          style={{
            background: val.trim() ? THEME.accent : "transparent",
            border: "none", cursor: val.trim() ? "pointer" : "default",
            color: val.trim() ? "#fff" : THEME.muted,
            fontWeight: 700, fontSize: 12, padding: "10px 16px",
            fontFamily: "inherit", transition: "all 0.15s",
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
  accentKey, setAccentKey,
  density, setDensity,
  fontKey, setFontKey,
  bgStyle, setBgStyle,
  darkMode, toggleDarkMode,
}: any) {
  const divider = <div style={{ borderTop: `1px solid ${THEME.line}` }} />;

  // Match on darkMode + accentKey only. fontKey is excluded intentionally:
  // manually changing the font should not break the active-preset indicator.
  const activePreset = THEME_PRESETS.find(
    p => p.darkMode === darkMode && p.accentKey === (accentKey || "blue")
  );

  const applyPreset = (preset: any) => {
    if (preset.darkMode !== darkMode) toggleDarkMode();
    setAccentKey(preset.accentKey);
    setFontKey(preset.fontKey);
  };

  return (
    <Card style={{ padding: 28 }}>
      <div style={{ display: "grid", gap: 28 }}>

        {/* ── Preset Themes ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Theme Presets</div>
            {!activePreset && (
              <span style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, background: "var(--surface-0)", border: `1px solid ${THEME.line}`, padding: "2px 10px", borderRadius: 20 }}>Custom</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>10 accent colors × light & dark — one click sets color, mode & font</div>

          {/* Light presets */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Light Mode</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {THEME_PRESETS.filter(p => !p.darkMode).map((preset) => {
                const isActive = activePreset?.id === preset.id;
                const pal = (ACCENT_PALETTES as any)[preset.accentKey];
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    style={{
                      display: "flex", flexDirection: "column", gap: 0,
                      border: isActive ? `2px solid ${pal?.light || THEME.accent}` : `1.5px solid ${THEME.line}`,
                      borderRadius: 14, overflow: "hidden", cursor: "pointer",
                      background: "var(--t-paper)",
                      boxShadow: isActive ? `0 0 0 3px ${pal?.light || THEME.accent}33` : "none",
                      transition: "all 0.18s", padding: 0, textAlign: "left", fontFamily: "inherit",
                    }}
                  >
                    <div style={{ height: 50, display: "flex", alignItems: "flex-end", padding: "0 12px 8px", background: preset.bgPreview, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: pal?.light || "#4F46E5" }} />
                      <div style={{ width: "52%", height: 20, borderRadius: 5, marginLeft: 10, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(0,0,0,0.06)" }} />
                      <div style={{ width: "28%", height: 14, borderRadius: 5, marginLeft: 6, background: "rgba(255,255,255,0.65)", border: "1px solid rgba(0,0,0,0.04)" }} />
                      <div style={{ position: "absolute", right: 12, top: 10, width: 16, height: 16, borderRadius: "50%", background: pal?.light || "#4F46E5", boxShadow: `0 2px 5px ${pal?.light || "#4F46E5"}66` }} />
                      {isActive && <div style={{ position: "absolute", top: 5, left: 10, fontSize: 8, fontWeight: 800, color: "#fff", background: pal?.light || THEME.accent, padding: "2px 6px", borderRadius: 20, letterSpacing: "0.05em" }}>ACTIVE</div>}
                    </div>
                    <div style={{ padding: "9px 12px 11px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? (pal?.light || THEME.accent) : THEME.ink, marginBottom: 1 }}>{preset.label}</div>
                      <div style={{ fontSize: 10, color: THEME.muted, lineHeight: 1.35, marginBottom: 7 }}>{preset.description}</div>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: pal?.light, flexShrink: 0 }} />
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
            <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Dark Mode</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {THEME_PRESETS.filter(p => p.darkMode).map((preset) => {
                const isActive = activePreset?.id === preset.id;
                const pal = (ACCENT_PALETTES as any)[preset.accentKey];
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    style={{
                      display: "flex", flexDirection: "column", gap: 0,
                      border: isActive ? `2px solid ${pal?.light || THEME.accent}` : `1.5px solid ${THEME.line}`,
                      borderRadius: 14, overflow: "hidden", cursor: "pointer",
                      background: "var(--t-paper)",
                      boxShadow: isActive ? `0 0 0 3px ${pal?.light || THEME.accent}33` : "none",
                      transition: "all 0.18s", padding: 0, textAlign: "left", fontFamily: "inherit",
                    }}
                  >
                    <div style={{ height: 50, display: "flex", alignItems: "flex-end", padding: "0 12px 8px", background: preset.bgPreview, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: pal?.light || "#4F46E5" }} />
                      <div style={{ width: "52%", height: 20, borderRadius: 5, marginLeft: 10, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.1)" }} />
                      <div style={{ width: "28%", height: 14, borderRadius: 5, marginLeft: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }} />
                      <div style={{ position: "absolute", right: 12, top: 10, width: 16, height: 16, borderRadius: "50%", background: pal?.light || "#4F46E5", boxShadow: `0 2px 5px ${pal?.light || "#4F46E5"}66` }} />
                      {isActive && <div style={{ position: "absolute", top: 5, left: 10, fontSize: 8, fontWeight: 800, color: "#fff", background: pal?.light || THEME.accent, padding: "2px 6px", borderRadius: 20, letterSpacing: "0.05em" }}>ACTIVE</div>}
                    </div>
                    <div style={{ padding: "9px 12px 11px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? (pal?.light || THEME.accent) : THEME.ink, marginBottom: 1 }}>{preset.label}</div>
                      <div style={{ fontSize: 10, color: THEME.muted, lineHeight: 1.35, marginBottom: 7 }}>{preset.description}</div>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: pal?.light, flexShrink: 0 }} />
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
            { value: "compact",     label: "Compact" },
            { value: "normal",      label: "Normal" },
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
            { value: "inter",          label: "Inter" },
            { value: "outfit",         label: "Outfit" },
            { value: "roboto",         label: "Roboto" },
            { value: "poppins",        label: "Poppins" },
            { value: "dm-sans",        label: "DM Sans" },
            { value: "nunito",         label: "Nunito" },
            { value: "space-grotesk",  label: "Space Grotesk" },
            { value: "lato",           label: "Lato" },
            { value: "sf-pro",         label: "SF Pro (System)" },
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

  // Sync if parent profile changes (e.g., DB load after mount)
  useEffect(() => {
    setProf(p => ({ ...state.profile, ...p }));
  }, [state.profile?.name]);

  const initials = (prof.name || "U")
    .split(" ").map((w: string) => w[0] || "").join("").slice(0, 2).toUpperCase();

  const saveProfile = () => {
    updateProfile(prof);
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 2200);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Dynamic FY list: 2 years back, current + 2 ahead
  const currentYear = new Date().getFullYear();
  const fyOptions: string[] = [];
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    fyOptions.push(`${y}-${String(y + 1).slice(-2)}`);
  }

  const inp = {
    width: "100%", padding: "10px 12px",
    background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`,
    borderRadius: 10, color: THEME.ink, fontSize: 14,
    boxSizing: "border-box" as const,
  };

  return (
    <Card style={{ padding: 24 }}>
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${THEME.line}` }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: `${THEME.accent}22`,
          border: `2px solid ${THEME.accent}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 900, color: THEME.accent, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.ink }}>{prof.name || "Your Name"}</div>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 3 }}>Personal Finance Dashboard</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 20, marginBottom: 24 }}>
        <Field label="Display Name">
          <input style={inp} value={prof.name || ""} onChange={e => setProf({ ...prof, name: e.target.value })} placeholder="Your Name" />
        </Field>
        <Field label="Financial Year">
          <select style={inp} value={prof.fy || ""} onChange={e => setProf({ ...prof, fy: e.target.value })}>
            {fyOptions.map(fy => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
        </Field>
        <Field label="Tax Regime">
          <select style={inp} value={prof.regime || "new"} onChange={e => setProf({ ...prof, regime: e.target.value })}>
            <option value="new">New Regime</option>
            <option value="old">Old Regime</option>
          </select>
        </Field>
        <Field label="Monthly Savings Target (%)">
          <input
            style={inp} type="number" min="0" max="100"
            value={prof.savingsTarget ?? 20}
            onChange={e => setProf({ ...prof, savingsTarget: Number(e.target.value) })}
            placeholder="e.g. 20"
          />
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          onClick={saveProfile}
          icon={saved ? <Check size={15} /> : undefined}
          style={saved ? { background: THEME.sage } : {}}
        >
          {saved ? "Saved!" : "Save Profile"}
        </Button>
      </div>
    </Card>
  );
}

// ─── Section: Master Data ─────────────────────────────────────────────────────
function MasterDataSection({ masterData, updateMasterData }: any) {
  const md = masterData || DEFAULT_MASTER_DATA;
  const [mdTab, setMdTab] = useState("transactions");

  const activeGroup = MD_GROUPS.find(g => g.id === mdTab)!;

  const tabsWithCounts = MD_GROUPS.map(g => ({
    ...g,
    count: g.keys.reduce((s, k) => s + (md[k]?.length || 0), 0),
  }));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{
        padding: "14px 18px", borderRadius: 10,
        background: `${THEME.accent}15`,
        border: `1px solid ${THEME.accent}33`,
        fontSize: 13, color: THEME.ink, lineHeight: 1.6,
      }}>
        <strong>Master Data</strong> controls every dropdown in the app — categories, types, networks. Add or remove values here and they reflect instantly everywhere.
      </div>

      <PillNav tabs={tabsWithCounts} active={mdTab} onChange={setMdTab} />

      <div style={{ display: "grid", gap: 12 }}>
        {activeGroup.keys.map(key => (
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

// ─── Section: Data & Account ──────────────────────────────────────────────────
function DataSection({ exportJSON, onRestoreBackup, resetAll, onSignOut, cleanupOrphaned }: any) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Cleanup */}
      <Card style={{ padding: 24, border: `1px solid ${THEME.gold}33` }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <RotateCcw size={16} color={THEME.gold} /> Cleanup & Maintenance
        </div>
        <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 20, marginTop: 4 }}>
          Scan and remove historical data records (like corporate actions) that no longer have a matching stock or sale history.
        </p>
        <Button
          variant="secondary"
          onClick={async () => { setCleaning(true); await cleanupOrphaned(); setCleaning(false); }}
          icon={<RefreshCw size={14} className={cleaning ? "animate-spin" : ""} />}
        >
          {cleaning ? "Cleaning up..." : "Cleanup Orphaned Portfolio Data"}
        </Button>
      </Card>

      {/* Backup */}
      <Card style={{ padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
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

      {/* Danger zone */}
      <Card style={{ padding: 24, border: `1px solid ${THEME.rust}44` }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8, color: THEME.rust }}>
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
          <div style={{
            padding: "16px", borderRadius: 10,
            background: `${THEME.rust}15`,
            border: `1px solid ${THEME.rust}44`,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.rust, marginBottom: 12 }}>
              Are you sure? This will delete ALL your financial data.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="danger" onClick={() => { resetAll(); setConfirmReset(false); }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 2 }}>Sign Out</div>
            <div style={{ fontSize: 12, color: THEME.muted }}>You'll be redirected to the login page</div>
          </div>
          <button
            onClick={onSignOut}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "none", border: `1.5px solid ${THEME.line}`,
              borderRadius: 8, cursor: "pointer",
              color: THEME.muted, fontSize: 13, fontWeight: 600,
              padding: "8px 16px", fontFamily: "inherit",
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
  { value: 1, label: "Monday" }, { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" }, { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" }, { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function EmailSummarySection({ state, emailSettings, updateEmailSettings }: any) {
  const es = emailSettings || {};
  const enabled    = !!es.emailEnabled;
  const frequency  = es.emailFrequency || "weekly";
  const day        = Number(es.emailDay ?? 1);
  const address    = es.emailAddress || "";

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
    width: "100%", padding: "10px 14px", boxSizing: "border-box",
    background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`,
    borderRadius: 10, color: THEME.ink, fontSize: 14, outline: "none",
    fontFamily: "inherit",
  };

  async function handleSendTest() {
    if (!address) return;
    setSending(true); setSendStatus(""); setErrMsg("");
    try {
      const res = await fetch("/api/send-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          emailTo: address,
          frequency,
          recipientName: state?.profile?.name || "there",
          fromEmail: fromEmail.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.sent) { setSendStatus("ok"); }
      else {
        setSendStatus("err");
        setErrMsg(json.hint ? `${json.error} — ${json.hint}` : (json.error || "Unknown error"));
      }
    } catch (e: any) {
      setSendStatus("err"); setErrMsg(e.message);
    } finally { setSending(false); setTimeout(() => setSendStatus(""), 12000); }
  }

  async function handleCheckConfig() {
    setChecking(true); setHealth(null);
    try {
      const params = fromEmail.trim() ? `?action=healthcheck&fromEmail=${encodeURIComponent(fromEmail.trim())}` : "?action=healthcheck";
      const res = await fetch(`/api/send-summary${params}`);
      const json = await res.json();
      setHealth(json);
    } catch (e: any) {
      setHealth({ error: e.message });
    } finally { setChecking(false); }
  }

  const freqOptions = [
    { value: "daily",   label: "Daily",   desc: "Every day at your chosen time" },
    { value: "weekly",  label: "Weekly",  desc: "Once a week — pick a day" },
    { value: "monthly", label: "Monthly", desc: "Once a month — pick a date" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Enable toggle card */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>✉️</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink }}>Email Summary Reports</div>
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.6, maxWidth: 480 }}>
              Get your complete financial picture delivered straight to your inbox — net worth, cash flow, investments, upcoming dues, goals, and smart alerts.
            </div>
          </div>
          <button
            onClick={() => updateEmailSettings({ emailEnabled: !enabled })}
            style={{
              position: "relative", width: 52, height: 28, borderRadius: 99,
              background: enabled ? THEME.accent : THEME.line,
              border: "none", cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s ease",
            }}
          >
            <div style={{
              position: "absolute", top: 4, left: enabled ? 26 : 4,
              width: 20, height: 20, borderRadius: "50%",
              background: "#fff", transition: "left 0.2s ease",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        {enabled && (
          <div style={{ marginTop: 20, padding: "16px 20px", background: `${THEME.accent}09`, borderRadius: 12, border: `1px solid ${THEME.accent}22`, fontSize: 12, color: THEME.muted, lineHeight: 1.7 }}>
            <strong style={{ color: THEME.accent }}>Setup required:</strong> Add <code style={{ background: `${THEME.accent}15`, padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>Resend_Email_API</code> and <code style={{ background: `${THEME.accent}15`, padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>SUPABASE_SERVICE_EMAIL_ROLE_KEY</code> to your Vercel environment variables.
          </div>
        )}
      </Card>

      {enabled && (
        <>
          {/* Email address */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Delivery Address</div>
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Recipient Email (Send To)">
                <input style={inp} type="email" placeholder="you@example.com" value={address} onChange={e => updateEmailSettings({ emailAddress: e.target.value })} />
              </Field>
              <Field label="Sender Email (From) — your Resend account email">
                <input
                  style={inp} type="email"
                  placeholder="e.g. anand@gmail.com (the email you registered with Resend)"
                  value={fromEmail}
                  onChange={e => updateEmailSettings({ fromEmail: e.target.value })}
                />
              </Field>
              {!fromEmail && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: `${THEME.gold}15`, border: `1px solid ${THEME.gold}44`, fontSize: 12, color: THEME.ink, lineHeight: 1.6 }}>
                  <strong style={{ color: THEME.gold }}>⚠ Action needed:</strong> Enter your Resend account email above. Without it, emails can only be sent to the Resend-registered address, not to any custom recipient. <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: THEME.accent, textDecoration: "none", fontWeight: 600 }}>Check your Resend account →</a>
                </div>
              )}
              {fromEmail && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: `${THEME.sage}09`, border: `1px solid ${THEME.sage}33`, fontSize: 12, color: THEME.sage, fontWeight: 600 }}>
                  ✓ Emails will be sent from: <strong>{fromEmail}</strong>
                </div>
              )}
            </div>
          </Card>

          {/* Frequency + timing */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Schedule</div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginBottom: 10 }}>How often?</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
                {freqOptions.map(f => (
                  <button
                    key={f.value}
                    onClick={() => updateEmailSettings({ emailFrequency: f.value })}
                    style={{
                      flex: "1 1 140px", padding: "12px 16px", borderRadius: 12,
                      border: frequency === f.value ? `2px solid ${THEME.accent}` : `1.5px solid ${THEME.line}`,
                      background: frequency === f.value ? `${THEME.accent}15` : "var(--surface-0)",
                      cursor: "pointer", textAlign: "left" as const, fontFamily: "inherit",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: frequency === f.value ? THEME.accent : THEME.ink }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {frequency === "weekly" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginBottom: 10 }}>Which day?</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                  {WEEKDAYS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => updateEmailSettings({ emailDay: d.value })}
                      style={{
                        padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                        background: day === d.value ? THEME.accent : THEME.line,
                        color: day === d.value ? "#fff" : THEME.muted,
                        transition: "all 0.15s ease",
                      }}
                    >{d.label}</button>
                  ))}
                </div>
              </div>
            )}

            {frequency === "monthly" && (
              <div style={{ marginBottom: 20 }}>
                <Field label="Day of Month">
                  <input style={inp} type="number" min="1" max="28" placeholder="e.g. 1" value={day || ""} onChange={e => updateEmailSettings({ emailDay: Number(e.target.value) })} />
                </Field>
              </div>
            )}

            <div style={{ marginTop: 8, padding: "10px 14px", background: "var(--surface-0)", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 12, color: THEME.muted, display: "flex", alignItems: "center", gap: 6 }}>
                <span>⏰</span>
                <span>Emails are delivered at <strong style={{ color: THEME.ink }}>8:00 AM IST</strong> on your chosen day.</span>
              </div>
            </div>
          </Card>

          {/* What's included */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>What's in each email</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {[
                { icon: "💰", title: "Net Worth Snapshot", desc: "Total wealth with asset breakdown" },
                { icon: "💸", title: "Monthly Cash Flow", desc: "Income vs expenses + savings rate" },
                { icon: "📈", title: "Investment Portfolio", desc: "MF, stocks, FD, PPF, NPS values" },
                { icon: "💳", title: "Credit Card Status", desc: "Outstanding + utilization % per card" },
                { icon: "🛍️", title: "Top Spending", desc: "Your biggest expense categories" },
                { icon: "🎯", title: "Goals Progress", desc: "How close you are to each goal" },
                { icon: "📅", title: "Upcoming Dues", desc: "Bills, EMIs and subscriptions in 7 days" },
                { icon: "⚡", title: "Smart Alerts", desc: "Over-budget, high credit util, overdue" },
              ].map(item => (
                <div key={item.title} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "var(--surface-0)", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Send test email */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Test Your Email</div>
            <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 16 }}>
              Send a test email right now using your current financial data.
              {!address && <span style={{ color: THEME.rust }}> Add your email address above first.</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
              <button
                onClick={handleSendTest}
                disabled={sending || !address}
                style={{
                  padding: "10px 24px", borderRadius: 10, border: "none",
                  background: !address ? THEME.line : sending ? THEME.muted : THEME.accent,
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: !address ? "default" : "pointer",
                  fontFamily: "inherit", transition: "all 0.2s ease", opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? "Sending…" : "Send Test Email Now"}
              </button>
              {sendStatus === "ok" && <span style={{ fontSize: 13, color: THEME.sage, fontWeight: 600 }}>✓ Email sent to {address}</span>}
              {sendStatus === "err" && <span style={{ fontSize: 13, color: THEME.rust, fontWeight: 600, maxWidth: 480 }}>✕ {errMsg || "Failed to send. Check RESEND_API_KEY in Vercel."}</span>}
            </div>
          </Card>

          {/* Config diagnostics */}
          <Card style={{ padding: 24, border: `1px solid ${THEME.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Configuration Check</div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>Diagnose why emails may not be delivering</div>
              </div>
              <button
                onClick={handleCheckConfig}
                disabled={checking}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${THEME.line}`,
                  background: "var(--t-paper)", color: THEME.ink, fontWeight: 600, fontSize: 13,
                  cursor: checking ? "default" : "pointer", fontFamily: "inherit", opacity: checking ? 0.6 : 1,
                }}
              >
                {checking ? "Checking…" : "Check Config"}
              </button>
            </div>

            {health && !health.error && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { ok: health.resendKey, label: "Resend API Key", pass: "Configured in Vercel", fail: "Missing — add Resend_Email_API to Vercel Environment Variables" },
                  { ok: health.supabaseServiceKey, label: "Supabase Service Role Key", pass: "Configured in Vercel", fail: "Missing — add SUPABASE_SERVICE_EMAIL_ROLE_KEY to Vercel" },
                  { ok: health.supabaseUrl, label: "Supabase URL", pass: "Configured", fail: "Missing VITE_SUPABASE_URL" },
                  {
                    ok: !health.usingTestDomain,
                    label: "From Email (Sender)",
                    pass: `Sending from: ${health.fromEmail}`,
                    fail: health.testDomainWarning || `Using test sender (onboarding@resend.dev) — enter your Resend account email in the 'Sender Email' field above`,
                  },
                  { ok: health.ready, label: "Overall Status", pass: "All checks passed — emails will deliver correctly", fail: "Fix the From Email above to enable reliable email delivery" },
                ].map(row => (
                  <div key={row.label} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    padding: "10px 12px", borderRadius: 8,
                    background: row.ok ? `${THEME.sage}09` : `${THEME.rust}09`,
                    border: row.ok ? `1px solid ${THEME.sage}33` : `1px solid ${THEME.rust}33`,
                  }}>
                    <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{row.ok ? "✅" : "❌"}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{row.label}</div>
                      <div style={{ fontSize: 12, color: row.ok ? THEME.sage : THEME.rust, marginTop: 2, lineHeight: 1.5 }}>{row.ok ? row.pass : row.fail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {health?.error && <div style={{ fontSize: 13, color: THEME.rust }}>Could not reach API: {health.error}</div>}
            {!health && !checking && (
              <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>
                {fromEmail
                  ? `Will check config using sender: ${fromEmail}`
                  : "Click \"Check Config\" to diagnose. Enter your Sender Email above first for accurate results."}
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
    flex: 1, padding: "10px 14px", boxSizing: "border-box",
    background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`,
    borderRadius: 10, color: THEME.ink, fontSize: 14, outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#0ea5e9,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink }}>AI Financial Advisor</div>
        </div>
        <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.6, maxWidth: 480, marginBottom: 24 }}>
          Configure your Gemini API key to enable the AI Financial Advisor. Your data will be anonymized before being sent to Google's Gemini API for personalized insights and advice.
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>API Settings</div>
        <Field label="Gemini API Key">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={inp}
              type={showKey ? "text" : "password"}
              placeholder="AIzaSy..."
              value={geminiApiKey || ""}
              onChange={e => updateSettings({ geminiApiKey: e.target.value })}
            />
            <button
              onClick={() => setShowKey(v => !v)}
              title={showKey ? "Hide key" : "Show key"}
              style={{
                padding: "0 14px", borderRadius: 10, border: `1.5px solid ${THEME.line}`,
                background: "var(--t-paper)", cursor: "pointer", color: THEME.muted,
                display: "flex", alignItems: "center",
              }}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
        <div style={{ marginTop: 12, fontSize: 12, color: THEME.muted }}>
          Get a free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: THEME.accent, textDecoration: "none" }}>Google AI Studio</a> — free tier supports up to 15 requests/minute.
        </div>
      </Card>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TOP_TABS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "profile",    label: "Profile",    icon: User },
  { id: "masterdata", label: "Master Data", icon: Tags },
  { id: "ai",         label: "AI Advisor",  icon: Bot },
  { id: "email",      label: "Email Reports", icon: Mail },
  { id: "data",       label: "Data & Account", icon: HardDrive },
];

export function SettingsTab({
  state, exportJSON, onRestoreBackup, resetAll, onSignOut,
  cleanupOrphaned,
  updateProfile, updateSettings,
  accentKey, setAccentKey,
  darkMode, toggleDarkMode,
  density, setDensity,
  sidebarNav, setSidebarNav,
  radiusKey, setRadiusKey,
  fontKey, setFontKey,
  bgStyle, setBgStyle,
  animSpeed, setAnimSpeed,
  chartStyle, setChartStyle,
  masterData, updateMasterData,
  emailSettings, updateEmailSettings,
}: any) {
  const [tab, setTab] = useState("appearance");

  return (
    <div className="animate-fade-in-up">
      <SectionTitle sub="Customize your experience, manage dropdown values, and control your data">
        Settings
      </SectionTitle>

      {(() => {
        const activePreset = THEME_PRESETS.find(
          p => p.darkMode === darkMode && p.accentKey === (accentKey || "blue")
        );
        const fontLabels: Record<string, string> = {
          "inter": "Inter", "outfit": "Outfit", "roboto": "Roboto",
          "poppins": "Poppins", "dm-sans": "DM Sans", "nunito": "Nunito",
          "space-grotesk": "Space Grotesk", "lato": "Lato", "sf-pro": "SF Pro",
        };
        const regime = state?.profile?.regime || "new";
        const tiles = [
          { label: "Active Theme", value: activePreset?.label || "Custom", sub: darkMode ? "Dark mode" : "Light mode", color: THEME.accent },
          { label: "Interface Font", value: fontLabels[fontKey || "inter"] || "Inter", sub: density === "compact" ? "Compact density" : density === "comfortable" ? "Comfortable density" : "Normal density", color: THEME.muted },
          { label: "Financial Year", value: `FY ${state?.profile?.fy || "—"}`, sub: "Active fiscal year for reports", color: THEME.gold },
          { label: "Tax Regime", value: regime === "new" ? "New Regime" : "Old Regime", sub: regime === "new" ? "Default from FY 2024-25" : "Deductions & exemptions", color: THEME.sage },
        ];
        return (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {tiles.map(({ label, value, sub, color }) => (
              <div key={label} style={{ flex: "1 1 150px", background: `${color}09`, border: `1px solid ${color}22`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: 10, color: THEME.muted, marginTop: 5, fontWeight: 600 }}>{sub}</div>
              </div>
            ))}
          </div>
        );
      })()}

      <div style={{ marginBottom: 24, overflowX: "auto" }}>
        <PillNav tabs={TOP_TABS} active={tab} onChange={setTab} />
      </div>

      {tab === "appearance" && (
        <AppearanceSection
          accentKey={accentKey} setAccentKey={setAccentKey}
          density={density} setDensity={setDensity}
          fontKey={fontKey} setFontKey={setFontKey}
          bgStyle={bgStyle} setBgStyle={setBgStyle}
          darkMode={darkMode} toggleDarkMode={toggleDarkMode}
        />
      )}

      {tab === "profile" && (
        <ProfileSection state={state} updateProfile={updateProfile} />
      )}

      {tab === "masterdata" && (
        <MasterDataSection masterData={masterData} updateMasterData={updateMasterData} />
      )}

      {tab === "ai" && (
        <AIAssistantSection geminiApiKey={state?.settings?.geminiApiKey} updateSettings={updateSettings} />
      )}

      {tab === "email" && (
        <EmailSummarySection
          state={state}
          emailSettings={emailSettings}
          updateEmailSettings={updateEmailSettings}
        />
      )}

      {tab === "data" && (
        <DataSection
          exportJSON={exportJSON}
          onRestoreBackup={onRestoreBackup}
          resetAll={resetAll}
          onSignOut={onSignOut}
          cleanupOrphaned={cleanupOrphaned}
        />
      )}
    </div>
  );
}
