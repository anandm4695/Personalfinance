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
import { EmptyState } from "../ui/EmptyState";
const SUB_LOGOS: Record<string, string> = {
  netflix: "netflix.com",
  spotify: "spotify.com",
  amazon: "amazon.in",
  prime: "primevideo.com",
  hotstar: "hotstar.com",
  youtube: "youtube.com",
  apple: "apple.com",
  google: "google.com",
  icloud: "apple.com",
  swiggy: "swiggy.com",
  zomato: "zomato.com",
  "1password": "1password.com",
  cursor: "cursor.com",
  openai: "openai.com",
  claude: "anthropic.com",
  figma: "figma.com",
  notion: "notion.so",
  slack: "slack.com",
  zoom: "zoom.us",
  adobe: "adobe.com",
  canva: "canva.com",
  linkedin: "linkedin.com",
};

const ServiceLogo = ({ name, size = 40 }: { name: string; size?: number }) => {
  const n = (name || "").toLowerCase();
  let domain = "";
  for (const [k, d] of Object.entries(SUB_LOGOS)) {
    if (n.includes(k)) { domain = d; break; }
  }

  if (domain) {
    return (
      <div style={{ width: size, height: size, borderRadius: 10, background: "#fff", border: `1px solid ${THEME.line}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
        <img 
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} 
          alt={name} 
          style={{ width: "70%", height: "70%", objectFit: "contain" }}
          onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement!.innerHTML = `<span style="font-size: ${size/2.5}px; font-weight: 800; color: ${THEME.muted}">${name.slice(0, 2).toUpperCase()}</span>`; }}
        />
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: "rgba(128,128,128,0.1)", border: `1px solid ${THEME.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size/2.5, fontWeight: 800, color: THEME.muted }}>{name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
};

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
        <EmptyState
          icon={Repeat}
          gradient="linear-gradient(135deg,#ea580c 0%,#fb923c 100%)"
          dotColor="#ea580c"
          title="No Subscriptions Tracked"
          description="Track Netflix, Spotify, Swiggy One, cloud tools, and any recurring bill — monthly or annual — so nothing slips through unnoticed."
          pills={["Streaming & OTT", "Monthly / Annual Cycles", "Renewal Alerts", "Monthly Spend View"]}
          buttonLabel="Add First Subscription"
          onAdd={() => setShow(true)}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
          {state.subscriptions.map((s: any) => {
            const monthly = s.cycle === "yearly" ? Number(s.amount) / 12 : s.cycle === "quarterly" ? Number(s.amount) / 3 : Number(s.amount);
            const color = s.paused ? THEME.muted : THEME.accent;
            
            return (
              <Card key={s.id} style={{ padding: "16px 20px", borderLeft: `3px solid ${color}`, opacity: s.paused ? 0.7 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Logo */}
                  <ServiceLogo name={s.name} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.01em" }}>{s.name}</span>
                      {s.paused && <Badge variant="muted" style={{ fontSize: 9 }}>PAUSED</Badge>}
                      <Badge variant="muted" style={{ fontSize: 9, opacity: 0.8 }}>{s.category}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 6, rowGap: 2 }}>
                      <span style={{ color, whiteSpace: "nowrap" }}>{fmtINRFull(s.amount)}</span>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <span style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{s.cycle}</span>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <span style={{ whiteSpace: "nowrap" }}>Next: {s.renewalDate || "—"}</span>
                    </div>
                    {s.remark && (
                      <div 
                        style={{ 
                          fontSize: 11, 
                          color: THEME.muted, 
                          marginTop: 5, 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 4,
                          fontWeight: 500,
                          opacity: 0.9,
                        }}
                        title={s.remark}
                      >
                        <span style={{ opacity: 0.7 }}>💬</span>
                        <span style={{ 
                          fontStyle: "italic",
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: "nowrap" 
                        }}>
                          {s.remark}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Monthly Equivalent & Renewal Amount */}
                  <div style={{ textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(monthly)}</div>
                    <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>equiv/mo</div>
                    {s.cycle !== "monthly" && (
                      <div 
                        style={{ 
                          fontSize: 10.5, 
                          color: THEME.muted, 
                          fontWeight: 700, 
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 3,
                        }}
                        title={`Actual renewal payment of ${fmtINRFull(s.amount)} charged every ${s.cycle}`}
                      >
                        <span style={{ fontSize: 9, opacity: 0.65, fontWeight: 600 }}>RENEWAL:</span>
                        <span style={{ color: color }}>{fmtINRFull(s.amount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
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
                </div>
              </Card>
            );
          })}
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
