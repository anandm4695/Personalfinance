import React from "react";
import {
  Shield,
  Heart,
  Zap,
  TrendingUp,
  Clock,
  User,
  Pencil,
  Trash2,
  ListOrdered,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Money } from "../ui/Money";
import { InsurerLogo, LicLogo } from "../ui/BrandLogos";
import { UnifiedInsurancePolicy } from "./InsuranceTypes";
import { useMasterData } from "../../utils/masterData";

interface InsurancePolicyCardProps {
  policy: UnifiedInsurancePolicy;
  onEdit: (policy: UnifiedInsurancePolicy) => void;
  onDelete: (policy: UnifiedInsurancePolicy) => void;
  onOpenLedger: (policy: UnifiedInsurancePolicy) => void;
}

const OwnerBadge = ({ owner }: { owner?: string }) => {
  const { familyProfiles } = useMasterData();
  if (!owner) return null;
  const p = familyProfiles.find((x) => x.id === owner || x.name === owner);
  const name = p ? p.name : owner === "self" ? "Self" : owner;
  if (!name) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 10.5,
        fontWeight: 700,
        background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)",
        color: "var(--t-accent)",
      }}
    >
      <User size={10} />
      {name}
    </span>
  );
};

export const InsurancePolicyCard: React.FC<InsurancePolicyCardProps> = ({
  policy,
  onEdit,
  onDelete,
  onOpenLedger,
}) => {
  const isUrgent =
    policy.daysUntilDue !== null &&
    policy.daysUntilDue <= 30 &&
    !policy.isFullyPaid &&
    !policy.isMatured;
  const isOverdue =
    policy.daysUntilDue !== null &&
    policy.daysUntilDue <= 0 &&
    !policy.isFullyPaid &&
    !policy.isMatured;

  const typeBg = `color-mix(in srgb, ${policy.typeColor} 12%, transparent)`;
  const typeBorder = `1px solid color-mix(in srgb, ${policy.typeColor} 30%, transparent)`;

  const hasLedgerTx = (policy.raw.transactions || []).length > 0;

  return (
    <Card
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "20px 22px",
        position: "relative",
        border: isUrgent
          ? `1px solid ${isOverdue ? THEME.rust : THEME.gold}`
          : `1px solid ${THEME.line}`,
        boxShadow: isUrgent
          ? `0 0 16px color-mix(in srgb, ${isOverdue ? THEME.rust : THEME.gold} 15%, transparent)`
          : undefined,
        transition: "all 0.2s ease",
      }}
    >
      {/* Top Row: Insurer Logo + Title + Badges + Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {policy.type === "lic" ? (
            <LicLogo size={36} />
          ) : (
            <InsurerLogo insurer={policy.insurer || policy.planName} size={36} />
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 6,
                  background: typeBg,
                  border: typeBorder,
                  color: policy.typeColor,
                }}
              >
                {policy.typeLabel}
              </span>
              <OwnerBadge owner={policy.owner} />
              {policy.isFullyPaid && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 6,
                    background: "color-mix(in srgb, var(--t-sage) 15%, transparent)",
                    color: "var(--t-sage)",
                  }}
                >
                  ✓ Fully Paid
                </span>
              )}
              {policy.isMatured && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 6,
                    background: "color-mix(in srgb, var(--t-gold) 15%, transparent)",
                    color: "var(--t-gold)",
                  }}
                >
                  ★ Matured
                </span>
              )}
            </div>

            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 15,
                color: "var(--t-ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 260,
              }}
              title={policy.planName}
            >
              {policy.planName}
            </div>

            <div style={{ fontSize: 11, color: "var(--t-muted)", display: "flex", gap: 8, marginTop: 2 }}>
              {policy.insurer && policy.type !== "lic" && <span>{policy.insurer}</span>}
              {policy.policyNumber && (
                <span style={{ fontFamily: "monospace", letterSpacing: "0.02em" }}>
                  #{policy.policyNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenLedger(policy)}
            title={`View payment ledger (${policy.raw.transactions?.length || 0} payments)`}
            aria-label="Payment Ledger"
            style={{ padding: "6px 8px", fontSize: 11, color: "var(--t-muted)" }}
          >
            <ListOrdered size={14} style={{ marginRight: 4 }} />
            {policy.raw.transactions?.length || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(policy)}
            title="Edit Policy"
            aria-label="Edit Policy"
            style={{ padding: 6, color: "var(--t-muted)" }}
          >
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(policy)}
            title="Delete Policy"
            aria-label="Delete Policy"
            style={{ padding: 6, color: "var(--t-rust)" }}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 10,
          padding: "12px 14px",
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
            {policy.type === "term"
              ? "Sum Covered"
              : policy.type === "invest"
              ? "Expected Maturity"
              : "Sum Assured"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: policy.typeColor, fontFamily: "var(--font-display)" }}>
            <Money value={policy.coverAmount} variant="full" />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
            Annual Premium
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--t-ink)", fontFamily: "var(--font-display)" }}>
            <Money value={policy.annualPremium} variant="exact" />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
            Total Paid to Date
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t-sage)", fontFamily: "var(--font-display)" }}>
            <Money value={policy.totalPaid} variant="exact" />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
            Balance Remaining
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: policy.balanceToPay <= 0 ? "var(--t-sage)" : "var(--t-gold)",
              fontFamily: "var(--font-display)",
            }}
          >
            {policy.balanceToPay <= 0 ? "Nil (Paid)" : <Money value={policy.balanceToPay} variant="exact" />}
          </div>
        </div>
      </div>

      {/* Progress Track */}
      {policy.expectedTotal > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10.5,
              fontWeight: 700,
              color: "var(--t-muted)",
              marginBottom: 4,
            }}
          >
            <span>PREMIUM PROGRESS</span>
            <span>{policy.progressPct.toFixed(0)}% paid</span>
          </div>
          <div className="progress-track" style={{ height: 6, borderRadius: 3 }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, policy.progressPct)}%`,
                background: policy.isFullyPaid ? "var(--t-sage)" : policy.typeColor,
                borderRadius: 3,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer: Timeline & Due Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          paddingTop: 8,
          borderTop: `1px solid ${THEME.line}`,
          fontSize: 11,
          color: "var(--t-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Calendar size={12} />
          <span>
            {policy.startDate ? policy.startDate.slice(0, 4) : "—"} →{" "}
            {policy.endDate ? policy.endDate.slice(0, 4) : "—"}{" "}
            {policy.policyTerm ? `(${policy.policyTerm}y term)` : ""}
          </span>
        </div>

        {policy.nextDueDate && !policy.isFullyPaid && !policy.isMatured ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 10.5,
              background: isUrgent
                ? isOverdue
                  ? "color-mix(in srgb, var(--t-rust) 15%, transparent)"
                  : "color-mix(in srgb, var(--t-gold) 15%, transparent)"
                : "color-mix(in srgb, var(--t-muted) 10%, transparent)",
              color: isUrgent
                ? isOverdue
                  ? "var(--t-rust)"
                  : "var(--t-gold)"
                : "var(--t-muted)",
              border: isUrgent
                ? `1px solid color-mix(in srgb, ${isOverdue ? "var(--t-rust)" : "var(--t-gold)"} 30%, transparent)`
                : `1px solid ${THEME.line}`,
            }}
          >
            <Clock size={11} />
            {isOverdue
              ? `Overdue ${Math.abs(policy.daysUntilDue!)}d`
              : policy.daysUntilDue! <= 30
              ? `Due in ${policy.daysUntilDue}d`
              : `Next: ${policy.nextDueDate}`}
          </div>
        ) : (
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--t-sage)" }}>
            {policy.isMatured ? "✓ Matured" : "✓ Paid Up"}
          </div>
        )}
      </div>
    </Card>
  );
};
