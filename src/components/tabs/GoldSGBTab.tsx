// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Coins,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  IndianRupee,
  Calendar,
  Award,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINR, fmtINRFull, uid, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const GOLD_TYPES = [
  { id: "physical", label: "Physical Gold", color: "#F59E0B" },
  { id: "sgb", label: "Sovereign Gold Bond (SGB)", color: "#10B981" },
  { id: "digital", label: "Digital Gold", color: "#3B82F6" },
  { id: "etf", label: "Gold ETF", color: "#8B5CF6" },
  { id: "mf", label: "Gold Mutual Fund", color: "#EC4899" },
];

const EMPTY_GOLD = {
  name: "", type: "physical", grams: 0, purchasePrice: 0, purchaseDate: "",
  maturityDate: "", interestRate: 2.5, notes: "", owner: "self", purity: "24K",
};

// Approximate gold price per gram (user can refresh)
const DEFAULT_GOLD_PRICE = 7200; // ₹ per gram for 24K

export const GoldSGBTab = ({ state, addItem, removeItem, updateItem }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_GOLD });
  const [goldPrice, setGoldPrice] = useState(() => {
    try {
      return Number(localStorage.getItem("gold_price_per_gram")) || DEFAULT_GOLD_PRICE;
    } catch { return DEFAULT_GOLD_PRICE; }
  });
  const [manualPrice, setManualPrice] = useState(false);

  const holdings = useMemo(() => [...(state.goldHoldings || [])], [state.goldHoldings]);

  const enriched = useMemo(() => {
    return holdings.map((h) => {
      const grams = Number(h.grams || 0);
      const purchasePrice = Number(h.purchasePrice || 0);
      const currentValue = grams * goldPrice;
      const invested = purchasePrice > 0 ? purchasePrice : grams * goldPrice;
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

      // SGB interest
      let interest = 0;
      if (h.type === "sgb" && h.purchaseDate) {
        const years = (new Date().getTime() - new Date(h.purchaseDate).getTime()) / (365.25 * 86400000);
        interest = invested * (Number(h.interestRate || 2.5) / 100) * years;
      }

      const typeInfo = GOLD_TYPES.find((t) => t.id === h.type) || GOLD_TYPES[0];
      return { ...h, grams, invested, currentValue, pnl, pnlPct, interest, typeInfo };
    });
  }, [holdings, goldPrice]);

  const stats = useMemo(() => {
    const totalGrams = enriched.reduce((s, h) => s + h.grams, 0);
    const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
    const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
    const totalPnL = totalValue - totalInvested;
    const totalInterest = enriched.filter((h) => h.type === "sgb").reduce((s, h) => s + h.interest, 0);

    const byType = GOLD_TYPES.map((t) => {
      const items = enriched.filter((h) => h.type === t.id);
      return {
        name: t.label,
        grams: items.reduce((s, h) => s + h.grams, 0),
        value: items.reduce((s, h) => s + h.currentValue, 0),
        color: t.color,
      };
    }).filter((t) => t.grams > 0);

    return { totalGrams, totalInvested, totalValue, totalPnL, totalInterest, byType };
  }, [enriched]);

  const handleSave = async () => {
    if (editingId) {
      await updateItem("goldHoldings", editingId, form);
    } else {
      await addItem("goldHoldings", { ...form, id: uid() });
    }
    setShowModal(false);
    setForm({ ...EMPTY_GOLD });
    setEditingId(null);
  };

  const handleEdit = (h) => {
    setForm({ name: h.name, type: h.type, grams: h.grams, purchasePrice: h.purchasePrice, purchaseDate: h.purchaseDate,
      maturityDate: h.maturityDate, interestRate: h.interestRate || 2.5, notes: h.notes, owner: h.owner, purity: h.purity });
    setEditingId(h.id);
    setShowModal(true);
  };

  const updateGoldPrice = (price) => {
    setGoldPrice(price);
    localStorage.setItem("gold_price_per_gram", String(price));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle icon={Coins} title="Gold & Sovereign Gold Bonds" subtitle="Track physical gold, SGBs, ETFs and digital gold" />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
            <Coins size={14} color="#F59E0B" />
            <span style={{ fontSize: 12, color: THEME.textSecondary }}>Gold:</span>
            {manualPrice ? (
              <input type="number" value={goldPrice} onChange={(e) => updateGoldPrice(Number(e.target.value))}
                onBlur={() => setManualPrice(false)} autoFocus
                style={{ width: 70, padding: "2px 4px", borderRadius: 4, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 13 }} />
            ) : (
              <span onClick={() => setManualPrice(true)} style={{ fontSize: 13, fontWeight: 600, color: "#F59E0B", cursor: "pointer" }}>
                {fmtINRFull(goldPrice)}/g
              </span>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => { setForm({ ...EMPTY_GOLD }); setEditingId(null); setShowModal(true); }}>
            <Plus size={16} /> Add Gold
          </Button>
        </div>
      </div>

      {holdings.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <StatCard label="Total Gold" value={`${stats.totalGrams.toFixed(2)}g`} icon={Coins} color="#F59E0B" />
          <StatCard label="Current Value" value={<Prv>{fmtINRFull(stats.totalValue)}</Prv>} icon={IndianRupee} color="#3B82F6" />
          <StatCard label="P&L" value={<Prv>{fmtINRFull(stats.totalPnL)}</Prv>} icon={TrendingUp}
            color={stats.totalPnL >= 0 ? "#10B981" : "#EF4444"} />
          {stats.totalInterest > 0 && (
            <StatCard label="SGB Interest Earned" value={<Prv>{fmtINRFull(stats.totalInterest)}</Prv>} icon={Award} color="#10B981" />
          )}
        </div>
      )}

      {/* Type Breakdown */}
      {stats.byType.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>By Type</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.byType} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}>
                  {stats.byType.map((t, i) => <Cell key={i} fill={t.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtINRFull(v)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Holdings by Type</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {stats.byType.map((t) => (
                <div key={t.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: THEME.bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />
                    <span style={{ fontSize: 13, color: THEME.text }}>{t.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}><Prv>{fmtINRFull(t.value)}</Prv></div>
                    <div style={{ fontSize: 11, color: THEME.textSecondary }}>{t.grams.toFixed(2)}g</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Holdings Cards */}
      {enriched.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {enriched.map((h) => (
            <Card key={h.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${h.typeInfo.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Coins size={20} color={h.typeInfo.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: THEME.text }}>{h.name || h.typeInfo.label}</div>
                    <div style={{ fontSize: 12, color: THEME.textSecondary }}>{h.typeInfo.label} {h.purity && `• ${h.purity}`}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => handleEdit(h)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textSecondary, padding: 4 }}><Edit2 size={14} /></button>
                  <button onClick={() => removeItem("goldHoldings", h.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                <div><div style={{ color: THEME.textSecondary, fontSize: 11 }}>Weight</div><div style={{ fontWeight: 600 }}>{h.grams}g</div></div>
                <div><div style={{ color: THEME.textSecondary, fontSize: 11 }}>Current Value</div><div style={{ fontWeight: 600, color: "#F59E0B" }}><Prv>{fmtINRFull(h.currentValue)}</Prv></div></div>
                <div><div style={{ color: THEME.textSecondary, fontSize: 11 }}>Invested</div><div style={{ fontWeight: 600 }}><Prv>{fmtINRFull(h.invested)}</Prv></div></div>
                <div><div style={{ color: THEME.textSecondary, fontSize: 11 }}>P&L</div>
                  <div style={{ fontWeight: 600, color: h.pnl >= 0 ? "#10B981" : "#EF4444" }}>
                    <Prv>{h.pnl >= 0 ? "+" : ""}{fmtINRFull(h.pnl)}</Prv> ({h.pnlPct.toFixed(1)}%)
                  </div>
                </div>
                {h.type === "sgb" && (
                  <>
                    <div><div style={{ color: THEME.textSecondary, fontSize: 11 }}>Interest Rate</div><div style={{ fontWeight: 600 }}>{h.interestRate}% p.a.</div></div>
                    <div><div style={{ color: THEME.textSecondary, fontSize: 11 }}>Interest Earned</div><div style={{ fontWeight: 600, color: "#10B981" }}><Prv>{fmtINRFull(h.interest)}</Prv></div></div>
                    {h.maturityDate && <div><div style={{ color: THEME.textSecondary, fontSize: 11 }}>Maturity</div><div style={{ fontWeight: 600 }}>{h.maturityDate}</div></div>}
                  </>
                )}
              </div>
              {h.owner && h.owner !== "self" && (
                <div style={{ marginTop: 8, fontSize: 11, color: THEME.textSecondary }}>Owner: {h.owner}</div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Coins} title="No Gold Holdings"
          description="Track your physical gold, Sovereign Gold Bonds (SGBs), Gold ETFs, and digital gold holdings." />
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editingId ? "Edit Gold Holding" : "Add Gold Holding"} onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Name / Description">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Gold Chain 22K"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }}>
                {GOLD_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Weight (grams)">
              <input type="number" step="0.01" value={form.grams} onChange={(e) => setForm({ ...form, grams: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
            <Field label="Purchase Price (total ₹)">
              <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
            {form.type === "physical" && (
              <Field label="Purity">
                <select value={form.purity} onChange={(e) => setForm({ ...form, purity: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }}>
                  {["24K", "22K", "18K", "14K"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            )}
            <Field label="Purchase Date">
              <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
            {form.type === "sgb" && (
              <>
                <Field label="Maturity Date">
                  <input type="date" value={form.maturityDate} onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
                </Field>
                <Field label="Interest Rate (% p.a.)">
                  <input type="number" step="0.1" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
                </Field>
              </>
            )}
            <Field label="Owner">
              <select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }}>
                {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
          </div>
          <ModalActions>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!form.grams}>Save</Button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
};
