/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  IndianRupee,
  ChevronUp,
  ChevronDown,
  List,
  X,
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Wallet,
  Sparkles,
  Calendar,
  BookOpen,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  AlertTriangle,
  Calculator,
  Lightbulb,
  Clock,
  Shield,
  Star,
  User,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { getCardGradient } from "../../utils/cardColors";
import { fmtINRFull, fmtINRExact, today, uid, getCCDueDate, loanOutstanding } from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { DataTable } from "../design-system/DataTable";

// Bank logo domains for Clearbit / Google Favicon API
const BANK_LOGO_DOMAINS: Record<string, string> = {
  hdfc: "hdfcbank.com",
  icici: "icicibank.com",
  sbi: "sbi.co.in",
  "state bank": "sbi.co.in",
  axis: "axisbank.com",
  kotak: "kotak.com",
  idfc: "idfcfirstbank.com",
  indusind: "indusind.com",
  indusland: "indusind.com", // common misspelling of IndusInd
  yesbank: "yesbank.in",
  "yes bank": "yesbank.in",
  sc: "sc.com",
  "standard chartered": "sc.com",
  citi: "citi.com",
  hsbc: "hsbc.com",
  dbs: "dbs.com",
  bob: "bankofbaroda.in",
  baroda: "bankofbaroda.in",
  "bank of baroda": "bankofbaroda.in",
  pnb: "pnbindia.in",
  "punjab national": "pnbindia.in",
  canara: "canarabank.com",
  idbi: "idbibank.in",
  union: "unionbankofindia.co.in",
  federal: "federalbank.co.in",
  equitas: "equitasbank.com",
  au: "aubank.in",
  rbl: "rblbank.com",
  bandhan: "bandhanbank.com",
  jupiter: "jupiter.money",
  fi: "fi.money",
  slice: "sliceit.com",
  onecard: "getonecard.com",
  airtel: "airtel.in",
  paytm: "paytm.com",
  amazon: "amazon.in",
  sodexo: "sodexo.com",
  niyo: "goniyo.com",
  omnicard: "omnicard.in",
};

/** Deterministic, legible background color for the initials fallback avatar */
const bankInitialsColor = (bankName: string) => {
  const s = bankName || "?";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 38%)`;
};

const BankLogo = ({ bankName, size = 40 }: { bankName: string; size?: number }) => {
  const name = (bankName || "").toLowerCase();
  let domain = "";
  for (const [k, d] of Object.entries(BANK_LOGO_DOMAINS)) {
    if (name.includes(k)) {
      domain = d;
      break;
    }
  }

  const [imgSrc, setImgSrc] = React.useState<string | null>(null);
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(0); // 0: google favicon, 1: hunter.io, 2: initials

  React.useEffect(() => {
    if (domain) {
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
      setFallbackLevel(0);
    } else {
      setImgSrc(null);
      setFallbackLevel(2);
    }
  }, [domain]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImgSrc(`https://logos.hunter.io/${domain}`);
    } else if (fallbackLevel === 1) {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "var(--surface-0)",
          border: `1px solid var(--t-line)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <img
          src={imgSrc}
          alt={bankName}
          referrerPolicy="no-referrer"
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
          onError={handleError}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: bankInitialsColor(bankName),
        border: `1px solid var(--t-line)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: size / 2.5, fontWeight: 800, color: "#fff" }}>
        {(bankName || "").slice(0, 2).toUpperCase() || "?"}
      </span>
    </div>
  );
};

/** Renders authentic SVG logos for each payment network */
const CardNetworkLogo = ({ network }: { network?: string }) => {
  const n = (network || "").toLowerCase();

  if (n === "visa")
    return (
      <svg
        width="58"
        height="20"
        viewBox="0 0 58 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="0"
          y="17"
          fontFamily="'Times New Roman', Times, serif"
          fontSize="22"
          fontWeight="700"
          fontStyle="italic"
          fill="#FFFFFF"
          letterSpacing="-1"
        >
          VISA
        </text>
      </svg>
    );

  if (n === "mastercard")
    return (
      <svg
        width="44"
        height="28"
        viewBox="0 0 44 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="15" cy="14" r="13" fill="#EB001B" />
        <circle cx="29" cy="14" r="13" fill="#F79E1B" />
        <path d="M22 4.8a13 13 0 0 1 0 18.4A13 13 0 0 1 22 4.8z" fill="#FF5F00" />
      </svg>
    );

  // RuPay — Official NPCI logo (source: Wikimedia Commons CC0)
  if (n === "rupay")
    return (
      <svg
        width="72"
        height="20"
        viewBox="0 0 67.583808 17.596123"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(-0.01611121,-1.1444177)">
          {/* Green right triangle */}
          <g transform="matrix(0.35277777,0,0,-0.35277777,67.797845,1.4031532)">
            <path style={{ fill: "#00B140" }} d="m 0,0 11.488,-22.811 -24.15,-22.822 z" />
          </g>
          {/* Orange right triangle */}
          <g transform="matrix(0.35277777,0,0,-0.35277777,64.991459,1.4031532)">
            <path style={{ fill: "#F47920" }} d="M 0,0 11.471,-22.811 -12.663,-45.633 Z" />
          </g>
          {/* R letter */}
          <g transform="matrix(0.35277777,0,0,-0.35277777,0.01611121,14.573442)">
            <path
              style={{ fill: "#FFFFFF" }}
              d="m 0,0 11.454,41.266 h 18.312 c 5.723,0 9.546,-0.906 11.491,-2.773 1.931,-1.852 2.303,-4.875 1.139,-9.124 -0.704,-2.503 -1.774,-4.604 -3.244,-6.264 -1.458,-1.663 -3.381,-2.978 -5.749,-3.945 2.009,-0.483 3.287,-1.442 3.86,-2.88 0.57,-1.438 0.504,-3.535 -0.188,-6.284 L 35.682,4.232 35.678,4.076 C 35.276,2.462 35.395,1.598 36.05,1.528 L 35.628,0 H 23.24 c 0.042,0.971 0.119,1.839 0.201,2.568 0.09,0.746 0.201,1.324 0.311,1.721 l 1.155,4.121 c 0.582,2.143 0.618,3.638 0.078,4.499 -0.545,0.884 -1.765,1.319 -3.691,1.319 H 16.088 L 12.118,0 Z m 18.664,23.527 h 5.576 c 1.954,0 3.396,0.279 4.285,0.856 0.893,0.582 1.556,1.565 1.945,2.987 0.403,1.446 0.304,2.454 -0.274,3.027 -0.577,0.582 -1.958,0.865 -4.129,0.865 h -5.256 z"
            />
          </g>
          {/* u letter */}
          <g transform="matrix(0.35277777,0,0,-0.35277777,26.966392,3.8309332)">
            <path
              style={{ fill: "#FFFFFF" }}
              d="m 0,0 -8.444,-30.451 h -10.261 l 1.261,4.461 c -1.806,-1.774 -3.654,-3.121 -5.517,-3.982 -1.848,-0.876 -3.798,-1.307 -5.851,-1.307 -1.697,0 -3.154,0.308 -4.327,0.919 -1.187,0.609 -2.071,1.535 -2.666,2.756 -0.528,1.069 -0.758,2.389 -0.668,3.966 0.095,1.552 0.643,4.17 1.659,7.836 L -30.438,0 h 11.224 l -4.367,-15.728 c -0.638,-2.302 -0.79,-3.92 -0.479,-4.801 0.324,-0.889 1.189,-1.348 2.593,-1.348 1.414,0 2.603,0.512 3.585,1.557 0.996,1.036 1.765,2.581 2.343,4.637 L -11.208,0 Z"
            />
          </g>
          {/* P letter */}
          <g transform="matrix(0.35277777,0,0,-0.35277777,25.52981,14.573442)">
            <path
              style={{ fill: "#FFFFFF" }}
              d="m 0,0 11.442,41.266 h 15.74 c 3.473,0 6.161,-0.205 8.078,-0.655 1.913,-0.431 3.413,-1.131 4.528,-2.118 1.397,-1.291 2.253,-2.889 2.605,-4.806 0.331,-1.917 0.135,-4.15 -0.59,-6.772 C 40.521,22.302 38.274,18.767 35.072,16.297 31.86,13.859 27.886,12.634 23.143,12.634 H 15.777 L 12.278,0 Z m 18.566,22.712 h 3.958 c 2.559,0 4.358,0.316 5.412,0.926 1.02,0.618 1.745,1.716 2.187,3.277 0.442,1.582 0.328,2.688 -0.34,3.306 -0.643,0.615 -2.286,0.926 -4.915,0.926 h -3.95 z"
            />
          </g>
          {/* a letter */}
          <g transform="matrix(0.35277777,0,0,-0.35277777,44.934987,14.573442)">
            <path
              style={{ fill: "#FFFFFF" }}
              d="m 0,0 0.114,2.892 c -1.81,-1.355 -3.643,-2.379 -5.486,-3.019 -1.835,-0.652 -3.789,-0.983 -5.882,-0.983 -3.179,0 -5.396,0.864 -6.678,2.536 -1.266,1.675 -1.474,4.08 -0.61,7.148 0.827,3.028 2.298,5.257 4.42,6.682 2.11,1.442 5.634,2.474 10.578,3.134 0.627,0.102 1.467,0.184 2.519,0.311 3.655,0.423 5.707,1.397 6.149,2.986 0.23,0.87 0.09,1.512 -0.45,1.906 -0.521,0.409 -1.495,0.61 -2.901,0.61 -1.167,0 -2.106,-0.242 -2.876,-0.745 -0.769,-0.508 -1.343,-1.25 -1.732,-2.294 h -10.943 c 0.988,3.428 3.007,6.018 6.038,7.75 3.02,1.762 7.002,2.61 11.934,2.61 2.319,0 4.396,-0.217 6.232,-0.688 1.839,-0.451 3.183,-1.094 4.055,-1.872 1.073,-0.971 1.708,-2.078 1.889,-3.302 0.209,-1.221 -0.02,-2.971 -0.66,-5.261 L 11.003,3.424 C 10.852,2.868 10.823,2.372 10.905,1.921 11.003,1.491 11.191,1.123 11.523,0.86 L 11.27,0 Z M 2.728,13.597 C 1.536,13.118 -0.013,12.659 -1.938,12.155 -4.961,11.344 -6.662,10.262 -7.03,8.923 -7.285,8.062 -7.182,7.399 -6.761,6.895 c 0.415,-0.479 1.136,-0.721 2.152,-0.721 1.863,0 3.359,0.471 4.474,1.401 1.118,0.942 1.954,2.421 2.539,4.461 0.102,0.434 0.192,0.746 0.25,0.979 z"
            />
          </g>
          {/* y letter */}
          <g transform="matrix(0.35277777,0,0,-0.35277777,48.940953,18.806421)">
            <path
              style={{ fill: "#FFFFFF" }}
              d="m 0,0 2.491,9.013 h 3.212 c 1.073,0 1.917,0.212 2.515,0.598 0.607,0.401 1.02,1.077 1.258,1.987 0.119,0.401 0.192,0.823 0.242,1.302 0.032,0.508 0.032,1.045 0,1.667 L 8.004,42.45 H 19.365 L 19.189,23.974 29.107,42.45 H 39.672 L 22.138,12.146 C 20.148,8.759 18.702,6.432 17.784,5.162 16.878,3.908 16.018,2.933 15.183,2.273 14.101,1.36 12.893,0.713 11.589,0.336 10.282,-0.049 8.292,-0.241 5.617,-0.241 c -0.77,0 -1.656,0.015 -2.614,0.065 C 2.052,-0.139 1.037,-0.082 0,0"
            />
          </g>
        </g>
      </svg>
    );

  // Amex — Official American Express logo (source: Simple Icons, Apache 2.0)
  if (n === "amex" || n === "american express")
    return (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <path
          fill="#FFFFFF"
          d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507"
        />
      </svg>
    );

  // Diners Club — accurate overlapping-circles logo with brand blue
  if (n === "diners" || n === "diners club")
    return (
      <svg
        width="72"
        height="30"
        viewBox="0 0 72 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="diners-left-clip">
            <circle cx="13" cy="15" r="12" />
          </clipPath>
          <clipPath id="diners-right-clip">
            <circle cx="23" cy="15" r="12" />
          </clipPath>
        </defs>
        {/* Left circle — blue */}
        <circle cx="13" cy="15" r="12" fill="#004A97" />
        {/* Right circle — white */}
        <circle cx="23" cy="15" r="12" fill="#FFFFFF" />
        {/* Overlap: right circle clips blue fill */}
        <circle cx="13" cy="15" r="12" fill="#FFFFFF" clipPath="url(#diners-right-clip)" />
        {/* Inner overlap redraw — blue intersection */}
        <circle cx="23" cy="15" r="12" fill="#004A97" clipPath="url(#diners-left-clip)" />
        {/* Outer rings */}
        <circle
          cx="13"
          cy="15"
          r="12"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.5"
        />
        <circle
          cx="23"
          cy="15"
          r="12"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.5"
        />
        {/* Wordmark */}
        <text
          x="38"
          y="13"
          fontFamily="'Arial', sans-serif"
          fontSize="7.5"
          fontWeight="800"
          fill="#FFFFFF"
          letterSpacing="0.8"
        >
          DINERS
        </text>
        <text
          x="38"
          y="23"
          fontFamily="'Arial', sans-serif"
          fontSize="7.5"
          fontWeight="800"
          fill="rgba(255,255,255,0.7)"
          letterSpacing="1.5"
        >
          CLUB
        </text>
      </svg>
    );

  // Fallback: generic card icon
  return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="1"
        y="1"
        width="30"
        height="20"
        rx="3"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
      />
      <rect x="1" y="7" width="30" height="4" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
};

const OwnerBadge = ({ owner }: { owner?: string }) => {
  const { familyProfiles } = useMasterData();
  if (!owner) return null;
  const p = familyProfiles.find((x) => x.id === owner || x.name === owner);
  const name = p ? p.name : owner === "self" ? "Self" : owner;
  if (!name) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3.5px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        background: "rgba(255, 255, 255, 0.22)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 255, 255, 0.42)",
        color: "#ffffff",
        letterSpacing: "0.02em",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
        textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#4ade80",
          boxShadow: "0 0 6px #4ade80",
          display: "inline-block",
        }}
      />
      {name}
    </span>
  );
};

// Standardized Tile component replaced by StatCard in UI folder

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted }}>
    <div style={{ fontSize: 14 }}>{text}</div>
  </div>
);

function InformalEmptyState({ isBorrowed, onAdd }: any) {
  const Icon = isBorrowed ? TrendingDown : TrendingUp;
  const dotColor = isBorrowed ? "var(--t-rust)" : "var(--t-accent)";
  const pills = isBorrowed
    ? [
        "Track Borrowed Amount",
        "Log Repayments",
        "Multiple Loans Per Person",
        "Outstanding Balance",
      ]
    : [
        "Track Money Lent",
        "Received Repayments",
        "Multiple Loans Per Borrower",
        "Settlement Status",
      ];
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: dotColor,
        }}
      >
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        {isBorrowed ? "No Borrowings Recorded Yet" : "No Personal Loans Given Yet"}
      </div>
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          maxWidth: 380,
          margin: "0 auto 12px",
          lineHeight: 1.6,
        }}
      >
        {isBorrowed
          ? "Track money you've borrowed from friends or family — log individual loans, record repayments, and monitor your outstanding balance."
          : "Track money you've lent to friends or family — log individual loans, record received repayments, and see who owes you what."}
      </div>
      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 24,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap" as const,
        }}
      >
        {pills.map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dotColor,
                display: "inline-block",
              }}
            />{" "}
            {t}
          </span>
        ))}
      </div>
      <button
        style={{ ...btnSolid, display: "inline-flex", alignItems: "center", gap: 8 }}
        onClick={onAdd}
      >
        <Plus size={14} /> {isBorrowed ? "Add Lender" : "Add Borrower"}
      </button>
    </Card>
  );
}

const btnSolid = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  background: THEME.accent,
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-md)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const btnGhost = {
  background: "transparent",
  border: `1.5px solid ${THEME.line}`,
  color: THEME.ink,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 10,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnAccent = {
  ...btnSolid,
  background: THEME.accent,
};

const input = {
  width: "100%",
  padding: "10px 12px",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: "var(--radius-md)",
  color: THEME.ink,
  fontSize: 14,
};

const card = {
  background: "var(--surface-0)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

const cardDark = {
  background: THEME.ink,
  color: "#fff",
  borderRadius: 12,
  padding: 20,
};

const iconBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: THEME.muted,
  padding: "5px",
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
};

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 16,
      marginBottom: 32,
    }}
  >
    {children}
  </div>
);

