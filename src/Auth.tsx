// @ts-nocheck
import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import {
  Eye, EyeOff, ArrowRight, Shield, Lock, Loader2,
  CheckCircle2, IndianRupee, TrendingUp, AlertCircle,
  Target, BarChart3, Zap, CreditCard, Calendar, Wallet,
} from "lucide-react";

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function Auth({
  onLogin,
  onOffline,
}: {
  onLogin: (session: any) => void;
  onOffline?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const isForgot = mode === "forgot";
  const isSignUp = mode === "signup";

  const emailErr =
    emailTouched && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "Please enter a valid email address"
      : "";
  const passErr =
    passTouched && password && password.length < 8
      ? "Minimum 8 characters required"
      : "";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    if (!isForgot) setPassTouched(true);

    const hasEmailErr = !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const hasPassErr = !isForgot && (!password || password.length < 8);
    if (hasEmailErr || hasPassErr) return;

    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMsg("Recovery link sent! Please check your inbox.");
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created! Please verify your email to continue.");
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) onLogin(data.session);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "signup" | "forgot") => {
    setError(null);
    setMsg(null);
    setEmailTouched(false);
    setPassTouched(false);
    setMode(m);
  };

  const FEATURES = [
    {
      icon: <IndianRupee size={15} />,
      color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.2)",
      title: "Bank & Transactions",
      desc: "All accounts, daily spends & budget tracking in one place",
    },
    {
      icon: <TrendingUp size={15} />,
      color: "#818CF8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.2)",
      title: "Stocks & Mutual Funds",
      desc: "Demat holdings, SIP tracker & full investment portfolio",
    },
    {
      icon: <BarChart3 size={15} />,
      color: "#38BDF8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.2)",
      title: "FDs, Bonds & PPF / NPS",
      desc: "Fixed income, recurring deposits & long-term savings",
    },
    {
      icon: <CreditCard size={15} />,
      color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.2)",
      title: "Credit & Prepaid Cards",
      desc: "Card bills, limits, outstanding & prepaid wallet balances",
    },
    {
      icon: <Wallet size={15} />,
      color: "#F87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.2)",
      title: "Loans & Borrowings",
      desc: "Home, car & personal loans — track EMIs & repayments",
    },
    {
      icon: <Calendar size={15} />,
      color: "#A78BFA", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.2)",
      title: "Goals & Subscriptions",
      desc: "Financial goals, budgets, reminders & renewal alerts",
    },
  ];

  return (
    <div className="af-root">

      {/* ════════════════════════════════════
          LEFT PANEL — Brand & Product Story
      ════════════════════════════════════ */}
      <div className="af-left">
        <div className="af-glow-1" aria-hidden="true" />
        <div className="af-glow-2" aria-hidden="true" />

        {/* Logo */}
        <div className="af-logo">
          <div className="af-logo-mark">
            <IndianRupee size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="af-logo-name">Personal Finance</div>
            <div className="af-logo-tagline">by Anand Mohta</div>
          </div>
        </div>

        {/* Hero */}
        <div className="af-hero">
          <div className="af-badge">
            <IndianRupee size={11} aria-hidden="true" />
            <span>Every money matters.</span>
          </div>
          <h1 className="af-h1">
            Your Complete<br />Finance Centre.
          </h1>
          <p className="af-h1-sub">
            One platform to track every rupee — banks, investments, cards, loans, goals and more. Built for clarity and peace of mind.
          </p>
        </div>

        {/* Portfolio Chart Card */}
        <div className="af-chart-card">
          <div className="af-chart-top">
            <div>
              <div className="af-chart-kicker">Total Portfolio</div>
              <div className="af-chart-num">₹48,20,000</div>
              <div className="af-chart-delta">
                <TrendingUp size={11} aria-hidden="true" />
                +12.4% this year
              </div>
            </div>
            <div className="af-chart-icon-box" aria-hidden="true">
              <BarChart3 size={16} color="rgba(255,255,255,0.4)" />
            </div>
          </div>
          <svg viewBox="0 0 560 88" fill="none" xmlns="http://www.w3.org/2000/svg" className="af-chart-svg" aria-hidden="true">
            <defs>
              <linearGradient id="af-fill-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="af-line-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <path d="M0,86 C55,80 105,66 175,53 S280,30 350,22 S455,9 560,4 L560,88 L0,88 Z" fill="url(#af-fill-grad)" className="af-fill-anim" />
            <path d="M0,86 C55,80 105,66 175,53 S280,30 350,22 S455,9 560,4" stroke="url(#af-line-grad)" strokeWidth="2" strokeLinecap="round" fill="none" className="af-line-anim" />
            <circle cx="560" cy="4" r="3.5" fill="#10B981" className="af-dot-core" />
            <circle cx="560" cy="4" r="3.5" fill="#10B981" opacity="0.35" className="af-dot-ring" />
            {["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map((m, i) => (
              <text key={m} x={i * 112} y="87" fill="rgba(255,255,255,0.18)" fontSize="8" fontFamily="Inter,sans-serif">{m}</text>
            ))}
          </svg>
        </div>

        {/* What's inside — feature grid */}
        <div className="af-section-label">Everything you need</div>
        <div className="af-features">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="af-feature-item" style={{ animationDelay: `${0.08 + i * 0.06}s` }}>
              <div className="af-feature-icon" style={{ background: f.bg, border: `1px solid ${f.border}`, color: f.color }}>
                {f.icon}
              </div>
              <div className="af-feature-text">
                <div className="af-feature-title">{f.title}</div>
                <div className="af-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="af-trust-row">
          <span className="af-trust-item">
            <Lock size={11} aria-hidden="true" />Bank-grade Encryption
          </span>
          <span className="af-trust-sep" aria-hidden="true" />
          <span className="af-trust-item">
            <Shield size={11} aria-hidden="true" />Data Encrypted
          </span>
          <span className="af-trust-sep" aria-hidden="true" />
          <span className="af-trust-item">
            <Zap size={11} aria-hidden="true" />Secure Cloud Sync
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════
          RIGHT PANEL — Auth Card
      ════════════════════════════════════ */}
      <div className="af-right">
        <div className="af-card">

          {/* Mobile-only logo */}
          <div className="af-mobile-logo" aria-hidden="true">
            <div className="af-logo-mark af-logo-mark-sm">
              <IndianRupee size={15} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div className="af-mobile-brand">Personal Finance</div>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 500, marginTop: 1 }}>by Anand Mohta</div>
            </div>
          </div>

          {/* Header */}
          <div className="af-card-head">
            <h2 className="af-card-title">
              {isForgot ? "Reset your password" : isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="af-card-sub">
              {isForgot
                ? "Enter your email and we'll send a secure recovery link"
                : isSignUp
                ? "Create your account and take control of your finances"
                : "Sign in to your personal finance dashboard"}
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="af-alert af-alert-err" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Success alert */}
          {msg && (
            <div className="af-alert af-alert-ok" role="status">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>{msg}</span>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleAuth} className="af-form" noValidate>

            {/* Email field */}
            <div className="af-field">
              <label className="af-lbl" htmlFor="af-email">Email address</label>
              <div className={["af-inp-wrap", emailFocused ? "af-focused" : "", emailErr ? "af-inp-err" : ""].filter(Boolean).join(" ")}>
                <input
                  id="af-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => { setEmailFocused(false); setEmailTouched(true); }}
                  className="af-inp"
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-describedby={emailErr ? "af-email-err" : undefined}
                  aria-invalid={!!emailErr}
                />
              </div>
              {emailErr && (
                <div id="af-email-err" className="af-err-msg" role="alert">
                  <AlertCircle size={11} aria-hidden="true" />{emailErr}
                </div>
              )}
            </div>

            {/* Password field */}
            {!isForgot && (
              <div className="af-field">
                <label className="af-lbl" htmlFor="af-pass">Password</label>
                <div className={["af-inp-wrap", passFocused ? "af-focused" : "", passErr ? "af-inp-err" : ""].filter(Boolean).join(" ")}>
                  <input
                    id="af-pass"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => { setPassFocused(false); setPassTouched(true); }}
                    className="af-inp"
                    placeholder={isSignUp ? "Create a strong password (8+ chars)" : "Enter your password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    aria-describedby={passErr ? "af-pass-err" : undefined}
                    aria-invalid={!!passErr}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="af-eye-btn"
                    aria-label={showPass ? "Hide password" : "Show password"} tabIndex={-1}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passErr && (
                  <div id="af-pass-err" className="af-err-msg" role="alert">
                    <AlertCircle size={11} aria-hidden="true" />{passErr}
                  </div>
                )}
              </div>
            )}

            {/* Remember me + Forgot password */}
            {!isForgot && !isSignUp && (
              <div className="af-meta-row">
                <label className="af-remember">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="af-chk" />
                  <span>Remember me</span>
                </label>
                <button type="button" onClick={() => switchMode("forgot")} className="af-link">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Primary CTA */}
            <button type="submit" disabled={loading} className="af-cta-btn">
              {loading ? (
                <Loader2 size={18} className="af-spin" aria-hidden="true" />
              ) : (
                <>
                  <span>{isForgot ? "Send Recovery Link" : isSignUp ? "Create Account" : "Sign In"}</span>
                  <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Mode switcher */}
          <div className="af-switch">
            {isForgot ? (
              <button onClick={() => switchMode("login")} className="af-link">← Back to sign in</button>
            ) : (
              <span className="af-switch-txt">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <button onClick={() => switchMode(isSignUp ? "login" : "signup")} className="af-link af-link-bold">
                  {isSignUp ? "Sign in" : "Create one"}
                </button>
              </span>
            )}
          </div>

          {/* Security indicators */}
          <div className="af-sec-bar" aria-label="Security features">
            <span className="af-sec-item"><Lock size={9} aria-hidden="true" />SSL Secured</span>
            <span className="af-sec-dot" aria-hidden="true" />
            <span className="af-sec-item"><Shield size={9} aria-hidden="true" />Data Encrypted</span>
            <span className="af-sec-dot" aria-hidden="true" />
            <span className="af-sec-item"><CheckCircle2 size={9} aria-hidden="true" />2FA Ready</span>
          </div>

          {/* Demo / offline mode */}
          {onOffline && (
            <div className="af-demo-wrap">
              <button onClick={onOffline} className="af-demo-btn">Explore Demo Mode →</button>
            </div>
          )}
        </div>
      </div>

      <style>{AF_STYLES}</style>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */
const AF_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800;900&display=swap');

/* ── Root ─────────────────────────────── */
.af-root {
  min-height: 100vh;
  display: flex;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #07090F;
  overflow-x: hidden;
}

/* ══════════════════════════════════════
   LEFT PANEL
══════════════════════════════════════ */
.af-left {
  width: 52%;
  min-height: 100vh;
  background: linear-gradient(160deg, #080C1B 0%, #0C1226 55%, #060910 100%);
  display: flex;
  flex-direction: column;
  padding: 44px 52px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

/* Dot-grid overlay */
.af-left::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(79,70,229,0.18) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
  z-index: 0;
}

/* Ambient glows */
.af-glow-1 {
  position: absolute; top: -15%; right: -20%;
  width: 75%; height: 75%;
  background: radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 65%);
  filter: blur(110px); z-index: 0; pointer-events: none;
}
.af-glow-2 {
  position: absolute; bottom: 0%; left: -20%;
  width: 55%; height: 55%;
  background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%);
  filter: blur(90px); z-index: 0; pointer-events: none;
}

/* Logo */
.af-logo {
  display: flex; align-items: center; gap: 14px;
  position: relative; z-index: 1;
}
.af-logo-mark {
  width: 46px; height: 46px; border-radius: 14px;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 28px rgba(79,70,229,0.5); flex-shrink: 0;
}
.af-logo-name {
  font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 900;
  color: #FFFFFF; letter-spacing: -0.03em; line-height: 1;
}
.af-logo-tagline {
  font-size: 10px; font-weight: 500;
  color: rgba(255,255,255,0.4); letter-spacing: 0.06em; margin-top: 4px;
}

/* Hero */
.af-hero { margin-top: 36px; position: relative; z-index: 1; }
.af-badge {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(79,70,229,0.12); border: 1px solid rgba(79,70,229,0.28);
  border-radius: 100px; padding: 6px 14px;
  font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.58);
  letter-spacing: 0.04em; margin-bottom: 18px;
}
.af-h1 {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(32px, 2.8vw, 46px); font-weight: 900;
  color: #FFFFFF; line-height: 1.06; letter-spacing: -0.045em; margin-bottom: 16px;
}
.af-h1-sub {
  font-size: 14px; font-weight: 400;
  color: rgba(255,255,255,0.38); line-height: 1.65; max-width: 380px;
}

