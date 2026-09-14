import React, { useState } from "react";
import {
  Shield,
  Heart,
  Zap,
  TrendingUp,
  Pencil,
  Trash2,
  ListOrdered,
  Clock,
  ArrowUpDown,
  User,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { Money } from "../ui/Money";
import { Button } from "../ui/Button";
import { InsurerLogo, LicLogo } from "../ui/BrandLogos";
import { UnifiedInsurancePolicy } from "./InsuranceTypes";
import { useMasterData } from "../../utils/masterData";

interface InsuranceTableViewProps {
  policies: UnifiedInsurancePolicy[];
  onEdit: (policy: UnifiedInsurancePolicy) => void;
  onDelete: (policy: UnifiedInsurancePolicy) => void;
  onOpenLedger: (policy: UnifiedInsurancePolicy) => void;
}

export const InsuranceTableView: React.FC<InsuranceTableViewProps> = ({
  policies,
  onEdit,
  onDelete,
  onOpenLedger,
}) => {
  const { familyProfiles } = useMasterData();
  const [sortField, setSortField] = useState<keyof UnifiedInsurancePolicy>("planName");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: keyof UnifiedInsurancePolicy) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getOwnerName = (owner?: string) => {
    if (!owner) return "Self";
    const p = familyProfiles.find((x) => x.id === owner || x.name === owner);
    return p ? p.name : owner === "self" ? "Self" : owner;
  };

  const sortedPolicies = [...policies].sort((a, b) => {
    let vA = a[sortField];
    let vB = b[sortField];
    if (typeof vA === "string") {
      return sortAsc
        ? (vA as string).localeCompare(vB as string)
        : (vB as string).localeCompare(vA as string);
    }
    if (typeof vA === "number") {
      return sortAsc ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
    }
    return 0;
  });

  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${THEME.line}`,
        borderRadius: "var(--radius-md, 12px)",
        background: "var(--surface-0)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12.5,
          textAlign: "left",
        }}
      >
        <thead>
          <tr
            style={{
              background: "color-mix(in srgb, var(--t-muted) 6%, transparent)",
              borderBottom: `1px solid ${THEME.line}`,
              color: "var(--t-muted)",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <th style={{ padding: "12px 14px" }}>Policy & Insurer</th>
            <th
              style={{ padding: "12px 14px", cursor: "pointer" }}
              onClick={() => handleSort("typeLabel")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                Type <ArrowUpDown size={11} />
              </div>
            </th>
            <th
              style={{ padding: "12px 14px", cursor: "pointer" }}
              onClick={() => handleSort("owner")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                Member <ArrowUpDown size={11} />
              </div>
            </th>
            <th
              style={{ padding: "12px 14px", cursor: "pointer", textAlign: "right" }}
              onClick={() => handleSort("coverAmount")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                Cover / Value <ArrowUpDown size={11} />
              </div>
            </th>
            <th
              style={{ padding: "12px 14px", cursor: "pointer", textAlign: "right" }}
              onClick={() => handleSort("annualPremium")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                Annual Premium <ArrowUpDown size={11} />
              </div>
            </th>
            <th
              style={{ padding: "12px 14px", cursor: "pointer", textAlign: "right" }}
              onClick={() => handleSort("totalPaid")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                Total Paid <ArrowUpDown size={11} />
              </div>
            </th>
            <th style={{ padding: "12px 14px", textAlign: "right" }}>Progress</th>
            <th style={{ padding: "12px 14px" }}>Timeline / Next Due</th>
            <th style={{ padding: "12px 14px", textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedPolicies.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--t-muted)",
                  fontSize: 13,
                }}
              >
                No policies found matching current filters.
              </td>
            </tr>
          ) : (
            sortedPolicies.map((p) => {
              const isUrgent =
                p.daysUntilDue !== null &&
                p.daysUntilDue <= 30 &&
                !p.isFullyPaid &&
                !p.isMatured;
              const isOverdue =
                p.daysUntilDue !== null &&
                p.daysUntilDue <= 0 &&
                !p.isFullyPaid &&
                !p.isMatured;

              return (
                <tr
                  key={`${p.type}-${p.id}`}
                  style={{
                    borderBottom: `1px solid color-mix(in srgb, ${THEME.line} 40%, transparent)`,
                    transition: "background 0.15s ease",
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {p.type === "lic" ? (
                        <LicLogo size={28} />
                      ) : (
                        <InsurerLogo insurer={p.insurer || p.planName} size={28} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--t-ink)" }}>{p.planName}</div>
                        <div style={{ fontSize: 11, color: "var(--t-muted)", fontFamily: "monospace" }}>
                          {p.insurer && p.type !== "lic" ? `${p.insurer} · ` : ""}
                          {p.policyNumber ? `#${p.policyNumber}` : "No policy #"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: `color-mix(in srgb, ${p.typeColor} 12%, transparent)`,
                        color: p.typeColor,
                        border: `1px solid color-mix(in srgb, ${p.typeColor} 25%, transparent)`,
                      }}
                    >
                      {p.typeLabel}
                    </span>
                  </td>

                  <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--t-ink)" }}>
                    {getOwnerName(p.owner)}
                  </td>

                  <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: p.typeColor }}>
                    <Money value={p.coverAmount} variant="full" />
                  </td>

                  <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "var(--t-ink)" }}>
                    <Money value={p.annualPremium} variant="exact" />
                  </td>

                  <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "var(--t-sage)" }}>
                    <Money value={p.totalPaid} variant="exact" />
                  </td>

                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)" }}>
                        {p.progressPct.toFixed(0)}%
                      </span>
                      <div
                        style={{
                          width: 45,
                          height: 5,
                          background: "color-mix(in srgb, var(--t-muted) 20%, transparent)",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, p.progressPct)}%`,
                            height: "100%",
                            background: p.isFullyPaid ? "var(--t-sage)" : p.typeColor,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    {p.nextDueDate && !p.isFullyPaid && !p.isMatured ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: isUrgent
                            ? isOverdue
                              ? "var(--t-rust)"
                              : "var(--t-gold)"
                            : "var(--t-muted)",
                        }}
                      >
                        <Clock size={11} />
                        {isOverdue
                          ? `Overdue (${Math.abs(p.daysUntilDue!)}d)`
                          : `Due in ${p.daysUntilDue}d`}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--t-sage)" }}>
                        {p.isMatured ? "Matured" : "Fully Paid"}
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenLedger(p)}
                        title="Payment Ledger"
                        style={{ padding: 5, color: "var(--t-muted)" }}
                      >
                        <ListOrdered size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(p)}
                        title="Edit Policy"
                        style={{ padding: 5, color: "var(--t-muted)" }}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(p)}
                        title="Delete Policy"
                        style={{ padding: 5, color: "var(--t-rust)" }}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
