// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
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
  Globe,
  Zap,
  Activity,
  Cpu,
} from "lucide-react";

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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Parallax effect
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setMsg(null);
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg("Recovery protocols initiated. Check your inbox.");
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Security link sent. Please verify your identity.");
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
      alignItems: "center",
      justifyContent: "center",
      background: "#02040A",
      fontFamily: "'Outfit', sans-serif",
      color: "#FFFFFF",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* ── NEURAL GRID BACKGROUND ── */}
      <div style={{
        position: "absolute",
        inset: "-5%",
        backgroundImage: `
          linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0) rotateX(10deg)`,
        transition: "transform 0.1s ease-out",
        zIndex: 0,
        maskImage: "radial-gradient(circle at center, black 0%, transparent 80%)",
      }} />

      {/* ── AMBIENT GLOWS ── */}
      <div style={{ position: "absolute", top: "20%", left: "30%", width: "40vw", height: "40vw", background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)", filter: "blur(100px)", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "10%", right: "20%", width: "30vw", height: "30vw", background: "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)", filter: "blur(80px)", zIndex: 0 }} />

      {/* ── FLOATING INTELLIGENCE TOKENS ── */}
      <div className="tokens-container hide-mobile">
        <Token icon={TrendingUp} label="Wealth" x="15%" y="25%" delay="0s" color="#6366F1" />
        <Token icon={PieChart} label="Assets" x="80%" y="30%" delay="1s" color="#10B981" />
        <Token icon={Shield} label="Encrypted" x="20%" y="70%" delay="2s" color="#F59E0B" />
        <Token icon={Cpu} label="AI Engine" x="75%" y="75%" delay="3s" color="#EF4444" />
      </div>

      {/* ── MAIN VAULT CARD ── */}
      <div 
        className="vault-card"
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "64px",
          borderRadius: 40,
          background: "rgba(10, 15, 30, 0.4)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(40px)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)",
          zIndex: 10,
          position: "relative",
          textAlign: "center"
        }}
      >
        {/* Logo */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
           <div className="pulse-border" style={{ padding: 12, borderRadius: 16, background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}>
              <IndianRupee size={24} color="#fff" strokeWidth={3} />
           </div>
           <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1 }}>FinCommand</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 4 }}>System Access</div>
           </div>
        </div>

        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.05em", marginBottom: 12 }}>
            {greeting}, <span style={{ color: "#6366F1" }}>CFO</span>
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
            {isForgot ? "Initiate account recovery protocols." : isSignUp ? "Establish your secure wealth perimeter." : "Authorize to enter your financial vault."}
          </p>
        </div>

        {error && (
          <div className="animate-shake" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 16, padding: "16px", marginBottom: 32, display: "flex", gap: 12, alignItems: "center" }}>
            <Activity size={18} color="#F87171" />
            <span style={{ fontSize: 14, color: "#F87171", fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {msg && (
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 16, padding: "16px", marginBottom: 32, display: "flex", gap: 12, alignItems: "center" }}>
            <CheckCircle2 size={18} color="#34D399" />
            <span style={{ fontSize: 14, color: "#34D399", fontWeight: 600 }}>{msg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="input-field">
            <input
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
              className={emailFocused ? "focused" : ""}
              style={inputStyles}
              placeholder="System Email"
            />
          </div>

          {!isForgot && (
            <div className="input-field" style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"} required
                value={password} onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPassFocused(true)} onBlur={() => setPassFocused(false)}
                className={passFocused ? "focused" : ""}
                style={inputStyles}
                placeholder="Access Key"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer" }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="submit-vault-btn"
            style={{
              width: "100%", padding: "20px", borderRadius: "20px",
              background: loading ? "rgba(99, 102, 241, 0.4)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
              color: "#fff", border: "none", fontSize: 18, fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 20px 40px rgba(99, 102, 241, 0.3)",
              letterSpacing: "-0.02em"
            }}
          >
            {loading ? <Loader2 size={24} className="spin" /> : (
              <>
                {isForgot ? "Recovery Link" : isSignUp ? "Establish Perimeter" : "Enter Vault"}
                <ArrowRight size={20} strokeWidth={3} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 40, display: "flex", justifyContent: "center", gap: 8, fontSize: 14 }}>
           {isForgot ? (
             <button onClick={() => switchMode("login")} style={toggleBtnStyle}>← Return to Authorization</button>
           ) : (
             <>
               <span style={{ color: "rgba(255,255,255,0.3)" }}>{isSignUp ? "Registered?" : "No access?"}</span>
               <button onClick={() => switchMode(isSignUp ? "login" : "signup")} style={toggleBtnStyle}>
                 {isSignUp ? "Sign In" : "Request Credentials"}
               </button>
             </>
           )}
        </div>
      </div>

      {/* ── FOOTER BADGES ── */}
      <div style={{ position: "absolute", bottom: 40, display: "flex", gap: 32, opacity: 0.2, zIndex: 1 }}>
         <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Lock size={14} /> <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>ENCRYPTED</span></div>
         <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Globe size={14} /> <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>GLOBAL NODE</span></div>
         <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Zap size={14} /> <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>ZERO LATENCY</span></div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap');
        
        .pulse-border { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); } 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); } }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .token { animation: float 6s ease-in-out infinite; }

        .submit-vault-btn:hover:not(:disabled) { transform: translateY(-4px) scale(1.02); filter: brightness(1.1); box-shadow: 0 30px 60px rgba(99, 102, 241, 0.5) !important; }
        .submit-vault-btn:active { transform: translateY(0) scale(0.98); }

        .animate-shake { animation: shake 0.5s ease-in-out; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

        @media (max-width: 768px) {
          .vault-card { max-width: 100% !important; height: 100vh !important; border-radius: 0 !important; display: flex; flex-direction: column; justify-content: center; }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Token({ icon: Icon, label, x, y, delay, color }: any) {
  return (
    <div className="token" style={{ position: "absolute", left: x, top: y, animationDelay: delay, zIndex: 1, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, color }}>
        <Icon size={24} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
    </div>
  );
}

const inputStyles = {
  width: "100%",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "20px",
  padding: "20px 24px",
  color: "#FFFFFF",
  fontSize: "16px",
  fontWeight: "500",
  outline: "none",
  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
};

const toggleBtnStyle = {
  background: "none",
  border: "none",
  color: "#6366F1",
  fontWeight: 800,
  cursor: "pointer",
  padding: 0,
  marginLeft: 4
};