/* Chart card */
.af-chart-card {
  margin-top: 28px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; padding: 18px 22px 12px;
  position: relative; z-index: 1;
  animation: af-rise 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s both;
}
.af-chart-top {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
}
.af-chart-kicker {
  font-size: 10px; font-weight: 700;
  color: rgba(255,255,255,0.28); text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 5px;
}
.af-chart-num {
  font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800;
  color: #FFFFFF; letter-spacing: -0.045em; line-height: 1;
}
.af-chart-delta {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: #10B981; margin-top: 6px;
  background: rgba(16,185,129,0.1); padding: 3px 10px; border-radius: 100px;
}
.af-chart-icon-box {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.af-chart-svg { width: 100%; height: 64px; overflow: visible; display: block; }

/* Chart animations */
.af-line-anim { stroke-dasharray: 1100; stroke-dashoffset: 1100; animation: af-draw 2.4s cubic-bezier(0.22,1,0.36,1) 0.5s forwards; }
.af-fill-anim { opacity: 0; animation: af-fade 1.2s ease 1.5s forwards; }
.af-dot-core  { opacity: 0; animation: af-fade 0.4s ease 2.5s forwards; }
.af-dot-ring  { transform-box: fill-box; transform-origin: center; animation: af-ring-pulse 2.2s ease-out 2.8s infinite; }

/* Section label */
.af-section-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: rgba(255,255,255,0.22);
  margin-top: 22px; margin-bottom: 10px; position: relative; z-index: 1;
}

