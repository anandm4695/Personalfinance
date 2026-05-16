// @ts-nocheck
import React, { useState } from "react";
import { Plus, Play, Pause, Pencil, Trash2, Repeat, Wallet } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { StatCard } from "../ui/StatCard";
import { SubModal } from "../modals/SubModal";
import { SectionTitle } from "../ui/SectionTitle";

// Internal helper components




const SubEmptyState = ({ onAdd }: any) => (
  <div style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#ea580c 0%,#fb923c 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Repeat size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Subscriptions Tracked</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>Track Netflix, Spotify, Swiggy One, cloud tools, and any recurring bill — monthly or annual — so nothing slips through unnoticed.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Streaming & OTT", "Monthly / Annual Cycles", "Renewal Alerts", "Monthly Spend View"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(234,88,12,0.08)", color: "#ea580c", fontWeight: 600, border: "1px solid rgba(234,88,12,0.15)" }}>● {f}</span>
      ))}
    </div>
    <button style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,#ea580c 0%,#fb923c 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onAdd}>
      <Plus size={16} /> Add First Subscription
    </button>
  </div>
);

const btnSolid = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  background: THEME.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const iconBtn = {
  padding: 6,
  background: "transparent",
  border: "none",
  color: THEME.muted,
  cursor: "pointer",
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const card = {
  background: "var(--surface-0)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

const th = { textAlign: "left" as const, padding: "12px 8px", color: THEME.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const td = { padding: "16px 8px" };

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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle sub="Manage recurring services, streaming, and software bills">
          Subscriptions
        </SectionTitle>
        {state.subscriptions.length > 0 && (
          <button style={btnSolid} onClick={() => setShow(true)}>
            <Plus size={14} /> Add Subscription
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
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
        <div style={card}>
          <SubEmptyState onAdd={() => setShow(true)} />
        </div>
      ) : (
        <div style={card}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                  <th style={th}>Service</th>
                  <th style={th}>Category</th>
                  <th style={th}>Cycle</th>
                  <th style={th}>Next Renewal</th>
                  <th style={{ ...th, textAlign: "right" }}>Amount</th>
                  <th style={{ ...th, textAlign: "right" }}>Monthly Equiv</th>
                  <th style={th}></th>
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
                      style={{ borderBottom: `1px dashed ${THEME.line}`, opacity: s.paused ? 0.5 : 1 }}
                    >
                      <td style={{ ...td, fontWeight: 600 }}>
                        {s.name}
                        {s.paused && <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 6px", background: THEME.muted, color: THEME.paper, borderRadius: 4, letterSpacing: "0.1em" }}>PAUSED</span>}
                      </td>
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>
                        {s.category}
                      </td>
                      <td style={{ ...td, textTransform: "capitalize" }}>
                        {s.cycle}
                      </td>
                      <td style={td}>{s.renewalDate || "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(s.amount)}</td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: THEME.muted }}>{fmtINRFull(monthly)}</td>
                      <td style={{ ...td, display: "flex", gap: 6 }}>
                        <button
                          onClick={() => updateItem("subscriptions", s.id, { paused: !s.paused })}
                          style={{ ...iconBtn, color: s.paused ? THEME.sage : THEME.gold }}
                          title={s.paused ? "Resume" : "Pause"}
                        >
                          {s.paused ? <Play size={13} /> : <Pause size={13} />}
                        </button>
                        <button onClick={() => setEditSub(s)} style={iconBtn} title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => removeItem("subscriptions", s.id)} style={iconBtn} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
