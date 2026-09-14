import React, { useState, useMemo } from "react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, uid } from "../../utils/finance";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { ConfirmDialog } from "../ui/Feedback";
import { EmptyState } from "../ui/EmptyState";
import { Shield, Plus } from "lucide-react";
import { Button } from "../ui/Button";

// Sub-components
import {
  InsuranceSubTab,
  UnifiedInsurancePolicy,
  getNextPremiumDueDate,
} from "../insurance/InsuranceTypes";
import { InsuranceHeader } from "../insurance/InsuranceHeader";
import { InsuranceStatCards } from "../insurance/InsuranceStatCards";
import { InsurancePolicyCard } from "../insurance/InsurancePolicyCard";
import { InsuranceTableView } from "../insurance/InsuranceTableView";
import { InsurancePremiumCalendar } from "../insurance/InsurancePremiumCalendar";
import { InsuranceProtectionAnalyzer } from "../insurance/InsuranceProtectionAnalyzer";
import { AddEditPolicyModal, PolicyLedgerDrawerModal } from "../insurance/InsuranceModals";

// Re-exports for backwards compatibility
import {
  InsurerLogo,
  LicLogo,
  BrandLogo,
  CANONICAL_BRANDS,
} from "../ui/BrandLogos";

export { InsurerLogo, LicLogo, BrandLogo };
export const INSURER_LOGOS: Record<string, string> = Object.fromEntries(
  Object.entries(CANONICAL_BRANDS).map(([k, v]) => [k, v.domain])
);

