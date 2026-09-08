import React, { useState } from "react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { ServiceLogo, resolveBrand } from "../ui/BrandLogos";

const POPULAR_PRESETS = [
  { name: "Netflix", category: "Entertainment", website: "netflix.com", cycle: "monthly" },
  { name: "Spotify", category: "Entertainment", website: "spotify.com", cycle: "monthly" },
  { name: "Amazon Prime", category: "Entertainment", website: "primevideo.com", cycle: "yearly" },
  { name: "YouTube Premium", category: "Entertainment", website: "youtube.com", cycle: "monthly" },
  { name: "Disney+ Hotstar", category: "Entertainment", website: "hotstar.com", cycle: "yearly" },
  { name: "Google One", category: "Storage/Cloud", website: "google.com", cycle: "yearly" },
  { name: "Apple One", category: "Entertainment", website: "apple.com", cycle: "monthly" },
  { name: "ChatGPT Plus", category: "Productivity", website: "openai.com", cycle: "monthly" },
  { name: "Claude Pro", category: "Productivity", website: "anthropic.com", cycle: "monthly" },
  { name: "Notion", category: "Productivity", website: "notion.so", cycle: "yearly" },
  { name: "Cult.fit", category: "Fitness", website: "cult.fit", cycle: "yearly" },
  { name: "Tata Play", category: "Entertainment", website: "tataplay.com", cycle: "monthly" },
  { name: "Airtel Fiber", category: "Utilities", website: "airtel.in", cycle: "monthly" },
  { name: "JioFiber", category: "Utilities", website: "jio.com", cycle: "monthly" },
  { name: "Swiggy One", category: "Other", website: "swiggy.com", cycle: "quarterly" },
  { name: "Zomato Gold", category: "Other", website: "zomato.com", cycle: "quarterly" },
  { name: "Times Prime", category: "Entertainment", website: "timesprime.com", cycle: "yearly" },
];

const input = {
  width: "100%",
  padding: "10px 12px",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: "var(--radius-md)",
  color: THEME.ink,
  fontSize: 14,
};

export interface SubscriptionItem {
  id?: string;
  owner?: string;
  name: string;
  category: string;
  amount: number | string;
  cycle: string;
  renewalDate?: string;
  remark?: string;
  website?: string;
}

interface SubModalProps {
  onClose: () => void;
  onSave: (sub: SubscriptionItem) => void;
  initialValues?: SubscriptionItem | null;
  saving?: boolean;
}

export function SubModal({ onClose, onSave, initialValues = null, saving = false }: SubModalProps) {
  const { familyProfiles } = useMasterData();
  const [attempted, setAttempted] = useState(false);
  const [f, setF] = useState<SubscriptionItem>(
    initialValues
      ? {
          owner: initialValues.owner || "self",
          name: initialValues.name || "",
          category: initialValues.category || "Entertainment",
          amount: initialValues.amount || "",
          cycle: initialValues.cycle || "monthly",
          renewalDate: initialValues.renewalDate || "",
          remark: initialValues.remark || "",
          website: initialValues.website || "",
        }
      : {
          owner: "self",
          name: "",
          category: "Entertainment",
          amount: "",
          cycle: "monthly",
          renewalDate: "",
          remark: "",
          website: "",
        }
  );

  const nameError = attempted && !f.name.trim() ? "Service name is required" : undefined;
  const amountError =
    attempted && !(Number(f.amount) > 0) ? "Enter an amount greater than 0" : undefined;

  const handleNameChange = (val: string) => {
    const updated = { ...f, name: val };
    // If website is empty, check if we can auto-suggest domain
    if (!f.website?.trim() && val.trim()) {
      const match = resolveBrand(val.trim());
      if (match?.domain) {
        updated.website = match.domain;
      }
    }
    setF(updated);
  };

  const applyPreset = (p: typeof POPULAR_PRESETS[0]) => {
    setF((prev) => ({
      ...prev,
      name: p.name,
      category: p.category,
      website: p.website,
      cycle: p.cycle || prev.cycle,
    }));
  };

  const handleSave = () => {
    if (f.name.trim() && Number(f.amount) > 0) {
      const resolvedDomain = f.website?.trim() || resolveBrand(f.name.trim())?.domain || "";
      onSave({
        ...f,
        website: resolvedDomain,
      });
    } else {
      setAttempted(true);
    }
  };

  return (
    <Modal title={initialValues ? "Edit Subscription" : "Add Subscription"} onClose={onClose}>
      {/* Quick Add Presets Bar */}
      {!initialValues && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Popular Services
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 4,
              scrollbarWidth: "none",
            }}
          >
            {POPULAR_PRESETS.map((p) => {
              const active = f.name.toLowerCase() === p.name.toLowerCase();
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 9999,
                    background: active
                      ? `color-mix(in srgb, ${THEME.accent} 14%, var(--surface-0))`
                      : "var(--surface-1)",
                    border: `1px solid ${active ? THEME.accent : THEME.line}`,
                    color: active ? THEME.accent : THEME.ink,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  <ServiceLogo name={p.name} website={p.website} size={16} />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Field label="Owner / Profile">
        <select
          style={input}
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Service Name" error={nameError}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flexShrink: 0 }} title="Live Logo Preview">
            <ServiceLogo
              name={f.name || "Preview"}
              website={f.website}
              category={f.category}
              size={42}
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              style={{ ...input, ...(nameError ? { borderColor: THEME.rust } : {}) }}
              value={f.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Netflix, Spotify, Google One, Cult.fit"
            />
          </div>
        </div>
      </Field>
      <Field label="Category">
        <select
          style={input}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          <option>Entertainment</option>
          <option>Productivity</option>
          <option>Storage/Cloud</option>
          <option>News/Media</option>
          <option>Fitness</option>
          <option>Utilities</option>
          <option>Other</option>
        </select>
      </Field>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Amount" error={amountError}>
          <input
            style={{ ...input, ...(amountError ? { borderColor: THEME.rust } : {}) }}
            type="number"
            min="0"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            placeholder="e.g., 649"
          />
        </Field>
        <Field label="Cycle">
          <select
            style={input}
            value={f.cycle}
            onChange={(e) => setF({ ...f, cycle: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly (Every 3 months)</option>
            <option value="half-yearly">Half-Yearly (Every 6 months)</option>
            <option value="yearly">Yearly (Annual)</option>
          </select>
        </Field>
        <Field label="Next Renewal / Billing Date" hint="Date of renewal or next auto-debit">
          <input
            style={input}
            type="date"
            value={f.renewalDate}
            onChange={(e) => setF({ ...f, renewalDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Website (Optional — used to load logo)">
        <input
          style={input}
          value={f.website}
          onChange={(e) => setF({ ...f, website: e.target.value })}
          placeholder="e.g., notion.so or https://notion.so"
        />
      </Field>
      <Field label="Remark (Optional)">
        <input
          style={input}
          value={f.remark}
          onChange={(e) => setF({ ...f, remark: e.target.value })}
          placeholder="e.g., Shared with family, billed to credit card"
        />
      </Field>
      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel={initialValues ? "Save Changes" : "Add Subscription"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}
