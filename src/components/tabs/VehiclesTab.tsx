// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Car,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  IndianRupee,
  TrendingDown,
  FileText,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle make → company domain (for logo fetching)
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_MAKE_DOMAINS: Record<string, string> = {
  honda: "honda.com",
  yamaha: "yamaha-motor.com",
  suzuki: "suzuki.com",
  hero: "heromotocorp.com",
  bajaj: "bajajauto.com",
  tvs: "tvsmotor.com",
  royalenfield: "royalenfield.com",
  "royal enfield": "royalenfield.com",
  ktm: "ktm.com",
  kawasaki: "kawasaki.com",
  maruti: "marutisuzuki.com",
  hyundai: "hyundai.com",
  tata: "tatamotors.com",
  toyota: "toyota.com",
  ford: "ford.com",
  mahindra: "mahindra.com",
  kia: "kia.com",
  mg: "mgmotor.co.in",
  bmw: "bmw.com",
  mercedes: "mercedes-benz.com",
  audi: "audi.com",
  volkswagen: "volkswagen.com",
  vw: "volkswagen.com",
  skoda: "skoda-auto.com",
  nissan: "nissan.com",
  renault: "renault.com",
  jeep: "jeep.com",
  citroen: "citroen.com",
  byd: "byd.com",
  ola: "olaelectric.com",
  ather: "atherenergy.com",
  revolt: "revoltmotors.in",
  harley: "harley-davidson.com",
  ducati: "ducati.com",
  triumph: "triumphmotorcycles.co.uk",
  isuzu: "isuzu.com",
  force: "forcemotors.com",
};

// Brand-matched gradient themes for known makes
const VEHICLE_MAKE_THEMES: Record<string, { gradient: string; color: string }> = {
  honda: { gradient: "linear-gradient(135deg,#cc0000 0%,#ff4444 100%)", color: "#cc0000" },
  yamaha: { gradient: "linear-gradient(135deg,#0049cc 0%,#4488ff 100%)", color: "#0049cc" },
  suzuki: { gradient: "linear-gradient(135deg,#1a1a7c 0%,#4444cc 100%)", color: "#1a1a7c" },
  hero: { gradient: "linear-gradient(135deg,#002868 0%,#2255aa 100%)", color: "#002868" },
  bajaj: { gradient: "linear-gradient(135deg,#1a2b6b 0%,#3355aa 100%)", color: "#1a2b6b" },
  tvs: { gradient: "linear-gradient(135deg,#e31e26 0%,#ff5555 100%)", color: "#e31e26" },
  royalenfield: { gradient: "linear-gradient(135deg,#5a3e28 0%,#8b6347 100%)", color: "#5a3e28" },
  "royal enfield": { gradient: "linear-gradient(135deg,#5a3e28 0%,#8b6347 100%)", color: "#5a3e28" },
  ktm: { gradient: "linear-gradient(135deg,#ff6600 0%,#ff9944 100%)", color: "#ff6600" },
  kawasaki: { gradient: "linear-gradient(135deg,#00a651 0%,#33cc77 100%)", color: "#00a651" },
  maruti: { gradient: "linear-gradient(135deg,#003087 0%,#1155bb 100%)", color: "#003087" },
  hyundai: { gradient: "linear-gradient(135deg,#002c5f 0%,#1155aa 100%)", color: "#002c5f" },
  tata: { gradient: "linear-gradient(135deg,#1d2671 0%,#3355bb 100%)", color: "#1d2671" },
  toyota: { gradient: "linear-gradient(135deg,#eb0a1e 0%,#ff4455 100%)", color: "#eb0a1e" },
  ford: { gradient: "linear-gradient(135deg,#003478 0%,#1155cc 100%)", color: "#003478" },
  mahindra: { gradient: "linear-gradient(135deg,#e31837 0%,#ff4466 100%)", color: "#e31837" },
  kia: { gradient: "linear-gradient(135deg,#ea0029 0%,#ff3355 100%)", color: "#ea0029" },
  mg: { gradient: "linear-gradient(135deg,#c41230 0%,#ee3355 100%)", color: "#c41230" },
  bmw: { gradient: "linear-gradient(135deg,#1c69d4 0%,#4488ff 100%)", color: "#1c69d4" },
  mercedes: { gradient: "linear-gradient(135deg,#555555 0%,#999999 100%)", color: "#666666" },
  audi: { gradient: "linear-gradient(135deg,#bb0a30 0%,#ee3355 100%)", color: "#bb0a30" },
  volkswagen: { gradient: "linear-gradient(135deg,#001e50 0%,#003399 100%)", color: "#001e50" },
  vw: { gradient: "linear-gradient(135deg,#001e50 0%,#003399 100%)", color: "#001e50" },
  skoda: { gradient: "linear-gradient(135deg,#4ba82e 0%,#6dcc44 100%)", color: "#4ba82e" },
  nissan: { gradient: "linear-gradient(135deg,#c3002f 0%,#ee3355 100%)", color: "#c3002f" },
  renault: { gradient: "linear-gradient(135deg,#c8b700 0%,#eecc00 100%)", color: "#c8b700" },
  jeep: { gradient: "linear-gradient(135deg,#1f4e2b 0%,#2e7a40 100%)", color: "#1f4e2b" },
  ola: { gradient: "linear-gradient(135deg,#4c00c8 0%,#8844ff 100%)", color: "#4c00c8" },
  ather: { gradient: "linear-gradient(135deg,#00b4aa 0%,#33ddcc 100%)", color: "#00b4aa" },
  harley: { gradient: "linear-gradient(135deg,#cc4400 0%,#ff7722 100%)", color: "#cc4400" },
  ducati: { gradient: "linear-gradient(135deg,#cc0000 0%,#ff3333 100%)", color: "#cc0000" },
};

