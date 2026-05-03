// @ts-nocheck
import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import {
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingUp,
  Target,
  PieChart,
  Lock,
  Loader2,
  CheckCircle2,
  IndianRupee,
  Sparkles,
  BarChart3,
  CreditCard,
  Wallet,
} from "lucide-react";

const FEATURES = [
  {
    icon: TrendingUp,
    color: "#34D399",
    title: "Net Worth Tracker",
    desc: "Real-time view of assets, liabilities and wealth growth",
  },
  {
    icon: PieChart,
    color: "#818CF8",
    title: "Investment Portfolio",
    desc: "Mutual funds, stocks, FDs, PPF, NPS in one place",
  },
  {
    icon: Target,
    color: "#FBBF24",
    title: "Financial Goals",
    desc: "Set targets and watch your progress automatically",
  },
  {
    icon: BarChart3,
    color: "#F87171",
    title: "Tax Planning",
    desc: "New & old regime comparison with slab-wise breakdown",
  },
  {
    icon: CreditCard,
    color: "#A78BFA",
    title: "Credit & Loans",
    desc: "Track outstanding balances, EMIs and due dates",
  },
  {
    icon: Wallet,
    color: "#FB923C",
    title: "Budget Control",
    desc: "Category budgets with smart over-spend alerts",
  },
];

const StatPill = ({ value, label }: { value: string; label: string }) => (
  <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px 20px",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    minWidth: 90,
    flex: 1,
  }}>
    <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
      {value}
    </div>
    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 3, textAlign: "center", letterSpacing: "0.04em" }}>
      {label}
    </div>
  </div>
);

export default function Auth({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isSignUp && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created! Check your email for the confirmation link.");
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) onLogin(data.session);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (focused: boolean) => ({
    width: "100%",
    background: focused
      ? "rgba(129, 140, 248, 0.06)"
      : "rgba(255,255,255,0.04)",
    border: `1.5px solid ${focused ? "rgba(129,140,248,0.6)" : "rgba(255,255,255,0.1)"}`,
    borderRadius: 12,
    padding: "14px 16px",
    color: "#F1F3F9",
    fontSize: 15,
    outline: "none",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s ease",
    boxShadow: focused ? "0 0 0 3px rgba(129,140,248,0.12)" : "none",
  });

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "#0B0F1A",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#F1F3F9",
    }}>
      {/* ── LEFT PANEL — Feature showcase ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 56px",
        background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 50%, #0B0F1A 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
      className="auth-left-panel"
      >
        {/* Background decoration */}
        <div style={{
          position: "absolute",
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 56 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "linear-gradient(135deg, #4F46E5, #818CF8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
          }}>
            <IndianRupee size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Finance</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Dashboard</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 40, maxWidth: 480 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(129,140,248,0.1)",
            border: "1px solid rgba(129,140,248,0.2)",
            borderRadius: 99,
            padding: "5px 12px",
            marginBottom: 20,
          }}>
            <Sparkles size={12} color="#818CF8" />
            <span style={{ fontSize: 11, color: "#818CF8", fontWeight: 600, letterSpacing: "0.06em" }}>
              YOUR COMPLETE FINANCIAL COMMAND CENTRE
            </span>
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 3.5vw, 42px)",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#fff",
            marginBottom: 16,
          }}>
            Take control of{" "}
            <span style={{
              background: "linear-gradient(135deg, #818CF8, #34D399)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              your finances
            </span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            Track every rupee, grow every investment, and hit every goal — all in one secure private dashboard.
          </p>
        </div>

        {/* Feature grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 44,
        }}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px",
                background: "rgba(255,255,255,0.025)",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.05)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
              }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${f.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}>
                  <Icon size={16} color={f.color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatPill value="15+" label="Asset classes" />
          <StatPill value="₹∞" label="No limits" />
          <StatPill value="100%" label="Private & secure" />
        </div>
      </div>

      {/* ── RIGHT PANEL — Auth form ── */}
      <div style={{
        width: "clamp(380px, 40%, 500px)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 48px",
        background: "#0F172A",
        position: "relative",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#fff",
              marginBottom: 8,
            }}>
              {isSignUp ? "Create account" : "Welcome back"}
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
              {isSignUp
                ? "Start your financial clarity journey today."
                : "Sign in to your secure dashboard."}
            </p>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}>
              <Shield size={15} color="#F87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: "#F87171", lineHeight: 1.4 }}>{error}</span>
            </div>
          )}

          {msg && (
            <div style={{
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.25)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}>
              <CheckCircle2 size={15} color="#34D399" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: "#34D399", lineHeight: 1.4 }}>{msg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 7,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}>
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="you@example.com"
                style={inputStyle(emailFocused)}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 7,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  placeholder="••••••••"
                  style={{ ...inputStyle(passFocused), paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.3)",
                    display: "flex",
                    alignItems: "center",
                    padding: 4,
                    borderRadius: 6,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px 20px",
                background: loading
                  ? "rgba(129,140,248,0.6)"
                  : "linear-gradient(135deg, #4F46E5, #818CF8)",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
                boxShadow: loading ? "none" : "0 8px 24px rgba(79,70,229,0.3)",
                transition: "all 0.2s ease",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(79,70,229,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = loading ? "none" : "0 8px 24px rgba(79,70,229,0.3)";
              }}
            >
              {loading ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <>
                  {isSignUp ? "Create account" : "Sign in"}
                  <ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Toggle sign in / sign up */}
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              {isSignUp ? "Already have an account? " : "New here? "}
            </span>
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); setMsg(null); }}
              style={{
                background: "none",
                border: "none",
                color: "#818CF8",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                textDecoration: "none",
                fontFamily: "'Inter', sans-serif",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#A5B4FC")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#818CF8")}
            >
              {isSignUp ? "Sign in" : "Create account"}
            </button>
          </div>

          {/* Trust badge */}
          <div style={{
            marginTop: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
          }}>
            <Lock size={12} color="rgba(255,255,255,0.35)" />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.03em" }}>
              Secured by Supabase · Your data stays private
            </span>
          </div>
        </div>
      </div>

      {/* Responsive: hide left panel on small screens */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @media (max-width: 900px) {
          .auth-left-panel { display: none !important; }
        }
        @media (max-width: 900px) {
          div[style*="width: clamp(380px"] {
            width: 100% !important;
            min-width: unset !important;
            padding: 40px 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
