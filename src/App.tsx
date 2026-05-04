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
import { CalculatorsTab } from "./components/tabs/CalculatorsTab";

// Modal Imports
import { CsvImportModal } from "./components/modals/CsvImportModal";

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
    profile: { name: "Anand", fy: "2025-26", regime: "new" },
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
};

// ================== MAIN APP ==================
export default function FinanceDashboard() {
  const [state, setState] = useState(() => {
    const saved = loadState();
    return saved ? { ...DEFAULT_STATE, ...saved } : DEFAULT_STATE;
  });
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("analytics");
  const [subTab, setSubTab] = useState(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem("finance-theme") === "dark"; } catch { return false; }
  });
  const [accentKey, setAccentKey] = useState<AccentKey>(() => {
    try { return (localStorage.getItem("finance-accent") as AccentKey) || "blue"; } catch { return "blue"; }
  });
  const [density, setDensity] = useState<DensityKey>(() => {
    try { return (localStorage.getItem("finance-density") as DensityKey) || "normal"; } catch { return "normal"; }
  });
  const [sidebarNav, setSidebarNav] = useState<boolean>(() => {
    try { return localStorage.getItem("finance-sidebar") === "true"; } catch { return false; }
  });
  const [radiusKey, setRadiusKey] = useState<string>(() => {
    try { return localStorage.getItem("finance-radius") || "modern"; } catch { return "modern"; }
  });
  const [fontKey, setFontKey] = useState<string>(() => {
    try { return localStorage.getItem("finance-font") || "inter"; } catch { return "inter"; }
  });
  const [bgStyle, setBgStyle] = useState<string>(() => {
    try { return localStorage.getItem("finance-bg") || "plain"; } catch { return "plain"; }
  });
  const [activeProfile, setActiveProfile] = useState<string>("all");
  const [animSpeed, setAnimSpeed] = useState<string>(() => {
    try { return localStorage.getItem("finance-anim") || "smooth"; } catch { return "smooth"; }
  });
  const [chartStyle, setChartStyle] = useState<string>(() => {
    try { return localStorage.getItem("finance-chart") || "monotone"; } catch { return "monotone"; }
  });
  const [session, setSession] = useState<any>(null);
  const [toasts, setToasts] = useState<{id:string;msg:string;type:string}[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{message:string;onConfirm:()=>void}|null>(null);
  const showToast = useCallback((msg: string, type = "success") => {
    const id = uid();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle"|"syncing"|"saved"|"error">("idle");
  // true when no saved data exists in this browser — shows the "demo data" recovery banner
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    try { return !localStorage.getItem(STORAGE_KEY); } catch { return false; }
  });

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!error) setSession(session);
      }).catch(() => {});
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
  const [fabModal, setFabModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

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
    try {
      localStorage.setItem("finance-theme", darkMode ? "dark" : "light");
      localStorage.setItem("finance-accent", accentKey);
      localStorage.setItem("finance-density", density);
      localStorage.setItem("finance-sidebar", String(sidebarNav));
      localStorage.setItem("finance-radius", radiusKey);
      localStorage.setItem("finance-font", fontKey);
      localStorage.setItem("finance-bg", bgStyle);
      localStorage.setItem("finance-anim", animSpeed);
      localStorage.setItem("finance-chart", chartStyle);
    } catch {}
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

  // Load from Supabase on mount (real logged-in users get cloud sync)
  useEffect(() => {
    if (!session) {
      // No session: mark loaded so saves start immediately
      setLoaded(true);
      return;
    }
    const userId = session.user?.id;
    // Demo / offline mode — skip Supabase, just use localStorage
    if (!userId || userId === "offline-user") {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("user_state")
          .select("data")
          .eq("user_id", userId)
          .single();
        if (data && data.data) {
          const cloudData = data.data;
          const localData = loadState();
          const cloudTs = cloudData._ts || 0;
          const localTs = localData?._ts || 0;
          // Only apply cloud data if it is strictly newer than what is already in localStorage.
          // This prevents an old Supabase snapshot from overwriting data the user added locally.
          if (cloudTs > localTs) {
            setState({ ...DEFAULT_STATE, ...cloudData });
          }
        }
      } catch (e) {
        console.error("Supabase load failed", e);
      }
      setLoaded(true);
    })();
  }, [session]);

  // Sync to Supabase on change — debounced 1 s so rapid edits don't hammer the API
  useEffect(() => {
    if (!loaded || !session) return;
    const userId = session.user?.id;
    if (!userId || userId === "offline-user") return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    setSyncStatus("syncing");
    syncTimerRef.current = setTimeout(async () => {
      try {
        const now = Date.now();
        await supabase.from("user_state").upsert({
          user_id: userId,
          data: { ...state, _ts: now },
          updated_at: new Date(now).toISOString()
        }, { onConflict: 'user_id' });
        setSyncStatus("saved");
        setTimeout(() => setSyncStatus("idle"), 2500);
      } catch (e) {
        console.error("Supabase save failed", e);
        setSyncStatus("error");
        setTimeout(() => setSyncStatus("idle"), 4000);
      }
    }, 1000);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [state, loaded, session]);

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
    return list;
  }, [state.transactions, state.budgets, state.creditCards, state.goals, state.subscriptions, metrics.monthExpense, metrics.cashInBanks]);

  const addItem = (key, item) =>
    setState((s) => ({ ...s, [key]: [...s[key], { id: uid(), ...item }] }));
  const removeItem = (key, id) =>
    setState((s) => ({ ...s, [key]: s[key].filter((x) => x.id !== id) }));
  const updateItem = (key, id, patch) =>
    setState((s) => ({
      ...s,
      [key]: s[key].map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

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
        setIsDemo(false);
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
    setIsDemo(false);
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
      onConfirm: () => setState(DEFAULT_STATE),
    });
  };

  const navGroups = [
    {
      title: "Overview",
      items: [
        { id: "analytics", label: "Dashboard", icon: PieIcon },
        { id: "txnhistory", label: "Transaction History", icon: History },
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
      title: "Planning & Spends",
      items: [
        { id: "tax", label: "Tax Vault", icon: Calculator },
        { id: "rental", label: "Rental Details", icon: Building2 },
        { id: "subs", label: "Subscriptions", icon: Repeat },
        { id: "sip", label: "SIP Tracker", icon: Activity },
        { id: "insurance", label: "Insurance", icon: Heart },
        { id: "budget", label: "Budgeting", icon: Wallet },
      ]
    },
    {
      title: "System",
      items: [
        { id: "reminders", label: "Reminders", icon: Bell },
        { id: "calculators", label: "Calculators", icon: Hash },
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
    state.subscriptions.forEach((s) => {
      if ((s.name || "").toLowerCase().includes(q)) {
        results.push({ type: "Subscription", name: s.name, detail: fmtINRFull(s.amount) + " / " + s.cycle, tab: "subs" });
      }
    });
    return results.slice(0, 8);
  }, [search, state]);

  const d = DENSITY[density] || DENSITY.normal;

  const isSupabaseConfigured = !!(process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes("placeholder"));

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
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>Setup Required</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: 380, lineHeight: 1.6, fontSize: 14 }}>
            Please add <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, color: "#818CF8" }}>REACT_APP_SUPABASE_URL</code> and{" "}
            <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, color: "#818CF8" }}>REACT_APP_SUPABASE_ANON_KEY</code> to your <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>.env</code> file.
          </p>
          <button
            onClick={() => setSession({ user: { id: "offline-user" } })}
            style={{
              padding: "14px 28px",
              background: "linear-gradient(135deg, #4F46E5, #818CF8)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
              transition: "all 0.2s ease",
              marginTop: 8,
            }}
          >
            Continue in Demo Mode
          </button>
        </div>
      );
    }
    return <Auth onLogin={setSession} onOffline={() => setSession({ user: { id: "offline-user" } })} />;
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
        display: sidebarNav ? "flex" : "block",
        fontSize: d.fontSize,
      }}
    >
      {/* ── SIDEBAR NAVIGATION ── */}
      {sidebarNav && (
        <aside
          style={{
            width: 280,
            background: THEME.darkInk,
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
            {navGroups.map((group) => (
              <div key={group.title} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: THEME.muted, padding: "0 16px", marginBottom: 12 }}>
                  {group.title}
                </div>
                {group.items.map((t) => {
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
            ))}
          </nav>

          <div style={{ padding: 24, borderTop: `1px solid ${THEME.line}` }}>
             <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ ...btnGhost, width: "100%", justifyContent: "center" }}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* HEADER */}
        <header
          style={{
            borderBottom: `1px solid ${THEME.line}`,
            background: THEME.darkInk,
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
              padding: sidebarNav ? "14px 32px" : "16px 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {!sidebarNav && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 70%, #C4B5FD))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px color-mix(in srgb, var(--t-accent) 35%, transparent)", flexShrink: 0 }}>
                  <IndianRupee size={18} color="#fff" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: THEME.muted, textTransform: "uppercase", fontWeight: 600, lineHeight: 1 }}>
                    FY {state.profile.fy}
                  </div>
                  <h1 className="header-title" style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: "-0.02em", color: THEME.ink, lineHeight: 1.2 }}>
                    Personal Finance
                  </h1>
                </div>
              </div>
            )}

            {sidebarNav && (
               <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ padding: "8px 12px", background: "color-mix(in srgb, var(--t-accent) 10%, transparent)", borderRadius: 8, color: THEME.accent, fontWeight: 700, fontSize: 13 }}>
                    {allTabs.find(t => t.id === tab)?.label}
                  </div>
               </div>
            )}

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
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--t-darkInk)", border: `1px solid ${THEME.line}`, borderRadius: 12, zIndex: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", overflow: "hidden" }}>
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
                      <button onClick={() => setShowAlerts(false)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, display: "flex", padding: 4, borderRadius: 6 }}>
                        <X size={14} />
                      </button>
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
                            onClick={() => { setTab(a.tab); setShowAlerts(false); }}
                            style={{
                              padding: "12px 16px",
                              cursor: "pointer",
                              borderBottom: `1px solid ${THEME.line}`,
                              display: "flex",
                              gap: 10,
                              alignItems: "flex-start",
                              transition: "background 0.15s",
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
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink, marginBottom: 2 }}>{a.title}</div>
                              <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>{a.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dark mode toggle */}
              {!sidebarNav && (
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="header-icon-btn"
                  aria-label="Toggle theme"
                  title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>
              )}

              {/* Sync status pill */}
              {syncStatus !== "idle" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: syncStatus === "saved" ? "color-mix(in srgb, var(--t-sage) 10%, transparent)"
                            : syncStatus === "error"  ? "color-mix(in srgb, var(--t-rust) 10%, transparent)"
                            : "color-mix(in srgb, var(--t-accent) 10%, transparent)",
                  color: syncStatus === "saved" ? "var(--t-sage)"
                       : syncStatus === "error"  ? "var(--t-rust)"
                       : "var(--t-accent)",
                  transition: "all 0.3s ease",
                }}>
                  {syncStatus === "syncing" && <RefreshCw size={11} style={{ animation: "spin 0.9s linear infinite" }} />}
                  {syncStatus === "saved"   && <Check size={11} />}
                  {syncStatus === "error"   && <AlertCircle size={11} />}
                  <span>{syncStatus === "syncing" ? "Saving…" : syncStatus === "saved" ? "Saved" : "Sync failed"}</span>
                </div>
              )}

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

              {session?.user?.id && session.user.id !== "offline-user" && (
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

          {/* TOP TAB NAV (only if not sidebar) */}
          {!sidebarNav && (
            <nav style={{ maxWidth: 1400, margin: "0 auto", padding: "0 32px", display: "flex", gap: 8, overflowX: "auto", borderTop: `1px solid ${THEME.line}`, background: THEME.darkInk }} className="no-scrollbar desktop-tab-nav">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); if (t.children) setSubTab(t.children[0].id); else setSubTab(null); }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "16px 20px",
                      fontFamily: "inherit",
                      fontSize: 14,
                      color: active ? THEME.accent : THEME.muted,
                      borderBottom: `3px solid ${active ? THEME.accent : "transparent"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      whiteSpace: "nowrap",
                      fontWeight: active ? 700 : 500,
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Quick Stats Bar */}
          {(() => {
            const items = [
              { label: "Net Worth",      value: fmtINRFull(metrics.netWorth),              color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust },
              { label: "Savings Rate",   value: metrics.savingsRate.toFixed(1) + "%",       color: metrics.savingsRate >= 20 ? THEME.sage : THEME.gold },
              { label: "Monthly Income", value: fmtINRFull(metrics.monthIncome),            color: THEME.sage },
              { label: "Monthly Spend",  value: fmtINRFull(metrics.monthExpense),           color: THEME.ink },
              { label: "Est. Tax",       value: fmtINRFull(metrics.taxDue),                 color: metrics.taxDue > 0 ? THEME.rust : THEME.sage },
            ];
            return (
              <div style={{ borderTop: `1px solid ${THEME.line}`, background: THEME.darkInk, overflowX: "auto" }} className="no-scrollbar">
                <div style={{ maxWidth: 1400, margin: "0 auto", padding: "8px 32px", display: "flex", alignItems: "center", minWidth: "max-content" }}>
                  {items.map(({ label, value, color }, idx) => (
                    <React.Fragment key={label}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "4px 18px" }}>
                        <span style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: THEME.muted, fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{value}</span>
                      </div>
                      {idx < items.length - 1 && (
                        <div style={{ width: 1, height: 24, background: THEME.line, flexShrink: 0 }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </header>

        {/* Demo data recovery banner — shown when no real data exists in this browser */}
        {isDemo && (
          <div className="demo-banner" style={{
            background: "color-mix(in srgb, var(--t-gold) 8%, var(--t-paper))",
            borderBottom: "1px solid color-mix(in srgb, var(--t-gold) 30%, transparent)",
          }}>
            <div style={{
              maxWidth: 1400, margin: "0 auto", padding: "10px 32px",
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            }}>
              <AlertCircle size={16} style={{ color: "var(--t-gold)", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--t-ink)", minWidth: 200 }}>
                <strong>You're viewing demo data.</strong> If you've used this app before on another device or URL, import your backup to restore your real data. Or start fresh to begin entering your own.
              </span>
              <label style={{
                display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "1px solid var(--t-line)", color: "var(--t-ink)", background: "var(--t-paper)",
              }}>
                <Upload size={13} /> Import Backup
                <input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => { importJSON(e); }} />
              </label>
              <button
                style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: "1px solid var(--t-line)", color: "var(--t-ink)", background: "var(--t-paper)", cursor: "pointer",
                }}
                onClick={() => dismissDemo(true)}
              >
                Start Fresh
              </button>
              <button
                style={{
                  padding: "7px 10px", borderRadius: 8, fontSize: 12,
                  border: "1px solid transparent", color: "var(--t-muted)", background: "transparent", cursor: "pointer",
                }}
                onClick={() => dismissDemo(false)}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <main
          style={{
            maxWidth: sidebarNav ? 1200 : 1400,
            margin: sidebarNav ? "0" : "0 auto",
            padding: sidebarNav ? "40px" : "32px",
            position: "relative",
            zIndex: 1,
            background: "var(--t-paper)",
          }}
        >
          <div key={tab} className="tab-content-enter">
            {tab === "analytics" && <AnalyticsTab metrics={metrics} state={filteredState} trendData={trendData} />}
            {tab === "investments" && <InvestmentsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} subTab={subTab} />}
            {tab === "tax" && <TaxVaultTab state={filteredState} metrics={metrics} />}
            {tab === "rental" && <RentalTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            
            {/* Keeping existing tabs for now until further modularization */}
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
                onImportSuccess={() => setIsDemo(false)}
                accentKey={accentKey} setAccentKey={setAccentKey}
                density={density} setDensity={setDensity}
                sidebarNav={sidebarNav} setSidebarNav={setSidebarNav}
                radiusKey={radiusKey} setRadiusKey={setRadiusKey}
                fontKey={fontKey} setFontKey={setFontKey}
                bgStyle={bgStyle} setBgStyle={setBgStyle}
                animSpeed={animSpeed} setAnimSpeed={setAnimSpeed}
                chartStyle={chartStyle} setChartStyle={setChartStyle}
              />
            )}
          </div>
        </main>

        <footer style={{
          textAlign: "center",
          padding: "32px 20px 80px",
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

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 28 }}>
    <h2
      style={{
        fontFamily: "var(--t-font, 'Inter', sans-serif)",
        fontSize: 22,
        fontWeight: 800,
        margin: 0,
        letterSpacing: "-0.035em",
        color: THEME.ink,
      }}
    >
      {children}
    </h2>
    {sub && (
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          marginTop: 5,
          fontStyle: "normal",
          lineHeight: 1.5,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

// ================== TOAST + CONFIRM DIALOG ==================
function ToastStack({ toasts }: { toasts: {id:string;msg:string;type:string}[] }) {
  if (!toasts.length) return null;
  const configs: Record<string, { accent: string; icon: string; label: string }> = {
    success: { accent: "var(--t-sage)",   icon: "✓", label: "success" },
    error:   { accent: "var(--t-rust)",   icon: "✕", label: "error"   },
    warn:    { accent: "var(--t-gold)",   icon: "!", label: "warning"  },
    info:    { accent: "var(--t-accent)", icon: "i", label: "info"     },
  };
  return ReactDOM.createPortal(
    <div style={{ position: "fixed", bottom: 88, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
      {toasts.map((t) => {
        const cfg = configs[t.type] || configs.success;
        return (
          <div key={t.id} style={{
            background: "var(--t-darkInk)",
            border: `1px solid color-mix(in srgb, ${cfg.accent} 30%, var(--t-line))`,
            color: "var(--t-ink)",
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 340,
            fontFamily: "var(--t-font, 'Inter', sans-serif)",
            animation: "toastIn 0.28s var(--ease-out) both",
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: "50%",
              background: `color-mix(in srgb, ${cfg.accent} 15%, transparent)`,
              border: `1.5px solid color-mix(in srgb, ${cfg.accent} 40%, transparent)`,
              color: cfg.accent,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 800, flexShrink: 0,
            }}>{cfg.icon}</span>
            {t.msg}
          </div>
        );
      })}
    </div>,
    document.body
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message:string; onConfirm:()=>void; onCancel:()=>void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);
  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: THEME.ink }}>Confirm Action</div>
          <button className="modal-close-btn" onClick={onCancel} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: THEME.ink, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={btnGhost} onClick={onCancel}>Cancel</button>
            <button
              onClick={onConfirm}
              style={{ ...btnGhost, background: "#DC2626", border: "1px solid #DC2626", color: "#fff", fontWeight: 700 }}
            >
              Yes, delete
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ================== OVERVIEW ==================

// ================== SUB-NAV COMPONENT ==================
function SubNav({ items, active, onChange, isVertical }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: THEME.muted, fontWeight: 600 }}>Categories</div>
        
      </div>
      <div style={{ 
        display: "flex", 
        flexDirection: isVertical ? "column" : "row",
        gap: 8, 
        overflowX: isVertical ? "visible" : "auto",
        paddingBottom: isVertical ? 0 : 8,
        scrollbarWidth: "none"
      }}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: isVertical ? "12px 16px" : "8px 16px",
                background: isActive ? THEME.accent + "1A" : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${isActive ? THEME.accent : "rgba(255,255,255,0.05)"}`,
                borderRadius: 99,
                color: isActive ? THEME.accent : THEME.ink,
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease",
                width: isVertical ? "100%" : "auto"
              }}
            >
              {Icon && <Icon size={14} />} {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================== MONTHLY REPORT MODAL ==================
function MonthlyReportModal({ metrics, state, onClose }: any) {
  const now = new Date();
  const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const ym = now.toISOString().slice(0, 7);
  const txns = state.transactions.filter((t) => t.date?.startsWith(ym));
  const income = txns.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = txns.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
  const saving = income - expense;
  const savingRate = income > 0 ? ((saving / income) * 100).toFixed(1) : "0";
  const catMap: Record<string, number> = {};
  txns.filter((t) => t.type === "debit").forEach((t) => {
    const c = t.category || "Other";
    catMap[c] = (catMap[c] || 0) + Number(t.amount || 0);
  });
  const topCats = Object.entries(catMap).sort(([, a], [, b]) => b - a).slice(0, 6);
  const upcoming: { label: string; amount: number; date: string }[] = [];
  state.creditCards.forEach((c) => {
    const due = getCCDueDate(c);
    if (due) upcoming.push({ label: `${c.issuer} CC`, amount: Number(c.outstanding || 0), date: due });
  });
  state.loansTaken.forEach((l) => {
    upcoming.push({ label: `${l.lender} ${l.type} Loan`, amount: Number(l.emi || 0), date: "Monthly EMI" });
  });
  const rpt: { [key: string]: string } = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "var(--t-ink)",
  };
  return (
    <Modal title={`Monthly Report — ${monthLabel}`} onClose={onClose}>
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } .print-scroll { max-height: none !important; overflow: visible !important; } }`}</style>
      <div style={{ maxHeight: "72vh", overflowY: "auto" }} className="print-scroll">
        {/* Net Worth Banner */}
        <div style={{ background: "#0f172a", borderRadius: 10, padding: "16px 20px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Net Worth Snapshot</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>{fmtINRFull(metrics.netWorth)}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
            Assets {fmtINRFull(metrics.totalAssets)} · Liabilities {fmtINRFull(metrics.totalLiabilities)}
          </div>
        </div>

        {/* Cash Flow */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Income", value: income, color: THEME.sage },
            { label: "Expense", value: expense, color: THEME.rust },
            { label: `Saved (${savingRate}%)`, value: saving, color: saving >= 0 ? THEME.sage : THEME.rust },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: 12, borderRadius: 8, background: "rgba(128,128,128,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color }}>{fmtINRFull(value)}</div>
            </div>
          ))}
        </div>

        {/* Top Expenses */}
        {topCats.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>Top Expenses</div>
            {topCats.map(([cat, amt], i) => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 13 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], display: "inline-block" }} />
                  {cat}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 50, height: 4, background: THEME.line, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${expense > 0 ? Math.min(100, (amt / expense) * 100) : 0}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                  <span style={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}>{fmtINRFull(amt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Portfolio Snapshot */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>Portfolio Snapshot</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {([
              ["Bank Cash", metrics.cashInBanks],
              ["Fixed Deposits", state.fixedDeposits.reduce((s, f) => s + Number(f.principal || 0), 0)],
              ["Mutual Funds", metrics.mfValue],
              ["Stocks", metrics.stockValue],
              ["PPF", metrics.ppfValue],
              ["NPS", metrics.npsValue],
            ] as [string, number][]).filter(([, v]) => v > 0).map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "rgba(128,128,128,0.05)", borderRadius: 6, fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{fmtINRFull(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Dues */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>Upcoming Dues</div>
            {upcoming.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 13 }}>
                <span>{d.label}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINRFull(d.amount)}</div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>{d.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }} className="no-print">
        <button style={btnGhost} onClick={onClose}>Close</button>
        <button style={btnSolid} onClick={() => window.print()}>
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>
    </Modal>
  );
}

// ================== BANKS TAB ==================
function BanksTab({ state, addItem, removeItem, updateItem }) {
  const [showBank, setShowBank] = useState(false);
  const [showTxn, setShowTxn] = useState(false);
  const [filterAcc, setFilterAcc] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const setQuickRange = (preset: string) => {
    const now = new Date();
    if (preset === "thisMonth") {
      setDateFrom(now.toISOString().slice(0, 7) + "-01");
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === "lastMonth") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(prev.toISOString().slice(0, 10));
      setDateTo(last.toISOString().slice(0, 10));
    } else if (preset === "3months") {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setDateFrom(from.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === "thisFY") {
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setDateFrom(`${fyYear}-04-01`);
      setDateTo(now.toISOString().slice(0, 10));
    }
  };
  const [editBankId, setEditBankId] = useState(null);
  const [editTxnId, setEditTxnId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<any>(null);

  // D12: Recurring detection — transactions with same note+amount appearing ≥2 times
  const recurringKeys = useMemo(() => {
    const freq = {};
    state.transactions.forEach((t) => {
      const key = (t.note || "") + "|" + t.amount + "|" + t.type;
      freq[key] = (freq[key] || 0) + 1;
    });
    return new Set(Object.keys(freq).filter((k) => freq[k] >= 2));
  }, [state.transactions]);

  const filteredTxns = state.transactions
    .filter((t) => filterAcc === "all" || t.accountId === filterAcc)
    .filter((t) => filterType === "all" || t.type === filterType)
    .filter((t) => !dateFrom || t.date >= dateFrom)
    .filter((t) => !dateTo || t.date <= dateTo)
    .filter((t) =>
      !search ||
      (t.note || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <SectionTitle sub="Bank accounts, cash positions, and every rupee that moves">
          Banks & Transactions
        </SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnGhost} onClick={() => setShowBank(true)}>
            <Plus size={14} /> Account
          </button>
          <button style={btnGhost} onClick={() => setShowImport(true)} title="Import transactions from CSV">
            <FileUp size={14} /> Import CSV
          </button>
          <button style={btnSolid} onClick={() => setShowTxn(true)}>
            <Plus size={14} /> Transaction
          </button>
        </div>
      </div>

      {/* Accounts grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {state.bankAccounts.length === 0 && (
          <div style={card}>
            <EmptyHint text="Add your first bank account" />
          </div>
        )}
        {state.bankAccounts.map((a) => (
          <div key={a.id} style={{ ...card, position: "relative" }}>
            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
              <button
                onClick={() => setEditBankId(a.id)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => removeItem("bankAccounts", a.id)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                }}
              >
                {a.type || "Savings"}
              </div>
              <OwnerBadge owner={a.owner} />
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              {a.bankName}
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
              ••••{(a.accountNumber || "").slice(-4)}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 28,
                fontWeight: 800,
                color: THEME.ink,
              }}
            >
              {fmtINRFull(a.balance)}
            </div>
          </div>
        ))}
      </div>

      {/* Transaction ledger */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Transaction Ledger
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              style={{ ...input, width: "auto", minWidth: 160 }}
              placeholder="Search notes or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              style={{ ...input, width: "auto", minWidth: 140 }}
              value={filterAcc}
              onChange={(e) => setFilterAcc(e.target.value)}
            >
              <option value="all">All accounts</option>
              {state.bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.bankName}</option>
              ))}
            </select>
            <select
              style={{ ...input, width: "auto", minWidth: 120 }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="credit">Credit only</option>
              <option value="debit">Debit only</option>
            </select>
            <input
              type="date"
              style={{ ...input, width: "auto" }}
              title="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span style={{ color: THEME.muted, fontSize: 12 }}>to</span>
            <input
              type="date"
              style={{ ...input, width: "auto" }}
              title="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            {["thisMonth", "lastMonth", "3months", "thisFY"].map((p) => {
              const labels = { thisMonth: "This Month", lastMonth: "Last Month", "3months": "Last 3M", thisFY: "This FY" };
              return (
                <button key={p} style={{ ...btnGhost, padding: "6px 10px", fontSize: 11, whiteSpace: "nowrap" }} onClick={() => setQuickRange(p)}>
                  {labels[p]}
                </button>
              );
            })}
            {(dateFrom || dateTo) && (
              <button
                style={{ ...btnGhost, padding: "4px 8px", fontSize: 12 }}
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredTxns.length === 0 ? (
          <EmptyHint text="No transactions" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                  <th style={th}>Date</th>
                  <th style={th}>Particulars</th>
                  <th style={th}>Category</th>
                  <th style={th}>Account</th>
                  <th style={{ ...th, textAlign: "right" }}>Debit</th>
                  <th style={{ ...th, textAlign: "right" }}>Credit</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {[...filteredTxns].reverse().map((t) => {
                  const bank = state.bankAccounts.find((b) => b.id === t.accountId);
                  const isEditing = inlineEditId === t.id;
                  const txnCats = ["Food", "Rent", "Transport", "Shopping", "Bills", "Salary", "Investment", "Tax", "Medical", "Entertainment", "EMI", "Groceries", "Utilities", "Other"];
                  if (isEditing && inlineEdit) {
                    return (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.accent}`, background: `color-mix(in srgb, var(--t-accent) 4%, transparent)` }}>
                        <td style={td}><input type="date" value={inlineEdit.date} onChange={(e) => setInlineEdit({ ...inlineEdit, date: e.target.value })} style={{ ...input, padding: "4px 6px", fontSize: 12, width: 130 }} /></td>
                        <td style={td}><input value={inlineEdit.note || ""} onChange={(e) => setInlineEdit({ ...inlineEdit, note: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { updateItem("transactions", t.id, inlineEdit); setInlineEditId(null); } if (e.key === "Escape") setInlineEditId(null); }} style={{ ...input, padding: "4px 6px", fontSize: 12, minWidth: 140 }} autoFocus /></td>
                        <td style={td}><select value={inlineEdit.category || ""} onChange={(e) => setInlineEdit({ ...inlineEdit, category: e.target.value })} style={{ ...input, padding: "4px 6px", fontSize: 12 }}>{txnCats.map((c) => <option key={c}>{c}</option>)}</select></td>
                        <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{bank?.bankName || "—"}</td>
                        <td style={{ ...td, textAlign: "right" }} colSpan={2}><input type="number" value={inlineEdit.amount} onChange={(e) => setInlineEdit({ ...inlineEdit, amount: e.target.value })} style={{ ...input, padding: "4px 6px", fontSize: 12, width: 100, textAlign: "right" }} /></td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 2 }}>
                            <button onClick={() => { updateItem("transactions", t.id, inlineEdit); setInlineEditId(null); }} style={{ ...iconBtn, color: THEME.sage }} title="Save"><Check size={14} /></button>
                            <button onClick={() => setInlineEditId(null)} style={{ ...iconBtn, color: THEME.rust }} title="Cancel"><X size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={t.id}
                      onDoubleClick={() => { setInlineEditId(t.id); setInlineEdit({ ...t }); }}
                      style={{ borderBottom: `1px dashed ${THEME.line}`, cursor: "default" }}
                      title="Double-click to edit inline"
                    >
                      <td style={td}>{t.date}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {t.note || "—"}
                          {recurringKeys.has((t.note || "") + "|" + t.amount + "|" + t.type) && (
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: THEME.gold + "33", color: THEME.gold, fontWeight: 700, whiteSpace: "nowrap" }}>RECURRING</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{t.category}</td>
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{bank?.bankName || "—"}</td>
                      <td style={{ ...td, textAlign: "right", color: THEME.accent, fontVariantNumeric: "tabular-nums" }}>
                        {t.type === "debit" ? fmtINRFull(t.amount) : ""}
                      </td>
                      <td style={{ ...td, textAlign: "right", color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                        {t.type === "credit" ? fmtINRFull(t.amount) : ""}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button onClick={() => setEditTxnId(t.id)} style={iconBtn}><Edit3 size={13} /></button>
                          <button onClick={() => removeItem("transactions", t.id)} style={iconBtn}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editBankId && (
        <BankEditModal
          account={state.bankAccounts.find((a) => a.id === editBankId)}
          onClose={() => setEditBankId(null)}
          onSave={(v) => {
            updateItem("bankAccounts", editBankId, v);
            setEditBankId(null);
          }}
        />
      )}
      {editTxnId && (
        <TxnEditModal
          txn={state.transactions.find((t) => t.id === editTxnId)}
          accounts={state.bankAccounts}
          onClose={() => setEditTxnId(null)}
          onSave={(v) => {
            updateItem("transactions", editTxnId, v);
            setEditTxnId(null);
          }}
        />
      )}
      {showBank && (
        <BankModal
          onClose={() => setShowBank(false)}
          onSave={(v) => {
            addItem("bankAccounts", v);
            setShowBank(false);
          }}
        />
      )}
      {showTxn && (
        <TxnModal
          accounts={state.bankAccounts}
          onClose={() => setShowTxn(false)}
          onSave={(v) => {
            addItem("transactions", v);
            setShowTxn(false);
          }}
        />
      )}
      {showImport && (
        <CsvImportModal
          accounts={state.bankAccounts}
          onClose={() => setShowImport(false)}
          onImport={(rows) => {
            rows.forEach((v) => addItem("transactions", v));
            setShowImport(false);
          }}
        />
      )}
    </div>
  );
}