function getMakeKey(make: string): string {
  return (make || "").toLowerCase().replace(/[\s\-_.]+/g, "");
}

function getMakeTheme(make: string) {
  const key = getMakeKey(make);
  for (const [k, v] of Object.entries(VEHICLE_MAKE_THEMES)) {
    if (key === getMakeKey(k) || key.startsWith(getMakeKey(k))) return v;
  }
  const hue = Array.from(make || "?").reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  return {
    gradient: `linear-gradient(135deg,hsl(${hue},55%,38%) 0%,hsl(${hue},70%,58%) 100%)`,
    color: `hsl(${hue},55%,38%)`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VehicleMakeLogo — brand logo with graceful fallback (mirrors BrokerLogo)
// ─────────────────────────────────────────────────────────────────────────────

function VehicleMakeLogo({ make, size = 52 }: { make: string; size?: number }) {
  const key = getMakeKey(make);
  let domain = "";
  for (const [k, d] of Object.entries(VEHICLE_MAKE_DOMAINS)) {
    if (key === getMakeKey(k) || key.startsWith(getMakeKey(k))) {
      domain = d;
      break;
    }
  }

  const theme = getMakeTheme(make);
  const [imgSrc, setImgSrc] = React.useState<string | null>(null);
  const [fallbackLevel, setFallbackLevel] = React.useState(0);

  React.useEffect(() => {
    if (domain) {
      setImgSrc(`https://logos.hunter.io/${domain}`);
      setFallbackLevel(0);
    } else {
      setImgSrc(null);
      setFallbackLevel(2);
    }
  }, [domain]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
    } else {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  const br = Math.round(size * 0.27);
  const initials = (make || "?").slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.34);

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: br,
          background: "#fff",
          border: `1.5px solid ${theme.color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 4px 14px ${theme.color}28`,
          overflow: "hidden",
        }}
      >
        <img
          src={imgSrc}
          alt={make}
          onError={handleError}
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: br,
        background: theme.gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 4px 14px ${theme.color}40`,
      }}
    >
      <span style={{ fontSize, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1 }}>
        {initials}
      </span>
    </div>
  );
}

// Module-level Wikipedia image cache — shared by VehicleHeroBanner + VehiclePhotoThumb
const _vpCache: Record<string, string | null> = {};

// Small thumbnail for the collapsed card header
function VehiclePhotoThumb({ make, model, photoUrl }: { make: string; model: string; photoUrl?: string }) {
  const [src, setSrc] = React.useState<string | null>(photoUrl || null);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const cacheKey = `${make}|${model}`;

  React.useEffect(() => {
    if (photoUrl) { setSrc(photoUrl); return; }
    if (cacheKey in _vpCache) { setSrc(_vpCache[cacheKey]); return; }
    // wait for VehicleHeroBanner (shared cache) — poll briefly
    const t = setTimeout(() => { if (_vpCache[cacheKey] !== undefined) setSrc(_vpCache[cacheKey]); }, 2000);
    return () => clearTimeout(t);
  }, [make, model, photoUrl]);

  if (!src || failed) return null;

  return (
    <div
      style={{
        width: 88,
        height: 58,
        borderRadius: 10,
        overflow: "hidden",
        flexShrink: 0,
        border: "1.5px solid var(--t-line, var(--border))",
        background: "var(--surface)",
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.3s",
      }}
    >
      <img
        src={src}
        alt={`${make} ${model}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

// Full-width hero photo banner for the expanded card section
function VehicleHeroBanner({ make, model, photoUrl }: { make: string; model: string; photoUrl?: string }) {
  const [src, setSrc] = React.useState<string | null>(photoUrl || null);
  const [failed, setFailed] = React.useState(false);
  const cacheKey = `${make}|${model}`;

  React.useEffect(() => {
    if (photoUrl) { setSrc(photoUrl); setFailed(false); return; }
    if (cacheKey in _vpCache) { setSrc(_vpCache[cacheKey]); return; }

    const tryFetch = (query: string) =>
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => d.originalimage?.source || d.thumbnail?.source || null);

    tryFetch(`${make} ${model}`)
      .then((url) => {
        if (url) { _vpCache[cacheKey] = url; setSrc(url); return; }
        return tryFetch(`${make} ${model} motorcycle`).then((u) => {
          _vpCache[cacheKey] = u;
          setSrc(u);
        });
      })
      .catch(() => { _vpCache[cacheKey] = null; });
  }, [make, model, photoUrl]);

  if (!src || failed) return null;

  return (
    <div style={{ position: "relative", height: 200, overflow: "hidden", background: "#000" }}>
      <img
        src={src}
        alt={`${make} ${model}`}
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.88, display: "block" }}
      />
      {/* gradient fade at bottom so content below feels connected */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: "linear-gradient(to bottom, transparent, var(--surface-0, var(--surface)))",
        }}
      />
      {/* Make / model watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 18,
          fontSize: 13,
          fontWeight: 800,
          color: "#fff",
          textShadow: "0 1px 4px rgba(0,0,0,0.7)",
          letterSpacing: "-0.01em",
        }}
      >
        {make} {model}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_TYPES: Record<string, string> = {
  "two-wheeler": "Two-Wheeler",
  "four-wheeler": "Four-Wheeler",
  commercial: "Commercial",
};

const FUEL_TYPES: Record<string, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  electric: "Electric",
  cng: "CNG",
  hybrid: "Hybrid",
};

const SERVICE_TYPES: Record<string, { label: string; color: string }> = {
  regular_service: { label: "Regular Service", color: "#3b82f6" },
  tyre_change: { label: "Tyre Change", color: "#f59e0b" },
  battery_change: { label: "Battery Change", color: "#8b5cf6" },
  repair: { label: "Repair", color: "#ef4444" },
  insurance: { label: "Insurance Renewal", color: "#10b981" },
  puc: { label: "PUC Renewal", color: "#06b6d4" },
  other: { label: "Other", color: "#6b7280" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const today = () => new Date().toISOString().slice(0, 10);

type ComplianceStatus = { label: string; color: string; icon: "ok" | "warn" | "alert" } | null;

const complianceStatus = (expiry: string): ComplianceStatus => {
  if (!expiry) return null;
  const daysLeft = Math.ceil(
    (new Date(expiry + "T00:00:00").getTime() - Date.now()) / 86400000
  );
  if (daysLeft < 0) return { label: "Expired", color: "#ef4444", icon: "alert" };
  if (daysLeft <= 30) return { label: `Expiring in ${daysLeft}d`, color: "#f59e0b", icon: "warn" };
  return { label: "Valid", color: "#10b981", icon: "ok" };
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared field input style — matches app's input styling
// ─────────────────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--t-line, var(--border))",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 500,
  boxSizing: "border-box" as const,
  outline: "none",
};

// ─────────────────────────────────────────────────────────────────────────────
// ComplianceBadge
// ─────────────────────────────────────────────────────────────────────────────

function ComplianceBadge({ expiry, tag }: { expiry: string; tag: string }) {
  const s = complianceStatus(expiry);
  if (!s) return null;
  const Icon = s.icon === "ok" ? CheckCircle : s.icon === "warn" ? Clock : AlertTriangle;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 20,
        background: s.color + "1a",
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={10} />
      {tag}: {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section divider inside a modal
// ─────────────────────────────────────────────────────────────────────────────

function ModalSection({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--t-muted, var(--text-muted))",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        borderTop: "1px solid var(--t-line, var(--border))",
        paddingTop: 16,
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      {title}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VehicleModal — Add / Edit vehicle
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_VEHICLE = {
  vehicleType: "two-wheeler",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  color: "",
  fuelType: "petrol",
  registrationNumber: "",
  chassisNumber: "",
  engineNumber: "",
  purchaseDate: "",
  purchasePrice: "",
  currentValue: "",
  insuranceExpiry: "",
  pucExpiry: "",
  photoUrl: "",
  notes: "",
  owner: "self",
};

function VehicleModal({ existing, onClose, onSave }: any) {
  const isEdit = !!existing;
  const [f, setF] = useState<any>(
    existing
      ? {
          ...EMPTY_VEHICLE,
          ...existing,
          purchasePrice: existing.purchasePrice ?? "",
          currentValue: existing.currentValue ?? "",
        }
      : { ...EMPTY_VEHICLE }
  );
  const [rcStatus, setRcStatus] = useState<"idle" | "loading" | "ok" | "error" | "nokey">("idle");
  const [rcMsg, setRcMsg] = useState("");

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const canSave = f.make.trim() && f.model.trim();

  const lookupRC = async () => {
    const reg = (f.registrationNumber || "").trim();
    if (!reg) { setRcStatus("error"); setRcMsg("Enter a registration number first"); return; }
    setRcStatus("loading"); setRcMsg("");
    try {
      const r = await fetch(`/api/rc-lookup?reg=${encodeURIComponent(reg)}`);
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 503) { setRcStatus("nokey"); setRcMsg(data.hint || "API not configured"); }
        else { setRcStatus("error"); setRcMsg(data.error || "Not found"); }
        return;
      }
      // Auto-fill all returned fields (user can still override)
      setF((p: any) => ({
        ...p,
        registrationNumber: data.registrationNumber || p.registrationNumber,
        make: data.make || p.make,
        model: data.model || p.model,
        year: data.year || p.year,
        color: data.color || p.color,
        fuelType: data.fuelType || p.fuelType,
        vehicleType: data.vehicleType || p.vehicleType,
        chassisNumber: data.chassisNumber || p.chassisNumber,
        engineNumber: data.engineNumber || p.engineNumber,
        insuranceExpiry: data.insuranceExpiry || p.insuranceExpiry,
        pucExpiry: data.pucExpiry || p.pucExpiry,
      }));
      setRcStatus("ok");
      setRcMsg(`Fetched from VAHAN${data.ownerName ? ` · Owner: ${data.ownerName}` : ""}${data.rto ? ` · RTO: ${data.rto}` : ""}`);
    } catch {
      setRcStatus("error"); setRcMsg("Network error — try again");
    }
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      ...f,
      purchasePrice: Number(f.purchasePrice) || 0,
      currentValue: Number(f.currentValue) || 0,
      year: Number(f.year) || new Date().getFullYear(),
      serviceHistory: existing?.serviceHistory || [],
    });
  };

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const g3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };

  return (
    <Modal
      title={isEdit ? "Edit Vehicle" : "Add Vehicle"}
      onClose={onClose}
      maxWidth={580}
      footer={
        <ModalActions
          onClose={onClose}
          onSave={handleSave}
          saveLabel={isEdit ? "Update" : "Add Vehicle"}
          disabled={!canSave}
        />
      }
    >
      {/* Identity */}
      <div style={g2}>
        <Field label="Vehicle Type *">
          <select style={inp} value={f.vehicleType} onChange={(e) => set("vehicleType", e.target.value)}>
            {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Fuel Type">
          <select style={inp} value={f.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
            {Object.entries(FUEL_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>

      <div style={g2}>
        <Field label="Make *">
          <input style={inp} value={f.make} onChange={(e) => set("make", e.target.value)} placeholder="e.g. Honda, Maruti" />
        </Field>
        <Field label="Model *">
          <input style={inp} value={f.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. Activa 6G, Swift" />
        </Field>
      </div>

      <div style={g3}>
        <Field label="Year">
          <input style={inp} type="number" value={f.year} onChange={(e) => set("year", e.target.value)} min={1980} max={2035} />
        </Field>
        <Field label="Color">
          <input style={inp} value={f.color} onChange={(e) => set("color", e.target.value)} placeholder="Pearl White" />
        </Field>
        <Field label="Owner">
          <input style={inp} value={f.owner} onChange={(e) => set("owner", e.target.value)} placeholder="self" />
        </Field>
      </div>

      {/* Registration */}
      <ModalSection title="Registration Details" />

      <Field label="Registration Number">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inp, flex: 1 }}
            value={f.registrationNumber}
            onChange={(e) => { set("registrationNumber", e.target.value.toUpperCase()); setRcStatus("idle"); }}
            placeholder="e.g. MH04AB1234"
          />
          <button
            onClick={lookupRC}
            disabled={rcStatus === "loading"}
            style={{
              flexShrink: 0,
              padding: "9px 14px",
              borderRadius: 8,
              border: "none",
              background: rcStatus === "loading" ? "#6b7280" : THEME.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: rcStatus === "loading" ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            {rcStatus === "loading" ? (
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 14 }}>↻</span>
            ) : (
              <span>🔍</span>
            )}
            {rcStatus === "loading" ? "Fetching…" : "Lookup RC"}
          </button>
        </div>

        {/* RC lookup status banner */}
        {rcStatus !== "idle" && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              ...(rcStatus === "ok"
                ? { background: "#10b98115", border: "1px solid #10b98130", color: "#065f46" }
                : rcStatus === "nokey"
                ? { background: "#f59e0b14", border: "1px solid #f59e0b40", color: "#78350f" }
                : { background: "#ef444414", border: "1px solid #ef444430", color: "#7f1d1d" }),
            }}
          >
            <span style={{ flexShrink: 0, fontSize: 14 }}>
              {rcStatus === "ok" ? "✓" : rcStatus === "nokey" ? "⚙" : "✕"}
            </span>
            <span>
              {rcStatus === "nokey" ? (
                <>
                  {rcMsg}
                  {" — "}
                  <a href="https://surepass.io" target="_blank" rel="noreferrer" style={{ color: "#b45309", fontWeight: 700 }}>
                    Get free API token at surepass.io
                  </a>
                  {", then add "}
                  <code style={{ background: "#0001", borderRadius: 4, padding: "1px 5px", fontFamily: "monospace" }}>SUREPASS_TOKEN</code>
                  {" to Vercel env vars"}
                </>
              ) : rcMsg}
            </span>
          </div>
        )}
      </Field>

      <div style={g2}>
        <Field label="Chassis Number">
          <input style={inp} value={f.chassisNumber} onChange={(e) => set("chassisNumber", e.target.value)} placeholder="VIN / Chassis No." />
        </Field>
        <Field label="Engine Number">
          <input style={inp} value={f.engineNumber} onChange={(e) => set("engineNumber", e.target.value)} placeholder="Engine No." />
        </Field>
      </div>

      {/* Purchase */}
      <ModalSection title="Purchase Details" />

      <div style={g2}>
        <Field label="Purchase Date">
          <input style={inp} type="date" value={f.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />
        </Field>
        <Field label="Purchase Price (₹)">
          <input style={inp} type="number" value={f.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} placeholder="On-road price" />
        </Field>
      </div>

      <Field label="Current Market Value (₹)">
        <input style={inp} type="number" value={f.currentValue} onChange={(e) => set("currentValue", e.target.value)} placeholder="Current resale value estimate" />
      </Field>

      {/* Compliance */}
      <ModalSection title="Compliance" />

      <div style={g2}>
        <Field label="Insurance Expiry">
          <input style={inp} type="date" value={f.insuranceExpiry} onChange={(e) => set("insuranceExpiry", e.target.value)} />
        </Field>
        <Field label="PUC Expiry">
          <input style={inp} type="date" value={f.pucExpiry} onChange={(e) => set("pucExpiry", e.target.value)} />
        </Field>
      </div>

      {/* Photo & Notes */}
      <ModalSection title="Photo & Notes" />

      <Field label="Vehicle Photo URL (optional)">
        <input
          style={inp}
          value={f.photoUrl || ""}
          onChange={(e) => set("photoUrl", e.target.value)}
          placeholder="Paste a direct image URL — or leave blank to auto-fetch from Wikipedia"
        />
        {f.photoUrl && (
          <div
            style={{
              marginTop: 8,
              borderRadius: 8,
              overflow: "hidden",
              height: 120,
              background: "var(--surface)",
              border: "1px solid var(--t-line, var(--border))",
            }}
          >
            <img
              src={f.photoUrl}
              alt="preview"
              onError={(e: any) => { e.target.style.display = "none"; }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
      </Field>

      <Field label="Notes">
        <textarea
          style={{ ...inp, height: 70, resize: "vertical" }}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Any additional notes…"
        />
      </Field>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ServiceModal — Add / Edit service record
// ─────────────────────────────────────────────────────────────────────────────

function ServiceModal({ existing, vehicleName, onClose, onSave }: any) {
  const isEdit = !!existing;
  const [f, setF] = useState<any>(
    existing
      ? { ...existing, cost: existing.cost ?? "", odometer: existing.odometer ?? "" }
      : {
          date: today(),
          type: "regular_service",
          description: "",
          cost: "",
          odometer: "",
          serviceCenter: "",
          notes: "",
        }
  );

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!f.date || !f.type) return;
    onSave({ ...f, id: existing?.id || uid(), cost: Number(f.cost) || 0, odometer: Number(f.odometer) || 0 });
  };

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

  return (
    <Modal
      title={isEdit ? "Edit Service Record" : "Add Service Record"}
      onClose={onClose}
      maxWidth={480}
      footer={
        <ModalActions
          onClose={onClose}
          onSave={handleSave}
          saveLabel={isEdit ? "Update" : "Add Record"}
          disabled={!f.date || !f.type}
        />
      }
    >
      {vehicleName && (
        <div
          style={{
            fontSize: 12,
            color: "var(--t-muted, var(--text-muted))",
            background: "var(--surface)",
            border: "1px solid var(--t-line, var(--border))",
            borderRadius: 8,
            padding: "6px 12px",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          {vehicleName}
        </div>
      )}

      <div style={g2}>
        <Field label="Date *">
          <input style={inp} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Service Type *">
          <select style={inp} value={f.type} onChange={(e) => set("type", e.target.value)}>
            {Object.entries(SERVICE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <input style={inp} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief description of work done" />
      </Field>

      <div style={g2}>
        <Field label="Cost (₹)">
          <input style={inp} type="number" value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Odometer (km)">
          <input style={inp} type="number" value={f.odometer} onChange={(e) => set("odometer", e.target.value)} placeholder="0" />
        </Field>
      </div>

      <Field label="Service Center / Vendor">
        <input style={inp} value={f.serviceCenter} onChange={(e) => set("serviceCenter", e.target.value)} placeholder="e.g. Honda Authorised Service" />
      </Field>

      <Field label="Notes">
        <textarea
          style={{ ...inp, height: 60, resize: "vertical" }}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Parts replaced, warranty, etc."
        />
      </Field>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ServiceRecord row
// ─────────────────────────────────────────────────────────────────────────────

function ServiceRow({ rec, onEdit, onDelete }: any) {
  const st = SERVICE_TYPES[rec.type] || SERVICE_TYPES.other;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: "var(--surface)",
        border: "1px solid var(--t-line, var(--border))",
        borderLeft: `3px solid ${st.color}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: st.color,
              padding: "2px 8px",
              borderRadius: 20,
              background: st.color + "1a",
            }}
          >
            {st.label}
          </span>
          {rec.description && <span style={{ fontSize: 13, color: "var(--text)" }}>{rec.description}</span>}
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--t-muted, var(--text-muted))" }}>{fmtDate(rec.date)}</span>
          {rec.cost > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
              ₹{rec.cost.toLocaleString("en-IN")}
            </span>
          )}
          {rec.odometer > 0 && (
            <span style={{ fontSize: 12, color: "var(--t-muted, var(--text-muted))" }}>
              {rec.odometer.toLocaleString("en-IN")} km
            </span>
          )}
          {rec.serviceCenter && (
            <span style={{ fontSize: 12, color: "var(--t-muted, var(--text-muted))" }}>{rec.serviceCenter}</span>
          )}
        </div>
        {rec.notes && (
          <div style={{ fontSize: 12, color: "var(--t-muted, var(--text-muted))", marginTop: 3, fontStyle: "italic" }}>
            {rec.notes}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={onEdit}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t-muted, var(--text-muted))", padding: 4, borderRadius: 6 }}
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={onDelete}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, borderRadius: 6 }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VehicleCard
// ─────────────────────────────────────────────────────────────────────────────

function VehicleCard({ vehicle, expanded, onToggle, onEdit, onDelete, onAddService, onEditService, onDeleteService }: any) {
  const sh: any[] = vehicle.serviceHistory || [];
  const totalServiceCost = sh.reduce((s: number, r: any) => s + Number(r.cost || 0), 0);
  const lastService = sh.length
    ? sh.slice().sort((a: any, b: any) => b.date.localeCompare(a.date))[0]
    : null;

  const deprPct =
    vehicle.purchasePrice && vehicle.currentValue && vehicle.purchasePrice > vehicle.currentValue
      ? Math.round(((vehicle.purchasePrice - vehicle.currentValue) / vehicle.purchasePrice) * 100)
      : null;

  return (
    <div
      style={{
        background: "var(--surface-0, var(--surface))",
        border: "1px solid var(--t-line, var(--border))",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "var(--shadow-card, none)",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* ── Header row ── */}
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", cursor: "pointer", userSelect: "none" }}
      >
        {/* Brand logo */}
        <VehicleMakeLogo make={vehicle.make} size={52} />

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
              {vehicle.make} {vehicle.model}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 20,
                background: "var(--t-line, var(--border))",
                color: "var(--t-muted, var(--text-muted))",
              }}
            >
              {vehicle.year}
            </span>
            {vehicle.color && (
              <span style={{ fontSize: 12, color: "var(--t-muted, var(--text-muted))" }}>• {vehicle.color}</span>
            )}
          </div>

          <div style={{ fontSize: 12, color: "var(--t-muted, var(--text-muted))", marginTop: 3 }}>
            {vehicle.registrationNumber && (
              <span style={{ fontFamily: "monospace", fontWeight: 700, marginRight: 10, fontSize: 13 }}>
                {vehicle.registrationNumber}
              </span>
            )}
            <span>{VEHICLE_TYPES[vehicle.vehicleType] || vehicle.vehicleType} • {FUEL_TYPES[vehicle.fuelType] || vehicle.fuelType}</span>
          </div>

          {/* Compliance badges */}
          {(vehicle.insuranceExpiry || vehicle.pucExpiry) && (
            <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
              {vehicle.insuranceExpiry && <ComplianceBadge expiry={vehicle.insuranceExpiry} tag="Insurance" />}
              {vehicle.pucExpiry && <ComplianceBadge expiry={vehicle.pucExpiry} tag="PUC" />}
            </div>
          )}
        </div>

        {/* Value + thumbnail photo + expand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {/* Small vehicle photo thumbnail — visible in collapsed header */}
          <VehiclePhotoThumb make={vehicle.make} model={vehicle.model} photoUrl={vehicle.photoUrl} />

          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: THEME.accent, letterSpacing: "-0.03em" }}>
              {fmtINR(Number(vehicle.currentValue || vehicle.purchasePrice || 0))}
            </div>
            {deprPct !== null && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                <TrendingDown size={10} /> {deprPct}% depreciated
              </div>
            )}
            <div style={{ marginTop: 8, color: "var(--t-muted, var(--text-muted))" }}>
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--t-line, var(--border))" }}>
          {/* Hero photo banner */}
          <VehicleHeroBanner make={vehicle.make} model={vehicle.model} photoUrl={vehicle.photoUrl} />

          <div style={{ padding: "18px 18px" }}>
          {/* Action row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            <Button variant="secondary" size="sm" icon={<Edit2 size={12} />} onClick={onEdit}>
              Edit Vehicle
            </Button>
            <Button variant="accent" size="sm" icon={<Plus size={12} />} onClick={onAddService}>
              Add Service Record
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 size={12} />} onClick={onDelete} style={{ marginLeft: "auto" }}>
              Delete
            </Button>
          </div>

          {/* Details grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 10,
              background: "var(--surface)",
              border: "1px solid var(--t-line, var(--border))",
              borderRadius: 10,
              padding: 14,
              marginBottom: 18,
            }}
          >
            {[
              ["Owner", vehicle.owner || "self"],
              ["Purchase Date", fmtDate(vehicle.purchaseDate)],
              ["Purchase Price", vehicle.purchasePrice ? fmtINR(vehicle.purchasePrice) : "—"],
              ["Current Value", vehicle.currentValue ? fmtINR(vehicle.currentValue) : "—"],
              ["Insurance Expiry", fmtDate(vehicle.insuranceExpiry)],
              ["PUC Expiry", fmtDate(vehicle.pucExpiry)],
              ["Chassis No.", vehicle.chassisNumber || "—"],
              ["Engine No.", vehicle.engineNumber || "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: "var(--t-muted, var(--text-muted))", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {vehicle.notes && (
            <div
              style={{
                display: "flex",
                gap: 8,
                fontSize: 13,
                color: "var(--t-muted, var(--text-muted))",
                background: "var(--surface)",
                border: "1px solid var(--t-line, var(--border))",
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 18,
              }}
            >
              <FileText size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {vehicle.notes}
            </div>
          )}

          {/* Service history header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
              <Wrench size={14} style={{ color: THEME.accent }} />
              Service History
              <span style={{ fontSize: 12, color: "var(--t-muted, var(--text-muted))", fontWeight: 400 }}>
                ({sh.length} record{sh.length !== 1 ? "s" : ""} · Total {fmtINR(totalServiceCost)})
              </span>
            </h4>
            {lastService && (
              <span style={{ fontSize: 11, color: "var(--t-muted, var(--text-muted))" }}>
                Last: {fmtDate(lastService.date)}
              </span>
            )}
          </div>

          {sh.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "28px 16px",
                background: "var(--surface)",
                border: "1px dashed var(--t-line, var(--border))",
                borderRadius: 10,
                fontSize: 13,
                color: "var(--t-muted, var(--text-muted))",
              }}
            >
              No service records yet. Click "Add Service Record" to start tracking.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sh
                .slice()
                .sort((a: any, b: any) => b.date.localeCompare(a.date))
                .map((rec: any, idx: number) => (
                  <ServiceRow
                    key={rec.id || idx}
                    rec={rec}
                    onEdit={() => onEditService(rec)}
                    onDelete={() => onDeleteService(rec.id)}
                  />
                ))}
            </div>
          )}

          {/* Cost breakdown by type */}
          {sh.length > 1 && (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                background: "var(--surface)",
                border: "1px solid var(--t-line, var(--border))",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted, var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Cost Breakdown
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(SERVICE_TYPES).map(([type, st]) => {
                  const cost = sh
                    .filter((r: any) => r.type === type)
                    .reduce((s: number, r: any) => s + Number(r.cost || 0), 0);
                  if (!cost) return null;
                  return (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, display: "inline-block" }} />
                      <span style={{ fontSize: 12, color: "var(--t-muted, var(--text-muted))" }}>{st.label}:</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>₹{cost.toLocaleString("en-IN")}</span>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            </div>
          )}
          </div>{/* end padding wrapper */}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VehiclesTab — Main export
// ─────────────────────────────────────────────────────────────────────────────

export function VehiclesTab({ state, addItem, removeItem, updateItem }: any) {
  const vehicles: any[] = state.vehicles || [];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vehicleModal, setVehicleModal] = useState<{ open: boolean; existing?: any }>({ open: false });
  const [serviceModal, setServiceModal] = useState<{ open: boolean; vehicleId?: string; existing?: any }>({ open: false });

  // ── Derived metrics ──
  const totalCurrentValue = useMemo(
    () => vehicles.reduce((s, v) => s + Number(v.currentValue || v.purchasePrice || 0), 0),
    [vehicles]
  );
  const totalPurchasePrice = useMemo(
    () => vehicles.reduce((s, v) => s + Number(v.purchasePrice || 0), 0),
    [vehicles]
  );
  const totalServiceSpend = useMemo(
    () => vehicles.reduce((s, v) => s + (v.serviceHistory || []).reduce((ss: number, r: any) => ss + Number(r.cost || 0), 0), 0),
    [vehicles]
  );

  // ── Compliance alerts ──
  const alerts = useMemo(() => {
    const list: string[] = [];
    vehicles.forEach((v) => {
      const ins = complianceStatus(v.insuranceExpiry);
      if (ins && ins.icon !== "ok") list.push(`${v.make} ${v.model}: Insurance ${ins.label}`);
      const puc = complianceStatus(v.pucExpiry);
      if (puc && puc.icon !== "ok") list.push(`${v.make} ${v.model}: PUC ${puc.label}`);
    });
    return list;
  }, [vehicles]);

  // ── Handlers ──
  const handleSaveVehicle = (data: any) => {
    if (vehicleModal.existing) {
      updateItem("vehicles", vehicleModal.existing.id, data);
    } else {
      addItem("vehicles", data);
    }
    setVehicleModal({ open: false });
  };

  const handleDeleteVehicle = (id: string) => {
    if (!window.confirm("Delete this vehicle and all its service records?")) return;
    removeItem("vehicles", id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleSaveService = (rec: any) => {
    const vehicle = vehicles.find((v) => v.id === serviceModal.vehicleId);
    if (!vehicle) return;
    const oldHistory: any[] = vehicle.serviceHistory || [];
    const newHistory = serviceModal.existing
      ? oldHistory.map((r) => (r.id === rec.id ? rec : r))
      : [...oldHistory, rec];
    updateItem("vehicles", vehicle.id, { ...vehicle, serviceHistory: newHistory });
    setServiceModal({ open: false });
  };

  const handleDeleteService = (vehicleId: string, serviceId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    updateItem("vehicles", vehicle.id, {
      ...vehicle,
      serviceHistory: (vehicle.serviceHistory || []).filter((r: any) => r.id !== serviceId),
    });
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 820, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Car size={22} style={{ color: THEME.accent }} />
            Vehicles
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--t-muted, var(--text-muted))" }}>
            Track ownership, service history, insurance and current value
          </p>
        </div>
        <Button variant="accent" icon={<Plus size={15} />} onClick={() => setVehicleModal({ open: true })}>
          Add Vehicle
        </Button>
      </div>

      {/* Compliance alerts */}
      {alerts.length > 0 && (
        <div
          style={{
            background: "#f59e0b14",
            border: "1px solid #f59e0b40",
            borderLeft: "3px solid #f59e0b",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {alerts.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#92400e", fontWeight: 500 }}>
              <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Stat tiles */}
      {vehicles.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Vehicles Owned"
            value={vehicles.length.toString()}
            sub={`${vehicles.filter((v) => v.vehicleType === "two-wheeler").length} two-wheeler · ${vehicles.filter((v) => v.vehicleType === "four-wheeler").length} four-wheeler`}
            icon={<Car />}
            color={THEME.accent}
          />
          <StatCard
            label="Current Value"
            value={fmtINR(totalCurrentValue)}
            sub={totalPurchasePrice ? `Bought for ${fmtINR(totalPurchasePrice)}` : undefined}
            subColor={totalPurchasePrice && totalCurrentValue < totalPurchasePrice ? "#ef4444" : undefined}
            icon={<IndianRupee />}
            color="#10b981"
          />
          <StatCard
            label="Total Service Spend"
            value={fmtINR(totalServiceSpend)}
            sub="across all vehicles"
            icon={<Wrench />}
            color="#f59e0b"
          />
        </div>
      )}

      {/* Empty state */}
      {vehicles.length === 0 && (
        <EmptyState
          icon={Car}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, #818cf8 100%)`}
          dotColor={THEME.accent}
          title="No vehicles yet"
          description="Add your two-wheeler, four-wheeler, or any vehicle you own. Track service history, insurance, PUC, and current market value."
          pills={["Service History", "Insurance & PUC Tracking", "Net Worth Integration"]}
          buttonLabel="Add Your First Vehicle"
          onAdd={() => setVehicleModal({ open: true })}
        />
      )}

      {/* Vehicle cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {vehicles.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            expanded={expandedId === v.id}
            onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
            onEdit={() => setVehicleModal({ open: true, existing: v })}
            onDelete={() => handleDeleteVehicle(v.id)}
            onAddService={() => setServiceModal({ open: true, vehicleId: v.id })}
            onEditService={(rec: any) => setServiceModal({ open: true, vehicleId: v.id, existing: rec })}
            onDeleteService={(sid: string) => handleDeleteService(v.id, sid)}
          />
        ))}
      </div>

      {/* Modals */}
      {vehicleModal.open && (
        <VehicleModal
          existing={vehicleModal.existing}
          onClose={() => setVehicleModal({ open: false })}
          onSave={handleSaveVehicle}
        />
      )}
      {serviceModal.open && (
        <ServiceModal
          existing={serviceModal.existing}
          vehicleName={(() => {
            const v = vehicles.find((v) => v.id === serviceModal.vehicleId);
            return v ? `${v.make} ${v.model} (${v.registrationNumber || v.year})` : "";
          })()}
          onClose={() => setServiceModal({ open: false })}
          onSave={handleSaveService}
        />
      )}
    </div>
  );
}
