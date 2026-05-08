// @ts-nocheck
import "./styles.css";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
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
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Download,
  IndianRupee,
  History,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  FileText,
  BarChart3,
  Repeat,
  Activity,
  Sparkles,
  Database,
  User,
  Layout as LayoutIcon,
  Upload,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";

// Modular Imports
import { THEME, ACCENT_PALETTES, DENSITY, LIGHT_VARS, DARK_VARS, PIE_COLORS, PROFILES, STORAGE_KEY } from "./utils/constants";
import { fmtINR, fmtINRFull, uid, today, monthsBetween, getCCDueDate, autoCateg, calcCAGR, fdMaturity, rdMaturity, calcTaxNew, calcTaxOld, loadState, saveStateLocal } from "./utils/finance";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { Badge } from "./components/ui/Badge";
import { Modal, ModalActions } from "./components/ui/Modal";
import { Field, Input, Select } from "./components/ui/Form";

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

// Modal Imports
import { CsvImportModal } from "./components/modals/CsvImportModal";
import { QuickAddModal } from "./components/modals/QuickAddModal";
import { CommandPaletteModal } from "./components/modals/CommandPaletteModal";

// UI Imports
import { ToastStack, ConfirmDialog } from "./components/ui/Feedback";

const OwnerBadge = ({ owner }: { owner?: string }) => {
  if (!owner) return null;
  const p = PROFILES.find(x => x.id === owner);
  if (!p) return null;
  return (
    <Badge variant="accent" style={{ fontSize: 10 }}>
      {p.name}
    </Badge>
  );
};

