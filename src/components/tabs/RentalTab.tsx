import React, { useState, useMemo } from "react";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import {
  Building2,
  TrendingUp,
  Plus,
  Home,
  Receipt,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
  getEffectiveRent,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { getCurrentFY } from "../../utils/appConstants";
import {
  RentalPropertyModal,
  RentedInPropertyModal,
  RentalReceiptModal,
  RentalDeductionModal,
  RentalDepositTxModal,
} from "../modals/RentalModals";
import { RentalOverview } from "../rental/RentalOverview";
import { RentalPropertyCard } from "../rental/RentalPropertyCard";
import { RentalLedgerModal } from "../rental/RentalLedgerModal";

interface RentalTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  showToast?: (msg: string, type?: string) => void;
}

export const RentalTab: React.FC<RentalTabProps> = ({
  state,
  addItem,
  removeItem,
  updateItem,
  showToast,
}) => {
  const [sub, setSub] = useState<"out" | "in">("out");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expiring" | "ended">("all");

  // Property Modals State
  const [modalOut, setModalOut] = useState<{ open: boolean; editing: any }>({
    open: false,
    editing: null,
  });
  const [modalIn, setModalIn] = useState<{ open: boolean; editing: any }>({
    open: false,
    editing: null,
  });

  // Dedicated Ledger Modal State
  const [ledgerModal, setLedgerModal] = useState<{
    open?: boolean;
    property: any;
    type?: "out" | "in";
    initialTab?: "rent" | "deposit" | "csv" | "hra";
  } | null>(null);

  // Quick Log Transaction Modals State
  const [showLogModal, setShowLogModal] = useState<{
    type:
      | "payment"
      | "receipt"
      | "deduction"
      | "deposit_in"
      | "deposit_out"
      | "deposit_return_out"
      | "deposit_return_in";
    property: any;
    editing?: any;
  } | null>(null);

  const [savingLog, setSavingLog] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const propertiesOut = state.rentalProperties || [];
  const propertiesIn = state.rentedProperties || [];
  const bankAccounts = state.bankAccounts || [];

  const fyLabel = state.profile?.fy || getCurrentFY();
  const fyStart = fyLabel.split("-")[0] + "-04-01";
  const fyEnd = parseInt(fyLabel.split("-")[0]) + 1 + "-03-31";

  // Financial Calculations
  const getActualSecurityDeposit = (p: any) => {
    if (p.depositTransactions && p.depositTransactions.length > 0) {
      return p.depositTransactions.reduce(
        (sum: number, tx: any) => sum + Number(tx.amount || 0),
        0
      );
    }
    return Number(p.securityDeposit || 0);
  };

  const getExpectedFYRent = (p: any, fyStartStr: string) => {
    const [fyStartYear, fyStartMonth] = fyStartStr.slice(0, 7).split("-").map(Number);
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const y = fyStartYear + Math.floor((fyStartMonth - 1 + i) / 12);
      const m = ((fyStartMonth - 1 + i) % 12) + 1;
      total += getEffectiveRent(p, `${y}-${String(m).padStart(2, "0")}`);
    }
    return total;
  };

  const outMonthlyRent = propertiesOut
    .filter((p: any) => p.isActive !== false && (!p.agreementEnd || p.agreementEnd >= today()))
    .reduce((s: number, p: any) => s + getEffectiveRent(p), 0);

  const outExpectedFY = propertiesOut
    .filter((p: any) => p.isActive !== false && (!p.agreementEnd || p.agreementEnd >= fyStart))
    .reduce((s: number, p: any) => s + getExpectedFYRent(p, fyStart), 0);

  const outThisFY = propertiesOut.reduce(
    (s: number, p: any) =>
      s +
      (p.receipts || [])
        .filter((r: any) => r.date >= fyStart && r.date <= fyEnd)
        .reduce((ss: number, rr: any) => ss + Number(rr.amount || 0), 0),
    0
  );

  const outDepositHeld = propertiesOut.reduce(
    (s: number, p: any) =>
      s +
      Math.max(
        0,
        getActualSecurityDeposit(p) -
          (p.depositDeductions || []).reduce(
            (ss: number, dd: any) => ss + Number(dd.amount || 0),
            0
          ) -
          Number(p.depositReturned || 0)
      ),
    0
  );

  const inMonthlyRent = propertiesIn
    .filter((p: any) => p.isActive !== false && (!p.agreementEnd || p.agreementEnd >= today()))
    .reduce((s: number, p: any) => s + getEffectiveRent(p), 0);

  const inExpectedFY = propertiesIn
    .filter((p: any) => p.isActive !== false && (!p.agreementEnd || p.agreementEnd >= fyStart))
    .reduce((s: number, p: any) => s + getExpectedFYRent(p, fyStart), 0);

  const inThisFY = propertiesIn.reduce(
    (s: number, p: any) =>
      s +
      (p.payments || [])
        .filter((r: any) => r.date >= fyStart && r.date <= fyEnd)
        .reduce((ss: number, rr: any) => ss + Number(rr.amount || 0), 0),
    0
  );

  const inDepositPaid = propertiesIn.reduce(
    (s: number, p: any) =>
      s + Math.max(0, getActualSecurityDeposit(p) - Number(p.depositReturned || 0)),
    0
  );

  const municipalTaxPaid = propertiesOut.reduce(
    (s: number, p: any) => s + Number(p.municipalTax || 0),
    0
  );
  const outPropertyValuation = propertiesOut.reduce(
    (s: number, p: any) => s + Number(p.propertyValue || 0),
    0
  );
  const outTaxableIHP = Math.max(0, outThisFY - municipalTaxPaid) * 0.7;

  // Animated Numbers for the Hero Header
  const animOutMonthlyRent = useAnimatedNumber(outMonthlyRent);
  const animInMonthlyRent = useAnimatedNumber(inMonthlyRent);

  // Status Filter Counts Calculator
  const getCounts = (list: any[]) => {
    const todayMs = new Date(today() + "T00:00:00").getTime();
    let active = 0;
    let expiring = 0;
    let ended = 0;

    list.forEach((p) => {
      const endDate = p.agreementEnd ? new Date(p.agreementEnd + "T00:00:00") : null;
      const days = endDate ? Math.ceil((endDate.getTime() - todayMs) / 86400000) : null;
      const isEnded = p.isActive === false || (days !== null && days < 0);

      if (isEnded) {
        ended++;
      } else {
        active++;
        if (days !== null && days >= 0 && days <= 30) {
          expiring++;
        }
      }
    });

    return { total: list.length, active, expiring, ended };
  };

  const outCounts = useMemo(() => getCounts(propertiesOut), [propertiesOut]);
  const inCounts = useMemo(() => getCounts(propertiesIn), [propertiesIn]);

  // Filtered Properties
  const filteredList = useMemo(() => {
    const currentList = sub === "out" ? propertiesOut : propertiesIn;
    const todayMs = new Date(today() + "T00:00:00").getTime();

    return currentList.filter((p: any) => {
      // Search query matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = p.propertyName?.toLowerCase().includes(q);
        const tenantMatch = p.tenantName?.toLowerCase().includes(q);
        const landlordMatch = p.landlordName?.toLowerCase().includes(q);
        const multiTenantMatch = (p.tenants || []).some((t: any) =>
          t.name?.toLowerCase().includes(q)
        );
        const multiLandlordMatch = (p.landlords || []).some((l: any) =>
          l.name?.toLowerCase().includes(q)
        );
        if (
          !nameMatch &&
          !tenantMatch &&
          !landlordMatch &&
          !multiTenantMatch &&
          !multiLandlordMatch
        ) {
          return false;
        }
      }

      // Status filter matching
      const endDate = p.agreementEnd ? new Date(p.agreementEnd + "T00:00:00") : null;
      const days = endDate ? Math.ceil((endDate.getTime() - todayMs) / 86400000) : null;
      const isEnded = p.isActive === false || (days !== null && days < 0);

      if (statusFilter === "active" && isEnded) return false;
      if (statusFilter === "expiring" && (isEnded || days === null || days < 0 || days > 30))
        return false;
      if (statusFilter === "ended" && !isEnded) return false;

      return true;
    });
  }, [sub, propertiesOut, propertiesIn, searchQuery, statusFilter]);

  // Handlers for Properties
  const handleAddOut = async (data: any) => {
    setSavingProperty(true);
    try {
      await addItem("rentalProperties", {
        ...data,
        receipts: [],
        depositDeductions: [],
        depositReturned: 0,
        depositTransactions: [],
      });
      setModalOut({ open: false, editing: null });
      showToast?.("Rental property added successfully", "success");
    } catch (e: any) {
      showToast?.(`Failed to save property: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingProperty(false);
    }
  };

  const handleEditOut = async (data: any) => {
    if (!modalOut.editing) return;
    setSavingProperty(true);
    try {
      await updateItem("rentalProperties", modalOut.editing.id, {
        ...data,
        receipts: modalOut.editing.receipts || [],
        depositDeductions: modalOut.editing.depositDeductions || [],
        depositTransactions: modalOut.editing.depositTransactions || [],
        depositReturned: modalOut.editing.depositReturned || 0,
      });
      setModalOut({ open: false, editing: null });
      showToast?.("Property updated successfully", "success");
    } catch (e: any) {
      showToast?.(`Failed to update property: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingProperty(false);
    }
  };

  const handleAddIn = async (data: any) => {
    setSavingProperty(true);
    try {
      await addItem("rentedProperties", {
        ...data,
        payments: [],
        depositReturned: 0,
        depositTransactions: [],
      });
      setModalIn({ open: false, editing: null });
      showToast?.("Rented property added successfully", "success");
    } catch (e: any) {
      showToast?.(`Failed to save property: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingProperty(false);
    }
  };

  const handleEditIn = async (data: any) => {
    if (!modalIn.editing) return;
    setSavingProperty(true);
    try {
      await updateItem("rentedProperties", modalIn.editing.id, {
        ...data,
        payments: modalIn.editing.payments || [],
        depositTransactions: modalIn.editing.depositTransactions || [],
        depositReturned: modalIn.editing.depositReturned || 0,
      });
      setModalIn({ open: false, editing: null });
      showToast?.("Rented property updated successfully", "success");
    } catch (e: any) {
      showToast?.(`Failed to update property: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingProperty(false);
    }
  };

  const handleDeleteProperty = (property: any, isOutMode: boolean) => {
    const collection = isOutMode ? "rentalProperties" : "rentedProperties";
    setConfirmRemove({
      message: `Delete "${property.propertyName}"? All associated ledger transactions, deposits, and linked bank transactions will be removed.`,
      onConfirm: async () => {
        // Remove any linked transactions in transactions table
        const linkedTxns = (state.transactions || []).filter(
          (tx: any) => tx.linkedType === collection && tx.linkedId === property.id
        );
        for (const tx of linkedTxns) {
          await removeItem("transactions", tx.id);
        }
        await removeItem(collection, property.id);
        showToast?.(`"${property.propertyName}" and linked transactions removed`, "info");
      },
    });
  };

  // Handlers for Receipts / Payments with Bank Account Auto-Sync
  const handleSaveReceipt = async (p: any, receiptData: any, editingId?: string) => {
    setSavingLog(true);
    try {
      const existingReceipt = editingId
        ? (p.receipts || []).find((r: any) => r.id === editingId)
        : null;
      const receiptId = editingId || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      let linkedTxnId = existingReceipt?.linkedTxnId;
      const effectiveBankId =
        receiptData.postToBank && receiptData.bankAccountId
          ? receiptData.bankAccountId
          : receiptData.bankAccountId || "";

      const bank = bankAccounts.find((b: any) => b.id === effectiveBankId);

      if (effectiveBankId) {
        if (linkedTxnId) {
          await updateItem("transactions", linkedTxnId, {
            id: linkedTxnId,
            owner: p.owner || "self",
            date: receiptData.date || today(),
            accountId: effectiveBankId,
            type: "credit",
            amount: Number(receiptData.amount),
            category: "Rental Income",
            note: `Rent Receipt: ${p.propertyName}${receiptData.month ? ` (${receiptData.month})` : ""}`,
            narration: `Rent received from ${p.tenantName || "Tenant"} for ${p.propertyName}`,
            referenceNumber: receiptData.receiptNumber || undefined,
            linkedType: "rentalProperties",
            linkedId: p.id,
            linkedSubId: receiptId,
          });
        } else {
          const newTxnId = `txn-rent-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          await addItem("transactions", {
            id: newTxnId,
            owner: p.owner || "self",
            date: receiptData.date || today(),
            accountId: effectiveBankId,
            type: "credit",
            amount: Number(receiptData.amount),
            category: "Rental Income",
            note: `Rent Receipt: ${p.propertyName}${receiptData.month ? ` (${receiptData.month})` : ""}`,
            narration: `Rent received from ${p.tenantName || "Tenant"} for ${p.propertyName}`,
            referenceNumber: receiptData.receiptNumber || undefined,
            linkedType: "rentalProperties",
            linkedId: p.id,
            linkedSubId: receiptId,
          });
          linkedTxnId = newTxnId;
        }
      } else if (linkedTxnId) {
        await removeItem("transactions", linkedTxnId);
        linkedTxnId = undefined;
      }

      const receiptRecord = {
        ...receiptData,
        id: receiptId,
        bankAccountId: effectiveBankId || undefined,
        linkedTxnId: linkedTxnId || undefined,
      };

      let updatedReceipts = [];
      if (editingId) {
        updatedReceipts = (p.receipts || []).map((r: any) =>
          r.id === editingId ? receiptRecord : r
        );
      } else {
        updatedReceipts = [...(p.receipts || []), receiptRecord];
      }

      await updateItem("rentalProperties", p.id, { ...p, receipts: updatedReceipts });
      setShowLogModal(null);
      if (ledgerModal?.property?.id === p.id) {
        setLedgerModal({
          ...ledgerModal,
          property: { ...p, receipts: updatedReceipts },
        });
      }

      if (effectiveBankId && bank) {
        showToast?.(
          `Rent receipt logged & ₹${Number(receiptData.amount).toLocaleString("en-IN")} credited in ${bank.bankName}`,
          "success"
        );
      } else {
        showToast?.(editingId ? "Receipt updated" : "Rent receipt logged", "success");
      }
    } catch (e: any) {
      showToast?.(`Failed to save receipt: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleRemoveReceipt = (p: any, receiptId: string) => {
    const rec = (p.receipts || []).find((r: any) => r.id === receiptId);
    setConfirmRemove({
      message: `Delete this rent receipt for "${p.propertyName}"? This cannot be undone.`,
      onConfirm: async () => {
        if (rec?.linkedTxnId) {
          await removeItem("transactions", rec.linkedTxnId);
        }
        const updatedReceipts = (p.receipts || []).filter((r: any) => r.id !== receiptId);
        await updateItem("rentalProperties", p.id, { ...p, receipts: updatedReceipts });
        if (ledgerModal?.property?.id === p.id) {
          setLedgerModal({
            ...ledgerModal,
            property: { ...p, receipts: updatedReceipts },
          });
        }
        showToast?.("Receipt deleted and bank transaction removed", "info");
      },
    });
  };

  const handleSavePayment = async (p: any, paymentData: any, editingId?: string) => {
    setSavingLog(true);
    try {
      const existingPayment = editingId
        ? (p.payments || []).find((r: any) => r.id === editingId)
        : null;
      const paymentId = editingId || `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      let linkedTxnId = existingPayment?.linkedTxnId;
      const effectiveBankId =
        paymentData.postToBank && paymentData.bankAccountId
          ? paymentData.bankAccountId
          : paymentData.bankAccountId || "";

      const bank = bankAccounts.find((b: any) => b.id === effectiveBankId);

      if (effectiveBankId) {
        if (linkedTxnId) {
          await updateItem("transactions", linkedTxnId, {
            id: linkedTxnId,
            owner: p.owner || "self",
            date: paymentData.date || today(),
            accountId: effectiveBankId,
            type: "debit",
            amount: Number(paymentData.amount),
            category: "Rent",
            note: `Rent Payment: ${p.propertyName}${paymentData.month ? ` (${paymentData.month})` : ""}`,
            narration: `Rent paid to ${p.landlordName || "Landlord"} for ${p.propertyName}`,
            referenceNumber: paymentData.receiptNumber || undefined,
            linkedType: "rentedProperties",
            linkedId: p.id,
            linkedSubId: paymentId,
          });
        } else {
          const newTxnId = `txn-rent-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          await addItem("transactions", {
            id: newTxnId,
            owner: p.owner || "self",
            date: paymentData.date || today(),
            accountId: effectiveBankId,
            type: "debit",
            amount: Number(paymentData.amount),
            category: "Rent",
            note: `Rent Payment: ${p.propertyName}${paymentData.month ? ` (${paymentData.month})` : ""}`,
            narration: `Rent paid to ${p.landlordName || "Landlord"} for ${p.propertyName}`,
            referenceNumber: paymentData.receiptNumber || undefined,
            linkedType: "rentedProperties",
            linkedId: p.id,
            linkedSubId: paymentId,
          });
          linkedTxnId = newTxnId;
        }
      } else if (linkedTxnId) {
        await removeItem("transactions", linkedTxnId);
        linkedTxnId = undefined;
      }

      const paymentRecord = {
        ...paymentData,
        id: paymentId,
        bankAccountId: effectiveBankId || undefined,
        linkedTxnId: linkedTxnId || undefined,
      };

      let updatedPayments = [];
      if (editingId) {
        updatedPayments = (p.payments || []).map((pay: any) =>
          pay.id === editingId ? paymentRecord : pay
        );
      } else {
        updatedPayments = [...(p.payments || []), paymentRecord];
      }

      await updateItem("rentedProperties", p.id, { ...p, payments: updatedPayments });
      setShowLogModal(null);
      if (ledgerModal?.property?.id === p.id) {
        setLedgerModal({
          ...ledgerModal,
          property: { ...p, payments: updatedPayments },
        });
      }

      if (effectiveBankId && bank) {
        showToast?.(
          `Rent payment logged & ₹${Number(paymentData.amount).toLocaleString("en-IN")} debited from ${bank.bankName}`,
          "success"
        );
      } else {
        showToast?.(editingId ? "Payment updated" : "Rent payment logged", "success");
      }
    } catch (e: any) {
      showToast?.(`Failed to save payment: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleRemovePayment = (p: any, paymentId: string) => {
    const pay = (p.payments || []).find((r: any) => r.id === paymentId);
    setConfirmRemove({
      message: `Delete this rent payment for "${p.propertyName}"? This cannot be undone.`,
      onConfirm: async () => {
        if (pay?.linkedTxnId) {
          await removeItem("transactions", pay.linkedTxnId);
        }
        const updatedPayments = (p.payments || []).filter((pay: any) => pay.id !== paymentId);
        await updateItem("rentedProperties", p.id, { ...p, payments: updatedPayments });
        if (ledgerModal?.property?.id === p.id) {
          setLedgerModal({
            ...ledgerModal,
            property: { ...p, payments: updatedPayments },
          });
        }
        showToast?.("Payment deleted and bank transaction removed", "info");
      },
    });
  };

  // Handlers for Deposit Installments & Deductions
  const handleSaveDepositTx = async (
    p: any,
    isOutMode: boolean,
    depositData: any,
    editingId?: string
  ) => {
    setSavingLog(true);
    try {
      const collection = isOutMode ? "rentalProperties" : "rentedProperties";
      const existingDeposit = editingId
        ? (p.depositTransactions || []).find((t: any) => t.id === editingId)
        : null;
      const depositId = editingId || `dep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      let linkedTxnId = existingDeposit?.linkedTxnId;
      const effectiveBankId =
        depositData.postToBank && depositData.bankAccountId
          ? depositData.bankAccountId
          : depositData.bankAccountId || "";

      const bank = bankAccounts.find((b: any) => b.id === effectiveBankId);

      if (effectiveBankId) {
        const txnType = isOutMode ? "credit" : "debit";
        const noteText = isOutMode
          ? `Security Deposit Received: ${p.propertyName}${depositData.note ? ` (${depositData.note})` : ""}`
          : `Security Deposit Paid: ${p.propertyName}${depositData.note ? ` (${depositData.note})` : ""}`;
        const narrationText = isOutMode
          ? `Security deposit received from ${p.tenantName || "Tenant"} for ${p.propertyName}`
          : `Security deposit paid to ${p.landlordName || "Landlord"} for ${p.propertyName}`;

        if (linkedTxnId) {
          await updateItem("transactions", linkedTxnId, {
            id: linkedTxnId,
            owner: p.owner || "self",
            date: depositData.date || today(),
            accountId: effectiveBankId,
            type: txnType,
            amount: Number(depositData.amount),
            category: "Security Deposit",
            note: noteText,
            narration: narrationText,
            linkedType: collection,
            linkedId: p.id,
            linkedSubId: depositId,
          });
        } else {
          const newTxnId = `txn-dep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          await addItem("transactions", {
            id: newTxnId,
            owner: p.owner || "self",
            date: depositData.date || today(),
            accountId: effectiveBankId,
            type: txnType,
            amount: Number(depositData.amount),
            category: "Security Deposit",
            note: noteText,
            narration: narrationText,
            linkedType: collection,
            linkedId: p.id,
            linkedSubId: depositId,
          });
          linkedTxnId = newTxnId;
        }
      } else if (linkedTxnId) {
        await removeItem("transactions", linkedTxnId);
        linkedTxnId = undefined;
      }

      const depositRecord = {
        ...depositData,
        id: depositId,
        bankAccountId: effectiveBankId || undefined,
        linkedTxnId: linkedTxnId || undefined,
      };

      let updated = [];
      if (editingId) {
        updated = (p.depositTransactions || []).map((t: any) =>
          t.id === editingId ? depositRecord : t
        );
      } else {
        updated = [...(p.depositTransactions || []), depositRecord];
      }

      await updateItem(collection, p.id, { ...p, depositTransactions: updated });
      setShowLogModal(null);
      if (ledgerModal?.property?.id === p.id) {
        setLedgerModal({
          ...ledgerModal,
          property: { ...p, depositTransactions: updated },
        });
      }
      if (effectiveBankId && bank) {
        showToast?.(
          `Deposit entry logged & auto-posted in ${bank.bankName}`,
          "success"
        );
      } else {
        showToast?.("Deposit entry logged", "success");
      }
    } catch (e: any) {
      showToast?.(`Failed to save deposit entry: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleRemoveDepositTx = (p: any, isOutMode: boolean, depositId: string) => {
    const dep = (p.depositTransactions || []).find((t: any) => t.id === depositId);
    setConfirmRemove({
      message: `Delete this deposit entry for "${p.propertyName}"?`,
      onConfirm: async () => {
        if (dep?.linkedTxnId) {
          await removeItem("transactions", dep.linkedTxnId);
        }
        const collection = isOutMode ? "rentalProperties" : "rentedProperties";
        const updated = (p.depositTransactions || []).filter((t: any) => t.id !== depositId);
        await updateItem(collection, p.id, { ...p, depositTransactions: updated });
        if (ledgerModal?.property?.id === p.id) {
          setLedgerModal({
            ...ledgerModal,
            property: { ...p, depositTransactions: updated },
          });
        }
        showToast?.("Deposit entry removed", "info");
      },
    });
  };

  const handleSaveDeduction = async (p: any, deductionData: any, editingId?: string) => {
    setSavingLog(true);
    try {
      let updatedDeductions = [];
      if (editingId) {
        updatedDeductions = (p.depositDeductions || []).map((d: any) =>
          d.id === editingId ? { ...deductionData, id: editingId } : d
        );
      } else {
        updatedDeductions = [
          ...(p.depositDeductions || []),
          { ...deductionData, id: `ded-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
        ];
      }
      await updateItem("rentalProperties", p.id, { ...p, depositDeductions: updatedDeductions });
      setShowLogModal(null);
      if (ledgerModal?.property?.id === p.id) {
        setLedgerModal({
          ...ledgerModal,
          property: { ...p, depositDeductions: updatedDeductions },
        });
      }
      showToast?.(editingId ? "Deduction updated" : "Deduction added", "success");
    } catch (e: any) {
      showToast?.(`Failed to save deduction: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleRemoveDeduction = (p: any, deductionId: string) => {
    setConfirmRemove({
      message: `Delete this deposit deduction for "${p.propertyName}"?`,
      onConfirm: async () => {
        const updatedDeductions = (p.depositDeductions || []).filter(
          (d: any) => d.id !== deductionId
        );
        await updateItem("rentalProperties", p.id, { ...p, depositDeductions: updatedDeductions });
        if (ledgerModal?.property?.id === p.id) {
          setLedgerModal({
            ...ledgerModal,
            property: { ...p, depositDeductions: updatedDeductions },
          });
        }
        showToast?.("Deduction deleted", "info");
      },
    });
  };

  const handleSaveDepositReturn = async (p: any, isOutMode: boolean, data: any) => {
    setSavingLog(true);
    try {
      const collection = isOutMode ? "rentalProperties" : "rentedProperties";
      const nextReturned = Number(p.depositReturned || 0) + Number(data.amount || 0);

      const effectiveBankId =
        data.postToBank && data.bankAccountId
          ? data.bankAccountId
          : data.bankAccountId || "";

      const bank = bankAccounts.find((b: any) => b.id === effectiveBankId);

      if (effectiveBankId) {
        const txnType = isOutMode ? "debit" : "credit";
        const noteText = isOutMode
          ? `Deposit Refunded to Tenant: ${p.propertyName}${data.note ? ` (${data.note})` : ""}`
          : `Deposit Refund Received: ${p.propertyName}${data.note ? ` (${data.note})` : ""}`;
        const narrationText = isOutMode
          ? `Security deposit refunded to ${p.tenantName || "Tenant"} for ${p.propertyName}`
          : `Security deposit refund received from ${p.landlordName || "Landlord"} for ${p.propertyName}`;

        const newTxnId = `txn-depret-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        await addItem("transactions", {
          id: newTxnId,
          owner: p.owner || "self",
          date: data.date || today(),
          accountId: effectiveBankId,
          type: txnType,
          amount: Number(data.amount),
          category: "Security Deposit",
          note: noteText,
          narration: narrationText,
          linkedType: collection,
          linkedId: p.id,
        });
      }

      await updateItem(collection, p.id, {
        ...p,
        depositReturned: nextReturned,
      });
      setShowLogModal(null);
      if (ledgerModal?.property?.id === p.id) {
        setLedgerModal({
          ...ledgerModal,
          property: { ...p, depositReturned: nextReturned },
        });
      }
      if (effectiveBankId && bank) {
        showToast?.(`Deposit return logged & recorded in ${bank.bankName}`, "success");
      } else {
        showToast?.("Deposit return logged successfully", "success");
      }
    } catch (e: any) {
      showToast?.(`Failed to save deposit return: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingLog(false);
    }
  };

  // Bulk CSV Import Handler
  const handleBulkImport = async (p: any, rows: any[]) => {
    try {
      const isOutMode = sub === "out";
      const collection = isOutMode ? "rentalProperties" : "rentedProperties";
      const key = isOutMode ? "receipts" : "payments";
      const nextItems = [...(p[key] || []), ...rows];
      await updateItem(collection, p.id, {
        ...p,
        [key]: nextItems,
      });
      showToast?.(`Successfully imported ${rows.length} records`, "success");
    } catch (e: any) {
      showToast?.(`Bulk import failed: ${e?.message || "Unknown error"}`, "error");
    }
  };

  // CSV Export Handler
  const handleExportCsv = (p: any, type: "receipts" | "payments") => {
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const items = type === "receipts" ? p.receipts || [] : p.payments || [];
    const rows = [
      "Month,Date,Amount,Note",
      ...items.map((r: any) => [q(r.month), q(r.date), q(r.amount), q(r.note || "")].join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.propertyName}_${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.(`Exported ${items.length} records to CSV`, "info");
  };

  return (
    <div className="tab-content-enter">
      {/* ── Section Title Header ── */}
      <SectionTitle
        sub={`Track agreements, receipts & deposits for ${fyLabel}`}
        rightElement={
          <Button
            variant="accent"
            icon={<Plus size={14} />}
            onClick={() =>
              sub === "out"
                ? setModalOut({ open: true, editing: null })
                : setModalIn({ open: true, editing: null })
            }
          >
            {sub === "out" ? "Add Property" : "Add Rented Property"}
          </Button>
        }
      >
        Rental Details
      </SectionTitle>

      {/* ── Executive Overview & Toolbar ── */}
      <RentalOverview
        sub={sub}
        setSub={(t) => {
          setSub(t);
          setSearchQuery("");
          setStatusFilter("all");
        }}
        propertiesOut={propertiesOut}
        propertiesIn={propertiesIn}
        outMonthlyRent={outMonthlyRent}
        inMonthlyRent={inMonthlyRent}
        animOutMonthlyRent={animOutMonthlyRent}
        animInMonthlyRent={animInMonthlyRent}
        outThisFY={outThisFY}
        inThisFY={inThisFY}
        outExpectedFY={outExpectedFY}
        inExpectedFY={inExpectedFY}
        outDepositHeld={outDepositHeld}
        inDepositPaid={inDepositPaid}
        outPropertyValuation={outPropertyValuation}
        outTaxableIHP={outTaxableIHP}
        municipalTaxPaid={municipalTaxPaid}
        fyLabel={fyLabel}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onAddNew={() =>
          sub === "out"
            ? setModalOut({ open: true, editing: null })
            : setModalIn({ open: true, editing: null })
        }
        counts={{
          outTotal: outCounts.total,
          outActive: outCounts.active,
          outExpiring: outCounts.expiring,
          outEnded: outCounts.ended,
          inTotal: inCounts.total,
          inActive: inCounts.active,
          inExpiring: inCounts.expiring,
          inEnded: inCounts.ended,
        }}
      />

      {/* ── Main Properties Grid or Empty States ── */}
      {filteredList.length === 0 ? (
        (sub === "out" ? propertiesOut.length : propertiesIn.length) === 0 ? (
          <EmptyState
            icon={Building2}
            gradient={
              sub === "out"
                ? `linear-gradient(135deg, ${THEME.sage} 0%, color-mix(in srgb, ${THEME.sage} 55%, white) 100%)`
                : `linear-gradient(135deg, ${THEME.pink} 0%, color-mix(in srgb, ${THEME.pink} 55%, white) 100%)`
            }
            dotColor={sub === "out" ? THEME.sage : THEME.pink}
            title={sub === "out" ? "No Properties Rented Out" : "No Rented Properties Added"}
            description={
              sub === "out"
                ? "Add your shop, flat, or commercial space to track monthly rent receipts, security deposits, and taxable income under IHP."
                : "Add the home or office you rent to track your monthly payments, security deposit recovery, and annual rent paid for HRA claims."
            }
            pills={
              sub === "out"
                ? ["Rent Receipt Ledger", "Security Deposit", "Taxable IHP Income", "Tenant Tracking"]
                : ["Rent Payment Log", "HRA Claim Support", "Security Deposit", "Landlord Details"]
            }
            buttonLabel={sub === "out" ? "Add Property" : "Add Rented Property"}
            onAdd={() =>
              sub === "out"
                ? setModalOut({ open: true, editing: null })
                : setModalIn({ open: true, editing: null })
            }
          />
        ) : (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "var(--surface-0)",
              borderRadius: 16,
              border: `1px dashed ${THEME.line}`,
            }}
          >
            <Layers size={36} color={THEME.muted} style={{ opacity: 0.5, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              No properties match your filter
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4, marginBottom: 16 }}>
              Try adjusting your search query or status filter.
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Reset Filters
            </Button>
          </div>
        )
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
            gap: 16,
          }}
        >
          {filteredList.map((p: any) => (
            <RentalPropertyCard
              key={p.id}
              property={p}
              type={sub}
              fyStart={fyStart}
              fyEnd={fyEnd}
              onEdit={(property) =>
                sub === "out"
                  ? setModalOut({ open: true, editing: property })
                  : setModalIn({ open: true, editing: property })
              }
              onDelete={(property) => handleDeleteProperty(property, sub === "out")}
              onOpenLedger={(property, tabChoice) =>
                setLedgerModal({
                  open: true,
                  property,
                  type: sub,
                  initialTab: tabChoice || "rent",
                })
              }
              onQuickLogRent={(property) =>
                setShowLogModal({
                  type: sub === "out" ? "receipt" : "payment",
                  property,
                })
              }
              onQuickLogDeposit={(property) =>
                setShowLogModal({
                  type: sub === "out" ? "deposit_out" : "deposit_in",
                  property,
                })
              }
            />
          ))}
        </div>
      )}

      {/* ── Bottom Net Rental P&L ── */}
      {(propertiesOut.length > 0 || propertiesIn.length > 0) && (
        <div
          style={{
            marginTop: 36,
            padding: "20px 24px",
            borderRadius: 16,
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: THEME.ink,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TrendingUp size={15} color={THEME.accent} /> Rental P&L · FY {fyLabel}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            {[
              { label: "Income Received", value: outThisFY, color: THEME.sage, sign: "+" },
              { label: "Rent Paid Out", value: inThisFY, color: THEME.rust, sign: "-" },
              {
                label: "Net Cashflow",
                value: outThisFY - inThisFY,
                color: outThisFY >= inThisFY ? THEME.sage : THEME.rust,
                sign: outThisFY >= inThisFY ? "+" : "-",
              },
            ].map(({ label, value, color, sign }) => (
              <div
                key={label}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${color} 4%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 13%, transparent)`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    lineHeight: 1.3,
                    minHeight: 22,
                    marginBottom: 6,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 800,
                    color,
                  }}
                >
                  {value !== 0
                    ? label === "Net Cashflow"
                      ? outThisFY >= inThisFY
                        ? "+"
                        : "-"
                      : sign
                    : ""}
                  <Money value={Math.abs(value)} variant="full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Add / Edit Rental Property (Out) */}
      {modalOut.open && (
        <RentalPropertyModal
          initial={modalOut.editing}
          bankAccounts={bankAccounts}
          onClose={() => setModalOut({ open: false, editing: null })}
          onSave={modalOut.editing ? handleEditOut : handleAddOut}
          saving={savingProperty}
        />
      )}

      {/* Add / Edit Rented In Property (In) */}
      {modalIn.open && (
        <RentedInPropertyModal
          initial={modalIn.editing}
          bankAccounts={bankAccounts}
          onClose={() => setModalIn({ open: false, editing: null })}
          onSave={modalIn.editing ? handleEditIn : handleAddIn}
          saving={savingProperty}
        />
      )}

      {/* Comprehensive Ledger & Deposit Modal */}
      {ledgerModal && (
        <RentalLedgerModal
          property={ledgerModal.property}
          type={ledgerModal.type || "out"}
          initialTab={ledgerModal.initialTab}
          bankAccounts={bankAccounts}
          fyStart={fyStart}
          fyEnd={fyEnd}
          onClose={() => setLedgerModal(null)}
          onLogRent={(p, editing) =>
            setShowLogModal({
              type: ledgerModal.type === "out" ? "receipt" : "payment",
              property: p,
              editing,
            })
          }
          onRemoveRent={(p, id) =>
            ledgerModal.type === "out"
              ? handleRemoveReceipt(p, id)
              : handleRemovePayment(p, id)
          }
          onLogDeposit={(p, editing) =>
            setShowLogModal({
              type: ledgerModal.type === "out" ? "deposit_out" : "deposit_in",
              property: p,
              editing,
            })
          }
          onRemoveDeposit={(p, id) =>
            handleRemoveDepositTx(p, ledgerModal.type === "out", id)
          }
          onLogDeduction={(p, editing) =>
            setShowLogModal({
              type: "deduction",
              property: p,
              editing,
            })
          }
          onRemoveDeduction={(p, id) => handleRemoveDeduction(p, id)}
          onReturnDeposit={(p) =>
            setShowLogModal({
              type:
                ledgerModal.type === "out"
                  ? "deposit_return_out"
                  : "deposit_return_in",
              property: p,
            })
          }
          onBulkImport={handleBulkImport}
          onExportCsv={handleExportCsv}
        />
      )}

      {/* Log / Edit Payment Modal (Rented In) */}
      {showLogModal && showLogModal.type === "payment" && (
        <RentalReceiptModal
          title={showLogModal.editing ? "Edit Rent Payment" : "Log Rent Payment"}
          amountLabel="Amount Paid (₹)"
          saveLabel={showLogModal.editing ? "Update Payment" : "Log Payment"}
          initial={showLogModal.editing}
          property={showLogModal.property}
          bankAccounts={bankAccounts}
          type="payment"
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) =>
            handleSavePayment(showLogModal.property, data, showLogModal.editing?.id)
          }
          saving={savingLog}
        />
      )}

      {/* Log / Edit Receipt Modal (Rented Out) */}
      {showLogModal && showLogModal.type === "receipt" && (
        <RentalReceiptModal
          title={showLogModal.editing ? "Edit Rent Receipt" : "Log Rent Receipt"}
          amountLabel="Amount Received (₹)"
          saveLabel={showLogModal.editing ? "Update Receipt" : "Log Receipt"}
          initial={showLogModal.editing}
          property={showLogModal.property}
          bankAccounts={bankAccounts}
          type="receipt"
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) =>
            handleSaveReceipt(showLogModal.property, data, showLogModal.editing?.id)
          }
          saving={savingLog}
        />
      )}

      {/* Log / Edit Deduction Modal (Rented Out) */}
      {showLogModal && showLogModal.type === "deduction" && (
        <RentalDeductionModal
          initial={showLogModal.editing}
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) =>
            handleSaveDeduction(showLogModal.property, data, showLogModal.editing?.id)
          }
          saving={savingLog}
        />
      )}

      {/* Log / Edit Deposit Payment Modal (Rented In) */}
      {showLogModal && showLogModal.type === "deposit_in" && (
        <RentalDepositTxModal
          title={showLogModal.editing ? "Edit Deposit Payment" : "Log Deposit Payment (Rent In)"}
          amountLabel="Deposit Amount Paid (₹)"
          saveLabel={showLogModal.editing ? "Update Deposit" : "Log Deposit Payment"}
          initial={showLogModal.editing}
          property={showLogModal.property}
          bankAccounts={bankAccounts}
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) =>
            handleSaveDepositTx(
              showLogModal.property,
              false,
              data,
              showLogModal.editing?.id
            )
          }
          saving={savingLog}
        />
      )}

      {/* Log Deposit Receipt Modal (Rented Out) */}
      {showLogModal && showLogModal.type === "deposit_out" && (
        <RentalDepositTxModal
          title="Log Deposit Receipt (Rent Out)"
          amountLabel="Deposit Amount Received (₹)"
          saveLabel="Log Deposit Receipt"
          property={showLogModal.property}
          bankAccounts={bankAccounts}
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) => handleSaveDepositTx(showLogModal.property, true, data)}
          saving={savingLog}
        />
      )}

      {/* Log Deposit Return Modal (Rented Out — landlord refunding tenant) */}
      {showLogModal && showLogModal.type === "deposit_return_out" && (
        <RentalDepositTxModal
          title="Log Deposit Return to Tenant"
          amountLabel="Amount Returned (₹)"
          saveLabel="Log Return"
          property={showLogModal.property}
          bankAccounts={bankAccounts}
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) => handleSaveDepositReturn(showLogModal.property, true, data)}
          saving={savingLog}
        />
      )}

      {/* Log Deposit Return Modal (Rented In — landlord refunding you) */}
      {showLogModal && showLogModal.type === "deposit_return_in" && (
        <RentalDepositTxModal
          title="Log Deposit Refund Received"
          amountLabel="Amount Refunded to You (₹)"
          saveLabel="Log Refund"
          property={showLogModal.property}
          bankAccounts={bankAccounts}
          onClose={() => setShowLogModal(null)}
          onSave={(data: any) => handleSaveDepositReturn(showLogModal.property, false, data)}
          saving={savingLog}
        />
      )}

      {/* Confirm Dialog */}
      {confirmRemove && (
        <ConfirmDialog
          message={confirmRemove.message}
          onConfirm={() => {
            confirmRemove.onConfirm();
            setConfirmRemove(null);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
};
