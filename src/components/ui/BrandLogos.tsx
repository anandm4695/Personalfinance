/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect } from "react";
import { THEME } from "../../utils/constants";

export interface BrandInfo {
  domain: string;
  name: string;
  color?: string;
  localSvg?: string;
}

// Comprehensive canonical registry of Indian and Global financial brands,
// ensuring the EXACT same logo and identity appears across Banks, Transactions,
// Credit Cards, Loans, Investments (FDs, Bonds, NPS, PPF, EPFO), Demat Brokers,
// Mutual Funds, Insurance, and Subscriptions.
export const CANONICAL_BRANDS: Record<string, BrandInfo> = {
  // ── Public & Private Sector Banks ─────────────────────────────────────────
  "state bank of india": { domain: "sbi.co.in", name: "State Bank of India", color: "#1a3b8b" },
  "punjab national bank": { domain: "pnbindia.in", name: "Punjab National Bank", color: "#a20f26" },
  "standard chartered": { domain: "sc.com", name: "Standard Chartered", color: "#007934" },
  "bank of baroda": { domain: "bankofbaroda.in", name: "Bank of Baroda", color: "#f26522" },
  "bank of india": { domain: "bankofindia.co.in", name: "Bank of India", color: "#00529b" },
  "central bank of india": { domain: "centralbankofindia.co.in", name: "Central Bank of India", color: "#1e3a8a" },
  "indian overseas bank": { domain: "iob.in", name: "Indian Overseas Bank", color: "#003b70" },
  "punjab & sind": { domain: "punjabandsindbank.co.in", name: "Punjab & Sind Bank", color: "#d97706" },
  "punjab and sind": { domain: "punjabandsindbank.co.in", name: "Punjab & Sind Bank", color: "#d97706" },
  "south indian bank": { domain: "southindianbank.com", name: "South Indian Bank", color: "#b91c1c" },
  "city union bank": { domain: "cityunionbank.com", name: "City Union Bank", color: "#0284c7" },
  "jammu & kashmir": { domain: "jkbank.com", name: "J&K Bank", color: "#0f766e" },
  "karnataka bank": { domain: "karnatakabank.com", name: "Karnataka Bank", color: "#9a3412" },
  "dhanlaxmi bank": { domain: "dhanbank.com", name: "Dhanlaxmi Bank", color: "#7c2d12" },
  "saraswat bank": { domain: "saraswatbank.com", name: "Saraswat Bank", color: "#b45309" },
  "cosmos bank": { domain: "cosmosbank.com", name: "Cosmos Bank", color: "#1d4ed8" },
  "idfc first bank": { domain: "idfcfirstbank.com", name: "IDFC FIRST Bank", color: "#9e1b32" },
  "idfc first": { domain: "idfcfirstbank.com", name: "IDFC FIRST Bank", color: "#9e1b32" },
  "idfc bank": { domain: "idfcfirstbank.com", name: "IDFC FIRST Bank", color: "#9e1b32" },
  "au small finance": { domain: "aubank.in", name: "AU Small Finance Bank", color: "#4b286d" },
  "equitas small finance": { domain: "equitasbank.com", name: "Equitas Small Finance Bank", color: "#006699" },
  "state bank": { domain: "sbi.co.in", name: "State Bank of India", color: "#1a3b8b" },
  "sbi bank": { domain: "sbi.co.in", name: "State Bank of India", color: "#1a3b8b" },
  "punjab national": { domain: "pnbindia.in", name: "Punjab National Bank", color: "#a20f26" },
  "union bank": { domain: "unionbankofindia.co.in", name: "Union Bank of India", color: "#e31e24" },
  "central bank": { domain: "centralbankofindia.co.in", name: "Central Bank of India", color: "#1e3a8a" },
  "indian bank": { domain: "indianbank.in", name: "Indian Bank", color: "#00529b" },
  "karur vysya": { domain: "kvb.co.in", name: "Karur Vysya Bank", color: "#0284c7" },
  "canara bank": { domain: "canarabank.com", name: "Canara Bank", color: "#0090d0" },
  "federal bank": { domain: "federalbank.co.in", name: "Federal Bank", color: "#004182" },
  "bandhan bank": { domain: "bandhanbank.com", name: "Bandhan Bank", color: "#004b87" },
  "rbl bank": { domain: "rblbank.com", name: "RBL Bank", color: "#0c2340" },
  "kotak mahindra": { domain: "kotak.com", name: "Kotak Mahindra Bank", color: "#ed1c24" },
  "indusind bank": { domain: "indusind.com", name: "IndusInd Bank", color: "#84191d" },
  "yes bank": { domain: "yesbank.in", name: "YES Bank", color: "#003a70" },
  "post office": { domain: "ippbonline.com", name: "India Post", color: "#d8232a" },
  "india post": { domain: "ippbonline.com", name: "India Post", color: "#d8232a" },
  "paytm payments": { domain: "paytm.com", name: "Paytm Payments Bank", color: "#00baf2" },
  "airtel payments": { domain: "airtel.in", name: "Airtel Payments Bank", color: "#e40000" },
  indusind: { domain: "indusind.com", name: "IndusInd Bank", color: "#84191d" },
  indusland: { domain: "indusind.com", name: "IndusInd Bank", color: "#84191d" },
  canara: { domain: "canarabank.com", name: "Canara Bank", color: "#0090d0" },
  federal: { domain: "federalbank.co.in", name: "Federal Bank", color: "#004182" },
  equitas: { domain: "equitasbank.com", name: "Equitas Small Finance Bank", color: "#006699" },
  bandhan: { domain: "bandhanbank.com", name: "Bandhan Bank", color: "#004b87" },
  jupiter: { domain: "jupiter.money", name: "Jupiter Money", color: "#ff5247" },
  onecard: { domain: "getonecard.com", name: "OneCard", color: "#1c1c1c" },
  slice: { domain: "sliceit.com", name: "Slice", color: "#8338ec" },
  airtel: { domain: "airtel.in", name: "Airtel", color: "#e40000" },
  paytm: { domain: "paytm.com", name: "Paytm", color: "#00baf2" },
  amazon: { domain: "amazon.in", name: "Amazon", color: "#ff9900" },
  sodexo: { domain: "sodexo.com", name: "Sodexo", color: "#ed1c24" },
  niyo: { domain: "goniyo.com", name: "Niyo", color: "#00d09c" },
  omnicard: { domain: "omnicard.in", name: "OmniCard", color: "#0f172a" },
  phonepe: { domain: "phonepe.com", name: "PhonePe", color: "#5f259f" },
  mobikwik: { domain: "mobikwik.com", name: "MobiKwik", color: "#0070ba" },
  cred: { domain: "cred.club", name: "CRED", color: "#1c1c1c" },
  hdfc: { domain: "hdfcbank.com", name: "HDFC Bank", color: "#004c8f" },
  icici: { domain: "icicibank.com", name: "ICICI Bank", color: "#b02a30" },
  axis: { domain: "axisbank.com", name: "Axis Bank", color: "#97144d" },
  kotak: { domain: "kotak.com", name: "Kotak Mahindra", color: "#ed1c24" },
  idbi: { domain: "idbibank.in", name: "IDBI Bank", color: "#005a3c" },
  idfc: { domain: "idfcfirstbank.com", name: "IDFC FIRST", color: "#9e1b32" },
  rbl: { domain: "rblbank.com", name: "RBL Bank", color: "#0c2340" },
  citi: { domain: "citi.com", name: "Citi", color: "#003b70" },
  hsbc: { domain: "hsbc.com", name: "HSBC", color: "#db0011" },
  dbs: { domain: "dbs.com", name: "DBS Bank", color: "#e61e28" },
  pnb: { domain: "pnbindia.in", name: "PNB", color: "#a20f26" },
  bob: { domain: "bankofbaroda.in", name: "Bank of Baroda", color: "#f26522" },
  boi: { domain: "bankofindia.co.in", name: "Bank of India", color: "#00529b" },
  iob: { domain: "iob.in", name: "Indian Overseas Bank", color: "#003b70" },
  uco: { domain: "ucobank.com", name: "UCO Bank", color: "#00529b" },
  kvb: { domain: "kvb.co.in", name: "Karur Vysya Bank", color: "#0284c7" },
  sib: { domain: "southindianbank.com", name: "South Indian Bank", color: "#b91c1c" },
  cub: { domain: "cityunionbank.com", name: "City Union Bank", color: "#0284c7" },
  jkb: { domain: "jkbank.com", name: "J&K Bank", color: "#0f766e" },
  ippb: { domain: "ippbonline.com", name: "India Post Payments Bank", color: "#d8232a" },
  epfo: { domain: "epfindia.gov.in", name: "EPFO", color: "#005b94" },
  sbi: { domain: "sbi.co.in", name: "State Bank of India", color: "#1a3b8b" },
  au: { domain: "aubank.in", name: "AU Bank", color: "#4b286d" },
  fi: { domain: "fi.money", name: "Fi Money", color: "#00d09c" },
  sc: { domain: "sc.com", name: "Standard Chartered", color: "#007934" },

  // ── Insurance Companies ───────────────────────────────────────────────────
  lic: { domain: "licindia.in", localSvg: "/lic-logo.svg", name: "Life Insurance Corporation", color: "#1d4e9e" },
  "life insurance": { domain: "licindia.in", localSvg: "/lic-logo.svg", name: "LIC", color: "#1d4e9e" },
  "star health": { domain: "starhealth.in", name: "Star Health", color: "#183884" },
  "care health": { domain: "careinsurance.com", name: "Care Health", color: "#00838f" },
  "care insurance": { domain: "careinsurance.com", name: "Care Health", color: "#00838f" },
  "niva bupa": { domain: "nivabupa.com", name: "Niva Bupa", color: "#ea5d0b" },
  "max bupa": { domain: "nivabupa.com", name: "Niva Bupa", color: "#ea5d0b" },
  "hdfc ergo": { domain: "hdfcergo.com", name: "HDFC ERGO", color: "#004c8f" },
  "hdfc life": { domain: "hdfclife.com", name: "HDFC Life", color: "#004c8f" },
  "icici lombard": { domain: "icicilombard.com", name: "ICICI Lombard", color: "#b02a30" },
  "icici prudential": { domain: "iciciprulife.com", name: "ICICI Prudential", color: "#b02a30" },
  "icici pru": { domain: "iciciprulife.com", name: "ICICI Prudential", color: "#b02a30" },
  "sbi life": { domain: "sbilife.co.in", name: "SBI Life", color: "#1a3b8b" },
  "sbi general": { domain: "sbigeneral.in", name: "SBI General", color: "#1a3b8b" },
  "tata aig": { domain: "tataaig.com", name: "Tata AIG", color: "#1d4ed8" },
  "tata aia": { domain: "tataaia.com", name: "Tata AIA", color: "#1d4ed8" },
  "bajaj allianz": { domain: "bajajallianz.com", name: "Bajaj Allianz", color: "#005a9c" },
  "new india assurance": { domain: "newindia.co.in", name: "New India Assurance", color: "#1e3a8a" },
  "oriental insurance": { domain: "orientalinsurance.org.in", name: "Oriental Insurance", color: "#006699" },
  "united india": { domain: "uiic.co.in", name: "United India Insurance", color: "#b45309" },
  "national insurance": { domain: "nationalinsurance.nic.co.in", name: "National Insurance", color: "#0f766e" },
  manipalcigna: { domain: "manipalcigna.com", name: "ManipalCigna", color: "#007fa8" },
  aditya: { domain: "adityabirlacapital.com", name: "Aditya Birla Capital", color: "#a51c24" },
  birla: { domain: "adityabirlacapital.com", name: "Aditya Birla Capital", color: "#a51c24" },
  acko: { domain: "acko.com", name: "Acko", color: "#6c5ce7" },
  navi: { domain: "navi.com", name: "Navi", color: "#00d09c" },
  digit: { domain: "godigit.com", name: "Go Digit", color: "#ffb703" },
  "max life": { domain: "maxlifeinsurance.com", name: "Max Life", color: "#003b70" },

  // ── Demat Brokers & Fintechs ─────────────────────────────────────────────
  zerodha: { domain: "zerodha.com", name: "Zerodha", color: "#387ed1" },
  kite: { domain: "zerodha.com", name: "Zerodha Kite", color: "#387ed1" },
  groww: { domain: "groww.in", name: "Groww", color: "#00b899" },
  upstox: { domain: "upstox.com", name: "Upstox", color: "#53297a" },
  "angel one": { domain: "angelone.in", name: "Angel One", color: "#ff5722" },
  angel: { domain: "angelone.in", name: "Angel One", color: "#ff5722" },
  "motilal oswal": { domain: "motilaloswal.com", name: "Motilal Oswal", color: "#d97706" },
  motilal: { domain: "motilaloswal.com", name: "Motilal Oswal", color: "#d97706" },
  "5paisa": { domain: "5paisa.com", name: "5paisa", color: "#0891b2" },
  sharekhan: { domain: "sharekhan.com", name: "Sharekhan", color: "#059669" },
  fyers: { domain: "fyers.in", name: "FYERS", color: "#0f172a" },
  dhan: { domain: "dhan.co", name: "Dhan", color: "#7c3aed" },
  iifl: { domain: "iiflsecurities.com", name: "IIFL Securities", color: "#b45309" },

  // ── Mutual Fund AMCs ──────────────────────────────────────────────────────
  nippon: { domain: "nipponindiaim.com", name: "Nippon India", color: "#d90429" },
  parag: { domain: "ppfas.com", name: "Parag Parikh", color: "#2b2d42" },
  ppfas: { domain: "ppfas.com", name: "PPFAS", color: "#2b2d42" },
  mirae: { domain: "miraeassetmf.co.in", name: "Mirae Asset", color: "#003b70" },
  quant: { domain: "quantmutual.com", name: "Quant Mutual", color: "#00a896" },
  uti: { domain: "utimf.com", name: "UTI Mutual Fund", color: "#005b94" },
  dsp: { domain: "dspim.com", name: "DSP Mutual Fund", color: "#002d62" },
  edelweiss: { domain: "edelweissmf.com", name: "Edelweiss", color: "#1d4ed8" },
  franklin: { domain: "franklintempletonindia.com", name: "Franklin Templeton", color: "#004b87" },
  invesco: { domain: "invescomutualfund.com", name: "Invesco", color: "#00386b" },
  sundaram: { domain: "sundarammutual.com", name: "Sundaram", color: "#b45309" },
  whiteoak: { domain: "whiteoakamc.com", name: "WhiteOak Capital", color: "#1c1c1c" },
  absl: { domain: "mutualfund.adityabirlacapital.com", name: "Aditya Birla Sun Life", color: "#a51c24" },
};

