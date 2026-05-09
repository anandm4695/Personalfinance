// @ts-nocheck
import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import {
  Eye, EyeOff, ArrowRight, Shield, Lock, Loader2,
  CheckCircle2, IndianRupee, TrendingUp, AlertCircle,
  Target, BarChart3, Globe, Zap,
} from "lucide-react";

/* ─── Inline SVG brand icons ─────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C17.616 14.148 17.64 11.815 17.64 9.2z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.3-152.8-107C57.3 727.7 0 564.4 0 409.4c0-174.4 113.4-266.8 224.5-266.8 60.1 0 109.9 39.5 147.2 39.5 35.8 0 92-42.3 159.5-42.3 25.4 0 108.2 2.6 168.6 74.6zm-126.7-93.6c30.7-36.5 52.6-87.5 52.6-138.5 0-7.1-.6-14.3-1.9-20.1-49.9 1.9-109.3 33.3-145.1 75.2-28.2 32.7-50.1 83-50.1 134.1 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.3 1.3 13.3 1.3 44.8 0 101.6-30 128.3-71.2z"/>
  </svg>
);

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
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
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

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    setError(null);
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
    } catch (err: any) {
      setError(err.message);
      setOauthLoading(null);
    }
  };

  const switchMode = (m: "login" | "signup" | "forgot") => {
    setError(null);
    setMsg(null);
    setEmailTouched(false);
    setPassTouched(false);
    setMode(m);
  };

  return (
    <div className="af-root">

      {/* ════════════════════════════════════
          LEFT PANEL — Brand Story
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
            <div className="af-logo-name">FinVault</div>
            <div className="af-logo-tagline">Personal Finance OS</div>
          </div>
        </div>

        {/* Hero */}
        <div className="af-hero">
          <div className="af-badge">
            <TrendingUp size={11} aria-hidden="true" />
            <span>Intelligent Finance Platform</span>
          </div>
          <h1 className="af-h1">
            Take Control of<br />Every Rupee.
          </h1>
          <p className="af-h1-sub">
            Track expenses, investments, budgets, and wealth—all in one intelligent platform.
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

          <svg
            viewBox="0 0 560 88"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="af-chart-svg"
            aria-hidden="true"
          >
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
            {/* Area fill */}
            <path
              d="M0,86 C55,80 105,66 175,53 S280,30 350,22 S455,9 560,4 L560,88 L0,88 Z"
              fill="url(#af-fill-grad)"
              className="af-fill-anim"
            />
            {/* Growth line */}
            <path
              d="M0,86 C55,80 105,66 175,53 S280,30 350,22 S455,9 560,4"
              stroke="url(#af-line-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              className="af-line-anim"
            />
            {/* Live dot */}
            <circle cx="560" cy="4" r="3.5" fill="#10B981" className="af-dot-core" />
            <circle cx="560" cy="4" r="3.5" fill="#10B981" opacity="0.35" className="af-dot-ring" />
            {/* Month labels */}
            {["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map((m, i) => (
              <text
                key={m}
                x={i * 112}
                y="87"
                fill="rgba(255,255,255,0.18)"
                fontSize="8"
                fontFamily="Inter,sans-serif"
              >
                {m}
              </text>
            ))}
          </svg>
        </div>

        {/* Stat pills */}
        <div className="af-stat-row">
          <div className="af-stat-pill" style={{ animationDelay: "0.1s" }}>
            <Target size={13} color="#10B981" aria-hidden="true" />
            <span className="af-stat-lbl">Monthly Savings</span>
            <span className="af-stat-val">₹32K</span>
            <span className="af-stat-chg">+8.2%</span>
          </div>
          <div className="af-stat-pill" style={{ animationDelay: "0.2s" }}>
            <Globe size={13} color="#818CF8" aria-hidden="true" />
            <span className="af-stat-lbl">Goals on Track</span>
            <span className="af-stat-val">6 / 8</span>
            <span className="af-stat-chg af-stat-chg-indigo">75%</span>
          </div>
        </div>

        {/* Trust badges */}
        <div className="af-trust-row">
          <span className="af-trust-item">
            <Lock size={11} aria-hidden="true" />Bank-grade Encryption
          </span>
          <span className="af-trust-sep" aria-hidden="true" />
          <span className="af-trust-item">
            <Shield size={11} aria-hidden="true" />2FA Supported
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
            <span className="af-mobile-brand">FinVault</span>
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
                ? "Join thousands managing their wealth intelligently"
                : "Sign in to your financial command centre"}
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
              <div
                className={[
                  "af-inp-wrap",
                  emailFocused ? "af-focused" : "",
                  emailErr ? "af-inp-err" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  id="af-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => {
                    setEmailFocused(false);
                    setEmailTouched(true);
                  }}
                  className="af-inp"
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-describedby={emailErr ? "af-email-err" : undefined}
                  aria-invalid={!!emailErr}
                />
              </div>
              {emailErr && (
                <div id="af-email-err" className="af-err-msg" role="alert">
                  <AlertCircle size={11} aria-hidden="true" />
                  {emailErr}
                </div>
              )}
            </div>

            {/* Password field */}
            {!isForgot && (
              <div className="af-field">
                <label className="af-lbl" htmlFor="af-pass">Password</label>
                <div
                  className={[
                    "af-inp-wrap",
                    passFocused ? "af-focused" : "",
                    passErr ? "af-inp-err" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    id="af-pass"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => {
                      setPassFocused(false);
                      setPassTouched(true);
                    }}
                    className="af-inp"
                    placeholder={isSignUp ? "Create a strong password (8+ chars)" : "Enter your password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    aria-describedby={passErr ? "af-pass-err" : undefined}
                    aria-invalid={!!passErr}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="af-eye-btn"
                    aria-label={showPass ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passErr && (
                  <div id="af-pass-err" className="af-err-msg" role="alert">
                    <AlertCircle size={11} aria-hidden="true" />
                    {passErr}
                  </div>
                )}
              </div>
            )}

            {/* Remember me + Forgot password */}
            {!isForgot && !isSignUp && (
              <div className="af-meta-row">
                <label className="af-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="af-chk"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="af-link"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              className="af-cta-btn"
            >
              {loading ? (
                <Loader2 size={18} className="af-spin" aria-hidden="true" />
              ) : (
                <>
                  <span>
                    {isForgot
                      ? "Send Recovery Link"
                      : isSignUp
                      ? "Create Account"
                      : "Sign In"}
                  </span>
                  <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* OAuth section */}
          {!isForgot && (
            <>
              <div className="af-divider" role="separator">
                <div className="af-div-line" />
                <span className="af-div-txt">or continue with</span>
                <div className="af-div-line" />
              </div>

              <div className="af-oauth-wrap">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={!!oauthLoading}
                  className="af-oauth-btn"
                  aria-label="Continue with Google"
                >
                  {oauthLoading === "google" ? (
                    <Loader2 size={15} className="af-spin" aria-hidden="true" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth("apple")}
                  disabled={!!oauthLoading}
                  className="af-oauth-btn af-apple-btn"
                  aria-label="Continue with Apple"
                >
                  {oauthLoading === "apple" ? (
                    <Loader2 size={15} className="af-spin" aria-hidden="true" />
                  ) : (
                    <AppleIcon />
                  )}
                  <span>Apple</span>
                </button>
              </div>
            </>
          )}

          {/* Mode switcher */}
          <div className="af-switch">
            {isForgot ? (
              <button onClick={() => switchMode("login")} className="af-link">
                ← Back to sign in
              </button>
            ) : (
              <span className="af-switch-txt">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <button
                  onClick={() => switchMode(isSignUp ? "login" : "signup")}
                  className="af-link af-link-bold"
                >
                  {isSignUp ? "Sign in" : "Create one"}
                </button>
              </span>
            )}
          </div>

          {/* Security indicators */}
          <div className="af-sec-bar" aria-label="Security features">
            <span className="af-sec-item">
              <Lock size={9} aria-hidden="true" />SSL Secured
            </span>
            <span className="af-sec-dot" aria-hidden="true" />
            <span className="af-sec-item">
              <Shield size={9} aria-hidden="true" />Data Encrypted
            </span>
            <span className="af-sec-dot" aria-hidden="true" />
            <span className="af-sec-item">
              <CheckCircle2 size={9} aria-hidden="true" />2FA Ready
            </span>
          </div>

          {/* Demo / offline mode */}
          {onOffline && (
            <div className="af-demo-wrap">
              <button onClick={onOffline} className="af-demo-btn">
                Explore Demo Mode →
              </button>
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
  width: 55%;
  min-height: 100vh;
  background: linear-gradient(160deg, #080C1B 0%, #0C1226 55%, #060910 100%);
  display: flex;
  flex-direction: column;
  padding: 52px 60px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

/* Dot-grid overlay */
.af-left::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(79,70,229,0.18) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
  z-index: 0;
}

/* Ambient glows */
.af-glow-1 {
  position: absolute;
  top: -15%;
  right: -20%;
  width: 75%;
  height: 75%;
  background: radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 65%);
  filter: blur(110px);
  z-index: 0;
  pointer-events: none;
}
.af-glow-2 {
  position: absolute;
  bottom: 0%;
  left: -20%;
  width: 55%;
  height: 55%;
  background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%);
  filter: blur(90px);
  z-index: 0;
  pointer-events: none;
}

/* Logo */
.af-logo {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
}
.af-logo-mark {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 28px rgba(79,70,229,0.5);
  flex-shrink: 0;
}
.af-logo-name {
  font-family: 'Outfit', sans-serif;
  font-size: 21px;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: -0.04em;
  line-height: 1;
}
.af-logo-tagline {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255,255,255,0.28);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-top: 4px;
}

/* Hero */
.af-hero {
  margin-top: 64px;
  position: relative;
  z-index: 1;
}
.af-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(79,70,229,0.12);
  border: 1px solid rgba(79,70,229,0.28);
  border-radius: 100px;
  padding: 7px 16px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.58);
  letter-spacing: 0.04em;
  margin-bottom: 26px;
}
.af-h1 {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(36px, 3.2vw, 52px);
  font-weight: 900;
  color: #FFFFFF;
  line-height: 1.06;
  letter-spacing: -0.045em;
  margin-bottom: 20px;
}
.af-h1-sub {
  font-size: 15px;
  font-weight: 400;
  color: rgba(255,255,255,0.38);
  line-height: 1.65;
  max-width: 360px;
}

/* Chart card */
.af-chart-card {
  margin-top: 44px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 22px 24px 14px;
  position: relative;
  z-index: 1;
  animation: af-rise 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s both;
}
.af-chart-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.af-chart-kicker {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,0.28);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  margin-bottom: 6px;
}
.af-chart-num {
  font-family: 'Outfit', sans-serif;
  font-size: 30px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: -0.045em;
  line-height: 1;
}
.af-chart-delta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #10B981;
  margin-top: 8px;
  background: rgba(16,185,129,0.1);
  padding: 3px 10px;
  border-radius: 100px;
}
.af-chart-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.af-chart-svg {
  width: 100%;
  height: 70px;
  overflow: visible;
  display: block;
}

/* Chart animations */
.af-line-anim {
  stroke-dasharray: 1100;
  stroke-dashoffset: 1100;
  animation: af-draw 2.4s cubic-bezier(0.22,1,0.36,1) 0.5s forwards;
}
.af-fill-anim {
  opacity: 0;
  animation: af-fade 1.2s ease 1.5s forwards;
}
.af-dot-core {
  opacity: 0;
  animation: af-fade 0.4s ease 2.5s forwards;
}
.af-dot-ring {
  transform-box: fill-box;
  transform-origin: center;
  animation: af-ring-pulse 2.2s ease-out 2.8s infinite;
}

/* Stat row */
.af-stat-row {
  display: flex;
  gap: 12px;
  margin-top: 14px;
  position: relative;
  z-index: 1;
}
.af-stat-pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 11px 13px;
  animation: af-rise 0.7s cubic-bezier(0.22,1,0.36,1) both;
  min-width: 0;
}
.af-stat-lbl {
  font-size: 10.5px;
  color: rgba(255,255,255,0.3);
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.af-stat-val {
  font-size: 13px;
  font-weight: 700;
  color: #FFF;
  font-family: 'Outfit', sans-serif;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}
.af-stat-chg {
  font-size: 10px;
  font-weight: 700;
  color: #10B981;
  background: rgba(16,185,129,0.1);
  padding: 2px 7px;
  border-radius: 6px;
  flex-shrink: 0;
}
.af-stat-chg-indigo {
  color: #818CF8;
  background: rgba(129,140,248,0.12);
}

/* Trust row */
.af-trust-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: auto;
  padding-top: 36px;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
}
.af-trust-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.2);
  white-space: nowrap;
}
.af-trust-sep {
  width: 1px;
  height: 11px;
  background: rgba(255,255,255,0.1);
  flex-shrink: 0;
}

