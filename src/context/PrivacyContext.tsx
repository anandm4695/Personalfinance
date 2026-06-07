import React, { createContext, useContext, useState, useEffect } from "react";

interface PrivacyCtx {
  privacyMode: boolean;
  setPrivacyMode: (v: boolean) => void;
}

const PrivacyContext = createContext<PrivacyCtx>({ privacyMode: true, setPrivacyMode: () => {} });

const PRIVACY_KEY = "pf_privacy_mode";

export const PrivacyProvider = ({ children }: { children: React.ReactNode }) => {
  const [privacyMode, setPrivacyModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(PRIVACY_KEY);
      return saved === "true";
    } catch {
      return false;
    }
  });

  const setPrivacyMode = (v: boolean | ((prev: boolean) => boolean)) => {
    setPrivacyModeState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      try {
        localStorage.setItem(PRIVACY_KEY, String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    document.body.classList.toggle("privacy-mode", privacyMode);
    return () => {
      document.body.classList.remove("privacy-mode");
    };
  }, [privacyMode]);

  return (
    <PrivacyContext.Provider
      value={{ privacyMode, setPrivacyMode: setPrivacyMode as (v: boolean) => void }}
    >
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => useContext(PrivacyContext);

/** Renders •••• when privacy mode is on, otherwise renders children as-is. */
export const Prv = ({ children }: { children: React.ReactNode }) => {
  const { privacyMode } = usePrivacy();
  if (!privacyMode) return <>{children}</>;
  return (
    <span
      aria-hidden="true"
      style={{ letterSpacing: "0.1em", userSelect: "none", fontFamily: "inherit" }}
    >
      ••••
    </span>
  );
};
