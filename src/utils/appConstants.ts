import type { NavGroup } from "../types/finance";
import {
  PieChart as PieIcon,
  TrendingUp,
  Landmark,
  Target,
  Building2,
  Home,
  Heart,
  Wallet,
  Bell,
  Hash,
  Calculator,
  Settings,
  CreditCard,
  History,
  BarChart3,
  Repeat,
  Activity,
  User,
  Coins,
  Shield,
  Briefcase,
  IndianRupee,
  FileText,
  ArrowRight,
  ArrowLeft,
  Bot,
  Sparkles,
  Car,
  Calendar,
  Scale,
  FileBarChart,
  Users,
  ShieldAlert,
  FolderOpen,
  Receipt,
  Flame,
  ClipboardList,
  LineChart,
  Gem,
  GraduationCap,
  Database,
  Clock,
  Crosshair,
  ScrollText,
  HandCoins,
  Milestone,
  Zap,
  Star,
  Award,
  FileCheck,
} from "lucide-react";

export const getCurrentFYStartYear = (): number => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
};

export const getCurrentFY = () => {
  const fyStart = getCurrentFYStartYear();
  const fyEndShort = String(fyStart + 1).slice(-2);
  return `${fyStart}-${fyEndShort}`;
};

export const NUMERIC_COLS = new Set([
  "target_amount",
  "current_amount",
  "balance",
  "principal",
  "rate",
  "units",
  "current_nav",
  "invested",
  "qty",
  "current_price",
  "avg_price",
  "monthly",
  "monthly_limit",
  "tenure_months",
  "face_value",
  "coupon",
  "outstanding",
  "emi",
  "card_limit",
  "annual_fee",
  "amount",
  "years",
  "sum_assured",
  "annual_premium",
  "premium_paid",
  "cover_amount",
  "monthly_rent",
  "security_deposit",
  "deposit_returned",
  "municipal_tax",
  "buy_price",
  "sell_price",
  "buy_nav",
  "sell_nav",
  "total_installments",
  "profit",
  "net_worth",
  "ratio_n",
  "ratio_m",
  "old_qty",
  "new_qty",
  "old_avg_price",
  "new_avg_price",
  "term",
  "premium_paying_term",
  "expected_maturity_amount",
  "policy_term",
  "ytm_rate",
  "face_value_per_unit",
  "number_of_units",
  "clean_price_per_unit",
  "accrued_interest_per_unit",
  "total_principal_amount",
  "total_accrued_interest",
  "total_consideration",
  "brokerage",
  "stamp_duty",
  "total_investment_amount",
  "market_cap",
  "due_day",
  "shared_group_limit",
  "fee_month",
  "fee_day",
  "reward_points_balance",
  "reward_point_value",
  "property_value",
  "target_price",
  "agreement_value",
  "tds_value",
  "market_value",
  "sale_price",
  "sale_stamp_duty",
  "sale_tds",
  "gst_amount",
  "total_amount",
  "area_sqft",
  "purchase_price",
  "current_value",
  "purchase_basic_cost",
  "purchase_cgst_amount",
  "purchase_sgst_amount",
  "rto_charges",
  "accessories_charges",
  "year",
  "grams",
  "interest_rate",
  "estimated_cost",
  "current_saved",
  // health_insurance
  "sum_insured",
  "premium",
  "waiting_period_years",
  "no_claim_bonus",
  // credit_scores
  "score",
  // govt_schemes
  "tenure",
  // salary_slips
  "basic",
  "hra",
  "da",
  "special_allowance",
  "lta",
  "bonus",
  "other_earnings",
  "gross_salary",
  "pf_employee",
  "pf_employer",
  "esi_employee",
  "professional_tax",
  "tds",
  "other_deductions",
  "total_deductions",
  "net_salary",
]);

