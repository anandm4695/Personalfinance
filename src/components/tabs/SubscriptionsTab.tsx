// @ts-nocheck
import React, { useState } from "react";
import { Plus, Play, Pause, Pencil, Trash2, Repeat, Wallet } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { SubModal } from "../modals/SubModal";

// Internal helper components
const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{children}</h2>
    {sub && <p style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>{sub}</p>}
  </div>
);

const Tile = ({ icon: Icon, label, value, sub, subColor }: any) => (
  <div style={{ background: "var(--t-darkInk)", padding: 20, borderRadius: 12, border: `1px solid ${THEME.line}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: THEME.muted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
      <Icon size={14} /> {label}
    </div>
    <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: subColor || THEME.muted, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted }}>
    <Repeat size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
    <div style={{ fontSize: 14 }}>{text}</div>
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
  background: "var(--t-darkInk)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

const th = { textAlign: "left" as const, padding: "12px 8px", color: THEME.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const td = { padding: "16px 8px" };

export function SubscriptionsTab({ state, addItem, removeItem, updateItem, metrics }: any) {
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
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Subscription
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Repeat} label="Active Subscriptions" value={activeSubs.length} />
        <Tile icon={Wallet} label="Monthly Equivalent" value={fmtINRFull(totalMonthly)} />
        <Tile icon={Repeat} label="Total Tracked" value={state.subscriptions.length} />
      </div>

      {state.subscriptions.length === 0 ? (
        <div style={card}>
          <EmptyHint text="No subscriptions added yet." />
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
