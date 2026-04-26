// @ts-nocheck
import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { Shield, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function Auth({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMsg("Check your email for the confirmation link!");
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          onLogin(data.session);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0D1117",
      backgroundImage: "radial-gradient(circle at 50% -20%, #1A2A42 0%, #0D1117 100%)",
      fontFamily: "'Inter', sans-serif",
      color: "#F5EFE3",
      padding: 24,
    }}>
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 24,
        padding: "48px 40px",
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", padding: 16, background: "rgba(79,107,255,0.1)", borderRadius: "50%", marginBottom: 24 }}>
            <Shield size={32} color="#4F6BFF" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
            Finance Dashboard
          </h1>
          <p style={{ margin: 0, color: "rgba(245,239,227,0.5)", fontSize: 14 }}>
            {isSignUp ? "Create a secure account" : "Sign in to your secure dashboard"}
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(255,60,60,0.1)", color: "#FF6B6B", padding: "12px 16px", borderRadius: 12, fontSize: 13, marginBottom: 24, border: "1px solid rgba(255,60,60,0.2)" }}>
            {error}
          </div>
        )}
        {msg && (
          <div style={{ background: "rgba(60,255,100,0.1)", color: "#4ade80", padding: "12px 16px", borderRadius: 12, fontSize: 13, marginBottom: 24, border: "1px solid rgba(60,255,100,0.2)" }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(245,239,227,0.7)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} color="rgba(245,239,227,0.4)" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "14px 16px 14px 44px",
                  color: "#F5EFE3",
                  fontSize: 15,
                  outline: "none",
                  transition: "all 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={e => e.target.style.borderColor = "#4F6BFF"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(245,239,227,0.7)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} color="rgba(245,239,227,0.4)" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "14px 16px 14px 44px",
                  color: "#F5EFE3",
                  fontSize: 15,
                  outline: "none",
                  transition: "all 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={e => e.target.style.borderColor = "#4F6BFF"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            style={{
              width: "100%",
              background: "#4F6BFF",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "opacity 0.2s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : (
              <>
                {isSignUp ? "Create Account" : "Sign In"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(245,239,227,0.6)",
              fontSize: 14,
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: "inherit"
            }}
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
        
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    </div>
  );
}
