// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Database, User, Check, Download, RefreshCw, Sun, Moon, BookOpen, X as XIcon } from "lucide-react";
import { THEME, ACCENT_PALETTES } from "../../utils/constants";
import { DEFAULT_MASTER_DATA } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";

const DENSITY_OPTIONS = [
  { value: "compact",     label: "Compact",     desc: "Tight spacing, more on screen" },
  { value: "normal",      label: "Normal",      desc: "Balanced default" },
  { value: "comfortable", label: "Comfortable", desc: "Spacious, easier to read" },
];

const RADIUS_OPTIONS = [
  { value: "sharp",  label: "Sharp",  desc: "4px corners" },
  { value: "modern", label: "Modern", desc: "12px corners" },
  { value: "round",  label: "Rounded", desc: "24px corners" },
];

const FONT_OPTIONS = [
  { value: "inter",   label: "Inter",  desc: "Clean system default" },
  { value: "outfit",  label: "Outfit", desc: "Geometric, modern feel" },
  { value: "roboto",  label: "Roboto", desc: "Google Material style" },
];

const ANIM_OPTIONS = [
  { value: "snappy",  label: "Snappy",  desc: "0.15s fast transitions" },
  { value: "smooth",  label: "Smooth",  desc: "0.4s default" },
  { value: "relaxed", label: "Relaxed", desc: "0.8s slow & elegant" },
];

const CHART_OPTIONS = [
  { value: "monotone", label: "Smooth", desc: "Curved lines" },
  { value: "linear",   label: "Linear", desc: "Sharp angular lines" },
  { value: "step",     label: "Step",   desc: "Step chart style" },
];

const BG_OPTIONS = [
  { value: "plain", label: "Plain",  desc: "No background pattern" },
  { value: "dots",  label: "Dots",   desc: "Subtle dot grid" },
  { value: "mesh",  label: "Mesh",   desc: "Gradient accent mesh" },
];

