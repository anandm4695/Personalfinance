import React, { useState } from "react";
import {
  MapPin,
  Calendar,
  Building2,
  User,
  Pencil,
  Trash2,
  FileText,
  Receipt,
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  CreditCard,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData } from "../../utils/masterData";
import { fmtINRFull, today } from "../../utils/finance";
import { Button } from "../ui/Button";
import { Money } from "../ui/Money";
import { BuilderLogo } from "../ui/BrandLogos";
import {
  EXTERNAL_OWNER_ID,
  STATUS_HEX,
  DEMAND_HEX,
  fmtDate,
  TYPE_LABELS,
  RealEstateProperty,
  RealEstateDemand,
  RealEstatePayment,
} from "./RealEstateTypes";

interface RealEstatePropertyCardProps {
  property: RealEstateProperty;
  demands: RealEstateDemand[];
  payments: RealEstatePayment[];
  bankAccounts?: any[];
  creditCards?: any[];
  onEditProperty: (p: RealEstateProperty) => void;
  onDeleteProperty: (id: string) => void;
  onAddDemand: (p: RealEstateProperty) => void;
  onEditDemand: (d: RealEstateDemand) => void;
  onDeleteDemand: (id: string) => void;
  onAddPayment: (p: RealEstateProperty, linkedDemand?: RealEstateDemand) => void;
  onEditPayment: (p: RealEstatePayment) => void;
  onDeletePayment: (id: string) => void;
}

