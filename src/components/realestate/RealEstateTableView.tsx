import React, { useState } from "react";
import {
  Pencil,
  Trash2,
  ArrowUpDown,
  User,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { Card } from "../ui/Card";
import { Money } from "../ui/Money";
import { useMasterData } from "../../utils/masterData";
import {
  STATUS_HEX,
  TYPE_LABELS,
  EXTERNAL_OWNER_ID,
  RealEstateProperty,
} from "./RealEstateTypes";

interface RealEstateTableViewProps {
  properties: RealEstateProperty[];
  onEditProperty: (p: RealEstateProperty) => void;
  onDeleteProperty: (id: string) => void;
}

export const RealEstateTableView: React.FC<RealEstateTableViewProps> = ({
  properties,
  onEditProperty,
  onDeleteProperty,
}) => {
  const { familyProfiles } = useMasterData();
  const [sortField, setSortField] = useState<string>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedProperties = [...properties].sort((a: any, b: any) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (
      sortField === "agreementValue" ||
      sortField === "agreementValuePaid" ||
      sortField === "marketValue" ||
      sortField === "areaSqft"
    ) {
      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
    } else {
      aVal = (aVal || "").toString().toLowerCase();
      bVal = (bVal || "").toString().toLowerCase();
    }

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const getOwnerName = (o: any) => {
    if (o.id === EXTERNAL_OWNER_ID) return o.name || "External";
    const profile = familyProfiles.find((p: any) => p.id === o.id);
    return profile?.name || o.id;
  };

  const totalAgreement = properties.reduce((s, p) => s + Number(p.agreementValue || 0), 0);
  const totalPaid = properties.reduce((s, p) => s + Number(p.agreementValuePaid || 0), 0);
  const totalMarketVal = properties.reduce(
    (s, p) => s + Number(p.marketValue || p.agreementValue || 0),
    0
  );
  const totalArea = properties.reduce((s, p) => s + Number(p.areaSqft || 0), 0);

  const thStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 11,
    fontWeight: 700,
    color: THEME.muted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: `1.5px solid ${THEME.line}`,
    userSelect: "none",
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 12,
    borderBottom: `1px solid ${THEME.line}`,
    verticalAlign: "middle",
  };

  return (
    <Card variant="base" style={{ overflow: "hidden", marginBottom: 24, borderRadius: "var(--radius-xl)" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-1)" }}>
              <th
                style={{ ...thStyle, textAlign: "left", cursor: "pointer" }}
                onClick={() => handleSort("name")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Property <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ ...thStyle, textAlign: "left" }}>Builder / Dev</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Ownership</th>
              <th
                style={{ ...thStyle, textAlign: "right", cursor: "pointer" }}
                onClick={() => handleSort("areaSqft")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                  Area (sq.ft) <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                style={{ ...thStyle, textAlign: "right", cursor: "pointer" }}
                onClick={() => handleSort("agreementValue")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                  Agreement Value <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                style={{ ...thStyle, textAlign: "right", cursor: "pointer" }}
                onClick={() => handleSort("agreementValuePaid")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                  Paid to Date <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                style={{ ...thStyle, textAlign: "right", cursor: "pointer" }}
                onClick={() => handleSort("marketValue")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                  Market Value <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ ...thStyle, textAlign: "right" }}>Gain / Loss</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedProperties.map((p) => {
              const statusHex = STATUS_HEX[p.status] || THEME.muted;
              const owners = p.owners && p.owners.length > 0 ? p.owners : [{ id: p.owner || "self", sharePct: 100 }];
              const agreeVal = Number(p.agreementValue || 0);
              const paidVal = Number(p.agreementValuePaid || 0);
              const mktVal = Number(p.marketValue || agreeVal);
              const totalCost = agreeVal + Number(p.stampDuty || 0) + Number(p.tdsAmount || 0);
              const gain = mktVal - totalCost;
              const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;

              return (
                <tr key={p.id} style={{ background: "var(--surface-0)", transition: "background 0.15s" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, color: THEME.ink, fontSize: 13 }}>{p.name}</div>
                    {p.location && (
                      <div style={{ fontSize: 11, color: THEME.muted, display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                        <MapPin size={10} color={THEME.accent} /> {p.location}
                      </div>
                    )}
                  </td>

                  <td style={{ ...tdStyle, color: THEME.muted }}>
                    {p.developerName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Building2 size={12} color={THEME.muted} /> {p.developerName}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: statusHex,
                        background: `color-mix(in srgb, ${statusHex} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${statusHex} 26%, transparent)`,
                        padding: "2px 7px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                      }}
                    >
                      {p.status === "under-construction" ? "Under Const." : p.status}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {owners.map((o: any, idx: number) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: THEME.accent,
                            background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          {getOwnerName(o)} ({Number(o.sharePct || 0)}%)
                        </span>
                      ))}
                    </div>
                  </td>

                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted }}>
                    {p.areaSqft ? `${Number(p.areaSqft).toLocaleString("en-IN")}` : "—"}
                  </td>

                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: THEME.ink }}>
                    <Money value={agreeVal} variant="full" />
                  </td>

                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: THEME.sage }}>
                    <Money value={paidVal} variant="full" />
                  </td>

                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 900, color: THEME.ink }}>
                    <Money value={mktVal} variant="full" />
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 800,
                      color: gain >= 0 ? THEME.sage : THEME.rust,
                    }}
                  >
                    <div>{gain >= 0 ? "+" : "−"}<Money value={Math.abs(gain)} variant="full" /></div>
                    <div style={{ fontSize: 10 }}>({gain >= 0 ? "+" : "−"}{Math.abs(gainPct).toFixed(1)}%)</div>
                  </td>

                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      <button
                        onClick={() => onEditProperty(p)}
                        title="Edit Property"
                        className="icon-btn"
                        style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteProperty(p.id)}
                        title="Delete Property"
                        className="icon-btn danger"
                        style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "var(--surface-1)", borderTop: `2px solid ${THEME.line}` }}>
              <td style={{ ...tdStyle, fontWeight: 800, textTransform: "uppercase", fontSize: 11, color: THEME.muted }} colSpan={4}>
                Portfolio Total ({properties.length} propert{properties.length !== 1 ? "ies" : "y"})
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: THEME.muted }}>
                {totalArea > 0 ? `${totalArea.toLocaleString("en-IN")} sq.ft` : "—"}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: THEME.ink }}>
                <Money value={totalAgreement} variant="full" />
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: THEME.sage }}>
                <Money value={totalPaid} variant="full" />
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 900, color: THEME.accent }}>
                <Money value={totalMarketVal} variant="full" />
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: totalMarketVal >= totalAgreement ? THEME.sage : THEME.rust }}>
                {totalMarketVal >= totalAgreement ? "+" : "−"}
                <Money value={Math.abs(totalMarketVal - totalAgreement)} variant="full" />
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};
