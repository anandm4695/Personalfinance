import React from "react";

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
}

export const DEFAULT_MASTER_DATA: MasterData = {
  transactionCategories: [
    "Food",
    "Rent",
    "Transport",
    "Shopping",
    "Bills",
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
};

export const MasterDataContext = React.createContext<MasterData>(DEFAULT_MASTER_DATA);
export const useMasterData = () => React.useContext(MasterDataContext);
