// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Database, User, Check, Download, RefreshCw,
  Sun, Moon, X as XIcon, LogOut, Tags, Palette,
  RotateCcw, Plus, AlertTriangle, Settings,
} from "lucide-react";
import { THEME, ACCENT_PALETTES } from "../../utils/constants";
import { DEFAULT_MASTER_DATA } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";

// ─── Option arrays ────────────────────────────────────────────────────────────
const DENSITY_OPTIONS = [
  { value: "compact",     label: "Compact",      desc: "Tight spacing" },
  { value: "normal",      label: "Normal",        desc: "Balanced default" },
  { value: "comfortable", label: "Comfortable",   desc: "Spacious layout" },
];
const RADIUS_OPTIONS = [
  { value: "sharp",  label: "Sharp",   desc: "4px" },
  { value: "modern", label: "Modern",  desc: "12px" },
  { value: "round",  label: "Rounded", desc: "24px" },
];
const FONT_OPTIONS = [
  { value: "inter",  label: "Inter",  desc: "Clean & precise" },
  { value: "outfit", label: "Outfit", desc: "Geometric modern" },
  { value: "roboto", label: "Roboto", desc: "Material style" },
];
const ANIM_OPTIONS = [
  { value: "snappy",  label: "Snappy",  desc: "0.15s" },
  { value: "smooth",  label: "Smooth",  desc: "0.4s" },
  { value: "relaxed", label: "Relaxed", desc: "0.8s" },
];
const CHART_OPTIONS = [
  { value: "monotone", label: "Smooth", desc: "Curved" },
  { value: "linear",   label: "Linear", desc: "Angular" },
  { value: "step",     label: "Step",   desc: "Stepped" },
];
const BG_OPTIONS = [
  { value: "plain", label: "Plain", desc: "No pattern" },
  { value: "dots",  label: "Dots",  desc: "Dot grid" },
  { value: "mesh",  label: "Mesh",  desc: "Gradient mesh" },
];
const NAV_OPTIONS = [
  { value: "sidebar", label: "Sidebar",    desc: "Left panel nav" },
  { value: "bottom",  label: "Bottom Bar", desc: "Tab bar at bottom" },
];

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
            padding: "8px 16px", borderRadius: 10, border: "none",
            background: isActive ? THEME.accent : "transparent",
            color: isActive ? "#fff" : THEME.muted,
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
              background: isActive ? "rgba(255,255,255,0.25)" : "color-mix(in srgb, var(--t-accent) 14%, transparent)",
              color: isActive ? "#fff" : THEME.accent,
            }}>{t.count}</span>
          )}
        </button>
      );
    })}
  </div>
);

const OptionGroup = ({ value, options, onChange }: any) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {options.map((opt: any) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.desc}
          style={{
            padding: "7px 14px", borderRadius: 10, fontFamily: "inherit",
            border: `1.5px solid ${active ? THEME.accent : THEME.line}`,
            background: active ? "color-mix(in srgb, var(--t-accent) 10%, transparent)" : "transparent",
            color: active ? THEME.accent : THEME.muted,
            fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const SectionDivider = ({ label }: { label: string }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px",
  }}>
    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: THEME.muted, whiteSpace: "nowrap" }}>{label}</div>
    <div style={{ flex: 1, height: 1, background: THEME.line }} />
  </div>
);