export const TABLE_MAP: Record<string, string> = {
  bankAccounts: "bank_accounts",
  transactions: "transactions",
  mutualFunds: "mutual_funds",
  stocks: "stocks",
  demat: "demat_accounts",
  fixedDeposits: "fixed_deposits",
  recurringDeposits: "recurring_deposits",
  bonds: "bonds",
  ppf: "ppf_nps",
  nps: "ppf_nps",
  epf: "ppf_nps",
  creditCards: "credit_cards",
  prepaidCards: "prepaid_cards",
  loansTaken: "loans",
  loansGiven: "loans",
  goals: "goals",
  budgets: "budgets",
  subscriptions: "subscriptions",
  reminders: "reminders",
  recurringExpenses: "recurring_expenses",
  lic: "lic_policies",
  termPlans: "term_plans",
  investmentPlans: "investment_plans",
  informalBorrowed: "informal_loans",
  informalLent: "informal_loans",
  rentalProperties: "rental_properties",
  rentedProperties: "rental_properties",
  sips: "sips",
  stockSells: "stock_sells",
  mfSells: "mf_sells",
  corporateActions: "corporate_actions",
  taxPayments: "tax_payments",
  income: "income_entries",
  wishlists: "watchlists",
  wishlistItems: "watchlist_items",
  realEstateProperties: "real_estate_properties",
  realEstateDemands: "real_estate_demands",
  realEstatePayments: "real_estate_payments",
  vehicles: "vehicles",
  dividends: "dividends",
  documents: "documents",
  goldHoldings: "gold_holdings",
  lifeEvents: "life_events",
  healthInsurance: "health_insurance",
  creditScores: "credit_scores",
  billPayments: "bill_payments",
  billPaymentHistory: "bill_payment_history",
  govtSchemes: "govt_schemes",
  salarySlips: "salary_slips",
  form26as: "form_26as",
};

export const camelToSnake = (obj: any) => {
  const res: any = {};
  for (const k in obj) {
    const snake = k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
    res[snake] = obj[k];
  }
  return res;
};

