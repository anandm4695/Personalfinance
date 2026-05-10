// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Database, User, Check, Download, RefreshCw,
  Sun, Moon, X as XIcon, LogOut, Tags,
  RotateCcw, Plus, AlertTriangle, Settings,
} from "lucide-react";
import { THEME, ACCENT_PALETTES } from "../../utils/constants";
import { DEFAULT_MASTER_DATA } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";

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
function AppearanceSection({ darkMode, toggleDarkMode, accentKey, setAccentKey }: any) {
  return (
    <Card style={{ padding: 28 }}>
      <div style={{ display: "grid", gap: 28 }}>

        {/* Theme toggle */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Color Mode</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Light", icon: <Sun size={15} color={THEME.gold} />, val: false },
              { label: "Dark",  icon: <Moon size={15} color={THEME.accent} />, val: true },
            ].map(opt => {
              const active = darkMode === opt.val;
              return (
                <button
                  key={opt.label}
                  onClick={() => toggleDarkMode()}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 20px", borderRadius: 10, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: active ? 700 : 500, fontSize: 14,
                    border: `2px solid ${active ? THEME.accent : THEME.line}`,
                    background: active ? "color-mix(in srgb, var(--t-accent) 10%, transparent)" : "transparent",
                    color: active ? THEME.accent : THEME.muted,
                    transition: "all 0.15s",
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Accent Color</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            {Object.entries(ACCENT_PALETTES).map(([k, p]: [string, any]) => {
              const active = accentKey === k;
              return (
                <button
                  key={k}
                  onClick={() => setAccentKey(k)}
                  title={p.label}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", background: p.light,
                    boxShadow: active ? `0 0 0 2px var(--t-paper), 0 0 0 4px ${p.light}` : "0 2px 6px rgba(0,0,0,0.15)",
                    transform: active ? "scale(1.18)" : "scale(1)",
                    transition: "all 0.2s",
                  }} />
                  <span style={{ fontSize: 10, fontWeight: active ? 800 : 400, color: active ? THEME.ink : THEME.muted }}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </Card>
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