const OptionGroup = ({ value, options, onChange }: any) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {options.map((opt: any) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.desc}
          style={{
            padding: "7px 14px",
            borderRadius: 10,
            border: `1.5px solid ${active ? THEME.accent : THEME.line}`,
            background: active ? `color-mix(in srgb, var(--t-accent) 10%, transparent)` : "transparent",
            color: active ? THEME.accent : THEME.muted,
            fontWeight: active ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.15s",
            fontFamily: "inherit",
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const chip = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "4px 12px", borderRadius: 20,
  background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
  color: THEME.ink, fontSize: 13, fontWeight: 500,
};

function EditableList({ label, listKey, items, onUpdate }: any) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (!v || items.includes(v)) return;
    onUpdate(listKey, [...items, v]);
    setVal("");
  };
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: THEME.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {items.map((item: string) => (
          <span key={item} style={chip}>
            {item}
            <button
              onClick={() => onUpdate(listKey, items.filter((x: string) => x !== item))}
              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}
              title={`Remove ${item}`}
            >
              <XIcon size={12} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${THEME.line}`, background: "var(--t-paper)", color: THEME.ink, fontSize: 13, outline: "none" }}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Type and press Enter to add…"
        />
        <Button variant="secondary" onClick={add} style={{ whiteSpace: "nowrap" }}>+ Add</Button>
      </div>
    </div>
  );
}

export function SettingsTab({
  state, setState, exportJSON, onRestoreBackup, resetAll, showToast, onSignOut,
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
  const md = masterData || DEFAULT_MASTER_DATA;
  const [prof, setProf] = useState({ ...state.profile });
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveProfile = () => {
    updateProfile(prof);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  const inputStyle = {
    width: "100%", padding: "10px 12px", background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`, borderRadius: 10, color: THEME.ink, fontSize: 14,
  };

  const sectionTitle = (icon: any, label: string) => (
    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
      {icon} {label}
    </div>
  );

  return (
    <div style={{ maxWidth: 1000 }} className="animate-fade-in-up">
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Settings & Preferences</h2>
        <p style={{ color: THEME.muted, fontSize: 14, marginTop: 4 }}>Customize your experience and manage data</p>
      </div>

      <div style={{ display: "grid", gap: 24 }}>

        {/* ── Appearance ── */}
        <Card style={{ padding: 24 }}>
          {sectionTitle(<Sparkles size={18} color={THEME.accent} />, "Appearance")}
          <div style={{ display: "grid", gap: 20 }}>

            <Field label="Theme">
              <button
                onClick={toggleDarkMode}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${THEME.line}`,
                  background: "transparent", color: THEME.ink, fontWeight: 600, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}
              >
                {darkMode ? <Sun size={15} color={THEME.gold} /> : <Moon size={15} color={THEME.accent} />}
                {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </button>
            </Field>

            <Field label="Accent Color">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(ACCENT_PALETTES).map(([k, p]: [string, any]) => (
                  <button
                    key={k}
                    onClick={() => setAccentKey(k as any)}
                    title={p.label}
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: p.light,
                      border: accentKey === k ? `2px solid ${THEME.ink}` : "2px solid transparent",
                      cursor: "pointer", padding: 0,
                      boxShadow: accentKey === k ? `0 0 0 2px var(--t-paper), 0 0 0 4px ${p.light}` : "none",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>
            </Field>

            <Field label="Density">
              <OptionGroup value={density} options={DENSITY_OPTIONS} onChange={setDensity} />
            </Field>

            <Field label="Corner Radius">
              <OptionGroup value={radiusKey} options={RADIUS_OPTIONS} onChange={setRadiusKey} />
            </Field>

            <Field label="Font">
              <OptionGroup value={fontKey} options={FONT_OPTIONS} onChange={setFontKey} />
            </Field>

            <Field label="Background Pattern">
              <OptionGroup value={bgStyle} options={BG_OPTIONS} onChange={setBgStyle} />
            </Field>

            <Field label="Animation Speed">
              <OptionGroup value={animSpeed} options={ANIM_OPTIONS} onChange={setAnimSpeed} />
            </Field>

            <Field label="Chart Style">
              <OptionGroup value={chartStyle} options={CHART_OPTIONS} onChange={setChartStyle} />
            </Field>

            <Field label="Navigation Layout">
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setSidebarNav(true)}
                  style={{
                    padding: "7px 14px", borderRadius: 10,
                    border: `1.5px solid ${sidebarNav ? THEME.accent : THEME.line}`,
                    background: sidebarNav ? `color-mix(in srgb, var(--t-accent) 10%, transparent)` : "transparent",
                    color: sidebarNav ? THEME.accent : THEME.muted,
                    fontWeight: sidebarNav ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Sidebar
                </button>
                <button
                  onClick={() => setSidebarNav(false)}
                  style={{
                    padding: "7px 14px", borderRadius: 10,
                    border: `1.5px solid ${!sidebarNav ? THEME.accent : THEME.line}`,
                    background: !sidebarNav ? `color-mix(in srgb, var(--t-accent) 10%, transparent)` : "transparent",
                    color: !sidebarNav ? THEME.accent : THEME.muted,
                    fontWeight: !sidebarNav ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Bottom Bar
                </button>
              </div>
            </Field>

          </div>
        </Card>

        {/* ── Personal Profile ── */}
        <Card style={{ padding: 24 }}>
          {sectionTitle(<User size={18} />, "Personal Profile")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            <Field label="Display Name">
              <input style={inputStyle} value={prof.name || ""} onChange={(e) => setProf({ ...prof, name: e.target.value })} />
            </Field>
            <Field label="Financial Year">
              <select style={inputStyle} value={prof.fy || "2025-26"} onChange={(e) => setProf({ ...prof, fy: e.target.value })}>
                <option value="2024-25">FY 2024-25</option>
                <option value="2025-26">FY 2025-26</option>
                <option value="2026-27">FY 2026-27</option>
              </select>
            </Field>
            <Field label="Tax Regime">
              <select style={inputStyle} value={prof.regime || "new"} onChange={(e) => setProf({ ...prof, regime: e.target.value })}>
                <option value="new">New Regime</option>
                <option value="old">Old Regime</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={saveProfile} icon={saved ? <Check size={16} /> : undefined}>
              {saved ? "Profile Saved" : "Save Profile"}
            </Button>
          </div>
        </Card>

        {/* ── Master Data ── */}
        <Card style={{ padding: 24 }}>
          {sectionTitle(<BookOpen size={18} color={THEME.accent} />, "Master Data — Manage Dropdown Values")}
          <p style={{ fontSize: 13, color: THEME.muted, marginTop: -12, marginBottom: 24 }}>
            Add or remove values that appear in dropdowns throughout the app. Changes apply immediately everywhere.
          </p>
          <div style={{ display: "grid", gap: 28 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${THEME.line}` }}>Transactions & Budgets</div>
              <EditableList label="Transaction / Budget Categories" listKey="transactionCategories" items={md.transactionCategories} onUpdate={updateMasterData} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${THEME.line}` }}>Cards</div>
              <div style={{ display: "grid", gap: 20 }}>
                <EditableList label="Credit Card Transaction Categories" listKey="ccTransactionCategories" items={md.ccTransactionCategories} onUpdate={updateMasterData} />
                <EditableList label="Prepaid Card Transaction Categories" listKey="prepaidCategories" items={md.prepaidCategories} onUpdate={updateMasterData} />
                <EditableList label="Credit Card Networks" listKey="ccNetworks" items={md.ccNetworks} onUpdate={updateMasterData} />
                <EditableList label="Prepaid Card Types" listKey="prepaidCardTypes" items={md.prepaidCardTypes} onUpdate={updateMasterData} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${THEME.line}` }}>Investments & Banking</div>
              <div style={{ display: "grid", gap: 20 }}>
                <EditableList label="Mutual Fund Categories" listKey="mfCategories" items={md.mfCategories} onUpdate={updateMasterData} />
                <EditableList label="Bank Account Types" listKey="bankAccountTypes" items={md.bankAccountTypes} onUpdate={updateMasterData} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${THEME.line}` }}>Loans & Goals</div>
              <div style={{ display: "grid", gap: 20 }}>
                <EditableList label="Loan Types" listKey="loanTypes" items={md.loanTypes} onUpdate={updateMasterData} />
                <EditableList label="Goal Categories" listKey="goalCategories" items={md.goalCategories} onUpdate={updateMasterData} />
              </div>
            </div>
          </div>
        </Card>

        {/* ── Data Management ── */}
        <Card style={{ padding: 24 }}>
          {sectionTitle(<Database size={18} color={THEME.sage} />, "Data Management")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Button variant="secondary" onClick={() => exportJSON()} icon={<Download size={16} />}>
              Export Backup (.json)
            </Button>
            <div style={{ position: "relative" }}>
              <Button variant="secondary" icon={<RefreshCw size={16} />} style={{ width: "100%" }}>
                Restore Backup
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={onRestoreBackup}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${THEME.line}` }}>
            <Button variant="ghost" onClick={resetAll} style={{ color: THEME.rust }}>
              Reset All Data
            </Button>
          </div>
        </Card>

      </div>

      <div style={{ marginTop: 40, textAlign: "center" }}>
        <Button variant="ghost" onClick={onSignOut} style={{ color: THEME.muted }}>
          Sign Out of Account
        </Button>
      </div>
    </div>
  );
}