/* ══════════════════════════════════════
   RIGHT PANEL
══════════════════════════════════════ */
.af-right {
  width: 45%;
  min-height: 100vh;
  background: #F7F9FC;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 44px;
}
.af-card {
  width: 100%;
  max-width: 420px;
}

/* Mobile-only logo */
.af-mobile-logo {
  display: none;
  align-items: center;
  gap: 10px;
  margin-bottom: 36px;
}
.af-logo-mark-sm {
  width: 36px !important;
  height: 36px !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 14px rgba(79,70,229,0.4) !important;
}
.af-mobile-brand {
  font-family: 'Outfit', sans-serif;
  font-size: 19px;
  font-weight: 900;
  color: #0F172A;
  letter-spacing: -0.04em;
}

/* Card header */
.af-card-head { margin-bottom: 28px; }
.af-card-title {
  font-family: 'Outfit', sans-serif;
  font-size: 27px;
  font-weight: 900;
  color: #0F172A;
  letter-spacing: -0.04em;
  line-height: 1.12;
  margin-bottom: 8px;
}
.af-card-sub {
  font-size: 14px;
  color: #64748B;
  line-height: 1.55;
  font-weight: 400;
}

/* Alerts */
.af-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  margin-bottom: 20px;
}
.af-alert-err {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #B91C1C;
  animation: af-shake 0.45s ease-out;
}
.af-alert-ok {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  color: #15803D;
}