/* Feature grid */
.af-features {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  position: relative; z-index: 1;
}
.af-feature-item {
  display: flex; align-items: flex-start; gap: 10px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 11px 12px;
  animation: af-rise 0.7s cubic-bezier(0.22,1,0.36,1) both;
  transition: background 0.2s;
}
.af-feature-item:hover { background: rgba(255,255,255,0.055); }
.af-feature-icon {
  width: 32px; height: 32px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
}
.af-feature-text { min-width: 0; }
.af-feature-title {
  font-size: 11.5px; font-weight: 700; color: rgba(255,255,255,0.82);
  line-height: 1.2; letter-spacing: -0.01em;
}
.af-feature-desc {
  font-size: 10px; color: rgba(255,255,255,0.28); margin-top: 3px; line-height: 1.35;
}

/* Trust row */
.af-trust-row {
  display: flex; align-items: center; gap: 14px;
  margin-top: auto; padding-top: 24px;
  position: relative; z-index: 1; flex-wrap: wrap;
}
.af-trust-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 500; color: rgba(255,255,255,0.2); white-space: nowrap;
}
.af-trust-sep { width: 1px; height: 11px; background: rgba(255,255,255,0.1); flex-shrink: 0; }

/* ══════════════════════════════════════
   RIGHT PANEL
══════════════════════════════════════ */
.af-right {
  width: 48%; min-height: 100vh; background: #F7F9FC;
  display: flex; align-items: center; justify-content: center;
  padding: 48px 44px;
}
.af-card { width: 100%; max-width: 420px; }

