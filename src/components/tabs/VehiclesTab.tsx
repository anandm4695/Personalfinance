// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  FileText,
  User,
  Calendar,
  Coins,
  Shield,
  Activity,
  Hash,
  Gauge,
  Milestone,
  Search,
  Settings,
  Lightbulb,
  Building2,
  BarChart3,
  Download,
  Calculator,
  SlidersHorizontal,
  Layers,
  Table,
  Filter,
  Sparkles,
  ArrowUpRight,
  Check,
  Fuel,
  Zap,
  ExternalLink,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import {
  fmtINR,
  fmtINRFull,
  fmtINRExact,
  maskCurrencyInText,
  today as todayFn,
} from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { SectionTitle } from "../ui/SectionTitle";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useAsyncAction } from "../../hooks/useAsyncAction";

// ─────────────────────────────────────────────────────────────────────────────
// Brand Domains & Visual Themes (35+ Indian & Global Automakers)
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
  "maruti suzuki": "marutisuzuki.com",
  hyundai: "hyundai.com",
  tata: "tatamotors.com",
  "tata motors": "tatamotors.com",
  toyota: "toyota.com",
  ford: "ford.com",
  mahindra: "mahindra.com",
  kia: "kia.com",
  mg: "mgmotor.co.in",
  "mg motor": "mgmotor.co.in",
  bmw: "bmw.com",
  mercedes: "mercedes-benz.com",
  "mercedes-benz": "mercedes-benz.com",
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
  "ola electric": "olaelectric.com",
  ather: "atherenergy.com",
  "ather energy": "atherenergy.com",
  revolt: "revoltmotors.in",
  harley: "harley-davidson.com",
  "harley-davidson": "harley-davidson.com",
  ducati: "ducati.com",
  triumph: "triumphmotorcycles.co.uk",
  isuzu: "isuzu.com",
  force: "forcemotors.com",
  volvo: "volvocars.com",
  jaguar: "jaguar.com",
  "land rover": "landrover.com",
};

