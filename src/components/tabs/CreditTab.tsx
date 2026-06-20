// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Plus,
  Edit3,
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
} from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { getCardGradient } from "../../utils/cardColors";
import { fmtINRFull, today, uid } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";

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
  if (!owner) return null;
  const p = PROFILES.find((x) => x.id === owner);
  if (!p) return null;
  return (
    <Badge variant="accent" style={{ fontSize: 10 }}>
      {p.name}
    </Badge>
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
  const gradient = isBorrowed
    ? "linear-gradient(135deg,#dc2626 0%,#f87171 100%)"
    : "linear-gradient(135deg,#15803d 0%,#4ade80 100%)";
  const dotColor = isBorrowed ? "#dc2626" : "#16a34a";
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
          width: 64,
          height: 64,
          borderRadius: 20,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <Icon size={30} color="#fff" />
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
  borderRadius: 8,
  fontWeight: 700,
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
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
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

const InvestCard = ({ children, onRemove, onEdit, cardStyle }: any) => (
  <div style={{ ...card, position: "relative", ...cardStyle }}>
    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
      <button onClick={onEdit} style={iconBtn}>
        <Edit3 size={14} />
      </button>
      <button onClick={onRemove} style={iconBtn}>
        <Trash2 size={14} />
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

export function CreditTab({ state, addItem, removeItem, updateItem, subTab, onSubTabChange }: any) {
  const [sub, setSub] = useState(subTab || "cc");
  const [modal, setModal] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Existing shared group names — passed to modals for datalist suggestions
  const existingGroups: string[] = [
    ...new Set(
      state.creditCards.filter((c: any) => c.sharedGroup).map((c: any) => c.sharedGroup as string)
    ),
  ];

  const subs = [
    { id: "cc", label: "Credit Cards", icon: CreditCard },
    { id: "prepaid", label: "Prepaid Cards", icon: Wallet },
    { id: "taken", label: "Loans Taken", icon: TrendingDown },
    { id: "given", label: "Loans Given", icon: TrendingUp },
    { id: "borrowed", label: "From People", icon: TrendingDown },
    { id: "lent", label: "To People", icon: IndianRupee },
    { id: "optimizer", label: "Payoff Optimizer", icon: Sparkles },
  ];

  React.useEffect(() => {
    if (subTab) setSub(subTab);
  }, [subTab]);

  const activeLabel = subs.find((s) => s.id === sub)?.label || "";

  const subCounts: Record<string, number> = {
    cc: state.creditCards.length,
    prepaid: state.prepaidCards.length,
    taken: state.loansTaken.length,
    given: state.loansGiven.length,
    borrowed: (state.informalBorrowed || []).length,
    lent: (state.informalLent || []).length,
  };

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
        <SectionTitle sub="Manage cards, debts, and personal lending portfolios">
          Credit & Liabilities
        </SectionTitle>
        {sub !== "borrowed" &&
          sub !== "lent" &&
          sub !== "optimizer" &&
          !(sub === "taken" && !state.loansTaken.length) &&
          !(sub === "given" && !state.loansGiven.length) &&
          !(sub === "cc" && !state.creditCards.length) &&
          !(sub === "prepaid" && !state.prepaidCards.length) && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setModal(sub)}>
              Add {activeLabel.split(" ")[0]}
            </Button>
          )}
      </div>

      {/* Inline sub-tab navigation */}
      <div className="demat-portfolio-bar no-scrollbar" style={{ marginBottom: 24 }}>
        {subs.map((s) => {
          const Icon = s.icon;
          const active = sub === s.id;
          const count = subCounts[s.id];
          return (
            <button
              key={s.id}
              onClick={() => {
                setSub(s.id);
                onSubTabChange?.(s.id);
              }}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
            >
              <Icon size={13} />
              {s.label}
              {count !== undefined && count > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 800,
                    background: `${THEME.accent}22`,
                    color: THEME.accent,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
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
              const totalAvailable = totalLimit - totalOutstandingCC;
              const utilPct =
                totalLimit > 0 ? Math.round((totalOutstandingCC / totalLimit) * 100) : 0;

              const totalAnnualFees = activeCards
                .filter((c: any) => Number(c.annualFee) > 0)
                .reduce((acc: number, c: any) => acc + Number(c.annualFee), 0);
              const feeCardCount = activeCards.filter((c: any) => Number(c.annualFee) > 0).length;

              const statCards = [
                {
                  label: "Total Limit",
                  sub: `${activeCards.length} active card${activeCards.length !== 1 ? "s" : ""}`,
                  value: fmtINRFull(totalLimit),
                  color: THEME.accent,
                  borderColor: "var(--t-accent)",
                  iconBg: `${THEME.accent}1f`,
                  icon: (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="1" y="4" width="22" height="16" rx="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  ),
                },
                {
                  label: "Outstanding",
                  sub: utilPct > 0 ? `${utilPct}% utilization` : "No balance due",
                  value: fmtINRFull(totalOutstandingCC),
                  color: THEME.rust,
                  borderColor: "var(--t-rust)",
                  iconBg: `${THEME.rust}1f`,
                  icon: (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                      <polyline points="17 18 23 18 23 12" />
                    </svg>
                  ),
                },
                {
                  label: "Available",
                  sub:
                    totalLimit > 0
                      ? `${100 - utilPct}% of limit free`
                      : activeCards.length === 0 && state.creditCards.length > 0
                        ? "All cards closed"
                        : "No cards yet",
                  value: fmtINRFull(totalAvailable),
                  color: THEME.sage,
                  borderColor: "var(--t-sage)",
                  iconBg: `${THEME.sage}1f`,
                  icon: (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                },
                ...(totalAnnualFees > 0
                  ? [
                      {
                        label: "Annual Fees / yr",
                        sub: `${feeCardCount} card${feeCardCount !== 1 ? "s" : ""} · ${fmtINRFull(Math.round(totalAnnualFees / 12))}/mo`,
                        value: fmtINRFull(totalAnnualFees),
                        color: THEME.gold,
                        borderColor: "var(--t-gold)",
                        iconBg: `${THEME.gold}1f`,
                        icon: (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                        ),
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
                    {statCards.map(({ label, value, color, sub: subText, icon, iconBg }) => (
                      <div
                        key={label}
                        className="card-lift"
                        style={{
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                          borderTop: `4px solid ${color}`,
                          borderRadius: 14,
                          padding: "18px 20px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          boxShadow: "var(--shadow-card)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: iconBg || `${color}1f`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color,
                              flexShrink: 0,
                            }}
                          >
                            {icon}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: THEME.muted,
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.1em",
                            }}
                          >
                            {label}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 26,
                            fontWeight: 900,
                            color: THEME.ink,
                            letterSpacing: "-0.04em",
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {value}
                        </div>
                        {subText && (
                          <div style={{ fontSize: 10, color: THEME.muted }}>{subText}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {activeCards.length > 0 && (
                    <div
                      style={{
                        marginBottom: 24,
                        padding: "9px 14px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        background: utilPct > 30 ? `${THEME.rust}0f` : `${THEME.sage}0f`,
                        border: `1px solid ${utilPct > 30 ? `${THEME.rust}2e` : `${THEME.sage}2e`}`,
                        color: utilPct > 30 ? THEME.rust : THEME.sage,
                      }}
                    >
                      {utilPct > 70
                        ? `⚠ Critical: ${utilPct}% overall utilization — very high. Pay down balances urgently to protect your credit score.`
                        : utilPct > 30
                          ? `⚠ ${utilPct}% overall utilization — above the recommended 30% threshold. Reducing this will improve your credit score.`
                          : utilPct > 0
                            ? `✓ ${utilPct}% overall utilization — healthy range. Keeping below 30% is great for your credit score.`
                            : `✓ No outstanding balance — excellent credit utilization.`}
                    </div>
                  )}
                </>
              );
            })()}
            <CCList
              items={state.creditCards}
              onRemove={(id: any) => removeItem("creditCards", id)}
              onEdit={setEditId}
              onUpdateCard={(id: any, updates: any) => updateItem("creditCards", id, updates)}
              onAdd={() => setModal("cc")}
              existingGroups={existingGroups}
            />
          </>
        )}
        {sub === "prepaid" && (
          <PrepaidList
            items={state.prepaidCards}
            onRemove={(id: any) => removeItem("prepaidCards", id)}
            onEdit={setEditId}
            onUpdateCard={(id: any, updates: any) => updateItem("prepaidCards", id, updates)}
            onAdd={() => setModal("prepaid")}
          />
        )}
        {sub === "taken" && (
          <LoanTakenList
            items={state.loansTaken}
            onRemove={(id: any) => removeItem("loansTaken", id)}
            onEdit={setEditId}
            onAdd={() => setModal("taken")}
          />
        )}
        {sub === "given" && (
          <LoanGivenList
            items={state.loansGiven}
            onRemove={(id: any) => removeItem("loansGiven", id)}
            onEdit={setEditId}
            onAdd={() => setModal("given")}
          />
        )}
        {sub === "borrowed" && (
          <InformalLoanView
            direction="borrowed"
            items={state.informalBorrowed || []}
            onAddPerson={(v: any) => addItem("informalBorrowed", v)}
            onUpdate={(id: any, patch: any) => updateItem("informalBorrowed", id, patch)}
            onRemove={(id: any) => removeItem("informalBorrowed", id)}
          />
        )}
        {sub === "lent" && (
          <InformalLoanView
            direction="lent"
            items={state.informalLent || []}
            onAddPerson={(v: any) => addItem("informalLent", v)}
            onUpdate={(id: any, patch: any) => updateItem("informalLent", id, patch)}
            onRemove={(id: any) => removeItem("informalLent", id)}
          />
        )}
        {sub === "optimizer" && <DebtPayoffOptimizer state={state} />}
      </div>

      {modal === "cc" && (
        <CCModal
          onClose={() => setModal(null)}
          onSave={(v: any) => {
            addItem("creditCards", v);
            setModal(null);
          }}
          existingGroups={existingGroups}
        />
      )}
      {modal === "prepaid" && (
        <PrepaidModal
          onClose={() => setModal(null)}
          onSave={(v: any) => {
            addItem("prepaidCards", v);
            setModal(null);
          }}
        />
      )}
      {modal === "taken" && (
        <LoanTakenModal
          onClose={() => setModal(null)}
          onSave={(v: any) => {
            addItem("loansTaken", v);
            setModal(null);
          }}
        />
      )}
      {modal === "given" && (
        <LoanGivenModal
          onClose={() => setModal(null)}
          onSave={(v: any) => {
            addItem("loansGiven", v);
            setModal(null);
          }}
        />
      )}

      {editId && sub === "cc" && (
        <CCModal
          initial={state.creditCards.find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => {
            updateItem("creditCards", editId, v);
            setEditId(null);
          }}
          existingGroups={existingGroups}
        />
      )}
      {editId && sub === "prepaid" && (
        <PrepaidModal
          initial={state.prepaidCards.find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => {
            updateItem("prepaidCards", editId, v);
            setEditId(null);
          }}
        />
      )}
      {editId && sub === "taken" && (
        <LoanTakenModal
          initial={state.loansTaken.find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => {
            updateItem("loansTaken", editId, v);
            setEditId(null);
          }}
        />
      )}
      {editId && sub === "given" && (
        <LoanGivenModal
          initial={state.loansGiven.find((x: any) => x.id === editId)}
          onClose={() => setEditId(null)}
          onSave={(v: any) => {
            updateItem("loansGiven", editId, v);
            setEditId(null);
          }}
        />
      )}
    </div>
  );
}

function CCEmptyState({ onAdd }: any) {
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: `linear-gradient(135deg,${THEME.accent} 0%,#818cf8 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <CreditCard size={30} color="#fff" />
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
          width: 64,
          height: 64,
          borderRadius: 20,
          background: "linear-gradient(135deg,#0891b2 0%,#22d3ee 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <Wallet size={30} color="#fff" />
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

function getNextFeeDate(c: any): { dateStr: string; daysLeft: number } | null {
  if (!Number(c.annualFee) || !c.feeMonth) return null;
  const now = new Date();
  const month = Number(c.feeMonth) - 1;
  const day = Number(c.feeDay) || 1;
  let candidate = new Date(now.getFullYear(), month, day);
  if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    candidate = new Date(now.getFullYear() + 1, month, day);
  }
  const daysLeft = Math.ceil(
    (candidate.getTime() - new Date(today() + "T00:00:00").getTime()) / 86400000
  );
  const dateStr = `${day} ${MONTH_NAMES[month]}`;
  return { dateStr, daysLeft };
}

function CCList({ items, onRemove, onEdit, onUpdateCard, onAdd, existingGroups: _existingGroups }: any) {
  const [selectedLedger, setSelectedLedger] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "closed">("active");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState(today());

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
          paddingBottom: isClosed ? 20 : 60,
          opacity: isClosed ? 0.8 : 1,
          filter: isClosed ? "grayscale(35%)" : "none",
        }}
      >
        {/* Action buttons */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            gap: 6,
            alignItems: "center",
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
                background: "rgba(239,68,68,0.18)",
                border: "1px solid rgba(239,68,68,0.3)",
                cursor: "pointer",
                color: "#ff8080",
                padding: "3px 9px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
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
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.3)",
                cursor: "pointer",
                color: "#6ee7b7",
                padding: "3px 9px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              REACTIVATE
            </button>
          )}
          <button
            onClick={() => onEdit(c.id)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(245,239,227,0.6)",
            }}
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => onRemove(c.id)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(245,239,227,0.6)",
            }}
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
              background: "rgba(15,15,25,0.97)",
              border: "1px solid rgba(239,68,68,0.45)",
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
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                fontSize: 13,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Network logo + owner badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <CardNetworkLogo network={c.network} />
          {!isClosed && <OwnerBadge owner={c.owner} />}
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{c.issuer}</div>
        <div style={{ fontSize: 16, letterSpacing: "0.05em", marginTop: 12, opacity: 0.8 }}>
          •••• •••• •••• {c.last4 || "••••"}
        </div>
        {isClosed && c.closedDate && (
          <div style={{ fontSize: 10, color: "rgba(255,128,128,0.7)", marginTop: 5 }}>
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
              style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}
            >
              Outstanding
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.outstanding)}</div>
          </div>
          <div>
            <div
              style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}
            >
              {c.sharedGroup ? "Sub-Limit" : "Limit"}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.limit)}</div>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            fontSize: 11,
            color: "rgba(245,239,227,0.7)",
          }}
        >
          <div>
            Bill Date: <strong>{c.billDate ? `${c.billDate}th` : "—"}</strong>
          </div>
          <div>
            Due Day: <strong>{c.dueDay ? `${c.dueDay}th` : "—"}</strong>
          </div>
          <div>
            Fee:{" "}
            <strong>
              {fmtINRFull(c.annualFee)}
              {c.feeMonth
                ? ` · ${Number(c.feeDay) || 1} ${MONTH_NAMES[Number(c.feeMonth) - 1]}`
                : ""}
            </strong>
          </div>
          <div>
            Helpline: <strong>{c.helpline || "—"}</strong>
          </div>
        </div>
        {c.waiverInfo && (
          <div
            style={{
              marginTop: 12,
              fontSize: 10,
              background: "rgba(255,255,255,0.05)",
              padding: "6px 10px",
              borderRadius: 6,
              color: THEME.gold,
            }}
          >
            Waiver: {c.waiverInfo}
          </div>
        )}

        {/* Due-date countdown */}
        {!isClosed &&
          c.dueDay &&
          (() => {
            const now = new Date();
            const dd = Number(c.dueDay);
            const dueDate =
              now.getDate() < dd
                ? new Date(now.getFullYear(), now.getMonth(), dd)
                : new Date(now.getFullYear(), now.getMonth() + 1, dd);
            const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const urgentColor =
              daysLeft <= 3 ? "#ff8080" : daysLeft <= 7 ? "#fbbf24" : "rgba(245,239,227,0.55)";
            const label =
              daysLeft <= 0
                ? "⚠ Due today!"
                : daysLeft === 1
                  ? "⚠ Due tomorrow!"
                  : `Payment due in ${daysLeft} days`;
            return (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: urgentColor,
                  fontWeight: daysLeft <= 7 ? 700 : 500,
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
            const urgentColor =
              daysLeft <= 7 ? "#ff8080" : daysLeft <= 30 ? "#fbbf24" : "rgba(245,239,227,0.55)";
            const label =
              daysLeft === 0
                ? `⚠ Annual fee ${fmtINRFull(c.annualFee)} due today!`
                : daysLeft === 1
                  ? `⚠ Annual fee ${fmtINRFull(c.annualFee)} due tomorrow!`
                  : `Annual fee ${fmtINRFull(c.annualFee)} on ${dateStr} (${daysLeft}d)`;
            return (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: urgentColor,
                  fontWeight: daysLeft <= 30 ? 700 : 400,
                }}
              >
                {label}
              </div>
            );
          })()}

        {/* Sub-limit utilization bar — active cards only */}
        {!isClosed && (
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 4, background: "rgba(245,239,227,0.15)", borderRadius: 2 }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(util, 100)}%`,
                  background: util > 70 ? THEME.rust : util > 40 ? THEME.gold : THEME.sage,
                  borderRadius: 2,
                }}
              />
            </div>
            <div
              style={{
                fontSize: 10,
                color: util > 70 ? THEME.rust : util > 40 ? THEME.gold : THEME.sage,
                marginTop: 6,
              }}
            >
              {util.toFixed(1)}% of {c.sharedGroup ? "sub-limit" : "limit"}
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
              height: 44,
              background: "rgba(255,255,255,0.05)",
              border: "none",
              borderTop: `1px solid rgba(255,255,255,0.1)`,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
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
              background: "rgba(255,255,255,0.04)",
              border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: 8,
              color: "rgba(255,255,255,0.45)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
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
              border: viewMode === mode ? "none" : `1.5px solid ${THEME.line}`,
              background:
                viewMode === mode ? (mode === "active" ? THEME.accent : "#555") : "transparent",
              color: viewMode === mode ? "#fff" : THEME.muted,
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
        <EmptyHint
          text={viewMode === "active" ? "No active credit cards" : "No closed credit cards yet"}
        />
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
                marginBottom: 14,
                padding: "16px 20px",
                borderRadius: 14,
                background: "var(--surface-0)",
                border: `1.5px solid ${barColor}55`,
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
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Shared Credit Pool
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: THEME.ink,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {groupName}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    {cards.length} card{cards.length !== 1 ? "s" : ""} sharing this pool
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: barColor,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {groupUtil.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>of pool used</div>
                </div>
              </div>
              <div
                style={{
                  height: 8,
                  background: "var(--t-line)",
                  borderRadius: 4,
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(groupUtil, 100)}%`,
                    background: barColor,
                    borderRadius: 4,
                    transition: "width 0.5s ease",
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
                    }}
                  >
                    Pool Limit
                  </div>
                  <div style={{ fontWeight: 800, color: THEME.ink }}>
                    {groupLimit > 0 ? fmtINRFull(groupLimit) : "Not set"}
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
                    }}
                  >
                    Combined Used
                  </div>
                  <div style={{ fontWeight: 800, color: barColor }}>
                    {fmtINRFull(groupOutstanding)}
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
                    }}
                  >
                    Available
                  </div>
                  <div style={{ fontWeight: 800, color: THEME.sage }}>
                    {groupLimit > 0 ? fmtINRFull(groupAvailable) : "—"}
                  </div>
                </div>
              </div>
              {groupLimit === 0 && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11,
                    color: THEME.gold,
                    background: `${THEME.gold}12`,
                    border: `1px solid ${THEME.gold}30`,
                    borderRadius: 6,
                    padding: "6px 10px",
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
            const newOutstanding = newTransactions.reduce(
              (acc: any, t: any) => acc + Number(t.amount),
              0
            );
            onUpdateCard(selectedLedger, {
              transactions: newTransactions,
              outstanding: String(newOutstanding),
            });
          }}
        />
      )}
    </div>
  );
}

function CCTransactionLedger({ card, onClose, onUpdate }: any) {
  const { ccTransactionCategories: cats } = useMasterData();

  // If the card has a manually-entered outstanding but no ledger transactions yet,
  // seed the ledger with an "Opening Balance" entry so the outstanding is not lost
  // when the user adds their first transaction.
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
        },
      ];
    }
    return existing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [txs, setTxs] = useState(initTxs);
  const [showAdd, setShowAdd] = useState(false);

  // Persist the auto-generated opening balance on first render only; including
  // card.outstanding/initTxs/onUpdate in deps would re-fire on every update.
  React.useEffect(() => {
    if ((card.transactions || []).length === 0 && Number(card.outstanding) > 0) {
      onUpdate(initTxs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [newTx, setNewTx] = useState({
    date: today(),
    merchant: "",
    amount: "",
    category: cats[0] || "General",
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

  const saveTx = () => {
    if (!newTx.merchant || !newTx.amount) return;
    const updated = editId
      ? txs.map((t: any) => (t.id === editId ? { ...newTx, id: editId } : t))
      : [...txs, { ...newTx, id: uid() }];
    setTxs(updated);
    onUpdate(updated);
    setShowAdd(false);
    setEditId(null);
    setNewTx({ date: today(), merchant: "", amount: "", category: cats[0] || "General" });
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
        if (parts.length < 3) throw new Error(`Row ${i + 1}: need at least date, merchant, amount`);
        const [date, merchant, amount, category] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD (got "${date}")`);
        const amt = Number(amount);
        if (isNaN(amt)) throw new Error(`Row ${i + 1}: amount must be a number`);
        return {
          date,
          merchant: merchant || "Unknown",
          amount: amt,
          category: category || "General",
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
    const content =
      "# Credit Card Transaction Import Template\n# Columns: date, merchant, amount, category\n# date = YYYY-MM-DD | positive amount = charge, negative = payment/credit\n# Lines starting with # are ignored\n2025-01-05,Amazon,2499,Shopping\n2025-01-08,Swiggy,450,Food\n2025-01-10,BookMyShow,800,Entertainment\n2025-01-12,Uber,320,Transport\n2025-01-15,Bill Payment,-5000,Payment";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cc_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const header = "date,merchant,category,amount";
    const rows = [...txs]
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map(
        (t: any) =>
          `${t.date},"${(t.merchant || "").replace(/"/g, '""')}","${(t.category || "General").replace(/"/g, '""')}",${t.amount}`
      );
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
    <Modal title={`${card.issuer} — Transactions`} onClose={onClose} maxWidth={920}>
      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          {
            label: "Total Charges",
            value: fmtINRFull(totalCharges),
            color: THEME.rust,
            bg: `${THEME.rust}15`,
            border: `${THEME.rust}33`,
          },
          {
            label: "Net Outstanding",
            value: fmtINRFull(totalOutstanding),
            color: totalOutstanding > 0 ? THEME.rust : THEME.sage,
            bg: totalOutstanding > 0 ? `${THEME.rust}15` : `${THEME.sage}15`,
            border: totalOutstanding > 0 ? `${THEME.rust}33` : `${THEME.sage}33`,
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
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          Transaction Ledger{" "}
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
              borderColor: `${THEME.accent}66`,
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
                borderColor: `${THEME.sage}55`,
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

      {/* CSV Import Panel */}
      {showCsvImport && (
        <div
          style={{
            padding: 18,
            borderRadius: 12,
            marginBottom: 16,
            background: `${THEME.accent}09`,
            border: `1px solid ${THEME.accent}38`,
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
              style={{
                fontSize: 11,
                padding: "4px 12px",
                borderRadius: 6,
                border: `1px solid ${THEME.accent}4d`,
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
              date, merchant, amount, category
            </code>
            <br />
            Charge:{" "}
            <code
              style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}
            >
              2025-01-05, Amazon, 2499, Shopping
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
              border: `1.5px dashed ${THEME.accent}66`,
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 12,
              background: `${THEME.accent}08`,
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
              "2025-01-05, Amazon, 2499, Shopping\n2025-01-08, Swiggy, 450, Food\n2025-01-15, Bill Payment, -5000, Payment"
            }
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: `1px solid ${THEME.accent}66`,
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
                  color: "#fff",
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
                background: `${THEME.rust}0f`,
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
                  background: `${THEME.accent}12`,
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
                          {fmtINRFull(r.amount)}
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

      {/* Manual Add / Edit Form */}
      {showAdd && (
        <div
          style={{
            background: THEME.darkInk,
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
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}
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
          </div>
          <button style={{ ...btnAccent, width: "100%" }} onClick={saveTx}>
            {editId ? "Update Transaction" : "Save Transaction"}
          </button>
        </div>
      )}

      {/* Transaction Table */}
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                borderBottom: `1px solid ${THEME.line}`,
                color: THEME.muted,
              }}
            >
              <th style={{ padding: "10px 8px" }}>Date</th>
              <th style={{ padding: "10px 8px" }}>Merchant</th>
              <th style={{ padding: "10px 8px" }}>Category</th>
              <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
              <th style={{ padding: "10px 8px", width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "28px 8px",
                    textAlign: "center",
                    color: THEME.muted,
                    fontSize: 13,
                  }}
                >
                  No transactions yet — add manually or import CSV above
                </td>
              </tr>
            ) : (
              [...txs]
                .sort((a: any, b: any) => b.date.localeCompare(a.date))
                .map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "12px 8px" }}>{t.date}</td>
                    <td style={{ padding: "12px 8px", fontWeight: 600 }}>{t.merchant}</td>
                    <td style={{ padding: "12px 8px" }}>
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
                    </td>
                    <td
                      style={{
                        padding: "12px 8px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: Number(t.amount) >= 0 ? THEME.rust : THEME.sage,
                      }}
                    >
                      {fmtINRFull(t.amount)}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => startEdit(t)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: THEME.muted,
                            cursor: "pointer",
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => removeTx(t.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: THEME.rust,
                            cursor: "pointer",
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: `2px solid ${THEME.line}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 14, color: THEME.muted }}>Net Outstanding</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: totalOutstanding > 0 ? THEME.rust : THEME.sage,
          }}
        >
          {fmtINRFull(totalOutstanding)}
        </div>
      </div>
    </Modal>
  );
}

function PrepaidList({ items, onRemove, onEdit, onUpdateCard, onAdd }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "closed">("active");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState(today());
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
              border: viewMode === mode ? "none" : `1.5px solid ${THEME.line}`,
              background:
                viewMode === mode ? (mode === "active" ? THEME.accent : "#555") : "transparent",
              color: viewMode === mode ? "#fff" : THEME.muted,
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
        <EmptyHint
          text={viewMode === "active" ? "No active prepaid cards" : "No closed prepaid cards yet"}
        />
      )}

      <Grid>
        {displayCards.map((p: any) => {
          const isClosed = (p.status || "active").toLowerCase() === "closed";
          const { loaded, spent, balance } = computeStats(p.transactions);
          const txnCount = (p.transactions || []).length;
          const name = p.cardName || p.name || p.provider || "Prepaid Card";
          return (
            <div
              key={p.id}
              style={{
                background: isClosed
                  ? "linear-gradient(135deg, #2a2a1a 0%, #1a1a0d 100%)"
                  : getCardGradient(name),
                color: "#fff",
                borderRadius: 12,
                padding: 20,
                paddingBottom: isClosed ? 20 : 56,
                position: "relative",
                opacity: isClosed ? 0.8 : 1,
                filter: isClosed ? "grayscale(35%)" : "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
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
                      background: "rgba(239,68,68,0.18)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      cursor: "pointer",
                      color: "#ff8080",
                      padding: "3px 9px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
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
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      cursor: "pointer",
                      color: "#6ee7b7",
                      padding: "3px 9px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                    }}
                  >
                    REACTIVATE
                  </button>
                )}
                <button
                  onClick={() => onEdit(p.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => onRemove(p.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.5)",
                  }}
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
                    background: "rgba(15,15,25,0.97)",
                    border: "1px solid rgba(239,68,68,0.45)",
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
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 13,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    background: "rgba(34,197,94,0.2)",
                    color: "#6ee7b7",
                    padding: "2px 8px",
                    borderRadius: 99,
                    border: "1px solid rgba(34,197,94,0.3)",
                  }}
                >
                  {p.cardType || "Prepaid"}
                </span>
                {!isClosed && <OwnerBadge owner={p.owner} />}
              </div>

              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>{name}</div>
              {p.last4 && (
                <div style={{ fontSize: 13, letterSpacing: "0.1em", marginTop: 4, opacity: 0.5 }}>
                  •••• •••• •••• {p.last4}
                </div>
              )}
              {isClosed && p.closedDate && (
                <div style={{ fontSize: 10, color: "rgba(255,128,128,0.7)", marginTop: 5 }}>
                  Closed on{" "}
                  {new Date(p.closedDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Available Balance
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: balance >= 0 ? "#6ee7b7" : "#ff8080",
                    marginTop: 2,
                  }}
                >
                  {fmtINRFull(balance)}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 14,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                <div>
                  Loaded: <b style={{ color: "#6ee7b7" }}>{fmtINRFull(loaded)}</b>
                </div>
                <div>
                  Spent: <b style={{ color: "#ff8080" }}>{fmtINRFull(spent)}</b>
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
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
                    height: 44,
                    background: "rgba(255,255,255,0.06)",
                    border: "none",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <List size={14} /> Transactions & Load Money
                </button>
              )}
              {isClosed && txnCount > 0 && (
                <button
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "8px 0",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
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
    </div>
  );
}

function PrepaidTransactionLedger({ prepaid, onClose, onUpdate }: any) {
  const [txs, setTxs] = useState<any[]>(prepaid.transactions || []);
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
    <Modal title={`${cardName} — Transactions`} onClose={onClose} maxWidth={920}>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}
      >
        {[
          {
            label: "Total Loaded",
            value: fmtINRFull(totalLoaded),
            color: THEME.sage,
            bg: `${THEME.sage}15`,
            border: `${THEME.sage}33`,
          },
          {
            label: "Total Spent",
            value: fmtINRFull(totalSpent),
            color: THEME.rust,
            bg: `${THEME.rust}15`,
            border: `${THEME.rust}33`,
          },
          {
            label: "Balance",
            value: fmtINRFull(balance),
            color: balance >= 0 ? THEME.sage : THEME.rust,
            bg: balance >= 0 ? `${THEME.sage}15` : `${THEME.rust}15`,
            border: balance >= 0 ? `${THEME.sage}33` : `${THEME.rust}33`,
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
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>
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
              borderColor: `${THEME.accent}66`,
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
              borderColor: `${THEME.sage}55`,
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
              borderColor: `${THEME.rust}55`,
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
            background: `${THEME.accent}09`,
            border: `1px solid ${THEME.accent}38`,
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
              style={{
                fontSize: 11,
                padding: "4px 12px",
                borderRadius: 6,
                border: `1px solid ${THEME.accent}4d`,
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
              border: `1.5px dashed ${THEME.accent}66`,
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 12,
              background: `${THEME.accent}08`,
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
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: `1px solid ${THEME.accent}66`,
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
                  color: "#fff",
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
                background: `${THEME.rust}0f`,
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
                  background: `${THEME.accent}12`,
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
                              background: r.type === "load" ? `${THEME.sage}1f` : `${THEME.rust}1f`,
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
                          {fmtINRFull(r.amount)}
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
            background: txType === "load" ? `${THEME.sage}09` : `${THEME.rust}09`,
            border: `1px solid ${txType === "load" ? `${THEME.sage}33` : `${THEME.rust}33`}`,
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
                color: "#fff",
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
        {txs.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
            No transactions yet — load money, record a spend, or import a CSV above
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${THEME.line}`, color: THEME.muted }}>
                <th
                  style={{
                    padding: "10px 10px",
                    textAlign: "left" as const,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    padding: "10px 10px",
                    textAlign: "left" as const,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    padding: "10px 10px",
                    textAlign: "left" as const,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  Note / Merchant
                </th>
                <th
                  style={{
                    padding: "10px 10px",
                    textAlign: "left" as const,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  Category
                </th>
                <th
                  style={{
                    padding: "10px 10px",
                    textAlign: "right" as const,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  Amount
                </th>
                <th style={{ width: 64 }}></th>
              </tr>
            </thead>
            <tbody>
              {[...txs]
                .sort((a: any, b: any) => b.date.localeCompare(a.date))
                .map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "11px 10px", color: THEME.muted, fontSize: 12 }}>
                      {t.date}
                    </td>
                    <td style={{ padding: "11px 10px" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: t.type === "load" ? `${THEME.sage}1f` : `${THEME.rust}1f`,
                          color: t.type === "load" ? THEME.sage : THEME.rust,
                        }}
                      >
                        {t.type === "load" ? "LOAD" : "SPEND"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 10px" }}>{t.note || "—"}</td>
                    <td style={{ padding: "11px 10px", color: THEME.muted, fontSize: 12 }}>
                      {t.type === "spend" ? t.category || "—" : "—"}
                    </td>
                    <td
                      style={{
                        padding: "11px 10px",
                        textAlign: "right" as const,
                        fontWeight: 700,
                        color: t.type === "load" ? THEME.sage : THEME.rust,
                      }}
                    >
                      {t.type === "load" ? "+" : "−"}
                      {fmtINRFull(t.amount)}
                    </td>
                    <td style={{ padding: "11px 10px" }}>
                      <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => editTx(t)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: THEME.muted,
                            cursor: "pointer",
                            padding: 4,
                          }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => removeTx(t.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: THEME.rust,
                            cursor: "pointer",
                            padding: 4,
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}

function LoanEmptyState({ type, onAdd }: any) {
  const isTaken = type === "taken";
  const Icon = isTaken ? TrendingDown : TrendingUp;
  const gradient = isTaken
    ? "linear-gradient(135deg,#dc2626 0%,#f87171 100%)"
    : "linear-gradient(135deg,#0284c7 0%,#38bdf8 100%)";
  const dotColor = isTaken ? "#dc2626" : "#0ea5e9";
  const pills = isTaken
    ? ["Home / Car / Personal Loans", "EMI Tracking", "Payoff Progress", "Interest Remaining"]
    : ["Loans to Friends & Family", "Due Date Tracking", "Interest Rate", "Outstanding Balance"];
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <Icon size={30} color="#fff" />
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
  const [prepayExpanded, setPrepayExpanded] = useState<Set<string>>(new Set());
  const [prepayInputs, setPrepayInputs] = useState<Record<string, string>>({});

  if (!items.length) return <LoanEmptyState type="taken" onAdd={onAdd} />;

  const totalPrincipal = items.reduce((s: number, l: any) => s + (Number(l.principal) || 0), 0);
  const totalOutstanding = items.reduce((s: number, l: any) => s + (Number(l.outstanding) || 0), 0);
  const totalEMI = items.reduce((s: number, l: any) => s + (Number(l.emi) || 0), 0);

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
            sub: `${items.length} loan${items.length !== 1 ? "s" : ""}`,
            color: THEME.muted,
            Icon: TrendingDown,
          },
          {
            label: "Outstanding",
            value: fmtINRFull(totalOutstanding),
            sub: totalOutstanding > 0 ? "Balance remaining" : "All paid off",
            color: THEME.rust,
            Icon: Wallet,
          },
          {
            label: "Monthly EMI",
            value: fmtINRFull(totalEMI),
            sub: "Combined monthly payment",
            color: THEME.accent,
            Icon: Calendar,
          },
        ].map(({ label, value, sub, color, Icon }) => (
          <div
            key={label}
            className="card-lift"
            style={{
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${color}`,
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${color}1f`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </div>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
            {sub && <div style={{ fontSize: 10, color: THEME.muted }}>{sub}</div>}
          </div>
        ))}
      </div>

      <Grid>
        {items.map((l: any) => {
          const principal = Number(l.principal) || 0;
          const outstanding = Number(l.outstanding) || 0;
          const emi = Number(l.emi) || 0;
          const months = Number(l.monthsRemaining) || 0;
          const isPaidOff = months === 0 && outstanding === 0;
          const paid = Math.max(0, principal - outstanding);
          const paidPct = principal > 0 ? Math.min(100, (paid / principal) * 100) : 0;
          const interestRemaining = Math.max(0, emi * months - outstanding);
          const payoffDate =
            months > 0
              ? (() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + months);
                  return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
                })()
              : null;
          const barColor = paidPct > 60 ? THEME.sage : paidPct > 30 ? THEME.gold : THEME.rust;

          return (
            <InvestCard
              key={l.id}
              onRemove={() => onRemove(l.id)}
              onEdit={() => onEdit(l.id)}
              cardStyle={{ borderTop: `3px solid ${isPaidOff ? THEME.sage : THEME.rust}` }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: isPaidOff ? THEME.sage : THEME.rust,
                    }}
                  >
                    {l.type || "Loan"}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{l.lender}</div>
                </div>
                {isPaidOff && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: THEME.sage,
                      background: `${THEME.sage}18`,
                      border: `1px solid ${THEME.sage}44`,
                      borderRadius: 4,
                      padding: "2px 6px",
                      letterSpacing: "0.08em",
                    }}
                  >
                    PAID OFF
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  marginTop: 10,
                  color: isPaidOff ? THEME.sage : THEME.rust,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtINRFull(outstanding)}
              </div>

              {/* Payoff progress bar */}
              {principal > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 9,
                      color: THEME.muted,
                      marginBottom: 5,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    <span>Repaid</span>
                    <span style={{ color: barColor, fontWeight: 700 }}>
                      {paidPct.toFixed(1)}%{months > 0 ? ` · ${months} mo left` : ""}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(paidPct, 100)}%`, background: barColor }}
                    />
                  </div>
                </div>
              )}

              {/* Stat cells */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {[
                  { k: "Principal", v: fmtINRFull(l.principal), color: THEME.muted },
                  { k: "EMI", v: `${fmtINRFull(emi)}/mo`, color: THEME.accent },
                  { k: "Rate", v: `${l.rate}%`, color: THEME.muted },
                  { k: "Months Left", v: months > 0 ? String(months) : "—", color: THEME.ink },
                  ...(payoffDate ? [{ k: "Payoff By", v: payoffDate, color: THEME.sage }] : []),
                  ...(paid > 0
                    ? [{ k: "Principal Paid", v: fmtINRFull(paid), color: THEME.sage }]
                    : []),
                  ...(interestRemaining > 0
                    ? [{ k: "Interest Left", v: fmtINRFull(interestRemaining), color: THEME.rust }]
                    : []),
                ].map(({ k, v, color }) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: `${color}09`,
                      border: `1px solid ${color}22`,
                      flex: "1 1 70px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        textTransform: "uppercase" as const,
                        color: THEME.muted,
                        fontWeight: 700,
                      }}
                    >
                      {k}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Prepayment Calculator */}
              {!isPaidOff && outstanding > 0 && (
                <div
                  style={{ marginTop: 14, borderTop: `1px solid ${THEME.line}`, paddingTop: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                      Prepayment Calculator
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
                        color: THEME.accent,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 700,
                        padding: "2px 6px",
                      }}
                    >
                      {prepayExpanded.has(l.id) ? "Hide ▲" : "Show ▼"}
                    </button>
                  </div>
                  {prepayExpanded.has(l.id) && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 14,
                        background: `${THEME.accent}09`,
                        borderRadius: 10,
                        border: `1px solid ${THEME.accent}1a`,
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
                        <span style={{ fontSize: 12, color: THEME.muted }}>If I prepay</span>
                        <input
                          type="number"
                          placeholder="₹ amount"
                          value={prepayInputs[l.id] || ""}
                          onChange={(e) =>
                            setPrepayInputs((prev) => ({ ...prev, [l.id]: e.target.value }))
                          }
                          style={{
                            width: 110,
                            padding: "5px 8px",
                            borderRadius: 6,
                            border: `1px solid ${THEME.line}`,
                            background: "var(--surface-0)",
                            fontSize: 13,
                            fontWeight: 700,
                            color: THEME.ink,
                            outline: "none",
                          }}
                        />
                        <span style={{ fontSize: 12, color: THEME.muted }}>today</span>
                      </div>
                      {prepayInputs[l.id] &&
                        Number(prepayInputs[l.id]) > 0 &&
                        (() => {
                          const prepay = Number(prepayInputs[l.id]);
                          if (prepay >= outstanding) {
                            return (
                              <div
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 8,
                                  background: `${THEME.sage}0f`,
                                  border: `1px solid ${THEME.sage}26`,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: THEME.sage,
                                }}
                              >
                                Full payoff! Save {fmtINRFull(interestRemaining)} in interest & close
                                loan today.
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
                                  label: "Months Saved",
                                  value: `${monthsSaved} mo`,
                                  color: THEME.sage,
                                },
                                {
                                  label: "Interest Saved",
                                  value: fmtINRFull(interestSaved),
                                  color: THEME.sage,
                                },
                                {
                                  label: "New Payoff",
                                  value: newPayoff.toLocaleString("en-IN", {
                                    month: "short",
                                    year: "numeric",
                                  }),
                                  color: THEME.accent,
                                },
                              ].map(({ label, value, color }) => (
                                <div
                                  key={label}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                    padding: "8px 14px",
                                    borderRadius: 8,
                                    background: `${color}09`,
                                    border: `1px solid ${color}22`,
                                    flex: "1 1 80px",
                                    textAlign: "center" as const,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 9,
                                      textTransform: "uppercase" as const,
                                      color: THEME.muted,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {label}
                                  </span>
                                  <span style={{ fontSize: 14, fontWeight: 800, color }}>
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
    </div>
  );
}

function LoanGivenList({ items, onRemove, onEdit, onAdd }: any) {
  if (!items.length) return <LoanEmptyState type="given" onAdd={onAdd} />;
  const now = new Date();
  const totalLent = items.reduce((s: number, l: any) => s + Number(l.principal || 0), 0);
  const totalOutstanding = items.reduce((s: number, l: any) => s + Number(l.outstanding || 0), 0);
  const overdueItems = items.filter(
    (l: any) => l.dueDate && new Date(l.dueDate) < now && Number(l.outstanding || 0) > 0
  );
  const fmtLoanDate = (d: string) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
      : "—";
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
            sub: `${items.length} loan${items.length !== 1 ? "s" : ""} given`,
            color: THEME.sage,
            Icon: TrendingUp,
          },
          {
            label: "Outstanding",
            value: fmtINRFull(totalOutstanding),
            sub: totalOutstanding > 0 ? "Pending recovery" : "Fully recovered",
            color: totalOutstanding > 0 ? THEME.gold : THEME.sage,
            Icon: IndianRupee,
          },
          {
            label: "Overdue",
            value: String(overdueItems.length),
            sub: overdueItems.length > 0 ? "Require follow-up" : "All on schedule",
            color: overdueItems.length > 0 ? THEME.rust : THEME.sage,
            Icon: AlertCircle,
          },
        ].map(({ label, value, sub, color, Icon }) => (
          <div
            key={label}
            className="card-lift"
            style={{
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${color}`,
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${color}1f`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </div>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
            {sub && <div style={{ fontSize: 10, color: THEME.muted }}>{sub}</div>}
          </div>
        ))}
      </div>
      <Grid>
        {items.map((l: any) => {
          const isPaidOff = Number(l.outstanding || 0) === 0;
          const isOverdue = !isPaidOff && l.dueDate && new Date(l.dueDate) < now;
          const daysOverdue = isOverdue
            ? Math.floor((now.getTime() - new Date(l.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const dueSoon =
            !isPaidOff &&
            !isOverdue &&
            l.dueDate &&
            Math.ceil((new Date(l.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 7;
          const daysUntilDue = dueSoon
            ? Math.ceil((new Date(l.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          return (
            <InvestCard
              key={l.id}
              onRemove={() => onRemove(l.id)}
              onEdit={() => onEdit(l.id)}
              cardStyle={{
                borderTop: `3px solid ${isOverdue ? THEME.rust : isPaidOff ? THEME.sage : THEME.sage}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: THEME.sage,
                  }}
                >
                  Receivable
                </div>
                {isOverdue && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#fff",
                      background: THEME.rust,
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
                      fontWeight: 700,
                      color: THEME.gold,
                      background: `${THEME.gold}20`,
                      border: `1px solid ${THEME.gold}44`,
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
                      fontWeight: 700,
                      color: THEME.sage,
                      background: `${THEME.sage}18`,
                      border: `1px solid ${THEME.sage}44`,
                      borderRadius: 4,
                      padding: "2px 6px",
                      letterSpacing: "0.08em",
                    }}
                  >
                    SETTLED
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                {l.borrower}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 22,
                  fontWeight: 800,
                  marginTop: 12,
                  color: isPaidOff ? THEME.sage : isOverdue ? THEME.rust : THEME.sage,
                }}
              >
                {fmtINRFull(l.outstanding)}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {[
                  { k: "Principal", v: fmtINRFull(l.principal), color: THEME.sage },
                  { k: "Rate", v: l.rate ? `${l.rate}%` : "—", color: THEME.muted },
                  { k: "Given On", v: fmtLoanDate(l.date), color: THEME.muted },
                  {
                    k: "Due By",
                    v: fmtLoanDate(l.dueDate),
                    color: isOverdue ? THEME.rust : THEME.muted,
                  },
                ].map(({ k, v, color }) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: `${color}09`,
                      border: `1px solid ${color}22`,
                      flex: "1 1 70px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        textTransform: "uppercase" as const,
                        color: THEME.muted,
                        fontWeight: 700,
                      }}
                    >
                      {k}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color }}>{v}</span>
                  </div>
                ))}
              </div>
              {l.note && (
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 8 }}>"{l.note}"</div>
              )}
            </InvestCard>
          );
        })}
      </Grid>
    </div>
  );
}

