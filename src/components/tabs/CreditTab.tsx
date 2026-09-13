/* eslint-disable */
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
  Search,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  Copy,
  Check,
  RotateCcw,
  HelpCircle,
  Phone,
  Layers,
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
import { BankLogo } from "../ui/BrandLogos";
import { LoanTakenSection } from "../credit/LoanTakenSection";
import { LoanGivenSection } from "../credit/LoanGivenSection";
import { LoanTakenModal } from "../credit/LoanTakenModal";
import { LoanGivenModal } from "../credit/LoanGivenModal";
import { InformalLoanSection } from "../credit/InformalLoanSection";
import { InformalPersonModal } from "../credit/InformalPersonModal";
import { DebtPayoffOptimizer } from "../credit/DebtPayoffOptimizer";

export const MONTH_NAMES: string[] = [
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

export function getNextFeeDate(card: {
  annualFee?: string | number;
  feeMonth?: string | number;
  feeDay?: string | number;
}) {
  const fee = Number(card.annualFee || 0);
  const month = Number(card.feeMonth || 0);
  if (!fee || !month || month < 1 || month > 12) return null;

  const rawDay = Number(card.feeDay || 1) || 1;
  const now = new Date();
  const currentYear = now.getFullYear();

  const makeDate = (year: number, m: number, d: number) => {
    // Days in target month
    const daysInMonth = new Date(year, m, 0).getDate();
    const clampedDay = Math.min(Math.max(d, 1), daysInMonth);
    return new Date(year, m - 1, clampedDay, 0, 0, 0, 0);
  };

  let targetDate = makeDate(currentYear, month, rawDay);
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (targetDate.getTime() < todayZero.getTime()) {
    targetDate = makeDate(currentYear + 1, month, rawDay);
  }

  const daysLeft = Math.ceil((targetDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
  const dateStr = `${targetDate.getDate()} ${MONTH_NAMES[targetDate.getMonth()]}`;

  return { targetDate, daysLeft, dateStr };
}

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
  const existingGroups: string[] = Array.from(
    new Set<string>(
      (state.creditCards || []).filter((c: any) => c.sharedGroup).map((c: any) => c.sharedGroup as string)
    )
  );

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
          !(sub === "taken" && !(state.loansTaken || []).length) &&
          !(sub === "given" && !(state.loansGiven || []).length) &&
          !(sub === "cc" && !(state.creditCards || []).length) &&
          !(sub === "prepaid" && !(state.prepaidCards || []).length) && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setModal(sub)}>
              Add {activeMeta.label.split(" ")[0]}
            </Button>
          )}
      </div>

      <div>
        {sub === "cc" && (
          <>
            {(() => {
              const activeCards = (state.creditCards || []).filter(
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
                      : activeCards.length === 0 && (state.creditCards || []).length > 0
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
          <LoanTakenSection
            items={state.loansTaken || []}
            bankAccounts={state.bankAccounts || []}
            onRemove={(id: any) => removeItem("loansTaken", id)}
            onEdit={setEditId}
            onAdd={() => setModal("taken")}
            onUpdate={async (id: any, patch: any) => {
              try {
                await updateItem("loansTaken", id, patch);
              } catch (e: any) {
                showToast?.(`Failed to update loan: ${e?.message || "Unknown error"}`, "error");
              }
            }}
            onAddTransaction={async (txn: any) => {
              try {
                await addItem("transactions", txn);
                showToast?.("Payment recorded and debited from bank account", "success");
              } catch (e: any) {
                showToast?.(`Failed to record bank transaction: ${e?.message || "Unknown error"}`, "error");
              }
            }}
          />
        )}
        {sub === "given" && (
          <LoanGivenSection
            items={state.loansGiven || []}
            bankAccounts={state.bankAccounts || []}
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
            onAddTransaction={async (txn: any) => {
              try {
                await addItem("transactions", txn);
                showToast?.("Receipt recorded and credited to bank account", "success");
              } catch (e: any) {
                showToast?.(`Failed to record bank transaction: ${e?.message || "Unknown error"}`, "error");
              }
            }}
          />
        )}
        {sub === "borrowed" && (
          <InformalLoanSection
            direction="borrowed"
            items={state.informalBorrowed || []}
            bankAccounts={state.bankAccounts || []}
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
            onAddTransaction={async (txn: any) => {
              try {
                await addItem("transactions", txn);
                showToast?.("Bank transaction recorded successfully", "success");
              } catch (e: any) {
                showToast?.(`Failed to record bank transaction: ${e?.message || "Unknown error"}`, "error");
              }
            }}
            onEdit={setEditId}
          />
        )}
        {sub === "lent" && (
          <InformalLoanSection
            direction="lent"
            items={state.informalLent || []}
            bankAccounts={state.bankAccounts || []}
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
            onAddTransaction={async (txn: any) => {
              try {
                await addItem("transactions", txn);
                showToast?.("Bank transaction recorded successfully", "success");
              } catch (e: any) {
                showToast?.(`Failed to record bank transaction: ${e?.message || "Unknown error"}`, "error");
              }
            }}
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
          initial={(state.creditCards || []).find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => saveCCEdit(editId, v)}
          saving={savingCCEdit}
          existingGroups={existingGroups}
        />
      )}
      {editId && sub === "prepaid" && (
        <PrepaidModal
          initial={(state.prepaidCards || []).find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => savePrepaidEdit(editId, v)}
          saving={savingPrepaidEdit}
        />
      )}
      {editId && sub === "taken" && (
        <LoanTakenModal
          initial={(state.loansTaken || []).find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => saveLoanTakenEdit(editId, v)}
          saving={savingLoanTakenEdit}
        />
      )}
      {editId && sub === "given" && (
        <LoanGivenModal
          initial={(state.loansGiven || []).find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => saveLoanGivenEdit(editId, v)}
          saving={savingLoanGivenEdit}
        />
      )}
      {editId && sub === "borrowed" && (
        <InformalPersonModal
          direction="borrowed"
          initial={(state.informalBorrowed || []).find((x: any) => x.id === editId)}
          onSave={(v: any) => saveBorrowedEdit(editId, v)}
          onClose={() => setEditId(null)}
          saving={savingBorrowedEdit}
        />
      )}
      {editId && sub === "lent" && (
        <InformalPersonModal
          direction="lent"
          initial={(state.informalLent || []).find((x: any) => x.id === editId)}
          onSave={(v: any) => saveLentEdit(editId, v)}
          onClose={() => setEditId(null)}
          saving={savingLentEdit}
        />
      )}
    </div>
  );
}

function CCEmptyState({ onAdd, onAddPreset }: any) {
  const PRESET_CARDS = [
    {
      issuer: "HDFC Regalia Gold",
      network: "Visa",
      limit: "300000",
      billDate: "20",
      dueDay: "10",
      annualFee: "2500",
      waiverInfo: "Spend 4L/yr for fee waiver",
      rewardPointsBalance: "5000",
      rewardPointValue: "0.5",
    },
    {
      issuer: "ICICI Amazon Pay",
      network: "Visa",
      limit: "250000",
      billDate: "15",
      dueDay: "5",
      annualFee: "0",
      waiverInfo: "Lifetime Free Card",
      rewardPointsBalance: "1200",
      rewardPointValue: "1",
    },
    {
      issuer: "SBI SimplyClick",
      network: "Visa",
      limit: "150000",
      billDate: "12",
      dueDay: "2",
      annualFee: "499",
      waiverInfo: "Spend 1L/yr for fee waiver",
      rewardPointsBalance: "2500",
      rewardPointValue: "0.25",
    },
    {
      issuer: "Federal Scapia (RuPay UPI)",
      network: "Visa",
      limit: "200000",
      billDate: "18",
      dueDay: "8",
      annualFee: "0",
      waiverInfo: "Lifetime Free Card",
      rewardPointsBalance: "3000",
      rewardPointValue: "0.2",
      variants: [
        {
          id: "scapia-rupay",
          name: "Scapia RuPay UPI",
          network: "RuPay",
          last4: "8899",
          cardType: "virtual",
        },
      ],
    },
  ];

  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: THEME.accent,
        }}
      >
        <CreditCard size={32} strokeWidth={1.75} />
      </div>
      <div
        style={{
          fontSize: 22,
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
          fontSize: 13.5,
          color: THEME.muted,
          maxWidth: 460,
          margin: "0 auto 18px",
          lineHeight: 1.6,
        }}
      >
        Add your credit cards to monitor real-time credit utilization, track statement cycles & payment due dates, log bills & rewards, and avoid late penalty charges.
      </div>

      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 26,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap" as const,
        }}
      >
        {[
          "Real-time Utilization Monitor",
          "Statement & Due Date Alerts",
          "Dual-Variant & RuPay UPI Support",
          "Shared Credit Limit Pools",
          "Reward Points Valuation",
        ].map((t) => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-1)",
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 500,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: THEME.accent,
                display: "inline-block",
              }}
            />
            {t}
          </span>
        ))}
      </div>

      {/* Starter Presets */}
      <div style={{ maxWidth: 640, margin: "0 auto 24px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: THEME.muted,
            marginBottom: 12,
          }}
        >
          Quick Start With Popular Cards:
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {PRESET_CARDS.map((p) => (
            <button
              key={p.issuer}
              type="button"
              className="card-interactive"
              onClick={() => (onAddPreset ? onAddPreset(p) : onAdd())}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 12,
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BankLogo bankName={p.issuer} size={26} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
                    {p.issuer}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>
                    Limit: {fmtINRFull(Number(p.limit))}
                  </div>
                </div>
              </div>
              <Plus size={14} color={THEME.accent} />
            </button>
          ))}
        </div>
      </div>

      <button
        style={{
          ...btnSolid,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 24px",
          fontSize: 13,
          fontWeight: 700,
          borderRadius: 10,
        }}
        onClick={onAdd}
      >
        <Plus size={16} /> Add Custom Credit Card
      </button>
    </Card>
  );
}