/**
 * Smart Canonical Brand Resolver:
 * Eliminates false substring matches while ensuring complete consistency across tabs.
 */
export function resolveBrand(rawInput: string): BrandInfo | null {
  if (!rawInput) return null;
  const text = rawInput.toLowerCase().trim();

  // 1. Long multi-word keys sorted by descending length (e.g. 'state bank of india' before 'bank of india')
  const longEntries = Object.entries(CANONICAL_BRANDS)
    .filter(([k]) => k.length > 3)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [k, brand] of longEntries) {
    if (text.includes(k)) return brand;
  }

  // 2. Short keys (<= 3 chars) strictly using whole-word boundary matching (e.g. \b(sbi|pnb|bob|au|fi|sc)\b)
  const shortEntries = Object.entries(CANONICAL_BRANDS).filter(([k]) => k.length <= 3);
  for (const [k, brand] of shortEntries) {
    const regex = new RegExp(`\\b${k}\\b`, "i");
    if (regex.test(text)) return brand;
  }

  return null;
}

/** Backward-compatible helper for bank domain string resolution */
export function resolveBankDomain(rawName: string): string {
  const brand = resolveBrand(rawName);
  return brand ? brand.domain : "";
}

/** Deterministic, legible background color for initials fallback */
export const brandInitialsColor = (name: string, fallbackColor?: string) => {
  if (fallbackColor) return fallbackColor;
  const s = name || "?";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 38%)`;
};

/**
 * Universal BrandLogo component:
 * 1. Checks if the brand has a local vector SVG (e.g. LIC vector asset).
 * 2. Attempts Unavatar vector CDN (`unavatar.io/${domain}`).
 * 3. Falls back to Google 256px Favicon CDN (`sz=256`).
 * 4. Falls back to Hunter CDN.
 * 5. Falls back to a deterministic, high-contrast brand badge avatar.
 */
export const BrandLogo: React.FC<{
  name: string;
  domain?: string;
  size?: number;
  borderRadius?: number;
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({
  name,
  domain: explicitDomain,
  size = 40,
  borderRadius,
  accentColor,
  className,
  style,
}) => {
  const brand = resolveBrand(name);
  const targetDomain = explicitDomain || brand?.domain || "";
  const localSvg = brand?.localSvg;

  // Fallback state: 0 = localSvg or unavatar, 1 = google 256px, 2 = hunter.io, 3 = initials badge
  const [fallbackLevel, setFallbackLevel] = useState<number>(0);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    setFallbackLevel(0);
    if (localSvg) {
      setImgSrc(localSvg);
    } else if (targetDomain) {
      // Tier 0: unavatar.io gives pure vector SVGs for top Indian banks & financial entities
      setImgSrc(`https://unavatar.io/${targetDomain}`);
    } else {
      setImgSrc(null);
      setFallbackLevel(3);
    }
  }, [name, targetDomain, localSvg]);

  const handleImgError = () => {
    if (fallbackLevel === 0 && targetDomain) {
      // Advance to Tier 1: Google Favicon 256px
      setFallbackLevel(1);
      setImgSrc(`https://www.google.com/s2/favicons?domain=${targetDomain}&sz=256`);
    } else if (fallbackLevel === 1 && targetDomain) {
      // Advance to Tier 2: Hunter.io
      setFallbackLevel(2);
      setImgSrc(`https://logos.hunter.io/${targetDomain}`);
    } else {
      // Advance to Tier 3: Initials Avatar Badge
      setFallbackLevel(3);
      setImgSrc(null);
    }
  };

  const br = borderRadius ?? Math.max(4, Math.round(size * 0.25));

  // Render Image if available and within fallback levels
  if ((localSvg || targetDomain) && fallbackLevel < 3 && imgSrc) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: br,
          background: "var(--surface-0, #ffffff)",
          border: `1px solid ${THEME.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          ...style,
        }}
      >
        <img
          src={imgSrc}
          alt={name}
          onError={handleImgError}
          style={{
            width: "74%",
            height: "74%",
            objectFit: "contain",
            imageRendering: "-webkit-optimize-contrast",
          }}
        />
      </div>
    );
  }

  // Render Initials Badge
  const color = accentColor || brand?.color || brandInitialsColor(name);
  const initials =
    (name || "?")
      .split(/\s+/)
      .filter((w: string) => w.length > 1)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join("") ||
    (name || "?")[0]?.toUpperCase() ||
    "?";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: br,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontWeight: 800,
        fontSize: Math.max(9, Math.round(size * 0.36)),
        color,
        letterSpacing: "-0.02em",
        ...style,
      }}
    >
      {initials}
    </div>
  );
};

// Aliases for seamless drop-in replacements across all tabs
export const BankLogo = ({
  bankName,
  name,
  size = 40,
  borderRadius,
}: {
  bankName?: string;
  name?: string;
  size?: number;
  borderRadius?: number;
}) => <BrandLogo name={bankName || name || "Bank"} size={size} borderRadius={borderRadius} />;

export const MFLogo = ({
  fundName,
  name,
  size = 40,
  borderRadius,
}: {
  fundName?: string;
  name?: string;
  size?: number;
  borderRadius?: number;
}) => <BrandLogo name={fundName || name || "Mutual Fund"} size={size} borderRadius={borderRadius} />;

export const InsurerLogo = ({
  name,
  insurer,
  size = 40,
  borderRadius,
}: {
  name?: string;
  insurer?: string;
  size?: number;
  borderRadius?: number;
}) => <BrandLogo name={insurer || name || "Insurer"} size={size} borderRadius={borderRadius} />;

export const BrokerLogo = ({
  broker,
  name,
  size = 40,
  borderRadius,
}: {
  broker?: string;
  name?: string;
  size?: number;
  borderRadius?: number;
}) => <BrandLogo name={broker || name || "Broker"} size={size} borderRadius={borderRadius} />;

export const BuilderLogo = ({
  name,
  size = 46,
  borderRadius,
}: {
  name: string;
  size?: number;
  borderRadius?: number;
}) => <BrandLogo name={name || "Builder"} size={size} borderRadius={borderRadius} />;

export const ServiceLogo = ({
  name,
  website,
  size = 40,
  borderRadius,
}: {
  name: string;
  website?: string;
  size?: number;
  borderRadius?: number;
}) => {
  let explicitDomain = "";
  if (website && website.trim()) {
    try {
      const url = website.includes("://") ? website : `https://${website}`;
      explicitDomain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      explicitDomain = website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    }
  }
  return <BrandLogo name={name} domain={explicitDomain} size={size} borderRadius={borderRadius} />;
};

export const LicLogo = ({ size = 40 }: { size?: number }) => (
  <BrandLogo name="LIC" size={size} />
);

export const bankInitialsColor = brandInitialsColor;