function CCModal({ onClose, onSave, initial = null, existingGroups = [] }: any) {
  const { ccNetworks } = useMasterData();
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
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label="Issuer">
          <input
            style={input}
            value={f.issuer}
            onChange={(e) => setF({ ...f, issuer: e.target.value })}
            placeholder="e.g. HDFC Regalia"
          />
        </Field>
        <Field label="Network">
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
        <Field label="Last 4 digits">
          <input
            style={input}
            maxLength={4}
            value={f.last4}
            onChange={(e) => setF({ ...f, last4: e.target.value })}
          />
        </Field>
        <Field label="Card Sub-Limit">
          <input
            style={input}
            type="number"
            value={f.limit}
            onChange={(e) => setF({ ...f, limit: e.target.value })}
            placeholder={f.sharedGroup ? "Individual sub-limit" : "Credit limit"}
          />
        </Field>
        <Field label="Outstanding">
          <input
            style={input}
            type="number"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
          />
        </Field>
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

      <ModalActions onSave={() => f.issuer && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function PrepaidModal({ onClose, onSave, initial = null }: any) {
  const { prepaidCardTypes } = useMasterData();
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
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
          onSave({ ...f, cardName: name, transactions: txns });
        }}
        onClose={onClose}
      />
    </Modal>
  );
}

