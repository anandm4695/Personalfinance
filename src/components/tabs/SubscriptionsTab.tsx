// @ts-nocheck
import React, { useState } from "react";
import { Plus, Play, Pause, Pencil, Trash2, Repeat, Wallet } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { StatCard } from "../ui/StatCard";
import { SubModal } from "../modals/SubModal";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

// Internal helper components




const SubEmptyState = ({ onAdd }: any) => (
  <Card style={{ padding: "64px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#ea580c 0%,#fb923c 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px rgba(234,88,12,0.2)" }}>
      <Repeat size={28} color="#fff" />
    </div>
    <div>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>No Subscriptions Tracked</h3>
      <p style={{ fontSize: 14, color: THEME.muted, maxWidth: 420, lineHeight: 1.6, margin: "0 auto" }}>
        Track Netflix, Spotify, Swiggy One, cloud tools, and any recurring bill — monthly or annual — so nothing slips through unnoticed.
      </p>
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
      {["Streaming & OTT", "Monthly / Annual Cycles", "Renewal Alerts", "Monthly Spend View"].map(f => (
        <Badge key={f} variant="muted" style={{ padding: "6px 14px", fontSize: 11 }}>● {f}</Badge>
      ))}
    </div>
    <Button variant="accent" size="lg" icon={<Plus size={18} />} onClick={onAdd} style={{ marginTop: 8 }}>
      Add First Subscription
    </Button>
  </Card>
);

const th = { textAlign: "left" as const, padding: "12px 10px", color: THEME.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", borderBottom: `1px solid ${THEME.line}` };
const td = { padding: "16px 10px", fontSize: 14 };

export function SubscriptionsTab({ state, addItem, removeItem, updateItem }: any) {
  const [show, setShow] = useState(false);
  const [editSub, setEditSub] = useState<any>(null);

  const activeSubs = state.subscriptions.filter((s: any) => !s.paused);
  const totalMonthly = activeSubs.reduce((acc: number, s: any) => {
    const amount = Number(s.amount) || 0;
    if (s.cycle === "yearly") return acc + amount / 12;
    if (s.cycle === "quarterly") return acc + amount / 3;
    return acc + amount;
  }, 0);

  return (
    <div className="tab-content-enter">
      <SectionTitle 
        sub="Manage recurring services, streaming, and software bills"
        rightElement={
          state.subscriptions.length > 0 && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShow(true)}>
              Add Subscription
            </Button>
          )
        }
      >
        Subscriptions
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard 
          icon={<Repeat />} 
          label="Active Subscriptions" 
          value={activeSubs.length} 
          color={THEME.accent}
          sub="Monthly/Annual recurring"
        />
        <StatCard 
          icon={<Wallet />} 
          label="Monthly Equivalent" 
          value={fmtINRFull(totalMonthly)} 
          color={THEME.gold}
          sub="Projected monthly spend"
        />
        <StatCard 
          icon={<Repeat />} 
          label="Total Tracked" 
          value={state.subscriptions.length} 
          color={THEME.muted}
          sub="Including paused services"
        />
      </div>

      {state.subscriptions.length === 0 ? (
        <SubEmptyState onAdd={() => setShow(true)} />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(128,128,128,0.02)" }}>
                  <th style={th}>Service</th>
                  <th style={th}>Category</th>
                  <th style={th}>Cycle</th>
                  <th style={th}>Next Renewal</th>
                  <th style={{ ...th, textAlign: "right" }}>Amount</th>
                  <th style={{ ...th, textAlign: "right" }}>Monthly Equiv</th>
                  <th style={{ ...th, width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {state.subscriptions.map((s: any) => {
                  const monthly =
                    s.cycle === "yearly"
                      ? Number(s.amount) / 12
                      : s.cycle === "quarterly"
                      ? Number(s.amount) / 3
                      : Number(s.amount);
                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: `1px solid ${THEME.line}`, opacity: s.paused ? 0.6 : 1, transition: "background 0.2s" }}
                      className="table-row-hover"
                    >
                      <td style={{ ...td, fontWeight: 800, color: THEME.ink }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {s.name}
                          {s.paused && <Badge variant="muted" style={{ fontSize: 9 }}>PAUSED</Badge>}
                        </div>
                      </td>
                      <td style={td}><Badge variant="muted" style={{ fontSize: 10 }}>{s.category}</Badge></td>
                      <td style={{ ...td, textTransform: "capitalize", fontWeight: 600 }}>{s.cycle}</td>
                      <td style={{ ...td, color: THEME.muted }}>{s.renewalDate || "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{fmtINRFull(s.amount)}</td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: THEME.muted, fontWeight: 600 }}>{fmtINRFull(monthly)}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateItem("subscriptions", s.id, { paused: !s.paused })}
                            style={{ padding: 6, color: s.paused ? THEME.sage : THEME.gold }}
                            title={s.paused ? "Resume" : "Pause"}
                          >
                            {s.paused ? <Play size={14} /> : <Pause size={14} />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditSub(s)} style={{ padding: 6 }}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeItem("subscriptions", s.id)} style={{ padding: 6, color: THEME.rust }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {show && (
        <SubModal
          onClose={() => setShow(false)}
          onSave={(v: any) => { addItem("subscriptions", v); setShow(false); }}
        />
      )}
      {editSub && (
        <SubModal
          initialValues={editSub}
          onClose={() => setEditSub(null)}
          onSave={(v: any) => { updateItem("subscriptions", editSub.id, v); setEditSub(null); }}
        />
      )}
    </div>
  );
}
