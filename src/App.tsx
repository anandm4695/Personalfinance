// @ts-nocheck
// Tech debt: 151 type errors, all fixable but require a dedicated refactor pass.
// Root causes: DEFAULT_STATE arrays inferred as never[] (need explicit interfaces),
// dynamic string indexing on typed maps (need `as keyof typeof X` casts),
// and implicit `any` in sort/filter callbacks (need typed parameters).
// The TS 4.4 → 5.x upgrade is done; supabaseClient.ts is clean.
// Next step: define AppState interface + per-entity types, then remove this pragma.
import "./styles.css";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  PieChart as PieIcon,
  TrendingUp,
  Landmark,
  Target,
  Building2,
  Heart,
  Wallet,
  Bell,
  Hash,
  Calculator,
  Settings,
  Search,
  X,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  CheckCheck,
  Clock,
  Download,
  IndianRupee,
  History,
  CreditCard,
  Plus,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  FileText,
  BarChart3,
  Repeat,
  Activity,
  User,
  Coins,
  Shield,
  Briefcase,
  Eye,
  EyeOff,
  Bot,
  Sparkles,
} from "lucide-react";
import { supabase, setDemoMode, getIsDemoMode, isDemoDbReady, signInToDemo, signOutOfDemo } from "./supabaseClient";
import Auth from "./Auth";
import { PrivacyProvider, usePrivacy } from "./context/PrivacyContext";

// Modular Imports
import { THEME, ACCENT_PALETTES, DENSITY, LIGHT_VARS, DARK_VARS, PROFILES } from "./utils/constants";
import { DEFAULT_MASTER_DATA, MasterDataContext } from "./utils/masterData";
import { fmtINR, fmtINRFull, uid, today, monthsBetween, getCCDueDate, calcTaxNew, calcTaxOld, loadState, saveStateLocal, getLocalDateString } from "./utils/finance";


// Tab Imports
import { AnalyticsTab } from "./components/tabs/AnalyticsTab";
import { InvestmentsTab } from "./components/tabs/InvestmentsTab";
import { TaxVaultTab } from "./components/tabs/TaxVaultTab";
import { RentalTab } from "./components/tabs/RentalTab";
import { BanksTab } from "./components/tabs/BanksTab";
import { DematTab } from "./components/tabs/DematTab";
import { TxnHistoryTab } from "./components/tabs/TxnHistoryTab";
import { CreditTab } from "./components/tabs/CreditTab";
import { SubscriptionsTab as SubsTab } from "./components/tabs/SubscriptionsTab";
import { SIPTrackerTab } from "./components/tabs/SIPTrackerTab";
import { InsuranceSummaryTab } from "./components/tabs/InsuranceSummaryTab";
import { GoalsTab } from "./components/tabs/GoalsTab";
import { BudgetTab } from "./components/tabs/BudgetTab";
import { RemindersTab } from "./components/tabs/RemindersTab";
import { CalculatorsTab } from "./components/tabs/CalculatorsTab";
import { SettingsTab } from "./components/tabs/SettingsTab";
import { AIAssistantTab } from "./components/tabs/AIAssistantTab";

// Modal Imports
import { QuickAddModal } from "./components/modals/QuickAddModal";
import { CommandPaletteModal } from "./components/modals/CommandPaletteModal";

// UI Imports
import { ToastStack, ConfirmDialog } from "./components/ui/Feedback";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";


// Indian fiscal year: April 1 to March 31
// Returns "2025-26" format based on the current calendar month
const getCurrentFY = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed; April = 3
  const fyStart = month >= 3 ? year : year - 1;
  const fyEndShort = String(fyStart + 1).slice(-2);
  return `${fyStart}-${fyEndShort}`;
};

const DEFAULT_STATE = {
  profile: { name: "there", fy: getCurrentFY(), regime: "new", savingsTarget: 20 },
  bankAccounts: [], transactions: [], fixedDeposits: [], recurringDeposits: [],
  bonds: [], ppf: [], nps: [], epf: [], lic: [], termPlans: [], investmentPlans: [], mutualFunds: [], stocks: [],
  demat: [], creditCards: [], prepaidCards: [], loansTaken: [], loansGiven: [],
  informalBorrowed: [], informalLent: [], rentalProperties: [], rentedProperties: [],
  subscriptions: [], goals: [], income: [], taxPayments: [], budgets: [], recurringExpenses: [],
  reminders: [], stockSells: [], mfSells: [], netWorthHistory: [], sips: [],
  corporateActions: [],
  dismissedAlerts: {},
  masterData: { ...DEFAULT_MASTER_DATA },
  settings: {
    darkMode: false, accentKey: "blue", density: "normal", sidebarNav: true,
    radiusKey: "modern", fontKey: "inter", bgStyle: "plain", animSpeed: "smooth", chartStyle: "monotone",
    emailEnabled: false, emailFrequency: "weekly", emailDay: 1, emailHour: 8, emailAddress: "", fromEmail: "",
    geminiApiKey: ""
  }
};





// Numeric DB columns that need empty-string → null and string → number coercion before upsert.
// Defined once here; used in both addItem and updateItem to avoid drift between the two paths.
const NUMERIC_COLS = new Set([
  "target_amount","current_amount","balance","principal","rate","units","current_nav","invested",
  "qty","current_price","avg_price","monthly","monthly_limit","tenure_months","face_value","coupon",
  "outstanding","emi","card_limit","annual_fee","amount","years","sum_assured","annual_premium",
  "premium_paid","cover_amount","monthly_rent","security_deposit","deposit_returned","municipal_tax",
  "buy_price","sell_price","buy_nav","sell_nav","total_installments","profit","net_worth","ratio_n",
  "ratio_m","old_qty","new_qty","old_avg_price","new_avg_price","term","premium_paying_term",
  "expected_maturity_amount","policy_term","ytm_rate","face_value_per_unit","number_of_units",
  "clean_price_per_unit","accrued_interest_per_unit","total_principal_amount","total_accrued_interest",
  "total_consideration","brokerage","stamp_duty","total_investment_amount","market_cap","due_day",
  "shared_group_limit"
]);