const InvestCard = ({ children, onRemove, onEdit, cardStyle, className = "" }: any) => (
  <div
    className={`card-lift ${className}`}
    style={{
      ...card,
      background: "var(--t-card-bg)",
      position: "relative",
      borderRadius: 16,
      border: "1px solid var(--t-line)",
      ...cardStyle,
    }}
  >
    <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 6, zIndex: 10 }}>
      <button
        onClick={onEdit}
        aria-label="Edit"
        className="icon-btn"
        style={{
          ...iconBtn,
          background: "color-mix(in srgb, var(--surface-0) 50%, transparent)",
          border: "1px solid var(--t-line)",
          borderRadius: 8,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: THEME.muted,
          transition: "all 0.2s ease",
        }}
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={onRemove}
        aria-label="Remove"
        className="icon-btn danger"
        style={{
          ...iconBtn,
          background: "color-mix(in srgb, var(--t-rust) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--t-rust) 20%, transparent)",
          borderRadius: 8,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: THEME.rust,
          transition: "all 0.2s ease",
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
    {children}
  </div>
);

const th = {
  textAlign: "left" as const,
  padding: "11px 10px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1px solid var(--t-line)`,
  whiteSpace: "nowrap" as const,
};
const td = {
  padding: "12px 10px",
  verticalAlign: "top" as const,
  fontSize: 13,
  borderBottom: `1px solid var(--t-line)`,
};

export function CreditTab({
  state,
  addItem,
  removeItem,
  updateItem,
  subTab,
  onSubTabChange,
  showToast,
}: any) {
  const { privacyMode } = usePrivacy();
  const [sub, setSub] = useState(subTab || "cc");
  const [modal, setModal] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Existing shared group names — passed to modals for datalist suggestions
  const existingGroups: string[] = [
    ...new Set(
      state.creditCards.filter((c: any) => c.sharedGroup).map((c: any) => c.sharedGroup as string)
    ),
  ];

  const { run: saveNewCC, loading: savingNewCC } = useAsyncAction(
    async (v: any) => {
      await addItem("creditCards", v);
    },
    {
      onSuccess: () => setModal(null),
      onError: (e: any) =>
        showToast?.(`Failed to add credit card: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const { run: saveNewPrepaid, loading: savingNewPrepaid } = useAsyncAction(
    async (v: any) => {
      await addItem("prepaidCards", v);
    },
    {
      onSuccess: () => setModal(null),
      onError: (e: any) =>
        showToast?.(`Failed to add prepaid card: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const { run: saveNewLoanTaken, loading: savingNewLoanTaken } = useAsyncAction(
    async (v: any) => {
      await addItem("loansTaken", v);
    },
    {
      onSuccess: () => setModal(null),
      onError: (e: any) => showToast?.(`Failed to add loan: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const { run: saveNewLoanGiven, loading: savingNewLoanGiven } = useAsyncAction(
    async (v: any) => {
      await addItem("loansGiven", v);
    },
    {
      onSuccess: () => setModal(null),
      onError: (e: any) => showToast?.(`Failed to add loan: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveCCEdit, loading: savingCCEdit } = useAsyncAction(
    async (id: string, v: any) => {
      // If the ledger already has entries and the user hand-edited Outstanding to a
      // different number, reconcile with an adjustment entry instead of letting the
      // next ledger edit silently recompute Outstanding from the (now stale) ledger sum
      // and discard the correction — see CCTransactionLedger's onUpdate.
      const existingTxs: any[] = Array.isArray(v.transactions) ? v.transactions : [];
      if (existingTxs.length > 0) {
        const ledgerSum = existingTxs.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        const diff = (Number(v.outstanding) || 0) - ledgerSum;
        if (Math.abs(diff) >= 1) {
          v.transactions = [
            ...existingTxs,
            {
              id: uid(),
              date: today(),
              merchant: "Balance Adjustment",
              amount: String(diff),
              category: "General",
            },
          ];
        }
      }
      await updateItem("creditCards", id, v);
    },
    {
      onSuccess: () => setEditId(null),
      onError: (e: any) =>
        showToast?.(`Failed to save credit card: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const { run: savePrepaidEdit, loading: savingPrepaidEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("prepaidCards", id, v);
    },
    {
      onSuccess: () => setEditId(null),
      onError: (e: any) =>
        showToast?.(`Failed to save prepaid card: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const { run: saveLoanTakenEdit, loading: savingLoanTakenEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("loansTaken", id, v);
    },
    {
      onSuccess: () => setEditId(null),
      onError: (e: any) => showToast?.(`Failed to save loan: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const { run: saveLoanGivenEdit, loading: savingLoanGivenEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("loansGiven", id, v);
    },
    {
      onSuccess: () => setEditId(null),
      onError: (e: any) => showToast?.(`Failed to save loan: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const { run: saveBorrowedEdit, loading: savingBorrowedEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("informalBorrowed", id, v);
    },
    {
      onSuccess: () => setEditId(null),
      onError: (e: any) =>
        showToast?.(`Failed to save lender: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const { run: saveLentEdit, loading: savingLentEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("informalLent", id, v);
    },
    {
      onSuccess: () => setEditId(null),
      onError: (e: any) =>
        showToast?.(`Failed to save borrower: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const subs: Record<string, { label: string; sub: string }> = {
    cc: { label: "Credit Cards", sub: "Manage your credit cards and track utilization" },
    prepaid: { label: "Prepaid Cards", sub: "Track prepaid card balances" },
    taken: { label: "Loans Taken", sub: "Track loans you've taken and repayment progress" },
    given: { label: "Loans Given", sub: "Track loans you've given out" },
    borrowed: { label: "From People", sub: "Informal borrowings from people" },
    lent: { label: "To People", sub: "Informal lending to people" },
    optimizer: { label: "Payoff Optimizer", sub: "Optimize your debt repayment strategy" },
  };

  React.useEffect(() => {
    if (subTab) setSub(subTab);
  }, [subTab]);

  const activeMeta = subs[sub] || subs.cc;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <SectionTitle sub={activeMeta.sub}>{activeMeta.label}</SectionTitle>
        {sub !== "borrowed" &&
          sub !== "lent" &&
          sub !== "optimizer" &&
          !(sub === "taken" && !state.loansTaken.length) &&
          !(sub === "given" && !state.loansGiven.length) &&
          !(sub === "cc" && !state.creditCards.length) &&
          !(sub === "prepaid" && !state.prepaidCards.length) && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setModal(sub)}>
              Add {activeMeta.label.split(" ")[0]}
            </Button>
          )}
      </div>

      <div>
        {sub === "cc" && (
          <>
            {(() => {
              const activeCards = state.creditCards.filter(
                (c: any) => (c.status || "active").toLowerCase() !== "closed"
              );
              // For shared-pool cards, count the pool limit once (max across group), not the sum of sub-limits
              const groupPools: Record<string, number> = {};
              activeCards.forEach((c: any) => {
                if (c.sharedGroup) {
                  groupPools[c.sharedGroup] = Math.max(
                    groupPools[c.sharedGroup] || 0,
                    Number(c.sharedGroupLimit) || 0
                  );
                }
              });
              const totalLimit =
                activeCards
                  .filter((c: any) => !c.sharedGroup)
                  .reduce((acc: number, c: any) => acc + (Number(c.limit) || 0), 0) +
                (Object.values(groupPools) as number[]).reduce(
                  (acc: number, v: number) => acc + v,
                  0
                );
              const totalOutstandingCC = activeCards.reduce(
                (acc: any, c: any) => acc + (Number(c.outstanding) || 0),
                0
              );
              const totalAvailable = Math.max(0, totalLimit - totalOutstandingCC);
              const utilPct =
                totalLimit > 0 ? Math.round((totalOutstandingCC / totalLimit) * 100) : 0;

              const totalAnnualFees = activeCards
                .filter((c: any) => Number(c.annualFee) > 0)
                .reduce((acc: number, c: any) => acc + Number(c.annualFee), 0);
              const feeCardCount = activeCards.filter((c: any) => Number(c.annualFee) > 0).length;

              const totalRewardPoints = activeCards.reduce(
                (acc: number, c: any) => acc + (Number(c.rewardPointsBalance) || 0),
                0
              );
              const totalRewardValue = activeCards.reduce(
                (acc: number, c: any) =>
                  acc + (Number(c.rewardPointsBalance) || 0) * (Number(c.rewardPointValue) || 0),
                0
              );

              const statCards = [
                {
                  label: "Total Limit",
                  sub: `${activeCards.length} active card${activeCards.length !== 1 ? "s" : ""}`,
                  value: fmtINRFull(totalLimit),
                  numericValue: totalLimit,
                  color: THEME.accent,
                  icon: <CreditCard />,
                },
                {
                  label: "Outstanding",
                  sub: utilPct > 0 ? `${utilPct}% utilization` : "No balance due",
                  value: fmtINRFull(totalOutstandingCC),
                  numericValue: totalOutstandingCC,
                  color: THEME.rust,
                  icon: <TrendingDown />,
                },
                {
                  label: "Available",
                  sub:
                    totalLimit > 0
                      ? utilPct > 100
                        ? `Over limit by ${utilPct - 100}%`
                        : `${100 - utilPct}% of limit free`
                      : activeCards.length === 0 && state.creditCards.length > 0
                        ? "All cards closed"
                        : "No cards yet",
                  value: fmtINRFull(totalAvailable),
                  numericValue: totalAvailable,
                  color: THEME.sage,
                  icon: <Shield />,
                },
                ...(totalAnnualFees > 0
                  ? [
                      {
                        label: "Annual Fees / yr",
                        sub: `${feeCardCount} card${feeCardCount !== 1 ? "s" : ""} · ${privacyMode ? "••••" : fmtINRFull(Math.round(totalAnnualFees / 12))}/mo`,
                        value: fmtINRFull(totalAnnualFees),
                        numericValue: totalAnnualFees,
                        color: THEME.gold,
                        icon: <Clock />,
                      },
                    ]
                  : []),
                ...(totalRewardPoints > 0
                  ? [
                      {
                        label: "Reward Points",
                        sub:
                          totalRewardValue > 0
                            ? `≈ ${privacyMode ? "••••" : fmtINRFull(totalRewardValue)} redeemable`
                            : "Set value/point on a card to see ₹ estimate",
                        value: Math.round(totalRewardPoints).toLocaleString("en-IN"),
                        numericValue: totalRewardPoints,
                        formatValue: (n: number) => Math.round(n).toLocaleString("en-IN"),
                        color: THEME.sage,
                        icon: <Star />,
                      },
                    ]
                  : []),
              ];

              return (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 14,
                      marginBottom: 20,
                    }}
                  >
                    {statCards.map(({ label, value, numericValue, formatValue, color, sub, icon }) => (
                      <StatCard
                        key={label}
                        label={label}
                        value={value}
                        numericValue={numericValue}
                        formatValue={formatValue || fmtINRFull}
                        icon={icon}
                        color={color}
                        sub={sub}
                      />
                    ))}
                  </div>
                  {activeCards.length > 0 &&
                    (() => {
                      const isCritical = utilPct > 70;
                      const isWarning = utilPct > 30 && utilPct <= 70;
                      const alertBg = isCritical
                        ? "color-mix(in srgb, var(--t-rust) 6%, transparent)"
                        : isWarning
                          ? "color-mix(in srgb, var(--t-gold) 6%, transparent)"
                          : "color-mix(in srgb, var(--t-sage) 6%, transparent)";
                      const alertBorder = isCritical
                        ? "color-mix(in srgb, var(--t-rust) 15%, transparent)"
                        : isWarning
                          ? "color-mix(in srgb, var(--t-gold) 15%, transparent)"
                          : "color-mix(in srgb, var(--t-sage) 15%, transparent)";
                      const alertLeftBorder = isCritical
                        ? "var(--t-rust)"
                        : isWarning
                          ? "var(--t-gold)"
                          : "var(--t-sage)";
                      const alertColor = isCritical
                        ? THEME.rust
                        : isWarning
                          ? THEME.gold
                          : THEME.sage;
                      const AlertIcon = isCritical
                        ? AlertCircle
                        : isWarning
                          ? AlertTriangle
                          : CheckCircle2;
                      return (
                        <div
                          style={{
                            marginBottom: 24,
                            padding: "12px 16px",
                            borderRadius: 12,
                            fontSize: 12.5,
                            fontWeight: 500,
                            background: alertBg,
                            border: `1px solid ${alertBorder}`,
                            borderLeft: `4px solid ${alertLeftBorder}`,
                            color: THEME.ink,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            lineHeight: 1.4,
                          }}
                        >
                          <AlertIcon size={17} color={alertColor} style={{ flexShrink: 0 }} />
                          <div>
                            {utilPct > 70 ? (
                              <span>
                                <strong style={{ color: alertColor }}>
                                  Critical: {utilPct}% overall utilization.
                                </strong>{" "}
                                This is very high and can negatively impact your credit score. Pay
                                down balances urgently.
                              </span>
                            ) : utilPct > 30 ? (
                              <span>
                                <strong style={{ color: alertColor }}>
                                  Utilization warning: {utilPct}%.
                                </strong>{" "}
                                Above the recommended 30% threshold. Reducing this balance will
                                improve your credit history.
                              </span>
                            ) : utilPct > 0 ? (
                              <span>
                                <strong style={{ color: alertColor }}>
                                  Healthy utilization: {utilPct}%.
                                </strong>{" "}
                                Excellent work keeping balances below the recommended 30% mark.
                              </span>
                            ) : (
                              <span>
                                <strong style={{ color: alertColor }}>
                                  Optimal: 0% utilization.
                                </strong>{" "}
                                No active credit outstanding — ideal credit score protection.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                </>
              );
            })()}
            <CCList
              items={state.creditCards}
              onRemove={(id: any) => removeItem("creditCards", id)}
              onEdit={setEditId}
              onUpdateCard={async (id: any, updates: any) => {
                try {
                  await updateItem("creditCards", id, updates);
                } catch (e: any) {
                  showToast?.(`Failed to update card: ${e?.message || "Unknown error"}`, "error");
                }
              }}
              onAdd={() => setModal("cc")}
              existingGroups={existingGroups}
            />
          </>
        )}
        {sub === "prepaid" && (
          <PrepaidList
            items={state.prepaidCards || []}
            onRemove={(id: any) => removeItem("prepaidCards", id)}
            onEdit={setEditId}
            onUpdateCard={async (id: any, updates: any) => {
              try {
                await updateItem("prepaidCards", id, updates);
              } catch (e: any) {
                showToast?.(`Failed to update card: ${e?.message || "Unknown error"}`, "error");
              }
            }}
            onAdd={() => setModal("prepaid")}
          />
        )}
        {sub === "taken" && (
          <LoanTakenList
            items={state.loansTaken || []}
            onRemove={(id: any) => removeItem("loansTaken", id)}
            onEdit={setEditId}
            onAdd={() => setModal("taken")}
          />
        )}
        {sub === "given" && (
          <LoanGivenList
            items={state.loansGiven || []}
            onRemove={(id: any) => removeItem("loansGiven", id)}
            onEdit={setEditId}
            onAdd={() => setModal("given")}
            onUpdate={async (id: any, patch: any) => {
              try {
                await updateItem("loansGiven", id, patch);
              } catch (e: any) {
                showToast?.(`Failed to update loan: ${e?.message || "Unknown error"}`, "error");
              }
            }}
          />
        )}
        {sub === "borrowed" && (
          <InformalLoanView
            direction="borrowed"
            items={state.informalBorrowed || []}
            onAddPerson={async (v: any) => {
              try {
                await addItem("informalBorrowed", v);
              } catch (e: any) {
                showToast?.(`Failed to add lender: ${e?.message || "Unknown error"}`, "error");
              }
            }}
            onUpdate={async (id: any, patch: any) => {
              try {
                await updateItem("informalBorrowed", id, patch);
              } catch (e: any) {
                showToast?.(`Failed to update: ${e?.message || "Unknown error"}`, "error");
              }
            }}
            onRemove={(id: any) => removeItem("informalBorrowed", id)}
            onEdit={setEditId}
          />
        )}
        {sub === "lent" && (
          <InformalLoanView
            direction="lent"
            items={state.informalLent || []}
            onAddPerson={async (v: any) => {
              try {
                await addItem("informalLent", v);
              } catch (e: any) {
                showToast?.(`Failed to add borrower: ${e?.message || "Unknown error"}`, "error");
              }
            }}
            onUpdate={async (id: any, patch: any) => {
              try {
                await updateItem("informalLent", id, patch);
              } catch (e: any) {
                showToast?.(`Failed to update: ${e?.message || "Unknown error"}`, "error");
              }
            }}
            onRemove={(id: any) => removeItem("informalLent", id)}
            onEdit={setEditId}
          />
        )}
        {sub === "optimizer" && <DebtPayoffOptimizer state={state} />}
      </div>

      {modal === "cc" && (
        <CCModal
          onClose={() => setModal(null)}
          onSave={saveNewCC}
          saving={savingNewCC}
          existingGroups={existingGroups}
        />
      )}
      {modal === "prepaid" && (
        <PrepaidModal onClose={() => setModal(null)} onSave={saveNewPrepaid} saving={savingNewPrepaid} />
      )}
      {modal === "taken" && (
        <LoanTakenModal
          onClose={() => setModal(null)}
          onSave={saveNewLoanTaken}
          saving={savingNewLoanTaken}
        />
      )}
      {modal === "given" && (
        <LoanGivenModal
          onClose={() => setModal(null)}
          onSave={saveNewLoanGiven}
          saving={savingNewLoanGiven}
        />
      )}

      {editId && sub === "cc" && (
        <CCModal
          initial={state.creditCards.find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => saveCCEdit(editId, v)}
          saving={savingCCEdit}
          existingGroups={existingGroups}
        />
      )}
      {editId && sub === "prepaid" && (
        <PrepaidModal
          initial={state.prepaidCards.find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => savePrepaidEdit(editId, v)}
          saving={savingPrepaidEdit}
        />
      )}
      {editId && sub === "taken" && (
        <LoanTakenModal
          initial={state.loansTaken.find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => saveLoanTakenEdit(editId, v)}
          saving={savingLoanTakenEdit}
        />
      )}
      {editId && sub === "given" && (
        <LoanGivenModal
          initial={state.loansGiven.find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => saveLoanGivenEdit(editId, v)}
          saving={savingLoanGivenEdit}
        />
      )}
      {editId && sub === "borrowed" && (
        <Modal title="Edit Lender" onClose={() => setEditId(null)}>
          <InformalPersonForm
            personLabel="Lender"
            initial={(state.informalBorrowed || []).find((x: any) => x.id === editId)}
            onSave={(v: any) => saveBorrowedEdit(editId, v)}
            onClose={() => setEditId(null)}
            saving={savingBorrowedEdit}
          />
        </Modal>
      )}
      {editId && sub === "lent" && (
        <Modal title="Edit Borrower" onClose={() => setEditId(null)}>
          <InformalPersonForm
            personLabel="Borrower"
            initial={(state.informalLent || []).find((x: any) => x.id === editId)}
            onSave={(v: any) => saveLentEdit(editId, v)}
            onClose={() => setEditId(null)}
            saving={savingLentEdit}
          />
        </Modal>
      )}
    </div>
  );
}

function CCEmptyState({ onAdd }: any) {
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: "var(--t-muted)",
        }}
      >
        <CreditCard size={40} strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        No Credit Cards Added Yet
      </div>
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          maxWidth: 380,
          margin: "0 auto 12px",
          lineHeight: 1.6,
        }}
      >
        Add your credit cards to track outstanding balances, monitor credit utilisation, never miss
        a due date, and review your spending.
      </div>
      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 24,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap" as const,
        }}
      >
        {[
          "Credit Limit Tracking",
          "Utilisation Monitor",
          "Bill & Due Dates",
          "Transaction Ledger",
        ].map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: THEME.accent,
                display: "inline-block",
              }}
            />{" "}
            {t}
          </span>
        ))}
      </div>
      <button
        style={{ ...btnSolid, display: "inline-flex", alignItems: "center", gap: 8 }}
        onClick={onAdd}
      >
        <Plus size={14} /> Add Credit Card
      </button>
    </Card>
  );
}

function PrepaidEmptyState({ onAdd }: any) {
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: "var(--t-muted)",
        }}
      >
        <Wallet size={40} strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        No Prepaid Cards Added Yet
      </div>
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          maxWidth: 380,
          margin: "0 auto 12px",
          lineHeight: 1.6,
        }}
      >
        Track your prepaid cards and digital wallets — Sodexo meal cards, Zeta, ICICI Prepaid, and
        more. Monitor loads, spends, and current balance.
      </div>
      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 24,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap" as const,
        }}
      >
        {[
          "Sodexo / Zeta / ICICI Prepaid",
          "Load & Spend Tracking",
          "Balance Monitor",
          "Transaction History",
        ].map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#0891b2",
                display: "inline-block",
              }}
            />{" "}
            {t}
          </span>
        ))}
      </div>
      <button
        style={{ ...btnSolid, display: "inline-flex", alignItems: "center", gap: 8 }}
        onClick={onAdd}
      >
        <Plus size={14} /> Add Prepaid Card
      </button>
    </Card>
  );
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function getNextFeeDate(c: any): { dateStr: string; daysLeft: number } | null {
  if (!Number(c.annualFee) || !c.feeMonth) return null;
  const now = new Date();
  const month = Number(c.feeMonth) - 1;
  const day = Number(c.feeDay) || 1;
  // Clamp to the last day of the fee month so a feeDay of 29/30/31 doesn't overflow
  // into the next month (e.g. Feb 31 -> Mar 3) when the fee month is shorter.
  const clampedDay = (year: number) => Math.min(day, new Date(year, month + 1, 0).getDate());
  let candidate = new Date(now.getFullYear(), month, clampedDay(now.getFullYear()));
  if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    candidate = new Date(now.getFullYear() + 1, month, clampedDay(now.getFullYear() + 1));
  }
  const daysLeft = Math.ceil(
    (candidate.getTime() - new Date(today() + "T00:00:00").getTime()) / 86400000
  );
  const dateStr = `${candidate.getDate()} ${MONTH_NAMES[month]}`;
  return { dateStr, daysLeft };
}

function CCList({
  items,
  onRemove,
  onEdit,
  onUpdateCard,
  onAdd,
  existingGroups: _existingGroups,
}: any) {
  const [selectedLedger, setSelectedLedger] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "closed">("active");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState(today());
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<any>(null);

  const activeCards = items.filter((c: any) => (c.status || "active").toLowerCase() !== "closed");
  const closedCards = items.filter((c: any) => (c.status || "active").toLowerCase() === "closed");
  const displayCards = viewMode === "active" ? activeCards : closedCards;
  const selectedCard = items.find((c: any) => c.id === selectedLedger);

  if (!items.length) return <CCEmptyState onAdd={onAdd} />;

  // Partition display cards into ungrouped and shared-pool groups
  const ungroupedCards: any[] = [];
  const groupedCards: Record<string, any[]> = {};
  displayCards.forEach((c: any) => {
    if (c.sharedGroup) {
      if (!groupedCards[c.sharedGroup]) groupedCards[c.sharedGroup] = [];
      groupedCards[c.sharedGroup].push(c);
    } else {
      ungroupedCards.push(c);
    }
  });

  const renderCard = (c: any) => {
    const isClosed = (c.status || "active").toLowerCase() === "closed";
    const util = Number(c.limit) ? (Number(c.outstanding) / Number(c.limit)) * 100 : 0;
    return (
      <div
        key={c.id}
        style={{
          ...cardDark,
          position: "relative",
          background: isClosed
            ? `linear-gradient(135deg, #3a3a42 0%, #2a2a32 100%)`
            : getCardGradient(c.issuer),
          paddingTop: isClosed ? 34 : 42,
          paddingBottom: isClosed ? 20 : 60,
          opacity: isClosed ? 0.8 : 1,
          filter: isClosed ? "grayscale(35%)" : "none",
          borderRadius: 16,
          boxShadow: isClosed ? "none" : "0 8px 30px rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          overflow: "hidden",
        }}
      >
        {/* Shimmer/Reflective Mesh Effect Overlay */}
        {!isClosed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(125deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Action buttons */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            gap: 6,
            alignItems: "center",
            zIndex: 10,
          }}
        >
          {!isClosed && closingId !== c.id && (
            <button
              onClick={() => {
                setClosingId(c.id);
                setCloseDate(today());
              }}
              title="Mark card as closed"
              style={{
                background: "rgba(239,68,68,0.22)",
                border: "1px solid rgba(239,68,68,0.45)",
                cursor: "pointer",
                color: "#ff9999",
                padding: "3px 9px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.05em",
              }}
            >
              CLOSE CARD
            </button>
          )}
          {isClosed && (
            <button
              onClick={() => onUpdateCard(c.id, { status: "active", closedDate: "" })}
              title="Reactivate card"
              style={{
                background: "rgba(34,197,94,0.2)",
                border: "1px solid rgba(34,197,94,0.45)",
                cursor: "pointer",
                color: "#a7f3d0",
                padding: "3px 9px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.05em",
              }}
            >
              REACTIVATE
            </button>
          )}
          <button
            onClick={() => onEdit(c.id)}
            aria-label="Edit card"
            className="icon-btn"
            style={{ ...iconBtn, color: "rgba(245,239,227,0.75)" }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setConfirmDeleteCard(c)}
            aria-label="Remove card"
            className="icon-btn danger"
            style={{ ...iconBtn, color: "rgba(245,239,227,0.75)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
        {closingId === c.id && (
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 12,
              background: "rgba(15,15,25,0.98)",
              border: "1px solid rgba(239,68,68,0.5)",
              borderRadius: 8,
              padding: "8px 10px",
              display: "flex",
              gap: 6,
              alignItems: "center",
              zIndex: 20,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}
          >
            <input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              aria-label="Card closed date"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 5,
                color: "#fff",
                fontSize: 11,
                padding: "4px 7px",
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                onUpdateCard(c.id, { status: "closed", closedDate: closeDate });
                setClosingId(null);
              }}
              style={{
                background: "rgba(239,68,68,0.3)",
                border: "1px solid rgba(239,68,68,0.5)",
                color: "#ff8080",
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 700,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              Confirm
            </button>
            <button
              onClick={() => setClosingId(null)}
              aria-label="Close"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                fontSize: 13,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Network logo + Bank Logo + owner badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BankLogo bankName={c.issuer} size={30} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <CardNetworkLogo network={c.network} />
              {(c.variants || []).map((v: any, vIdx: number) => (
                <React.Fragment key={v.id || vIdx}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700 }}>+</span>
                  <CardNetworkLogo network={v.network} />
                </React.Fragment>
              ))}
            </div>
          </div>
          <OwnerBadge owner={c.owner} />
        </div>

        {/* EMV Chip and Contactless indicator */}
        {!isClosed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 14,
              marginBottom: 4,
            }}
          >
            {/* EMV Chip */}
            <div
              style={{
                width: 34,
                height: 26,
                borderRadius: 6,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #fef3c7 100%)",
                position: "relative",
                opacity: 0.9,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.15)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 1,
                  background: "rgba(0,0,0,0.2)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: "rgba(0,0,0,0.2)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "25%",
                  right: "25%",
                  top: "25%",
                  bottom: "25%",
                  borderRadius: 2,
                  border: "1px solid rgba(0,0,0,0.15)",
                }}
              />
            </div>
            {/* Contactless Icon */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ transform: "rotate(90deg)" }}
            >
              <path d="M5 12a7 7 0 0 1 7-7" />
              <path d="M5 17a12 12 0 0 1 12-12" />
              <path d="M5 22a17 17 0 0 1 17-17" />
              <circle cx="5" cy="7" r="1.5" fill="currentColor" />
            </svg>

            {(c.variants || []).length > 0 && (
              <div
                style={{
                  marginLeft: "auto",
                  background: "rgba(255,255,255,0.14)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fef08a",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  letterSpacing: "0.02em",
                }}
              >
                <Sparkles size={10} /> Dual Variant Account ({(c.variants || []).length + 1} Cards)
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 12, letterSpacing: "-0.02em" }}>
          {c.issuer}
        </div>

        {/* Card Number(s) Display */}
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 15,
              letterSpacing: "0.08em",
              opacity: 0.95,
              fontFamily: "monospace",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>•••• •••• •••• {c.last4 || "••••"}</span>
            <span
              style={{
                fontSize: 9.5,
                padding: "1.5px 6px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.18)",
                color: "#fff",
                fontFamily: "var(--font-sans, sans-serif)",
                fontWeight: 700,
                letterSpacing: "normal",
              }}
            >
              Primary ({c.network})
            </span>
          </div>

          {(c.variants || []).map((v: any, vIdx: number) => (
            <div
              key={v.id || vIdx}
              style={{
                fontSize: 13.5,
                letterSpacing: "0.06em",
                marginTop: 4,
                opacity: 0.88,
                fontFamily: "monospace",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span>•••• •••• •••• {v.last4 || "••••"}</span>
              <span
                style={{
                  fontSize: 9.5,
                  padding: "1.5px 6px",
                  borderRadius: 4,
                  background: "rgba(254,240,138,0.2)",
                  color: "#fef08a",
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontWeight: 700,
                  letterSpacing: "normal",
                }}
              >
                {v.name || `${v.network} Variant`}
              </span>
            </div>
          ))}
        </div>
        {isClosed && c.closedDate && (
          <div
            style={{
              fontSize: 10.5,
              color: "rgba(255,140,140,0.85)",
              marginTop: 6,
              fontWeight: 600,
            }}
          >
            Closed on{" "}
            {new Date(c.closedDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 20,
            fontSize: 12,
          }}
        >
          <div>
            <div
              style={{
                color: "rgba(245,239,227,0.55)",
                fontSize: 9,
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              Outstanding
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: "-0.01em",
              }}
            >
              <Money value={c.outstanding} variant="full" />
            </div>
          </div>
          <div>
            <div
              style={{
                color: "rgba(245,239,227,0.55)",
                fontSize: 9,
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              {c.sharedGroup ? "Sub-Limit" : "Limit"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: "-0.01em",
              }}
            >
              <Money value={c.limit} variant="full" />
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            fontSize: 11.5,
            color: "rgba(245,239,227,0.8)",
          }}
        >
          <div>
            Bill Date:{" "}
            <strong style={{ color: "#fff" }}>{c.billDate ? `${c.billDate}th` : "—"}</strong>
          </div>
          <div>
            Due Day: <strong style={{ color: "#fff" }}>{c.dueDay ? `${c.dueDay}th` : "—"}</strong>
          </div>
          <div>
            Fee:{" "}
            <strong style={{ color: "#fff" }}>
              <Money value={c.annualFee} variant="exact" />
              {c.feeMonth
                ? ` · ${Number(c.feeDay) || 1} ${MONTH_NAMES[Number(c.feeMonth) - 1]}`
                : ""}
            </strong>
          </div>
          <div>
            Helpline: <strong style={{ color: "#fff" }}>{c.helpline || "—"}</strong>
          </div>
        </div>
        {c.waiverInfo && (
          <div
            style={{
              marginTop: 12,
              fontSize: 10.5,
              background: "rgba(255,255,255,0.08)",
              padding: "6px 10px",
              borderRadius: 6,
              color: THEME.gold,
              fontWeight: 500,
            }}
          >
            Waiver: {c.waiverInfo}
          </div>
        )}

        {!isClosed && Number(c.rewardPointsBalance) > 0 && (
          <div
            style={{
              marginTop: 12,
              fontSize: 10.5,
              background: "rgba(255,255,255,0.08)",
              padding: "6px 10px",
              borderRadius: 6,
              color: "rgba(255,255,255,0.85)",
              fontWeight: 500,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span>
              <strong style={{ color: "#fff" }}>
                <Prv>{Math.round(Number(c.rewardPointsBalance)).toLocaleString("en-IN")}</Prv>
              </strong>{" "}
              reward pts
            </span>
            {Number(c.rewardPointValue) > 0 && (
              <span style={{ color: THEME.gold, fontWeight: 700 }}>
                ≈ <Money value={Number(c.rewardPointsBalance) * Number(c.rewardPointValue)} variant="full" />
              </span>
            )}
          </div>
        )}

        {/* Billing cycle (statement) countdown — reuses getCCDueDate's day-of-month math
            by handing it the statement day under the `dueDay` field it reads. */}
        {!isClosed &&
          c.billDate &&
          (() => {
            const stmtDateStr = getCCDueDate({ dueDay: c.billDate });
            if (!stmtDateStr) return null;
            const todayMidnight = new Date(today() + "T00:00:00").getTime();
            const daysLeft = Math.ceil(
              (new Date(stmtDateStr + "T00:00:00").getTime() - todayMidnight) / 86400000
            );
            const label =
              daysLeft <= 0
                ? "Statement generates today"
                : daysLeft === 1
                  ? "Statement generates tomorrow"
                  : `Next statement in ${daysLeft} days`;
            return (
              <div
                style={{
                  marginTop: 12,
                  marginRight: 6,
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 10.5,
                  fontWeight: 500,
                  display: "inline-block",
                }}
              >
                {label}
              </div>
            );
          })()}

        {/* Due-date countdown — uses the shared getCCDueDate util (same source of truth as
            Reminders/Analytics/Alerts/Notifications) instead of a local reimplementation.
            Cards with Autopay enabled get a calm confirmation badge instead of an urgency one. */}
        {!isClosed &&
          c.dueDay &&
          (() => {
            const dueDateStr = getCCDueDate(c);
            if (!dueDateStr) return null;
            const todayMidnight = new Date(today() + "T00:00:00").getTime();
            const daysLeft = Math.ceil(
              (new Date(dueDateStr + "T00:00:00").getTime() - todayMidnight) / 86400000
            );

            if (c.autoPay) {
              return (
                <div
                  style={{
                    marginTop: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "rgba(34,197,94,0.18)",
                    color: "#86efac",
                    fontSize: 10.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <CheckCircle2 size={11} /> Autopay ON · due{" "}
                  {daysLeft <= 0 ? "today" : `in ${daysLeft}d`}
                </div>
              );
            }

            const isUrgent = daysLeft <= 3;
            const isWarning = daysLeft <= 7 && daysLeft > 3;

            const badgeBg = isUrgent
              ? "rgba(239, 68, 68, 0.25)"
              : isWarning
                ? "rgba(245, 158, 11, 0.25)"
                : "rgba(255, 255, 255, 0.12)";
            const badgeColor = isUrgent
              ? "#ff8888"
              : isWarning
                ? "#fbbf24"
                : "rgba(255,255,255,0.85)";
            const label =
              daysLeft <= 0
                ? "Due today!"
                : daysLeft === 1
                  ? "Due tomorrow!"
                  : `Payment due in ${daysLeft} days`;
            return (
              <div
                style={{
                  marginTop: 12,
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: badgeBg,
                  color: badgeColor,
                  fontSize: 10.5,
                  fontWeight: daysLeft <= 7 ? 800 : 500,
                  display: "inline-block",
                }}
              >
                {label}
              </div>
            );
          })()}

        {/* Annual fee countdown */}
        {!isClosed &&
          (() => {
            const fee = getNextFeeDate(c);
            if (!fee) return null;
            const { dateStr, daysLeft } = fee;
            const isUrgent = daysLeft <= 7;
            const isWarning = daysLeft <= 30 && daysLeft > 7;

            const badgeBg = isUrgent
              ? "rgba(239, 68, 68, 0.25)"
              : isWarning
                ? "rgba(245, 158, 11, 0.25)"
                : "rgba(255, 255, 255, 0.12)";
            const badgeColor = isUrgent
              ? "#ff8888"
              : isWarning
                ? "#fbbf24"
                : "rgba(255,255,255,0.85)";
            const label = (
              <>
                Annual fee <Money value={c.annualFee} variant="exact" />{" "}
                {daysLeft === 0
                  ? "due today!"
                  : daysLeft === 1
                    ? "due tomorrow!"
                    : `on ${dateStr} (${daysLeft}d)`}
              </>
            );
            return (
              <div
                style={{
                  marginTop: 6,
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: badgeBg,
                  color: badgeColor,
                  fontSize: 10.5,
                  fontWeight: daysLeft <= 30 ? 800 : 400,
                  display: "inline-block",
                }}
              >
                {label}
              </div>
            );
          })()}

        {/* Sub-limit utilization bar — active cards only */}
        {!isClosed && (
          <div style={{ marginTop: 18 }}>
            <div
              className="progress-track"
              style={{ height: 5, background: "rgba(255,255,255,0.2)", borderRadius: 2.5 }}
            >
              <div
                className="progress-fill"
                style={{
                  width: `${Math.max(0, Math.min(util, 100))}%`,
                  background:
                    util > 70
                      ? "linear-gradient(90deg, var(--t-rust), color-mix(in srgb, var(--t-rust) 75%, white))"
                      : util > 40
                        ? "linear-gradient(90deg, var(--t-gold), color-mix(in srgb, var(--t-gold) 75%, white))"
                        : "linear-gradient(90deg, var(--t-sage), color-mix(in srgb, var(--t-sage) 75%, white))",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: util > 70 ? "#ff8888" : util > 40 ? "#fbbf24" : "#6ee7b7",
                marginTop: 6,
              }}
            >
              {util.toFixed(1)}% of {c.sharedGroup ? "sub-limit" : "limit"} used
            </div>
          </div>
        )}

        {/* Transactions button */}
        {!isClosed && (
          <button
            onClick={() => setSelectedLedger(c.id)}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              border: "none",
              borderTop: `1px solid rgba(255,255,255,0.12)`,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 11.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            }}
          >
            <List size={14} /> View Transactions ({c.transactions?.length || 0})
          </button>
        )}
        {isClosed && (c.transactions?.length || 0) > 0 && (
          <button
            onClick={() => setSelectedLedger(c.id)}
            style={{
              marginTop: 14,
              width: "100%",
              padding: "8px 0",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid rgba(255,255,255,0.12)`,
              borderRadius: 8,
              color: "rgba(255,255,255,0.75)",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
          >
            <List size={12} /> View History ({c.transactions.length} txns)
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Active / Closed toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        {(["active", "closed"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: "6px 18px",
              borderRadius: 20,
              border: viewMode === mode ? "none" : `1.5px solid var(--t-line)`,
              background:
                viewMode === mode
                  ? mode === "active"
                    ? "var(--t-accent)"
                    : "var(--t-muted)"
                  : "transparent",
              color: viewMode === mode ? "#fff" : "var(--t-muted)",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {mode === "active"
              ? `Active (${activeCards.length})`
              : `Closed (${closedCards.length})`}
          </button>
        ))}
      </div>

      {displayCards.length === 0 && (
        <Card style={{ padding: "40px 32px", textAlign: "center" as const }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--t-muted)",
            }}
          >
            <CreditCard size={36} strokeWidth={1.5} />
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 6,
              letterSpacing: "-0.02em",
            }}
          >
            {viewMode === "active" ? "No Active Credit Cards" : "No Closed Credit Cards"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 340,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            {viewMode === "active"
              ? "All your credit cards are currently closed. Add a new card or check the Closed tab."
              : "No closed credit cards yet. Cards you close will appear here."}
          </div>
        </Card>
      )}

      {/* Ungrouped cards render as a flat grid */}
      {ungroupedCards.length > 0 && <Grid>{ungroupedCards.map(renderCard)}</Grid>}

      {/* Shared limit pool sections */}
      {Object.entries(groupedCards).map(([groupName, cards]) => {
        const groupLimit = Math.max(...cards.map((c: any) => Number(c.sharedGroupLimit) || 0));
        const groupOutstanding = cards.reduce(
          (s: number, c: any) => s + (Number(c.outstanding) || 0),
          0
        );
        const groupUtil = groupLimit > 0 ? (groupOutstanding / groupLimit) * 100 : 0;
        const groupAvailable = Math.max(0, groupLimit - groupOutstanding);
        const barColor = groupUtil > 70 ? THEME.rust : groupUtil > 30 ? THEME.gold : THEME.sage;
        return (
          <div key={groupName} style={{ marginBottom: 32 }}>
            {/* Shared pool banner */}
            <div
              style={{
                marginBottom: 16,
                padding: "18px 22px",
                borderRadius: 16,
                background: "var(--t-card-bg)",
                border: `1.5px solid color-mix(in srgb, ${barColor} 30%, transparent)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: THEME.muted,
                      fontWeight: 800,
                      marginBottom: 4,
                    }}
                  >
                    Shared Credit Pool
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: THEME.ink,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {groupName}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2, fontWeight: 500 }}>
                    {cards.length} card{cards.length !== 1 ? "s" : ""} sharing this pool
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 26,
                      fontWeight: 600,
                      color: barColor,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {groupUtil.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                    of pool used
                  </div>
                </div>
              </div>
              <div
                className="progress-track"
                style={{
                  height: 8,
                  borderRadius: 4,
                  marginBottom: 12,
                }}
              >
                <div
                  className="progress-fill"
                  style={{
                    height: "100%",
                    width: `${Math.min(groupUtil, 100)}%`,
                    background: `linear-gradient(90deg, ${barColor}, color-mix(in srgb, ${barColor} 65%, white))`,
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 2,
                      fontWeight: 700,
                    }}
                  >
                    Pool Limit
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: THEME.ink }}>
                    {groupLimit > 0 ? <Money value={groupLimit} variant="full" /> : "—"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 2,
                      fontWeight: 700,
                    }}
                  >
                    Combined Used
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: barColor }}>
                    <Money value={groupOutstanding} variant="full" />
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 2,
                      fontWeight: 700,
                    }}
                  >
                    Available
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: THEME.sage }}>
                    {groupLimit > 0 ? <Money value={groupAvailable} variant="full" /> : "—"}
                  </div>
                </div>
              </div>
              {groupLimit === 0 && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11,
                    color: THEME.gold,
                    background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontWeight: 500,
                  }}
                >
                  Set the Pool Limit on any card in this group to track combined utilization.
                </div>
              )}
            </div>
            <Grid>{cards.map(renderCard)}</Grid>
          </div>
        );
      })}

      {selectedLedger && selectedCard && (
        <CCTransactionLedger
          card={selectedCard}
          onClose={() => setSelectedLedger(null)}
          onUpdate={(newTransactions: any) => {
            // Don't clamp to 0: a negative net (payments/refunds exceeding charges)
            // is a legitimate credit balance owed back to the cardholder and must
            // be preserved, not hidden as 0 outstanding.
            const newOutstanding = newTransactions.reduce(
              (acc: number, t: any) => acc + Number(t.amount),
              0
            );
            onUpdateCard(selectedLedger, {
              transactions: newTransactions,
              outstanding: String(newOutstanding),
            });
          }}
        />
      )}
      {confirmDeleteCard && (
        <ConfirmDialog
          message={`Delete "${confirmDeleteCard.issuer || "this card"}${confirmDeleteCard.last4 ? ` ····${confirmDeleteCard.last4}` : ""}" and its entire transaction ledger? This cannot be undone.`}
          onConfirm={() => {
            onRemove(confirmDeleteCard.id);
            setConfirmDeleteCard(null);
          }}
          onCancel={() => setConfirmDeleteCard(null)}
        />
      )}
    </div>
  );
}