function InformalLoanView({ direction, items, onAddPerson, onUpdate, onRemove }: any) {
  const isBorrowed = direction === "borrowed";
  const personLabel = isBorrowed ? "Lender" : "Borrower";
  const accentColor = isBorrowed ? THEME.rust : THEME.sage;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [trancheTarget, setTrancheTarget] = useState<any>(null);
  const [paymentTarget, setPaymentTarget] = useState<any>(null);
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
  const fmtD = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
      : "—";
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
            sub: "Principal amount",
            color: isBorrowed ? THEME.rust : THEME.sage,
            Icon: isBorrowed ? TrendingDown : TrendingUp,
          },
          {
            label: isBorrowed ? "Total Repaid" : "Received Back",
            value: fmtINRFull(totalPaid),
            sub: "Payment history",
            color: THEME.sage,
            Icon: CheckCircle2,
          },
          {
            label: "Outstanding",
            value: fmtINRFull(totalOutstanding),
            sub: totalOutstanding > 0 ? "Pending settlement" : "Fully settled",
            color: totalOutstanding > 0 ? accentColor : THEME.sage,
            Icon: Wallet,
          },
        ].map(({ label, value, sub, color, Icon }) => (
          <div
            key={label}
            className="card-lift"
            style={{
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${color}`,
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${color}1f`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </div>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
            {sub && <div style={{ fontSize: 10, color: THEME.muted }}>{sub}</div>}
          </div>
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
        {items.map((person: any) => {
          const tranches: any[] = person.tranches || [];
          const payments: any[] = person.payments || [];
          const totalT = tranches.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
          const totalP = payments.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
          const outstanding = totalT - totalP;
          const isExpanded = expandedId === person.id;
          const settled = outstanding <= 0;
          return (
            <div key={person.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  cursor: "pointer",
                  borderBottom: isExpanded ? `1px solid ${THEME.line}` : "none",
                }}
                onClick={() => setExpandedId(isExpanded ? null : person.id)}
              >
                <div style={{ color: THEME.muted, flexShrink: 0 }}>
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{person.person}</span>
                    {settled && (
                      <span
                        style={{
                          fontSize: 10,
                          background: THEME.sage + "22",
                          color: THEME.sage,
                          padding: "2px 7px",
                          borderRadius: 99,
                          fontWeight: 700,
                        }}
                      >
                        SETTLED
                      </span>
                    )}
                    {person.note && (
                      <span style={{ fontSize: 12, color: THEME.muted }}>· {person.note}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    {tranches.length} loan{tranches.length !== 1 ? "s" : ""} · {payments.length}{" "}
                    payment{payments.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase" }}>
                    Outstanding
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: settled ? THEME.sage : accentColor,
                    }}
                  >
                    {settled ? "₹0" : fmtINRFull(outstanding)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(person.id);
                    }}
                    style={{ ...iconBtn, color: THEME.rust }}
                    title="Delete person"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div>
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: accentColor,
                        }}
                      >
                        {isBorrowed ? "Loans Received" : "Loans Given"}
                      </div>
                      <button
                        style={{ ...btnGhost, fontSize: 11, padding: "3px 10px" }}
                        onClick={() => setTrancheTarget(person)}
                      >
                        <Plus size={11} /> Add Loan
                      </button>
                    </div>
                    {tranches.length === 0 ? (
                      <div style={{ fontSize: 12, color: THEME.muted }}>No loans recorded yet</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                            <th style={{ ...th, paddingLeft: 0, textAlign: "left" }}>Date</th>
                            <th style={{ ...th, textAlign: "right" }}>Amount</th>
                            <th style={{ ...th, textAlign: "left" }}>Note</th>
                            <th style={th}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {tranches.map((t: any) => (
                            <tr key={t.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                              <td style={{ ...td, paddingLeft: 0, color: THEME.muted }}>
                                {fmtD(t.date)}
                              </td>
                              <td
                                style={{
                                  ...td,
                                  textAlign: "right",
                                  fontWeight: 600,
                                  color: accentColor,
                                }}
                              >
                                {fmtINRFull(t.amount)}
                              </td>
                              <td style={{ ...td, color: THEME.muted }}>{t.note || "—"}</td>
                              <td style={td}>
                                <button
                                  style={iconBtn}
                                  onClick={() => {
                                    const updated = tranches.filter((x: any) => x.id !== t.id);
                                    onUpdate(person.id, { tranches: updated });
                                  }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td style={{ ...td, paddingLeft: 0, fontWeight: 700 }}>Total</td>
                            <td
                              style={{
                                ...td,
                                textAlign: "right",
                                fontWeight: 700,
                                color: accentColor,
                              }}
                            >
                              {fmtINRFull(totalT)}
                            </td>
                            <td colSpan={2} style={td}></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: THEME.sage,
                        }}
                      >
                        {isBorrowed ? "Repayments Made" : "Repayments Received"}
                      </div>
                      <button
                        style={{ ...btnGhost, fontSize: 11, padding: "3px 10px" }}
                        onClick={() => setPaymentTarget(person)}
                      >
                        <Plus size={11} /> Record Payment
                      </button>
                    </div>
                    {payments.length === 0 ? (
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        No payments recorded yet
                      </div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                            <th style={{ ...th, paddingLeft: 0, textAlign: "left" }}>Date</th>
                            <th style={{ ...th, textAlign: "right" }}>Amount</th>
                            <th style={{ ...th, textAlign: "left" }}>Note</th>
                            <th style={th}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p: any) => (
                            <tr key={p.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                              <td style={{ ...td, paddingLeft: 0, color: THEME.muted }}>
                                {fmtD(p.date)}
                              </td>
                              <td
                                style={{
                                  ...td,
                                  textAlign: "right",
                                  fontWeight: 600,
                                  color: THEME.sage,
                                }}
                              >
                                {fmtINRFull(p.amount)}
                              </td>
                              <td style={{ ...td, color: THEME.muted }}>{p.note || "—"}</td>
                              <td style={td}>
                                <button
                                  style={iconBtn}
                                  onClick={() => {
                                    const updated = payments.filter((x: any) => x.id !== p.id);
                                    onUpdate(person.id, { payments: updated });
                                  }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td style={{ ...td, paddingLeft: 0, fontWeight: 700 }}>Total Paid</td>
                            <td
                              style={{
                                ...td,
                                textAlign: "right",
                                fontWeight: 700,
                                color: THEME.sage,
                              }}
                            >
                              {fmtINRFull(totalP)}
                            </td>
                            <td colSpan={2} style={td}></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                  <div
                    style={{
                      padding: "10px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: THEME.muted }}>Balance: </span>
                    <b style={{ color: settled ? THEME.sage : accentColor, fontSize: 15 }}>
                      {settled ? "Fully Settled ✓" : `${fmtINRFull(outstanding)} pending`}
                    </b>
                    {!settled && totalT > 0 && (
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: THEME.line,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: Math.min((totalP / totalT) * 100, 100) + "%",
                            background: accentColor,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    )}
                    {!settled && totalT > 0 && (
                      <span style={{ fontSize: 11, color: THEME.muted }}>
                        {((totalP / totalT) * 100).toFixed(0)}% paid
                      </span>
                    )}
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
    </div>
  );
}

function InformalPersonForm({ personLabel, onSave, onClose }: any) {
  const [f, setF] = useState({ owner: "self", person: "", note: "", tranches: [], payments: [] });
  return (
    <>
      <Field label="Owner / Profile">
        <select
          style={input}
          value={f.owner}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
      <ModalActions onSave={() => f.person && onSave({ ...f })} onClose={onClose} saveLabel="Add" />
    </>
  );
}

function InformalAmountForm({ label, onSave, onClose }: any) {
  const [f, setF] = useState({ amount: "", date: today(), note: "" });
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
      <Field label="Note (optional)">
        <input
          style={input}
          value={f.note}
          placeholder="e.g. cash, UPI"
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </Field>
      <ModalActions
        onSave={() => Number(f.amount) > 0 && onSave(f)}
        onClose={onClose}
        saveLabel="Save"
      />
    </>
  );
}

function LoanTakenModal({ onClose, onSave, initial = null }: any) {
  const { loanTypes } = useMasterData();
  const [f, setF] = useState(
    initial || {
      lender: "",
      type: loanTypes[0] || "Personal",
      principal: "",
      outstanding: "",
      emi: "",
      rate: "",
      monthsRemaining: "",
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
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
            value={f.principal}
            onChange={(e) => setF({ ...f, principal: e.target.value })}
          />
        </Field>
        <Field label="Outstanding">
          <input
            style={input}
            type="number"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
          />
        </Field>
        <Field label="EMI">
          <input
            style={input}
            type="number"
            value={f.emi}
            onChange={(e) => setF({ ...f, emi: e.target.value })}
          />
        </Field>
        <Field label="Interest Rate (%)">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
          />
        </Field>
        <Field label="Months Remaining">
          <input
            style={input}
            type="number"
            value={f.monthsRemaining}
            onChange={(e) => setF({ ...f, monthsRemaining: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => {
        if (!f.lender || !f.principal || !f.emi) return;
        onSave({ ...f, outstanding: f.outstanding || f.principal });
      }} onClose={onClose} />
    </Modal>
  );
}

function LoanGivenModal({ onClose, onSave, initial = null }: any) {
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
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Borrower Name">
        <input
          style={input}
          value={f.borrower}
          onChange={(e) => setF({ ...f, borrower: e.target.value })}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Principal">
          <input
            style={input}
            type="number"
            value={f.principal}
            onChange={(e) => setF({ ...f, principal: e.target.value })}
          />
        </Field>
        <Field label="Outstanding">
          <input
            style={input}
            type="number"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
          />
        </Field>
        <Field label="Interest %">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
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
      <Field label="Note">
        <input
          style={input}
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </Field>
      <ModalActions onSave={() => {
        if (!f.borrower || !f.principal) return;
        onSave({ ...f, outstanding: f.outstanding || f.principal });
      }} onClose={onClose} />
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   DEBT PAYOFF OPTIMIZER (RELEASE 4)
   ══════════════════════════════════════════════════════════════════════ */
function DebtPayoffOptimizer({ state }: any) {
  const [extraMonthly, setExtraMonthly] = useState<number>(10000);
  const [windfall, setWindfall] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<"snowball" | "avalanche">("avalanche");

  const activeLoans = useMemo(() => {
    return (state.loansTaken || []).filter(
      (l: any) => Number(l.outstanding || 0) > 0 && Number(l.emi || 0) > 0
    );
  }, [state.loansTaken]);

  // 1. Payoff Simulator algorithm
  const simulateDebtPayoff = (
    loans: any[],
    extra: number,
    strategy: "standard" | "snowball" | "avalanche",
    windfallAmt: number
  ) => {
    let active = loans
      .map((l) => ({
        id: l.id,
        lender: l.lender,
        type: l.type || "Loan",
        outstanding: Number(l.outstanding) || 0,
        emi: Number(l.emi) || 0,
        rate: (() => {
          const v = l.rate ?? l.roi ?? l.interestRate;
          return v != null && v !== "" ? Number(v) : 8.5;
        })(),
        monthsRemaining: Number(l.monthsRemaining) || 0,
        principal: Number(l.principal) || Number(l.outstanding) || 0,
      }))
      .filter((l) => l.outstanding > 0);

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
    while (active.some((l) => l.outstanding > 0) && months < 600) {
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

      // Step 2: Allocate surplus roll-overs to the first active target in sorted list
      if (strategy !== "standard") {
        let surplus = totalBudget - actualBasePaid;
        const target = active.find((l) => l.outstanding > 0);
        if (target && surplus > 0) {
          rollOvers[target.id] = (rollOvers[target.id] || 0) + surplus;
          const extraPay = Math.min(target.outstanding, surplus);
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

  if (activeLoans.length === 0) {
    return (
      <Card style={{ padding: "48px 32px", textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "linear-gradient(135deg, var(--t-accent) 0%, #a78bfa 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Sparkles size={30} color="#fff" />
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
          Add your active home, car, or personal bank loans under the <b>Loans Taken</b> tab to feed
          the optimizer! Once entered, you can compare snowball and avalanche schedules.
        </div>
      </Card>
    );
  }

  const currentSim = selectedPlan === "snowball" ? snowballSim : avalancheSim;
  const standardInterest = standardSim.totalInterestPaid;
  const currentInterest = currentSim.totalInterestPaid;
  const interestSaved = Math.max(0, standardInterest - currentInterest);
  const monthsSaved = Math.max(0, standardSim.months - currentSim.months);

  // Format payoff dates
  const getPayoffDateStr = (monthsFromNow: number) => {
    if (monthsFromNow === 0) return "Paid Today";
    const date = new Date();
    date.setMonth(date.getMonth() + monthsFromNow);
    return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };

  return (
    <div className="tab-content-enter">
      {/* ── INTERACTIVE SURPLUS & WINDFALL CONSOLE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 32 }}>
        <Card style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: THEME.muted,
              marginBottom: 20,
            }}
          >
            CFO Liabilities Control Console
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label style={{ fontSize: 13, fontWeight: 700 }}>Extra Monthly Repayment (₹)</label>
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.accent }}>
                  {fmtINRFull(extraMonthly)}/mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100000"
                step="2000"
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="cxo-slider"
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: THEME.muted,
                  marginTop: 4,
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
                  placeholder="e.g. ₹1,00,000 bonus or stock sale"
                  value={windfall}
                  onChange={(e) => setWindfall(e.target.value)}
                />
              </Field>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {[25000, 50000, 100000, 250000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setWindfall(String(val))}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.line}`,
                      background: "rgba(128,128,128,0.05)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: THEME.muted,
                      cursor: "pointer",
                    }}
                  >
                    +₹{val.toLocaleString("en-IN")}
                  </button>
                ))}
                {windfall && (
                  <button
                    onClick={() => setWindfall("")}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.rust}4d`,
                      background: `${THEME.rust}09`,
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.rust,
                      cursor: "pointer",
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
          variant="hero"
          style={{
            padding: 28,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.7)",
                marginBottom: 8,
              }}
            >
              <Sparkles size={12} /> Total Interest Saved
            </div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 900,
                color: "#34D399",
                marginBottom: 4,
                letterSpacing: "-0.03em",
              }}
            >
              {fmtINRFull(interestSaved)}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
              Debt-Free:{" "}
              <span style={{ color: "#34D399", fontWeight: 800 }}>
                {getPayoffDateStr(currentSim.months)}
              </span>{" "}
              (Shaved{" "}
              <span style={{ color: "#34D399", fontWeight: 800 }}>{monthsSaved} Months</span>)
            </div>
          </div>

          <div
            style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 11 }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                  Standard Interest
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginTop: 2 }}>
                  {fmtINRFull(standardInterest)}
                </div>
              </div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                  Simulated Interest
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginTop: 2 }}>
                  {fmtINRFull(currentInterest)}
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
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[
            {
              id: "avalanche",
              label: "Debt Avalanche",
              desc: "Highest Rate First",
              detail: "Mathematical optimal",
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
                style={{
                  padding: "10px 20px",
                  borderRadius: 12,
                  border: active ? "none" : `1.5px solid ${THEME.line}`,
                  background: active ? plan.color : "var(--surface-0)",
                  color: active ? "#fff" : THEME.muted,
                  fontWeight: 800,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: active ? "var(--shadow-md)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ fontSize: 13 }}>{plan.label}</div>
                <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 500, marginTop: 2 }}>
                  {plan.detail} · {plan.desc}
                </div>
              </button>
            );
          })}
        </div>
        <Badge variant="muted" style={{ fontWeight: 800 }}>
          {activeLoans.length} Loans Aggregated
        </Badge>
      </div>

      {/* ── STEP-BY-STEP AMORTIZATION SCHEDULE ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 20,
          marginBottom: 32,
          alignItems: "start",
        }}
      >
        <Card style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: THEME.muted,
              marginBottom: 20,
            }}
          >
            Chronological Payoff Schedule ({selectedPlan.toUpperCase()})
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {activeLoans.map((l: any, idx: number) => {
              const targetPayoffMonth =
                currentSim.payoffSchedule[l.id] != null ? currentSim.payoffSchedule[l.id] : 0;
              const standardPayoffMonth =
                standardSim.payoffSchedule[l.id] || Number(l.monthsRemaining) || 0;
              const monthsSavedOnLoan = Math.max(0, standardPayoffMonth - targetPayoffMonth);

              return (
                <div
                  key={l.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "rgba(128,128,128,0.03)",
                    border: `1px solid ${THEME.line}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `${THEME.sage}1f`,
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
                      <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                        {l.lender}
                      </span>
                      <Badge variant="muted" style={{ fontSize: 9 }}>
                        {l.type || "Loan"}
                      </Badge>
                      <Badge variant="gold" style={{ fontSize: 9 }}>
                        {Number(l.rate || l.roi || l.interestRate || 8.5).toFixed(2)}% ROI
                      </Badge>
                    </div>
                    <div
                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 4 }}
                    >
                      Balance: {fmtINRFull(l.outstanding)} · EMI: {fmtINRFull(l.emi)}/mo
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                      Paid {getPayoffDateStr(targetPayoffMonth)}
                    </div>
                    {monthsSavedOnLoan > 0 && (
                      <div
                        style={{ fontSize: 10, color: THEME.sage, fontWeight: 700, marginTop: 2 }}
                      >
                        Shaved {monthsSavedOnLoan} Months!
                      </div>
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
            borderLeft: `4px solid ${selectedPlan === "avalanche" ? "var(--t-accent)" : "var(--t-gold)"}`,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: selectedPlan === "avalanche" ? `${THEME.accent}1f` : `${THEME.gold}1f`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BookOpen
                size={18}
                color={selectedPlan === "avalanche" ? THEME.accent : THEME.gold}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: 800, fontSize: 14, color: THEME.ink, marginBottom: 6 }}>
                {selectedPlan === "avalanche"
                  ? "CFO Advisory: The Avalanche Method"
                  : "CFO Advisory: The Snowball Method"}
              </h4>

              {selectedPlan === "avalanche" ? (
                <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6, margin: 0 }}>
                  The <b>Debt Avalanche</b> is mathematically optimal. It commands you to direct all
                  surplus prepayments to the loan with the <b>highest interest rate</b> first,
                  regardless of the balance size. This ensures you reduce compound interest accrual
                  at the fastest possible rate, yielding the absolute highest financial savings.
                </p>
              ) : (
                <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6, margin: 0 }}>
                  The <b>Debt Snowball</b> prioritizes psychological momentum and cashflow
                  liquidity. It commands you to pay off the <b>smallest outstanding balance</b>{" "}
                  first. Knocking out small loans quickly eliminates entire EMIs, reducing monthly
                  contractual liabilities, and providing immediate psychological wins that encourage
                  long-term debt-free discipline.
                </p>
              )}

              <div
                style={{
                  marginTop: 14,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "rgba(128,128,128,0.04)",
                  border: `1px solid ${THEME.line}`,
                  fontSize: 11,
                  color: THEME.muted,
                  lineHeight: 1.4,
                }}
              >
                💡 <b>CTO Prepayment Rule:</b> If a loan is paid off, its base EMI is immediately
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