// ================== MAIN APP ==================
function FinanceDashboard() {
  const [session, setSession] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tab, setTab] = useState("analytics");
  const [subTab, setSubTab] = useState(null);
  const [marketDataTs, setMarketDataTs] = useState<number | null>(null);
  const [marketData, setMarketData] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("finance_market_data");
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const { _ts, ...data } = parsed;
      // Expire cache after 8 hours so users don't see stale prices indefinitely
      if (_ts && Date.now() - _ts > 8 * 3600 * 1000) return {};
      return data;
    } catch {
      return {};
    }
  });
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const fetchingRef = useRef(false);
  // Ref keeps stocks current inside fetchLivePrices without putting state.stocks in deps,
  // which would cause the callback to be recreated after every metadata sync → extra fetches.
  const stocksRef = useRef<any[]>([]);
  const { privacyMode, setPrivacyMode } = usePrivacy();
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const isSidebarCompact = sidebarMinimized && !sidebarHovered;

  const [state, setState] = useState(() => {
    // 1. If we just reset, start with default state
    if (window.location.search.includes("reset=success") || window.location.search.includes("reset=local")) {
      return DEFAULT_STATE;
    }

    const saved = loadState() || {};
    const newState = { ...DEFAULT_STATE };
    
    // Ensure every top-level key from DEFAULT_STATE exists in newState
    // and that array keys are actually arrays.
    Object.keys(DEFAULT_STATE).forEach(key => {
      if (Array.isArray(DEFAULT_STATE[key])) {
        newState[key] = Array.isArray(saved[key]) ? saved[key] : [];
      } else if (typeof DEFAULT_STATE[key] === 'object' && DEFAULT_STATE[key] !== null) {
        newState[key] = { ...DEFAULT_STATE[key], ...(saved[key] || {}) };
      } else {
        newState[key] = saved[key] !== undefined ? saved[key] : DEFAULT_STATE[key];
      }
    });
    
    return newState;
  });

  // 2. Cross-tab sync: If another tab clears storage, this one should reload/wipe
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      // StorageEvent only fires for OTHER tabs/windows.
      // If storage is cleared (key is null) or our dashboard key is changed
      // We only reload if it's a genuine data change from another tab, NOT a reset we are currently handling.
      if (e.storageArea === localStorage && !isResetting) {
        if (!e.key || e.key.includes("finance_dashboard")) {
          window.location.reload();
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [isResetting]);



  // Keep stocksRef in sync so fetchLivePrices can read current stocks without depending on state.stocks
  useEffect(() => { stocksRef.current = state.stocks; }, [state.stocks]);

  // Derived settings from state for easier access
  const settings = state.settings || DEFAULT_STATE.settings;
  const { 
    darkMode, accentKey, density, sidebarNav, radiusKey, fontKey, bgStyle, animSpeed, chartStyle, geminiApiKey 
  } = settings;

  const logActivity = useCallback(async (actionType: string, description: string, metadata?: any) => {
    if (!session || !session.user?.id || session.user.id === "offline-user") return;
    try {
      await supabase.from("activity_logs").insert({
        user_id: session.user.id,
        action_type: actionType,
        description,
        metadata
      });
    } catch (e) {
      console.warn("Activity logging failed", e);
    }
  }, [session]);

  // Helper to update settings
  const updateSettings = useCallback(async (updates: Partial<typeof settings>) => {
    setState(s => ({
      ...s,
      settings: { ...(s.settings || DEFAULT_STATE.settings), ...updates }
    }));
    
    const userId = session?.user?.id;
    if (userId && userId !== "offline-user") {
      // Convert camelCase to snake_case for DB
      const dbUpdates: any = {};
      if (updates.darkMode !== undefined) dbUpdates.dark_mode = updates.darkMode;
      if (updates.accentKey !== undefined) dbUpdates.accent_key = updates.accentKey;
      if (updates.density !== undefined) dbUpdates.density = updates.density;
      if (updates.sidebarNav !== undefined) dbUpdates.sidebar_nav = updates.sidebarNav;
      if (updates.radiusKey !== undefined) dbUpdates.radius_key = updates.radiusKey;
      if (updates.fontKey !== undefined) dbUpdates.font_key = updates.fontKey;
      if (updates.bgStyle !== undefined) dbUpdates.bg_style = updates.bgStyle;
      if (updates.animSpeed !== undefined) dbUpdates.anim_speed = updates.animSpeed;
      if (updates.chartStyle !== undefined) dbUpdates.chart_style = updates.chartStyle;
      if (updates.emailEnabled !== undefined) dbUpdates.email_enabled = updates.emailEnabled;
      if (updates.emailFrequency !== undefined) dbUpdates.email_frequency = updates.emailFrequency;
      if (updates.emailDay !== undefined) dbUpdates.email_day = updates.emailDay;
      if (updates.emailHour !== undefined) dbUpdates.email_hour = updates.emailHour;
      if (updates.emailAddress !== undefined) dbUpdates.email_address = updates.emailAddress;
      if (updates.fromEmail !== undefined) dbUpdates.from_email = updates.fromEmail;
      if (updates.geminiApiKey !== undefined) dbUpdates.gemini_api_key = updates.geminiApiKey;

      const { error: settErr } = await supabase.from("user_settings").upsert({ user_id: userId, ...dbUpdates });
      if (settErr) console.error("updateSettings DB error:", settErr.message, dbUpdates);
    }

    // Log setting changes
    const keys = Object.keys(updates).join(", ");
    logActivity("UPDATE_SETTINGS", `Updated settings: ${keys}`, updates);
  }, [logActivity, session]);

  const updateMasterData = useCallback(async (key: string, newValue: any) => {
    let merged: any = null;
    setState(s => {
      merged = { ...(s.masterData || DEFAULT_MASTER_DATA), [key]: newValue };
      return { ...s, masterData: merged };
    });
    const userId = session?.user?.id;
    if (userId && userId !== "offline-user" && merged) {
      await supabase.from("user_settings").upsert({ user_id: userId, master_data: merged });
    }
  }, [session]);

  // Helper to update profile
  const updateProfile = useCallback(async (updates: any) => {
    setState(s => ({
      ...s,
      profile: { ...s.profile, ...updates }
    }));

    const userId = session?.user?.id;
    if (userId && userId !== "offline-user") {
      await supabase.from("profiles").upsert({ user_id: userId, ...updates });
    }
    logActivity("UPDATE_PROFILE", "Updated user profile", updates);
  }, [logActivity, session]);

  const updateDismissedAlerts = useCallback(async (newDismissed: Record<string, number>) => {
    let mergedMaster: any = null;
    setState(s => {
      mergedMaster = { ...(s.masterData || DEFAULT_MASTER_DATA), _dismissedAlerts: newDismissed };
      return {
        ...s,
        dismissedAlerts: newDismissed,
        masterData: mergedMaster
      };
    });

    const userId = session?.user?.id;
    if (userId && userId !== "offline-user" && mergedMaster) {
      const { error: settErr } = await supabase.from("user_settings").upsert({
        user_id: userId,
        master_data: mergedMaster
      });
      if (settErr) console.error("updateDismissedAlerts DB error:", settErr.message);
    }
  }, [session]);


  const [activeProfile, setActiveProfile] = useState<string>("all");
  const [toasts, setToasts] = useState<{id:string;msg:string;type:string}[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{message:string;onConfirm:()=>void}|null>(null);
  const showToast = useCallback((msg: string, type = "success") => {
    const id = uid();
    setToasts((prev) => [...prev, { id, msg, type }]);
    const duration = type === "error" ? 5500 : type === "warn" ? 4500 : 3500;
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  // 2. Aggressive Cleanup of Legacy Dummy Data
  useEffect(() => {
    if (isAuthChecking) return;
    const saved = loadState();
    const isDummy = (s: any) => {
      if (!s) return false;
      // Markers of the old MOCK_DATA
      return (Array.isArray(s.bankAccounts) && s.bankAccounts.some(b => b.id === "1" || b.id === "2")) || 
             (s.profile?.name === "Anand" && (!session || session.user.id === "offline-user"));
    };

    if (isDummy(saved)) {
      // Legacy dummy data detected — wipe
      localStorage.clear();
      sessionStorage.clear();
      setState(DEFAULT_STATE);
      // We don't reload here to avoid infinite loops if DEFAULT_STATE still looks 'dummy'
    }
  }, [session, isAuthChecking]);

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!error) setSession(session);
        setIsAuthChecking(false);
      }).catch(() => { setIsAuthChecking(false); });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      return () => subscription.unsubscribe();
    } catch (e) {
      console.warn("Supabase initialization failed", e);
      setIsAuthChecking(false);
    }
  }, []);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [fabModal, setFabModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [missingTables, setMissingTables] = useState<string[]>([]);

  // Apply theme CSS vars whenever darkMode, accentKey, or other UI settings change
  useEffect(() => {
    const vars = darkMode ? DARK_VARS : LIGHT_VARS;
    const palette = ACCENT_PALETTES[accentKey] || ACCENT_PALETTES.blue;
    const d = DENSITY[density] || DENSITY.normal;
    
    const radiuses = { sharp: "4px", modern: "12px", round: "24px" };
    const fonts = { 
      inter: "'Inter', sans-serif", 
      outfit: "'Outfit', sans-serif", 
      roboto: "'Roboto', sans-serif" 
    };
    const anims = { snappy: "0.15s", smooth: "0.4s", relaxed: "0.8s" };
    
    const merged = { 
      ...vars, 
      "--t-accent": darkMode ? palette.dark : palette.light,
      "--card-pad": `${d.cardPad}px`,
      "--app-font-size": `${d.fontSize}px`,
      "--section-gap": `${d.sectionGap}px`,
      "--t-radius": radiuses[radiusKey] || "12px",
      "--t-font": fonts[fontKey] || "'Inter', sans-serif",
      "--t-transition": `${anims[animSpeed] || "0.4s"} cubic-bezier(0.4, 0, 0.2, 1)`,
      "--t-card-bg": vars["--t-darkInk"],
      "--t-card-shadow": darkMode 
        ? "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)" 
        : "0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02), inset 0 1px 0 rgba(255,255,255,0.8)",
      "--t-card-blur": "none",
      "--t-card-border": `1px solid ${vars["--t-line"]}`,
    };

    Object.entries(merged).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v)
    );
    // Drive the CSS class-based dark theme so styles.css vars activate
    document.documentElement.classList.toggle("dark-theme", darkMode);
    document.body.classList.toggle("dark-theme", darkMode);
  }, [darkMode, accentKey, density, sidebarNav, radiusKey, fontKey, bgStyle, animSpeed, chartStyle]);

  // Background style (dots / mesh) injected dynamically since it depends on user setting
  useEffect(() => {
    const bgMap = {
      dots: "radial-gradient(circle, var(--t-line) 1.5px, transparent 1.5px)",
      mesh: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 7%, transparent) 0%, transparent 100%)",
      plain: "none",
    };
    document.body.style.setProperty("background-image", bgMap[bgStyle] || "none", "important");
    document.body.style.setProperty("background-size", bgStyle === "dots" ? "24px 24px" : "auto", "important");
    document.body.style.setProperty("background-attachment", "fixed", "important");
  }, [bgStyle]);

  // Always save to localStorage on every state change (works offline + demo mode)
  useEffect(() => {
    if (!loaded) return;
    saveStateLocal(state);
  }, [state, loaded]);

  const snakeToCamel = useCallback((obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(snakeToCamel);
    const res: any = {};
    for (const k in obj) {
      const camel = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      res[camel] = obj[k] !== null && typeof obj[k] === 'object' ? snakeToCamel(obj[k]) : obj[k];
    }
    return res;
  }, []);

  const fetchAllData = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || userId === "offline-user") return;

    try {
      const [
        prof, sett, banks, txns, mfs, stks, demats, fds, rds, bnds, pn, ccs, pcs, lns, gls, bdgts, subs, rems,
        licP, termP, investP, infLns, rentP, sipsQ, stSells, mfSells, nwh, corpAct, taxP, incomeQ, recExp
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("bank_accounts").select("*").eq("user_id", userId),
        supabase.from("transactions").select("*").eq("user_id", userId),
        supabase.from("mutual_funds").select("*").eq("user_id", userId),
        supabase.from("stocks").select("*").eq("user_id", userId),
        supabase.from("demat_accounts").select("*").eq("user_id", userId),
        supabase.from("fixed_deposits").select("*").eq("user_id", userId),
        supabase.from("recurring_deposits").select("*").eq("user_id", userId),
        supabase.from("bonds").select("*").eq("user_id", userId),
        supabase.from("ppf_nps").select("*").eq("user_id", userId),
        supabase.from("credit_cards").select("*").eq("user_id", userId),
        supabase.from("prepaid_cards").select("*").eq("user_id", userId),
        supabase.from("loans").select("*").eq("user_id", userId),
        supabase.from("goals").select("*").eq("user_id", userId),
        supabase.from("budgets").select("*").eq("user_id", userId),
        supabase.from("subscriptions").select("*").eq("user_id", userId),
        supabase.from("reminders").select("*").eq("user_id", userId),
        supabase.from("lic_policies").select("*").eq("user_id", userId),
        supabase.from("term_plans").select("*").eq("user_id", userId),
        supabase.from("investment_plans").select("*").eq("user_id", userId),
        supabase.from("informal_loans").select("*").eq("user_id", userId),
        supabase.from("rental_properties").select("*").eq("user_id", userId),
        supabase.from("sips").select("*").eq("user_id", userId),
        supabase.from("stock_sells").select("*").eq("user_id", userId),
        supabase.from("mf_sells").select("*").eq("user_id", userId),
        supabase.from("net_worth_history").select("*").eq("user_id", userId),
        supabase.from("corporate_actions").select("*").eq("user_id", userId),
        supabase.from("tax_payments").select("*").eq("user_id", userId),
        supabase.from("income_entries").select("*").eq("user_id", userId),
        supabase.from("recurring_expenses").select("*").eq("user_id", userId),
      ]);

      // Detect missing DB tables (code 42P01 = relation does not exist) and surface them in the UI
      const missing: string[] = [];
      if (corpAct.error?.code === "42P01") missing.push("corporate_actions");
      setMissingTables(missing); // always set (clears when table is found)

      const hasAnyData = [banks, txns, mfs, stks, demats, fds, rds, bnds, pn, ccs, pcs, lns, gls, bdgts, subs, rems, licP, termP, investP, infLns, rentP, sipsQ, stSells, mfSells, corpAct, taxP, incomeQ].some(r => r.data && r.data.length > 0);

      // Use functional setState so failed queries fall back to current state instead of wiping data
      setState(currentState => {
        if (!prof.data && !hasAnyData) {
          // Logged in but truly no cloud data — clear local state
          return DEFAULT_STATE;
        }
        return {
          ...currentState,
          ...(prof.data ? { profile: snakeToCamel(prof.data) } : {}),
          ...(sett.data ? {
            settings: snakeToCamel({ ...sett.data, master_data: undefined, dismissed_alerts: undefined }),
            ...(sett.data.master_data ? { masterData: { ...DEFAULT_MASTER_DATA, ...sett.data.master_data } } : {}),
          } : {}),
          ...(sett.data?.master_data?._dismissedAlerts ? { dismissedAlerts: sett.data.master_data._dismissedAlerts } : {}),
          // Only overwrite each array if the query succeeded (no error + data is not null)
          ...(!banks.error && banks.data != null ? { bankAccounts: snakeToCamel(banks.data) } : {}),
          ...(!txns.error && txns.data != null ? { transactions: snakeToCamel(txns.data) } : {}),
          ...(!mfs.error && mfs.data != null ? {
            // Normalize: DB uses `scheme`/`type` but UI form saves with `name`/`category`.
            // Always expose `name` and `category` so all display and search code works uniformly.
            mutualFunds: snakeToCamel(mfs.data).map((m: any) => ({
              ...m,
              name: m.name || m.scheme || "",
              category: m.category || m.type || "",
            }))
          } : {}),
          ...(!stks.error && stks.data != null ? { stocks: snakeToCamel(stks.data) } : {}),
          ...(!demats.error && demats.data != null ? { demat: snakeToCamel(demats.data) } : {}),
          ...(!fds.error && fds.data != null ? { fixedDeposits: snakeToCamel(fds.data) } : {}),
          ...(!rds.error && rds.data != null ? { recurringDeposits: snakeToCamel(rds.data) } : {}),
          ...(!bnds.error && bnds.data != null ? { bonds: snakeToCamel(bnds.data) } : {}),
          ...(!pn.error && pn.data != null ? {
            ppf: snakeToCamel(pn.data.filter(x => x.type === 'PPF')),
            nps: snakeToCamel(pn.data.filter(x => x.type === 'NPS')),
            epf: snakeToCamel(pn.data.filter(x => x.type === 'EPF')),
          } : {}),
          ...(!ccs.error && ccs.data != null ? { creditCards: snakeToCamel(ccs.data).map((c: any) => ({ ...c, limit: c.cardLimit ?? c.limit })) } : {}),
          ...(!pcs.error && pcs.data != null ? { prepaidCards: snakeToCamel(pcs.data) } : {}),
          ...(!lns.error && lns.data != null ? {
            loansTaken: snakeToCamel(lns.data.filter(x => !x.is_lent)),
            loansGiven: snakeToCamel(lns.data.filter(x => x.is_lent)),
          } : {}),
          ...(!gls.error && gls.data != null ? { goals: snakeToCamel(gls.data) } : {}),
          ...(!bdgts.error && bdgts.data != null ? { budgets: snakeToCamel(bdgts.data).map((b: any) => ({ ...b, monthly: b.monthlyLimit })) } : {}),
          ...(!subs.error && subs.data != null ? { subscriptions: snakeToCamel(subs.data) } : {}),
          ...(!rems.error && rems.data != null ? { reminders: snakeToCamel(rems.data).map((r: any) => ({ ...r, date: r.reminderDate })) } : {}),
          ...(!licP.error && licP.data != null ? { lic: snakeToCamel(licP.data) } : {}),
          ...(!termP.error && termP.data != null ? { termPlans: snakeToCamel(termP.data) } : {}),
          ...(!investP.error && investP.data != null ? { investmentPlans: snakeToCamel(investP.data) } : {}),
          ...(!infLns.error && infLns.data != null ? {
            informalBorrowed: snakeToCamel(infLns.data.filter(x => x.direction === 'borrowed')),
            informalLent: snakeToCamel(infLns.data.filter(x => x.direction === 'lent')),
          } : {}),
          ...(!rentP.error && rentP.data != null ? {
            rentalProperties: snakeToCamel(rentP.data.filter(x => x.property_type === 'out')).map((x: any) => ({ ...x, propertyType: x.propertyTypeDetail || 'shop' })),
            rentedProperties: snakeToCamel(rentP.data.filter(x => x.property_type === 'in')).map((x: any) => ({ ...x, propertyType: x.propertyTypeDetail || 'shop' })),
          } : {}),
          ...(!sipsQ.error && sipsQ.data != null ? { sips: snakeToCamel(sipsQ.data) } : {}),
          ...(!stSells.error && stSells.data != null ? { stockSells: snakeToCamel(stSells.data) } : {}),
          ...(!mfSells.error && mfSells.data != null ? { mfSells: snakeToCamel(mfSells.data) } : {}),
          ...(!nwh.error && nwh.data != null ? { netWorthHistory: snakeToCamel(nwh.data).map((r: any) => ({ month: r.month, netWorth: r.netWorth })) } : {}),
          ...(!corpAct.error && corpAct.data != null ? { 
            corporateActions: snakeToCamel(corpAct.data).filter((ca: any) => {
              const st = (!stks.error && stks.data != null) ? snakeToCamel(stks.data) : currentState.stocks;
              const sts = (!stSells.error && stSells.data != null) ? snakeToCamel(stSells.data) : currentState.stockSells;
              return st.some((s: any) => s.symbol === ca.symbol && s.exchange === ca.exchange) || sts.some((s: any) => s.symbol === ca.symbol && s.exchange === ca.exchange);
            }) 
          } : {}),
          ...(!taxP.error && taxP.data != null ? { taxPayments: snakeToCamel(taxP.data) } : {}),
          ...(!incomeQ.error && incomeQ.data != null ? { income: snakeToCamel(incomeQ.data) } : {}),
          ...(!recExp.error && recExp.data != null ? { recurringExpenses: snakeToCamel(recExp.data) } : {}),
        };
      });
    } catch (e) {
      console.error("Supabase load failed", e);
    }
  }, [session, snakeToCamel]);

  const fetchLivePrices = useCallback(async () => {
    const stocks = stocksRef.current;
    if (!stocks.length || fetchingRef.current) return;

    // Safety timeout to prevent getting stuck in "Updating..." state
    const timeout = setTimeout(() => {
      setFetchingPrices(false);
      fetchingRef.current = false;
    }, 30000);

    setFetchingPrices(true);
    fetchingRef.current = true;
    try {
      const groups = Object.values(
        stocks.reduce((acc: any, s: any) => {
          const exch = s.exchange || "NSE";
          const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
          acc[yfSym] = yfSym;
          return acc;
        }, {})
      );
      const res = await fetch(`/api/stock-price?symbols=${groups.join(",")}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const ts = Date.now();
      setMarketDataTs(ts);
      setMarketData((prev: any) => {
        const next = { ...prev, ...data };
        localStorage.setItem("finance_market_data", JSON.stringify({ ...next, _ts: ts }));
        return next;
      });

      // Sync metadata back to Supabase if missing or changed
      const userId = session?.user?.id;
      if (userId && userId !== "offline-user") {
        const updates = stocks.filter((s: any) => {
          const exch = s.exchange || "NSE";
          const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
          const md = data[yfSym];
          return md && (s.sector !== md.sector || Number(s.marketCap) !== Number(md.marketCap));
        });

        if (updates.length > 0) {
          const batchData = updates.map((s: any) => {
            const exch = s.exchange || "NSE";
            const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
            const md = data[yfSym];
            return {
              id: s.id,
              user_id: userId,
              sector: md.sector || null,
              market_cap: md.marketCap ? Number(md.marketCap) : null
            };
          });

          const { error } = await supabase.from("stocks").upsert(batchData, { onConflict: "id" });
          if (error) console.error("Batch metadata sync failed:", error.message);

          setState((s: any) => ({
            ...s,
            stocks: s.stocks.map((st: any) => {
              const up = updates.find((u: any) => u.id === st.id);
              if (!up) return st;
              const md = data[`${up.symbol.replace(/\.(NS|BO)$/i, "")}.${(up.exchange || "NSE") === "BSE" ? "BO" : "NS"}`];
              return { ...st, sector: md.sector || null, marketCap: md.marketCap ? String(md.marketCap) : null };
            })
          }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch live prices", e);
    } finally {
      clearTimeout(timeout);
      setFetchingPrices(false);
      fetchingRef.current = false;
    }
    // stocksRef keeps stocks current — removing state.stocks from deps prevents re-creation
    // after every metadata sync which would cause the useEffect below to re-fire unnecessarily
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial price fetch
  useEffect(() => {
    if (loaded && state.stocks.length > 0) {
      fetchLivePrices();
    }
  }, [loaded, state.stocks.length, fetchLivePrices]);


  // 1. Initial Load & Sync Refinement
  useEffect(() => {
    if (!session) {
      setLoaded(true);
      return;
    }
    const userId = session.user?.id;
    if (!userId || userId === "offline-user") {
      setLoaded(true);
      return;
    }

    (async () => {
      try {
        await fetchAllData();
      } catch (e) {
        console.error("Supabase load failed", e);
        showToast("Cloud fetch failed. Check your DB setup.", "error");
      } finally {
        setLoaded(true);
      }
    })();
  }, [fetchAllData, session, showToast]);


  // Global mouse tracker for Spotlight effect — throttled with rAF to avoid per-frame thrashing
  useEffect(() => {
    let rafId: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const cards = document.querySelectorAll('.spotlight-wrapper') as NodeListOf<HTMLElement>;
        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
          card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Keyboard shortcut for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCmdPalette(prev => !prev);
      }
      if (e.key === "Escape") {
        setShowCmdPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fire browser push notifications for upcoming reminders (runs once per session)
  useEffect(() => {
    if (!loaded || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const getNotificationIcon = (type: string) => {
      const icons: Record<string, string> = {
        credit:       "https://img.icons8.com/color/128/bank-card.png",
        subscription: "https://img.icons8.com/color/128/circular-arrows.png",
        reminder:     "https://img.icons8.com/color/128/bell.png",
        fd:           "https://img.icons8.com/color/128/piggy-bank.png",
        insurance:    "https://img.icons8.com/color/128/shield.png",
        loan:         "https://img.icons8.com/color/128/hand-with-money.png",
      };
      return icons[type] || "/logo.png";
    };

    // Read user's notification preferences
    let ns = { leadDays: 3, categories: { creditCards: true, subscriptions: true, reminders: true, fdMaturities: true, insurancePremiums: true, loanRecovery: true } };
    try { const s = localStorage.getItem("finance-notif-settings"); if (s) ns = { ...ns, ...JSON.parse(s) }; } catch {}
    const leadDays = ns.leadDays || 3;
    const cats = ns.categories || {};

    const todayStr = today();
    const soon: { title: string; body: string; type: string }[] = [];
    // Anchor both ends to midnight to avoid IST timezone off-by-one errors
    const daysLeft = (d: string) => Math.ceil((new Date(d + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000);
    const isDismissed = (title: string, ...alts: string[]) =>
      [title, ...alts].some(t => state.dismissedAlerts?.[t] > Date.now());

    if (cats.reminders !== false) {
      state.reminders.forEach((r) => {
        if (!r.date) return;
        const d = daysLeft(r.date);
        if (d >= 0 && d <= leadDays && !isDismissed(r.title)) {
          soon.push({ title: r.title, body: d === 0 ? "Due today!" : `Due in ${d} day${d !== 1 ? "s" : ""}`, type: "reminder" });
        }
      });
    }

    if (cats.creditCards !== false) {
      state.creditCards.filter((c) => (c.status || "").toLowerCase() !== "closed").forEach((c) => {
        const dueDate = getCCDueDate(c);
        if (!dueDate) return;
        const d = daysLeft(dueDate);
        if (d >= 0 && d <= leadDays && !isDismissed(`${c.issuer} bill due`, `${c.issuer} CC due in ${d}d`)) {
          soon.push({ title: `${c.issuer} bill due`, body: `${fmtINRFull(c.outstanding)} outstanding${d === 0 ? " — today!" : ` — ${d}d`}`, type: "credit" });
        }
      });
    }

    if (cats.subscriptions !== false) {
      state.subscriptions.filter((s) => s.renewalDate && !s.paused).forEach((s) => {
        const d = daysLeft(s.renewalDate);
        if (d >= 0 && d <= leadDays && !isDismissed(`${s.name} renewal`, `${s.name} renews in ${d}d`)) {
          soon.push({ title: `${s.name} renewal`, body: `${fmtINRFull(s.amount)} due${d === 0 ? " today" : ` in ${d}d`}`, type: "subscription" });
        }
      });
    }

    if (cats.fdMaturities !== false) {
      (state.fixedDeposits || []).forEach((f) => {
        if (!f.maturityDate) return;
        const d = daysLeft(f.maturityDate);
        const title = `FD Maturity — ${f.bank || f.bankName || "Bank"}`;
        if (d >= 0 && d <= leadDays && !isDismissed(title)) {
          soon.push({ title, body: `${fmtINRFull(f.principal)} matures${d === 0 ? " today" : ` in ${d}d`}`, type: "fd" });
        }
      });
    }

    if (cats.insurancePremiums !== false) {
      const allPolicies = [
        ...(state.lic || []).map((p: any) => ({ name: p.planName || "LIC Policy", start: p.commencementDate, premium: p.annualPremium })),
        ...(state.termPlans || []).map((p: any) => ({ name: p.planName || "Term Plan", start: p.startDate, premium: p.annualPremium })),
        ...(state.investmentPlans || []).map((p: any) => ({ name: p.planName || "Investment Plan", start: p.commencementDate, premium: p.annualPremium })),
      ];
      const todayD = new Date(todayStr + "T00:00:00");
      allPolicies.forEach((pol) => {
        if (!pol.premium || Number(pol.premium) <= 0 || !pol.start) return;
        const start = new Date(pol.start);
        if (isNaN(start.getTime())) return;
        let ann = new Date(todayD.getFullYear(), start.getMonth(), start.getDate());
        if (ann < todayD) ann = new Date(todayD.getFullYear() + 1, start.getMonth(), start.getDate());
        const d = daysLeft(getLocalDateString(ann));
        const title = `${pol.name} premium due`;
        if (d >= 0 && d <= leadDays && !isDismissed(title)) {
          soon.push({ title, body: `${fmtINRFull(pol.premium)}${d === 0 ? " — today!" : ` in ${d}d`}`, type: "insurance" });
        }
      });
    }

    if (cats.loanRecovery !== false) {
      (state.loansGiven || []).forEach((l: any) => {
        if (!l.dueDate) return;
        const d = daysLeft(l.dueDate);
        const title = `Loan Recovery — ${l.lender || l.name || "Borrower"}`;
        if (d >= 0 && d <= leadDays && !isDismissed(title)) {
          soon.push({ title, body: `${fmtINRFull(l.outstanding)} due${d === 0 ? " today" : ` in ${d}d`}`, type: "loan" });
        }
      });
    }

    soon.forEach(({ title, body, type }) => {
      try { new Notification(title, { body, icon: getNotificationIcon(type) }); } catch {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]); // intentionally omit other deps — runs once after initial load

  // Request browser notification permission once after first successful login
  useEffect(() => {
    if (!loaded || !session || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [loaded, session]);

  // Auto-snapshot: save net worth on the 1st of each month, or on first load if no snapshot exists yet for this month
  useEffect(() => {
    if (!loaded) return;
    const nowSnap = new Date();
    const ym = `${nowSnap.getFullYear()}-${String(nowSnap.getMonth() + 1).padStart(2, "0")}`;
    setState((s) => {
      // Keep existing snapshot unless today is the 1st (monthly refresh) or there's no entry yet
      const hasSnapshot = (s.netWorthHistory || []).some((h) => h.month === ym);
      if (hasSnapshot && nowSnap.getDate() > 1) return s;
      const nw = (() => {
        const cash = (s.bankAccounts || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const fd = (s.fixedDeposits || []).reduce((a, x) => a + Number(x.principal || 0), 0);
        const rd = (s.recurringDeposits || []).reduce((a, r) => {
          const m = monthsBetween(r.startDate, today());
          return a + Math.min(m, Number(r.tenureMonths || 0)) * Number(r.monthly || 0);
        }, 0);
        const bonds = (s.bonds || []).reduce((a, x) => a + Number(x.faceValue || 0), 0);
        const ppf = (s.ppf || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const nps = (s.nps || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const epf = (s.epf || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const lic = (s.lic || []).reduce((a, x) => {
          const txTotal = (x.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
          return a + (txTotal > 0 ? txTotal : Number(x.premiumPaid || 0));
        }, 0);
        const mf = (s.mutualFunds || []).reduce((a, x) => {
          const liveNav = Number(x.currentNav || 0);
          const fallbackNav = liveNav || Number(x.buyNav || 0) || (Number(x.units || 1) > 0 ? Number(x.invested || 0) / Number(x.units || 1) : 0);
          return a + Number(x.units || 0) * fallbackNav;
        }, 0);
        const stocks = (s.stocks || []).reduce((a, x) => {
          const livePrice = Number(x.currentPrice || 0);
          const fallbackPrice = livePrice || Number(x.avgPrice || 0);
          return a + Number(x.qty || 0) * fallbackPrice;
        }, 0);
        const loansGiven = (s.loansGiven || []).reduce((a, x) => a + Number(x.outstanding || 0), 0);
        const prepaid = (s.prepaidCards || [])
          .filter((p: any) => (p.status || "").toLowerCase() !== "closed")
          .reduce((a, p) => {
            const txns = p.transactions || [];
            const loaded = txns.filter((t: any) => t.type === "load").reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
            const spent = txns.filter((t: any) => t.type === "spend").reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
            return a + (loaded - spent);
          }, 0);
        const rentedDepositAsset = (s.rentedProperties || []).reduce((a, p) => {
          const actualDeposit = p.depositTransactions && p.depositTransactions.length > 0
            ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
            : Number(p.securityDeposit || 0);
          const returned = Number(p.depositReturned || 0);
          return a + Math.max(0, actualDeposit - returned);
        }, 0);
        const informalLent = (s.informalLent || []).reduce((a, person) => {
          const tranches = person.tranches || [];
          const payments = person.payments || [];
          const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
          const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
          return a + Math.max(0, totalT - totalP);
        }, 0);

        const cc = (s.creditCards || [])
          .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
          .reduce((a, x) => a + Number(x.outstanding || 0), 0);
        const loansTaken = (s.loansTaken || []).reduce((a, x) => a + Number(x.outstanding || 0), 0);
        const rentalDepositLiability = (s.rentalProperties || []).reduce((a, p) => {
          const actualDeposit = p.depositTransactions && p.depositTransactions.length > 0
            ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
            : Number(p.securityDeposit || 0);
          const deducted = (p.depositDeductions || []).reduce((ad, d) => ad + Number(d.amount || 0), 0);
          const returned = Number(p.depositReturned || 0);
          return a + Math.max(0, actualDeposit - deducted - returned);
        }, 0);
        const informalBorrowed = (s.informalBorrowed || []).reduce((a, person) => {
          const tranches = person.tranches || [];
          const payments = person.payments || [];
          const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
          const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
          return a + Math.max(0, totalT - totalP);
        }, 0);

        const assets = cash + fd + rd + bonds + ppf + nps + epf + lic + mf + stocks + loansGiven + prepaid + rentedDepositAsset + informalLent;
        const liabilities = cc + loansTaken + rentalDepositLiability + informalBorrowed;
        return assets - liabilities;
      })();
      const history = (s.netWorthHistory || []).filter((h) => h.month !== ym);
      const newHistory = [...history, { month: ym, netWorth: nw }].slice(-36);
      // Persist current month's snapshot to Supabase
      const uid2 = session?.user?.id;
      if (uid2 && uid2 !== "offline-user") {
        supabase.from("net_worth_history").upsert({ user_id: uid2, month: ym, net_worth: nw }, { onConflict: "user_id,month" }).then(() => {});
      }
      return { ...s, netWorthHistory: newHistory };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]); // intentionally omit other deps — runs once after initial load

  // Auto-advance overdue subscription renewal dates based on their billing cycle
  useEffect(() => {
    if (!loaded) return;
    const todayD = new Date(today());
    const toAdvance = state.subscriptions.filter((s: any) => {
      if (!s.renewalDate || s.paused) return false;
      return new Date(s.renewalDate) < todayD;
    });
    if (toAdvance.length === 0) return;
    toAdvance.forEach((s: any) => {
      let d = new Date(s.renewalDate);
      // Advance until the renewal date is in the future
      while (d < todayD) {
        if (s.cycle === "yearly") d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
        else if (s.cycle === "quarterly") d = new Date(d.getFullYear(), d.getMonth() + 3, d.getDate());
        else d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }
      const newDate = getLocalDateString(d);
      updateItem("subscriptions", s.id, { renewalDate: newDate });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const filteredState = useMemo(() => {
    if (activeProfile === "all") return state;
    const filterByOwner = (arr: any[]) => (Array.isArray(arr) ? arr : []).filter((item) => item.owner === activeProfile);
    return {
      ...state,
      bankAccounts: filterByOwner(state.bankAccounts),
      transactions: filterByOwner(state.transactions),
      fixedDeposits: filterByOwner(state.fixedDeposits),
      recurringDeposits: filterByOwner(state.recurringDeposits),
      bonds: filterByOwner(state.bonds),
      ppf: filterByOwner(state.ppf),
      nps: filterByOwner(state.nps),
      epf: filterByOwner(state.epf),
      lic: filterByOwner(state.lic),
      termPlans: filterByOwner(state.termPlans),
      investmentPlans: filterByOwner(state.investmentPlans),
      mutualFunds: filterByOwner(state.mutualFunds),
      stocks: filterByOwner(state.stocks),
      demat: filterByOwner(state.demat),
      creditCards: filterByOwner(state.creditCards),
      prepaidCards: filterByOwner(state.prepaidCards),
      loansTaken: filterByOwner(state.loansTaken),
      loansGiven: filterByOwner(state.loansGiven),
      informalBorrowed: filterByOwner(state.informalBorrowed || []),
      informalLent: filterByOwner(state.informalLent || []),
      rentalProperties: filterByOwner(state.rentalProperties || []),
      rentedProperties: filterByOwner(state.rentedProperties || []),
      subscriptions: filterByOwner(state.subscriptions),
      goals: filterByOwner(state.goals),
      income: filterByOwner(state.income),
      taxPayments: filterByOwner(state.taxPayments),
      budgets: filterByOwner(state.budgets),
      recurringExpenses: filterByOwner(state.recurringExpenses || []),
      sips: filterByOwner(state.sips),
      stockSells: filterByOwner(state.stockSells || []),
      mfSells: filterByOwner(state.mfSells || []),
      corporateActions: filterByOwner(state.corporateActions || []),
    };
  }, [state, activeProfile]);

  // ================== COMPUTED FINANCIAL METRICS ==================
  const metrics = useMemo(() => {
    const sState = filteredState;
    const cashInBanks = (sState.bankAccounts || []).reduce(
      (s, a) => s + Number(a.balance || 0),
      0
    );
    const fdValue = sState.fixedDeposits.reduce(
      (s, f) => s + Number(f.principal || 0),
      0
    );
    const rdValue = sState.recurringDeposits.reduce((s, r) => {
      const m = monthsBetween(r.startDate, today());
      return (
        s + Math.min(m, Number(r.tenureMonths || 0)) * Number(r.monthly || 0)
      );
    }, 0);
    const bondValue = sState.bonds.reduce(
      (s, b) => s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
      0
    );
    const ppfValue = sState.ppf.reduce((s, p) => s + Number(p.balance || 0), 0);
    const npsValue = sState.nps.reduce((s, n) => s + Number(n.balance || 0), 0);
    const epfValue = (sState.epf || []).reduce((s, e) => s + Number(e.balance || 0), 0);
    const licValue = sState.lic.reduce(
      (s, l) => {
        const txTotal = (l.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
      },
      0
    );
    const investmentValue = sState.investmentPlans.reduce(
      (s, ip) => {
        const txTotal = (ip.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
      },
      0
    );
    const mfValue = sState.mutualFunds.reduce((s, m) => {
      const liveNav = Number(m.currentNav || 0);
      const fallbackNav = liveNav || Number(m.buyNav || 0) || (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
      return s + Number(m.units || 0) * fallbackNav;
    }, 0);
    const mfInvested = sState.mutualFunds.reduce(
      (s, m) => s + (m.buyNav ? Number(m.units || 0) * Number(m.buyNav || 0) : Number(m.invested || 0)),
      0
    );
    const stockValue = sState.stocks.reduce((s, st) => {
      const yfSym = `${st.symbol.replace(/\.(NS|BO)$/i, "")}.${(st.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
      const md = marketData[yfSym];
      const livePrice = md?.price ?? Number(st.currentPrice || 0);
      const fallbackPrice = livePrice || Number(st.avgPrice || 0);
      return s + Number(st.qty || 0) * fallbackPrice;
    }, 0);
    const stockInvested = sState.stocks.reduce(
      (s, st) => s + Number(st.qty || 0) * Number(st.avgPrice || 0),
      0
    );

    const loansGivenValue = sState.loansGiven.reduce(
      (s, l) => s + Number(l.outstanding || 0),
      0
    );
    const prepaidValue = sState.prepaidCards
      .filter((p) => (p.status || "").toLowerCase() !== "closed")
      .reduce((s, p) => {
        const txns = p.transactions || [];
        const loaded = txns.filter((t: any) => t.type === "load").reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const spent = txns.filter((t: any) => t.type === "spend").reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        return s + (loaded - spent);
      }, 0);

    const ccOutstanding = sState.creditCards
      .filter((c) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s, c) => s + Number(c.outstanding || 0), 0);
    const loansTakenValue = sState.loansTaken.reduce(
      (s, l) => s + Number(l.outstanding || 0),
      0
    );
    const rentalDepositLiability = (sState.rentalProperties || []).reduce((s, p) => {
      const actualDeposit = p.depositTransactions && p.depositTransactions.length > 0
        ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
        : Number(p.securityDeposit || 0);
      const deducted = (p.depositDeductions || []).reduce((a, d) => a + Number(d.amount || 0), 0);
      const returned = Number(p.depositReturned || 0);
      return s + Math.max(0, actualDeposit - deducted - returned);
    }, 0);
    const rentedDepositAsset = (sState.rentedProperties || []).reduce((s, p) => {
      const actualDeposit = p.depositTransactions && p.depositTransactions.length > 0
        ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
        : Number(p.securityDeposit || 0);
      const returned = Number(p.depositReturned || 0);
      return s + Math.max(0, actualDeposit - returned);
    }, 0);

    const informalLentValue = (sState.informalLent || []).reduce((s, person) => {
      const tranches = person.tranches || [];
      const payments = person.payments || [];
      const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      return s + Math.max(0, totalT - totalP);
    }, 0);

    const informalBorrowedValue = (sState.informalBorrowed || []).reduce((s, person) => {
      const tranches = person.tranches || [];
      const payments = person.payments || [];
      const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      return s + Math.max(0, totalT - totalP);
    }, 0);

    const totalAssets =
      cashInBanks +
      fdValue +
      rdValue +
      bondValue +
      ppfValue +
      npsValue +
      epfValue +
      licValue +
      investmentValue +
      mfValue +
      stockValue +
      loansGivenValue +
      prepaidValue +
      rentedDepositAsset +
      informalLentValue;
    const totalLiabilities = ccOutstanding + loansTakenValue + rentalDepositLiability + informalBorrowedValue;
    const netWorth = totalAssets - totalLiabilities;

    // Income/Expense current month
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const monthTxns = sState.transactions.filter(
      (t) => t.date && t.date.startsWith(ym)
    );
    const monthIncome = monthTxns
      .filter((t) => t.type === "credit")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const rentPaidThisMonth = (sState.rentedProperties || []).reduce((sum, p) => {
      const paymentsThisMonth = (p.payments || [])
        .filter((pay: any) => pay.date && pay.date.startsWith(ym))
        .reduce((s, pay: any) => s + Number(pay.amount || 0), 0);
      return sum + paymentsThisMonth;
    }, 0);

    const monthExpense = monthTxns
      .filter((t) => t.type === "debit")
      .reduce((s, t) => s + Number(t.amount || 0), 0) + rentPaidThisMonth;

    // Annual income from income ledger
    const fyStart = new Date(`${sState.profile.fy.split("-")[0]}-04-01`);
    const explicitIncome = sState.income
      .filter((i) => new Date(i.date) >= fyStart)
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const txnIncome = sState.transactions
      .filter((t) => t.type === "credit" && t.date && new Date(t.date) >= fyStart)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const annualizedCurrentMonth = (monthIncome || 0) * 12;
    // Prefer explicit ledger → FY-to-date credit txns → annualised single month (least accurate)
    const annualIncome = explicitIncome || txnIncome || annualizedCurrentMonth || 0;

    const subTotal = sState.subscriptions.filter(sub => !sub.paused).reduce((s, sub) => {
      const m =
        sub.cycle === "yearly"
          ? Number(sub.amount || 0) / 12
          : sub.cycle === "quarterly"
          ? Number(sub.amount || 0) / 3
          : Number(sub.amount || 0);
      return s + m;
    }, 0);

    const liquidAssets = cashInBanks + mfValue + stockValue;
    const lockedAssets = fdValue + rdValue + bondValue + ppfValue + npsValue + epfValue + licValue + investmentValue;
    const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

    // FOIR: total monthly EMI / monthly income — safe lending threshold is <40%
    // Only include active loans (monthsRemaining unset OR > 0; explicitly 0 means fully paid)
    const totalMonthlyEMI = (sState.loansTaken || [])
      .filter((l: any) => Number(l.monthsRemaining || 1) > 0)
      .reduce((s, l) => s + Number(l.emi || 0), 0);
    const foir = monthIncome > 0 ? (totalMonthlyEMI / monthIncome) * 100 : 0;

    // Credit utilization: cc outstanding / cc total limit
    const totalCCLimit = (sState.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s, c) => s + Number((c as any).limit || (c as any).cardLimit || 0), 0);
    const creditUtilization = totalCCLimit > 0 ? (ccOutstanding / totalCCLimit) * 100 : 0;

    // Bug fix: new regime FY 2025-26 applies ₹75,000 standard deduction before slab computation
    const taxDue = sState.profile.regime === "old"
      ? calcTaxOld(annualIncome).total
      : calcTaxNew(Math.max(0, annualIncome - 75000)).total;

    const expenseBreakdownMap = monthTxns
      .filter((t) => t.type === "debit")
      .reduce((acc, t) => {
        const cat = t.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
        return acc;
      }, {});

    // Add rental-ledger rent only when there are no "Rent"-categorised debit transactions
    // for the month. If the user already logged rent in the bank transactions tab, adding
    // rentPaidThisMonth on top would double-count the same outflow.
    if (rentPaidThisMonth > 0 && !expenseBreakdownMap["Rent"]) {
      expenseBreakdownMap["Rent"] = rentPaidThisMonth;
    }

    const expenseBreakdown = Object.keys(expenseBreakdownMap).map((k) => ({
      name: k,
      value: expenseBreakdownMap[k],
    })).sort((a, b) => b.value - a.value);

    const portfolioPerformance = [
      { name: "Mutual Funds", Invested: mfInvested, Current: mfValue },
      { name: "Stocks", Invested: stockInvested, Current: stockValue },
    ].filter(x => x.Invested > 0 || x.Current > 0);

    const totalGoalTarget = sState.goals.reduce((s, g) => s + Number(g.targetAmount || 0), 0);
    const totalGoalSaved = sState.goals.reduce((s, g) => s + Number(g.currentAmount || 0), 0);
    const totalGoalRemaining = Math.max(0, totalGoalTarget - totalGoalSaved);
    const overallGoalPct = totalGoalTarget > 0 ? (totalGoalSaved / totalGoalTarget) * 100 : 0;
    const goalsCompleted = sState.goals.filter(g => Number(g.targetAmount) > 0 && Number(g.currentAmount) >= Number(g.targetAmount)).length;
    return {
      cashInBanks,
      fdValue,
      rdValue,
      bondValue,
      ppfValue,
      npsValue,
      epfValue,
      licValue,
      investmentValue,
      mfValue,
      mfInvested,
      stockValue,
      stockInvested,
      ccOutstanding,
      loansTakenValue,
      loansGivenValue,
      prepaidValue,
      rentalDepositLiability,
      rentedDepositAsset,
      totalAssets,
      totalLiabilities,
      netWorth,
      monthIncome,
      monthExpense,
      annualIncome,
      subTotal,
      mfPnL: mfValue - mfInvested,
      stockPnL: stockValue - stockInvested,
      liquidAssets,
      lockedAssets,
      savingsRate,
      debtToAssetRatio,
      taxDue,
      expenseBreakdown,
      portfolioPerformance,
      totalGoalTarget,
      totalGoalSaved,
      totalGoalRemaining,
      overallGoalPct,
      goalsCompleted,
      totalMonthlyEMI,
      foir,
      totalCCLimit,
      creditUtilization,
      stockSectorBreakdown: (() => {
        const sectors: Record<string, number> = {};
        sState.stocks.forEach((s: any) => {
          const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
          const md = marketData[yfSym];
          const sector = md?.sector || "Others";
          const price = md?.price ?? Number(s.currentPrice || 0);
          const value = Number(s.qty || 0) * price;
          sectors[sector] = (sectors[sector] || 0) + value;
        });
        return Object.entries(sectors)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
      })(),
      stockCapBreakdown: (() => {
        const caps: Record<string, number> = { "Large Cap": 0, "Mid Cap": 0, "Small Cap": 0, "Micro Cap": 0 };
        sState.stocks.forEach((s: any) => {
          const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
          const md = marketData[yfSym];
          const mCap = Number(md?.marketCap || 0);
          const price = md?.price ?? Number(s.currentPrice || 0);
          const value = Number(s.qty || 0) * price;
          
          // Cap Definitions (INR)
          // 1 Cr = 10,000,000
          // Large Cap: > 20,000 Cr = 200,000,000,000
          // Mid Cap: 5,000 Cr - 20,000 Cr
          // Small Cap: 500 Cr - 5,000 Cr
          // Micro Cap: < 500 Cr
          if (mCap >= 200000000000) caps["Large Cap"] += value;
          else if (mCap >= 50000000000) caps["Mid Cap"] += value;
          else if (mCap >= 5000000000) caps["Small Cap"] += value;
          else caps["Micro Cap"] += value;
        });
        return Object.entries(caps)
          .map(([name, value]) => ({ name, value }))
          .filter(c => c.value > 0);
      })(),
    };
  }, [filteredState, marketData]);

  const assetBreakdown = useMemo(
    () =>
      [
        { name: "Bank Cash", value: metrics.cashInBanks },
        { name: "Fixed Deposits", value: metrics.fdValue },
        { name: "Recurring Deposits", value: metrics.rdValue },
        { name: "Mutual Funds", value: metrics.mfValue },
        { name: "Stocks", value: metrics.stockValue },
        { name: "PPF", value: metrics.ppfValue },
        { name: "NPS", value: metrics.npsValue },
        { name: "EPF", value: metrics.epfValue },
        { name: "Bonds", value: metrics.bondValue },
        { name: "LIC", value: metrics.licValue },
        { name: "Investment Plans", value: metrics.investmentValue },
        { name: "Loans Given", value: metrics.loansGivenValue },
      ].filter((x) => x.value > 0),
    [metrics]
  );

  // Monthly trend for last 12 months — mirrors monthExpense by including rental payments
  const trendData = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en-IN", { month: "short" });
      const txns = filteredState.transactions.filter(
        (t) => t.date && t.date.startsWith(ym)
      );
      const inc = txns
        .filter((t) => t.type === "credit")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const txnExp = txns
        .filter((t) => t.type === "debit")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      // Include rent paid via rental ledger (rentedProperties.payments) so the
      // trend chart stays consistent with the monthExpense metric on the dashboard.
      const rentExp = (filteredState.rentedProperties || []).reduce((sum, p) => {
        return sum + (p.payments || [])
          .filter((pay: any) => pay.date && pay.date.startsWith(ym))
          .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
      }, 0);
      const exp = txnExp + rentExp;
      arr.push({ month: label, income: inc, expense: exp, net: inc - exp });
    }
    return arr;
  }, [filteredState.transactions, filteredState.rentedProperties]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    const name = state.profile?.name || "there";
    
    const now = Date.now();
    const day = 86400000;
    let currentWeek = 0;
    let prevWeek = 0;
    filteredState.transactions.filter(t => t.type === "debit" && t.date).forEach(t => {
      const diff = now - new Date(t.date).getTime();
      if (diff <= 7 * day && diff >= 0) currentWeek += Number(t.amount);
      else if (diff <= 14 * day && diff > 7 * day) prevWeek += Number(t.amount);
    });
    
    let spendInsight = "";
    if (prevWeek > 0) {
      const pct = Math.abs((currentWeek - prevWeek) / prevWeek) * 100;
      if (currentWeek < prevWeek) spendInsight = `Your spending is down ${pct.toFixed(0)}% this week.`;
      else if (currentWeek > prevWeek + 500) spendInsight = `Your spending is up ${pct.toFixed(0)}% this week.`;
    } else if (currentWeek > 0) {
      spendInsight = `You've spent ${fmtINR(currentWeek)} this week.`;
    }
    
    return { title: `Good ${timeOfDay}, ${name}.`, subtitle: spendInsight };
  }, [filteredState.transactions, state.profile]);

  // ================== CRUD ==================
  // ================== ALERTS CENTRE ==================
  const alerts = useMemo(() => {
    const list: { level: "error"|"warn"|"info"; title: string; detail: string; tab: string }[] = [];
    const now = new Date();
    // Over-budget categories
    const ym = now.toISOString().slice(0, 7);
    const monthSpend: Record<string, number> = {};
    state.transactions.filter((t) => t.date && t.date.startsWith(ym) && t.type === "debit").forEach((t) => {
      const cat = t.category || "Uncategorized";
      monthSpend[cat] = (monthSpend[cat] || 0) + Number(t.amount || 0);
    });
    state.budgets.forEach((b) => {
      const spent = monthSpend[b.category] || 0;
      if (spent > Number(b.monthly || 0)) {
        list.push({ level: "error", title: `${b.category} over budget`, detail: `Spent ${fmtINRFull(spent)} vs budget ${fmtINRFull(b.monthly)}`, tab: "budget" });
      }
    });
    // CC due in ≤10 days — anchor both ends to local midnight to avoid IST timezone off-by-one
    const todayMidnight = new Date(today() + "T00:00:00").getTime();
    state.creditCards.filter((c) => (c.status || "").toLowerCase() !== "closed").forEach((c) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) {
        const days = Math.ceil((new Date(dueDate + "T00:00:00").getTime() - todayMidnight) / 86400000);
        if (days >= 0 && days <= 5) list.push({ level: "error", title: `${c.issuer} CC due in ${days}d`, detail: `Outstanding: ${fmtINRFull(c.outstanding)}`, tab: "credit" });
        else if (days > 5 && days <= 10) list.push({ level: "warn", title: `${c.issuer} CC due in ${days}d`, detail: `Outstanding: ${fmtINRFull(c.outstanding)}`, tab: "credit" });
      }
    });
    // Goals behind schedule
    state.goals.forEach((g) => {
      const progress = Number(g.targetAmount) ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0;
      if (g.targetDate) {
        const totalM = monthsBetween(today(), g.targetDate);
        const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
        const totalDuration = elapsed + totalM;
        const expectedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
        if (progress < expectedPct - 10) list.push({ level: "warn", title: `Goal "${g.name}" behind schedule`, detail: `${progress.toFixed(0)}% saved, expected ${expectedPct.toFixed(0)}%`, tab: "goals" });
      }
    });
    // Advance tax upcoming (within 30 days)
    // FY runs Apr–Mar, so Q4 (15 Mar) is always in fyStart+1 year
    const advFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const advDates = [`${advFyStart}-06-15`, `${advFyStart}-09-15`, `${advFyStart}-12-15`, `${advFyStart + 1}-03-15`];
    advDates.forEach((d) => {
      const days = Math.ceil((new Date(d).getTime() - now.getTime()) / 86400000);
      if (days >= 0 && days <= 30) list.push({ level: "info", title: `Advance tax due on ${d}`, detail: "Log payment in Tax Vault", tab: "tax" });
    });
    // Low emergency fund
    if (metrics.monthExpense > 0 && metrics.cashInBanks / metrics.monthExpense < 3) {
      list.push({ level: "warn", title: "Low emergency fund", detail: `Only ${(metrics.cashInBanks / metrics.monthExpense).toFixed(1)} months of expenses in bank`, tab: "banks" });
    }
    // Subscription renewals in ≤7 days
    state.subscriptions.filter((s) => s.renewalDate && !s.paused).forEach((s) => {
      const days = Math.ceil((new Date(s.renewalDate).getTime() - now.getTime()) / 86400000);
      if (days >= 0 && days <= 7) list.push({ level: "info", title: `${s.name} renews in ${days}d`, detail: fmtINRFull(s.amount), tab: "subs" });
    });
    // Credit card utilization — compute from state (unfiltered) for consistent alert coverage
    const totalCCLimitForAlert = state.creditCards
      .filter((c) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s, c) => s + Number((c as any).limit || (c as any).cardLimit || 0), 0);
    const ccOutstandingForAlert = state.creditCards
      .filter((c) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s, c) => s + Number(c.outstanding || 0), 0);
    if (totalCCLimitForAlert > 0 && ccOutstandingForAlert > 0) {
      const util = (ccOutstandingForAlert / totalCCLimitForAlert) * 100;
      if (util > 75) list.push({ level: "error", title: `Credit utilization at ${util.toFixed(0)}%`, detail: `${fmtINRFull(ccOutstandingForAlert)} used of ${fmtINRFull(totalCCLimitForAlert)} limit — may hurt credit score`, tab: "credit" });
      else if (util > 40) list.push({ level: "warn", title: `Credit utilization ${util.toFixed(0)}%`, detail: "Keep utilization below 30% to protect your credit score", tab: "credit" });
    }
    // FOIR: use unfiltered household income + unfiltered loans for a consistent household metric
    const unfilteredMonthlyIncome = state.transactions
      .filter((t) => t.date && t.date.startsWith(ym) && t.type === "credit")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalEMIForAlert = state.loansTaken
      .filter((l) => Number(l.monthsRemaining || 1) > 0)
      .reduce((s, l) => s + Number(l.emi || 0), 0);
    if (unfilteredMonthlyIncome > 0 && totalEMIForAlert > 0) {
      const foirPct = (totalEMIForAlert / unfilteredMonthlyIncome) * 100;
      if (foirPct > 50) list.push({ level: "error", title: `EMI burden ${foirPct.toFixed(0)}% of income`, detail: `${fmtINRFull(totalEMIForAlert)}/mo EMIs is very high — severe cash flow risk`, tab: "credit" });
      else if (foirPct > 40) list.push({ level: "warn", title: `High FOIR: ${foirPct.toFixed(0)}%`, detail: "EMI payments exceed 40% of monthly income — reduce debt", tab: "credit" });
    }
    // Net worth MoM drop alert
    const nwHistory = state.netWorthHistory || [];
    if (nwHistory.length >= 2) {
      const sorted = [...nwHistory].sort((a, b) => a.month < b.month ? -1 : 1);
      const prev = sorted[sorted.length - 2];
      const curr = sorted[sorted.length - 1];
      if (prev.netWorth > 0 && curr.netWorth < prev.netWorth) {
        const drop = prev.netWorth - curr.netWorth;
        const dropPct = (drop / prev.netWorth) * 100;
        if (dropPct > 5) list.push({ level: "warn", title: `Net worth dropped ${dropPct.toFixed(0)}% MoM`, detail: `Down ${fmtINRFull(drop)} vs last month`, tab: "analytics" });
      }
    }
    // Tax regime switch alert — if switching saves >₹5,000 suggest it
    if (metrics.annualIncome > 0) {
      const stdDedNew = 75000;
      const taxableNew = Math.max(0, metrics.annualIncome - stdDedNew);
      const taxNewAmt = calcTaxNew(taxableNew).total;
      const taxOldAmt = calcTaxOld(metrics.annualIncome, 50000).total;
      const saving = Math.abs(taxNewAmt - taxOldAmt);
      const betterRegime = taxOldAmt < taxNewAmt ? "Old" : "New";
      const currentRegime = state.profile?.regime === "old" ? "Old" : "New";
      if (saving > 5000 && betterRegime !== currentRegime) {
        list.push({ level: "info", title: `Switch to ${betterRegime} Regime — save ${fmtINRFull(saving)}`, detail: `${betterRegime} regime saves more for your income level. Check Tax Vault for details.`, tab: "tax" });
      }
    }
    // Insurance adequacy — recommend 10× annual income life cover
    const totalLifeCover = [...(state.termPlans || []), ...(state.lic || [])].reduce((s, p) => s + Number((p as any).coverAmount || (p as any).sumAssured || 0), 0);
    if (metrics.annualIncome > 0 && totalLifeCover > 0 && totalLifeCover < metrics.annualIncome * 10) {
      const shortfall = metrics.annualIncome * 10 - totalLifeCover;
      list.push({ level: "warn", title: "Under-insured: life cover below 10× income", detail: `Cover ${fmtINRFull(totalLifeCover)} vs recommended ${fmtINRFull(metrics.annualIncome * 10)}. Shortfall: ${fmtINRFull(shortfall)}`, tab: "insurance" });
    }
    // Low savings rate alert
    if (metrics.monthIncome > 0 && metrics.monthExpense > 0 && metrics.savingsRate < 10) {
      list.push({ level: "warn", title: `Low savings rate: ${metrics.savingsRate.toFixed(0)}%`, detail: `Saving only ${metrics.savingsRate.toFixed(0)}% of monthly income. Target 20%+ for long-term financial security.`, tab: "analytics" });
    }
    // Insurance premium due within 30 days
    // Compute next annual due date from the policy start date's anniversary
    const getNextAnniversary = (startDateStr: string): string | null => {
      if (!startDateStr) return null;
      const start = new Date(startDateStr);
      if (isNaN(start.getTime())) return null;
      const thisYear = new Date(now.getFullYear(), start.getMonth(), start.getDate());
      const candidate = thisYear <= now
        ? new Date(now.getFullYear() + 1, start.getMonth(), start.getDate())
        : thisYear;
      return getLocalDateString(candidate);
    };
    const allPolicies = [
      ...(state.lic || []).map((p: any) => ({ name: p.planName || "LIC Policy", start: p.commencementDate, premium: p.annualPremium, expiry: p.maturityDate })),
      ...(state.termPlans || []).map((p: any) => ({ name: p.planName || "Term Plan", start: p.startDate, premium: p.annualPremium, expiry: p.expiryDate })),
      ...(state.investmentPlans || []).map((p: any) => ({ name: p.planName || "Investment Plan", start: p.commencementDate, premium: p.annualPremium, expiry: p.maturityDate })),
    ];
    allPolicies.forEach((pol) => {
      if (!pol.premium || Number(pol.premium) <= 0) return;
      if (pol.expiry && new Date(pol.expiry) < now) return; // expired policy
      const nextDue = getNextAnniversary(pol.start);
      if (!nextDue) return;
      const daysToRenew = Math.ceil((new Date(nextDue).getTime() - now.getTime()) / 86400000);
      if (daysToRenew >= 0 && daysToRenew <= 30) {
        const lvl = daysToRenew <= 7 ? "error" : "warn";
        list.push({ level: lvl, title: `${pol.name} premium due in ${daysToRenew}d`, detail: `Annual premium: ${fmtINRFull(pol.premium)} — due on ${nextDue}`, tab: "insurance" });
      }
    });
    // Low bank balance alert — flag accounts below ₹5,000
    state.bankAccounts.forEach((acc: any) => {
      const bal = Number(acc.balance || 0);
      if (bal > 0 && bal < 5000) {
        list.push({ level: "warn", title: `Low balance: ${acc.bankName || "Bank account"}`, detail: `${fmtINRFull(bal)} remaining — consider topping up`, tab: "banks" });
      }
    });
    const ORDER = { error: 0, warn: 1, info: 2 };
    return list
      .filter(a => {
        const dismissUntil = state.dismissedAlerts?.[a.title];
        return !(dismissUntil && dismissUntil > Date.now());
      })
      .sort((a, b) => (ORDER[a.level] ?? 2) - (ORDER[b.level] ?? 2));
  }, [state.transactions, state.budgets, state.creditCards, state.goals, state.subscriptions, state.loansTaken, state.netWorthHistory, state.termPlans, state.lic, state.investmentPlans, state.bankAccounts, metrics.monthExpense, metrics.cashInBanks, metrics.monthIncome, metrics.annualIncome, metrics.savingsRate, state.dismissedAlerts, state.profile?.regime]);

  const TABLE_MAP: Record<string, string> = {
    bankAccounts: "bank_accounts", transactions: "transactions", mutualFunds: "mutual_funds",
    stocks: "stocks", demat: "demat_accounts", fixedDeposits: "fixed_deposits",
    recurringDeposits: "recurring_deposits", bonds: "bonds", ppf: "ppf_nps", nps: "ppf_nps", epf: "ppf_nps",
    creditCards: "credit_cards", prepaidCards: "prepaid_cards", loansTaken: "loans", loansGiven: "loans",
    goals: "goals", budgets: "budgets", subscriptions: "subscriptions", reminders: "reminders", recurringExpenses: "recurring_expenses",
    lic: "lic_policies", termPlans: "term_plans", investmentPlans: "investment_plans",
    informalBorrowed: "informal_loans", informalLent: "informal_loans",
    rentalProperties: "rental_properties", rentedProperties: "rental_properties",
    sips: "sips", stockSells: "stock_sells", mfSells: "mf_sells",
    corporateActions: "corporate_actions",
    taxPayments: "tax_payments",
    income: "income_entries",
  };

  const camelToSnake = (obj: any) => {
    const res: any = {};
    for (const k in obj) {
      const snake = k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
      res[snake] = obj[k];
    }
    return res;
  };

  const addItem = async (key, item) => {
    const userId = session?.user?.id;
    // Auto-assign owner so items satisfy the DB NOT NULL constraint on ppf_nps
    // and other tables, and appear correctly under the active profile filter.
    // Forms that already pass owner (e.g. bank accounts) take precedence.
    const ownerVal = item.owner || (activeProfile !== "all" ? activeProfile : "self");
    const itemWithOwner = { ...item, owner: ownerVal };

    let finalItem = camelToSnake(itemWithOwner);

    if (key === "ppf" || key === "nps" || key === "epf") finalItem.type = key.toUpperCase();
    if (key === "ppf") { finalItem.bank = item.institution || ""; delete finalItem.institution; }
    if (key === "epf") { finalItem.bank = item.employer || ""; delete finalItem.employer; finalItem.account_number = item.uan || ""; delete finalItem.uan; }
    if (key === "loansTaken") finalItem.is_lent = false;
    if (key === "loansGiven") finalItem.is_lent = true;
    if (key === "budgets") { finalItem.monthly_limit = item.monthly; delete finalItem.monthly; }
    if (key === "reminders") { finalItem.reminder_date = item.date; delete finalItem.date; }
    if (key === "mutualFunds") {
      // Form uses `name`/`category` but DB has `scheme NOT NULL`/`type`
      if (finalItem.name !== undefined) { finalItem.scheme = finalItem.name; delete finalItem.name; }
      if (finalItem.category !== undefined) { finalItem.type = finalItem.category; delete finalItem.category; }
    }
    if (key === "informalBorrowed") finalItem.direction = "borrowed";
    if (key === "informalLent") finalItem.direction = "lent";
    if (key === "rentalProperties" || key === "rentedProperties") {
      finalItem.property_type_detail = item.propertyType || "shop";
      finalItem.property_type = key === "rentalProperties" ? "out" : "in";
    }

    const newId = uid();
    setState((s) => ({ ...s, [key]: [...s[key], { id: newId, ...itemWithOwner }] }));
    
    if (userId && userId !== "offline-user") {
      const table = TABLE_MAP[key];
      if (table) {
        // Specific field mapping for various modules to match Supabase schema
        if (key === "creditCards") { finalItem.card_limit = item.limit; delete finalItem.limit; }
        if (key === "loansTaken" || key === "loansGiven") { finalItem.lender_borrower = item.lender; delete finalItem.lender; }

        const cleanItem = { id: newId, user_id: userId, ...finalItem };
        for (const k in cleanItem) {
          if (cleanItem[k] === "") cleanItem[k] = null;
          else if (NUMERIC_COLS.has(k) && typeof cleanItem[k] === "string" && cleanItem[k] !== null) {
            const parsed = parseFloat(cleanItem[k]);
            cleanItem[k] = isNaN(parsed) ? null : parsed;
          }
        }

        // Use upsert (INSERT ... ON CONFLICT DO UPDATE) so retries are idempotent.
        // If the first request reached Supabase but the response was lost, a plain INSERT
        // would fail with duplicate-key on retry. Upsert handles that safely.
        const isNetworkError = (msg?: string) =>
          !!(msg?.includes("Load failed") || msg?.includes("Failed to fetch") || msg?.includes("NetworkError") || msg?.includes("network"));

        const tryUpsert = () => supabase.from(table).upsert(cleanItem, { onConflict: "id" });

        let { error: firstErr } = await tryUpsert();

        if (!firstErr) {
          // Success on first try — nothing to do
        } else if (isNetworkError(firstErr.message)) {
          // Network blip — keep the item in UI (don't revert), retry silently in background
          showToast("Saved locally — syncing in background…", "warn");
          console.warn("[Supabase] Network error, will retry upsert in 8s", firstErr.message);
          setTimeout(async () => {
            const { error: retryErr } = await tryUpsert();
            if (!retryErr) {
              showToast("Synced to cloud!", "success");
            } else if (isNetworkError(retryErr.message)) {
              // Second attempt also failed — try one final time after 20 more seconds
              setTimeout(async () => {
                const { error: finalErr } = await tryUpsert();
                if (finalErr) {
                  console.error("[Supabase] All upsert attempts failed:", finalErr);
                  showToast("Sync failed after 3 attempts — item kept locally. Reload to retry.", "error");
                }
              }, 20000);
            } else {
              console.error("[Supabase] Upsert retry failed (schema/auth):", retryErr);
              showToast(`Sync error: ${retryErr.message}`, "error");
              setState((s) => ({ ...s, [key]: s[key].filter((x: any) => x.id !== newId) }));
            }
          }, 8000);
        } else if (firstErr.code === "PGRST204") {
          // Column missing in DB schema — strip the bad column(s) and retry
          let retryItem: any = { ...cleanItem };
          let currentErr: any = firstErr;
          const stripped: string[] = [];
          while (currentErr?.code === "PGRST204") {
            const match = currentErr.message?.match(/Could not find the '(\w+)' column/);
            const badCol = match ? match[1] : null;
            if (!badCol || retryItem[badCol] === undefined) break;
            delete retryItem[badCol];
            stripped.push(badCol);
            const { error: retryErr } = await supabase.from(table).upsert(retryItem, { onConflict: "id" });
            currentErr = retryErr || null;
          }
          if (!currentErr) {
            console.warn(`[Supabase] Saved without missing cols: ${stripped.join(", ")} — run SQL migration to sync all fields`);
            showToast(`⚠️ Saved but ${stripped.join(", ")} was not stored — DB column missing. Run SQL migration.`, "warn");
          } else if (isNetworkError(currentErr.message)) {
            showToast("Saved locally — syncing in background…", "warn");
          } else {
            console.error(`Supabase Upsert Error (${table}):`, currentErr);
            showToast(`Sync failed [${currentErr.code}]: ${currentErr.message}`, "error");
            setState((s) => ({ ...s, [key]: s[key].filter((x: any) => x.id !== newId) }));
          }
        } else if (firstErr.code === "42P01") {
          // Table does not exist — revert from state and show clear migration instruction
          const migrationMap: Record<string, string> = {
            corporate_actions: "database/12_corporate_actions.sql",
            stock_sells: "database/09_stock_sells.sql",
            net_worth_history: "database/08_net_worth_history.sql",
          };
          const migFile = migrationMap[table] || `SQL migration for table "${table}"`;
          console.error(`[Supabase] Table "${table}" missing. Run: ${migFile}`);
          showToast(`⚠️ DB table missing — run ${migFile} in Supabase SQL Editor`, "error");
          setMissingTables(prev => prev.includes(table) ? prev : [...prev, table]);
          setState((s) => ({ ...s, [key]: s[key].filter((x: any) => x.id !== newId) }));
        } else {
          // Schema / auth / constraint error — revert immediately and show details
          console.error(`Supabase Upsert Error (${table}):`, { code: firstErr.code, message: firstErr.message, details: firstErr.details, hint: firstErr.hint });
          let errMsg = `Sync failed [${firstErr.code}]: ${firstErr.message}`;
          if (firstErr.code === "23514" && firstErr.message?.includes("ppf_nps_type_check")) {
            errMsg = "DB migration needed: Run database/10_epf_final_fix.sql in Supabase SQL Editor to enable EPF support.";
          }
          if (firstErr.code === "23502" && firstErr.message?.includes("owner")) {
            errMsg = "Save failed: owner field missing — please reload the page and try again.";
          }
          showToast(errMsg, "error");
          setState((s) => ({ ...s, [key]: s[key].filter((x: any) => x.id !== newId) }));
        }
      }
    }
    logActivity(`ADD_${key.toUpperCase()}`, `Added new item to ${key}`, { id: newId, ...item });
  };

  const removeItem = async (key, id) => {
    const userId = session?.user?.id;
    const itemToDelete = key === "stocks" ? state.stocks.find((x: any) => x.id === id) : null;

    setState((s) => ({ ...s, [key]: s[key].filter((x) => x.id !== id) }));
    
    if (userId && userId !== "offline-user") {
      const table = TABLE_MAP[key];
      if (table) {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) {
          console.error(`Supabase Delete Error (${table}):`, error.message);
          showToast(`Delete sync failed: ${error.message}`, "error");
          fetchAllData();
        } else if (key === "stocks" && itemToDelete) {
          // Check if any lots of this stock remain in active portfolio OR if it's in sales history
          const stillHasLots = state.stocks.some((x: any) => x.id !== id && x.symbol === itemToDelete.symbol && x.exchange === itemToDelete.exchange);
          const hasInSales = state.stockSells.some((x: any) => x.symbol === itemToDelete.symbol && x.exchange === itemToDelete.exchange);
          
          if (!stillHasLots && !hasInSales) {
            await supabase.from("corporate_actions").delete().eq("symbol", itemToDelete.symbol).eq("exchange", itemToDelete.exchange);
            setState((s: any) => ({ ...s, corporateActions: s.corporateActions.filter((ca: any) => !(ca.symbol === itemToDelete.symbol && ca.exchange === itemToDelete.exchange)) }));
          }
        }
      }
    }
    logActivity(`REMOVE_${key.toUpperCase()}`, `Removed item from ${key}`, { id });
  };

  const cleanupOrphanedCorporateActions = async () => {
    const orphaned = state.corporateActions.filter((ca: any) => {
      const hasActive = state.stocks.some((s: any) => s.symbol === ca.symbol && s.exchange === ca.exchange);
      const hasSold = state.stockSells.some((s: any) => s.symbol === ca.symbol && s.exchange === ca.exchange);
      return !hasActive && !hasSold;
    });

    if (orphaned.length === 0) {
      showToast("No orphaned corporate action records found.", "info");
      return;
    }

    const count = orphaned.length;
    const ids = orphaned.map((ca: any) => ca.id);
    
    const { error } = await supabase.from("corporate_actions").delete().in("id", ids);
    if (!error) {
      setState((s: any) => ({ ...s, corporateActions: s.corporateActions.filter((ca: any) => !ids.includes(ca.id)) }));
      showToast(`Successfully purged ${count} orphaned records from Supabase.`, "success");
    } else {
      showToast("Cleanup failed: " + error.message, "error");
    }
  };

  const updateItem = async (key, id, patch) => {
    const userId = session?.user?.id;
    setState((s) => ({
      ...s,
      [key]: s[key].map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

    if (userId && userId !== "offline-user") {
      const table = TABLE_MAP[key];
      if (table) {
        let finalPatch = camelToSnake(patch);
        if (key === "rentalProperties" || key === "rentedProperties") {
          if (patch.propertyType !== undefined) {
            finalPatch.property_type_detail = patch.propertyType;
            delete finalPatch.property_type;
          }
        }
        if (key === "budgets" && patch.monthly !== undefined) { finalPatch.monthly_limit = patch.monthly; delete finalPatch.monthly; }
        if (key === "reminders" && patch.date !== undefined) { finalPatch.reminder_date = patch.date; delete finalPatch.date; }
        if (key === "mutualFunds") {
          if (patch.name !== undefined) { finalPatch.scheme = patch.name; delete finalPatch.name; }
          if (patch.category !== undefined) { finalPatch.type = patch.category; delete finalPatch.category; }
        }

        // Specific field mapping for updates
        if (key === "creditCards") { if (patch.limit !== undefined) { finalPatch.card_limit = patch.limit; } delete finalPatch.limit; }
        if ((key === "loansTaken" || key === "loansGiven") && patch.lender) { finalPatch.lender_borrower = patch.lender; delete finalPatch.lender; }
        if (key === "ppf" && patch.institution !== undefined) { finalPatch.bank = patch.institution || ""; delete finalPatch.institution; }
        if (key === "epf") { if (patch.employer !== undefined) { finalPatch.bank = patch.employer || ""; delete finalPatch.employer; } if (patch.uan !== undefined) { finalPatch.account_number = patch.uan || ""; delete finalPatch.uan; } }

        for (const k in finalPatch) {
          if (finalPatch[k] === "") finalPatch[k] = null;
          else if (NUMERIC_COLS.has(k) && typeof finalPatch[k] === "string" && finalPatch[k] !== null) {
            const parsed = parseFloat(finalPatch[k]);
            finalPatch[k] = isNaN(parsed) ? null : parsed;
          }
        }

        const isNetErr = (msg?: string) => !!(msg?.includes("Load failed") || msg?.includes("Failed to fetch") || msg?.includes("NetworkError") || msg?.includes("network"));
        const doUpdate = (patch: any) => supabase.from(table).update(patch).eq("id", id);
        const { error } = await doUpdate(finalPatch);
        if (error) {
          if (isNetErr(error.message)) {
            setTimeout(async () => {
              const { error: r } = await doUpdate(finalPatch);
              if (r) console.error(`Supabase Update retry failed (${table}):`, r.message);
            }, 8000);
          } else if (error.code === "PGRST204") {
            // Column missing in DB schema — strip bad column(s) and retry
            let retryPatch: any = { ...finalPatch };
            let currentErr: any = error;
            const strippedU: string[] = [];
            while (currentErr?.code === "PGRST204") {
              const match = currentErr.message?.match(/Could not find the '(\w+)' column/);
              const badCol = match ? match[1] : null;
              if (!badCol || retryPatch[badCol] === undefined) break;
              delete retryPatch[badCol];
              strippedU.push(badCol);
              const { error: retryErr } = await doUpdate(retryPatch);
              currentErr = retryErr || null;
            }
            if (!currentErr && strippedU.length > 0) {
              console.warn(`[Supabase] Updated without missing cols: ${strippedU.join(", ")} — run SQL migration`);
              showToast(`⚠️ Updated but ${strippedU.join(", ")} was not stored — DB column missing. Run SQL migration.`, "warn");
            } else if (currentErr) {
              console.error(`Supabase Update Error (${table}):`, currentErr.message);
              showToast(`Update sync failed: ${currentErr.message}`, "error");
            }
          } else {
            console.error(`Supabase Update Error (${table}):`, error.message, error.details);
            showToast(`Update sync failed: ${error.message || "check connection"}`, "error");
          }
        }
      }
    }
    logActivity(`UPDATE_${key.toUpperCase()}`, `Updated item in ${key}`, { id, patch });
  };

  // ================== EXPORT / IMPORT ==================
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const pushBackupToSupabase = async (data: any) => {
    const userId = session?.user?.id;
    if (!userId || userId === "offline-user") return;

    const cleanItem = (obj: any) => {
      const r: any = {};
      for (const k in obj) {
        if (k === "user_id" || k === "userId") continue;
        if (obj[k] === "") r[k] = null;
        else if (NUMERIC_COLS.has(k) && typeof obj[k] === "string") { const n = parseFloat(obj[k]); r[k] = isNaN(n) ? null : n; }
        else r[k] = obj[k];
      }
      return r;
    };

    const push = (table: string, items: any[], extra?: (item: any) => any) =>
      (items || []).map(item => {
        const base = cleanItem(camelToSnake(item));
        const merged = { ...base, ...(extra ? extra(item) : {}), user_id: userId };
        return supabase.from(table).upsert(merged, { onConflict: "id" });
      });

    const ops = [
      data.profile  && supabase.from("profiles").upsert({ ...cleanItem(camelToSnake(data.profile)), user_id: userId }),
      data.settings && supabase.from("user_settings").upsert({ ...cleanItem(camelToSnake(data.settings)), user_id: userId }),
      ...push("bank_accounts",      data.bankAccounts),
      ...push("transactions",        data.transactions),
      ...push("mutual_funds",        data.mutualFunds, item => ({ scheme: item.name || item.scheme || "", type: item.category || item.type || null, name: undefined, category: undefined })),
      ...push("stocks",              data.stocks),
      ...push("demat_accounts",      data.demat),
      ...push("fixed_deposits",      data.fixedDeposits),
      ...push("recurring_deposits",  data.recurringDeposits),
      ...push("bonds",               data.bonds),
      ...push("ppf_nps",             data.ppf, () => ({ type: "PPF" })),
      ...push("ppf_nps",             data.nps, () => ({ type: "NPS" })),
      ...push("ppf_nps",             data.epf, () => ({ type: "EPF" })),
      ...push("credit_cards",        data.creditCards, item => ({ card_limit: item.cardLimit ?? item.limit ?? null, limit: undefined })),
      ...push("prepaid_cards",       data.prepaidCards),
      ...push("loans",               data.loansTaken,  () => ({ is_lent: false })),
      ...push("loans",               data.loansGiven,  () => ({ is_lent: true  })),
      ...push("goals",               data.goals),
      ...push("budgets",             data.budgets,      item => ({ monthly_limit: item.monthlyLimit ?? item.monthly ?? null, monthly: undefined })),
      ...push("recurring_expenses",  data.recurringExpenses),
      ...push("subscriptions",       data.subscriptions),
      ...push("reminders",           data.reminders,    item => ({ reminder_date: item.reminderDate ?? item.date ?? null, date: undefined })),
      ...push("lic_policies",        data.lic),
      ...push("term_plans",          data.termPlans),
      ...push("investment_plans",    data.investmentPlans),
      ...push("informal_loans",      data.informalBorrowed, () => ({ direction: "borrowed" })),
      ...push("informal_loans",      data.informalLent,     () => ({ direction: "lent" })),
      ...push("rental_properties",   data.rentalProperties, (item) => ({ property_type: "out", property_type_detail: item.propertyType || "shop" })),
      ...push("rental_properties",   data.rentedProperties, (item) => ({ property_type: "in", property_type_detail: item.propertyType || "shop" })),
      ...push("sips",                data.sips),
      ...push("stock_sells",         data.stockSells),
      ...push("mf_sells",            data.mfSells),
      ...push("corporate_actions",   data.corporateActions),
      ...push("tax_payments",        data.taxPayments),
      ...push("income_entries",      data.income),
      ...(data.netWorthHistory || []).map(entry =>
        supabase.from("net_worth_history").upsert(
          { user_id: userId, month: entry.month, net_worth: entry.netWorth ?? entry.net_worth ?? 0 },
          { onConflict: "user_id,month" }
        )
      ),
    ].filter(Boolean);

    await Promise.allSettled(ops);
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      showToast("Please select a .json backup file", "error");
      e.target.value = "";
      return;
    }
    const input = e.target;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed || typeof parsed !== "object" || typeof parsed.profile !== "object") {
          showToast("Invalid backup — not a valid finance export", "error");
          input.value = "";
          return;
        }
        setState({ ...DEFAULT_STATE, ...parsed });
        showToast("Restoring backup and syncing to cloud...");
        await pushBackupToSupabase(parsed);
        showToast("Backup fully restored ✓");
      } catch {
        showToast("Invalid backup file — check JSON format", "error");
      }
      input.value = "";
    };
    reader.readAsText(file);
  };



  const resetAll = () => {
    setConfirmDialog({
      message: "CRITICAL: This will permanently wipe ALL data from your device AND the cloud (Supabase). This action is irreversible. Proceed?",
      onConfirm: async () => {
        setIsResetting(true);
        try {
          const userId = session?.user?.id;
          
          if (!userId || userId === "offline-user") {
            localStorage.clear();
            sessionStorage.clear();
            setState(DEFAULT_STATE);
            setIsResetting(false);
            showToast("Local data reset successfully.", "success");
            return;
          }
          
          // 1. PHASE 1: Delete all module data across all tables
          const tables = Object.values(TABLE_MAP);
          const extraTables = ["activity_logs", "user_state"];
          const allModuleTables = [...new Set([...tables, ...extraTables])];
          
          for (const table of allModuleTables) {
            await supabase.from(table).delete().eq("user_id", userId);
          }

          // 2. PHASE 2: Reset Profile & Settings to Defaults in DB
          await supabase.from("profiles").update({
            name: "there", fy: getCurrentFY(), regime: "new", savings_target: 20
          }).eq("user_id", userId);
          
          await supabase.from("user_settings").update({ 
             dark_mode: false, accent_key: "blue", density: "normal", 
             sidebar_nav: true, radius_key: "modern", font_key: "inter", 
             bg_style: "plain", anim_speed: "smooth", chart_style: "monotone" 
          }).eq("user_id", userId);
          
          // 3. Final wipe of local storage and state clear
          localStorage.clear();
          sessionStorage.clear();
          setState(DEFAULT_STATE);
          
          showToast("Cloud and local data wiped successfully.", "success");
          
          // Force reload to clean up all listeners
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 1500);
        } catch (err) {
          console.error("Reset failed", err);
          showToast("Reset failed. Please check your connection.", "error");
          setIsResetting(false);
        }
      },
    });
  };

  const navGroups = [
    {
      title: "Overview",
      items: [
        { id: "analytics", label: "Executive Dashboard", icon: PieIcon },
        { id: "ai", label: "AI Advisor", icon: Bot },
        { id: "txnhistory", label: "Global Ledger", icon: History },
      ]
    },
    {
      title: "Wealth & Assets",
      items: [
        { id: "banks", label: "Banks & Transactions", icon: Landmark },
        { id: "demat", label: "Demat & Stocks", icon: BarChart3 },
        { id: "investments", label: "Fixed Income", icon: TrendingUp, children: [
          { id: "fd",     label: "Fixed Deposits",     icon: Coins     },
          { id: "rd",     label: "Recurring Deposits", icon: Repeat    },
          { id: "bond",   label: "Bonds",              icon: FileText  },
          { id: "ppf",    label: "PPF",                icon: Shield    },
          { id: "nps",    label: "NPS",                icon: Briefcase },
          { id: "epf",    label: "EPF (EPFO)",          icon: Shield    },
          { id: "mf",     label: "Mutual Funds",       icon: BarChart3 },
          { id: "income", label: "Yield Tracker",      icon: Activity  },
        ]},
        { id: "goals", label: "Financial Goals", icon: Target },
      ]
    },
    {
      title: "Liabilities & Credit",
      items: [
        { id: "credit", label: "Credit & Liabilities", icon: CreditCard, children: [
          { id: "cc",       label: "Credit Cards",  icon: CreditCard   },
          { id: "prepaid",  label: "Prepaid Cards", icon: Wallet       },
          { id: "taken",    label: "Loans Taken",   icon: ArrowLeft    },
          { id: "given",    label: "Loans Given",   icon: ArrowRight   },
          { id: "borrowed", label: "From People",   icon: User         },
          { id: "lent",     label: "To People",     icon: IndianRupee  },
          { id: "optimizer", label: "Payoff Optimizer", icon: Sparkles },
        ]},
      ]
    },
    {
      title: "Planning & Spends",
      items: [
        { id: "tax", label: "Tax Vault", icon: Calculator },
        { id: "sip", label: "SIP Tracker", icon: Activity },
        { id: "insurance", label: "Insurance", icon: Heart },
        { id: "budget", label: "Budgeting", icon: Wallet },
        { id: "rental", label: "Rental Details", icon: Building2 },
        { id: "subs", label: "Subscriptions", icon: Repeat },
      ]
    },
    {
      title: "System",
      items: [
        { id: "reminders", label: "Reminders & Alerts", icon: Bell },
        { id: "calculators", label: "Financial Calculators", icon: Hash },
        { id: "settings", label: "Settings", icon: Settings },
      ]
    }
  ];



  // Search results
  const searchResults = useMemo(() => {
    if (!search.trim() || search.length < 2) return [];
    const q = search.toLowerCase();
    const results = [];
    state.transactions.forEach((t) => {
      if ((t.note || "").toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q)) {
        results.push({ type: "Transaction", name: t.note || t.category, detail: `${t.date} · ${fmtINR(t.amount)}`, tab: "banks" });
      }
    });
    state.stocks.forEach((s) => {
      if ((s.symbol || "").toLowerCase().includes(q)) {
        results.push({ type: "Stock", name: s.symbol, detail: fmtINRFull(Number(s.qty) * Number(s.currentPrice)), tab: "demat" });
      }
    });
    state.mutualFunds.forEach((m) => {
      const mfName = m.name || m.scheme || "";
      if (mfName.toLowerCase().includes(q)) {
        const currentValue = Number(m.units || 0) * Number(m.currentNav || 0) || Number(m.invested || 0);
        results.push({ type: "Mutual Fund", name: mfName, detail: fmtINRFull(currentValue), tab: "investments" });
      }
    });
    state.goals.forEach((g) => {
      if ((g.name || "").toLowerCase().includes(q)) {
        results.push({ type: "Goal", name: g.name, detail: fmtINRFull(g.currentAmount) + " / " + fmtINRFull(g.targetAmount), tab: "goals" });
      }
    });
    state.creditCards.forEach((c) => {
      if ((c.issuer || "").toLowerCase().includes(q) || (c.last4 || "").includes(q)) {
        results.push({ type: "Credit Card", name: c.issuer, detail: `**** ${c.last4} · ${fmtINRFull(c.outstanding)}`, tab: "credit" });
      }
    });
    state.loansTaken.forEach((l) => {
      if ((l.lender || "").toLowerCase().includes(q)) {
        results.push({ type: "Loan Taken", name: l.lender, detail: `${l.type} · ${fmtINRFull(l.outstanding)}`, tab: "credit" });
      }
    });
    state.bankAccounts.forEach((b) => {
      if ((b.bankName || "").toLowerCase().includes(q)) {
        results.push({ type: "Bank Account", name: b.bankName, detail: `${b.accountNumber} · ${fmtINRFull(b.balance)}`, tab: "banks" });
      }
    });
    state.subscriptions.forEach((s) => {
      if ((s.name || "").toLowerCase().includes(q)) {
        results.push({ type: "Subscription", name: s.name, detail: fmtINRFull(s.amount) + " / " + s.cycle, tab: "subs" });
      }
    });
    return results.slice(0, 10);
  }, [search, state]);

  const d = DENSITY[density] || DENSITY.normal;

  const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes("placeholder"));

  if (isAuthChecking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0B0F1A", gap: 20 }}>
        <img src="/logo.png" alt="Personal Finance by Anand Mohta" style={{ width: 110, height: 110, objectFit: "contain", filter: "drop-shadow(0 0 24px rgba(197,161,82,0.45))", animation: "pulse-logo 2.4s ease-in-out infinite" }} />
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(197,161,82,0.7)", fontFamily: "'Inter', sans-serif" }}>
          Plan &bull; Grow &bull; Secure &bull; Prosper
        </div>
        <div style={{ width: 160, height: 3, background: "rgba(128,128,128,0.15)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg, #C5A152, #E8C97A, #C5A152)", backgroundSize: "200%", borderRadius: 2, animation: "shimmer 1.6s linear infinite" }} />
        </div>
        <style>{`
          @keyframes pulse-logo { 0%,100%{transform:scale(1);filter:drop-shadow(0 0 20px rgba(197,161,82,0.35))} 50%{transform:scale(1.04);filter:drop-shadow(0 0 36px rgba(197,161,82,0.55))} }
          @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        `}</style>
      </div>
    );
  }

  if (!session) {
    if (!isSupabaseConfigured) {
      return (
        <div style={{
          padding: 40,
          textAlign: "center",
          background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 60%, #0B0F1A 100%)",
          color: "#F1F3F9",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚙️</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>Backend Connection Required</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: 380, lineHeight: 1.6, fontSize: 14 }}>
            Please add <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, color: "#818CF8" }}>VITE_SUPABASE_URL</code> and{" "}
            <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, color: "#818CF8" }}>VITE_SUPABASE_ANON_KEY</code> to your environment.
          </p>
        </div>
      );
    }
    return (
      <Auth 
        onLogin={setSession} 
        onOffline={async () => {
          const demoEmail = import.meta.env.VITE_DEMO_USER_EMAIL;
          const demoPass  = import.meta.env.VITE_DEMO_USER_PASSWORD;
          if (isDemoDbReady && demoEmail && demoPass) {
            // Use signInToDemo() which calls _demo.auth directly, bypassing
            // the Proxy — createBrowserClient shares cookie state between
            // instances so the Proxy cannot reliably redirect auth requests.
            const { data } = await signInToDemo(demoEmail, demoPass);
            if (data?.session) {
              setDemoMode(true);
              setSession(data.session);
              return;
            }
          }
          // Fallback: true offline / localStorage-only mode
          setSession({ user: { id: "offline-user", email: "demo@example.com" } } as any);
        }}
      />
    );
  }

  return (
    <MasterDataContext.Provider value={state.masterData || DEFAULT_MASTER_DATA}>
    <div
      className={darkMode ? "dark-theme" : ""}
      style={{
        minHeight: "100vh",
        background: "var(--t-paper)",
        fontFamily: "var(--t-font, 'Inter', sans-serif)",
        color: THEME.ink,
        position: "relative",
        display: "flex",
        fontSize: d.fontSize,
      }}
    >
      {/* ── SIDEBAR NAVIGATION ── */}
      <aside
          className="glass app-sidebar"
          onMouseEnter={() => sidebarMinimized && setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          style={{
            width: isSidebarCompact ? 72 : 280,
            minWidth: isSidebarCompact ? 72 : 280,
            borderRight: `1px solid ${THEME.line}`,
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
          }}
        >
          {/* ── Header + Toggle ── */}
          <div style={{ padding: isSidebarCompact ? "16px 0" : "20px 24px 16px", position: "relative", transition: "padding 0.3s ease", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: isSidebarCompact ? "center" : "flex-start" }}>
              <img
                src="/logo.png"
                alt="Personal Finance by Anand Mohta"
                style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 2px 8px rgba(197,161,82,0.3))" }}
              />
              {!isSidebarCompact && (
                <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em", color: THEME.ink, lineHeight: 1.2 }}>
                    Personal Finance
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500, marginTop: 1 }}>
                    by Anand Mohta
                  </div>
                </div>
              )}
            </div>

            {/* Toggle arrow button */}
            <button
              onClick={() => { setSidebarMinimized(v => !v); setSidebarHovered(false); }}
              title={sidebarMinimized ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                position: "absolute",
                top: 16,
                right: isSidebarCompact ? "50%" : 10,
                transform: isSidebarCompact ? "translateX(50%)" : "none",
                width: 26,
                height: 26,
                borderRadius: 8,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--t-paper)",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.25s ease",
                flexShrink: 0,
                zIndex: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb, var(--t-accent) 10%, transparent)`;
                (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.accent;
                (e.currentTarget as HTMLButtonElement).style.color = THEME.accent;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--t-paper)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.line;
                (e.currentTarget as HTMLButtonElement).style.color = THEME.muted;
              }}
            >
              {sidebarMinimized
                ? <ChevronRight size={14} />
                : <ChevronLeft size={14} />
              }
            </button>
          </div>

          <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: isSidebarCompact ? "0 8px" : "0 16px", transition: "padding 0.3s ease" }} className="no-scrollbar">
            {navGroups.map((group) => {
              const isCollapsed = collapsedGroups[group.title];
              return (
                <div key={group.title} style={{ marginBottom: 20 }}>
                  {/* Group label — hidden in compact mode */}
                  {!isSidebarCompact && (
                    <div
                      onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.title]: !prev[group.title] }))}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "0 16px", marginBottom: 12 }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: THEME.muted }}>
                        {group.title}
                      </div>
                      <ChevronDown size={14} color={THEME.muted} style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </div>
                  )}
                  {/* In compact mode always show icons; in expanded respect collapse state */}
                  {(isSidebarCompact || !isCollapsed) && group.items.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    const hasChildren = t.children && t.children.length > 0;
                    return (
                      <div key={t.id}>
                        <button
                          onClick={() => {
                            setTab(t.id);
                            setSubTab(hasChildren ? t.children[0].id : null);
                            // Auto-expand when user clicks a nav item in compact mode
                            if (isSidebarCompact) { setSidebarMinimized(false); setSidebarHovered(false); }
                          }}
                          title={isSidebarCompact ? t.label : undefined}
                          className={`nav-item ${active ? "active" : ""}`}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: active ? "color-mix(in srgb, var(--t-accent) 10%, transparent)" : "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: isSidebarCompact ? "10px 0" : "10px 16px",
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: isSidebarCompact ? "center" : "flex-start",
                            gap: 12,
                            marginBottom: 4,
                            color: active ? THEME.accent : THEME.muted,
                            fontWeight: active ? 800 : 600,
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          <Icon size={18} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                          {!isSidebarCompact && (
                            <>
                              <span style={{ fontSize: 13.5, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</span>
                              {hasChildren
                                ? <ChevronDown size={13} style={{ transform: active ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s ease", opacity: 0.5, flexShrink: 0 }} />
                                : active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: THEME.accent, flexShrink: 0 }} />
                              }
                            </>
                          )}
                        </button>

                        {/* ── Sub-items — only in expanded mode ── */}
                        {!isSidebarCompact && hasChildren && active && (
                          <div style={{
                            marginLeft: 18,
                            paddingLeft: 14,
                            borderLeft: `2px solid color-mix(in srgb, var(--t-accent) 22%, transparent)`,
                            marginBottom: 6,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}>
                            {t.children.map((child) => {
                              const ChildIcon = child.icon;
                              const childActive = subTab === child.id;
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => { setTab(t.id); setSubTab(child.id); }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "7px 10px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: childActive ? `color-mix(in srgb, var(--t-accent) 8%, transparent)` : "transparent",
                                    color: childActive ? THEME.accent : THEME.muted,
                                    fontWeight: childActive ? 700 : 500,
                                    cursor: "pointer",
                                    width: "100%",
                                    textAlign: "left",
                                    fontSize: 12.5,
                                    transition: "all 0.15s ease",
                                    fontFamily: "inherit",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <ChildIcon size={13} strokeWidth={childActive ? 2.5 : 2} />
                                  <span style={{ flex: 1 }}>{child.label}</span>
                                  {childActive && (
                                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: THEME.accent }} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>


      <div style={{ flex: 1, minWidth: 0 }}>
        {/* HEADER */}
        <header
          className="glass"
          style={{
            borderBottom: `1px solid ${THEME.line}`,
            position: "sticky",
            top: 0,
            zIndex: 40,
            boxShadow: darkMode
              ? "0 1px 0 rgba(255,255,255,0.03), 0 4px 20px rgba(0,0,0,0.4)"
              : "0 1px 0 rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.03)",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
          }}
        >
          <div
            style={{
              padding: "14px 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >


            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: THEME.ink, letterSpacing: "-0.01em" }}>
                {greeting.title}
              </div>
              {greeting.subtitle && (
                <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>
                  {greeting.subtitle}
                </div>
              )}
            </div>

            {/* GLOBAL SEARCH */}
            <div className="header-search" style={{ position: "relative", flex: 1, maxWidth: 280, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "color-mix(in srgb, var(--t-line) 40%, transparent)", border: `1px solid ${THEME.line}`, borderRadius: 10, padding: "8px 12px" }}>
                <Search size={13} style={{ color: THEME.muted, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                  style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: THEME.ink, fontFamily: "inherit", width: "100%", minWidth: 0 }}
                />
                {search && (
                  <button onClick={() => { setSearch(""); setShowSearch(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, display: "flex", padding: 0, flexShrink: 0 }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              {showSearch && searchResults.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 12, zIndex: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", overflow: "hidden" }}>
                  {searchResults.map((r, i) => (
                    <div key={`${r.tab}-${r.name}-${i}`} onMouseDown={() => { setTab(r.tab); setSearch(""); setShowSearch(false); }} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.12s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, var(--t-accent) 5%, transparent)`}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>{r.type}</div>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.accent, flexShrink: 0 }}>{r.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 4, alignItems: "center", position: "relative", flexShrink: 0 }}>
              {/* PROFILE SWITCHER — compact */}
              <select
                style={{ ...input, padding: "7px 10px", width: "auto", fontSize: 12, borderRadius: 8, background: "transparent", borderColor: THEME.line, color: THEME.ink, maxWidth: 110 }}
                value={activeProfile}
                onChange={e => setActiveProfile(e.target.value)}
                title="Switch profile"
              >
                <option value="all">All</option>
                {PROFILES.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {/* Bell / Alerts */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowAlerts((v) => !v)}
                  className="header-icon-btn"
                  style={{ position: "relative" }}
                  aria-label={`${alerts.length} alerts`}
                  title="Alerts"
                >
                  <Bell size={15} />
                  {alerts.length > 0 && (
                    <span className="notif-badge" style={{ position: "absolute", top: -5, right: -5 }}>
                      {alerts.length > 9 ? "9+" : alerts.length}
                    </span>
                  )}
                </button>
                {showAlerts && (
                  <div className="alerts-panel">
                    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>Alerts</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {alerts.length > 0 && (
                          <button
                            onClick={() => {
                              const newDismissed = { ...(state.dismissedAlerts || {}) };
                              alerts.forEach(a => { newDismissed[a.title] = 253402300799000; });
                              updateDismissedAlerts(newDismissed);
                            }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                            title="Clear All"
                          >
                            <CheckCheck size={14} /> Clear All
                          </button>
                        )}
                        <button onClick={() => setShowAlerts(false)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, display: "flex", padding: 4, borderRadius: 6 }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {alerts.length === 0 ? (
                      <div style={{ padding: "24px 16px", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                        All clear — no alerts right now
                      </div>
                    ) : (
                      <div style={{ maxHeight: 340, overflowY: "auto" }}>
                        {alerts.map((a, i) => (
                          <div
                            key={`${a.tab}-${a.title}-${i}`}
                            className="alert-item"
                            style={{
                              padding: "12px 16px",
                              borderBottom: `1px solid ${THEME.line}`,
                              display: "flex",
                              gap: 10,
                              alignItems: "flex-start",
                              transition: "background 0.15s",
                              position: "relative",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, var(--t-accent) 4%, transparent)`}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: a.level === "error" ? THEME.rust : a.level === "warn" ? THEME.gold : THEME.accent,
                              flexShrink: 0,
                              marginTop: 4,
                            }} />
                            <div style={{ minWidth: 0, flex: 1, cursor: "pointer" }} onClick={() => { setTab(a.tab); setShowAlerts(false); }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink, marginBottom: 2 }}>{a.title}</div>
                              <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>{a.detail}</div>
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setTab(a.tab); setShowAlerts(false); }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
                                title={`Go to ${a.tab}`}
                                onMouseEnter={(e) => { e.currentTarget.style.background = `color-mix(in srgb, var(--t-accent) 10%, transparent)`; e.currentTarget.style.color = THEME.accent; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = THEME.muted; }}
                              >
                                <ChevronRight size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateDismissedAlerts({ ...(state.dismissedAlerts || {}), [a.title]: Date.now() + 24 * 60 * 60 * 1000 });
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
                                title="Snooze 24h"
                                onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, var(--t-muted) 15%, transparent)`}
                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                              >
                                <Clock size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateDismissedAlerts({ ...(state.dismissedAlerts || {}), [a.title]: Date.now() + 7 * 24 * 60 * 60 * 1000 });
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4, borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center" }}
                                title="Snooze 7 days"
                                onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, var(--t-muted) 15%, transparent)`}
                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                              >
                                7d
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateDismissedAlerts({ ...(state.dismissedAlerts || {}), [a.title]: 253402300799000 });
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
                                title="Dismiss permanently"
                                onMouseEnter={(e) => { e.currentTarget.style.background = `color-mix(in srgb, var(--t-rust) 15%, transparent)`; e.currentTarget.style.color = THEME.rust; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = THEME.muted; }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Privacy toggle */}
              <button
                onClick={() => setPrivacyMode(v => !v)}
                className="header-icon-btn"
                aria-label={privacyMode ? "Reveal financial data" : "Hide financial data"}
                title={privacyMode ? "Unhide data" : "Hide data"}
                style={privacyMode ? { color: THEME.rust, borderColor: THEME.rust } : {}}
              >
                {privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={() => updateSettings({ darkMode: !darkMode })}
                className="header-icon-btn"
                aria-label="Toggle theme"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>


              <button onClick={exportJSON} className="header-icon-btn" title="Export backup" aria-label="Export backup">
                <Download size={15} />
              </button>

              <button
                onClick={() => setTab("settings")}
                className="header-icon-btn"
                style={tab === "settings" ? { background: THEME.accent, borderColor: THEME.accent, color: "#fff" } : {}}
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={15} />
              </button>

              {session && (
                <button
                  onClick={async () => { if (getIsDemoMode()) { await signOutOfDemo().catch(() => {}); } else { await supabase.auth.signOut().catch(() => {}); } setDemoMode(false); setSession(null); }}
                  className="header-icon-btn danger"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Sync status pill in header area handled by header logic */}

        <main
          style={{
            padding: "40px",
            position: "relative",
            zIndex: 1,
            filter: privacyMode ? "blur(16px)" : "none",
            transition: "filter 0.3s ease",
          }}
        >
          {/* Missing DB tables warning — shown globally so user knows what to fix */}
          {missingTables.length > 0 && (
            <div style={{ marginBottom: 24, padding: "12px 18px", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12, color: THEME.gold, fontSize: 13, fontWeight: 600 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span>
                Missing DB {missingTables.length === 1 ? "table" : "tables"}: <code style={{ fontFamily: "monospace", background: "rgba(234,179,8,0.12)", padding: "1px 6px", borderRadius: 4 }}>{missingTables.join(", ")}</code> — run the corresponding SQL migration in Supabase to restore full functionality.
              </span>
            </div>
          )}
          <div key={tab} className="tab-content-enter">
            {tab === "analytics" && (
              <AnalyticsTab
                metrics={metrics}
                state={filteredState}
                trendData={trendData}
                assetBreakdown={assetBreakdown}
                setState={setState}
                marketData={marketData}
                updateMasterData={updateMasterData}
                setTab={setTab}
              />
            )}
            {tab === "investments" && <InvestmentsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} subTab={subTab} />}
            {tab === "tax" && <TaxVaultTab state={filteredState} metrics={metrics} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "rental" && <RentalTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "banks" && (
              <BanksTab 
                state={filteredState} 
                addItem={addItem} 
                removeItem={removeItem} 
                updateItem={updateItem} 
                masterData={state.masterData || DEFAULT_MASTER_DATA}
                updateMasterData={updateMasterData}
              />
            )}
            {tab === "demat" && <DematTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} missingTables={missingTables} marketData={marketData} fetchLivePrices={fetchLivePrices} fetchingPrices={fetchingPrices} marketDataTs={marketDataTs} />}
            {tab === "txnhistory" && <TxnHistoryTab state={filteredState} removeItem={removeItem} />}
            {tab === "credit" && <CreditTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} subTab={subTab} />}
            {tab === "subs" && <SubsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "sip" && <SIPTrackerTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "insurance" && <InsuranceSummaryTab state={filteredState} metrics={metrics} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "goals" && <GoalsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "budget" && <BudgetTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "ai" && <AIAssistantTab state={filteredState} metrics={metrics} />}
            {tab === "reminders" && <RemindersTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "calculators" && <CalculatorsTab metrics={metrics} state={filteredState} />}
            {tab === "settings" && (
              <SettingsTab
                state={state}
                setState={setState}
                exportJSON={exportJSON}
                onRestoreBackup={importJSON}
                resetAll={resetAll}
                showToast={showToast}
                onSignOut={async () => { if (getIsDemoMode()) { await signOutOfDemo().catch(() => {}); } else { await supabase.auth.signOut(); } setDemoMode(false); setSession(null); }}
                cleanupOrphaned={cleanupOrphanedCorporateActions}
                updateProfile={updateProfile}
                updateSettings={updateSettings}
                darkMode={darkMode} toggleDarkMode={() => updateSettings({ darkMode: !darkMode })}
                accentKey={accentKey} setAccentKey={(v) => updateSettings({ accentKey: v })}
                density={density} setDensity={(v) => updateSettings({ density: v })}
                sidebarNav={sidebarNav} setSidebarNav={(v) => updateSettings({ sidebarNav: v })}
                radiusKey={radiusKey} setRadiusKey={(v) => updateSettings({ radiusKey: v })}
                fontKey={fontKey} setFontKey={(v) => updateSettings({ fontKey: v })}
                bgStyle={bgStyle} setBgStyle={(v) => updateSettings({ bgStyle: v })}
                animSpeed={animSpeed} setAnimSpeed={(v) => updateSettings({ animSpeed: v })}
                chartStyle={chartStyle} setChartStyle={(v) => updateSettings({ chartStyle: v })}
                masterData={state.masterData || DEFAULT_MASTER_DATA}
                updateMasterData={updateMasterData}
                emailSettings={settings}
                updateEmailSettings={updateSettings}
              />
            )}
          </div>
        </main>

        <footer style={{
          textAlign: "center",
          padding: "28px 20px 32px",
          color: THEME.muted,
          fontSize: 12,
          borderTop: `1px solid ${THEME.line}`,
          marginTop: 40,
          letterSpacing: "0.04em",
          lineHeight: 1.8,
        }}>
          <span style={{ fontWeight: 600 }}>Personal Finance by Anand Mohta</span> · Enterprise Grade · All data stored securely · FY {state.profile.fy}
        </footer>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION ──
          Always rendered; CSS hides it on desktop (display:none by default, display:flex at ≤768px).
          Previously gated on !sidebarNav which left mobile users with no nav when sidebarNav=true. */}
      {(() => {
        const mobileNavTabs = [
          { id: "analytics",   label: "Analytics", icon: PieIcon },
          { id: "banks",       label: "Banks",     icon: Landmark },
          { id: "investments", label: "Invest",    icon: TrendingUp },
          { id: "goals",       label: "Goals",     icon: Target },
          { id: "settings",    label: "More",      icon: Settings },
        ];
        return (
          <nav className="mobile-bottom-nav" style={{ justifyContent: "space-around" }}>
            {mobileNavTabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setSubTab(null); }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    color: active ? THEME.accent : THEME.muted,
                    fontFamily: "inherit",
                    transition: "color 0.2s ease",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    background: active ? `color-mix(in srgb, var(--t-accent) 12%, transparent)` : "transparent",
                    transition: "background 0.2s ease",
                  }}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.03em", lineHeight: 1 }}>{t.label}</span>
                </button>
              );
            })}
          </nav>
        );
      })()}

      {/* QUICK-ADD FAB */}
      <button
        className="fab"
        onClick={() => setFabModal(true)}
        style={{ border: "none" }}
        aria-label="Quick add transaction"
      >
        <Plus size={24} strokeWidth={3} />
      </button>

      {fabModal && (
        <QuickAddModal
          onClose={() => setFabModal(false)}
          onSave={(v) => { addItem("transactions", v); setFabModal(false); }}
          bankAccounts={state.bankAccounts}
        />
      )}

      {/* ── TOAST NOTIFICATIONS ── */}
      <ToastStack toasts={toasts} />

      {/* ── CONFIRM DIALOG ── */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* ── COMMAND PALETTE ── */}
      <CommandPaletteModal 
        isOpen={showCmdPalette}
        onClose={() => setShowCmdPalette(false)}
        onNavigate={(t) => setTab(t)}
        onAction={(a) => {
          if (a === "quick-add") setFabModal(true);
        }}
      />

      {/* ── RESET OVERLAY ── */}
      {isResetting && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: "#fff", gap: 20
        }}>
          <RefreshCw size={48} className="animate-spin" style={{ color: THEME.accent }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Nuking Local & Cloud Data</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Please wait, performing secure wipe...</div>
          </div>
        </div>
      )}
    </div>
    </MasterDataContext.Provider>
  );
}

// ================== SHARED STYLES ==================

const input = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid var(--t-line)",
  background: "var(--t-card-bg)",
  fontFamily: "var(--t-font, 'Inter', sans-serif)",
  fontSize: "var(--app-font-size, 14px)",
  color: "var(--t-ink)",
  borderRadius: 10,
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  outline: "none",
};


export default function App() {
  return (
    <ErrorBoundary>
      <PrivacyProvider>
        <FinanceDashboard />
      </PrivacyProvider>
    </ErrorBoundary>
  );
}