function CCTransactionLedger({ card, onClose, onUpdate }: any) {
  const { ccTransactionCategories: cats } = useMasterData();
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<any>(null);

  const variantOptions = React.useMemo(() => {
    const opts = [
      {
        id: "primary",
        name: `Primary (${card.network || "Card"}${card.last4 ? ` •••• ${card.last4}` : ""})`,
        shortName: `Primary (${card.network || "Card"})`,
        network: card.network,
        last4: card.last4,
      },
    ];
    (card.variants || []).forEach((v: any, idx: number) => {
      opts.push({
        id: v.id || `variant-${idx}`,
        name: `${v.name || v.network || "Variant"}${v.last4 ? ` (•••• ${v.last4})` : ""}`,
        shortName: v.name || v.network || "Variant",
        network: v.network,
        last4: v.last4,
      });
    });
    return opts;
  }, [card]);

  const initTxs = React.useMemo(() => {
    const existing = card.transactions || [];
    if (existing.length === 0 && Number(card.outstanding) > 0) {
      return [
        {
          id: `ob-${card.id}`,
          date: today(),
          merchant: "Opening Balance",
          amount: String(card.outstanding),
          category: "General",
          variantId: "primary",
          variantName: variantOptions[0]?.name,
        },
      ];
    }
    return existing;
  }, [card, variantOptions]);

  const [txs, setTxs] = useState(initTxs);
  const [showAdd, setShowAdd] = useState(false);
  const [variantFilter, setVariantFilter] = useState<string>("all");

  React.useEffect(() => {
    if ((card.transactions || []).length === 0 && Number(card.outstanding) > 0) {
      onUpdate(initTxs);
    }
  }, [card.transactions, card.outstanding, initTxs, onUpdate]);

  const [newTx, setNewTx] = useState({
    date: today(),
    merchant: "",
    amount: "",
    category: cats[0] || "General",
    variantId: "primary",
    variantName: variantOptions[0]?.name || "Primary",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [importDone, setImportDone] = useState(false);

  const totalOutstanding = txs.reduce((acc: any, t: any) => acc + Number(t.amount), 0);
  const totalCharges = txs
    .filter((t: any) => Number(t.amount) > 0)
    .reduce((s: any, t: any) => s + Number(t.amount), 0);

  const variantSpends = React.useMemo(() => {
    if (variantOptions.length <= 1) return null;
    const map: Record<string, number> = {};
    variantOptions.forEach((opt) => {
      map[opt.id] = 0;
    });
    txs.forEach((t: any) => {
      const amt = Number(t.amount) || 0;
      if (amt > 0) {
        const matched =
          variantOptions.find(
            (o) =>
              o.id === t.variantId ||
              (o.last4 && o.last4 === t.variantId) ||
              (o.name && o.name === t.variantName)
          ) || variantOptions[0];
        map[matched.id] = (map[matched.id] || 0) + amt;
      }
    });
    return map;
  }, [txs, variantOptions]);

  const displayedTxs = React.useMemo(() => {
    if (variantFilter === "all") return txs;
    if (variantFilter === "primary") {
      return txs.filter(
        (t: any) =>
          !t.variantId ||
          t.variantId === "primary" ||
          (card.last4 && t.variantId === card.last4)
      );
    }
    return txs.filter(
      (t: any) =>
        t.variantId === variantFilter ||
        t.variantName === variantFilter ||
        (t.variantId && variantOptions.find((o) => o.id === variantFilter)?.last4 === t.variantId)
    );
  }, [txs, variantFilter, card, variantOptions]);

  const saveTx = () => {
    if (!newTx.merchant || !newTx.amount) return;
    const selectedOpt =
      variantOptions.find((o) => o.id === newTx.variantId) || variantOptions[0];
    const txToSave = {
      ...newTx,
      variantName: selectedOpt?.name || "Primary",
    };
    const updated = editId
      ? txs.map((t: any) => (t.id === editId ? { ...txToSave, id: editId } : t))
      : [...txs, { ...txToSave, id: uid() }];
    setTxs(updated);
    onUpdate(updated);
    setShowAdd(false);
    setEditId(null);
    setNewTx({
      date: today(),
      merchant: "",
      amount: "",
      category: cats[0] || "General",
      variantId: "primary",
      variantName: variantOptions[0]?.name || "Primary",
    });
  };

  const removeTx = (id: any) => {
    const updated = txs.filter((t: any) => t.id !== id);
    setTxs(updated);
    onUpdate(updated);
  };

  const startEdit = (t: any) => {
    setNewTx({
      date: t.date,
      merchant: t.merchant,
      amount: t.amount,
      category: t.category || "General",
      variantId: t.variantId || "primary",
      variantName: t.variantName || variantOptions[0]?.name || "Primary",
    });
    setEditId(t.id);
    setShowAdd(true);
    setShowCsvImport(false);
  };

  const parseCsvText = (text: string) => {
    setCsvError("");
    setCsvPreview([]);
    setImportDone(false);
    try {
      let lines = text
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) {
        setCsvError("No data rows found. See format below.");
        return;
      }
      const firstCol = lines[0].split(",")[0].trim().replace(/^"|"$/g, "");
      if (!firstCol.match(/^\d{4}-\d{2}-\d{2}$/) && /^date$/i.test(firstCol)) {
        lines = lines.slice(1);
      }
      if (!lines.length) {
        setCsvError("No data rows found. See format below.");
        return;
      }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) throw new Error(`Row ${i + 1}: need at least date, merchant, amount`);
        const [date, merchant, amount, category, variantTag] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD (got "${date}")`);
        const amt = Number(amount);
        if (isNaN(amt)) throw new Error(`Row ${i + 1}: amount must be a number`);

        let matchedVariant = variantOptions[0];
        if (variantTag) {
          const vClean = variantTag.toLowerCase();
          const found = variantOptions.find(
            (o) =>
              (o.last4 && vClean.includes(o.last4)) ||
              (o.name && o.name.toLowerCase().includes(vClean)) ||
              (o.network && o.network.toLowerCase().includes(vClean))
          );
          if (found) matchedVariant = found;
        }

        return {
          date,
          merchant: merchant || "Unknown",
          amount: amt,
          category: category || "General",
          variantId: matchedVariant.id,
          variantName: matchedVariant.name,
          id: `cctx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        };
      });
      setCsvPreview(rows);
    } catch (e: any) {
      setCsvError(e.message);
    }
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const importCsv = () => {
    if (!csvPreview.length) return;
    const updated = [...txs, ...csvPreview];
    setTxs(updated);
    onUpdate(updated);
    setImportDone(true);
    setCsvPreview([]);
    setCsvText("");
    setCsvFileName("");
    setTimeout(() => {
      setShowCsvImport(false);
      setImportDone(false);
    }, 1400);
  };

  const downloadTemplate = () => {
    const hasMultiple = variantOptions.length > 1;
    const content = hasMultiple
      ? `# Credit Card Transaction Import Template (Single Account with Variants)\n# Columns: date, merchant, amount, category, card_variant\n# date = YYYY-MM-DD | positive amount = charge, negative = payment/credit\n# card_variant = last 4 digits (e.g. ${variantOptions[0].last4 || "4589"} or ${variantOptions[1]?.last4 || "7890"}) or variant name\n2025-01-05,Amazon,2499,Shopping,${variantOptions[0].last4 || "Primary"}\n2025-01-08,Swiggy UPI,450,Food,${variantOptions[1]?.last4 || "RuPay"}\n2025-01-10,BookMyShow,800,Entertainment,${variantOptions[0].last4 || "Primary"}\n2025-01-12,Uber UPI,320,Transport,${variantOptions[1]?.last4 || "RuPay"}\n2025-01-15,Bill Payment,-5000,Payment,Primary`
      : "# Credit Card Transaction Import Template\n# Columns: date, merchant, amount, category\n# date = YYYY-MM-DD | positive amount = charge, negative = payment/credit\n2025-01-05,Amazon,2499,Shopping\n2025-01-08,Swiggy,450,Food\n2025-01-10,BookMyShow,800,Entertainment\n2025-01-12,Uber,320,Transport\n2025-01-15,Bill Payment,-5000,Payment";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cc_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const hasMultiple = variantOptions.length > 1;
    const header = hasMultiple
      ? "date,merchant,amount,category,card_variant"
      : "date,merchant,amount,category";
    const rows = [...txs]
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map((t: any) => {
        const opt =
          variantOptions.find(
            (o) =>
              o.id === t.variantId ||
              (o.last4 && o.last4 === t.variantId) ||
              (o.name && o.name === t.variantName)
          ) || variantOptions[0];
        const base = `${t.date},"${(t.merchant || "").replace(/"/g, '""')}",${t.amount},"${(t.category || "General").replace(/"/g, '""')}"`;
        return hasMultiple ? `${base},"${(opt.name || "Primary").replace(/"/g, '""')}"` : base;
      });
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(card.issuer || "card").replace(/\s+/g, "_")}_transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Modal title={`${card.issuer} — Consolidated Statement & Transactions`} onClose={onClose} maxWidth={940}>
        {variantOptions.length > 1 && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(254,240,138,0.08)",
              border: "1px solid rgba(254,240,138,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: THEME.ink }}>
              <Sparkles size={15} color="#fef08a" />
              <span>
                <strong>Dual-Variant Unified Account:</strong> Single consolidated bill & shared limit of{" "}
                <strong><Money value={card.limit} variant="full" /></strong>
              </span>
            </div>
            <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
              {variantOptions.length} Cards Linked
            </span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            {
              label: "Total Consolidated Charges",
              value: <Money value={totalCharges} variant="full" />,
              color: THEME.rust,
              bg: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
              border: `color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
            },
            {
              label: "Consolidated Statement Outstanding",
              value: <Money value={totalOutstanding} variant="full" />,
              color: totalOutstanding > 0 ? THEME.rust : THEME.sage,
              bg:
                totalOutstanding > 0
                  ? `color-mix(in srgb, ${THEME.rust} 8%, transparent)`
                  : `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
              border:
                totalOutstanding > 0
                  ? `color-mix(in srgb, ${THEME.rust} 20%, transparent)`
                  : `color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: 14,
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 10,
                textAlign: "center" as const,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 800,
                  color: s.color,
                  marginTop: 4,
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {variantSpends && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Spend Breakdown:
            </div>
            {variantOptions.map((opt) => {
              const spent = variantSpends[opt.id] || 0;
              const pct = totalCharges > 0 ? ((spent / totalCharges) * 100).toFixed(0) : "0";
              return (
                <div
                  key={opt.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 10px",
                    borderRadius: 16,
                    background: opt.id === "primary" ? "rgba(255,255,255,0.06)" : "rgba(254,240,138,0.1)",
                    border: `1px solid ${opt.id === "primary" ? THEME.line : "rgba(254,240,138,0.25)"}`,
                    fontSize: 11.5,
                  }}
                >
                  <CreditCard size={12} color={opt.id === "primary" ? THEME.accent : "#fef08a"} />
                  <span style={{ fontWeight: 600, color: THEME.ink }}>{opt.shortName}:</span>
                  <span style={{ fontWeight: 700, color: THEME.rust }}><Money value={spent} variant="exact" /></span>
                  <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 500 }}>({pct}%)</span>
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              Transactions{" "}
              <span style={{ fontSize: 11, fontWeight: 400, color: THEME.muted, marginLeft: 4 }}>
                ({displayedTxs.length} of {txs.length})
              </span>
            </div>

            {variantOptions.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setVariantFilter("all")}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 14,
                    border: variantFilter === "all" ? "none" : `1px solid ${THEME.line}`,
                    background: variantFilter === "all" ? THEME.accent : "transparent",
                    color: variantFilter === "all" ? THEME.darkInk : THEME.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  All Variants
                </button>
                {variantOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVariantFilter(opt.id)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 14,
                      border: variantFilter === opt.id ? "none" : `1px solid ${THEME.line}`,
                      background: variantFilter === opt.id ? THEME.accent : "transparent",
                      color: variantFilter === opt.id ? THEME.darkInk : THEME.muted,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {opt.shortName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, justifyContent: "flex-end" }}
          >
            <button
              style={{
                ...btnGhost,
                fontSize: 12,
                padding: "6px 14px",
                color: THEME.accent,
                borderColor: `color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
              }}
              onClick={() => {
                setShowCsvImport((v) => !v);
                setShowAdd(false);
              }}
            >
              <Upload size={13} /> Import CSV
            </button>
            {txs.length > 0 && (
              <button
                style={{
                  ...btnGhost,
                  fontSize: 12,
                  padding: "6px 14px",
                  color: THEME.sage,
                  borderColor: `color-mix(in srgb, ${THEME.sage} 33%, transparent)`,
                }}
                onClick={downloadCsv}
              >
                <Download size={13} /> Export CSV
              </button>
            )}
            <button
              style={{ ...btnGhost, fontSize: 12, padding: "6px 14px" }}
              onClick={() => {
                if (showAdd) {
                  setShowAdd(false);
                  setEditId(null);
                  setNewTx({
                    date: today(),
                    merchant: "",
                    amount: "",
                    category: cats[0] || "General",
                    variantId: "primary",
                    variantName: variantOptions[0]?.name || "Primary",
                  });
                } else {
                  setShowAdd(true);
                  setShowCsvImport(false);
                }
              }}
            >
              {showAdd ? (
                "Cancel"
              ) : (
                <>
                  <Plus size={14} /> Add Transaction
                </>
              )}
            </button>
          </div>
        </div>

        {showCsvImport && (
          <div
            style={{
              padding: 18,
              borderRadius: 12,
              marginBottom: 16,
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 22%, transparent)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: THEME.accent,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FileText size={15} /> Bulk Import via CSV
              </div>
              <button
                onClick={downloadTemplate}
                className="card-interactive"
                style={{
                  fontSize: 11,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: `1px solid color-mix(in srgb, ${THEME.accent} 30%, transparent)`,
                  background: "transparent",
                  color: THEME.accent,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Download Template
              </button>
            </div>
            <div
              style={{
                fontSize: 11,
                color: THEME.muted,
                marginBottom: 12,
                padding: "8px 12px",
                background: "rgba(128,128,128,0.06)",
                borderRadius: 8,
                lineHeight: 1.6,
              }}
            >
              <b style={{ color: THEME.ink }}>Format:</b>{" "}
              <code
                style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}
              >
                date, merchant, amount, category{variantOptions.length > 1 ? ", card_variant" : ""}
              </code>
              <br />
              Charge:{" "}
              <code
                style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}
              >
                2025-01-05, Amazon, 2499, Shopping{variantOptions.length > 1 ? `, ${variantOptions[0].last4 || "Primary"}` : ""}
              </code>
              &nbsp;&nbsp;Payment:{" "}
              <code
                style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}
              >
                2025-01-15, Bill Payment, -5000, Payment
              </code>
            </div>
            <label
              style={{
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "20px 0",
                border: `1.5px dashed color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
                borderRadius: 10,
                cursor: "pointer",
                marginBottom: 12,
                background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload size={22} color={THEME.accent} />
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.accent }}>
                {csvFileName || "Drop CSV file here or click to browse"}
              </div>
              <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
              <input
                type="file"
                accept=".csv,.txt"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </label>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: THEME.muted,
                marginBottom: 6,
                textAlign: "center" as const,
              }}
            >
              — or paste CSV text below —
            </div>
            <textarea
              aria-label="Pasted CSV text"
              style={{
                width: "100%",
                minHeight: 90,
                padding: "10px 12px",
                background: "var(--t-paper)",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 10,
                color: THEME.ink,
                fontSize: 12,
                fontFamily: "monospace",
                resize: "vertical" as const,
                boxSizing: "border-box" as const,
              }}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setCsvPreview([]);
                setCsvError("");
                setImportDone(false);
              }}
              placeholder={
                variantOptions.length > 1
                  ? `2025-01-05, Amazon, 2499, Shopping, ${variantOptions[0].last4 || "Primary"}\n2025-01-08, Swiggy UPI, 450, Food, ${variantOptions[1]?.last4 || "RuPay"}\n2025-01-15, Bill Payment, -5000, Payment, Primary`
                  : "2025-01-05, Amazon, 2499, Shopping\n2025-01-08, Swiggy, 450, Food\n2025-01-15, Bill Payment, -5000, Payment"
              }
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                className="card-interactive"
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: `1px solid color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
                  background: "transparent",
                  color: THEME.accent,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
                onClick={() => parseCsvText(csvText)}
              >
                Preview Data
              </button>
              {csvPreview.length > 0 && !importDone && (
                <button
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "none",
                    background: THEME.accent,
                    color: THEME.darkInk,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  onClick={importCsv}
                >
                  Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
                </button>
              )}
              {importDone && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: THEME.sage,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={15} /> Imported successfully!
                </div>
              )}
            </div>
            {csvError && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  color: THEME.rust,
                  fontSize: 12,
                  padding: "8px 12px",
                  background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                  borderRadius: 8,
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
              </div>
            )}
            {csvPreview.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`,
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.accent,
                  }}
                >
                  {csvPreview.length} rows ready to import — preview:
                </div>
                <div style={{ maxHeight: 180, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "rgba(128,128,128,0.04)", color: THEME.muted }}>
                        <th
                          style={{
                            padding: "7px 10px",
                            textAlign: "left" as const,
                            fontWeight: 600,
                            fontSize: 10,
                          }}
                        >
                          Date
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            textAlign: "left" as const,
                            fontWeight: 600,
                            fontSize: 10,
                          }}
                        >
                          Merchant
                        </th>
                        {variantOptions.length > 1 && (
                          <th
                            style={{
                              padding: "7px 10px",
                              textAlign: "left" as const,
                              fontWeight: 600,
                              fontSize: 10,
                            }}
                          >
                            Variant
                          </th>
                        )}
                        <th
                          style={{
                            padding: "7px 10px",
                            textAlign: "left" as const,
                            fontWeight: 600,
                            fontSize: 10,
                          }}
                        >
                          Category
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            textAlign: "right" as const,
                            fontWeight: 600,
                            fontSize: 10,
                          }}
                        >
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((r, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                          <td style={{ padding: "7px 10px", color: THEME.muted }}>{r.date}</td>
                          <td style={{ padding: "7px 10px", fontWeight: 600 }}>{r.merchant}</td>
                          {variantOptions.length > 1 && (
                            <td style={{ padding: "7px 10px" }}>
                              <span
                                style={{
                                  background: "rgba(255,255,255,0.08)",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  color: r.variantId === "primary" ? THEME.ink : "#fef08a",
                                  fontWeight: 600,
                                }}
                              >
                                {r.variantName || "Primary"}
                              </span>
                            </td>
                          )}
                          <td style={{ padding: "7px 10px", color: THEME.muted }}>
                            {r.category || "—"}
                          </td>
                          <td
                            style={{
                              padding: "7px 10px",
                              textAlign: "right" as const,
                              fontWeight: 700,
                              color: Number(r.amount) >= 0 ? THEME.rust : THEME.sage,
                            }}
                          >
                            {Number(r.amount) >= 0 ? "+" : ""}
                            <Money value={r.amount} variant="exact" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {showAdd && (
          <div
            style={{
              background: "var(--surface-1)",
              border: `1px solid ${THEME.line}`,
              borderRadius: 10,
              marginBottom: 16,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: THEME.accent }}>
              {editId ? "EDIT TRANSACTION" : "NEW TRANSACTION"}
            </div>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}
            >
              <Field label="Date">
                <input
                  type="date"
                  style={input}
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                />
              </Field>
              <Field label="Amount (negative = payment)">
                <input
                  type="number"
                  style={input}
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  placeholder="e.g. 2499 or -5000"
                />
              </Field>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: variantOptions.length > 1 ? "1.5fr 1fr 1fr" : "1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Field label="Merchant">
                <input
                  type="text"
                  style={input}
                  value={newTx.merchant}
                  onChange={(e) => setNewTx({ ...newTx, merchant: e.target.value })}
                  placeholder="e.g. Amazon"
                />
              </Field>
              <Field label="Category">
                <select
                  style={input}
                  value={newTx.category}
                  onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                >
                  {cats.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              {variantOptions.length > 1 && (
                <Field label="Card Variant">
                  <select
                    style={input}
                    value={newTx.variantId || "primary"}
                    onChange={(e) =>
                      setNewTx({
                        ...newTx,
                        variantId: e.target.value,
                        variantName:
                          variantOptions.find((o) => o.id === e.target.value)?.name || "Primary",
                      })
                    }
                  >
                    {variantOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <button style={{ ...btnAccent, width: "100%" }} onClick={saveTx}>
              {editId ? "Update Transaction" : "Save Transaction"}
            </button>
          </div>
        )}

        {/* Transaction Table */}
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          <DataTable
            columns={[
              { key: "date", header: "Date", accessor: (t: any) => t.date },
              {
                key: "merchant",
                header: "Merchant",
                accessor: (t: any) => (
                  <span style={{ fontWeight: 600, color: THEME.ink }}>{t.merchant}</span>
                ),
              },
              ...(variantOptions.length > 1
                ? [
                    {
                      key: "variant",
                      header: "Card Variant",
                      accessor: (t: any) => {
                        const opt =
                          variantOptions.find(
                            (o) =>
                              o.id === t.variantId ||
                              (o.last4 && o.last4 === t.variantId) ||
                              (o.name && o.name === t.variantName)
                          ) || variantOptions[0];
                        const isPrimary = !t.variantId || t.variantId === "primary";
                        return (
                          <span
                            style={{
                              background: isPrimary
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(254,240,138,0.18)",
                              color: isPrimary ? THEME.muted : "#fef08a",
                              padding: "2px 7px",
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <CreditCard size={11} /> {opt?.shortName || "Primary"}
                          </span>
                        );
                      },
                    },
                  ]
                : []),
              {
                key: "category",
                header: "Category",
                accessor: (t: any) => (
                  <span
                    style={{
                      background: THEME.paper,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    {t.category || "General"}
                  </span>
                ),
              },
              {
                key: "amount",
                header: "Amount",
                align: "right",
                accessor: (t: any) => (
                  <span
                    style={{
                      fontWeight: 700,
                      color: Number(t.amount) >= 0 ? THEME.rust : THEME.sage,
                    }}
                  >
                    <Money value={t.amount} variant="exact" />
                  </span>
                ),
              },
            ]}
            data={[...displayedTxs].sort((a: any, b: any) => b.date.localeCompare(a.date))}
            hideSearch
            keyExtractor={(t: any) => t.id}
            emptyState={<span>No transactions yet — add manually or import CSV above</span>}
            actions={(t: any) => (
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => startEdit(t)}
                  aria-label="Edit transaction"
                  className="icon-btn"
                  style={{ ...iconBtn, color: THEME.muted }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmDeleteTx(t)}
                  aria-label="Delete transaction"
                  className="icon-btn danger"
                  style={{ ...iconBtn, color: THEME.rust }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          />
        </div>
      </Modal>
      {confirmDeleteTx && (
        <ConfirmDialog
          message={`Delete transaction "${confirmDeleteTx.merchant}" (${confirmDeleteTx.amount})?`}
          onConfirm={() => {
            removeTx(confirmDeleteTx.id);
            setConfirmDeleteTx(null);
          }}
          onCancel={() => setConfirmDeleteTx(null)}
        />
      )}
    </>
  );
}

function PrepaidList({ items, onRemove, onEdit, onUpdateCard, onAdd }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "closed">("active");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState(today());
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<any>(null);
  const selected = items.find((c: any) => c.id === selectedId);

  const computeStats = (txns: any[]) => {
    const loaded = (txns || [])
      .filter((t: any) => t.type === "load")
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    const spent = (txns || [])
      .filter((t: any) => t.type === "spend")
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    return { loaded, spent, balance: loaded - spent };
  };

  const activeCards = items.filter((p: any) => (p.status || "active").toLowerCase() !== "closed");
  const closedCards = items.filter((p: any) => (p.status || "active").toLowerCase() === "closed");
  const displayCards = viewMode === "active" ? activeCards : closedCards;

  if (!items.length) return <PrepaidEmptyState onAdd={onAdd} />;

  const totalBalance = activeCards.reduce((s: number, p: any) => {
    const { balance } = computeStats(p.transactions);
    return s + balance;
  }, 0);
  const totalLoaded = activeCards.reduce((s: number, p: any) => {
    const { loaded } = computeStats(p.transactions);
    return s + loaded;
  }, 0);
  const totalSpent = activeCards.reduce((s: number, p: any) => {
    const { spent } = computeStats(p.transactions);
    return s + spent;
  }, 0);

  const prepaidStats = [
    {
      label: "Combined Balance",
      value: fmtINRFull(totalBalance),
      numericValue: totalBalance,
      sub: `${activeCards.length} active card${activeCards.length !== 1 ? "s" : ""}`,
      color: THEME.sage,
      icon: <Wallet />,
    },
    {
      label: "Total Loaded",
      value: fmtINRFull(totalLoaded),
      numericValue: totalLoaded,
      sub: "Total funds loaded into cards",
      color: THEME.accent,
      icon: <ArrowUp />,
    },
    {
      label: "Total Spent",
      value: fmtINRFull(totalSpent),
      numericValue: totalSpent,
      sub: "Total expenditures on cards",
      color: THEME.rust,
      icon: <ArrowDown />,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        {(["active", "closed"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: "6px 18px",
              borderRadius: 20,
              border: viewMode === mode ? "none" : `1.5px solid var(--t-line)`,
              background:
                viewMode === mode
                  ? mode === "active"
                    ? "var(--t-accent)"
                    : "var(--t-muted)"
                  : "transparent",
              color: viewMode === mode ? "#fff" : "var(--t-muted)",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {mode === "active"
              ? `Active (${activeCards.length})`
              : `Closed (${closedCards.length})`}
          </button>
        ))}
      </div>

      {viewMode === "active" && activeCards.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {prepaidStats.map(({ label, value, numericValue, color, sub, icon }) => (
            <StatCard
              key={label}
              label={label}
              value={value}
              numericValue={numericValue}
              formatValue={fmtINRFull}
              icon={icon}
              color={color}
              sub={sub}
            />
          ))}
        </div>
      )}

      {displayCards.length === 0 && (
        <Card style={{ padding: "40px 32px", textAlign: "center" as const }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--t-muted)",
            }}
          >
            <Wallet size={36} strokeWidth={1.5} />
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 6,
              letterSpacing: "-0.02em",
            }}
          >
            {viewMode === "active" ? "No Active Prepaid Cards" : "No Closed Prepaid Cards"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 340,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            {viewMode === "active"
              ? "All your prepaid cards are currently closed. Add a new card or check the Closed tab."
              : "No closed prepaid cards yet. Cards you close will appear here."}
          </div>
        </Card>
      )}

      <Grid>
        {displayCards.map((p: any) => {
          const isClosed = (p.status || "active").toLowerCase() === "closed";
          const { loaded, spent, balance } = computeStats(p.transactions);
          const txnCount = (p.transactions || []).length;
          const name = p.cardName || p.name || p.provider || "Prepaid Card";
          const expiryDays = p.expiryDate
            ? Math.ceil(
                (new Date(p.expiryDate + "T00:00:00").getTime() -
                  new Date(today() + "T00:00:00").getTime()) /
                  86400000
              )
            : null;
          const lowBalanceThreshold = Number(p.lowBalanceThreshold || 0) || 100;
          const isLowBalance = !isClosed && balance > 0 && balance < lowBalanceThreshold;
          return (
            <div
              key={p.id}
              style={{
                background: isClosed
                  ? "linear-gradient(135deg, #2a2a1a 0%, #1a1a0d 100%)"
                  : getCardGradient(name),
                color: "#fff",
                borderRadius: 16,
                padding: 20,
                paddingBottom: isClosed ? 20 : 56,
                position: "relative",
                opacity: isClosed ? 0.8 : 1,
                filter: isClosed ? "grayscale(35%)" : "none",
                boxShadow: isClosed ? "none" : "0 8px 30px rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                overflow: "hidden",
              }}
            >
              {/* Shimmer/Reflective Mesh Effect Overlay */}
              {!isClosed && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(125deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)",
                    pointerEvents: "none",
                  }}
                />
              )}

              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  zIndex: 10,
                }}
              >
                {!isClosed && closingId !== p.id && (
                  <button
                    onClick={() => {
                      setClosingId(p.id);
                      setCloseDate(today());
                    }}
                    title="Mark card as closed"
                    style={{
                      background: "rgba(239,68,68,0.22)",
                      border: "1px solid rgba(239,68,68,0.45)",
                      cursor: "pointer",
                      color: "#ff9999",
                      padding: "3px 9px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                    }}
                  >
                    CLOSE CARD
                  </button>
                )}
                {isClosed && (
                  <button
                    onClick={() => onUpdateCard(p.id, { status: "active", closedDate: "" })}
                    title="Reactivate card"
                    style={{
                      background: "rgba(34,197,94,0.2)",
                      border: "1px solid rgba(34,197,94,0.45)",
                      cursor: "pointer",
                      color: "#a7f3d0",
                      padding: "3px 9px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                    }}
                  >
                    REACTIVATE
                  </button>
                )}
                <button
                  onClick={() => onEdit(p.id)}
                  aria-label="Edit card"
                  className="icon-btn"
                  style={{ ...iconBtn, color: "rgba(255,255,255,0.75)" }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmDeleteCard(p)}
                  aria-label="Remove card"
                  className="icon-btn danger"
                  style={{ ...iconBtn, color: "rgba(255,255,255,0.75)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {closingId === p.id && (
                <div
                  style={{
                    position: "absolute",
                    top: 40,
                    right: 12,
                    background: "rgba(15,15,25,0.98)",
                    border: "1px solid rgba(239,68,68,0.5)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    zIndex: 20,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                  }}
                >
                  <input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    aria-label="Card closed date"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 5,
                      color: "#fff",
                      fontSize: 11,
                      padding: "4px 7px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => {
                      onUpdateCard(p.id, { status: "closed", closedDate: closeDate });
                      setClosingId(null);
                    }}
                    style={{
                      background: "rgba(239,68,68,0.3)",
                      border: "1px solid rgba(239,68,68,0.5)",
                      color: "#ff8080",
                      borderRadius: 5,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setClosingId(null)}
                    aria-label="Close"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 13,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <BankLogo bankName={name} size={30} />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      background: "rgba(34,197,94,0.25)",
                      color: "#a7f3d0",
                      padding: "3px 8px",
                      borderRadius: 99,
                      border: "1px solid rgba(34,197,94,0.4)",
                    }}
                  >
                    {p.cardType || "Prepaid"}
                  </span>
                </div>
                <OwnerBadge owner={p.owner} />
              </div>

              {/* EMV Chip and Contactless indicator */}
              {!isClosed && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginTop: 14,
                    marginBottom: 4,
                  }}
                >
                  {/* EMV Chip */}
                  <div
                    style={{
                      width: 34,
                      height: 26,
                      borderRadius: 6,
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #fef3c7 100%)",
                      position: "relative",
                      opacity: 0.9,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.15)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        right: 0,
                        height: 1,
                        background: "rgba(0,0,0,0.2)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 0,
                        bottom: 0,
                        width: 1,
                        background: "rgba(0,0,0,0.2)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "25%",
                        right: "25%",
                        top: "25%",
                        bottom: "25%",
                        borderRadius: 2,
                        border: "1px solid rgba(0,0,0,0.15)",
                      }}
                    />
                  </div>
                  {/* Contactless Icon */}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{ transform: "rotate(90deg)" }}
                  >
                    <path d="M5 12a7 7 0 0 1 7-7" />
                    <path d="M5 17a12 12 0 0 1 12-12" />
                    <path d="M5 22a17 17 0 0 1 17-17" />
                    <circle cx="5" cy="7" r="1.5" fill="currentColor" />
                  </svg>
                </div>
              )}

              <div
                style={{ fontSize: 20, fontWeight: 800, marginTop: 12, letterSpacing: "-0.02em" }}
              >
                {name}
              </div>
              {p.last4 && (
                <div
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.08em",
                    marginTop: 6,
                    opacity: 0.8,
                    fontFamily: "monospace",
                    fontWeight: 600,
                  }}
                >
                  •••• •••• •••• {p.last4}
                </div>
              )}
              {isClosed && p.closedDate && (
                <div
                  style={{
                    fontSize: 10.5,
                    color: "rgba(255,140,140,0.85)",
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  Closed on{" "}
                  {new Date(p.closedDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              )}
              {!isClosed && expiryDays !== null && expiryDays <= 30 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 8,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: expiryDays < 0 ? "#ff9999" : expiryDays <= 7 ? "#ff9999" : "#fde68a",
                    background:
                      expiryDays < 0 || expiryDays <= 7
                        ? "rgba(239,68,68,0.22)"
                        : "rgba(245,158,11,0.2)",
                    padding: "3px 8px",
                    borderRadius: 99,
                  }}
                >
                  <Clock size={10} />
                  {expiryDays < 0
                    ? `Expired ${Math.abs(expiryDays)}d ago`
                    : expiryDays === 0
                      ? "Expires today"
                      : `Expires in ${expiryDays}d`}
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.55)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                    }}
                  >
                    Available Balance
                  </div>
                  {isLowBalance && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 9,
                        fontWeight: 800,
                        color: "#fde68a",
                        background: "rgba(245,158,11,0.22)",
                        padding: "2px 7px",
                        borderRadius: 99,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <AlertCircle size={9} /> Low
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 900,
                    color: balance >= 0 ? "#6ee7b7" : "#ff8888",
                    marginTop: 2,
                    letterSpacing: "-0.02em",
                  }}
                >
                  <Money value={balance} variant="full" />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 14,
                  fontSize: 11.5,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                <div>
                  Loaded:{" "}
                  <b style={{ color: "#6ee7b7" }}>
                    <Money value={loaded} variant="full" />
                  </b>
                </div>
                <div>
                  Spent:{" "}
                  <b style={{ color: "#ff8888" }}>
                    <Money value={spent} variant="full" />
                  </b>
                </div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  fontWeight: 500,
                }}
              >
                {txnCount} transaction{txnCount !== 1 ? "s" : ""}
              </div>

              {!isClosed && (
                <button
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 40,
                    background: "rgba(255,255,255,0.07)",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                    border: "none",
                    borderTop: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 11.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  }}
                >
                  <List size={14} /> Transactions & Load Money ({txnCount})
                </button>
              )}
              {isClosed && txnCount > 0 && (
                <button
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "8px 0",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    color: "rgba(255,255,255,0.75)",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                >
                  <List size={12} /> View History ({txnCount} txns)
                </button>
              )}
            </div>
          );
        })}
      </Grid>
      {selectedId && selected && (
        <PrepaidTransactionLedger
          prepaid={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={(newTxns: any) => onUpdateCard(selected.id, { transactions: newTxns })}
        />
      )}
      {confirmDeleteCard && (
        <ConfirmDialog
          message={`Delete "${confirmDeleteCard.cardName || confirmDeleteCard.name || confirmDeleteCard.provider || "this prepaid card"}" and its entire transaction ledger? This cannot be undone.`}
          onConfirm={() => {
            onRemove(confirmDeleteCard.id);
            setConfirmDeleteCard(null);
          }}
          onCancel={() => setConfirmDeleteCard(null)}
        />
      )}
    </div>
  );
}

function PrepaidTransactionLedger({ prepaid, onClose, onUpdate }: any) {
  const [txs, setTxs] = useState<any[]>(prepaid.transactions || []);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [txType, setTxType] = useState<"load" | "spend">("spend");
  const [form, setForm] = useState({ date: today(), amount: "", note: "", category: "Food" });
  const [editId, setEditId] = useState<string | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [importDone, setImportDone] = useState(false);

  const { prepaidCategories: cats } = useMasterData();
  const totalLoaded = txs
    .filter((t) => t.type === "load")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalSpent = txs
    .filter((t) => t.type === "spend")
    .reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalLoaded - totalSpent;

  const openAdd = (type: "load" | "spend") => {
    setTxType(type);
    setForm({ date: today(), amount: "", note: "", category: "Food" });
    setEditId(null);
    setShowAdd(true);
    setShowCsvImport(false);
  };

  const save = () => {
    if (!form.amount) return;
    const entry = {
      ...form,
      type: txType,
      amount: Number(form.amount),
      id: editId || `ptx-${Date.now()}`,
    };
    const updated = editId ? txs.map((t) => (t.id === editId ? entry : t)) : [...txs, entry];
    setTxs(updated);
    onUpdate(updated);
    setShowAdd(false);
    setEditId(null);
    setForm({ date: today(), amount: "", note: "", category: "Food" });
  };

  const editTx = (t: any) => {
    setTxType(t.type);
    setForm({
      date: t.date,
      amount: String(t.amount),
      note: t.note || "",
      category: t.category || "Food",
    });
    setEditId(t.id);
    setShowAdd(true);
    setShowCsvImport(false);
  };

  const removeTx = (id: string) => {
    const updated = txs.filter((t) => t.id !== id);
    setTxs(updated);
    onUpdate(updated);
  };

  const parseCsvText = (text: string) => {
    setCsvError("");
    setCsvPreview([]);
    setImportDone(false);
    try {
      const lines = text
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) {
        setCsvError("No data rows found. See format below.");
        return;
      }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) throw new Error(`Row ${i + 1}: need at least date, type, amount`);
        const [date, type, amount, note, category] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD (got "${date}")`);
        if (isNaN(new Date(date).getTime()))
          throw new Error(`Row ${i + 1}: invalid date "${date}"`);
        const t = type.toLowerCase().trim();
        if (!["load", "spend"].includes(t))
          throw new Error(`Row ${i + 1}: type must be "load" or "spend" (got "${type}")`);
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0)
          throw new Error(`Row ${i + 1}: amount must be a positive number`);
        return {
          date,
          type: t,
          amount: amt,
          note: note || "",
          category: category || (t === "spend" ? "Other" : ""),
          id: `ptx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        };
      });
      setCsvPreview(rows);
    } catch (e: any) {
      setCsvError(e.message);
    }
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const importCsv = () => {
    if (!csvPreview.length) return;
    const updated = [...txs, ...csvPreview];
    setTxs(updated);
    onUpdate(updated);
    setImportDone(true);
    setCsvPreview([]);
    setCsvText("");
    setCsvFileName("");
    setTimeout(() => {
      setShowCsvImport(false);
      setImportDone(false);
    }, 1400);
  };

  const downloadTemplate = () => {
    const content =
      "# Prepaid Card CSV Import Template\n# Columns: date, type, amount, note, category\n# type = load OR spend | date = YYYY-MM-DD | Lines starting with # are ignored\n2025-01-05,load,5000,Monthly top-up,\n2025-01-06,spend,250,Canteen lunch,Food\n2025-01-10,spend,120,Metro recharge,Transport\n2025-01-15,load,3000,Office benefit credit,\n2025-01-18,spend,480,Grocery run,Groceries";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prepaid_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardName = prepaid.cardName || prepaid.name || prepaid.provider || "Prepaid Card";

  return (
    <>
    <Modal title={`${cardName} — Transactions`} onClose={onClose} maxWidth={920}>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}
      >
        {[
          {
            label: "Total Loaded",
            value: <Money value={totalLoaded} variant="full" />,
            color: THEME.sage,
            bg: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
            border: `color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
          },
          {
            label: "Total Spent",
            value: <Money value={totalSpent} variant="full" />,
            color: THEME.rust,
            bg: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            border: `color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
          },
          {
            label: "Balance",
            value: <Money value={balance} variant="full" />,
            color: balance >= 0 ? THEME.sage : THEME.rust,
            bg: balance >= 0 ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)` : `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            border: balance >= 0 ? `color-mix(in srgb, ${THEME.sage} 20%, transparent)` : `color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: 14,
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 10,
              textAlign: "center" as const,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: THEME.muted,
                textTransform: "uppercase" as const,
                letterSpacing: "0.07em",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 800,
                color: s.color,
                marginTop: 4,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          Transaction History{" "}
          <span style={{ fontSize: 11, fontWeight: 400, color: THEME.muted, marginLeft: 6 }}>
            {txs.length} entries
          </span>
        </div>
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, justifyContent: "flex-end" }}
        >
          <button
            style={{
              ...btnGhost,
              fontSize: 12,
              padding: "6px 14px",
              color: THEME.accent,
              borderColor: `color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
            }}
            onClick={() => {
              setShowCsvImport((v) => !v);
              setShowAdd(false);
            }}
          >
            <Upload size={13} /> Import CSV
          </button>
          <button
            style={{
              ...btnGhost,
              fontSize: 12,
              padding: "6px 14px",
              color: THEME.sage,
              borderColor: `color-mix(in srgb, ${THEME.sage} 33%, transparent)`,
            }}
            onClick={() => openAdd("load")}
          >
            <TrendingUp size={13} /> Load Money
          </button>
          <button
            style={{
              ...btnGhost,
              fontSize: 12,
              padding: "6px 14px",
              color: THEME.rust,
              borderColor: `color-mix(in srgb, ${THEME.rust} 33%, transparent)`,
            }}
            onClick={() => openAdd("spend")}
          >
            <TrendingDown size={13} /> Record Spend
          </button>
        </div>
      </div>

      {showCsvImport && (
        <div
          style={{
            padding: 18,
            borderRadius: 12,
            marginBottom: 16,
            background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.accent} 22%, transparent)`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: THEME.accent,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FileText size={15} /> Bulk Import via CSV
            </div>
            <button
              onClick={downloadTemplate}
              className="card-interactive"
              style={{
                fontSize: 11,
                padding: "4px 12px",
                borderRadius: 6,
                border: `1px solid color-mix(in srgb, ${THEME.accent} 30%, transparent)`,
                background: "transparent",
                color: THEME.accent,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Download Template
            </button>
          </div>

          <div
            style={{
              fontSize: 11,
              color: THEME.muted,
              marginBottom: 12,
              padding: "8px 12px",
              background: "rgba(128,128,128,0.06)",
              borderRadius: 8,
              lineHeight: 1.6,
            }}
          >
            <b style={{ color: THEME.ink }}>Format:</b>{" "}
            <code
              style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}
            >
              date, type, amount, note, category
            </code>
            <br />
            Example:{" "}
            <code
              style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}
            >
              2025-01-05, load, 5000, Monthly top-up,
            </code>
            &nbsp;&nbsp;
            <code
              style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}
            >
              2025-01-06, spend, 250, Canteen, Food
            </code>
          </div>

          <label
            style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "20px 0",
              border: `1.5px dashed color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 12,
              background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
              transition: "background 0.15s",
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload size={22} color={THEME.accent} />
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.accent }}>
              {csvFileName ? csvFileName : "Drop CSV file here or click to browse"}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
            <input
              type="file"
              accept=".csv,.txt"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </label>

          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: THEME.muted,
              marginBottom: 6,
              textAlign: "center" as const,
            }}
          >
            — or paste CSV text below —
          </div>
          <textarea
            aria-label="Pasted CSV text"
            style={{
              width: "100%",
              minHeight: 90,
              padding: "10px 12px",
              background: "var(--t-paper)",
              border: `1.5px solid ${THEME.line}`,
              borderRadius: 10,
              color: THEME.ink,
              fontSize: 12,
              fontFamily: "monospace",
              resize: "vertical" as const,
              boxSizing: "border-box" as const,
            }}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setCsvPreview([]);
              setCsvError("");
              setImportDone(false);
            }}
            placeholder={
              "2025-01-05, load, 5000, Monthly top-up,\n2025-01-06, spend, 250, Canteen lunch, Food\n2025-01-10, spend, 120, Metro, Transport"
            }
          />

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              className="card-interactive"
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: `1px solid color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
                background: "transparent",
                color: THEME.accent,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
              onClick={() => parseCsvText(csvText)}
            >
              Preview Data
            </button>
            {csvPreview.length > 0 && !importDone && (
              <button
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: THEME.accent,
                  color: THEME.darkInk,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
                onClick={importCsv}
              >
                Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
              </button>
            )}
            {importDone && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: THEME.sage,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={15} /> Imported successfully!
              </div>
            )}
          </div>

          {csvError && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                color: THEME.rust,
                fontSize: 12,
                padding: "8px 12px",
                background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                borderRadius: 8,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
            </div>
          )}

          {csvPreview.length > 0 && (
            <div
              style={{
                marginTop: 12,
                border: `1px solid ${THEME.line}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.accent,
                }}
              >
                {csvPreview.length} rows ready to import — preview:
              </div>
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "rgba(128,128,128,0.04)", color: THEME.muted }}>
                      <th
                        style={{
                          padding: "7px 10px",
                          textAlign: "left" as const,
                          fontWeight: 600,
                          fontSize: 10,
                        }}
                      >
                        Date
                      </th>
                      <th
                        style={{
                          padding: "7px 10px",
                          textAlign: "left" as const,
                          fontWeight: 600,
                          fontSize: 10,
                        }}
                      >
                        Type
                      </th>
                      <th
                        style={{
                          padding: "7px 10px",
                          textAlign: "left" as const,
                          fontWeight: 600,
                          fontSize: 10,
                        }}
                      >
                        Note
                      </th>
                      <th
                        style={{
                          padding: "7px 10px",
                          textAlign: "left" as const,
                          fontWeight: 600,
                          fontSize: 10,
                        }}
                      >
                        Category
                      </th>
                      <th
                        style={{
                          padding: "7px 10px",
                          textAlign: "right" as const,
                          fontWeight: 600,
                          fontSize: 10,
                        }}
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((r, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "7px 10px", color: THEME.muted }}>{r.date}</td>
                        <td style={{ padding: "7px 10px" }}>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 99,
                              background: r.type === "load" ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)` : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                              color: r.type === "load" ? THEME.sage : THEME.rust,
                            }}
                          >
                            {r.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "7px 10px", color: THEME.muted }}>{r.note || "—"}</td>
                        <td style={{ padding: "7px 10px", color: THEME.muted }}>
                          {r.category || "—"}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "right" as const,
                            fontWeight: 700,
                            color: r.type === "load" ? THEME.sage : THEME.rust,
                          }}
                        >
                          {r.type === "load" ? "+" : "−"}
                          <Money value={r.amount} variant="exact" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            marginBottom: 16,
            background: txType === "load" ? `color-mix(in srgb, ${THEME.sage} 4%, transparent)` : `color-mix(in srgb, ${THEME.rust} 4%, transparent)`,
            border: `1px solid ${txType === "load" ? `color-mix(in srgb, ${THEME.sage} 20%, transparent)` : `color-mix(in srgb, ${THEME.rust} 20%, transparent)`}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 12,
              color: txType === "load" ? THEME.sage : THEME.rust,
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            {editId ? "Edit Transaction" : txType === "load" ? "Load Money" : "Record Spend"}
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}
          >
            <Field label="Date">
              <input
                type="date"
                style={input}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Amount (₹)">
              <input
                type="number"
                style={input}
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </Field>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: txType === "spend" ? "1fr 1fr" : "1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Field label={txType === "load" ? "Note (optional)" : "Merchant / Note"}>
              <input
                style={input}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder={txType === "load" ? "e.g. Monthly credit" : "e.g. Lunch at canteen"}
              />
            </Field>
            {txType === "spend" && (
              <Field label="Category">
                <select
                  style={input}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {cats.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                background: txType === "load" ? THEME.sage : THEME.rust,
                color: THEME.darkInk,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
              onClick={save}
            >
              {editId ? "Update" : txType === "load" ? "Load Money" : "Record Spend"}
            </button>
            <button
              style={{ ...btnGhost, padding: "10px 16px" }}
              onClick={() => {
                setShowAdd(false);
                setEditId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ maxHeight: 480, overflowY: "auto" }}>
        <DataTable
          columns={[
            {
              key: "date",
              header: "Date",
              accessor: (t: any) => <span style={{ color: THEME.muted, fontSize: 12 }}>{t.date}</span>,
            },
            {
              key: "type",
              header: "Type",
              accessor: (t: any) => (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 99,
                    background:
                      t.type === "load"
                        ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                        : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                    color: t.type === "load" ? THEME.sage : THEME.rust,
                  }}
                >
                  {t.type === "load" ? "LOAD" : "SPEND"}
                </span>
              ),
            },
            {
              key: "note",
              header: "Note / Merchant",
              accessor: (t: any) => t.note || "—",
            },
            {
              key: "category",
              header: "Category",
              accessor: (t: any) => (
                <span style={{ color: THEME.muted, fontSize: 12 }}>
                  {t.type === "spend" ? t.category || "—" : "—"}
                </span>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              accessor: (t: any) => (
                <span style={{ fontWeight: 700, color: t.type === "load" ? THEME.sage : THEME.rust }}>
                  {t.type === "load" ? "+" : "−"}
                  <Money value={t.amount} variant="exact" />
                </span>
              ),
            },
          ]}
          data={[...txs].sort((a: any, b: any) => b.date.localeCompare(a.date))}
          hideSearch
          keyExtractor={(t: any) => t.id}
          emptyState={<span>No transactions yet — load money, record a spend, or import a CSV above</span>}
          actions={(t: any) => (
            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <button
                onClick={() => editTx(t)}
                aria-label="Edit transaction"
                className="icon-btn"
                style={{ ...iconBtn, color: THEME.muted, padding: 4 }}
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => setConfirmDeleteTx(t)}
                aria-label="Delete transaction"
                className="icon-btn danger"
                style={{ ...iconBtn, color: THEME.rust, padding: 4 }}
              >
                <X size={13} />
              </button>
            </div>
          )}
        />
      </div>
    </Modal>
    {confirmDeleteTx && (
      <ConfirmDialog
        message={`Delete this transaction${confirmDeleteTx.note ? ` ("${confirmDeleteTx.note}")` : ""} dated ${confirmDeleteTx.date}? This cannot be undone.`}
        onConfirm={() => {
          removeTx(confirmDeleteTx.id);
          setConfirmDeleteTx(null);
        }}
        onCancel={() => setConfirmDeleteTx(null)}
      />
    )}
    </>
  );
}

function loanOrdinalSuffix(d: number) {
  if (d >= 11 && d <= 13) return "th";
  const r = d % 10;
  if (r === 1) return "st";
  if (r === 2) return "nd";
  if (r === 3) return "rd";
  return "th";
}

function LoanEmptyState({ type, onAdd }: any) {
  const isTaken = type === "taken";
  const Icon = isTaken ? TrendingDown : TrendingUp;
  const dotColor = isTaken ? "var(--t-rust)" : "var(--t-accent)";
  const pills = isTaken
    ? ["Home / Car / Personal Loans", "EMI Tracking", "Payoff Progress", "Interest Remaining"]
    : ["Loans to Friends & Family", "Due Date Tracking", "Interest Rate", "Outstanding Balance"];
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: dotColor,
        }}
      >
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        {isTaken ? "No Loans Recorded Yet" : "No Loans Given Yet"}
      </div>
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          maxWidth: 380,
          margin: "0 auto 12px",
          lineHeight: 1.6,
        }}
      >
        {isTaken
          ? "Track your active loans — home, car, personal, or education. Monitor EMIs, payoff progress, and outstanding principal in one place."
          : "Track money you've lent out to friends, family, or others. Record the principal, interest rate, due date, and repayment status."}
      </div>
      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 24,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap" as const,
        }}
      >
        {pills.map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dotColor,
                display: "inline-block",
              }}
            />{" "}
            {t}
          </span>
        ))}
      </div>
      <button
        style={{ ...btnSolid, display: "inline-flex", alignItems: "center", gap: 8 }}
        onClick={onAdd}
      >
        <Plus size={14} /> {isTaken ? "Add Loan Taken" : "Add Loan Given"}
      </button>
    </Card>
  );
}

function LoanTakenList({ items, onRemove, onEdit, onAdd }: any) {
  const { familyProfiles } = useMasterData();
  const [prepayExpanded, setPrepayExpanded] = useState<Set<string>>(new Set());
  const [prepayInputs, setPrepayInputs] = useState<Record<string, string>>({});
  const [confirmDeleteLoan, setConfirmDeleteLoan] = useState<any>(null);

  if (!items.length) return <LoanEmptyState type="taken" onAdd={onAdd} />;

  const totalPrincipal = items.reduce((s: number, l: any) => s + (Number(l.principal) || 0), 0);
  const totalOutstanding = items.reduce((s: number, l: any) => s + (Number(l.outstanding) || 0), 0);
  const totalEMI = items
    .filter((l: any) => Number(l.outstanding || 0) > 0 && Number(l.monthsRemaining ?? 1) > 0)
    .reduce((s: number, l: any) => s + (Number(l.emi) || 0), 0);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Total Borrowed",
            value: fmtINRFull(totalPrincipal),
            numericValue: totalPrincipal,
            sub: `${items.length} active loan${items.length !== 1 ? "s" : ""}`,
            color: THEME.muted,
            Icon: TrendingDown,
          },
          {
            label: "Outstanding Balance",
            value: fmtINRFull(totalOutstanding),
            numericValue: totalOutstanding,
            sub: totalOutstanding > 0 ? "Debt remaining" : "All paid off",
            color: THEME.rust,
            Icon: Wallet,
          },
          {
            label: "Monthly EMI Outflow",
            value: fmtINRFull(totalEMI),
            numericValue: totalEMI,
            sub: "Combined monthly payment",
            color: THEME.accent,
            Icon: Calendar,
          },
        ].map(({ label, value, numericValue, sub, color, Icon }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            numericValue={numericValue}
            formatValue={fmtINRFull}
            icon={<Icon />}
            color={color}
            sub={sub}
          />
        ))}
      </div>

      <Grid>
        {items.map((l: any) => {
          const principal = Number(l.principal) || 0;
          const outstanding = Number(l.outstanding) || 0;
          const emi = Number(l.emi) || 0;
          // Outstanding is the source of truth for "paid off" — monthsRemaining can go
          // stale (e.g. outstanding edited to 0 by hand) without being resynced, and
          // treating that loan as still active would show a bogus "interest left" figure.
          const isPaidOff = outstanding <= 0;
          const months = isPaidOff ? 0 : Number(l.monthsRemaining) || 0;
          const paid = Math.max(0, principal - outstanding);
          const paidPct = principal > 0 ? Math.min(100, (paid / principal) * 100) : 0;
          const interestRemaining = isPaidOff ? 0 : Math.max(0, emi * months - outstanding);
          const payoffDate =
            months > 0
              ? (() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + months);
                  return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
                })()
              : null;
          const barColor =
            paidPct > 60 ? "var(--t-sage)" : paidPct > 30 ? "var(--t-gold)" : "var(--t-rust)";
          const ownerProfile = familyProfiles.find((p: any) => p.id === l.owner);
          const ownerLabel = ownerProfile ? ownerProfile.name : "Self";

          return (
            <InvestCard
              key={l.id}
              onRemove={() => setConfirmDeleteLoan(l)}
              onEdit={() => onEdit(l.id)}
              cardStyle={{
                borderTop: `4px solid ${isPaidOff ? "var(--t-sage)" : "var(--t-rust)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 12,
                  paddingRight: 48,
                }}
              >
                <BankLogo bankName={l.lender} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: isPaidOff ? "var(--t-sage)" : "var(--t-rust)",
                      lineHeight: 1.2,
                    }}
                  >
                    {l.type || "Loan"}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      marginTop: 2,
                      color: "var(--t-ink)",
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {l.lender}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--t-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginTop: 2,
                    }}
                  >
                    Profile: {ownerLabel}
                  </div>
                </div>
                {isPaidOff && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: "var(--t-sage)",
                      background: `color-mix(in srgb, var(--t-sage) 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, var(--t-sage) 25%, transparent)`,
                      borderRadius: 6,
                      padding: "3px 8px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    PAID OFF
                  </span>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--t-muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Outstanding Balance
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 600,
                    color: isPaidOff ? "var(--t-sage)" : "var(--t-rust)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.03em",
                    marginTop: 2,
                  }}
                >
                  <Money value={outstanding} variant="full" />
                </div>
              </div>

              {principal > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 9,
                      color: "var(--t-muted)",
                      marginBottom: 6,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <span>Repayment Progress</span>
                    <span style={{ color: barColor, fontWeight: 800 }}>
                      {paidPct.toFixed(1)}%{months > 0 ? ` · ${months} mo left` : ""}
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: 6 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(paidPct, 100)}%`,
                        background: `linear-gradient(90deg, ${barColor}, color-mix(in srgb, ${barColor} 65%, white))`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                {[
                  {
                    k: "Principal",
                    v: <Money value={l.principal} variant="exact" />,
                    color: "var(--t-muted)",
                  },
                  {
                    k: "EMI Amount",
                    v: (
                      <>
                        <Money value={emi} variant="exact" />/mo
                      </>
                    ),
                    color: "var(--t-accent)",
                  },
                  {
                    k: "Interest Rate",
                    v: l.rate !== "" && l.rate != null ? `${l.rate}%` : "—",
                    color: "var(--t-muted)",
                  },
                  { k: "Months Left", v: months > 0 ? String(months) : "—", color: "var(--t-ink)" },
                  ...(!isPaidOff && l.dueDay
                    ? [
                        {
                          k: "EMI Due Day",
                          v: `${l.dueDay}${loanOrdinalSuffix(Number(l.dueDay))} of month`,
                          color: "var(--t-ink)",
                        },
                      ]
                    : []),
                  ...(payoffDate
                    ? [{ k: "Payoff Date", v: payoffDate, color: "var(--t-sage)" }]
                    : []),
                  ...(paid > 0
                    ? [
                        {
                          k: "Total Paid",
                          v: <Money value={paid} variant="exact" />,
                          color: "var(--t-sage)",
                        },
                      ]
                    : []),
                  ...(interestRemaining > 0
                    ? [
                        {
                          k: "Est. Interest Left",
                          v: <Money value={interestRemaining} variant="exact" />,
                          color: "var(--t-rust)",
                        },
                      ]
                    : []),
                ].map(({ k, v, color }) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "color-mix(in srgb, var(--surface-0) 40%, transparent)",
                      border: "1px solid var(--t-line)",
                      flex: "1 1 80px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        textTransform: "uppercase" as const,
                        color: "var(--t-muted)",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {k}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: color === "var(--t-muted)" ? "var(--t-ink)" : color,
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              {l.note && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11.5,
                    color: "var(--t-muted)",
                    fontStyle: "italic",
                    lineHeight: 1.4,
                  }}
                >
                  {l.note}
                </div>
              )}

              {!isPaidOff && outstanding > 0 && (
                <div
                  style={{ marginTop: 16, borderTop: `1px solid var(--t-line)`, paddingTop: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "var(--t-ink)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Calculator size={13} /> Prepayment Calculator
                    </div>
                    <button
                      onClick={() =>
                        setPrepayExpanded((prev) => {
                          const next = new Set(prev);
                          next.has(l.id) ? next.delete(l.id) : next.add(l.id);
                          return next;
                        })
                      }
                      style={{
                        fontSize: 11,
                        color: "var(--t-accent)",
                        background: "color-mix(in srgb, var(--t-accent) 8%, transparent)",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 800,
                        padding: "4px 10px",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "color-mix(in srgb, var(--t-accent) 15%, transparent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "color-mix(in srgb, var(--t-accent) 8%, transparent)";
                      }}
                    >
                      {prepayExpanded.has(l.id) ? "Collapse ▲" : "Simulate ▼"}
                    </button>
                  </div>
                  {prepayExpanded.has(l.id) && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 14,
                        background: "color-mix(in srgb, var(--surface-1) 30%, transparent)",
                        borderRadius: 12,
                        border: `1px solid var(--t-line)`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap" as const,
                          marginBottom: 12,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "var(--t-muted)", fontWeight: 500 }}>
                          If I prepay a lump sum of
                        </span>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: 12,
                              color: "var(--t-muted)",
                              fontWeight: 700,
                            }}
                          >
                            ₹
                          </span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={prepayInputs[l.id] || ""}
                            onChange={(e) =>
                              setPrepayInputs((prev) => ({ ...prev, [l.id]: e.target.value }))
                            }
                            style={{
                              width: 120,
                              padding: "6px 10px 6px 20px",
                              borderRadius: 8,
                              border: `1px solid var(--t-line)`,
                              background: "var(--surface-0)",
                              fontSize: 13,
                              fontWeight: 800,
                              color: "var(--t-ink)",
                              outline: "none",
                              transition: "border-color 0.2s ease",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "var(--t-accent)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = "var(--t-line)";
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--t-muted)", fontWeight: 500 }}>
                          today:
                        </span>
                      </div>
                      {prepayInputs[l.id] &&
                        Number(prepayInputs[l.id]) > 0 &&
                        (() => {
                          const prepay = Number(prepayInputs[l.id]);
                          if (prepay >= outstanding) {
                            return (
                              <div
                                style={{
                                  padding: "12px 14px",
                                  borderRadius: 10,
                                  background: "color-mix(in srgb, var(--t-sage) 8%, transparent)",
                                  border:
                                    "1px solid color-mix(in srgb, var(--t-sage) 20%, transparent)",
                                  borderLeft: `4px solid var(--t-sage)`,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--t-ink)",
                                  lineHeight: 1.4,
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "flex-start",
                                }}
                              >
                                <CheckCircle2
                                  size={16}
                                  color="var(--t-sage)"
                                  style={{ flexShrink: 0, marginTop: 1 }}
                                />
                                <span>
                                <strong
                                  style={{
                                    color: "var(--t-sage)",
                                    textTransform: "uppercase",
                                    fontSize: 11,
                                    display: "block",
                                    marginBottom: 2,
                                  }}
                                >
                                  Full Loan Settlement
                                </strong>
                                You will completely close this loan today, saving **
                                <Money value={interestRemaining} variant="full" />** in estimated remaining
                                interest!
                                </span>
                              </div>
                            );
                          }
                          const newOutstanding = outstanding - prepay;
                          const r = Number(l.rate || 0) / 100 / 12;
                          let newMonths: number;
                          if (r > 0 && emi > r * newOutstanding) {
                            newMonths = -Math.log(1 - (r * newOutstanding) / emi) / Math.log(1 + r);
                          } else {
                            newMonths = emi > 0 ? newOutstanding / emi : months;
                          }
                          newMonths = Math.ceil(newMonths);
                          const newInterestRemaining = Math.max(
                            0,
                            emi * newMonths - newOutstanding
                          );
                          const monthsSaved = Math.max(0, months - newMonths);
                          const interestSaved = Math.max(
                            0,
                            interestRemaining - newInterestRemaining
                          );
                          const newPayoff = new Date();
                          newPayoff.setMonth(newPayoff.getMonth() + newMonths);
                          return (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {[
                                {
                                  label: "Time Saved",
                                  value: `${monthsSaved} months`,
                                  color: "var(--t-sage)",
                                },
                                {
                                  label: "Interest Saved",
                                  value: <Money value={interestSaved} variant="full" />,
                                  color: "var(--t-sage)",
                                },
                                {
                                  label: "New Payoff Date",
                                  value: newPayoff.toLocaleString("en-IN", {
                                    month: "short",
                                    year: "numeric",
                                  }),
                                  color: "var(--t-accent)",
                                },
                              ].map(({ label, value, color }) => (
                                <div
                                  key={label}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                    padding: "8px 14px",
                                    borderRadius: 10,
                                    background:
                                      "color-mix(in srgb, var(--surface-0) 40%, transparent)",
                                    border: "1px solid var(--t-line)",
                                    flex: "1 1 90px",
                                    textAlign: "center" as const,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 9,
                                      textTransform: "uppercase" as const,
                                      color: "var(--t-muted)",
                                      fontWeight: 700,
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {label}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "var(--font-display)",
                                      fontSize: 13.5,
                                      fontWeight: 900,
                                      color,
                                    }}
                                  >
                                    {value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                    </div>
                  )}
                </div>
              )}
            </InvestCard>
          );
        })}
      </Grid>
      {confirmDeleteLoan && (
        <ConfirmDialog
          message={`Delete "${confirmDeleteLoan.type || confirmDeleteLoan.lender || "this loan"}"? This cannot be undone.`}
          onConfirm={() => {
            onRemove(confirmDeleteLoan.id);
            setConfirmDeleteLoan(null);
          }}
          onCancel={() => setConfirmDeleteLoan(null)}
        />
      )}
    </div>
  );
}

function LoanGivenList({ items, onRemove, onEdit, onAdd, onUpdate }: any) {
  const { familyProfiles } = useMasterData();
  if (!items.length) return <LoanEmptyState type="given" onAdd={onAdd} />;
  const now = new Date();
  const totalLent = items.reduce((s: number, l: any) => s + Number(l.principal || 0), 0);
  const totalOutstanding = items.reduce((s: number, l: any) => s + Number(l.outstanding || 0), 0);
  const overdueItems = items.filter(
    (l: any) =>
      l.dueDate && new Date(l.dueDate + "T00:00:00") < now && Number(l.outstanding || 0) > 0
  );
  const activeCount = items.filter((l: any) => Number(l.outstanding || 0) > 0).length;
  const settledCount = items.length - activeCount;

  const [historyExpanded, setHistoryExpanded] = useState<Set<string>>(new Set());
  const [paymentTarget, setPaymentTarget] = useState<any>(null);
  const [confirmDeleteLoan, setConfirmDeleteLoan] = useState<any>(null);
  const [confirmUndoPayment, setConfirmUndoPayment] = useState<any>(null);

  const fmtLoanDate = (d: string) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
      : "—";

  const getAvatarGradient = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      ["#3b82f6", "#60a5fa"], // Blue
      ["#7c3aed", "#a78bfa"], // Violet
      ["#059669", "#34d399"], // Emerald
      ["#d97706", "#fbbf24"], // Amber
      ["#2563eb", "#60a5fa"], // Indigo
      ["#0d9488", "#5eead4"], // Teal
      ["#dc2626", "#f87171"], // Red
    ];
    const idx = Math.abs(hash) % colors.length;
    return `linear-gradient(135deg, ${colors[idx][0]} 0%, ${colors[idx][1]} 100%)`;
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Total Lent",
            value: fmtINRFull(totalLent),
            numericValue: totalLent,
            formatValue: fmtINRFull,
            sub:
              `${activeCount} active loan${activeCount !== 1 ? "s" : ""}` +
              (settledCount > 0 ? ` · ${settledCount} settled` : ""),
            color: THEME.accent,
            Icon: TrendingUp,
          },
          {
            label: "Outstanding",
            value: fmtINRFull(totalOutstanding),
            numericValue: totalOutstanding,
            formatValue: fmtINRFull,
            sub: totalOutstanding > 0 ? "Pending recovery" : "Fully recovered",
            color: totalOutstanding > 0 ? THEME.gold : THEME.sage,
            Icon: IndianRupee,
          },
          {
            label: "Overdue",
            value: String(overdueItems.length),
            numericValue: overdueItems.length,
            formatValue: (n: number) => String(Math.round(n)),
            sub: overdueItems.length > 0 ? "Require follow-up" : "All on schedule",
            color: overdueItems.length > 0 ? THEME.rust : THEME.sage,
            Icon: AlertCircle,
          },
        ].map(({ label, value, numericValue, formatValue, sub, color, Icon }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            numericValue={numericValue}
            formatValue={formatValue}
            icon={<Icon />}
            color={color}
            sub={sub}
          />
        ))}
      </div>
      <Grid>
        {items.map((l: any) => {
          const principal = Number(l.principal) || 0;
          const outstanding = Number(l.outstanding) || 0;
          const rate = Number(l.rate) || 0;

          const isPaidOff = outstanding <= 0;
          const dueDateObj = l.dueDate ? new Date(l.dueDate + "T00:00:00") : null;
          const isOverdue = !isPaidOff && !!dueDateObj && dueDateObj < now;
          const daysOverdue = isOverdue
            ? Math.floor((now.getTime() - dueDateObj!.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const dueSoon =
            !isPaidOff &&
            !isOverdue &&
            !!dueDateObj &&
            Math.ceil((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 7;
          const daysUntilDue = dueSoon
            ? Math.ceil((dueDateObj!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          const startDate = l.date ? new Date(l.date + "T00:00:00") : null;
          const endDate = l.dueDate ? new Date(l.dueDate + "T00:00:00") : null;
          const daysElapsed = startDate
            ? Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          const totalTenureDays =
            startDate && endDate
              ? Math.max(
                  0,
                  Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                )
              : 0;

          // Accrued simple interest to date
          const accruedInterest = (principal * (rate / 100) * daysElapsed) / 365.25;
          // Simple interest at maturity
          const maturityInterest =
            (principal * (rate / 100) * (totalTenureDays || daysElapsed)) / 365.25;
          const maturityValue = principal + maturityInterest;

          const recovered = Math.max(0, principal - outstanding);
          const recoveredPct = principal > 0 ? Math.min(100, (recovered / principal) * 100) : 0;

          const barColor = isPaidOff
            ? "var(--t-sage)"
            : isOverdue
              ? "var(--t-rust)"
              : "var(--t-accent)";
          const avatarGradient = getAvatarGradient(l.borrower || "B");
          const firstLetter = l.borrower ? l.borrower.charAt(0).toUpperCase() : "?";

          // Find Profile Name
          const ownerProfile = familyProfiles.find((p: any) => p.id === l.owner);
          const ownerLabel = ownerProfile ? ownerProfile.name : "Self";

          return (
            <InvestCard
              key={l.id}
              onRemove={() => setConfirmDeleteLoan(l)}
              onEdit={() => onEdit(l.id)}
              cardStyle={{
                borderTop: `4px solid ${isOverdue ? "var(--t-rust)" : isPaidOff ? "var(--t-sage)" : "var(--t-accent)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  paddingRight: 64,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: avatarGradient,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {firstLetter}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "var(--t-ink)",
                        lineHeight: 1.2,
                      }}
                    >
                      {l.borrower}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--t-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginTop: 2,
                      }}
                    >
                      Profile: {ownerLabel}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 2,
                  }}
                >
                  {isOverdue && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: THEME.darkInk,
                        background: "var(--t-rust)",
                        padding: "2px 8px",
                        borderRadius: 99,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {daysOverdue}d OVERDUE
                    </span>
                  )}
                  {dueSoon && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: "var(--t-gold)",
                        background: "color-mix(in srgb, var(--t-gold) 15%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--t-gold) 30%, transparent)",
                        padding: "2px 8px",
                        borderRadius: 99,
                      }}
                    >
                      Due in {daysUntilDue}d
                    </span>
                  )}
                  {isPaidOff && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: "var(--t-sage)",
                        background: "color-mix(in srgb, var(--t-sage) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--t-sage) 25%, transparent)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      SETTLED
                    </span>
                  )}
                  {!isPaidOff && !isOverdue && !dueSoon && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: "var(--t-accent)",
                        background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <span
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    color: "var(--t-muted)",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  Outstanding Balance
                </span>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 600,
                    color: isPaidOff
                      ? "var(--t-sage)"
                      : isOverdue
                        ? "var(--t-rust)"
                        : "var(--t-ink)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.03em",
                    marginTop: 2,
                  }}
                >
                  <Money value={outstanding} variant="full" />
                </div>
              </div>

              {principal > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: "var(--t-muted)",
                      marginBottom: 6,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <span>Recovery Progress</span>
                    <span style={{ color: barColor, fontWeight: 800 }}>
                      {recoveredPct.toFixed(1)}% Recovered
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: 6 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(recoveredPct, 100)}%`,
                        background: `linear-gradient(90deg, ${barColor}, color-mix(in srgb, ${barColor} 65%, white))`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                {[
                  { k: "Principal", v: <Money value={principal} variant="exact" />, color: "var(--t-muted)" },
                  {
                    k: "Interest ROI",
                    v: rate ? `${rate.toFixed(2)}%` : "—",
                    color: "var(--t-muted)",
                  },
                  {
                    k: "Accrued Int.",
                    v: rate ? <Money value={accruedInterest} variant="exact" /> : "—",
                    color: rate && accruedInterest > 0 ? "var(--t-sage)" : "var(--t-muted)",
                    tooltip: "Simple interest accrued to date",
                  },
                  {
                    k: "Est. Maturity",
                    v: rate ? (
                      <Money value={maturityValue} variant="exact" />
                    ) : (
                      <Money value={principal} variant="exact" />
                    ),
                    color: rate ? "var(--t-accent)" : "var(--t-muted)",
                    tooltip: "Principal + estimated interest at maturity",
                  },
                  { k: "Given On", v: fmtLoanDate(l.date), color: "var(--t-muted)" },
                  {
                    k: "Due Date",
                    v: fmtLoanDate(l.dueDate),
                    color: isOverdue ? "var(--t-rust)" : "var(--t-muted)",
                  },
                ].map(({ k, v, color, tooltip }: any) => (
                  <div
                    key={k}
                    title={tooltip}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "color-mix(in srgb, var(--surface-0) 40%, transparent)",
                      border: "1px solid var(--t-line)",
                      flex: "1 1 80px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        textTransform: "uppercase" as const,
                        color: "var(--t-muted)",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {k}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        fontWeight: 800,
                        color: color === "var(--t-muted)" ? "var(--t-ink)" : color,
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              {l.note && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--t-muted)",
                    marginTop: 12,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "color-mix(in srgb, var(--surface-1) 40%, transparent)",
                    borderLeft: `3px solid var(--t-line)`,
                    fontStyle: "italic",
                  }}
                >
                  "{l.note}"
                </div>
              )}

              {onUpdate &&
                (() => {
                  const payments: any[] = l.payments || [];
                  if (isPaidOff && payments.length === 0) return null;
                  const isHistoryOpen = historyExpanded.has(l.id);
                  return (
                    <div
                      style={{
                        marginTop: 14,
                        borderTop: `1px solid var(--t-line)`,
                        paddingTop: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "var(--t-ink)",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <IndianRupee size={13} /> Payment History
                          {payments.length > 0 && (
                            <span style={{ color: "var(--t-muted)", fontWeight: 700 }}>
                              ({payments.length})
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {payments.length > 0 && (
                            <button
                              onClick={() =>
                                setHistoryExpanded((prev) => {
                                  const next = new Set(prev);
                                  next.has(l.id) ? next.delete(l.id) : next.add(l.id);
                                  return next;
                                })
                              }
                              style={{
                                fontSize: 11,
                                color: "var(--t-accent)",
                                background: "color-mix(in srgb, var(--t-accent) 8%, transparent)",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontWeight: 800,
                                padding: "4px 10px",
                              }}
                            >
                              {isHistoryOpen ? "Hide ▲" : "Show ▼"}
                            </button>
                          )}
                          {!isPaidOff && (
                            <button
                              onClick={() => setPaymentTarget(l)}
                              style={{
                                fontSize: 11,
                                color: THEME.darkInk,
                                background: "var(--t-sage)",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontWeight: 800,
                                padding: "4px 10px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Plus size={11} /> Record Payment
                            </button>
                          )}
                        </div>
                      </div>
                      {isHistoryOpen && payments.length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: 4,
                            background: "color-mix(in srgb, var(--surface-1) 30%, transparent)",
                            borderRadius: 12,
                            border: `1px solid var(--t-line)`,
                          }}
                        >
                          {payments
                            .slice()
                            .sort((a: any, b: any) => (a.date < b.date ? 1 : -1))
                            .map((p: any, idx: number, arr: any[]) => (
                              <div
                                key={p.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 10px",
                                  borderBottom:
                                    idx < arr.length - 1 ? `1px dashed var(--t-line)` : "none",
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 12.5,
                                      fontWeight: 800,
                                      color: "var(--t-sage)",
                                    }}
                                  >
                                    <Money value={p.amount} variant="exact" />
                                  </div>
                                  <div style={{ fontSize: 10, color: "var(--t-muted)" }}>
                                    {fmtLoanDate(p.date)}
                                    {p.note ? ` · ${p.note}` : ""}
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    setConfirmUndoPayment({
                                      loanId: l.id,
                                      updated: payments.filter((x: any) => x.id !== p.id),
                                      restored: outstanding + Number(p.amount || 0),
                                    })
                                  }
                                  style={{
                                    color: "var(--t-muted)",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 4,
                                  }}
                                  aria-label="Undo payment"
                                  title="Undo this payment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
            </InvestCard>
          );
        })}
      </Grid>
      {paymentTarget && (
        <Modal
          title={`Record Payment — ${paymentTarget.borrower}`}
          onClose={() => setPaymentTarget(null)}
        >
          <InformalAmountForm
            label="Amount Received"
            onSave={(entry: any) => {
              const amt = Number(entry.amount) || 0;
              if (amt <= 0) return;
              const updatedPayments = [...(paymentTarget.payments || []), { id: uid(), ...entry }];
              const nextOutstanding = Math.max(0, Number(paymentTarget.outstanding || 0) - amt);
              onUpdate(paymentTarget.id, {
                payments: updatedPayments,
                outstanding: nextOutstanding,
              });
              setPaymentTarget(null);
            }}
            onClose={() => setPaymentTarget(null)}
          />
        </Modal>
      )}
      {confirmDeleteLoan && (
        <ConfirmDialog
          message={`Delete the loan given to "${confirmDeleteLoan.borrower || "this person"}"? This cannot be undone.`}
          onConfirm={() => {
            onRemove(confirmDeleteLoan.id);
            setConfirmDeleteLoan(null);
          }}
          onCancel={() => setConfirmDeleteLoan(null)}
        />
      )}
      {confirmUndoPayment && (
        <ConfirmDialog
          message="Undo this payment? The amount will be added back to the outstanding balance."
          confirmLabel="Yes, undo"
          onConfirm={() => {
            onUpdate(confirmUndoPayment.loanId, {
              payments: confirmUndoPayment.updated,
              outstanding: confirmUndoPayment.restored,
            });
            setConfirmUndoPayment(null);
          }}
          onCancel={() => setConfirmUndoPayment(null)}
        />
      )}
    </div>
  );
}

function CCModal({ onClose, onSave, initial = null, existingGroups = [], saving }: any) {
  const { ccNetworks, familyProfiles } = useMasterData();
  const [f, setF] = useState(
    initial || {
      issuer: "",
      network: ccNetworks[0] || "Visa",
      last4: "",
      limit: "",
      outstanding: "0",
      billDate: "",
      dueDay: "",
      annualFee: "0",
      feeMonth: "",
      feeDay: "",
      interestRate: "36",
      waiverInfo: "",
      helpline: "",
      transactions: [],
      owner: "self",
      status: "active",
      closedDate: "",
      sharedGroup: "",
      sharedGroupLimit: "",
      autoPay: false,
      rewardPointsBalance: "",
      rewardPointValue: "",
      variants: [],
    }
  );
  const isClosed = (f.status || "active").toLowerCase() === "closed";
  return (
    <Modal title={initial ? "Edit Credit Card" : "Add Credit Card"} onClose={onClose}>
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
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label="Issuer / Account Name">
          <input
            style={input}
            value={f.issuer}
            onChange={(e) => setF({ ...f, issuer: e.target.value })}
            placeholder="e.g. Federal Scapia, ICICI Sapphiro, HDFC Regalia"
          />
        </Field>
        <Field label="Primary Network">
          <select
            style={input}
            value={f.network}
            onChange={(e) => setF({ ...f, network: e.target.value })}
          >
            {ccNetworks.map((n: string) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Primary Last 4">
          <input
            style={input}
            maxLength={4}
            value={f.last4}
            onChange={(e) => setF({ ...f, last4: e.target.value })}
            placeholder="4589"
          />
        </Field>
        <Field label={f.sharedGroup ? "Card Sub-Limit (₹)" : "Account Credit Limit (₹)"}>
          <input
            style={input}
            type="number"
            value={f.limit}
            onChange={(e) => setF({ ...f, limit: e.target.value })}
            placeholder={f.sharedGroup ? "Individual sub-limit" : "e.g. 500000"}
          />
        </Field>
        <Field label="Outstanding (₹)">
          <input
            style={input}
            type="number"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
            placeholder="0"
          />
        </Field>
      </div>

      {/* Linked Card Variants (e.g. Scapia RuPay UPI, Sapphiro Amex Companion) */}
      <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 14, marginTop: 4 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.accent,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={13} /> Linked Card Variants (Dual-Card Account)
          </div>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 10,
              background: (f.variants || []).length > 0 ? "rgba(34,197,94,0.12)" : "rgba(128,128,128,0.1)",
              color: (f.variants || []).length > 0 ? THEME.sage : THEME.muted,
              fontWeight: 700,
            }}
          >
            {(f.variants || []).length === 0 ? "1 Card (Single)" : `${(f.variants || []).length + 1} Cards · 1 Bill & Limit`}
          </span>
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12, lineHeight: 1.55 }}>
          For accounts with multiple cards sharing <strong>1 single statement, 1 due date, and 1 credit limit</strong> (e.g. <em>Federal Scapia Visa + RuPay UPI</em>, or <em>ICICI Sapphiro Mastercard + Amex companion</em>). Primary card is defined above.
        </div>

        {/* Existing variants list */}
        {(f.variants || []).map((v: any, vIdx: number) => (
          <div
            key={v.id || vIdx}
            style={{
              padding: 12,
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
                <CreditCard size={14} color={THEME.accent} />
                Variant #{vIdx + 1}: {v.name || v.network || "Linked Card"}
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = (f.variants || []).filter((_: any, i: number) => i !== vIdx);
                  setF({ ...f, variants: updated });
                }}
                className="icon-btn danger"
                style={{ ...iconBtn, color: THEME.rust, padding: 4 }}
                title="Remove variant"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10 }}>
              <Field label="Variant Label">
                <input
                  style={input}
                  value={v.name || ""}
                  onChange={(e) => {
                    const updated = [...(f.variants || [])];
                    updated[vIdx] = { ...updated[vIdx], name: e.target.value };
                    setF({ ...f, variants: updated });
                  }}
                  placeholder="e.g. RuPay UPI, Companion Amex"
                />
              </Field>
              <Field label="Network">
                <select
                  style={input}
                  value={v.network || "RuPay"}
                  onChange={(e) => {
                    const updated = [...(f.variants || [])];
                    updated[vIdx] = { ...updated[vIdx], network: e.target.value };
                    setF({ ...f, variants: updated });
                  }}
                >
                  {ccNetworks.map((n: string) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field label="Last 4 digits">
                <input
                  style={input}
                  maxLength={4}
                  value={v.last4 || ""}
                  onChange={(e) => {
                    const updated = [...(f.variants || [])];
                    updated[vIdx] = { ...updated[vIdx], last4: e.target.value };
                    setF({ ...f, variants: updated });
                  }}
                  placeholder="e.g. 5678"
                />
              </Field>
            </div>
          </div>
        ))}

        {/* Quick Add Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, marginBottom: 12 }}>
          <button
            type="button"
            className="card-interactive"
            onClick={() => {
              const newV = {
                id: uid(),
                name: "RuPay UPI (Virtual)",
                network: "RuPay",
                last4: "",
                cardType: "virtual",
                status: "active",
              };
              setF({ ...f, variants: [...(f.variants || []), newV] });
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px dashed color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
              background: "transparent",
              color: THEME.accent,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Plus size={13} /> + Add RuPay UPI (Virtual)
          </button>
          <button
            type="button"
            className="card-interactive"
            onClick={() => {
              const newV = {
                id: uid(),
                name: "Companion Amex",
                network: "Amex",
                last4: "",
                cardType: "physical",
                status: "active",
              };
              setF({ ...f, variants: [...(f.variants || []), newV] });
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px dashed ${THEME.line}`,
              background: "transparent",
              color: THEME.ink,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Plus size={13} /> + Add Companion Card (Amex/MC/Visa)
          </button>
          <button
            type="button"
            className="card-interactive"
            onClick={() => {
              const newV = {
                id: uid(),
                name: "Add-on / Variant Card",
                network: "Visa",
                last4: "",
                cardType: "addon",
                status: "active",
              };
              setF({ ...f, variants: [...(f.variants || []), newV] });
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px dashed ${THEME.line}`,
              background: "transparent",
              color: THEME.muted,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Plus size={13} /> + Custom Variant
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Statement Date (Day of Month)">
          <input
            style={input}
            type="number"
            min="1"
            max="31"
            placeholder="e.g. 20"
            value={f.billDate}
            onChange={(e) => setF({ ...f, billDate: e.target.value })}
          />
        </Field>
        <Field label="Due Day (Day of Month)">
          <input
            style={input}
            type="number"
            min="1"
            max="31"
            placeholder="e.g. 10"
            value={f.dueDay}
            onChange={(e) => setF({ ...f, dueDay: e.target.value })}
          />
        </Field>
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12.5,
          fontWeight: 600,
          color: THEME.ink,
          cursor: "pointer",
          margin: "-4px 0 4px",
        }}
      >
        <input
          type="checkbox"
          checked={!!f.autoPay}
          onChange={(e) => setF({ ...f, autoPay: e.target.checked })}
          style={{ width: 16, height: 16, cursor: "pointer" }}
        />
        Autopay enabled — mutes due-date urgency reminders for this card
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Annual Fee (₹)">
          <input
            style={input}
            type="number"
            value={f.annualFee}
            onChange={(e) => setF({ ...f, annualFee: e.target.value })}
          />
        </Field>
        <Field label="Interest Rate (% APR)">
          <input
            style={input}
            type="number"
            min="0"
            max="60"
            step="0.1"
            value={f.interestRate ?? "36"}
            onChange={(e) => setF({ ...f, interestRate: e.target.value })}
            placeholder="36"
          />
        </Field>
        <Field label="Helpline Number">
          <input
            style={input}
            value={f.helpline}
            onChange={(e) => setF({ ...f, helpline: e.target.value })}
            placeholder="1800-xxx-xxxx"
          />
        </Field>
      </div>
      {Number(f.annualFee) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Annual Fee Month">
            <select
              style={input}
              value={f.feeMonth || ""}
              onChange={(e) => setF({ ...f, feeMonth: e.target.value })}
            >
              <option value="">— Select month —</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Annual Fee Day">
            <input
              style={input}
              type="number"
              min="1"
              max="31"
              placeholder="e.g. 15"
              value={f.feeDay || ""}
              onChange={(e) => setF({ ...f, feeDay: e.target.value })}
            />
          </Field>
        </div>
      )}
      <Field label="Waiver Details">
        <textarea
          style={{ ...input, height: 60, resize: "none" }}
          value={f.waiverInfo}
          onChange={(e) => setF({ ...f, waiverInfo: e.target.value })}
          placeholder="e.g. Spend 1L in a year to waive off annual fee"
        />
      </Field>

      {/* Reward Points */}
      <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 16, marginTop: 4 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          Reward Points (Optional)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Points Balance">
            <input
              style={input}
              type="number"
              min="0"
              value={f.rewardPointsBalance || ""}
              onChange={(e) => setF({ ...f, rewardPointsBalance: e.target.value })}
              placeholder="e.g. 12500"
            />
          </Field>
          <Field label="Value per Point (₹)">
            <input
              style={input}
              type="number"
              min="0"
              step="0.01"
              value={f.rewardPointValue || ""}
              onChange={(e) => setF({ ...f, rewardPointValue: e.target.value })}
              placeholder="e.g. 0.25"
            />
          </Field>
        </div>
      </div>

      {/* Shared Limit Pool */}
      <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 16, marginTop: 4 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 6,
          }}
        >
          Shared Credit Pool (Optional)
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12, lineHeight: 1.55 }}>
          Some banks allocate one shared pool across multiple cards (e.g., HDFC primary + add-on, or
          SBI Simply Click + Elite sharing a limit). Group them here — the app tracks combined
          utilisation against the pool, not individual sub-limits.
        </div>
        <datalist id="cc-shared-group-list">
          {existingGroups
            .filter((g: string) => g)
            .map((g: string) => (
              <option key={g} value={g} />
            ))}
        </datalist>
        <Field label="Pool Name (leave blank if this card has its own independent limit)">
          <input
            style={input}
            value={f.sharedGroup || ""}
            onChange={(e) => setF({ ...f, sharedGroup: e.target.value })}
            placeholder="e.g. HDFC Shared Pool, SBI Family"
            list="cc-shared-group-list"
          />
        </Field>
        {f.sharedGroup && (
          <Field label="Total Pool Credit Limit (₹) — the combined limit shared across all cards in this pool">
            <input
              style={input}
              type="number"
              value={f.sharedGroupLimit || ""}
              onChange={(e) => setF({ ...f, sharedGroupLimit: e.target.value })}
              placeholder="e.g. 500000"
            />
          </Field>
        )}
      </div>

      {/* Card Status */}
      <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 16, marginTop: 4 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          Card Status
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {["active", "closed"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                setF({ ...f, status: s, closedDate: s === "active" ? "" : f.closedDate || today() })
              }
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border:
                  f.status === s
                    ? `2px solid ${s === "active" ? THEME.sage : THEME.rust}`
                    : `1.5px solid ${THEME.line}`,
                background:
                  f.status === s
                    ? s === "active"
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(239,68,68,0.08)"
                    : "transparent",
                color: f.status === s ? (s === "active" ? THEME.sage : THEME.rust) : THEME.muted,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {s === "active" ? "✓ Active" : "✕ Closed"}
            </button>
          ))}
        </div>
        {isClosed && (
          <div style={{ marginTop: 12 }}>
            <Field label="Closed On">
              <input
                style={input}
                type="date"
                value={f.closedDate || ""}
                onChange={(e) => setF({ ...f, closedDate: e.target.value })}
              />
            </Field>
          </div>
        )}
      </div>

      <ModalActions
        onSave={() => f.issuer && onSave(f)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Credit Card"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

function PrepaidModal({ onClose, onSave, initial = null, saving }: any) {
  const { prepaidCardTypes, familyProfiles } = useMasterData();
  const [f, setF] = useState(
    initial || {
      owner: "self",
      cardName: "",
      cardType: prepaidCardTypes[0] || "Meal Card",
      last4: "",
      transactions: [],
    }
  );
  const [openingBal, setOpeningBal] = useState("");

  return (
    <Modal title={initial ? "Edit Prepaid Card" : "Add Prepaid Card / Wallet"} onClose={onClose}>
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
      <Field label="Card Name">
        <input
          style={input}
          value={f.cardName || f.name || ""}
          onChange={(e) => setF({ ...f, cardName: e.target.value })}
          placeholder="e.g. Sodexo Meal Card, Zeta, ICICI Prepaid"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Card Type">
          <select
            style={input}
            value={f.cardType || prepaidCardTypes[0] || "Prepaid Card"}
            onChange={(e) => setF({ ...f, cardType: e.target.value })}
          >
            {prepaidCardTypes.map((t: string) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Last 4 Digits (optional)">
          <input
            style={input}
            maxLength={4}
            value={f.last4 || ""}
            onChange={(e) => setF({ ...f, last4: e.target.value })}
            placeholder="1234"
          />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Expiry Date (optional)">
          <input
            type="date"
            style={input}
            value={f.expiryDate || ""}
            onChange={(e) => setF({ ...f, expiryDate: e.target.value })}
          />
        </Field>
        <Field label="Low Balance Alert Below (optional)">
          <input
            style={input}
            type="number"
            min="0"
            value={f.lowBalanceThreshold || ""}
            onChange={(e) => setF({ ...f, lowBalanceThreshold: e.target.value })}
            placeholder="Default ₹100"
          />
        </Field>
      </div>
      {!initial && (
        <Field label="Current Balance on Card (optional)">
          <input
            style={input}
            type="number"
            value={openingBal}
            onChange={(e) => setOpeningBal(e.target.value)}
            placeholder="Balance already loaded on this card"
          />
        </Field>
      )}
      <ModalActions
        onSave={() => {
          const name = f.cardName || f.name;
          if (!name) return;
          const initTxns: any[] = f.transactions || [];
          const txns =
            !initial && openingBal && Number(openingBal) > 0
              ? [
                  ...initTxns,
                  {
                    id: `ptx-${Date.now()}`,
                    date: today(),
                    type: "load",
                    amount: Number(openingBal),
                    note: "Opening balance",
                  },
                ]
              : initTxns;
          onSave({
            ...f,
            cardName: name,
            transactions: txns,
            lowBalanceThreshold: f.lowBalanceThreshold ? Number(f.lowBalanceThreshold) : null,
          });
        }}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Prepaid Card / Wallet"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

function InformalLoanView({ direction, items, onAddPerson, onUpdate, onRemove, onEdit }: any) {
  const { familyProfiles } = useMasterData();
  const isBorrowed = direction === "borrowed";
  const personLabel = isBorrowed ? "Lender" : "Borrower";
  const accentColor = isBorrowed ? "var(--t-rust)" : "var(--t-accent)";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [trancheTarget, setTrancheTarget] = useState<any>(null);
  const [paymentTarget, setPaymentTarget] = useState<any>(null);
  const [confirmDeletePerson, setConfirmDeletePerson] = useState<any>(null);
  const [confirmDeleteTranche, setConfirmDeleteTranche] = useState<any>(null);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<any>(null);
  const now = new Date();

  const totalBorrowed = items.reduce(
    (s: number, p: any) =>
      s + (p.tranches || []).reduce((a: number, t: any) => a + Number(t.amount || 0), 0),
    0
  );
  const totalPaid = items.reduce(
    (s: number, p: any) =>
      s + (p.payments || []).reduce((a: number, t: any) => a + Number(t.amount || 0), 0),
    0
  );
  const totalOutstanding = totalBorrowed - totalPaid;

  // Enrich once so the summary tiles and the row list agree on the same numbers —
  // computing settlement/overdue state twice (once for tiles, once per row) risks drift.
  const enrichedItems = items.map((person: any) => {
    const tranches: any[] = person.tranches || [];
    const payments: any[] = person.payments || [];
    const totalT = tranches.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalP = payments.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const outstanding = totalT - totalP;
    const hasActivity = totalT > 0 || totalP > 0;
    const settled = hasActivity && outstanding <= 0;
    const overpaid = outstanding < 0;
    const nextDueDate = tranches
      .map((t: any) => t.dueDate)
      .filter(Boolean)
      .sort()[0];
    const dueDateObj = nextDueDate ? new Date(nextDueDate + "T00:00:00") : null;
    const isOverdue = !settled && !overpaid && !!dueDateObj && dueDateObj < now;
    const daysOverdue = isOverdue
      ? Math.floor((now.getTime() - dueDateObj!.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const ownerProfile = familyProfiles.find((x: any) => x.id === person.owner);
    const ownerLabel = ownerProfile ? ownerProfile.name : "Self";
    return {
      person,
      tranches,
      payments,
      totalT,
      totalP,
      outstanding,
      settled,
      overpaid,
      nextDueDate,
      isOverdue,
      daysOverdue,
      ownerLabel,
    };
  });
  const overdueCount = enrichedItems.filter((x) => x.isOverdue).length;

  const fmtD = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
      : "—";

  const getAvatarGradient = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      ["#3b82f6", "#60a5fa"], // Blue
      ["#7c3aed", "#a78bfa"], // Violet
      ["#059669", "#34d399"], // Emerald
      ["#d97706", "#fbbf24"], // Amber
      ["#2563eb", "#60a5fa"], // Indigo
      ["#0d9488", "#5eead4"], // Teal
      ["#dc2626", "#f87171"], // Red
    ];
    const idx = Math.abs(hash) % colors.length;
    return `linear-gradient(135deg, ${colors[idx][0]} 0%, ${colors[idx][1]} 100%)`;
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: isBorrowed ? "Total Borrowed" : "Total Lent",
            value: fmtINRFull(totalBorrowed),
            numericValue: totalBorrowed,
            formatValue: fmtINRFull,
            sub: "Principal amount",
            color: isBorrowed ? THEME.rust : THEME.accent,
            Icon: isBorrowed ? TrendingDown : TrendingUp,
          },
          {
            label: isBorrowed ? "Total Repaid" : "Received Back",
            value: fmtINRFull(totalPaid),
            numericValue: totalPaid,
            formatValue: fmtINRFull,
            sub: "Payment history",
            color: THEME.sage,
            Icon: CheckCircle2,
          },
          {
            label: "Outstanding",
            value: fmtINRFull(totalOutstanding),
            numericValue: totalOutstanding,
            formatValue: fmtINRFull,
            sub: totalOutstanding > 0 ? "Pending settlement" : "Fully settled",
            color: totalOutstanding > 0 ? accentColor : THEME.sage,
            Icon: Wallet,
          },
          {
            label: "Overdue",
            value: String(overdueCount),
            numericValue: overdueCount,
            formatValue: (n: number) => String(Math.round(n)),
            sub: overdueCount > 0 ? "Require follow-up" : "All on schedule",
            color: overdueCount > 0 ? THEME.rust : THEME.sage,
            Icon: AlertCircle,
          },
        ].map(({ label, value, numericValue, formatValue, sub, color, Icon }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            numericValue={numericValue}
            formatValue={formatValue}
            icon={<Icon />}
            color={color}
            sub={sub}
          />
        ))}
      </div>
      {items.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button style={btnSolid} onClick={() => setAddPersonOpen(true)}>
            <Plus size={14} /> Add {personLabel}
          </button>
        </div>
      )}
      {items.length === 0 && (
        <InformalEmptyState isBorrowed={isBorrowed} onAdd={() => setAddPersonOpen(true)} />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {enrichedItems.map(
          ({
            person,
            tranches,
            payments,
            totalT,
            totalP,
            outstanding,
            settled,
            overpaid,
            isOverdue,
            daysOverdue,
            ownerLabel,
          }: any) => {
          const isExpanded = expandedId === person.id;
          // A payment recorded larger than what was owed pushes outstanding negative —
          // collapsing that straight into "Settled ✓ ₹0" would hide that money is
          // actually owed back the other way, so it gets its own distinct state.
          const overpaidAmt = Math.abs(outstanding);

          const progressPct = totalT > 0 ? Math.min(100, (totalP / totalT) * 100) : 0;
          const progressColor = settled ? "var(--t-sage)" : accentColor;

          const avatarGradient = getAvatarGradient(person.person || "P");
          const firstLetter = person.person ? person.person.charAt(0).toUpperCase() : "?";

          return (
            <div
              key={person.id}
              className="card-lift"
              style={{
                ...card,
                background: "var(--t-card-bg)",
                padding: 0,
                overflow: "hidden",
                border: "1px solid var(--t-line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  cursor: "pointer",
                  borderBottom: isExpanded ? `1px solid var(--t-line)` : "none",
                }}
                onClick={() => setExpandedId(isExpanded ? null : person.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : person.id);
                  }
                }}
              >
                <div
                  style={{
                    color: "var(--t-muted)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 200px" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: avatarGradient,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {firstLetter}
                  </div>
                  <div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                    >
                      <span style={{ fontWeight: 800, fontSize: 16, color: "var(--t-ink)" }}>
                        {person.person}
                      </span>
                      {overpaid && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: "var(--t-gold)",
                            background: "color-mix(in srgb, var(--t-gold) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-gold) 25%, transparent)",
                            borderRadius: 6,
                            padding: "2px 8px",
                            letterSpacing: "0.05em",
                          }}
                          title="Payments recorded exceed the amount owed"
                        >
                          OVERPAID
                        </span>
                      )}
                      {settled && !overpaid && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: "var(--t-sage)",
                            background: "color-mix(in srgb, var(--t-sage) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-sage) 25%, transparent)",
                            borderRadius: 6,
                            padding: "2px 8px",
                            letterSpacing: "0.05em",
                          }}
                        >
                          SETTLED
                        </span>
                      )}
                      {isOverdue && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: THEME.darkInk,
                            background: "var(--t-rust)",
                            borderRadius: 6,
                            padding: "2px 8px",
                            letterSpacing: "0.05em",
                          }}
                          title="A loan due date has passed with an outstanding balance"
                        >
                          {daysOverdue}D OVERDUE
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--t-muted)",
                        marginTop: 2,
                        fontWeight: 500,
                      }}
                    >
                      {tranches.length} loan{tranches.length !== 1 ? "s" : ""} · {payments.length}{" "}
                      payment{payments.length !== 1 ? "s" : ""} · {ownerLabel}
                      {person.note && (
                        <span style={{ color: "var(--t-muted)", fontStyle: "italic" }}>
                          {" "}
                          ({person.note})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    flex: "2 2 150px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "0 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 9,
                      color: "var(--t-muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    <span>Settlement</span>
                    <span style={{ color: progressColor, fontWeight: 800 }}>
                      {progressPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: 5, borderRadius: 99 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progressPct}%`,
                        background: progressColor,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0, minWidth: 100 }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--t-muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Outstanding
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 20,
                      fontWeight: 900,
                      color: overpaid ? "var(--t-gold)" : settled ? "var(--t-sage)" : accentColor,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.02em",
                      marginTop: 2,
                    }}
                  >
                    {overpaid ? (
                      <Money value={overpaidAmt} variant="full" />
                    ) : settled ? (
                      <Money value={0} variant="full" />
                    ) : (
                      <Money value={outstanding} variant="full" />
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingLeft: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(person.id);
                    }}
                    style={{
                      ...iconBtn,
                      color: "var(--t-muted)",
                      background: "color-mix(in srgb, var(--surface-0) 50%, transparent)",
                      border: "1px solid var(--t-line)",
                      borderRadius: 8,
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                    title="Edit person"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeletePerson(person);
                    }}
                    style={{
                      ...iconBtn,
                      color: "var(--t-rust)",
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: 8,
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                    }}
                    title="Delete person"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div
                  style={{ background: "color-mix(in srgb, var(--surface-1) 15%, transparent)" }}
                >
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid var(--t-line)` }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          color: accentColor,
                          letterSpacing: "0.05em",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <List size={13} />{" "}
                        {isBorrowed ? "Loans Received (Tranches)" : "Loans Given (Tranches)"}
                      </div>
                      <button
                        style={{
                          ...btnGhost,
                          fontSize: 11,
                          padding: "4px 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "color-mix(in srgb, var(--t-accent) 8%, transparent)",
                          color: "var(--t-accent)",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                        onClick={() => setTrancheTarget(person)}
                      >
                        <Plus size={11} /> Add Tranche
                      </button>
                    </div>
                    <DataTable
                      columns={[
                        {
                          key: "date",
                          header: "Date",
                          accessor: (t: any) => {
                            const tDueOverdue =
                              t.dueDate && outstanding > 0 && new Date(t.dueDate + "T00:00:00") < now;
                            return (
                              <span style={{ color: "var(--t-muted)" }}>
                                {fmtD(t.date)}
                                {t.dueDate && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      marginTop: 2,
                                      fontWeight: tDueOverdue ? 800 : 500,
                                      color: tDueOverdue ? "var(--t-rust)" : "var(--t-muted)",
                                    }}
                                  >
                                    Due {fmtD(t.dueDate)}
                                  </div>
                                )}
                              </span>
                            );
                          },
                        },
                        {
                          key: "amount",
                          header: "Amount",
                          align: "right",
                          accessor: (t: any) => (
                            <span style={{ fontWeight: 800, color: accentColor, fontVariantNumeric: "tabular-nums" }}>
                              <Money value={t.amount} variant="exact" />
                            </span>
                          ),
                        },
                        {
                          key: "note",
                          header: "Note",
                          accessor: (t: any) => <span style={{ color: "var(--t-muted)" }}>{t.note || "—"}</span>,
                        },
                      ]}
                      data={tranches}
                      hideSearch
                      keyExtractor={(t: any) => t.id}
                      emptyState={<span>No loans recorded yet</span>}
                      actions={(t: any) => (
                        <button
                          style={{
                            ...iconBtn,
                            color: "var(--t-muted)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 4,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--t-rust)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--t-muted)";
                          }}
                          onClick={() =>
                            setConfirmDeleteTranche({
                              personId: person.id,
                              updated: tranches.filter((x: any) => x.id !== t.id),
                            })
                          }
                          aria-label="Delete tranche"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      footer={
                        <tr>
                          <td style={{ ...td, paddingLeft: 0, fontWeight: 800, color: "var(--t-ink)" }}>
                            Total
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: "right",
                              fontWeight: 900,
                              color: accentColor,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <Money value={totalT} variant="exact" />
                          </td>
                          <td colSpan={2} style={td}></td>
                        </tr>
                      }
                    />
                  </div>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid var(--t-line)` }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          color: "var(--t-sage)",
                          letterSpacing: "0.05em",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <CheckCircle2 size={13} />{" "}
                        {isBorrowed ? "Repayments Made" : "Repayments Received"}
                      </div>
                      <button
                        style={{
                          ...btnGhost,
                          fontSize: 11,
                          padding: "4px 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "color-mix(in srgb, var(--t-sage) 8%, transparent)",
                          color: "var(--t-sage)",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                        onClick={() => setPaymentTarget(person)}
                      >
                        <Plus size={11} /> Record Payment
                      </button>
                    </div>
                    <DataTable
                      columns={[
                        {
                          key: "date",
                          header: "Date",
                          accessor: (p: any) => <span style={{ color: "var(--t-muted)" }}>{fmtD(p.date)}</span>,
                        },
                        {
                          key: "amount",
                          header: "Amount",
                          align: "right",
                          accessor: (p: any) => (
                            <span style={{ fontWeight: 800, color: "var(--t-sage)", fontVariantNumeric: "tabular-nums" }}>
                              <Money value={p.amount} variant="exact" />
                            </span>
                          ),
                        },
                        {
                          key: "note",
                          header: "Note",
                          accessor: (p: any) => <span style={{ color: "var(--t-muted)" }}>{p.note || "—"}</span>,
                        },
                      ]}
                      data={payments}
                      hideSearch
                      keyExtractor={(p: any) => p.id}
                      emptyState={<span>No payments recorded yet</span>}
                      actions={(p: any) => (
                        <button
                          style={{
                            ...iconBtn,
                            color: "var(--t-muted)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 4,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--t-rust)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--t-muted)";
                          }}
                          onClick={() =>
                            setConfirmDeletePayment({
                              personId: person.id,
                              updated: payments.filter((x: any) => x.id !== p.id),
                            })
                          }
                          aria-label="Delete payment"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      footer={
                        <tr>
                          <td style={{ ...td, paddingLeft: 0, fontWeight: 800, color: "var(--t-ink)" }}>
                            Total Paid
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: "right",
                              fontWeight: 900,
                              color: "var(--t-sage)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <Money value={totalP} variant="exact" />
                          </td>
                          <td colSpan={2} style={td}></td>
                        </tr>
                      }
                    />
                  </div>
                  <div
                    style={{
                      padding: "12px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ color: "var(--t-muted)" }}>Ledger Balance: </span>
                    <span
                      style={{
                        color: overpaid ? "var(--t-gold)" : settled ? "var(--t-sage)" : accentColor,
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      {overpaid ? (
                        <>
                          Overpaid by <Money value={overpaidAmt} variant="full" />
                        </>
                      ) : settled ? (
                        "Fully Settled ✓"
                      ) : (
                        <>
                          <Money value={outstanding} variant="full" /> pending
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {addPersonOpen && (
        <Modal title={`Add ${personLabel}`} onClose={() => setAddPersonOpen(false)}>
          <InformalPersonForm
            personLabel={personLabel}
            onSave={(v: any) => {
              onAddPerson(v);
              setAddPersonOpen(false);
            }}
            onClose={() => setAddPersonOpen(false)}
          />
        </Modal>
      )}
      {trancheTarget && (
        <Modal title={`Add Loan — ${trancheTarget.person}`} onClose={() => setTrancheTarget(null)}>
          <InformalAmountForm
            label={isBorrowed ? "Amount Borrowed" : "Amount Lent"}
            showDueDate
            onSave={(entry: any) => {
              const updated = [
                ...(trancheTarget.tranches || []),
                { id: `tr-${Date.now()}`, ...entry },
              ];
              onUpdate(trancheTarget.id, { tranches: updated });
              setTrancheTarget(null);
            }}
            onClose={() => setTrancheTarget(null)}
          />
        </Modal>
      )}
      {paymentTarget && (
        <Modal
          title={`Record Payment — ${paymentTarget.person}`}
          onClose={() => setPaymentTarget(null)}
        >
          <InformalAmountForm
            label={isBorrowed ? "Amount Repaid" : "Amount Received"}
            onSave={(entry: any) => {
              const updated = [
                ...(paymentTarget.payments || []),
                { id: `pm-${Date.now()}`, ...entry },
              ];
              onUpdate(paymentTarget.id, { payments: updated });
              setPaymentTarget(null);
            }}
            onClose={() => setPaymentTarget(null)}
          />
        </Modal>
      )}
      {confirmDeletePerson && (
        <ConfirmDialog
          message={`Delete "${confirmDeletePerson.person || "this person"}" and all their loan/payment history? This cannot be undone.`}
          onConfirm={() => {
            onRemove(confirmDeletePerson.id);
            setConfirmDeletePerson(null);
          }}
          onCancel={() => setConfirmDeletePerson(null)}
        />
      )}
      {confirmDeleteTranche && (
        <ConfirmDialog
          message="Delete this loan tranche? This cannot be undone."
          onConfirm={() => {
            onUpdate(confirmDeleteTranche.personId, { tranches: confirmDeleteTranche.updated });
            setConfirmDeleteTranche(null);
          }}
          onCancel={() => setConfirmDeleteTranche(null)}
        />
      )}
      {confirmDeletePayment && (
        <ConfirmDialog
          message="Delete this payment record? This cannot be undone."
          onConfirm={() => {
            onUpdate(confirmDeletePayment.personId, { payments: confirmDeletePayment.updated });
            setConfirmDeletePayment(null);
          }}
          onCancel={() => setConfirmDeletePayment(null)}
        />
      )}
    </div>
  );
}

function InformalPersonForm({ personLabel, initial = null, onSave, onClose, saving }: any) {
  const { familyProfiles } = useMasterData();
  // Edit mode intentionally omits tranches/payments from local state — onSave below
  // sends only {owner, person, note} so the patch merge in updateItem can't clobber
  // the person's existing loan/payment history with an empty array.
  const [f, setF] = useState(
    initial
      ? { owner: initial.owner || "self", person: initial.person || "", note: initial.note || "" }
      : { owner: "self", person: "", note: "", tranches: [], payments: [] }
  );
  return (
    <>
      <Field label="Owner / Profile">
        <select
          style={input}
          value={f.owner}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={`${personLabel} Name`}>
        <input
          style={input}
          value={f.person}
          placeholder="e.g. Raj, Mom"
          onChange={(e) => setF({ ...f, person: e.target.value })}
        />
      </Field>
      <Field label="Note (optional)">
        <input
          style={input}
          value={f.note}
          placeholder="e.g. for house repairs"
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </Field>
      <ModalActions
        onSave={() => f.person && onSave({ ...f })}
        onClose={onClose}
        saveLabel={initial ? "Save" : "Add"}
        disabled={saving}
        loading={saving}
      />
    </>
  );
}

function InformalAmountForm({ label, showDueDate = false, onSave, onClose }: any) {
  const [f, setF] = useState({ amount: "", date: today(), dueDate: "", note: "" });
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={label + " (₹)"}>
          <input
            style={input}
            type="number"
            min="1"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
        <Field label="Date">
          <input
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
      </div>
      {showDueDate && (
        <Field label="Repayment Due Date (optional)">
          <input
            style={input}
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
          />
        </Field>
      )}
      <Field label="Note (optional)">
        <input
          style={input}
          value={f.note}
          placeholder="e.g. cash, UPI"
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </Field>
      <ModalActions
        onSave={() =>
          Number(f.amount) > 0 &&
          onSave(showDueDate ? f : { amount: f.amount, date: f.date, note: f.note })
        }
        onClose={onClose}
        saveLabel="Save"
      />
    </>
  );
}

function LoanTakenModal({ onClose, onSave, initial = null, saving }: any) {
  const { loanTypes, familyProfiles } = useMasterData();
  const [f, setF] = useState(
    initial || {
      lender: "",
      type: loanTypes[0] || "Personal",
      principal: "",
      outstanding: "",
      emi: "",
      rate: "",
      monthsRemaining: "",
      dueDay: "",
      note: "",
      owner: "self",
    }
  );
  return (
    <Modal title={initial ? "Edit Loan Taken" : "Add Loan Taken"} onClose={onClose}>
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
      <Field label="Lender">
        <input
          style={input}
          value={f.lender}
          onChange={(e) => setF({ ...f, lender: e.target.value })}
        />
      </Field>
      <Field label="Type">
        <select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          {loanTypes.map((t: string) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Original Principal">
          <input
            style={input}
            type="number"
            min="0"
            value={f.principal}
            onChange={(e) => {
              const val = e.target.value;
              setF((prev: any) => ({
                ...prev,
                principal: val,
                outstanding:
                  prev.outstanding === "" || prev.outstanding === prev.principal
                    ? val
                    : prev.outstanding,
              }));
            }}
          />
        </Field>
        <Field label="Outstanding">
          <input
            style={input}
            type="number"
            min="0"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
          />
        </Field>
        <Field label="EMI">
          <input
            style={input}
            type="number"
            min="0"
            value={f.emi}
            onChange={(e) => setF({ ...f, emi: e.target.value })}
          />
        </Field>
        <Field label="Interest Rate (%)">
          <input
            style={input}
            type="number"
            min="0"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
          />
        </Field>
        <Field label="Months Remaining">
          <input
            style={input}
            type="number"
            min="0"
            value={f.monthsRemaining}
            onChange={(e) => setF({ ...f, monthsRemaining: e.target.value })}
          />
        </Field>
        <Field label="EMI Due Day (optional)">
          <input
            style={input}
            type="number"
            min={1}
            max={31}
            placeholder="e.g. 5"
            value={f.dueDay}
            onChange={(e) => setF({ ...f, dueDay: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Note (optional)">
        <input
          style={input}
          value={f.note}
          placeholder="e.g. loan account number, purpose"
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </Field>
      <ModalActions
        onSave={() => {
          if (
            !f.lender?.trim() ||
            !(Number(f.principal) > 0) ||
            !(Number(f.emi) > 0) ||
            f.rate === "" ||
            f.rate == null
          )
            return;
          const outstanding = f.outstanding !== "" ? f.outstanding : f.principal;
          onSave({ ...f, outstanding: Math.max(0, Number(outstanding) || 0) });
        }}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Loan Taken"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

function LoanGivenModal({ onClose, onSave, initial = null, saving }: any) {
  const { familyProfiles } = useMasterData();
  const [f, setF] = useState(
    initial || {
      borrower: "",
      principal: "",
      outstanding: "",
      rate: "",
      date: today(),
      dueDate: "",
      note: "",
      owner: "self",
    }
  );
  return (
    <Modal title={initial ? "Edit Loan Given" : "Record Loan Given"} onClose={onClose}>
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
      <Field label="Borrower Name">
        <input
          style={input}
          value={f.borrower}
          onChange={(e) => setF({ ...f, borrower: e.target.value })}
          placeholder="e.g. John Doe"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Principal (₹)">
          <input
            style={input}
            type="number"
            min="0"
            value={f.principal}
            onChange={(e) => {
              const val = e.target.value;
              setF((prev: any) => {
                const shouldSync = !prev.outstanding || prev.outstanding === prev.principal;
                return {
                  ...prev,
                  principal: val,
                  outstanding: shouldSync ? val : prev.outstanding,
                };
              });
            }}
            placeholder="0.00"
          />
        </Field>
        <Field label="Outstanding Balance (₹)">
          <input
            style={input}
            type="number"
            min="0"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
            placeholder={f.principal || "0.00"}
          />
        </Field>
        <Field label="Interest Rate (% p.a.)">
          <input
            style={input}
            type="number"
            min="0"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
            placeholder="e.g. 12"
          />
        </Field>
        <Field label="Given On">
          <input
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label="Due By">
          <input
            style={input}
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Note / Purpose">
        <input
          style={input}
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
          placeholder="e.g. Friendly loan for emergency expense"
        />
      </Field>
      <div
        style={{
          fontSize: 11,
          color: "var(--t-muted)",
          marginTop: -4,
          marginBottom: 12,
          fontStyle: "italic",
        }}
      >
        * Outstanding balance defaults to the principal amount if left empty.
      </div>
      <ModalActions
        onSave={() => {
          if (!f.borrower?.trim() || !(Number(f.principal) > 0)) return;
          if (f.dueDate && f.date && f.dueDate < f.date) return;
          const outstanding = f.outstanding !== "" ? f.outstanding : f.principal;
          onSave({ ...f, outstanding: Math.max(0, Number(outstanding) || 0) });
        }}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Record Loan Given"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   DEBT PAYOFF OPTIMIZER (RELEASE 4)
   ══════════════════════════════════════════════════════════════════════ */
const DEBT_SIM_MAX_MONTHS = 600;
// Standard Indian card-issuer convention: minimum due ≈ 5% of outstanding, floored at ₹500.
// Used as a stand-in "EMI" so revolving credit card debt can be simulated by the same
// fixed-monthly-payment engine as term loans — it's an estimate, surfaced as such in the UI.
const CC_MIN_DUE_RATE = 0.05;
const CC_MIN_DUE_FLOOR = 500;
const CC_DEFAULT_APR = 36;

function DebtPayoffOptimizer({ state }: any) {
  const [extraMonthly, setExtraMonthly] = useState<number>(10000);
  const [windfall, setWindfall] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<"snowball" | "avalanche">("avalanche");
  const [includeCC, setIncludeCC] = useState<boolean>(true);

  // Term loans — normalized once here (rather than re-derived per simulation call) so the
  // same shape feeds the simulator, the timeline render, and the CSV export identically.
  const normalizedLoans = useMemo(() => {
    return (state.loansTaken || [])
      .map((l: any) => {
        const outstanding = loanOutstanding(l);
        return {
          id: `loan-${l.id}`,
          lender: l.lender || "Loan",
          type: l.type || "Loan",
          outstanding,
          emi: Number(l.emi) || 0,
          rate: l.rate != null && l.rate !== "" ? Number(l.rate) : 8.5,
          monthsRemaining: Number(l.monthsRemaining) || 0,
          principal: Number(l.principal) || outstanding,
          isCard: false,
          emiIsEstimate: false,
        };
      })
      .filter((l: any) => l.outstanding > 0 && l.emi > 0);
  }, [state.loansTaken]);

  // Credit cards carry no fixed EMI, so a standard-issuer minimum-due estimate stands
  // in for one — surfaced with an "Est." badge below so it doesn't read as real data.
  const normalizedCards = useMemo(() => {
    if (!includeCC) return [];
    return (state.creditCards || [])
      .filter((c: any) => (c.status || "active").toLowerCase() !== "closed")
      .map((c: any) => {
        const outstanding = Number(c.outstanding) || 0;
        const rate =
          c.interestRate != null && c.interestRate !== "" ? Number(c.interestRate) : CC_DEFAULT_APR;
        const minDue = Math.min(outstanding, Math.max(outstanding * CC_MIN_DUE_RATE, CC_MIN_DUE_FLOOR));
        return {
          id: `cc-${c.id}`,
          lender: c.issuer || "Credit Card",
          type: "Credit Card",
          outstanding,
          emi: Math.round(minDue),
          rate,
          monthsRemaining: 0,
          principal: outstanding,
          isCard: true,
          emiIsEstimate: true,
        };
      })
      .filter((c: any) => c.outstanding > 0);
  }, [state.creditCards, includeCC]);

  const activeLoans = useMemo(
    () => [...normalizedLoans, ...normalizedCards],
    [normalizedLoans, normalizedCards]
  );

  // True only when there is genuinely nothing recorded anywhere (not just filtered out
  // by the Include Credit Card Debt toggle) — drives the full "go add a loan" empty state
  // vs. a lighter "nothing included right now" message that keeps the toggle reachable.
  const hasAnyRawDebt =
    (state.loansTaken || []).some((l: any) => loanOutstanding(l) > 0) ||
    (state.creditCards || []).some(
      (c: any) => (c.status || "active").toLowerCase() !== "closed" && Number(c.outstanding) > 0
    );

  // Loans with a real outstanding balance that get silently excluded above
  // because they have no EMI on file — surfaced so the aggregated totals
  // don't look complete when they're actually missing data.
  const excludedLoans = useMemo(() => {
    return (state.loansTaken || []).filter(
      (l: any) => loanOutstanding(l) > 0 && Number(l.emi || 0) <= 0
    );
  }, [state.loansTaken]);

  // 1. Payoff Simulator algorithm
  const simulateDebtPayoff = (
    loans: any[],
    extra: number,
    strategy: "standard" | "snowball" | "avalanche",
    windfallAmt: number
  ) => {
    // Inputs are already normalized (see normalizedLoans/normalizedCards) — a fresh
    // shallow copy per call is still needed since this loop mutates `outstanding`.
    let active = loans.map((l) => ({ ...l })).filter((l) => l.outstanding > 0);

    if (active.length === 0)
      return { months: 0, totalInterestPaid: 0, payoffSchedule: {}, rollOvers: {} };

    // Pre-sort by strategy
    if (strategy === "snowball") {
      active.sort((a, b) => a.outstanding - b.outstanding);
    } else if (strategy === "avalanche") {
      active.sort((a, b) => b.rate - a.rate);
    }

    let months = 0;
    let totalInterestPaid = 0;
    const payoffSchedule: Record<string, number> = {};
    const rollOvers: Record<string, number> = {};

    // Apply initial windfall paydown
    if (windfallAmt > 0) {
      let remainingWindfall = windfallAmt;
      for (let l of active) {
        if (remainingWindfall <= 0) break;
        const pay = Math.min(l.outstanding, remainingWindfall);
        l.outstanding -= pay;
        remainingWindfall -= pay;
        if (l.outstanding <= 0 && !payoffSchedule[l.id]) {
          payoffSchedule[l.id] = 0;
        }
      }
    }

    // Amortization loop
    while (active.some((l) => l.outstanding > 0) && months < DEBT_SIM_MAX_MONTHS) {
      months++;

      // Accrue interest monthly
      for (const l of active) {
        if (l.outstanding > 0) {
          const r = l.rate / 100 / 12;
          const interest = l.outstanding * r;
          totalInterestPaid += interest;
          l.outstanding += interest;
        }
      }

      // Sum up EMIs that are currently active
      const totalBudget = active.reduce((sum, l) => sum + l.emi, 0) + extra;

      let actualBasePaid = 0;

      // Step 1: Pay standard base EMIs
      for (const l of active) {
        if (l.outstanding > 0) {
          const basePay = Math.min(l.outstanding, l.emi);
          l.outstanding -= basePay;
          actualBasePaid += basePay;

          if (l.outstanding <= 0 && !payoffSchedule[l.id]) {
            payoffSchedule[l.id] = months;
          }
        }
      }

      // Step 2: Allocate surplus roll-overs to active targets in sorted-priority
      // order, cascading any leftover to the next target once one clears mid-month.
      if (strategy !== "standard") {
        let surplus = totalBudget - actualBasePaid;
        for (const target of active) {
          if (surplus <= 0) break;
          if (target.outstanding <= 0) continue;
          const extraPay = Math.min(target.outstanding, surplus);
          rollOvers[target.id] = (rollOvers[target.id] || 0) + extraPay;
          target.outstanding -= extraPay;
          surplus -= extraPay;

          if (target.outstanding <= 0 && !payoffSchedule[target.id]) {
            payoffSchedule[target.id] = months;
          }
        }
      }
    }

    return {
      months,
      totalInterestPaid,
      payoffSchedule,
      rollOvers,
    };
  };

  // Simulate strategies
  const standardSim = useMemo(
    () => simulateDebtPayoff(activeLoans, 0, "standard", 0),
    [activeLoans]
  );
  const snowballSim = useMemo(
    () => simulateDebtPayoff(activeLoans, extraMonthly, "snowball", Number(windfall) || 0),
    [activeLoans, extraMonthly, windfall]
  );
  const avalancheSim = useMemo(
    () => simulateDebtPayoff(activeLoans, extraMonthly, "avalanche", Number(windfall) || 0),
    [activeLoans, extraMonthly, windfall]
  );

  if (!hasAnyRawDebt) {
    return (
      <Card style={{ padding: "48px 32px", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "var(--t-muted)",
          }}
        >
          <Sparkles size={40} strokeWidth={1.5} />
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: THEME.ink,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          No Active Liabilities Found
        </div>
        <div
          style={{
            fontSize: 13,
            color: THEME.muted,
            maxWidth: 380,
            margin: "0 auto 16px",
            lineHeight: 1.6,
          }}
        >
          Add your active home, car, or personal bank loans under the <b>Loans Taken</b> tab, or a
          credit card under <b>Credit Cards</b>, to feed the optimizer! Once entered, you can
          compare snowball and avalanche schedules.
        </div>
      </Card>
    );
  }

  // Only reachable when Include Credit Card Debt is toggled off and there are no term
  // loans on file — keep the toggle reachable here instead of falling through to the
  // "go add a loan" empty state above, which would be wrong (debt does exist, it's hidden).
  if (activeLoans.length === 0) {
    return (
      <Card style={{ padding: "40px 32px", textAlign: "center" }}>
        <CreditCard size={30} color={THEME.accent} style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
          Nothing Included Right Now
        </div>
        <div
          style={{
            fontSize: 13,
            color: THEME.muted,
            maxWidth: 380,
            margin: "0 auto 20px",
            lineHeight: 1.6,
          }}
        >
          You have credit card debt on file, but it's currently excluded from this simulation.
        </div>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
            color: THEME.ink,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={includeCC}
            onChange={(e) => setIncludeCC(e.target.checked)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          Include Credit Card Debt (Est. Min Due)
        </label>
      </Card>
    );
  }

  const currentSim = selectedPlan === "snowball" ? snowballSim : avalancheSim;
  const standardInterest = standardSim.totalInterestPaid;
  const currentInterest = currentSim.totalInterestPaid;
  const interestSaved = Math.max(0, standardInterest - currentInterest);
  const monthsSaved = Math.max(0, standardSim.months - currentSim.months);

  // Both strategies get simulated regardless of which one is selected — surface the
  // head-to-head difference so choosing between them isn't a guess.
  const cheaperPlan =
    avalancheSim.totalInterestPaid <= snowballSim.totalInterestPaid ? "Avalanche" : "Snowball";
  const cheaperSim = cheaperPlan === "Avalanche" ? avalancheSim : snowballSim;
  const pricierSim = cheaperPlan === "Avalanche" ? snowballSim : avalancheSim;
  const interestDiffVsOtherPlan = pricierSim.totalInterestPaid - cheaperSim.totalInterestPaid;
  const monthsDiffVsOtherPlan = pricierSim.months - cheaperSim.months; // >0 = cheaper plan is also faster

  // Format payoff dates
  const getPayoffDateStr = (monthsFromNow: number) => {
    if (monthsFromNow === 0) return "Paid Today";
    if (monthsFromNow >= DEBT_SIM_MAX_MONTHS) return "Beyond 50y";
    const date = new Date();
    date.setMonth(date.getMonth() + monthsFromNow);
    return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };

  const currentSimCapped =
    currentSim.months >= DEBT_SIM_MAX_MONTHS &&
    activeLoans.some((l: any) => currentSim.payoffSchedule[l.id] == null);

  // Standard (no-extra) baseline never actually paying off a loan means its EMI doesn't
  // cover monthly interest — the loop still returns a finite number by hitting the 50y
  // cap, but that number is a simulation artifact, not a real "what you'd pay" figure.
  // Left unflagged, "Total Interest Saved" reads as a real comparison when it isn't.
  const standardCapped =
    standardSim.months >= DEBT_SIM_MAX_MONTHS &&
    activeLoans.some((l: any) => standardSim.payoffSchedule[l.id] == null);

  // Total debt snapshot — an at-a-glance view of everything the optimizer is aggregating.
  const totalOutstandingDebt = activeLoans.reduce((s: number, l: any) => s + l.outstanding, 0);
  const totalMonthlyCommitment = activeLoans.reduce((s: number, l: any) => s + l.emi, 0);
  const blendedRate =
    totalOutstandingDebt > 0
      ? activeLoans.reduce((s: number, l: any) => s + l.rate * l.outstanding, 0) / totalOutstandingDebt
      : 0;

  // Shared by both the timeline render and the CSV export so payoff-date math lives in
  // exactly one place. Sorted by actual payoff month — the section is titled
  // "Chronological Payoff Timeline", so raw activeLoans insertion order (which is just
  // loans-then-cards) would mislabel a loan clearing in 2033 as "#1" ahead of a card
  // that's actually gone in 2026.
  const timelineRows = activeLoans
    .map((l: any) => {
      // Absence from payoffSchedule means the loan was still unpaid when the simulation
      // hit its horizon cap — falling back to 0 would wrongly show "Paid Today".
      const targetPayoffMonth =
        currentSim.payoffSchedule[l.id] != null ? currentSim.payoffSchedule[l.id] : currentSim.months;
      const standardPayoffMonth =
        standardSim.payoffSchedule[l.id] != null
          ? standardSim.payoffSchedule[l.id]
          : standardSim.months || Number(l.monthsRemaining) || 0;
      const monthsSavedOnLoan =
        targetPayoffMonth >= DEBT_SIM_MAX_MONTHS ? 0 : Math.max(0, standardPayoffMonth - targetPayoffMonth);
      const rolledOver = currentSim.rollOvers?.[l.id] || 0;
      return { ...l, targetPayoffMonth, monthsSavedOnLoan, rolledOver };
    })
    .sort((a, b) => a.targetPayoffMonth - b.targetPayoffMonth);

  const exportScheduleCsv = () => {
    const header =
      "Lender,Type,Rate (%),Outstanding,Monthly Payment,EMI Basis,Payoff Date,Months Saved vs Standard";
    const rows = timelineRows.map(
      (r: any) =>
        `"${(r.lender || "").replace(/"/g, '""')}","${r.type}",${r.rate.toFixed(2)},${r.outstanding.toFixed(0)},${r.emi.toFixed(0)},${r.emiIsEstimate ? "Est. Min Due" : "EMI"},"${getPayoffDateStr(r.targetPayoffMonth)}",${r.monthsSavedOnLoan}`
    );
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debt_payoff_schedule_${selectedPlan}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="tab-content-enter"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* ── TOTAL DEBT SNAPSHOT ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Total Outstanding Debt"
          value={fmtINRExact(totalOutstandingDebt)}
          numericValue={totalOutstandingDebt}
          formatValue={fmtINRExact}
          sub={`${activeLoans.length} liabilit${activeLoans.length === 1 ? "y" : "ies"} aggregated`}
          icon={<Wallet />}
          color={THEME.rust}
        />
        <StatCard
          label="Monthly Commitment"
          value={fmtINRExact(totalMonthlyCommitment)}
          numericValue={totalMonthlyCommitment}
          formatValue={fmtINRExact}
          sub="Base EMIs + est. min dues"
          icon={<Calendar />}
          color={THEME.gold}
        />
        <StatCard
          label="Blended Avg Rate"
          value={`${blendedRate.toFixed(2)}%`}
          numericValue={blendedRate}
          formatValue={(n) => `${n.toFixed(2)}%`}
          sub="Weighted by outstanding"
          icon={<Calculator />}
          color={THEME.accent}
        />
        <StatCard
          label="Debt-Free Target"
          value={getPayoffDateStr(currentSim.months)}
          sub={`${selectedPlan === "avalanche" ? "Avalanche" : "Snowball"} plan`}
          icon={<Sparkles />}
          color={THEME.sage}
        />
      </div>

      {/* ── INTERACTIVE SURPLUS & WINDFALL CONSOLE ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
          gap: 20,
        }}
      >
        <Card style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: THEME.muted,
              }}
            >
              Liabilities Control Console
            </div>
            {(state.creditCards || []).some(
              (c: any) => (c.status || "active").toLowerCase() !== "closed" && Number(c.outstanding) > 0
            ) && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: THEME.ink,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={includeCC}
                  onChange={(e) => setIncludeCC(e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer" }}
                />
                Include Credit Cards
              </label>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <label
                  htmlFor="extra-monthly-repayment"
                  style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}
                >
                  Extra Monthly Repayment
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={extraMonthly}
                  onChange={(e) => setExtraMonthly(Math.max(0, Number(e.target.value)))}
                  aria-label="Extra monthly repayment amount"
                  style={{
                    width: 110,
                    padding: "4px 8px",
                    borderRadius: 8,
                    border: `1.5px solid ${THEME.line}`,
                    background: "transparent",
                    color: THEME.accent,
                    fontSize: 14,
                    fontWeight: 800,
                    textAlign: "right",
                    outline: "none",
                  }}
                />
              </div>
              <input
                id="extra-monthly-repayment"
                type="range"
                min="0"
                max="100000"
                step="2000"
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="cxo-slider"
                aria-label="Extra monthly repayment slider"
                aria-valuetext={`${fmtINRExact(extraMonthly)} per month`}
                style={{
                  width: "100%",
                  accentColor: THEME.accent,
                  height: 6,
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: THEME.muted,
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                <span>₹0 (None)</span>
                <span>₹50,000</span>
                <span>₹1,00,000</span>
              </div>
            </div>

            <div>
              <Field label="One-Time Repayment Windfall (₹)">
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="e.g. ₹1,00,000 bonus or stock sale"
                  value={windfall}
                  onChange={(e) =>
                    setWindfall(e.target.value === "" ? "" : String(Math.max(0, Number(e.target.value))))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${THEME.line}`,
                    background: "transparent",
                    color: THEME.ink,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </Field>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {[25000, 50000, 100000, 250000].map((val) => {
                  const isActive = windfall === String(val);
                  return (
                    <button
                      key={val}
                      onClick={() => setWindfall(String(val))}
                      className="card-lift"
                      aria-pressed={isActive}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        border: `1px solid ${isActive ? THEME.accent : THEME.line}`,
                        background: isActive
                          ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                          : "var(--surface-0)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: isActive ? THEME.accent : THEME.muted,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      +<Money value={val} variant="full" />
                    </button>
                  );
                })}
                {windfall && (
                  <button
                    onClick={() => setWindfall("")}
                    className="card-lift"
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
                      background: `color-mix(in srgb, ${THEME.rust} 4%, transparent)`,
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.rust,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ── COMPARATIVE SCORECARD ── */}
        <Card
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 95%, var(--t-sage) 5%), var(--surface-0))",
            border: `1px solid ${THEME.line}`,
            borderTop: `4px solid ${THEME.sage}`,
            color: THEME.ink,
            borderRadius: "var(--radius-xl)",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: THEME.muted,
                marginBottom: 8,
              }}
            >
              <Sparkles size={13} color={THEME.sage} /> Total Interest Saved
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 5vw, 44px)",
                fontWeight: 900,
                color: THEME.sage,
                marginBottom: 6,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Money value={interestSaved} variant="exact" />
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>
              Debt-Free:{" "}
              <span style={{ color: THEME.sage, fontWeight: 800 }}>
                {getPayoffDateStr(currentSim.months)}
              </span>{" "}
              &bull; Shaved{" "}
              <span style={{ color: THEME.sage, fontWeight: 800 }}>{monthsSaved} Months</span>
            </div>
          </div>

          <div
            style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${THEME.line}` }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 11 }}>
              <div>
                <div
                  style={{
                    color: THEME.muted,
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  Standard Interest
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    fontWeight: 800,
                    color: THEME.ink,
                    marginTop: 2,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Money value={standardInterest} variant="exact" />
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: THEME.muted,
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  Simulated Interest
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    fontWeight: 800,
                    color: THEME.ink,
                    marginTop: 2,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Money value={currentInterest} variant="exact" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── STRATEGY SELECTOR ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            {
              id: "avalanche",
              label: "Debt Avalanche",
              desc: "Highest Rate First",
              detail: "Optimal",
              color: THEME.accent,
            },
            {
              id: "snowball",
              label: "Debt Snowball",
              desc: "Lowest Balance First",
              detail: "Psychological win",
              color: THEME.gold,
            },
          ].map((plan) => {
            const active = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id as any)}
                className="card-lift"
                style={{
                  padding: "12px 18px",
                  borderRadius: 14,
                  border: `1.5px solid ${active ? plan.color : THEME.line}`,
                  background: active
                    ? `color-mix(in srgb, ${plan.color} 8%, var(--surface-0))`
                    : "var(--surface-0)",
                  color: active ? plan.color : THEME.ink,
                  fontWeight: 800,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>{plan.label}</div>
                <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 500, marginTop: 3 }}>
                  {plan.detail} &bull; {plan.desc}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {excludedLoans.length > 0 && (
            <Badge
              variant="rust"
              title={`${excludedLoans.length} loan(s) have an outstanding balance but no EMI on file, so they're excluded from this simulation`}
              style={{ fontWeight: 800, fontSize: 10.5, padding: "4px 10px", borderRadius: 10 }}
            >
              {excludedLoans.length} Excluded (No EMI)
            </Badge>
          )}
          <Badge
            variant="muted"
            style={{ fontWeight: 800, fontSize: 10.5, padding: "4px 10px", borderRadius: 10 }}
          >
            {activeLoans.length} Liabilities Aggregated
          </Badge>
        </div>
      </div>

      {activeLoans.length > 1 && interestDiffVsOtherPlan > 1 && (
        <div
          style={{
            fontSize: 11.5,
            color: THEME.muted,
            fontWeight: 600,
            padding: "0 4px",
          }}
        >
          At this Extra Repayment + Windfall, <b style={{ color: THEME.ink }}>{cheaperPlan}</b>{" "}
          saves <Money value={interestDiffVsOtherPlan} variant="exact" /> more interest
          {monthsDiffVsOtherPlan !== 0 &&
            ` and clears debt ${Math.abs(monthsDiffVsOtherPlan)} month${Math.abs(monthsDiffVsOtherPlan) !== 1 ? "s" : ""} ${monthsDiffVsOtherPlan > 0 ? "sooner" : "later"}`}{" "}
          than {cheaperPlan === "Avalanche" ? "Snowball" : "Avalanche"}.
        </div>
      )}

      {currentSimCapped && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: `1.5px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
            background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
            color: THEME.rust,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          At the current extra payment, one or more loans won't be paid off within 50 years —
          increase your Extra Monthly Repayment above to see a realistic payoff date.
        </div>
      )}

      {standardCapped && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 12,
            border: `1.5px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
            background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
            color: THEME.rust,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            At least one debt's minimum payment doesn't cover its own monthly interest — under
            standard (no-extra) repayment it would never actually clear. The "Total Interest
            Saved" figure above is capped at our 50-year simulation horizon, not a true
            payoff comparison — treat it as a floor, not a real number.
          </span>
        </div>
      )}

      {/* ── STEP-BY-STEP AMORTIZATION SCHEDULE ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        <Card style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: THEME.muted,
              }}
            >
              Chronological Payoff Timeline ({selectedPlan.toUpperCase()})
            </div>
            <button
              onClick={exportScheduleCsv}
              className="card-lift"
              title="Export this payoff schedule as CSV"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
                fontSize: 10.5,
                fontWeight: 700,
                color: THEME.muted,
                cursor: "pointer",
              }}
            >
              <Download size={12} /> Export CSV
            </button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {timelineRows.map((l: any, idx: number) => {
              const { targetPayoffMonth, monthsSavedOnLoan, rolledOver } = l;

              return (
                <div
                  key={l.id}
                  className="card-lift"
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${THEME.sage} 9%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      color: THEME.sage,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
                    >
                      <span style={{ fontWeight: 800, fontSize: 13.5, color: THEME.ink }}>
                        {l.lender}
                      </span>
                      <Badge variant="muted" style={{ fontSize: 9.5 }}>
                        {l.type || "Loan"}
                      </Badge>
                      <Badge
                        variant={l.rate >= 20 ? "rust" : l.rate >= 10 ? "gold" : "sage"}
                        style={{ fontSize: 9.5 }}
                      >
                        {l.rate.toFixed(2)}% p.a.
                      </Badge>
                      {l.emiIsEstimate && (
                        <Badge
                          variant="muted"
                          title="Estimated at 5% of outstanding (standard issuer minimum due), floored at ₹500 — not a fixed figure from your card"
                          style={{ fontSize: 9.5 }}
                        >
                          Est. Min Due
                        </Badge>
                      )}
                    </div>
                    <div
                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 4 }}
                    >
                      Balance: <Money value={l.outstanding} variant="exact" /> &bull;{" "}
                      {l.emiIsEstimate ? "Est. Min Due" : "EMI"}: <Money value={l.emi} variant="exact" />/mo
                      {rolledOver > 0 && (
                        <>
                          {" "}
                          &bull; <span style={{ color: THEME.sage }}>+<Money value={rolledOver} variant="exact" /> extra applied</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 2,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                      {getPayoffDateStr(targetPayoffMonth)}
                    </div>
                    {monthsSavedOnLoan > 0 && (
                      <Badge variant="sage" style={{ fontSize: 9, padding: "2px 6px" }}>
                        Shaved {monthsSavedOnLoan}m
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── CFO ADVISORY CARD ── */}
        <Card
          style={{
            padding: 24,
            borderLeft: `4px solid ${selectedPlan === "avalanche" ? THEME.accent : THEME.gold}`,
            background: "var(--t-card-bg)",
            borderRadius: 16,
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: selectedPlan === "avalanche" ? THEME.accent : THEME.gold,
                flexShrink: 0,
              }}
            >
              <Info size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h4
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  color: THEME.ink,
                  marginBottom: 8,
                  letterSpacing: "-0.01em",
                }}
              >
                {selectedPlan === "avalanche"
                  ? "CFO Advisory: The Avalanche Method"
                  : "CFO Advisory: The Snowball Method"}
              </h4>

              {selectedPlan === "avalanche" ? (
                <p
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    lineHeight: 1.6,
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  The <b>Debt Avalanche</b> is mathematically optimal. It commands you to direct all
                  surplus prepayments to the loan with the <b>highest interest rate</b> first,
                  regardless of the balance size. This ensures you reduce compound interest accrual
                  at the fastest possible rate, yielding the absolute highest financial savings.
                </p>
              ) : (
                <p
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    lineHeight: 1.6,
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  The <b>Debt Snowball</b> prioritizes psychological momentum and cashflow
                  liquidity. It commands you to pay off the <b>smallest outstanding balance</b>{" "}
                  first. Knocking out small loans quickly eliminates entire EMIs, reducing monthly
                  contractual liabilities, and providing immediate psychological wins that encourage
                  long-term debt-free discipline.
                </p>
              )}

              <div
                style={{
                  marginTop: 16,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--surface-1)",
                  border: `1.5px solid ${THEME.line}`,
                  fontSize: 11.5,
                  color: THEME.muted,
                  lineHeight: 1.4,
                  fontWeight: 500,
                }}
              >
                <Lightbulb
                  size={13}
                  style={{ verticalAlign: -2, marginRight: 2, flexShrink: 0 }}
                />{" "}
                <b>CTO Prepayment Rule:</b> If a loan is paid off, its base EMI is immediately
                rolled over and appended to your surplus prepayments, creating a compounding speed
                rollover for remaining loans.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
