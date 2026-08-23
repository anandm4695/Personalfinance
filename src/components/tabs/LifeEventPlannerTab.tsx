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
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAsyncAction } from "../../hooks/useAsyncAction";

const EVENT_TYPES = [
  {
    id: "education",
    label: "Child's Education",
    icon: GraduationCap,
    color: "var(--t-accent)",
    inflationRate: 10,
  },
  { id: "home", label: "Home Purchase", icon: Home, color: "var(--t-sage)", inflationRate: 7 },
  { id: "car", label: "Vehicle Purchase", icon: Car, color: "var(--t-gold)", inflationRate: 5 },
  { id: "wedding", label: "Wedding", icon: Heart, color: "var(--t-rust)", inflationRate: 8 },
  {
    id: "vacation",
    label: "Vacation / Travel",
    icon: Plane,
    color: "var(--t-violet)",
    inflationRate: 6,
  },
  { id: "baby", label: "New Baby", icon: Baby, color: "var(--t-pink)", inflationRate: 7 },
  {
    id: "retirement",
    label: "Retirement",
    icon: Briefcase,
    color: "var(--t-muted)",
    inflationRate: 6,
  },
  { id: "other", label: "Other", icon: Calendar, color: "var(--t-muted)", inflationRate: 6 },
];

const tooltipStyle = () => ({
  background: "var(--t-card-bg)",
  border: `1px solid var(--t-line)`,
  borderRadius: 12,
  color: "var(--t-ink)",
});

const EMPTY_EVENT = {
  name: "",
  type: "education",
  targetDate: "",
  estimatedCost: 0,
  currentSaved: 0,
  notes: "",
  priority: "high",
  owner: "self",
};

const PRIORITY_BADGE = { high: "rust", medium: "gold", low: "muted" };

// Formats "time away" at the resolution that reads naturally: days when close,
// months when under a year, years otherwise — "0.2 years away" for a 2-month-out
// wedding was technically correct but unreadable.
const formatTimeAway = (targetDate: Date, now: Date) => {
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 60) return `${diffDays} days away`;
  const diffMonths = Math.round(diffDays / 30.44);
  if (diffMonths < 24) return `${diffMonths} months away`;
  return `${(diffDays / 365.25).toFixed(1)} years away`;
};