const th = {
  textAlign: "left" as const,
  padding: "11px 10px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1px solid var(--t-line)`,
  whiteSpace: "nowrap" as const,
};
const td = {
  padding: "12px 10px",
  verticalAlign: "top" as const,
  fontSize: 13,
  borderBottom: `1px solid var(--t-line)`,
};
const iconBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: THEME.muted,
  padding: "5px",
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  transition: "color 0.15s ease, background 0.15s ease",
};

function BankModal({ onClose, onSave }) {
  const [f, setF] = useState({
    owner: "self",
    bankName: "",
    accountNumber: "",
    type: "Savings",
    balance: "",
  });
  return (
    <Modal title="Add Bank Account" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Bank Name">
        <input
          style={input}
          value={f.bankName}
          onChange={(e) => setF({ ...f, bankName: e.target.value })}
          placeholder="e.g. HDFC Bank"
        />
      </Field>
      <Field label="Account Number (last 4 ok)">
        <input
          style={input}
          value={f.accountNumber}
          onChange={(e) => setF({ ...f, accountNumber: e.target.value })}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select
            style={input}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            <option>Savings</option>
            <option>Current</option>
            <option>Salary</option>
            <option>Joint</option>
          </select>
        </Field>
        <Field label="Current Balance">
          <input
            style={input}
            type="number"
            value={f.balance}
            onChange={(e) => setF({ ...f, balance: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.bankName && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function TxnModal({ accounts, onClose, onSave }) {
  const [f, setF] = useState({
    owner: "self",
    date: today(),
    accountId: accounts[0]?.id || "",
    type: "debit",
    amount: "",
    category: "General",
    note: "",
  });
  const cats = [
    "General",
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Salary",
    "Transfer",
    "Investment",
    "Tax",
    "Medical",
    "Entertainment",
    "Other",
  ];
  return (
    <Modal title="Record Transaction" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label="Account">
          <select
            style={input}
            value={f.accountId}
            onChange={(e) => setF({ ...f, accountId: e.target.value })}
          >
            {accounts.length === 0 && (
              <option value="">Add account first</option>
            )}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bankName}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select
            style={input}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            <option value="debit">Debit (money out)</option>
            <option value="credit">Credit (money in)</option>
          </select>
        </Field>
        <Field label="Amount">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Category">
        <select
          style={input}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Note">
        <input
          style={input}
          value={f.note}
          onChange={(e) => {
            const note = e.target.value;
            const cat = autoCateg(note);
            setF({ ...f, note, ...(cat ? { category: cat } : {}) });
          }}
          placeholder="e.g. Swiggy order — category auto-detected"
        />
      </Field>
      <ModalActions
        onSave={() => f.amount && f.accountId && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

function TxnEditModal({ txn, accounts, onClose, onSave }) {
  const cats = ["General", "Food", "Transport", "Shopping", "Bills", "Salary", "Transfer", "Investment", "Tax", "Medical", "Entertainment", "Rent", "Utilities", "Other"];
  const [f, setF] = useState({
    date: txn?.date || today(),
    accountId: txn?.accountId || accounts[0]?.id || "",
    type: txn?.type || "debit",
    amount: txn?.amount || "",
    category: txn?.category || "General",
    note: txn?.note || "",
  });
  return (
    <Modal title="Edit Transaction" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Account">
          <select style={input} value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.bankName}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="debit">Debit (money out)</option>
            <option value="credit">Credit (money in)</option>
          </select>
        </Field>
        <Field label="Amount">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
      </div>
      <Field label="Category">
        <select style={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Note">
        <input style={input} value={f.note} onChange={(e) => {
          const note = e.target.value;
          const cat = autoCateg(note);
          setF({ ...f, note, ...(cat ? { category: cat } : {}) });
        }} placeholder="e.g. Swiggy order — category auto-detected" />
      </Field>
      <ModalActions onSave={() => f.amount && f.accountId && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== DEMAT TAB ==================
function DematTab({ state, addItem, removeItem, updateItem }) {
  const [showDemat, setShowDemat] = useState(false);
  const [editDematId, setEditDematId] = useState(null as any);
  const [showStock, setShowStock] = useState(false);
  const [stockDefaults, setStockDefaults] = useState(null);
  const [editStockId, setEditStockId] = useState(null);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [marketData, setMarketData] = useState({} as any);
  const [chartData, setChartData] = useState({} as any);
  const [expandedSymbols, setExpandedSymbols] = useState(new Set() as Set<string>);
  const [fetchingChart, setFetchingChart] = useState(null as string | null);
  const [sellLot, setSellLot] = useState(null as any);
  const [splitBonusGroup, setSplitBonusGroup] = useState(null as any);
  const [selectedDematId, setSelectedDematId] = useState<string | null>(null);

  // Group ALL stocks by (base symbol, exchange) — used for price fetching
  const groups: any[] = Object.values(
    state.stocks.reduce((acc: any, s: any) => {
      const base = s.symbol.replace(/\.(NS|BO)$/i, "");
      const exch = s.exchange || "NSE";
      const key = `${base}|${exch}`;
      if (!acc[key]) acc[key] = { base, exchange: exch, yfSym: `${base}.${exch === "BSE" ? "BO" : "NS"}`, lots: [] };
      acc[key].lots.push(s);
      return acc;
    }, {})
  );

  // Filtered view for selected demat account
  const visibleGroups = selectedDematId
    ? groups.map((g) => ({ ...g, lots: g.lots.filter((l: any) => l.dematId === selectedDematId) })).filter((g) => g.lots.length > 0)
    : groups;

  const filteredStocks = selectedDematId
    ? state.stocks.filter((s: any) => s.dematId === selectedDematId)
    : state.stocks;
  const filteredSells = selectedDematId
    ? (state.stockSells || []).filter((s: any) => s.dematId === selectedDematId)
    : (state.stockSells || []);

  const fetchLivePrices = async () => {
    if (!groups.length || fetchingPrices) return;
    setFetchingPrices(true);
    setFetchError(null);
    try {
      const symbols = groups.map((g) => g.yfSym);
      const res = await fetch(`/api/stock-price?symbols=${symbols.join(",")}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const newMd: any = { ...marketData };
      let found = 0;
      for (const g of groups) {
        const md = data[g.yfSym];
        if (md?.price != null) {
          newMd[g.yfSym] = md;
          for (const lot of g.lots) {
            updateItem("stocks", lot.id, { currentPrice: String(Number(md.price).toFixed(2)) });
          }
          found++;
        }
      }
      setMarketData(newMd);
      setLastRefreshed(new Date());
      const missed = groups.length - found;
      if (missed > 0) setFetchError(`${missed} symbol(s) not found — check ticker names (e.g. RELIANCE, TCS)`);
      else setFetchError(null);
    } catch (e: any) {
      setFetchError(`Failed to fetch: ${e.message}`);
    } finally {
      setFetchingPrices(false);
    }
  };

  const fetchIntradayChart = async (yfSym: string) => {
    if (chartData[yfSym] || fetchingChart === yfSym) return;
    setFetchingChart(yfSym);
    try {
      const res = await fetch(`/api/stock-chart?symbol=${encodeURIComponent(yfSym)}`);
      if (res.ok) {
        const data = await res.json();
        // API returns { date, points } — store as-is; fallback for old flat-array format
        const entry = Array.isArray(data) ? { date: null, points: data } : data;
        setChartData((prev: any) => ({ ...prev, [yfSym]: entry }));
      } else {
        setChartData((prev: any) => ({ ...prev, [yfSym]: { date: null, points: [] } }));
      }
    } catch (_) {
      setChartData((prev: any) => ({ ...prev, [yfSym]: { date: null, points: [] } }));
    }
    setFetchingChart(null);
  };

  const toggleExpand = (yfSym: string) => {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(yfSym)) {
        next.delete(yfSym);
      } else {
        next.add(yfSym);
        fetchIntradayChart(yfSym);
      }
      return next;
    });
  };

  const totalValue = filteredStocks.reduce((s: number, st: any) => s + Number(st.qty) * Number(st.currentPrice), 0);
  const totalInvested = filteredStocks.reduce((s: number, st: any) => s + Number(st.qty) * Number(st.avgPrice), 0);
  const pnl = totalValue - totalInvested;
  const realizedPnl = filteredSells.reduce((s: number, sl: any) => s + Number(sl.profit || 0), 0);

  const fmtVol = (v: number) => {
    if (!v) return "—";
    if (v >= 1e7) return (v / 1e7).toFixed(2) + "Cr";
    if (v >= 1e5) return (v / 1e5).toFixed(2) + "L";
    if (v >= 1000) return (v / 1000).toFixed(1) + "K";
    return String(v);
  };

  return (
    <div>
      <SectionTitle sub="Brokerage accounts and every scrip you hold">
        Demat & Stocks
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Briefcase} label="Demat Accounts" value={state.demat.length} />
        <Tile icon={BarChart3} label="Portfolio Value" value={fmtINRFull(totalValue)} />
        <Tile icon={TrendingUp} label="Unrealized P&L" value={fmtINRFull(pnl)}
          sub={totalInvested ? `${((pnl / totalInvested) * 100).toFixed(2)}%` : ""}
          subColor={pnl >= 0 ? THEME.sage : THEME.rust}
        />
        <Tile icon={Percent} label="Portfolio Return"
          value={totalInvested ? ((pnl / totalInvested) * 100).toFixed(2) + "%" : "—"}
          sub={`on ${fmtINR(totalInvested)} invested`}
          subColor={pnl >= 0 ? THEME.sage : THEME.rust}
        />
        <Tile icon={ArrowLeftRight} label="Realized P&L"
          value={fmtINRFull(realizedPnl)}
          sub={`${filteredSells.length} sell txn${filteredSells.length !== 1 ? "s" : ""}`}
          subColor={realizedPnl >= 0 ? THEME.sage : THEME.rust}
        />
      </div>

      {/* Demat accounts */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700 }}>Demat Accounts</div>
        <button style={btnGhost} onClick={() => setShowDemat(true)}><Plus size={14} /> Add Demat</button>
      </div>
      <Grid>
        {state.demat.length === 0 && <EmptyHint text="Add your brokerage/demat account" />}
        {state.demat.map((d: any) => (
          <InvestCard key={d.id} onRemove={() => removeItem("demat", d.id)} onEdit={() => setEditDematId(d.id)}>
            <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.muted }}>{d.broker}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, marginTop: 4 }}>DP ID: {d.dpId || "—"}</div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>Client ID: {d.clientId || "—"}</div>
          </InvestCard>
        ))}
      </Grid>

      {/* Stock Holdings */}
      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700 }}>Stock Holdings</div>
          {lastRefreshed && (
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
              Live prices as of {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          {fetchError && <div style={{ fontSize: 11, color: THEME.rust, marginTop: 2 }}>{fetchError}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 6, opacity: fetchingPrices ? 0.6 : 1 }}
            onClick={fetchLivePrices} disabled={fetchingPrices}>
            <RefreshCw size={13} style={fetchingPrices ? { animation: "spin 1s linear infinite" } : {}} />
            {fetchingPrices ? "Fetching…" : "Refresh Prices"}
          </button>
          <button style={btnSolid} onClick={() => { setStockDefaults(null); setShowStock(true); }}>
            <Plus size={14} /> Add Stock
          </button>
        </div>
      </div>

      {/* Demat account filter chips */}
      {state.demat.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button
            onClick={() => setSelectedDematId(null)}
            style={{ ...btnGhost, fontSize: 12, background: selectedDematId === null ? THEME.accent : undefined, color: selectedDematId === null ? "#fff" : undefined, border: selectedDematId === null ? `1px solid ${THEME.accent}` : undefined }}
          >
            All Accounts
          </button>
          {state.demat.map((d: any) => (
            <button
              key={d.id}
              onClick={() => setSelectedDematId(d.id)}
              style={{ ...btnGhost, fontSize: 12, background: selectedDematId === d.id ? THEME.accent : undefined, color: selectedDematId === d.id ? "#fff" : undefined, border: selectedDematId === d.id ? `1px solid ${THEME.accent}` : undefined }}
            >
              {d.broker || d.dpId || "Account"}
              {d.dpId && d.broker ? <span style={{ opacity: 0.7, marginLeft: 4 }}>· {d.dpId}</span> : null}
            </button>
          ))}
        </div>
      )}

      {state.stocks.length === 0 ? (
        <div style={card}><EmptyHint text="No stock holdings yet" /></div>
      ) : visibleGroups.length === 0 ? (
        <div style={card}><EmptyHint text={`No holdings in ${state.demat.find((d: any) => d.id === selectedDematId)?.broker || "this account"}`} /></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visibleGroups.map(({ base, exchange, yfSym, lots }) => {
            const md = marketData[yfSym];
            const currentPrice = md?.price ?? Number(lots[0]?.currentPrice ?? 0);
            const totalQty = lots.reduce((s: number, l: any) => s + Number(l.qty), 0);
            const totalInv = lots.reduce((s: number, l: any) => s + Number(l.qty) * Number(l.avgPrice), 0);
            const totalCurr = totalQty * currentPrice;
            const totalPnl = totalCurr - totalInv;
            const totalPnlPct = totalInv ? (totalPnl / totalInv) * 100 : 0;
            const isExpanded = expandedSymbols.has(yfSym);
            const isLive = !!md;
            const chartEntry = chartData[yfSym];
            const charts: any[] | null = chartEntry ? (chartEntry.points ?? chartEntry) : null;
            const chartDate: string | null = chartEntry?.date ?? null;
            const changeAmt = md?.change ?? 0;
            const changePct = md?.changePercent ?? 0;

            return (
              <div key={yfSym} style={{ ...card, padding: 0, overflow: "hidden" }}>
                {/* Group header — click to expand */}
                <div
                  style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 12, padding: "14px 18px", cursor: "pointer", borderBottom: isExpanded ? `1px solid ${THEME.line}` : "none" }}
                  onClick={() => toggleExpand(yfSym)}
                >
                  <div style={{ paddingTop: 3, color: THEME.muted, flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  <div style={{ flexShrink: 0, minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.02em" }}>{base}</span>
                      <span style={{ fontSize: 10, background: THEME.line, color: THEME.muted, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>{exchange}</span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>{lots.length} lot{lots.length > 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                      ₹{currentPrice.toFixed(2)}
                      {isLive && <span style={{ marginLeft: 5, fontSize: 9, color: THEME.sage, fontWeight: 700, verticalAlign: "middle" }}>●LIVE</span>}
                    </div>
                    {isLive && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: changeAmt >= 0 ? THEME.sage : THEME.rust }}>
                        {changeAmt >= 0 ? "+" : ""}{changeAmt.toFixed(2)} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "flex-end", alignItems: "flex-start" }}>
                    {[
                      { label: "Qty", val: String(totalQty) },
                      { label: "Invested", val: fmtINR(totalInv) },
                      { label: "Current", val: fmtINR(totalCurr) },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                        <div style={{ fontWeight: 600, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{val}</div>
                      </div>
                    ))}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>P&L</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: totalPnl >= 0 ? THEME.sage : THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                        {totalPnl >= 0 ? "+" : ""}{fmtINR(totalPnl)}
                      </div>
                      <div style={{ fontSize: 11, color: totalPnl >= 0 ? THEME.sage : THEME.rust }}>
                        {totalPnl >= 0 ? "▲" : "▼"}{Math.abs(totalPnlPct).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div>
                    {/* Market data bar */}
                    {isLive && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: "10px 18px", background: "rgba(128,128,128,0.06)", borderBottom: `1px solid ${THEME.line}`, fontSize: 12 }}>
                        {md.prevClose != null && (
                          <span><span style={{ color: THEME.muted }}>Prev Close </span><b>₹{md.prevClose.toFixed(2)}</b></span>
                        )}
                        {md.dayHigh != null && md.dayLow != null && (
                          <span>
                            <span style={{ color: THEME.muted }}>Day H/L </span>
                            <b style={{ color: THEME.sage }}>{md.dayHigh.toFixed(2)}</b>
                            <span style={{ color: THEME.muted }}> / </span>
                            <b style={{ color: THEME.rust }}>{md.dayLow.toFixed(2)}</b>
                          </span>
                        )}
                        {md.weekHigh52 != null && md.weekLow52 != null && (
                          <span>
                            <span style={{ color: THEME.muted }}>52W H/L </span>
                            <b style={{ color: THEME.sage }}>{md.weekHigh52.toFixed(2)}</b>
                            <span style={{ color: THEME.muted }}> / </span>
                            <b style={{ color: THEME.rust }}>{md.weekLow52.toFixed(2)}</b>
                          </span>
                        )}
                        {md.volume != null && (
                          <span><span style={{ color: THEME.muted }}>Vol </span><b>{fmtVol(md.volume)}</b></span>
                        )}
                      </div>
                    )}

                    {/* Intraday chart */}
                    {charts && charts.length > 2 ? (
                      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {chartDate ? `Session Chart — ${chartDate}` : "Intraday Chart"}
                        </div>
                        <ResponsiveContainer width="100%" height={130}>
                          <AreaChart data={charts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <defs>
                              <linearGradient id={`ig-${base}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--t-muted)" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                            <YAxis hide domain={["auto", "auto"]} />
                            <Tooltip
                              contentStyle={{ fontSize: 12, background: "var(--t-paper)", border: `1px solid ${THEME.line}`, borderRadius: 6 }}
                              formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, "Price"]}
                              labelStyle={{ color: "var(--t-muted)" }}
                            />
                            <Area type="monotone" dataKey="p"
                              stroke={changeAmt >= 0 ? THEME.sage : THEME.rust}
                              strokeWidth={1.5}
                              fill={`url(#ig-${base})`}
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : fetchingChart === yfSym ? (
                      <div style={{ padding: "12px 18px", fontSize: 12, color: THEME.muted, borderBottom: `1px solid ${THEME.line}` }}>
                        Loading chart…
                      </div>
                    ) : charts != null ? (
                      <div style={{ padding: "10px 18px", fontSize: 11, color: THEME.muted, borderBottom: `1px solid ${THEME.line}` }}>
                        Chart unavailable — market may be closed or no data for this session
                      </div>
                    ) : null}

                    {/* Per-lot table */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
                            <th style={{ ...th, paddingLeft: 18 }}>Broker</th>
                            <th style={{ ...th, textAlign: "right" }}>Qty</th>
                            <th style={{ ...th, textAlign: "right" }}>Buy Price</th>
                            <th style={{ ...th, textAlign: "right" }}>Buy Date</th>
                            <th style={{ ...th, textAlign: "right" }}>Invested</th>
                            {isLive && <th style={{ ...th, textAlign: "right" }}>Day Gain</th>}
                            <th style={{ ...th, textAlign: "right" }}>Overall Gain</th>
                            <th style={{ ...th, textAlign: "right" }}>Curr Value</th>
                            <th style={th}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lots.map((lot: any) => {
                            const lInv = Number(lot.qty) * Number(lot.avgPrice);
                            const lCurr = Number(lot.qty) * currentPrice;
                            const lPnl = lCurr - lInv;
                            const lPnlPct = lInv ? (lPnl / lInv) * 100 : 0;
                            const lDayGain = isLive ? Number(lot.qty) * changeAmt : null;
                            const demat = state.demat.find((d: any) => d.id === lot.dematId);
                            return (
                              <tr key={lot.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                                <td style={{ ...td, paddingLeft: 18, color: THEME.muted, fontSize: 12 }}>{demat?.broker || "—"}</td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{lot.qty}</td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{Number(lot.avgPrice).toFixed(2)}</td>
                                <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>
                                  {lot.buyDate ? new Date(lot.buyDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                                </td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINR(lInv)}</td>
                                {isLive && (
                                  <td style={{ ...td, textAlign: "right", color: (lDayGain ?? 0) >= 0 ? THEME.sage : THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                                    {(lDayGain ?? 0) >= 0 ? "+" : ""}{fmtINR(lDayGain ?? 0)}
                                    <br /><span style={{ fontSize: 11 }}>({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)</span>
                                  </td>
                                )}
                                <td style={{ ...td, textAlign: "right", color: lPnl >= 0 ? THEME.sage : THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                                  {lPnl >= 0 ? "+" : ""}{fmtINR(lPnl)}
                                  <br /><span style={{ fontSize: 11 }}>{lPnl >= 0 ? "▲" : "▼"}{Math.abs(lPnlPct).toFixed(2)}%</span>
                                  {lot.buyDate && (() => {
                                    const cagr = calcCAGR(lInv, lCurr, lot.buyDate);
                                    return cagr !== null ? (
                                      <span style={{ fontSize: 10, display: "block", color: cagr >= 15 ? THEME.sage : cagr >= 8 ? THEME.gold : THEME.rust, fontWeight: 700 }}>
                                        CAGR {cagr >= 0 ? "+" : ""}{cagr.toFixed(1)}%/yr
                                      </span>
                                    ) : null;
                                  })()}
                                </td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINR(lCurr)}</td>
                                <td style={td}>
                                  <div style={{ display: "flex", gap: 2 }}>
                                    <button onClick={(e) => { e.stopPropagation(); setSellLot({ ...lot, base, exchange, currentPrice, broker: demat?.broker || "" }); }} style={{ ...iconBtn, color: THEME.rust }} title="Sell"><ArrowLeftRight size={13} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditStockId(lot.id); }} style={iconBtn}><Edit3 size={13} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); removeItem("stocks", lot.id); }} style={iconBtn}><Trash2 size={13} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Add lot footer */}
                    <div style={{ padding: "10px 18px", borderTop: `1px solid ${THEME.line}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        style={{ ...btnGhost, fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); setStockDefaults({ symbol: base, exchange, dematId: lots[0]?.dematId }); setShowStock(true); }}
                      >
                        <Plus size={12} /> Add Lot to {base}
                      </button>
                      <button
                        style={{ ...btnGhost, fontSize: 12, color: THEME.gold }}
                        onClick={(e) => { e.stopPropagation(); setSplitBonusGroup({ base, exchange, lots }); }}
                      >
                        <Scissors size={12} /> Split / Bonus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showDemat && (
        <DematModal onClose={() => setShowDemat(false)} onSave={(v: any) => { addItem("demat", v); setShowDemat(false); }} />
      )}
      {editDematId && (
        <DematModal
          initial={state.demat.find((d: any) => d.id === editDematId)}
          onClose={() => setEditDematId(null)}
          onSave={(v: any) => { updateItem("demat", editDematId, v); setEditDematId(null); }}
        />
      )}
      {showStock && (
        <StockModal
          demats={state.demat}
          defaults={stockDefaults}
          onClose={() => { setShowStock(false); setStockDefaults(null); }}
          onSave={(v: any) => { addItem("stocks", v); setShowStock(false); setStockDefaults(null); }}
        />
      )}
      {editStockId && (
        <StockModal
          demats={state.demat}
          initial={state.stocks.find((x: any) => x.id === editStockId)}
          onClose={() => setEditStockId(null)}
          onSave={(v: any) => { updateItem("stocks", editStockId, v); setEditStockId(null); }}
        />
      )}
      {sellLot && (
        <SellStockModal
          lot={sellLot}
          onClose={() => setSellLot(null)}
          onSave={(sellRecord: any, remainingQty: number) => {
            addItem("stockSells", sellRecord);
            if (remainingQty <= 0) {
              removeItem("stocks", sellLot.id);
            } else {
              updateItem("stocks", sellLot.id, { qty: String(remainingQty) });
            }
            setSellLot(null);
          }}
        />
      )}
      {splitBonusGroup && (
        <SplitBonusModal
          group={splitBonusGroup}
          onClose={() => setSplitBonusGroup(null)}
          onApply={(updates: any[]) => {
            updates.forEach((u: any) => updateItem("stocks", u.id, { qty: u.qty, avgPrice: u.avgPrice }));
            setSplitBonusGroup(null);
          }}
        />
      )}
    </div>
  );
}

function DematModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { broker: "", dpId: "", clientId: "", owner: "self" });
  return (
    <Modal title={initial ? "Edit Demat Account" : "Add Demat Account"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Broker">
        <input
          style={input}
          value={f.broker}
          onChange={(e) => setF({ ...f, broker: e.target.value })}
          placeholder="e.g. Zerodha, Groww"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="DP ID">
          <input
            style={input}
            value={f.dpId}
            onChange={(e) => setF({ ...f, dpId: e.target.value })}
          />
        </Field>
        <Field label="Client ID">
          <input
            style={input}
            value={f.clientId}
            onChange={(e) => setF({ ...f, clientId: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.broker && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function StockModal({ demats, onClose, onSave, initial = null, defaults = null }: any) {
  const [f, setF] = useState(initial || {
    symbol: defaults?.symbol || "",
    exchange: defaults?.exchange || "NSE",
    dematId: defaults?.dematId || demats[0]?.id || "",
    qty: "",
    avgPrice: "",
    currentPrice: "",
    buyDate: "",
  });
  return (
    <Modal title={initial ? "Edit Stock" : "Add Stock"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
        <Field label="Symbol">
          <input
            style={input}
            value={f.symbol}
            onChange={(e) => setF({ ...f, symbol: e.target.value.toUpperCase().replace(/\.(NS|BO)$/i, "") })}
            placeholder="e.g. RELIANCE"
          />
        </Field>
        <Field label="Exchange">
          <select style={{ ...input, width: 90 }} value={f.exchange || "NSE"} onChange={e => setF({ ...f, exchange: e.target.value })}>
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
          </select>
        </Field>
      </div>
      <Field label="Demat Account">
        <select
          style={input}
          value={f.dematId}
          onChange={(e) => setF({ ...f, dematId: e.target.value })}
        >
          {demats.length === 0 && <option value="">Add demat first</option>}
          {demats.map((d) => (
            <option key={d.id} value={d.id}>
              {d.broker}
            </option>
          ))}
        </select>
      </Field>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
      >
        <Field label="Quantity">
          <input
            style={input}
            type="number"
            value={f.qty}
            onChange={(e) => setF({ ...f, qty: e.target.value })}
          />
        </Field>
        <Field label="Avg Price">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.avgPrice}
            onChange={(e) => setF({ ...f, avgPrice: e.target.value })}
          />
        </Field>
        <Field label="Current Price">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.currentPrice}
            onChange={(e) => setF({ ...f, currentPrice: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Buy Date (optional — enables CAGR calculation)">
        <input style={input} type="date" value={f.buyDate || ""} onChange={(e) => setF({ ...f, buyDate: e.target.value })} />
      </Field>
      <ModalActions
        onSave={() => f.symbol && f.qty && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

// ================== SELL STOCK MODAL ==================
function SellStockModal({ lot, onClose, onSave }: any) {
  const today = new Date().toISOString().split("T")[0];
  const [f, setF] = useState({
    sellQty: String(lot.qty),
    sellPrice: String(lot.currentPrice || ""),
    sellDate: today,
    broker: lot.broker || "",
  });
  const sellQtyNum = Number(f.sellQty) || 0;
  const sellPriceNum = Number(f.sellPrice) || 0;
  const profit = (sellPriceNum - Number(lot.avgPrice)) * sellQtyNum;
  const remainingQty = Number(lot.qty) - sellQtyNum;

  const handleSave = () => {
    if (!sellQtyNum || !sellPriceNum || sellQtyNum > Number(lot.qty)) return;
    const record = {
      id: `ss-${Date.now()}`,
      owner: lot.owner || "self",
      symbol: lot.base || lot.symbol,
      exchange: lot.exchange || "NSE",
      qty: sellQtyNum,
      buyPrice: Number(lot.avgPrice),
      buyDate: lot.buyDate || "",
      sellPrice: sellPriceNum,
      sellDate: f.sellDate,
      broker: f.broker,
      dematId: lot.dematId || "",
      profit: Number(profit.toFixed(2)),
    };
    onSave(record, remainingQty);
  };

  return (
    <Modal title={`Sell ${lot.base || lot.symbol}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: "var(--t-muted)", marginBottom: 12 }}>
        Holding: <b>{lot.qty}</b> shares @ avg ₹{Number(lot.avgPrice).toFixed(2)} · Lot bought {lot.buyDate || "—"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Sell Qty">
          <input style={input} type="number" min="1" max={lot.qty} value={f.sellQty}
            onChange={(e) => setF({ ...f, sellQty: e.target.value })} />
        </Field>
        <Field label="Sell Price (₹)">
          <input style={input} type="number" step="0.01" value={f.sellPrice}
            onChange={(e) => setF({ ...f, sellPrice: e.target.value })} />
        </Field>
      </div>
      <Field label="Sell Date">
        <input style={input} type="date" value={f.sellDate}
          onChange={(e) => setF({ ...f, sellDate: e.target.value })} />
      </Field>
      <Field label="Broker">
        {lot.broker ? (
          <input style={{ ...input, background: "rgba(128,128,128,0.08)", cursor: "default", color: "var(--t-text)" }}
            value={f.broker} readOnly />
        ) : (
          <input style={input} value={f.broker} placeholder="e.g. Zerodha"
            onChange={(e) => setF({ ...f, broker: e.target.value })} />
        )}
        {lot.broker && <div style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 3 }}>From your demat account</div>}
      </Field>
      {sellQtyNum > 0 && sellPriceNum > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: profit >= 0 ? "rgba(72,199,142,0.1)" : "rgba(255,99,99,0.1)", marginTop: 4 }}>
          <span style={{ fontSize: 13, color: "var(--t-muted)" }}>Estimated Profit/Loss: </span>
          <b style={{ color: profit >= 0 ? THEME.sage : THEME.rust }}>
            {profit >= 0 ? "+" : ""}₹{Math.abs(profit).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </b>
          {remainingQty > 0 && <span style={{ fontSize: 12, color: "var(--t-muted)", marginLeft: 12 }}>{remainingQty} shares remain</span>}
          {remainingQty <= 0 && <span style={{ fontSize: 12, color: THEME.rust, marginLeft: 12 }}>Full lot sold</span>}
        </div>
      )}
      {sellQtyNum > Number(lot.qty) && (
        <div style={{ color: THEME.rust, fontSize: 12, marginTop: 4 }}>Cannot sell more than {lot.qty} shares</div>
      )}
      <ModalActions onSave={handleSave} onClose={onClose} />
    </Modal>
  );
}

// ================== SPLIT / BONUS MODAL ==================
function SplitBonusModal({ group, onClose, onApply }: any) {
  const [type, setType] = useState<"split" | "bonus">("split");
  const [ratioN, setRatioN] = useState("2");
  const [ratioM, setRatioM] = useState("1");

  const n = Number(ratioN) || 0;
  const m = Number(ratioM) || 0;

  const totalQty = group.lots.reduce((s: number, l: any) => s + Number(l.qty), 0);
  const totalInv = group.lots.reduce((s: number, l: any) => s + Number(l.qty) * Number(l.avgPrice), 0);

  let newTotalQty = 0;
  if (n > 0 && m > 0) {
    if (type === "split") {
      newTotalQty = totalQty * n / m;
    } else {
      newTotalQty = totalQty * (m + n) / m;
    }
  }
  const newAvgPreview = newTotalQty > 0 ? totalInv / newTotalQty : 0;
  const isValid = n > 0 && m > 0 && (type === "split" ? n > m : true);

  const handleApply = () => {
    if (!isValid) return;
    const updates = group.lots.map((lot: any) => {
      const oldQty = Number(lot.qty);
      const oldAvg = Number(lot.avgPrice);
      const newQty = type === "split"
        ? Math.round(oldQty * n / m)
        : Math.round(oldQty * (m + n) / m);
      const newAvg = newQty > 0 ? (oldQty * oldAvg) / newQty : oldAvg;
      return { id: lot.id, qty: String(newQty), avgPrice: String(Number(newAvg.toFixed(4)) ) };
    });
    onApply(updates);
  };

  const ratioLabel = type === "split"
    ? `${n}:${m} split — for every ${m} share${m !== 1 ? "s" : ""} you hold, you get ${n} share${n !== 1 ? "s" : ""} total`
    : `${n}:${m} bonus — for every ${m} share${m !== 1 ? "s" : ""} held, you get ${n} bonus share${n !== 1 ? "s" : ""}`;

  return (
    <Modal title={`Corporate Action — ${group.base} (${group.exchange})`} onClose={onClose}>
      <Field label="Action Type">
        <div style={{ display: "flex", gap: 10 }}>
          {(["split", "bonus"] as const).map((t) => (
            <button
              key={t}
              style={{
                ...btnGhost,
                flex: 1,
                justifyContent: "center",
                background: type === t ? THEME.accent : undefined,
                color: type === t ? "#fff" : undefined,
                border: type === t ? `1px solid ${THEME.accent}` : undefined,
              }}
              onClick={() => setType(t)}
            >
              {t === "split" ? "Stock Split" : "Bonus Shares"}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8 }}>
        {type === "split"
          ? "Enter the split ratio (e.g. 2:1 means each share becomes 2 shares, price halves)"
          : "Enter the bonus ratio (e.g. 1:1 means 1 bonus share for every 1 share held)"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end" }}>
        <Field label={type === "split" ? "New Shares" : "Bonus Shares"}>
          <input style={input} type="number" min="1" value={ratioN}
            onChange={(e) => setRatioN(e.target.value)} />
        </Field>
        <div style={{ paddingBottom: 10, fontWeight: 700, fontSize: 20, color: THEME.muted, textAlign: "center" }}>:</div>
        <Field label="Existing Shares">
          <input style={input} type="number" min="1" value={ratioM}
            onChange={(e) => setRatioM(e.target.value)} />
        </Field>
      </div>

      {type === "split" && n > 0 && m > 0 && n <= m && (
        <div style={{ color: THEME.rust, fontSize: 12, marginBottom: 8 }}>
          Split ratio must be greater than 1:1 (new shares must exceed existing)
        </div>
      )}

      {isValid && newTotalQty > 0 && (
        <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(128,128,128,0.08)", marginTop: 4, fontSize: 13 }}>
          <div style={{ marginBottom: 6, color: THEME.muted, fontSize: 11 }}>{ratioLabel}</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <span>
              <span style={{ color: THEME.muted }}>Total Qty: </span>
              <b style={{ color: THEME.muted }}>{totalQty}</b>
              <span style={{ color: THEME.muted }}> → </span>
              <b style={{ color: THEME.gold }}>{Math.round(newTotalQty)}</b>
            </span>
            <span>
              <span style={{ color: THEME.muted }}>Avg Price: </span>
              <b style={{ color: THEME.muted }}>₹{(totalInv / totalQty).toFixed(2)}</b>
              <span style={{ color: THEME.muted }}> → </span>
              <b style={{ color: THEME.gold }}>₹{newAvgPreview.toFixed(2)}</b>
            </span>
            <span>
              <span style={{ color: THEME.muted }}>Total Invested: </span>
              <b>{fmtINR(totalInv)}</b>
              <span style={{ color: THEME.sage, fontSize: 11, marginLeft: 4 }}>unchanged</span>
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: THEME.muted }}>
            Applies to all {group.lots.length} lot{group.lots.length !== 1 ? "s" : ""} of {group.base}
          </div>
        </div>
      )}

      <ModalActions onSave={handleApply} onClose={onClose} saveLabel="Apply" />
    </Modal>
  );
}

// ================== MF SELL MODAL ==================
function MFSellModal({ lot, onClose, onSave }: any) {
  const today = new Date().toISOString().split("T")[0];
  const [f, setF] = useState({
    sellUnits: String(lot.units),
    sellNav: String(lot.currentNav || ""),
    sellDate: today,
    broker: "",
  });
  const buyNav = lot.buyNav ? Number(lot.buyNav) : (lot.invested && lot.units ? Number(lot.invested) / Number(lot.units) : 0);
  const sellUnitsNum = Number(f.sellUnits) || 0;
  const sellNavNum = Number(f.sellNav) || 0;
  const profit = (sellNavNum - buyNav) * sellUnitsNum;
  const remainingUnits = Number(lot.units) - sellUnitsNum;

  const handleSave = () => {
    if (!sellUnitsNum || !sellNavNum || sellUnitsNum > Number(lot.units)) return;
    const record = {
      id: `mfs-${Date.now()}`,
      owner: lot.owner || "self",
      scheme: lot.scheme || lot.scheme,
      type: lot.type || "Equity",
      units: sellUnitsNum,
      buyNav: Number(buyNav.toFixed(4)),
      buyDate: lot.buyDate || "",
      sellNav: sellNavNum,
      sellDate: f.sellDate,
      broker: f.broker,
      profit: Number(profit.toFixed(2)),
    };
    onSave(record, remainingUnits);
  };

  return (
    <Modal title={`Redeem — ${lot.scheme}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: "var(--t-muted)", marginBottom: 12 }}>
        Holding: <b>{Number(lot.units).toFixed(3)}</b> units @ buy NAV ₹{buyNav ? buyNav.toFixed(4) : "—"} · Bought {lot.buyDate || "—"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Units to Redeem">
          <input style={input} type="number" step="0.001" min="0.001" max={lot.units} value={f.sellUnits}
            onChange={(e) => setF({ ...f, sellUnits: e.target.value })} />
        </Field>
        <Field label="Redemption NAV (₹)">
          <input style={input} type="number" step="0.0001" value={f.sellNav}
            onChange={(e) => setF({ ...f, sellNav: e.target.value })} />
        </Field>
      </div>
      <Field label="Redemption Date">
        <input style={input} type="date" value={f.sellDate}
          onChange={(e) => setF({ ...f, sellDate: e.target.value })} />
      </Field>
      <Field label="Broker/Platform (optional)">
        <input style={input} value={f.broker} placeholder="e.g. Zerodha Coin, Groww"
          onChange={(e) => setF({ ...f, broker: e.target.value })} />
      </Field>
      {sellUnitsNum > 0 && sellNavNum > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: profit >= 0 ? "rgba(72,199,142,0.1)" : "rgba(255,99,99,0.1)", marginTop: 4 }}>
          <span style={{ fontSize: 13, color: "var(--t-muted)" }}>Estimated Gain/Loss: </span>
          <b style={{ color: profit >= 0 ? THEME.sage : THEME.rust }}>
            {profit >= 0 ? "+" : ""}₹{Math.abs(profit).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </b>
          {remainingUnits > 0 && <span style={{ fontSize: 12, color: "var(--t-muted)", marginLeft: 12 }}>{remainingUnits.toFixed(3)} units remain</span>}
          {remainingUnits <= 0 && <span style={{ fontSize: 12, color: THEME.rust, marginLeft: 12 }}>Full lot redeemed</span>}
        </div>
      )}
      {sellUnitsNum > Number(lot.units) && (
        <div style={{ color: THEME.rust, fontSize: 12, marginTop: 4 }}>Cannot redeem more than {Number(lot.units).toFixed(3)} units</div>
      )}
      <ModalActions onSave={handleSave} onClose={onClose} />
    </Modal>
  );
}

// ================== TRANSACTION HISTORY TAB ==================
function TxnHistoryTab({ state, removeItem }: any) {
  const currentFY = (() => {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 3 ? y : y - 1;
  })();
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [activeSection, setActiveSection] = useState<"all" | "stocks_bought" | "stocks_sold" | "mf_bought" | "mf_sold">("all");
  const [txnDematId, setTxnDematId] = useState<string | null>(null);

  const fyStart = (fy: number) => new Date(`${fy}-04-01`);
  const fyEnd = (fy: number) => new Date(`${fy + 1}-03-31T23:59:59`);
  const inFY = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= fyStart(selectedFY) && d <= fyEnd(selectedFY);
  };

  const allFYs = useMemo(() => {
    const fySet = new Set<number>();
    fySet.add(currentFY);
    const addFY = (dateStr: string) => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      fySet.add(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
    };
    (state.stocks || []).forEach((s: any) => addFY(s.buyDate));
    (state.stockSells || []).forEach((s: any) => addFY(s.sellDate));
    (state.mutualFunds || []).forEach((m: any) => addFY(m.buyDate));
    (state.mfSells || []).forEach((m: any) => addFY(m.sellDate));
    return Array.from(fySet).sort((a, b) => b - a);
  }, [state.stocks, state.stockSells, state.mutualFunds, state.mfSells, currentFY]);

  const stocksBoughtInFY = useMemo(() =>
    (state.stocks || [])
      .filter((s: any) => inFY(s.buyDate) && (!txnDematId || s.dematId === txnDematId))
      .sort((a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()),
    [state.stocks, selectedFY, txnDematId]
  );
  const stocksSoldInFY = useMemo(() =>
    (state.stockSells || [])
      .filter((s: any) => inFY(s.sellDate) && (!txnDematId || s.dematId === txnDematId))
      .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.stockSells, selectedFY, txnDematId]
  );
  const mfBoughtInFY = useMemo(() =>
    (state.mutualFunds || []).filter((m: any) => inFY(m.buyDate))
      .sort((a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()),
    [state.mutualFunds, selectedFY]
  );
  const mfSoldInFY = useMemo(() =>
    (state.mfSells || []).filter((m: any) => inFY(m.sellDate))
      .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.mfSells, selectedFY]
  );

  const stocksRealizedPnl = stocksSoldInFY.reduce((s: number, sl: any) => s + Number(sl.profit || 0), 0);
  const mfRealizedPnl = mfSoldInFY.reduce((s: number, sl: any) => s + Number(sl.profit || 0), 0);
  const totalRealizedPnl = stocksRealizedPnl + mfRealizedPnl;

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fyLabel = `FY ${String(selectedFY).slice(2)}-${String(selectedFY + 1).slice(2)}`;

  const sections = [
    { id: "all", label: "All" },
    { id: "stocks_bought", label: "Stocks Bought" },
    { id: "stocks_sold", label: "Stocks Sold" },
    { id: "mf_bought", label: "MF Bought" },
    { id: "mf_sold", label: "MF Sold" },
  ] as const;

  const show = (id: typeof sections[number]["id"]) => activeSection === "all" || activeSection === id;

  const SoldTable = ({ rows, type }: { rows: any[], type: "stock" | "mf" }) => {
    const total = rows.reduce((s, r) => s + Number(r.profit || 0), 0);
    if (rows.length === 0) return <div style={card}><EmptyHint text={`No ${type === "stock" ? "stock sales" : "MF redemptions"} recorded in ${fyLabel}`} /></div>;
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
              <th style={{ ...th, paddingLeft: 4 }}>{type === "stock" ? "Company" : "Scheme"}</th>
              <th style={{ ...th, textAlign: "right" }}>Buy Date</th>
              <th style={{ ...th, textAlign: "right" }}>{type === "stock" ? "Buy Price" : "Buy NAV"}</th>
              <th style={{ ...th, textAlign: "right" }}>{type === "stock" ? "Qty" : "Units"}</th>
              <th style={{ ...th, textAlign: "right" }}>Sell Date</th>
              <th style={{ ...th, textAlign: "right" }}>{type === "stock" ? "Sell Price" : "Sell NAV"}</th>
              <th style={{ ...th, textAlign: "right" }}>Profit / Loss</th>
              <th style={{ ...th, textAlign: "right" }}>Broker</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s: any) => {
              const profit = Number(s.profit || 0);
              const buyP = type === "stock" ? Number(s.buyPrice) : Number(s.buyNav);
              const sellP = type === "stock" ? Number(s.sellPrice) : Number(s.sellNav);
              return (
                <tr key={s.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                  <td style={{ ...td, paddingLeft: 4 }}>
                    <b>{type === "stock" ? s.symbol?.replace(/\.(NS|BO)$/i, "") : s.scheme}</b>
                    {type === "stock" && <span style={{ fontSize: 10, marginLeft: 5, color: THEME.muted, background: THEME.line, padding: "1px 4px", borderRadius: 3 }}>{s.exchange || "NSE"}</span>}
                    {type === "mf" && s.type && <span style={{ fontSize: 10, marginLeft: 5, color: THEME.muted, background: THEME.line, padding: "1px 4px", borderRadius: 3 }}>{s.type}</span>}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{fmtDate(s.buyDate)}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{buyP.toFixed(type === "mf" ? 4 : 2)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{type === "stock" ? s.qty : Number(s.units).toFixed(3)}</td>
                  <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{fmtDate(s.sellDate)}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ color: sellP >= buyP ? THEME.sage : THEME.rust }}>
                      ₹{sellP.toFixed(type === "mf" ? 4 : 2)} {sellP >= buyP ? "↑" : "↓"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right", color: profit >= 0 ? THEME.sage : THEME.rust, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {profit >= 0 ? "+" : ""}₹{Math.abs(profit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{s.broker || "—"}</td>
                  <td style={td}>
                    <button onClick={() => removeItem(type === "stock" ? "stockSells" : "mfSells", s.id)} style={iconBtn}><Trash2 size={13} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${THEME.line}` }}>
              <td colSpan={6} style={{ ...td, paddingLeft: 4, fontWeight: 700, fontSize: 13 }}>Total</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700, color: total >= 0 ? THEME.sage : THEME.rust }}>
                {total >= 0 ? "+" : ""}₹{Math.abs(total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </td>
              <td colSpan={2} style={td}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div>
      <SectionTitle sub="Complete record of every stock and MF you bought and sold">
        Transaction History
      </SectionTitle>

      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--t-muted)" }}>Period:</span>
          <select style={{ ...input, width: "auto", padding: "6px 10px" }} value={selectedFY}
            onChange={(e) => setSelectedFY(Number(e.target.value))}>
            {allFYs.map((fy) => (
              <option key={fy} value={fy}>FY {String(fy).slice(2)}-{String(fy + 1).slice(2)}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {sections.map((s) => (
            <button key={s.id} style={{ ...btnGhost, fontSize: 12, padding: "5px 12px", ...(activeSection === s.id ? { background: THEME.accent, color: "#fff", borderColor: THEME.accent } : {}) }}
              onClick={() => setActiveSection(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Demat account filter — applies to stock buy/sell sections */}
      {(state.demat || []).length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--t-muted)" }}>Account:</span>
          <button
            onClick={() => setTxnDematId(null)}
            style={{ ...btnGhost, fontSize: 12, padding: "4px 12px", ...(txnDematId === null ? { background: THEME.accent, color: "#fff", borderColor: THEME.accent } : {}) }}
          >
            All
          </button>
          {(state.demat || []).map((d: any) => (
            <button
              key={d.id}
              onClick={() => setTxnDematId(d.id)}
              style={{ ...btnGhost, fontSize: 12, padding: "4px 12px", ...(txnDematId === d.id ? { background: THEME.accent, color: "#fff", borderColor: THEME.accent } : {}) }}
            >
              {d.broker || d.dpId || "Account"}
            </button>
          ))}
        </div>
      )}

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 14, marginBottom: 28 }}>
        <Tile icon={BarChart3} label="Stocks Bought" value={String(stocksBoughtInFY.length)} sub={`${fyLabel} lots`} />
        <Tile icon={ArrowLeftRight} label="Stocks Sold" value={String(stocksSoldInFY.length)} sub={`Realized: ${stocksRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} subColor={stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust} />
        <Tile icon={Layers} label="MF Bought" value={String(mfBoughtInFY.length)} sub={`${fyLabel} lots`} />
        <Tile icon={ArrowLeftRight} label="MF Redeemed" value={String(mfSoldInFY.length)} sub={`Realized: ${mfRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} subColor={mfRealizedPnl >= 0 ? THEME.sage : THEME.rust} />
        <Tile icon={Coins} label="Total Realized P&L" value={`${totalRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(totalRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subColor={totalRealizedPnl >= 0 ? THEME.sage : THEME.rust} sub={fyLabel} />
      </div>

      {/* Stocks Bought */}
      {show("stocks_bought") && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Stocks Bought</div>
          {stocksBoughtInFY.length === 0 ? (
            <div style={card}><EmptyHint text={`No stock purchases recorded in ${fyLabel}`} /></div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
                    <th style={{ ...th, paddingLeft: 4 }}>Company</th>
                    <th style={{ ...th, textAlign: "right" }}>Qty</th>
                    <th style={{ ...th, textAlign: "right" }}>Buy Date</th>
                    <th style={{ ...th, textAlign: "right" }}>Buy Price</th>
                    <th style={{ ...th, textAlign: "right" }}>Amount</th>
                    <th style={{ ...th, textAlign: "right" }}>Curr Price</th>
                    <th style={{ ...th, textAlign: "right" }}>Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {stocksBoughtInFY.map((s: any) => {
                    const curr = Number(s.currentPrice || 0);
                    const inv = Number(s.qty) * Number(s.avgPrice);
                    const val = Number(s.qty) * curr;
                    const pnl = val - inv;
                    return (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ ...td, paddingLeft: 4 }}>
                          <b>{s.symbol?.replace(/\.(NS|BO)$/i, "")}</b>
                          <span style={{ fontSize: 10, marginLeft: 5, color: THEME.muted, background: THEME.line, padding: "1px 4px", borderRadius: 3 }}>{s.exchange || "NSE"}</span>
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>{s.qty}</td>
                        <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{fmtDate(s.buyDate)}</td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{Number(s.avgPrice).toFixed(2)}</td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{curr ? `₹${curr.toFixed(2)}` : "—"}</td>
                        <td style={{ ...td, textAlign: "right", color: pnl >= 0 ? THEME.sage : THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                          {curr ? `${pnl >= 0 ? "+" : ""}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stocks Sold */}
      {show("stocks_sold") && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700 }}>Stocks Sold</div>
            {stocksSoldInFY.length > 0 && (
              <div style={{ fontSize: 13 }}>Net P&L: <b style={{ color: stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust }}>{stocksRealizedPnl >= 0 ? "+" : ""}₹{Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b></div>
            )}
          </div>
          <SoldTable rows={stocksSoldInFY} type="stock" />
        </div>
      )}

      {/* MF Bought */}
      {show("mf_bought") && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Mutual Funds Bought</div>
          {mfBoughtInFY.length === 0 ? (
            <div style={card}><EmptyHint text={`No MF purchases recorded in ${fyLabel}`} /></div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
                    <th style={{ ...th, paddingLeft: 4 }}>Scheme</th>
                    <th style={{ ...th, textAlign: "right" }}>Units</th>
                    <th style={{ ...th, textAlign: "right" }}>Buy Date</th>
                    <th style={{ ...th, textAlign: "right" }}>Buy NAV</th>
                    <th style={{ ...th, textAlign: "right" }}>Amount</th>
                    <th style={{ ...th, textAlign: "right" }}>Curr NAV</th>
                    <th style={{ ...th, textAlign: "right" }}>Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {mfBoughtInFY.map((m: any) => {
                    const buyNav = m.buyNav ? Number(m.buyNav) : (m.invested && m.units ? Number(m.invested) / Number(m.units) : 0);
                    const currNav = Number(m.currentNav || 0);
                    const inv = Number(m.units) * buyNav;
                    const val = Number(m.units) * currNav;
                    const pnl = val - inv;
                    return (
                      <tr key={m.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ ...td, paddingLeft: 4 }}>
                          <b>{m.scheme}</b>
                          {m.type && <span style={{ fontSize: 10, marginLeft: 5, color: THEME.muted, background: THEME.line, padding: "1px 4px", borderRadius: 3 }}>{m.type}</span>}
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>{Number(m.units).toFixed(3)}</td>
                        <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{fmtDate(m.buyDate)}</td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{buyNav ? `₹${buyNav.toFixed(4)}` : "—"}</td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{currNav ? `₹${currNav.toFixed(4)}` : "—"}</td>
                        <td style={{ ...td, textAlign: "right", color: pnl >= 0 ? THEME.sage : THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                          {currNav ? `${pnl >= 0 ? "+" : ""}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MF Redeemed */}
      {show("mf_sold") && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700 }}>Mutual Funds Redeemed</div>
            {mfSoldInFY.length > 0 && (
              <div style={{ fontSize: 13 }}>Net P&L: <b style={{ color: mfRealizedPnl >= 0 ? THEME.sage : THEME.rust }}>{mfRealizedPnl >= 0 ? "+" : ""}₹{Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b></div>
            )}
          </div>
          <SoldTable rows={mfSoldInFY} type="mf" />
        </div>
      )}
    </div>
  );
}

// ================== CREDIT & LOANS TAB ==================
function CreditTab({ state, addItem, removeItem, updateItem }) {
  const [sub, setSub] = useState("cc");
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);

  const subs = [
    { id: "cc", label: "Credit Cards", key: "creditCards" },
    { id: "prepaid", label: "Prepaid Cards", key: "prepaidCards" },
    { id: "taken", label: "Loans Taken", key: "loansTaken" },
    { id: "given", label: "Loans Given", key: "loansGiven" },
    { id: "borrowed", label: "From People", key: "informalBorrowed" },
    { id: "lent", label: "To People", key: "informalLent" },
  ];

  return (
    <div>
      <SectionTitle sub="Cards, debts owed, and debts owed to you">
        Credit & Loans
      </SectionTitle>

      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 24,
          borderBottom: `1px solid ${THEME.line}`,
        }}
      >
        {subs.map((s) => {
          const active = sub === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "10px 20px",
                fontFamily: "inherit",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: active ? THEME.accent : THEME.muted,
                borderBottom: `2px solid ${
                  active ? THEME.accent : "transparent"
                }`,
                fontWeight: active ? 700 : 500,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {sub !== "borrowed" && sub !== "lent" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button style={btnSolid} onClick={() => setModal(sub)}>
            <Plus size={14} /> Add
          </button>
        </div>
      )}

      {sub === "cc" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={card}>
              <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Credit Limit</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
                {fmtINRFull(state.creditCards.reduce((acc, c) => acc + (Number(c.limit) || 0), 0))}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Outstanding</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.rust, marginTop: 4 }}>
                {fmtINRFull(state.creditCards.reduce((acc, c) => acc + (Number(c.outstanding) || 0), 0))}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Available Credit</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
                {fmtINRFull(state.creditCards.reduce((acc, c) => acc + (Number(c.limit) || 0) - (Number(c.outstanding) || 0), 0))}
              </div>
            </div>
          </div>
          <CCList 
            items={state.creditCards} 
            onRemove={(id) => removeItem("creditCards", id)} 
            onEdit={setEditId}
            onUpdateCard={(id, updates) => updateItem("creditCards", id, updates)}
          />
        </>
      )}
      {sub === "prepaid" && (
        <PrepaidList items={state.prepaidCards} onRemove={(id) => removeItem("prepaidCards", id)} onEdit={setEditId} />
      )}
      {sub === "taken" && (
        <>
          <LoanTakenList items={state.loansTaken} onRemove={(id) => removeItem("loansTaken", id)} onEdit={setEditId} />
          {state.loansTaken.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Payoff Progress</div>
              <div style={{ display: "grid", gap: 16 }}>
                {state.loansTaken.map((l) => {
                  const principal = Number(l.principal) || 0;
                  const outstanding = Number(l.outstanding) || 0;
                  const emi = Number(l.emi) || 0;
                  const months = Number(l.monthsRemaining) || 0;
                  const paid = principal - outstanding;
                  const paidPct = principal > 0 ? (paid / principal) * 100 : 0;
                  const totalRemaining = emi * months;
                  const interestRemaining = Math.max(0, totalRemaining - outstanding);
                  const r = (Number(l.rate) || 0) / 12 / 100;
                  const startMonths = r > 0 && emi > 0 ? Math.round(Math.log(emi / (emi - outstanding * r)) / Math.log(1 + r)) : months;
                  const payoffDate = new Date();
                  payoffDate.setMonth(payoffDate.getMonth() + months);
                  return (
                    <div key={l.id} style={{ ...card as any }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: THEME.muted }}>{l.type || "Loan"}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{l.lender}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: THEME.rust }}>{fmtINRFull(outstanding)}</div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>outstanding</div>
                        </div>
                      </div>
                      <div style={{ height: 10, background: THEME.line, borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ height: "100%", width: Math.min(paidPct, 100) + "%", background: paidPct > 60 ? THEME.sage : paidPct > 30 ? THEME.gold : THEME.rust, borderRadius: 5, transition: "width 0.6s" }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, fontSize: 12 }}>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Principal paid</div><div style={{ fontWeight: 700, color: THEME.sage }}>{fmtINR(paid)}</div></div>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>EMI</div><div style={{ fontWeight: 700 }}>{fmtINR(emi)}/mo</div></div>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Interest remaining</div><div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINR(interestRemaining)}</div></div>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Payoff date</div><div style={{ fontWeight: 700 }}>{months > 0 ? payoffDate.toLocaleString("en-IN", { month: "short", year: "numeric" }) : "—"}</div></div>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted }}>{paidPct.toFixed(1)}% of principal repaid · {months} months left</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {sub === "given" && (
        <LoanGivenList items={state.loansGiven} onRemove={(id) => removeItem("loansGiven", id)} onEdit={setEditId} />
      )}
      {sub === "borrowed" && (
        <InformalLoanView
          direction="borrowed"
          items={state.informalBorrowed || []}
          onAddPerson={(v) => addItem("informalBorrowed", v)}
          onUpdate={(id, patch) => updateItem("informalBorrowed", id, patch)}
          onRemove={(id) => removeItem("informalBorrowed", id)}
        />
      )}
      {sub === "lent" && (
        <InformalLoanView
          direction="lent"
          items={state.informalLent || []}
          onAddPerson={(v) => addItem("informalLent", v)}
          onUpdate={(id, patch) => updateItem("informalLent", id, patch)}
          onRemove={(id) => removeItem("informalLent", id)}
        />
      )}

      {modal === "cc" && (
        <CCModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("creditCards", v);
            setModal(null);
          }}
        />
      )}
      {modal === "prepaid" && (
        <PrepaidModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("prepaidCards", v);
            setModal(null);
          }}
        />
      )}
      {modal === "taken" && (
        <LoanTakenModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("loansTaken", v);
            setModal(null);
          }}
        />
      )}
      {modal === "given" && (
        <LoanGivenModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("loansGiven", v);
            setModal(null);
          }}
        />
      )}

      {editId && sub === "cc" && (
        <CCModal initial={state.creditCards.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("creditCards", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "prepaid" && (
        <PrepaidModal initial={state.prepaidCards.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("prepaidCards", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "taken" && (
        <LoanTakenModal initial={state.loansTaken.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("loansTaken", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "given" && (
        <LoanGivenModal initial={state.loansGiven.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("loansGiven", editId, v); setEditId(null); }} />
      )}
    </div>
  );
}

function CCList({ items, onRemove, onEdit, onUpdateCard }: any) {
  const [selectedLedger, setSelectedLedger] = useState<string | null>(null);

  if (!items.length) return <EmptyHint text="No credit cards yet" />;
  
  const selectedCard = items.find(c => c.id === selectedLedger);

  return (
    <div>
      <Grid>
        {items.map((c) => {
          const util = Number(c.limit)
            ? (Number(c.outstanding) / Number(c.limit)) * 100
            : 0;
          return (
            <div
              key={c.id}
              style={{
                ...cardDark,
                position: "relative",
                background: `linear-gradient(135deg, ${THEME.ink} 0%, #1A2A42 100%)`,
                paddingBottom: 60,
              }}
            >
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
                <button onClick={() => onEdit(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(245,239,227,0.6)" }}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => onRemove(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(245,239,227,0.6)" }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: THEME.gold }}>
                  {c.network || "Card"}
                </div>
                <OwnerBadge owner={c.owner} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                {c.issuer}
              </div>
              <div style={{ fontSize: 16, letterSpacing: "0.05em", marginTop: 12, opacity: 0.8 }}>
                •••• •••• •••• {c.last4 || "****"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20, fontSize: 12 }}>
                <div>
                  <div style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}>Outstanding</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.outstanding)}</div>
                </div>
                <div>
                  <div style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}>Limit</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.limit)}</div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 11, color: "rgba(245,239,227,0.7)" }}>
                <div>Bill Date: <strong>{c.billDate || "—"}th</strong></div>
                <div>Due Day: <strong>{c.dueDay || "—"}th</strong></div>
                <div>Fee: <strong>{fmtINR(c.annualFee)}</strong></div>
                <div>Helpline: <strong>{c.helpline || "—"}</strong></div>
              </div>

              {c.waiverInfo && (
                <div style={{ marginTop: 12, fontSize: 10, background: "rgba(255,255,255,0.05)", padding: "6px 10px", borderRadius: 6, color: THEME.gold }}>
                  Waiver: {c.waiverInfo}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <div style={{ height: 4, background: "rgba(245,239,227,0.15)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${Math.min(util, 100)}%`, background: util > 70 ? THEME.rust : THEME.gold, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 10, color: util > 70 ? THEME.rust : "rgba(245,239,227,0.6)", marginTop: 6 }}>
                  {util.toFixed(1)}% utilization
                </div>
              </div>

              <button 
                onClick={() => setSelectedLedger(c.id)}
                style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 44,
                  background: "rgba(255,255,255,0.05)", border: "none", borderTop: `1px solid rgba(255,255,255,0.1)`,
                  color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
              >
                <List size={14} /> View Transactions ({c.transactions?.length || 0})
              </button>
            </div>
          );
        })}
      </Grid>

      {selectedLedger && selectedCard && (
        <CCTransactionLedger 
          card={selectedCard} 
          onClose={() => setSelectedLedger(null)}
          onUpdate={(newTransactions) => {
            const newOutstanding = newTransactions.reduce((acc, t) => acc + Number(t.amount), 0);
            onUpdateCard(selectedLedger, { transactions: newTransactions, outstanding: String(newOutstanding) });
          }}
        />
      )}
    </div>
  );
}

function CCTransactionLedger({ card, onClose, onUpdate }: any) {
  const [txs, setTxs] = useState(card.transactions || []);
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ date: today(), merchant: "", amount: "", category: "General" });
  const [editId, setEditId] = useState<string | null>(null);

  const saveTx = () => {
    if (!newTx.merchant || !newTx.amount) return;
    let updated;
    if (editId) {
      updated = txs.map(t => t.id === editId ? { ...newTx, id: editId } : t);
    } else {
      updated = [...txs, { ...newTx, id: uid() }];
    }
    setTxs(updated);
    onUpdate(updated);
    setShowAdd(false);
    setEditId(null);
    setNewTx({ date: today(), merchant: "", amount: "", category: "General" });
  };

  const removeTx = (id) => {
    const updated = txs.filter(t => t.id !== id);
    setTxs(updated);
    onUpdate(updated);
  };

  const startEdit = (t) => {
    setNewTx({ date: t.date, merchant: t.merchant, amount: t.amount, category: t.category });
    setEditId(t.id);
    setShowAdd(true);
  };

  return (
    <Modal title={`${card.issuer} - Transactions`} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Recent Ledger</div>
        <button 
          style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }} 
          onClick={() => {
            if (showAdd) {
              setShowAdd(false);
              setEditId(null);
              setNewTx({ date: today(), merchant: "", amount: "", category: "General" });
            } else {
              setShowAdd(true);
            }
          }}
        >
          {showAdd ? "Cancel" : <><Plus size={14} /> Add Transaction</>}
        </button>
      </div>

      {showAdd && (
        <div style={{ ...card, background: THEME.darkInk, border: `1px solid ${THEME.line}`, marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: THEME.accent }}>{editId ? "EDIT TRANSACTION" : "NEW TRANSACTION"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Date"><input type="date" style={input} value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} /></Field>
            <Field label="Amount"><input type="number" style={input} value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} placeholder="0.00" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Merchant"><input type="text" style={input} value={newTx.merchant} onChange={e => setNewTx({...newTx, merchant: e.target.value})} placeholder="e.g. Amazon" /></Field>
            <Field label="Category"><input type="text" style={input} value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} placeholder="e.g. Food" /></Field>
          </div>
          <button style={{ ...btnAccent, width: "100%" }} onClick={saveTx}>{editId ? "Update Transaction" : "Save Transaction"}</button>
        </div>
      )}

      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `1px solid ${THEME.line}`, color: THEME.muted }}>
              <th style={{ padding: "10px 8px" }}>Date</th>
              <th style={{ padding: "10px 8px" }}>Merchant</th>
              <th style={{ padding: "10px 8px" }}>Category</th>
              <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
              <th style={{ padding: "10px 8px", width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {txs.sort((a,b) => b.date.localeCompare(a.date)).map(t => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                <td style={{ padding: "12px 8px" }}>{t.date}</td>
                <td style={{ padding: "12px 8px", fontWeight: 600 }}>{t.merchant}</td>
                <td style={{ padding: "12px 8px" }}><span style={{ background: THEME.paper, padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{t.category}</span></td>
                <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700 }}>{fmtINR(t.amount)}</td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => startEdit(t)} style={{ background: "transparent", border: "none", color: THEME.muted, cursor: "pointer" }}><Edit3 size={14} /></button>
                    <button onClick={() => removeTx(t.id)} style={{ background: "transparent", border: "none", color: THEME.rust, cursor: "pointer" }}><X size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!txs.length && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: THEME.muted }}>No transactions found for this card</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, color: THEME.muted }}>Total Ledger Outstanding</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: THEME.rust }}>
          {fmtINRFull(txs.reduce((acc, t) => acc + Number(t.amount), 0))}
        </div>
      </div>
    </Modal>
  );
}