/* Form */
.af-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.af-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.af-lbl {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  letter-spacing: -0.01em;
}

/* Input wrapper */
.af-inp-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border: 1.5px solid #E2E8F0;
  border-radius: 11px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05);
}
.af-inp-wrap:hover:not(.af-focused):not(.af-inp-err) {
  border-color: #CBD5E1;
}
.af-inp-wrap.af-focused {
  border-color: #4F46E5;
  box-shadow: 0 0 0 3px rgba(79,70,229,0.12), 0 1px 3px rgba(15,23,42,0.05);
}
.af-inp-wrap.af-inp-err {
  border-color: #F87171;
  box-shadow: 0 0 0 3px rgba(248,113,113,0.1);
}
.af-inp {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  padding: 13px 16px;
  font-size: 15px;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #0F172A;
  font-weight: 400;
  min-width: 0;
}
.af-inp::placeholder { color: #94A3B8; }
.af-eye-btn {
  background: none;
  border: none;
  padding: 0 14px;
  color: #94A3B8;
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.15s;
}
.af-eye-btn:hover { color: #4F46E5; }
.af-err-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #EF4444;
  font-weight: 500;
}

/* Remember + Forgot row */
.af-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -4px;
}
.af-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4B5563;
  cursor: pointer;
  font-weight: 500;
  user-select: none;
}
.af-chk {
  width: 15px;
  height: 15px;
  accent-color: #4F46E5;
  cursor: pointer;
  border-radius: 4px;
}

