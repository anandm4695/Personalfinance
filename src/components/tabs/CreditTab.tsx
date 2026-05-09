// @ts-nocheck
import React, { useState } from "react";
import { Plus, Edit3, Trash2, TrendingDown, TrendingUp, ArrowLeftRight, IndianRupee, ChevronUp, ChevronDown, List, X, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINR, fmtINRFull, today, uid } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

/** Renders authentic SVG logos for each payment network */
const CardNetworkLogo = ({ network }: { network?: string }) => {
  const n = (network || "").toLowerCase();

  if (n === "visa") return (
    <svg width="58" height="20" viewBox="0 0 58 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="17" fontFamily="'Times New Roman', Times, serif" fontSize="22" fontWeight="700" fontStyle="italic" fill="#FFFFFF" letterSpacing="-1">VISA</text>
    </svg>
  );

  if (n === "mastercard") return (
    <svg width="44" height="28" viewBox="0 0 44 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="14" r="13" fill="#EB001B"/>
      <circle cx="29" cy="14" r="13" fill="#F79E1B"/>
      <path d="M22 4.8a13 13 0 0 1 0 18.4A13 13 0 0 1 22 4.8z" fill="#FF5F00"/>
    </svg>
  );

  // RuPay — Official NPCI logo (source: Wikimedia Commons CC0)
  if (n === "rupay") return (
    <svg width="72" height="20" viewBox="0 0 67.583808 17.596123" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(-0.01611121,-1.1444177)">
        {/* Green right triangle */}
        <g transform="matrix(0.35277777,0,0,-0.35277777,67.797845,1.4031532)">
          <path style={{fill:"#00B140"}} d="m 0,0 11.488,-22.811 -24.15,-22.822 z"/>
        </g>
        {/* Orange right triangle */}
        <g transform="matrix(0.35277777,0,0,-0.35277777,64.991459,1.4031532)">
          <path style={{fill:"#F47920"}} d="M 0,0 11.471,-22.811 -12.663,-45.633 Z"/>
        </g>
        {/* R letter */}
        <g transform="matrix(0.35277777,0,0,-0.35277777,0.01611121,14.573442)">
          <path style={{fill:"#FFFFFF"}} d="m 0,0 11.454,41.266 h 18.312 c 5.723,0 9.546,-0.906 11.491,-2.773 1.931,-1.852 2.303,-4.875 1.139,-9.124 -0.704,-2.503 -1.774,-4.604 -3.244,-6.264 -1.458,-1.663 -3.381,-2.978 -5.749,-3.945 2.009,-0.483 3.287,-1.442 3.86,-2.88 0.57,-1.438 0.504,-3.535 -0.188,-6.284 L 35.682,4.232 35.678,4.076 C 35.276,2.462 35.395,1.598 36.05,1.528 L 35.628,0 H 23.24 c 0.042,0.971 0.119,1.839 0.201,2.568 0.09,0.746 0.201,1.324 0.311,1.721 l 1.155,4.121 c 0.582,2.143 0.618,3.638 0.078,4.499 -0.545,0.884 -1.765,1.319 -3.691,1.319 H 16.088 L 12.118,0 Z m 18.664,23.527 h 5.576 c 1.954,0 3.396,0.279 4.285,0.856 0.893,0.582 1.556,1.565 1.945,2.987 0.403,1.446 0.304,2.454 -0.274,3.027 -0.577,0.582 -1.958,0.865 -4.129,0.865 h -5.256 z"/>
        </g>
        {/* u letter */}
        <g transform="matrix(0.35277777,0,0,-0.35277777,26.966392,3.8309332)">
          <path style={{fill:"#FFFFFF"}} d="m 0,0 -8.444,-30.451 h -10.261 l 1.261,4.461 c -1.806,-1.774 -3.654,-3.121 -5.517,-3.982 -1.848,-0.876 -3.798,-1.307 -5.851,-1.307 -1.697,0 -3.154,0.308 -4.327,0.919 -1.187,0.609 -2.071,1.535 -2.666,2.756 -0.528,1.069 -0.758,2.389 -0.668,3.966 0.095,1.552 0.643,4.17 1.659,7.836 L -30.438,0 h 11.224 l -4.367,-15.728 c -0.638,-2.302 -0.79,-3.92 -0.479,-4.801 0.324,-0.889 1.189,-1.348 2.593,-1.348 1.414,0 2.603,0.512 3.585,1.557 0.996,1.036 1.765,2.581 2.343,4.637 L -11.208,0 Z"/>
        </g>
        {/* P letter */}
        <g transform="matrix(0.35277777,0,0,-0.35277777,25.52981,14.573442)">
          <path style={{fill:"#FFFFFF"}} d="m 0,0 11.442,41.266 h 15.74 c 3.473,0 6.161,-0.205 8.078,-0.655 1.913,-0.431 3.413,-1.131 4.528,-2.118 1.397,-1.291 2.253,-2.889 2.605,-4.806 0.331,-1.917 0.135,-4.15 -0.59,-6.772 C 40.521,22.302 38.274,18.767 35.072,16.297 31.86,13.859 27.886,12.634 23.143,12.634 H 15.777 L 12.278,0 Z m 18.566,22.712 h 3.958 c 2.559,0 4.358,0.316 5.412,0.926 1.02,0.618 1.745,1.716 2.187,3.277 0.442,1.582 0.328,2.688 -0.34,3.306 -0.643,0.615 -2.286,0.926 -4.915,0.926 h -3.95 z"/>
        </g>
        {/* a letter */}
        <g transform="matrix(0.35277777,0,0,-0.35277777,44.934987,14.573442)">
          <path style={{fill:"#FFFFFF"}} d="m 0,0 0.114,2.892 c -1.81,-1.355 -3.643,-2.379 -5.486,-3.019 -1.835,-0.652 -3.789,-0.983 -5.882,-0.983 -3.179,0 -5.396,0.864 -6.678,2.536 -1.266,1.675 -1.474,4.08 -0.61,7.148 0.827,3.028 2.298,5.257 4.42,6.682 2.11,1.442 5.634,2.474 10.578,3.134 0.627,0.102 1.467,0.184 2.519,0.311 3.655,0.423 5.707,1.397 6.149,2.986 0.23,0.87 0.09,1.512 -0.45,1.906 -0.521,0.409 -1.495,0.61 -2.901,0.61 -1.167,0 -2.106,-0.242 -2.876,-0.745 -0.769,-0.508 -1.343,-1.25 -1.732,-2.294 h -10.943 c 0.988,3.428 3.007,6.018 6.038,7.75 3.02,1.762 7.002,2.61 11.934,2.61 2.319,0 4.396,-0.217 6.232,-0.688 1.839,-0.451 3.183,-1.094 4.055,-1.872 1.073,-0.971 1.708,-2.078 1.889,-3.302 0.209,-1.221 -0.02,-2.971 -0.66,-5.261 L 11.003,3.424 C 10.852,2.868 10.823,2.372 10.905,1.921 11.003,1.491 11.191,1.123 11.523,0.86 L 11.27,0 Z M 2.728,13.597 C 1.536,13.118 -0.013,12.659 -1.938,12.155 -4.961,11.344 -6.662,10.262 -7.03,8.923 -7.285,8.062 -7.182,7.399 -6.761,6.895 c 0.415,-0.479 1.136,-0.721 2.152,-0.721 1.863,0 3.359,0.471 4.474,1.401 1.118,0.942 1.954,2.421 2.539,4.461 0.102,0.434 0.192,0.746 0.25,0.979 z"/>
        </g>
        {/* y letter */}
        <g transform="matrix(0.35277777,0,0,-0.35277777,48.940953,18.806421)">
          <path style={{fill:"#FFFFFF"}} d="m 0,0 2.491,9.013 h 3.212 c 1.073,0 1.917,0.212 2.515,0.598 0.607,0.401 1.02,1.077 1.258,1.987 0.119,0.401 0.192,0.823 0.242,1.302 0.032,0.508 0.032,1.045 0,1.667 L 8.004,42.45 H 19.365 L 19.189,23.974 29.107,42.45 H 39.672 L 22.138,12.146 C 20.148,8.759 18.702,6.432 17.784,5.162 16.878,3.908 16.018,2.933 15.183,2.273 14.101,1.36 12.893,0.713 11.589,0.336 10.282,-0.049 8.292,-0.241 5.617,-0.241 c -0.77,0 -1.656,0.015 -2.614,0.065 C 2.052,-0.139 1.037,-0.082 0,0"/>
        </g>
      </g>
    </svg>
  );

  // Amex — Official American Express logo (source: Simple Icons, Apache 2.0)
  if (n === "amex" || n === "american express") return (
    <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}>
      <path fill="#FFFFFF" d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507"/>
    </svg>
  );

  // Diners Club — accurate overlapping-circles logo with brand blue
  if (n === "diners" || n === "diners club") return (
    <svg width="72" height="30" viewBox="0 0 72 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="diners-left-clip">
          <circle cx="13" cy="15" r="12"/>
        </clipPath>
        <clipPath id="diners-right-clip">
          <circle cx="23" cy="15" r="12"/>
        </clipPath>
      </defs>
      {/* Left circle — blue */}
      <circle cx="13" cy="15" r="12" fill="#004A97"/>
      {/* Right circle — white */}
      <circle cx="23" cy="15" r="12" fill="#FFFFFF"/>
      {/* Overlap: right circle clips blue fill */}
      <circle cx="13" cy="15" r="12" fill="#FFFFFF" clipPath="url(#diners-right-clip)"/>
      {/* Inner overlap redraw — blue intersection */}
      <circle cx="23" cy="15" r="12" fill="#004A97" clipPath="url(#diners-left-clip)"/>
      {/* Outer rings */}
      <circle cx="13" cy="15" r="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
      <circle cx="23" cy="15" r="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
      {/* Wordmark */}
      <text x="38" y="13" fontFamily="'Arial', sans-serif" fontSize="7.5" fontWeight="800" fill="#FFFFFF" letterSpacing="0.8">DINERS</text>
      <text x="38" y="23" fontFamily="'Arial', sans-serif" fontSize="7.5" fontWeight="800" fill="rgba(255,255,255,0.7)" letterSpacing="1.5">CLUB</text>
    </svg>
  );

  // Fallback: generic card icon
  return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="30" height="20" rx="3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <rect x="1" y="7" width="30" height="4" fill="rgba(255,255,255,0.2)"/>
    </svg>
  );
};

