// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Database, User, Layout as LayoutIcon, CreditCard, Download, RefreshCw, Check } from "lucide-react";
import { THEME, ACCENT_PALETTES } from "../../utils/constants";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";

const DEFAULT_STATE = {}; // Placeholder or should be passed as prop if needed for reset

export function SettingsTab({
  state, setState, exportJSON, resetAll, showToast, onSignOut, onImportSuccess,
  accentKey, setAccentKey,
  density, setDensity,
  sidebarNav, setSidebarNav,
  radiusKey, setRadiusKey,
  fontKey, setFontKey,
  bgStyle, setBgStyle,
  animSpeed, setAnimSpeed,
  chartStyle, setChartStyle
}: any) {
  const [prof, setProf] = useState({ ...state.profile });
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveProfile = () => {
    setState((s: any) => ({ ...s, profile: { ...s.profile, ...prof } }));
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  const handleImport = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const input = e.target;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      try {
        const parsed = JSON.parse(ev.target.result as string);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.bankAccounts)) {
          showToast("Invalid backup — not a valid finance export", "error");
          input.value = "";
          return;
        }
        // In modular version, DEFAULT_STATE should probably be passed or imported from App
        setState((s: any) => ({ ...s, ...parsed })); 
        onImportSuccess?.();
        showToast("Backup restored successfully");
      } catch {
        showToast("Error parsing file", "error");
      }
      input.value = "";
    };
    reader.readAsText(file);
  };

  const inputStyle = { width: "100%", padding: "10px 12px", background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`, borderRadius: 10, color: THEME.ink, fontSize: 14 };

  return (
    <div style={{ maxWidth: 1000 }} className="animate-fade-in-up">
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Settings & Preferences</h2>
        <p style={{ color: THEME.muted, fontSize: 14, marginTop: 4 }}>Customize your experience and manage data</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 32 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={20} color={THEME.accent} /> Appearance
          </div>
          <div style={{ display: "grid", gap: 20 }}>
            <Field label="Accent Color">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(ACCENT_PALETTES).map(([k, p]: [string, any]) => (
                  <button
                    key={k}
                    onClick={() => setAccentKey(k as any)}
                    title={p.label}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: p.main || p.light, // Using light as fallback if main is missing
                      border: accentKey === k ? `2px solid ${THEME.ink}` : "2px solid transparent",
                      cursor: "pointer",
                      padding: 0,
                      boxShadow: accentKey === k ? `0 0 0 2px var(--t-paper), 0 0 0 4px ${p.main || p.light}` : "none",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>
            </Field>


          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <Database size={20} color={THEME.sage} /> Data Management
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <Button variant="secondary" onClick={() => exportJSON()} icon={<Download size={16} />} style={{ width: "100%" }}>
              Export Backup (.json)
            </Button>
            <div style={{ position: "relative" }}>
              <Button variant="secondary" icon={<RefreshCw size={16} />} style={{ width: "100%" }}>
                Restore Backup
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </div>
            <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1px solid ${THEME.line}` }}>
              <Button variant="ghost" onClick={resetAll} style={{ width: "100%", color: THEME.rust }}>
                Reset All Data
              </Button>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 24, gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <User size={20} /> Personal Profile
          </div>
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
      </div>

      <div style={{ marginTop: 40, textAlign: "center" }}>
        <Button variant="ghost" onClick={onSignOut} style={{ color: THEME.muted }}>
          Sign Out of Account
        </Button>
      </div>
    </div>
  );
}