const VEHICLE_MAKE_THEMES: Record<string, { gradient: string; color: string }> = {
  honda: { gradient: "linear-gradient(135deg,#cc0000 0%,#ff4444 100%)", color: "#cc0000" },
  yamaha: { gradient: "linear-gradient(135deg,#0049cc 0%,#4488ff 100%)", color: "#0049cc" },
  suzuki: { gradient: "linear-gradient(135deg,#1a1a7c 0%,#4444cc 100%)", color: "#1a1a7c" },
  hero: { gradient: "linear-gradient(135deg,#002868 0%,#2255aa 100%)", color: "#002868" },
  bajaj: { gradient: "linear-gradient(135deg,#1a2b6b 0%,#3355aa 100%)", color: "#1a2b6b" },
  tvs: { gradient: "linear-gradient(135deg,#e31e26 0%,#ff5555 100%)", color: "#e31e26" },
  royalenfield: { gradient: "linear-gradient(135deg,#5a3e28 0%,#8b6347 100%)", color: "#5a3e28" },
  "royal enfield": {
    gradient: "linear-gradient(135deg,#5a3e28 0%,#8b6347 100%)",
    color: "#5a3e28",
  },
  ktm: { gradient: "linear-gradient(135deg,#ff6600 0%,#ff9944 100%)", color: "#ff6600" },
  kawasaki: { gradient: "linear-gradient(135deg,#00a651 0%,#33cc77 100%)", color: "#00a651" },
  maruti: { gradient: "linear-gradient(135deg,#003087 0%,#1155bb 100%)", color: "#003087" },
  "maruti suzuki": {
    gradient: "linear-gradient(135deg,#003087 0%,#1155bb 100%)",
    color: "#003087",
  },
  hyundai: { gradient: "linear-gradient(135deg,#002c5f 0%,#1155aa 100%)", color: "#002c5f" },
  tata: { gradient: "linear-gradient(135deg,#1d2671 0%,#3355bb 100%)", color: "#1d2671" },
  "tata motors": { gradient: "linear-gradient(135deg,#1d2671 0%,#3355bb 100%)", color: "#1d2671" },
  toyota: { gradient: "linear-gradient(135deg,#eb0a1e 0%,#ff4455 100%)", color: "#eb0a1e" },
  ford: { gradient: "linear-gradient(135deg,#003478 0%,#1155cc 100%)", color: "#003478" },
  mahindra: { gradient: "linear-gradient(135deg,#e31837 0%,#ff4466 100%)", color: "#e31837" },
  kia: { gradient: "linear-gradient(135deg,#ea0029 0%,#ff3355 100%)", color: "#ea0029" },
  mg: { gradient: "linear-gradient(135deg,#c41230 0%,#ee3355 100%)", color: "#c41230" },
  "mg motor": { gradient: "linear-gradient(135deg,#c41230 0%,#ee3355 100%)", color: "#c41230" },
  bmw: { gradient: "linear-gradient(135deg,#1c69d4 0%,#4488ff 100%)", color: "#1c69d4" },
  mercedes: { gradient: "linear-gradient(135deg,#444444 0%,#888888 100%)", color: "#555555" },
  "mercedes-benz": {
    gradient: "linear-gradient(135deg,#444444 0%,#888888 100%)",
    color: "#555555",
  },
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
  const hue =
    Array.from(make || "?").reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  return {
    gradient: `linear-gradient(135deg,hsl(${hue},60%,42%) 0%,hsl(${hue},75%,60%) 100%)`,
    color: `hsl(${hue},60%,42%)`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Indian High-Security Registration Plate (HSRP) Badge Component
// ─────────────────────────────────────────────────────────────────────────────

export function IndianNumberPlate({
  registrationNumber,
  isElectric = false,
  size = "md",
}: {
  registrationNumber?: string;
  isElectric?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const cleanReg = (registrationNumber || "").trim().toUpperCase();
  if (!cleanReg) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--t-muted, var(--text-muted))",
          background: "var(--surface-1, var(--surface))",
          padding: "3px 8px",
          borderRadius: 6,
          border: "1px dashed var(--t-line, var(--border))",
        }}
      >
        <Hash size={11} /> Unregistered
      </span>
    );
  }

  const height = size === "sm" ? 24 : size === "lg" ? 36 : 30;
  const fontSize = size === "sm" ? 11 : size === "lg" ? 15 : 13;
  const indFontSize = size === "sm" ? 6 : size === "lg" ? 8 : 7;
  const bg = isElectric ? "#056526" : "#fbfbfd";
  const textColor = isElectric ? "#ffffff" : "#111827";
  const borderColor = isElectric ? "#0f8c3c" : "#1e293b";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        height,
        borderRadius: size === "sm" ? 4 : 6,
        border: `1.5px solid ${borderColor}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.7)",
        background: bg,
        overflow: "hidden",
        userSelect: "all",
        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace",
        flexShrink: 0,
      }}
      title="High Security Registration Plate (HSRP)"
    >
      {/* Blue IND section with Ashok Chakra circle */}
      <div
        style={{
          width: size === "sm" ? 18 : size === "lg" ? 26 : 22,
          background: "#002868",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1px 0",
          color: "#fff",
          borderRight: `1px solid ${borderColor}`,
          gap: 1,
        }}
      >
        <div
          style={{
            width: size === "sm" ? 7 : 9,
            height: size === "sm" ? 7 : 9,
            borderRadius: "50%",
            border: "1px dashed #ffffff",
            opacity: 0.85,
          }}
        />
        <span
          style={{
            fontSize: indFontSize,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          IND
        </span>
      </div>

      {/* Alphanumeric Number */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: size === "sm" ? "0 8px" : size === "lg" ? "0 12px" : "0 10px",
          color: textColor,
          fontWeight: 900,
          fontSize,
          letterSpacing: "0.08em",
          lineHeight: 1,
          textShadow: isElectric ? "0 1px 2px rgba(0,0,0,0.5)" : "0 1px 1px rgba(255,255,255,0.8)",
        }}
      >
        {cleanReg}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VehicleMakeLogo Component with Domain Fallback
// ─────────────────────────────────────────────────────────────────────────────

function VehicleMakeLogo({ make, size = 48 }: { make: string; size?: number }) {
  const key = getMakeKey(make);
  let domain = "";
  for (const [k, d] of Object.entries(VEHICLE_MAKE_DOMAINS)) {
    if (key === getMakeKey(k) || key.startsWith(getMakeKey(k))) {
      domain = d;
      break;
    }
  }

  const theme = getMakeTheme(make);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [fallbackLevel, setFallbackLevel] = useState(0);

  useEffect(() => {
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

  const br = Math.round(size * 0.28);
  const initials = (make || "?").slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.36);

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: br,
          background: "var(--surface-0, var(--surface))",
          border: `1.5px solid color-mix(in srgb, ${theme.color} 30%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <img
          src={imgSrc}
          alt={make}
          onError={handleError}
          style={{ width: "75%", height: "75%", objectFit: "contain" }}
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
        boxShadow: `0 3px 12px color-mix(in srgb, ${theme.color} 35%, transparent)`,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Photography & Hero Assets
// ─────────────────────────────────────────────────────────────────────────────

const _vpCache: Record<string, string | null> = {};

function VehiclePhotoPreview({
  make,
  model,
  photoUrl,
  height = 180,
}: {
  make: string;
  model: string;
  photoUrl?: string;
  height?: number;
}) {
  const [src, setSrc] = useState<string | null>(photoUrl || null);
  const [failed, setFailed] = useState(false);
  const cacheKey = `${make}|${model}`;

  useEffect(() => {
    if (photoUrl) {
      setSrc(photoUrl);
      setFailed(false);
      return;
    }
    if (cacheKey in _vpCache) {
      setSrc(_vpCache[cacheKey]);
      return;
    }

    const tryFetch = (query: string) =>
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => d.originalimage?.source || d.thumbnail?.source || null);

    tryFetch(`${make} ${model}`)
      .then((url) => {
        if (url) {
          _vpCache[cacheKey] = url;
          setSrc(url);
          return;
        }
        return tryFetch(`${make} ${model} motorcycle`).then((u) => {
          _vpCache[cacheKey] = u;
          setSrc(u);
        });
      })
      .catch(() => {});
  }, [make, model, photoUrl, cacheKey]);

  if (!src || failed) {
    const theme = getMakeTheme(make);
    return (
      <div
        style={{
          height,
          background: `linear-gradient(135deg, color-mix(in srgb, ${theme.color} 15%, var(--surface-0)) 0%, color-mix(in srgb, var(--surface-1) 80%, transparent) 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid var(--t-line, var(--border))",
        }}
      >
        <div style={{ opacity: 0.18, transform: "scale(1.8)" }}>
          <Car size={64} style={{ color: theme.color }} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
            {make} {model}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        height,
        overflow: "hidden",
        background: "var(--surface-1, var(--surface))",
        borderBottom: "1px solid var(--t-line, var(--border))",
      }}
    >
      <img
        src={src}
        alt={`${make} ${model}`}
        onError={() => setFailed(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          opacity: 0.92,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.75))",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          fontSize: 14,
          fontWeight: 800,
          color: "#fff",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          letterSpacing: "-0.01em",
        }}
      >
        {make} {model}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Lookups
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_TYPES: Record<string, string> = {
  "two-wheeler": "Two-Wheeler",
  "four-wheeler": "Four-Wheeler",
  commercial: "Commercial",
};

const FUEL_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  petrol: { label: "Petrol", icon: Fuel, color: THEME.accent },
  diesel: { label: "Diesel", icon: Fuel, color: THEME.gold },
  electric: { label: "Electric (EV)", icon: Zap, color: THEME.sage },
  cng: { label: "CNG", icon: Fuel, color: THEME.cyan },
  hybrid: { label: "Hybrid", icon: Zap, color: THEME.violet },
};

const SERVICE_TYPES: Record<string, { label: string; color: string; icon: any }> = {
  regular_service: { label: "Regular Service", color: THEME.accent, icon: Wrench },
  tyre_change: { label: "Tyre Change", color: THEME.gold, icon: Milestone },
  battery_change: { label: "Battery Replacement", color: THEME.violet, icon: Zap },
  repair: { label: "Mechanical / Body Repair", color: THEME.rust, icon: AlertTriangle },
  insurance: { label: "Insurance Renewal", color: THEME.sage, icon: Shield },
  puc: { label: "PUC Renewal", color: THEME.cyan, icon: Activity },
  other: { label: "Other Upgrades / Accessories", color: THEME.muted, icon: SlidersHorizontal },
};

const INSURANCE_POLICY_TYPES: Record<string, { label: string; color: string }> = {
  comprehensive: { label: "Comprehensive Package", color: THEME.accent },
  own_damage: { label: "Own Damage (OD)", color: THEME.gold },
  third_party: { label: "Third Party (TP)", color: THEME.cyan },
  zero_dep: { label: "Zero Depreciation Cover", color: THEME.sage },
  bundled_long_term: { label: "Bundled Long-Term (1yr OD + 3/5yr TP)", color: THEME.violet },
};

// ─────────────────────────────────────────────────────────────────────────────
// Compliance & Reminder Calculations
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
const today = todayFn;

type ComplianceStatus = {
  label: string;
  color: string;
  icon: "ok" | "warn" | "alert";
  days?: number;
} | null;

const complianceStatus = (expiry: string): ComplianceStatus => {
  if (!expiry) return null;
  const todayStr = today();
  const expiryTime = new Date(expiry + "T00:00:00").getTime();
  const todayTime = new Date(todayStr + "T00:00:00").getTime();
  const daysLeft = Math.ceil((expiryTime - todayTime) / 86400000);
  if (daysLeft < 0)
    return {
      label: `Expired (${Math.abs(daysLeft)}d ago)`,
      color: THEME.rust,
      icon: "alert",
      days: daysLeft,
    };
  if (daysLeft === 0) return { label: "Expires today", color: THEME.rust, icon: "alert", days: 0 };
  if (daysLeft <= 30)
    return { label: `Due in ${daysLeft}d`, color: THEME.gold, icon: "warn", days: daysLeft };
  return { label: `Valid (${daysLeft}d left)`, color: THEME.sage, icon: "ok", days: daysLeft };
};

const serviceDueStatus = (
  dueDate: string,
  dueOdo: number,
  currentOdo: number
): ComplianceStatus => {
  let daysLeft: number | null = null;
  if (dueDate) {
    const todayStr = today();
    const dueTime = new Date(dueDate + "T00:00:00").getTime();
    const todayTime = new Date(todayStr + "T00:00:00").getTime();
    daysLeft = Math.ceil((dueTime - todayTime) / 86400000);
  }
  let kmLeft: number | null = null;
  if (dueOdo > 0 && currentOdo > 0) {
    kmLeft = dueOdo - currentOdo;
  }
  if (daysLeft === null && kmLeft === null) return null;

  const parts: string[] = [];
  if (daysLeft !== null) parts.push(`${Math.abs(daysLeft)}d`);
  if (kmLeft !== null) parts.push(`${Math.abs(kmLeft).toLocaleString("en-IN")} km`);
  const joined = parts.join(" / ");

  const overdue = (daysLeft !== null && daysLeft < 0) || (kmLeft !== null && kmLeft < 0);
  if (overdue) return { label: `Overdue by ${joined}`, color: THEME.rust, icon: "alert" };

  const dueSoon = (daysLeft !== null && daysLeft <= 14) || (kmLeft !== null && kmLeft <= 500);
  if (dueSoon) return { label: `Due in ${joined}`, color: THEME.gold, icon: "warn" };

  return { label: `${joined} left`, color: THEME.sage, icon: "ok" };
};

const getLatestOdo = (vehicle: any): number => {
  const fromService = (vehicle.serviceHistory || []).reduce(
    (max: number, r: any) => Math.max(max, Number(r.odometer || 0)),
    0
  );
  return Math.max(fromService, Number(vehicle.currentOdometer || 0));
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--t-line, var(--border))",
  background: "var(--surface-0, var(--surface))",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 500,
  boxSizing: "border-box" as const,
  outline: "none",
};

// ─────────────────────────────────────────────────────────────────────────────
// Compliance Status Tag
// ─────────────────────────────────────────────────────────────────────────────

function StatusTag({ status: s, tag }: { status: ComplianceStatus; tag: string }) {
  if (!s) return null;
  const Icon = s.icon === "ok" ? CheckCircle : s.icon === "warn" ? Clock : AlertTriangle;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        padding: "3px 8px",
        borderRadius: "var(--radius-xs, 6px)",
        background: `color-mix(in srgb, ${s.color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${s.color} 25%, transparent)`,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={11} />
      {tag}: {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VehicleModal: Multi-Section Add / Edit Vehicle
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_VEHICLE = {
  vehicleType: "four-wheeler",
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
  purchaseBasicCost: "",
  purchaseCgstAmount: "",
  purchaseSgstAmount: "",
  rtoCharges: "",
  accessoriesCharges: "",
  currentValue: "",
  currentOdometer: "",
  insuranceExpiry: "",
  pucExpiry: "",
  nextServiceDueDate: "",
  nextServiceDueOdometer: "",
  photoUrl: "",
  rcDocumentUrl: "",
  insurancePolicyUrl: "",
  pucCertificateUrl: "",
  notes: "",
  owner: "self",
};

function VehicleModal({ existing, onClose, onSave, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const isEdit = !!existing;
  const [f, setF] = useState<any>(
    existing
      ? {
          ...EMPTY_VEHICLE,
          ...existing,
          purchasePrice: existing.purchasePrice ?? "",
          purchaseBasicCost: existing.purchaseBasicCost ?? "",
          purchaseCgstAmount: existing.purchaseCgstAmount ?? "",
          purchaseSgstAmount: existing.purchaseSgstAmount ?? "",
          rtoCharges: existing.rtoCharges ?? "",
          accessoriesCharges: existing.accessoriesCharges ?? "",
          currentValue: existing.currentValue ?? "",
          currentOdometer: existing.currentOdometer ?? "",
        }
      : { ...EMPTY_VEHICLE }
  );
  const [rcStatus, setRcStatus] = useState<"idle" | "loading" | "ok" | "error" | "nokey">("idle");
  const [rcMsg, setRcMsg] = useState("");
  const [rcSource, setRcSource] = useState("");

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const canSave = f.make.trim() && f.model.trim();

  const onRoadTotal =
    Number(f.purchaseBasicCost || 0) +
    Number(f.purchaseCgstAmount || 0) +
    Number(f.purchaseSgstAmount || 0) +
    Number(f.rtoCharges || 0) +
    Number(f.accessoriesCharges || 0);

  const lookupRC = async () => {
    const reg = (f.registrationNumber || "").trim();
    if (!reg) {
      setRcStatus("error");
      setRcMsg("Enter a registration number first");
      return;
    }
    setRcStatus("loading");
    setRcMsg("");
    setRcSource("");
    try {
      const r = await fetch(`/api/rc-lookup?reg=${encodeURIComponent(reg)}`);
      const data = await r.json();
      if (!r.ok) {
        if (data.noProvider) {
          setRcStatus("nokey");
          setRcMsg("");
        } else {
          setRcStatus("error");
          setRcMsg(data.error || "Vehicle not found in VAHAN database");
        }
        return;
      }
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
      setRcSource(data.source || "");
      setRcMsg(
        `✓ Auto-filled via ${data.source || "VAHAN"}` +
          (data.ownerName ? ` · Owner: ${data.ownerName}` : "") +
          (data.rto ? ` · RTO: ${data.rto}` : "")
      );
    } catch {
      setRcStatus("error");
      setRcMsg("Network error — check your connection and try again");
    }
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      ...f,
      purchasePrice: Number(f.purchasePrice) || 0,
      purchaseBasicCost: Number(f.purchaseBasicCost) || 0,
      purchaseCgstAmount: Number(f.purchaseCgstAmount) || 0,
      purchaseSgstAmount: Number(f.purchaseSgstAmount) || 0,
      rtoCharges: Number(f.rtoCharges) || 0,
      accessoriesCharges: Number(f.accessoriesCharges) || 0,
      currentValue: Number(f.currentValue) || 0,
      currentOdometer: Number(f.currentOdometer) || 0,
      year: Number(f.year) || new Date().getFullYear(),
      nextServiceDueOdometer: Number(f.nextServiceDueOdometer) || 0,
      serviceHistory: existing?.serviceHistory || [],
      insuranceHistory: existing?.insuranceHistory || [],
    });
  };

  const g2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  };
  const g3: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  };

  return (
    <Modal
      title={isEdit ? "Edit Vehicle Details" : "Add Vehicle to Garage"}
      onClose={onClose}
      maxWidth={620}
      footer={
        <ModalActions
          onClose={onClose}
          onSave={handleSave}
          saveLabel={isEdit ? "Save Changes" : "Add to Garage"}
          disabled={!canSave || saving}
          loading={saving}
        />
      }
    >
      {/* Group 1: Identity */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "var(--t-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 10,
        }}
      >
        1. Vehicle Identity & Ownership
      </div>
      <div style={g3}>
        <Field label="Vehicle Type *">
          <select
            style={inp}
            value={f.vehicleType}
            onChange={(e) => set("vehicleType", e.target.value)}
          >
            {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fuel Type">
          <select style={inp} value={f.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
            {Object.entries(FUEL_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner Profile">
          <select
            style={inp}
            value={f.owner || "self"}
            onChange={(e) => set("owner", e.target.value)}
          >
            {familyProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={g2}>
        <Field label="Make / Manufacturer *">
          <input
            style={inp}
            value={f.make}
            onChange={(e) => set("make", e.target.value)}
            placeholder="e.g. Tata, Hyundai, Royal Enfield"
          />
        </Field>
        <Field label="Model *">
          <input
            style={inp}
            value={f.model}
            onChange={(e) => set("model", e.target.value)}
            placeholder="e.g. Nexon EV, Creta, Classic 350"
          />
        </Field>
      </div>

      <div style={g2}>
        <Field label="Manufacturing Year">
          <input
            style={inp}
            type="number"
            value={f.year}
            onChange={(e) => set("year", e.target.value)}
            min={1980}
            max={2035}
          />
        </Field>
        <Field label="Exterior Color">
          <input
            style={inp}
            value={f.color}
            onChange={(e) => set("color", e.target.value)}
            placeholder="e.g. Daytona Grey, Arctic White"
          />
        </Field>
      </div>

      {/* Group 2: Government & RC Registration */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "var(--t-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginTop: 20,
          marginBottom: 10,
          borderTop: "1px solid var(--t-line)",
          paddingTop: 16,
        }}
      >
        2. Government Registration & VAHAN Lookup
      </div>

      <Field label="Registration Number (License Plate)">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inp, flex: 1, fontFamily: "monospace", fontWeight: 700 }}
            value={f.registrationNumber}
            onChange={(e) => {
              set("registrationNumber", e.target.value.toUpperCase());
              setRcStatus("idle");
            }}
            placeholder="e.g. MH02CD1234, DL01AB9999"
          />
          <button
            type="button"
            onClick={lookupRC}
            disabled={rcStatus === "loading"}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: rcStatus === "loading" ? "var(--t-muted)" : "var(--t-accent)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: rcStatus === "loading" ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            {rcStatus === "loading" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Search size={13} />
            )}
            {rcStatus === "loading" ? "Fetching VAHAN…" : "Lookup RC"}
          </button>
        </div>

        {rcStatus === "ok" && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
              border: `1px solid ${THEME.sage}`,
              color: THEME.sage,
            }}
          >
            {rcMsg}
          </div>
        )}
        {rcStatus === "error" && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              background: `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
              border: `1px solid ${THEME.rust}`,
              color: THEME.rust,
            }}
          >
            ✕ {rcMsg}
          </div>
        )}
      </Field>

      <div style={g2}>
        <Field label="Chassis Number (VIN)">
          <input
            style={inp}
            value={f.chassisNumber}
            onChange={(e) => set("chassisNumber", e.target.value.toUpperCase())}
            placeholder="17-character VIN"
          />
        </Field>
        <Field label="Engine Number">
          <input
            style={inp}
            value={f.engineNumber}
            onChange={(e) => set("engineNumber", e.target.value.toUpperCase())}
            placeholder="Engine Serial No."
          />
        </Field>
      </div>

      {/* Group 3: Financials & On-road Cost Breakdown */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "var(--t-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginTop: 20,
          marginBottom: 10,
          borderTop: "1px solid var(--t-line)",
          paddingTop: 16,
        }}
      >
        3. Financials & Valuation
      </div>

      <div style={g2}>
        <Field label="Purchase Date">
          <input
            style={inp}
            type="date"
            value={f.purchaseDate}
            onChange={(e) => set("purchaseDate", e.target.value)}
          />
        </Field>
        <Field label="Total On-Road Price (₹) *">
          <input
            style={inp}
            type="number"
            value={f.purchasePrice}
            onChange={(e) => set("purchasePrice", e.target.value)}
            placeholder="Total invoice amount"
          />
        </Field>
      </div>

      <div style={g3}>
        <Field label="Basic Ex-Showroom (₹)">
          <input
            style={inp}
            type="number"
            value={f.purchaseBasicCost}
            onChange={(e) => set("purchaseBasicCost", e.target.value)}
            placeholder="Basic price"
          />
        </Field>
        <Field label="CGST + SGST (₹)">
          <input
            style={inp}
            type="number"
            value={Number(f.purchaseCgstAmount || 0) + Number(f.purchaseSgstAmount || 0) || ""}
            onChange={(e) => {
              const half = (Number(e.target.value) || 0) / 2;
              set("purchaseCgstAmount", String(half));
              set("purchaseSgstAmount", String(half));
            }}
            placeholder="GST total"
          />
        </Field>
        <Field label="RTO & Taxes (₹)">
          <input
            style={inp}
            type="number"
            value={f.rtoCharges}
            onChange={(e) => set("rtoCharges", e.target.value)}
            placeholder="Registration"
          />
        </Field>
      </div>

      {onRoadTotal > 0 && Number(f.purchasePrice || 0) !== onRoadTotal && (
        <div style={{ fontSize: 12, color: "var(--t-muted)", marginTop: -4, marginBottom: 10 }}>
          Breakdown sum is <Money value={onRoadTotal} variant="full" /> —{" "}
          <button
            type="button"
            onClick={() => set("purchasePrice", String(onRoadTotal))}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: THEME.accent,
              fontWeight: 700,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Apply as On-Road Price
          </button>
        </div>
      )}

      <div style={g2}>
        <Field label="Current Resale Estimate (₹)">
          <input
            style={inp}
            type="number"
            value={f.currentValue}
            onChange={(e) => set("currentValue", e.target.value)}
            placeholder="Current Market Resale"
          />
        </Field>
        <Field label="Current Odometer (KM)">
          <input
            style={inp}
            type="number"
            value={f.currentOdometer}
            onChange={(e) => set("currentOdometer", e.target.value)}
            placeholder="e.g. 18500"
          />
        </Field>
      </div>

      {/* Group 4: Compliance & Service Reminders */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "var(--t-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginTop: 20,
          marginBottom: 10,
          borderTop: "1px solid var(--t-line)",
          paddingTop: 16,
        }}
      >
        4. Compliance & Service Reminders
      </div>

      <div style={g2}>
        <Field label="Insurance Expiry Date">
          <input
            style={inp}
            type="date"
            value={f.insuranceExpiry}
            onChange={(e) => set("insuranceExpiry", e.target.value)}
          />
        </Field>
        <Field label="PUC Expiry Date">
          <input
            style={inp}
            type="date"
            value={f.pucExpiry}
            onChange={(e) => set("pucExpiry", e.target.value)}
          />
        </Field>
      </div>

      <div style={g2}>
        <Field label="Next Service Due Date">
          <input
            style={inp}
            type="date"
            value={f.nextServiceDueDate}
            onChange={(e) => set("nextServiceDueDate", e.target.value)}
          />
        </Field>
        <Field label="Next Service Due (KM)">
          <input
            style={inp}
            type="number"
            value={f.nextServiceDueOdometer}
            onChange={(e) => set("nextServiceDueOdometer", e.target.value)}
            placeholder="e.g. 25000"
          />
        </Field>
      </div>

      {/* Group 5: Documents & Custom Media */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "var(--t-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginTop: 20,
          marginBottom: 10,
          borderTop: "1px solid var(--t-line)",
          paddingTop: 16,
        }}
      >
        5. Document Links & Photo
      </div>

      <div style={g3}>
        <Field label="RC Document Link">
          <input
            style={inp}
            value={f.rcDocumentUrl || ""}
            onChange={(e) => set("rcDocumentUrl", e.target.value)}
            placeholder="Google Drive / Cloud URL"
          />
        </Field>
        <Field label="Insurance Policy Link">
          <input
            style={inp}
            value={f.insurancePolicyUrl || ""}
            onChange={(e) => set("insurancePolicyUrl", e.target.value)}
            placeholder="Policy PDF link"
          />
        </Field>
        <Field label="PUC Certificate Link">
          <input
            style={inp}
            value={f.pucCertificateUrl || ""}
            onChange={(e) => set("pucCertificateUrl", e.target.value)}
            placeholder="PUC copy link"
          />
        </Field>
      </div>

      <Field label="Custom Photo URL (optional)">
        <input
          style={inp}
          value={f.photoUrl || ""}
          onChange={(e) => set("photoUrl", e.target.value)}
          placeholder="Leave blank to auto-fetch official photo from Wikipedia"
        />
      </Field>

      <Field label="Additional Vehicle Notes">
        <textarea
          style={{ ...inp, height: 60, resize: "vertical" }}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Warranty, tyre specs, accessories..."
        />
      </Field>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ServiceModal: Add / Edit Service Record
