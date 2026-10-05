import React from "react";
import {
  Building2,
  Receipt,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
  Plus,
  Shield,
  User,
  Store,
  Home,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  today,
  getEffectiveRent,
  getCurrentTierIndex,
  getMonthsToNextEscalation,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Money } from "../ui/Money";

interface RentalPropertyCardProps {
  property: any;
  type: "out" | "in";
  fyStart: string;
  fyEnd: string;
  onEdit: (property: any) => void;
  onDelete: (property: any) => void;
  onOpenLedger: (property: any, defaultTab?: "rent" | "deposit" | "csv" | "hra") => void;
  onQuickLogRent: (property: any) => void;
  onQuickLogDeposit: (property: any) => void;
}

const getOrdinal = (n: number | string) => {
  const num = parseInt(n as string, 10);
  if (isNaN(num)) return n;
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const RentalPropertyCard: React.FC<RentalPropertyCardProps> = ({
  property: p,
  type,
  fyStart,
  fyEnd,
  onEdit,
  onDelete,
  onOpenLedger,
  onQuickLogRent,
  onQuickLogDeposit,
}) => {
  const isOut = type === "out";
  const primaryColor = isOut ? THEME.accent : THEME.rust;

  // Escalation & effective rent calculations
  const displayedRent =
    getEffectiveRent(p) ||
    p.monthlyRent ||
    p.escalationTiers?.[p.escalationTiers.length - 1]?.amount ||
    0;
  const currentTier = getCurrentTierIndex(p);

  // Status and Expiry calculations
  const todayMs = new Date(today() + "T00:00:00").getTime();
  const endDate = p.agreementEnd ? new Date(p.agreementEnd + "T00:00:00") : null;
  const daysToExpiry = endDate ? Math.ceil((endDate.getTime() - todayMs) / 86400000) : null;
  const isExpired =
    (daysToExpiry !== null && daysToExpiry < 0) ||
    (p.agreementEnd && p.agreementEnd < today()) ||
    p.isActive === false;

  // FY Progress calculations
  const items = isOut ? p.receipts || [] : p.payments || [];
  const fyCompleted = items
    .filter((r: any) => r.date >= fyStart && r.date <= fyEnd)
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  // FY Expected Rent with escalation
  const [fyStartYear, fyStartMonth] = fyStart.slice(0, 7).split("-").map(Number);
  let fyExpected = 0;
  for (let i = 0; i < 12; i++) {
    const y = fyStartYear + Math.floor((fyStartMonth - 1 + i) / 12);
    const m = ((fyStartMonth - 1 + i) % 12) + 1;
    fyExpected += getEffectiveRent(p, `${y}-${String(m).padStart(2, "0")}`);
  }

  const pct = fyExpected > 0 ? Math.min(100, (fyCompleted / fyExpected) * 100) : 0;
  const barColor = pct >= 100 ? THEME.sage : pct >= 50 ? THEME.accent : THEME.rust;

  // Security Deposit calculations
  const actualDeposit =
    p.depositTransactions && p.depositTransactions.length > 0
      ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
      : Number(p.securityDeposit || 0);

  const totalDeductions = (p.depositDeductions || []).reduce(
    (s: number, d: any) => s + Number(d.amount || 0),
    0
  );
  const totalReturned = Number(p.depositReturned || 0);
  const netDepositHeld = Math.max(0, actualDeposit - totalDeductions - totalReturned);

  // Quick log rent status
  const currentMonth = today().slice(0, 7);
  const isCurrentMonthLogged = items.some((r: any) => r.month === currentMonth);

  // Multi-party count
  const multiParty = isOut ? p.tenants : p.landlords;
  const hasMultiParty = multiParty && multiParty.length > 1;

  // Icon selection
  const PropertyIcon =
    p.propertyType === "shop" ? Store : p.propertyType === "flat" ? Home : Building2;

  return (
    <Card
      variant="base"
      style={{
        padding: "20px 22px",
        borderTop: `4px solid ${primaryColor}`,
        borderRadius: "var(--radius-lg)",
        position: "relative",
        background: "var(--surface-0)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.03)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <div>
        {/* ── Top Header Row ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `color-mix(in srgb, ${primaryColor} 10%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: primaryColor,
              }}
            >
              <PropertyIcon size={20} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color: THEME.ink,
                    letterSpacing: "-0.01em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={p.propertyName}
                >
                  {p.propertyName}
                </span>

                {/* Expiry / Status Badges */}
                {p.isActive === false ? (
                  <Badge variant="muted" style={{ fontSize: 10, padding: "2px 7px" }}>
                    Ended
                  </Badge>
                ) : daysToExpiry !== null && daysToExpiry < 0 ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.rust,
                      background: `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
                      padding: "2px 7px",
                      borderRadius: 99,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <AlertTriangle size={10} /> Expired
                  </span>
                ) : daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30 ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.gold,
                      background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                      padding: "2px 7px",
                      borderRadius: 99,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Calendar size={10} /> {daysToExpiry}d left
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.sage,
                      background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                      padding: "2px 7px",
                      borderRadius: 99,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: THEME.sage,
                      }}
                    />
                    Active
                  </span>
                )}
              </div>

              {/* Tenant / Landlord Name */}
              <div
                style={{
                  fontSize: 12,
                  color: THEME.muted,
                  fontWeight: 600,
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <User size={12} />
                {isOut ? (
                  <span>
                    Tenant:{" "}
                    <b style={{ color: THEME.ink }}>
                      {hasMultiParty
                        ? `${multiParty.length} Tenants`
                        : p.tenantName || p.tenants?.[0]?.name || "Vacant"}
                    </b>
                  </span>
                ) : (
                  <span>
                    Landlord:{" "}
                    <b style={{ color: THEME.ink }}>
                      {hasMultiParty
                        ? `${multiParty.length} Landlords`
                        : p.landlordName || p.landlords?.[0]?.name || "Unknown"}
                    </b>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(p)}
              style={{ padding: "6px 8px" }}
              title="Edit Property"
              aria-label="Edit property"
            >
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(p)}
              style={{ padding: "6px 8px", color: THEME.rust }}
              title="Delete Property"
              aria-label="Delete property"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>

        {/* ── Main Rent & Due Date Highlight Row ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "10px 14px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${primaryColor} 4%, var(--surface-1))`,
            border: `1px solid color-mix(in srgb, ${primaryColor} 12%, transparent)`,
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: THEME.muted,
                marginBottom: 2,
              }}
            >
              {isOut ? "Effective Rent" : "Monthly Lease"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 900,
                color: isExpired ? THEME.muted : primaryColor,
              }}
            >
              <Money value={displayedRent} variant="exact" />
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginLeft: 2 }}>
                /mo
              </span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.gold,
                background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
                padding: "3px 8px",
                borderRadius: 6,
                display: "inline-block",
              }}
            >
              Due: {getOrdinal(p.dueDay ?? 5)} of month
            </span>
          </div>
        </div>

        {/* ── Escalation Schedule Timeline ── */}
        {p.escalationTiers?.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: THEME.muted,
                marginBottom: 5,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Escalation Schedule</span>
              {currentTier >= 0 ? (
                <span style={{ color: primaryColor, fontWeight: 800 }}>
                  Active: Y{currentTier + 1} of {p.escalationTiers.length}
                </span>
              ) : (
                <span style={{ color: THEME.muted, fontWeight: 700, fontSize: 10 }}>
                  {isExpired ? "Tiers Expired" : "Tiers Completed"}
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {p.escalationTiers.map((tier: any, ti: number) => {
                const isCurrent = currentTier === ti;
                const mNext = isCurrent ? getMonthsToNextEscalation(p) : null;
                return (
                  <span
                    key={ti}
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontWeight: 700,
                      background: isCurrent
                        ? `color-mix(in srgb, ${primaryColor} 14%, transparent)`
                        : `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                      color: isCurrent ? primaryColor : THEME.muted,
                      border: isCurrent
                        ? `1.5px solid color-mix(in srgb, ${primaryColor} 35%, transparent)`
                        : `1px solid transparent`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>Y{ti + 1}:</span>
                    <Money value={tier.amount} variant="exact" />
                    {isCurrent && mNext !== null && mNext <= 3 && (
                      <span style={{ color: THEME.gold, fontWeight: 800, fontSize: 9 }}>
                        · in {mNext}mo
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Multi-Tenant / Multi-Landlord Splits ── */}
        {hasMultiParty && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                height: 5,
                borderRadius: 99,
                overflow: "hidden",
                gap: 2,
                marginBottom: 6,
              }}
            >
              {multiParty.map((party: any, i: number) => {
                const colors = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, THEME.violet];
                const col = colors[i % 5];
                const pctVal = isOut
                  ? Math.round(((Number(party.monthlyRent) || 0) / (displayedRent || 1)) * 100)
                  : Number(party.splitPct) || 0;
                return (
                  <div
                    key={i}
                    style={{
                      flex: pctVal || 1,
                      background: col,
                    }}
                    title={`${party.name || `P${i + 1}`}: ${pctVal}%`}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {multiParty.map((party: any, i: number) => {
                const colors = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, THEME.violet];
                const col = colors[i % 5];
                return (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: col,
                      background: `color-mix(in srgb, ${col} 8%, transparent)`,
                      padding: "2px 6px",
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: col,
                      }}
                    />
                    {party.name || `P${i + 1}`}:{" "}
                    {isOut ? (
                      <Money value={party.monthlyRent} variant="exact" />
                    ) : (
                      `${party.splitPct}%`
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Key Metrics Mini Strip ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isOut ? "1fr 1fr 1fr" : "1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {/* Property Value (Out only) */}
          {isOut && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: `color-mix(in srgb, ${THEME.violet} 6%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.violet} 18%, transparent)`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                }}
              >
                Valuation
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 12,
                  color: THEME.violet,
                  marginTop: 2,
                }}
              >
                {p.propertyValue ? <Money value={p.propertyValue} variant="full" /> : "—"}
              </div>
            </div>
          )}

          {/* FY Received / FY Paid */}
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: `color-mix(in srgb, ${isOut ? THEME.sage : THEME.rust} 6%, transparent)`,
              border: `1px solid color-mix(in srgb, ${isOut ? THEME.sage : THEME.rust} 18%, transparent)`,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
              }}
            >
              {isOut ? "FY Received" : "FY Paid"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 12,
                color: isOut ? THEME.sage : THEME.rust,
                marginTop: 2,
              }}
            >
              <Money value={fyCompleted} variant="full" />
            </div>
          </div>

          {/* Security Deposit Held / Paid */}
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: `color-mix(in srgb, ${isOut ? THEME.gold : THEME.sage} 6%, transparent)`,
              border: `1px solid color-mix(in srgb, ${isOut ? THEME.gold : THEME.sage} 18%, transparent)`,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
              }}
            >
              {isOut ? "Deposit Held" : "Deposit Paid"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 12,
                color: isOut ? THEME.gold : THEME.sage,
                marginTop: 2,
              }}
            >
              <Money value={netDepositHeld} variant="full" />
            </div>
          </div>
        </div>

        {/* ── FY Progress Bar ── */}
        {fyExpected > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: THEME.muted,
                fontWeight: 700,
                marginBottom: 3,
              }}
            >
              <span>FY {isOut ? "Collection" : "Payments"}</span>
              <span style={{ color: barColor }}>
                {pct.toFixed(0)}% of <Money value={fyExpected} variant="full" /> expected
              </span>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 99,
                background: `color-mix(in srgb, ${THEME.line} 50%, transparent)`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: barColor,
                  borderRadius: 99,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Action Toolbar ── */}
      <div
        style={{
          borderTop: `1px solid ${THEME.line}`,
          paddingTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenLedger(p, "rent")}
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: primaryColor,
            padding: "4px 8px",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Receipt size={14} /> View Ledger ({items.length})
        </Button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Quick Log Current Month */}
          {!isCurrentMonthLogged && (
            <button
              onClick={() => onQuickLogRent(p)}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid color-mix(in srgb, ${primaryColor} 30%, transparent)`,
                background: `color-mix(in srgb, ${primaryColor} 8%, transparent)`,
                color: primaryColor,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                transition: "all 0.15s ease",
              }}
              title={`Quick log rent for ${currentMonth}`}
            >
              <Plus size={12} /> {currentMonth}
            </button>
          )}

          {/* Quick Deposit Transaction */}
          <button
            onClick={() => onQuickLogDeposit(p)}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid color-mix(in srgb, ${THEME.gold} 30%, transparent)`,
              background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
              color: THEME.gold,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s ease",
            }}
            title="Log deposit transaction"
          >
            <Shield size={12} /> Deposit
          </button>
        </div>
      </div>
    </Card>
  );
};