export const LifeEventPlannerTab = ({ state, metrics, addItem, removeItem, updateItem, showToast = undefined }) => {
  const { privacyMode } = usePrivacy();
  const { familyProfiles } = useMasterData();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_EVENT });

  const events = useMemo(() => {
    return [...(state.lifeEvents || [])].sort((a, b) =>
      (a.targetDate || "").localeCompare(b.targetDate || "")
    );
  }, [state.lifeEvents]);

  const enrichedEvents = useMemo(() => {
    // Local midnight "today" (not bare `new Date()`) so both the isPast check and
    // yearsAway stay pinned to calendar days rather than drifting with the current
    // clock time — a `new Date()` "now" made an event dated "today" flip to isPast
    // the instant the clock ticked past 00:00 local, well before the day was over,
    // and made yearsAway (and therefore inflatedCost/monthlySIP) tick down all day.
    const now = new Date(today() + "T00:00:00");
    return events.map((e) => {
      const evType = EVENT_TYPES.find((t) => t.id === e.type) || EVENT_TYPES[EVENT_TYPES.length - 1];
      // Parse as local midnight (not bare `new Date(str)`, which is UTC) — otherwise
      // an event dated "today" reads as already past for most of the day in IST,
      // since the UTC-midnight instant for today's date is behind the actual "now".
      const targetDate = new Date(e.targetDate + "T00:00:00");
      const yearsAway = Math.max(0, (targetDate.getTime() - now.getTime()) / (365.25 * 86400000));
      const inflatedCost =
        Number(e.estimatedCost || 0) * Math.pow(1 + evType.inflationRate / 100, yearsAway);
      const saved = Number(e.currentSaved || 0);
      // Nominal shortfall as of today — used for the "Gap to Fill" display, which
      // answers "how far short am I right now".
      const gap = Math.max(0, inflatedCost - saved);
      const r = 0.1 / 12; // assume 10% p.a. return
      const n = Math.round(yearsAway * 12);
      // The required-SIP math must NOT reuse the nominal `gap` above: `saved` will
      // itself keep growing at the assumed rate of return between now and the target
      // date, so ignoring that growth overstates the monthly SIP needed (this was the
      // same compounding bug found and fixed in GoalsTab's "Required SIP" widget —
      // see GoalsTab.tsx's `fvCurrent = currentAmount * (1+r)^n`). Grow `saved` forward
      // the same way before computing the residual gap the SIP has to cover.
      const futureValueOfSaved = n > 0 ? saved * Math.pow(1 + r, n) : saved;
      const sipGap = Math.max(0, inflatedCost - futureValueOfSaved);
      // Guard on `n` (not `yearsAway`): an event under ~15 days away has yearsAway > 0 but
      // rounds to 0 months, which previously divided by (1+r)^0 - 1 === 0 and produced
      // Infinity/NaN for "Monthly SIP Needed". With <1 month left, the whole gap is due now.
      const monthlySIP = n > 0 && r > 0 ? (sipGap * r) / (Math.pow(1 + r, n) - 1) : sipGap;
      const progress = inflatedCost > 0 ? (saved / inflatedCost) * 100 : 0;
      const isPast = targetDate < now;
      const isFunded = progress >= 100;
      const timeAway = isPast ? "Past" : formatTimeAway(targetDate, now);

      return {
        ...e,
        evType,
        yearsAway,
        inflatedCost,
        gap,
        monthlySIP,
        progress,
        isPast,
        isFunded,
        timeAway,
      };
    });
  }, [events]);

  const timeline = useMemo(() => {
    const yearMap = {};
    enrichedEvents.forEach((e) => {
      if (e.isPast) return;
      const year = e.targetDate?.slice(0, 4) || "Unknown";
      if (!yearMap[year]) yearMap[year] = { year, saved: 0, gap: 0, total: 0, events: [] };
      const saved = Math.min(e.inflatedCost, Number(e.currentSaved || 0));
      yearMap[year].saved += saved;
      yearMap[year].gap += Math.max(0, e.inflatedCost - saved);
      yearMap[year].total += e.inflatedCost;
      yearMap[year].events.push(e);
    });
    return Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year));
  }, [enrichedEvents]);

  const monthlySurplus = Math.max(0, (metrics?.monthIncome || 0) - (metrics?.monthExpense || 0));

  const totalCost = enrichedEvents.filter((e) => !e.isPast).reduce((s, e) => s + e.inflatedCost, 0);
  const totalSaved = enrichedEvents
    .filter((e) => !e.isPast)
    .reduce((s, e) => s + Number(e.currentSaved || 0), 0);
  const totalGap = totalCost - totalSaved;
  const totalMonthlySIP = enrichedEvents
    .filter((e) => !e.isPast)
    .reduce((s, e) => s + e.monthlySIP, 0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { run: deleteEvent } = useAsyncAction(
    async (id: string) => { await removeItem("lifeEvents", id); },
    { onError: (e: any) => showToast?.(`Failed to delete event: ${e?.message || "Unknown error"}`, "error") }
  );

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        await updateItem("lifeEvents", editingId, form);
      } else {
        await addItem("lifeEvents", { ...form, id: uid() });
      }
      setShowModal(false);
      setForm({ ...EMPTY_EVENT });
      setEditingId(null);
    } catch (err: any) {
      console.error("[LifeEvent] Save failed:", err);
      setSaveError(err?.message || "Couldn't save this event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (e) => {
    setSaveError(null);
    setForm({
      name: e.name,
      type: e.type,
      targetDate: e.targetDate,
      estimatedCost: e.estimatedCost,
      currentSaved: e.currentSaved,
      notes: e.notes,
      priority: e.priority,
      owner: e.owner || "self",
    });
    setEditingId(e.id);
    setShowModal(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle
        sub="Plan for major financial milestones — education, home, wedding and more — with inflation-adjusted targets"
        rightElement={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSaveError(null);
              setForm({ ...EMPTY_EVENT });
              setEditingId(null);
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Add Event
          </Button>
        }
      >
        Life Event Planner
      </SectionTitle>

      {events.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <StatCard
            label="Total Future Cost"
            value={fmtINRFull(totalCost)}
            numericValue={totalCost}
            formatValue={fmtINRFull}
            icon={<IndianRupee />}
            color={THEME.rust}
          />
          <StatCard
            label="Already Saved"
            value={fmtINRFull(totalSaved)}
            numericValue={totalSaved}
            formatValue={fmtINRFull}
            icon={<CheckCircle />}
            color={THEME.sage}
          />
          <StatCard
            label="Gap to Fill"
            value={fmtINRFull(totalGap)}
            numericValue={totalGap}
            formatValue={fmtINRFull}
            icon={<AlertTriangle />}
            color={THEME.gold}
          />
          <StatCard
            label="Monthly SIP Needed"
            value={fmtINRFull(totalMonthlySIP)}
            numericValue={totalMonthlySIP}
            formatValue={fmtINRFull}
            icon={<TrendingUp />}
            color={THEME.accent}
          />
        </div>
      )}

      {/* Readiness insight: how much of current monthly surplus this plan would consume */}
      {totalMonthlySIP > 0 && monthlySurplus > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background: `color-mix(in srgb, ${
              totalMonthlySIP > monthlySurplus ? THEME.rust : totalMonthlySIP > monthlySurplus * 0.5 ? THEME.gold : THEME.sage
            } 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${
              totalMonthlySIP > monthlySurplus ? THEME.rust : totalMonthlySIP > monthlySurplus * 0.5 ? THEME.gold : THEME.sage
            } 25%, transparent)`,
            color: THEME.ink,
          }}
        >
          {totalMonthlySIP > monthlySurplus ? (
            <AlertTriangle size={16} color={THEME.rust} />
          ) : (
            <TrendingUp size={16} color={totalMonthlySIP > monthlySurplus * 0.5 ? THEME.gold : THEME.sage} />
          )}
          <span>
            Funding every upcoming event needs{" "}
            <Money value={totalMonthlySIP} variant="full" />/month — that&apos;s{" "}
            <strong>{Math.min(999, (totalMonthlySIP / monthlySurplus) * 100).toFixed(0)}%</strong>{" "}
            of your current monthly surplus (<Money value={monthlySurplus} variant="full" />).
            {totalMonthlySIP > monthlySurplus &&
              " Consider stretching timelines or re-prioritizing lower-priority goals."}
          </span>
        </div>
      )}

      {/* Timeline Chart */}
      {timeline.length > 0 && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.ink }}>
            Timeline View
          </h3>
          <div style={{ width: "100%", height: 300, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: THEME.muted }} />
              <YAxis
                tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                tick={{ fontSize: 11, fill: THEME.muted }}
              />
              <Tooltip
                formatter={(v) => <Money value={v} variant="full" />}
                cursor={{ fill: "var(--t-line)", opacity: 0.4 }}
                contentStyle={tooltipStyle()}
                labelStyle={{ color: "var(--t-ink)" }}
                itemStyle={{ color: "var(--t-ink)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: THEME.muted }} />
              <Bar dataKey="saved" name="Already Saved" stackId="a" fill={THEME.sage} radius={[0, 0, 0, 0]} />
              <Bar
                dataKey="gap"
                name="Still to Fund"
                stackId="a"
                fill={THEME.rust}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer></div>
        </Card>
      )}

      {/* Event Cards */}
      {enrichedEvents.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {enrichedEvents.map((e) => {
            const Icon = e.evType.icon;
            return (
              <Card key={e.id} style={{ padding: 20, opacity: e.isPast ? 0.6 : 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: `color-mix(in srgb, ${e.evType.color} 15%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={20} color={e.evType.color} />
                    </div>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontWeight: 600,
                          fontSize: 15,
                          color: THEME.ink,
                        }}
                      >
                        {e.name}
                        {e.isPast ? (
                          <Badge variant={e.isFunded ? "sage" : "rust"} size="xs">
                            {e.isFunded ? "COMPLETED" : "MISSED"}
                          </Badge>
                        ) : (
                          e.yearsAway <= 1 &&
                          !e.isFunded && (
                            <Badge variant="rust" size="xs">
                              URGENT
                            </Badge>
                          )
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        {e.evType.label} — {e.timeAway}
                        {familyProfiles.length > 1 && e.owner && (
                          <> · {familyProfiles.find((p) => p.id === e.owner)?.name || e.owner}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleEdit(e)}
                      aria-label={`Edit ${e.name}`}
                      title="Edit"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.muted,
                        padding: 6,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${e.name}" event? This cannot be undone.`)) {
                          deleteEvent(e.id);
                        }
                      }}
                      aria-label={`Delete ${e.name}`}
                      title="Delete"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.rust,
                        padding: 6,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: THEME.muted,
                      marginBottom: 4,
                    }}
                  >
                    <span>Progress</span>
                    <span>{Math.min(100, e.progress).toFixed(0)}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, e.progress)}%`,
                        background: e.evType.color,
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ color: THEME.muted, fontSize: 11 }}>Today's Cost</div>
                    <div style={{ fontWeight: 600, color: THEME.ink }}>
                      <Money value={e.estimatedCost} variant="full" />
                    </div>
                  </div>
                  <div>
                    <div style={{ color: THEME.muted, fontSize: 11 }}>Inflation-Adjusted</div>
                    <div style={{ fontWeight: 600, color: THEME.rust }}>
                      <Money value={e.inflatedCost} variant="full" />
                    </div>
                  </div>
                  <div>
                    <div style={{ color: THEME.muted, fontSize: 11 }}>Saved So Far</div>
                    <div style={{ fontWeight: 600, color: THEME.sage }}>
                      <Money value={e.currentSaved} variant="full" />
                    </div>
                  </div>
                  <div>
                    <div style={{ color: THEME.muted, fontSize: 11 }}>Monthly SIP Needed</div>
                    <div style={{ fontWeight: 600, color: THEME.accent }}>
                      <Money value={e.monthlySIP} variant="full" />
                    </div>
                  </div>
                </div>

                {e.notes && (
                  <div
                    style={{ marginTop: 8, fontSize: 12, color: THEME.muted, fontStyle: "italic" }}
                  >
                    {e.notes}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 11, color: THEME.muted }}>
                    Target: {e.targetDate} • Inflation: {e.evType.inflationRate}% p.a.
                  </div>
                  <Badge variant={PRIORITY_BADGE[e.priority] || "muted"} size="xs">
                    {(e.priority || "medium").toUpperCase()} PRIORITY
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No Life Events Planned"
          description="Add major financial milestones like child's education, home purchase, wedding, or retirement to see how much you need to save."
          pills={["Education", "Home Purchase", "Wedding", "Retirement"]}
          buttonLabel="Add Event"
          onAdd={() => {
            setSaveError(null);
            setForm({ ...EMPTY_EVENT });
            setEditingId(null);
            setShowModal(true);
          }}
        />
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? "Edit Life Event" : "Add Life Event"}
          onClose={() => setShowModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Event Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Daughter's College"
                className="form-input"
              />
            </Field>
            <div className="form-grid-2">
              <Field label="Event Type">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="form-input"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Target Date">
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                  className="form-input"
                />
              </Field>
            </div>
            <div className="form-grid-2">
              <Field label="Estimated Cost (today's value)">
                <input
                  type="number"
                  value={form.estimatedCost}
                  onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })}
                  className="form-input"
                />
              </Field>
              <Field label="Amount Already Saved">
                <input
                  type="number"
                  value={form.currentSaved}
                  onChange={(e) => setForm({ ...form, currentSaved: Number(e.target.value) })}
                  className="form-input"
                />
              </Field>
            </div>
            <div className="form-grid-2">
              <Field label="Priority">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="form-input"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </Field>
              <Field label="Owner / Profile">
                <select
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  className="form-input"
                >
                  {familyProfiles.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {formatProfileOption(p)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Notes (optional)">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="form-input"
              />
            </Field>
            {saveError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: THEME.rust,
                }}
              >
                <AlertTriangle size={14} />
                {saveError}
              </div>
            )}
          </div>
          <ModalActions
            onSave={handleSave}
            onClose={() => setShowModal(false)}
            saveLabel={saving ? "Saving…" : "Save"}
            disabled={!form.name || !form.targetDate || saving}
          />
        </Modal>
      )}
    </div>
  );
};