const OwnerBadge = ({ owner }: { owner?: string }) => {
  if (!owner) return null;
  const p = PROFILES.find(x => x.id === owner);
  if (!p) return null;
  return (
    <Badge variant="accent" style={{ fontSize: 10 }}>
      {p.name}
    </Badge>
  );
};

const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{children}</h2>
    {sub && <p style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>{sub}</p>}
  </div>
);

const Tile = ({ icon: Icon, label, value, subColor }: any) => (
  <div style={{ background: "var(--surface-0)", padding: 20, borderRadius: 12, border: `1px solid ${THEME.line}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: THEME.muted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
      <Icon size={14} /> {label}
    </div>
    <div style={{ fontSize: 20, fontWeight: 800, color: subColor }}>{value}</div>
  </div>
);

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
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
    {children}
  </div>
);

const InvestCard = ({ children, onRemove, onEdit }: any) => (
  <div style={{ ...card, position: "relative" }}>
    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
      <button onClick={onEdit} style={iconBtn}><Edit3 size={14} /></button>
      <button onClick={onRemove} style={iconBtn}><Trash2 size={14} /></button>
    </div>
    {children}
  </div>
);

const Stat = ({ k, v }: { k: string; v: any }) => (
  <div>
    <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" }}>{k}</div>
    <div style={{ fontWeight: 600 }}>{v}</div>
  </div>
);

const th = { textAlign: "left" as const, padding: "11px 10px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: THEME.muted, fontWeight: 700, borderBottom: `1px solid var(--t-line)`, whiteSpace: "nowrap" as const };
const td = { padding: "12px 10px", verticalAlign: "top" as const, fontSize: 13, borderBottom: `1px solid var(--t-line)` };

export function CreditTab({ state, addItem, removeItem, updateItem, subTab }: any) {
  const [sub, setSub] = useState(subTab || "cc");
  const [modal, setModal] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const subs = [
    { id: "cc", label: "Credit Cards", icon: IndianRupee },
    { id: "prepaid", label: "Prepaid Cards", icon: IndianRupee },
    { id: "taken", label: "Loans Taken", icon: TrendingDown },
    { id: "given", label: "Loans Given", icon: TrendingUp },
    { id: "borrowed", label: "From People", icon: TrendingDown },
    { id: "lent", label: "To People", icon: TrendingUp },
  ];

  React.useEffect(() => {
    if (subTab) setSub(subTab);
  }, [subTab]);

  const activeLabel = subs.find(s => s.id === sub)?.label || "";

  return (
    <div>
      {/* ── HEADER AREA ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Credit & Liabilities</h2>
          <div style={{ fontSize: 14, color: THEME.muted, marginTop: 4 }}>Manage cards, debts, and personal lending portfolios</div>
        </div>
        {sub !== "borrowed" && sub !== "lent" && (
          <Button variant="accent" icon={<Plus size={14} />} onClick={() => setModal(sub)}>
            Add {activeLabel.split(' ')[0]}
          </Button>
        )}
      </div>

      <div>
        {/* ── CONTENT AREA ── */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{activeLabel}</h3>
        </div>

          {sub === "cc" && (
            <>
              {(() => {
                const activeCards = state.creditCards.filter((c: any) => c.status !== "closed");
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                    <Card style={{ background: "rgba(79, 70, 229, 0.05)", border: `1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)` }}>
                      <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Limit <span style={{ fontWeight: 400 }}>(active)</span></div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>{fmtINRFull(activeCards.reduce((acc: any, c: any) => acc + (Number(c.limit) || 0), 0))}</div>
                    </Card>
                    <Card style={{ background: "rgba(239, 68, 68, 0.05)", border: `1px solid color-mix(in srgb, var(--t-rust) 20%, transparent)` }}>
                      <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Outstanding <span style={{ fontWeight: 400 }}>(active)</span></div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: THEME.rust, marginTop: 4 }}>{fmtINRFull(activeCards.reduce((acc: any, c: any) => acc + (Number(c.outstanding) || 0), 0))}</div>
                    </Card>
                    <Card style={{ background: "rgba(34, 197, 94, 0.05)", border: `1px solid color-mix(in srgb, var(--t-sage) 20%, transparent)` }}>
                      <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Available <span style={{ fontWeight: 400 }}>(active)</span></div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>{fmtINRFull(activeCards.reduce((acc: any, c: any) => acc + (Number(c.limit) || 0) - (Number(c.outstanding) || 0), 0))}</div>
                    </Card>
                  </div>
                );
              })()}
              <CCList items={state.creditCards} onRemove={(id: any) => removeItem("creditCards", id)} onEdit={setEditId} onUpdateCard={(id: any, updates: any) => updateItem("creditCards", id, updates)} />
            </>
          )}
          {sub === "prepaid" && <PrepaidList items={state.prepaidCards} onRemove={(id: any) => removeItem("prepaidCards", id)} onEdit={setEditId} onUpdateCard={(id: any, updates: any) => updateItem("prepaidCards", id, updates)} />}
          {sub === "taken" && (
            <>
              <LoanTakenList items={state.loansTaken} onRemove={(id: any) => removeItem("loansTaken", id)} onEdit={setEditId} />
              {state.loansTaken.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Payoff Progress</div>
                  <div style={{ display: "grid", gap: 16 }}>
                    {state.loansTaken.map((l: any) => {
                      const principal = Number(l.principal) || 0;
                      const outstanding = Number(l.outstanding) || 0;
                      const emi = Number(l.emi) || 0;
                      const months = Number(l.monthsRemaining) || 0;
                      const paid = principal - outstanding;
                      const paidPct = principal > 0 ? (paid / principal) * 100 : 0;
                      const totalRemaining = emi * months;
                      const interestRemaining = Math.max(0, totalRemaining - outstanding);
                      const payoffDate = new Date();
                      payoffDate.setMonth(payoffDate.getMonth() + months);
                      return (
                        <Card key={l.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                            <div><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: THEME.muted }}>{l.type || "Loan"}</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{l.lender}</div></div>
                            <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 800, color: THEME.rust }}>{fmtINRFull(outstanding)}</div><div style={{ fontSize: 11, color: THEME.muted }}>outstanding</div></div>
                          </div>
                          <div style={{ height: 10, background: THEME.line, borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ height: "100%", width: Math.min(paidPct, 100) + "%", background: paidPct > 60 ? THEME.sage : paidPct > 30 ? THEME.gold : THEME.rust, borderRadius: 5, transition: "width 0.6s" }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, fontSize: 12 }}>
                            <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Principal paid</div><div style={{ fontWeight: 700, color: THEME.sage }}>{fmtINR(paid)}</div></div>
                            <div><div style={{ color: THEME.muted, marginBottom: 2 }}>EMI</div><div style={{ fontWeight: 700 }}>{fmtINR(emi)}/mo</div></div>
                            <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Interest remaining</div><div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINR(interestRemaining)}</div></div>
                            <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Payoff date</div><div style={{ fontWeight: 700 }}>{months > 0 ? payoffDate.toLocaleString("en-IN", { month: "short", year: "numeric" }) : "—"}</div></div>
                          </div>
                          <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted }}>{paidPct.toFixed(1)}% of principal repaid · {months} months left</div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          {sub === "given" && <LoanGivenList items={state.loansGiven} onRemove={(id: any) => removeItem("loansGiven", id)} onEdit={setEditId} />}
          {sub === "borrowed" && <InformalLoanView direction="borrowed" items={state.informalBorrowed || []} onAddPerson={(v: any) => addItem("informalBorrowed", v)} onUpdate={(id: any, patch: any) => updateItem("informalBorrowed", id, patch)} onRemove={(id: any) => removeItem("informalBorrowed", id)} />}
          {sub === "lent" && <InformalLoanView direction="lent" items={state.informalLent || []} onAddPerson={(v: any) => addItem("informalLent", v)} onUpdate={(id: any, patch: any) => updateItem("informalLent", id, patch)} onRemove={(id: any) => removeItem("informalLent", id)} />}
      </div>

      {modal === "cc" && <CCModal onClose={() => setModal(null)} onSave={(v: any) => { addItem("creditCards", v); setModal(null); }} />}
      {modal === "prepaid" && <PrepaidModal onClose={() => setModal(null)} onSave={(v: any) => { addItem("prepaidCards", v); setModal(null); }} />}
      {modal === "taken" && <LoanTakenModal onClose={() => setModal(null)} onSave={(v: any) => { addItem("loansTaken", v); setModal(null); }} />}
      {modal === "given" && <LoanGivenModal onClose={() => setModal(null)} onSave={(v: any) => { addItem("loansGiven", v); setModal(null); }} />}

      {editId && sub === "cc" && <CCModal initial={state.creditCards.find((x: any) => x.id === editId)} onClose={() => setEditId(null)} onSave={(v: any) => { updateItem("creditCards", editId, v); setEditId(null); }} />}
      {editId && sub === "prepaid" && <PrepaidModal initial={state.prepaidCards.find((x: any) => x.id === editId)} onClose={() => setEditId(null)} onSave={(v: any) => { updateItem("prepaidCards", editId, v); setEditId(null); }} />}
      {editId && sub === "taken" && <LoanTakenModal initial={state.loansTaken.find((x: any) => x.id === editId)} onClose={() => setEditId(null)} onSave={(v: any) => { updateItem("loansTaken", editId, v); setEditId(null); }} />}
      {editId && sub === "given" && <LoanGivenModal initial={state.loansGiven.find((x: any) => x.id === editId)} onClose={() => setEditId(null)} onSave={(v: any) => { updateItem("loansGiven", editId, v); setEditId(null); }} />}
    </div>
  );
}

function CCList({ items, onRemove, onEdit, onUpdateCard }: any) {
  const [selectedLedger, setSelectedLedger] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "closed">("active");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState(today());

  const activeCards = items.filter((c: any) => c.status !== "closed");
  const closedCards = items.filter((c: any) => c.status === "closed");
  const displayCards = viewMode === "active" ? activeCards : closedCards;
  const selectedCard = items.find((c: any) => c.id === selectedLedger);

  if (!items.length) return <EmptyHint text="No credit cards yet" />;

  return (
    <div>
      {/* Active / Closed toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        {(["active", "closed"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: "6px 18px",
              borderRadius: 20,
              border: viewMode === mode ? "none" : `1.5px solid ${THEME.line}`,
              background: viewMode === mode
                ? (mode === "active" ? THEME.accent : "#555")
                : "transparent",
              color: viewMode === mode ? "#fff" : THEME.muted,
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {mode === "active" ? `Active (${activeCards.length})` : `Closed (${closedCards.length})`}
          </button>
        ))}
      </div>

      {displayCards.length === 0 && (
        <EmptyHint text={viewMode === "active" ? "No active credit cards" : "No closed credit cards yet"} />
      )}

      <Grid>
        {displayCards.map((c: any) => {
          const isClosed = c.status === "closed";
          const util = Number(c.limit) ? (Number(c.outstanding) / Number(c.limit)) * 100 : 0;
          return (
            <div
              key={c.id}
              style={{
                ...cardDark,
                position: "relative",
                background: isClosed
                  ? `linear-gradient(135deg, #3a3a42 0%, #2a2a32 100%)`
                  : `linear-gradient(135deg, ${THEME.ink} 0%, #1A2A42 100%)`,
                paddingBottom: isClosed ? 20 : 60,
                opacity: isClosed ? 0.8 : 1,
                filter: isClosed ? "grayscale(35%)" : "none",
              }}
            >
              {/* Action buttons */}
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6, alignItems: "center" }}>
                {!isClosed && closingId !== c.id && (
                  <button
                    onClick={() => { setClosingId(c.id); setCloseDate(today()); }}
                    title="Mark card as closed"
                    style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", color: "#ff8080", padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}
                  >
                    CLOSE CARD
                  </button>
                )}
                {isClosed && (
                  <button
                    onClick={() => onUpdateCard(c.id, { status: "active", closedDate: "" })}
                    title="Reactivate card"
                    style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer", color: "#6ee7b7", padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}
                  >
                    REACTIVATE
                  </button>
                )}
                <button onClick={() => onEdit(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(245,239,227,0.6)" }}><Edit3 size={14} /></button>
                <button onClick={() => onRemove(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(245,239,227,0.6)" }}><Trash2 size={14} /></button>
              </div>
              {closingId === c.id && (
                <div style={{ position: "absolute", top: 40, right: 12, background: "rgba(15,15,25,0.97)", border: "1px solid rgba(239,68,68,0.45)", borderRadius: 8, padding: "8px 10px", display: "flex", gap: 6, alignItems: "center", zIndex: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                  <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, color: "#fff", fontSize: 11, padding: "4px 7px", outline: "none" }} />
                  <button onClick={() => { onUpdateCard(c.id, { status: "closed", closedDate: closeDate }); setClosingId(null); }}
                    style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.5)", color: "#ff8080", borderRadius: 5, fontSize: 10, fontWeight: 700, padding: "4px 10px", cursor: "pointer" }}>
                    Confirm
                  </button>
                  <button onClick={() => setClosingId(null)}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", lineHeight: 1 }}>
                    ✕
                  </button>
                </div>
              )}

              {/* Network logo + owner + status badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <CardNetworkLogo network={c.network} />
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {isClosed && (
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", background: "rgba(239,68,68,0.2)", color: "#ff8080", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(239,68,68,0.35)" }}>
                      CLOSED
                    </span>
                  )}
                  <OwnerBadge owner={c.owner} />
                </div>
              </div>

              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{c.issuer}</div>
              <div style={{ fontSize: 16, letterSpacing: "0.05em", marginTop: 12, opacity: 0.8 }}>•••• •••• •••• {c.last4 || "****"}</div>
              {isClosed && c.closedDate && (
                <div style={{ fontSize: 10, color: "rgba(255,128,128,0.7)", marginTop: 5 }}>
                  Closed on {new Date(c.closedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20, fontSize: 12 }}>
                <div><div style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}>Outstanding</div><div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.outstanding)}</div></div>
                <div><div style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}>Limit</div><div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.limit)}</div></div>
              </div>
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 11, color: "rgba(245,239,227,0.7)" }}>
                <div>Bill Date: <strong>{c.billDate || "—"}th</strong></div>
                <div>Due Day: <strong>{c.dueDay || "—"}th</strong></div>
                <div>Fee: <strong>{fmtINR(c.annualFee)}</strong></div>
                <div>Helpline: <strong>{c.helpline || "—"}</strong></div>
              </div>
              {c.waiverInfo && <div style={{ marginTop: 12, fontSize: 10, background: "rgba(255,255,255,0.05)", padding: "6px 10px", borderRadius: 6, color: THEME.gold }}>Waiver: {c.waiverInfo}</div>}

              {/* Utilization bar — active cards only */}
              {!isClosed && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ height: 4, background: "rgba(245,239,227,0.15)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${Math.min(util, 100)}%`, background: util > 70 ? THEME.rust : THEME.gold, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: util > 70 ? THEME.rust : "rgba(245,239,227,0.6)", marginTop: 6 }}>{util.toFixed(1)}% utilization</div>
                </div>
              )}

              {/* Transactions button */}
              {!isClosed && (
                <button onClick={() => setSelectedLedger(c.id)} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 44, background: "rgba(255,255,255,0.05)", border: "none", borderTop: `1px solid rgba(255,255,255,0.1)`, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <List size={14} /> View Transactions ({c.transactions?.length || 0})
                </button>
              )}
              {isClosed && (c.transactions?.length || 0) > 0 && (
                <button onClick={() => setSelectedLedger(c.id)} style={{ marginTop: 14, width: "100%", padding: "8px 0", background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, color: "rgba(255,255,255,0.45)", cursor: "pointer", fontWeight: 600, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <List size={12} /> View History ({c.transactions.length} txns)
                </button>
              )}
            </div>
          );
        })}
      </Grid>
      {selectedLedger && selectedCard && (
        <CCTransactionLedger
          card={selectedCard}
          onClose={() => setSelectedLedger(null)}
          onUpdate={(newTransactions: any) => {
            const newOutstanding = newTransactions.reduce((acc: any, t: any) => acc + Number(t.amount), 0);
            onUpdateCard(selectedLedger, { transactions: newTransactions, outstanding: String(newOutstanding) });
          }}
        />
      )}
    </div>
  );
}

