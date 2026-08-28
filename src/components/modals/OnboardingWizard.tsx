// @ts-nocheck
import React, { useState } from "react";
import {
  User,
  Landmark,
  TrendingUp,
  Target,
  Bot,
  ChevronRight,
  ChevronLeft,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { BrandMark } from "../ui/BrandMark";
import { uid, today } from "../../utils/finance";
import { getCurrentFY } from "../../utils/appConstants";

/* Build [currentFY, prev, prev-1] so the dropdown stays correct */
const FY_OPTIONS = (() => {
  const [startYear] = getCurrentFY().split("-").map((s) => parseInt(s, 10));
  return Array.from({ length: 3 }, (_, i) => {
    const start = startYear - i;
    const endShort = String(start + 1).slice(-2);
    return `${start}-${endShort}`;
  });
})();

const STEPS = [
  { id: 0, icon: User, label: "Profile", desc: "Set up your wealth identity & tax regime" },
  { id: 1, icon: Landmark, label: "Primary Bank", desc: "Link your primary savings or checking account" },
  { id: 2, icon: TrendingUp, label: "First Asset", desc: "Add an initial investment (FD, Mutual Fund, or Stock)" },
  { id: 3, icon: Target, label: "Financial Goal", desc: "Set a wealth milestone or emergency fund target" },
  { id: 4, icon: Bot, label: "AI Advisor", desc: "Enable intelligent portfolio analysis with Gemini AI" },
];

interface OnboardingWizardProps {
  updateProfile: (updates: any) => void;
  addItem: (key: string, item: any) => void;
  updateSettings: (updates: any) => void;
  updateMasterData: (key: string, value: any) => void;
  onComplete: () => void;
  showToast?: (message: string, type?: string) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  updateProfile,
  addItem,
  updateSettings,
  updateMasterData,
  onComplete,
  showToast,
}) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ name: "", fy: getCurrentFY(), regime: "new" });
  const [bank, setBank] = useState({ bankName: "", accountNumber: "", balance: "" });
  const [investment, setInvestment] = useState({ type: "fd", name: "", amount: "", rate: "" });
  const [goal, setGoal] = useState({ name: "", targetAmount: "", targetDate: "" });
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: `1.5px solid ${THEME.line}`,
    fontSize: 14,
    background: "var(--surface-0)",
    color: THEME.ink,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      if (step === 0 && profile.name) {
        updateProfile({ name: profile.name, fy: profile.fy, regime: profile.regime });
      } else if (step === 1 && bank.bankName) {
        await addItem("bankAccounts", {
          id: uid(),
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          balance: Number(bank.balance) || 0,
          type: "Savings",
          owner: "self",
        });
      } else if (step === 2 && investment.name) {
        if (investment.type === "fd") {
          await addItem("fixedDeposits", {
            id: uid(),
            bank: investment.name,
            principal: Number(investment.amount) || 0,
            rate: Number(investment.rate) || 7,
            years: 1,
            startDate: today(),
            owner: "self",
          });
        } else if (investment.type === "mf") {
          await addItem("mutualFunds", {
            id: uid(),
            name: investment.name,
            category: "Equity",
            invested: Number(investment.amount) || 0,
            units: "",
            buyNav: "",
            currentNav: "",
            owner: "self",
          });
        } else if (investment.type === "stock") {
          await addItem("stocks", {
            id: uid(),
            symbol: investment.name,
            exchange: "NSE",
            dematId: "",
            qty: 1,
            avgPrice: Number(investment.amount) || 0,
            currentPrice: Number(investment.amount) || 0,
            buyDate: today(),
            owner: "self",
          });
        }
      } else if (step === 3 && goal.name) {
        await addItem("goals", {
          id: uid(),
          name: goal.name,
          category: "Wealth",
          targetAmount: Number(goal.targetAmount) || 0,
          currentAmount: 0,
          priority: "Medium",
          startDate: today(),
          targetDate: goal.targetDate,
          owner: "self",
        });
      } else if (step === 4 && apiKey) {
        updateSettings({ geminiApiKey: apiKey });
      }
      if (step < 4) {
        setStep(step + 1);
      } else {
        updateMasterData("_onboardingComplete", true);
        onComplete();
      }
    } catch (e: any) {
      showToast?.(`Failed to save: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        padding: "32px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 580, width: "100%" }}>
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <BrandMark size={52} />
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 9999,
              background: "rgba(197, 161, 82, 0.12)",
              border: "1px solid rgba(197, 161, 82, 0.28)",
              fontSize: 11.5,
              fontWeight: 700,
              color: "#C5A152",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <Sparkles size={12} /> Guided Wealth Setup
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: THEME.ink,
              marginBottom: 6,
            }}
          >
            Welcome to ArthaDrishti
          </h2>
          <p style={{ color: THEME.muted, fontSize: 14, margin: 0 }}>
            Configure your private wealth dashboard in 5 simple steps.
          </p>
          <button
            onClick={() => {
              updateMasterData("_onboardingComplete", true);
              onComplete();
            }}
            style={{
              background: "none",
              border: "none",
              color: THEME.muted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 10,
              textDecoration: "underline",
              textUnderlineOffset: 3,
              fontFamily: "inherit",
              transition: "color 0.15s ease",
            }}
          >
            Skip setup and explore dashboard
          </button>
        </div>

        {/* Step progress pills */}
        <div
          role="tablist"
          aria-label="Setup Steps"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 6,
            marginBottom: 24,
          }}
        >
          {STEPS.map((s, idx) => {
            const isDone = idx < step;
            const isCurrent = idx === step;
            return (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 5,
                    borderRadius: 9999,
                    background: isDone
                      ? THEME.sage
                      : isCurrent
                        ? THEME.accent
                        : "var(--surface-2)",
                    transition: "all 0.3s ease",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? THEME.ink : isDone ? THEME.sage : THEME.muted,
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Card Body */}
        <Card style={{ padding: "30px 28px", borderTop: `4px solid ${THEME.accent}`, boxShadow: "var(--shadow-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: THEME.accent,
                flexShrink: 0,
              }}
            >
              {React.createElement(STEPS[step].icon, { size: 22 })}
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: THEME.accent,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Step {step + 1} of {STEPS.length}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", color: THEME.ink }}>
                {STEPS[step].label}
              </div>
              <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 2 }}>
                {STEPS[step].desc}
              </div>
            </div>
          </div>

          {step === 0 && (
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 16 }}>
              <Field label="Your Full Name">
                <input
                  style={inputStyle}
                  placeholder="e.g. Anand Mohta"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  autoFocus
                />
              </Field>
              <div className="form-grid-2" style={{ gap: 14 }}>
                <Field label="Active Financial Year">
                  <select
                    style={inputStyle}
                    value={profile.fy}
                    onChange={(e) => setProfile({ ...profile, fy: e.target.value })}
                  >
                    {FY_OPTIONS.map((fy) => (
                      <option key={fy}>{fy}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tax Regime Preference">
                  <select
                    style={inputStyle}
                    value={profile.regime}
                    onChange={(e) => setProfile({ ...profile, regime: e.target.value })}
                  >
                    <option value="new">New Tax Regime (Default)</option>
                    <option value="old">Old Tax Regime</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 16 }}>
              <Field label="Bank Institution Name">
                <input
                  style={inputStyle}
                  placeholder="e.g. HDFC Bank, ICICI, SBI"
                  value={bank.bankName}
                  onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                  autoFocus
                />
              </Field>
              <div className="form-grid-2" style={{ gap: 14 }}>
                <Field label="Account Number (Optional)">
                  <input
                    style={inputStyle}
                    placeholder="Last 4 digits (e.g. 4092)"
                    value={bank.accountNumber}
                    onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
                  />
                </Field>
                <Field label="Starting Balance (₹)">
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 75000"
                    value={bank.balance}
                    onChange={(e) => setBank({ ...bank, balance: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 16 }}>
              <Field label="Asset Category">
                <select
                  style={inputStyle}
                  value={investment.type}
                  onChange={(e) => setInvestment({ ...investment, type: e.target.value })}
                >
                  <option value="fd">Fixed Deposit (FD)</option>
                  <option value="mf">Mutual Fund Scheme</option>
                  <option value="stock">Direct Stock / Equity</option>
                </select>
              </Field>
              <Field
                label={
                  investment.type === "fd"
                    ? "Bank / Issuer Name"
                    : investment.type === "mf"
                      ? "Scheme Name"
                      : "Stock Symbol"
                }
              >
                <input
                  style={inputStyle}
                  placeholder={
                    investment.type === "fd"
                      ? "e.g. HDFC Bank FD"
                      : investment.type === "mf"
                        ? "e.g. Parag Parikh Flexi Cap Fund"
                        : "e.g. RELIANCE.NS"
                  }
                  value={investment.name}
                  onChange={(e) => setInvestment({ ...investment, name: e.target.value })}
                  autoFocus
                />
              </Field>
              <div className="form-grid-2" style={{ gap: 14 }}>
                <Field label="Invested Principal Amount (₹)">
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 100000"
                    value={investment.amount}
                    onChange={(e) => setInvestment({ ...investment, amount: e.target.value })}
                  />
                </Field>
                {investment.type === "fd" && (
                  <Field label="Interest Rate (% p.a.)">
                    <input
                      style={inputStyle}
                      type="number"
                      placeholder="e.g. 7.5"
                      value={investment.rate}
                      onChange={(e) => setInvestment({ ...investment, rate: e.target.value })}
                    />
                  </Field>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 16 }}>
              <Field label="Milestone / Goal Name">
                <input
                  style={inputStyle}
                  placeholder="e.g. Emergency Reserve, Home Down Payment"
                  value={goal.name}
                  onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                  autoFocus
                />
              </Field>
              <div className="form-grid-2" style={{ gap: 14 }}>
                <Field label="Target Corpus Amount (₹)">
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 500000"
                    value={goal.targetAmount}
                    onChange={(e) => setGoal({ ...goal, targetAmount: e.target.value })}
                  />
                </Field>
                <Field label="Target Target Date">
                  <input
                    style={inputStyle}
                    type="date"
                    value={goal.targetDate}
                    onChange={(e) => setGoal({ ...goal, targetDate: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 4 && (
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "rgba(197, 161, 82, 0.08)",
                  border: "1px solid rgba(197, 161, 82, 0.25)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontSize: 13,
                  color: THEME.ink,
                  lineHeight: 1.5,
                }}
              >
                <ShieldCheck size={18} color="#C5A152" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Enable private, on-device AI financial insights powered by Google Gemini. Your personal identifiers stay strictly on your device.
                </span>
              </div>
              <Field label="Gemini API Key (Optional — configure anytime in Settings)">
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    type={showApiKey ? "text" : "password"}
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    title={showApiKey ? "Hide key" : "Show key"}
                    style={{
                      padding: "0 14px",
                      borderRadius: 10,
                      border: `1.5px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      cursor: "pointer",
                      color: THEME.muted,
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            </div>
          )}

          {/* Navigation CTAs */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 28,
              paddingTop: 20,
              borderTop: `1px solid ${THEME.line}`,
            }}
          >
            <Button
              variant="ghost"
              onClick={() => {
                if (step > 0) setStep(step - 1);
              }}
              disabled={step === 0 || saving}
              icon={<ChevronLeft size={15} />}
            >
              Back
            </Button>
            <div style={{ display: "flex", gap: 10 }}>
              {step < 4 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step + 1)}
                  disabled={saving}
                  style={{ color: THEME.muted }}
                >
                  Skip
                </Button>
              )}
              <Button
                variant="accent"
                onClick={handleNext}
                disabled={saving}
                loading={saving}
                icon={step === 4 ? <Check size={15} /> : <ArrowRight size={15} />}
              >
                {step === 4 ? "Complete Setup" : "Continue"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
