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
  ArrowUpRight,
} from "lucide-react";

const FEATURES = [
  { icon: TrendingUp, color: "#10B981", title: "Wealth Mastery",    desc: "Real-time assets & liabilities" },
  { icon: PieChart,   color: "#6366F1", title: "Portfolio 360",     desc: "Stocks, Funds & more" },
  { icon: Target,     color: "#F59E0B", title: "Precision Goals",   desc: "Watch your savings grow" },
  { icon: BarChart3,  color: "#EF4444", title: "Tax Strategy",      desc: "Optimized for your income" },
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
    background: focused ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
    border: `1px solid ${focused ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
    borderRadius: "12px",
    padding: "16px",
    color: "#FFFFFF",
    fontSize: "15px",
    outline: "none",
    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
    boxShadow: focused ? "0 0 0 1px rgba(255, 255, 255, 0.1)" : "none",
    backdropFilter: "blur(20px)",
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
        setMsg("Check your inbox for a recovery link.");
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); }
      return;
    }
    if (isSignUp && password.length < 8) { setError("Security: Minimum 8 characters required."); return; }
    setLoading(true); setError(null); setMsg(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Almost there! Check your email to verify.");
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
      background: "#050505",
      fontFamily: "'Inter', sans-serif",
      color: "#FFFFFF",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* ── BACKGROUND TEXTURE ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none", background: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />
      <div style={{ position: "absolute", bottom: "-20%", left: "10%", width: "80%", height: "60%", background: "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.1) 0%, transparent 70%)", filter: "blur(120px)" }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%", height: "100vh" }}>
        
        {/* ── LEFT: EXECUTIVE SHOWCASE ── */}
        <div className="hide-mobile" style={{ flex: 1.1, display: "flex", flexDirection: "column", padding: "80px", justifyContent: "space-between", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="fade-in" style={{ animationDelay: "0.1s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 64 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IndianRupee size={20} color="#000" strokeWidth={3} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em" }}>FinCommand</div>
            </div>

            <div style={{ maxWidth: 540 }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(48px, 5vw, 72px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 32, letterSpacing: "-0.02em" }}>
                Wealth management, <br/>
                <span style={{ fontStyle: "italic", fontWeight: 400 }}>redefined.</span>
              </h1>
              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontWeight: 300, maxWidth: 440 }}>
                A private, high-fidelity command center designed for the modern investor. Precision tracking for your global assets.
              </p>
            </div>
          </div>

          {/* MOCKUP PREVIEW */}
          <div className="fade-in-up" style={{ animationDelay: "0.4s", position: "relative", height: 260, marginTop: 40 }}>
            <div className="glass-card" style={{ width: 400, padding: 24, borderRadius: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Net Worth Estimate</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>₹8.42 Cr</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10B981", fontSize: 13, fontWeight: 600 }}>
                  <TrendingUp size={14} /> +12.4%
                </div>
              </div>
              <div style={{ height: 80, display: "flex", alignItems: "flex-end", gap: 8 }}>
                {[30, 45, 35, 60, 50, 80, 70, 95].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 7 ? "#FFFFFF" : "rgba(255,255,255,0.1)", borderRadius: 4, transition: "height 1s ease" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(255,255,255,0.3)" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1" }} /> Stocks</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(255,255,255,0.3)" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} /> MF</div>
                </div>
                <ArrowUpRight size={14} color="rgba(255,255,255,0.2)" />
              </div>
            </div>
          </div>

          <div className="fade-in" style={{ animationDelay: "0.6s", display: "flex", alignItems: "center", gap: 40 }}>
             <div style={{ display: "flex", flexDirection: "column" }}>
               <div style={{ fontSize: 24, fontWeight: 700 }}>100%</div>
               <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Private Data</div>
             </div>
             <div style={{ display: "flex", flexDirection: "column" }}>
               <div style={{ fontSize: 24, fontWeight: 700 }}>256-bit</div>
               <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Encryption</div>
             </div>
             <div style={{ display: "flex", flexDirection: "column" }}>
               <div style={{ fontSize: 24, fontWeight: 700 }}>0.4s</div>
               <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cloud Sync</div>
             </div>
          </div>
        </div>

        {/* ── RIGHT: MINIMALIST FORM ── */}
        <div style={{ flex: 0.9, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
          <div className="fade-in" style={{ width: "100%", maxWidth: 400, animationDelay: "0.2s" }}>
            
            <div style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
                {isForgot ? "Reset Access" : isSignUp ? "Create Account" : "Welcome Back"}
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", fontWeight: 400, lineHeight: 1.5 }}>
                {isForgot ? "Enter your registered email to continue." : isSignUp ? "Establish your private financial vault today." : "Access your secure financial command center."}
              </p>
            </div>

            {error && (
              <div className="animate-shake" style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 12, padding: "14px", marginBottom: 32, display: "flex", gap: 12, alignItems: "center" }}>
                <Shield size={16} color="#F87171" />
                <span style={{ fontSize: 13, color: "#F87171", fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {msg && (
              <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 12, padding: "14px", marginBottom: 32, display: "flex", gap: 12, alignItems: "center" }}>
                <CheckCircle2 size={16} color="#34D399" />
                <span style={{ fontSize: 13, color: "#34D399", fontWeight: 500 }}>{msg}</span>
              </div>
            )}

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="input-group">
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Corporate Email</label>
                <input
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                  style={inputStyle(emailFocused)}
                  placeholder="name@exclusive.com"
                />
              </div>

              {!isForgot && (
                <div className="input-group">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Password</label>
                    {!isSignUp && (
                      <button type="button" onClick={() => switchMode("forgot")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>Forgot?</button>
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
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer" }}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="submit-btn"
                style={{
                  width: "100%", padding: "18px", borderRadius: "12px",
                  background: loading ? "rgba(255,255,255,0.1)" : "#FFFFFF",
                  color: "#000", border: "none", fontSize: 15, fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  marginTop: 16,
                  letterSpacing: "-0.01em"
                }}
              >
                {loading ? <Loader2 size={20} className="spin" /> : (
                  <>
                    {isForgot ? "Send Link" : isSignUp ? "Create Vault" : "Authorize Session"}
                    <ArrowRight size={18} strokeWidth={3} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: 40, textAlign: "center", fontSize: 14 }}>
              {isForgot ? (
                <button onClick={() => switchMode("login")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontWeight: 700, cursor: "pointer" }}>← Return to Login</button>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.3)" }}>
                  {isSignUp ? "Already registered? " : "Not a member yet? "}
                  <button onClick={() => switchMode(isSignUp ? "login" : "signup")} style={{ background: "none", border: "none", color: "#FFFFFF", fontWeight: 800, cursor: "pointer", marginLeft: 4 }}>
                    {isSignUp ? "Sign In" : "Start Now"}
                  </button>
                </span>
              )}
            </div>

            <div style={{ marginTop: 64, display: "flex", justifyContent: "center", gap: 24, opacity: 0.3 }}>
               <Globe size={16} />
               <Lock size={16} />
               <Zap size={16} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,700;1,400&family=Inter:wght@300;400;600;700;800&display=swap');
        
        .fade-in { animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .fade-in-up { animation: fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .glass-card:hover { border-color: rgba(255,255,255,0.15) !important; transform: translateY(-5px); transition: all 0.5s ease; }
        
        .submit-btn:hover:not(:disabled) { background: #F0F0F0 !important; transform: scale(1.02); }
        .submit-btn:active { transform: scale(0.98); }

        .animate-shake { animation: shake 0.5s ease-in-out; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

        @media (max-width: 1024px) {
          .hide-mobile { display: none !important; }
          .glass-panel { max-width: 100% !important; border-radius: 0 !important; height: 100vh !important; display: flex; flexDirection: column; justifyContent: center; }
        }
      `}</style>
    </div>
  );
}