/* Mobile-only logo */
.af-mobile-logo { display: none; align-items: center; gap: 10px; margin-bottom: 36px; }
.af-logo-mark-sm {
  width: 36px !important; height: 36px !important;
  border-radius: 10px !important; box-shadow: 0 4px 14px rgba(79,70,229,0.4) !important;
}
.af-mobile-brand {
  font-family: 'Outfit', sans-serif; font-size: 19px; font-weight: 900;
  color: #0F172A; letter-spacing: -0.04em;
}

/* Card header */
.af-card-head { margin-bottom: 28px; }
.af-card-title {
  font-family: 'Outfit', sans-serif; font-size: 27px; font-weight: 900;
  color: #0F172A; letter-spacing: -0.04em; line-height: 1.12; margin-bottom: 8px;
}
.af-card-sub { font-size: 14px; color: #64748B; line-height: 1.55; font-weight: 400; }

/* Alerts */
.af-alert {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 13px 16px; border-radius: 12px;
  font-size: 13px; font-weight: 500; line-height: 1.45; margin-bottom: 20px;
}
.af-alert-err { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; animation: af-shake 0.45s ease-out; }
.af-alert-ok  { background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; }

/* Form */
.af-form { display: flex; flex-direction: column; gap: 18px; }
.af-field { display: flex; flex-direction: column; gap: 6px; }
.af-lbl { font-size: 13px; font-weight: 600; color: #374151; letter-spacing: -0.01em; }

/* Input wrapper */
.af-inp-wrap {
  position: relative; display: flex; align-items: center;
  background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 11px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05);
}
.af-inp-wrap:hover:not(.af-focused):not(.af-inp-err) { border-color: #CBD5E1; }
.af-inp-wrap.af-focused {
  border-color: #4F46E5;
  box-shadow: 0 0 0 3px rgba(79,70,229,0.12), 0 1px 3px rgba(15,23,42,0.05);
}
.af-inp-wrap.af-inp-err { border-color: #F87171; box-shadow: 0 0 0 3px rgba(248,113,113,0.1); }
.af-inp {
  flex: 1; background: none; border: none; outline: none;
  padding: 13px 16px; font-size: 15px;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #0F172A; font-weight: 400; min-width: 0;
}
.af-inp::placeholder { color: #94A3B8; }
.af-eye-btn {
  background: none; border: none; padding: 0 14px; color: #94A3B8;
  cursor: pointer; display: flex; align-items: center; flex-shrink: 0; transition: color 0.15s;
}
.af-eye-btn:hover { color: #4F46E5; }
.af-err-msg { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #EF4444; font-weight: 500; }

/* Remember + Forgot row */
.af-meta-row { display: flex; align-items: center; justify-content: space-between; margin-top: -4px; }
.af-remember {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #4B5563; cursor: pointer; font-weight: 500; user-select: none;
}
.af-chk { width: 15px; height: 15px; accent-color: #4F46E5; cursor: pointer; border-radius: 4px; }

/* Link button */
.af-link {
  background: none; border: none; font-size: 13px; font-weight: 600; color: #4F46E5;
  cursor: pointer; padding: 0; font-family: inherit; transition: color 0.15s; text-decoration: none;
}
.af-link:hover { color: #3730A3; text-decoration: underline; }
.af-link-bold { font-weight: 700; }

/* CTA Button */
.af-cta-btn {
  width: 100%; padding: 14px 20px;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  color: #FFFFFF; border: none; border-radius: 11px;
  font-size: 15px; font-weight: 700; font-family: 'Inter', sans-serif;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  box-shadow: 0 4px 18px rgba(79,70,229,0.4); margin-top: 4px; letter-spacing: -0.01em;
}
.af-cta-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(79,70,229,0.5); filter: brightness(1.08); }
.af-cta-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 10px rgba(79,70,229,0.3); }
.af-cta-btn:disabled { opacity: 0.65; cursor: not-allowed; }

/* Mode switcher */
.af-switch { text-align: center; margin-top: 24px; }
.af-switch-txt { font-size: 13.5px; color: #6B7280; }

/* Security bar */
.af-sec-bar {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  margin-top: 24px; padding-top: 20px; border-top: 1px solid #F1F5F9; flex-wrap: wrap;
}
.af-sec-item { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 500; color: #9CA3AF; }
.af-sec-dot { width: 3px; height: 3px; border-radius: 50%; background: #D1D5DB; flex-shrink: 0; }

/* Demo button */
.af-demo-wrap { text-align: center; margin-top: 12px; }
.af-demo-btn {
  background: none; border: none; font-size: 12px; font-weight: 500;
  color: #94A3B8; cursor: pointer; font-family: inherit; transition: color 0.15s;
}
.af-demo-btn:hover { color: #4F46E5; }

/* ══════════════════════════════════════
   KEYFRAME ANIMATIONS
══════════════════════════════════════ */
@keyframes af-draw   { to { stroke-dashoffset: 0; } }
@keyframes af-fade   { to { opacity: 1; } }
@keyframes af-ring-pulse {
  0%   { opacity: 0.45; transform: scale(1); }
  100% { opacity: 0;    transform: scale(4); }
}
@keyframes af-rise {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes af-shake {
  0%,100% { transform: translateX(0); }
  15%     { transform: translateX(-7px); }
  30%     { transform: translateX(7px); }
  45%     { transform: translateX(-5px); }
  60%     { transform: translateX(5px); }
  75%     { transform: translateX(-2px); }
}
.af-spin { animation: af-spin-anim 0.75s linear infinite; }
@keyframes af-spin-anim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ══════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════ */
@media (max-width: 800px) {
  .af-left  { display: none; }
  .af-right { width: 100%; padding: 40px 24px; align-items: flex-start; padding-top: 60px; }
  .af-card  { max-width: 100%; }
  .af-mobile-logo { display: flex; }
}

@media (min-width: 801px) and (max-width: 1100px) {
  .af-left  { width: 50%; padding: 36px 40px; }
  .af-right { width: 50%; padding: 44px 32px; }
  .af-h1    { font-size: 34px; }
  .af-feature-desc { display: none; }
  .af-features { gap: 6px; }
}
`;
