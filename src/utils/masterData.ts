import React from "react";

export interface FamilyProfile {
  id: string;
  name: string;
  relation: string;
  dob?: string; // YYYY-MM-DD
}

export interface MasterData {
  transactionCategories: string[];
  ccTransactionCategories: string[];
  prepaidCategories: string[];
  goalCategories: string[];
  mfCategories: string[];
  bankAccountTypes: string[];
  loanTypes: string[];
  prepaidCardTypes: string[];
  ccNetworks: string[];
  familyProfiles: FamilyProfile[];
}

/**
 * Calculates exact age in full completed years from a DOB string (YYYY-MM-DD) as of a reference date (defaults to today).
 * Returns null if DOB is not provided or invalid.
 */
export function calculateAge(
  dob?: string | null | FamilyProfile,
  asOfDate?: string | Date
): number | null {
  if (!dob) return null;
  const rawDob = typeof dob === "object" ? dob.dob : dob;
  if (!rawDob || typeof rawDob !== "string") return null;

  // Ensure we strip time component or parse safely in local timezone
  const dateStr = rawDob.includes("T") ? rawDob.split("T")[0] : rawDob;
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  const birthYear = parts[0];
  const birthMonth = parts[1] - 1;
  const birthDay = parts[2];
  if (birthMonth < 0 || birthMonth > 11 || birthDay < 1 || birthDay > 31) {
    return null;
  }
  const birth = new Date(birthYear, birthMonth, birthDay);
  if (
    isNaN(birth.getTime()) ||
    birth.getFullYear() !== birthYear ||
    birth.getMonth() !== birthMonth ||
    birth.getDate() !== birthDay
  ) {
    return null;
  }

  const ref = asOfDate
    ? typeof asOfDate === "string"
      ? (() => {
          const s = asOfDate.includes("T") ? asOfDate.split("T")[0] : asOfDate;
          const p = s.split("-").map(Number);
          return p.length >= 3 && !isNaN(p[0]) ? new Date(p[0], p[1] - 1, p[2]) : new Date(asOfDate);
        })()
      : asOfDate
    : new Date();

  if (isNaN(ref.getTime())) return null;

  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

/**
 * Formats age for UI display (e.g. "38 yrs", "8 mo", or null if no valid DOB).
 */
export function formatAge(
  dob?: string | null | FamilyProfile,
  asOfDate?: string | Date
): string | null {
  if (!dob) return null;
  const age = calculateAge(dob, asOfDate);
  if (age === null) return null;
  if (age === 0) {
    const rawDob = typeof dob === "object" ? dob.dob : dob;
    if (!rawDob || typeof rawDob !== "string") return "0 yrs";
    const dateStr = rawDob.includes("T") ? rawDob.split("T")[0] : rawDob;
    const parts = dateStr.split("-").map(Number);
    const birth = new Date(parts[0], parts[1] - 1, parts[2]);
    const ref = asOfDate
      ? typeof asOfDate === "string"
        ? new Date(asOfDate.includes("T") ? asOfDate : `${asOfDate}T00:00:00`)
        : asOfDate
      : new Date();
    const months =
      (ref.getFullYear() - birth.getFullYear()) * 12 +
      (ref.getMonth() - birth.getMonth());
    if (months > 0) return `${months} mo`;
    return "< 1 mo";
  }
  return `${age} yrs`;
}

/**
 * Checks if a member is a senior citizen (age >= 60) based on their DOB or FamilyProfile.
 */
export function isSeniorCitizen(
  dob?: string | null | FamilyProfile,
  asOfDate?: string | Date
): boolean {
  const age = calculateAge(dob, asOfDate);
  return age !== null && age >= 60;
}

/**
 * Checks if a member is a minor (age < 18) based on their DOB or FamilyProfile.
 */
export function isMinor(
  dob?: string | null | FamilyProfile,
  asOfDate?: string | Date
): boolean {
  const age = calculateAge(dob, asOfDate);
  return age !== null && age < 18;
}

// Formats a family profile for dropdowns/lists where the relation helps scanning.
export const formatProfileOption = (p: FamilyProfile) => `${p.name} (${p.relation})`;

// Formats a family profile including age if DOB is present.
export const formatProfileOptionWithAge = (
  p: FamilyProfile,
  asOfDate?: string | Date
) => {
  const ageStr = formatAge(p.dob, asOfDate);
  return ageStr ? `${p.name} (${p.relation} · ${ageStr})` : `${p.name} (${p.relation})`;
};

export const DEFAULT_MASTER_DATA: MasterData = {
  transactionCategories: [
    "Food",
    "Rent",
    "Transport",
    "Shopping",
    "Bills",
    "Credit Card",
    "Real Estate",
    "Salary",
    "Investment",
    "Tax",
    "Medical",
    "Entertainment",
    "EMI",
    "Insurance",
    "Subscription",
    "Groceries",
    "Utilities",
    "Transfer",
    "Other",
  ],
  ccTransactionCategories: [
    "General",
    "Food",
    "Groceries",
    "Shopping",
    "Transport",
    "Entertainment",
    "Medical",
    "Utilities",
    "Travel",
    "Payment",
    "Other",
  ],
  prepaidCategories: [
    "Food",
    "Groceries",
    "Transport",
    "Shopping",
    "Entertainment",
    "Medical",
    "Utilities",
    "Other",
  ],
  goalCategories: [
    "Wealth",
    "Retirement",
    "Home",
    "Vehicle",
    "Education",
    "Travel",
    "Emergency Fund",
    "Wedding",
    "Other",
  ],
  mfCategories: ["Equity", "Debt", "Hybrid", "ELSS", "Index", "Liquid", "International"],
  bankAccountTypes: ["Savings", "Current", "Salary", "Joint"],
  loanTypes: ["Personal", "Home", "Car", "Education", "Gold", "Business", "Other"],
  prepaidCardTypes: [
    "Meal Card",
    "Digital Wallet",
    "Travel Card",
    "Prepaid Card",
    "Gift Card",
    "Fuel Card",
  ],
  ccNetworks: ["Visa", "Mastercard", "Amex", "RuPay", "Diners"],
  familyProfiles: [
    { id: "self", name: "Anand Mohta", relation: "Self", dob: "1988-06-15" },
    { id: "wife", name: "Dharna Anand Mohta", relation: "Wife", dob: "1990-08-20" },
    { id: "daughter", name: "Revika Anand Mohta", relation: "Daughter", dob: "2018-10-12" },
    { id: "huf", name: "Anand Mohta HUF", relation: "HUF" },
  ],
};

export const MasterDataContext = React.createContext<MasterData>(DEFAULT_MASTER_DATA);
export const useMasterData = () => React.useContext(MasterDataContext);
