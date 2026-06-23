// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
  Home,
  Car,
  Heart,
  Plane,
  Baby,
  Briefcase,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, uid, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const EVENT_TYPES = [
  { id: "education", label: "Child's Education", icon: GraduationCap, color: "#3B82F6", inflationRate: 10 },
  { id: "home", label: "Home Purchase", icon: Home, color: "#10B981", inflationRate: 7 },
  { id: "car", label: "Vehicle Purchase", icon: Car, color: "#F59E0B", inflationRate: 5 },
  { id: "wedding", label: "Wedding", icon: Heart, color: "#EF4444", inflationRate: 8 },
  { id: "vacation", label: "Vacation / Travel", icon: Plane, color: "#8B5CF6", inflationRate: 6 },
  { id: "baby", label: "New Baby", icon: Baby, color: "#EC4899", inflationRate: 7 },
  { id: "retirement", label: "Retirement", icon: Briefcase, color: "#6366F1", inflationRate: 6 },
  { id: "other", label: "Other", icon: Calendar, color: "#64748B", inflationRate: 6 },
];

const EMPTY_EVENT = { name: "", type: "education", targetDate: "", estimatedCost: 0, currentSaved: 0, notes: "", priority: "high" };

export const LifeEventPlannerTab = ({ state, metrics, addItem, removeItem, updateItem }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_EVENT });

  const events = useMemo(() => {
    return [...(state.lifeEvents || [])].sort((a, b) => (a.targetDate || "").localeCompare(b.targetDate || ""));
  }, [state.lifeEvents]);

  const enrichedEvents = useMemo(() => {
    const now = new Date();
    return events.map((e) => {
      const evType = EVENT_TYPES.find((t) => t.id === e.type) || EVENT_TYPES[7];
      const targetDate = new Date(e.targetDate);
      const yearsAway = Math.max(0, (targetDate.getTime() - now.getTime()) / (365.25 * 86400000));
      const inflatedCost = Number(e.estimatedCost || 0) * Math.pow(1 + evType.inflationRate / 100, yearsAway);
      const saved = Number(e.currentSaved || 0);
      const gap = Math.max(0, inflatedCost - saved);
      const monthlySIP = yearsAway > 0 ? gap / (yearsAway * 12) : gap;
      const progress = inflatedCost > 0 ? (saved / inflatedCost) * 100 : 0;
      const isPast = targetDate < now;

      return { ...e, evType, yearsAway, inflatedCost, gap, monthlySIP, progress, isPast };
    });
  }, [events]);

  const timeline = useMemo(() => {
    const yearMap = {};
    enrichedEvents.forEach((e) => {
      if (e.isPast) return;
      const year = e.targetDate?.slice(0, 4) || "Unknown";
      if (!yearMap[year]) yearMap[year] = { year, total: 0, events: [] };
      yearMap[year].total += e.inflatedCost;
      yearMap[year].events.push(e);
    });
    return Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year));
  }, [enrichedEvents]);

  const totalCost = enrichedEvents.filter((e) => !e.isPast).reduce((s, e) => s + e.inflatedCost, 0);
  const totalSaved = enrichedEvents.filter((e) => !e.isPast).reduce((s, e) => s + Number(e.currentSaved || 0), 0);
  const totalGap = totalCost - totalSaved;
  const totalMonthlySIP = enrichedEvents.filter((e) => !e.isPast).reduce((s, e) => s + e.monthlySIP, 0);

  const handleSave = async () => {
    if (editingId) {
      await updateItem("lifeEvents", editingId, form);
    } else {
      await addItem("lifeEvents", { ...form, id: uid() });
    }
    setShowModal(false);
    setForm({ ...EMPTY_EVENT });
    setEditingId(null);
  };

  const handleEdit = (e) => {
    setForm({ name: e.name, type: e.type, targetDate: e.targetDate, estimatedCost: e.estimatedCost, currentSaved: e.currentSaved, notes: e.notes, priority: e.priority });
    setEditingId(e.id);
    setShowModal(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle icon={Calendar} title="Life Event Planner" subtitle="Plan for major financial milestones" />
        <Button variant="primary" size="sm" onClick={() => { setForm({ ...EMPTY_EVENT }); setEditingId(null); setShowModal(true); }}>
          <Plus size={16} /> Add Event
        </Button>
      </div>

      {events.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <StatCard label="Total Future Cost" value={<Prv>{fmtINRFull(totalCost)}</Prv>} icon={IndianRupee} color="#EF4444" />
          <StatCard label="Already Saved" value={<Prv>{fmtINRFull(totalSaved)}</Prv>} icon={CheckCircle} color="#10B981" />
          <StatCard label="Gap to Fill" value={<Prv>{fmtINRFull(totalGap)}</Prv>} icon={AlertTriangle} color="#F59E0B" />
          <StatCard label="Monthly SIP Needed" value={<Prv>{fmtINRFull(totalMonthlySIP)}</Prv>} icon={TrendingUp} color="var(--accent)" />
        </div>
      )}

      {/* Timeline Chart */}
      {timeline.length > 0 && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Timeline View</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: THEME.textSecondary }} />
              <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
              <Bar dataKey="total" name="Inflation-Adjusted Cost" fill="var(--accent)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Event Cards */}
      {enrichedEvents.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {enrichedEvents.map((e) => {
            const Icon = e.evType.icon;
            return (
              <Card key={e.id} style={{ padding: 20, opacity: e.isPast ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${e.evType.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={20} color={e.evType.color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: THEME.text }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                        {e.evType.label} — {e.isPast ? "Past" : `${e.yearsAway.toFixed(1)} years away`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => handleEdit(e)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textSecondary, padding: 4 }}><Edit2 size={14} /></button>
                    <button onClick={() => removeItem("lifeEvents", e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.textSecondary, marginBottom: 4 }}>
                    <span>Progress</span>
                    <span>{Math.min(100, e.progress).toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: THEME.border, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, e.progress)}%`, borderRadius: 4, background: e.evType.color, transition: "width 0.5s" }} />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                  <div>
                    <div style={{ color: THEME.textSecondary, fontSize: 11 }}>Today's Cost</div>
                    <div style={{ fontWeight: 600, color: THEME.text }}><Prv>{fmtINRFull(e.estimatedCost)}</Prv></div>
                  </div>
                  <div>
                    <div style={{ color: THEME.textSecondary, fontSize: 11 }}>Inflation-Adjusted</div>
                    <div style={{ fontWeight: 600, color: "#EF4444" }}><Prv>{fmtINRFull(e.inflatedCost)}</Prv></div>
                  </div>
                  <div>
                    <div style={{ color: THEME.textSecondary, fontSize: 11 }}>Saved So Far</div>
                    <div style={{ fontWeight: 600, color: "#10B981" }}><Prv>{fmtINRFull(e.currentSaved)}</Prv></div>
                  </div>
                  <div>
                    <div style={{ color: THEME.textSecondary, fontSize: 11 }}>Monthly SIP Needed</div>
                    <div style={{ fontWeight: 600, color: "var(--accent)" }}><Prv>{fmtINRFull(e.monthlySIP)}</Prv></div>
                  </div>
                </div>

                {e.notes && (
                  <div style={{ marginTop: 8, fontSize: 12, color: THEME.textSecondary, fontStyle: "italic" }}>{e.notes}</div>
                )}

                <div style={{ marginTop: 8, fontSize: 11, color: THEME.textSecondary }}>
                  Target: {e.targetDate} • Inflation: {e.evType.inflationRate}% p.a. • Priority: {e.priority}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Calendar} title="No Life Events Planned"
          description="Add major financial milestones like child's education, home purchase, wedding, or retirement to see how much you need to save." />
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editingId ? "Edit Life Event" : "Add Life Event"} onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Event Name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Daughter's College"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
            <Field label="Event Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }}>
                {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Target Date">
              <input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
            <Field label="Estimated Cost (today's value)">
              <input type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
            <Field label="Amount Already Saved">
              <input type="number" value={form.currentSaved} onChange={(e) => setForm({ ...form, currentSaved: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
            <Field label="Notes (optional)">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text }} />
            </Field>
          </div>
          <ModalActions>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!form.name || !form.targetDate}>Save</Button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
};