function PrepaidList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No prepaid cards/wallets" />;
  return (
    <Grid>
      {items.map((p) => (
        <InvestCard key={p.id} onRemove={() => onRemove(p.id)} onEdit={() => onEdit(p.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.muted,
            }}
          >
            {p.provider}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {p.name}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 24,
              fontWeight: 800,
              marginTop: 12,
            }}
          >
            {fmtINRFull(p.balance)}
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function LoanTakenList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No loans taken" />;
  return (
    <Grid>
      {items.map((l) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)} onEdit={() => onEdit(l.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.accent,
            }}
          >
            {l.type || "Loan"}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {l.lender}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              marginTop: 12,
              color: THEME.accent,
            }}
          >
            {fmtINRFull(l.outstanding)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
              fontSize: 12,
            }}
          >
            <Stat k="Principal" v={fmtINR(l.principal)} />
            <Stat k="EMI" v={fmtINR(l.emi)} />
            <Stat k="Rate" v={`${l.rate}%`} />
            <Stat k="Tenure Left" v={`${l.monthsRemaining || "—"} mo`} />
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function LoanGivenList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No loans given" />;
  return (
    <Grid>
      {items.map((l) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)} onEdit={() => onEdit(l.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.sage,
            }}
          >
            Receivable
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {l.borrower}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              marginTop: 12,
              color: THEME.sage,
            }}
          >
            {fmtINRFull(l.outstanding)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
              fontSize: 12,
            }}
          >
            <Stat k="Principal" v={fmtINR(l.principal)} />
            <Stat k="Rate" v={l.rate ? `${l.rate}%` : "—"} />
            <Stat k="Given on" v={l.date || "—"} />
            <Stat k="Due" v={l.dueDate || "—"} />
          </div>
          {l.note && (
            <div
              style={{
                fontSize: 12,
                color: THEME.muted,
                marginTop: 8,
                fontStyle: "normal",
              }}
            >
              "{l.note}"
            </div>
          )}
        </InvestCard>
      ))}
    </Grid>
  );
}

function CCModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    issuer: "",
    network: "Visa",
    last4: "",
    limit: "",
    outstanding: "0",
    billDate: "",
    dueDay: "",
    annualFee: "0",
    waiverInfo: "",
    helpline: "",
    transactions: [],
  });
  return (
    <Modal title={initial ? "Edit Credit Card" : "Add Credit Card"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label="Issuer">
          <input style={input} value={f.issuer} onChange={(e) => setF({ ...f, issuer: e.target.value })} placeholder="e.g. HDFC Regalia" />
        </Field>
        <Field label="Network">
          <select style={input} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })}>
            <option>Visa</option>
            <option>Mastercard</option>
            <option>Amex</option>
            <option>RuPay</option>
            <option>Diners</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <Field label="Last 4 digits">
          <input style={input} maxLength={4} value={f.last4} onChange={(e) => setF({ ...f, last4: e.target.value })} />
        </Field>
        <Field label="Credit Limit">
          <input style={input} type="number" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} />
        </Field>
        <Field label="Outstanding">
          <input style={input} type="number" value={f.outstanding} onChange={(e) => setF({ ...f, outstanding: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Statement Date (Day of Month)">
          <input style={input} type="number" min="1" max="31" placeholder="e.g. 20" value={f.billDate} onChange={(e) => setF({ ...f, billDate: e.target.value })} />
        </Field>
        <Field label="Due Day (Day of Month)">
          <input style={input} type="number" min="1" max="31" placeholder="e.g. 10" value={f.dueDay} onChange={(e) => setF({ ...f, dueDay: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Annual Fee">
          <input style={input} type="number" value={f.annualFee} onChange={(e) => setF({ ...f, annualFee: e.target.value })} />
        </Field>
        <Field label="Helpline Number">
          <input style={input} value={f.helpline} onChange={(e) => setF({ ...f, helpline: e.target.value })} placeholder="1800-xxx-xxxx" />
        </Field>
      </div>
      <Field label="Waiver Details (How and When)">
        <textarea style={{ ...input, height: 60, resize: "none" }} value={f.waiverInfo} onChange={(e) => setF({ ...f, waiverInfo: e.target.value })} placeholder="e.g. Spend 1L in a year to waive off annual fee" />
      </Field>
      <ModalActions onSave={() => f.issuer && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function PrepaidModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { provider: "", name: "", balance: "" });
  return (
    <Modal title={initial ? "Edit Prepaid Card / Wallet" : "Add Prepaid Card / Wallet"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Provider">
        <input
          style={input}
          value={f.provider}
          onChange={(e) => setF({ ...f, provider: e.target.value })}
          placeholder="e.g. Paytm, Amazon Pay, Forex card"
        />
      </Field>
      <Field label="Name/Label">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </Field>
      <Field label="Balance">
        <input
          style={input}
          type="number"
          value={f.balance}
          onChange={(e) => setF({ ...f, balance: e.target.value })}
        />
      </Field>
      <ModalActions onSave={() => f.provider && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== INFORMAL LOAN SECTION ==================
function InformalLoanView({ direction, items, onAddPerson, onUpdate, onRemove }: any) {
  const isBorrowed = direction === "borrowed";
  const personLabel = isBorrowed ? "Lender" : "Borrower";
  const accentColor = isBorrowed ? THEME.rust : THEME.sage;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [trancheTarget, setTrancheTarget] = useState<any>(null);
  const [paymentTarget, setPaymentTarget] = useState<any>(null);

  const totalBorrowed = items.reduce((s: number, p: any) =>
    s + (p.tranches || []).reduce((a: number, t: any) => a + Number(t.amount || 0), 0), 0);
  const totalPaid = items.reduce((s: number, p: any) =>
    s + (p.payments || []).reduce((a: number, t: any) => a + Number(t.amount || 0), 0), 0);
  const totalOutstanding = totalBorrowed - totalPaid;

  const fmtD = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Tile icon={isBorrowed ? TrendingDown : TrendingUp} label={isBorrowed ? "Total Borrowed" : "Total Lent"} value={fmtINRFull(totalBorrowed)} />
        <Tile icon={isBorrowed ? ArrowLeftRight : ArrowLeftRight} label={isBorrowed ? "Total Repaid" : "Received Back"} value={fmtINRFull(totalPaid)} subColor={THEME.sage} />
        <Tile icon={isBorrowed ? IndianRupee : IndianRupee} label="Outstanding" value={fmtINRFull(totalOutstanding)} subColor={totalOutstanding > 0 ? accentColor : THEME.sage} />
      </div>

      {/* Add person button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button style={btnSolid} onClick={() => setAddPersonOpen(true)}>
          <Plus size={14} /> Add {personLabel}
        </button>
      </div>

      {items.length === 0 && <EmptyHint text={`No ${isBorrowed ? "informal borrowings" : "personal loans given"} yet`} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((person: any) => {
          const tranches: any[] = person.tranches || [];
          const payments: any[] = person.payments || [];
          const totalT = tranches.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
          const totalP = payments.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
          const outstanding = totalT - totalP;
          const isExpanded = expandedId === person.id;
          const settled = outstanding <= 0;

          return (
            <div key={person.id} style={{ ...card as any, padding: 0, overflow: "hidden" }}>
              {/* Header */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer", borderBottom: isExpanded ? `1px solid ${THEME.line}` : "none" }}
                onClick={() => setExpandedId(isExpanded ? null : person.id)}
              >
                <div style={{ color: THEME.muted, flexShrink: 0 }}>
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{person.person}</span>
                    {settled && <span style={{ fontSize: 10, background: THEME.sage + "22", color: THEME.sage, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>SETTLED</span>}
                    {person.note && <span style={{ fontSize: 12, color: THEME.muted }}>· {person.note}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    {tranches.length} loan{tranches.length !== 1 ? "s" : ""} · {payments.length} payment{payments.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Outstanding</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: settled ? THEME.sage : accentColor, fontVariantNumeric: "tabular-nums" }}>
                    {settled ? "₹0" : fmtINRFull(outstanding)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); onRemove(person.id); }} style={{ ...iconBtn, color: THEME.rust }} title="Delete person"><Trash2 size={13} /></button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div>
                  {/* Loans / Tranches */}
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor }}>
                        {isBorrowed ? "Loans Received" : "Loans Given"}
                      </div>
                      <button style={{ ...btnGhost, fontSize: 11, padding: "3px 10px" }} onClick={() => setTrancheTarget(person)}>
                        <Plus size={11} /> Add Loan
                      </button>
                    </div>
                    {tranches.length === 0 ? (
                      <div style={{ fontSize: 12, color: THEME.muted }}>No loans recorded yet</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                            <th style={{ ...th, paddingLeft: 0, textAlign: "left" }}>Date</th>
                            <th style={{ ...th, textAlign: "right" }}>Amount</th>
                            <th style={{ ...th, textAlign: "left" }}>Note</th>
                            <th style={th}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {tranches.map((t: any) => (
                            <tr key={t.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                              <td style={{ ...td, paddingLeft: 0, color: THEME.muted }}>{fmtD(t.date)}</td>
                              <td style={{ ...td, textAlign: "right", fontWeight: 600, color: accentColor, fontVariantNumeric: "tabular-nums" }}>{fmtINR(t.amount)}</td>
                              <td style={{ ...td, color: THEME.muted }}>{t.note || "—"}</td>
                              <td style={td}>
                                <button style={iconBtn} onClick={() => {
                                  const updated = tranches.filter((x: any) => x.id !== t.id);
                                  onUpdate(person.id, { tranches: updated });
                                }}><Trash2 size={11} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td style={{ ...td, paddingLeft: 0, fontWeight: 700, fontSize: 12 }}>Total</td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 700, color: accentColor, fontVariantNumeric: "tabular-nums" }}>{fmtINR(totalT)}</td>
                            <td colSpan={2} style={td}></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>

                  {/* Payments */}
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: THEME.sage }}>
                        {isBorrowed ? "Repayments Made" : "Repayments Received"}
                      </div>
                      <button style={{ ...btnGhost, fontSize: 11, padding: "3px 10px" }} onClick={() => setPaymentTarget(person)}>
                        <Plus size={11} /> Record Payment
                      </button>
                    </div>
                    {payments.length === 0 ? (
                      <div style={{ fontSize: 12, color: THEME.muted }}>No payments recorded yet</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                            <th style={{ ...th, paddingLeft: 0, textAlign: "left" }}>Date</th>
                            <th style={{ ...th, textAlign: "right" }}>Amount</th>
                            <th style={{ ...th, textAlign: "left" }}>Note</th>
                            <th style={th}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p: any) => (
                            <tr key={p.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                              <td style={{ ...td, paddingLeft: 0, color: THEME.muted }}>{fmtD(p.date)}</td>
                              <td style={{ ...td, textAlign: "right", fontWeight: 600, color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>{fmtINR(p.amount)}</td>
                              <td style={{ ...td, color: THEME.muted }}>{p.note || "—"}</td>
                              <td style={td}>
                                <button style={iconBtn} onClick={() => {
                                  const updated = payments.filter((x: any) => x.id !== p.id);
                                  onUpdate(person.id, { payments: updated });
                                }}><Trash2 size={11} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td style={{ ...td, paddingLeft: 0, fontWeight: 700, fontSize: 12 }}>Total Paid</td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>{fmtINR(totalP)}</td>
                            <td colSpan={2} style={td}></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>

                  {/* Balance bar */}
                  <div style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
                    <span style={{ color: THEME.muted }}>Balance: </span>
                    <b style={{ color: settled ? THEME.sage : accentColor, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
                      {settled ? "Fully Settled ✓" : `${fmtINRFull(outstanding)} pending`}
                    </b>
                    {!settled && totalT > 0 && (
                      <div style={{ flex: 1, height: 6, background: THEME.line, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: Math.min((totalP / totalT) * 100, 100) + "%", background: accentColor, borderRadius: 3, transition: "width 0.4s" }} />
                      </div>
                    )}
                    {!settled && totalT > 0 && (
                      <span style={{ fontSize: 11, color: THEME.muted, flexShrink: 0 }}>{((totalP / totalT) * 100).toFixed(0)}% paid</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add person modal */}
      {addPersonOpen && (
        <Modal title={`Add ${personLabel}`} onClose={() => setAddPersonOpen(false)}>
          <InformalPersonForm
            personLabel={personLabel}
            onSave={(v: any) => { onAddPerson(v); setAddPersonOpen(false); }}
            onClose={() => setAddPersonOpen(false)}
          />
        </Modal>
      )}

      {/* Add tranche modal */}
      {trancheTarget && (
        <Modal title={`Add Loan — ${trancheTarget.person}`} onClose={() => setTrancheTarget(null)}>
          <InformalAmountForm
            label={isBorrowed ? "Amount Borrowed" : "Amount Lent"}
            onSave={(entry: any) => {
              const updated = [...(trancheTarget.tranches || []), { id: `tr-${Date.now()}`, ...entry }];
              onUpdate(trancheTarget.id, { tranches: updated });
              setTrancheTarget(null);
            }}
            onClose={() => setTrancheTarget(null)}
          />
        </Modal>
      )}

      {/* Record payment modal */}
      {paymentTarget && (
        <Modal title={`Record Payment — ${paymentTarget.person}`} onClose={() => setPaymentTarget(null)}>
          <InformalAmountForm
            label={isBorrowed ? "Amount Repaid" : "Amount Received"}
            onSave={(entry: any) => {
              const updated = [...(paymentTarget.payments || []), { id: `pm-${Date.now()}`, ...entry }];
              onUpdate(paymentTarget.id, { payments: updated });
              setPaymentTarget(null);
            }}
            onClose={() => setPaymentTarget(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function InformalPersonForm({ personLabel, onSave, onClose }: any) {
  const [f, setF] = useState({ owner: "self", person: "", note: "", tranches: [], payments: [] });
  return (
    <>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
          {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label={`${personLabel} Name`}>
        <input style={input} value={f.person} placeholder="e.g. Raj, Mom, Uncle" onChange={(e) => setF({ ...f, person: e.target.value })} />
      </Field>
      <Field label="Note (optional)">
        <input style={input} value={f.note} placeholder="e.g. for house repairs" onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalActions onSave={() => f.person && onSave({ id: `il-${Date.now()}`, ...f })} onClose={onClose} saveLabel="Add" />
    </>
  );
}

function InformalAmountForm({ label, onSave, onClose }: any) {
  const [f, setF] = useState({ amount: "", date: today(), note: "" });
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={label + " (₹)"}>
          <input style={input} type="number" min="1" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>
      <Field label="Note (optional)">
        <input style={input} value={f.note} placeholder="e.g. cash, UPI" onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalActions onSave={() => Number(f.amount) > 0 && onSave(f)} onClose={onClose} saveLabel="Save" />
    </>
  );
}

function LoanTakenModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    lender: "",
    type: "Personal",
    principal: "",
    outstanding: "",
    emi: "",
    rate: "",
    monthsRemaining: "",
  });
  return (
    <Modal title={initial ? "Edit Loan Taken" : "Add Loan Taken"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Lender">
        <input
          style={input}
          value={f.lender}
          onChange={(e) => setF({ ...f, lender: e.target.value })}
        />
      </Field>
      <Field label="Type">
        <select
          style={input}
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
        >
          <option>Personal</option>
          <option>Home</option>
          <option>Car</option>
          <option>Education</option>
          <option>Gold</option>
          <option>Business</option>
          <option>Other</option>
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Original Principal">
          <input
            style={input}
            type="number"
            value={f.principal}
            onChange={(e) => setF({ ...f, principal: e.target.value })}
          />
        </Field>
        <Field label="Outstanding">
          <input
            style={input}
            type="number"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
          />
        </Field>
        <Field label="EMI">
          <input
            style={input}
            type="number"
            value={f.emi}
            onChange={(e) => setF({ ...f, emi: e.target.value })}
          />
        </Field>
        <Field label="Interest Rate (%)">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
          />
        </Field>
        <Field label="Months Remaining">
          <input
            style={input}
            type="number"
            value={f.monthsRemaining}
            onChange={(e) => setF({ ...f, monthsRemaining: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.lender && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function LoanGivenModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    borrower: "",
    principal: "",
    outstanding: "",
    rate: "",
    date: today(),
    dueDate: "",
    note: "",
  });
  return (
    <Modal title={initial ? "Edit Loan Given" : "Record Loan Given"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Borrower Name">
        <input
          style={input}
          value={f.borrower}
          onChange={(e) => setF({ ...f, borrower: e.target.value })}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Principal">
          <input
            style={input}
            type="number"
            value={f.principal}
            onChange={(e) => setF({ ...f, principal: e.target.value })}
          />
        </Field>
        <Field label="Outstanding">
          <input
            style={input}
            type="number"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
          />
        </Field>
        <Field label="Interest %">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
          />
        </Field>
        <Field label="Given On">
          <input
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label="Due By">
          <input
            style={input}
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Note">
        <input
          style={input}
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </Field>
      <ModalActions
        onSave={() => f.borrower && f.principal && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

// ================== SUBSCRIPTIONS TAB ==================
function SubsTab({ state, addItem, removeItem, updateItem, metrics }) {
  const [show, setShow] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const annual = metrics.subTotal * 12;
  const activeSubs = state.subscriptions.filter(s => !s.paused).length;

  return (
    <div>
      <SectionTitle sub="Recurring charges that quietly drain the ledger">
        Subscriptions
      </SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Tile
          icon={Repeat}
          label="Active Subs"
          value={activeSubs}
        />
        <Tile
          icon={Calendar}
          label="Monthly"
          value={fmtINRFull(metrics.subTotal)}
        />
        <Tile icon={Calculator} label="Annualised" value={fmtINRFull(annual)} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Subscription
        </button>
      </div>

      {state.subscriptions.length === 0 ? (
        <div style={card}>
          <EmptyHint text="Netflix, Spotify, iCloud, newspaper… add them all" />
        </div>
      ) : (
        <div style={card}>
          <div style={{ overflowX: "auto" }}><table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Service</th>
                <th style={th}>Category</th>
                <th style={th}>Cycle</th>
                <th style={th}>Next Renewal</th>
                <th style={{ ...th, textAlign: "right" }}>Amount</th>
                <th style={{ ...th, textAlign: "right" }}>Monthly Equiv</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {state.subscriptions.map((s) => {
                const monthly =
                  s.cycle === "yearly"
                    ? Number(s.amount) / 12
                    : s.cycle === "quarterly"
                    ? Number(s.amount) / 3
                    : Number(s.amount);
                return (
                  <tr
                    key={s.id}
                    style={{ borderBottom: `1px dashed ${THEME.line}`, opacity: s.paused ? 0.5 : 1 }}
                  >
                    <td style={{ ...td, fontWeight: 600 }}>
                      {s.name}
                      {s.paused && <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 6px", background: THEME.muted, color: THEME.paper, borderRadius: 4, letterSpacing: "0.1em" }}>PAUSED</span>}
                    </td>
                    <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>
                      {s.category}
                    </td>
                    <td style={{ ...td, textTransform: "capitalize" }}>
                      {s.cycle}
                    </td>
                    <td style={td}>{s.renewalDate || "—"}</td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtINRFull(s.amount)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: THEME.muted,
                      }}
                    >
                      {fmtINRFull(monthly)}
                    </td>
                    <td style={{ ...td, display: "flex", gap: 6 }}>
                      <button
                        onClick={() => updateItem("subscriptions", s.id, { paused: !s.paused })}
                        style={{ ...iconBtn, color: s.paused ? THEME.sage : THEME.gold }}
                        title={s.paused ? "Resume" : "Pause"}
                      >
                        {s.paused ? <Play size={13} /> : <Pause size={13} />}
                      </button>
                      <button onClick={() => setEditSub(s)} style={iconBtn} title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => removeItem("subscriptions", s.id)}
                        style={iconBtn}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}

      {show && (
        <SubModal
          onClose={() => setShow(false)}
          onSave={(v) => {
            addItem("subscriptions", v);
            setShow(false);
          }}
        />
      )}
      {editSub && (
        <SubModal
          initialValues={editSub}
          onClose={() => setEditSub(null)}
          onSave={(v) => {
            updateItem("subscriptions", editSub.id, v);
            setEditSub(null);
          }}
        />
      )}
    </div>
  );
}

function SubModal({ onClose, onSave, initialValues = null }) {
  const [f, setF] = useState(initialValues ? {
    owner: initialValues.owner || "self",
    name: initialValues.name || "",
    category: initialValues.category || "Entertainment",
    amount: initialValues.amount || "",
    cycle: initialValues.cycle || "monthly",
    renewalDate: initialValues.renewalDate || "",
  } : {
    owner: "self",
    name: "",
    category: "Entertainment",
    amount: "",
    cycle: "monthly",
    renewalDate: "",
  });
  return (
    <Modal title={initialValues ? "Edit Subscription" : "Add Subscription"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Service Name">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </Field>
      <Field label="Category">
        <select
          style={input}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          <option>Entertainment</option>
          <option>Productivity</option>
          <option>Storage/Cloud</option>
          <option>News/Media</option>
          <option>Fitness</option>
          <option>Utilities</option>
          <option>Other</option>
        </select>
      </Field>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
      >
        <Field label="Amount">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
        <Field label="Cycle">
          <select
            style={input}
            value={f.cycle}
            onChange={(e) => setF({ ...f, cycle: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        <Field label="Next Renewal">
          <input
            style={input}
            type="date"
            value={f.renewalDate}
            onChange={(e) => setF({ ...f, renewalDate: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.name && f.amount && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

// ================== GOALS TAB ==================
const PRIORITY_ORDER = { High: 3, Medium: 2, Low: 1 };
const PRIORITY_COLOR = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };

function GoalsTab({ state, addItem, removeItem, updateItem, metrics }) {
  const [show, setShow] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // ── Aggregate calculations ──
  const totalTarget = state.goals.reduce((s, g) => s + Number(g.targetAmount || 0), 0);
  const totalSaved = state.goals.reduce((s, g) => s + Number(g.currentAmount || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const completedCount = state.goals.filter(g => Number(g.targetAmount) > 0 && Number(g.currentAmount) >= Number(g.targetAmount)).length;
  const onTrackCount = state.goals.filter(g => {
    const progress = Number(g.targetAmount) ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0;
    if (progress >= 100) return false;
    if (!g.targetDate) return true;
    const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
    const rem = Math.max(0, monthsBetween(today(), g.targetDate));
    const total = elapsed + rem;
    const expectedPct = total > 0 ? (elapsed / total) * 100 : 0;
    return progress >= expectedPct - 10;
  }).length;
  const behindCount = state.goals.length - completedCount - onTrackCount;

  // Priority breakdown
  const priBreakdown = (["High", "Medium", "Low"] as const).map(p => {
    const gs = state.goals.filter(g => (g.priority || "Medium") === p);
    return {
      priority: p,
      count: gs.length,
      target: gs.reduce((s, g) => s + Number(g.targetAmount || 0), 0),
      saved: gs.reduce((s, g) => s + Number(g.currentAmount || 0), 0),
    };
  });

  const sortedGoals = [...state.goals]
    .filter(g => filterPriority === "all" || (g.priority || "Medium") === filterPriority)
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      return sortDir === "desc" ? pb - pa : pa - pb;
    });

  const ringColor = (pct: number) =>
    pct >= 100 ? THEME.sage : pct >= 75 ? THEME.gold : pct >= 40 ? THEME.accent : THEME.rust;

  return (
    <div>
      <SectionTitle sub="What the money is for — down payments, retirement, freedom">
        Goals & Future Planning
      </SectionTitle>

      {/* ── Summary Stats Card ── */}
      {state.goals.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          {/* KPI tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16, marginBottom: 18 }}>
            {[
              { label: "Total Goals", value: String(state.goals.length), color: THEME.ink },
              { label: "Total Target", value: fmtINRFull(totalTarget), color: THEME.ink },
              { label: "Saved So Far", value: fmtINRFull(totalSaved), color: THEME.sage },
              { label: "Balance Left", value: fmtINRFull(totalRemaining), color: THEME.rust },
              { label: "Overall Achieved", value: `${overallPct.toFixed(1)}%`, color: ringColor(overallPct) },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "12px 0" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'Inter', sans-serif" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Overall progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 10, background: THEME.line, borderRadius: 6, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(overallPct, 100)}%`,
                background: `linear-gradient(90deg, ${ringColor(overallPct)}, color-mix(in srgb, ${ringColor(overallPct)} 70%, white))`,
                borderRadius: 6,
                transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: THEME.sage, fontWeight: 600 }}>✓ {completedCount} completed</span>
              <span style={{ fontSize: 12, color: THEME.accent, fontWeight: 600 }}>↑ {onTrackCount} on track</span>
              {behindCount > 0 && <span style={{ fontSize: 12, color: THEME.rust, fontWeight: 600 }}>⚠ {behindCount} behind</span>}
            </div>
          </div>

          {/* Priority breakdown */}
          <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 10 }}>Breakdown by Priority</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {priBreakdown.map(p => {
                const pPct = p.target > 0 ? (p.saved / p.target) * 100 : 0;
                return (
                  <div key={p.priority} style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${PRIORITY_COLOR[p.priority]}22`,
                    background: `${PRIORITY_COLOR[p.priority]}0a`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[p.priority], textTransform: "uppercase", letterSpacing: "0.1em" }}>{p.priority}</span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>{p.count} goal{p.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ height: 4, background: THEME.line, borderRadius: 3, marginBottom: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(pPct, 100)}%`, background: PRIORITY_COLOR[p.priority], borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      <span style={{ color: THEME.sage, fontWeight: 600 }}>{fmtINRFull(p.saved)}</span>
                      <span> / {fmtINRFull(p.target)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Controls row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["all", "High", "Medium", "Low"] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              style={{
                ...btnOutline,
                fontSize: 11,
                padding: "6px 12px",
                background: filterPriority === p ? (p === "all" ? THEME.accent : PRIORITY_COLOR[p]) : "transparent",
                color: filterPriority === p ? "#fff" : (p === "all" ? THEME.ink : PRIORITY_COLOR[p]),
                borderColor: p === "all" ? THEME.line : PRIORITY_COLOR[p],
                fontWeight: 700,
              }}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
          <button
            onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
            style={{ ...btnOutline, fontSize: 11, padding: "6px 12px" }}
          >
            {sortDir === "desc" ? "High → Low" : "Low → High"}
          </button>
        </div>
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Goal
        </button>
      </div>

      {/* ── Goal cards ── */}
      {state.goals.length === 0 ? (
        <div style={card}>
          <EmptyHint text="Set a goal — retirement, house, car, travel, emergency fund…" />
        </div>
      ) : sortedGoals.length === 0 ? (
        <div style={card}>
          <EmptyHint text={`No ${filterPriority} priority goals yet.`} />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {sortedGoals.map((g) => {
            const progress = Number(g.targetAmount)
              ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
              : 0;
            const isComplete = progress >= 100;
            const monthsLeft = g.targetDate
              ? Math.max(0, monthsBetween(today(), g.targetDate))
              : 0;
            const remaining = Math.max(0, Number(g.targetAmount) - Number(g.currentAmount));
            const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : 0;
            const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
            const totalDuration = elapsed + monthsLeft;
            const expectedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
            const isBehind = !isComplete && g.targetDate && progress < expectedPct - 10;
            const rc = ringColor(progress);

            return (
              <div key={g.id} style={{ ...card, position: "relative", border: isComplete ? `1.5px solid ${THEME.sage}44` : undefined }}>
                {/* action buttons */}
                <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  {isComplete && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: `${THEME.sage}22`, color: THEME.sage, border: `1px solid ${THEME.sage}55`, borderRadius: 6, padding: "2px 8px", letterSpacing: "0.1em" }}>
                      COMPLETED
                    </span>
                  )}
                  {isBehind && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: `${THEME.rust}15`, color: THEME.rust, border: `1px solid ${THEME.rust}44`, borderRadius: 6, padding: "2px 8px", letterSpacing: "0.1em" }}>
                      BEHIND
                    </span>
                  )}
                  <button onClick={() => setEditGoal(g)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => removeItem("goals", g.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted }}>{g.category}</div>
                      {g.priority && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: PRIORITY_COLOR[g.priority] || THEME.muted, border: `1px solid ${PRIORITY_COLOR[g.priority] || THEME.muted}`, borderRadius: 4, padding: "1px 6px" }}>
                          {g.priority}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 800, marginTop: 4 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {g.startDate && <span>Started: {g.startDate}</span>}
                      {g.targetDate && <span>Target: {g.targetDate} · {monthsLeft}m left</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800 }}>
                      {fmtINRFull(g.currentAmount)}{" "}
                      <span style={{ color: THEME.muted, fontSize: 15 }}>/ {fmtINRFull(g.targetAmount)}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: rc }}>{progress.toFixed(1)}% reached</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
                  {(() => {
                    const r = 36, sz = 88, cx = sz / 2;
                    const circ = 2 * Math.PI * r;
                    const dashOff = circ * (1 - Math.min(progress, 100) / 100);
                    return (
                      <svg width={sz} height={sz} style={{ flexShrink: 0 }}>
                        <circle cx={cx} cy={cx} r={r} fill="none" stroke={THEME.line} strokeWidth="7" />
                        <circle cx={cx} cy={cx} r={r} fill="none" stroke={rc} strokeWidth="7"
                          strokeDasharray={circ} strokeDashoffset={dashOff} strokeLinecap="round"
                          style={{ transformOrigin: `${cx}px ${cx}px`, transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.6s ease" }}
                        />
                        <text x={cx} y={cx - 4} textAnchor="middle" fontSize="13" fontWeight="800" fill={rc}>{Math.min(Math.round(progress), 100)}%</text>
                        <text x={cx} y={cx + 12} textAnchor="middle" fontSize="9" fill={THEME.muted}>{isComplete ? "DONE!" : "done"}</text>
                      </svg>
                    );
                  })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, fontSize: 12 }}>
                      <div><div style={{ color: THEME.muted }}>Saved so far</div><div style={{ fontWeight: 700, color: THEME.sage }}>{fmtINRFull(g.currentAmount)}</div></div>
                      <div><div style={{ color: THEME.muted }}>Remaining</div><div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINRFull(remaining)}</div></div>
                      {g.targetDate && <div><div style={{ color: THEME.muted }}>Months left</div><div style={{ fontWeight: 700 }}>{monthsLeft}</div></div>}
                    </div>
                    {monthlyNeeded > 0 && (
                      <div style={{ marginTop: 10, fontSize: 13, color: THEME.ink }}>
                        → Save <b>{fmtINRFull(monthlyNeeded)}</b>/month to hit target on time.
                      </div>
                    )}
                    {isBehind && (
                      <div style={{ marginTop: 6, fontSize: 12, color: THEME.rust }}>
                        Expected {expectedPct.toFixed(0)}% by now — you are {(expectedPct - progress).toFixed(0)}% behind schedule.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {show && (
        <GoalModal
          onClose={() => setShow(false)}
          onSave={(v) => { addItem("goals", v); setShow(false); }}
        />
      )}
      {editGoal && (
        <GoalModal
          initialValues={editGoal}
          onClose={() => setEditGoal(null)}
          onSave={(v) => { updateItem("goals", editGoal.id, v); setEditGoal(null); }}
        />
      )}
    </div>
  );
}

function GoalModal({ onClose, onSave, initialValues = null }) {
  const [f, setF] = useState(initialValues ? {
    name: initialValues.name || "",
    category: initialValues.category || "Wealth",
    owner: initialValues.owner || "self",
    targetAmount: initialValues.targetAmount || "",
    currentAmount: initialValues.currentAmount || "0",
    startDate: initialValues.startDate || "",
    targetDate: initialValues.targetDate || "",
    priority: initialValues.priority || "Medium",
  } : {
    name: "",
    category: "Wealth",
    owner: "self",
    targetAmount: "",
    currentAmount: "0",
    startDate: new Date().toISOString().slice(0, 10),
    targetDate: "",
    priority: "Medium",
  });
  return (
    <Modal title={initialValues ? "Edit Goal" : "Add Goal"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Goal Name">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Buy a home, Retirement corpus"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category">
          <select
            style={input}
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            <option>Wealth</option>
            <option>Retirement</option>
            <option>Home</option>
            <option>Vehicle</option>
            <option>Education</option>
            <option>Travel</option>
            <option>Emergency Fund</option>
            <option>Wedding</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Priority">
          <select
            style={input}
            value={f.priority}
            onChange={(e) => setF({ ...f, priority: e.target.value })}
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Field label="Target Amount">
          <input style={input} type="number" value={f.targetAmount} onChange={(e) => setF({ ...f, targetAmount: e.target.value })} />
        </Field>
        <Field label="Current Saved">
          <input style={input} type="number" value={f.currentAmount} onChange={(e) => setF({ ...f, currentAmount: e.target.value })} />
        </Field>
        <Field label="Start Date">
          <input style={input} type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>
        <Field label="Target Date">
          <input style={input} type="date" value={f.targetDate} onChange={(e) => setF({ ...f, targetDate: e.target.value })} />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.name && f.targetAmount && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

function RentalPropertyModal({ initial, onClose, onSave }: any) {
  const [f, setF] = useState(initial ? {
    owner: initial.owner || "self",
    propertyName: initial.propertyName || "",
    propertyType: initial.propertyType || "shop",
    tenantName: initial.tenantName || "",
    tenantPhone: initial.tenantPhone || "",
    monthlyRent: initial.monthlyRent || "",
    securityDeposit: initial.securityDeposit || "",
    agreementStart: initial.agreementStart || "",
    agreementEnd: initial.agreementEnd || "",
    isActive: initial.isActive !== false,
    municipalTax: initial.municipalTax || "",
  } : {
    owner: "self", propertyName: "", propertyType: "shop",
    tenantName: "", tenantPhone: "", monthlyRent: "",
    securityDeposit: "", agreementStart: "", agreementEnd: "",
    isActive: true, municipalTax: "",
  });
  return (
    <Modal title={initial ? "Edit Property" : "Add Rental Property"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Owner / Profile" style={{ gridColumn: "1 / -1" }}>
          <select style={input} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
            {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Property Name (e.g. Shop at MG Road)" style={{ gridColumn: "1 / -1" }}>
          <input style={input} value={f.propertyName} onChange={(e) => setF({ ...f, propertyName: e.target.value })} placeholder="Shop at ABC Market" />
        </Field>
        <Field label="Property Type">
          <select style={input} value={f.propertyType} onChange={(e) => setF({ ...f, propertyType: e.target.value })}>
            <option value="shop">Shop / Commercial</option>
            <option value="flat">Flat / Residential</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Status">
          <select style={input} value={f.isActive ? "active" : "ended"} onChange={(e) => setF({ ...f, isActive: e.target.value === "active" })}>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
          </select>
        </Field>
        <Field label="Tenant Name">
          <input style={input} value={f.tenantName} onChange={(e) => setF({ ...f, tenantName: e.target.value })} placeholder="e.g. Ramesh Traders" />
        </Field>
        <Field label="Tenant Phone">
          <input style={input} value={f.tenantPhone} onChange={(e) => setF({ ...f, tenantPhone: e.target.value })} placeholder="9876543210" />
        </Field>
        <Field label="Monthly Rent (₹)">
          <input style={input} type="number" value={f.monthlyRent} onChange={(e) => setF({ ...f, monthlyRent: e.target.value })} placeholder="25000" />
        </Field>
        <Field label="Security Deposit Received (₹)">
          <input style={input} type="number" value={f.securityDeposit} onChange={(e) => setF({ ...f, securityDeposit: e.target.value })} placeholder="100000" />
        </Field>
        <Field label="Agreement Start">
          <input style={input} type="date" value={f.agreementStart} onChange={(e) => setF({ ...f, agreementStart: e.target.value })} />
        </Field>
        <Field label="Agreement End">
          <input style={input} type="date" value={f.agreementEnd} onChange={(e) => setF({ ...f, agreementEnd: e.target.value })} />
        </Field>
        <Field label="Annual Municipal Tax paid by you (₹)" style={{ gridColumn: "1 / -1" }}>
          <input style={input} type="number" value={f.municipalTax} onChange={(e) => setF({ ...f, municipalTax: e.target.value })} placeholder="0 (deducted before 30% std deduction)" />
        </Field>
      </div>
      <ModalActions onSave={() => f.propertyName && onSave(f)} onClose={onClose} saveLabel={initial ? "Update" : "Add Property"} />
    </Modal>
  );
}

function RentalReceiptModal({ onClose, onSave }: any) {
  const now = new Date();
  const defaultMonth = now.toISOString().slice(0, 7);
  const [f, setF] = useState({ month: defaultMonth, amount: "", date: today(), note: "" });
  return (
    <Modal title="Log Rent Receipt" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Month (YYYY-MM)">
          <input style={input} type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} />
        </Field>
        <Field label="Amount Received (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="25000" />
        </Field>
        <Field label="Date Received">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Note (optional)">
          <input style={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. cash / UPI" />
        </Field>
      </div>
      <ModalActions onSave={() => f.month && Number(f.amount) > 0 && onSave(f)} onClose={onClose} saveLabel="Log Receipt" />
    </Modal>
  );
}

function RentalDeductionModal({ onClose, onSave }: any) {
  const [f, setF] = useState({ reason: "", amount: "", date: today() });
  return (
    <Modal title="Add Deposit Deduction" onClose={onClose}>
      <Field label="Reason">
        <input style={input} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Painting, Repair, Cleaning" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="5000" />
        </Field>
        <Field label="Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => f.reason && Number(f.amount) > 0 && onSave(f)} onClose={onClose} saveLabel="Add Deduction" />
    </Modal>
  );
}

function RentedInPropertyModal({ initial, onClose, onSave }: any) {
  const [f, setF] = useState(initial ? {
    owner: initial.owner || "self",
    propertyName: initial.propertyName || "",
    landlordName: initial.landlordName || "",
    landlordPhone: initial.landlordPhone || "",
    monthlyRent: initial.monthlyRent || "",
    securityDeposit: initial.securityDeposit || "",
    agreementStart: initial.agreementStart || "",
    agreementEnd: initial.agreementEnd || "",
    isActive: initial.isActive !== false,
  } : { owner: "self", propertyName: "", landlordName: "", landlordPhone: "", monthlyRent: "", securityDeposit: "", agreementStart: "", agreementEnd: "", isActive: true });
  return (
    <Modal title={initial ? "Edit Rented Property" : "Add Rented Property"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Owner / Profile" style={{ gridColumn: "1 / -1" }}>
          <select style={input} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
            {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Property / Address" style={{ gridColumn: "1 / -1" }}>
          <input style={input} value={f.propertyName} onChange={(e) => setF({ ...f, propertyName: e.target.value })} placeholder="e.g. Flat 4B, Green Park" />
        </Field>
        <Field label="Landlord Name">
          <input style={input} value={f.landlordName} onChange={(e) => setF({ ...f, landlordName: e.target.value })} placeholder="e.g. Suresh Mehta" />
        </Field>
        <Field label="Landlord Phone">
          <input style={input} value={f.landlordPhone} onChange={(e) => setF({ ...f, landlordPhone: e.target.value })} placeholder="9876543210" />
        </Field>
        <Field label="Monthly Rent (₹)">
          <input style={input} type="number" value={f.monthlyRent} onChange={(e) => setF({ ...f, monthlyRent: e.target.value })} placeholder="25000" />
        </Field>
        <Field label="Security Deposit Paid (₹)">
          <input style={input} type="number" value={f.securityDeposit} onChange={(e) => setF({ ...f, securityDeposit: e.target.value })} placeholder="100000" />
        </Field>
        <Field label="Agreement Start">
          <input style={input} type="date" value={f.agreementStart} onChange={(e) => setF({ ...f, agreementStart: e.target.value })} />
        </Field>
        <Field label="Agreement End">
          <input style={input} type="date" value={f.agreementEnd} onChange={(e) => setF({ ...f, agreementEnd: e.target.value })} />
        </Field>
        <Field label="Status" style={{ gridColumn: "1 / -1" }}>
          <select style={input} value={f.isActive ? "active" : "ended"} onChange={(e) => setF({ ...f, isActive: e.target.value === "active" })}>
            <option value="active">Active</option>
            <option value="ended">Ended / Vacated</option>
          </select>
        </Field>
      </div>
      <ModalActions onSave={() => f.propertyName && onSave(f)} onClose={onClose} saveLabel={initial ? "Update" : "Add Property"} />
    </Modal>
  );
}

// ================== BANK EDIT MODAL ==================
function BankEditModal({ account, onClose, onSave }) {
  const [f, setF] = useState({
    bankName: account?.bankName || "",
    accountNumber: account?.accountNumber || "",
    type: account?.type || "Savings",
    balance: account?.balance || "",
  });
  return (
    <Modal title="Edit Bank Account" onClose={onClose}>
      <Field label="Bank Name">
        <input style={input} value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} />
      </Field>
      <Field label="Account Number (last 4 ok)">
        <input style={input} value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value })} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option>Savings</option>
            <option>Current</option>
            <option>Salary</option>
            <option>Joint</option>
          </select>
        </Field>
        <Field label="Current Balance">
          <input style={input} type="number" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => f.bankName && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== BUDGET TAB ==================
function BudgetTab({ state, addItem, removeItem, updateItem, metrics }) {
  const [show, setShow] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const ym = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const monthSpending = useMemo(() => {
    return state.transactions
      .filter((t) => t.date && t.date.startsWith(ym) && t.type === "debit")
      .reduce((acc, t) => {
        const cat = t.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
        return acc;
      }, {});
  }, [state.transactions, ym]);

  const totalBudget = state.budgets.reduce((s, b) => s + Number(b.monthly || 0), 0);
  const totalSpent = state.budgets.reduce((s, b) => s + (monthSpending[b.category] || 0), 0);

  const overBudgetCount = state.budgets.filter((b) => {
    const spent = monthSpending[b.category] || 0;
    return spent > Number(b.monthly || 0);
  }).length;

  return (
    <div>
      {overBudgetCount > 0 && (
        <div style={{ background: "rgba(217,48,37,0.08)", border: `1px solid ${THEME.rust}`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, color: THEME.rust }}>
          <AlertCircle size={16} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>⚠ {overBudgetCount} {overBudgetCount === 1 ? "category" : "categories"} over budget this month</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle sub="Set monthly limits per category and track real spending">
          Budget Planner
        </SectionTitle>
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Budget
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Wallet} label="Total Budgeted" value={fmtINRFull(totalBudget)} />
        <Tile icon={Receipt} label="Spent This Month" value={fmtINRFull(totalSpent)} negative={totalSpent > totalBudget} />
        <Tile icon={TrendingUp} label="Remaining" value={fmtINRFull(Math.max(0, totalBudget - totalSpent))} />
        <Tile icon={Target} label="Categories" value={state.budgets.length} />
      </div>

      {/* E1 – Budget Burn Rate */}
      {totalBudget > 0 && (() => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = now.getDate();
        const monthElapsedPct = (daysPassed / daysInMonth) * 100;
        const spentPct = (totalSpent / totalBudget) * 100;
        const onTrack = spentPct <= monthElapsedPct + 5;
        const burnColor = spentPct > monthElapsedPct + 10 ? THEME.rust : spentPct > monthElapsedPct - 5 ? THEME.gold : THEME.sage;
        const r = 44, sz = 104, circ = 2 * Math.PI * r;
        return (
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Budget Burn Rate — Day {daysPassed} of {daysInMonth}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width={sz} height={sz}>
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.line} strokeWidth="8" />
                  {/* Month elapsed arc (grey) */}
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.muted} strokeWidth="8" opacity="0.3"
                    strokeDasharray={`${(monthElapsedPct/100)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round" />
                  {/* Spend arc */}
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={burnColor} strokeWidth="8"
                    strokeDasharray={`${Math.min(spentPct/100,1)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.6s ease" }} />
                  <text x={sz/2} y={sz/2-4} textAnchor="middle" fontSize="15" fontWeight="800" fill={burnColor}>{spentPct.toFixed(0)}%</text>
                  <text x={sz/2} y={sz/2+13} textAnchor="middle" fontSize="9" fill={THEME.muted}>spent</text>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { label: "Month elapsed", val: monthElapsedPct.toFixed(0) + "%", color: THEME.muted },
                    { label: "Budget spent", val: spentPct.toFixed(0) + "%", color: burnColor },
                    { label: "Spent so far", val: fmtINRFull(totalSpent), color: THEME.ink },
                    { label: "Daily average", val: fmtINR(daysPassed > 0 ? totalSpent / daysPassed : 0) + "/day", color: THEME.muted },
                    { label: "Projected month-end", val: fmtINRFull(daysPassed > 0 ? (totalSpent / daysPassed) * daysInMonth : 0), color: burnColor },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: THEME.muted }}>{label}</span>
                      <span style={{ fontWeight: 700, color }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, padding: "8px 12px", borderRadius: 6, background: onTrack ? "rgba(30,142,62,0.08)" : "rgba(217,48,37,0.08)", color: onTrack ? THEME.sage : THEME.rust, fontWeight: 600 }}>
                  {onTrack ? "✓ On track — spending in line with the month" : `⚠ Overpacing — spending faster than month progress`}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {state.budgets.length === 0 ? (
        <div style={card}>
          <EmptyHint text="Add budget limits for categories like Food, Rent, Entertainment…" />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {state.budgets.map((b) => {
            const spent = monthSpending[b.category] || 0;
            const budget = Number(b.monthly || 0);
            const pct = budget > 0 ? (spent / budget) * 100 : 0;
            const over = pct > 100;
            const barColor = over ? THEME.rust : pct > 80 ? THEME.gold : THEME.sage;

            const nowDate = new Date();
            const daysPassed = nowDate.getDate();
            const daysInMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
            const projected = daysPassed > 0 ? (spent / daysPassed) * daysInMonth : 0;
            const projectedPct = budget > 0 ? (projected / budget) * 100 : 0;
            const dailyAvg = daysPassed > 0 ? spent / daysPassed : 0;

            return (
              <div key={b.id} style={{ ...card, position: "relative" }}>
                <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
                  <button onClick={() => setEditBudget(b)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => removeItem("budgets", b.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, paddingRight: 28 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{b.category}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      {fmtINRFull(spent)} spent of {fmtINRFull(budget)} budget
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: over ? THEME.rust : THEME.ink }}>{pct.toFixed(0)}%</div>
                    <div style={{ fontSize: 11, color: over ? THEME.rust : THEME.sage, fontWeight: 600 }}>
                      {over ? fmtINR(spent - budget) + " over" : fmtINR(budget - spent) + " left"}
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 8, background: THEME.line, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: Math.min(pct, 100) + "%", background: barColor, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                {/* Pace projection row */}
                {spent > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, flexWrap: "wrap", gap: 4 }}>
                    <span>{fmtINR(dailyAvg)}/day avg · day {daysPassed}/{daysInMonth}</span>
                    <span style={{ fontWeight: 600, color: projectedPct > 110 ? THEME.rust : projectedPct > 90 ? THEME.gold : THEME.sage }}>
                      Projected: {fmtINR(projected)} ({projectedPct.toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(() => {
        const budgetedCats = new Set(state.budgets.map((b) => b.category));
        const unbudgeted = Object.entries(monthSpending).filter(([cat]) => !budgetedCats.has(cat));
        if (!unbudgeted.length) return null;
        return (
          <div style={{ ...card, marginTop: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: THEME.muted }}>Unbudgeted Spending This Month</div>
            <div style={{ display: "grid", gap: 6 }}>
              {unbudgeted.sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 0", borderBottom: "1px dashed " + THEME.line }}>
                  <span>{cat}</span>
                  <span style={{ fontWeight: 600 }}>{fmtINRFull(amt)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {show && (
        <BudgetModal
          existing={state.budgets.map((b) => b.category)}
          onClose={() => setShow(false)}
          onSave={(v) => { addItem("budgets", v); setShow(false); }}
        />
      )}
      {editBudget && (
        <BudgetModal
          existing={state.budgets.filter(b => b.id !== editBudget.id).map(b => b.category)}
          initialValues={editBudget}
          onClose={() => setEditBudget(null)}
          onSave={(v) => { updateItem("budgets", editBudget.id, v); setEditBudget(null); }}
        />
      )}
    </div>
  );
}

function BudgetModal({ existing, onClose, onSave, initialValues = null }) {
  const allCats = ["Food", "Rent", "Transport", "Shopping", "Bills", "Salary", "Investment", "Tax", "Medical", "Entertainment", "EMI", "Groceries", "Utilities", "Other"];
  const [f, setF] = useState(initialValues ? { owner: initialValues.owner || "self", category: initialValues.category || allCats[0], monthly: initialValues.monthly || "" } : { owner: "self", category: allCats[0], monthly: "" });
  return (
    <Modal title={initialValues ? "Edit Budget" : "Add Budget"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select style={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {allCats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Monthly Limit (₹)">
        <input style={input} type="number" value={f.monthly} onChange={(e) => setF({ ...f, monthly: e.target.value })} placeholder="e.g. 5000" />
      </Field>
      <ModalActions onSave={() => f.monthly && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== REMINDERS TAB ==================
function RemindersTab({ state, addItem, removeItem }) {
  const [show, setShow] = useState(false);
  const todayStr = today();
  const [notifPerm, setNotifPerm] = useState<string>(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  });

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      try { localStorage.setItem("finance-notif", "granted"); } catch {}
    }
  };

  const allReminders = useMemo(() => {
    const list = [];
    state.creditCards.forEach((c) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) list.push({ id: "cc-" + c.id, title: (c.issuer || "Card") + " — Bill Due", subtitle: "Outstanding: " + fmtINRFull(c.outstanding), date: dueDate, type: "Credit Card", icon: CreditCard });
    });
    state.subscriptions.forEach((s) => {
      if (s.renewalDate) list.push({ id: "sub-" + s.id, title: s.name + " Renewal", subtitle: s.cycle + " · " + fmtINRFull(s.amount), date: s.renewalDate, type: "Subscription", icon: Repeat });
    });
    state.fixedDeposits.forEach((f) => {
      if (f.maturityDate) list.push({ id: "fd-" + f.id, title: "FD Maturity — " + (f.bank || f.bankName || "Bank"), subtitle: "Principal: " + fmtINRFull(f.principal), date: f.maturityDate, type: "Fixed Deposit", icon: Coins });
    });
    state.bonds.forEach((b) => {
      if (b.maturityDate) list.push({ id: "bond-" + b.id, title: "Bond Maturity — " + b.name, subtitle: "Face Value: " + fmtINRFull(b.faceValue), date: b.maturityDate, type: "Bond", icon: FileText });
    });
    state.lic.forEach((l) => {
      if (l.maturityDate) list.push({ id: "lic-" + l.id, title: "LIC Maturity — " + l.planName, subtitle: "Annual Premium: " + fmtINRFull(l.annualPremium), date: l.maturityDate, type: "LIC", icon: Shield });
    });
    state.termPlans.forEach((t) => {
      if (t.expiryDate) list.push({ id: "term-" + t.id, title: "Term Plan Expiry — " + t.planName, subtitle: "Cover: " + fmtINRFull(t.coverAmount), date: t.expiryDate, type: "Term Plan", icon: Shield });
    });
    state.loansGiven.forEach((l) => {
      if (l.dueDate) list.push({ id: "loan-" + l.id, title: "Loan Recovery — " + l.borrower, subtitle: "Outstanding: " + fmtINRFull(l.outstanding), date: l.dueDate, type: "Loan Given", icon: HandCoins });
    });
    state.reminders.forEach((r) => {
      list.push({ id: r.id, title: r.title, subtitle: r.note || "", date: r.date, type: "Reminder", icon: Bell, manual: true });
    });
    return list.filter((r) => r.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [state]);

  const daysLeft = (d) => Math.ceil((new Date(d) - new Date(todayStr)) / 86400000);
  const urgencyColor = (days) => days < 0 ? THEME.muted : days <= 7 ? THEME.rust : days <= 30 ? THEME.gold : THEME.sage;

  const upcoming = allReminders.filter((r) => daysLeft(r.date) >= 0);
  const past = allReminders.filter((r) => daysLeft(r.date) < 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle sub="Upcoming dues, maturities, renewals and custom alerts">
          Reminders & Alerts
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {notifPerm !== "unsupported" && notifPerm !== "granted" && (
            <button
              style={{ ...btnGhost, fontSize: 12 }}
              onClick={requestNotifications}
              title="Get browser notifications for due reminders"
            >
              <Bell size={13} /> Enable Notifications
            </button>
          )}
          {notifPerm === "granted" && (
            <span style={{ fontSize: 12, color: THEME.sage, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={13} /> Notifications on
            </span>
          )}
          <button style={btnSolid} onClick={() => setShow(true)}>
            <Plus size={14} /> Add Reminder
          </button>
        </div>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div style={card}>
          <EmptyHint text="No reminders yet. Add credit cards, FDs, or subscriptions with due dates to see them here." />
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
              {upcoming.map((r) => {
                const days = daysLeft(r.date);
                const color = urgencyColor(days);
                const Icon = r.icon;
                return (
                  <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 16, borderLeft: "4px solid " + color, padding: "16px 20px" }}>
                    <Icon size={20} style={{ color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{r.subtitle}{r.subtitle ? " · " : ""}{r.type}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color, fontSize: 16 }}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : days + " days"}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>{r.date}</div>
                    </div>
                    {r.manual && (
                      <button onClick={() => removeItem("reminders", r.id)} style={iconBtn}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Past Due</div>
              <div style={{ display: "grid", gap: 8 }}>
                {past.slice(-5).map((r) => {
                  const days = Math.abs(daysLeft(r.date));
                  const Icon = r.icon;
                  return (
                    <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, opacity: 0.6, padding: "12px 16px" }}>
                      <Icon size={16} style={{ color: THEME.muted, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 14 }}>
                        <span style={{ fontWeight: 600 }}>{r.title}</span>
                        <span style={{ color: THEME.muted }}> · {r.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>{days}d ago</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {show && (
        <ReminderModal
          onClose={() => setShow(false)}
          onSave={(v) => { addItem("reminders", v); setShow(false); }}
        />
      )}
    </div>
  );
}

function ReminderModal({ onClose, onSave }) {
  const [f, setF] = useState({ title: "", amount: "", date: "", note: "" });
  return (
    <Modal title="Add Reminder" onClose={onClose}>
      <Field label="Title">
        <input style={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Car Insurance Renewal" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Due Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Amount (optional)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
      </div>
      <Field label="Note (optional)">
        <input style={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalActions onSave={() => f.title && f.date && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
// ================== SIP TRACKER TAB ==================
function SIPTrackerTab({ state, addItem, removeItem }) {
  const [show, setShow] = useState(false);
  const todayStr = today();

  const [sipProjRate, setSipProjRate] = useState("12");

  const sipsWithCalc = useMemo(() => {
    const r = (Number(sipProjRate) || 12) / 12 / 100;
    return (state.sips || []).map((sip) => {
      const paid = Math.min(Math.max(0, monthsBetween(sip.startDate, todayStr)), Number(sip.totalInstallments || 0));
      const totalInvested = paid * Number(sip.amount || 0);
      const remaining = Math.max(0, Number(sip.totalInstallments || 0) - paid);
      const m = Number(sip.amount || 0);
      const currentCorpus = r === 0 ? totalInvested : m * (Math.pow(1 + r, paid) - 1) / r * (1 + r);
      const projectedCorpus = r === 0 ? currentCorpus + m * remaining : currentCorpus * Math.pow(1 + r, remaining) + m * (Math.pow(1 + r, remaining) - 1) / r * (1 + r);
      return { ...sip, paid, totalInvested, remaining, currentCorpus, projectedCorpus };
    });
  }, [state.sips, todayStr, sipProjRate]);

  const totalMonthly = sipsWithCalc.reduce((s, sip) => s + Number(sip.amount || 0), 0);
  const totalInvested = sipsWithCalc.reduce((s, sip) => s + sip.totalInvested, 0);
  const totalProjected = sipsWithCalc.reduce((s, sip) => s + sip.projectedCorpus, 0);

  return (
    <div>
      <SectionTitle sub="Track your systematic investment plans across mutual funds">
        SIP Tracker
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Activity} label="Monthly SIP" value={fmtINRFull(totalMonthly)} />
        <Tile icon={TrendingUp} label="Total Invested" value={fmtINRFull(totalInvested)} />
        <Tile icon={Repeat} label="Active SIPs" value={sipsWithCalc.length} />
        <Tile icon={Sparkles} label="Projected Corpus" value={fmtINRFull(totalProjected)} sub={`@${sipProjRate}% p.a.`} subColor={THEME.sage} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: THEME.muted }}>Projection rate:</span>
          <input style={{ ...input, width: 64, fontSize: 13, padding: "4px 8px" }} type="number" value={sipProjRate} onChange={(e) => setSipProjRate(e.target.value)} />
          <span style={{ fontSize: 12, color: THEME.muted }}>% p.a.</span>
        </div>
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add SIP
        </button>
      </div>

      {sipsWithCalc.length === 0 ? (
        <div style={card}><EmptyHint text="Add your SIPs to track investments" /></div>
      ) : (
        <div style={card}>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Scheme</th>
                <th style={th}>Type</th>
                <th style={{ ...th, textAlign: "right" }}>Amount/mo</th>
                <th style={th}>Started</th>
                <th style={{ ...th, textAlign: "right" }}>Paid/Total</th>
                <th style={{ ...th, textAlign: "right" }}>Invested</th>
                <th style={{ ...th, textAlign: "right" }}>Projected Corpus</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {sipsWithCalc.map((sip) => (
                <tr key={sip.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={{ ...td, fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sip.scheme}</td>
                  <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{sip.fundType}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(sip.amount)}</td>
                  <td style={td}>{sip.startDate}</td>
                  <td style={{ ...td, textAlign: "right" }}>{sip.paid} / {sip.totalInstallments}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{fmtINRFull(sip.totalInvested)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.sage }}>
                    {fmtINRFull(sip.projectedCorpus)}
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 400 }}>{sip.remaining > 0 ? `${sip.remaining} mo left` : "Complete"}</div>
                  </td>
                  <td style={td}>
                    <button onClick={() => removeItem("sips", sip.id)} style={iconBtn}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {show && (
        <SIPModal
          onClose={() => setShow(false)}
          onSave={(v) => { addItem("sips", v); setShow(false); }}
        />
      )}
    </div>
  );
}

function SIPModal({ onClose, onSave }) {
  const [f, setF] = useState({ scheme: "", fundType: "Equity", amount: "", frequency: "monthly", startDate: today(), totalInstallments: "12" });
  return (
    <Modal title="Add SIP" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Scheme Name">
        <input style={input} value={f.scheme} onChange={(e) => setF({ ...f, scheme: e.target.value })} placeholder="e.g. Parag Parikh Flexi Cap" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fund Type">
          <select style={input} value={f.fundType} onChange={(e) => setF({ ...f, fundType: e.target.value })}>
            <option>Equity</option>
            <option>Index</option>
            <option>Hybrid</option>
            <option>Debt</option>
            <option>ELSS</option>
          </select>
        </Field>
        <Field label="Frequency">
          <select style={input} value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Field label="Amount (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Start Date">
          <input style={input} type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>
        <Field label="Total Installments">
          <input style={input} type="number" value={f.totalInstallments} onChange={(e) => setF({ ...f, totalInstallments: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => f.scheme && f.amount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== INSURANCE SUMMARY TAB ==================
function InsuranceSummaryTab({ state, metrics }) {
  const totalLICAssured = state.lic.reduce((s, l) => s + Number(l.sumAssured || 0), 0);
  const totalTermCover = state.termPlans.reduce((s, t) => s + Number(t.coverAmount || 0), 0);
  const licAnnualPremium = state.lic.reduce((s, l) => s + Number(l.annualPremium || 0), 0);
  const termAnnualPremium = state.termPlans.reduce((s, t) => s + Number(t.annualPremium || 0), 0);
  const totalAnnualPremium = licAnnualPremium + termAnnualPremium;
  const annualIncome = state.income.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCover = totalTermCover + totalLICAssured;
  const recommended15x = annualIncome * 15;
  const recommended10x = annualIncome * 10;
  const coverRatio = annualIncome > 0 ? totalTermCover / annualIncome : 0;
  const adequacyLevel = coverRatio >= 15 ? "excellent" : coverRatio >= 10 ? "adequate" : coverRatio >= 5 ? "low" : "critical";
  const adequacyColor = { excellent: THEME.sage, adequate: THEME.gold, low: THEME.gold, critical: THEME.rust }[adequacyLevel];
  const adequacyLabel = { excellent: "Excellent (≥15×)", adequate: "Adequate (10–15×)", low: "Low (5–10×)", critical: "Critical (<5×)" }[adequacyLevel];

  return (
    <div>
      <SectionTitle sub="Life Insurance, LIC policies and term plan coverage at a glance">
        Insurance Summary
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Shield} label="Total LIC Sum Assured" value={fmtINRFull(totalLICAssured)} />
        <Tile icon={Heart} label="Total Term Cover" value={fmtINRFull(totalTermCover)} />
        <Tile icon={Wallet} label="Total Annual Premium" value={fmtINRFull(totalAnnualPremium)} />
        <Tile icon={Zap} label="Cover Ratio" value={annualIncome > 0 ? coverRatio.toFixed(1) + "×" : "—"} sub={adequacyLabel} subColor={adequacyColor} />
      </div>

      {/* D10 – Insurance Adequacy Checker */}
      {annualIncome > 0 && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Coverage Adequacy Checker · 15× Rule</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 20px", alignItems: "center", marginBottom: 20 }}>
            {[
              { label: "Your annual income", val: fmtINRFull(annualIncome) },
              { label: "Recommended cover (10× minimum)", val: fmtINRFull(recommended10x) },
              { label: "Recommended cover (15× ideal)", val: fmtINRFull(recommended15x) },
              { label: "Your term cover", val: fmtINRFull(totalTermCover) },
              { label: "Gap to 15×", val: totalTermCover >= recommended15x ? "None — fully covered!" : fmtINRFull(recommended15x - totalTermCover) },
            ].map(({ label, val }, i) => (
              <React.Fragment key={i}>
                <div style={{ fontSize: 13, color: THEME.muted }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: i === 3 ? adequacyColor : i === 4 ? (totalTermCover >= recommended15x ? THEME.sage : THEME.rust) : THEME.ink }}>{val}</div>
              </React.Fragment>
            ))}
          </div>
          <div style={{ height: 12, background: THEME.line, borderRadius: 6, overflow: "visible", position: "relative", marginBottom: 10 }}>
            <div style={{ height: "100%", width: Math.min((totalTermCover / recommended15x) * 100, 100) + "%", background: adequacyColor, borderRadius: 6, transition: "width 0.6s" }} />
            {[10, 15].map((mult) => {
              const pct = Math.min((annualIncome * mult / recommended15x) * 100, 100);
              return <div key={mult} style={{ position: "absolute", top: -4, left: pct + "%", width: 2, height: 20, background: THEME.ink, opacity: 0.35 }} />;
            })}
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 11, color: THEME.muted }}>
            <span><span style={{ background: THEME.rust, borderRadius: 2, padding: "1px 6px", color: "#fff", marginRight: 4 }}>|</span> 10× mark</span>
            <span><span style={{ background: THEME.ink, borderRadius: 2, padding: "1px 6px", color: "#fff", opacity: 0.4, marginRight: 4 }}>|</span> 15× ideal</span>
            <span style={{ marginLeft: "auto", fontWeight: 700, color: adequacyColor }}>{adequacyLabel}</span>
          </div>
        </div>
      )}

      {/* LIC Policies */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Life Insurance (LIC)</div>
        {state.lic.length === 0 ? (
          <EmptyHint text="No LIC policies added" />
        ) : (
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Policy No</th>
                <th style={th}>Plan Name</th>
                <th style={{ ...th, textAlign: "right" }}>Sum Assured</th>
                <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                <th style={th}>Maturity Date</th>
              </tr>
            </thead>
            <tbody>
              {state.lic.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={td}>****{String(l.policyNumber || "").slice(-4)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{l.planName}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.sumAssured)}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.annualPremium)}</td>
                  <td style={td}>{l.maturityDate}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Term Plans */}
      <div style={card}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Term Plans</div>
        {state.termPlans.length === 0 ? (
          <EmptyHint text="No term plans added" />
        ) : (
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Insurer</th>
                <th style={th}>Plan Name</th>
                <th style={{ ...th, textAlign: "right" }}>Cover Amount</th>
                <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                <th style={th}>Expiry Date</th>
              </tr>
            </thead>
            <tbody>
              {state.termPlans.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={td}>{t.insurer}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{t.planName}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.coverAmount)}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.annualPremium)}</td>
                  <td style={td}>{t.expiryDate}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

// ================== QUICK ADD MODAL ==================
function QuickAddModal({ onClose, onSave, bankAccounts }) {
  const [f, setF] = useState({
    date: today(),
    type: "debit",
    amount: "",
    category: "Food",
    note: "",
    accountId: bankAccounts[0]?.id || "",
  });
  const categories = ["Food", "Rent", "Transport", "Shopping", "Bills", "Salary", "Investment", "Tax", "Medical", "Entertainment", "EMI", "Groceries", "Utilities", "Other"];
  return (
    <Modal title="Quick Add Transaction" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Type">
          <select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="debit">Debit (Expense)</option>
            <option value="credit">Credit (Income)</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Category">
          <select style={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Account">
        <select style={input} value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}>
          {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName}</option>)}
        </select>
      </Field>
      <Field label="Note">
        <input style={input} value={f.note} onChange={(e) => {
          const note = e.target.value;
          const cat = autoCateg(note);
          setF({ ...f, note, ...(cat ? { category: cat } : {}) });
        }} placeholder="Optional note — category auto-detected" />
      </Field>
      <ModalActions onSave={() => f.amount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== SETTINGS TAB ==================
function SettingsTab({
  state, setState, exportJSON, resetAll, showToast, onSignOut, onImportSuccess,
  accentKey, setAccentKey,
  density, setDensity,
  sidebarNav, setSidebarNav,
  radiusKey, setRadiusKey,
  fontKey, setFontKey,
  bgStyle, setBgStyle,
  animSpeed, setAnimSpeed,
  chartStyle, setChartStyle
}: any) {
  const [prof, setProf] = useState({ ...state.profile });
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveProfile = () => {
    setState((s: any) => ({ ...s, profile: { ...s.profile, ...prof } }));
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  const handleImport = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const input = e.target;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      try {
        const parsed = JSON.parse(ev.target.result as string);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.bankAccounts)) {
          showToast("Invalid backup — not a valid finance export", "error");
          input.value = "";
          return;
        }
        setState({ ...DEFAULT_STATE, ...parsed });
        onImportSuccess?.();
        showToast("Backup restored successfully");
      } catch {
        showToast("Error parsing file", "error");
      }
      input.value = "";
    };
    reader.readAsText(file);
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: THEME.muted, marginBottom: 6 };
  const inputStyle = { width: "100%", padding: "10px 12px", background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`, borderRadius: 10, color: THEME.ink, fontSize: 14 };

  return (
    <div style={{ maxWidth: 1000 }} className="animate-fade-in-up">
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Settings & Preferences</h2>
        <p style={{ color: THEME.muted, fontSize: 14, marginTop: 4 }}>Customize your experience and manage data</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 32 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={20} color={THEME.accent} /> Appearance
          </div>
          <div style={{ display: "grid", gap: 20 }}>
            <Field label="Accent Color">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(ACCENT_PALETTES).map(([k, p]) => (
                  <button
                    key={k}
                    onClick={() => setAccentKey(k as any)}
                    title={p.label}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: p.main,
                      border: accentKey === k ? `2px solid ${THEME.ink}` : "2px solid transparent",
                      cursor: "pointer",
                      padding: 0,
                      boxShadow: accentKey === k ? `0 0 0 2px var(--t-paper), 0 0 0 4px ${p.main}` : "none",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>
            </Field>

            <Field label="Navigation Layout">
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { id: true, label: "Sidebar", icon: LayoutIcon },
                  { id: false, label: "Top Navigation", icon: CreditCard }
                ].map((l) => (
                  <button
                    key={l.label}
                    onClick={() => setSidebarNav(l.id)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 12,
                      border: `2px solid ${sidebarNav === l.id ? THEME.accent : THEME.line}`,
                      background: sidebarNav === l.id ? "color-mix(in srgb, var(--t-accent) 8%, transparent)" : "transparent",
                      color: sidebarNav === l.id ? THEME.accent : THEME.muted,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <l.icon size={16} />
                    {l.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <Database size={20} color={THEME.sage} /> Data Management
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <Button variant="secondary" onClick={() => exportJSON()} icon={<Download size={16} />} style={{ width: "100%" }}>
              Export Backup (.json)
            </Button>
            <div style={{ position: "relative" }}>
              <Button variant="secondary" icon={<RefreshCw size={16} />} style={{ width: "100%" }}>
                Restore Backup
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </div>
            <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1px solid ${THEME.line}` }}>
              <Button variant="ghost" onClick={resetAll} style={{ width: "100%", color: THEME.rust }}>
                Reset All Data
              </Button>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 24, gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <User size={20} /> Personal Profile
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            <Field label="Display Name">
              <input style={inputStyle} value={prof.name || ""} onChange={(e) => setProf({ ...prof, name: e.target.value })} />
            </Field>
            <Field label="Financial Year">
              <select style={inputStyle} value={prof.fy || "2025-26"} onChange={(e) => setProf({ ...prof, fy: e.target.value })}>
                <option value="2024-25">FY 2024-25</option>
                <option value="2025-26">FY 2025-26</option>
                <option value="2026-27">FY 2026-27</option>
              </select>
            </Field>
            <Field label="Tax Regime">
              <select style={inputStyle} value={prof.regime || "new"} onChange={(e) => setProf({ ...prof, regime: e.target.value })}>
                <option value="new">New Regime</option>
                <option value="old">Old Regime</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={saveProfile} icon={saved ? <Check size={16} /> : undefined}>
              {saved ? "Profile Saved" : "Save Profile"}
            </Button>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 40, textAlign: "center" }}>
        <Button variant="ghost" onClick={onSignOut} style={{ color: THEME.muted }}>
          Sign Out of Account
        </Button>
      </div>
    </div>
  );
}