function CCTransactionLedger({ card, onClose, onUpdate }: any) {
  const [txs, setTxs] = useState(card.transactions || []);
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ date: today(), merchant: "", amount: "", category: "General" });
  const [editId, setEditId] = useState<string | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [importDone, setImportDone] = useState(false);

  const totalOutstanding = txs.reduce((acc: any, t: any) => acc + Number(t.amount), 0);
  const totalCharges = txs.filter((t: any) => Number(t.amount) > 0).reduce((s: any, t: any) => s + Number(t.amount), 0);
  const cats = ["General", "Food", "Groceries", "Shopping", "Transport", "Entertainment", "Medical", "Utilities", "Travel", "Payment", "Other"];

  const saveTx = () => {
    if (!newTx.merchant || !newTx.amount) return;
    const updated = editId
      ? txs.map((t: any) => t.id === editId ? { ...newTx, id: editId } : t)
      : [...txs, { ...newTx, id: uid() }];
    setTxs(updated); onUpdate(updated); setShowAdd(false); setEditId(null);
    setNewTx({ date: today(), merchant: "", amount: "", category: "General" });
  };

  const removeTx = (id: any) => { const updated = txs.filter((t: any) => t.id !== id); setTxs(updated); onUpdate(updated); };

  const startEdit = (t: any) => {
    setNewTx({ date: t.date, merchant: t.merchant, amount: t.amount, category: t.category || "General" });
    setEditId(t.id); setShowAdd(true); setShowCsvImport(false);
  };

  const parseCsvText = (text: string) => {
    setCsvError(""); setCsvPreview([]); setImportDone(false);
    try {
      const lines = text.trim().split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) { setCsvError("No data rows found. See format below."); return; }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) throw new Error(`Row ${i + 1}: need at least date, merchant, amount`);
        const [date, merchant, amount, category] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD (got "${date}")`);
        const amt = Number(amount);
        if (isNaN(amt)) throw new Error(`Row ${i + 1}: amount must be a number`);
        return { date, merchant: merchant || "Unknown", amount: amt, category: category || "General", id: `cctx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` };
      });
      setCsvPreview(rows);
    } catch (e: any) { setCsvError(e.message); }
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setCsvText(text); parseCsvText(text); };
    reader.readAsText(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0]; if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setCsvText(text); parseCsvText(text); };
    reader.readAsText(file);
  };

  const importCsv = () => {
    if (!csvPreview.length) return;
    const updated = [...txs, ...csvPreview];
    setTxs(updated); onUpdate(updated); setImportDone(true);
    setCsvPreview([]); setCsvText(""); setCsvFileName("");
    setTimeout(() => { setShowCsvImport(false); setImportDone(false); }, 1400);
  };

  const downloadTemplate = () => {
    const content = "# Credit Card Transaction Import Template\n# Columns: date, merchant, amount, category\n# date = YYYY-MM-DD | positive amount = charge, negative = payment/credit\n# Lines starting with # are ignored\n2025-01-05,Amazon,2499,Shopping\n2025-01-08,Swiggy,450,Food\n2025-01-10,BookMyShow,800,Entertainment\n2025-01-12,Uber,320,Transport\n2025-01-15,Bill Payment,-5000,Payment";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "cc_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal title={`${card.issuer} — Transactions`} onClose={onClose} maxWidth={920}>
      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Charges", value: fmtINR(totalCharges), color: THEME.rust, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
          { label: "Net Outstanding", value: fmtINR(totalOutstanding), color: totalOutstanding > 0 ? THEME.rust : THEME.sage, bg: `rgba(${totalOutstanding > 0 ? "239,68,68" : "34,197,94"},0.08)`, border: `rgba(${totalOutstanding > 0 ? "239,68,68" : "34,197,94"},0.2)` },
        ].map(s => (
          <div key={s.label} style={{ padding: 14, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, textAlign: "center" as const }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Transaction Ledger <span style={{ fontSize: 11, fontWeight: 400, color: THEME.muted, marginLeft: 6 }}>{txs.length} entries</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, justifyContent: "flex-end" }}>
          <button style={{ ...btnGhost, fontSize: 12, padding: "6px 14px", color: "#818cf8", borderColor: "rgba(129,140,248,0.4)" }}
            onClick={() => { setShowCsvImport(v => !v); setShowAdd(false); }}>
            <Upload size={13} /> Import CSV
          </button>
          <button style={{ ...btnGhost, fontSize: 12, padding: "6px 14px" }}
            onClick={() => { if (showAdd) { setShowAdd(false); setEditId(null); setNewTx({ date: today(), merchant: "", amount: "", category: "General" }); } else { setShowAdd(true); setShowCsvImport(false); } }}>
            {showAdd ? "Cancel" : <><Plus size={14} /> Add Transaction</>}
          </button>
        </div>
      </div>

      {/* CSV Import Panel */}
      {showCsvImport && (
        <div style={{ padding: 18, borderRadius: 12, marginBottom: 16, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.22)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", display: "flex", alignItems: "center", gap: 8 }}><FileText size={15} /> Bulk Import via CSV</div>
            <button onClick={downloadTemplate} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.3)", background: "transparent", color: "#818cf8", cursor: "pointer", fontWeight: 600 }}>Download Template</button>
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 12, padding: "8px 12px", background: "rgba(128,128,128,0.06)", borderRadius: 8, lineHeight: 1.6 }}>
            <b style={{ color: THEME.ink }}>Format:</b> <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>date, merchant, amount, category</code><br />
            Charge: <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>2025-01-05, Amazon, 2499, Shopping</code>
            &nbsp;&nbsp;Payment: <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>2025-01-15, Bill Payment, -5000, Payment</code>
          </div>
          <label
            style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 0", border: "1.5px dashed rgba(99,102,241,0.4)", borderRadius: 10, cursor: "pointer", marginBottom: 12, background: "rgba(99,102,241,0.03)" }}
            onDragOver={e => e.preventDefault()} onDrop={handleDrop}
          >
            <Upload size={22} color="#818cf8" />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#818cf8" }}>{csvFileName || "Drop CSV file here or click to browse"}</div>
            <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
            <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFileUpload} />
          </label>
          <div style={{ fontSize: 11, fontWeight: 600, color: THEME.muted, marginBottom: 6, textAlign: "center" as const }}>— or paste CSV text below —</div>
          <textarea
            style={{ width: "100%", minHeight: 90, padding: "10px 12px", background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`, borderRadius: 10, color: THEME.ink, fontSize: 12, fontFamily: "monospace", resize: "vertical" as const, boxSizing: "border-box" as const }}
            value={csvText}
            onChange={e => { setCsvText(e.target.value); setCsvPreview([]); setCsvError(""); setImportDone(false); }}
            placeholder={"2025-01-05, Amazon, 2499, Shopping\n2025-01-08, Swiggy, 450, Food\n2025-01-15, Bill Payment, -5000, Payment"}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.4)", background: "transparent", color: "#818cf8", fontWeight: 700, fontSize: 12, cursor: "pointer" }} onClick={() => parseCsvText(csvText)}>Preview Data</button>
            {csvPreview.length > 0 && !importDone && (
              <button style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#818cf8", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }} onClick={importCsv}>
                Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
              </button>
            )}
            {importDone && <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.sage, fontSize: 12, fontWeight: 700 }}><CheckCircle2 size={15} /> Imported successfully!</div>}
          </div>
          {csvError && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "flex-start", color: THEME.rust, fontSize: 12, padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8 }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
            </div>
          )}
          {csvPreview.length > 0 && (
            <div style={{ marginTop: 12, border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", background: "rgba(99,102,241,0.07)", fontSize: 11, fontWeight: 700, color: "#818cf8" }}>{csvPreview.length} rows ready to import — preview:</div>
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "rgba(128,128,128,0.04)", color: THEME.muted }}>
                      <th style={{ padding: "7px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10 }}>Date</th>
                      <th style={{ padding: "7px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10 }}>Merchant</th>
                      <th style={{ padding: "7px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10 }}>Category</th>
                      <th style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 600, fontSize: 10 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((r, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "7px 10px", color: THEME.muted }}>{r.date}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 600 }}>{r.merchant}</td>
                        <td style={{ padding: "7px 10px", color: THEME.muted }}>{r.category || "—"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 700, color: Number(r.amount) >= 0 ? THEME.rust : THEME.sage }}>
                          {Number(r.amount) >= 0 ? "+" : ""}{fmtINR(r.amount)}
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
        <div style={{ background: THEME.darkInk, border: `1px solid ${THEME.line}`, borderRadius: 10, marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: THEME.accent }}>{editId ? "EDIT TRANSACTION" : "NEW TRANSACTION"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Date"><input type="date" style={input} value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} /></Field>
            <Field label="Amount (negative = payment)"><input type="number" style={input} value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} placeholder="e.g. 2499 or -5000" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Merchant"><input type="text" style={input} value={newTx.merchant} onChange={e => setNewTx({...newTx, merchant: e.target.value})} placeholder="e.g. Amazon" /></Field>
            <Field label="Category">
              <select style={input} value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})}>
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <button style={{ ...btnAccent, width: "100%" }} onClick={saveTx}>{editId ? "Update Transaction" : "Save Transaction"}</button>
        </div>
      )}

      {/* Transaction Table */}
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `1px solid ${THEME.line}`, color: THEME.muted }}>
              <th style={{ padding: "10px 8px" }}>Date</th>
              <th style={{ padding: "10px 8px" }}>Merchant</th>
              <th style={{ padding: "10px 8px" }}>Category</th>
              <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
              <th style={{ padding: "10px 8px", width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "28px 8px", textAlign: "center", color: THEME.muted, fontSize: 13 }}>No transactions yet — add manually or import CSV above</td></tr>
            ) : (
              [...txs].sort((a: any, b: any) => b.date.localeCompare(a.date)).map((t: any) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                  <td style={{ padding: "12px 8px" }}>{t.date}</td>
                  <td style={{ padding: "12px 8px", fontWeight: 600 }}>{t.merchant}</td>
                  <td style={{ padding: "12px 8px" }}><span style={{ background: THEME.paper, padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{t.category || "General"}</span></td>
                  <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: Number(t.amount) >= 0 ? THEME.rust : THEME.sage }}>{fmtINR(t.amount)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => startEdit(t)} style={{ background: "transparent", border: "none", color: THEME.muted, cursor: "pointer" }}><Edit3 size={14} /></button>
                      <button onClick={() => removeTx(t.id)} style={{ background: "transparent", border: "none", color: THEME.rust, cursor: "pointer" }}><X size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, color: THEME.muted }}>Net Outstanding</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: totalOutstanding > 0 ? THEME.rust : THEME.sage }}>{fmtINRFull(totalOutstanding)}</div>
      </div>
    </Modal>
  );
}