function PrepaidEmptyState({ onAdd, onAddPreset }: any) {
  const PRESET_PREPAID = [
    {
      cardName: "Sodexo / Pluxee Meal Card",
      cardType: "Meal Card",
      lowBalanceThreshold: 200,
    },
    {
      cardName: "Zeta Benefit Card",
      cardType: "Meal Card",
      lowBalanceThreshold: 150,
    },
    {
      cardName: "ICICI Multi-Currency Forex",
      cardType: "Forex Card",
      lowBalanceThreshold: 500,
    },
    {
      cardName: "Axis Bank Gift / Prepaid",
      cardType: "Prepaid Card",
      lowBalanceThreshold: 100,
    },
  ];

  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "color-mix(in srgb, #0891b2 12%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: "#0891b2",
        }}
      >
        <Wallet size={32} strokeWidth={1.75} />
      </div>
      <div
        style={{
          fontSize: 22,
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
          fontSize: 13.5,
          color: THEME.muted,
          maxWidth: 460,
          margin: "0 auto 18px",
          lineHeight: 1.6,
        }}
      >
        Track your corporate meal allowances, forex travel cards, and digital wallets. Log funds loaded, monitor spend deductions, and set low balance threshold warnings.
      </div>

      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 26,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap" as const,
        }}
      >
        {[
          "Meal Cards & Corporate Allowances",
          "Forex Multi-Currency Balances",
          "Low-Balance Alert Triggers",
          "Full Spend & Load Ledger",
          "CSV Import & Export",
        ].map((t) => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-1)",
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 500,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#0891b2",
                display: "inline-block",
              }}
            />
            {t}
          </span>
        ))}
      </div>

      {/* Starter Presets */}
      <div style={{ maxWidth: 640, margin: "0 auto 24px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: THEME.muted,
            marginBottom: 12,
          }}
        >
          Quick Start With Common Prepaid Cards:
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {PRESET_PREPAID.map((p) => (
            <button
              key={p.cardName}
              type="button"
              className="card-interactive"
              onClick={() => (onAddPreset ? onAddPreset(p) : onAdd())}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 12,
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BankLogo bankName={p.cardName} size={26} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
                    {p.cardName}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>{p.cardType}</div>
                </div>
              </div>
              <Plus size={14} color="#0891b2" />
            </button>
          ))}
        </div>
      </div>

      <button
        style={{
          ...btnSolid,
          background: "#0891b2",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 24px",
          fontSize: 13,
          fontWeight: 700,
          borderRadius: 10,
        }}
        onClick={onAdd}
      >
        <Plus size={16} /> Add Custom Prepaid Card
      </button>
    </Card>
  );
}