const DEFAULT_STATE = (() => {
  const d = new Date();
  const ym = d.toISOString().slice(0, 7);
  const lastM = new Date(new Date(d).setMonth(d.getMonth() - 1)).toISOString().slice(0, 7);
  return {
    profile: { name: "Anand", fy: "2025-26", regime: "new", savingsTarget: 20 },
    bankAccounts: [
      { id: "1", owner: "self", bankName: "HDFC Bank", accountNumber: "XXXX1234", balance: "150000" },
      { id: "2", owner: "self", bankName: "SBI", accountNumber: "XXXX5678", balance: "45000" },
      { id: "3", owner: "wife", bankName: "ICICI Bank", accountNumber: "XXXX9988", balance: "80000" },
      { id: "4", owner: "huf", bankName: "Axis Bank", accountNumber: "XXXX1111", balance: "250000" }
    ],
    transactions: [
      { id: "t1", owner: "self", date: `${ym}-01`, accountId: "1", amount: "120000", type: "credit", category: "Salary", note: "Monthly Salary" },
      { id: "t2", owner: "self", date: `${ym}-05`, accountId: "1", amount: "15000", type: "debit", category: "Rent", note: "House Rent" },
      { id: "t3", owner: "self", date: `${ym}-10`, accountId: "2", amount: "8000", type: "debit", category: "Food", note: "Groceries & Dining" },
      { id: "t4", owner: "self", date: `${ym}-15`, accountId: "2", amount: "5000", type: "debit", category: "Utilities", note: "Electricity & Internet" },
      { id: "t5", owner: "self", date: `${lastM}-01`, accountId: "1", amount: "120000", type: "credit", category: "Salary", note: "Monthly Salary" },
      { id: "t6", owner: "self", date: `${lastM}-05`, accountId: "1", amount: "15000", type: "debit", category: "Rent", note: "House Rent" }
    ],
    fixedDeposits: [
      { id: "fd1", owner: "self", bank: "HDFC Bank", principal: "500000", rate: "7", years: "3", startDate: "2023-01-01", maturityDate: "2026-01-01" },
      { id: "fd2", owner: "huf", bank: "Axis Bank", principal: "1000000", rate: "7.5", years: "5", startDate: "2022-06-01", maturityDate: "2027-06-01" }
    ],
    recurringDeposits: [
      { id: "rd1", owner: "self", bank: "SBI", monthly: "5000", rate: "6.5", tenureMonths: "24", startDate: "2024-01-01" },
      { id: "rd2", owner: "self", bank: "Post Office", monthly: "3000", rate: "6.8", tenureMonths: "36", startDate: "2023-06-01" },
    ],
    bonds: [
      { id: "b1", owner: "self", name: "G-Sec 7.26% 2033", type: "Government", faceValue: "100000", coupon: "7.26", maturityDate: "2033-09-15" },
      { id: "b2", owner: "self", name: "HDFC Corp Bond", type: "Corporate", faceValue: "50000", coupon: "8.5", maturityDate: "2030-03-31" },
    ],
    ppf: [
      { id: "p1", owner: "self", bank: "Post Office", balance: "350000", openDate: "2015-04-01", thisYearContribution: "150000" },
      { id: "p2", owner: "wife", bank: "SBI", balance: "200000", openDate: "2018-04-01", thisYearContribution: "50000" }
    ],
    nps: [
      { id: "n1", owner: "self", pran: "110123456789", tier: "I", balance: "250000", thisYearContribution: "50000", contributions: [
        { id: "nc1", date: "2024-04-05", selfAmount: "50000", employerAmount: "18000" },
        { id: "nc2", date: "2025-04-10", selfAmount: "50000", employerAmount: "20000" },
      ] },
    ],
    lic: [
      { id: "lic1", owner: "self", policyNumber: "12345678", planName: "Jeevan Anand", sumAssured: "1000000", annualPremium: "45000", premiumPaid: "180000", maturityDate: "2035-06-15" },
      { id: "lic2", owner: "self", policyNumber: "98765432", planName: "Money Back 20yr", sumAssured: "500000", annualPremium: "28000", premiumPaid: "84000", maturityDate: "2030-12-31" },
    ],
    termPlans: [
      { id: "tp1", owner: "self", insurer: "HDFC Life", planName: "Click 2 Protect", coverAmount: "10000000", annualPremium: "12000", expiryDate: "2055-08-01" },
      { id: "tp2", owner: "self", insurer: "LIC", planName: "Tech Term", coverAmount: "5000000", annualPremium: "8500", expiryDate: "2050-04-15" },
    ],
    mutualFunds: [
      { id: "m1", owner: "self", scheme: "Parag Parikh Flexi Cap", type: "Equity", units: "800", currentNav: "325", invested: "200000" },
      { id: "m2", owner: "self", scheme: "Nifty 50 Index Fund", type: "Index", units: "500", currentNav: "370", invested: "150000" },
      { id: "m3", owner: "daughter", scheme: "HDFC Children's Gift Fund", type: "Hybrid", units: "1000", currentNav: "150", invested: "100000" }
    ],
    stocks: [
      { id: "s1", owner: "self", symbol: "RELIANCE", dematId: "d1", qty: "20", currentPrice: "2250", avgPrice: "2500" },
      { id: "s2", owner: "self", symbol: "TCS", dematId: "d1", qty: "15", currentPrice: "3600", avgPrice: "2800" },
      { id: "s3", owner: "self", symbol: "INFY", dematId: "d2", qty: "25", currentPrice: "1580", avgPrice: "1400" },
      { id: "s4", owner: "self", symbol: "HDFCBANK", dematId: "d2", qty: "10", currentPrice: "1720", avgPrice: "1650" },
    ],
    demat: [
      { id: "d1", owner: "self", broker: "Zerodha", dpId: "IN300095", clientId: "AB1234" },
      { id: "d2", owner: "self", broker: "Groww", dpId: "IN303719", clientId: "GW5678" },
    ],
    creditCards: [
      { 
        id: "c1", 
        owner: "self",
        issuer: "Amazon Pay ICICI", 
        network: "Visa", 
        last4: "5678", 
        limit: "300000", 
        outstanding: "24000", 
        billDate: "20", 
        dueDay: "10",
        annualFee: "0",
        waiverInfo: "Life Time Free",
        helpline: "1800 102 3333",
        transactions: [
          { id: "ctx1", date: `${ym}-05`, merchant: "Amazon.in", amount: "1200", category: "Shopping" },
          { id: "ctx2", date: `${ym}-12`, merchant: "Swiggy", amount: "450", category: "Food" }
        ]
      }
    ],
    prepaidCards: [],
    loansTaken: [
      { id: "l1", owner: "self", lender: "HDFC Bank", type: "Car", principal: "800000", outstanding: "550000", emi: "18000", rate: "8.5", monthsRemaining: "36" }
    ],
    loansGiven: [],
    informalBorrowed: [],
    informalLent: [],
    rentalProperties: [],
    rentedProperties: [],
    subscriptions: [
      { id: "sub1", owner: "self", name: "Netflix", amount: "649", cycle: "monthly", renewalDate: `${ym}-28` },
      { id: "sub2", owner: "self", name: "Amazon Prime", amount: "1499", cycle: "yearly", renewalDate: `${ym}-30` }
    ],
    goals: [
      { id: "g1", owner: "self", name: "Emergency Fund", category: "Emergency Fund", targetAmount: "600000", currentAmount: "400000", priority: "High", startDate: "2024-01-01", targetDate: "2025-12-31" },
      { id: "g2", owner: "daughter", name: "College Fund", category: "Education", targetAmount: "2000000", currentAmount: "250000", priority: "Medium", startDate: "2024-06-01", targetDate: "2030-06-01" }
    ],
    income: [
      { id: "i1", owner: "self", source: "Salary", category: "Salary", amount: "1440000", date: `${ym}-01` }
    ],
    taxPayments: [],
    budgets: [
      { id: "b1", owner: "self", category: "Food", monthly: "10000" },
      { id: "b2", owner: "self", category: "Rent", monthly: "15000" },
      { id: "b3", owner: "self", category: "Transport", monthly: "3000" },
      { id: "b4", owner: "self", category: "Entertainment", monthly: "2000" },
    ],
    reminders: [],
    stockSells: [],
    mfSells: [],
    netWorthHistory: [],
    sips: [
      { id: "sip1", owner: "self", scheme: "Parag Parikh Flexi Cap", fundType: "Equity", amount: "5000", frequency: "monthly", startDate: "2023-01-01", totalInstallments: "36" },
      { id: "sip2", owner: "self", scheme: "Nifty 50 Index Fund", fundType: "Index", amount: "3000", frequency: "monthly", startDate: "2022-07-01", totalInstallments: "60" },
      { id: "sip3", owner: "self", scheme: "HDFC Hybrid Equity", fundType: "Hybrid", amount: "2000", frequency: "monthly", startDate: "2024-01-01", totalInstallments: "24" },
    ],
    settings: {
      darkMode: false,
      accentKey: "blue",
      density: "normal",
      sidebarNav: true,
      radiusKey: "modern",
      fontKey: "inter",
      bgStyle: "plain",
      animSpeed: "smooth",
      chartStyle: "monotone"
    }
  };
})();

