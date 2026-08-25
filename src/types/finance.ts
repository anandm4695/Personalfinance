/**
 * Core TypeScript types for the ArthaDrishti application.
 *
 * Incrementally typed — array entity fields use `any[]` until individual
 * entity interfaces are defined. Non-array structures (Settings, Profile,
 * MasterData, Metrics, Alert, SearchResult, Nav) are fully typed here.
 */

import type { MasterData } from "../utils/masterData";
import type { LucideIcon } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────────────────

export interface Settings {
  darkMode: boolean;
  accentKey: string;
  density: "compact" | "normal" | "comfortable" | string;
  radiusKey: string;
  fontKey: string;
  bgStyle: string;
  animSpeed: string;
  emailEnabled: boolean;
  emailFrequency: "daily" | "weekly" | "monthly" | string;
  emailDay: number;
  emailHour: number;
  emailAddress: string;
  fromEmail: string;
  geminiApiKey: string;
  goldPricePerGram?: number;
}

// ────────────────────────────────────────────────────────────
// Profile
// ────────────────────────────────────────────────────────────

export interface Profile {
  name: string;
  fy: string;
  regime: "old" | "new";
  savingsTarget: number;
}

// ────────────────────────────────────────────────────────────
// Dismissed Alerts
// ────────────────────────────────────────────────────────────

/** Maps alert title -> timestamp (ms) until which it is dismissed. */
export type DismissedAlerts = Record<string, number>;

// ────────────────────────────────────────────────────────────
// AppState — mirrors DEFAULT_STATE in App.tsx
// ────────────────────────────────────────────────────────────

export interface AppState {
  profile: Profile;
  bankAccounts: any[];
  transactions: any[];
  fixedDeposits: any[];
  recurringDeposits: any[];
  bonds: any[];
  ppf: any[];
  nps: any[];
  epf: any[];
  lic: any[];
  termPlans: any[];
  investmentPlans: any[];
  mutualFunds: any[];
  stocks: any[];
  demat: any[];
  wishlists: any[];
  wishlistItems: any[];
  creditCards: any[];
  prepaidCards: any[];
  loansTaken: any[];
  loansGiven: any[];
  informalBorrowed: any[];
  informalLent: any[];
  rentalProperties: any[];
  rentedProperties: any[];
  subscriptions: any[];
  goals: any[];
  income: any[];
  taxPayments: any[];
  budgets: any[];
  recurringExpenses: any[];
  reminders: any[];
  stockSells: any[];
  mfSells: any[];
  netWorthHistory: any[];
  sips: any[];
  realEstateProperties: any[];
  realEstateDemands: any[];
  realEstatePayments: any[];
  vehicles: any[];
  dividends: any[];
  documents: any[];
  corporateActions: any[];
  healthInsurance: any[];
  creditScores: any[];
  billPayments: any[];
  billPaymentHistory: any[];
  govtSchemes: any[];
  salarySlips: any[];
  form26as: any[];
  dismissedAlerts: DismissedAlerts;
  masterData: MasterData;
  settings: Settings;
}

// ────────────────────────────────────────────────────────────
// Expense / Portfolio breakdown items used inside Metrics
// ────────────────────────────────────────────────────────────

export interface NameValuePair {
  name: string;
  value: number;
}

export interface PortfolioPerformanceItem {
  name: string;
  Invested: number;
  Current: number;
}

// ────────────────────────────────────────────────────────────
// Metrics — return type of the metrics useMemo in App.tsx
// ────────────────────────────────────────────────────────────

export interface Metrics {
  // Asset values
  cashInBanks: number;
  fdValue: number;
  rdValue: number;
  bondValue: number;
  ppfValue: number;
  npsValue: number;
  epfValue: number;
  licValue: number;
  investmentValue: number;
  mfValue: number;
  mfInvested: number;
  stockValue: number;
  stockInvested: number;

  // Liability values
  ccOutstanding: number;
  loansTakenValue: number;
  loansGivenValue: number;
  prepaidValue: number;
  rentalDepositLiability: number;
  rentedDepositAsset: number;

  // Aggregates
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;

  // Income & Expense
  monthIncome: number;
  monthExpense: number;
  annualIncome: number;
  subTotal: number;

  // P&L
  mfPnL: number;
  stockPnL: number;

  // Asset breakdown
  liquidAssets: number;
  lockedAssets: number;
  realEstateAsset: number;
  realEstateOutstanding: number;
  vehicleAsset: number;
  informalLentValue: number;
  informalBorrowedValue: number;
  rentalPropertiesAsset: number;

  // Ratios & rates
  savingsRate: number;
  debtToAssetRatio: number;

  // Tax
  taxDue: number;

  // Breakdowns
  expenseBreakdown: NameValuePair[];
  portfolioPerformance: PortfolioPerformanceItem[];

  // Goals
  totalGoalTarget: number;
  totalGoalSaved: number;
  totalGoalRemaining: number;
  overallGoalPct: number;
  goalsCompleted: number;

  // Credit health
  totalMonthlyEMI: number;
  foir: number;
  totalCCLimit: number;
  creditUtilization: number;

  // Stock breakdowns
  stockSectorBreakdown: NameValuePair[];
  stockCapBreakdown: NameValuePair[];
}

// ────────────────────────────────────────────────────────────
// Alert — items produced by the alerts useMemo
// ────────────────────────────────────────────────────────────

export interface Alert {
  level: "error" | "warn" | "info";
  title: string;
  detail: string;
  tab: string;
}

// ────────────────────────────────────────────────────────────
// SearchResult — items produced by the searchResults useMemo
// ────────────────────────────────────────────────────────────

export interface SearchResult {
  type: string;
  name: string;
  detail: string;
  tab: string;
}

// ────────────────────────────────────────────────────────────
// Navigation
// ────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
  directChildren?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}