export const RealEstatePropertyCard: React.FC<RealEstatePropertyCardProps> = ({
  property,
  demands,
  payments,
  bankAccounts = [],
  creditCards = [],
  onEditProperty,
  onDeleteProperty,
  onAddDemand,
  onEditDemand,
  onDeleteDemand,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeLedgerTab, setActiveLedgerTab] = useState<"demands" | "payments">("demands");
  const { familyProfiles } = useMasterData();

  const owners =
    property.owners && property.owners.length > 0
      ? property.owners
      : [{ id: property.owner || "self", sharePct: 100 }];
  const isJoint = owners.length > 1;

  const getOwnerName = (o: any) => {
    if (o.id === EXTERNAL_OWNER_ID) return o.name || "External Co-owner";
    const profile = familyProfiles.find((p: any) => p.id === o.id);
    return profile?.name || o.id;
  };

  // Financial Calculations
  const agreementVal = Number(property.agreementValue || 0);
  const agreementValPaid = Number(property.agreementValuePaid || 0);
  const stampDuty = Number(property.stampDuty || 0);
  const stampDutyPaid = Number(property.stampDutyPaid || 0);
  const tdsAmount = Number(property.tdsAmount || 0);
  const tdsPaid = Number(property.tdsValue || 0);

  const totalCost = agreementVal + stampDuty + tdsAmount;
  const totalCostPaid = agreementValPaid + stampDutyPaid + tdsPaid;
  const agreementBalance = Math.max(0, agreementVal - agreementValPaid);

  const totalDemanded = demands.reduce(
    (s, d) => s + Number(d.totalAmount || d.amount || 0),
    0
  );
  const totalDemandsPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstandingDemand = Math.max(0, totalDemanded - totalDemandsPaid);
  const demandPaymentPct =
    totalDemanded > 0 ? Math.min(100, Math.round((totalDemandsPaid / totalDemanded) * 100)) : 0;

  const isSold = property.status === "sold";
  const isUnderConstruction = property.status === "under-construction";
  const statusHex = STATUS_HEX[property.status] || THEME.accent;

  const currentValuation = isSold
    ? Number(property.salePrice || 0)
    : Number(property.marketValue || agreementVal);
  const saleExpenses = isSold
    ? Number(property.saleStampDuty || 0) + Number(property.saleTds || 0)
    : 0;
  const netSaleProceeds = isSold ? currentValuation - saleExpenses : currentValuation;

  const gain = isSold ? netSaleProceeds - totalCost : currentValuation - totalCost;
  const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;

  // Price per Sqft
  const areaSqft = Number(property.areaSqft || 0);
  const acquisitionRateSqft = areaSqft > 0 && agreementVal > 0 ? agreementVal / areaSqft : 0;
  const currentRateSqft = areaSqft > 0 && currentValuation > 0 ? currentValuation / areaSqft : 0;

  // Holding Years & CAGR
  const holdingYears = property.purchaseDate
    ? Math.max(
        0,
        (new Date((isSold && property.saleDate ? property.saleDate : today()) + "T00:00:00").getTime() -
          new Date(property.purchaseDate + "T00:00:00").getTime()) /
          (365.25 * 24 * 3600 * 1000)
      )
    : 0;
  const cagr =
    holdingYears >= 0.5 && totalCost > 0 && gain !== 0
      ? (Math.pow((totalCost + gain) / totalCost, 1 / holdingYears) - 1) * 100
      : null;

  // TDS 194-IA threshold alert (> 50 Lakhs)
  const isTdsApplicable = agreementVal >= 5000000;
  const isTdsPending = isTdsApplicable && tdsAmount > 0 && tdsPaid < tdsAmount;

  const divider = "1px solid var(--t-line)";

  return (
    <div
      style={{
        background: "var(--t-card-bg)",
        border: `1.5px solid var(--t-line)`,
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        marginBottom: 22,
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* ── Top Property Header ── */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: divider,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          background: `linear-gradient(135deg, color-mix(in srgb, ${statusHex} 8%, transparent) 0%, transparent 65%)`,
        }}
      >
        <div style={{ display: "flex", gap: 16, flex: 1, alignItems: "flex-start" }}>
          {property.developerName && (
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <BuilderLogo name={property.developerName} size={52} borderRadius={14} />
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 6,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 19,
                  fontWeight: 900,
                  color: THEME.ink,
                  letterSpacing: "-0.02em",
                }}
              >
                {property.name}
              </h3>

              {/* Status Badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: statusHex,
                  background: `color-mix(in srgb, ${statusHex} 16%, transparent)`,
                  border: `1.5px solid color-mix(in srgb, ${statusHex} 32%, transparent)`,
                  padding: "3px 9px",
                  borderRadius: "var(--radius-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {property.status === "under-construction" ? "Under Construction" : property.status}
              </span>

              {/* Type Badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: THEME.muted,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  padding: "3px 8px",
                  borderRadius: "var(--radius-xs)",
                }}
              >
                {TYPE_LABELS[property.type] || property.type}
              </span>

              {/* RERA Badge if provided */}
              {property.reraNumber && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: THEME.muted,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    padding: "3px 8px",
                    borderRadius: "var(--radius-xs)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title={`RERA Registration: ${property.reraNumber}`}
                >
                  <ShieldCheck size={11} color={THEME.sage} /> RERA: {property.reraNumber}
                </span>
              )}
            </div>

            {/* Sub-meta details */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              {property.location && (
                <span
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <MapPin size={12} color={THEME.accent} /> {property.location}
                </span>
              )}
              {property.developerName && (
                <span
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Building2 size={12} color={THEME.muted} /> {property.developerName}
                </span>
              )}
              {property.purchaseDate && (
                <span
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Calendar size={12} color={THEME.muted} /> Purchased: {fmtDate(property.purchaseDate)}
                </span>
              )}
              {property.possessionDate && (
                <span
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Calendar size={12} color={THEME.gold} /> Possession: {fmtDate(property.possessionDate)}
                </span>
              )}
              {areaSqft > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Layers size={12} color={THEME.accent} /> {areaSqft.toLocaleString("en-IN")} sq.ft.
                </span>
              )}
            </div>

            {/* Co-ownership badges */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {owners.map((o, i) => {
                const colors = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, THEME.violet];
                const accColor = colors[i % colors.length];
                return (
                  <span
                    key={o.id + i}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: accColor,
                      background: `color-mix(in srgb, ${accColor} 12%, transparent)`,
                      border: `1.5px solid color-mix(in srgb, ${accColor} 26%, transparent)`,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-xs)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <User size={11} /> {getOwnerName(o)}
                    {isJoint ? ` · ${Number(o.sharePct || 0)}%` : ""}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onEditProperty(property)}
            aria-label={`Edit ${property.name}`}
            title="Edit Property"
            className="icon-btn"
            style={{
              background: "var(--surface-1)",
              border: `1px solid ${THEME.line}`,
              cursor: "pointer",
              color: THEME.muted,
              padding: "7px 10px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={() => onDeleteProperty(property.id)}
            aria-label={`Delete ${property.name}`}
            title="Delete Property"
            className="icon-btn danger"
            style={{
              background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
              cursor: "pointer",
              color: THEME.rust,
              padding: "7px 10px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── 3-Column Structured Financial Snapshot ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 1,
          background: "var(--t-line)",
          borderBottom: divider,
        }}
      >
        {/* Column 1: Acquisition Cost Basis */}
        <div
          style={{
            padding: "16px 20px",
            background: "var(--t-card-bg)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: THEME.accent,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Acquisition Basis</span>
            <span>Total: <Money value={totalCost} variant="full" /></span>
          </div>

          <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: THEME.muted }}>Agreement Value:</span>
              <span style={{ fontWeight: 700, color: THEME.ink }}>
                <Money value={agreementVal} variant="full" />
              </span>
            </div>
            {stampDuty > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: THEME.muted }}>Stamp Duty & Reg:</span>
                <span style={{ fontWeight: 600, color: THEME.ink }}>
                  <Money value={stampDuty} variant="full" />
                </span>
              </div>
            )}
            {tdsAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: THEME.muted }}>TDS (Sec 194-IA):</span>
                <span style={{ fontWeight: 600, color: THEME.ink }}>
                  <Money value={tdsAmount} variant="full" />
                </span>
              </div>
            )}
            {acquisitionRateSqft > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: THEME.muted,
                  paddingTop: 4,
                  borderTop: `1px dashed ${THEME.line}`,
                }}
              >
                <span>Acquisition Rate:</span>
                <span style={{ fontWeight: 700 }}>
                  ₹{Math.round(acquisitionRateSqft).toLocaleString("en-IN")}/sq.ft
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Payment Outflows & Balances */}
        <div
          style={{
            padding: "16px 20px",
            background: "var(--t-card-bg)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: THEME.cyan,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Payment Progress</span>
            <span style={{ color: agreementBalance > 0 ? THEME.rust : THEME.sage }}>
              {agreementBalance > 0 ? `Bal: ${fmtINRFull(agreementBalance)}` : "Fully Paid"}
            </span>
          </div>

          <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: THEME.muted }}>Agreement Paid:</span>
              <span style={{ fontWeight: 700, color: THEME.sage }}>
                <Money value={agreementValPaid} variant="full" />
              </span>
            </div>
            {stampDuty > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: THEME.muted }}>Stamp Duty Paid:</span>
                <span style={{ fontWeight: 600, color: stampDutyPaid >= stampDuty ? THEME.sage : THEME.rust }}>
                  <Money value={stampDutyPaid} variant="full" />
                </span>
              </div>
            )}
            {tdsAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: THEME.muted }}>TDS Deposited:</span>
                <span style={{ fontWeight: 600, color: tdsPaid >= tdsAmount ? THEME.sage : THEME.rust }}>
                  <Money value={tdsPaid} variant="full" />
                </span>
              </div>
            )}
            {isTdsPending && (
              <div
                style={{
                  fontSize: 11,
                  color: THEME.rust,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 700,
                }}
              >
                <AlertTriangle size={12} /> TDS ₹{Math.max(0, tdsAmount - tdsPaid).toLocaleString("en-IN")} pending
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Current Valuation & Returns */}
        <div
          style={{
            padding: "16px 20px",
            background: "var(--t-card-bg)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: gain >= 0 ? THEME.sage : THEME.rust,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{isSold ? "Realised Returns" : "Valuation & Gain"}</span>
            <span>
              {gain >= 0 ? "+" : "−"}
              {Math.abs(gainPct).toFixed(1)}%
            </span>
          </div>

          <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: THEME.muted }}>{isSold ? "Sale Price:" : "Market Value:"}</span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 900,
                  color: THEME.ink,
                }}
              >
                <Money value={currentValuation} variant="full" />
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: THEME.muted }}>{isSold ? "Realised Gain:" : "Unrealised Gain:"}</span>
              <span
                style={{
                  fontWeight: 800,
                  color: gain >= 0 ? THEME.sage : THEME.rust,
                }}
              >
                {gain >= 0 ? "+ " : "− "}
                <Money value={Math.abs(gain)} variant="full" />
              </span>
            </div>
            {currentRateSqft > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: THEME.muted,
                  paddingTop: 4,
                  borderTop: `1px dashed ${THEME.line}`,
                }}
              >
                <span>Current Rate:</span>
                <span style={{ fontWeight: 700, color: THEME.accent }}>
                  ₹{Math.round(currentRateSqft).toLocaleString("en-IN")}/sq.ft
                </span>
              </div>
            )}
            {cagr !== null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted }}>
                <span>Annualised CAGR:</span>
                <span style={{ fontWeight: 800, color: cagr >= 0 ? THEME.sage : THEME.rust }}>
                  {cagr >= 0 ? "+" : "−"}{Math.abs(cagr).toFixed(1)}% p.a.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Under-Construction Milestone & Payment Progress Bar ── */}
      {totalDemanded > 0 && (
        <div style={{ padding: "14px 24px", borderBottom: divider, background: "var(--surface-0)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            <span style={{ fontWeight: 700, color: THEME.muted, textTransform: "uppercase", fontSize: 11 }}>
              Demand Letters Paid: {demands.length} Demand{demands.length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, color: THEME.sage }}>
                <Money value={totalDemandsPaid} variant="full" />
              </span>
              <span style={{ color: THEME.muted }}>of <Money value={totalDemanded} variant="full" /></span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: demandPaymentPct >= 100 ? THEME.sage : THEME.accent,
                  background: `color-mix(in srgb, ${demandPaymentPct >= 100 ? THEME.sage : THEME.accent} 12%, transparent)`,
                  padding: "2px 8px",
                  borderRadius: 12,
                }}
              >
                {demandPaymentPct}%
              </span>
            </div>
          </div>

          <div
            style={{
              height: 7,
              background: "var(--surface-1)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${demandPaymentPct}%`,
                background:
                  demandPaymentPct >= 100
                    ? `linear-gradient(90deg, ${THEME.sage}, #34d399)`
                    : `linear-gradient(90deg, ${THEME.accent}, #60a5fa)`,
                borderRadius: 4,
                transition: "width 0.4s ease",
              }}
            />
          </div>

          {outstandingDemand > 0 && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: THEME.rust,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <AlertTriangle size={12} /> Outstanding Demand Balance: <Money value={outstandingDemand} variant="full" />
            </div>
          )}
        </div>
      )}

      {/* ── Expandable Demand Letters & Payments Ledger ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: "100%",
          padding: "12px 24px",
          background: expanded ? "var(--surface-0)" : "transparent",
          border: "none",
          borderBottom: expanded ? divider : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 700,
          color: THEME.accent,
          transition: "background 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={14} />
          <span>
            Demand Letters ({demands.length}) & Recorded Payments ({payments.length})
          </span>
        </div>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {expanded && (
        <div style={{ background: "var(--surface-0)" }}>
          {/* Sub-tabs within card */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 20px 0",
              borderBottom: divider,
              background: "var(--surface-1)",
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setActiveLedgerTab("demands")}
                style={{
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: activeLedgerTab === "demands" ? THEME.accent : THEME.muted,
                  borderBottom: activeLedgerTab === "demands" ? `2.5px solid ${THEME.accent}` : "2.5px solid transparent",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FileText size={13} /> Demand Letters ({demands.length})
              </button>
              <button
                onClick={() => setActiveLedgerTab("payments")}
                style={{
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: activeLedgerTab === "payments" ? THEME.sage : THEME.muted,
                  borderBottom: activeLedgerTab === "payments" ? `2.5px solid ${THEME.sage}` : "2.5px solid transparent",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Receipt size={13} /> Payments ({payments.length})
              </button>
            </div>

            <div style={{ paddingBottom: 8 }}>
              {activeLedgerTab === "demands" ? (
                <Button
                  variant="accent"
                  size="sm"
                  icon={<Plus size={12} />}
                  onClick={() => onAddDemand(property)}
                >
                  Add Demand
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="sm"
                  icon={<Plus size={12} />}
                  onClick={() => onAddPayment(property)}
                >
                  Record Payment
                </Button>
              )}
            </div>
          </div>

          {/* Demands Table Tab */}
          {activeLedgerTab === "demands" && (
            <div style={{ padding: "14px 20px 16px" }}>
              {demands.length === 0 ? (
                <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic", padding: "12px 0" }}>
                  No demand letters recorded yet for this property. Click "Add Demand" above.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--surface-1)", borderBottom: divider }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Demand Date</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Due Date</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Milestone</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Basic</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>GST</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Total Demand</th>
                        <th style={{ padding: "8px 10px", textAlign: "center", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Status</th>
                        <th style={{ padding: "8px 10px", textAlign: "center", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demands
                        .slice()
                        .sort((a, b) => (a.demandDate > b.demandDate ? -1 : 1))
                        .map((d) => {
                          const dHex = DEMAND_HEX[d.status] || THEME.muted;
                          const isPaid = d.status === "paid";
                          return (
                            <tr key={d.id} style={{ borderBottom: divider }}>
                              <td style={{ padding: "10px 10px", fontWeight: 600 }}>{fmtDate(d.demandDate)}</td>
                              <td style={{ padding: "10px 10px", color: THEME.muted }}>{fmtDate(d.dueDate || "")}</td>
                              <td style={{ padding: "10px 10px", fontWeight: 700, color: THEME.ink }}>
                                {d.milestone || "—"}
                                {d.notes && <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 400 }}>{d.notes}</div>}
                              </td>
                              <td style={{ padding: "10px 10px", textAlign: "right" }}>
                                <Money value={Number(d.amount)} variant="full" />
                              </td>
                              <td style={{ padding: "10px 10px", textAlign: "right", color: THEME.muted }}>
                                {d.gstAmount ? <Money value={Number(d.gstAmount)} variant="full" /> : "—"}
                              </td>
                              <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 800, color: THEME.accent }}>
                                <Money value={Number(d.totalAmount || d.amount)} variant="full" />
                              </td>
                              <td style={{ padding: "10px 10px", textAlign: "center" }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: dHex,
                                    background: `color-mix(in srgb, ${dHex} 16%, transparent)`,
                                    border: `1px solid color-mix(in srgb, ${dHex} 30%, transparent)`,
                                    padding: "2px 7px",
                                    borderRadius: 4,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {d.status}
                                </span>
                              </td>
                              <td style={{ padding: "10px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                                <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                                  {!isPaid && (
                                    <button
                                      onClick={() => onAddPayment(property, d)}
                                      title="Record Payment for this Demand"
                                      style={{
                                        padding: "3px 7px",
                                        borderRadius: 4,
                                        border: `1px solid ${THEME.sage}`,
                                        background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                                        color: THEME.sage,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                      }}
                                    >
                                      Pay
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onEditDemand(d)}
                                    title="Edit Demand"
                                    className="icon-btn"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={() => onDeleteDemand(d.id)}
                                    title="Delete Demand"
                                    className="icon-btn danger"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payments Table Tab */}
          {activeLedgerTab === "payments" && (
            <div style={{ padding: "14px 20px 16px" }}>
              {payments.length === 0 ? (
                <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic", padding: "12px 0" }}>
                  No payment records logged yet. Click "Record Payment" above.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--surface-1)", borderBottom: divider }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Payment Date</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Amount Paid</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Mode</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Ref / UTR</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Linked Milestone</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Notes</th>
                        <th style={{ padding: "8px 10px", textAlign: "center", color: THEME.muted, fontSize: 10, textTransform: "uppercase" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments
                        .slice()
                        .sort((a, b) => (a.paymentDate > b.paymentDate ? -1 : 1))
                        .map((p) => {
                          const linked = demands.find((d) => d.id === p.demandId);
                          const sourceName = p.paymentSource?.startsWith("bank:")
                            ? bankAccounts.find((b: any) => b.id === p.paymentSource?.slice(5))?.bankName
                            : p.paymentSource?.startsWith("cc:")
                            ? creditCards.find((c: any) => c.id === p.paymentSource?.slice(3))?.cardName || creditCards.find((c: any) => c.id === p.paymentSource?.slice(3))?.bank
                            : null;
                          return (
                            <tr key={p.id} style={{ borderBottom: divider }}>
                              <td style={{ padding: "10px 10px", fontWeight: 600 }}>{fmtDate(p.paymentDate)}</td>
                              <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 800, color: THEME.sage }}>
                                +<Money value={Number(p.amount)} variant="full" />
                              </td>
                              <td style={{ padding: "10px 10px" }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: THEME.accent,
                                    background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    display: "inline-block",
                                  }}
                                >
                                  {p.paymentMode}
                                </span>
                                {sourceName && (
                                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                                    via {sourceName}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "10px 10px", fontFamily: "monospace", fontSize: 11, color: THEME.muted }}>
                                {p.referenceNumber || "—"}
                              </td>
                              <td style={{ padding: "10px 10px", color: THEME.ink, fontWeight: 600 }}>
                                {linked ? linked.milestone || fmtDate(linked.demandDate) : "Direct Payment"}
                              </td>
                              <td style={{ padding: "10px 10px", color: THEME.muted, fontSize: 11 }}>{p.note || "—"}</td>
                              <td style={{ padding: "10px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                                <div style={{ display: "inline-flex", gap: 4 }}>
                                  <button
                                    onClick={() => onEditPayment(p)}
                                    title="Edit Payment"
                                    className="icon-btn"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={() => onDeletePayment(p.id)}
                                    title="Delete Payment"
                                    className="icon-btn danger"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)` }}>
                        <td style={{ padding: "10px 10px", fontWeight: 800, color: THEME.muted, textTransform: "uppercase", fontSize: 11 }}>
                          Total Paid
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 900, color: THEME.sage }}>
                          <Money value={totalDemandsPaid} variant="full" />
                        </td>
                        <td colSpan={5} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