// All data arrays set to empty — used when user clicks "Start Fresh"
const EMPTY_DATA = {
  bankAccounts: [], transactions: [], fixedDeposits: [], recurringDeposits: [],
  bonds: [], ppf: [], nps: [], lic: [], termPlans: [], mutualFunds: [], stocks: [],
  demat: [], creditCards: [], prepaidCards: [], loansTaken: [], loansGiven: [],
  informalBorrowed: [], informalLent: [], rentalProperties: [], rentedProperties: [],
  subscriptions: [], goals: [], income: [], taxPayments: [], budgets: [],
  reminders: [], stockSells: [], mfSells: [], netWorthHistory: [], sips: [],
  settings: {
    darkMode: false, accentKey: "blue", density: "normal", sidebarNav: true,
    radiusKey: "modern", fontKey: "inter", bgStyle: "plain", animSpeed: "smooth", chartStyle: "monotone"
  }
};

// ================== MAIN APP ==================
export default function FinanceDashboard() {
  const [session, setSession] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [state, setState] = useState(() => {
    const saved = loadState();
    if (!saved) return DEFAULT_STATE;
    return {
      ...DEFAULT_STATE,
      ...saved,
      settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) }
    };
  });
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("analytics");
  const [subTab, setSubTab] = useState(null);

  // Derived settings from state for easier access
  const settings = state.settings || DEFAULT_STATE.settings;
  const { 
    darkMode, accentKey, density, sidebarNav, radiusKey, fontKey, bgStyle, animSpeed, chartStyle 
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
      
      await supabase.from("user_settings").upsert({ user_id: userId, ...dbUpdates });
    }

    // Log setting changes
    const keys = Object.keys(updates).join(", ");
    logActivity("UPDATE_SETTINGS", `Updated settings: ${keys}`, updates);
  }, [logActivity, session]);

  // Helper to update profile
  const updateProfile = useCallback(async (updates: Partial<typeof state.profile>) => {
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

  const [activeProfile, setActiveProfile] = useState<string>("all");
  const [toasts, setToasts] = useState<{id:string;msg:string;type:string}[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{message:string;onConfirm:()=>void}|null>(null);
  const showToast = useCallback((msg: string, type = "success") => {
    const id = uid();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

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
    }
  }, []);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [fabModal, setFabModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

  const snakeToCamel = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(snakeToCamel);
    const res: any = {};
    for (const k in obj) {
      const camel = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      res[camel] = obj[k] !== null && typeof obj[k] === 'object' ? snakeToCamel(obj[k]) : obj[k];
    }
    return res;
  };

  const fetchAllData = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || userId === "offline-user") return;

    try {
      console.log("Supabase: Fetching all modules in parallel for user:", userId);
      const [
        prof, sett, banks, txns, mfs, stks, demats, fds, rds, bnds, pn, ccs, lns, gls, bdgts, subs, rems
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
        supabase.from("loans").select("*").eq("user_id", userId),
        supabase.from("goals").select("*").eq("user_id", userId),
        supabase.from("budgets").select("*").eq("user_id", userId),
        supabase.from("subscriptions").select("*").eq("user_id", userId),
        supabase.from("reminders").select("*").eq("user_id", userId),
      ]);

      const hasAnyData = [banks, txns, mfs, stks, demats, fds, rds, bnds, pn, ccs, lns, gls, bdgts, subs, rems].some(r => r.data && r.data.length > 0);
      
      if (prof.data || hasAnyData) {
        const newState = {
          ...DEFAULT_STATE,
          profile: snakeToCamel(prof.data) || DEFAULT_STATE.profile,
          settings: snakeToCamel(sett.data) || DEFAULT_STATE.settings,
          bankAccounts: snakeToCamel(banks.data) || [],
          transactions: snakeToCamel(txns.data) || [],
          mutualFunds: snakeToCamel(mfs.data) || [],
          stocks: snakeToCamel(stks.data) || [],
          demat: snakeToCamel(demats.data) || [],
          fixedDeposits: snakeToCamel(fds.data) || [],
          recurringDeposits: snakeToCamel(rds.data) || [],
          bonds: snakeToCamel(bnds.data) || [],
          ppf: snakeToCamel(pn.data?.filter(x => x.type === 'PPF')) || [],
          nps: snakeToCamel(pn.data?.filter(x => x.type === 'NPS')) || [],
          creditCards: snakeToCamel(ccs.data) || [],
          loansTaken: snakeToCamel(lns.data?.filter(x => !x.is_lent)) || [],
          loansGiven: snakeToCamel(lns.data?.filter(x => x.is_lent)) || [],
          goals: snakeToCamel(gls.data) || [],
          budgets: snakeToCamel(bdgts.data)?.map((b: any) => ({ ...b, monthly: b.monthlyLimit })) || [],
          subscriptions: snakeToCamel(subs.data) || [],
          reminders: snakeToCamel(rems.data)?.map((r: any) => ({ ...r, date: r.reminderDate })) || [],
        };
        setState(newState);
      } else {
        // Check for legacy JSONB data to migrate
        const { data: legacy } = await supabase.from("user_state").select("data").eq("user_id", userId).maybeSingle();
        if (legacy?.data) {
          await migrateLegacyData(userId, legacy.data);
          setState({ ...DEFAULT_STATE, ...legacy.data });
        }
      }
    } catch (e) {
      console.error("Supabase load failed", e);
    }
  }, [session]);

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
  }, [session]);

  const migrateLegacyData = async (userId: string, data: any) => {
    try {
      // Very simplified migration — just push current state to tables
      const ops = [
        supabase.from("profiles").upsert({ user_id: userId, ...data.profile }),
        supabase.from("user_settings").upsert({ user_id: userId, ...data.settings }),
        ...data.bankAccounts.map(x => supabase.from("bank_accounts").insert({ user_id: userId, ...x })),
        ...data.transactions.map(x => supabase.from("transactions").insert({ user_id: userId, ...x })),
        // ... add other modules as needed
      ];
      // Wait for inserts to complete
      await Promise.all(ops);
      // Removed window.location.reload() to prevent infinite reload loops if migration partially fails.
    } catch (e) { console.warn("Migration failed", e); }
  };

  // Global mouse tracker for Spotlight effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.spotlight-wrapper') as NodeListOf<HTMLElement>;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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

  // Fire browser push notifications for reminders due within 3 days (runs once per session)
  useEffect(() => {
    if (!loaded || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const todayStr = today();
    const soon: { title: string; body: string }[] = [];
    const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - new Date(todayStr).getTime()) / 86400000);
    state.reminders.forEach((r) => {
      if (!r.date) return;
      const d = daysLeft(r.date);
      if (d >= 0 && d <= 3) soon.push({ title: r.title, body: d === 0 ? "Due today!" : `Due in ${d} day${d !== 1 ? "s" : ""}` });
    });
    state.creditCards.forEach((c) => {
      const dueDate = getCCDueDate(c);
      if (!dueDate) return;
      const d = daysLeft(dueDate);
      if (d >= 0 && d <= 3) soon.push({ title: `${c.issuer} bill due`, body: `${fmtINRFull(c.outstanding)} outstanding${d === 0 ? " — today!" : ` — ${d}d`}` });
    });
    state.subscriptions.filter((s) => s.renewalDate && !s.paused).forEach((s) => {
      const d = daysLeft(s.renewalDate);
      if (d >= 0 && d <= 3) soon.push({ title: `${s.name} renewal`, body: `${fmtINRFull(s.amount)} due${d === 0 ? " today" : ` in ${d}d`}` });
    });
    soon.forEach(({ title, body }) => {
      try { new Notification(title, { body, icon: "/favicon.ico" }); } catch {}
    });
  }, [loaded]); // intentionally omit other deps — runs once after initial load

  // Record a net-worth snapshot for the current month once per session after data loads
  useEffect(() => {
    if (!loaded) return;
    const ym = new Date().toISOString().slice(0, 7);
    setState((s) => {
      const nw = (() => {
        const cash = (s.bankAccounts || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const mf = (s.mutualFunds || []).reduce((a, x) => a + Number(x.units || 0) * Number(x.currentNav || 0), 0);
        const stocks = (s.stocks || []).reduce((a, x) => a + Number(x.qty || 0) * Number(x.currentPrice || 0), 0);
        const fd = (s.fixedDeposits || []).reduce((a, x) => a + Number(x.principal || 0), 0);
        const ppf = (s.ppf || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const nps = (s.nps || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const lic = (s.lic || []).reduce((a, x) => a + Number(x.premiumPaid || 0), 0);
        const bonds = (s.bonds || []).reduce((a, x) => a + Number(x.faceValue || 0), 0);
        const cc = (s.creditCards || []).reduce((a, x) => a + Number(x.outstanding || 0), 0);
        const loans = (s.loansTaken || []).reduce((a, x) => a + Number(x.outstanding || 0), 0);
        return cash + mf + stocks + fd + ppf + nps + lic + bonds - cc - loans;
      })();
      const history = (s.netWorthHistory || []).filter((h) => h.month !== ym);
      return { ...s, netWorthHistory: [...history, { month: ym, netWorth: nw }].slice(-36) };
    });
  }, [loaded]); // intentionally omit other deps — runs once after initial load

  const filteredState = useMemo(() => {
    if (activeProfile === "all") return state;
    const filterByOwner = (arr: any[]) => arr.filter((item) => item.owner === activeProfile);
    return {
      ...state,
      bankAccounts: filterByOwner(state.bankAccounts),
      transactions: filterByOwner(state.transactions),
      fixedDeposits: filterByOwner(state.fixedDeposits),
      recurringDeposits: filterByOwner(state.recurringDeposits),
      bonds: filterByOwner(state.bonds),
      ppf: filterByOwner(state.ppf),
      nps: filterByOwner(state.nps),
      lic: filterByOwner(state.lic),
      termPlans: filterByOwner(state.termPlans),
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
      sips: filterByOwner(state.sips),
      stockSells: filterByOwner(state.stockSells || []),
      mfSells: filterByOwner(state.mfSells || []),
    };
  }, [state, activeProfile]);

  // ================== COMPUTED FINANCIAL METRICS ==================
  const metrics = useMemo(() => {
    const sState = filteredState;
    const cashInBanks = sState.bankAccounts.reduce(
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
      (s, b) => s + Number(b.faceValue || 0),
      0
    );
    const ppfValue = sState.ppf.reduce((s, p) => s + Number(p.balance || 0), 0);
    const npsValue = sState.nps.reduce((s, n) => s + Number(n.balance || 0), 0);
    const licValue = sState.lic.reduce(
      (s, l) => s + Number(l.premiumPaid || 0),
      0
    );
    const mfValue = sState.mutualFunds.reduce(
      (s, m) => s + Number(m.units || 0) * Number(m.currentNav || 0),
      0
    );
    const mfInvested = sState.mutualFunds.reduce(
      (s, m) => s + (m.buyNav ? Number(m.units || 0) * Number(m.buyNav || 0) : Number(m.invested || 0)),
      0
    );
    const stockValue = sState.stocks.reduce(
      (s, st) => s + Number(st.qty || 0) * Number(st.currentPrice || 0),
      0
    );
    const stockInvested = sState.stocks.reduce(
      (s, st) => s + Number(st.qty || 0) * Number(st.avgPrice || 0),
      0
    );

    const loansGivenValue = sState.loansGiven.reduce(
      (s, l) => s + Number(l.outstanding || 0),
      0
    );
    const prepaidValue = sState.prepaidCards.reduce(
      (s, p) => s + Number(p.balance || 0),
      0
    );

    const ccOutstanding = sState.creditCards.reduce(
      (s, c) => s + Number(c.outstanding || 0),
      0
    );
    const loansTakenValue = sState.loansTaken.reduce(
      (s, l) => s + Number(l.outstanding || 0),
      0
    );
    const rentalDepositLiability = (sState.rentalProperties || []).reduce((s, p) => {
      const deducted = (p.depositDeductions || []).reduce((a, d) => a + Number(d.amount || 0), 0);
      const returned = Number(p.depositReturned || 0);
      return s + Math.max(0, Number(p.securityDeposit || 0) - deducted - returned);
    }, 0);
    const rentedDepositAsset = (sState.rentedProperties || []).reduce((s, p) => {
      const returned = Number(p.depositReturned || 0);
      return s + Math.max(0, Number(p.securityDeposit || 0) - returned);
    }, 0);

    const totalAssets =
      cashInBanks +
      fdValue +
      rdValue +
      bondValue +
      ppfValue +
      npsValue +
      licValue +
      mfValue +
      stockValue +
      loansGivenValue +
      prepaidValue +
      rentedDepositAsset;
    const totalLiabilities = ccOutstanding + loansTakenValue + rentalDepositLiability;
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
    const monthExpense = monthTxns
      .filter((t) => t.type === "debit")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Annual income from income ledger
    const fyStart = new Date(`${sState.profile.fy.split("-")[0]}-04-01`);
    const annualIncome = sState.income
      .filter((i) => new Date(i.date) >= fyStart)
      .reduce((s, i) => s + Number(i.amount || 0), 0);

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
    const lockedAssets = fdValue + rdValue + bondValue + ppfValue + npsValue + licValue;
    const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    
    const taxDue = sState.profile.regime === "old"
      ? calcTaxOld(annualIncome).total
      : calcTaxNew(annualIncome).total;

    const expenseBreakdownMap = monthTxns
      .filter((t) => t.type === "debit")
      .reduce((acc, t) => {
        const cat = t.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
        return acc;
      }, {});
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
      licValue,
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
    };
  }, [filteredState]);

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
        { name: "Bonds", value: metrics.bondValue },
        { name: "LIC", value: metrics.licValue },
        { name: "Loans Given", value: metrics.loansGivenValue },
      ].filter((x) => x.value > 0),
    [metrics]
  );

  // Monthly trend for last 12 months — uses filtered transactions to respect profile filter
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
      const exp = txns
        .filter((t) => t.type === "debit")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      arr.push({ month: label, income: inc, expense: exp, net: inc - exp });
    }
    return arr;
  }, [filteredState.transactions]);

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
    // CC due in ≤10 days
    state.creditCards.forEach((c) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) {
        const days = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / 86400000);
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
    const advDates = [`${now.getFullYear()}-06-15`, `${now.getFullYear()}-09-15`, `${now.getFullYear()}-12-15`, `${now.getFullYear()}-03-15`];
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
    const filteredList = list.filter(a => {
      const dismissUntil = state.dismissedAlerts?.[a.title];
      return !(dismissUntil && dismissUntil > Date.now());
    });
    return filteredList;
  }, [state.transactions, state.budgets, state.creditCards, state.goals, state.subscriptions, metrics.monthExpense, metrics.cashInBanks, state.dismissedAlerts]);

  const TABLE_MAP: Record<string, string> = {
    bankAccounts: "bank_accounts", transactions: "transactions", mutualFunds: "mutual_funds",
    stocks: "stocks", demat: "demat_accounts", fixedDeposits: "fixed_deposits",
    recurringDeposits: "recurring_deposits", bonds: "bonds", ppf: "ppf_nps", nps: "ppf_nps",
    creditCards: "credit_cards", loansTaken: "loans", loansGiven: "loans",
    goals: "goals", budgets: "budgets", subscriptions: "subscriptions", reminders: "reminders"
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
    let finalItem = camelToSnake(item);
    
    if (key === "ppf" || key === "nps") finalItem.type = key.toUpperCase();
    if (key === "loansTaken") finalItem.is_lent = false;
    if (key === "loansGiven") finalItem.is_lent = true;
    if (key === "budgets") { finalItem.monthly_limit = item.monthly; delete finalItem.monthly; }
    if (key === "reminders") { finalItem.reminder_date = item.date; delete finalItem.date; }

    const newId = uid();
    setState((s) => ({ ...s, [key]: [...s[key], { id: newId, ...item }] }));
    
    if (userId && userId !== "offline-user") {
      const table = TABLE_MAP[key];
      if (table) {
        // Prevent Postgres type errors by converting empty strings to null
        const cleanItem = { id: newId, user_id: userId, ...finalItem };
        for (const k in cleanItem) {
          if (cleanItem[k] === "") cleanItem[k] = null;
        }
        const { error } = await supabase.from(table).insert(cleanItem);
        if (error) console.error(`Supabase Insert Error (${table}):`, error);
        
        // Strict Rule: Auto fetch data after mutation
        await fetchAllData();
      }
    }
    logActivity(`ADD_${key.toUpperCase()}`, `Added new item to ${key}`, { id: newId, ...item });
  };

  const removeItem = async (key, id) => {
    const userId = session?.user?.id;
    setState((s) => ({ ...s, [key]: s[key].filter((x) => x.id !== id) }));
    
    if (userId && userId !== "offline-user") {
      const table = TABLE_MAP[key];
      if (table) {
        await supabase.from(table).delete().eq("id", id);
        
        // Strict Rule: Auto fetch data after mutation
        await fetchAllData();
      }
    }
    logActivity(`REMOVE_${key.toUpperCase()}`, `Removed item from ${key}`, { id });
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
        if (key === "budgets" && patch.monthly) { finalPatch.monthly_limit = patch.monthly; delete finalPatch.monthly; }
        if (key === "reminders" && patch.date) { finalPatch.reminder_date = patch.date; delete finalPatch.date; }
        
        // Prevent Postgres type errors by converting empty strings to null
        for (const k in finalPatch) {
          if (finalPatch[k] === "") finalPatch[k] = null;
        }
        
        const { error } = await supabase.from(table).update(finalPatch).eq("id", id);
        if (error) console.error(`Supabase Update Error (${table}):`, error);
        
        // Strict Rule: Auto fetch data after mutation
        await fetchAllData();
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
  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const input = e.target;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.bankAccounts)) {
          showToast("Invalid backup — not a valid finance export", "error");
          input.value = "";
          return;
        }
        setState({ ...DEFAULT_STATE, ...parsed });
        showToast("Backup restored successfully");
      } catch {
        showToast("Invalid backup file — check JSON format", "error");
      }
      input.value = "";
    };
    reader.readAsText(file);
  };

  const dismissDemo = useCallback((startFresh = false) => {
    if (startFresh) setState(prev => ({ ...prev, ...EMPTY_DATA }));
  }, []);

  const exportCSV = () => {
    const rows = [["Date", "Account", "Type", "Category", "Amount", "Note"]];
    state.transactions.forEach((t) => {
      const bank = state.bankAccounts.find((b) => b.id === t.accountId);
      rows.push([t.date || "", bank ? bank.bankName : "", t.type || "", t.category || "", t.amount || "", t.note || ""]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setConfirmDialog({
      message: "Delete ALL data? This action cannot be undone and will clear every account, transaction, goal and setting.",
      onConfirm: async () => {
        const userId = session?.user?.id;

        // Clear local state immediately
        setState(prev => ({ ...prev, ...EMPTY_DATA }));

        // Also wipe all Supabase tables for this user
        if (userId && userId !== "offline-user") {
          const uniqueTables = [...new Set(Object.values(TABLE_MAP))];
          await Promise.all(
            uniqueTables.map(table =>
              supabase.from(table).delete().eq("user_id", userId)
            )
          );
        }

        showToast("All data has been reset successfully");
      },
    });
  };

  const navGroups = [
    {
      title: "Overview",
      items: [
        { id: "analytics", label: "Executive Dashboard", icon: PieIcon },
        { id: "txnhistory", label: "Global Ledger", icon: History },
      ]
    },
    {
      title: "Wealth & Assets",
      items: [
        { id: "banks", label: "Bank Accounts", icon: Landmark },
        { id: "demat", label: "Demat & Stocks", icon: BarChart3 },
        { id: "investments", label: "Fixed Income", icon: TrendingUp },
        { id: "goals", label: "Financial Goals", icon: Target },
      ]
    },
    {
      title: "Liabilities & Credit",
      items: [
        { id: "credit", label: "Credit & Loans", icon: CreditCard },
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
        { id: "settings", label: "App Settings", icon: Settings },
      ]
    }
  ];

  const allTabs = navGroups.flatMap(g => g.items);

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
      if ((m.scheme || "").toLowerCase().includes(q)) {
        results.push({ type: "Mutual Fund", name: m.scheme, detail: fmtINRFull(Number(m.units) * Number(m.currentNav)), tab: "investments" });
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

  const isSupabaseConfigured = !!(process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes("placeholder"));

  if (isAuthChecking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F172A" }}>
        <RefreshCw className="spin" color="#818CF8" size={32} />
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
            Please add <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, color: "#818CF8" }}>REACT_APP_SUPABASE_URL</code> and{" "}
            <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, color: "#818CF8" }}>REACT_APP_SUPABASE_ANON_KEY</code> to your environment.
          </p>
        </div>
      );
    }
    return <Auth onLogin={setSession} />;
  }

  return (
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
          className="glass"
          style={{
            width: 280,
            borderRight: `1px solid ${THEME.line}`,
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div style={{ padding: "28px 24px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 75%, #C4B5FD))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px color-mix(in srgb, var(--t-accent) 35%, transparent)" }}>
                <IndianRupee size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", color: THEME.muted, textTransform: "uppercase", fontWeight: 600 }}>
                  Personal Finance
                </div>
                <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                  by Anand Mohta
                </h1>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, overflowY: "auto", padding: "0 16px" }} className="no-scrollbar">
            {navGroups.map((group) => {
              const isCollapsed = collapsedGroups[group.title];
              return (
                <div key={group.title} style={{ marginBottom: 20 }}>
                  <div
                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.title]: !prev[group.title] }))}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "0 16px", marginBottom: 12 }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: THEME.muted }}>
                      {group.title}
                    </div>
                    <ChevronDown size={14} color={THEME.muted} style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                  </div>
                  {!isCollapsed && group.items.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setTab(t.id); setSubTab(null); }}
                        className={`nav-item ${active ? "active" : ""}`}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: active ? "color-mix(in srgb, var(--t-accent) 10%, transparent)" : "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: "10px 16px",
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 4,
                          color: active ? THEME.accent : THEME.muted,
                          fontWeight: active ? 800 : 600,
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                        <span style={{ fontSize: 13.5 }}>{t.label}</span>
                        {active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: THEME.accent }} />}
                      </button>
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
              maxWidth: 1400,
              margin: "0 auto",
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
                              setState((s: any) => {
                                const newDismissed = { ...(s.dismissedAlerts || {}) };
                                alerts.forEach(a => { newDismissed[a.title] = Infinity; });
                                return { ...s, dismissedAlerts: newDismissed };
                              });
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
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setState((s: any) => ({ ...s, dismissedAlerts: { ...(s.dismissedAlerts || {}), [a.title]: Date.now() + 24 * 60 * 60 * 1000 } }));
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4, borderRadius: 4 }}
                                title="Snooze 24h"
                                onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, var(--t-muted) 15%, transparent)`}
                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                              >
                                <Clock size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setState((s: any) => ({ ...s, dismissedAlerts: { ...(s.dismissedAlerts || {}), [a.title]: Infinity } }));
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4, borderRadius: 4 }}
                                title="Clear"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = `color-mix(in srgb, var(--t-rust) 15%, transparent)`;
                                  e.currentTarget.style.color = THEME.rust;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "none";
                                  e.currentTarget.style.color = THEME.muted;
                                }}
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
                  onClick={async () => { await supabase.auth.signOut().catch(() => {}); setSession(null); }}
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
            maxWidth: 1200,
            margin: "0 auto",
            padding: "40px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div key={tab} className="tab-content-enter">
            {tab === "analytics" && <AnalyticsTab metrics={metrics} state={filteredState} trendData={trendData} assetBreakdown={assetBreakdown} setState={setState} />}
            {tab === "investments" && <InvestmentsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} subTab={subTab} />}
            {tab === "tax" && <TaxVaultTab state={filteredState} metrics={metrics} />}
            {tab === "rental" && <RentalTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "banks" && <BanksTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "demat" && <DematTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "txnhistory" && <TxnHistoryTab state={filteredState} removeItem={removeItem} />}
            {tab === "credit" && <CreditTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "subs" && <SubsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "sip" && <SIPTrackerTab state={filteredState} addItem={addItem} removeItem={removeItem} />}
            {tab === "insurance" && <InsuranceSummaryTab state={filteredState} metrics={metrics} />}
            {tab === "goals" && <GoalsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "budget" && <BudgetTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "reminders" && <RemindersTab state={filteredState} addItem={addItem} removeItem={removeItem} />}
            {tab === "calculators" && <CalculatorsTab metrics={metrics} />}
            {tab === "settings" && (
              <SettingsTab
                state={state}
                setState={setState}
                exportJSON={exportJSON}
                resetAll={resetAll}
                showToast={showToast}
                onSignOut={async () => { await supabase.auth.signOut(); setSession(null); }}
                updateProfile={updateProfile}
                accentKey={accentKey} setAccentKey={(v) => updateSettings({ accentKey: v })}
                density={density} setDensity={(v) => updateSettings({ density: v })}
                sidebarNav={sidebarNav} setSidebarNav={(v) => updateSettings({ sidebarNav: v })}
                radiusKey={radiusKey} setRadiusKey={(v) => updateSettings({ radiusKey: v })}
                fontKey={fontKey} setFontKey={(v) => updateSettings({ fontKey: v })}
                bgStyle={bgStyle} setBgStyle={(v) => updateSettings({ bgStyle: v })}
                animSpeed={animSpeed} setAnimSpeed={(v) => updateSettings({ animSpeed: v })}
                chartStyle={chartStyle} setChartStyle={(v) => updateSettings({ chartStyle: v })}
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

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      {!sidebarNav && (() => {
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
                  onClick={() => { setTab(t.id); if (t.children) setSubTab(t.children[0].id); else setSubTab(null); }}
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
    </div>
  );
}

// ================== SHARED STYLES ==================
const btnGhost = {
  background: "transparent",
  border: `1.5px solid ${THEME.line}`,
  color: THEME.ink,
  padding: "8px 14px",
  fontFamily: "var(--t-font, 'Inter', sans-serif)",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 10,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
  letterSpacing: "-0.01em",
};
const btnSolid = {
  background: THEME.ink,
  color: THEME.darkInk,
  border: `1.5px solid ${THEME.ink}`,
  padding: "10px 20px",
  fontFamily: "var(--t-font, 'Inter', sans-serif)",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
};
const btnAccent = {
  ...btnSolid,
  background: "linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 75%, #C4B5FD))",
  borderColor: "var(--t-accent)",
  color: "#FFFFFF",
  boxShadow: "0 4px 14px color-mix(in srgb, var(--t-accent) 25%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)",
};

const btnOutline = {
  ...btnSolid,
  background: "transparent",
  color: "var(--t-ink)",
  border: "1.5px solid var(--t-line)",
};
const card = {
  background: "var(--t-card-bg)",
  border: "var(--t-card-border)",
  borderRadius: "var(--t-radius)",
  padding: "var(--card-pad, 24px)",
  boxShadow: "var(--t-card-shadow)",
  transition: "box-shadow 0.25s cubic-bezier(0.22,1,0.36,1), border-color 0.25s cubic-bezier(0.22,1,0.36,1)",
};
const cardDark = {
  background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
  color: "#fff",
  borderRadius: "var(--radius-xl)",
  padding: "var(--card-pad, 24px)",
  boxShadow: "0 20px 60px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.06)",
  position: "relative",
  overflow: "hidden",
};

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
const label = {
  display: "block",
  fontSize: 12,
  color: THEME.muted,
  marginBottom: 6,
  fontWeight: 600,
  letterSpacing: "0.03em",
  textTransform: "uppercase" as const,
};

