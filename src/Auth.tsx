// @ts-nocheck
import React, { useState, useEffect } from "react";
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
  Globe,
  Zap,
} from "lucide-react";

const FEATURES = [
  { icon: TrendingUp, color: "#10B981", title: "Wealth Tracker",    desc: "Real-time assets & liabilities" },
  { icon: PieChart,   color: "#6366F1", title: "Investments",       desc: "Stocks, Funds & more" },
  { icon: Target,     color: "#F59E0B", title: "Goal Pacing",       desc: "Watch your savings grow" },
  { icon: BarChart3,  color: "#EF4444", title: "Tax Planner",       desc: "Smart regime optimization" },
];

export default function Auth({ onLogin, onOffline }: { onLogin: (session: any) => void; onOffline?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const inputStyle = (focused: boolean) => ({
    width: "100%",
    background: focused ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
    border: `1px solid ${focused ? "rgba(99, 102, 241, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
    borderRadius: "14px",
    padding: "14px 16px",
    color: "#FFFFFF",
    fontSize: "15px",
    outline: "none",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: focused ? "0 0 0 4px rgba(99, 102, 241, 0.15)" : "none",
    backdropFilter: "blur(10px)",
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgot) {
      setLoading(true); setError(null); setMsg(null);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMsg("Recovery link dispatched — check your inbox.");
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); }
      return;
    }
    if (isSignUp && password.length < 8) { setError("Security requirement: Minimum 8 characters."); return; }
    setLoading(true); setError(null); setMsg(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Success! Check your email for the verification link.");
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) onLogin(data.session);
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const switchMode = (mode: "login" | "signup" | "forgot") => {
    setError(null); setMsg(null);
    setIsSignUp(mode === "signup");
    setIsForgot(mode === "forgot");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "#020617",
      fontFamily: "'Outfit', 'Inter', sans-serif",
      color: "#F8FAFC",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* ── AMBIENT BACKGROUND ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", zIndex: 0 }}>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, transparent 0%, #020617 80%)", opacity: 0.8 }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%", height: "100vh" }}>
        
        {/* ── LEFT: PRODUCT SHOWCASE ── */}
        <div className="hide-mobile" style={{ flex: 1.2, display: "flex", flexDirection: "column", padding: "64px", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 32px rgba(99, 102, 241, 0.4)" }}>
                <IndianRupee size={24} color="#fff" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>FinCommand</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 4, fontWeight: 600 }}>by Anand Mohta</div>
              </div>
            </div>

            <div style={{ maxWidth: 520 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99, 102, 241, 0.15)", padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(99, 102, 241, 0.3)", marginBottom: 24 }}>
                <Sparkles size={14} color="#818CF8" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#A5B4FC", letterSpacing: "0.02em" }}>ENTERPRISE GRADE WEALTH MANAGEMENT</span>
              </div>
              <h1 style={{ fontSize: "clamp(40px, 4.5vw, 64px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.05em", marginBottom: 24 }}>
                Master your <br/>
                <span style={{ background: "linear-gradient(135deg, #6366F1, #10B981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>financial destiny.</span>
              </h1>
              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, fontWeight: 400 }}>
                Join 5,000+ investors using the most advanced private dashboard to track net worth, optimize taxes, and hit savings goals.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{ padding: 20, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", transition: "all 0.3s ease" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${f.color}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <f.icon size={18} color={f.color} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: -8 }}>
              {[1,2,3,4].map(n => <div key={n} style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #020617", background: "#1E293B", marginLeft: n===1 ? 0 : -8 }} />)}
              <div style={{ marginLeft: 12, fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                <span style={{ color: "#fff", fontWeight: 800 }}>500+</span> added this week
              </div>
            </div>
            <div style={{ height: 24, width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={16} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Available Worldwide</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: AUTH FORM ── */}
        <div style={{ flex: 0.8, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: 440, padding: "48px", borderRadius: 32, background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(40px)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
            
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 8 }}>
                {isForgot ? "Reset Access" : isSignUp ? "Get Started" : "Welcome Home"}
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                {isForgot ? "Enter email to recover your account" : isSignUp ? "Create your secure financial vault" : "Sign in to your private command center"}
              </p>
            </div>

            {error && (
              <div className="animate-shake" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
                <Shield size={16} color="#F87171" />
                <span style={{ fontSize: 13, color: "#F87171", fontWeight: 600 }}>{error}</span>
              </div>
            )}

            {msg && (
              <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
                <CheckCircle2 size={16} color="#34D399" />
                <span style={{ fontSize: 13, color: "#34D399", fontWeight: 600 }}>{msg}</span>
              </div>
            )}

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Address</label>
                <input
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                  style={inputStyle(emailFocused)}
                  placeholder="name@company.com"
                />
              </div>

              {!isForgot && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
                    {!isSignUp && (
                      <button type="button" onClick={() => switchMode("forgot")} style={{ background: "none", border: "none", color: "#818CF8", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Forgot?</button>
                    )}
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"} required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPassFocused(true)} onBlur={() => setPassFocused(false)}
                      style={inputStyle(passFocused)}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="submit-btn"
                style={{
                  width: "100%", padding: "16px", borderRadius: "14px",
                  background: loading ? "rgba(99, 102, 241, 0.4)" : "linear-gradient(135deg, #6366F1, #4F46E5)",
                  color: "#fff", border: "none", fontSize: 16, fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all 0.3s ease", boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
                  marginTop: 12
                }}
              >
                {loading ? <Loader2 size={20} className="spin" /> : (
                  <>
                    {isForgot ? "Reset My Password" : isSignUp ? "Create My Vault" : "Enter Dashboard"}
                    <ArrowRight size={18} strokeWidth={3} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: 32, textAlign: "center", fontSize: 14 }}>
              {isForgot ? (
                <button onClick={() => switchMode("login")} style={{ background: "none", border: "none", color: "#818CF8", fontWeight: 700, cursor: "pointer" }}>← Back to Login</button>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.4)" }}>
                  {isSignUp ? "Already a member? " : "New to FinCommand? "}
                  <button onClick={() => switchMode(isSignUp ? "login" : "signup")} style={{ background: "none", border: "none", color: "#818CF8", fontWeight: 800, cursor: "pointer", marginLeft: 4 }}>
                    {isSignUp ? "Sign In" : "Start Free"}
                  </button>
                </span>
              )}
            </div>

            <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Lock size={12} color="#10B981" />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>AES-256 Encrypted</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={12} color="#F59E0B" />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Real-time Sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        
        @keyframes blob {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.15; z-index: -1; animation: blob 10s infinite alternate; }
        .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: #6366F1; animation-duration: 15s; }
        .blob-2 { bottom: -10%; right: -10%; width: 40vw; height: 40vw; background: #10B981; animation-delay: -5s; animation-duration: 20s; }
        .blob-3 { top: 40%; left: 40%; width: 30vw; height: 30vw; background: #8B5CF6; animation-delay: -10s; }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .feature-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.15) !important; box-shadow: 0 12px 32px rgba(0,0,0,0.2); }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 12px 32px rgba(99, 102, 241, 0.5) !important; }
        .submit-btn:active { transform: translateY(0); scale: 0.98; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }

        @media (max-width: 1024px) {
          .hide-mobile { display: none !important; }
          .glass-panel { max-width: 100% !important; border-radius: 0 !important; height: 100vh !important; display: flex; flexDirection: column; justifyContent: center; }
        }
      `}</style>
    </div>
  );
}
