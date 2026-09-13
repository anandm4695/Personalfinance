import React, { useState, useMemo } from "react";
import {
  Milestone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Receipt,
  Plus,
  ArrowRight,
  Filter,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { Money } from "../ui/Money";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import {
  DEMAND_HEX,
  fmtDate,
  RealEstateProperty,
  RealEstateDemand,
  RealEstatePayment,
} from "./RealEstateTypes";

interface RealEstateDemandTimelineProps {
  properties: RealEstateProperty[];
  demands: RealEstateDemand[];
  payments: RealEstatePayment[];
  onAddDemand: (p: RealEstateProperty) => void;
  onEditDemand: (d: RealEstateDemand) => void;
  onDeleteDemand: (id: string) => void;
  onAddPayment: (p: RealEstateProperty, d?: RealEstateDemand) => void;
}

export const RealEstateDemandTimeline: React.FC<RealEstateDemandTimelineProps> = ({
  properties,
  demands,
  payments,
  onAddDemand,
  onEditDemand,
  onDeleteDemand,
  onAddPayment,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const propertyMap = useMemo(() => {
    return new Map(properties.map((p) => [p.id, p]));
  }, [properties]);

  const filteredDemands = useMemo(() => {
    return demands
      .filter((d) => {
        if (selectedPropertyId !== "all" && d.propertyId !== selectedPropertyId) return false;
        if (statusFilter !== "all" && d.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => (a.demandDate > b.demandDate ? -1 : 1));
  }, [demands, selectedPropertyId, statusFilter]);

  const totalDemanded = demands.reduce(
    (s, d) => s + Number(d.totalAmount || d.amount || 0),
    0
  );
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalOutstanding = Math.max(0, totalDemanded - totalPaid);

  return (
    <div>
      {/* ── Summary & Filter Banner ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "14px 18px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: "var(--radius-lg)",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
              Total Demands:{" "}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
              <Money value={totalDemanded} variant="full" />
            </span>
          </div>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
              Disbursed:{" "}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
              <Money value={totalPaid} variant="full" />
            </span>
          </div>
          {totalOutstanding > 0 && (
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.rust, textTransform: "uppercase" }}>
                Pending:{" "}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>
                <Money value={totalOutstanding} variant="full" />
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-1)",
              color: THEME.ink,
              fontSize: 12,
              fontWeight: 600,
              outline: "none",
            }}
          >
            <option value="all">All Properties ({properties.length})</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 4 }}>
            {(
              [
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "paid", label: "Paid" },
                { id: "overdue", label: "Overdue" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`demat-portfolio-pill ${statusFilter === s.id ? "active" : ""}`}
                style={{ fontSize: 11, padding: "4px 8px" }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Demands Timeline List ── */}
      {filteredDemands.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div style={{ color: THEME.muted, fontSize: 13, fontStyle: "italic" }}>
            No demand letters found matching the selected filter criteria.
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filteredDemands.map((demand, idx) => {
            const prop = propertyMap.get(demand.propertyId);
            const statusHex = DEMAND_HEX[demand.status] || THEME.muted;
            const linkedPayments = payments.filter((p) => p.demandId === demand.id);
            const paidSum = linkedPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
            const isFullyPaid = demand.status === "paid" || paidSum >= Number(demand.totalAmount || demand.amount);

            return (
              <Card
                key={demand.id}
                variant="base"
                style={{
                  padding: "18px 22px",
                  borderLeft: `4px solid ${statusHex}`,
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: THEME.ink,
                        }}
                      >
                        {demand.milestone || `Milestone Demand #${filteredDemands.length - idx}`}
                      </span>

                      {prop && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: THEME.accent,
                            background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-xs)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Building2 size={11} /> {prop.name}
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: statusHex,
                          background: `color-mix(in srgb, ${statusHex} 16%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${statusHex} 30%, transparent)`,
                          padding: "2px 8px",
                          borderRadius: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        {demand.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 12, color: THEME.muted }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={12} /> Demand: {fmtDate(demand.demandDate)}
                      </span>
                      {demand.dueDate && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: demand.status === "overdue" ? THEME.rust : THEME.muted,
                            fontWeight: demand.status === "overdue" ? 700 : 400,
                          }}
                        >
                          <Clock size={12} /> Due: {fmtDate(demand.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Amount & Actions */}
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        fontWeight: 900,
                        color: THEME.ink,
                      }}
                    >
                      <Money value={Number(demand.totalAmount || demand.amount)} variant="full" />
                    </div>
                    {demand.gstAmount && Number(demand.gstAmount) > 0 && (
                      <div style={{ fontSize: 11, color: THEME.muted }}>
                        (Basic: {fmtDate(demand.amount?.toString() || "")} + GST: ₹{Number(demand.gstAmount).toLocaleString("en-IN")})
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                      {!isFullyPaid && prop && (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => onAddPayment(prop, demand)}
                          icon={<Receipt size={12} />}
                        >
                          Pay Demand
                        </Button>
                      )}
                      <button
                        onClick={() => onEditDemand(demand)}
                        style={{
                          background: "var(--surface-1)",
                          border: `1px solid ${THEME.line}`,
                          cursor: "pointer",
                          color: THEME.muted,
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteDemand(demand.id)}
                        className="icon-btn danger"
                        style={{
                          background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                          cursor: "pointer",
                          color: THEME.rust,
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Linked Payment Records */}
                {linkedPayments.length > 0 && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 18%, transparent)`,
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.sage, marginBottom: 4 }}>
                      Disbursements towards this milestone:
                    </div>
                    {linkedPayments.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: THEME.ink,
                          padding: "2px 0",
                        }}
                      >
                        <span>
                          {fmtDate(p.paymentDate)} via {p.paymentMode} {p.referenceNumber ? `(Ref: ${p.referenceNumber})` : ""}
                        </span>
                        <span style={{ fontWeight: 700, color: THEME.sage }}>
                          +<Money value={Number(p.amount)} variant="full" />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
