// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Database, User, Check, Download, RefreshCw,
  X as XIcon, LogOut, Tags, Palette,
  RotateCcw, Plus, AlertTriangle, Settings,
  ArrowUpAZ, ArrowDownAZ,
} from "lucide-react";
import { THEME, ACCENT_PALETTES } from "../../utils/constants";
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
        background: "color-mix(in srgb, var(--t-accent) 4%, var(--t-paper))",
        flexWrap: "wrap",
      }}>
        {/* Left: icon + label + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{MD_ICONS[listKey]}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{MD_LABELS[listKey]}</span>
          <span style={{
            fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
            background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
            color: THEME.accent,
          }}>{items.length}</span>
        </div>

        {/* Right: sort buttons + reset */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {/* Sort A→Z */}
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

          {/* Sort Z→A */}
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

          {/* Reset to defaults */}
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
function AppearanceSection({ accentKey, setAccentKey }: any) {
  return (
    <Card style={{ padding: 28 }}>
      <div style={{ display: "grid", gap: 28 }}>

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
function DataSection({ exportJSON, onRestoreBackup, resetAll, onSignOut, cleanupOrphaned }: any) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Cleanup */}
      <Card style={{ padding: 24, border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)` }}>
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

// ─── Section: Email Summary ───────────────────────────────────────────────────
const HOUR_OPTIONS = [
  { value: 6,  label: "6:00 AM" }, { value: 7,  label: "7:00 AM" },
  { value: 8,  label: "8:00 AM" }, { value: 9,  label: "9:00 AM" },
  { value: 10, label: "10:00 AM" }, { value: 12, label: "12:00 PM" },
  { value: 14, label: "2:00 PM" }, { value: 18, label: "6:00 PM" },
  { value: 20, label: "8:00 PM" }, { value: 21, label: "9:00 PM" },
];
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
  const hour       = Number(es.emailHour ?? 8);
  const address    = es.emailAddress || "";

  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"" | "ok" | "err">("");
  const [errMsg, setErrMsg] = useState("");

  const inp: any = {
    width: "100%", padding: "10px 14px", boxSizing: "border-box",
    background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`,
    borderRadius: 10, color: THEME.ink, fontSize: 14, outline: "none",
    fontFamily: "inherit",
  };

  const sel: any = { ...inp, cursor: "pointer", appearance: "none", WebkitAppearance: "none" };

  async function handleSendTest() {
    if (!address) return;
    setSending(true); setSendStatus(""); setErrMsg("");
    try {
      const res = await fetch("/api/send-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, emailTo: address, frequency, recipientName: state?.profile?.name || "there" }),
      });
      const json = await res.json();
      if (res.ok && json.sent) { setSendStatus("ok"); }
      else { setSendStatus("err"); setErrMsg(json.error || "Unknown error"); }
    } catch (e: any) {
      setSendStatus("err"); setErrMsg(e.message);
    } finally { setSending(false); setTimeout(() => setSendStatus(""), 5000); }
  }

  const freqOptions: { value: string; label: string; desc: string }[] = [
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
              Get your complete financial picture delivered straight to your inbox — net worth, cash flow, investments, upcoming dues, goals, and smart alerts. All in one clean summary.
            </div>
          </div>
          {/* Toggle switch */}
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
          <div style={{ marginTop: 20, padding: "16px 20px", background: "rgba(99,102,241,0.06)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.15)", fontSize: 12, color: THEME.muted, lineHeight: 1.7 }}>
            <strong style={{ color: THEME.accent }}>Setup required:</strong> Add <code style={{ background: "rgba(99,102,241,0.1)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>RESEND_API_KEY</code> and <code style={{ background: "rgba(99,102,241,0.1)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>SUPABASE_SERVICE_ROLE_KEY</code> to your Vercel environment variables. Get a free Resend API key at resend.com — 3,000 free emails/month.
          </div>
        )}
      </Card>

      {enabled && (
        <>
          {/* Email address */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Delivery Address</div>
            <Field label="Email Address">
              <input
                style={inp} type="email" placeholder="you@example.com"
                value={address}
                onChange={e => updateEmailSettings({ emailAddress: e.target.value })}
              />
            </Field>
          </Card>

          {/* Frequency + timing */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Schedule</div>

            {/* Frequency pills */}
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
                      background: frequency === f.value ? `color-mix(in srgb, var(--t-accent) 8%, var(--surface-0))` : "var(--surface-0)",
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

            {/* Day picker — weekly */}
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

            {/* Date picker — monthly */}
            {frequency === "monthly" && (
              <div style={{ marginBottom: 20 }}>
                <Field label="Day of Month">
                  <input
                    style={inp} type="number" min="1" max="28"
                    placeholder="e.g. 1"
                    value={day || ""}
                    onChange={e => updateEmailSettings({ emailDay: Number(e.target.value) })}
                  />
                </Field>
              </div>
            )}

            {/* Delivery time note */}
            <div style={{ marginTop: 8, padding: "10px 14px", background: "var(--surface-0)", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 12, color: THEME.muted, display: "flex", alignItems: "center", gap: 6 }}>
                <span>⏰</span>
                <span>Emails are delivered at <strong style={{ color: THEME.ink }}>8:00 AM IST</strong> on your chosen day. Upgrade to Vercel Pro for custom delivery times.</span>
              </div>
            </div>
          </Card>

          {/* Preview of what's included */}
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
                  fontFamily: "inherit", transition: "all 0.2s ease",
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
                <span style={{ fontSize: 13, color: THEME.rust, fontWeight: 600 }}>
                  ✕ {errMsg || "Failed to send. Check RESEND_API_KEY in Vercel."}
                </span>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TOP_TABS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "profile",    label: "Profile",    icon: User },
  { id: "masterdata", label: "Master Data", icon: Tags },
  { id: "email",      label: "Email Reports", icon: Settings },
  { id: "data",       label: "Data & Account", icon: Settings },
];

export function SettingsTab({
  state, exportJSON, onRestoreBackup, resetAll, onSignOut,
  cleanupOrphaned,
  updateProfile,
  accentKey, setAccentKey,
  masterData, updateMasterData,
  emailSettings, updateEmailSettings,
}: any) {
  const [tab, setTab] = useState("appearance");

  return (
    <div style={{ maxWidth: 900 }} className="animate-fade-in-up">
      {/* Page header */}
      <SectionTitle sub="Customize your experience, manage dropdown values, and control your data">
        Settings
      </SectionTitle>

      {/* Top navigation */}
      <div style={{ marginBottom: 24, overflowX: "auto" }}>
        <PillNav tabs={TOP_TABS} active={tab} onChange={setTab} />
      </div>

      {/* Content */}
      {tab === "appearance" && (
        <AppearanceSection
          accentKey={accentKey} setAccentKey={setAccentKey}
        />
      )}

      {tab === "profile" && (
        <ProfileSection state={state} updateProfile={updateProfile} />
      )}

      {tab === "masterdata" && (
        <MasterDataSection masterData={masterData} updateMasterData={updateMasterData} />
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