// ─── EditableList ─────────────────────────────────────────────────────────────
function EditableList({ listKey, items, onUpdate }: any) {
  const [val, setVal] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultItems: string[] = DEFAULT_MASTER_DATA[listKey] || [];
  const isDirty = JSON.stringify([...items].sort()) !== JSON.stringify([...defaultItems].sort());

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
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: `1px solid ${THEME.line}`,
        background: "color-mix(in srgb, var(--t-accent) 4%, var(--t-paper))",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{MD_ICONS[listKey]}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{MD_LABELS[listKey]}</span>
          <span style={{
            fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
            background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
            color: THEME.accent,
          }}>{items.length}</span>
        </div>
        {isDirty && (
          <button
            onClick={() => onUpdate(listKey, [...defaultItems])}
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
              background: "color-mix(in srgb, var(--t-accent) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--t-accent) 22%, transparent)",
              color: THEME.ink,
            }}
          >
            {item}
            <button
              onClick={() => remove(item)}
              style={{
                background: "color-mix(in srgb, var(--t-ink) 8%, transparent)",
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
        background: focused ? "color-mix(in srgb, var(--t-accent) 3%, var(--t-paper))" : "var(--t-paper)",
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
function AppearanceSection({ darkMode, toggleDarkMode, accentKey, setAccentKey, density, setDensity, radiusKey, setRadiusKey, fontKey, setFontKey, bgStyle, setBgStyle, animSpeed, setAnimSpeed, chartStyle, setChartStyle, sidebarNav, setSidebarNav }: any) {
  return (
    <div style={{ display: "grid", gap: 20 }}>

      <Card style={{ padding: 24 }}>
        <SectionDivider label="Visual Style" />
        <div style={{ display: "grid", gap: 20 }}>
          <Field label="Color Mode" style={{ marginBottom: 0 }}>
            <button
              onClick={toggleDarkMode}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "10px 20px", borderRadius: 10,
                border: `1.5px solid ${THEME.line}`,
                background: "transparent", color: THEME.ink,
                fontWeight: 600, fontSize: 14, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              {darkMode
                ? <Sun size={16} color={THEME.gold} />
                : <Moon size={16} color={THEME.accent} />}
              {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </button>
          </Field>

          <Field label="Accent Color" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              {Object.entries(ACCENT_PALETTES).map(([k, p]: [string, any]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <button
                    onClick={() => setAccentKey(k)}
                    title={p.label}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: p.light, border: "none",
                      outline: accentKey === k ? `3px solid ${p.light}` : "none",
                      outlineOffset: 3,
                      boxShadow: accentKey === k ? `0 0 0 2px var(--t-paper), 0 0 0 4px ${p.light}` : "0 2px 6px rgba(0,0,0,0.15)",
                      cursor: "pointer", transition: "all 0.2s",
                      transform: accentKey === k ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                  <span style={{ fontSize: 10, color: THEME.muted, fontWeight: accentKey === k ? 700 : 400 }}>{p.label}</span>
                </div>
              ))}
            </div>
          </Field>

          <Field label="Font Family" style={{ marginBottom: 0 }}>
            <OptionGroup value={fontKey} options={FONT_OPTIONS} onChange={setFontKey} />
          </Field>
        </div>

        <SectionDivider label="Layout & Spacing" />
        <div style={{ display: "grid", gap: 20 }}>
          <Field label="Navigation Style" style={{ marginBottom: 0 }}>
            <OptionGroup
              value={sidebarNav ? "sidebar" : "bottom"}
              options={NAV_OPTIONS}
              onChange={(v: string) => setSidebarNav(v === "sidebar")}
            />
          </Field>

          <Field label="Density" style={{ marginBottom: 0 }}>
            <OptionGroup value={density} options={DENSITY_OPTIONS} onChange={setDensity} />
          </Field>

          <Field label="Corner Radius" style={{ marginBottom: 0 }}>
            <OptionGroup value={radiusKey} options={RADIUS_OPTIONS} onChange={setRadiusKey} />
          </Field>
        </div>

        <SectionDivider label="Motion & Charts" />
        <div style={{ display: "grid", gap: 20 }}>
          <Field label="Animation Speed" style={{ marginBottom: 0 }}>
            <OptionGroup value={animSpeed} options={ANIM_OPTIONS} onChange={setAnimSpeed} />
          </Field>

          <Field label="Chart Line Style" style={{ marginBottom: 0 }}>
            <OptionGroup value={chartStyle} options={CHART_OPTIONS} onChange={setChartStyle} />
          </Field>

          <Field label="Background Pattern" style={{ marginBottom: 0 }}>
            <OptionGroup value={bgStyle} options={BG_OPTIONS} onChange={setBgStyle} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

// ─── Section: Profile ─────────────────────────────────────────────────────────
function ProfileSection({ state, updateProfile }: any) {
  const [prof, setProf] = useState({ ...state.profile });
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<any>(null);

  const initials = (prof.name || "U")
    .split(" ").map((w: string) => w[0] || "").join("").slice(0, 2).toUpperCase();

  const saveProfile = () => {
    updateProfile(prof);
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 2200);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const inp = {
    width: "100%", padding: "10px 12px",
    background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`,
    borderRadius: 10, color: THEME.ink, fontSize: 14,
  };

  return (
    <Card style={{ padding: 24 }}>
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${THEME.line}` }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "color-mix(in srgb, var(--t-accent) 18%, transparent)",
          border: `2px solid color-mix(in srgb, var(--t-accent) 30%, transparent)`,
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
          <select style={inp} value={prof.fy || "2025-26"} onChange={e => setProf({ ...prof, fy: e.target.value })}>
            <option value="2024-25">FY 2024-25</option>
            <option value="2025-26">FY 2025-26</option>
            <option value="2026-27">FY 2026-27</option>
          </select>
        </Field>
        <Field label="Tax Regime">
          <select style={inp} value={prof.regime || "new"} onChange={e => setProf({ ...prof, regime: e.target.value })}>
            <option value="new">New Regime</option>
            <option value="old">Old Regime</option>
          </select>
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
      {/* Intro */}
      <div style={{
        padding: "14px 18px", borderRadius: 10,
        background: "color-mix(in srgb, var(--t-accent) 8%, transparent)",
        border: `1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)`,
        fontSize: 13, color: THEME.ink, lineHeight: 1.6,
      }}>
        <strong>Master Data</strong> controls every dropdown in the app — categories, types, networks. Add or remove values here and they reflect instantly everywhere.
      </div>

      {/* Sub-tabs */}
      <PillNav tabs={tabsWithCounts} active={mdTab} onChange={setMdTab} />

      {/* Lists for active group */}
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
function DataSection({ exportJSON, onRestoreBackup, resetAll, onSignOut }: any) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div style={{ display: "grid", gap: 20 }}>
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
      <Card style={{ padding: 24, border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)` }}>
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
            background: "color-mix(in srgb, var(--t-rust) 8%, transparent)",
            border: `1px solid color-mix(in srgb, var(--t-rust) 25%, transparent)`,
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
      <div style={{ textAlign: "center", paddingTop: 8 }}>
        <button
          onClick={onSignOut}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "none", border: "none", cursor: "pointer",
            color: THEME.muted, fontSize: 14, fontWeight: 500, fontFamily: "inherit",
          }}
        >
          <LogOut size={15} /> Sign Out of Account
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TOP_TABS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "profile",    label: "Profile",    icon: User },
  { id: "masterdata", label: "Master Data", icon: Tags },
  { id: "data",       label: "Data & Account", icon: Settings },
];

export function SettingsTab({
  state, exportJSON, onRestoreBackup, resetAll, onSignOut,
  updateProfile,
  darkMode, toggleDarkMode,
  accentKey, setAccentKey,
  density, setDensity,
  sidebarNav, setSidebarNav,
  radiusKey, setRadiusKey,
  fontKey, setFontKey,
  bgStyle, setBgStyle,
  animSpeed, setAnimSpeed,
  chartStyle, setChartStyle,
  masterData, updateMasterData,
}: any) {
  const [tab, setTab] = useState("appearance");

  return (
    <div style={{ maxWidth: 900 }} className="animate-fade-in-up">
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>
          Settings
        </h2>
        <p style={{ color: THEME.muted, fontSize: 14, marginTop: 4 }}>
          Customize your experience, manage dropdown values, and control your data
        </p>
      </div>

      {/* Top navigation */}
      <div style={{ marginBottom: 24, overflowX: "auto" }}>
        <PillNav tabs={TOP_TABS} active={tab} onChange={setTab} />
      </div>

      {/* Content */}
      {tab === "appearance" && (
        <AppearanceSection
          darkMode={darkMode} toggleDarkMode={toggleDarkMode}
          accentKey={accentKey} setAccentKey={setAccentKey}
          density={density} setDensity={setDensity}
          radiusKey={radiusKey} setRadiusKey={setRadiusKey}
          fontKey={fontKey} setFontKey={setFontKey}
          bgStyle={bgStyle} setBgStyle={setBgStyle}
          animSpeed={animSpeed} setAnimSpeed={setAnimSpeed}
          chartStyle={chartStyle} setChartStyle={setChartStyle}
          sidebarNav={sidebarNav} setSidebarNav={setSidebarNav}
        />
      )}

      {tab === "profile" && (
        <ProfileSection state={state} updateProfile={updateProfile} />
      )}

      {tab === "masterdata" && (
        <MasterDataSection masterData={masterData} updateMasterData={updateMasterData} />
      )}

      {tab === "data" && (
        <DataSection
          exportJSON={exportJSON}
          onRestoreBackup={onRestoreBackup}
          resetAll={resetAll}
          onSignOut={onSignOut}
        />
      )}
    </div>
  );
}
