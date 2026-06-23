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
} from "lucide-react";

export const getCurrentFY = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const fyStart = month >= 3 ? year : year - 1;
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
  "year",
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
      { id: "txnhistory", label: "Global Ledger", icon: History },
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
      { id: "vehicles", label: "Vehicles", icon: Car },
    ],
  },
  {
    title: "Liabilities & Credit",
    items: [
      {
        id: "credit",
        label: "Credit & Liabilities",
        icon: CreditCard,
        children: [
          { id: "cc", label: "Credit Cards", icon: CreditCard },
          { id: "prepaid", label: "Prepaid Cards", icon: Wallet },
          { id: "taken", label: "Loans Taken", icon: ArrowLeft },
          { id: "given", label: "Loans Given", icon: ArrowRight },
          { id: "borrowed", label: "From People", icon: User },
          { id: "lent", label: "To People", icon: IndianRupee },
          { id: "optimizer", label: "Payoff Optimizer", icon: Sparkles },
        ],
      },
    ],
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
    ],
  },
  {
    title: "System",
    items: [
      { id: "reminders", label: "Reminders & Alerts", icon: Bell },
      { id: "calculators", label: "Financial Calculators", icon: Hash },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];