export const snakeToCamel = (obj: any): any => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  const res: any = {};
  for (const k in obj) {
    const camel = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    res[camel] = obj[k] !== null && typeof obj[k] === "object" ? snakeToCamel(obj[k]) : obj[k];
  }
  return res;
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { id: "analytics", label: "Executive Dashboard", icon: PieIcon },
      { id: "ai", label: "AI Advisor", icon: Bot },
      { id: "cashflow", label: "Cash Flow Forecast", icon: LineChart },
      { id: "nwtimeline", label: "Net Worth Timeline", icon: LineChart },
      { id: "familyview", label: "Family View", icon: Users },
    ],
  },
  {
    title: "Wealth & Assets",
    items: [
      { id: "banks", label: "Banks & Transactions", icon: Landmark },
      { id: "demat", label: "Demat & Stocks", icon: BarChart3 },
      {
        id: "investments",
        label: "Investments Portfolio",
        icon: TrendingUp,
        children: [
          { id: "fd", label: "Fixed Deposits", icon: Coins },
          { id: "rd", label: "Recurring Deposits", icon: Repeat },
          { id: "bond", label: "Bonds", icon: FileText },
          { id: "ppf", label: "PPF", icon: Shield },
          { id: "nps", label: "NPS", icon: Briefcase },
          { id: "epf", label: "EPF (EPFO)", icon: Shield },
          { id: "mf", label: "Mutual Funds", icon: BarChart3 },
          { id: "dividends", label: "Dividends", icon: Coins },
          { id: "income", label: "Yield Tracker", icon: Activity },
        ],
      },
      { id: "goals", label: "Financial Goals", icon: Target },
      { id: "realestate", label: "Real Estate", icon: Home },
      { id: "gold", label: "Gold & SGBs", icon: Gem },
      { id: "vehicles", label: "Vehicles", icon: Car },
      {
        id: "govtschemes",
        label: "Govt Schemes",
        icon: Star,
        children: [
          { id: "APY", label: "Atal Pension (APY)", icon: Users },
          { id: "SSY", label: "Sukanya Samriddhi", icon: Star },
          { id: "PMJJBY", label: "Jeevan Jyoti (PMJJBY)", icon: Shield },
          { id: "PMSBY", label: "Suraksha Bima (PMSBY)", icon: Shield },
          { id: "PMKISAN", label: "Kisan Nidhi (PM-KISAN)", icon: TrendingUp },
          { id: "SCSS", label: "Senior Citizens (SCSS)", icon: Users },
          { id: "NSC", label: "National Savings (NSC)", icon: FileText },
          { id: "KVP", label: "Kisan Vikas (KVP)", icon: Coins },
          { id: "POST_MIS", label: "Post Office MIS", icon: Coins },
          { id: "RBI_BOND", label: "RBI Bonds", icon: FileText },
          { id: "NPS_LITE", label: "NPS Lite", icon: Briefcase },
        ],
      },
      { id: "emergencyfund", label: "Emergency Fund", icon: Shield },
    ],
  },
  {
    title: "Liabilities & Credit",
    items: [
      { id: "cc", label: "Credit Cards", icon: CreditCard },
      { id: "prepaid", label: "Prepaid Cards", icon: Wallet },
      { id: "taken", label: "Loans Taken", icon: ArrowLeft },
      { id: "given", label: "Loans Given", icon: ArrowRight },
      { id: "borrowed", label: "From People", icon: User },
      { id: "lent", label: "To People", icon: IndianRupee },
    ],
  },
  {
    title: "Planning & Spends",
    items: [
      {
        id: "taxplanning",
        label: "Tax & Compliance",
        icon: ScrollText,
        directChildren: true,
        children: [
          { id: "tax", label: "Tax Vault", icon: Calculator },
          { id: "taxtools", label: "Tax Tools", icon: Receipt },
          { id: "capitalgains", label: "Capital Gains", icon: FileBarChart },
          { id: "sec80", label: "80C / 80D Tracker", icon: Shield },
          { id: "taxfiling", label: "Tax Filing Helper", icon: FileText },
        ],
      },
      {
        id: "spending",
        label: "Budget & Spending",
        icon: HandCoins,
        directChildren: true,
        children: [
          { id: "budget", label: "Budgeting", icon: Wallet },
          { id: "bills", label: "Bill Payments", icon: Zap },
          { id: "rental", label: "Rental Details", icon: Building2 },
          { id: "subs", label: "Subscriptions", icon: Repeat },
        ],
      },
      {
        id: "lifeplanning",
        label: "Life Planning",
        icon: Milestone,
        directChildren: true,
        children: [
          { id: "insurance", label: "Insurance", icon: Heart },
          { id: "healthinsurance", label: "Health Insurance", icon: Shield },
          { id: "sip", label: "SIP Tracker", icon: Activity },
          { id: "calendar", label: "Financial Calendar", icon: Calendar },
          { id: "paycal", label: "Payment Calendar", icon: Calendar },
          { id: "fireplanner", label: "FIRE Planner", icon: Flame },
          { id: "lifeevents", label: "Life Event Planner", icon: GraduationCap },
        ],
      },
    ],
  },
  {
    title: "Reports & Tools",
    items: [
      { id: "annualreport", label: "Annual Report", icon: FileBarChart },
      { id: "txnhistory", label: "Global Ledger", icon: History },
      { id: "expensetrends", label: "Expense Trends", icon: BarChart3 },
      { id: "expenseforecast", label: "Expense Forecast", icon: TrendingUp },
      { id: "comparison", label: "Comparison Reports", icon: Crosshair },
      { id: "investstatement", label: "Investment Statement", icon: ClipboardList },
      { id: "rebalancing", label: "Smart Rebalancing", icon: Scale },
      { id: "benchmark", label: "Performance Benchmark", icon: BarChart3 },
      { id: "optimizer", label: "Payoff Optimizer", icon: Sparkles },
      { id: "amortization", label: "Loan Amortization", icon: Calculator },
      { id: "calculators", label: "Financial Calculators", icon: Hash },

      { id: "xirrreport", label: "XIRR Report", icon: Activity },
      { id: "dividendcal", label: "Dividend Calendar", icon: Coins },
      { id: "salaryslip", label: "Salary Slip Tracker", icon: FileCheck },
      { id: "casimport", label: "CAS Import", icon: Briefcase },
      { id: "dataexport", label: "Data Export & Backup", icon: Database },
    ],
  },
  {
    title: "System",
    items: [
      { id: "smartalerts", label: "Smart Alerts", icon: Bell },
      { id: "reminders", label: "Reminders & Alerts", icon: Bell },
      { id: "nominees", label: "Will & Nominees", icon: ShieldAlert },
      { id: "docvault", label: "Document Vault", icon: FolderOpen },
      { id: "creditscore", label: "Credit Score", icon: Award },
      { id: "auditlog", label: "Audit Log", icon: Clock },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

/**
 * Resolves the current tab/subTab to a "Group › Item" (or "Group › Item › Child")
 * breadcrumb string for the header, since the header greeting alone gives no
 * indication of which of the ~80 nav destinations is active.
 */
export const getNavBreadcrumb = (tab: string, subTab?: string): string | null => {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.id === tab) {
        const child = subTab ? item.children?.find((c) => c.id === subTab) : undefined;
        return child
          ? `${group.title} › ${item.label} › ${child.label}`
          : `${group.title} › ${item.label}`;
      }
      if (item.children) {
        const child = item.children.find((c) => c.id === tab);
        if (child) return `${group.title} › ${item.label} › ${child.label}`;
      }
    }
  }
  return null;
};
