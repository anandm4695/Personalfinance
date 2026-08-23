// @ts-nocheck
import "./styles.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  X,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  CheckCheck,
  Clock,
  Download,
  Bell,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  Command,
  Sparkles,
} from "lucide-react";
import {
  supabase,
  setDemoMode,
  getIsDemoMode,
  isDemoDbReady,
  signInToDemo,
  signOutOfDemo,
  capturedUrlHash,
} from "./supabaseClient";
import Auth from "./Auth";
import { PrivacyProvider, usePrivacy } from "./context/PrivacyContext";

// Modular Imports
import { THEME, DENSITY } from "./utils/constants";
import { DEFAULT_MASTER_DATA, MasterDataContext, formatProfileOption } from "./utils/masterData";
import {
  fmtINRFull,
  uid,
  today,
  loadState,
  saveStateLocal,
  getLocalDateString,
  addMonthsToDateStr,
  alertDismissKey,
} from "./utils/finance";
import {
  getCurrentFY,
  NUMERIC_COLS,
  TABLE_MAP,
  camelToSnake,
  snakeToCamel as snakeToCamelUtil,
  NAV_GROUPS,
  getNavBreadcrumb,
} from "./utils/appConstants";

// Extracted hooks
import { useMetrics } from "./hooks/useMetrics";
import { useAlerts } from "./hooks/useAlerts";
import { useSearch } from "./hooks/useSearch";
import { useTheme } from "./hooks/useTheme";
import { useNotifications } from "./hooks/useNotifications";
import { useToast } from "./hooks/useToast";

// Extracted layout components
import { LoadingScreen } from "./components/layout/LoadingScreen";
import { MobileNav } from "./components/layout/MobileNav";

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
import { RealEstateTab } from "./components/tabs/RealEstateTab";
import { VehiclesTab } from "./components/tabs/VehiclesTab";
import { CashFlowTab } from "./components/tabs/CashFlowTab";
import { CalendarTab } from "./components/tabs/CalendarTab";
import { XIRRReportTab } from "./components/tabs/XIRRReportTab";
import { DividendCalendarTab } from "./components/tabs/DividendCalendarTab";
import { CapitalGainsTab } from "./components/tabs/CapitalGainsTab";
import { TaxToolsTab } from "./components/tabs/TaxToolsTab";
import { AnnualReportTab } from "./components/tabs/AnnualReportTab";
import { InvestmentStatementTab } from "./components/tabs/InvestmentStatementTab";
import { ExpenseTrendsTab } from "./components/tabs/ExpenseTrendsTab";
import { FamilyViewTab } from "./components/tabs/FamilyViewTab";
import { EmergencyFundTab } from "./components/tabs/EmergencyFundTab";
import { NomineeTrackerTab } from "./components/tabs/NomineeTrackerTab";
import { DocumentVaultTab } from "./components/tabs/DocumentVaultTab";
import { RebalancingTab } from "./components/tabs/RebalancingTab";
import { NetWorthTimelineTab } from "./components/tabs/NetWorthTimelineTab";

import { CASImportTab } from "./components/tabs/CASImportTab";
import { LoanAmortizationTab } from "./components/tabs/LoanAmortizationTab";
import { FIREPlannerTab } from "./components/tabs/FIREPlannerTab";
import { LifeEventPlannerTab } from "./components/tabs/LifeEventPlannerTab";
import { TaxFilingHelperTab } from "./components/tabs/TaxFilingHelperTab";
import { HealthInsuranceTab } from "./components/tabs/HealthInsuranceTab";
import { CreditScoreTab } from "./components/tabs/CreditScoreTab";
import { BillPaymentTab } from "./components/tabs/BillPaymentTab";
import { GovtSchemesTab } from "./components/tabs/GovtSchemesTab";
import { SalarySlipTab } from "./components/tabs/SalarySlipTab";
import { SmartAlertsTab } from "./components/tabs/SmartAlertsTab";
import { ExpenseForecastTab } from "./components/tabs/ExpenseForecastTab";
import { DataExportTab } from "./components/tabs/DataExportTab";
import { ComparisonReportsTab } from "./components/tabs/ComparisonReportsTab";
import { Section80TrackerTab } from "./components/tabs/Section80TrackerTab";
import { GoldSGBTab } from "./components/tabs/GoldSGBTab";
import { AuditLogTab } from "./components/tabs/AuditLogTab";
import { PerformanceBenchmarkTab } from "./components/tabs/PerformanceBenchmarkTab";

// Workspace Imports
import { CommandKModal } from "./components/workspace/CommandKModal";
import { WorkspaceSidebar } from "./components/workspace/WorkspaceSidebar";
import { WorkspaceHeader } from "./components/workspace/WorkspaceHeader";
import { OnboardingWizard } from "./components/modals/OnboardingWizard";

// UI Imports
import { ToastStack, ConfirmDialog } from "./components/ui/Feedback";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

// getCurrentFY imported from ./utils/appConstants

const DEFAULT_STATE = {
  profile: { name: "there", fy: getCurrentFY(), regime: "new", savingsTarget: 20 },
  bankAccounts: [],
  transactions: [],
  fixedDeposits: [],
  recurringDeposits: [],
  bonds: [],
  ppf: [],
  nps: [],
  epf: [],
  lic: [],
  termPlans: [],
  investmentPlans: [],
  mutualFunds: [],
  stocks: [],
  demat: [],
  wishlists: [],
  wishlistItems: [],
  creditCards: [],
  prepaidCards: [],
  loansTaken: [],
  loansGiven: [],
  informalBorrowed: [],
  informalLent: [],
  rentalProperties: [],
  rentedProperties: [],
  subscriptions: [],
  goals: [],
  income: [],
  taxPayments: [],
  budgets: [],
  recurringExpenses: [],
  reminders: [],
  stockSells: [],
  mfSells: [],
  netWorthHistory: [],
  sips: [],
  realEstateProperties: [],
  realEstateDemands: [],
  realEstatePayments: [],
  vehicles: [],
  dividends: [],
  documents: [],
  goldHoldings: [],
  lifeEvents: [],
  corporateActions: [],
  healthInsurance: [],
  creditScores: [],
  billPayments: [],
  billPaymentHistory: [],
  govtSchemes: [],
  salarySlips: [],
  form26as: [],
  dismissedAlerts: {},
  masterData: { ...DEFAULT_MASTER_DATA },
  settings: {
    // Dark + gold ("Goldman" preset) is the true default identity — it matches
    // the splash screen's gold branding (#C5A152, index.html) and the FOUC-prevention
    // script's dark fallback, so first-time/demo visitors see one coherent brand
    // instead of a gold splash flipping to a generic light-indigo dashboard.
    darkMode: true,
    accentKey: "amber",
    density: "normal",
    radiusKey: "modern",
    fontKey: "inter",
    bgStyle: "plain",
    animSpeed: "smooth",
    emailEnabled: false,
    emailFrequency: "weekly",
    emailDay: 1,
    emailHour: 8,
    emailAddress: "",
    fromEmail: "",
    lastEmailSentAt: null,
    lastEmailStatus: "",
    lastEmailError: "",
    geminiApiKey: "",
  },
};

// NUMERIC_COLS imported from ./utils/appConstants