export function InsuranceSummaryTab({
  state,
  metrics,
  addItem,
  removeItem,
  updateItem,
  showToast,
}: any) {
  // Navigation & Filter States
  const [activeSubTab, setActiveSubTab] = useState<InsuranceSubTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "due" | "active" | "paid" | "matured">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal States
  const [addModalType, setAddModalType] = useState<null | "lic" | "term" | "invest">(null);
  const [editPolicy, setEditPolicy] = useState<any | null>(null);
  const [ledgerPolicy, setLedgerPolicy] = useState<UnifiedInsurancePolicy | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    collectionKey: string;
    id: string;
    name: string;
  } | null>(null);

  // Raw policy arrays from state
  const licList: any[] = state?.lic || [];
  const termList: any[] = state?.termPlans || [];
  const investList: any[] = state?.investmentPlans || [];

  // Async actions
  const { run: handleSavePolicy, loading: isSaving } = useAsyncAction(
    async (collectionKey: string, data: any, isEdit: boolean) => {
      if (isEdit) {
        await updateItem(collectionKey, data.id, data);
        showToast?.("Policy updated successfully.", "success");
      } else {
        const { id: _ignored, ...itemWithoutId } = data;
        await addItem(collectionKey, itemWithoutId);
        showToast?.("Policy added successfully.", "success");
      }
      setAddModalType(null);
      setEditPolicy(null);
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to save policy: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: handleDeletePolicy, loading: isDeleting } = useAsyncAction(
    async (collectionKey: string, id: string) => {
      await removeItem(collectionKey, id);
      showToast?.("Policy removed from portfolio.", "info");
      setConfirmDelete(null);
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete policy: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  // Unified normalization of all insurance policies
  const unifiedPolicies = useMemo<UnifiedInsurancePolicy[]>(() => {
    const list: UnifiedInsurancePolicy[] = [];

    // 1. LIC Policies
    licList.forEach((l: any) => {
      const termYears = parseInt(String(l.policyTerm || 20), 10);
      const payingYears = l.premiumPayingTerm ? parseInt(String(l.premiumPayingTerm), 10) : termYears;
      const annualPrem = Number(l.annualPremium || 0);
      const expectedTotal = annualPrem * (payingYears || 20);

      const calculatedPaid = (l.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      const totalPaid = calculatedPaid || Number(l.premiumPaid || 0);
      const balanceToPay = Math.max(0, expectedTotal - totalPaid);
      const isFullyPaid = expectedTotal > 0 && balanceToPay <= 0;

      const isMatured = (() => {
        if (!l.maturityDate) return false;
        const mat = new Date(l.maturityDate);
        return !isNaN(mat.getTime()) && mat < new Date();
      })();

      const dueInfo = getNextPremiumDueDate(l.commencementDate, l.maturityDate);

      list.push({
        id: l.id || uid(),
        type: "lic",
        typeLabel: "LIC",
        typeColor: THEME.rust,
        owner: l.owner || "self",
        insurer: "Life Insurance Corporation",
        planName: l.planName || "LIC Policy",
        policyNumber: l.policyNumber || "",
        coverAmount: Number(l.sumAssured || 0),
        annualPremium: annualPrem,
        totalPaid,
        expectedTotal,
        balanceToPay,
        progressPct: expectedTotal > 0 ? (totalPaid / expectedTotal) * 100 : 0,
        startDate: l.commencementDate || "",
        endDate: l.maturityDate || "",
        policyTerm: termYears,
        payingTerm: payingYears,
        isFullyPaid,
        isMatured,
        nextDueDate: dueInfo ? dueInfo.dateStr : null,
        daysUntilDue: dueInfo ? dueInfo.days : null,
        raw: l,
      });
    });

    // 2. Term Plans
    termList.forEach((t: any) => {
      const termYears = parseInt(String(t.term || 20), 10);
      const payingYears = t.premiumPayingTerm ? parseInt(String(t.premiumPayingTerm), 10) : termYears;
      const annualPrem = Number(t.annualPremium || 0);
      const expectedTotal = annualPrem * (payingYears || 20);

      const calculatedPaid = (t.transactions || []).reduce(
        (sum: number, tx: any) => sum + Number(tx.amount || 0),
        0
      );
      const totalPaid = calculatedPaid || Number(t.premiumPaid || 0);
      const balanceToPay = Math.max(0, expectedTotal - totalPaid);
      const isFullyPaid = expectedTotal > 0 && balanceToPay <= 0;

      const isMatured = (() => {
        if (!t.expiryDate) return false;
        const exp = new Date(t.expiryDate);
        return !isNaN(exp.getTime()) && exp < new Date();
      })();

      const dueInfo = getNextPremiumDueDate(t.startDate, t.expiryDate);

      list.push({
        id: t.id || uid(),
        type: "term",
        typeLabel: "Term Cover",
        typeColor: THEME.accent,
        owner: t.owner || "self",
        insurer: t.insurer || "Term Insurer",
        planName: t.planName || "Term Plan",
        policyNumber: t.policyNumber || "",
        coverAmount: Number(t.coverAmount || 0),
        annualPremium: annualPrem,
        totalPaid,
        expectedTotal,
        balanceToPay,
        progressPct: expectedTotal > 0 ? (totalPaid / expectedTotal) * 100 : 0,
        startDate: t.startDate || "",
        endDate: t.expiryDate || "",
        policyTerm: termYears,
        payingTerm: payingYears,
        isFullyPaid,
        isMatured,
        nextDueDate: dueInfo ? dueInfo.dateStr : null,
        daysUntilDue: dueInfo ? dueInfo.days : null,
        raw: t,
      });
    });

    // 3. Investment / Endowment Plans
    investList.forEach((ip: any) => {
      const termYears = parseInt(String(ip.policyTerm || 15), 10);
      const payingYears = ip.premiumPayingTerm ? parseInt(String(ip.premiumPayingTerm), 10) : termYears;
      const annualPrem = Number(ip.annualPremium || 0);
      const expectedTotal = annualPrem * (payingYears || 10);

      const calculatedPaid = (ip.transactions || []).reduce(
        (sum: number, tx: any) => sum + Number(tx.amount || 0),
        0
      );
      const totalPaid = calculatedPaid || Number(ip.premiumPaid || 0);
      const balanceToPay = Math.max(0, expectedTotal - totalPaid);
      const isFullyPaid = expectedTotal > 0 && balanceToPay <= 0;

      const isMatured = (() => {
        if (!ip.maturityDate) return false;
        const mat = new Date(ip.maturityDate);
        return !isNaN(mat.getTime()) && mat < new Date();
      })();

      const dueInfo = getNextPremiumDueDate(ip.commencementDate, ip.maturityDate);

      list.push({
        id: ip.id || uid(),
        type: "invest",
        typeLabel: "Endowment / ULIP",
        typeColor: THEME.sage,
        owner: ip.owner || "self",
        insurer: ip.insurer || "Life Insurer",
        planName: ip.planName || "Investment Plan",
        policyNumber: ip.policyNumber || "",
        coverAmount: Number(ip.expectedMaturityAmount || ip.sumAssured || 0),
        annualPremium: annualPrem,
        totalPaid,
        expectedTotal,
        balanceToPay,
        progressPct: expectedTotal > 0 ? (totalPaid / expectedTotal) * 100 : 0,
        startDate: ip.commencementDate || "",
        endDate: ip.maturityDate || "",
        policyTerm: termYears,
        payingTerm: payingYears,
        isFullyPaid,
        isMatured,
        nextDueDate: dueInfo ? dueInfo.dateStr : null,
        daysUntilDue: dueInfo ? dueInfo.days : null,
        raw: ip,
      });
    });

    return list;
  }, [licList, termList, investList]);

  // Aggregate Metrics
  const totalLICAssured = licList.reduce((s, l) => s + Number(l.sumAssured || 0), 0);
  const totalTermCover = termList.reduce((s, t) => s + Number(t.coverAmount || 0), 0);
  const totalInvestMaturity = investList.reduce(
    (s, ip) => s + Number(ip.expectedMaturityAmount || 0),
    0
  );
  const licAnnualPremium = licList.reduce((s, l) => s + Number(l.annualPremium || 0), 0);
  const termAnnualPremium = termList.reduce((s, t) => s + Number(t.annualPremium || 0), 0);
  const investAnnualPremium = investList.reduce(
    (s, ip) => s + Number(ip.annualPremium || 0),
    0
  );
  const totalAnnualPremium = licAnnualPremium + termAnnualPremium + investAnnualPremium;

  const annualIncome = Number(metrics?.annualIncome || 0);
  const totalLifeCover = totalLICAssured + totalTermCover;
  const premiumBurdenPct = annualIncome > 0 ? (totalAnnualPremium / annualIncome) * 100 : 0;

  const coverRatio = annualIncome > 0 ? totalTermCover / annualIncome : 0;
  const adequacyLevel: "excellent" | "adequate" | "low" | "critical" | "none" =
    annualIncome > 0
      ? coverRatio >= 15
        ? "excellent"
        : coverRatio >= 10
        ? "adequate"
        : coverRatio >= 5
        ? "low"
        : "critical"
      : "none";

  const adequacyColor = {
    excellent: THEME.sage,
    adequate: THEME.gold,
    low: THEME.gold,
    critical: THEME.rust,
    none: THEME.muted,
  }[adequacyLevel];

  const adequacyLabel = {
    excellent: "Excellent Protection (≥15×)",
    adequate: "Adequate Protection (10–15×)",
    low: "Low Coverage (5–10×)",
    critical: "Critical Underinsurance (<5×)",
    none: "No income data to calculate adequacy",
  }[adequacyLevel];

  // Counts for tabs
  const upcomingDueCount = unifiedPolicies.filter(
    (p) => p.daysUntilDue !== null && p.daysUntilDue <= 30 && !p.isFullyPaid && !p.isMatured
  ).length;

  const counts = {
    all: unifiedPolicies.length,
    term: termList.length,
    lic: licList.length,
    invest: investList.length,
    upcomingCount: upcomingDueCount,
  };

  // Filtered policies list based on active tab, search, owner, and status
  const filteredPolicies = useMemo(() => {
    return unifiedPolicies.filter((p) => {
      // Sub-tab filter
      if (activeSubTab === "term" && p.type !== "term") return false;
      if (activeSubTab === "lic" && p.type !== "lic") return false;
      if (activeSubTab === "invest" && p.type !== "invest") return false;

      // Owner filter
      if (selectedOwner !== "all" && p.owner !== selectedOwner) return false;

      // Status filter
      if (statusFilter === "due") {
        if (p.isFullyPaid || p.isMatured) return false;
        if (p.daysUntilDue === null || p.daysUntilDue > 30) return false;
      } else if (statusFilter === "active") {
        if (p.isFullyPaid || p.isMatured) return false;
      } else if (statusFilter === "paid") {
        if (!p.isFullyPaid) return false;
      } else if (statusFilter === "matured") {
        if (!p.isMatured) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlan = (p.planName || "").toLowerCase().includes(q);
        const matchesInsurer = (p.insurer || "").toLowerCase().includes(q);
        const matchesPolicyNum = (p.policyNumber || "").toLowerCase().includes(q);
        const matchesOwner = (p.owner || "").toLowerCase().includes(q);
        if (!matchesPlan && !matchesInsurer && !matchesPolicyNum && !matchesOwner) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedPolicies, activeSubTab, selectedOwner, statusFilter, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      "Type,Plan Name,Insurer,Policy Number,Cover / Maturity (₹),Annual Premium (₹),Total Paid (₹),Start Date,End Date,Owner",
    ];

    unifiedPolicies.forEach((p) => {
      rows.push(
        [
          q(p.typeLabel),
          q(p.planName),
          q(p.insurer),
          q(p.policyNumber),
          q(p.coverAmount),
          q(p.annualPremium),
          q(p.totalPaid),
          q(p.startDate),
          q(p.endDate),
          q(p.owner),
        ].join(",")
      );
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insurance_portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.("Insurance portfolio CSV exported successfully.", "success");
  };

  const hasPolicies = unifiedPolicies.length > 0;

  return (
    <div className="tab-content-enter" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header & Controls */}
      <InsuranceHeader
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
        counts={counts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedOwner={selectedOwner}
        onOwnerChange={setSelectedOwner}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddPolicy={(type) => setAddModalType(type)}
        onExportCSV={handleExportCSV}
        hasPolicies={hasPolicies}
      />

      {/* KPI Stat Cards (Shown on main policy tabs) */}
      {["all", "term", "lic", "invest"].includes(activeSubTab) && (
        <InsuranceStatCards
          totalLifeCover={totalLifeCover}
          totalTermCover={totalTermCover}
          totalLICAssured={totalLICAssured}
          totalInvestMaturity={totalInvestMaturity}
          totalAnnualPremium={totalAnnualPremium}
          annualIncome={annualIncome}
          premiumBurdenPct={premiumBurdenPct}
          coverRatio={coverRatio}
          adequacyLevel={adequacyLevel}
          adequacyLabel={adequacyLabel}
          adequacyColor={adequacyColor}
          activePoliciesCount={unifiedPolicies.filter((p) => !p.isFullyPaid && !p.isMatured).length}
          upcomingDueCount={upcomingDueCount}
        />
      )}

      {/* Main Tab Content */}
      {activeSubTab === "calendar" ? (
        <InsurancePremiumCalendar
          policies={unifiedPolicies}
          onOpenLedger={(p) => setLedgerPolicy(p)}
        />
      ) : activeSubTab === "analyzer" ? (
        <InsuranceProtectionAnalyzer
          policies={unifiedPolicies}
          annualIncome={annualIncome}
          totalLifeCover={totalLifeCover}
          totalLICAssured={totalLICAssured}
          totalTermCover={totalTermCover}
          totalInvestMaturity={totalInvestMaturity}
          totalAnnualPremium={totalAnnualPremium}
          licAnnualPremium={licAnnualPremium}
          termAnnualPremium={termAnnualPremium}
          investAnnualPremium={investAnnualPremium}
          totalLiabilities={state?.liabilities?.reduce((s: number, l: any) => s + Number(l.amount || 0), 0) || 0}
        />
      ) : (
        /* Policies List: Grid View vs Table View */
        <div>
          {filteredPolicies.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No insurance policies found"
              description={
                searchQuery || selectedOwner !== "all" || statusFilter !== "all"
                  ? "Try clearing your filters or search query."
                  : "Add your Term Insurance, LIC traditional policies, and investment schemes to track coverage and premiums."
              }
              buttonLabel="+ Add Term Plan"
              onAdd={() => setAddModalType("term")}
            />
          ) : viewMode === "grid" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 18,
              }}
            >
              {filteredPolicies.map((policy) => (
                <InsurancePolicyCard
                  key={`${policy.type}-${policy.id}`}
                  policy={policy}
                  onEdit={(p) => {
                    setEditPolicy(p.raw);
                    setAddModalType(p.type);
                  }}
                  onDelete={(p) =>
                    setConfirmDelete({
                      collectionKey:
                        p.type === "lic"
                          ? "lic"
                          : p.type === "term"
                          ? "termPlans"
                          : "investmentPlans",
                      id: p.id,
                      name: p.planName,
                    })
                  }
                  onOpenLedger={(p) => setLedgerPolicy(p)}
                />
              ))}
            </div>
          ) : (
            <InsuranceTableView
              policies={filteredPolicies}
              onEdit={(p) => {
                setEditPolicy(p.raw);
                setAddModalType(p.type);
              }}
              onDelete={(p) =>
                setConfirmDelete({
                  collectionKey:
                    p.type === "lic"
                      ? "lic"
                      : p.type === "term"
                      ? "termPlans"
                      : "investmentPlans",
                  id: p.id,
                  name: p.planName,
                })
              }
              onOpenLedger={(p) => setLedgerPolicy(p)}
            />
          )}
        </div>
      )}

      {/* Add / Edit Policy Modal */}
      {addModalType && (
        <AddEditPolicyModal
          type={addModalType}
          policy={editPolicy}
          onClose={() => {
            setAddModalType(null);
            setEditPolicy(null);
          }}
          onSave={handleSavePolicy}
          saving={isSaving}
          showToast={showToast}
        />
      )}

      {/* Policy Payment History & Auto-Generator Drawer Modal */}
      {ledgerPolicy && (
        <PolicyLedgerDrawerModal
          policy={ledgerPolicy}
          onClose={() => setLedgerPolicy(null)}
          onUpdatePolicy={async (updatedPolicy) => {
            const collectionKey =
              updatedPolicy.type === "lic"
                ? "lic"
                : updatedPolicy.type === "term"
                ? "termPlans"
                : "investmentPlans";
            await updateItem(collectionKey, updatedPolicy.id, updatedPolicy.raw);
          }}
          showToast={showToast}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          message={`Are you sure you want to delete policy "${confirmDelete.name}"? This action cannot be undone.`}
          onConfirm={() =>
            handleDeletePolicy(confirmDelete.collectionKey, confirmDelete.id)
          }
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

export default InsuranceSummaryTab;