/* Link button */
.af-link {
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: #4F46E5;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: color 0.15s;
  text-decoration: none;
}
.af-link:hover { color: #3730A3; text-decoration: underline; }
.af-link-bold { font-weight: 700; }

/* CTA Button */
.af-cta-btn {
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  color: #FFFFFF;
  border: none;
  border-radius: 11px;
  font-size: 15px;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  box-shadow: 0 4px 18px rgba(79,70,229,0.4);
  margin-top: 4px;
  letter-spacing: -0.01em;
}
.af-cta-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 26px rgba(79,70,229,0.5);
  filter: brightness(1.08);
}
.af-cta-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(79,70,229,0.3);
}
.af-cta-btn:disabled { opacity: 0.65; cursor: not-allowed; }

/* Divider */
.af-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 24px 0;
}
.af-div-line {
  flex: 1;
  height: 1px;
  background: #E2E8F0;
}
.af-div-txt {
  font-size: 12px;
  font-weight: 500;
  color: #94A3B8;
  white-space: nowrap;
}

/* OAuth buttons */
.af-oauth-wrap { display: flex; gap: 12px; }
.af-oauth-btn {
  flex: 1;
  padding: 13px 16px;
  background: #FFFFFF;
  color: #1F2937;
  border: 1.5px solid #E2E8F0;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05);
}
.af-oauth-btn:hover:not(:disabled) {
  background: #F8FAFC;
  border-color: #CBD5E1;
  box-shadow: 0 3px 12px rgba(15,23,42,0.09);
  transform: translateY(-1px);
}
.af-oauth-btn:active:not(:disabled) { transform: translateY(0); }
.af-oauth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.af-apple-btn {
  background: #0F172A;
  color: #FFFFFF;
  border-color: #0F172A;
}
.af-apple-btn:hover:not(:disabled) {
  background: #1E293B !important;
  border-color: #1E293B !important;
}