// ─────────────────────────────────────────────────────────────────────────────

function ServiceModal({
  existing,
  vehicleName,
  currentReminder,
  onClose,
  onSave,
  saving = false,
}: any) {
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
  const [nextDueDate, setNextDueDate] = useState("");
  const [nextDueOdo, setNextDueOdo] = useState("");

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!f.date || !f.type) return;
    onSave({
      rec: {
        ...f,
        id: existing?.id || uid(),
        cost: Number(f.cost) || 0,
        odometer: Number(f.odometer) || 0,
      },
      nextServiceDueDate: nextDueDate || undefined,
      nextServiceDueOdometer: nextDueOdo ? Number(nextDueOdo) : undefined,
    });
  };

  const g2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  };

  return (
    <Modal
      title={isEdit ? "Edit Service Record" : "Add Service & Maintenance Record"}
      onClose={onClose}
      maxWidth={520}
      footer={
        <ModalActions
          onClose={onClose}
          onSave={handleSave}
          saveLabel={isEdit ? "Save Changes" : "Add Service Record"}
          disabled={!f.date || !f.type || saving}
          loading={saving}
        />
      }
    >
      {vehicleName && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--t-accent)",
            background: "color-mix(in srgb, var(--t-accent) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Car size={14} /> {vehicleName}
        </div>
      )}

      <div style={g2}>
        <Field label="Service Date *">
          <input
            style={inp}
            type="date"
            value={f.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field label="Service Category *">
          <select style={inp} value={f.type} onChange={(e) => set("type", e.target.value)}>
            {Object.entries(SERVICE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Service Description">
        <input
          style={inp}
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="e.g. 20,000 km Major Periodic Service + Synthetic Engine Oil"
        />
      </Field>

      <div style={g2}>
        <Field label="Total Invoice Cost (₹)">
          <input
            style={inp}
            type="number"
            value={f.cost}
            onChange={(e) => set("cost", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Odometer Reading (KM)">
          <input
            style={inp}
            type="number"
            value={f.odometer}
            onChange={(e) => set("odometer", e.target.value)}
            placeholder="e.g. 19500"
          />
        </Field>
      </div>

      <Field label="Service Center / Workshop">
        <input
          style={inp}
          value={f.serviceCenter}
          onChange={(e) => set("serviceCenter", e.target.value)}
          placeholder="e.g. Tata Motors Authorized Service Center"
        />
      </Field>

      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "var(--t-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginTop: 16,
          marginBottom: 8,
          borderTop: "1px solid var(--t-line)",
          paddingTop: 14,
        }}
      >
        Update Next Service Reminder (optional)
      </div>

      <div style={g2}>
        <Field label="Next Service Due Date">
          <input
            style={inp}
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
          />
        </Field>
        <Field label="Next Service Due (KM)">
          <input
            style={inp}
            type="number"
            value={nextDueOdo}
            onChange={(e) => setNextDueOdo(e.target.value)}
            placeholder="e.g. 30000"
          />
        </Field>
      </div>

      <Field label="Invoice Notes / Replaced Parts">
        <textarea
          style={{ ...inp, height: 50, resize: "vertical" }}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Air filter, brake pads, wheel alignment..."
        />
      </Field>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InsuranceModal: Add / Edit Insurance Policy
// ─────────────────────────────────────────────────────────────────────────────

function InsuranceModal({ existing, vehicleName, onClose, onSave, saving = false }: any) {
  const isEdit = !!existing;
  const [f, setF] = useState<any>(
    existing
      ? {
          ...existing,
          basicCost: existing.basicCost ?? "",
          cgstAmount: existing.cgstAmount ?? "",
          sgstAmount: existing.sgstAmount ?? "",
        }
      : {
          policyType: "comprehensive",
          insurer: "",
          policyNumber: "",
          tenure: "1_year",
          fromDate: today(),
          toDate: "",
          basicCost: "",
          cgstAmount: "",
          sgstAmount: "",
          notes: "",
        }
  );

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const totalPremium =
    Number(f.basicCost || 0) + Number(f.cgstAmount || 0) + Number(f.sgstAmount || 0);
  const canSave = !!(f.fromDate && f.toDate);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      ...f,
      id: existing?.id || uid(),
      basicCost: Number(f.basicCost) || 0,
      cgstAmount: Number(f.cgstAmount) || 0,
      sgstAmount: Number(f.sgstAmount) || 0,
      totalPremium,
    });
  };

  const g2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  };
  const g3: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  };

  return (
    <Modal
      title={isEdit ? "Edit Insurance Record" : "Add Insurance Policy / Renewal"}
      onClose={onClose}
      maxWidth={520}
      footer={
        <ModalActions
          onClose={onClose}
          onSave={handleSave}
          saveLabel={isEdit ? "Save Policy" : "Add Policy"}
          disabled={!canSave || saving}
          loading={saving}
        />
      }
    >
      {vehicleName && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--t-accent)",
            background: "color-mix(in srgb, var(--t-accent) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Shield size={14} /> {vehicleName}
        </div>
      )}

      <div style={g2}>
        <Field label="Policy Cover Type">
          <select
            style={inp}
            value={f.policyType}
            onChange={(e) => set("policyType", e.target.value)}
          >
            {Object.entries(INSURANCE_POLICY_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tenure Term">
          <select style={inp} value={f.tenure} onChange={(e) => set("tenure", e.target.value)}>
            <option value="1_year">1 Year Policy</option>
            <option value="3_year">3 Years Long Term</option>
            <option value="5_year">5 Years Long Term</option>
          </select>
        </Field>
      </div>

      <div style={g2}>
        <Field label="Cover Start Date *">
          <input
            style={inp}
            type="date"
            value={f.fromDate}
            onChange={(e) => set("fromDate", e.target.value)}
          />
        </Field>
        <Field label="Cover Expiry Date *">
          <input
            style={inp}
            type="date"
            value={f.toDate}
            onChange={(e) => set("toDate", e.target.value)}
          />
        </Field>
      </div>

      <div style={g2}>
        <Field label="Insurance Provider / Company">
          <input
            style={inp}
            value={f.insurer}
            onChange={(e) => set("insurer", e.target.value)}
            placeholder="e.g. HDFC ERGO, ICICI Lombard, ACKO"
          />
        </Field>
        <Field label="Policy Number">
          <input
            style={inp}
            value={f.policyNumber}
            onChange={(e) => set("policyNumber", e.target.value)}
            placeholder="e.g. 2314/50493829/00/000"
          />
        </Field>
      </div>

      <div style={g3}>
        <Field label="Net Premium (₹)">
          <input
            style={inp}
            type="number"
            value={f.basicCost}
            onChange={(e) => set("basicCost", e.target.value)}
            placeholder="Basic OD + TP"
          />
        </Field>
        <Field label="GST / Taxes (₹)">
          <input
            style={inp}
            type="number"
            value={Number(f.cgstAmount || 0) + Number(f.sgstAmount || 0) || ""}
            onChange={(e) => {
              const half = (Number(e.target.value) || 0) / 2;
              set("cgstAmount", String(half));
              set("sgstAmount", String(half));
            }}
            placeholder="18% GST"
          />
        </Field>
        <Field label="Total Premium (₹)">
          <div
            style={{
              ...inp,
              fontWeight: 800,
              color: "var(--t-accent)",
              display: "flex",
              alignItems: "center",
              background: "var(--surface-1, var(--surface))",
            }}
          >
            <Money value={totalPremium} variant="full" />
          </div>
        </Field>
      </div>

      <Field label="Policy Notes / Add-ons / NCB %">
        <textarea
          style={{ ...inp, height: 50, resize: "vertical" }}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="50% NCB applied, Zero Dep + Engine Protect + RSA add-on..."
        />
      </Field>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VehicleCard: Luxury Showroom Card with 5 Sub-Tabs
// ─────────────────────────────────────────────────────────────────────────────

function VehicleCard({
  vehicle,
  expanded,
  activeTab = "overview",
  onTabChange,
  onToggle,
  onEdit,
  onDelete,
  onAddService,
  onEditService,
  onDeleteService,
  onAddInsurance,
  onEditInsurance,
  onDeleteInsurance,
}: any) {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();

  const ownerProfile = familyProfiles.find((p) => p.id === (vehicle.owner || "self"));
  const ownerName = ownerProfile ? formatProfileOption(ownerProfile) : vehicle.owner || "Self";

  const sh: any[] = vehicle.serviceHistory || [];
  const ih: any[] = vehicle.insuranceHistory || [];

  const totalInsurancePremium = ih.reduce(
    (s: number, r: any) => s + Number(r.totalPremium || 0),
    0
  );
  const totalServiceCost = sh.reduce((s: number, r: any) => s + Number(r.cost || 0), 0);
  const latestOdo = getLatestOdo(vehicle);

  const hasCurrentValue = Number(vehicle.currentValue || 0) > 0;
  const depreciation = hasCurrentValue
    ? Math.max(0, Number(vehicle.purchasePrice || 0) - Number(vehicle.currentValue || 0))
    : 0;
  const tco = depreciation + totalServiceCost + totalInsurancePremium;
  const costPerKm = latestOdo > 0 && tco > 0 ? tco / latestOdo : null;

  const valueRetainedPct =
    vehicle.purchasePrice && vehicle.currentValue && vehicle.purchasePrice > 0
      ? Math.round((vehicle.currentValue / vehicle.purchasePrice) * 100)
      : null;

  const deprPct =
    vehicle.purchasePrice && vehicle.currentValue && vehicle.purchasePrice > vehicle.currentValue
      ? Math.round(((vehicle.purchasePrice - vehicle.currentValue) / vehicle.purchasePrice) * 100)
      : null;

  const serviceDueStat = serviceDueStatus(
    vehicle.nextServiceDueDate,
    Number(vehicle.nextServiceDueOdometer || 0),
    latestOdo
  );

  const fuelMeta = FUEL_TYPES[vehicle.fuelType] || FUEL_TYPES.petrol;

  // Annual service spend breakdown
  const spendByYear = useMemo(() => {
    const years: Record<number, number> = {};
    sh.forEach((r) => {
      if (r.date) {
        const yr = new Date(r.date + "T00:00:00").getFullYear();
        if (!isNaN(yr)) years[yr] = (years[yr] || 0) + Number(r.cost || 0);
      }
    });
    return Object.entries(years)
      .map(([year, amount]) => ({ year: String(year), amount }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [sh]);

  // Odometer trend data
  const odoTrend = useMemo(() => {
    return sh
      .filter((r) => Number(r.odometer || 0) > 0)
      .map((r) => ({
        date: r.date,
        displayDate: new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        odometer: Number(r.odometer),
      }))
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [sh]);

  return (
    <div
      className="glass card-base card-hover"
      style={{
        borderRadius: "var(--radius-xl, 18px)",
        border: "1px solid var(--t-line, var(--border))",
        overflow: "hidden",
        transition: "all 0.25s var(--ease-premium)",
        boxShadow: "var(--shadow-card, 0 4px 16px rgba(0,0,0,0.06))",
      }}
    >
      {/* ── Main Collapsible Header ── */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 20px",
          cursor: "pointer",
          userSelect: "none",
          background: expanded
            ? "color-mix(in srgb, var(--t-accent) 4%, var(--surface-0))"
            : "var(--surface-0, var(--surface))",
          transition: "background-color 0.2s ease",
        }}
      >
        {/* Brand Make Logo */}
        <VehicleMakeLogo make={vehicle.make} size={50} />

        {/* Identity & Specs */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontWeight: 900,
                fontSize: 17,
                letterSpacing: "-0.02em",
                color: "var(--text)",
              }}
            >
              {vehicle.make} {vehicle.model}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "var(--radius-xs, 6px)",
                background: "var(--t-line, var(--border))",
                color: "var(--t-muted, var(--text-muted))",
              }}
            >
              {vehicle.year}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "var(--radius-xs, 6px)",
                background: `color-mix(in srgb, ${fuelMeta.color} 10%, transparent)`,
                color: fuelMeta.color,
                border: `1px solid color-mix(in srgb, ${fuelMeta.color} 20%, transparent)`,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <fuelMeta.icon size={11} /> {fuelMeta.label}
            </span>
            {vehicle.color && (
              <span style={{ fontSize: 12, color: "var(--t-muted)" }}>• {vehicle.color}</span>
            )}
          </div>

          {/* Plate & Owner & Odometer Sub-row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <IndianNumberPlate
              registrationNumber={vehicle.registrationNumber}
              isElectric={vehicle.fuelType === "electric"}
              size="sm"
            />
            <span
              style={{
                fontSize: 12,
                color: "var(--t-muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <User size={12} /> {ownerName}
            </span>
            {latestOdo > 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--t-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Gauge size={12} /> {latestOdo.toLocaleString("en-IN")} km
              </span>
            )}
          </div>

          {/* Compliance Status Tags */}
          {(vehicle.insuranceExpiry || vehicle.pucExpiry || serviceDueStat) && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {vehicle.insuranceExpiry && (
                <StatusTag status={complianceStatus(vehicle.insuranceExpiry)} tag="Insurance" />
              )}
              {vehicle.pucExpiry && (
                <StatusTag status={complianceStatus(vehicle.pucExpiry)} tag="PUC" />
              )}
              {serviceDueStat && <StatusTag status={serviceDueStat} tag="Service" />}
            </div>
          )}
        </div>

        {/* Resale Value & Action Area */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--t-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 2,
            }}
          >
            Estimated Value
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: 20,
              color: "var(--t-accent)",
              letterSpacing: "-0.03em",
            }}
          >
            <Money
              value={Number(vehicle.currentValue || vehicle.purchasePrice || 0)}
              variant="full"
            />
          </div>
          {deprPct !== null && (
            <div
              style={{
                fontSize: 11,
                color: THEME.rust,
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 3,
                fontWeight: 700,
              }}
            >
              <TrendingDown size={11} /> {deprPct}% depreciated
            </div>
          )}
          <div style={{ marginTop: 8, color: "var(--t-muted)" }}>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* ── Expanded Deep-Dive Panel ── */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--t-line, var(--border))",
            background: "var(--surface-0, var(--surface))",
          }}
        >
          {/* Photo Preview Showcase */}
          <VehiclePhotoPreview
            make={vehicle.make}
            model={vehicle.model}
            photoUrl={vehicle.photoUrl}
            height={190}
          />

          {/* Quick Action Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderBottom: "1px solid var(--t-line)",
              background: "color-mix(in srgb, var(--surface-1) 50%, var(--surface-0))",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {/* 5 Sub-Tabs Navigation */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { id: "overview", label: "Overview & Specs", icon: Car },
                { id: "service", label: `Service Log (${sh.length})`, icon: Wrench },
                { id: "insurance", label: `Insurance (${ih.length})`, icon: Shield },
                { id: "documents", label: "Documents", icon: FileText },
                { id: "economics", label: "TCO & Economics", icon: BarChart3 },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabChange?.(tab.id);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: active ? 800 : 600,
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: active ? "1px solid var(--t-accent)" : "1px solid transparent",
                      background: active
                        ? "color-mix(in srgb, var(--t-accent) 12%, transparent)"
                        : "transparent",
                      color: active ? "var(--t-accent)" : "var(--t-muted)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <TabIcon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Vehicle Edit/Delete Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" size="sm" icon={<Pencil size={12} />} onClick={onEdit}>
                Edit
              </Button>
              <Button variant="danger" size="sm" icon={<Trash2 size={12} />} onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>

          {/* Sub-Tab 1: Overview & Specs */}
          {activeTab === "overview" && (
            <div style={{ padding: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "Vehicle Type",
                    value: VEHICLE_TYPES[vehicle.vehicleType] || vehicle.vehicleType,
                    icon: Car,
                    color: THEME.accent,
                  },
                  { label: "Fuel Type", value: fuelMeta.label, icon: Fuel, color: fuelMeta.color },
                  {
                    label: "Manufacturing Year",
                    value: vehicle.year || "—",
                    icon: Calendar,
                    color: THEME.gold,
                  },
                  {
                    label: "Color",
                    value: vehicle.color || "—",
                    icon: Sparkles,
                    color: THEME.cyan,
                  },
                  { label: "Owner Profile", value: ownerName, icon: User, color: THEME.sage },
                  {
                    label: "Latest Odometer",
                    value: latestOdo ? `${latestOdo.toLocaleString("en-IN")} km` : "—",
                    icon: Gauge,
                    color: THEME.cyan,
                  },
                  {
                    label: "Chassis / VIN",
                    value: vehicle.chassisNumber || "—",
                    icon: Hash,
                    color: THEME.violet,
                  },
                  {
                    label: "Engine Number",
                    value: vehicle.engineNumber || "—",
                    icon: Gauge,
                    color: THEME.pink,
                  },
                ].map((spec, i) => {
                  const SpecIcon = spec.icon;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "color-mix(in srgb, var(--surface-1) 50%, var(--surface-0))",
                        border: "1px solid var(--t-line, var(--border))",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ color: spec.color, marginTop: 2 }}>
                        <SpecIcon size={16} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: "var(--t-muted)",
                            letterSpacing: "0.06em",
                            marginBottom: 2,
                          }}
                        >
                          {spec.label}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text)",
                            wordBreak: "break-all",
                          }}
                        >
                          {spec.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Purchase & Financial Breakdown */}
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: "color-mix(in srgb, var(--surface-1) 40%, var(--surface-0))",
                  border: "1px solid var(--t-line)",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "var(--t-muted)",
                    letterSpacing: "0.08em",
                    marginBottom: 14,
                  }}
                >
                  Acquisition & On-Road Price Breakdown
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "var(--t-muted)" }}>Purchase Date</div>
                    <div
                      style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginTop: 2 }}
                    >
                      {fmtDate(vehicle.purchaseDate)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--t-muted)" }}>Total On-Road Price</div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: "var(--t-accent)",
                        marginTop: 2,
                      }}
                    >
                      <Money value={Number(vehicle.purchasePrice || 0)} variant="full" />
                    </div>
                  </div>
                  {Number(vehicle.purchaseBasicCost || 0) > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--t-muted)" }}>Ex-Showroom Basic</div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--text)",
                          marginTop: 2,
                        }}
                      >
                        <Money value={Number(vehicle.purchaseBasicCost)} variant="full" />
                      </div>
                    </div>
                  )}
                  {Number(vehicle.rtoCharges || 0) > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--t-muted)" }}>
                        RTO & Registration
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--text)",
                          marginTop: 2,
                        }}
                      >
                        <Money value={Number(vehicle.rtoCharges)} variant="full" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Resale Retention Meter */}
                {valueRetainedPct !== null && (
                  <div
                    style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--t-line)" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--t-muted)",
                        marginBottom: 6,
                      }}
                    >
                      <span>Value Retention</span>
                      <span
                        style={{
                          color:
                            valueRetainedPct > 70
                              ? THEME.sage
                              : valueRetainedPct > 45
                                ? THEME.gold
                                : THEME.rust,
                        }}
                      >
                        {valueRetainedPct}% retained
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: "var(--t-line)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, valueRetainedPct)}%`,
                          background:
                            valueRetainedPct > 70
                              ? THEME.sage
                              : valueRetainedPct > 45
                                ? THEME.gold
                                : THEME.rust,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {vehicle.notes && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--t-muted)",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "var(--surface-1)",
                    border: "1px solid var(--t-line)",
                  }}
                >
                  <FileText size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>{vehicle.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 2: Service & Maintenance */}
          {activeTab === "service" && (
            <div style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                    Service & Maintenance Log
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t-muted)", marginTop: 2 }}>
                    Total spend:{" "}
                    <strong style={{ color: "var(--text)" }}>
                      <Money value={totalServiceCost} variant="full" />
                    </strong>{" "}
                    across {sh.length} visits
                  </div>
                </div>
                <Button variant="accent" size="sm" icon={<Plus size={12} />} onClick={onAddService}>
                  Add Service
                </Button>
              </div>

              {sh.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 16px",
                    borderRadius: 12,
                    border: "1.5px dashed var(--t-line)",
                    background: "var(--surface-1)",
                  }}
                >
                  <Wrench size={28} style={{ color: "var(--t-muted)", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    No Service Records Logged
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--t-muted)",
                      maxWidth: 300,
                      margin: "4px auto 12px",
                    }}
                  >
                    Log routine maintenance, oil replacements, and tyre changes to track exact cost
                    per kilometer.
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={12} />}
                    onClick={onAddService}
                  >
                    Log First Service
                  </Button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sh
                    .slice()
                    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                    .map((rec) => {
                      const st = SERVICE_TYPES[rec.type] || SERVICE_TYPES.other;
                      return (
                        <div
                          key={rec.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            borderRadius: 10,
                            background: "var(--surface-1)",
                            border: "1px solid var(--t-line)",
                            borderLeft: `4px solid ${st.color}`,
                            gap: 12,
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: `color-mix(in srgb, ${st.color} 15%, transparent)`,
                                  color: st.color,
                                }}
                              >
                                {st.label}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                                {rec.description || "General Maintenance"}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                marginTop: 6,
                                fontSize: 12,
                                color: "var(--t-muted)",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <Calendar size={12} /> {fmtDate(rec.date)}
                              </span>
                              {rec.odometer > 0 && (
                                <span
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                  <Gauge size={12} /> {Number(rec.odometer).toLocaleString("en-IN")}{" "}
                                  km
                                </span>
                              )}
                              {rec.serviceCenter && (
                                <span
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                  <Building2 size={12} /> {rec.serviceCenter}
                                </span>
                              )}
                            </div>
                            {rec.notes && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--t-muted)",
                                  marginTop: 4,
                                  fontStyle: "italic",
                                }}
                              >
                                {rec.notes}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--t-rust)" }}>
                              <Money value={Number(rec.cost || 0)} variant="full" />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                marginTop: 6,
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => onEditService(rec)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--t-muted)",
                                  cursor: "pointer",
                                  padding: 4,
                                }}
                                title="Edit"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteService(rec.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--t-rust)",
                                  cursor: "pointer",
                                  padding: 4,
                                }}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Insurance & Policies */}
          {activeTab === "insurance" && (
            <div style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                    Insurance Policies & Renewals
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t-muted)", marginTop: 2 }}>
                    Total premium paid:{" "}
                    <strong style={{ color: "var(--text)" }}>
                      <Money value={totalInsurancePremium} variant="full" />
                    </strong>
                  </div>
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  icon={<Plus size={12} />}
                  onClick={onAddInsurance}
                >
                  Add Policy
                </Button>
              </div>

              {ih.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 16px",
                    borderRadius: 12,
                    border: "1.5px dashed var(--t-line)",
                    background: "var(--surface-1)",
                  }}
                >
                  <Shield size={28} style={{ color: "var(--t-muted)", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    No Insurance Policies Logged
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--t-muted)",
                      maxWidth: 300,
                      margin: "4px auto 12px",
                    }}
                  >
                    Keep track of your comprehensive, own-damage, and third-party policies with
                    renewal alerts.
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={12} />}
                    onClick={onAddInsurance}
                  >
                    Log First Policy
                  </Button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ih
                    .slice()
                    .sort((a, b) => (b.toDate || "").localeCompare(a.toDate || ""))
                    .map((rec) => {
                      const pt =
                        INSURANCE_POLICY_TYPES[rec.policyType] ||
                        INSURANCE_POLICY_TYPES.comprehensive;
                      const stat = complianceStatus(rec.toDate);
                      return (
                        <div
                          key={rec.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            borderRadius: 10,
                            background: "var(--surface-1)",
                            border: "1px solid var(--t-line)",
                            borderLeft: `4px solid ${pt.color}`,
                            gap: 12,
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: `color-mix(in srgb, ${pt.color} 15%, transparent)`,
                                  color: pt.color,
                                }}
                              >
                                {pt.label}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                                {rec.insurer || "Insurance Policy"}
                              </span>
                              {stat && <StatusTag status={stat} tag="Cover" />}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                marginTop: 6,
                                fontSize: 12,
                                color: "var(--t-muted)",
                                flexWrap: "wrap",
                              }}
                            >
                              <span>
                                Validity: {fmtDate(rec.fromDate)} → {fmtDate(rec.toDate)}
                              </span>
                              {rec.policyNumber && (
                                <span style={{ fontFamily: "monospace" }}>#{rec.policyNumber}</span>
                              )}
                            </div>
                            {rec.notes && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--t-muted)",
                                  marginTop: 4,
                                  fontStyle: "italic",
                                }}
                              >
                                {rec.notes}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--t-rust)" }}>
                              <Money value={Number(rec.totalPremium || 0)} variant="full" />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                marginTop: 6,
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => onEditInsurance(rec)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--t-muted)",
                                  cursor: "pointer",
                                  padding: 4,
                                }}
                                title="Edit"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteInsurance(rec.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--t-rust)",
                                  cursor: "pointer",
                                  padding: 4,
                                }}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 4: Document Vault */}
          {activeTab === "documents" && (
            <div style={{ padding: 20 }}>
              <div
                style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 14 }}
              >
                Vehicle Document Vault
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                {[
                  {
                    title: "Registration Certificate (RC)",
                    url: vehicle.rcDocumentUrl,
                    icon: Hash,
                    color: THEME.accent,
                    desc: "Smart card / Digital copy of vehicle registration",
                  },
                  {
                    title: "Insurance Policy Schedule",
                    url: vehicle.insurancePolicyUrl,
                    icon: Shield,
                    color: THEME.sage,
                    desc: "Comprehensive active policy document",
                  },
                  {
                    title: "Pollution Under Control (PUC)",
                    url: vehicle.pucCertificateUrl,
                    icon: Activity,
                    color: THEME.cyan,
                    desc: "Emission testing certificate",
                  },
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: "var(--surface-1)",
                      border: "1px solid var(--t-line)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: doc.color,
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        <doc.icon size={16} />
                        {doc.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--t-muted)",
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}
                      >
                        {doc.desc}
                      </div>
                    </div>
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: `color-mix(in srgb, ${doc.color} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${doc.color} 25%, transparent)`,
                          color: doc.color,
                          textDecoration: "none",
                        }}
                      >
                        <Eye size={13} /> View Document <ArrowUpRight size={13} />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={onEdit}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px dashed var(--t-line)",
                          background: "transparent",
                          color: "var(--t-muted)",
                          cursor: "pointer",
                        }}
                      >
                        + Attach Link via Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Tab 5: Ownership Economics & TCO */}
          {activeTab === "economics" && (
            <div style={{ padding: 20 }}>
              <div
                style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 14 }}
              >
                Total Cost of Ownership (TCO) & Unit Economics
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "var(--surface-1)",
                    border: "1px solid var(--t-line)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--t-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Total Real Cost (TCO)
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: "var(--t-accent)",
                      marginTop: 4,
                    }}
                  >
                    <Money value={tco} variant="full" />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t-muted)", marginTop: 2 }}>
                    Depreciation + Service + Insurance
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "var(--surface-1)",
                    border: "1px solid var(--t-line)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--t-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Distance Driven
                  </div>
                  <div
                    style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginTop: 4 }}
                  >
                    {latestOdo ? `${latestOdo.toLocaleString("en-IN")} km` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t-muted)", marginTop: 2 }}>
                    Tracked from odometer logs
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "var(--surface-1)",
                    border: "1px solid var(--t-line)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--t-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Cost Per Kilometer
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: costPerKm ? "var(--t-accent)" : "var(--t-muted)",
                      marginTop: 4,
                    }}
                  >
                    {costPerKm ? `₹${costPerKm.toFixed(2)} / km` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t-muted)", marginTop: 2 }}>
                    All-inclusive running cost
                  </div>
                </div>
              </div>

              {/* Annual Service Spend & Odometer Growth Charts */}
              {sh.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 16,
                  }}
                >
                  {spendByYear.length > 0 && (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "var(--surface-1)",
                        border: "1px solid var(--t-line)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text)",
                          marginBottom: 12,
                        }}
                      >
                        Annual Maintenance Spend
                      </div>
                      <div style={{ height: 140 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={spendByYear}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                          >
                            <XAxis
                              dataKey="year"
                              stroke="var(--t-muted)"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              stroke="var(--t-muted)"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => (privacyMode ? "••••" : `₹${v}`)}
                            />
                            <Tooltip
                              formatter={(v: any) => [<Money value={v} variant="full" />, "Spend"]}
                            />
                            <Bar dataKey="amount" fill={THEME.accent} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {odoTrend.length > 0 && (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "var(--surface-1)",
                        border: "1px solid var(--t-line)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text)",
                          marginBottom: 12,
                        }}
                      >
                        Odometer Progression
                      </div>
                      <div style={{ height: 140 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={odoTrend}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                          >
                            <XAxis
                              dataKey="displayDate"
                              stroke="var(--t-muted)"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              stroke="var(--t-muted)"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => `${v} km`}
                            />
                            <Tooltip
                              formatter={(v: any) => [
                                `${v.toLocaleString("en-IN")} km`,
                                "Odometer",
                              ]}
                            />
                            <Area
                              type="monotone"
                              dataKey="odometer"
                              stroke={THEME.sage}
                              fill={`color-mix(in srgb, ${THEME.sage} 20%, transparent)`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Fuel, Mileage & Resale Cost Simulator
// ─────────────────────────────────────────────────────────────────────────────

function VehicleCalculatorSimulator({ vehicles }: { vehicles: any[] }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || "");
  const [monthlyKm, setMonthlyKm] = useState<number>(800);
  const [fuelMileage, setFuelMileage] = useState<number>(16);
  const [fuelPrice, setFuelPrice] = useState<number>(102);
  const [annualMaintenanceEst, setAnnualMaintenanceEst] = useState<number>(12000);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  useEffect(() => {
    if (selectedVehicle) {
      if (selectedVehicle.vehicleType === "two-wheeler") {
        setFuelMileage(45);
        setAnnualMaintenanceEst(4000);
      } else {
        setFuelMileage(
          selectedVehicle.fuelType === "diesel"
            ? 18
            : selectedVehicle.fuelType === "electric"
              ? 7
              : 14
        );
        setAnnualMaintenanceEst(14000);
      }
    }
  }, [selectedVehicleId, selectedVehicle]);

  const isEV = selectedVehicle?.fuelType === "electric";
  const monthlyFuelCost = isEV
    ? (monthlyKm / (fuelMileage || 6)) * 8 // ~₹8 per unit kWh
    : (monthlyKm / (fuelMileage || 15)) * (fuelPrice || 100);

  const annualFuelCost = monthlyFuelCost * 12;
  const totalAnnualRunningCost = annualFuelCost + Number(annualMaintenanceEst || 0);
  const runningCostPerKm = monthlyKm > 0 ? totalAnnualRunningCost / (monthlyKm * 12) : 0;

  return (
    <Card
      variant="base"
      style={{ padding: 24, borderRadius: 16, marginBottom: 24, background: "var(--surface-0)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: THEME.accent,
          }}
        >
          <Calculator size={18} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>
            Interactive Ownership Cost & Mileage Simulator
          </div>
          <div style={{ fontSize: 12, color: "var(--t-muted)" }}>
            Simulate monthly fuel expenditure, maintenance forecasts, and true operational cost per
            km.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Field label="Select Vehicle">
          <select
            style={inp}
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} ({v.registrationNumber || v.year})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Estimated Monthly Running (KM)">
          <input
            style={inp}
            type="number"
            value={monthlyKm}
            onChange={(e) => setMonthlyKm(Number(e.target.value) || 0)}
            min={100}
            step={50}
          />
        </Field>

        <Field label={isEV ? "Efficiency (KM per kWh)" : "Fuel Economy (KM / Litre)"}>
          <input
            style={inp}
            type="number"
            value={fuelMileage}
            onChange={(e) => setFuelMileage(Number(e.target.value) || 1)}
            min={1}
          />
        </Field>

        {!isEV && (
          <Field label="Fuel Price per Litre (₹)">
            <input
              style={inp}
              type="number"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(Number(e.target.value) || 0)}
            />
          </Field>
        )}

        <Field label="Est. Annual Maintenance (₹)">
          <input
            style={inp}
            type="number"
            value={annualMaintenanceEst}
            onChange={(e) => setAnnualMaintenanceEst(Number(e.target.value) || 0)}
          />
        </Field>
      </div>

      {/* Projection Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "var(--surface-1)",
            border: "1px solid var(--t-line)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--t-muted)",
              textTransform: "uppercase",
            }}
          >
            Monthly Fuel Cost
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--t-accent)", marginTop: 4 }}>
            <Money value={monthlyFuelCost} variant="full" />
          </div>
          <div style={{ fontSize: 10, color: "var(--t-muted)", marginTop: 2 }}>
            Based on {monthlyKm} km/mo
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "var(--surface-1)",
            border: "1px solid var(--t-line)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--t-muted)",
              textTransform: "uppercase",
            }}
          >
            Annual Running Cost
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginTop: 4 }}>
            <Money value={totalAnnualRunningCost} variant="full" />
          </div>
          <div style={{ fontSize: 10, color: "var(--t-muted)", marginTop: 2 }}>
            Fuel + Annual Servicing
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "var(--surface-1)",
            border: "1px solid var(--t-line)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--t-muted)",
              textTransform: "uppercase",
            }}
          >
            True Running Cost
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: THEME.sage, marginTop: 4 }}>
            ₹{runningCostPerKm.toFixed(2)} / km
          </div>
          <div style={{ fontSize: 10, color: "var(--t-muted)", marginTop: 2 }}>
            Total operational burn rate
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main VehiclesTab Component
// ─────────────────────────────────────────────────────────────────────────────

const URGENCY_RANK: Record<string, number> = { alert: 0, warn: 1, ok: 2 };

function vehicleUrgencyRank(v: any): number {
  const statuses = [
    complianceStatus(v.insuranceExpiry),
    complianceStatus(v.pucExpiry),
    serviceDueStatus(v.nextServiceDueDate, Number(v.nextServiceDueOdometer || 0), getLatestOdo(v)),
  ].filter(Boolean) as { icon: "ok" | "warn" | "alert" }[];
  if (!statuses.length) return 3;
  return Math.min(...statuses.map((s) => URGENCY_RANK[s.icon]));
}

export function VehiclesTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const { familyProfiles } = useMasterData();
  const vehicles: any[] = state.vehicles || [];

  const [viewMode, setViewMode] = useState<
    "garage" | "matrix" | "service" | "analytics" | "simulator"
  >("garage");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState<"all" | "attention" | "valid">("all");
  const [sortBy, setSortBy] = useState<"value" | "urgency" | "mileage" | "name">("value");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCardTab, setActiveCardTab] = useState<Record<string, string>>({});

  const [vehicleModal, setVehicleModal] = useState<{ open: boolean; existing?: any }>({
    open: false,
  });
  const [serviceModal, setServiceModal] = useState<{
    open: boolean;
    vehicleId?: string;
    existing?: any;
  }>({ open: false });
  const [insuranceModal, setInsuranceModal] = useState<{
    open: boolean;
    vehicleId?: string;
    existing?: any;
  }>({ open: false });
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Aggregated fleet metrics
  const totalFleetValue = useMemo(
    () => vehicles.reduce((s, v) => s + Number(v.currentValue || v.purchasePrice || 0), 0),
    [vehicles]
  );
  const animatedFleetValue = useAnimatedNumber(totalFleetValue);

  const totalAcquisitionPrice = useMemo(
    () => vehicles.reduce((s, v) => s + Number(v.purchasePrice || 0), 0),
    [vehicles]
  );

  const totalDepreciation = Math.max(0, totalAcquisitionPrice - totalFleetValue);

  const totalServiceSpend = useMemo(
    () =>
      vehicles.reduce(
        (s, v) =>
          s +
          (v.serviceHistory || []).reduce((acc: number, r: any) => acc + Number(r.cost || 0), 0),
        0
      ),
    [vehicles]
  );

  const totalDistance = useMemo(
    () => vehicles.reduce((s, v) => s + getLatestOdo(v), 0),
    [vehicles]
  );

  // Compliance alerts list
  const complianceAlerts = useMemo(() => {
    const list: { vehicle: any; type: string; status: any }[] = [];
    vehicles.forEach((v) => {
      const ins = complianceStatus(v.insuranceExpiry);
      if (ins && ins.icon !== "ok") list.push({ vehicle: v, type: "Insurance", status: ins });
      const puc = complianceStatus(v.pucExpiry);
      if (puc && puc.icon !== "ok") list.push({ vehicle: v, type: "PUC", status: puc });
      const svc = serviceDueStatus(
        v.nextServiceDueDate,
        Number(v.nextServiceDueOdometer || 0),
        getLatestOdo(v)
      );
      if (svc && svc.icon !== "ok") list.push({ vehicle: v, type: "Service", status: svc });
    });
    return list;
  }, [vehicles]);

  // Filtering & Sorting
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        if (typeFilter !== "all" && v.vehicleType !== typeFilter) return false;
        if (ownerFilter !== "all" && v.owner !== ownerFilter) return false;
        if (complianceFilter === "attention") {
          const rank = vehicleUrgencyRank(v);
          if (rank > 1) return false;
        } else if (complianceFilter === "valid") {
          const rank = vehicleUrgencyRank(v);
          if (rank < 2) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchMake = (v.make || "").toLowerCase().includes(q);
          const matchModel = (v.model || "").toLowerCase().includes(q);
          const matchReg = (v.registrationNumber || "").toLowerCase().includes(q);
          const matchVin = (v.chassisNumber || "").toLowerCase().includes(q);
          const matchNotes = (v.notes || "").toLowerCase().includes(q);
          if (!matchMake && !matchModel && !matchReg && !matchVin && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "value") {
          return (
            Number(b.currentValue || b.purchasePrice || 0) -
            Number(a.currentValue || a.purchasePrice || 0)
          );
        }
        if (sortBy === "urgency") {
          return vehicleUrgencyRank(a) - vehicleUrgencyRank(b);
        }
        if (sortBy === "mileage") {
          return getLatestOdo(b) - getLatestOdo(a);
        }
        if (sortBy === "name") {
          return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
        }
        return 0;
      });
  }, [vehicles, typeFilter, ownerFilter, complianceFilter, searchQuery, sortBy]);

  // Global consolidated service logs for Maintenance Center view
  const allServiceRecords = useMemo(() => {
    const list: any[] = [];
    vehicles.forEach((v) => {
      (v.serviceHistory || []).forEach((rec: any) => {
        list.push({
          ...rec,
          vehicleId: v.id,
          vehicleName: `${v.make} ${v.model}`,
          vehicleReg: v.registrationNumber,
        });
      });
    });
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [vehicles]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!vehicles.length) return;
    const headers = [
      "Make",
      "Model",
      "Year",
      "Type",
      "Fuel",
      "Registration Number",
      "Owner",
      "Purchase Date",
      "Purchase Price (₹)",
      "Current Value (₹)",
      "Odometer (KM)",
      "Insurance Expiry",
      "PUC Expiry",
      "Next Service Due",
    ];
    const rows = vehicles.map((v) => [
      v.make,
      v.model,
      v.year,
      v.vehicleType,
      v.fuelType,
      v.registrationNumber,
      v.owner || "self",
      v.purchaseDate || "",
      v.purchasePrice || 0,
      v.currentValue || 0,
      getLatestOdo(v),
      v.insuranceExpiry || "",
      v.pucExpiry || "",
      v.nextServiceDueDate || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fleet_garage_report_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.("Fleet details exported to CSV", "success");
  };

  // Handlers for CRUD
  const { run: handleSaveVehicle, loading: savingVehicle } = useAsyncAction(
    async (data: any) => {
      if (vehicleModal.existing) {
        await updateItem("vehicles", vehicleModal.existing.id, data);
        showToast?.("Vehicle updated successfully", "success");
      } else {
        await addItem("vehicles", data);
        showToast?.("Vehicle added to garage", "success");
      }
    },
    { onSuccess: () => setVehicleModal({ open: false }) }
  );

  const { run: handleDeleteVehicle } = useAsyncAction(async (id: string) => {
    await removeItem("vehicles", id);
    if (expandedId === id) setExpandedId(null);
    showToast?.("Vehicle removed from garage", "success");
  });

  const { run: handleSaveService, loading: savingService } = useAsyncAction(
    async ({ rec, nextServiceDueDate, nextServiceDueOdometer }: any) => {
      const vehicle = vehicles.find((v) => v.id === serviceModal.vehicleId);
      if (!vehicle) return;
      const oldHistory: any[] = vehicle.serviceHistory || [];
      const newHistory = serviceModal.existing
        ? oldHistory.map((r) => (r.id === rec.id ? rec : r))
        : [...oldHistory, rec];
      const updates: any = { ...vehicle, serviceHistory: newHistory };
      if (nextServiceDueDate) updates.nextServiceDueDate = nextServiceDueDate;
      if (nextServiceDueOdometer) updates.nextServiceDueOdometer = nextServiceDueOdometer;
      await updateItem("vehicles", vehicle.id, updates);
      showToast?.("Service record saved", "success");
    },
    { onSuccess: () => setServiceModal({ open: false }) }
  );

  const { run: handleDeleteService } = useAsyncAction(
    async (vehicleId: string, serviceId: string) => {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (!vehicle) return;
      await updateItem("vehicles", vehicle.id, {
        ...vehicle,
        serviceHistory: (vehicle.serviceHistory || []).filter((r: any) => r.id !== serviceId),
      });
      showToast?.("Service record removed", "success");
    }
  );

  const { run: handleSaveInsurance, loading: savingInsurance } = useAsyncAction(
    async (rec: any) => {
      const vehicle = vehicles.find((v) => v.id === insuranceModal.vehicleId);
      if (!vehicle) return;
      const oldHistory: any[] = vehicle.insuranceHistory || [];
      const newHistory = insuranceModal.existing
        ? oldHistory.map((r) => (r.id === rec.id ? rec : r))
        : [...oldHistory, rec];
      const latestExpiry = newHistory.reduce(
        (max: string, r: any) => (r.toDate && r.toDate > max ? r.toDate : max),
        vehicle.insuranceExpiry || ""
      );
      await updateItem("vehicles", vehicle.id, {
        ...vehicle,
        insuranceHistory: newHistory,
        insuranceExpiry: latestExpiry || vehicle.insuranceExpiry,
      });
      showToast?.("Insurance record saved", "success");
    },
    { onSuccess: () => setInsuranceModal({ open: false }) }
  );

  const { run: handleDeleteInsurance } = useAsyncAction(
    async (vehicleId: string, insuranceId: string) => {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (!vehicle) return;
      const remaining = (vehicle.insuranceHistory || []).filter((r: any) => r.id !== insuranceId);
      const latestExpiry = remaining.reduce(
        (max: string, r: any) => (r.toDate && r.toDate > max ? r.toDate : max),
        ""
      );
      await updateItem("vehicles", vehicle.id, {
        ...vehicle,
        insuranceHistory: remaining,
        insuranceExpiry: latestExpiry,
      });
      showToast?.("Insurance record removed", "success");
    }
  );

  return (
    <div className="tab-content-enter" style={{ paddingBottom: 60 }}>
      {/* ── Page Header ── */}
      <SectionTitle
        sub={`${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""} in garage · Ownership tracking, live VAHAN verification, service logs, insurance renewals & TCO analytics`}
        rightElement={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {vehicles.length > 0 && (
              <Button variant="secondary" icon={<Download size={13} />} onClick={handleExportCSV}>
                Export CSV
              </Button>
            )}
            <Button
              variant="accent"
              icon={<Plus size={14} />}
              onClick={() => setVehicleModal({ open: true })}
            >
              Add Vehicle
            </Button>
          </div>
        }
      >
        Vehicles & Digital Garage
      </SectionTitle>

      {/* ── Executive Hero Dashboard ── */}
      {vehicles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {/* Main Fleet Value Glassmorphic Card */}
          <Card
            variant="base"
            style={{
              marginBottom: 16,
              padding: "clamp(20px, 3.5vw, 32px)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 90%, var(--t-accent) 10%) 0%, var(--surface-0) 100%)",
              border: "1px solid var(--t-line)",
              borderTop: "4px solid var(--t-accent)",
              borderRadius: "var(--radius-xl, 18px)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              boxShadow: "var(--shadow-card, 0 4px 16px rgba(0,0,0,0.06))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--t-muted)",
                }}
              >
                <IndianRupee size={14} color={THEME.accent} /> Fleet Market Valuation
              </div>

              {/* Compliance Shield Badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background:
                    complianceAlerts.length === 0
                      ? `color-mix(in srgb, ${THEME.sage} 15%, transparent)`
                      : `color-mix(in srgb, ${THEME.gold} 15%, transparent)`,
                  color: complianceAlerts.length === 0 ? THEME.sage : THEME.gold,
                  border: `1px solid ${complianceAlerts.length === 0 ? THEME.sage : THEME.gold}`,
                }}
              >
                <Shield size={13} />
                {complianceAlerts.length === 0
                  ? "Fleet 100% Compliant"
                  : `${complianceAlerts.length} Renewal${complianceAlerts.length !== 1 ? "s" : ""} Due`}
              </div>
            </div>

            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(34px, 4.5vw, 52px)",
                fontWeight: 900,
                color: "var(--text)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Money value={animatedFleetValue} variant="full" />
            </div>

            <div style={{ fontSize: 13, color: "var(--t-muted)", marginTop: 4, fontWeight: 600 }}>
              Acquisition Cost: <Money value={totalAcquisitionPrice} variant="full" />
              {totalDepreciation > 0 && (
                <>
                  {" · "}Depreciation:{" "}
                  <span style={{ color: THEME.rust, fontWeight: 700 }}>
                    <Money value={totalDepreciation} variant="full" />
                  </span>
                </>
              )}
              {" · "}Maintenance Spend:{" "}
              <strong style={{ color: "var(--text)" }}>
                <Money value={totalServiceSpend} variant="full" />
              </strong>
            </div>
          </Card>

          {/* 4 KPI Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
            }}
          >
            <StatCard
              label="Fleet Size"
              value={vehicles.length.toString()}
              numericValue={vehicles.length}
              formatValue={(n) => Math.round(n).toString()}
              sub={`${vehicles.filter((v) => v.vehicleType === "two-wheeler").length} Two-Wheeler · ${vehicles.filter((v) => v.vehicleType === "four-wheeler").length} Four-Wheeler`}
              icon={<Car />}
              color={THEME.accent}
            />
            <StatCard
              label="Compliance Guard"
              value={
                complianceAlerts.length === 0 ? "All Active" : `${complianceAlerts.length} Due`
              }
              sub={
                complianceAlerts.length === 0
                  ? "Insurance & PUC up to date"
                  : "Needs immediate renewal"
              }
              icon={<Shield />}
              color={complianceAlerts.length === 0 ? THEME.sage : THEME.gold}
            />
            <StatCard
              label="Maintenance Spend"
              value={fmtINRFull(totalServiceSpend)}
              numericValue={totalServiceSpend}
              formatValue={fmtINRFull}
              sub={`Avg ₹${Math.round(totalServiceSpend / (vehicles.length || 1)).toLocaleString("en-IN")} / vehicle`}
              icon={<Wrench />}
              color={THEME.gold}
            />
            <StatCard
              label="Total Distance Run"
              value={totalDistance ? `${totalDistance.toLocaleString("en-IN")} km` : "—"}
              sub="Across all logged odometers"
              icon={<Milestone />}
              color={THEME.cyan}
            />
          </div>
        </div>
      )}

      {/* ── Compliance Alert Banner ── */}
      {complianceAlerts.length > 0 && (
        <div
          style={{
            background: "color-mix(in srgb, var(--t-gold) 10%, var(--surface-0))",
            border: "1px solid color-mix(in srgb, var(--t-gold) 35%, transparent)",
            borderLeft: `4px solid ${THEME.gold}`,
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 800,
              color: THEME.gold,
            }}
          >
            <AlertTriangle size={16} /> Urgent Fleet Compliance & Renewal Alerts:
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {complianceAlerts.map((a, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "var(--surface-0)",
                  border: "1px solid var(--t-line)",
                  color: a.status?.color || "var(--text)",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <strong>
                  {a.vehicle.make} {a.vehicle.model}:
                </strong>{" "}
                {a.type} {a.status?.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Navigation & Control Hub ── */}
      {vehicles.length > 0 && (
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* View Modes Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 6,
                background: "var(--surface-1, var(--surface))",
                padding: 4,
                borderRadius: 10,
                border: "1px solid var(--t-line)",
              }}
            >
              {[
                { id: "garage", label: "Garage Showcase", icon: Car },
                { id: "matrix", label: "Fleet Matrix", icon: Table },
                { id: "service", label: "Service Center", icon: Wrench },
                { id: "analytics", label: "TCO & Analytics", icon: BarChart3 },
                { id: "simulator", label: "Mileage & Cost Simulator", icon: Calculator },
              ].map((mode) => {
                const ModeIcon = mode.icon;
                const active = viewMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setViewMode(mode.id as any)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: active ? 800 : 600,
                      padding: "6px 12px",
                      borderRadius: 7,
                      border: "none",
                      background: active ? "var(--surface-0, #fff)" : "transparent",
                      color: active ? "var(--t-accent)" : "var(--t-muted)",
                      cursor: "pointer",
                      boxShadow: active ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <ModeIcon size={13} />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--t-muted)", fontWeight: 600 }}>
                Sort by:
              </span>
              <select
                style={{ ...inp, width: "auto", padding: "6px 10px", fontSize: 12 }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="value">Highest Resale Value</option>
                <option value="urgency">Compliance Urgency</option>
                <option value="mileage">Highest Odometer (KM)</option>
                <option value="name">Vehicle Name (A–Z)</option>
              </select>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search
                size={14}
                style={{ position: "absolute", left: 10, top: 10, color: "var(--t-muted)" }}
              />
              <input
                style={{ ...inp, paddingLeft: 32 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search make, model, license plate, VIN..."
              />
            </div>

            <select
              style={{ ...inp, width: "auto", minWidth: 140 }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Vehicle Types</option>
              <option value="two-wheeler">Two-Wheelers</option>
              <option value="four-wheeler">Four-Wheelers</option>
              <option value="commercial">Commercial</option>
            </select>

            <select
              style={{ ...inp, width: "auto", minWidth: 140 }}
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            >
              <option value="all">All Family Owners</option>
              {familyProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </select>

            <select
              style={{ ...inp, width: "auto", minWidth: 140 }}
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value as any)}
            >
              <option value="all">All Compliance States</option>
              <option value="attention">Needs Attention (Due Soon)</option>
              <option value="valid">Fully Compliant</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {vehicles.length === 0 && (
        <EmptyState
          icon={Car}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`}
          dotColor={THEME.accent}
          title="Your Garage is Empty"
          description="Track two-wheelers, four-wheelers, and commercial vehicles with live VAHAN registration lookups, insurance renewals, service history, and real Cost-per-KM calculations."
          pills={[
            "Indian HSRP License Plates",
            "VAHAN RC Lookup",
            "Service Logs & TCO",
            "Insurance Policy Archive",
          ]}
          buttonLabel="Add First Vehicle"
          onAdd={() => setVehicleModal({ open: true })}
        />
      )}

      {/* ── View Mode 1: Garage Showcase (Cards) ── */}
      {vehicles.length > 0 && viewMode === "garage" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredVehicles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--t-muted)" }}>
              No vehicles match your search and filter criteria.
            </div>
          ) : (
            filteredVehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                expanded={expandedId === v.id}
                activeTab={activeCardTab[v.id] || "overview"}
                onTabChange={(t: string) => setActiveCardTab((p) => ({ ...p, [v.id]: t }))}
                onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
                onEdit={() => setVehicleModal({ open: true, existing: v })}
                onDelete={() =>
                  setConfirmAction({
                    message: `Delete ${v.make} ${v.model} and all its service/insurance history? This cannot be undone.`,
                    onConfirm: () => handleDeleteVehicle(v.id),
                  })
                }
                onAddService={() => setServiceModal({ open: true, vehicleId: v.id })}
                onEditService={(rec: any) =>
                  setServiceModal({ open: true, vehicleId: v.id, existing: rec })
                }
                onDeleteService={(sid: string) =>
                  setConfirmAction({
                    message: "Delete this service record? This cannot be undone.",
                    onConfirm: () => handleDeleteService(v.id, sid),
                  })
                }
                onAddInsurance={() => setInsuranceModal({ open: true, vehicleId: v.id })}
                onEditInsurance={(rec: any) =>
                  setInsuranceModal({ open: true, vehicleId: v.id, existing: rec })
                }
                onDeleteInsurance={(iid: string) =>
                  setConfirmAction({
                    message: "Delete this insurance record? This cannot be undone.",
                    onConfirm: () => handleDeleteInsurance(v.id, iid),
                  })
                }
              />
            ))
          )}
        </div>
      )}

      {/* ── View Mode 2: Fleet Matrix (Table) ── */}
      {vehicles.length > 0 && viewMode === "matrix" && (
        <Card
          variant="base"
          style={{
            padding: 0,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid var(--t-line)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--surface-1)",
                    borderBottom: "1px solid var(--t-line)",
                    color: "var(--t-muted)",
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Vehicle</th>
                  <th style={{ padding: "12px 16px" }}>License Plate</th>
                  <th style={{ padding: "12px 16px" }}>Type / Fuel</th>
                  <th style={{ padding: "12px 16px" }}>Owner</th>
                  <th style={{ padding: "12px 16px" }}>Odometer</th>
                  <th style={{ padding: "12px 16px" }}>Current Resale</th>
                  <th style={{ padding: "12px 16px" }}>Insurance Expiry</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => {
                  const insStatus = complianceStatus(v.insuranceExpiry);
                  const latestOdo = getLatestOdo(v);
                  return (
                    <tr
                      key={v.id}
                      style={{
                        borderBottom: "1px solid var(--t-line)",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 800, color: "var(--text)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <VehicleMakeLogo make={v.make} size={32} />
                          <div>
                            <div>
                              {v.make} {v.model}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t-muted)" }}>
                              {v.year} • {v.color || "Standard"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <IndianNumberPlate
                          registrationNumber={v.registrationNumber}
                          isElectric={v.fuelType === "electric"}
                          size="sm"
                        />
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--t-muted)" }}>
                        {VEHICLE_TYPES[v.vehicleType] || v.vehicleType} •{" "}
                        {FUEL_TYPES[v.fuelType]?.label || v.fuelType}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12 }}>
                        {familyProfiles.find((p) => p.id === v.owner)?.name || v.owner || "Self"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--text)" }}>
                        {latestOdo ? `${latestOdo.toLocaleString("en-IN")} km` : "—"}
                      </td>
                      <td
                        style={{ padding: "12px 16px", fontWeight: 900, color: "var(--t-accent)" }}
                      >
                        <Money
                          value={Number(v.currentValue || v.purchasePrice || 0)}
                          variant="full"
                        />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {insStatus ? (
                          <StatusTag status={insStatus} tag="Insurance" />
                        ) : (
                          <span style={{ color: "var(--t-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={12} />}
                            onClick={() => setVehicleModal({ open: true, existing: v })}
                          >
                            Edit
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

      {/* ── View Mode 3: Global Service Center ── */}
      {vehicles.length > 0 && viewMode === "service" && (
        <Card
          variant="base"
          style={{ padding: 24, borderRadius: 16, border: "1px solid var(--t-line)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>
                Fleet Maintenance Log
              </div>
              <div style={{ fontSize: 12, color: "var(--t-muted)", marginTop: 2 }}>
                Chronological service log across all vehicles ({allServiceRecords.length} records)
              </div>
            </div>
            <Button
              variant="accent"
              size="sm"
              icon={<Plus size={12} />}
              onClick={() => setServiceModal({ open: true, vehicleId: vehicles[0]?.id })}
            >
              Log Service
            </Button>
          </div>

          {allServiceRecords.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--t-muted)" }}>
              No service records recorded across any vehicles.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allServiceRecords.map((rec) => {
                const st = SERVICE_TYPES[rec.type] || SERVICE_TYPES.other;
                return (
                  <div
                    key={rec.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "var(--surface-1)",
                      border: "1px solid var(--t-line)",
                      borderLeft: `4px solid ${st.color}`,
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text)" }}>
                          {rec.vehicleName}
                        </span>
                        {rec.vehicleReg && (
                          <IndianNumberPlate registrationNumber={rec.vehicleReg} size="sm" />
                        )}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: `color-mix(in srgb, ${st.color} 15%, transparent)`,
                            color: st.color,
                          }}
                        >
                          {st.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text)",
                          marginTop: 4,
                        }}
                      >
                        {rec.description || "Routine Maintenance"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginTop: 6,
                          fontSize: 12,
                          color: "var(--t-muted)",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          <Calendar size={12} style={{ verticalAlign: -1 }} /> {fmtDate(rec.date)}
                        </span>
                        {rec.odometer > 0 && (
                          <span>
                            <Gauge size={12} style={{ verticalAlign: -1 }} />{" "}
                            {Number(rec.odometer).toLocaleString("en-IN")} km
                          </span>
                        )}
                        {rec.serviceCenter && (
                          <span>
                            <Building2 size={12} style={{ verticalAlign: -1 }} />{" "}
                            {rec.serviceCenter}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "var(--t-rust)" }}>
                        <Money value={Number(rec.cost || 0)} variant="full" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── View Mode 4: TCO & Analytics ── */}
      {vehicles.length > 0 && viewMode === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {/* Vehicle Type Distribution */}
            <Card
              variant="base"
              style={{ padding: 20, borderRadius: 14, border: "1px solid var(--t-line)" }}
            >
              <div
                style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 14 }}
              >
                Fleet Asset Value Split by Vehicle
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicles.map((v) => ({
                        name: `${v.make} ${v.model}`,
                        value: Number(v.currentValue || v.purchasePrice || 0),
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name }) => name}
                    >
                      {vehicles.map((v, idx) => (
                        <Cell key={idx} fill={getMakeTheme(v.make).color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [<Money value={val} variant="full" />, "Value"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Total Maintenance vs Acquisition */}
            <Card
              variant="base"
              style={{ padding: 20, borderRadius: 14, border: "1px solid var(--t-line)" }}
            >
              <div
                style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 14 }}
              >
                Financial Overview: Purchase vs Resale vs Maintenance
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "var(--t-muted)",
                      marginBottom: 4,
                    }}
                  >
                    <span>Total Purchase Price</span>
                    <strong style={{ color: "var(--text)" }}>
                      <Money value={totalAcquisitionPrice} variant="full" />
                    </strong>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: "var(--surface-1)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ width: "100%", height: "100%", background: THEME.accent }} />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "var(--t-muted)",
                      marginBottom: 4,
                    }}
                  >
                    <span>Current Fleet Resale Estimate</span>
                    <strong style={{ color: "var(--t-accent)" }}>
                      <Money value={totalFleetValue} variant="full" />
                    </strong>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: "var(--surface-1)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, totalAcquisitionPrice ? (totalFleetValue / totalAcquisitionPrice) * 100 : 100)}%`,
                        height: "100%",
                        background: THEME.sage,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "var(--t-muted)",
                      marginBottom: 4,
                    }}
                  >
                    <span>Cumulative Service & Maintenance Spend</span>
                    <strong style={{ color: THEME.rust }}>
                      <Money value={totalServiceSpend} variant="full" />
                    </strong>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: "var(--surface-1)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, totalAcquisitionPrice ? (totalServiceSpend / totalAcquisitionPrice) * 100 : 20)}%`,
                        height: "100%",
                        background: THEME.gold,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── View Mode 5: Mileage & Cost Simulator ── */}
      {vehicles.length > 0 && viewMode === "simulator" && (
        <VehicleCalculatorSimulator vehicles={vehicles} />
      )}

      {/* ── Modals ── */}
      {vehicleModal.open && (
        <VehicleModal
          existing={vehicleModal.existing}
          onClose={() => setVehicleModal({ open: false })}
          onSave={handleSaveVehicle}
          saving={savingVehicle}
        />
      )}

      {serviceModal.open && (
        <ServiceModal
          existing={serviceModal.existing}
          vehicleName={(() => {
            const v = vehicles.find((veh) => veh.id === serviceModal.vehicleId);
            return v ? `${v.make} ${v.model} (${v.registrationNumber || v.year})` : "";
          })()}
          currentReminder={(() => {
            const v = vehicles.find((veh) => veh.id === serviceModal.vehicleId);
            return v ? { date: v.nextServiceDueDate, odometer: v.nextServiceDueOdometer } : null;
          })()}
          onClose={() => setServiceModal({ open: false })}
          onSave={handleSaveService}
          saving={savingService}
        />
      )}

      {insuranceModal.open && (
        <InsuranceModal
          existing={insuranceModal.existing}
          vehicleName={(() => {
            const v = vehicles.find((veh) => veh.id === insuranceModal.vehicleId);
            return v ? `${v.make} ${v.model} (${v.registrationNumber || v.year})` : "";
          })()}
          onClose={() => setInsuranceModal({ open: false })}
          onSave={handleSaveInsurance}
          saving={savingInsurance}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