/** Modal to easily record a credit card bill payment without typing negative numbers */
function CCPaymentModal({
  card,
  onClose,
  onSavePayment,
}: {
  card: any;
  onClose: () => void;
  onSavePayment: (payment: {
    amount: number;
    date: string;
    source: string;
    note: string;
  }) => void;
}) {
  const currentOutstanding = Number(card.outstanding) || 0;
  const [amount, setAmount] = useState(currentOutstanding > 0 ? String(currentOutstanding) : "");
  const [date, setDate] = useState(today());
  const [source, setSource] = useState("Bank Transfer / NetBanking");
  const [note, setNote] = useState("Credit Card Bill Payment");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;
    onSavePayment({
      amount: num,
      date,
      source,
      note,
    });
    onClose();
  };

  return (
    <Modal title={`Record Payment — ${card.issuer}`} onClose={onClose} maxWidth={520}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: "color-mix(in srgb, var(--t-sage) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-sage) 22%, transparent)",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
              Current Outstanding
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 800,
                color: currentOutstanding > 0 ? THEME.rust : THEME.sage,
                marginTop: 2,
              }}
            >
              <Money value={currentOutstanding} variant="full" />
            </div>
          </div>
          {currentOutstanding > 0 && (
            <button
              type="button"
              className="card-interactive"
              onClick={() => setAmount(String(currentOutstanding))}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: `1px solid color-mix(in srgb, ${THEME.sage} 40%, transparent)`,
                background: "transparent",
                color: THEME.sage,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Pay Full Outstanding
            </button>
          )}
        </div>

        <Field label="Payment Amount (₹)">
          <input
            style={input}
            type="number"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 15000"
            required
            autoFocus
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Payment Date">
            <input
              type="date"
              style={input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Payment Mode / Source">
            <select
              style={input}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="Bank Transfer / NetBanking">NetBanking / Transfer</option>
              <option value="UPI Payment">UPI (GPay / PhonePe / CRED)</option>
              <option value="Debit Card Auto-Debit">Autopay / Auto-Debit</option>
              <option value="NEFT / RTGS / IMPS">NEFT / RTGS</option>
              <option value="Cheque / Cash">Cheque / Branch</option>
            </select>
          </Field>
        </div>

        <Field label="Note / Reference (optional)">
          <input
            style={input}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Statement payment for July"
          />
        </Field>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              background: THEME.sage,
              color: "#052e16",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Check size={16} /> Confirm Payment
          </button>
          <button
            type="button"
            style={{ ...btnGhost, padding: "10px 18px", borderRadius: 10 }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
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
  const [paymentCard, setPaymentCard] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "closed">("active");
  const [closingCard, setClosingCard] = useState<any | null>(null);
  const [closeDate, setCloseDate] = useState(today());
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<any>(null);
  const [copiedHelplineId, setCopiedHelplineId] = useState<string | null>(null);

  // Search, Filter & Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"due_soon" | "util_desc" | "outstanding_desc" | "limit_desc" | "name_asc">("outstanding_desc");

  const { familyProfiles } = useMasterData();

  const activeCards = items.filter((c: any) => (c.status || "active").toLowerCase() !== "closed");
  const closedCards = items.filter((c: any) => (c.status || "active").toLowerCase() === "closed");

  // Filtered cards
  const displayCards = useMemo(() => {
    let list = viewMode === "active" ? activeCards : closedCards;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c: any) => {
        const issuer = (c.issuer || "").toLowerCase();
        const last4 = (c.last4 || "").toLowerCase();
        const network = (c.network || "").toLowerCase();
        const sharedGroup = (c.sharedGroup || "").toLowerCase();
        const owner = (c.owner || "").toLowerCase();
        const variantMatches = (c.variants || []).some(
          (v: any) =>
            (v.name || "").toLowerCase().includes(q) ||
            (v.last4 || "").toLowerCase().includes(q) ||
            (v.network || "").toLowerCase().includes(q)
        );
        return (
          issuer.includes(q) ||
          last4.includes(q) ||
          network.includes(q) ||
          sharedGroup.includes(q) ||
          owner.includes(q) ||
          variantMatches
        );
      });
    }

    // Network filter
    if (networkFilter !== "all") {
      list = list.filter(
        (c: any) =>
          (c.network || "").toLowerCase() === networkFilter.toLowerCase() ||
          (c.variants || []).some(
            (v: any) => (v.network || "").toLowerCase() === networkFilter.toLowerCase()
          )
      );
    }

    // Owner filter
    if (ownerFilter !== "all") {
      list = list.filter((c: any) => (c.owner || "self") === ownerFilter);
    }

    // Sorting
    return [...list].sort((a: any, b: any) => {
      if (sortBy === "outstanding_desc") {
        return (Number(b.outstanding) || 0) - (Number(a.outstanding) || 0);
      }
      if (sortBy === "limit_desc") {
        return (Number(b.limit) || 0) - (Number(a.limit) || 0);
      }
      if (sortBy === "util_desc") {
        const utilA = Number(a.limit) ? (Number(a.outstanding) / Number(a.limit)) : 0;
        const utilB = Number(b.limit) ? (Number(b.outstanding) / Number(b.limit)) : 0;
        return utilB - utilA;
      }
      if (sortBy === "due_soon") {
        const dueA = Number(a.dueDay) || 99;
        const dueB = Number(b.dueDay) || 99;
        return dueA - dueB;
      }
      if (sortBy === "name_asc") {
        return (a.issuer || "").localeCompare(b.issuer || "");
      }
      return 0;
    });
  }, [viewMode, activeCards, closedCards, searchQuery, networkFilter, ownerFilter, sortBy]);

  const selectedCard = items.find((c: any) => c.id === selectedLedger);

  if (!items.length) {
    return (
      <CCEmptyState
        onAdd={onAdd}
        onAddPreset={async (preset: any) => {
          try {
            await onUpdateCard(uid(), { ...preset, status: "active", owner: "self", outstanding: "0" });
          } catch (e) {
            onAdd();
          }
        }}
      />
    );
  }

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

  const copyHelpline = (id: string, num: string) => {
    if (!num) return;
    navigator.clipboard?.writeText?.(num);
    setCopiedHelplineId(id);
    setTimeout(() => setCopiedHelplineId(null), 2000);
  };

  const renderCard = (c: any) => {
    const isClosed = (c.status || "active").toLowerCase() === "closed";
    const util = Number(c.limit) ? (Number(c.outstanding) / Number(c.limit)) * 100 : 0;
    const txnCount = (c.transactions || []).length;

    return (
      <div
        key={c.id}
        style={{
          ...cardDark,
          position: "relative",
          background: isClosed
            ? `linear-gradient(135deg, #33333d 0%, #202028 100%)`
            : getCardGradient(c.issuer),
          padding: "22px 20px 62px",
          opacity: isClosed ? 0.8 : 1,
          filter: isClosed ? "grayscale(35%)" : "none",
          borderRadius: 18,
          boxShadow: isClosed ? "none" : "0 10px 32px rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          overflow: "hidden",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}
      >
        {/* Shimmer / Glossy Mesh Overlay */}
        {!isClosed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(125deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 35%, transparent 65%)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Top Header: Bank Logo + Network Logo + Status/Owner Badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            zIndex: 2,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BankLogo bankName={c.issuer} size={32} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <CardNetworkLogo network={c.network} />
              {(c.variants || []).map((v: any, vIdx: number) => (
                <React.Fragment key={v.id || vIdx}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 800 }}>+</span>
                  <CardNetworkLogo network={v.network} />
                </React.Fragment>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {c.sharedGroup && (
              <span
                style={{
                  fontSize: 9.5,
                  padding: "2px 7px",
                  borderRadius: 6,
                  background: "rgba(254,240,138,0.2)",
                  color: "#fef08a",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
                title={`Shared Limit Pool: ${c.sharedGroup}`}
              >
                <Layers size={10} /> Pool
              </span>
            )}
            <OwnerBadge owner={c.owner} />
          </div>
        </div>

        {/* EMV Chip and Contactless indicator */}
        {!isClosed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Realistic Gold EMV Chip */}
            <div
              style={{
                width: 36,
                height: 27,
                borderRadius: 6,
                background: "linear-gradient(135deg, #fcd34d 0%, #d97706 70%, #fef3c7 100%)",
                position: "relative",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 5px rgba(0,0,0,0.25)",
                overflow: "hidden",
                border: "1px solid rgba(180,83,9,0.5)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 1,
                  background: "rgba(0,0,0,0.25)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: "rgba(0,0,0,0.25)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "26%",
                  right: "26%",
                  top: "22%",
                  bottom: "22%",
                  borderRadius: 3,
                  border: "1px solid rgba(0,0,0,0.25)",
                }}
              />
            </div>

            {/* Contactless Wave Icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.9)"
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
                  background: "rgba(254,240,138,0.18)",
                  border: "1px solid rgba(254,240,138,0.3)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fef08a",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Sparkles size={11} /> Dual-Card Account ({(c.variants || []).length + 1} Cards)
              </div>
            )}
          </div>
        )}

        {/* Card Issuer & Account Title */}
        <div
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.02em",
            textShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        >
          {c.issuer}
        </div>

        {/* Card Number(s) Display */}
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 14.5,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.95)",
              fontFamily: "monospace",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>•••• •••• •••• {c.last4 || "••••"}</span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.18)",
                color: "#fff",
                fontWeight: 700,
                letterSpacing: "normal",
                fontFamily: "var(--font-sans)",
              }}
            >
              Primary ({c.network})
            </span>
          </div>

          {(c.variants || []).map((v: any, vIdx: number) => (
            <div
              key={v.id || vIdx}
              style={{
                fontSize: 13,
                letterSpacing: "0.08em",
                marginTop: 4,
                color: "rgba(255,255,255,0.85)",
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
                  fontSize: 9,
                  padding: "1.5px 6px",
                  borderRadius: 4,
                  background: "rgba(254,240,138,0.2)",
                  color: "#fef08a",
                  fontWeight: 700,
                  letterSpacing: "normal",
                  fontFamily: "var(--font-sans)",
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
              fontSize: 11,
              color: "rgba(255,140,140,0.9)",
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

        {/* Financial Metrics: Outstanding vs Limit vs Available */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 18,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>
            <div
              style={{
                color: "rgba(245,239,227,0.6)",
                fontSize: 9.5,
                textTransform: "uppercase",
                fontWeight: 800,
                letterSpacing: "0.06em",
              }}
            >
              Outstanding Balance
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 18,
                color: Number(c.outstanding) > 0 ? "#ff9999" : "#6ee7b7",
                letterSpacing: "-0.01em",
                marginTop: 2,
              }}
            >
              <Money value={c.outstanding} variant="full" />
            </div>
          </div>
          <div>
            <div
              style={{
                color: "rgba(245,239,227,0.6)",
                fontSize: 9.5,
                textTransform: "uppercase",
                fontWeight: 800,
                letterSpacing: "0.06em",
              }}
            >
              {c.sharedGroup ? "Card Sub-Limit" : "Credit Limit"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 18,
                color: "#fff",
                letterSpacing: "-0.01em",
                marginTop: 2,
              }}
            >
              <Money value={c.limit} variant="full" />
            </div>
          </div>
        </div>

        {/* Sub-limit utilization bar — active cards only */}
        {!isClosed && (
          <div style={{ marginTop: 14 }}>
            <div
              className="progress-track"
              style={{ height: 6, background: "rgba(255,255,255,0.18)", borderRadius: 3 }}
            >
              <div
                className="progress-fill"
                style={{
                  width: `${Math.max(0, Math.min(util, 100))}%`,
                  background:
                    util > 70
                      ? "linear-gradient(90deg, var(--t-rust), #f87171)"
                      : util > 30
                        ? "linear-gradient(90deg, var(--t-gold), #fde047)"
                        : "linear-gradient(90deg, var(--t-sage), #86efac)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 5,
                fontSize: 10.5,
                fontWeight: 700,
              }}
            >
              <span style={{ color: util > 70 ? "#ff8888" : util > 30 ? "#fde047" : "#86efac" }}>
                {util.toFixed(1)}% {c.sharedGroup ? "sub-limit" : "limit"} used
              </span>
              <span style={{ color: "rgba(255,255,255,0.65)" }}>
                Avail: <Money value={Math.max(0, (Number(c.limit) || 0) - (Number(c.outstanding) || 0))} variant="full" />
              </span>
            </div>
          </div>
        )}

        {/* Schedule & Metadata Grid */}
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            fontSize: 11.5,
            color: "rgba(245,239,227,0.85)",
          }}
        >
          <div>
            Bill Date: <strong style={{ color: "#fff" }}>{c.billDate ? `${c.billDate}th` : "—"}</strong>
          </div>
          <div>
            Due Day: <strong style={{ color: "#fff" }}>{c.dueDay ? `${c.dueDay}th` : "—"}</strong>
          </div>
          <div>
            Annual Fee:{" "}
            <strong style={{ color: "#fff" }}>
              <Money value={c.annualFee} variant="exact" />
              {c.feeMonth ? ` · ${Number(c.feeDay) || 1} ${MONTH_NAMES[Number(c.feeMonth) - 1]}` : ""}
            </strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            Helpline:{" "}
            {c.helpline ? (
              <button
                type="button"
                onClick={() => copyHelpline(c.id, c.helpline)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: copiedHelplineId === c.id ? "#86efac" : "#fff",
                  fontWeight: 700,
                  fontSize: 11.5,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: 0,
                }}
                title="Click to copy helpline"
              >
                {c.helpline}
                {copiedHelplineId === c.id ? <Check size={11} /> : <Copy size={11} opacity={0.7} />}
              </button>
            ) : (
              <strong style={{ color: "#fff" }}>—</strong>
            )}
          </div>
        </div>

        {/* Waiver criteria */}
        {c.waiverInfo && (
          <div
            style={{
              marginTop: 10,
              fontSize: 10.5,
              background: "rgba(255,255,255,0.08)",
              padding: "5px 10px",
              borderRadius: 6,
              color: THEME.gold,
              fontWeight: 500,
            }}
          >
            Fee Waiver: {c.waiverInfo}
          </div>
        )}

        {/* Reward Points */}
        {!isClosed && Number(c.rewardPointsBalance) > 0 && (
          <div
            style={{
              marginTop: 10,
              fontSize: 10.5,
              background: "rgba(255,255,255,0.08)",
              padding: "5px 10px",
              borderRadius: 6,
              color: "rgba(255,255,255,0.9)",
              fontWeight: 500,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Star size={11} color="#fef08a" />
              <strong style={{ color: "#fff" }}>
                <Prv>{Math.round(Number(c.rewardPointsBalance)).toLocaleString("en-IN")}</Prv>
              </strong>{" "}
              pts
            </span>
            {Number(c.rewardPointValue) > 0 && (
              <span style={{ color: THEME.gold, fontWeight: 700 }}>
                ≈ <Money value={Number(c.rewardPointsBalance) * Number(c.rewardPointValue)} variant="full" />
              </span>
            )}
          </div>
        )}

        {/* Urgency & Schedule Badges Ribbon */}
        {!isClosed && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {/* Statement Generation countdown */}
            {c.billDate &&
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
                      : `Stmt in ${daysLeft}d`;
                return (
                  <div
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.12)",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                );
              })()}

            {/* Payment Due countdown */}
            {c.dueDay &&
              (() => {
                if (c.autoPay) {
                  return (
                    <div
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "rgba(34,197,94,0.22)",
                        color: "#86efac",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <CheckCircle2 size={11} /> Autopay Active
                    </div>
                  );
                }

                const dueDateStr = getCCDueDate(c);
                if (!dueDateStr) return null;
                const todayMidnight = new Date(today() + "T00:00:00").getTime();
                const daysLeft = Math.ceil(
                  (new Date(dueDateStr + "T00:00:00").getTime() - todayMidnight) / 86400000
                );
                const isUrgent = daysLeft <= 3;
                const isWarning = daysLeft <= 7 && daysLeft > 3;

                const badgeBg = isUrgent
                  ? "rgba(239, 68, 68, 0.3)"
                  : isWarning
                    ? "rgba(245, 158, 11, 0.3)"
                    : "rgba(255, 255, 255, 0.12)";
                const badgeColor = isUrgent ? "#ff9999" : isWarning ? "#fde047" : "#fff";

                const label =
                  daysLeft <= 0
                    ? "Due Today!"
                    : daysLeft === 1
                      ? "Due Tomorrow!"
                      : `Due in ${daysLeft}d`;

                return (
                  <div
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: 10,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {isUrgent && <AlertCircle size={10} />}
                    {label}
                  </div>
                );
              })()}

            {/* Annual Fee Countdown */}
            {(() => {
              const fee = getNextFeeDate(c);
              if (!fee) return null;
              const { daysLeft } = fee;
              return (
                <div
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: daysLeft <= 30 ? "rgba(245,158,11,0.22)" : "rgba(255,255,255,0.1)",
                    color: daysLeft <= 30 ? "#fde047" : "rgba(255,255,255,0.8)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  Fee renewal in {daysLeft}d
                </div>
              );
            })()}
          </div>
        )}

        {/* Quick Action Footer Toolbar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 48,
            background: "rgba(15,15,22,0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!isClosed && (
              <button
                type="button"
                onClick={() => setPaymentCard(c)}
                style={{
                  background: "rgba(34,197,94,0.22)",
                  border: "1px solid rgba(34,197,94,0.45)",
                  color: "#86efac",
                  padding: "5px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "background 0.15s ease",
                }}
                title="Record payment toward this card"
              >
                <TrendingUp size={12} /> Pay Bill
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedLedger(c.id)}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                padding: "5px 10px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              title="View transaction ledger and import/export CSV"
            >
              <List size={12} /> Ledger ({txnCount})
            </button>
          </div>

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {!isClosed && (
              <button
                type="button"
                onClick={() => {
                  setClosingCard(c);
                  setCloseDate(today());
                }}
                title="Mark card as closed"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,140,140,0.8)",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 6px",
                  cursor: "pointer",
                  borderRadius: 6,
                }}
              >
                Close
              </button>
            )}
            {isClosed && (
              <button
                type="button"
                onClick={() => onUpdateCard(c.id, { status: "active", closedDate: "" })}
                title="Reactivate card"
                style={{
                  background: "rgba(34,197,94,0.2)",
                  border: "1px solid rgba(34,197,94,0.4)",
                  color: "#86efac",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 8px",
                  cursor: "pointer",
                  borderRadius: 6,
                }}
              >
                Reactivate
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(c.id)}
              aria-label="Edit card"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                padding: 5,
                borderRadius: 6,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteCard(c)}
              aria-label="Remove card"
              style={{
                background: "transparent",
                border: "none",
                color: "#ff9999",
                cursor: "pointer",
                padding: 5,
                borderRadius: 6,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Search, Status, and Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
          background: "var(--surface-0)",
          padding: "12px 16px",
          borderRadius: 14,
          border: `1px solid ${THEME.line}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Active / Closed toggle */}
          <div style={{ display: "flex", gap: 4, background: "var(--surface-1)", padding: 3, borderRadius: 10 }}>
            {(["active", "closed"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 7,
                  border: "none",
                  background:
                    viewMode === mode
                      ? mode === "active"
                        ? "var(--t-accent)"
                        : "var(--t-muted)"
                      : "transparent",
                  color: viewMode === mode ? "#fff" : "var(--t-muted)",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {mode === "active" ? `Active (${activeCards.length})` : `Closed (${closedCards.length})`}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--t-paper)",
              border: `1px solid ${THEME.line}`,
              padding: "5px 12px",
              borderRadius: 8,
              minWidth: 200,
            }}
          >
            <Search size={14} color={THEME.muted} />
            <input
              type="text"
              placeholder="Search issuer, last 4, pool..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                color: THEME.ink,
                fontSize: 12,
                outline: "none",
                width: "100%",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ background: "transparent", border: "none", color: THEME.muted, cursor: "pointer", padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Network Filter */}
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${THEME.line}`,
              background: "var(--t-paper)",
              color: THEME.ink,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
            aria-label="Filter by network"
          >
            <option value="all">All Networks</option>
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="rupay">RuPay</option>
            <option value="amex">Amex</option>
            <option value="diners">Diners Club</option>
          </select>

          {/* Owner Filter */}
          {familyProfiles.length > 1 && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--t-paper)",
                color: THEME.ink,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
              aria-label="Filter by profile"
            >
              <option value="all">All Profiles</option>
              {familyProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </select>
          )}

          {/* Sort Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowUpDown size={13} color={THEME.muted} />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--t-paper)",
                color: THEME.ink,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
              aria-label="Sort credit cards"
            >
              <option value="outstanding_desc">Outstanding: High to Low</option>
              <option value="util_desc">Utilization %: High to Low</option>
              <option value="due_soon">Due Date: Soonest First</option>
              <option value="limit_desc">Credit Limit: High to Low</option>
              <option value="name_asc">Card Name: A to Z</option>
            </select>
          </div>
        </div>
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
            {searchQuery || networkFilter !== "all" || ownerFilter !== "all"
              ? "No Matching Credit Cards Found"
              : viewMode === "active"
                ? "No Active Credit Cards"
                : "No Closed Credit Cards"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 380,
              margin: "0 auto 16px",
              lineHeight: 1.5,
            }}
          >
            {searchQuery || networkFilter !== "all" || ownerFilter !== "all"
              ? "Try clearing filters or search keywords to see your cards."
              : viewMode === "active"
                ? "All your credit cards are currently closed. Add a new card or check the Closed tab."
                : "No closed credit cards yet. Cards you close will appear here."}
          </div>
          {(searchQuery || networkFilter !== "all" || ownerFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery("");
                setNetworkFilter("all");
                setOwnerFilter("all");
              }}
            >
              Reset Filters
            </Button>
          )}
        </Card>
      )}

      {/* Ungrouped cards render as a flat grid */}
      {ungroupedCards.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <Grid>{ungroupedCards.map(renderCard)}</Grid>
        </div>
      )}

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
          <div
            key={groupName}
            style={{
              marginBottom: 32,
              padding: 20,
              borderRadius: 20,
              background: "var(--surface-0)",
              border: `1.5px solid color-mix(in srgb, ${barColor} 30%, transparent)`,
            }}
          >
            {/* Shared pool banner */}
            <div
              style={{
                marginBottom: 18,
                paddingBottom: 16,
                borderBottom: `1px solid ${THEME.line}`,
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
                      fontSize: 10.5,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: THEME.muted,
                      fontWeight: 800,
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Layers size={12} color={barColor} /> Shared Credit Pool Enclosure
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: THEME.ink,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {groupName}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2, fontWeight: 500 }}>
                    {cards.length} card{cards.length !== 1 ? "s" : ""} sharing one aggregate limit
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 26,
                      fontWeight: 800,
                      color: barColor,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {groupUtil.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                    of combined pool used
                  </div>
                </div>
              </div>

              <div
                className="progress-track"
                style={{
                  height: 8,
                  borderRadius: 4,
                  marginBottom: 14,
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
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                  }}
                >
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
                    Combined Pool Limit
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: THEME.ink, fontSize: 15 }}>
                    {groupLimit > 0 ? <Money value={groupLimit} variant="full" /> : "—"}
                  </div>
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                  }}
                >
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
                    Combined Outstanding
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: barColor, fontSize: 15 }}>
                    <Money value={groupOutstanding} variant="full" />
                  </div>
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                  }}
                >
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
                    Available Headroom
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: THEME.sage, fontSize: 15 }}>
                    {groupLimit > 0 ? <Money value={groupAvailable} variant="full" /> : "—"}
                  </div>
                </div>
              </div>

              {groupLimit === 0 && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11.5,
                    color: THEME.gold,
                    background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontWeight: 500,
                  }}
                >
                  Set the Total Pool Limit on any card in this group to track aggregate pool utilization accurately.
                </div>
              )}
            </div>

            <Grid>{cards.map(renderCard)}</Grid>
          </div>
        );
      })}

      {/* Bill Payment Modal */}
      {paymentCard && (
        <CCPaymentModal
          card={paymentCard}
          onClose={() => setPaymentCard(null)}
          onSavePayment={({ amount, date, source, note }) => {
            const existingTxs = Array.isArray(paymentCard.transactions) ? paymentCard.transactions : [];
            const paymentTx = {
              id: `cctx-pay-${Date.now()}`,
              date,
              merchant: `Payment via ${source}`,
              amount: -amount,
              category: "Payment",
              note: note || "Bill payment",
              variantId: "primary",
              variantName: "Primary",
            };
            const updatedTxs = [...existingTxs, paymentTx];
            const newOutstanding = Math.max(0, (Number(paymentCard.outstanding) || 0) - amount);
            onUpdateCard(paymentCard.id, {
              transactions: updatedTxs,
              outstanding: String(newOutstanding),
            });
          }}
        />
      )}

      {/* Closing Card Date Modal */}
      {closingCard && (
        <Modal
          title={`Close Card — ${closingCard.issuer}`}
          onClose={() => setClosingCard(null)}
          maxWidth={440}
        >
          <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Are you sure you want to mark <strong>{closingCard.issuer}</strong> as closed? You can still view its history or reactivate it anytime.
          </div>
          <Field label="Card Closed Date">
            <input
              type="date"
              style={input}
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </Field>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={() => {
                onUpdateCard(closingCard.id, { status: "closed", closedDate: closeDate });
                setClosingCard(null);
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                background: THEME.rust,
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Confirm Close Card
            </button>
            <button
              type="button"
              style={{ ...btnGhost, padding: "10px 18px" }}
              onClick={() => setClosingCard(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Transaction Ledger */}
      {selectedLedger && selectedCard && (
        <CCTransactionLedger
          card={selectedCard}
          onClose={() => setSelectedLedger(null)}
          onUpdate={(newTransactions: any) => {
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

      {/* Delete Confirmation */}
      {confirmDeleteCard && (
        <ConfirmDialog
          message={`Delete "${confirmDeleteCard.issuer || "this card"}${confirmDeleteCard.last4 ? ` ····${confirmDeleteCard.last4}` : ""}" and its entire transaction ledger? This action cannot be undone.`}
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
  const [addMode, setAddMode] = useState<"charge" | "payment">("charge");
  const [variantFilter, setVariantFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "charges" | "payments">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

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
  const totalPayments = txs
    .filter((t: any) => Number(t.amount) < 0)
    .reduce((s: any, t: any) => s + Math.abs(Number(t.amount)), 0);

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
    let list = txs;

    // Type filter
    if (typeFilter === "charges") {
      list = list.filter((t: any) => Number(t.amount) > 0);
    } else if (typeFilter === "payments") {
      list = list.filter((t: any) => Number(t.amount) < 0);
    }

    // Variant filter
    if (variantFilter !== "all") {
      if (variantFilter === "primary") {
        list = list.filter(
          (t: any) =>
            !t.variantId ||
            t.variantId === "primary" ||
            (card.last4 && t.variantId === card.last4)
        );
      } else {
        list = list.filter(
          (t: any) =>
            t.variantId === variantFilter ||
            t.variantName === variantFilter ||
            (t.variantId && variantOptions.find((o) => o.id === variantFilter)?.last4 === t.variantId)
        );
      }
    }

    // Category filter
    if (categoryFilter !== "all") {
      list = list.filter((t: any) => (t.category || "General") === categoryFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t: any) =>
          (t.merchant || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.note || "").toLowerCase().includes(q) ||
          String(t.amount).includes(q)
      );
    }

    return list;
  }, [txs, typeFilter, variantFilter, categoryFilter, searchQuery, card, variantOptions]);

  const saveTx = () => {
    if (!newTx.merchant || !newTx.amount) return;
    const rawAmt = Math.abs(Number(newTx.amount));
    const signedAmount = addMode === "payment" ? -rawAmt : rawAmt;
    const selectedOpt =
      variantOptions.find((o) => o.id === newTx.variantId) || variantOptions[0];
    const txToSave = {
      ...newTx,
      amount: String(signedAmount),
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
    const isPayment = Number(t.amount) < 0;
    setAddMode(isPayment ? "payment" : "charge");
    setNewTx({
      date: t.date,
      merchant: t.merchant,
      amount: String(Math.abs(Number(t.amount))),
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
      <Modal title={`${card.issuer} — Transactions & Statement`} onClose={onClose} maxWidth={960}>
        {/* Dual Variant Header banner */}
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
                <strong>Unified Dual-Variant Account:</strong> Single consolidated statement & shared limit of{" "}
                <strong><Money value={card.limit} variant="full" /></strong>
              </span>
            </div>
            <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
              {variantOptions.length} Cards Linked
            </span>
          </div>
        )}

        {/* 3-column Summary Ribbon */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            {
              label: "Total Charges / Spends",
              value: <Money value={totalCharges} variant="full" />,
              color: THEME.rust,
              bg: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
              border: `color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
            },
            {
              label: "Total Payments Made",
              value: <Money value={totalPayments} variant="full" />,
              color: THEME.sage,
              bg: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
              border: `color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
            },
            {
              label: "Net Statement Outstanding",
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
                padding: "12px 14px",
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 12,
                textAlign: "center" as const,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                  fontWeight: 700,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 19,
                  fontWeight: 800,
                  color: s.color,
                  marginTop: 3,
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

        {/* Search, Filter, and Action Buttons */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Search input in ledger */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                padding: "5px 10px",
                borderRadius: 8,
                width: 170,
              }}
            >
              <Search size={13} color={THEME.muted} />
              <input
                type="text"
                placeholder="Search txns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: THEME.ink,
                  fontSize: 11.5,
                  outline: "none",
                  width: "100%",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ background: "transparent", border: "none", color: THEME.muted, cursor: "pointer", padding: 0 }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Type Filter Pills */}
            <div style={{ display: "flex", gap: 4, background: "var(--surface-1)", padding: 2, borderRadius: 8 }}>
              {(["all", "charges", "payments"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: "3px 9px",
                    borderRadius: 6,
                    border: "none",
                    background: typeFilter === t ? THEME.accent : "transparent",
                    color: typeFilter === t ? THEME.darkInk : THEME.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Variant Filter (if multiple) */}
            {variantOptions.length > 1 && (
              <select
                value={variantFilter}
                onChange={(e) => setVariantFilter(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="all">All Variants</option>
                {variantOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.shortName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              style={{
                ...btnGhost,
                fontSize: 11.5,
                padding: "5px 12px",
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
                  fontSize: 11.5,
                  padding: "5px 12px",
                  color: THEME.sage,
                  borderColor: `color-mix(in srgb, ${THEME.sage} 33%, transparent)`,
                }}
                onClick={downloadCsv}
              >
                <Download size={13} /> Export CSV
              </button>
            )}
            <button
              style={{
                ...btnGhost,
                fontSize: 11.5,
                padding: "5px 12px",
                color: THEME.sage,
                borderColor: `color-mix(in srgb, ${THEME.sage} 40%, transparent)`,
              }}
              onClick={() => {
                setAddMode("payment");
                setNewTx({
                  date: today(),
                  merchant: "Bill Payment",
                  amount: "",
                  category: "Payment",
                  variantId: "primary",
                  variantName: variantOptions[0]?.name || "Primary",
                });
                setEditId(null);
                setShowAdd(true);
                setShowCsvImport(false);
              }}
            >
              <TrendingUp size={13} /> Record Payment
            </button>
            <button
              style={{
                ...btnGhost,
                fontSize: 11.5,
                padding: "5px 12px",
                color: THEME.rust,
                borderColor: `color-mix(in srgb, ${THEME.rust} 40%, transparent)`,
              }}
              onClick={() => {
                setAddMode("charge");
                setNewTx({
                  date: today(),
                  merchant: "",
                  amount: "",
                  category: cats[0] || "General",
                  variantId: "primary",
                  variantName: variantOptions[0]?.name || "Primary",
                });
                setEditId(null);
                setShowAdd(true);
                setShowCsvImport(false);
              }}
            >
              <Plus size={13} /> Add Charge
            </button>
          </div>
        </div>

        {/* CSV Import Box */}
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
              <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>
                date, merchant, amount, category{variantOptions.length > 1 ? ", card_variant" : ""}
              </code>
              <br />
              Charge:{" "}
              <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>
                2025-01-05, Amazon, 2499, Shopping{variantOptions.length > 1 ? `, ${variantOptions[0].last4 || "Primary"}` : ""}
              </code>
              &nbsp;&nbsp;Payment:{" "}
              <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>
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
              placeholder="2025-01-05, Amazon, 2499, Shopping"
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

        {/* Add / Edit Transaction Inline Form */}
        {showAdd && (
          <div
            style={{
              background: "var(--surface-1)",
              border: `1.5px solid ${addMode === "payment" ? THEME.sage : THEME.rust}`,
              borderRadius: 12,
              marginBottom: 16,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: addMode === "payment" ? THEME.sage : THEME.rust,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {editId
                  ? "Edit Transaction"
                  : addMode === "payment"
                    ? "Record Bill Payment"
                    : "Add Card Charge / Spend"}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setAddMode("charge")}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: addMode === "charge" ? THEME.rust : "transparent",
                    color: addMode === "charge" ? "#fff" : THEME.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Charge (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("payment")}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: addMode === "payment" ? THEME.sage : "transparent",
                    color: addMode === "payment" ? "#052e16" : THEME.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Payment (−)
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Date">
                <input
                  type="date"
                  style={input}
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                />
              </Field>
              <Field label={addMode === "payment" ? "Payment Amount (₹)" : "Charge Amount (₹)"}>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  style={input}
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: variantOptions.length > 1 ? "1.4fr 1fr 1fr" : "1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Field label={addMode === "payment" ? "Source / Reference" : "Merchant / Description"}>
                <input
                  type="text"
                  style={input}
                  value={newTx.merchant}
                  onChange={(e) => setNewTx({ ...newTx, merchant: e.target.value })}
                  placeholder={addMode === "payment" ? "e.g. NetBanking Bill Pay" : "e.g. Amazon, Swiggy"}
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

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "none",
                  background: addMode === "payment" ? THEME.sage : THEME.rust,
                  color: addMode === "payment" ? "#052e16" : "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
                onClick={saveTx}
              >
                {editId ? "Update Transaction" : addMode === "payment" ? "Save Payment" : "Save Charge"}
              </button>
              <button
                type="button"
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

        {/* Transaction Table */}
        <div style={{ maxHeight: 420, overflowY: "auto", border: `1px solid ${THEME.line}`, borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                <th style={{ ...th, padding: "10px 14px", textAlign: "left" }}>Date</th>
                <th style={{ ...th, padding: "10px 14px", textAlign: "left" }}>Merchant / Description</th>
                {variantOptions.length > 1 && (
                  <th style={{ ...th, padding: "10px 14px", textAlign: "left" }}>Variant</th>
                )}
                <th style={{ ...th, padding: "10px 14px", textAlign: "left" }}>Category</th>
                <th style={{ ...th, padding: "10px 14px", textAlign: "right" }}>Amount</th>
                <th style={{ ...th, padding: "10px 14px", textAlign: "right", width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedTxs.length === 0 ? (
                <tr>
                  <td
                    colSpan={variantOptions.length > 1 ? 6 : 5}
                    style={{ padding: "36px 16px", textAlign: "center", color: THEME.muted }}
                  >
                    No transactions found for this view.
                  </td>
                </tr>
              ) : (
                [...displayedTxs]
                  .sort((a: any, b: any) => b.date.localeCompare(a.date))
                  .map((t: any) => {
                    const isPayment = Number(t.amount) < 0;
                    const opt =
                      variantOptions.find(
                        (o) =>
                          o.id === t.variantId ||
                          (o.last4 && o.last4 === t.variantId) ||
                          (o.name && o.name === t.variantName)
                      ) || variantOptions[0];
                    const isPrimary = !t.variantId || t.variantId === "primary";

                    return (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom: `1px solid ${THEME.line}`,
                          background: isPayment ? "color-mix(in srgb, var(--t-sage) 3%, transparent)" : "transparent",
                        }}
                      >
                        <td style={{ ...td, padding: "10px 14px", color: THEME.muted }}>{t.date}</td>
                        <td style={{ ...td, padding: "10px 14px", fontWeight: 600, color: THEME.ink }}>
                          {t.merchant}
                        </td>
                        {variantOptions.length > 1 && (
                          <td style={{ ...td, padding: "10px 14px" }}>
                            <span
                              style={{
                                background: isPrimary ? "rgba(255,255,255,0.08)" : "rgba(254,240,138,0.18)",
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
                          </td>
                        )}
                        <td style={{ ...td, padding: "10px 14px" }}>
                          <span
                            style={{
                              background: "var(--surface-1)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              color: THEME.muted,
                            }}
                          >
                            {t.category || "General"}
                          </span>
                        </td>
                        <td
                          style={{
                            ...td,
                            padding: "10px 14px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: isPayment ? THEME.sage : THEME.rust,
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {isPayment ? "−" : "+"}
                          <Money value={Math.abs(Number(t.amount))} variant="exact" />
                        </td>
                        <td style={{ ...td, padding: "10px 14px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => startEdit(t)}
                              aria-label="Edit transaction"
                              className="icon-btn"
                              style={{ ...iconBtn, color: THEME.muted, padding: 3 }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteTx(t)}
                              aria-label="Delete transaction"
                              className="icon-btn danger"
                              style={{ ...iconBtn, color: THEME.rust, padding: 3 }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {confirmDeleteTx && (
        <ConfirmDialog
          message={`Delete transaction "${confirmDeleteTx.merchant}" (${confirmDeleteTx.amount})? This cannot be undone.`}
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

function PrepaidQuickModal({ card, mode = "load", onClose, onSave }: any) {
  const { prepaidCategories: cats } = useMasterData();
  const [txType, setTxType] = useState<"load" | "spend">(mode);
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(cats[0] || "Food");
  const [error, setError] = useState("");

  const cardName = card.cardName || card.name || card.provider || "Prepaid Card";
  const currentLoaded = (card.transactions || [])
    .filter((t: any) => t.type === "load")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const currentSpent = (card.transactions || [])
    .filter((t: any) => t.type === "spend")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const currentBalance = currentLoaded - currentSpent;

  const numAmt = Number(amount) || 0;
  const newBalance = txType === "load" ? currentBalance + numAmt : currentBalance - numAmt;

  const loadPresets = [500, 1000, 2000, 5000, 10000];
  const spendPresets = [100, 250, 500, 1000, 2000];
  const presets = txType === "load" ? loadPresets : spendPresets;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!amount || numAmt <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    const newTx = {
      id: `ptx-${Date.now()}`,
      date,
      type: txType,
      amount: numAmt,
      note: note.trim() || (txType === "load" ? "Card Top-up" : "Card Expense"),
      category: txType === "spend" ? category : "",
    };
    onSave([...(card.transactions || []), newTx]);
    onClose();
  };

  return (
    <Modal
      title={txType === "load" ? `Load Money — ${cardName}` : `Record Spend — ${cardName}`}
      onClose={onClose}
      maxWidth={480}
    >
      <form onSubmit={handleSubmit}>
        {/* Type Toggle Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--surface-0)",
            padding: 4,
            borderRadius: 10,
            marginBottom: 16,
            border: "1px solid var(--t-line)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTxType("load");
              setError("");
            }}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 8,
              border: "none",
              background: txType === "load" ? "var(--t-sage, #10b981)" : "transparent",
              color: txType === "load" ? "#fff" : "var(--t-muted)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <TrendingUp size={13} /> + Load Money
          </button>
          <button
            type="button"
            onClick={() => {
              setTxType("spend");
              setError("");
            }}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 8,
              border: "none",
              background: txType === "spend" ? "var(--t-rust, #ef4444)" : "transparent",
              color: txType === "spend" ? "#fff" : "var(--t-muted)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <TrendingDown size={13} /> − Record Spend
          </button>
        </div>

        {/* Current & Resulting Balance Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 10,
            background:
              txType === "load"
                ? "color-mix(in srgb, var(--t-sage, #10b981) 8%, transparent)"
                : "color-mix(in srgb, var(--t-rust, #ef4444) 8%, transparent)",
            border: `1px solid ${
              txType === "load"
                ? "color-mix(in srgb, var(--t-sage, #10b981) 25%, transparent)"
                : "color-mix(in srgb, var(--t-rust, #ef4444) 25%, transparent)"
            }`,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Current Balance
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: currentBalance >= 0 ? "var(--t-ink)" : "#ef4444", marginTop: 2 }}>
              <Money value={currentBalance} variant="full" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              New Balance
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color:
                  txType === "load"
                    ? "var(--t-sage, #10b981)"
                    : newBalance >= 0
                      ? "var(--t-ink)"
                      : "#ef4444",
                marginTop: 2,
              }}
            >
              <Money value={newBalance} variant="full" />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Transaction Date">
            <input
              type="date"
              style={input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>

          <Field label="Amount (₹) *" error={error}>
            <input
              type="number"
              min="1"
              step="any"
              style={{
                ...input,
                borderColor: error ? "var(--t-rust, #ef4444)" : undefined,
              }}
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError("");
              }}
              autoFocus
              required
            />
          </Field>
        </div>

        {/* Quick Amount Preset Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, marginTop: -4 }}>
          {presets.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => {
                setAmount(String(p));
                if (error) setError("");
              }}
              style={{
                padding: "3px 9px",
                borderRadius: 14,
                border: "1px solid var(--t-line)",
                background:
                  amount === String(p)
                    ? txType === "load"
                      ? "var(--t-sage, #10b981)"
                      : "var(--t-rust, #ef4444)"
                    : "var(--surface-0)",
                color: amount === String(p) ? "#fff" : "var(--t-ink)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {txType === "load" ? `+₹${p}` : `₹${p}`}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: txType === "spend" ? "1fr 1fr" : "1fr", gap: 12 }}>
          <Field label={txType === "load" ? "Note (optional)" : "Merchant / Note"}>
            <input
              style={input}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={txType === "load" ? "e.g. Monthly top-up" : "e.g. Lunch at Cafe, Uber ride"}
            />
          </Field>

          {txType === "spend" && (
            <Field label="Category">
              <select
                style={input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <ModalActions
          onSave={() => handleSubmit()}
          onClose={onClose}
          saveLabel={txType === "load" ? "Add Top-up" : "Record Spend"}
        />
      </form>
    </Modal>
  );
}

function PrepaidList({ items, onRemove, onEdit, onUpdateCard, onAdd }: any) {
  const { familyProfiles, prepaidCardTypes } = useMasterData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickTx, setQuickTx] = useState<{ card: any; type: "load" | "spend" } | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "closed">("active");
  const [closingCard, setClosingCard] = useState<any | null>(null);
  const [closeDate, setCloseDate] = useState(today());
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "balance-desc" | "balance-asc" | "expiry" | "tx-count">("balance-desc");

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
  const baseCards = viewMode === "active" ? activeCards : closedCards;

  // Filter & Search
  const filteredCards = baseCards.filter((p: any) => {
    const name = [p.provider, p.bank, p.issuer, p.cardName, p.name].filter(Boolean).join(" ").toLowerCase();
    const last4 = (p.last4 || "").toLowerCase();
    const type = (p.cardType || "").toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    if (q && !name.includes(q) && !last4.includes(q) && !type.includes(q)) {
      return false;
    }
    if (selectedProfile !== "all" && (p.owner || "self") !== selectedProfile) {
      return false;
    }
    if (selectedType !== "all" && (p.cardType || "Prepaid") !== selectedType) {
      return false;
    }
    return true;
  });

  // Sort
  const sortedCards = [...filteredCards].sort((a: any, b: any) => {
    const statsA = computeStats(a.transactions);
    const statsB = computeStats(b.transactions);
    const nameA = a.cardName || a.name || a.provider || "";
    const nameB = b.cardName || b.name || b.provider || "";

    if (sortBy === "name") return nameA.localeCompare(nameB);
    if (sortBy === "balance-desc") return statsB.balance - statsA.balance;
    if (sortBy === "balance-asc") return statsA.balance - statsB.balance;
    if (sortBy === "tx-count") return (b.transactions || []).length - (a.transactions || []).length;
    if (sortBy === "expiry") {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    }
    return 0;
  });

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
      sub: `${activeCards.length} active prepaid card${activeCards.length !== 1 ? "s" : ""}`,
      color: THEME.sage,
      icon: <Wallet />,
    },
    {
      label: "Total Loaded",
      value: fmtINRFull(totalLoaded),
      numericValue: totalLoaded,
      sub: "Total funds loaded across cards",
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

  // Available card types from data
  const availableTypes = Array.from(new Set(items.map((p: any) => p.cardType).filter(Boolean))) as string[];

  return (
    <div>
      {/* Top Controls: Status Toggle & Add Card */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(["active", "closed"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "7px 18px",
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

        {onAdd && (
          <button
            onClick={onAdd}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: "none",
              background: "var(--t-accent)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <Plus size={14} /> Add Prepaid Card
          </button>
        )}
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

      {/* Filter & Search Bar */}
      {baseCards.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            padding: "12px 16px",
            background: "var(--surface-0)",
            border: `1px solid var(--t-line)`,
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: "relative",
              flex: "1 1 200px",
              minWidth: 180,
            }}
          >
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--t-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search prepaid cards or digits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 32px",
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--t-paper)",
                color: "var(--t-ink)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--t-muted)",
                  padding: 2,
                  display: "flex",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Profile Filter */}
          {familyProfiles.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--t-muted)", fontWeight: 600 }}>Owner:</span>
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                style={{
                  padding: "5px 10px",
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--t-line)",
                  background: "var(--t-paper)",
                  color: "var(--t-ink)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Owners</option>
                {familyProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Card Type Filter */}
          {availableTypes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--t-muted)", fontWeight: 600 }}>Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  padding: "5px 10px",
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--t-line)",
                  background: "var(--t-paper)",
                  color: "var(--t-ink)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Types</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <ArrowUpDown size={13} style={{ color: "var(--t-muted)" }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: "5px 10px",
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--t-paper)",
                color: "var(--t-ink)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="balance-desc">Balance (High to Low)</option>
              <option value="balance-asc">Balance (Low to High)</option>
              <option value="name">Card Name (A-Z)</option>
              <option value="tx-count">Most Transactions</option>
              <option value="expiry">Expiry (Soonest First)</option>
            </select>
          </div>
        </div>
      )}

      {/* Empty / No Results State */}
      {sortedCards.length === 0 && (
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
            {baseCards.length === 0
              ? viewMode === "active"
                ? "No Active Prepaid Cards"
                : "No Closed Prepaid Cards"
              : "No Cards Match Filters"}
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
            {baseCards.length === 0
              ? viewMode === "active"
                ? "All your prepaid cards are currently closed. Add a new card or check the Closed tab."
                : "No closed prepaid cards yet. Cards you close will appear here."
              : "Try adjusting your search query or clear filters to see your cards."}
          </div>
          {baseCards.length > 0 && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedProfile("all");
                setSelectedType("all");
              }}
              style={{
                marginTop: 14,
                padding: "6px 16px",
                borderRadius: 20,
                border: `1.5px solid var(--t-accent)`,
                background: "transparent",
                color: "var(--t-accent)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          )}
        </Card>
      )}

      {/* Card Grid */}
      <Grid>
        {sortedCards.map((p: any) => {
          const isClosed = (p.status || "active").toLowerCase() === "closed";
          const { loaded, spent, balance } = computeStats(p.transactions);
          const txnCount = (p.transactions || []).length;
          const name = p.provider || p.bank || p.issuer || p.cardName || p.name || "Prepaid Card";
          const brandName = [p.provider, p.bank, p.issuer, p.cardName, p.name].filter(Boolean).join(" ");
          const expiryDays = p.expiryDate
            ? Math.ceil(
                (new Date(p.expiryDate + "T00:00:00").getTime() -
                  new Date(today() + "T00:00:00").getTime()) /
                  86400000
              )
            : null;
          const lowBalanceThreshold = Number(p.lowBalanceThreshold || 0) || 100;
          const isLowBalance = !isClosed && balance > 0 && balance < lowBalanceThreshold;
          const spentPercent = loaded > 0 ? (spent / loaded) * 100 : 0;

          return (
            <div
              key={p.id}
              style={{
                background: isClosed
                  ? "linear-gradient(135deg, #2a2a1a 0%, #1a1a0d 100%)"
                  : getCardGradient(name),
                color: "#fff",
                borderRadius: 18,
                padding: "20px 20px 60px 20px",
                position: "relative",
                opacity: isClosed ? 0.8 : 1,
                filter: isClosed ? "grayscale(35%)" : "none",
                boxShadow: isClosed ? "none" : "0 8px 30px rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                overflow: "hidden",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
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

              {/* Card Header & Owner */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BankLogo bankName={brandName || name} size={32} />
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
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
                  {isClosed && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        background: "rgba(239,68,68,0.3)",
                        color: "#ff9999",
                        padding: "2px 7px",
                        borderRadius: 99,
                        border: "1px solid rgba(239,68,68,0.5)",
                      }}
                    >
                      CLOSED
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <OwnerBadge owner={p.owner} />
                </div>
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

              {/* Card Name & Last 4 */}
              <div
                style={{ fontSize: 20, fontWeight: 800, marginTop: 12, letterSpacing: "-0.02em" }}
              >
                {name}
              </div>
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
                •••• •••• •••• {p.last4 || "••••"}
              </div>

              {isClosed && p.closedDate && (
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,140,140,0.9)",
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

              {/* Financial Metrics: Available Balance vs Total Loaded (matching Credit Cards) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 18,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.22)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "rgba(245,239,227,0.6)",
                      fontSize: 9.5,
                      textTransform: "uppercase",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Available Balance
                    {isLowBalance && (
                      <span
                        style={{
                          fontSize: 8.5,
                          background: "rgba(245,158,11,0.3)",
                          color: "#fde68a",
                          padding: "1px 5px",
                          borderRadius: 99,
                        }}
                      >
                        LOW
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 18,
                      color: balance >= 0 ? "#6ee7b7" : "#ff9999",
                      letterSpacing: "-0.01em",
                      marginTop: 2,
                    }}
                  >
                    <Money value={balance} variant="full" />
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      color: "rgba(245,239,227,0.6)",
                      fontSize: 9.5,
                      textTransform: "uppercase",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                    }}
                  >
                    Total Loaded
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 18,
                      color: "#fff",
                      letterSpacing: "-0.01em",
                      marginTop: 2,
                    }}
                  >
                    <Money value={loaded} variant="full" />
                  </div>
                </div>
              </div>

              {/* Spend utilization bar — active cards only */}
              {!isClosed && (
                <div style={{ marginTop: 14 }}>
                  <div
                    className="progress-track"
                    style={{ height: 6, background: "rgba(255,255,255,0.18)", borderRadius: 3 }}
                  >
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.max(0, Math.min(spentPercent, 100))}%`,
                        background:
                          spentPercent > 85
                            ? "linear-gradient(90deg, var(--t-rust), #f87171)"
                            : spentPercent > 50
                              ? "linear-gradient(90deg, var(--t-gold), #fde047)"
                              : "linear-gradient(90deg, var(--t-sage), #86efac)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 5,
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        color:
                          spentPercent > 85
                            ? "#ff8888"
                            : spentPercent > 50
                              ? "#fde047"
                              : "#86efac",
                      }}
                    >
                      {spentPercent.toFixed(1)}% spent
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.65)" }}>
                      Spent: <Money value={spent} variant="full" />
                    </span>
                  </div>
                </div>
              )}

              {/* Schedule & Metadata Grid */}
              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  fontSize: 11.5,
                  color: "rgba(245,239,227,0.85)",
                }}
              >
                <div>
                  Card Type: <strong style={{ color: "#fff" }}>{p.cardType || "Prepaid"}</strong>
                </div>
                <div>
                  Alert Below: <strong style={{ color: "#fff" }}>₹{p.lowBalanceThreshold || 100}</strong>
                </div>
                <div>
                  Expiry:{" "}
                  <strong style={{ color: "#fff" }}>
                    {p.expiryDate ? p.expiryDate : "No Expiry"}
                  </strong>
                </div>
                <div>
                  Activity:{" "}
                  <strong style={{ color: "#fff" }}>
                    {txnCount} txn{txnCount !== 1 ? "s" : ""}
                  </strong>
                </div>
              </div>

              {/* Expiry / Urgency Badges Ribbon */}
              {!isClosed && expiryDays !== null && expiryDays <= 30 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  <div
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      background:
                        expiryDays < 0 || expiryDays <= 7
                          ? "rgba(239,68,68,0.25)"
                          : "rgba(245,158,11,0.25)",
                      color:
                        expiryDays < 0 || expiryDays <= 7 ? "#ff9999" : "#fde68a",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={10} />
                    {expiryDays < 0
                      ? `Expired ${Math.abs(expiryDays)}d ago`
                      : expiryDays === 0
                        ? "Expires today!"
                        : `Expires in ${expiryDays}d`}
                  </div>
                </div>
              )}

              {/* Quick Action Footer Toolbar (exact match with Credit Cards) */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 48,
                  background: "rgba(15,15,22,0.65)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 10px",
                  borderBottomLeftRadius: 18,
                  borderBottomRightRadius: 18,
                }}
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() => setQuickTx({ card: p, type: "load" })}
                      style={{
                        background: "rgba(34,197,94,0.22)",
                        border: "1px solid rgba(34,197,94,0.45)",
                        color: "#86efac",
                        padding: "5px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "background 0.15s ease",
                      }}
                      title="Quick load money into this card"
                    >
                      <TrendingUp size={12} /> + Load
                    </button>
                  )}
                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() => setQuickTx({ card: p, type: "spend" })}
                      style={{
                        background: "rgba(239,68,68,0.22)",
                        border: "1px solid rgba(239,68,68,0.45)",
                        color: "#ff9999",
                        padding: "5px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "background 0.15s ease",
                      }}
                      title="Record an expense on this card"
                    >
                      <TrendingDown size={12} /> − Spend
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      padding: "5px 10px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title="View transaction ledger and import/export CSV"
                  >
                    <List size={12} /> Ledger ({txnCount})
                  </button>
                </div>

                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() => {
                        setClosingCard(p);
                        setCloseDate(today());
                      }}
                      title="Mark card as closed"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,140,140,0.8)",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "4px 6px",
                        cursor: "pointer",
                        borderRadius: 6,
                      }}
                    >
                      Close
                    </button>
                  )}
                  {isClosed && (
                    <button
                      type="button"
                      onClick={() => onUpdateCard(p.id, { status: "active", closedDate: "" })}
                      title="Reactivate card"
                      style={{
                        background: "rgba(34,197,94,0.2)",
                        border: "1px solid rgba(34,197,94,0.45)",
                        color: "#a7f3d0",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "4px 8px",
                        cursor: "pointer",
                        borderRadius: 6,
                      }}
                    >
                      Reactivate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(p.id)}
                    aria-label="Edit card"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,255,255,0.6)",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                    }}
                    title="Edit card details"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteCard(p)}
                    aria-label="Delete card"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,140,140,0.7)",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                    }}
                    title="Delete card"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </Grid>

      {/* Quick Load/Spend Modal */}
      {quickTx && (
        <PrepaidQuickModal
          card={quickTx.card}
          mode={quickTx.type}
          onClose={() => setQuickTx(null)}
          onSave={(newTxns: any[]) => {
            onUpdateCard(quickTx.card.id, { transactions: newTxns });
            setQuickTx(null);
          }}
        />
      )}

      {/* Full Transaction Ledger Modal */}
      {selectedId && selected && (
        <PrepaidTransactionLedger
          prepaid={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={(newTxns: any) => onUpdateCard(selected.id, { transactions: newTxns })}
        />
      )}

      {/* Card Close Confirmation Modal */}
      {closingCard && (
        <Modal
          title={`Close "${closingCard.cardName || closingCard.name || closingCard.provider || "Prepaid Card"}"`}
          onClose={() => setClosingCard(null)}
          maxWidth={420}
        >
          <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Marking this prepaid card as closed will move it to the Closed tab and exclude it from active balance totals. Its transaction ledger history will be preserved.
          </div>
          <Field label="Card Closure Date">
            <input
              type="date"
              style={input}
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </Field>
          <ModalActions
            onSave={() => {
              onUpdateCard(closingCard.id, { status: "closed", closedDate: closeDate });
              setClosingCard(null);
            }}
            onClose={() => setClosingCard(null)}
            saveLabel="Confirm Close Card"
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
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
  const [searchTxQuery, setSearchTxQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "load" | "spend">("all");
  const [filterCategory, setFilterCategory] = useState("all");

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
    if (!form.amount || Number(form.amount) <= 0) return;
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

  const exportCsv = () => {
    const headers = "date,type,amount,note,category\n";
    const rows = txs
      .map(
        (t) =>
          `${t.date},${t.type},${t.amount},"${(t.note || "").replace(/"/g, '""')}","${(t.category || "").replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(prepaid.cardName || prepaid.name || "prepaid").toLowerCase().replace(/\s+/g, "_")}_transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prepaid_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardName = prepaid.cardName || prepaid.name || prepaid.provider || "Prepaid Card";

  // Filtered transactions
  const filteredTxs = txs.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterCategory !== "all" && (t.category || "") !== filterCategory) return false;
    if (searchTxQuery.trim()) {
      const q = searchTxQuery.toLowerCase().trim();
      const matchNote = (t.note || "").toLowerCase().includes(q);
      const matchCat = (t.category || "").toLowerCase().includes(q);
      const matchDate = (t.date || "").toLowerCase().includes(q);
      const matchAmt = String(t.amount).includes(q);
      if (!matchNote && !matchCat && !matchDate && !matchAmt) return false;
    }
    return true;
  });

  const availableCategories = Array.from(
    new Set(txs.map((t) => t.category).filter(Boolean))
  ) as string[];

  return (
    <>
      <Modal title={`${cardName} — Ledger`} onClose={onClose} maxWidth={940}>
        {/* Top Balance Summary Cards */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}
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
              label: "Available Balance",
              value: <Money value={balance} variant="full" />,
              color: balance >= 0 ? THEME.sage : THEME.rust,
              bg:
                balance >= 0
                  ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
                  : `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
              border:
                balance >= 0
                  ? `color-mix(in srgb, ${THEME.sage} 20%, transparent)`
                  : `color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: 12,
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
                  fontWeight: 600,
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
                  marginTop: 3,
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Action Header: Search & Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 14,
          }}
        >
          {/* Type Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {(
              [
                { id: "all", label: `All (${txs.length})` },
                {
                  id: "load",
                  label: `Loads (${txs.filter((t) => t.type === "load").length})`,
                },
                {
                  id: "spend",
                  label: `Spends (${txs.filter((t) => t.type === "spend").length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  border: filterType === tab.id ? "none" : `1px solid var(--t-line)`,
                  background:
                    filterType === tab.id
                      ? tab.id === "load"
                        ? "var(--t-sage, #10b981)"
                        : tab.id === "spend"
                          ? "var(--t-rust, #ef4444)"
                          : "var(--t-accent)"
                      : "transparent",
                  color: filterType === tab.id ? "#fff" : "var(--t-muted)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action Buttons: Export, Import, Load, Spend */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {txs.length > 0 && (
              <button
                style={{
                  ...btnGhost,
                  fontSize: 11,
                  padding: "5px 10px",
                  color: "var(--t-muted)",
                }}
                onClick={exportCsv}
                title="Export transactions as CSV"
              >
                <Download size={12} /> Export CSV
              </button>
            )}
            <button
              style={{
                ...btnGhost,
                fontSize: 11,
                padding: "5px 10px",
                color: THEME.accent,
                borderColor: `color-mix(in srgb, ${THEME.accent} 40%, transparent)`,
              }}
              onClick={() => {
                setShowCsvImport((v) => !v);
                setShowAdd(false);
              }}
            >
              <Upload size={12} /> Import CSV
            </button>
            <button
              style={{
                ...btnGhost,
                fontSize: 11,
                padding: "5px 12px",
                color: THEME.sage,
                borderColor: `color-mix(in srgb, ${THEME.sage} 33%, transparent)`,
              }}
              onClick={() => openAdd("load")}
            >
              <TrendingUp size={12} /> Load Money
            </button>
            <button
              style={{
                ...btnGhost,
                fontSize: 11,
                padding: "5px 12px",
                color: THEME.rust,
                borderColor: `color-mix(in srgb, ${THEME.rust} 33%, transparent)`,
              }}
              onClick={() => openAdd("spend")}
            >
              <TrendingDown size={12} /> Record Spend
            </button>
          </div>
        </div>

        {/* Filter bar: Search & Category */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            padding: "8px 12px",
            background: "var(--surface-0)",
            border: `1px solid var(--t-line)`,
            borderRadius: 8,
            marginBottom: 14,
          }}
        >
          <div style={{ position: "relative", flex: "1 1 180px", minWidth: 140 }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--t-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search note, category, or amount..."
              value={searchTxQuery}
              onChange={(e) => setSearchTxQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "4px 8px 4px 28px",
                fontSize: 11.5,
                borderRadius: 6,
                border: "1px solid var(--t-line)",
                background: "var(--t-paper)",
                color: "var(--t-ink)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {availableCategories.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10.5, color: "var(--t-muted)", fontWeight: 600 }}>Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  padding: "4px 8px",
                  fontSize: 11.5,
                  borderRadius: 6,
                  border: "1px solid var(--t-line)",
                  background: "var(--t-paper)",
                  color: "var(--t-ink)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Categories</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CSV Import Panel */}
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
                style={{
                  background: "rgba(128,128,128,0.12)",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                date, type, amount, note, category
              </code>
              <br />
              Example:{" "}
              <code
                style={{
                  background: "rgba(128,128,128,0.12)",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                2025-01-05, load, 5000, Monthly top-up,
              </code>
              &nbsp;&nbsp;
              <code
                style={{
                  background: "rgba(128,128,128,0.12)",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
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
                                background:
                                  r.type === "load"
                                    ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                                    : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                                color: r.type === "load" ? THEME.sage : THEME.rust,
                              }}
                            >
                              {r.type.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "7px 10px", color: THEME.muted }}>
                            {r.note || "—"}
                          </td>
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

        {/* Add/Edit Transaction Form */}
        {showAdd && (
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              marginBottom: 16,
              background:
                txType === "load"
                  ? `color-mix(in srgb, ${THEME.sage} 4%, transparent)`
                  : `color-mix(in srgb, ${THEME.rust} 4%, transparent)`,
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
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
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
                  placeholder={
                    txType === "load" ? "e.g. Monthly credit" : "e.g. Lunch at canteen"
                  }
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

        {/* Transactions Table */}
        <div style={{ maxHeight: 480, overflowY: "auto" }}>
          <DataTable
            columns={[
              {
                key: "date",
                header: "Date",
                accessor: (t: any) => (
                  <span style={{ color: THEME.muted, fontSize: 12 }}>{t.date}</span>
                ),
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
                  <span
                    style={{
                      fontWeight: 700,
                      color: t.type === "load" ? THEME.sage : THEME.rust,
                    }}
                  >
                    {t.type === "load" ? "+" : "−"}
                    <Money value={t.amount} variant="exact" />
                  </span>
                ),
              },
            ]}
            data={[...filteredTxs].sort((a: any, b: any) => b.date.localeCompare(a.date))}
            hideSearch
            keyExtractor={(t: any) => t.id}
            emptyState={
              <span style={{ color: THEME.muted, fontSize: 13, padding: "24px 0", display: "block" }}>
                {txs.length === 0
                  ? "No transactions yet — load money, record a spend, or import a CSV above"
                  : "No transactions match your search/filter criteria"}
              </span>
            }
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
      status: "active",
      closedDate: "",
      expiryDate: "",
      lowBalanceThreshold: "100",
      transactions: [],
    }
  );
  const [openingBal, setOpeningBal] = useState("");
  const [error, setError] = useState("");

  const popularTypes = [
    "Meal Card",
    "Gift Card",
    "Forex Card",
    "Transit Card",
    "Digital Wallet",
    "Fuel Card",
  ];

  return (
    <Modal title={initial ? "Edit Prepaid Card" : "Add Prepaid Card / Wallet"} onClose={onClose} maxWidth={520}>
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

      <Field label="Card Name *" error={error}>
        <input
          style={{
            ...input,
            borderColor: error ? "var(--t-rust, #ef4444)" : undefined,
          }}
          value={f.cardName || f.name || ""}
          onChange={(e) => {
            setF({ ...f, cardName: e.target.value });
            if (error) setError("");
          }}
          placeholder="e.g. Sodexo Meal Card, Zeta, ICICI Forex"
        />
      </Field>

      {/* Card Type with Quick Chips */}
      <div>
        <Field label="Card Type">
          <select
            style={input}
            value={f.cardType || prepaidCardTypes[0] || "Prepaid Card"}
            onChange={(e) => setF({ ...f, cardType: e.target.value })}
          >
            {Array.from(new Set([...popularTypes, ...prepaidCardTypes])).map((t: string) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: -4, marginBottom: 12 }}>
          {popularTypes.slice(0, 4).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setF({ ...f, cardType: t })}
              style={{
                fontSize: 10.5,
                padding: "2px 8px",
                borderRadius: 12,
                border: f.cardType === t ? "1px solid var(--t-accent)" : "1px solid var(--t-line)",
                background: f.cardType === t ? "color-mix(in srgb, var(--t-accent) 15%, transparent)" : "transparent",
                color: f.cardType === t ? "var(--t-accent)" : "var(--t-muted)",
                cursor: "pointer",
                fontWeight: f.cardType === t ? 700 : 500,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Last 4 Digits (optional)">
          <input
            style={input}
            maxLength={4}
            value={f.last4 || ""}
            onChange={(e) => setF({ ...f, last4: e.target.value.replace(/\D/g, "") })}
            placeholder="1234"
          />
        </Field>
        <Field label="Expiry Date (optional)">
          <input
            type="date"
            style={input}
            value={f.expiryDate || ""}
            onChange={(e) => setF({ ...f, expiryDate: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Low Balance Alert Below (₹)">
        <input
          style={input}
          type="number"
          min="0"
          value={f.lowBalanceThreshold || ""}
          onChange={(e) => setF({ ...f, lowBalanceThreshold: e.target.value })}
          placeholder="e.g. 500 (Alerts you when available balance drops below this)"
        />
      </Field>

      {/* Status Toggle when editing */}
      {initial && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "var(--surface-0)",
            border: "1px solid var(--t-line)",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Card Status:</span>
            <div style={{ display: "flex", gap: 6 }}>
              {(["active", "closed"] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() =>
                    setF({
                      ...f,
                      status: st,
                      closedDate: st === "closed" ? f.closedDate || today() : "",
                    })
                  }
                  style={{
                    padding: "4px 14px",
                    borderRadius: 14,
                    border: (f.status || "active") === st ? "none" : "1px solid var(--t-line)",
                    background:
                      (f.status || "active") === st
                        ? st === "active"
                          ? "var(--t-sage, #10b981)"
                          : "var(--t-rust, #ef4444)"
                        : "transparent",
                    color: (f.status || "active") === st ? "#fff" : "var(--t-muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
          {(f.status || "active") === "closed" && (
            <div style={{ marginTop: 10 }}>
              <Field label="Closed Date">
                <input
                  type="date"
                  style={input}
                  value={f.closedDate || today()}
                  onChange={(e) => setF({ ...f, closedDate: e.target.value })}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {!initial && (
        <Field label="Initial Loaded Balance (optional)">
          <input
            style={input}
            type="number"
            min="0"
            value={openingBal}
            onChange={(e) => setOpeningBal(e.target.value)}
            placeholder="e.g. 5000 (Creates an initial top-up transaction)"
          />
        </Field>
      )}

      <ModalActions
        onSave={() => {
          const name = (f.cardName || f.name || "").trim();
          if (!name) {
            setError("Card Name is required");
            return;
          }
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
            lowBalanceThreshold: f.lowBalanceThreshold ? Number(f.lowBalanceThreshold) : 100,
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