/* Mode switcher */
.af-switch { text-align: center; margin-top: 24px; }
.af-switch-txt { font-size: 13.5px; color: #6B7280; }

/* Security bar */
.af-sec-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #F1F5F9;
  flex-wrap: wrap;
}
.af-sec-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 500;
  color: #9CA3AF;
}
.af-sec-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #D1D5DB;
  flex-shrink: 0;
}

/* Demo button */
.af-demo-wrap { text-align: center; margin-top: 12px; }
.af-demo-btn {
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 500;
  color: #94A3B8;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s;
}
.af-demo-btn:hover { color: #4F46E5; }

/* ══════════════════════════════════════
   KEYFRAME ANIMATIONS
══════════════════════════════════════ */
@keyframes af-draw {
  to { stroke-dashoffset: 0; }
}
@keyframes af-fade {
  to { opacity: 1; }
}
@keyframes af-ring-pulse {
  0%   { opacity: 0.45; transform: scale(1); }
  100% { opacity: 0;    transform: scale(4); }
}
@keyframes af-rise {
  from { opacity: 0; transform: translateY(18px); }
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
@keyframes af-spin-anim {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ══════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════ */
@media (max-width: 800px) {
  .af-left  { display: none; }
  .af-right {
    width: 100%;
    padding: 40px 24px;
    align-items: flex-start;
    padding-top: 60px;
  }
  .af-card  { max-width: 100%; }
  .af-mobile-logo { display: flex; }
  .af-oauth-wrap  { flex-direction: column; }
}

@media (min-width: 801px) and (max-width: 1100px) {
  .af-left  { width: 50%; padding: 44px; }
  .af-right { width: 50%; padding: 44px 36px; }
  .af-h1    { font-size: 38px; }
  .af-stat-lbl { display: none; }
}
`;
