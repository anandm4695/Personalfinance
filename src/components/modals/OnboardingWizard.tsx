// @ts-nocheck
import React, { useState } from "react";
import {
  User,
  Landmark,
  TrendingUp,
  Target,
  Bot,
  ChevronRight,
  Check,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { uid, today } from "../../utils/finance";
import { getCurrentFY } from "../../utils/appConstants";

/* Build [currentFY, prev, prev-1] so the dropdown stays correct as time
   passes instead of a hardcoded, eventually-stale list of years. */
const FY_OPTIONS = (() => {
  const [startYear] = getCurrentFY().split("-").map((s) => parseInt(s, 10));
  return Array.from({ length: 3 }, (_, i) => {
    const start = startYear - i;
    const endShort = String(start + 1).slice(-2);
    return `${start}-${endShort}`;
  });
})();

const STEPS = [
  { id: 0, icon: User, label: "Profile", desc: "Set up your financial profile" },
  { id: 1, icon: Landmark, label: "Bank Account", desc: "Add your first bank account" },
  { id: 2, icon: TrendingUp, label: "Investment", desc: "Add an investment (FD, MF, or Stock)" },
  { id: 3, icon: Target, label: "Goal", desc: "Set your first financial goal" },
  { id: 4, icon: Bot, label: "AI Advisor", desc: "Enable AI-powered advice" },
];

interface OnboardingWizardProps {
  updateProfile: (updates: any) => void;
  addItem: (key: string, item: any) => void;
  updateSettings: (updates: any) => void;
  updateMasterData: (key: string, value: any) => void;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  updateProfile,
  addItem,
  updateSettings,
  updateMasterData,
  onComplete,
}) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ name: "", fy: getCurrentFY(), regime: "new" });
  const [bank, setBank] = useState({ bankName: "", accountNumber: "", balance: "" });
  const [investment, setInvestment] = useState({ type: "fd", name: "", amount: "", rate: "" });
  const [goal, setGoal] = useState({ name: "", targetAmount: "", targetDate: "" });
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1.5px solid ${THEME.line}`,
    fontSize: 14,
    background: "var(--surface-0)",
    color: THEME.ink,
  };

  const handleNext = () => {
    if (step === 0 && profile.name) {
      updateProfile({ name: profile.name, fy: profile.fy, regime: profile.regime });
    } else if (step === 1 && bank.bankName) {
      addItem("bankAccounts", {
        id: uid(),
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        balance: Number(bank.balance) || 0,
        type: "Savings",
        owner: "self",
      });
    } else if (step === 2 && investment.name) {
      if (investment.type === "fd") {
        addItem("fixedDeposits", {
          id: uid(),
          bank: investment.name,
          principal: Number(investment.amount) || 0,
          rate: Number(investment.rate) || 7,
          years: 1,
          startDate: today(),
          owner: "self",
        });
      } else if (investment.type === "mf") {
        addItem("mutualFunds", {
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
        addItem("stocks", {
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
      addItem("goals", {
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
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, var(--t-accent) 65%, white))`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Sparkles size={28} color="#fff" />
          </div>
          <h2
            style={{
              fontSize: "clamp(21px, 5vw, 28px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              marginBottom: 8,
            }}
          >
            Welcome to Personal Finance
          </h2>
          <p style={{ color: THEME.muted, fontSize: 14 }}>
            Let's set up your dashboard in 5 quick steps
          </p>
          <button
            onClick={() => {
              updateMasterData("_onboardingComplete", true);
              onComplete();
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = THEME.ink)}
            onMouseLeave={(e) => (e.currentTarget.style.color = THEME.muted)}
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
            Skip setup for now
          </button>
        </div>

        {/* Step indicator — decorative; the accessible name for progress lives
            on the wrapper since the dots differ only by size/color. */}
        <div
          role="img"
          aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].label}`}
          style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}
        >
          {STEPS.map((s) => (
            <div
              key={s.id}
              aria-hidden="true"
              style={{
                width: s.id === step ? 32 : 10,
                height: 10,
                borderRadius: 5,
                background:
                  s.id < step
                    ? THEME.sage
                    : s.id === step
                      ? THEME.accent
                      : `color-mix(in srgb, ${THEME.muted} 20%, transparent)`,
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        <Card style={{ padding: "clamp(20px, 5vw, 32px)", borderTop: `4px solid ${THEME.accent}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: THEME.accent,
              }}
            >
              {React.createElement(STEPS[step].icon, { size: 19 })}
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Step {step + 1} of {STEPS.length}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>
                {STEPS[step].label}
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginTop: 1 }}>
                {STEPS[step].desc}
              </div>
            </div>
          </div>

          {step === 0 && (
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 14 }}>
              <Field label="Your Name">
                <input
                  style={inputStyle}
                  placeholder="e.g. Anand"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </Field>
              <div className="form-grid-2" style={{ gap: 12 }}>
                <Field label="Financial Year">
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
                <Field label="Tax Regime">
                  <select
                    style={inputStyle}
                    value={profile.regime}
                    onChange={(e) => setProfile({ ...profile, regime: e.target.value })}
                  >
                    <option value="new">New Regime</option>
                    <option value="old">Old Regime</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 14 }}>
              <Field label="Bank Name">
                <input
                  style={inputStyle}
                  placeholder="e.g. HDFC Bank"
                  value={bank.bankName}
                  onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                />
              </Field>
              <div className="form-grid-2" style={{ gap: 12 }}>
                <Field label="Account Number (optional)">
                  <input
                    style={inputStyle}
                    placeholder="Last 4 digits"
                    value={bank.accountNumber}
                    onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
                  />
                </Field>
                <Field label="Current Balance">
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 50000"
                    value={bank.balance}
                    onChange={(e) => setBank({ ...bank, balance: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 14 }}>
              <Field label="Investment Type">
                <select
                  style={inputStyle}
                  value={investment.type}
                  onChange={(e) => setInvestment({ ...investment, type: e.target.value })}
                >
                  <option value="fd">Fixed Deposit</option>
                  <option value="mf">Mutual Fund</option>
                  <option value="stock">Stock</option>
                </select>
              </Field>
              <Field
                label={
                  investment.type === "fd"
                    ? "Bank"
                    : investment.type === "mf"
                      ? "Scheme Name"
                      : "Symbol"
                }
              >
                <input
                  style={inputStyle}
                  placeholder={
                    investment.type === "fd"
                      ? "e.g. SBI"
                      : investment.type === "mf"
                        ? "e.g. Nifty 50 Index"
                        : "e.g. RELIANCE.NS"
                  }
                  value={investment.name}
                  onChange={(e) => setInvestment({ ...investment, name: e.target.value })}
                />
              </Field>
              <div className="form-grid-2" style={{ gap: 12 }}>
                <Field label="Amount / Principal">
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 100000"
                    value={investment.amount}
                    onChange={(e) => setInvestment({ ...investment, amount: e.target.value })}
                  />
                </Field>
                {investment.type === "fd" && (
                  <Field label="Interest Rate %">
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
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 14 }}>
              <Field label="Goal Name">
                <input
                  style={inputStyle}
                  placeholder="e.g. Emergency Fund"
                  value={goal.name}
                  onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                />
              </Field>
              <div className="form-grid-2" style={{ gap: 12 }}>
                <Field label="Target Amount">
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 500000"
                    value={goal.targetAmount}
                    onChange={(e) => setGoal({ ...goal, targetAmount: e.target.value })}
                  />
                </Field>
                <Field label="Target Date">
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
            <div key={step} className="animate-fade-in-up" style={{ display: "grid", gap: 14 }}>
              <p style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.6 }}>
                Get personalised financial advice powered by Google Gemini AI. Your data stays on
                your device — only anonymised metrics are shared with the AI.
              </p>
              <Field label="Gemini API Key (optional — can add later in Settings)">
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    type={showApiKey ? "text" : "password"}
                    placeholder="AIza..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    title={showApiKey ? "Hide key" : "Show key"}
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = THEME.accent;
                      e.currentTarget.style.color = THEME.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = THEME.line;
                      e.currentTarget.style.color = THEME.muted;
                    }}
                    style={{
                      padding: "0 14px",
                      borderRadius: 10,
                      border: `1px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      cursor: "pointer",
                      color: THEME.muted,
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      transition: "color 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <div style={{ fontSize: 11, color: THEME.muted }}>
                Get a free API key from{" "}
                <a
                  href="https://ai.google.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: THEME.accent, fontWeight: 600, textDecoration: "underline" }}
                >
                  ai.google.dev
                </a>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <Button
              variant="ghost"
              onClick={() => {
                if (step > 0) setStep(step - 1);
              }}
              disabled={step === 0}
            >
              Back
            </Button>
            <div style={{ display: "flex", gap: 10 }}>
              {step < 4 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step + 1)}
                  style={{ color: THEME.muted }}
                >
                  Skip
                </Button>
              )}
              <Button
                variant="accent"
                onClick={handleNext}
                icon={step === 4 ? <Check size={14} /> : <ChevronRight size={14} />}
              >
                {step === 4 ? "Finish Setup" : "Next"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