function PrepaidList({ items, onRemove, onEdit, onUpdateCard }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "closed">("active");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState(today());
  const selected = items.find((c: any) => c.id === selectedId);

  const computeStats = (txns: any[]) => {
    const loaded = (txns || []).filter((t: any) => t.type === "load").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const spent = (txns || []).filter((t: any) => t.type === "spend").reduce((s: number, t: any) => s + Number(t.amount), 0);
    return { loaded, spent, balance: loaded - spent };
  };

  const activeCards = items.filter((p: any) => p.status !== "closed");
  const closedCards = items.filter((p: any) => p.status === "closed");
  const displayCards = viewMode === "active" ? activeCards : closedCards;

  if (!items.length) return <EmptyHint text="No prepaid cards or wallets yet. Add Sodexo, Zeta, ICICI Prepaid and more." />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        {(["active", "closed"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: "6px 18px",
              borderRadius: 20,
              border: viewMode === mode ? "none" : `1.5px solid ${THEME.line}`,
              background: viewMode === mode ? (mode === "active" ? THEME.accent : "#555") : "transparent",
              color: viewMode === mode ? "#fff" : THEME.muted,
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {mode === "active" ? `Active (${activeCards.length})` : `Closed (${closedCards.length})`}
          </button>
        ))}
      </div>

      {displayCards.length === 0 && (
        <EmptyHint text={viewMode === "active" ? "No active prepaid cards" : "No closed prepaid cards yet"} />
      )}

      <Grid>
        {displayCards.map((p: any) => {
          const isClosed = p.status === "closed";
          const { loaded, spent, balance } = computeStats(p.transactions);
          const txnCount = (p.transactions || []).length;
          const name = p.cardName || p.name || p.provider || "Prepaid Card";
          return (
            <div key={p.id} style={{
              background: isClosed
                ? "linear-gradient(135deg, #2a2a1a 0%, #1a1a0d 100%)"
                : "linear-gradient(135deg, #1a3a2a 0%, #0d1f17 100%)",
              color: "#fff", borderRadius: 12, padding: 20,
              paddingBottom: isClosed ? 20 : 56,
              position: "relative",
              opacity: isClosed ? 0.8 : 1,
              filter: isClosed ? "grayscale(35%)" : "none",
            }}>
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6, alignItems: "center" }}>
                {!isClosed && closingId !== p.id && (
                  <button
                    onClick={() => { setClosingId(p.id); setCloseDate(today()); }}
                    title="Mark card as closed"
                    style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", color: "#ff8080", padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}
                  >
                    CLOSE CARD
                  </button>
                )}
                {isClosed && (
                  <button
                    onClick={() => onUpdateCard(p.id, { status: "active", closedDate: "" })}
                    title="Reactivate card"
                    style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer", color: "#6ee7b7", padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}
                  >
                    REACTIVATE
                  </button>
                )}
                <button onClick={() => onEdit(p.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}><Edit3 size={14} /></button>
                <button onClick={() => onRemove(p.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}><Trash2 size={14} /></button>
              </div>
              {closingId === p.id && (
                <div style={{ position: "absolute", top: 40, right: 12, background: "rgba(15,15,25,0.97)", border: "1px solid rgba(239,68,68,0.45)", borderRadius: 8, padding: "8px 10px", display: "flex", gap: 6, alignItems: "center", zIndex: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                  <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, color: "#fff", fontSize: 11, padding: "4px 7px", outline: "none" }} />
                  <button onClick={() => { onUpdateCard(p.id, { status: "closed", closedDate: closeDate }); setClosingId(null); }}
                    style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.5)", color: "#ff8080", borderRadius: 5, fontSize: 10, fontWeight: 700, padding: "4px 10px", cursor: "pointer" }}>
                    Confirm
                  </button>
                  <button onClick={() => setClosingId(null)}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", lineHeight: 1 }}>
                    ✕
                  </button>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", background: "rgba(34,197,94,0.2)", color: "#6ee7b7", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(34,197,94,0.3)" }}>
                    {p.cardType || "Prepaid"}
                  </span>
                  {isClosed && (
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", background: "rgba(239,68,68,0.2)", color: "#ff8080", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(239,68,68,0.35)" }}>
                      CLOSED
                    </span>
                  )}
                </div>
                <OwnerBadge owner={p.owner} />
              </div>

              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>{name}</div>
              {p.last4 && <div style={{ fontSize: 13, letterSpacing: "0.1em", marginTop: 4, opacity: 0.5 }}>•••• •••• •••• {p.last4}</div>}
              {isClosed && p.closedDate && (
                <div style={{ fontSize: 10, color: "rgba(255,128,128,0.7)", marginTop: 5 }}>
                  Closed on {new Date(p.closedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Available Balance</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: balance >= 0 ? "#6ee7b7" : "#ff8080", marginTop: 2 }}>{fmtINRFull(balance)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14, fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                <div>Loaded: <b style={{ color: "#6ee7b7" }}>{fmtINR(loaded)}</b></div>
                <div>Spent: <b style={{ color: "#ff8080" }}>{fmtINR(spent)}</b></div>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{txnCount} transaction{txnCount !== 1 ? "s" : ""}</div>

              {!isClosed && (
                <button
                  onClick={() => setSelectedId(p.id)}
                  style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 44, background: "rgba(255,255,255,0.06)", border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <List size={14} /> Transactions & Load Money
                </button>
              )}
              {isClosed && txnCount > 0 && (
                <button onClick={() => setSelectedId(p.id)} style={{ marginTop: 14, width: "100%", padding: "8px 0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.45)", cursor: "pointer", fontWeight: 600, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
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

  const totalLoaded = txs.filter(t => t.type === "load").reduce((s, t) => s + Number(t.amount), 0);
  const totalSpent = txs.filter(t => t.type === "spend").reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalLoaded - totalSpent;
  const cats = ["Food", "Groceries", "Transport", "Shopping", "Entertainment", "Medical", "Utilities", "Other"];

  const openAdd = (type: "load" | "spend") => {
    setTxType(type);
    setForm({ date: today(), amount: "", note: "", category: "Food" });
    setEditId(null);
    setShowAdd(true);
    setShowCsvImport(false);
  };

  const save = () => {
    if (!form.amount) return;
    const entry = { ...form, type: txType, amount: Number(form.amount), id: editId || `ptx-${Date.now()}` };
    const updated = editId ? txs.map(t => t.id === editId ? entry : t) : [...txs, entry];
    setTxs(updated);
    onUpdate(updated);
    setShowAdd(false);
    setEditId(null);
    setForm({ date: today(), amount: "", note: "", category: "Food" });
  };

  const editTx = (t: any) => {
    setTxType(t.type);
    setForm({ date: t.date, amount: String(t.amount), note: t.note || "", category: t.category || "Food" });
    setEditId(t.id);
    setShowAdd(true);
    setShowCsvImport(false);
  };

  const removeTx = (id: string) => {
    const updated = txs.filter(t => t.id !== id);
    setTxs(updated);
    onUpdate(updated);
  };

  const parseCsvText = (text: string) => {
    setCsvError("");
    setCsvPreview([]);
    setImportDone(false);
    try {
      const lines = text.trim().split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) { setCsvError("No data rows found. See format below."); return; }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) throw new Error(`Row ${i + 1}: need at least date, type, amount`);
        const [date, type, amount, note, category] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD (got "${date}")`);
        if (isNaN(new Date(date).getTime())) throw new Error(`Row ${i + 1}: invalid date "${date}"`);
        const t = type.toLowerCase().trim();
        if (!["load", "spend"].includes(t)) throw new Error(`Row ${i + 1}: type must be "load" or "spend" (got "${type}")`);
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) throw new Error(`Row ${i + 1}: amount must be a positive number`);
        return { date, type: t, amount: amt, note: note || "", category: category || (t === "spend" ? "Other" : ""), id: `ptx-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}` };
      });
      setCsvPreview(rows);
    } catch (e: any) { setCsvError(e.message); }
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
    setTimeout(() => { setShowCsvImport(false); setImportDone(false); }, 1400);
  };

  const downloadTemplate = () => {
    const content = "# Prepaid Card CSV Import Template\n# Columns: date, type, amount, note, category\n# type = load OR spend | date = YYYY-MM-DD | Lines starting with # are ignored\n2025-01-05,load,5000,Monthly top-up,\n2025-01-06,spend,250,Canteen lunch,Food\n2025-01-10,spend,120,Metro recharge,Transport\n2025-01-15,load,3000,Office benefit credit,\n2025-01-18,spend,480,Grocery run,Groceries";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "prepaid_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const cardName = prepaid.cardName || prepaid.name || prepaid.provider || "Prepaid Card";

  return (
    <Modal title={`${cardName} — Transactions`} onClose={onClose} maxWidth={920}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Loaded", value: fmtINR(totalLoaded), color: THEME.sage, bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)" },
          { label: "Total Spent", value: fmtINR(totalSpent), color: THEME.rust, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
          { label: "Balance", value: fmtINR(balance), color: balance >= 0 ? THEME.sage : THEME.rust, bg: `rgba(${balance >= 0 ? "34,197,94" : "239,68,68"},0.08)`, border: `rgba(${balance >= 0 ? "34,197,94" : "239,68,68"},0.2)` },
        ].map(s => (
          <div key={s.label} style={{ padding: 14, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, textAlign: "center" as const }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Transaction History <span style={{ fontSize: 11, fontWeight: 400, color: THEME.muted, marginLeft: 6 }}>{txs.length} entries</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, justifyContent: "flex-end" }}>
          <button style={{ ...btnGhost, fontSize: 12, padding: "6px 14px", color: "#818cf8", borderColor: "rgba(129,140,248,0.4)" }} onClick={() => { setShowCsvImport(v => !v); setShowAdd(false); }}>
            <Upload size={13} /> Import CSV
          </button>
          <button style={{ ...btnGhost, fontSize: 12, padding: "6px 14px", color: THEME.sage, borderColor: `${THEME.sage}55` }} onClick={() => openAdd("load")}>
            <TrendingUp size={13} /> Load Money
          </button>
          <button style={{ ...btnGhost, fontSize: 12, padding: "6px 14px", color: THEME.rust, borderColor: `${THEME.rust}55` }} onClick={() => openAdd("spend")}>
            <TrendingDown size={13} /> Record Spend
          </button>
        </div>
      </div>

      {showCsvImport && (
        <div style={{ padding: 18, borderRadius: 12, marginBottom: 16, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.22)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", display: "flex", alignItems: "center", gap: 8 }}><FileText size={15} /> Bulk Import via CSV</div>
            <button onClick={downloadTemplate} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.3)", background: "transparent", color: "#818cf8", cursor: "pointer", fontWeight: 600 }}>Download Template</button>
          </div>

          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 12, padding: "8px 12px", background: "rgba(128,128,128,0.06)", borderRadius: 8, lineHeight: 1.6 }}>
            <b style={{ color: THEME.ink }}>Format:</b> <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>date, type, amount, note, category</code>
            <br />Example: <code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>2025-01-05, load, 5000, Monthly top-up,</code>
            &nbsp;&nbsp;<code style={{ background: "rgba(128,128,128,0.12)", padding: "1px 5px", borderRadius: 4 }}>2025-01-06, spend, 250, Canteen, Food</code>
          </div>

          <label
            style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 0", border: "1.5px dashed rgba(99,102,241,0.4)", borderRadius: 10, cursor: "pointer", marginBottom: 12, background: "rgba(99,102,241,0.03)", transition: "background 0.15s" }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload size={22} color="#818cf8" />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#818cf8" }}>{csvFileName ? csvFileName : "Drop CSV file here or click to browse"}</div>
            <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
            <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFileUpload} />
          </label>

          <div style={{ fontSize: 11, fontWeight: 600, color: THEME.muted, marginBottom: 6, textAlign: "center" as const }}>— or paste CSV text below —</div>
          <textarea
            style={{ width: "100%", minHeight: 90, padding: "10px 12px", background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`, borderRadius: 10, color: THEME.ink, fontSize: 12, fontFamily: "monospace", resize: "vertical" as const, boxSizing: "border-box" as const }}
            value={csvText}
            onChange={e => { setCsvText(e.target.value); setCsvPreview([]); setCsvError(""); setImportDone(false); }}
            placeholder={"2025-01-05, load, 5000, Monthly top-up,\n2025-01-06, spend, 250, Canteen lunch, Food\n2025-01-10, spend, 120, Metro, Transport"}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.4)", background: "transparent", color: "#818cf8", fontWeight: 700, fontSize: 12, cursor: "pointer" }} onClick={() => parseCsvText(csvText)}>Preview Data</button>
            {csvPreview.length > 0 && !importDone && (
              <button style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#818cf8", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }} onClick={importCsv}>
                Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
              </button>
            )}
            {importDone && <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.sage, fontSize: 12, fontWeight: 700 }}><CheckCircle2 size={15} /> Imported successfully!</div>}
          </div>

          {csvError && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "flex-start", color: THEME.rust, fontSize: 12, padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8 }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
            </div>
          )}

          {csvPreview.length > 0 && (
            <div style={{ marginTop: 12, border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", background: "rgba(99,102,241,0.07)", fontSize: 11, fontWeight: 700, color: "#818cf8" }}>{csvPreview.length} rows ready to import — preview:</div>
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "rgba(128,128,128,0.04)", color: THEME.muted }}>
                      <th style={{ padding: "7px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10 }}>Date</th>
                      <th style={{ padding: "7px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10 }}>Type</th>
                      <th style={{ padding: "7px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10 }}>Note</th>
                      <th style={{ padding: "7px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 10 }}>Category</th>
                      <th style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 600, fontSize: 10 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((r, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "7px 10px", color: THEME.muted }}>{r.date}</td>
                        <td style={{ padding: "7px 10px" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: r.type === "load" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: r.type === "load" ? THEME.sage : THEME.rust }}>{r.type.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "7px 10px", color: THEME.muted }}>{r.note || "—"}</td>
                        <td style={{ padding: "7px 10px", color: THEME.muted }}>{r.category || "—"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 700, color: r.type === "load" ? THEME.sage : THEME.rust }}>{r.type === "load" ? "+" : "−"}{fmtINR(r.amount)}</td>
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
        <div style={{ padding: 16, borderRadius: 10, marginBottom: 16, background: txType === "load" ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)", border: `1px solid ${txType === "load" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: txType === "load" ? THEME.sage : THEME.rust, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
            {editId ? "Edit Transaction" : txType === "load" ? "Load Money" : "Record Spend"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Date"><input type="date" style={input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></Field>
            <Field label="Amount (₹)"><input type="number" style={input} min="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: txType === "spend" ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 12 }}>
            <Field label={txType === "load" ? "Note (optional)" : "Merchant / Note"}>
              <input style={input} value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder={txType === "load" ? "e.g. Monthly credit" : "e.g. Lunch at canteen"} />
            </Field>
            {txType === "spend" && (
              <Field label="Category">
                <select style={input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {cats.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: txType === "load" ? THEME.sage : THEME.rust, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }} onClick={save}>
              {editId ? "Update" : txType === "load" ? "Load Money" : "Record Spend"}
            </button>
            <button style={{ ...btnGhost, padding: "10px 16px" }} onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ maxHeight: 480, overflowY: "auto" }}>
        {txs.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}>No transactions yet — load money, record a spend, or import a CSV above</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${THEME.line}`, color: THEME.muted }}>
                <th style={{ padding: "10px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 11 }}>Date</th>
                <th style={{ padding: "10px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 11 }}>Type</th>
                <th style={{ padding: "10px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 11 }}>Note / Merchant</th>
                <th style={{ padding: "10px 10px", textAlign: "left" as const, fontWeight: 600, fontSize: 11 }}>Category</th>
                <th style={{ padding: "10px 10px", textAlign: "right" as const, fontWeight: 600, fontSize: 11 }}>Amount</th>
                <th style={{ width: 64 }}></th>
              </tr>
            </thead>
            <tbody>
              {[...txs].sort((a: any, b: any) => b.date.localeCompare(a.date)).map((t: any) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                  <td style={{ padding: "11px 10px", color: THEME.muted, fontSize: 12 }}>{t.date}</td>
                  <td style={{ padding: "11px 10px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: t.type === "load" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: t.type === "load" ? THEME.sage : THEME.rust }}>
                      {t.type === "load" ? "LOAD" : "SPEND"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 10px" }}>{t.note || "—"}</td>
                  <td style={{ padding: "11px 10px", color: THEME.muted, fontSize: 12 }}>{t.type === "spend" ? (t.category || "—") : "—"}</td>
                  <td style={{ padding: "11px 10px", textAlign: "right" as const, fontWeight: 700, color: t.type === "load" ? THEME.sage : THEME.rust }}>
                    {t.type === "load" ? "+" : "−"}{fmtINR(t.amount)}
                  </td>
                  <td style={{ padding: "11px 10px" }}>
                    <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                      <button onClick={() => editTx(t)} style={{ background: "transparent", border: "none", color: THEME.muted, cursor: "pointer", padding: 4 }}><Edit3 size={13} /></button>
                      <button onClick={() => removeTx(t.id)} style={{ background: "transparent", border: "none", color: THEME.rust, cursor: "pointer", padding: 4 }}><X size={13} /></button>
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

function LoanTakenList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No loans taken" />;
  return (
    <Grid>
      {items.map((l: any) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)} onEdit={() => onEdit(l.id)}>
          <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.accent }}>{l.type || "Loan"}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginTop: 4 }}>{l.lender}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, marginTop: 12, color: THEME.accent }}>{fmtINRFull(l.outstanding)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, fontSize: 12 }}>
            <Stat k="Principal" v={fmtINR(l.principal)} />
            <Stat k="EMI" v={fmtINR(l.emi)} />
            <Stat k="Rate" v={`${l.rate}%`} />
            <Stat k="Tenure Left" v={`${l.monthsRemaining || "—"} mo`} />
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function LoanGivenList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No loans given" />;
  return (
    <Grid>
      {items.map((l: any) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)} onEdit={() => onEdit(l.id)}>
          <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.sage }}>Receivable</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginTop: 4 }}>{l.borrower}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, marginTop: 12, color: THEME.sage }}>{fmtINRFull(l.outstanding)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, fontSize: 12 }}>
            <Stat k="Principal" v={fmtINR(l.principal)} />
            <Stat k="Rate" v={l.rate ? `${l.rate}%` : "—"} />
            <Stat k="Given on" v={l.date || "—"} />
            <Stat k="Due" v={l.dueDate || "—"} />
          </div>
          {l.note && <div style={{ fontSize: 12, color: THEME.muted, marginTop: 8 }}>"{l.note}"</div>}
        </InvestCard>
      ))}
    </Grid>
  );
}

function CCModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { issuer: "", network: "Visa", last4: "", limit: "", outstanding: "0", billDate: "", dueDay: "", annualFee: "0", waiverInfo: "", helpline: "", transactions: [], owner: "self", status: "active", closedDate: "" });
  const isClosed = f.status === "closed";
  return (
    <Modal title={initial ? "Edit Credit Card" : "Add Credit Card"} onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}><Field label="Issuer"><input style={input} value={f.issuer} onChange={(e) => setF({ ...f, issuer: e.target.value })} placeholder="e.g. HDFC Regalia" /></Field><Field label="Network"><select style={input} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })}><option>Visa</option><option>Mastercard</option><option>Amex</option><option>RuPay</option><option>Diners</option></select></Field></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}><Field label="Last 4 digits"><input style={input} maxLength={4} value={f.last4} onChange={(e) => setF({ ...f, last4: e.target.value })} /></Field><Field label="Credit Limit"><input style={input} type="number" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} /></Field><Field label="Outstanding"><input style={input} type="number" value={f.outstanding} onChange={(e) => setF({ ...f, outstanding: e.target.value })} /></Field></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Statement Date (Day of Month)"><input style={input} type="number" min="1" max="31" placeholder="e.g. 20" value={f.billDate} onChange={(e) => setF({ ...f, billDate: e.target.value })} /></Field><Field label="Due Day (Day of Month)"><input style={input} type="number" min="1" max="31" placeholder="e.g. 10" value={f.dueDay} onChange={(e) => setF({ ...f, dueDay: e.target.value })} /></Field></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Annual Fee"><input style={input} type="number" value={f.annualFee} onChange={(e) => setF({ ...f, annualFee: e.target.value })} /></Field><Field label="Helpline Number"><input style={input} value={f.helpline} onChange={(e) => setF({ ...f, helpline: e.target.value })} placeholder="1800-xxx-xxxx" /></Field></div>
      <Field label="Waiver Details"><textarea style={{ ...input, height: 60, resize: "none" }} value={f.waiverInfo} onChange={(e) => setF({ ...f, waiverInfo: e.target.value })} placeholder="e.g. Spend 1L in a year to waive off annual fee" /></Field>

      {/* Card Status */}
      <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 16, marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Card Status</div>
        <div style={{ display: "flex", gap: 10 }}>
          {["active", "closed"].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setF({ ...f, status: s, closedDate: s === "active" ? "" : (f.closedDate || today()) })}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: f.status === s
                  ? `2px solid ${s === "active" ? THEME.sage : THEME.rust}`
                  : `1.5px solid ${THEME.line}`,
                background: f.status === s
                  ? (s === "active" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)")
                  : "transparent",
                color: f.status === s
                  ? (s === "active" ? THEME.sage : THEME.rust)
                  : THEME.muted,
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
              <input style={input} type="date" value={f.closedDate || ""} onChange={(e) => setF({ ...f, closedDate: e.target.value })} />
            </Field>
          </div>
        )}
      </div>

      <ModalActions onSave={() => f.issuer && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function PrepaidModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { owner: "self", cardName: "", cardType: "Meal Card", last4: "", transactions: [] });
  const [openingBal, setOpeningBal] = useState("");

  return (
    <Modal title={initial ? "Edit Prepaid Card" : "Add Prepaid Card / Wallet"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Card Name">
        <input style={input} value={f.cardName || f.name || ""} onChange={e => setF({...f, cardName: e.target.value})} placeholder="e.g. Sodexo Meal Card, Zeta, ICICI Prepaid" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Card Type">
          <select style={input} value={f.cardType || "Prepaid Card"} onChange={e => setF({...f, cardType: e.target.value})}>
            <option>Meal Card</option>
            <option>Digital Wallet</option>
            <option>Travel Card</option>
            <option>Prepaid Card</option>
            <option>Gift Card</option>
            <option>Fuel Card</option>
          </select>
        </Field>
        <Field label="Last 4 Digits (optional)">
          <input style={input} maxLength={4} value={f.last4 || ""} onChange={e => setF({...f, last4: e.target.value})} placeholder="1234" />
        </Field>
      </div>
      {!initial && (
        <Field label="Current Balance on Card (optional)">
          <input style={input} type="number" value={openingBal} onChange={e => setOpeningBal(e.target.value)} placeholder="Balance already loaded on this card" />
        </Field>
      )}
      <ModalActions
        onSave={() => {
          const name = f.cardName || f.name;
          if (!name) return;
          const initTxns: any[] = f.transactions || [];
          const txns = (!initial && openingBal && Number(openingBal) > 0)
            ? [...initTxns, { id: `ptx-${Date.now()}`, date: today(), type: "load", amount: Number(openingBal), note: "Opening balance" }]
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
  const totalBorrowed = items.reduce((s: number, p: any) => s + (p.tranches || []).reduce((a: number, t: any) => a + Number(t.amount || 0), 0), 0);
  const totalPaid = items.reduce((s: number, p: any) => s + (p.payments || []).reduce((a: number, t: any) => a + Number(t.amount || 0), 0), 0);
  const totalOutstanding = totalBorrowed - totalPaid;
  const fmtD = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Tile icon={isBorrowed ? TrendingDown : TrendingUp} label={isBorrowed ? "Total Borrowed" : "Total Lent"} value={fmtINRFull(totalBorrowed)} />
        <Tile icon={ArrowLeftRight} label={isBorrowed ? "Total Repaid" : "Received Back"} value={fmtINRFull(totalPaid)} subColor={THEME.sage} />
        <Tile icon={IndianRupee} label="Outstanding" value={fmtINRFull(totalOutstanding)} subColor={totalOutstanding > 0 ? accentColor : THEME.sage} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><button style={btnSolid} onClick={() => setAddPersonOpen(true)}><Plus size={14} /> Add {personLabel}</button></div>
      {items.length === 0 && <EmptyHint text={`No ${isBorrowed ? "informal borrowings" : "personal loans given"} yet`} />}
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
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer", borderBottom: isExpanded ? `1px solid ${THEME.line}` : "none" }} onClick={() => setExpandedId(isExpanded ? null : person.id)}>
                <div style={{ color: THEME.muted, flexShrink: 0 }}>{isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</div>
                <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, fontSize: 16 }}>{person.person}</span>{settled && <span style={{ fontSize: 10, background: THEME.sage + "22", color: THEME.sage, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>SETTLED</span>}{person.note && <span style={{ fontSize: 12, color: THEME.muted }}>· {person.note}</span>}</div><div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{tranches.length} loan{tranches.length !== 1 ? "s" : ""} · {payments.length} payment{payments.length !== 1 ? "s" : ""}</div></div>
                <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase" }}>Outstanding</div><div style={{ fontSize: 20, fontWeight: 800, color: settled ? THEME.sage : accentColor }}>{settled ? "₹0" : fmtINRFull(outstanding)}</div></div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}><button onClick={(e) => { e.stopPropagation(); onRemove(person.id); }} style={{ ...iconBtn, color: THEME.rust }} title="Delete person"><Trash2 size={13} /></button></div>
              </div>
              {isExpanded && (
                <div>
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: accentColor }}>{isBorrowed ? "Loans Received" : "Loans Given"}</div><button style={{ ...btnGhost, fontSize: 11, padding: "3px 10px" }} onClick={() => setTrancheTarget(person)}><Plus size={11} /> Add Loan</button></div>
                    {tranches.length === 0 ? <div style={{ fontSize: 12, color: THEME.muted }}>No loans recorded yet</div> : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr style={{ borderBottom: `1px solid ${THEME.line}` }}><th style={{ ...th, paddingLeft: 0, textAlign: "left" }}>Date</th><th style={{ ...th, textAlign: "right" }}>Amount</th><th style={{ ...th, textAlign: "left" }}>Note</th><th style={th}></th></tr></thead>
                        <tbody>{tranches.map((t: any) => (<tr key={t.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}><td style={{ ...td, paddingLeft: 0, color: THEME.muted }}>{fmtD(t.date)}</td><td style={{ ...td, textAlign: "right", fontWeight: 600, color: accentColor }}>{fmtINR(t.amount)}</td><td style={{ ...td, color: THEME.muted }}>{t.note || "—"}</td><td style={td}><button style={iconBtn} onClick={() => { const updated = tranches.filter((x: any) => x.id !== t.id); onUpdate(person.id, { tranches: updated }); }}><Trash2 size={11} /></button></td></tr>))}</tbody>
                        <tfoot><tr><td style={{ ...td, paddingLeft: 0, fontWeight: 700 }}>Total</td><td style={{ ...td, textAlign: "right", fontWeight: 700, color: accentColor }}>{fmtINR(totalT)}</td><td colSpan={2} style={td}></td></tr></tfoot>
                      </table>
                    )}
                  </div>
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: THEME.sage }}>{isBorrowed ? "Repayments Made" : "Repayments Received"}</div><button style={{ ...btnGhost, fontSize: 11, padding: "3px 10px" }} onClick={() => setPaymentTarget(person)}><Plus size={11} /> Record Payment</button></div>
                    {payments.length === 0 ? <div style={{ fontSize: 12, color: THEME.muted }}>No payments recorded yet</div> : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr style={{ borderBottom: `1px solid ${THEME.line}` }}><th style={{ ...th, paddingLeft: 0, textAlign: "left" }}>Date</th><th style={{ ...th, textAlign: "right" }}>Amount</th><th style={{ ...th, textAlign: "left" }}>Note</th><th style={th}></th></tr></thead>
                        <tbody>{payments.map((p: any) => (<tr key={p.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}><td style={{ ...td, paddingLeft: 0, color: THEME.muted }}>{fmtD(p.date)}</td><td style={{ ...td, textAlign: "right", fontWeight: 600, color: THEME.sage }}>{fmtINR(p.amount)}</td><td style={{ ...td, color: THEME.muted }}>{p.note || "—"}</td><td style={td}><button style={iconBtn} onClick={() => { const updated = payments.filter((x: any) => x.id !== p.id); onUpdate(person.id, { payments: updated }); }}><Trash2 size={11} /></button></td></tr>))}</tbody>
                        <tfoot><tr><td style={{ ...td, paddingLeft: 0, fontWeight: 700 }}>Total Paid</td><td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.sage }}>{fmtINR(totalP)}</td><td colSpan={2} style={td}></td></tr></tfoot>
                      </table>
                    )}
                  </div>
                  <div style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}><span style={{ color: THEME.muted }}>Balance: </span><b style={{ color: settled ? THEME.sage : accentColor, fontSize: 15 }}>{settled ? "Fully Settled ✓" : `${fmtINRFull(outstanding)} pending`}</b>{!settled && totalT > 0 && <div style={{ flex: 1, height: 6, background: THEME.line, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: Math.min((totalP / totalT) * 100, 100) + "%", background: accentColor, borderRadius: 3 }} /></div>}{!settled && totalT > 0 && <span style={{ fontSize: 11, color: THEME.muted }}>{((totalP / totalT) * 100).toFixed(0)}% paid</span>}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {addPersonOpen && <Modal title={`Add ${personLabel}`} onClose={() => setAddPersonOpen(false)}><InformalPersonForm personLabel={personLabel} onSave={(v: any) => { onAddPerson(v); setAddPersonOpen(false); }} onClose={() => setAddPersonOpen(false)} /></Modal>}
      {trancheTarget && <Modal title={`Add Loan — ${trancheTarget.person}`} onClose={() => setTrancheTarget(null)}><InformalAmountForm label={isBorrowed ? "Amount Borrowed" : "Amount Lent"} onSave={(entry: any) => { const updated = [...(trancheTarget.tranches || []), { id: `tr-${Date.now()}`, ...entry }]; onUpdate(trancheTarget.id, { tranches: updated }); setTrancheTarget(null); }} onClose={() => setTrancheTarget(null)} /></Modal>}
      {paymentTarget && <Modal title={`Record Payment — ${paymentTarget.person}`} onClose={() => setPaymentTarget(null)}><InformalAmountForm label={isBorrowed ? "Amount Repaid" : "Amount Received"} onSave={(entry: any) => { const updated = [...(paymentTarget.payments || []), { id: `pm-${Date.now()}`, ...entry }]; onUpdate(paymentTarget.id, { payments: updated }); setPaymentTarget(null); }} onClose={() => setPaymentTarget(null)} /></Modal>}
    </div>
  );
}

function InformalPersonForm({ personLabel, onSave, onClose }: any) {
  const [f, setF] = useState({ owner: "self", person: "", note: "", tranches: [], payments: [] });
  return (
    <>
      <Field label="Owner / Profile"><select style={input} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>{PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label={`${personLabel} Name`}><input style={input} value={f.person} placeholder="e.g. Raj, Mom" onChange={(e) => setF({ ...f, person: e.target.value })} /></Field>
      <Field label="Note (optional)"><input style={input} value={f.note} placeholder="e.g. for house repairs" onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <ModalActions onSave={() => f.person && onSave({ id: `il-${Date.now()}`, ...f })} onClose={onClose} saveLabel="Add" />
    </>
  );
}

function InformalAmountForm({ label, onSave, onClose }: any) {
  const [f, setF] = useState({ amount: "", date: today(), note: "" });
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label={label + " (₹)"}><input style={input} type="number" min="1" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field><Field label="Date"><input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field></div>
      <Field label="Note (optional)"><input style={input} value={f.note} placeholder="e.g. cash, UPI" onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <ModalActions onSave={() => Number(f.amount) > 0 && onSave(f)} onClose={onClose} saveLabel="Save" />
    </>
  );
}

function LoanTakenModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { lender: "", type: "Personal", principal: "", outstanding: "", emi: "", rate: "", monthsRemaining: "", owner: "self" });
  return (
    <Modal title={initial ? "Edit Loan Taken" : "Add Loan Taken"} onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Lender"><input style={input} value={f.lender} onChange={(e) => setF({ ...f, lender: e.target.value })} /></Field>
      <Field label="Type"><select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option>Personal</option><option>Home</option><option>Car</option><option>Education</option><option>Gold</option><option>Business</option><option>Other</option></select></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Original Principal"><input style={input} type="number" value={f.principal} onChange={(e) => setF({ ...f, principal: e.target.value })} /></Field><Field label="Outstanding"><input style={input} type="number" value={f.outstanding} onChange={(e) => setF({ ...f, outstanding: e.target.value })} /></Field><Field label="EMI"><input style={input} type="number" value={f.emi} onChange={(e) => setF({ ...f, emi: e.target.value })} /></Field><Field label="Interest Rate (%)"><input style={input} type="number" step="0.01" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field><Field label="Months Remaining"><input style={input} type="number" value={f.monthsRemaining} onChange={(e) => setF({ ...f, monthsRemaining: e.target.value })} /></Field></div>
      <ModalActions onSave={() => f.lender && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function LoanGivenModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { borrower: "", principal: "", outstanding: "", rate: "", date: today(), dueDate: "", note: "", owner: "self" });
  return (
    <Modal title={initial ? "Edit Loan Given" : "Record Loan Given"} onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Borrower Name"><input style={input} value={f.borrower} onChange={(e) => setF({ ...f, borrower: e.target.value })} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Principal"><input style={input} type="number" value={f.principal} onChange={(e) => setF({ ...f, principal: e.target.value })} /></Field><Field label="Outstanding"><input style={input} type="number" value={f.outstanding} onChange={(e) => setF({ ...f, outstanding: e.target.value })} /></Field><Field label="Interest %"><input style={input} type="number" step="0.01" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field><Field label="Given On"><input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field><Field label="Due By"><input style={input} type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field></div>
      <Field label="Note"><input style={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <ModalActions onSave={() => f.borrower && f.principal && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