// ================== MAIN APP ==================
function FinanceDashboard() {
  const [session, setSession] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem("demo_session");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  // A Supabase password-recovery link establishes a real session before React renders.
  // We must not let that truthy session skip straight into the dashboard — force the
  // "set new password" screen until the reset completes (Auth.tsx clears this via
  // onRecoveryComplete after updateUser succeeds).
  const [recoveryMode, setRecoveryMode] = useState<boolean>(() => {
    try {
      // Read the hash captured at module load (supabaseClient.ts), not the live
      // window.location.hash — Supabase's own client init reads and strips the
      // #type=recovery hash asynchronously, and can win the race against this
      // first render, silently dropping the user into the normal dashboard.
      return capturedUrlHash.includes("type=recovery");
    } catch {
      return false;
    }
  });
  const [loaded, setLoaded] = useState(false);
  // Captured once at mount, before `state` gets overwritten by fetchAllData's response —
  // distinguishes "returning user, cached data already in state, background refresh in
  // flight" (should render immediately, exactly as today) from "cold cache, nothing to
  // show yet" (should hold on a loading screen rather than flash EmptyState/₹0 and then
  // snap to the real numbers once fetchAllData resolves).
  const [hadCachedDataAtMount] = useState(() => {
    try {
      return loadState() !== null;
    } catch {
      return false;
    }
  });
  // Distinct from `loaded` below, which gets set true the moment there's no session yet
  // (well before login) and is never reset false when a real fetch subsequently starts —
  // this tracks the actual fetchAllData() async window, nothing else.
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(false);
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
  const wishlistItemsRef = useRef<any[]>([]);
  // Mirrors marketData/fetchLivePrices for mutual funds so Current Value uses a live NAV
  // the same way Demat uses a live stock price, instead of a manually-refreshed field.
  const [mfMarketDataTs, setMfMarketDataTs] = useState<number | null>(null);
  const [mfMarketData, setMfMarketData] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("finance_mf_market_data");
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const { _ts, ...data } = parsed;
      if (_ts && Date.now() - _ts > 8 * 3600 * 1000) return {};
      return data;
    } catch {
      return {};
    }
  });
  const [fetchingMfNavs, setFetchingMfNavs] = useState(false);
  const fetchingMfNavsRef = useRef(false);
  const mutualFundsRef = useRef<any[]>([]);
  // Tracks latest masterData synchronously inside setState callbacks, so rapid back-to-back
  // addItem calls (e.g. transfer = debit + credit) don't overwrite each other's DB upsert.
  const masterDataRef = useRef<any>(null);
  // Tracks which user id fetchAllData has already run for. Supabase's onAuthStateChange fires
  // a brand-new `session` object on TOKEN_REFRESHED (automatic, roughly hourly) and on tab-focus
  // regain, not just on real sign-in — without this guard, the full-refetch effect below would
  // re-run then too, and its setState unconditionally replaces every collection with the DB
  // snapshot. Any addItem/updateItem still mid-flight (optimistic UI update already shown, upsert
  // not yet landed) would get silently wiped by that snapshot, since it can't know about writes
  // that haven't reached Postgres yet. This is the "I entered data and it didn't stick" bug.
  const lastFetchedUserIdRef = useRef<string | null>(null);
  // Counts in-flight primary add/update/delete writes to Supabase. Used only to warn on tab
  // close/refresh mid-save (see the beforeunload effect below) — closing the tab before the
  // network request lands aborts it, silently losing an item that was already shown in the UI.
  const pendingWritesRef = useRef(0);
  const { privacyMode, setPrivacyMode } = usePrivacy();
  const [sidebarMinimized, setSidebarMinimized] = useState(() => {
    try {
      return localStorage.getItem("pf_sidebar_minimized") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pf_sidebar_minimized", String(sidebarMinimized));
    } catch {}
  }, [sidebarMinimized]);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const isSidebarCompact = sidebarMinimized && !sidebarHovered;

  const [state, setState] = useState(() => {
    // 1. If we just reset, start with default state
    if (
      window.location.search.includes("reset=success") ||
      window.location.search.includes("reset=local")
    ) {
      return DEFAULT_STATE;
    }

    const saved = loadState() || {};
    const newState = { ...DEFAULT_STATE };

    // Ensure every top-level key from DEFAULT_STATE exists in newState
    // and that array keys are actually arrays.
    Object.keys(DEFAULT_STATE).forEach((key) => {
      if (Array.isArray(DEFAULT_STATE[key])) {
        newState[key] = Array.isArray(saved[key]) ? saved[key] : [];
      } else if (typeof DEFAULT_STATE[key] === "object" && DEFAULT_STATE[key] !== null) {
        newState[key] = { ...DEFAULT_STATE[key], ...(saved[key] || {}) };
      } else {
        newState[key] = saved[key] !== undefined ? saved[key] : DEFAULT_STATE[key];
      }
    });

    return newState;
  });

  // Note: cannot use useMasterData() here — the MasterDataContext.Provider is rendered
  // further down inside this same component's JSX, so useContext would only see the
  // default value, not the live state.masterData. Read it straight from state instead.
  const familyProfiles = state.masterData?.familyProfiles || DEFAULT_MASTER_DATA.familyProfiles;

  // 2. Cross-tab sync: If another tab calls localStorage.clear() (full reset), reload this tab too.
  // IMPORTANT: Do NOT reload on normal data writes (e.g. finance_dashboard_v1 key changes).
  // The storage event fires in ALL other tabs on every saveStateLocal call, so reloading on key
  // matches causes an infinite reload storm when 2+ tabs are open simultaneously.
  // Only e.key === null means localStorage.clear() was called — that is the only safe reload trigger.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.storageArea === localStorage && !isResetting && !e.key) {
        window.location.reload();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [isResetting]);

  // Keep stocksRef in sync so fetchLivePrices can read current stocks without depending on state.stocks
  useEffect(() => {
    stocksRef.current = state.stocks;
  }, [state.stocks]);

  useEffect(() => {
    wishlistItemsRef.current = state.wishlistItems || [];
  }, [state.wishlistItems]);

  useEffect(() => {
    mutualFundsRef.current = state.mutualFunds || [];
  }, [state.mutualFunds]);

  // Derived settings from state for easier access
  const settings = state.settings || DEFAULT_STATE.settings;
  const { darkMode, accentKey, density, radiusKey, fontKey, bgStyle, animSpeed } = settings;

  const logActivity = useCallback(
    async (actionType: string, description: string, metadata?: any) => {
      if (!session || !session.user?.id || session.user.id === "offline-user") return;
      try {
        await supabase.from("activity_logs").insert({
          user_id: session.user.id,
          action_type: actionType,
          description,
          metadata,
        });
      } catch (e) {
        console.warn("Activity logging failed", e);
      }
    },
    [session]
  );

  // Helper to update settings
  const updateSettings = useCallback(
    async (updates: Partial<typeof settings>) => {
      setState((s) => ({
        ...s,
        settings: { ...(s.settings || DEFAULT_STATE.settings), ...updates },
      }));

      const userId = session?.user?.id;
      if (userId && userId !== "offline-user") {
        // Convert camelCase to snake_case for DB
        const dbUpdates: any = {};
        if (updates.darkMode !== undefined) dbUpdates.dark_mode = updates.darkMode;
        if (updates.accentKey !== undefined) dbUpdates.accent_key = updates.accentKey;
        if (updates.density !== undefined) dbUpdates.density = updates.density;
        if (updates.radiusKey !== undefined) dbUpdates.radius_key = updates.radiusKey;
        if (updates.fontKey !== undefined) dbUpdates.font_key = updates.fontKey;
        if (updates.bgStyle !== undefined) dbUpdates.bg_style = updates.bgStyle;
        if (updates.animSpeed !== undefined) dbUpdates.anim_speed = updates.animSpeed;
        if (updates.emailEnabled !== undefined) dbUpdates.email_enabled = updates.emailEnabled;
        if (updates.emailFrequency !== undefined)
          dbUpdates.email_frequency = updates.emailFrequency;
        if (updates.emailDay !== undefined) dbUpdates.email_day = updates.emailDay;
        if (updates.emailHour !== undefined) dbUpdates.email_hour = updates.emailHour;
        if (updates.emailAddress !== undefined) dbUpdates.email_address = updates.emailAddress;
        if (updates.fromEmail !== undefined) dbUpdates.from_email = updates.fromEmail;
        if (updates.geminiApiKey !== undefined) dbUpdates.gemini_api_key = updates.geminiApiKey;
        if (updates.goldPricePerGram !== undefined)
          dbUpdates.gold_price_per_gram = updates.goldPricePerGram;

        const { error: settErr } = await supabase
          .from("user_settings")
          .upsert({ user_id: userId, ...dbUpdates });
        if (settErr) console.error("updateSettings DB error:", settErr.message, dbUpdates);
      }

      // Log setting changes — never persist secret values into the activity log
      const keys = Object.keys(updates).join(", ");
      const loggedUpdates =
        updates.geminiApiKey !== undefined
          ? { ...updates, geminiApiKey: updates.geminiApiKey ? "[redacted]" : "" }
          : updates;
      logActivity("UPDATE_SETTINGS", `Updated settings: ${keys}`, loggedUpdates);
    },
    [logActivity, session]
  );

  const updateMasterData = useCallback(
    async (key: string, newValue: any) => {
      let merged: any = null;
      setState((s) => {
        merged = { ...(s.masterData || DEFAULT_MASTER_DATA), [key]: newValue };
        return { ...s, masterData: merged };
      });
      const userId = session?.user?.id;
      if (userId && userId !== "offline-user" && merged) {
        const { error } = await supabase
          .from("user_settings")
          .upsert({ user_id: userId, master_data: merged });
        if (error) console.error("[updateMasterData] DB upsert failed:", error.message);
      }
    },
    [session]
  );

  // Helper to update profile
  const updateProfile = useCallback(
    async (updates: any) => {
      setState((s) => ({
        ...s,
        profile: { ...s.profile, ...updates },
      }));

      const userId = session?.user?.id;
      if (userId && userId !== "offline-user") {
        // Explicitly map camelCase profile fields to the DB's snake_case columns.
        // Spreading `updates` directly fails because keys like `savingsTarget` or
        // `updatedAt` (from a prior DB load) don't match any column, causing the
        // entire upsert to be rejected by PostgREST — silently losing all changes.
        const dbProfile: Record<string, any> = { user_id: userId };
        if ("name" in updates) dbProfile.name = updates.name;
        if ("fy" in updates) dbProfile.fy = updates.fy;
        if ("regime" in updates) dbProfile.regime = updates.regime;
        if ("savingsTarget" in updates) dbProfile.savings_target = updates.savingsTarget;
        const { error } = await supabase.from("profiles").upsert(dbProfile);
        if (error) {
          console.error("updateProfile DB error:", error.message, dbProfile);
          return { success: false, error: error.message };
        }
      }
      logActivity("UPDATE_PROFILE", "Updated user profile", updates);
      return { success: true };
    },
    [logActivity, session]
  );

  const updateDismissedAlerts = useCallback(
    async (newDismissed: Record<string, number>) => {
      let mergedMaster: any = null;
      setState((s) => {
        mergedMaster = { ...(s.masterData || DEFAULT_MASTER_DATA), _dismissedAlerts: newDismissed };
        return {
          ...s,
          dismissedAlerts: newDismissed,
          masterData: mergedMaster,
        };
      });

      const userId = session?.user?.id;
      if (userId && userId !== "offline-user" && mergedMaster) {
        const { error: settErr } = await supabase.from("user_settings").upsert({
          user_id: userId,
          master_data: mergedMaster,
        });
        if (settErr) console.error("updateDismissedAlerts DB error:", settErr.message);
      }
    },
    [session]
  );

  const [activeProfile, setActiveProfile] = useState<string>("all");
  const { toasts, showToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
  } | null>(null);
  const [lastBackupTs, setLastBackupTs] = useState<string | null>(() => {
    try {
      return localStorage.getItem("pf_last_backup_ts");
    } catch {
      return null;
    }
  });

  // 2. Aggressive Cleanup of Legacy Dummy Data
  useEffect(() => {
    if (isAuthChecking) return;
    const saved = loadState();
    const isDummy = (s: any) => {
      if (!s) return false;
      // Markers of the old MOCK_DATA
      return (
        (Array.isArray(s.bankAccounts) &&
          s.bankAccounts.some((b) => b.id === "1" || b.id === "2")) ||
        (s.profile?.name === "Anand" && (!session || session.user.id === "offline-user"))
      );
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
      supabase.auth
        .getSession()
        .then(({ data: { session: supaSession }, error }) => {
          if (!error && supaSession) {
            // Real Supabase session — clear any stale demo session and use real one
            sessionStorage.removeItem("demo_session");
            setSession(supaSession);
          } else if (!sessionStorage.getItem("demo_session")) {
            // No demo session saved — truly logged out
            setSession(null);
          }
          // else: demo session already restored via useState initializer — keep it
          setIsAuthChecking(false);
        })
        .catch(() => {
          setIsAuthChecking(false);
        });
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, supaSession) => {
        if (supaSession) {
          sessionStorage.removeItem("demo_session");
          setSession(supaSession);
        } else if (!sessionStorage.getItem("demo_session")) {
          setSession(null);
        }
      });
      return () => subscription.unsubscribe();
    } catch (e) {
      console.warn("Supabase initialization failed", e);
      setIsAuthChecking(false);
    }
  }, []);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const shortcutsMouseDownOnBackdrop = useRef(false);
  // Body scroll lock while the keyboard-shortcuts help is open — this panel is
  // hand-rolled (not the shared Modal component, since it's a static reference
  // list with no form state) so it needs the same lock the shared Modal gets for free.
  useEffect(() => {
    if (!showShortcuts) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showShortcuts]);
  const [showAlerts, setShowAlerts] = useState(false);
  const alertsMenuRef = useRef<HTMLDivElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("pf_collapsed_nav_groups") || "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pf_collapsed_nav_groups", JSON.stringify(collapsedGroups));
    } catch {}
  }, [collapsedGroups]);
  const [missingTables, setMissingTables] = useState<string[]>([]);

  // Theme CSS vars + background style applied via extracted hook
  useTheme(settings);

  // Always save to localStorage on every state change (works offline + demo mode)
  useEffect(() => {
    if (!loaded) return;
    saveStateLocal(state);
  }, [state, loaded]);

  const snakeToCamel = snakeToCamelUtil;

  const fetchAllData = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || userId === "offline-user") return;

    try {
      const [
        prof,
        sett,
        banks,
        txns,
        mfs,
        stks,
        demats,
        fds,
        rds,
        bnds,
        pn,
        ccs,
        pcs,
        lns,
        gls,
        bdgts,
        subs,
        rems,
        licP,
        termP,
        investP,
        infLns,
        rentP,
        sipsQ,
        stSells,
        mfSells,
        nwh,
        corpAct,
        taxP,
        incomeQ,
        recExp,
        wlists,
        wlItems,
        reProps,
        reDemands,
        rePayments,
        vehiclesQ,
        dividendsQ,
        documentsQ,
        goldQ,
        lifeEventsQ,
        healthInsuranceQ,
        creditScoresQ,
        billPaymentsQ,
        billPaymentHistoryQ,
        govtSchemesQ,
        salarySlipsQ,
        form26asQ,
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
        supabase.from("watchlists").select("*").eq("user_id", userId),
        supabase.from("watchlist_items").select("*").eq("user_id", userId),
        supabase.from("real_estate_properties").select("*").eq("user_id", userId),
        supabase.from("real_estate_demands").select("*").eq("user_id", userId),
        supabase.from("real_estate_payments").select("*").eq("user_id", userId),
        supabase.from("vehicles").select("*").eq("user_id", userId),
        supabase.from("dividends").select("*").eq("user_id", userId),
        supabase.from("documents").select("*").eq("user_id", userId),
        supabase.from("gold_holdings").select("*").eq("user_id", userId),
        supabase.from("life_events").select("*").eq("user_id", userId),
        supabase.from("health_insurance").select("*").eq("user_id", userId),
        supabase.from("credit_scores").select("*").eq("user_id", userId),
        supabase.from("bill_payments").select("*").eq("user_id", userId),
        supabase.from("bill_payment_history").select("*").eq("user_id", userId),
        supabase.from("govt_schemes").select("*").eq("user_id", userId),
        supabase.from("salary_slips").select("*").eq("user_id", userId),
        supabase.from("form_26as").select("*").eq("user_id", userId),
      ]);

      // Detect missing DB tables (code 42P01 = relation does not exist) and surface them in the UI
      const missing: string[] = [];
      if (corpAct.error?.code === "42P01") missing.push("corporate_actions");
      if (wlists.error?.code === "42P01") missing.push("watchlists");
      if (wlItems.error?.code === "42P01") missing.push("watchlist_items");
      setMissingTables(missing); // always set (clears when table is found)

      const hasAnyData = [
        banks,
        txns,
        mfs,
        stks,
        demats,
        fds,
        rds,
        bnds,
        pn,
        ccs,
        pcs,
        lns,
        gls,
        bdgts,
        subs,
        rems,
        licP,
        termP,
        investP,
        infLns,
        rentP,
        sipsQ,
        stSells,
        mfSells,
        corpAct,
        taxP,
        incomeQ,
        wlists,
        wlItems,
        reProps,
        reDemands,
        rePayments,
        vehiclesQ,
        dividendsQ,
        documentsQ,
        goldQ,
        lifeEventsQ,
        recExp,
        nwh,
        healthInsuranceQ,
        creditScoresQ,
        billPaymentsQ,
        billPaymentHistoryQ,
        govtSchemesQ,
        salarySlipsQ,
        form26asQ,
      ].some((r) => r?.data && r.data.length > 0);

      // Backfill categories added after initial release ("Credit Card", "Real Estate") into a
      // saved transactionCategories list that predates them (see the masterData merge below)
      // and persist the fix once so future loads don't need to repeat it.
      if (sett.data?.master_data) {
        const savedCats = sett.data.master_data.transactionCategories || [];
        const missingCats = ["Credit Card", "Real Estate"].filter((c) => !savedCats.includes(c));
        if (missingCats.length > 0) {
          const fixedMaster = {
            ...sett.data.master_data,
            transactionCategories: [...savedCats, ...missingCats],
          };
          supabase
            .from("user_settings")
            .upsert({ user_id: userId, master_data: fixedMaster })
            .then(({ error: e }) => {
              if (e) console.error("[masterData categories backfill]", e.message);
            });
        }
      }

      // Use functional setState so failed queries fall back to current state instead of wiping data
      setState((currentState) => {
        if (!prof.data && !hasAnyData) {
          // Logged in but truly no cloud data — clear local state
          return DEFAULT_STATE;
        }
        return {
          ...currentState,
          ...(prof.data ? { profile: snakeToCamel(prof.data) } : {}),
          ...(sett.data
            ? {
                settings: snakeToCamel({
                  ...sett.data,
                  master_data: undefined,
                  dismissed_alerts: undefined,
                }),
              }
            : {}),
          // Always merge ALL loaded transaction IDs into reconciledTxnIds so pre-fix transactions
          // never trigger the Sync button (which caused balance doubling on repeated clicks).
          masterData: (() => {
            const base =
              (sett.data?.master_data
                ? { ...DEFAULT_MASTER_DATA, ...sett.data.master_data }
                : null) ||
              currentState.masterData ||
              DEFAULT_MASTER_DATA;
            // A saved transactionCategories list shallow-overrides DEFAULT_MASTER_DATA above,
            // so accounts saved before "Credit Card"/"Real Estate" were added as defaults never
            // see them. Backfill in-place here (not a separate one-time effect — that races this
            // same fetch, which lands after and stomps the fix straight back out).
            const baseCats = base.transactionCategories || [];
            const missingCats = ["Credit Card", "Real Estate"].filter(
              (c) => !baseCats.includes(c)
            );
            const patchedCats = missingCats.length > 0 ? [...baseCats, ...missingCats] : baseCats;
            const allTxnIds =
              !txns.error && txns.data != null ? txns.data.map((t: any) => t.id) : [];
            return {
              ...base,
              transactionCategories: patchedCats,
              reconciledTxnIds: Array.from(
                new Set([...(base.reconciledTxnIds || []), ...allTxnIds])
              ),
            };
          })(),
          ...(sett.data?.master_data?._dismissedAlerts
            ? { dismissedAlerts: sett.data.master_data._dismissedAlerts }
            : {}),
          // Only overwrite each array if the query succeeded (no error + data is not null)
          ...(!banks.error && banks.data != null
            ? {
                bankAccounts: snakeToCamel(banks.data).map((b: any) => ({
                  ...b,
                  type: b.accountType || b.type || "Savings",
                })),
              }
            : {}),
          ...(!txns.error && txns.data != null ? { transactions: snakeToCamel(txns.data) } : {}),
          ...(!mfs.error && mfs.data != null
            ? {
                // Normalize: DB uses `scheme`/`type` but UI form saves with `name`/`category`.
                // Always expose `name` and `category` so all display and search code works uniformly.
                mutualFunds: snakeToCamel(mfs.data).map((m: any) => ({
                  ...m,
                  name: m.name || m.scheme || "",
                  category: m.category || m.type || "",
                })),
              }
            : {}),
          ...(!stks.error && stks.data != null ? { stocks: snakeToCamel(stks.data) } : {}),
          ...(!demats.error && demats.data != null ? { demat: snakeToCamel(demats.data) } : {}),
          ...(!fds.error && fds.data != null ? { fixedDeposits: snakeToCamel(fds.data) } : {}),
          ...(!rds.error && rds.data != null ? { recurringDeposits: snakeToCamel(rds.data) } : {}),
          ...(!bnds.error && bnds.data != null ? { bonds: snakeToCamel(bnds.data) } : {}),
          ...(!pn.error && pn.data != null
            ? {
                ppf: snakeToCamel(pn.data.filter((x) => x.type === "PPF")),
                nps: snakeToCamel(pn.data.filter((x) => x.type === "NPS")).map((n: any) => {
                  const meta =
                    n.establishments &&
                    typeof n.establishments === "object" &&
                    !Array.isArray(n.establishments)
                      ? n.establishments
                      : {};
                  return {
                    ...n,
                    pran: n.accountNumber || n.pran || "",
                    tier: n.epfType || (n.bank === "I" || n.bank === "II" ? n.bank : null) || "I",
                    fundManager: n.bank !== "I" && n.bank !== "II" ? n.bank || "" : "",
                    schemeType: meta.schemeType || "All Citizen",
                    investmentChoice: meta.investmentChoice || "Auto",
                    lifecycleFund: meta.lifecycleFund || "LC-50",
                    equityPct: meta.equityPct || 0,
                    corpBondPct: meta.corpBondPct || 0,
                    govtSecPct: meta.govtSecPct || 0,
                    altAssetPct: meta.altAssetPct || 0,
                    yearContribution: n.thisYearContribution || 0,
                    employerContribution: n.employerContribution || 0,
                  };
                }),
                epf: snakeToCamel(pn.data.filter((x) => x.type === "EPF")),
              }
            : {}),
          ...(!ccs.error && ccs.data != null
            ? {
                creditCards: snakeToCamel(ccs.data).map((c: any) => ({
                  ...c,
                  limit: c.cardLimit ?? c.limit,
                })),
              }
            : {}),
          ...(!pcs.error && pcs.data != null ? { prepaidCards: snakeToCamel(pcs.data) } : {}),
          ...(!lns.error && lns.data != null
            ? {
                loansTaken: snakeToCamel(lns.data.filter((x) => !x.is_lent)).map((l: any) => ({
                  ...l,
                  lender: l.lenderBorrower || l.lender || "",
                })),
                loansGiven: snakeToCamel(lns.data.filter((x) => x.is_lent)).map((l: any) => ({
                  ...l,
                  borrower: l.lenderBorrower || l.borrower || "",
                  lender: l.lenderBorrower || l.lender || "",
                  date: l.givenDate || l.date || "",
                })),
              }
            : {}),
          ...(!gls.error && gls.data != null ? { goals: snakeToCamel(gls.data) } : {}),
          ...(!bdgts.error && bdgts.data != null
            ? {
                budgets: snakeToCamel(bdgts.data).map((b: any) => ({
                  ...b,
                  monthly: b.monthlyLimit,
                })),
              }
            : {}),
          ...(!subs.error && subs.data != null ? { subscriptions: snakeToCamel(subs.data) } : {}),
          ...(!rems.error && rems.data != null
            ? {
                reminders: snakeToCamel(rems.data).map((r: any) => ({
                  ...r,
                  date: r.reminderDate,
                })),
              }
            : {}),
          ...(!licP.error && licP.data != null ? { lic: snakeToCamel(licP.data) } : {}),
          ...(!termP.error && termP.data != null ? { termPlans: snakeToCamel(termP.data) } : {}),
          ...(!investP.error && investP.data != null
            ? { investmentPlans: snakeToCamel(investP.data) }
            : {}),
          ...(!infLns.error && infLns.data != null
            ? {
                informalBorrowed: snakeToCamel(
                  infLns.data.filter((x) => x.direction === "borrowed")
                ),
                informalLent: snakeToCamel(infLns.data.filter((x) => x.direction === "lent")),
              }
            : {}),
          ...(!rentP.error && rentP.data != null
            ? {
                rentalProperties: snakeToCamel(
                  rentP.data.filter((x) => x.property_type === "out")
                ).map((x: any) => ({ ...x, propertyType: x.propertyTypeDetail || "shop" })),
                rentedProperties: snakeToCamel(
                  rentP.data.filter((x) => x.property_type === "in")
                ).map((x: any) => ({ ...x, propertyType: x.propertyTypeDetail || "shop" })),
              }
            : {}),
          ...(!sipsQ.error && sipsQ.data != null ? { sips: snakeToCamel(sipsQ.data) } : {}),
          ...(!stSells.error && stSells.data != null
            ? { stockSells: snakeToCamel(stSells.data) }
            : {}),
          ...(!mfSells.error && mfSells.data != null
            ? { mfSells: snakeToCamel(mfSells.data) }
            : {}),
          ...(!nwh.error && nwh.data != null
            ? {
                netWorthHistory: snakeToCamel(nwh.data).map((r: any) => ({
                  month: r.month,
                  netWorth: r.netWorth,
                  cash: r.cash ?? 0,
                  equity: r.equity ?? 0,
                  debt: r.debt ?? 0,
                  realEstate: r.realEstate ?? 0,
                  vehicles: r.vehicles ?? 0,
                  liabilities: r.liabilities ?? 0,
                })),
              }
            : {}),
          ...(!corpAct.error && corpAct.data != null
            ? {
                corporateActions: snakeToCamel(corpAct.data).filter((ca: any) => {
                  const st =
                    !stks.error && stks.data != null
                      ? snakeToCamel(stks.data)
                      : currentState.stocks;
                  const sts =
                    !stSells.error && stSells.data != null
                      ? snakeToCamel(stSells.data)
                      : currentState.stockSells;
                  return (
                    st.some((s: any) => s.symbol === ca.symbol && s.exchange === ca.exchange) ||
                    sts.some((s: any) => s.symbol === ca.symbol && s.exchange === ca.exchange)
                  );
                }),
              }
            : {}),
          ...(!taxP.error && taxP.data != null ? { taxPayments: snakeToCamel(taxP.data) } : {}),
          ...(!incomeQ.error && incomeQ.data != null ? { income: snakeToCamel(incomeQ.data) } : {}),
          ...(!recExp.error && recExp.data != null
            ? { recurringExpenses: snakeToCamel(recExp.data) }
            : {}),
          ...(!wlists.error && wlists.data != null ? { wishlists: snakeToCamel(wlists.data) } : {}),
          ...(!wlItems.error && wlItems.data != null
            ? { wishlistItems: snakeToCamel(wlItems.data) }
            : {}),
          ...(!reProps.error && reProps.data != null
            ? { realEstateProperties: snakeToCamel(reProps.data) }
            : {}),
          ...(!reDemands.error && reDemands.data != null
            ? { realEstateDemands: snakeToCamel(reDemands.data) }
            : {}),
          ...(!rePayments.error && rePayments.data != null
            ? { realEstatePayments: snakeToCamel(rePayments.data) }
            : {}),
          ...(!vehiclesQ.error && vehiclesQ.data != null
            ? {
                vehicles: snakeToCamel(vehiclesQ.data).map((v: any) => ({
                  ...v,
                  serviceHistory: v.serviceHistory || [],
                })),
              }
            : {}),
          ...(!dividendsQ.error && dividendsQ.data != null
            ? { dividends: snakeToCamel(dividendsQ.data) }
            : {}),
          ...(!documentsQ.error && documentsQ.data != null
            ? { documents: snakeToCamel(documentsQ.data) }
            : {}),
          ...(!goldQ.error && goldQ.data != null ? { goldHoldings: snakeToCamel(goldQ.data) } : {}),
          ...(!lifeEventsQ.error && lifeEventsQ.data != null
            ? { lifeEvents: snakeToCamel(lifeEventsQ.data) }
            : {}),
          ...(!healthInsuranceQ?.error && healthInsuranceQ?.data != null
            ? { healthInsurance: snakeToCamel(healthInsuranceQ.data) }
            : {}),
          ...(!creditScoresQ?.error && creditScoresQ?.data != null
            ? { creditScores: snakeToCamel(creditScoresQ.data) }
            : {}),
          ...(!billPaymentsQ?.error && billPaymentsQ?.data != null
            ? { billPayments: snakeToCamel(billPaymentsQ.data) }
            : {}),
          ...(!billPaymentHistoryQ?.error && billPaymentHistoryQ?.data != null
            ? { billPaymentHistory: snakeToCamel(billPaymentHistoryQ.data) }
            : {}),
          ...(!govtSchemesQ?.error && govtSchemesQ?.data != null
            ? { govtSchemes: snakeToCamel(govtSchemesQ.data) }
            : {}),
          ...(!salarySlipsQ?.error && salarySlipsQ?.data != null
            ? { salarySlips: snakeToCamel(salarySlipsQ.data) }
            : {}),
          ...(!form26asQ?.error && form26asQ?.data != null
            ? { form26as: snakeToCamel(form26asQ.data) }
            : {}),
        };
      });
    } catch (e) {
      console.error("Supabase load failed", e);
    }
  }, [session, snakeToCamel]);

  const fetchLivePrices = useCallback(async () => {
    const stocks = stocksRef.current;
    const wlItems = wishlistItemsRef.current;
    if ((!stocks.length && !wlItems.length) || fetchingRef.current) return;

    // Safety timeout to prevent getting stuck in "Updating..." state
    const timeout = setTimeout(() => {
      setFetchingPrices(false);
      fetchingRef.current = false;
    }, 30000);

    setFetchingPrices(true);
    fetchingRef.current = true;
    try {
      // Build unique symbol set from both held stocks and wishlist items
      const symbolMap: Record<string, string> = {};
      stocks.forEach((s: any) => {
        const exch = s.exchange || "NSE";
        const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
        symbolMap[yfSym] = yfSym;
      });
      wlItems.forEach((it: any) => {
        const exch = it.exchange || "NSE";
        const yfSym = `${it.symbol.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
        symbolMap[yfSym] = yfSym;
      });
      const groups = Object.values(symbolMap);
      // api/stock-price.js caps a single request at 30 symbols — chunk larger
      // portfolios into multiple requests instead of silently losing prices
      // for every symbol past the 30th.
      const CHUNK_SIZE = 30;
      const chunks: string[][] = [];
      for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
        chunks.push(groups.slice(i, i + CHUNK_SIZE));
      }
      const chunkResults = await Promise.all(
        chunks.map(async (chunk) => {
          const res = await fetch(`/api/stock-price?symbols=${chunk.join(",")}`);
          if (!res.ok) throw new Error(`API error ${res.status}`);
          return res.json();
        })
      );
      const data = Object.assign({}, ...chunkResults);
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
          if (!md) return false;
          const oldCap = s.marketCap != null && s.marketCap !== "" ? Number(s.marketCap) : null;
          const newCap = md.marketCap != null ? Number(md.marketCap) : null;
          return s.sector !== md.sector || oldCap !== newCap;
        });

        if (updates.length > 0) {
          const batchData = updates.map((s: any) => {
            const exch = s.exchange || "NSE";
            const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
            const md = data[yfSym];
            return {
              id: s.id,
              user_id: userId,
              owner: s.owner || "self",
              symbol: s.symbol,
              sector: md.sector || null,
              market_cap: md.marketCap ? Number(md.marketCap) : null,
            };
          });

          const { error } = await supabase.from("stocks").upsert(batchData, { onConflict: "id" });
          if (error) console.error("Batch metadata sync failed:", error.message);

          setState((s: any) => ({
            ...s,
            stocks: s.stocks.map((st: any) => {
              const up = updates.find((u: any) => u.id === st.id);
              if (!up) return st;
              const md =
                data[
                  `${up.symbol.replace(/\.(NS|BO)$/i, "")}.${(up.exchange || "NSE") === "BSE" ? "BO" : "NS"}`
                ];
              return {
                ...st,
                sector: md.sector || null,
                marketCap: md.marketCap ? String(md.marketCap) : null,
              };
            }),
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
    if (loaded && (state.stocks.length > 0 || state.wishlistItems.length > 0)) {
      fetchLivePrices();
    }
  }, [loaded, state.stocks.length, state.wishlistItems.length, fetchLivePrices]);

  // Mirrors fetchLivePrices for mutual funds: one /api/mf-nav call per distinct scheme code,
  // deduped, cached in mfMarketData keyed by mfCode so Current Value can use a live NAV
  // the same way Demat uses live stock prices, instead of relying on the manually-refreshed
  // currentNav field.
  const fetchMfNavs = useCallback(async () => {
    const funds = mutualFundsRef.current;
    const codes = Array.from(
      new Set(funds.map((m: any) => (m?.mfCode || "").trim()).filter(Boolean))
    );
    if (!codes.length || fetchingMfNavsRef.current) return;

    setFetchingMfNavs(true);
    fetchingMfNavsRef.current = true;
    try {
      const results = await Promise.all(
        codes.map(async (code) => {
          try {
            const res = await fetch(`/api/mf-nav?code=${encodeURIComponent(code)}&range=1m`);
            if (!res.ok) return null;
            const data = await res.json();
            if (!data?.nav) return null;
            return [
              code,
              {
                nav: data.nav,
                prevNav: data.prevNav,
                navChange: data.navChange,
                navChangePct: data.navChangePct,
                high52: data.high52,
                low52: data.low52,
                navDate: data.date,
              },
            ] as const;
          } catch {
            return null;
          }
        })
      );
      const ts = Date.now();
      setMfMarketDataTs(ts);
      setMfMarketData((prev: any) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r) next[r[0]] = r[1];
        });
        localStorage.setItem("finance_mf_market_data", JSON.stringify({ ...next, _ts: ts }));
        return next;
      });
    } catch (e) {
      console.error("Failed to fetch live MF NAVs", e);
    } finally {
      setFetchingMfNavs(false);
      fetchingMfNavsRef.current = false;
    }
  }, []);

  // Initial MF NAV fetch
  useEffect(() => {
    if (loaded && state.mutualFunds && state.mutualFunds.length > 0) {
      fetchMfNavs();
    }
  }, [loaded, state.mutualFunds?.length, fetchMfNavs]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Only do the full cloud refetch on an actual sign-in (new user id), not on every
    // background token refresh for the same already-loaded user — see lastFetchedUserIdRef.
    if (lastFetchedUserIdRef.current === userId) {
      setLoaded(true);
      return;
    }

    (async () => {
      setIsFetchingInitialData(true);
      try {
        await fetchAllData();
        lastFetchedUserIdRef.current = userId;
      } catch (e) {
        console.error("Supabase load failed", e);
        showToast("Cloud fetch failed. Check your DB setup.", "error");
      } finally {
        setLoaded(true);
        setIsFetchingInitialData(false);
      }
    })();
  }, [fetchAllData, session, showToast]);

  // Warn before closing/refreshing the tab while a save is still in flight — the optimistic
  // UI update already shows the item, but closing now aborts the network request before it
  // reaches Supabase, permanently losing it. See pendingWritesRef.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingWritesRef.current > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Global mouse tracker for Spotlight effect — throttled with rAF to avoid per-frame thrashing
  useEffect(() => {
    let rafId: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const cards = document.querySelectorAll(".spotlight-wrapper") as NodeListOf<HTMLElement>;
        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        });
      });
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Keyboard shortcuts: Cmd+K for palette, number keys for quick nav, more
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCmdPalette((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        setShowCmdPalette(false);
        setShowAlerts(false);
        setShowSearch(false);
        setShowShortcuts(false);
        return;
      }

      // Skip single-letter/number shortcuts while any modal dialog is open, so
      // typing inside a modal (e.g. a text field without focus yet, or clicking
      // a button) can't accidentally trigger app-wide tab navigation underneath.
      const isModalOpen = document.querySelector('[role="dialog"]') !== null;

      if (isInput || isModalOpen) return;

      // Quick navigation shortcuts (no modifier keys)
      const shortcuts: Record<string, string> = {
        "1": "analytics",
        "2": "banks",
        "3": "demat",
        "4": "investments",
        "5": "cc",
        "6": "budget",
        "7": "tax",
        "8": "goals",
        "9": "cashflow",
        "0": "calendar",
      };

      // Letter shortcuts
      if (e.key === "d") {
        setTab("analytics");
        return;
      }
      if (e.key === "b") {
        setTab("banks");
        return;
      }
      if (e.key === "s") {
        setTab("demat");
        return;
      }
      if (e.key === "i") {
        setTab("investments");
        return;
      }
      if (e.key === "t") {
        setTab("tax");
        return;
      }
      if (e.key === "g") {
        setTab("goals");
        return;
      }
      if (e.key === "r") {
        setTab("annualreport");
        return;
      }
      if (e.key === "c") {
        setTab("cashflow");
        return;
      }
      if (e.key === "e") {
        setTab("expensetrends");
        return;
      }
      if (e.key === "f") {
        setTab("familyview");
        return;
      }
      if (e.key === "n") {
        setTab("nominees");
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      if (e.key === "a") {
        setShowAlerts((p) => !p);
        return;
      }
      if (e.key === "p") {
        setPrivacyMode((p) => !p);
        return;
      }
      if (e.key === "?") {
        setShowShortcuts((p) => !p);
        return;
      }

      if (shortcuts[e.key]) {
        setTab(shortcuts[e.key]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Browser push notifications + permission request handled via extracted hook
  useNotifications(loaded, session, state);

  // Close profile menu when clicking outside
  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfileMenu]);

  // Close alerts dropdown on outside click or Escape — it's a hand-rolled
  // floating panel (not the shared Modal/Drawer), so it needs its own
  // dismissal wiring; previously only the in-panel X button could close it.
  useEffect(() => {
    if (!showAlerts) return;
    const handleClick = (e: MouseEvent) => {
      if (alertsMenuRef.current && !alertsMenuRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAlerts(false);
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [showAlerts]);

  // One-time backfill: historical netWorthHistory snapshots were saved without
  // investmentPlans (investment schemes). This adds the missing value to every
  // past month using transaction dates where available, persists to Supabase,
  // then sets a flag in masterData so this never double-applies on any device.
  useEffect(() => {
    if (!loaded) return;
    if (state.masterData?._nwBackfillV2) return; // already done
    const history = state.netWorthHistory || [];
    if (history.length === 0) return;

    const nowBf = new Date();
    const currentYm = `${nowBf.getFullYear()}-${String(nowBf.getMonth() + 1).padStart(2, "0")}`;

    setState((s) => {
      const corrected = (s.netWorthHistory || []).map((h: any) => {
        // Current month was already corrected by the auto-snapshot above — skip it
        if (h.month === currentYm) return h;

        // For this historical month, sum investment plan transactions dated on or
        // before the last day of that month. Fall back to premiumPaid if no dated
        // transactions exist (slightly overstates very old months, but better than 0).
        const investAtMonth = (s.investmentPlans || []).reduce((a: number, ip: any) => {
          const datedTxns = (ip.transactions || []).filter(
            (t: any) => t.date && t.date.slice(0, 7) <= h.month
          );
          if (datedTxns.length > 0) {
            return a + datedTxns.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
          }
          return a + Number(ip.premiumPaid || 0);
        }, 0);

        if (investAtMonth === 0) return h;
        return { ...h, netWorth: h.netWorth + investAtMonth };
      });

      const uid3 = session?.user?.id;
      if (uid3 && uid3 !== "offline-user") {
        // Persist every corrected snapshot to Supabase
        corrected.forEach((h: any) => {
          if (h.month === currentYm) return; // already persisted by auto-snapshot
          supabase
            .from("net_worth_history")
            .upsert(
              { user_id: uid3, month: h.month, net_worth: h.netWorth },
              { onConflict: "user_id,month" }
            )
            .then(() => {});
        });
        // Set the "done" flag so this never runs again on any device
        const newMaster = { ...(s.masterData || {}), _nwBackfillV2: true };
        supabase
          .from("user_settings")
          .upsert({ user_id: uid3, master_data: newMaster })
          .then(() => {});
        return { ...s, netWorthHistory: corrected, masterData: newMaster };
      }

      return {
        ...s,
        netWorthHistory: corrected,
        masterData: { ...(s.masterData || {}), _nwBackfillV2: true },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]); // intentionally runs once after initial load

  // One-time cleanup: remove netWorthHistory entries that are clearly corrupted —
  // defined as any past-month entry whose stored value is less than 10% of the current
  // net worth. These were snapshots captured before real estate was wired into the
  // auto-snapshot, leaving them drastically understated (assets minus loans = negative
  // or near-zero when the real net worth is ₹2Cr+). Runs once per account lifetime.
  useEffect(() => {
    if (!loaded) return;
    if (state.masterData?._nwCleanV1) return;
    const nowClean = new Date();
    const currentYm = `${nowClean.getFullYear()}-${String(nowClean.getMonth() + 1).padStart(2, "0")}`;
    const currentNw = metricsNwRef.current;
    const threshold = currentNw * 0.1; // 10% of current net worth
    const uid4 = session?.user?.id;

    setState((s) => {
      const cleaned = (s.netWorthHistory || []).filter(
        (h: any) => h.month === currentYm || h.netWorth >= threshold
      );
      const didClean = cleaned.length !== (s.netWorthHistory || []).length;

      if (uid4 && uid4 !== "offline-user") {
        if (didClean) {
          const keptMonths = new Set(cleaned.map((h: any) => h.month));
          const removedMonths = (s.netWorthHistory || [])
            .filter((h: any) => !keptMonths.has(h.month))
            .map((h: any) => h.month);
          if (removedMonths.length > 0) {
            supabase
              .from("net_worth_history")
              .delete()
              .eq("user_id", uid4)
              .in("month", removedMonths)
              .then(() => {});
          }
        }
        const newMaster = { ...(s.masterData || {}), _nwCleanV1: true };
        supabase
          .from("user_settings")
          .upsert({ user_id: uid4, master_data: newMaster })
          .then(() => {});
        return { ...s, netWorthHistory: cleaned, masterData: newMaster };
      }
      return {
        ...s,
        netWorthHistory: cleaned,
        masterData: { ...(s.masterData || {}), _nwCleanV1: true },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // One-time fix: corporate actions applied with per-lot Math.floor lost fractional
  // shares (e.g. bonus 1:2 on lots of 25+475 → 37+712=749 instead of 750). Re-applies
  // the correct largest-remainder distribution and persists to Supabase.
  useEffect(() => {
    if (!loaded) return;
    if (state.masterData?._caRoundingFixV1) return;
    const actions = state.corporateActions || [];
    if (actions.length === 0) {
      setState((s) => ({ ...s, masterData: { ...(s.masterData || {}), _caRoundingFixV1: true } }));
      return;
    }

    setState((s) => {
      const stockUpdates: { id: string; qty: string; avgPrice: string }[] = [];
      let stocks = [...(s.stocks || [])];

      for (const ca of actions) {
        const rN = Number(ca.ratioN) || 0;
        const rM = Number(ca.ratioM) || 0;
        if (rN <= 0 || rM <= 0) continue;
        const expectedTotal = Number(ca.newQty) || 0;
        if (expectedTotal <= 0) continue;

        const lots = stocks.filter(
          (st: any) => st.symbol === ca.symbol && st.exchange === ca.exchange
        );
        if (lots.length === 0) continue;

        const currentTotal = lots.reduce((sum: number, l: any) => sum + Number(l.qty), 0);
        const shortfall = expectedTotal - currentTotal;
        if (shortfall <= 0 || shortfall > lots.length) continue;

        // Reverse-engineer original per-lot quantities
        const multiplier = ca.actionType === "split" ? rN / rM : (rM + rN) / rM;
        const lotCalcs = lots.map((lot: any) => {
          const curQty = Number(lot.qty);
          const origQty = Math.round(curQty / multiplier);
          const exact = origQty * multiplier;
          const floored = Math.floor(exact);
          return { lot, curQty, origQty, floored, remainder: exact - floored };
        });

        // Verify reverse-engineering: original totals should match ca.oldQty
        const origTotal = lotCalcs.reduce((sum, c) => sum + c.origQty, 0);
        if (origTotal !== Number(ca.oldQty)) continue;

        // Distribute shortfall using largest remainder method
        const sorted = [...lotCalcs].sort((a, b) => b.remainder - a.remainder);
        let remaining = shortfall;
        for (const c of sorted) {
          if (remaining <= 0) break;
          c.floored += 1;
          remaining -= 1;
        }

        for (const c of lotCalcs) {
          if (c.floored === c.curQty) continue;
          const invested = c.curQty * Number(c.lot.avgPrice);
          const newAvg = c.floored > 0 ? invested / c.floored : Number(c.lot.avgPrice);
          const updated = {
            id: c.lot.id,
            qty: String(c.floored),
            avgPrice: String(Number(newAvg.toFixed(4))),
          };
          stockUpdates.push(updated);
          stocks = stocks.map((st: any) => (st.id === c.lot.id ? { ...st, ...updated } : st));
        }
      }

      const uid5 = session?.user?.id;
      if (uid5 && uid5 !== "offline-user") {
        for (const u of stockUpdates) {
          supabase
            .from("stocks")
            .update({ qty: u.qty, avg_price: u.avgPrice })
            .eq("id", u.id)
            .then(() => {});
        }
        const newMaster = { ...(s.masterData || {}), _caRoundingFixV1: true };
        supabase
          .from("user_settings")
          .upsert({ user_id: uid5, master_data: newMaster })
          .then(() => {});
        return { ...s, stocks, masterData: newMaster };
      }
      return { ...s, stocks, masterData: { ...(s.masterData || {}), _caRoundingFixV1: true } };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Auto-advance overdue subscription renewal dates based on their billing cycle.
  // Compares/advances on plain "YYYY-MM-DD" strings throughout (ISO date strings sort
  // lexicographically, so string `<` is a safe stand-in for calendar-date comparison) —
  // avoids ever mixing UTC-parsed and local-parsed `Date` instants, which previously
  // could misjudge a renewal landing exactly "today" as still overdue in IST.
  useEffect(() => {
    if (!loaded) return;
    const todayStr = today();
    const toAdvance = state.subscriptions.filter((s: any) => {
      if (!s.renewalDate || s.paused) return false;
      return s.renewalDate < todayStr;
    });
    if (toAdvance.length === 0) return;
    (async () => {
      await Promise.all(
        toAdvance.map(async (s: any) => {
          // Advance in whole cycle steps via addMonthsToDateStr, which clamps the
          // day-of-month to the target month's length (e.g. Jan 31 monthly -> Feb 28,
          // not Mar 3) — plain Date.setMonth/constructor math overflows short months.
          let dateStr = s.renewalDate;
          const step = s.cycle === "yearly" ? 12 : s.cycle === "quarterly" ? 3 : 1;
          let guard = 0;
          while (dateStr < todayStr && guard < 1200) {
            dateStr = addMonthsToDateStr(dateStr, step);
            guard++;
          }
          await updateItem("subscriptions", s.id, { renewalDate: dateStr });
        })
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // ================== COMPUTED FINANCIAL METRICS (extracted to useMetrics) ==================
  const { filteredState, metrics, assetBreakdown, trendData, greeting } = useMetrics(
    state,
    activeProfile,
    marketData
  );

  // Ref so the auto-snapshot effect always reads the same net worth the dashboard shows.
  const metricsNwRef = useRef(0);
  metricsNwRef.current = metrics.netWorth;

  // Auto-snapshot: keep the current month's net worth entry live for as long as the session is
  // open, not just once on page load. Previously this only ran once per full page load, so if you
  // added/edited an asset mid-session, the Net Worth Growth chart's current-month point stayed
  // stale until you refreshed the browser tab. Debounced so rapid edits don't spam Supabase.
  const lastSnapshotNwRef = useRef<number | null>(null);
  useEffect(() => {
    if (!loaded) return;
    const nw = metrics.netWorth;
    if (!nw) return; // Safety: don't snapshot before metrics have computed
    if (lastSnapshotNwRef.current === nw) return; // no real change since last snapshot

    const timer = setTimeout(() => {
      lastSnapshotNwRef.current = nw;
      const nowSnap = new Date();
      const ym = `${nowSnap.getFullYear()}-${String(nowSnap.getMonth() + 1).padStart(2, "0")}`;
      setState((s) => {
        const history = (s.netWorthHistory || []).filter((h) => h.month !== ym);
        const cashVal = (s.bankAccounts || []).reduce(
          (sum: number, b: any) => sum + (Number(b.balance) || 0),
          0
        );
        const stockVal = (s.stocks || []).reduce(
          (sum: number, st: any) =>
            sum + (Number(st.qty) || 0) * (Number(st.currentPrice) || Number(st.avgPrice) || 0),
          0
        );
        const mfVal = (s.mutualFunds || []).reduce(
          (sum: number, m: any) =>
            sum + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0),
          0
        );
        const fdVal = (s.fixedDeposits || []).reduce(
          (sum: number, f: any) => sum + (Number(f.principal) || 0),
          0
        );
        // Field names/ownership-share must match useMetrics.ts's realEstateAsset (marketValue/
        // agreementValue, scaled by tracked ownership share) — this used to read nonexistent
        // currentValuation/valuation fields (always 0) and ignored co-ownership %, so the
        // "realEstate" slice saved into netWorthHistory silently diverged from the real figure.
        const realEstateVal = (s.realEstateProperties || [])
          .filter((p: any) => p.status !== "sold")
          .reduce((sum: number, p: any) => {
            const value = Number(p.marketValue || p.agreementValue || 0);
            const owners = Array.isArray(p.owners) ? p.owners : null;
            const share = owners && owners.length > 0
              ? owners.reduce(
                  (acc: number, o: any) => (o?.id !== "external" ? acc + Number(o.sharePct || 0) : acc),
                  0
                ) / 100
              : 1;
            return sum + value * share;
          }, 0);
        const vehiclesVal = (s.vehicles || []).reduce(
          (sum: number, v: any) => sum + Number(v.currentValue || v.value || 0),
          0
        );
        const breakdown = {
          cash: cashVal,
          equity: stockVal + mfVal,
          debt: fdVal,
          realEstate: realEstateVal,
          vehicles: vehiclesVal,
          liabilities: 0,
        };
        const newHistory = [...history, { month: ym, netWorth: nw, ...breakdown }].slice(-36);
        const uid2 = session?.user?.id;
        if (uid2 && uid2 !== "offline-user") {
          supabase
            .from("net_worth_history")
            .upsert(
              { user_id: uid2, month: ym, net_worth: nw, ...breakdown },
              { onConflict: "user_id,month" }
            )
            .then(() => {});
        }
        return { ...s, netWorthHistory: newHistory };
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [loaded, metrics.netWorth, session]);

  // ================== ALERTS (extracted to useAlerts) ==================
  const alerts = useAlerts(state, metrics, marketData);

  // ================== SEARCH (extracted to useSearch) ==================
  const searchResults = useSearch(state, search);

  // ================== CRUD ==================

  const fmtCurrency = (v: any) => {
    const n = Number(v);
    if (!n && n !== 0) return "";
    return `₹${n.toLocaleString("en-IN")}`;
  };

  const describeItem = (key: string, item: any): string => {
    const LABEL_MAP: Record<string, string> = {
      bankAccounts: "Bank Account",
      transactions: "Transaction",
      mutualFunds: "Mutual Fund",
      stocks: "Stock",
      demat: "Demat Account",
      fixedDeposits: "Fixed Deposit",
      recurringDeposits: "Recurring Deposit",
      bonds: "Bond",
      ppf: "PPF",
      nps: "NPS",
      epf: "EPF",
      creditCards: "Credit Card",
      prepaidCards: "Prepaid Card",
      loansTaken: "Loan Taken",
      loansGiven: "Loan Given",
      goals: "Goal",
      budgets: "Budget",
      subscriptions: "Subscription",
      reminders: "Reminder",
      recurringExpenses: "Recurring Expense",
      lic: "LIC Policy",
      termPlans: "Term Plan",
      investmentPlans: "Investment Plan",
      informalBorrowed: "Informal Loan (Borrowed)",
      informalLent: "Informal Loan (Lent)",
      rentalProperties: "Rental Property (Given)",
      rentedProperties: "Rental Property (Taken)",
      sips: "SIP",
      stockSells: "Stock Sale",
      mfSells: "MF Sale",
      corporateActions: "Corporate Action",
      taxPayments: "Tax Payment",
      income: "Income Entry",
      wishlists: "Watchlist",
      wishlistItems: "Watchlist Item",
      realEstateProperties: "Real Estate",
      realEstateDemands: "Real Estate Demand",
      realEstatePayments: "Real Estate Payment",
      vehicles: "Vehicle",
      dividends: "Dividend",
      documents: "Document",
      goldHoldings: "Gold Holding",
      lifeEvents: "Life Event",
      healthInsurance: "Health Insurance",
      creditScores: "Credit Score",
      billPayments: "Bill",
      billPaymentHistory: "Bill Payment",
      govtSchemes: "Govt Scheme",
      salarySlips: "Salary Slip",
      form26as: "Form 26AS Entry",
    };
    const label = LABEL_MAP[key] || key;
    if (!item) return label;

    const parts: string[] = [];

    const name =
      item.name ||
      item.bank ||
      item.scheme ||
      item.title ||
      item.fundName ||
      item.insurer ||
      item.lender ||
      item.borrower ||
      item.lenderBorrower ||
      item.person ||
      item.source ||
      item.institution ||
      item.employer ||
      item.fundManager ||
      item.broker ||
      item.address ||
      "";

    if (key === "stocks" || key === "stockSells") {
      if (item.symbol) parts.push(item.symbol + (item.exchange ? ` (${item.exchange})` : ""));
      if (item.qty) parts.push(`${item.qty} shares`);
    } else if (key === "transactions") {
      if (item.description) parts.push(item.description);
      if (item.amount) parts.push(fmtCurrency(item.amount));
      if (item.type) parts.push(item.type);
    } else if (key === "bankAccounts") {
      if (item.bank) parts.push(item.bank);
      if (item.type || item.accountType) parts.push(item.type || item.accountType);
    } else if (key === "creditCards") {
      if (item.bank) parts.push(item.bank);
      if (item.cardName || item.name) parts.push(item.cardName || item.name);
    } else if (key === "mutualFunds" || key === "mfSells") {
      if (item.name || item.scheme) parts.push(item.name || item.scheme);
    } else if (key === "vehicles") {
      if (item.brand) parts.push(item.brand);
      if (item.model) parts.push(item.model);
      if (item.registrationNumber) parts.push(item.registrationNumber);
    } else if (key === "dividends") {
      if (item.symbol) parts.push(item.symbol);
      if (item.amount) parts.push(fmtCurrency(item.amount));
    } else if (key === "goldHoldings") {
      if (item.type) parts.push(item.type);
      if (item.weight) parts.push(`${item.weight}g`);
    } else {
      if (name) parts.push(name);
      if (item.amount) parts.push(fmtCurrency(item.amount));
    }

    return parts.length ? `${label}: ${parts.join(" — ")}` : label;
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
    if (key === "ppf") {
      finalItem.bank = item.institution || "";
      delete finalItem.institution;
    }
    if (key === "nps") {
      finalItem.account_number = finalItem.pran || "";
      delete finalItem.pran;
      finalItem.epf_type = finalItem.tier || "I";
      delete finalItem.tier;
      finalItem.bank = finalItem.fund_manager || "";
      delete finalItem.fund_manager;
      finalItem.this_year_contribution = Number(finalItem.year_contribution) || 0;
      delete finalItem.year_contribution;
      finalItem.employer_contribution = Number(finalItem.employer_contribution) || 0;
      finalItem.establishments = {
        schemeType: item.schemeType || "All Citizen",
        investmentChoice: item.investmentChoice || "Auto",
        lifecycleFund: item.lifecycleFund || "LC-50",
        equityPct: Number(item.equityPct) || 0,
        corpBondPct: Number(item.corpBondPct) || 0,
        govtSecPct: Number(item.govtSecPct) || 0,
        altAssetPct: Number(item.altAssetPct) || 0,
      };
      delete finalItem.scheme_type;
      delete finalItem.investment_choice;
      delete finalItem.lifecycle_fund;
      delete finalItem.equity_pct;
      delete finalItem.corp_bond_pct;
      delete finalItem.govt_sec_pct;
      delete finalItem.alt_asset_pct;
    }
    if (key === "epf") {
      finalItem.bank = item.employer || "";
      delete finalItem.employer;
      finalItem.account_number = item.uan || "";
      delete finalItem.uan;
    }
    if (key === "loansTaken") finalItem.is_lent = false;
    if (key === "loansGiven") finalItem.is_lent = true;
    if (key === "budgets") {
      finalItem.monthly_limit = item.monthly;
      delete finalItem.monthly;
    }
    if (key === "reminders") {
      finalItem.reminder_date = item.date;
      delete finalItem.date;
    }
    if (key === "mutualFunds") {
      // Form uses `name`/`category` but DB has `scheme NOT NULL`/`type`
      if (finalItem.name !== undefined) {
        finalItem.scheme = finalItem.name;
        delete finalItem.name;
      }
      if (finalItem.category !== undefined) {
        finalItem.type = finalItem.category;
        delete finalItem.category;
      }
    }
    if (key === "informalBorrowed") finalItem.direction = "borrowed";
    if (key === "informalLent") finalItem.direction = "lent";
    if (key === "rentalProperties" || key === "rentedProperties") {
      finalItem.property_type_detail = item.propertyType || "shop";
      finalItem.property_type = key === "rentalProperties" ? "out" : "in";
    }

    const isUuid = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const isTextIdTable = key === "stockSells" || key === "mfSells";
    const newId =
      itemWithOwner.id && (isUuid(itemWithOwner.id) || isTextIdTable) ? itemWithOwner.id : uid();

    let syncFailed = false;
    setState((s) => {
      const next: any = {
        ...s,
        [key]: [...((s[key] as any[]) || []), { ...itemWithOwner, id: newId }],
      };
      if (key === "transactions" && itemWithOwner.accountId) {
        const delta =
          itemWithOwner.type === "credit"
            ? Number(itemWithOwner.amount || 0)
            : -Number(itemWithOwner.amount || 0);
        next.bankAccounts = (s.bankAccounts || []).map((a: any) =>
          a.id === itemWithOwner.accountId ? { ...a, balance: Number(a.balance || 0) + delta } : a
        );
        const reconIds: string[] = s.masterData?.reconciledTxnIds || [];
        const appliedIds: string[] = s.masterData?.balanceAppliedTxnIds || [];
        next.masterData = {
          ...(s.masterData || DEFAULT_MASTER_DATA),
          reconciledTxnIds: [...reconIds, newId],
          balanceAppliedTxnIds: [...appliedIds, newId],
        };
        masterDataRef.current = next.masterData;
      }
      return next;
    });

    if (userId && userId !== "offline-user") {
      const table = TABLE_MAP[key];
      if (table) {
        // Specific field mapping for various modules to match Supabase schema
        if (key === "bankAccounts") {
          finalItem.account_type = item.type || "Savings";
          delete finalItem.type;
        }
        if (key === "creditCards") {
          finalItem.card_limit = item.limit;
          delete finalItem.limit;
        }
        if (key === "loansTaken") {
          finalItem.lender_borrower = item.lender;
          delete finalItem.lender;
        }
        if (key === "loansGiven") {
          finalItem.lender_borrower = item.borrower || item.lender;
          finalItem.given_date = item.date || null;
          delete finalItem.borrower;
          delete finalItem.lender;
          delete finalItem.date;
        }

        const cleanItem = { ...finalItem, id: newId, user_id: userId };
        for (const k in cleanItem) {
          if (cleanItem[k] === "") cleanItem[k] = null;
          else if (
            NUMERIC_COLS.has(k) &&
            typeof cleanItem[k] === "string" &&
            cleanItem[k] !== null
          ) {
            const parsed = parseFloat(cleanItem[k]);
            cleanItem[k] = isNaN(parsed) ? null : parsed;
          }
        }
        // health_insurance.policy_number/policy_name are `NOT NULL DEFAULT ''` in the
        // DB but genuinely optional in the UI (no required-field validation) — the
        // blanket ""->null conversion above turns a left-blank field into an explicit
        // null, which overrides the column default and fails the NOT NULL constraint.
        if (key === "healthInsurance") {
          if (cleanItem.policy_number === null) cleanItem.policy_number = "";
          if (cleanItem.policy_name === null) cleanItem.policy_name = "";
        }

        // Use upsert (INSERT ... ON CONFLICT DO UPDATE) so retries are idempotent.
        // If the first request reached Supabase but the response was lost, a plain INSERT
        // would fail with duplicate-key on retry. Upsert handles that safely.
        const isNetworkError = (msg?: string) =>
          !!(
            msg?.includes("Load failed") ||
            msg?.includes("Failed to fetch") ||
            msg?.includes("NetworkError") ||
            msg?.includes("network")
          );

        const tryUpsert = () => supabase.from(table).upsert(cleanItem, { onConflict: "id" });

        pendingWritesRef.current++;
        let firstErrResult;
        try {
          firstErrResult = await tryUpsert();
        } finally {
          pendingWritesRef.current--;
        }
        let { error: firstErr } = firstErrResult;

        if (!firstErr) {
          // Auto-update bank balance in DB when a transaction is recorded
          if (key === "transactions" && itemWithOwner.accountId && userId) {
            const delta =
              itemWithOwner.type === "credit"
                ? Number(itemWithOwner.amount || 0)
                : -Number(itemWithOwner.amount || 0);
            // Re-read fresh balance from DB to avoid stale-closure race condition
            supabase
              .from("bank_accounts")
              .select("balance")
              .eq("id", itemWithOwner.accountId)
              .single()
              .then(({ data: freshAccount, error: fetchErr }) => {
                if (fetchErr) {
                  console.error("[Balance fetch]", fetchErr.message);
                  return;
                }
                if (!freshAccount) return;
                supabase
                  .from("bank_accounts")
                  .update({ balance: Number(freshAccount.balance || 0) + delta })
                  .eq("id", itemWithOwner.accountId)
                  .then(({ error: e }) => {
                    if (e) console.error("[Balance auto-update]", e.message);
                  });
              });
            const latestMaster = masterDataRef.current || state.masterData || DEFAULT_MASTER_DATA;
            const reconIds: string[] = latestMaster?.reconciledTxnIds || [];
            const appliedIds: string[] = latestMaster?.balanceAppliedTxnIds || [];
            const newMaster = {
              ...latestMaster,
              reconciledTxnIds: [...reconIds, newId],
              balanceAppliedTxnIds: [...appliedIds, newId],
            };
            masterDataRef.current = newMaster;
            supabase
              .from("user_settings")
              .upsert({ user_id: userId, master_data: newMaster })
              .then(({ error: e }) => {
                if (e) console.error("[masterData sync]", e.message);
              });
          }
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
                  showToast(
                    "Sync failed after 3 attempts — item kept locally. Reload to retry.",
                    "error"
                  );
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
            const { error: retryErr } = await supabase
              .from(table)
              .upsert(retryItem, { onConflict: "id" });
            currentErr = retryErr || null;
          }
          if (!currentErr) {
            console.warn(
              `[Supabase] Saved without missing cols: ${stripped.join(", ")} — run SQL migration to sync all fields`
            );
            showToast(
              `⚠️ Saved but ${stripped.join(", ")} was not stored — DB column missing. Run SQL migration.`,
              "warn"
            );
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
            life_events: "database/61_life_events.sql",
            gold_holdings: "database/60_gold_holdings.sql",
            documents: "database/58_documents.sql",
            dividends: "database/57_dividends.sql",
            vehicles: "database/53_vehicles.sql",
            real_estate_properties: "database/52_real_estate.sql",
          };
          const migFile = migrationMap[table] || `SQL migration for table "${table}"`;
          console.error(`[Supabase] Table "${table}" missing. Run: ${migFile}`);
          showToast(`⚠️ DB table missing — run ${migFile} in Supabase SQL Editor`, "error");
          setMissingTables((prev) => (prev.includes(table) ? prev : [...prev, table]));
          setState((s) => ({ ...s, [key]: s[key].filter((x: any) => x.id !== newId) }));
          syncFailed = true;
        } else {
          // Schema / auth / constraint error — revert immediately and show details
          console.error(`Supabase Upsert Error (${table}):`, {
            code: firstErr.code,
            message: firstErr.message,
            details: firstErr.details,
            hint: firstErr.hint,
          });
          let errMsg = `Sync failed [${firstErr.code}]: ${firstErr.message}`;
          if (firstErr.code === "23514" && firstErr.message?.includes("ppf_nps_type_check")) {
            errMsg =
              "DB migration needed: Run database/10_epf_final_fix.sql in Supabase SQL Editor to enable EPF support.";
          }
          if (firstErr.code === "23502" && firstErr.message?.includes("owner")) {
            errMsg = "Save failed: owner field missing — please reload the page and try again.";
          }
          showToast(errMsg, "error");
          setState((s) => ({ ...s, [key]: s[key].filter((x: any) => x.id !== newId) }));
          syncFailed = true;
        }
      }
    }
    logActivity(`ADD_${key.toUpperCase()}`, `Added ${describeItem(key, item)}`, {
      ...item,
      id: newId,
    });
    return { success: !syncFailed, id: newId };
  };

  const addTransactions = async (txns: any[]) => {
    if (!txns || txns.length === 0) return;
    const userId = session?.user?.id;
    const isUuid = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // Assign owner and UUID for each transaction
    const txnsWithIds = txns.map((item) => {
      const ownerVal = item.owner || (activeProfile !== "all" ? activeProfile : "self");
      const newId = item.id && isUuid(item.id) ? item.id : uid();
      return { ...item, id: newId, owner: ownerVal };
    });

    setState((s) => {
      // Calculate deltas per account
      const deltas: Record<string, number> = {};
      txnsWithIds.forEach((item) => {
        if (item.accountId) {
          const delta =
            item.type === "credit" ? Number(item.amount || 0) : -Number(item.amount || 0);
          deltas[item.accountId] = (deltas[item.accountId] || 0) + delta;
        }
      });

      const next: any = {
        ...s,
        transactions: [...((s.transactions as any[]) || []), ...txnsWithIds],
      };

      // Apply deltas to bank accounts
      next.bankAccounts = (s.bankAccounts || []).map((a: any) => {
        if (deltas[a.id]) {
          return { ...a, balance: Number(a.balance || 0) + deltas[a.id] };
        }
        return a;
      });

      // Update masterData
      const latestMaster = s.masterData || DEFAULT_MASTER_DATA;
      const reconIds: string[] = latestMaster?.reconciledTxnIds || [];
      const appliedIds: string[] = latestMaster?.balanceAppliedTxnIds || [];
      const newIds = txnsWithIds.map((item) => item.id);

      const newMaster = {
        ...latestMaster,
        reconciledTxnIds: [...reconIds, ...newIds],
        balanceAppliedTxnIds: [...appliedIds, ...newIds],
      };

      next.masterData = newMaster;
      masterDataRef.current = newMaster;
      return next;
    });

    // Write to Supabase if online
    if (userId && userId !== "offline-user") {
      const cleanItems = txnsWithIds.map((item) => {
        const finalItem = camelToSnake(item);
        const cleanItem = { ...finalItem, user_id: userId };
        for (const k in cleanItem) {
          if (cleanItem[k] === "") cleanItem[k] = null;
          else if (
            NUMERIC_COLS.has(k) &&
            typeof cleanItem[k] === "string" &&
            cleanItem[k] !== null
          ) {
            const parsed = parseFloat(cleanItem[k]);
            cleanItem[k] = isNaN(parsed) ? null : parsed;
          }
        }
        return cleanItem;
      });

      // Batch upsert to transactions table
      const { error: upsertErr } = await supabase
        .from("transactions")
        .upsert(cleanItems, { onConflict: "id" });

      if (upsertErr) {
        console.error("[Batch Transactions Upsert]", upsertErr.message);
        showToast(`Sync error: ${upsertErr.message}`, "error");
        // Revert transactions from state on error
        const addedIds = txnsWithIds.map((x) => x.id);
        setState((s) => ({
          ...s,
          transactions: s.transactions.filter((x: any) => !addedIds.includes(x.id)),
        }));
        return;
      }

      // Group by account ID to update balances in DB sequentially
      const deltas: Record<string, number> = {};
      txnsWithIds.forEach((item) => {
        if (item.accountId) {
          const delta =
            item.type === "credit" ? Number(item.amount || 0) : -Number(item.amount || 0);
          deltas[item.accountId] = (deltas[item.accountId] || 0) + delta;
        }
      });

      for (const accountId of Object.keys(deltas)) {
        const delta = deltas[accountId];
        // Re-read fresh balance from DB to avoid race conditions
        const { data: freshAccount, error: fetchErr } = await supabase
          .from("bank_accounts")
          .select("balance")
          .eq("id", accountId)
          .single();

        if (fetchErr) {
          console.error("[Batch Balance fetch]", fetchErr.message);
          continue;
        }

        if (freshAccount) {
          const { error: updateErr } = await supabase
            .from("bank_accounts")
            .update({ balance: Number(freshAccount.balance || 0) + delta })
            .eq("id", accountId);

          if (updateErr) {
            console.error("[Batch Balance update]", updateErr.message);
          }
        }
      }

      // Sync master data once at the end
      const latestMaster = masterDataRef.current || state.masterData || DEFAULT_MASTER_DATA;
      const { error: masterErr } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId, master_data: latestMaster });

      if (masterErr) {
        console.error("[Batch masterData sync]", masterErr.message);
      }
    }

    logActivity("BATCH_ADD_TRANSACTIONS", `Imported ${txns.length} transactions via CSV`, {
      count: txns.length,
    });
  };

  // Reverses the auto-posted side effect of a linked bank transaction (credit card
  // outstanding, loan balance, insurance premium ledger, rent log, subscription renewal
  // date) on its linked module record. Shared by removeItem (single delete) and
  // bulkRemoveTransactions (Delete All Transactions) so both keep linked records in sync
  // the same way instead of two copies of this logic drifting apart.
  const reverseLinkedTransactionEffect = (txn: any) => {
    if (!(txn?.linkedType && txn?.linkedId && Number(txn.amount || 0) > 0)) return;
    const lt = txn.linkedType;
    const lid = txn.linkedId;
    const amt = Number(txn.amount || 0);
    const entryId = `bank-${txn.id}`;
    if (lt === "creditCards") {
      const card = (state.creditCards || []).find((c: any) => c.id === lid);
      if (card) {
        updateItem("creditCards", lid, {
          transactions: (card.transactions || []).filter((t: any) => t.id !== entryId),
          outstanding: Number(card.outstanding || 0) + amt,
        });
      }
    } else if (lt === "loansTaken") {
      const loan = (state.loansTaken || []).find((l: any) => l.id === lid);
      if (loan) {
        // Only the principal portion of the EMI was ever deducted from outstanding
        // (see autoPostLinkedTransaction) — reverse that exact stored amount rather
        // than the full transaction amount, which would over-restore the balance.
        const principalAmt =
          txn.linkedPrincipalAmount != null ? Number(txn.linkedPrincipalAmount) : amt;
        updateItem("loansTaken", lid, {
          outstanding: Number(loan.outstanding || 0) + principalAmt,
          monthsRemaining: Number(loan.monthsRemaining || 0) + 1,
        });
      }
    } else if (["lic", "termPlans", "investmentPlans"].includes(lt)) {
      const policy = (state[lt] || []).find((p: any) => p.id === lid);
      if (policy) {
        updateItem(lt, lid, {
          transactions: (policy.transactions || []).filter((t: any) => t.id !== entryId),
          premiumPaid: Math.max(0, Number(policy.premiumPaid || 0) - amt),
        });
      }
    } else if (lt === "rentedProperties") {
      const prop = (state.rentedProperties || []).find((p: any) => p.id === lid);
      if (prop) {
        updateItem("rentedProperties", lid, {
          payments: (prop.payments || []).filter((p: any) => p.id !== entryId),
        });
      }
    } else if (lt === "rentalProperties") {
      const prop = (state.rentalProperties || []).find((p: any) => p.id === lid);
      if (prop) {
        updateItem("rentalProperties", lid, {
          receipts: (prop.receipts || []).filter((r: any) => r.id !== entryId),
        });
      }
    } else if (lt === "realEstateProperties") {
      // lid is "<propertyId>:<costField>" (stampDutyPaid/tdsValue/agreementValuePaid) — see
      // getLinkConfig's "Real Estate" branch in BanksTab.tsx. No embedded ledger array
      // to strip an entryId from here; the cost field is a plain scalar, so reversal is
      // just subtracting the same amount back out (same pattern as loansTaken above).
      const sep = lid.indexOf(":");
      const propId = sep >= 0 ? lid.slice(0, sep) : lid;
      const costField = sep >= 0 ? lid.slice(sep + 1) : "stampDuty";
      const prop = (state.realEstateProperties || []).find((p: any) => p.id === propId);
      if (prop) {
        updateItem("realEstateProperties", propId, {
          [costField]: Math.max(0, Number(prop[costField] || 0) - amt),
        });
      }
    } else if (lt === "subscriptions") {
      // BanksTab's autoPostLinkedTransaction advances renewalDate by one cycle when this
      // transaction is added — roll it back the same amount so deleting the payment
      // truly undoes it. Uses addMonthsToDateStr (day-of-month clamped to the target
      // month's length) instead of Date.setMonth, which silently overflows short months.
      const sub = (state.subscriptions || []).find((s: any) => s.id === lid);
      if (sub && sub.renewalDate) {
        const step = sub.cycle === "yearly" ? -12 : sub.cycle === "quarterly" ? -3 : -1;
        updateItem("subscriptions", lid, {
          renewalDate: addMonthsToDateStr(sub.renewalDate, step),
        });
      }
    }
  };

  const removeItem = async (key, id) => {
    const userId = session?.user?.id;
    const deletedItem = (state[key] || []).find((x: any) => x.id === id);
    const itemToDelete = key === "stocks" ? state.stocks.find((x: any) => x.id === id) : null;
    const txnToDelete =
      key === "transactions" ? state.transactions.find((x: any) => x.id === id) : null;
    const wasBalanceApplied =
      key === "transactions" && (state.masterData?.balanceAppliedTxnIds || []).includes(id);
    const orphanedDemandIds =
      key === "realEstateProperties"
        ? (state.realEstateDemands || [])
            .filter((d: any) => d.propertyId === id)
            .map((d: any) => d.id)
        : [];
    const orphanedPaymentIds =
      key === "realEstateProperties"
        ? (state.realEstatePayments || [])
            .filter((p: any) => p.propertyId === id)
            .map((p: any) => p.id)
        : [];
    const orphanedTxnIdsForAccount =
      key === "bankAccounts"
        ? (state.transactions || [])
            .filter((t: any) => t.accountId === id)
            .map((t: any) => t.id)
        : [];
    const orphanedTxnIdsForLoan =
      key === "loansTaken"
        ? (state.transactions || [])
            .filter((t: any) => t.linkedType === "loansTaken" && t.linkedId === id)
            .map((t: any) => t.id)
        : [];

    // Reverse any side effect this transaction auto-posted into a linked module record
    // (credit card outstanding, loan balance, insurance premium ledger, rent log) so that
    // record doesn't stay out of sync after the bank transaction itself is deleted.
    reverseLinkedTransactionEffect(txnToDelete);

    setState((s) => {
      const next: any = { ...s, [key]: (s[key] || []).filter((x: any) => x.id !== id) };
      if (key === "wishlists") {
        next.wishlistItems = (s.wishlistItems || []).filter((x: any) => x.watchlistId !== id);
      }
      if (key === "realEstateProperties") {
        // Otherwise these ledger rows survive with a dangling propertyId and keep
        // inflating portfolio-wide "Total Paid"/"Outstanding" totals forever.
        next.realEstateDemands = (s.realEstateDemands || []).filter(
          (d: any) => d.propertyId !== id
        );
        next.realEstatePayments = (s.realEstatePayments || []).filter(
          (p: any) => p.propertyId !== id
        );
      }
      if (key === "billPayments") {
        // The DB side already cascades (bill_payment_history.bill_id ON DELETE
        // CASCADE), but local state didn't mirror that — orphaned payment-history
        // rows for the deleted bill stuck around in memory until the next full
        // reload, same class of bug fixed above for realEstateProperties.
        next.billPaymentHistory = (s.billPaymentHistory || []).filter(
          (h: any) => h.billId !== id
        );
      }
      if (key === "bankAccounts") {
        // Transactions keep their history but lose the (now-invalid) account reference,
        // matching the delete-confirmation copy shown to the user.
        next.transactions = (s.transactions || []).map((t: any) =>
          t.accountId === id ? { ...t, accountId: null } : t
        );
      }
      if (key === "loansTaken") {
        // Deleting a loan directly (not via its linked bank transactions) otherwise leaves
        // any auto-posted EMI transaction pointing at a linkedId that no longer exists —
        // it keeps showing a 🔗 badge referencing a deleted loan forever.
        next.transactions = (s.transactions || []).map((t: any) =>
          t.linkedType === "loansTaken" && t.linkedId === id
            ? { ...t, linkedType: null, linkedId: null }
            : t
        );
      }
      if (key === "transactions") {
        const reconIds: string[] = s.masterData?.reconciledTxnIds || [];
        const appliedIds: string[] = s.masterData?.balanceAppliedTxnIds || [];
        next.masterData = {
          ...(s.masterData || DEFAULT_MASTER_DATA),
          reconciledTxnIds: reconIds.filter((rid) => rid !== id),
          balanceAppliedTxnIds: appliedIds.filter((rid) => rid !== id),
        };
        if (wasBalanceApplied && txnToDelete?.accountId) {
          const delta =
            txnToDelete.type === "credit"
              ? -Number(txnToDelete.amount || 0)
              : Number(txnToDelete.amount || 0);
          next.bankAccounts = (s.bankAccounts || []).map((a: any) =>
            a.id === txnToDelete.accountId ? { ...a, balance: Number(a.balance || 0) + delta } : a
          );
        }
      }
      return next;
    });

    if (userId && userId !== "offline-user") {
      const table = TABLE_MAP[key];
      if (table) {
        pendingWritesRef.current++;
        let error;
        try {
          ({ error } = await supabase.from(table).delete().eq("id", id));
        } finally {
          pendingWritesRef.current--;
        }
        if (error) {
          console.error(`Supabase Delete Error (${table}):`, error.message);
          showToast(`Delete sync failed: ${error.message}`, "error");
          fetchAllData();
        } else {
          // Auto-reverse bank balance in DB if this transaction's delta was previously applied
          if (wasBalanceApplied && txnToDelete?.accountId) {
            const delta =
              txnToDelete.type === "credit"
                ? -Number(txnToDelete.amount || 0)
                : Number(txnToDelete.amount || 0);
            // Re-read fresh balance from DB to avoid stale-closure race condition
            supabase
              .from("bank_accounts")
              .select("balance")
              .eq("id", txnToDelete.accountId)
              .single()
              .then(({ data: freshAccount, error: fetchErr }) => {
                if (fetchErr) {
                  console.error("[Balance fetch]", fetchErr.message);
                  return;
                }
                if (!freshAccount) return;
                supabase
                  .from("bank_accounts")
                  .update({ balance: Number(freshAccount.balance || 0) + delta })
                  .eq("id", txnToDelete.accountId)
                  .then(({ error: e }) => {
                    if (e) console.error("[Balance auto-reverse]", e.message);
                  });
              });
          }
          // Save updated masterData (remove txn from both tracking arrays)
          if (key === "transactions") {
            const latestMaster = masterDataRef.current || state.masterData || DEFAULT_MASTER_DATA;
            const reconIds: string[] = latestMaster.reconciledTxnIds || [];
            const appliedIds: string[] = latestMaster.balanceAppliedTxnIds || [];
            const newMaster = {
              ...latestMaster,
              reconciledTxnIds: reconIds.filter((rid) => rid !== id),
              balanceAppliedTxnIds: appliedIds.filter((rid) => rid !== id),
            };
            masterDataRef.current = newMaster;
            supabase
              .from("user_settings")
              .upsert({ user_id: userId, master_data: newMaster })
              .then(({ error: e }) => {
                if (e) console.error("[masterData sync]", e.message);
              });
          }
          if (key === "realEstateProperties") {
            if (orphanedDemandIds.length) {
              await supabase.from("real_estate_demands").delete().in("id", orphanedDemandIds);
            }
            if (orphanedPaymentIds.length) {
              await supabase.from("real_estate_payments").delete().in("id", orphanedPaymentIds);
            }
          }
          if (key === "bankAccounts" && orphanedTxnIdsForAccount.length) {
            await supabase
              .from("transactions")
              .update({ account_id: null })
              .in("id", orphanedTxnIdsForAccount);
          }
          if (key === "loansTaken" && orphanedTxnIdsForLoan.length) {
            await supabase
              .from("transactions")
              .update({ linked_type: null, linked_id: null })
              .in("id", orphanedTxnIdsForLoan);
          }
          if (key === "stocks" && itemToDelete) {
            // Check if any lots of this stock remain in active portfolio OR if it's in sales history
            const stillHasLots = state.stocks.some(
              (x: any) =>
                x.id !== id &&
                x.symbol === itemToDelete.symbol &&
                x.exchange === itemToDelete.exchange
            );
            const hasInSales = state.stockSells.some(
              (x: any) => x.symbol === itemToDelete.symbol && x.exchange === itemToDelete.exchange
            );
            if (!stillHasLots && !hasInSales) {
              await supabase
                .from("corporate_actions")
                .delete()
                .eq("symbol", itemToDelete.symbol)
                .eq("exchange", itemToDelete.exchange);
              setState((s: any) => ({
                ...s,
                corporateActions: s.corporateActions.filter(
                  (ca: any) =>
                    !(ca.symbol === itemToDelete.symbol && ca.exchange === itemToDelete.exchange)
                ),
              }));
            }
          }
        }
      }
    }
    logActivity(`REMOVE_${key.toUpperCase()}`, `Removed ${describeItem(key, deletedItem)}`, {
      id,
      ...(deletedItem || {}),
    });
  };

  // Deletes many transactions in one shot (used by "Delete All Transactions" for an
  // account in BanksTab, so a decade of bad/duplicate history doesn't require clicking
  // the single-row delete 70+ times). Mirrors removeItem's per-transaction logic —
  // reverse any linked side effect, reverse the balance delta if it was applied, strip
  // the ids from masterData's tracking arrays — but batches the state update and the
  // DB writes into one pass each instead of firing one removeItem call per id. Firing
  // removeItem in a tight loop would race: its balance reversal re-reads the DB balance
  // and writes it back per-transaction without awaiting, so overlapping calls could each
  // read the same stale balance and clobber each other's write. Computing one combined
  // delta per account up front and writing it once avoids that entirely.
  const bulkRemoveTransactions = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const userId = session?.user?.id;
    const idSet = new Set(ids);
    const txnsToDelete = (state.transactions || []).filter((t: any) => idSet.has(t.id));
    if (txnsToDelete.length === 0) return;
    const appliedIds: string[] = state.masterData?.balanceAppliedTxnIds || [];
    const appliedSet = new Set(appliedIds);

    txnsToDelete.forEach((t: any) => reverseLinkedTransactionEffect(t));

    const deltas: Record<string, number> = {};
    txnsToDelete.forEach((t: any) => {
      if (appliedSet.has(t.id) && t.accountId) {
        const delta = t.type === "credit" ? -Number(t.amount || 0) : Number(t.amount || 0);
        deltas[t.accountId] = (deltas[t.accountId] || 0) + delta;
      }
    });

    setState((s) => {
      const next: any = {
        ...s,
        transactions: (s.transactions || []).filter((t: any) => !idSet.has(t.id)),
      };
      next.bankAccounts = (s.bankAccounts || []).map((a: any) =>
        deltas[a.id] ? { ...a, balance: Number(a.balance || 0) + deltas[a.id] } : a
      );
      const reconIds: string[] = s.masterData?.reconciledTxnIds || [];
      const curAppliedIds: string[] = s.masterData?.balanceAppliedTxnIds || [];
      const newMaster = {
        ...(s.masterData || DEFAULT_MASTER_DATA),
        reconciledTxnIds: reconIds.filter((rid) => !idSet.has(rid)),
        balanceAppliedTxnIds: curAppliedIds.filter((rid) => !idSet.has(rid)),
      };
      next.masterData = newMaster;
      masterDataRef.current = newMaster;
      return next;
    });

    if (userId && userId !== "offline-user") {
      const { error } = await supabase.from("transactions").delete().in("id", ids);
      if (error) {
        console.error("[Bulk Delete Transactions]", error.message);
        showToast(`Delete sync failed: ${error.message}`, "error");
        fetchAllData();
        return;
      }

      for (const accountId of Object.keys(deltas)) {
        const delta = deltas[accountId];
        // Re-read fresh balance from DB right before writing (rather than trusting the
        // pre-delete local value) to avoid clobbering a concurrent change to this account.
        const { data: freshAccount, error: fetchErr } = await supabase
          .from("bank_accounts")
          .select("balance")
          .eq("id", accountId)
          .single();
        if (fetchErr) {
          console.error("[Bulk Balance fetch]", fetchErr.message);
          continue;
        }
        if (freshAccount) {
          const { error: updateErr } = await supabase
            .from("bank_accounts")
            .update({ balance: Number(freshAccount.balance || 0) + delta })
            .eq("id", accountId);
          if (updateErr) console.error("[Bulk Balance update]", updateErr.message);
        }
      }

      const latestMaster = masterDataRef.current || state.masterData || DEFAULT_MASTER_DATA;
      const { error: masterErr } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId, master_data: latestMaster });
      if (masterErr) console.error("[Bulk masterData sync]", masterErr.message);
    }

    logActivity("BULK_DELETE_TRANSACTIONS", `Deleted ${ids.length} transactions`, {
      count: ids.length,
    });
  };

  const cleanupOrphanedCorporateActions = async () => {
    const orphaned = state.corporateActions.filter((ca: any) => {
      const hasActive = state.stocks.some(
        (s: any) => s.symbol === ca.symbol && s.exchange === ca.exchange
      );
      const hasSold = state.stockSells.some(
        (s: any) => s.symbol === ca.symbol && s.exchange === ca.exchange
      );
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
      setState((s: any) => ({
        ...s,
        corporateActions: s.corporateActions.filter((ca: any) => !ids.includes(ca.id)),
      }));
      showToast(`Successfully purged ${count} orphaned records from Supabase.`, "success");
    } else {
      showToast("Cleanup failed: " + error.message, "error");
    }
  };

  const updateItem = async (key, id, patch) => {
    const userId = session?.user?.id;
    const wasApplied =
      key === "transactions" && (state.masterData?.balanceAppliedTxnIds || []).includes(id);
    const oldTxn = key === "transactions" ? state.transactions.find((x: any) => x.id === id) : null;

    setState((s) => {
      const next: any = { ...s, [key]: s[key].map((x) => (x.id === id ? { ...x, ...patch } : x)) };
      if (wasApplied && oldTxn) {
        const updatedTxn = { ...oldTxn, ...patch };
        const oldDelta =
          oldTxn.type === "credit" ? Number(oldTxn.amount || 0) : -Number(oldTxn.amount || 0);
        const newDelta =
          updatedTxn.type === "credit"
            ? Number(updatedTxn.amount || 0)
            : -Number(updatedTxn.amount || 0);
        next.bankAccounts = (s.bankAccounts || []).map((a: any) => {
          if (a.id === oldTxn.accountId && a.id === updatedTxn.accountId) {
            return { ...a, balance: Number(a.balance || 0) - oldDelta + newDelta };
          }
          if (a.id === oldTxn.accountId)
            return { ...a, balance: Number(a.balance || 0) - oldDelta };
          if (a.id === updatedTxn.accountId)
            return { ...a, balance: Number(a.balance || 0) + newDelta };
          return a;
        });
      }
      return next;
    });

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
        if (key === "budgets" && patch.monthly !== undefined) {
          finalPatch.monthly_limit = patch.monthly;
          delete finalPatch.monthly;
        }
        if (key === "reminders" && patch.date !== undefined) {
          finalPatch.reminder_date = patch.date;
          delete finalPatch.date;
        }
        if (key === "mutualFunds") {
          if (patch.name !== undefined) {
            finalPatch.scheme = patch.name;
            delete finalPatch.name;
          }
          if (patch.category !== undefined) {
            finalPatch.type = patch.category;
            delete finalPatch.category;
          }
        }

        // Specific field mapping for updates
        if (key === "bankAccounts" && patch.type !== undefined) {
          finalPatch.account_type = patch.type;
          delete finalPatch.type;
        }
        if (key === "creditCards") {
          if (patch.limit !== undefined) {
            finalPatch.card_limit = patch.limit;
          }
          delete finalPatch.limit;
        }
        if (key === "loansTaken" && patch.lender) {
          finalPatch.lender_borrower = patch.lender;
          delete finalPatch.lender;
        }
        if (key === "loansGiven" && (patch.borrower || patch.lender)) {
          finalPatch.lender_borrower = patch.borrower || patch.lender;
          delete finalPatch.borrower;
          delete finalPatch.lender;
        }
        if (key === "loansGiven" && patch.date !== undefined) {
          finalPatch.given_date = patch.date || null;
          delete finalPatch.date;
        }
        if (key === "ppf" && patch.institution !== undefined) {
          finalPatch.bank = patch.institution || "";
          delete finalPatch.institution;
        }
        if (key === "nps") {
          if (patch.pran !== undefined) {
            finalPatch.account_number = patch.pran || "";
            delete finalPatch.pran;
          }
          if (patch.tier !== undefined) {
            finalPatch.epf_type = patch.tier || "I";
            delete finalPatch.tier;
          }
          if (patch.fundManager !== undefined) {
            finalPatch.bank = patch.fundManager || "";
            delete finalPatch.fund_manager;
          }
          if (patch.yearContribution !== undefined) {
            finalPatch.this_year_contribution = Number(patch.yearContribution) || 0;
            delete finalPatch.year_contribution;
          }
          if (patch.employerContribution !== undefined) {
            finalPatch.employer_contribution = Number(patch.employerContribution) || 0;
          }
          const hasMeta =
            patch.schemeType !== undefined ||
            patch.investmentChoice !== undefined ||
            patch.lifecycleFund !== undefined ||
            patch.equityPct !== undefined;
          if (hasMeta) {
            finalPatch.establishments = {
              schemeType: patch.schemeType || "All Citizen",
              investmentChoice: patch.investmentChoice || "Auto",
              lifecycleFund: patch.lifecycleFund || "LC-50",
              equityPct: Number(patch.equityPct) || 0,
              corpBondPct: Number(patch.corpBondPct) || 0,
              govtSecPct: Number(patch.govtSecPct) || 0,
              altAssetPct: Number(patch.altAssetPct) || 0,
            };
            delete finalPatch.scheme_type;
            delete finalPatch.investment_choice;
            delete finalPatch.lifecycle_fund;
            delete finalPatch.equity_pct;
            delete finalPatch.corp_bond_pct;
            delete finalPatch.govt_sec_pct;
            delete finalPatch.alt_asset_pct;
          }
        }
        if (key === "epf") {
          if (patch.employer !== undefined) {
            finalPatch.bank = patch.employer || "";
            delete finalPatch.employer;
          }
          if (patch.uan !== undefined) {
            finalPatch.account_number = patch.uan || "";
            delete finalPatch.uan;
          }
        }

        for (const k in finalPatch) {
          if (finalPatch[k] === "") finalPatch[k] = null;
          else if (
            NUMERIC_COLS.has(k) &&
            typeof finalPatch[k] === "string" &&
            finalPatch[k] !== null
          ) {
            const parsed = parseFloat(finalPatch[k]);
            finalPatch[k] = isNaN(parsed) ? null : parsed;
          }
        }
        // health_insurance.policy_number/policy_name are `NOT NULL DEFAULT ''` in the
        // DB but genuinely optional in the UI (no required-field validation) — the
        // blanket ""->null conversion above turns a left-blank field into an explicit
        // null, which overrides the column default and fails the NOT NULL constraint.
        if (key === "healthInsurance") {
          if (finalPatch.policy_number === null) finalPatch.policy_number = "";
          if (finalPatch.policy_name === null) finalPatch.policy_name = "";
        }

        const isNetErr = (msg?: string) =>
          !!(
            msg?.includes("Load failed") ||
            msg?.includes("Failed to fetch") ||
            msg?.includes("NetworkError") ||
            msg?.includes("network")
          );
        const doUpdate = (patch: any) => supabase.from(table).update(patch).eq("id", id);
        pendingWritesRef.current++;
        let error;
        try {
          ({ error } = await doUpdate(finalPatch));
        } finally {
          pendingWritesRef.current--;
        }
        if (!error && wasApplied && oldTxn) {
          const updatedTxn = { ...oldTxn, ...patch };
          const oldDelta =
            oldTxn.type === "credit" ? Number(oldTxn.amount || 0) : -Number(oldTxn.amount || 0);
          const newDelta =
            updatedTxn.type === "credit"
              ? Number(updatedTxn.amount || 0)
              : -Number(updatedTxn.amount || 0);
          if (oldTxn.accountId === updatedTxn.accountId) {
            const adjustment = newDelta - oldDelta;
            if (adjustment !== 0) {
              // Re-read fresh balance to avoid stale-closure race condition
              supabase
                .from("bank_accounts")
                .select("balance")
                .eq("id", oldTxn.accountId)
                .single()
                .then(({ data: freshAccount, error: fetchErr }) => {
                  if (fetchErr) {
                    console.error("[Balance fetch]", fetchErr.message);
                    return;
                  }
                  if (!freshAccount) return;
                  supabase
                    .from("bank_accounts")
                    .update({ balance: Number(freshAccount.balance || 0) + adjustment })
                    .eq("id", oldTxn.accountId)
                    .then(({ error: e }) => {
                      if (e) console.error("[Balance edit-update]", e.message);
                    });
                });
            }
          } else {
            // Account changed — reverse old, apply new (both with fresh DB reads)
            supabase
              .from("bank_accounts")
              .select("balance")
              .eq("id", oldTxn.accountId)
              .single()
              .then(({ data: freshOld, error: fetchErr }) => {
                if (fetchErr) {
                  console.error("[Balance fetch]", fetchErr.message);
                  return;
                }
                if (!freshOld) return;
                supabase
                  .from("bank_accounts")
                  .update({ balance: Number(freshOld.balance || 0) - oldDelta })
                  .eq("id", oldTxn.accountId)
                  .then(({ error: e }) => {
                    if (e) console.error("[Balance edit-reverse]", e.message);
                  });
              });
            supabase
              .from("bank_accounts")
              .select("balance")
              .eq("id", updatedTxn.accountId)
              .single()
              .then(({ data: freshNew, error: fetchErr }) => {
                if (fetchErr) {
                  console.error("[Balance fetch]", fetchErr.message);
                  return;
                }
                if (!freshNew) return;
                supabase
                  .from("bank_accounts")
                  .update({ balance: Number(freshNew.balance || 0) + newDelta })
                  .eq("id", updatedTxn.accountId)
                  .then(({ error: e }) => {
                    if (e) console.error("[Balance edit-apply]", e.message);
                  });
              });
          }
        }
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
              console.warn(
                `[Supabase] Updated without missing cols: ${strippedU.join(", ")} — run SQL migration`
              );
              showToast(
                `⚠️ Updated but ${strippedU.join(", ")} was not stored — DB column missing. Run SQL migration.`,
                "warn"
              );
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
    const updatedItem = (state[key] || []).find((x: any) => x.id === id);
    const changedFields = Object.keys(patch).join(", ");
    logActivity(
      `UPDATE_${key.toUpperCase()}`,
      `Updated ${describeItem(key, updatedItem ? { ...updatedItem, ...patch } : patch)} (${changedFields})`,
      { id, patch }
    );
  };

  // ================== EXPORT / IMPORT ==================
  const exportJSON = () => {
    // Never write the Gemini API key (or other secrets) into a downloadable backup file —
    // users routinely email/cloud-store these exports.
    const exportedAt = new Date().toISOString();
    const exportState = {
      ...state,
      settings: { ...(state.settings || {}), geminiApiKey: "" },
      _exportedAt: exportedAt,
    };
    const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    try {
      localStorage.setItem("pf_last_backup_ts", exportedAt);
    } catch {
      // localStorage unavailable (private browsing) — the timestamp just won't persist across reloads
    }
    setLastBackupTs(exportedAt);
    logActivity("EXPORT", `Exported full backup — finance-backup-${today()}.json`);
  };
  // Moved out of the header's inline onClick during the WorkspaceHeader extraction
  // (Aug 2026) — same demo-vs-real-session branching as before, just named.
  const handleSignOut = async () => {
    sessionStorage.removeItem("demo_session");
    if (getIsDemoMode()) {
      await signOutOfDemo().catch(() => {});
    } else {
      await supabase.auth.signOut().catch(() => {});
    }
    setDemoMode(false);
    setSession(null);
    lastFetchedUserIdRef.current = null;
    setState(DEFAULT_STATE);
    setActiveProfile("all");
    try {
      localStorage.removeItem("finance_credit_scores");
    } catch {}
  };
  const pushBackupToSupabase = async (data: any) => {
    const userId = session?.user?.id;
    if (!userId || userId === "offline-user") return;

    // A restore must REPLACE cloud data, not merge with it — upserting alone leaves
    // rows that exist in the cloud but not in the backup (e.g. items deleted, or added
    // after the backup was taken) untouched, so they silently reappear on next load and
    // the restore doesn't actually match what the confirm dialog promised the user.
    const moduleTables = [...new Set([...Object.values(TABLE_MAP), "net_worth_history"])];
    for (const table of moduleTables) {
      await supabase.from(table).delete().eq("user_id", userId);
    }

    const cleanItem = (obj: any) => {
      const r: any = {};
      for (const k in obj) {
        if (k === "user_id" || k === "userId") continue;
        if (obj[k] === "") r[k] = null;
        else if (NUMERIC_COLS.has(k) && typeof obj[k] === "string") {
          const n = parseFloat(obj[k]);
          r[k] = isNaN(n) ? null : n;
        } else r[k] = obj[k];
      }
      return r;
    };

    const push = (table: string, items: any[], extra?: (item: any) => any) =>
      (items || []).map((item) => {
        const base = cleanItem(camelToSnake(item));
        const merged = { ...base, ...(extra ? extra(item) : {}), user_id: userId };
        return supabase.from(table).upsert(merged, { onConflict: "id" });
      });

    const ops = [
      data.profile &&
        supabase
          .from("profiles")
          .upsert({ ...cleanItem(camelToSnake(data.profile)), user_id: userId }),
      data.settings &&
        supabase
          .from("user_settings")
          .upsert({ ...cleanItem(camelToSnake(data.settings)), user_id: userId }),
      ...push("bank_accounts", data.bankAccounts),
      ...push("transactions", data.transactions),
      ...push("mutual_funds", data.mutualFunds, (item) => ({
        scheme: item.name || item.scheme || "",
        type: item.category || item.type || null,
        name: undefined,
        category: undefined,
      })),
      ...push("stocks", data.stocks),
      ...push("demat_accounts", data.demat),
      ...push("fixed_deposits", data.fixedDeposits),
      ...push("recurring_deposits", data.recurringDeposits),
      ...push("bonds", data.bonds),
      ...push("ppf_nps", data.ppf, () => ({ type: "PPF" })),
      ...push("ppf_nps", data.nps, () => ({ type: "NPS" })),
      ...push("ppf_nps", data.epf, () => ({ type: "EPF" })),
      ...push("credit_cards", data.creditCards, (item) => ({
        card_limit: item.cardLimit ?? item.limit ?? null,
        limit: undefined,
      })),
      ...push("prepaid_cards", data.prepaidCards),
      ...push("loans", data.loansTaken, (item) => ({
        is_lent: false,
        lender_borrower: item.lender || item.lenderBorrower || "",
        lender: undefined,
      })),
      ...push("loans", data.loansGiven, (item) => ({
        is_lent: true,
        lender_borrower: item.borrower || item.lenderBorrower || "",
        given_date: item.date || null,
        borrower: undefined,
        lender: undefined,
        date: undefined,
      })),
      ...push("goals", data.goals),
      ...push("budgets", data.budgets, (item) => ({
        monthly_limit: item.monthlyLimit ?? item.monthly ?? null,
        monthly: undefined,
      })),
      ...push("recurring_expenses", data.recurringExpenses),
      ...push("subscriptions", data.subscriptions),
      ...push("reminders", data.reminders, (item) => ({
        reminder_date: item.reminderDate ?? item.date ?? null,
        date: undefined,
      })),
      ...push("lic_policies", data.lic),
      ...push("term_plans", data.termPlans),
      ...push("investment_plans", data.investmentPlans),
      ...push("informal_loans", data.informalBorrowed, () => ({ direction: "borrowed" })),
      ...push("informal_loans", data.informalLent, () => ({ direction: "lent" })),
      ...push("rental_properties", data.rentalProperties, (item) => ({
        property_type: "out",
        property_type_detail: item.propertyType || "shop",
      })),
      ...push("rental_properties", data.rentedProperties, (item) => ({
        property_type: "in",
        property_type_detail: item.propertyType || "shop",
      })),
      ...push("sips", data.sips),
      ...push("stock_sells", data.stockSells),
      ...push("mf_sells", data.mfSells),
      ...push("corporate_actions", data.corporateActions),
      ...push("tax_payments", data.taxPayments),
      ...push("income_entries", data.income),
      ...push("real_estate_properties", data.realEstateProperties),
      ...push("real_estate_demands", data.realEstateDemands),
      ...push("real_estate_payments", data.realEstatePayments),
      ...push("vehicles", data.vehicles),
      ...push("dividends", data.dividends),
      ...push("documents", data.documents),
      ...push("gold_holdings", data.goldHoldings),
      ...push("life_events", data.lifeEvents),
      ...push("watchlists", data.wishlists),
      ...push("watchlist_items", data.wishlistItems),
      ...push("health_insurance", data.healthInsurance, (item) => ({
        // policy_number/policy_name are `NOT NULL DEFAULT ''` — cleanItem's blanket
        // ""->null conversion breaks the NOT NULL constraint for a legitimately
        // blank (optional in the UI) field. See the same guard in addItem/updateItem.
        policy_number: item.policyNumber || "",
        policy_name: item.policyName || "",
      })),
      ...push("credit_scores", data.creditScores),
      ...push("bill_payments", data.billPayments),
      ...push("bill_payment_history", data.billPaymentHistory),
      ...push("govt_schemes", data.govtSchemes),
      ...push("salary_slips", data.salarySlips),
      ...push("form_26as", data.form26as),
      ...(data.netWorthHistory || []).map((entry) =>
        supabase.from("net_worth_history").upsert(
          {
            user_id: userId,
            month: entry.month,
            net_worth: entry.netWorth ?? entry.net_worth ?? 0,
            cash: entry.cash ?? 0,
            equity: entry.equity ?? 0,
            debt: entry.debt ?? 0,
            real_estate: entry.realEstate ?? 0,
            vehicles: entry.vehicles ?? 0,
            liabilities: entry.liabilities ?? 0,
          },
          { onConflict: "user_id,month" }
        )
      ),
    ].filter(Boolean);

    await Promise.allSettled(ops);
  };

  const countRecords = (obj) =>
    Object.values(obj || {}).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);

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
    // On macOS, files inside an iCloud-synced folder (Downloads, Desktop) that haven't
    // fully downloaded to disk yet can make the OS file picker return a file the
    // browser then fails to read — with no onload AND no thrown exception, just
    // silence. Without this handler that read the same as "the button did nothing."
    reader.onerror = () => {
      console.error("Backup file read failed", reader.error);
      showToast(
        "Couldn't read that file — if it's in iCloud Drive/Downloads, make sure it's fully downloaded (not just a cloud placeholder) and try again.",
        "error"
      );
      input.value = "";
    };
    reader.onload = (ev) => {
      // Everything below (not just JSON.parse) must be guarded — an uncaught
      // exception inside a FileReader callback is invisible to the user: no
      // toast, no error boundary, nothing but a silent console.error. That
      // reads to the user as "I picked the file and nothing happened."
      try {
        let parsed;
        try {
          parsed = JSON.parse(ev.target.result);
        } catch {
          showToast("Invalid backup file — check JSON format", "error");
          input.value = "";
          return;
        }
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !parsed.profile ||
          typeof parsed.profile !== "object"
        ) {
          showToast("Invalid backup — not a valid finance export", "error");
          input.value = "";
          return;
        }

        const fileRecords = countRecords(parsed);
        const currentRecords = countRecords(state);
        const backupDateStr = parsed._exportedAt
          ? new Date(parsed._exportedAt).toLocaleString()
          : parsed._exportDate || "an unknown date";

        setConfirmDialog({
          message:
            `Restore "${file.name}"?\n` +
            `Backup created: ${backupDateStr} · ${fileRecords} records\n\n` +
            `This will permanently replace your current data (${currentRecords} records) on this device` +
            `${session?.user?.id && session.user.id !== "offline-user" ? " and in the cloud" : ""}. ` +
            `This cannot be undone — export a fresh backup first if you want to keep what you have now.`,
          confirmLabel: "Yes, restore backup",
          onConfirm: async () => {
            setState({ ...DEFAULT_STATE, ...parsed });
            showToast("Restoring backup and syncing to cloud...");
            logActivity("IMPORT", `Imported backup from ${file.name}`, { fileName: file.name });
            try {
              await pushBackupToSupabase(parsed);
              showToast("Backup fully restored ✓", "success");
            } catch (err) {
              console.error("Cloud sync after restore failed", err);
              showToast(
                "Backup restored locally, but syncing to the cloud failed — check your connection.",
                "warn"
              );
            }
          },
        });
        input.value = "";
      } catch (err) {
        console.error("Restore failed unexpectedly", err);
        showToast(
          `Restore failed unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
          "error"
        );
        input.value = "";
      }
    };
    reader.readAsText(file);
  };

  const resetAll = () => {
    setConfirmDialog({
      message:
        "CRITICAL: This will permanently wipe ALL data from your device AND the cloud (Supabase). This action is irreversible. Proceed?",
      onConfirm: async () => {
        setIsResetting(true);
        try {
          const userId = session?.user?.id;

          if (!userId || userId === "offline-user") {
            localStorage.clear();
            sessionStorage.clear();
            setState(DEFAULT_STATE);
            setActiveProfile("all");
            setIsResetting(false);
            showToast("Local data reset successfully.", "success");
            return;
          }

          await logActivity("RESET", "Full data reset — all cloud and local data wiped");

          // 1. PHASE 1: Delete all module data across all tables
          const tables = Object.values(TABLE_MAP);
          const extraTables = ["activity_logs", "user_state", "net_worth_history"];
          const allModuleTables = [...new Set([...tables, ...extraTables])];

          for (const table of allModuleTables) {
            await supabase.from(table).delete().eq("user_id", userId);
          }

          // 2. PHASE 2: Reset Profile & Settings to Defaults in DB
          await supabase
            .from("profiles")
            .update({
              name: "there",
              fy: getCurrentFY(),
              regime: "new",
              savings_target: 20,
            })
            .eq("user_id", userId);

          await supabase
            .from("user_settings")
            .update({
              dark_mode: false,
              accent_key: "blue",
              density: "normal",
              radius_key: "modern",
              font_key: "inter",
              bg_style: "plain",
              anim_speed: "smooth",
            })
            .eq("user_id", userId);

          // 3. Final wipe of local storage and state clear
          localStorage.clear();
          sessionStorage.clear();
          setState(DEFAULT_STATE);
          setActiveProfile("all");

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

  const d = DENSITY[density] || DENSITY.normal;

  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes("placeholder")
  );

  if (isAuthChecking) {
    return <LoadingScreen />;
  }

  if (!session || recoveryMode) {
    if (!isSupabaseConfigured) {
      return (
        <div
          style={{
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
          }}
        >
          <Settings size={40} style={{ marginBottom: 8, opacity: 0.85 }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
            Backend Connection Required
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              maxWidth: 380,
              lineHeight: 1.6,
              fontSize: 14,
            }}
          >
            Please add{" "}
            <code
              style={{
                background: "rgba(255,255,255,0.08)",
                padding: "2px 6px",
                borderRadius: 4,
                color: THEME.accent,
              }}
            >
              VITE_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code
              style={{
                background: "rgba(255,255,255,0.08)",
                padding: "2px 6px",
                borderRadius: 4,
                color: THEME.accent,
              }}
            >
              VITE_SUPABASE_ANON_KEY
            </code>{" "}
            to your environment.
          </p>
        </div>
      );
    }
    const isDemoSite =
      window.location.hostname.includes("personalfinancedemo") ||
      window.location.hostname === "localhost";
    return (
      <Auth
        onLogin={setSession}
        onRecoveryComplete={() => setRecoveryMode(false)}
        onOffline={
          isDemoSite
            ? async () => {
                const demoEmail = import.meta.env.VITE_DEMO_USER_EMAIL;
                const demoPass = import.meta.env.VITE_DEMO_USER_PASSWORD;
                if (demoEmail && demoPass) {
                  try {
                    setDemoMode(true);
                    const { data, error } = await signInToDemo(demoEmail, demoPass);
                    if (!error && data.session) {
                      setSession(data.session);
                      return;
                    }
                    setDemoMode(false);
                  } catch {
                    setDemoMode(false);
                  }
                }
                const demoSession = {
                  user: { id: "offline-user", email: "demo@personalfinance.app" },
                  access_token: "offline",
                };
                sessionStorage.setItem("demo_session", JSON.stringify(demoSession));
                setSession(demoSession);
              }
            : undefined
        }
      />
    );
  }

  // Show the guided setup wizard exactly once, right after a brand-new signup verifies
  // and logs in for the first time (flagged by Auth.tsx at signUp() time) - not on every
  // login, and not for the offline/demo session.
  if (
    session?.user?.id !== "offline-user" &&
    !state.masterData?._onboardingComplete &&
    (() => {
      try {
        return (
          !!session?.user?.email &&
          localStorage.getItem("pf_pending_onboarding") === session.user.email
        );
      } catch {
        return false;
      }
    })()
  ) {
    return (
      <div className={darkMode ? "dark-theme" : ""} style={{ minHeight: "100vh" }}>
        <OnboardingWizard
          updateProfile={updateProfile}
          addItem={addItem}
          updateSettings={updateSettings}
          updateMasterData={updateMasterData}
          showToast={showToast}
          onComplete={() => {
            try {
              localStorage.removeItem("pf_pending_onboarding");
            } catch {}
          }}
        />
      </div>
    );
  }

  // Cold cache (new device/browser, cleared storage) + a real fetchAllData in flight:
  // without this, the dashboard below would render off DEFAULT_STATE's empty arrays for
  // as long as the fetch takes — every tab's EmptyState and ₹0 stats — then snap to the
  // real numbers once it resolves. That's a misleading flash, not just a blank one, so
  // hold on the same branded LoadingScreen used for the auth check above instead.
  // isFetchingInitialData (not `loaded`) is the correct signal here — `loaded` gets set
  // true the moment there's no session yet (well before login) and is never reset false
  // when a real fetch subsequently starts, so it doesn't actually track "is data ready."
  // Doesn't affect the common warm-cache case (hadCachedDataAtMount true), which renders
  // immediately as before regardless of fetch state.
  if (!hadCachedDataAtMount && isFetchingInitialData) {
    return <LoadingScreen />;
  }

  return (
    <MasterDataContext.Provider value={state.masterData || DEFAULT_MASTER_DATA}>
      <div
        className={darkMode ? "dark-theme" : ""}
        style={{
          height: "100vh",
          background: "var(--t-paper)",
          fontFamily: "var(--t-font, 'Inter', sans-serif)",
          color: THEME.ink,
          position: "relative",
          display: "flex",
          fontSize: d.fontSize,
          overflow: "hidden",
        }}
      >
        {/* ── SIDEBAR NAVIGATION ── */}
        <WorkspaceSidebar
          tab={tab}
          subTab={subTab}
          setTab={setTab}
          setSubTab={setSubTab}
          sidebarMinimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
          sidebarHovered={sidebarHovered}
          setSidebarHovered={setSidebarHovered}
          isSidebarCompact={isSidebarCompact}
          collapsedGroups={collapsedGroups}
          setCollapsedGroups={setCollapsedGroups}
        />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* HEADER */}
          <WorkspaceHeader
            tab={tab}
            subTab={subTab}
            setTab={setTab}
            greeting={greeting}
            search={search}
            setSearch={setSearch}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            searchResults={searchResults}
            setShowCmdPalette={setShowCmdPalette}
            activeProfile={activeProfile}
            setActiveProfile={setActiveProfile}
            familyProfiles={familyProfiles}
            showMobileSearch={showMobileSearch}
            setShowMobileSearch={setShowMobileSearch}
            alertsMenuRef={alertsMenuRef}
            showAlerts={showAlerts}
            setShowAlerts={setShowAlerts}
            alerts={alerts}
            state={state}
            updateDismissedAlerts={updateDismissedAlerts}
            darkMode={darkMode}
            updateSettings={updateSettings}
            exportJSON={exportJSON}
            profileMenuRef={profileMenuRef}
            showProfileMenu={showProfileMenu}
            setShowProfileMenu={setShowProfileMenu}
            session={session}
            onSignOut={handleSignOut}
          />

          {/* Sync status pill in header area handled by header logic */}

          <main
            className="app-main-content"
            style={{
              flex: 1,
              display: tab === "ai" ? "flex" : "block",
              flexDirection: "column",
              overflowY: tab === "ai" ? "hidden" : "auto",
              overflowX: "hidden",
              padding: tab === "ai" ? "24px 40px" : "40px",
              position: "relative",
              zIndex: 1,
              filter: privacyMode ? "blur(16px)" : "none",
              transition: "filter 0.3s ease",
            }}
          >
            {/* Missing DB tables warning — shown globally so user knows what to fix */}
            {missingTables.length > 0 && (
              <div
                style={{
                  marginBottom: 24,
                  padding: "12px 18px",
                  background: `color-mix(in srgb, var(--t-gold) 8%, transparent)`,
                  border: `1px solid color-mix(in srgb, var(--t-gold) 30%, transparent)`,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: THEME.gold,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span>
                  Missing DB {missingTables.length === 1 ? "table" : "tables"}:{" "}
                  <code
                    style={{
                      fontFamily: "monospace",
                      background: `color-mix(in srgb, var(--t-gold) 12%, transparent)`,
                      padding: "1px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {missingTables.join(", ")}
                  </code>{" "}
                  — run the corresponding SQL migration in Supabase to restore full functionality.
                </span>
              </div>
            )}
            <div
              key={tab}
              className="tab-content-enter"
              style={
                tab === "ai"
                  ? { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }
                  : undefined
              }
            >
              {tab === "analytics" && (
                <AnalyticsTab
                  metrics={metrics}
                  state={filteredState}
                  trendData={trendData}
                  assetBreakdown={assetBreakdown}
                  setState={setState}
                  marketData={marketData}
                  marketDataTs={marketDataTs}
                  updateMasterData={updateMasterData}
                  updateItem={updateItem}
                  setTab={setTab}
                  setSubTab={setSubTab}
                  showToast={showToast}
                  dashboardWidgets={state.masterData?.dashboardWidgets}
                  onUpdateWidgets={(widgets) => updateMasterData("dashboardWidgets", widgets)}
                  activeProfile={activeProfile}
                />
              )}
              {tab === "investments" && (
                <InvestmentsTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  subTab={subTab}
                  onSubTabChange={setSubTab}
                  activeProfile={activeProfile}
                  mfMarketData={mfMarketData}
                  fetchMfNavs={fetchMfNavs}
                  fetchingMfNavs={fetchingMfNavs}
                  mfMarketDataTs={mfMarketDataTs}
                  showToast={showToast}
                />
              )}
              {tab === "tax" && (
                <TaxVaultTab
                  state={filteredState}
                  metrics={metrics}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  updateProfile={updateProfile}
                  updateMasterData={updateMasterData}
                  showToast={showToast}
                />
              )}
              {tab === "rental" && (
                <RentalTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "realestate" && (
                <RealEstateTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  activeProfile={activeProfile}
                  showToast={showToast}
                />
              )}
              {tab === "vehicles" && (
                <VehiclesTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "banks" && (
                <BanksTab
                  state={filteredState}
                  fullState={state}
                  addItem={addItem}
                  addTransactions={addTransactions}
                  removeItem={removeItem}
                  bulkRemoveTransactions={bulkRemoveTransactions}
                  updateItem={updateItem}
                  masterData={state.masterData || DEFAULT_MASTER_DATA}
                  updateMasterData={updateMasterData}
                  showToast={showToast}
                />
              )}
              {tab === "demat" && (
                <DematTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  missingTables={missingTables}
                  marketData={marketData}
                  fetchLivePrices={fetchLivePrices}
                  fetchingPrices={fetchingPrices}
                  marketDataTs={marketDataTs}
                  wishlists={state.wishlists || []}
                  wishlistItems={state.wishlistItems || []}
                  activeProfile={activeProfile}
                  showToast={showToast}
                />
              )}
              {tab === "txnhistory" && (
                <TxnHistoryTab
                  state={filteredState}
                  removeItem={removeItem}
                  marketData={marketData}
                  showToast={showToast}
                />
              )}
              {(tab === "credit" ||
                ["cc", "prepaid", "taken", "given", "borrowed", "lent", "optimizer"].includes(
                  tab
                )) && (
                <CreditTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  subTab={tab === "credit" ? subTab : tab}
                  onSubTabChange={(st: string) => {
                    setTab(st);
                    setSubTab(null);
                  }}
                  showToast={showToast}
                />
              )}
              {tab === "subs" && (
                <SubsTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  metrics={metrics}
                  showToast={showToast}
                />
              )}
              {tab === "sip" && (
                <SIPTrackerTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  metrics={metrics}
                  showToast={showToast}
                />
              )}
              {tab === "insurance" && (
                <InsuranceSummaryTab
                  state={filteredState}
                  metrics={metrics}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "goals" && (
                <GoalsTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  metrics={metrics}
                  showToast={showToast}
                />
              )}
              {tab === "budget" && (
                <BudgetTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  metrics={metrics}
                  activeProfile={activeProfile}
                  showToast={showToast}
                />
              )}
              {tab === "ai" && <AIAssistantTab state={filteredState} metrics={metrics} />}
              {tab === "reminders" && (
                <RemindersTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "calculators" && <CalculatorsTab metrics={metrics} state={filteredState} />}
              {tab === "cashflow" && <CashFlowTab state={filteredState} metrics={metrics} />}
              {(tab === "calendar" || tab === "paycal") && (
                <CalendarTab
                  state={filteredState}
                  metrics={metrics}
                  addItem={addItem}
                  showToast={showToast}
                  onNavigateToTab={setTab}
                />
              )}
              {tab === "capitalgains" && (
                <CapitalGainsTab state={filteredState} updateItem={updateItem} />
              )}
              {tab === "taxtools" && (
                <TaxToolsTab
                  state={filteredState}
                  metrics={metrics}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "annualreport" && (
                <AnnualReportTab
                  state={filteredState}
                  metrics={metrics}
                  marketData={marketData}
                  activeProfile={activeProfile}
                />
              )}
              {tab === "investstatement" && (
                <InvestmentStatementTab
                  state={filteredState}
                  metrics={metrics}
                  marketData={marketData}
                  activeProfile={activeProfile}
                />
              )}
              {tab === "expensetrends" && (
                <ExpenseTrendsTab state={filteredState} metrics={metrics} />
              )}
              {tab === "familyview" && (
                <FamilyViewTab state={state} metrics={metrics} marketData={marketData} />
              )}
              {tab === "emergencyfund" && (
                <EmergencyFundTab state={filteredState} metrics={metrics} />
              )}
              {tab === "nominees" && (
                <NomineeTrackerTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                  setTab={setTab}
                />
              )}
              {tab === "docvault" && (
                <DocumentVaultTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  session={session}
                  showToast={showToast}
                />
              )}
              {tab === "rebalancing" && (
                <RebalancingTab state={filteredState} metrics={metrics} marketData={marketData} />
              )}
              {tab === "nwtimeline" && (
                <NetWorthTimelineTab
                  state={filteredState}
                  metrics={metrics}
                  marketData={marketData}
                  activeProfile={activeProfile}
                />
              )}

              {tab === "casimport" && (
                <CASImportTab
                  state={filteredState}
                  addItem={addItem}
                  updateItem={updateItem}
                  activeProfile={activeProfile}
                />
              )}
              {tab === "amortization" && <LoanAmortizationTab state={filteredState} />}
              {tab === "fireplanner" && <FIREPlannerTab state={filteredState} metrics={metrics} />}
              {tab === "lifeevents" && (
                <LifeEventPlannerTab
                  state={filteredState}
                  metrics={metrics}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "taxfiling" && (
                <TaxFilingHelperTab
                  state={filteredState}
                  metrics={metrics}
                  updateMasterData={updateMasterData}
                />
              )}
              {tab === "smartalerts" && <SmartAlertsTab state={filteredState} metrics={metrics} />}
              {tab === "expenseforecast" && (
                <ExpenseForecastTab state={filteredState} metrics={metrics} setTab={setTab} />
              )}
              {tab === "dataexport" && (
                <DataExportTab
                  state={state}
                  exportJSON={exportJSON}
                  onRestoreBackup={importJSON}
                  showToast={showToast}
                  lastBackupTs={lastBackupTs}
                  isCloudSynced={!!(session?.user?.id && session.user.id !== "offline-user")}
                />
              )}
              {tab === "comparison" && (
                <ComparisonReportsTab
                  state={filteredState}
                  metrics={metrics}
                  marketData={marketData}
                  activeProfile={activeProfile}
                />
              )}
              {tab === "sec80" && <Section80TrackerTab state={filteredState} metrics={metrics} />}
              {tab === "gold" && (
                <GoldSGBTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  updateSettings={updateSettings}
                  showToast={showToast}
                />
              )}
              {tab === "healthinsurance" && (
                <HealthInsuranceTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "creditscore" && (
                <CreditScoreTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "bills" && (
                <BillPaymentTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "govtschemes" && (
                <GovtSchemesTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  subTab={subTab}
                  onSubTabChange={setSubTab}
                  showToast={showToast}
                />
              )}
              {tab === "xirrreport" && <XIRRReportTab state={filteredState} metrics={metrics} />}
              {tab === "dividendcal" && (
                <DividendCalendarTab state={filteredState} metrics={metrics} marketData={marketData} />
              )}
              {tab === "salaryslip" && (
                <SalarySlipTab
                  state={filteredState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              )}
              {tab === "auditlog" && <AuditLogTab session={session} />}
              {tab === "benchmark" && (
                <PerformanceBenchmarkTab
                  state={filteredState}
                  metrics={metrics}
                  marketData={marketData}
                />
              )}
              {tab === "settings" && (
                <SettingsTab
                  state={state}
                  setState={setState}
                  addItem={addItem}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  exportJSON={exportJSON}
                  onRestoreBackup={importJSON}
                  resetAll={resetAll}
                  showToast={showToast}
                  session={session}
                  onSignOut={async () => {
                    sessionStorage.removeItem("demo_session");
                    if (getIsDemoMode()) {
                      await signOutOfDemo().catch(() => {});
                    } else {
                      await supabase.auth.signOut().catch(() => {});
                    }
                    setDemoMode(false);
                    setSession(null);
                    setState(DEFAULT_STATE);
                    setActiveProfile("all");
                    try {
                      localStorage.removeItem("finance_credit_scores");
                    } catch {}
                  }}
                  cleanupOrphaned={cleanupOrphanedCorporateActions}
                  updateProfile={updateProfile}
                  updateSettings={updateSettings}
                  darkMode={darkMode}
                  toggleDarkMode={() => updateSettings({ darkMode: !darkMode })}
                  accentKey={accentKey}
                  setAccentKey={(v) => updateSettings({ accentKey: v })}
                  density={density}
                  setDensity={(v) => updateSettings({ density: v })}
                  radiusKey={radiusKey}
                  setRadiusKey={(v) => updateSettings({ radiusKey: v })}
                  fontKey={fontKey}
                  setFontKey={(v) => updateSettings({ fontKey: v })}
                  bgStyle={bgStyle}
                  setBgStyle={(v) => updateSettings({ bgStyle: v })}
                  animSpeed={animSpeed}
                  setAnimSpeed={(v) => updateSettings({ animSpeed: v })}
                  masterData={state.masterData || DEFAULT_MASTER_DATA}
                  updateMasterData={updateMasterData}
                  emailSettings={settings}
                  updateEmailSettings={updateSettings}
                  lastBackupTs={lastBackupTs}
                  setAppTab={setTab}
                />
              )}
            </div>
          </main>

          {tab !== "ai" && (
            <footer
              className="app-footer"
              style={{
                textAlign: "center",
                padding: "28px 20px 32px",
                color: THEME.muted,
                fontSize: 12,
                borderTop: `1px solid ${THEME.line}`,
                marginTop: 40,
                letterSpacing: "0.04em",
                lineHeight: 1.8,
              }}
            >
              <span style={{ fontWeight: 600 }}>Personal Finance by Anand Mohta</span> · FY{" "}
              {state.profile.fy}
            </footer>
          )}
        </div>

        {/* ── MOBILE BOTTOM NAVIGATION ── */}
        <MobileNav tab={tab} setTab={setTab} setSubTab={setSubTab} />

        {/* ── KEYBOARD SHORTCUTS HELP ── */}
        {showShortcuts && (
          <div
            className="modal-backdrop"
            onMouseDown={(e) => {
              shortcutsMouseDownOnBackdrop.current = e.target === e.currentTarget;
            }}
            onClick={(e) => {
              if (shortcutsMouseDownOnBackdrop.current && e.target === e.currentTarget) {
                setShowShortcuts(false);
              }
              shortcutsMouseDownOnBackdrop.current = false;
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="shortcuts-modal-title"
              className="modal-panel"
              style={{
                padding: 28,
                maxWidth: 520,
                width: "90%",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div
                  id="shortcuts-modal-title"
                  style={{
                    fontWeight: 800,
                    fontSize: 18,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Keyboard Shortcuts
                </div>
                <button
                  onClick={() => setShowShortcuts(false)}
                  aria-label="Close keyboard shortcuts help"
                  title="Close"
                  className="modal-close-btn"
                >
                  <X size={16} />
                </button>
              </div>
              {[
                {
                  title: "Navigation",
                  shortcuts: [
                    { key: "D", desc: "Dashboard" },
                    { key: "B", desc: "Banks" },
                    { key: "S", desc: "Stocks" },
                    { key: "I", desc: "Investments" },
                    { key: "T", desc: "Tax Vault" },
                    { key: "G", desc: "Goals" },
                    { key: "C", desc: "Cash Flow" },
                    { key: "E", desc: "Expense Trends" },
                    { key: "F", desc: "Family View" },
                    { key: "N", desc: "Nominees" },
                    { key: "R", desc: "Annual Report" },
                  ],
                },
                {
                  title: "Quick Access (Number Keys)",
                  shortcuts: [
                    { key: "1", desc: "Dashboard" },
                    { key: "2", desc: "Banks" },
                    { key: "3", desc: "Demat" },
                    { key: "4", desc: "Investments" },
                    { key: "5", desc: "Credit" },
                    { key: "6", desc: "Budget" },
                    { key: "7", desc: "Tax" },
                    { key: "8", desc: "Goals" },
                    { key: "9", desc: "Cash Flow" },
                    { key: "0", desc: "Calendar" },
                  ],
                },
                {
                  title: "Actions",
                  shortcuts: [
                    { key: "⌘K", desc: "Command Palette" },
                    { key: "/", desc: "Search" },
                    { key: "A", desc: "Toggle Alerts" },
                    { key: "P", desc: "Privacy Mode" },
                    { key: "?", desc: "This Help" },
                    { key: "Esc", desc: "Close Modals" },
                  ],
                },
              ].map((group) => (
                <div key={group.title} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 12,
                      color: THEME.accent,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 8,
                    }}
                  >
                    {group.title}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "4px 16px",
                    }}
                  >
                    {group.shortcuts.map((s) => (
                      <div
                        key={s.key + s.desc}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}
                      >
                        <kbd
                          style={{
                            display: "inline-block",
                            minWidth: 28,
                            padding: "2px 8px",
                            borderRadius: 6,
                            border: `1.5px solid ${THEME.line}`,
                            background: `color-mix(in srgb, var(--t-accent) 6%, transparent)`,
                            fontWeight: 700,
                            fontSize: 12,
                            textAlign: "center",
                            fontFamily: "monospace",
                            color: THEME.ink,
                          }}
                        >
                          {s.key}
                        </kbd>
                        <span style={{ fontSize: 13, color: THEME.muted }}>{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TOAST NOTIFICATIONS ── */}
        <ToastStack toasts={toasts} />

        {/* ── CONFIRM DIALOG ── */}
        {confirmDialog && (
          <ConfirmDialog
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            onConfirm={() => {
              confirmDialog.onConfirm();
              setConfirmDialog(null);
            }}
            onCancel={() => setConfirmDialog(null)}
          />
        )}

        {/* ── COMMAND PALETTE (⌘K) ── */}
        <CommandKModal
          isOpen={showCmdPalette}
          onClose={() => setShowCmdPalette(false)}
          onSelectTab={(t, st) => {
            setTab(t);
            if (st) setSubTab(st);
          }}
          togglePrivacy={() => setPrivacyMode(!privacyMode)}
          isPrivacyMode={privacyMode}
        />

        {/* ── RESET OVERLAY ── */}
        {isResetting && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(15,23,42,0.88)",
              backdropFilter: "blur(8px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              gap: 20,
            }}
          >
            <RefreshCw size={48} className="animate-spin" style={{ color: THEME.accent }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
                Nuking Local & Cloud Data
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
                Please wait, performing secure wipe...
              </div>
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
