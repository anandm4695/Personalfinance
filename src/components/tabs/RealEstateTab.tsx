import React, { useState, useMemo } from "react";
import { Plus, Home } from "lucide-react";
import { THEME } from "../../utils/constants";
import { today } from "../../utils/finance";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { SectionTitle } from "../ui/SectionTitle";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { BuilderLogo } from "../ui/BrandLogos";

import {
  RealEstateProperty,
  RealEstateDemand,
  RealEstatePayment,
  realEstateTrackedShare,
  realEstateShareForOwner,
} from "../realestate/RealEstateTypes";
import { RealEstateOverview } from "../realestate/RealEstateOverview";
import { RealEstatePropertyCard } from "../realestate/RealEstatePropertyCard";
import { RealEstateDemandTimeline } from "../realestate/RealEstateDemandTimeline";
import { RealEstateAnalytics } from "../realestate/RealEstateAnalytics";
import { RealEstateTableView } from "../realestate/RealEstateTableView";
import {
  PropertyModal,
  DemandModal,
  PaymentModal,
} from "../realestate/RealEstateModals";

export { BuilderLogo };

interface RealEstateTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  activeProfile?: string;
  showToast?: (message: string, type?: string) => void;
}

export function RealEstateTab({
  state,
  addItem,
  removeItem,
  updateItem,
  activeProfile,
  showToast,
}: RealEstateTabProps) {
  const properties: RealEstateProperty[] = state.realEstateProperties || [];
  const demands: RealEstateDemand[] = state.realEstateDemands || [];
  const payments: RealEstatePayment[] = state.realEstatePayments || [];
  const bankAccounts: any[] = state.bankAccounts || [];
  const creditCards: any[] = state.creditCards || [];

  // Modal states
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editProperty, setEditProperty] = useState<RealEstateProperty | null>(null);

  const [demandForProperty, setDemandForProperty] = useState<RealEstateProperty | null>(null);
  const [editDemand, setEditDemand] = useState<RealEstateDemand | null>(null);

  const [paymentForProperty, setPaymentForProperty] = useState<RealEstateProperty | null>(null);
  const [linkedDemandForPayment, setLinkedDemandForPayment] = useState<RealEstateDemand | null>(null);
  const [editPayment, setEditPayment] = useState<RealEstatePayment | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // View Controls
  const [valueView, setValueView] = useState<"share" | "full">("share");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "timeline" | "analytics">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Filtered Properties
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchDev = (p.developerName || "").toLowerCase().includes(q);
        const matchLoc = (p.location || "").toLowerCase().includes(q);
        if (!matchName && !matchDev && !matchLoc) return false;
      }
      return true;
    });
  }, [properties, statusFilter, typeFilter, searchQuery]);

  // Aggregate Portfolio Stats
  const stats = useMemo(() => {
    const activeProperties = properties.filter((p) => p.status !== "sold");
    const shareOf = (p: any) =>
      valueView === "full"
        ? 1
        : activeProfile && activeProfile !== "all"
        ? realEstateShareForOwner(p, activeProfile)
        : realEstateTrackedShare(p);

    const portfolioValue = activeProperties.reduce(
      (s, p) => s + Number(p.marketValue || p.agreementValue || 0) * shareOf(p),
      0
    );

    const totalInvested = activeProperties.reduce(
      (s, p) =>
        s +
        (Number(p.agreementValue || 0) +
          Number(p.stampDuty || 0) +
          Number(p.tdsAmount || 0)) *
          shareOf(p),
      0
    );

    const propById = new Map(properties.map((p) => [p.id, p]));
    const shareOfItem = (item: any) => {
      const prop = propById.get(item.propertyId);
      return prop ? shareOf(prop) : 0;
    };

    const ucIds = new Set(
      properties.filter((p) => p.status === "under-construction").map((p) => p.id)
    );

    const totalDemanded = demands
      .filter((d) => ucIds.has(d.propertyId))
      .reduce((s, d) => s + Number(d.totalAmount || d.amount || 0) * shareOfItem(d), 0);

    const totalPaidUC = payments
      .filter((p) => ucIds.has(p.propertyId))
      .reduce((s, p) => s + Number(p.amount || 0) * shareOfItem(p), 0);

    const outstanding = Math.max(0, totalDemanded - totalPaidUC);
    const allPaid = payments.reduce((s, p) => s + Number(p.amount || 0) * shareOfItem(p), 0);

    const appreciation = portfolioValue - totalInvested;
    const appreciationPct = totalInvested > 0 ? (appreciation / totalInvested) * 100 : 0;

    const totalAreaSqft = activeProperties.reduce(
      (s, p) => s + Number(p.areaSqft || 0) * shareOf(p),
      0
    );
    const avgRatePerSqft = totalAreaSqft > 0 ? portfolioValue / totalAreaSqft : 0;

    return {
      portfolioValue,
      totalInvested,
      totalPaid: allPaid,
      outstanding,
      appreciation,
      appreciationPct,
      totalAreaSqft,
      avgRatePerSqft,
      activeCount: properties.filter((p) => p.status === "owned").length,
      ucCount: properties.filter((p) => p.status === "under-construction").length,
      soldCount: properties.filter((p) => p.status === "sold").length,
    };
  }, [properties, demands, payments, activeProfile, valueView]);

  // Async handlers
  const { run: handleSaveProperty, loading: savingProperty } = useAsyncAction(
    async (data: any) => {
      if (editProperty) {
        await updateItem("realEstateProperties", editProperty.id, data);
        showToast?.("Property details updated successfully", "success");
      } else {
        await addItem("realEstateProperties", data);
        showToast?.("New property added to portfolio", "success");
      }
    },
    {
      onSuccess: () => {
        setEditProperty(null);
        setShowPropertyModal(false);
      },
      onError: (e: any) =>
        showToast?.(`Failed to save property: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: handleSaveDemand, loading: savingDemand } = useAsyncAction(
    async (data: any) => {
      if (editDemand) {
        await updateItem("realEstateDemands", editDemand.id, data);
        showToast?.("Demand letter updated", "success");
      } else if (demandForProperty) {
        await addItem("realEstateDemands", { ...data, propertyId: demandForProperty.id });
        showToast?.("Demand letter recorded", "success");
      }
    },
    {
      onSuccess: () => {
        setEditDemand(null);
        setDemandForProperty(null);
      },
      onError: (e: any) =>
        showToast?.(`Failed to save demand letter: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: handleSavePayment, loading: savingPayment } = useAsyncAction(
    async (data: any) => {
      const targetProperty = properties.find(
        (p) => p.id === (editPayment ? editPayment.propertyId : paymentForProperty?.id)
      );
      if (!targetProperty) return;

      const paymentAmount = Number(data.amount || 0);
      const isNew = !editPayment;
      const paymentId = editPayment
        ? editPayment.id
        : `re-pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const linkedTxnId =
        editPayment?.linkedTxnId ||
        `txn-re-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      // 1. Clean up or reverse previous posting if changed
      if (editPayment && editPayment.paymentSource && editPayment.linkedTxnId) {
        if (
          editPayment.paymentSource.startsWith("bank:") &&
          (data.paymentSource !== editPayment.paymentSource || !data.postToAccount)
        ) {
          try {
            await removeItem("transactions", editPayment.linkedTxnId);
          } catch {}
        } else if (
          editPayment.paymentSource.startsWith("cc:") &&
          (data.paymentSource !== editPayment.paymentSource || !data.postToAccount)
        ) {
          const oldCcId = editPayment.paymentSource.slice(3);
          const oldCard = creditCards.find((c: any) => c.id === oldCcId);
          if (oldCard) {
            try {
              const nextTxns = (oldCard.transactions || []).filter(
                (t: any) => t.id !== editPayment.linkedTxnId
              );
              await updateItem("creditCards", oldCcId, {
                transactions: nextTxns,
                outstanding: Math.max(0, Number(oldCard.outstanding || 0) - Number(editPayment.amount || 0)),
              });
            } catch {}
          }
        }
      }

      // 2. Cross-post to Bank Account / Credit Card if selected
      let effectiveLinkedTxnId: string | undefined = undefined;
      if (data.postToAccount !== false && data.paymentSource) {
        if (data.paymentSource.startsWith("bank:")) {
          const bankId = data.paymentSource.slice(5);
          const bank = bankAccounts.find((b: any) => b.id === bankId);
          if (bank) {
            const milestoneName = demands.find((d) => d.id === data.demandId)?.milestone;
            const txnPayload = {
              id: linkedTxnId,
              owner: targetProperty.owner || "self",
              date: data.paymentDate || today(),
              accountId: bankId,
              type: "debit",
              amount: paymentAmount,
              category: data.category || "Real Estate",
              note: `Real Estate: ${targetProperty.name}${milestoneName ? ` (${milestoneName})` : ""}${data.note ? ` - ${data.note}` : ""}`,
              narration: `Payment for ${targetProperty.name}`,
              referenceNumber: data.referenceNumber || undefined,
              linkedType: "realEstatePayments",
              linkedId: targetProperty.id,
              linkedSubId: paymentId,
            };

            if (editPayment && editPayment.paymentSource === data.paymentSource && editPayment.linkedTxnId) {
              await updateItem("transactions", editPayment.linkedTxnId, txnPayload);
            } else {
              await addItem("transactions", txnPayload);
            }
            effectiveLinkedTxnId = linkedTxnId;
          }
        } else if (data.paymentSource.startsWith("cc:")) {
          const ccId = data.paymentSource.slice(3);
          const card = creditCards.find((c: any) => c.id === ccId);
          if (card) {
            const milestoneName = demands.find((d) => d.id === data.demandId)?.milestone;
            const newTxn = {
              id: linkedTxnId,
              date: data.paymentDate || today(),
              merchant: `Real Estate: ${targetProperty.name}${milestoneName ? ` - ${milestoneName}` : ""}`,
              amount: String(paymentAmount),
              category: data.category || "Real Estate",
            };

            if (editPayment && editPayment.paymentSource === data.paymentSource && editPayment.linkedTxnId) {
              const oldAmt = Number(editPayment.amount || 0);
              const nextTxns = (card.transactions || []).map((t: any) =>
                t.id === editPayment.linkedTxnId ? newTxn : t
              );
              await updateItem("creditCards", ccId, {
                transactions: nextTxns,
                outstanding: Math.max(0, Number(card.outstanding || 0) - oldAmt + paymentAmount),
              });
            } else {
              await updateItem("creditCards", ccId, {
                transactions: [...(card.transactions || []), newTxn],
                outstanding: Number(card.outstanding || 0) + paymentAmount,
              });
            }
            effectiveLinkedTxnId = linkedTxnId;
          }
        }
      }

      // 3. Update Property's agreementValuePaid if autoUpdateAgreementPaid is checked
      if (data.autoUpdateAgreementPaid !== false) {
        const delta = isNew ? paymentAmount : paymentAmount - Number(editPayment?.amount || 0);
        if (delta !== 0) {
          const currentPaid = Number(targetProperty.agreementValuePaid || 0);
          await updateItem("realEstateProperties", targetProperty.id, {
            ...targetProperty,
            agreementValuePaid: Math.max(0, currentPaid + delta),
          });
        }
      }

      // 4. Save Payment Record
      const paymentRecord = {
        ...data,
        id: paymentId,
        propertyId: targetProperty.id,
        linkedTxnId: effectiveLinkedTxnId,
      };

      if (editPayment) {
        await updateItem("realEstatePayments", editPayment.id, paymentRecord);
        showToast?.("Payment record updated successfully", "success");
      } else {
        await addItem("realEstatePayments", paymentRecord);
        const sourceLabel = data.paymentSource?.startsWith("bank:")
          ? bankAccounts.find((b: any) => b.id === data.paymentSource.slice(5))?.bankName
          : data.paymentSource?.startsWith("cc:")
          ? creditCards.find((c: any) => c.id === data.paymentSource.slice(3))?.cardName
          : null;
        if (sourceLabel) {
          showToast?.(
            `Payment of ₹${paymentAmount.toLocaleString("en-IN")} recorded & auto-debited in ${sourceLabel}`,
            "success"
          );
        } else {
          showToast?.("Payment logged successfully", "success");
        }
      }
    },
    {
      onSuccess: () => {
        setEditPayment(null);
        setPaymentForProperty(null);
        setLinkedDemandForPayment(null);
      },
      onError: (e: any) =>
        showToast?.(`Failed to save payment: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteProperty } = useAsyncAction(
    async (id: string) => {
      await removeItem("realEstateProperties", id);
      showToast?.("Property deleted from portfolio", "info");
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete property: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteDemand } = useAsyncAction(
    async (id: string) => {
      await removeItem("realEstateDemands", id);
      showToast?.("Demand letter deleted", "info");
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete demand letter: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deletePayment } = useAsyncAction(
    async (id: string) => {
      const paymentToDelete = payments.find((p) => p.id === id);
      if (paymentToDelete) {
        // Reverse bank transaction
        if (paymentToDelete.paymentSource?.startsWith("bank:") && paymentToDelete.linkedTxnId) {
          try {
            await removeItem("transactions", paymentToDelete.linkedTxnId);
          } catch {}
        }
        // Reverse credit card transaction
        if (paymentToDelete.paymentSource?.startsWith("cc:") && paymentToDelete.linkedTxnId) {
          const ccId = paymentToDelete.paymentSource.slice(3);
          const card = creditCards.find((c: any) => c.id === ccId);
          if (card) {
            try {
              const nextTxns = (card.transactions || []).filter(
                (t: any) => t.id !== paymentToDelete.linkedTxnId
              );
              await updateItem("creditCards", ccId, {
                transactions: nextTxns,
                outstanding: Math.max(
                  0,
                  Number(card.outstanding || 0) - Number(paymentToDelete.amount || 0)
                ),
              });
            } catch {}
          }
        }
        // Adjust property agreementValuePaid
        if (paymentToDelete.autoUpdateAgreementPaid !== false) {
          const prop = properties.find((p) => p.id === paymentToDelete.propertyId);
          if (prop) {
            const currentPaid = Number(prop.agreementValuePaid || 0);
            await updateItem("realEstateProperties", prop.id, {
              ...prop,
              agreementValuePaid: Math.max(0, currentPaid - Number(paymentToDelete.amount || 0)),
            });
          }
        }
      }
      await removeItem("realEstatePayments", id);
      showToast?.("Payment record deleted and account ledgers reversed", "info");
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete payment: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const handleTriggerPayment = (p: RealEstateProperty, d?: RealEstateDemand) => {
    setPaymentForProperty(p);
    setLinkedDemandForPayment(d || null);
  };

  return (
    <div>
      {/* ── Section Title Bar ── */}
      <SectionTitle
        sub={`${properties.length} propert${properties.length !== 1 ? "ies" : "y"} tracked · Purchases, construction demands, milestones & returns`}
        rightElement={
          <Button
            variant="accent"
            icon={<Plus size={14} />}
            onClick={() => setShowPropertyModal(true)}
          >
            Add Property
          </Button>
        }
      >
        Real Estate
      </SectionTitle>

      {/* ── Main Content Area ── */}
      {properties.length === 0 ? (
        <EmptyState
          icon={Home}
          gradient={`linear-gradient(135deg, ${THEME.accent}, ${THEME.sage})`}
          dotColor={THEME.accent}
          title="No Properties In Portfolio Yet"
          description="Track all your residential, commercial, and land investments — acquisition cost breakdown, builder demand letters, payment disbursements, and valuation gains in one unified place."
          pills={[
            "Agreement & Stamp Duty",
            "Sec 194-IA TDS Helper",
            "Milestone Demands",
            "Bank / Card Auto-Sync",
            "Price / Sq.Ft Insights",
            "Co-Ownership Split",
          ]}
          buttonLabel="Add First Property"
          onAdd={() => setShowPropertyModal(true)}
        />
      ) : (
        <>
          {/* Overview & Controls */}
          <RealEstateOverview
            stats={stats}
            valueView={valueView}
            setValueView={setValueView}
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            totalProperties={properties.length}
          />

          {/* 1. Showcase Cards View */}
          {viewMode === "cards" && (
            filteredProperties.length === 0 ? (
              <div
                style={{
                  padding: 48,
                  textAlign: "center",
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: "var(--radius-lg)",
                  color: THEME.muted,
                  fontSize: 13,
                }}
              >
                No properties match your filter criteria.
              </div>
            ) : (
              filteredProperties.map((property) => (
                <RealEstatePropertyCard
                  key={property.id}
                  property={property}
                  demands={demands.filter((d) => d.propertyId === property.id)}
                  payments={payments.filter((p) => p.propertyId === property.id)}
                  bankAccounts={bankAccounts}
                  creditCards={creditCards}
                  onEditProperty={(p) => setEditProperty(p)}
                  onDeleteProperty={(id) => {
                    setConfirmAction({
                      message:
                        "Delete this property? Its demand letters and payment records will be permanently removed.",
                      onConfirm: () => deleteProperty(id),
                    });
                  }}
                  onAddDemand={(p) => setDemandForProperty(p)}
                  onEditDemand={(d) => setEditDemand(d)}
                  onDeleteDemand={(id) => {
                    setConfirmAction({
                      message: "Delete this demand letter? This cannot be undone.",
                      onConfirm: () => deleteDemand(id),
                    });
                  }}
                  onAddPayment={(p, d) => handleTriggerPayment(p, d)}
                  onEditPayment={(p) => setEditPayment(p)}
                  onDeletePayment={(id) => {
                    setConfirmAction({
                      message: "Delete this payment record? Its account ledger sync will also be reversed.",
                      onConfirm: () => deletePayment(id),
                    });
                  }}
                />
              ))
            )
          )}

          {/* 2. Portfolio Table View */}
          {viewMode === "table" && (
            <RealEstateTableView
              properties={filteredProperties}
              onEditProperty={(p) => setEditProperty(p)}
              onDeleteProperty={(id) => {
                setConfirmAction({
                  message:
                    "Delete this property? Its demand letters and payment records will be permanently removed.",
                  onConfirm: () => deleteProperty(id),
                });
              }}
            />
          )}

          {/* 3. Demands & Milestone Timeline View */}
          {viewMode === "timeline" && (
            <RealEstateDemandTimeline
              properties={properties}
              demands={demands}
              payments={payments}
              onAddDemand={(p) => setDemandForProperty(p)}
              onEditDemand={(d) => setEditDemand(d)}
              onDeleteDemand={(id) => {
                setConfirmAction({
                  message: "Delete this demand letter? This cannot be undone.",
                  onConfirm: () => deleteDemand(id),
                });
              }}
              onAddPayment={(p, d) => handleTriggerPayment(p, d)}
            />
          )}

          {/* 4. Portfolio Analytics View */}
          {viewMode === "analytics" && (
            <RealEstateAnalytics
              properties={properties}
              valueView={valueView}
              activeProfile={activeProfile}
            />
          )}
        </>
      )}

      {/* ── Modals & Dialogs ── */}
      {(showPropertyModal || editProperty) && (
        <PropertyModal
          existing={editProperty}
          onClose={() => {
            setShowPropertyModal(false);
            setEditProperty(null);
          }}
          onSave={handleSaveProperty}
          saving={savingProperty}
        />
      )}

      {(demandForProperty || editDemand) && (
        <DemandModal
          existing={editDemand}
          propertyName={
            editDemand
              ? properties.find((p) => p.id === editDemand.propertyId)?.name || "Property"
              : demandForProperty?.name || "Property"
          }
          onClose={() => {
            setDemandForProperty(null);
            setEditDemand(null);
          }}
          onSave={handleSaveDemand}
          saving={savingDemand}
        />
      )}

      {(paymentForProperty || editPayment) && (
        <PaymentModal
          existing={editPayment}
          propertyName={
            editPayment
              ? properties.find((p) => p.id === editPayment.propertyId)?.name || "Property"
              : paymentForProperty?.name || "Property"
          }
          demands={
            editPayment
              ? demands.filter((d) => d.propertyId === editPayment.propertyId)
              : demands.filter((d) => d.propertyId === paymentForProperty?.id)
          }
          initialDemandId={linkedDemandForPayment?.id}
          bankAccounts={bankAccounts}
          creditCards={creditCards}
          onClose={() => {
            setPaymentForProperty(null);
            setEditPayment(null);
            setLinkedDemandForPayment(null);
          }}
          onSave={handleSavePayment}
          saving={savingPayment}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
