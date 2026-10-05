import React, { useState, useMemo, useRef } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertCircle,
  Search,
  Download,
  X,
  ShieldCheck,
  Activity,
  Sparkles,
  Calculator,
  History,
  ExternalLink,
  CheckCircle2,
  Info,
  Layers,
  Edit3,
  RefreshCw,
  FileText,
  Clock,
  PieChart,
  Check,
  Upload,
  Zap,
  Target,
  FileCheck,
  Printer,
  Copy,
  Sliders,
  ChevronRight,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption, FamilyProfile } from "../../utils/masterData";
import { uid, today, exportArrayToCSV, fmtINR } from "../../utils/finance";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { ModalSection } from "../ui/ModalSection";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { extractPdfText, PdfPasswordRequiredError } from "../../utils/pdfText";
import { parseCreditReportText, parsedReportToEntry, ParsedCreditReport } from "../../utils/creditReportParser";

export const BUREAUS = ["CIBIL", "Experian", "CRIF", "Equifax"] as const;
export type BureauType = (typeof BUREAUS)[number];

export interface CreditScoreEntry {
  id: string;
  score: number;
  bureau: BureauType;
  checkDate: string;
  owner: string;
  source: string;
  notes?: string;
}

export interface CreditCardItem {
  id: string;
  bank?: string;
  name?: string;
  owner?: string;
  limit?: number | string;
  cardLimit?: number | string;
  outstanding?: number | string;
  sharedGroup?: string;
  sharedGroupLimit?: number | string;
  status?: string;
  issueDate?: string;
  openedDate?: string;
}

export interface LoanItem {
  id: string;
  name?: string;
  type?: string;
  bank?: string;
  principal?: number | string;
  outstanding?: number | string;
  emi?: number | string;
  owner?: string;
  status?: string;
  overdueAmount?: number | string;
  startDate?: string;
  disbursedDate?: string;
  date?: string;
}

export const SOURCES = [
  "manual",
  "OneScore",
  "CRED",
  "Paisabazaar",
  "BankApp",
  "CIBIL Direct",
  "Experian Direct",
  "CRIF Direct",
  "Equifax Direct",
  "Other",
];

export const SCORE_BANDS: { min: number; max: number; range: string; label: string; color: string; desc: string }[] = [
  { min: 750, max: 900, range: "750–900", label: "Excellent", color: THEME.sage, desc: "Prime loan approvals & lowest interest rates" },
  { min: 700, max: 749, range: "700–749", label: "Good", color: THEME.cyan, desc: "High approval odds with competitive pricing" },
  { min: 650, max: 699, range: "650–699", label: "Fair", color: THEME.gold, desc: "Eligible for credit but may face higher interest" },
  { min: 600, max: 649, range: "600–649", label: "Poor", color: THEME.rust, desc: "High rejection rate, loan terms may be restrictive" },
  { min: 300, max: 599, range: "300–599", label: "Very Poor", color: `color-mix(in srgb, ${THEME.rust} 75%, black)`, desc: "Immediate credit repair & debt discipline needed" },
];

export function scoreGrade(score: number): { label: string; color: string; bg: string; desc: string } {
  const band = SCORE_BANDS.find((b) => score >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1];
  return {
    label: band.label,
    color: band.color,
    bg: `color-mix(in srgb, ${band.color} 12%, transparent)`,
    desc: band.desc,
  };
}

export const BUREAU_COLORS: Record<BureauType, string> = {
  CIBIL: THEME.accent,
  Experian: THEME.violet,
  CRIF: THEME.sage,
  Equifax: THEME.gold,
};

export const BUREAU_INFO: Record<BureauType, { fullName: string; refreshRate: string; portal: string; disputeUrl: string; tollFree: string }> = {
  CIBIL: {
    fullName: "TransUnion CIBIL",
    refreshRate: "Monthly (30 days)",
    portal: "https://www.cibil.com/free-cibil-score",
    disputeUrl: "https://www.cibil.com/dispute-resolution",
    tollFree: "1800 224 245",
  },
  Experian: {
    fullName: "Experian Credit Information Services",
    refreshRate: "Monthly (30 days)",
    portal: "https://www.experian.in/consumer-services/free-credit-score",
    disputeUrl: "https://www.experian.in/consumer-services/dispute-resolution",
    tollFree: "022 6641 9000",
  },
  CRIF: {
    fullName: "CRIF High Mark",
    refreshRate: "Monthly (30-45 days)",
    portal: "https://www.crifhighmark.com/get-free-credit-report",
    disputeUrl: "https://www.crifhighmark.com/consumer-services/dispute-resolution",
    tollFree: "020 6715 7700",
  },
  Equifax: {
    fullName: "Equifax Credit Information Services",
    refreshRate: "Annual Free (RBI Mandated)",
    portal: "https://www.equifax.co.in/personal",
    disputeUrl: "https://www.equifax.co.in/dispute-resolution",
    tollFree: "1800 209 3247",
  },
};

const OWNER_COLOR_PALETTE = [THEME.accent, THEME.pink, THEME.violet, THEME.cyan, THEME.gold, THEME.sage];

function initialsFor(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getOwnerAvatarInfo(ownerId: string, familyProfiles: FamilyProfile[]) {
  const idx = (familyProfiles || []).findIndex((p) => p.id === ownerId);
  const profile = idx >= 0 ? familyProfiles[idx] : null;
  const color = OWNER_COLOR_PALETTE[(idx >= 0 ? idx : 0) % OWNER_COLOR_PALETTE.length];
  return {
    initials: profile ? initialsFor(profile.name) : "??",
    name: profile ? profile.name : ownerId || "Self",
    relation: profile ? profile.relation : "",
    color: profile ? color : THEME.muted,
    bg: `color-mix(in srgb, ${profile ? color : THEME.muted} 12%, transparent)`,
  };
}

function OwnerAvatar({ ownerId, size = 24 }: { ownerId: string; size?: number }) {
  const { familyProfiles } = useMasterData();
  const info = getOwnerAvatarInfo(ownerId, familyProfiles);
  return (
    <div
      title={`${info.name} ${info.relation ? `(${info.relation})` : ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: info.bg,
        border: `1.5px solid ${info.color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: info.color,
        fontSize: Math.max(10, Math.floor(size * 0.42)),
        fontWeight: 700,
        cursor: "default",
        flexShrink: 0,
      }}
    >
      {info.initials}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MODAL: ADD / EDIT CREDIT SCORE
// -----------------------------------------------------------------------------
const EMPTY_ENTRY = {
  score: "",
  bureau: "CIBIL" as BureauType,
  checkDate: today(),
  owner: "self",
  source: "manual",
  notes: "",
};

interface ScoreFormModalProps {
  initial?: Partial<CreditScoreEntry>;
  onSave: (data: CreditScoreEntry) => void;
  onClose: () => void;
  saving?: boolean;
}

function ScoreFormModal({ initial, onSave, onClose, saving = false }: ScoreFormModalProps) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({ ...EMPTY_ENTRY, ...initial });
  const [error, setError] = useState("");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const currentNumeric = Number(form.score);
  const grade = !Number.isNaN(currentNumeric) && currentNumeric >= 300 && currentNumeric <= 900
    ? scoreGrade(currentNumeric)
    : null;

  const handleSave = () => {
    const score = Number(form.score);
    if (!form.score || Number.isNaN(score) || score < 300 || score > 900) {
      setError("Please enter a valid credit score between 300 and 900.");
      return;
    }
    if (!form.checkDate) {
      setError("Check date is required.");
      return;
    }
    setError("");
    onSave({
      id: initial?.id || uid(),
      score,
      bureau: form.bureau as BureauType,
      checkDate: form.checkDate,
      owner: form.owner,
      source: form.source,
      notes: form.notes,
    });
  };

  return (
    <Modal
      title={initial?.id ? "Edit Credit Score Entry" : "Log Credit Score"}
      onClose={onClose}
      maxWidth={560}
    >
      <ModalSection title="Bureau & Score Value" first />
      
      {/* Bureau Selector Pills */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Credit Bureau *
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {BUREAUS.map((b) => {
            const isSel = form.bureau === b;
            const bCol = BUREAU_COLORS[b];
            return (
              <button
                key={b}
                type="button"
                onClick={() => set("bureau", b)}
                style={{
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: `1.5px solid ${isSel ? bCol : "var(--t-line)"}`,
                  background: isSel ? `color-mix(in srgb, ${bCol} 12%, var(--surface-0))` : "var(--surface-0)",
                  color: isSel ? bCol : THEME.ink,
                  fontWeight: isSel ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  transition: "all 0.2s",
                }}
              >
                <span>{b}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Score Input & Grade Badge */}
      <div className="doc-vault-form-grid" style={{ gap: "0 16px" }}>
        <Field label="Score (300 – 900) *">
          <div style={{ position: "relative" }}>
            <input
              className="form-input"
              type="number"
              min={300}
              max={900}
              value={form.score}
              onChange={(e) => {
                set("score", e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. 780"
              autoFocus
              style={{ paddingRight: grade ? 110 : 12, fontSize: 16, fontWeight: 600 }}
            />
            {grade && (
              <div
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: grade.bg,
                  color: grade.color,
                  fontSize: 11,
                  fontWeight: 700,
                  pointerEvents: "none",
                }}
              >
                {grade.label}
              </div>
            )}
          </div>
        </Field>

        <Field label="Check Date *">
          <input
            className="form-input"
            type="date"
            value={form.checkDate}
            onChange={(e) => {
              set("checkDate", e.target.value);
              if (error) setError("");
            }}
          />
        </Field>

        <Field label="Family Member / Profile">
          <select
            className="form-input"
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
          >
            {familyProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Source">
          <select
            className="form-input"
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <ModalSection title="Notes & Reference" />
      <Field label="Notes & Observations">
        <input
          className="form-input"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="e.g. Inquiries checked via OneScore, all card dues cleared"
        />
      </Field>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: THEME.rust,
            marginTop: 12,
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <ModalActions onSave={handleSave} onClose={onClose} saveLabel={initial?.id ? "Update Score" : "Save Score"} disabled={saving} loading={saving} />
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// SMART IMPORT & ZERO-MANUAL-ENTRY CONNECT HUB MODAL
// -----------------------------------------------------------------------------
interface SmartCreditImportModalProps {
  onImport: (entry: CreditScoreEntry) => Promise<void> | void;
  onClose: () => void;
  saving?: boolean;
}

function SmartCreditImportModal({ onImport, onClose, saving = false }: SmartCreditImportModalProps) {
  const { familyProfiles } = useMasterData();
  const [tab, setTab] = useState<"pdf" | "paste" | "connectors" | "csv">("pdf");
  const [selectedOwner, setSelectedOwner] = useState("self");
  
  // PDF state
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedCreditReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text Paste state
  const [pastedText, setPastedText] = useState("");
  const [pasteParsed, setPasteParsed] = useState<ParsedCreditReport | null>(null);

  // CSV Paste state
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState("");

  const handlePdfFileSelect = async (file: File, pwd?: string) => {
    setIsExtracting(true);
    setExtractError("");
    setPdfFile(file);
    try {
      const text = await extractPdfText(file, pwd);
      setIsExtracting(false);
      setNeedsPassword(false);
      if (!text.trim()) {
        setExtractError("The PDF has no readable digital text. Please make sure it is an official digital statement.");
        return;
      }
      const parsed = parseCreditReportText(text, selectedOwner);
      if (!parsed) {
        setExtractError("Could not automatically locate your credit score in this PDF. You can switch to the Paste Text tab to copy & paste your report text.");
        return;
      }
      setParsedPreview(parsed);
    } catch (e: any) {
      setIsExtracting(false);
      if (e instanceof PdfPasswordRequiredError) {
        setNeedsPassword(true);
        if (pwd) setExtractError("Incorrect PDF password. CIBIL/Experian PDFs typically use your PAN (uppercase) or DOB (DDMMYYYY).");
      } else {
        setExtractError(e?.message || "Failed to read PDF file.");
      }
    }
  };

  const handlePasteChange = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setPasteParsed(null);
      return;
    }
    const parsed = parseCreditReportText(text, selectedOwner);
    setPasteParsed(parsed);
  };

  const handleConfirmImport = async (report: ParsedCreditReport) => {
    const entry = parsedReportToEntry({
      ...report,
      owner: selectedOwner,
    });
    await onImport(entry);
    onClose();
  };

  const handleCsvImport = async () => {
    setCsvError("");
    if (!csvText.trim()) {
      setCsvError("Please paste CSV data.");
      return;
    }
    try {
      const lines = csvText.trim().split("\n");
      const entries: CreditScoreEntry[] = [];
      for (const line of lines) {
        if (line.toLowerCase().includes("bureau") || line.toLowerCase().includes("score")) continue;
        const [bureau, score, date, source, notes] = line.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
        const numScore = parseInt(score, 10);
        if (bureau && !isNaN(numScore) && numScore >= 300 && numScore <= 900) {
          entries.push({
            id: uid(),
            bureau: (bureau.toUpperCase() === "CIBIL" ? "CIBIL" : bureau.toUpperCase() === "EXPERIAN" ? "Experian" : bureau.toUpperCase() === "CRIF" ? "CRIF" : "Equifax") as BureauType,
            score: numScore,
            checkDate: date || today(),
            owner: selectedOwner,
            source: source || "CSV Import",
            notes: notes || "Bulk CSV Import",
          });
        }
      }
      if (entries.length === 0) {
        setCsvError("No valid credit score rows found. Format: Bureau, Score, Date (YYYY-MM-DD), Source, Notes");
        return;
      }
      for (const ent of entries) {
        await onImport(ent);
      }
      onClose();
    } catch (e: any) {
      setCsvError(e?.message || "Failed to parse CSV data.");
    }
  };

  return (
    <Modal title="Smart Bureau Import & Zero-Entry Connect Hub" onClose={onClose} maxWidth={640}>
      {/* Subtab Header */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--t-line)", paddingBottom: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setTab("pdf")}
          className={`subnav-pill-btn ${tab === "pdf" ? "active" : ""}`}
        >
          <Upload size={13} /> PDF Report Parser
        </button>
        <button
          type="button"
          onClick={() => setTab("paste")}
          className={`subnav-pill-btn ${tab === "paste" ? "active" : ""}`}
        >
          <FileText size={13} /> Paste Text / SMS
        </button>
        <button
          type="button"
          onClick={() => setTab("connectors")}
          className={`subnav-pill-btn ${tab === "connectors" ? "active" : ""}`}
        >
          <Zap size={13} /> Bureau Connectors
        </button>
        <button
          type="button"
          onClick={() => setTab("csv")}
          className={`subnav-pill-btn ${tab === "csv" ? "active" : ""}`}
        >
          <Download size={13} /> CSV Paste
        </button>
      </div>

      {/* Profile Selector */}
      <div style={{ marginBottom: 16 }}>
        <Field label="Assign Report To Family Member">
          <select
            className="form-input"
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
          >
            {familyProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* TAB 1: PDF REPORT PARSER */}
      {tab === "pdf" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed var(--t-line)",
              borderRadius: "var(--radius-lg)",
              padding: "28px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: "var(--surface-1)",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePdfFileSelect(f);
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                  color: THEME.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isExtracting ? <RefreshCw size={22} className="spin" /> : <Upload size={22} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                  {pdfFile ? pdfFile.name : "Drop your official Credit Report PDF here"}
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>
                  Supports CIBIL CIR, Experian, CRIF High Mark, Equifax & OneScore / CRED statements
                </div>
              </div>
            </div>
          </div>

          {/* Password Prompt if Encrypted */}
          {needsPassword && (
            <div
              style={{
                background: "color-mix(in srgb, var(--t-gold) 10%, var(--surface-0))",
                border: "1px solid var(--t-gold)",
                borderRadius: 8,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                <Lock size={14} color={THEME.gold} />
                <span>Password Protected Credit Report</span>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted }}>
                Credit bureaus usually encrypt reports with your <strong>PAN number</strong> (e.g. ABCDE1234F) or <strong>Date of Birth (DDMMYYYY)</strong>.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter PDF password (e.g. PAN or DOB)"
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => pdfFile && handlePdfFileSelect(pdfFile, pdfPassword)}
                >
                  Unlock & Extract
                </Button>
              </div>
            </div>
          )}

          {extractError && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: THEME.rust, fontWeight: 600 }}>
              <AlertCircle size={14} />
              <span>{extractError}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedPreview && (
            <div
              style={{
                background: "color-mix(in srgb, var(--t-sage) 8%, var(--surface-0))",
                border: "1.5px solid var(--t-sage)",
                borderRadius: 12,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FileCheck size={18} color={THEME.sage} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                    Report Extracted Successfully!
                  </span>
                </div>
                <Badge style={{ background: BUREAU_COLORS[parsedPreview.bureau], color: "#fff", fontWeight: 800 }}>
                  {parsedPreview.bureau}
                </Badge>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={{ background: "var(--surface-0)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--t-line)" }}>
                  <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>PARSED SCORE</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: scoreGrade(parsedPreview.score).color, fontFamily: "var(--font-display)" }}>
                    {parsedPreview.score}
                  </div>
                </div>

                <div style={{ background: "var(--surface-0)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--t-line)" }}>
                  <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>REPORT DATE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginTop: 4 }}>
                    {parsedPreview.checkDate}
                  </div>
                </div>

                <div style={{ background: "var(--surface-0)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--t-line)" }}>
                  <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>SOURCE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginTop: 4 }}>
                    {parsedPreview.source}
                  </div>
                </div>
              </div>

              {parsedPreview.summary && (
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  {parsedPreview.notes}
                </div>
              )}

              <Button
                variant="primary"
                icon={<Check size={14} />}
                onClick={() => handleConfirmImport(parsedPreview)}
                disabled={saving}
              >
                1-Click Save Score to History
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PASTE TEXT / SMS NOTIFICATION */}
      {tab === "paste" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Paste Credit Alert / Report Text">
            <textarea
              className="form-input"
              rows={5}
              placeholder="e.g. Your CIBIL Score is 815 as of 04-Oct-2026. Or paste your full credit report summary text..."
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              style={{ fontSize: 12, lineHeight: 1.5 }}
            />
          </Field>

          {pasteParsed ? (
            <div
              style={{
                background: "color-mix(in srgb, var(--t-sage) 8%, var(--surface-0))",
                border: "1.5px solid var(--t-sage)",
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                  Detected {pasteParsed.bureau} Score: <strong style={{ color: scoreGrade(pasteParsed.score).color, fontSize: 16 }}>{pasteParsed.score}</strong> ({scoreGrade(pasteParsed.score).label})
                </div>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  Date: {pasteParsed.checkDate} • Source: {pasteParsed.source}
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={<Check size={13} />}
                onClick={() => handleConfirmImport(pasteParsed)}
                disabled={saving}
              >
                Import Score
              </Button>
            </div>
          ) : pastedText.trim() ? (
            <div style={{ fontSize: 11, color: THEME.rust, display: "flex", alignItems: "center", gap: 5 }}>
              <AlertCircle size={13} />
              <span>Could not detect a credit score between 300 and 900 in the pasted text.</span>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 3: BUREAU CONNECTORS & FREE REFRESH HUB */}
      {tab === "connectors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5 }}>
            Under RBI regulations, consumers in India are entitled to <strong>free credit reports</strong> across all 4 licensed bureaus. Connect to your official portals with 1-click:
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {BUREAUS.map((b) => {
              const info = BUREAU_INFO[b];
              const bCol = BUREAU_COLORS[b];
              return (
                <div
                  key={b}
                  style={{
                    background: "var(--surface-0)",
                    border: "1px solid var(--t-line)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: bCol }}>{b}</span>
                    <Badge variant="muted" style={{ fontSize: 9 }}>{info.refreshRate}</Badge>
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>{info.fullName}</div>
                  <div style={{ marginTop: "auto", paddingTop: 6 }}>
                    <a
                      href={info.portal}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: bCol,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Get Free {b} Report <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Partner Apps */}
          <div style={{ marginTop: 6, padding: "10px 12px", background: "var(--surface-1)", borderRadius: 8, border: "1px solid var(--t-line)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
              💡 Zero-Hassle Instant Monthly Sync Apps:
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.5 }}>
              Use <strong>OneScore</strong> (Free monthly CIBIL + Experian refresh without spam), <strong>Google Pay</strong> (Check CIBIL score under Profile), or <strong>CRED</strong>. Download their PDF report once a month and drop it into the PDF parser tab for instant auto-sync!
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CSV IMPORT */}
      {tab === "csv" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Paste CSV Rows (Bureau, Score, CheckDate, Source, Notes)">
            <textarea
              className="form-input"
              rows={5}
              placeholder={`CIBIL, 815, 2026-08-15, CIBIL Direct, Prime tier\nExperian, 838, 2026-08-15, CRED, Excellent`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              style={{ fontSize: 11, fontFamily: "monospace" }}
            />
          </Field>

          {csvError && (
            <div style={{ fontSize: 11, color: THEME.rust, display: "flex", alignItems: "center", gap: 5 }}>
              <AlertCircle size={13} />
              <span>{csvError}</span>
            </div>
          )}

          <Button variant="primary" onClick={handleCsvImport} disabled={saving}>
            Import CSV Rows
          </Button>
        </div>
      )}
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// LUXURY SPEEDOMETER GAUGE (SENIOR UI/UX PRECISION DIAL)
// -----------------------------------------------------------------------------
function CreditGaugeVisual({ score, size = 260 }: { score: number; size?: number }) {
  const grade = scoreGrade(score);
  const pct = Math.min(1, Math.max(0, (score - 300) / 600));
  const animatedScore = useAnimatedNumber(score);
  const animatedPct = Math.min(1, Math.max(0, (animatedScore - 300) / 600));

  // Geometry: 180° semi-circle from left (25, 105) through top (100, 30) to right (175, 105)
  const cx = 100;
  const cy = 105;
  const r = 75;
  const arcLength = Math.PI * r; // ~235.62
  const strokeOffset = arcLength * (1 - animatedPct);

  // Orbit indicator thumb position on arc perimeter
  const thumbAngle = Math.PI * (1 - animatedPct); // radians from 0 to PI
  const thumbX = cx - r * Math.cos(animatedPct * Math.PI);
  const thumbY = cy - r * Math.sin(animatedPct * Math.PI);

  // Key scale milestone ticks
  const ticks = [
    { label: "300", t: 0 },
    { label: "600", t: 0.5 },
    { label: "750", t: 0.75 },
    { label: "900", t: 1.0 },
  ];

  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div style={{ position: "relative", width: size, maxWidth: "100%", height: Math.round(size * 0.58) }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 120"
          style={{ overflow: "visible", display: "block" }}
        >
          <defs>
            {/* Gradient strictly oriented: Left=Red (300) -> Center=Gold/Cyan -> Right=Emerald (900) */}
            <linearGradient id="luxury-credit-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="28%" stopColor="#ea580c" />
              <stop offset="55%" stopColor="#ca8a04" />
              <stop offset="75%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Ambient halo glow filter */}
            <filter id="thumb-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.25)" />
            </filter>
          </defs>

          {/* Background Arc Track (Full 180°) */}
          <path
            d="M 25 105 A 75 75 0 0 1 175 105"
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={11}
            strokeLinecap="round"
          />

          {/* Active Colored Arc (fills from Left to Right according to score) */}
          <path
            d="M 25 105 A 75 75 0 0 1 175 105"
            fill="none"
            stroke="url(#luxury-credit-grad)"
            strokeWidth={11}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${arcLength}`}
            strokeDashoffset={strokeOffset}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />

          {/* Outer Perimeter Milestone Ticks */}
          {[0.25, 0.5, 0.75].map((t) => {
            const rad = Math.PI * (1 - t);
            const x1 = cx - (r + 7) * Math.cos(t * Math.PI);
            const y1 = cy - (r + 7) * Math.sin(t * Math.PI);
            const x2 = cx - (r + 13) * Math.cos(t * Math.PI);
            const y2 = cy - (r + 13) * Math.sin(t * Math.PI);
            return (
              <line
                key={t}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--t-muted)"
                strokeWidth={1.2}
                opacity={0.35}
                strokeLinecap="round"
              />
            );
          })}

          {/* Scale Boundary Labels (300 and 900) */}
          <text
            x={18}
            y={118}
            fill="var(--t-muted)"
            fontSize={9}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="var(--font-sans, system-ui)"
          >
            300
          </text>
          <text
            x={182}
            y={118}
            fill="var(--t-muted)"
            fontSize={9}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="var(--font-sans, system-ui)"
          >
            900
          </text>

          {/* Orbit Indicator Beacon on Arc Track (Zero collision with center text) */}
          <g filter="url(#thumb-glow)" style={{ transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <circle
              cx={thumbX}
              cy={thumbY}
              r={9}
              fill={grade.color}
              opacity={0.3}
            />
            <circle
              cx={thumbX}
              cy={thumbY}
              r={6.5}
              fill="var(--surface-0, #ffffff)"
              stroke={grade.color}
              strokeWidth={2.5}
            />
            <circle
              cx={thumbX}
              cy={thumbY}
              r={2.2}
              fill={grade.color}
            />
          </g>
        </svg>

        {/* Unobstructed Center Readout & Pill */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 0,
            right: 0,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display, inherit)",
              fontSize: Math.round(size * 0.16),
              fontWeight: 800,
              color: THEME.ink,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            <Prv>{Math.round(animatedScore)}</Prv>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: grade.bg,
              color: grade.color,
              border: `1px solid color-mix(in srgb, ${grade.color} 30%, transparent)`,
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "2px 8px",
              borderRadius: 999,
              marginTop: 4,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: grade.color,
                display: "inline-block",
              }}
            />
            {grade.label}
          </div>
        </div>
      </div>

      {/* Descriptive Status line */}
      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, fontWeight: 500 }}>
        Scale: <strong>300</strong> to <strong>900</strong> • {grade.desc}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 5 PILLARS CREDIT HEALTH ENGINE
// -----------------------------------------------------------------------------
function CreditPillarsEngine({
  sorted,
  creditCards,
  loans,
}: {
  sorted: CreditScoreEntry[];
  creditCards: CreditCardItem[];
  loans: LoanItem[];
}) {
  // 1. Credit Utilization (30% weight)
  const activeCards = (creditCards || []).filter(
    (c) => (c.status || "").toLowerCase() !== "closed"
  );
  const pools: Record<string, number> = {};
  activeCards.forEach((c) => {
    if (c.sharedGroup) {
      pools[c.sharedGroup] = Math.max(pools[c.sharedGroup] || 0, Number(c.sharedGroupLimit) || 0);
    }
  });
  const totalLimit =
    activeCards
      .filter((c) => !c.sharedGroup)
      .reduce((s: number, c) => s + Number(c.limit || c.cardLimit || 0), 0) +
    Object.values(pools).reduce((s: number, v: number) => s + v, 0);
  const totalOutstanding = activeCards.reduce(
    (s: number, c) => s + Number(c.outstanding || 0),
    0
  );
  const utilization = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : null;

  // 2. Payment History (35% weight)
  const activeLoans = (loans || []).filter(
    (l) => (l.status || "").toLowerCase() !== "closed"
  );
  const hasOverdueLoans = activeLoans.some((l) => Number(l.overdueAmount || 0) > 0);
  const paymentHistoryRating = hasOverdueLoans ? "Needs Attention" : "100% On-Time";
  const paymentHistoryScore = hasOverdueLoans ? 60 : 100;

  // 3. Credit Age & Vintage (15% weight)
  const allDates = [
    ...sorted.map((s) => s.checkDate || (s as any).asOfDate || (s as any).date),
    ...(loans || []).map((l) => l.startDate || l.disbursedDate || l.date),
    ...(creditCards || []).map((c) => c.issueDate || c.openedDate),
  ].filter(Boolean) as string[];
  
  let earliestYear = new Date().getFullYear();
  allDates.forEach((d) => {
    const dt = new Date(d);
    const yr = dt.getFullYear();
    if (yr && !isNaN(yr) && yr < earliestYear) earliestYear = yr;
  });
  const creditAgeYears = Math.max(1, new Date().getFullYear() - earliestYear);
  const creditAgeRating =
    creditAgeYears >= 5 ? "Excellent (5+ yrs)" : creditAgeYears >= 2 ? "Good (2-4 yrs)" : "Building (<2 yrs)";
  const creditAgeScore = Math.min(100, Math.round((creditAgeYears / 5) * 100));

  // 4. Credit Mix & Diversity (10% weight)
  const hasSecured = activeLoans.some((l) =>
    ["home", "mortgage", "auto", "car", "gold", "property"].some((k) =>
      (l.type || l.name || "").toLowerCase().includes(k)
    )
  );
  const hasUnsecured =
    activeCards.length > 0 ||
    activeLoans.some((l) =>
      ["personal", "education", "consumer", "credit"].some((k) =>
        (l.type || l.name || "").toLowerCase().includes(k)
      )
    );
  const creditMixRating =
    hasSecured && hasUnsecured
      ? "Balanced (Secured + Unsecured)"
      : hasUnsecured
      ? "Unsecured Heavy"
      : hasSecured
      ? "Secured Heavy"
      : "Single Product";
  const creditMixScore = hasSecured && hasUnsecured ? 95 : 75;

  // 5. Recent Inquiries & Velocity (10% weight)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentLogsCount = sorted.filter((s) => {
    const rawDate = s.checkDate || (s as any).asOfDate || (s as any).date;
    if (!rawDate) return false;
    const dt = new Date(rawDate);
    return !isNaN(dt.getTime()) && dt >= sixMonthsAgo;
  }).length;
  const inquiryRating =
    recentLogsCount <= 3 ? "Low (Safe)" : recentLogsCount <= 6 ? "Moderate" : "High Velocity";
  const inquiryScore = recentLogsCount <= 3 ? 100 : recentLogsCount <= 6 ? 75 : 50;

  // Utilization Rating
  const utilRating =
    utilization === null
      ? "No Active Cards"
      : utilization < 10
      ? "Optimal (< 10%)"
      : utilization < 30
      ? "Good (10–30%)"
      : utilization < 50
      ? "Fair (30–50%)"
      : "High (> 50%)";
  const utilColor =
    utilization === null
      ? THEME.muted
      : utilization < 10
      ? THEME.sage
      : utilization < 30
      ? THEME.cyan
      : utilization < 50
      ? THEME.gold
      : THEME.rust;
  const utilScore =
    utilization === null ? 85 : Math.max(10, Math.round(100 - utilization));

  const pillars = [
    {
      name: "Payment History",
      weight: "35%",
      score: paymentHistoryScore,
      rating: paymentHistoryRating,
      color: hasOverdueLoans ? THEME.rust : THEME.sage,
      desc: "Timely payment of EMIs and card statements without defaults or 30+ DPD delays",
      action: hasOverdueLoans ? "Clear overdue EMIs immediately" : "Keep automated ECS / NACH autopay active",
      icon: CheckCircle2,
    },
    {
      name: "Credit Utilization",
      weight: "30%",
      score: utilScore,
      rating: utilRating,
      color: utilColor,
      desc: totalLimit > 0 ? `${fmtINR(totalOutstanding)} used of ${fmtINR(totalLimit)} limit (${(utilization || 0).toFixed(0)}%)` : "No revolving credit card limits found",
      action: utilization && utilization > 30 ? "Pay dues before statement generation to drop reported balance" : "Maintain utilization under 30%",
      icon: CreditCard,
    },
    {
      name: "Credit Age & Depth",
      weight: "15%",
      score: creditAgeScore,
      rating: creditAgeRating,
      color: creditAgeYears >= 5 ? THEME.sage : creditAgeYears >= 2 ? THEME.cyan : THEME.gold,
      desc: `Track record spans ~${creditAgeYears} ${creditAgeYears === 1 ? "year" : "years"} across accounts`,
      action: "Keep oldest lifetime credit cards active with occasional low usage",
      icon: Clock,
    },
    {
      name: "Credit Mix & Diversity",
      weight: "10%",
      score: creditMixScore,
      rating: creditMixRating,
      color: hasSecured && hasUnsecured ? THEME.sage : THEME.cyan,
      desc: `${activeCards.length} Cards, ${activeLoans.length} Loans (${hasSecured ? "Secured" : "Unsecured"})`,
      action: "Optimal balance between asset-backed loans and unsecured credit lines",
      icon: Layers,
    },
    {
      name: "Inquiries & Velocity",
      weight: "10%",
      score: inquiryScore,
      rating: inquiryRating,
      color: recentLogsCount <= 3 ? THEME.sage : THEME.gold,
      desc: `${recentLogsCount} credit checks logged in last 6 months`,
      action: "Avoid applying for multiple credit cards or personal loans within 90 days",
      icon: Activity,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {pillars.map((p, idx) => {
          const IconComp = p.icon;
          return (
            <div
              key={idx}
              style={{
                background: "var(--surface-0)",
                border: "1.5px solid var(--t-line)",
                borderRadius: 12,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `color-mix(in srgb, ${p.color} 14%, var(--surface-0))`,
                      color: p.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>Weight: {p.weight}</div>
                  </div>
                </div>
                <Badge style={{ background: `color-mix(in srgb, ${p.color} 12%, transparent)`, color: p.color, fontWeight: 700, fontSize: 10 }}>
                  {p.rating}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(5, p.score))}%`,
                      height: "100%",
                      borderRadius: 3,
                      background: p.color,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                {p.desc}
              </div>

              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: p.color,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: "auto",
                  paddingTop: 6,
                  borderTop: "1px dashed var(--t-line)",
                }}
              >
                <Sparkles size={11} />
                <span>{p.action}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 36-MONTH DPD (DAYS PAST DUE) PAYMENT HISTORY TRACKER
// -----------------------------------------------------------------------------
function PaymentHistoryMatrix({ loans }: { loans: LoanItem[] }) {
  const months = useMemo(() => {
    const res: { label: string; key: string; isCurrent: boolean }[] = [];
    const now = new Date();
    for (let i = 35; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      res.push({
        label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        isCurrent: i === 0,
      });
    }
    return res;
  }, []);

  const hasOverdue = (loans || []).some((l) => Number(l.overdueAmount || 0) > 0);

  return (
    <Card style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color={hasOverdue ? THEME.rust : THEME.sage} />
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
            36-Month Bureau DPD (Days Past Due) Payment Track
          </span>
        </div>
        <Badge variant={hasOverdue ? "danger" : "success"} style={{ fontSize: 10 }}>
          {hasOverdue ? "Overdue Delinquency Detected" : "100% Spotless Track Record (0 DPD)"}
        </Badge>
      </div>

      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 14, lineHeight: 1.4 }}>
        Indian credit bureaus record payment behavior month-by-month for 36 months. A green &lsquo;000&rsquo; indicator signifies on-time settlement with zero interest penalties.
      </div>

      {/* Grid of 36 Months */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(32px, 1fr))", gap: 4 }}>
        {months.map((m, i) => {
          const isOverdueMonth = hasOverdue && i >= 34;
          return (
            <div
              key={m.key}
              title={`${m.label}: ${isOverdueMonth ? "30+ DPD Overdue" : "0 DPD On-Time Payment"}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 2px",
                borderRadius: 6,
                background: isOverdueMonth
                  ? "color-mix(in srgb, var(--t-rust) 20%, var(--surface-1))"
                  : "color-mix(in srgb, var(--t-sage) 14%, var(--surface-1))",
                border: `1px solid ${isOverdueMonth ? THEME.rust : "color-mix(in srgb, var(--t-sage) 35%, transparent)"}`,
              }}
            >
              <span style={{ fontSize: 8, fontWeight: 700, color: isOverdueMonth ? THEME.rust : THEME.sage }}>
                {isOverdueMonth ? "30+" : "000"}
              </span>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isOverdueMonth ? THEME.rust : THEME.sage,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, marginTop: 8 }}>
        <span>3 Years Ago</span>
        <span>Current Month ({today()})</span>
      </div>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// TARGET SCORE ROADMAP & PRIME APPROVAL PLANNER
// -----------------------------------------------------------------------------
function CreditScoreRoadmap({ currentScore }: { currentScore: number }) {
  const [targetGoal, setTargetGoal] = useState<number>(800);

  const targets = [
    { target: 750, title: "Standard Auto / Two-Wheeler Loans", badge: "750+" },
    { target: 780, title: "Premium Credit Cards & Instant Limits", badge: "780+" },
    { target: 800, title: "Prime Home Loan @ Lowest Spread (8.35%)", badge: "800+" },
    { target: 850, title: "Top 1% Elite Global Credit Tier", badge: "850+" },
  ];

  const gap = Math.max(0, targetGoal - currentScore);
  const progressPct = Math.min(100, Math.max(0, ((currentScore - 300) / (targetGoal - 300)) * 100));
  const estimatedMonths = gap === 0 ? 0 : Math.max(1, Math.ceil(gap / 12));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
      <Card style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Target size={18} color={THEME.accent} />
          <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
            Select Your Target Credit Milestone
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {targets.map((t) => {
            const isSel = targetGoal === t.target;
            return (
              <div
                key={t.target}
                onClick={() => setTargetGoal(t.target)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${isSel ? THEME.accent : "var(--t-line)"}`,
                  background: isSel ? "color-mix(in srgb, var(--t-accent) 8%, var(--surface-0))" : "var(--surface-0)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? THEME.accent : THEME.ink }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    {currentScore >= t.target ? "✅ Goal achieved!" : `${t.target - currentScore} points to go`}
                  </div>
                </div>
                <Badge style={{ background: isSel ? THEME.accent : "var(--surface-2)", color: isSel ? "#fff" : THEME.ink, fontWeight: 800 }}>
                  {t.badge}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Progress Arc */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: THEME.ink, marginBottom: 6 }}>
            <span>Milestone Progress</span>
            <span style={{ color: gap === 0 ? THEME.sage : THEME.accent, fontWeight: 700 }}>{progressPct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden" }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: gap === 0 ? THEME.sage : THEME.accent,
                borderRadius: 4,
                transition: "width 0.8s ease",
              }}
            />
          </div>
        </div>
      </Card>

      {/* Actionable Strategy Roadmap */}
      <Card style={{ padding: "22px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Roadmap to {targetGoal}
        </div>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: gap === 0 ? THEME.sage : THEME.accent, fontFamily: "var(--font-display)" }}>
            {gap === 0 ? "Target Reached! 🚀" : `+${gap} Points`}
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            {gap === 0 ? "You qualify for top-tier prime lending interest rates." : `Estimated Timeline: ~${estimatedMonths} months with clean repayment discipline`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: THEME.ink }}>
            <CheckCircle2 size={14} color={THEME.sage} style={{ marginTop: 2, flexShrink: 0 }} />
            <span><strong>Target 10% Utilization:</strong> Pay credit card statements before the billing date to report minimal balances.</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: THEME.ink }}>
            <CheckCircle2 size={14} color={THEME.sage} style={{ marginTop: 2, flexShrink: 0 }} />
            <span><strong>Zero Delinquencies:</strong> Keep Auto-Debit enabled on primary bank account for all card & loan EMIs.</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: THEME.ink }}>
            <CheckCircle2 size={14} color={THEME.sage} style={{ marginTop: 2, flexShrink: 0 }} />
            <span><strong>Cool-Off Window:</strong> Avoid new credit card or personal loan applications for the next 90 days.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// INTERACTIVE "WHAT-IF" CREDIT SCORE SIMULATOR
// -----------------------------------------------------------------------------
function CreditScoreSimulator({
  currentScore,
  creditCards,
}: {
  currentScore: number;
  creditCards: CreditCardItem[];
  loans: LoanItem[];
}) {
  const activeCards = (creditCards || []).filter(
    (c) => (c.status || "").toLowerCase() !== "closed"
  );
  const totalLimit = activeCards.reduce(
    (s: number, c) => s + Number(c.limit || c.cardLimit || 0),
    0
  );
  const totalOutstanding = activeCards.reduce(
    (s: number, c) => s + Number(c.outstanding || 0),
    0
  );

  // Simulation Sliders / Toggles
  const [payoffAmount, setPayoffAmount] = useState(0);
  const [limitIncrease, setLimitIncrease] = useState(0);
  const [closeOldCard, setCloseOldCard] = useState(false);
  const [applyNewLoan, setApplyNewLoan] = useState(false);
  const [missedPayment, setMissedPayment] = useState(false);

  // Score Impact Calculation Engine
  const simulationResults = useMemo(() => {
    let delta = 0;
    const factors: { label: string; impact: number; text: string }[] = [];

    // 1. Payoff balance impact
    if (payoffAmount > 0 && totalLimit > 0) {
      const curUtil = (totalOutstanding / totalLimit) * 100;
      const newUtil = (Math.max(0, totalOutstanding - payoffAmount) / totalLimit) * 100;
      const utilDrop = curUtil - newUtil;
      const boost = Math.min(45, Math.round(utilDrop * 0.85));
      if (boost > 0) {
        delta += boost;
        factors.push({
          label: "Card Debt Reduction",
          impact: boost,
          text: `Paying off ${fmtINR(payoffAmount)} drops utilization from ${curUtil.toFixed(0)}% to ${newUtil.toFixed(0)}%`,
        });
      }
    }

    // 2. Limit Increase impact
    if (limitIncrease > 0 && totalLimit > 0) {
      const newTotalLimit = totalLimit + limitIncrease;
      const curUtil = (totalOutstanding / totalLimit) * 100;
      const newUtil = (totalOutstanding / newTotalLimit) * 100;
      const utilDrop = curUtil - newUtil;
      const boost = Math.min(25, Math.round(utilDrop * 0.6));
      if (boost > 0) {
        delta += boost;
        factors.push({
          label: "Credit Limit Increase",
          impact: boost,
          text: `Adding ${fmtINR(limitIncrease)} limit lowers overall utilization`,
        });
      }
    }

    // 3. Closing Old Card
    if (closeOldCard) {
      const penalty = -22;
      delta += penalty;
      factors.push({
        label: "Card Closure Penalty",
        impact: penalty,
        text: "Closing your oldest account shrinks total credit line and lowers credit vintage age",
      });
    }

    // 4. Applying for New Loan/Card
    if (applyNewLoan) {
      const penalty = -10;
      delta += penalty;
      factors.push({
        label: "Hard Inquiry Impact",
        impact: penalty,
        text: "Lenders trigger a hard bureau inquiry which temporarily trims 5–15 points",
      });
    }

    // 5. Missed Payment / Default
    if (missedPayment) {
      const penalty = -75;
      delta += penalty;
      factors.push({
        label: "30+ Day Late Payment",
        impact: penalty,
        text: "Severe delinquency flag reported to bureau — stays on record up to 36 months",
      });
    }

    const projected = Math.min(900, Math.max(300, currentScore + delta));
    return { delta, projected, factors };
  }, [currentScore, payoffAmount, limitIncrease, closeOldCard, applyNewLoan, missedPayment, totalLimit, totalOutstanding]);

  const projectedGrade = scoreGrade(simulationResults.projected);

  const resetSimulator = () => {
    setPayoffAmount(0);
    setLimitIncrease(0);
    setCloseOldCard(false);
    setApplyNewLoan(false);
    setMissedPayment(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
      {/* Interactive Controls */}
      <Card style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calculator size={18} color={THEME.accent} />
            <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              What-If Scenario Controls
            </span>
          </div>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={resetSimulator}>
            Reset
          </Button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Slider 1: Pay off Debt */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: THEME.ink, marginBottom: 6 }}>
              <span>Pay Off Credit Card Balances</span>
              <span style={{ color: THEME.sage, fontWeight: 700 }}>{fmtINR(payoffAmount)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(100000, totalOutstanding || 100000)}
              step={5000}
              value={payoffAmount}
              onChange={(e) => setPayoffAmount(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.sage, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, marginTop: 4 }}>
              <span>₹0</span>
              <span>Total Dues: {fmtINR(totalOutstanding)}</span>
            </div>
          </div>

          {/* Slider 2: Increase Limit */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: THEME.ink, marginBottom: 6 }}>
              <span>Request Credit Limit Increase</span>
              <span style={{ color: THEME.cyan, fontWeight: 700 }}>+{fmtINR(limitIncrease)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={500000}
              step={25000}
              value={limitIncrease}
              onChange={(e) => setLimitIncrease(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.cyan, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, marginTop: 4 }}>
              <span>+₹0</span>
              <span>+₹5 Lakh</span>
            </div>
          </div>

          {/* Action Toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6, borderTop: "1px solid var(--t-line)" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 8,
                background: closeOldCard ? "color-mix(in srgb, var(--t-rust) 8%, var(--surface-0))" : "var(--surface-0)",
                border: `1px solid ${closeOldCard ? THEME.rust : "var(--t-line)"}`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>Close Oldest Credit Card</span>
                <span style={{ fontSize: 10, color: THEME.muted }}>Shrinks history length & available pool</span>
              </div>
              <input
                type="checkbox"
                checked={closeOldCard}
                onChange={(e) => setCloseOldCard(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: THEME.rust }}
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 8,
                background: applyNewLoan ? "color-mix(in srgb, var(--t-gold) 8%, var(--surface-0))" : "var(--surface-0)",
                border: `1px solid ${applyNewLoan ? THEME.gold : "var(--t-line)"}`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>Apply for New Loan / Credit Card</span>
                <span style={{ fontSize: 10, color: THEME.muted }}>Generates hard inquiry at the bureau</span>
              </div>
              <input
                type="checkbox"
                checked={applyNewLoan}
                onChange={(e) => setApplyNewLoan(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: THEME.gold }}
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 8,
                background: missedPayment ? "color-mix(in srgb, var(--t-rust) 12%, var(--surface-0))" : "var(--surface-0)",
                border: `1px solid ${missedPayment ? THEME.rust : "var(--t-line)"}`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.rust }}>Miss a Payment (30+ Days Late)</span>
                <span style={{ fontSize: 10, color: THEME.muted }}>High penalty delinquency reporting</span>
              </div>
              <input
                type="checkbox"
                checked={missedPayment}
                onChange={(e) => setMissedPayment(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: THEME.rust }}
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Projected Simulation Results */}
      <Card style={{ padding: "22px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Projected Bureau Score
        </div>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, color: projectedGrade.color, letterSpacing: "-0.04em" }}>
              <Prv>{simulationResults.projected}</Prv>
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: simulationResults.delta > 0 ? THEME.sage : simulationResults.delta < 0 ? THEME.rust : THEME.muted,
              }}
            >
              {simulationResults.delta > 0 ? `+${simulationResults.delta}` : simulationResults.delta < 0 ? `${simulationResults.delta}` : "±0"} pts
            </span>
          </div>
          <Badge style={{ background: projectedGrade.bg, color: projectedGrade.color, fontWeight: 700, fontSize: 11, marginTop: 4 }}>
            {projectedGrade.label}
          </Badge>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Current Baseline: <strong>{currentScore}</strong>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>
          Simulation Factor Breakdown:
        </div>

        {simulationResults.factors.length === 0 ? (
          <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic", padding: "16px 0", textAlign: "center" }}>
            Adjust sliders or toggles on the left to simulate real-world financial moves.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 220 }}>
            {simulationResults.factors.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: f.impact > 0 ? "color-mix(in srgb, var(--t-sage) 8%, var(--surface-0))" : "color-mix(in srgb, var(--t-rust) 8%, var(--surface-0))",
                  border: `1px solid ${f.impact > 0 ? "color-mix(in srgb, var(--t-sage) 20%, transparent)" : "color-mix(in srgb, var(--t-rust) 20%, transparent)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: THEME.ink }}>{f.label}</span>
                  <span style={{ fontSize: 10, color: THEME.muted }}>{f.text}</span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: f.impact > 0 ? THEME.sage : THEME.rust,
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.impact > 0 ? `+${f.impact}` : f.impact} pts
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px dashed var(--t-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME.muted }}>
            <Info size={13} style={{ flexShrink: 0 }} />
            <span>Simulated estimates follow standard FICO / TransUnion Indian risk weight algorithms.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// BUREAU DISPUTE & ESCALATION CENTER
// -----------------------------------------------------------------------------
function BureauDisputeCenter() {
  const [selectedBureau, setSelectedBureau] = useState<BureauType>("CIBIL");
  const [disputeType, setDisputeType] = useState<string>("wrong_account");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [copied, setCopied] = useState(false);

  const disputeLetter = useMemo(() => {
    const bInfo = BUREAU_INFO[selectedBureau];
    const categoryMap: Record<string, string> = {
      wrong_account: "Incorrect Account / Loan Reported Under My Name",
      wrong_balance: "Incorrect Balance or DPD Marked on Closed Account",
      duplicate_inquiry: "Unauthorized / Fraudulent Hard Inquiry",
      identity_error: "Incorrect Name / PAN / Demographic Data",
    };

    return `To,
Grievance Redressal Officer,
${bInfo.fullName}

Subject: Formal Credit Report Dispute & Correction Request - ${categoryMap[disputeType] || "Dispute"}

Dear Sir/Madam,

I am writing to formally dispute the following inaccurate record reported in my ${selectedBureau} Credit Information Report (CIR):

1. Disputed Entity / Lender: ${accountName || "[Bank / NBFC Name]"}
2. Disputed Account / Ref No: ${accountNumber || "[Account / Card Number]"}
3. Dispute Category: ${categoryMap[disputeType] || "Reporting Inaccuracy"}
4. Date of Notice: ${today()}

Under the Credit Information Companies (Regulation) Act, 2005 (CICRA) and RBI Master Directions, credit bureaus and reporting financial institutions are required to rectify verified reporting errors within 30 calendar days of grievance submission.

Kindly initiate verification with the reporting member institution, delete/update the inaccurate entry from my CIR, and issue an updated credit information report.

Yours faithfully,
[Your Full Name]
[PAN Number]
[Registered Mobile Number]`;
  }, [selectedBureau, disputeType, accountName, accountNumber]);

  const handleCopyLetter = () => {
    navigator.clipboard.writeText(disputeLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 4 Bureau Portals Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {BUREAUS.map((b) => {
          const info = BUREAU_INFO[b];
          const bColor = BUREAU_COLORS[b];
          return (
            <Card key={b} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: bColor }}>{b}</div>
                <Badge variant="muted" style={{ fontSize: 10 }}>
                  Toll-Free: {info.tollFree}
                </Badge>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>{info.fullName}</div>
              <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                Direct online dispute resolution portal for reporting inaccurate accounts, wrongful overdue marks, or identity mismatch:
              </div>
              <div style={{ marginTop: "auto", paddingTop: 8 }}>
                <a
                  href={info.disputeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: bColor,
                    textDecoration: "none",
                  }}
                >
                  Raise Online Dispute at {b} <ExternalLink size={12} />
                </a>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Dispute Letter Generator */}
      <Card style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} color={THEME.accent} />
            <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              RBI-Compliant Formal Dispute Notice Generator
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon={copied ? <Check size={13} color={THEME.sage} /> : <Copy size={13} />}
            onClick={handleCopyLetter}
          >
            {copied ? "Copied to Clipboard!" : "Copy Letter"}
          </Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <Field label="Target Credit Bureau">
            <select
              className="form-input"
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value as BureauType)}
            >
              {BUREAUS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>

          <Field label="Dispute Nature / Category">
            <select
              className="form-input"
              value={disputeType}
              onChange={(e) => setDisputeType(e.target.value)}
            >
              <option value="wrong_account">Wrong Account Not Mine</option>
              <option value="wrong_balance">Wrong Balance / Overdue on Closed Loan</option>
              <option value="duplicate_inquiry">Unauthorized / Fraudulent Hard Inquiry</option>
              <option value="identity_error">Name / PAN / Demographic Error</option>
            </select>
          </Field>

          <Field label="Lender / Account Ref">
            <input
              className="form-input"
              placeholder="e.g. HDFC Bank Credit Card ending 9821"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </Field>
        </div>

        <textarea
          readOnly
          className="form-input"
          rows={10}
          value={disputeLetter}
          style={{ fontSize: 11, fontFamily: "monospace", lineHeight: 1.5, background: "var(--surface-1)" }}
        />
      </Card>

      {/* RBI Ombudsman Escalation Protocol */}
      <Card style={{ padding: "20px 24px", background: "color-mix(in srgb, var(--t-accent) 4%, var(--surface-0))" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <ShieldCheck size={20} color={THEME.accent} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              RBI Mandatory 30-Day Resolution Protocol & Ombudsman Escalation
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
              Under Reserve Bank of India (RBI) Master Directives, credit bureaus and reporting banks MUST resolve customer disputes within <strong>30 calendar days</strong>. If unresolved or unfairly rejected, you are entitled to compensation of ₹100 per day of delay and can escalate to the RBI Banking Ombudsman portal at:
            </div>
            <div style={{ marginTop: 6 }}>
              <a
                href="https://cms.rbi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: THEME.accent,
                  textDecoration: "none",
                }}
              >
                File Complaint with RBI Ombudsman (cms.rbi.org.in) <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN CREDIT SCORE TAB
// -----------------------------------------------------------------------------
interface CreditScoreTabProps {
  state: {
    creditScores?: CreditScoreEntry[];
    creditCards?: CreditCardItem[];
    loans?: LoanItem[];
  };
  addItem: (collection: string, item: CreditScoreEntry) => Promise<void> | void;
  removeItem: (collection: string, id: string) => Promise<void> | void;
  updateItem: (collection: string, id: string, item: CreditScoreEntry) => Promise<void> | void;
  showToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function CreditScoreTab({ state, addItem, removeItem, updateItem, showToast }: CreditScoreTabProps) {
  const { familyProfiles } = useMasterData();
  const rawScores = state.creditScores;
  const rawCards = state.creditCards;
  const rawLoans = state.loans;

  const scores: CreditScoreEntry[] = useMemo(() => {
    return (rawScores || []).map((s: any) => ({
      ...s,
      checkDate: s.checkDate || s.asOfDate || s.date || s.check_date || "",
    }));
  }, [rawScores]);
  const creditCards: CreditCardItem[] = useMemo(() => rawCards || [], [rawCards]);
  const loans: LoanItem[] = useMemo(() => rawLoans || [], [rawLoans]);

  // Main UI States
  const [modal, setModal] = useState<Partial<CreditScoreEntry> | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [bureau, setBureau] = useState<BureauType>("CIBIL");
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "roadmap" | "trends" | "simulator" | "history" | "disputes">("overview");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [timeRange, setTimeRange] = useState<"6M" | "1Y" | "3Y" | "ALL">("1Y");
  const [overlayAllBureaus, setOverlayAllBureaus] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Multi-Owner Scoping
  const distinctOwners = useMemo(
    () => Array.from(new Set(scores.map((s) => s.owner).filter(Boolean))),
    [scores]
  );
  const isMultiOwner = distinctOwners.length > 1;

  const ownerScopedScores = useMemo(
    () => (ownerFilter === "all" ? scores : scores.filter((s) => s.owner === ownerFilter)),
    [scores, ownerFilter]
  );

  const ownerScopedCards = useMemo(
    () =>
      ownerFilter === "all"
        ? creditCards
        : creditCards.filter((c) => c.owner === ownerFilter),
    [creditCards, ownerFilter]
  );

  const ownerScopedLoans = useMemo(
    () =>
      ownerFilter === "all"
        ? loans
        : loans.filter((l) => l.owner === ownerFilter),
    [loans, ownerFilter]
  );

  // Per-Bureau latest scores dictionary
  const bureauLatestMap = useMemo(() => {
    const map: Record<string, { latest: CreditScoreEntry | null; prev: CreditScoreEntry | null; delta: number | null; count: number; daysSince: number | null }> = {};
    const nowTime = new Date().getTime();
    BUREAUS.forEach((b) => {
      const bScores = ownerScopedScores
        .filter((s) => s.bureau === b)
        .sort((x, y) => (x.checkDate || "").localeCompare(y.checkDate || ""));
      const latest = bScores[bScores.length - 1] || null;
      const prev = bScores[bScores.length - 2] || null;
      const delta = latest && prev ? latest.score - prev.score : null;
      let daysSince: number | null = null;
      if (latest?.checkDate) {
        const dt = new Date(latest.checkDate);
        if (!isNaN(dt.getTime())) {
          daysSince = Math.max(0, Math.floor((nowTime - dt.getTime()) / 86400000));
        }
      }
      map[b] = { latest, prev, delta, count: bScores.length, daysSince };
    });
    return map;
  }, [ownerScopedScores]);

  // Selected Bureau data
  const bureauFiltered = useMemo(
    () => ownerScopedScores.filter((s) => s.bureau === bureau),
    [ownerScopedScores, bureau]
  );
  const bureauSorted = useMemo(
    () => [...bureauFiltered].sort((a, b) => (a.checkDate || "").localeCompare(b.checkDate || "")),
    [bureauFiltered]
  );
  const activeLatest = bureauSorted[bureauSorted.length - 1];
  const activePrev = bureauSorted[bureauSorted.length - 2];
  const activeDelta = activeLatest && activePrev ? activeLatest.score - activePrev.score : null;

  // Chart Data Preparation with Range Filter
  const chartData = useMemo(() => {
    const cutoff = new Date();
    if (timeRange === "6M") cutoff.setMonth(cutoff.getMonth() - 6);
    else if (timeRange === "1Y") cutoff.setFullYear(cutoff.getFullYear() - 1);
    else if (timeRange === "3Y") cutoff.setFullYear(cutoff.getFullYear() - 3);
    else cutoff.setFullYear(cutoff.getFullYear() - 50);

    if (overlayAllBureaus) {
      // Aggregate by unique dates
      const dateMap: Record<string, Record<string, string | number>> = {};
      ownerScopedScores.forEach((s) => {
        if (!s.checkDate) return;
        const dt = new Date(s.checkDate);
        if (isNaN(dt.getTime()) || dt < cutoff) return;
        const dateKey = s.checkDate;
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = {
            dateKey,
            dateLabel: dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
          };
        }
        dateMap[dateKey][s.bureau] = s.score;
      });
      return Object.values(dateMap).sort((a, b) => String(a.dateKey || "").localeCompare(String(b.dateKey || "")));
    }

    return bureauSorted
      .filter((s) => {
        if (!s.checkDate) return false;
        const dt = new Date(s.checkDate);
        return !isNaN(dt.getTime()) && dt >= cutoff;
      })
      .map((s) => {
        const dt = new Date(s.checkDate);
        return {
          dateLabel: !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) : s.checkDate,
          score: s.score,
          bureau: s.bureau,
        };
      });
  }, [ownerScopedScores, bureauSorted, timeRange, overlayAllBureaus]);

  // Search and Sort for History Log Table
  const searchLower = search.trim().toLowerCase();
  const historyList = useMemo(() => {
    const list = [...ownerScopedScores].sort((a, b) => (b.checkDate || "").localeCompare(a.checkDate || ""));
    if (!searchLower) return list;
    return list.filter((s) => {
      const dt = s.checkDate ? new Date(s.checkDate) : null;
      const dateLabel = dt && !isNaN(dt.getTime())
        ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }).toLowerCase()
        : (s.checkDate || "").toLowerCase();
      return (
        dateLabel.includes(searchLower) ||
        (s.bureau || "").toLowerCase().includes(searchLower) ||
        (s.source || "").toLowerCase().includes(searchLower) ||
        (s.notes || "").toLowerCase().includes(searchLower) ||
        String(s.score).includes(searchLower)
      );
    });
  }, [ownerScopedScores, searchLower]);

  // Async CRUD Handlers
  const { run: saveScore, loading: savingScore } = useAsyncAction(
    async (data: CreditScoreEntry) => {
      if (data.id && scores.find((s) => s.id === data.id)) {
        await updateItem("creditScores", data.id, data);
        showToast?.("Credit score updated successfully", "success");
      } else {
        await addItem("creditScores", data);
        showToast?.("Credit score logged successfully", "success");
      }
    },
    { onSuccess: () => setModal(null), onError: (e: any) => showToast?.(`Failed to save score: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: deleteScore } = useAsyncAction(
    async (id: string) => {
      await removeItem("creditScores", id);
      showToast?.("Credit score entry removed", "info");
    },
    { onError: (e: any) => showToast?.(`Failed to delete score entry: ${e?.message || "Unknown error"}`, "error") }
  );

  const handleExportCSV = () => {
    exportArrayToCSV(
      historyList.map((s) => {
        const dt = s.checkDate ? new Date(s.checkDate) : null;
        const dateFormatted = dt && !isNaN(dt.getTime())
          ? dt.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : s.checkDate || "";
        return {
          ...s,
          ownerName: getOwnerAvatarInfo(s.owner, familyProfiles).name,
          dateFormatted,
        };
      }),
      [
        { key: "dateFormatted", label: "Check Date" },
        { key: "bureau", label: "Bureau" },
        { key: "score", label: "Score" },
        { key: "ownerName", label: "Owner" },
        { key: "source", label: "Source" },
        { key: "notes", label: "Notes" },
      ],
      `Credit_Scores_${bureau}_${today()}`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <SectionTitle
        sub="Multi-Bureau Intelligence, 5-Pillar Credit Health, AI Document Parser & Dispute Escalation Engine"
        rightElement={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Multi-Owner Dropdown Filter */}
            {isMultiOwner && (
              <select
                className="form-input"
                style={{ width: "auto", minWidth: 140, padding: "6px 12px", fontSize: 12 }}
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              >
                <option value="all">All Profiles ({distinctOwners.length})</option>
                {distinctOwners.map((own) => (
                  <option key={own} value={own}>
                    {getOwnerAvatarInfo(own, familyProfiles).name}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="ghost"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportCSV}
              disabled={historyList.length === 0}
            >
              Export Report
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<Printer size={13} />}
              onClick={handlePrint}
            >
              Print
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Zap size={14} color={THEME.accent} />}
              onClick={() => setImportModalOpen(true)}
            >
              Smart Import & Sync
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setModal({ bureau, checkDate: today(), owner: ownerFilter !== "all" ? ownerFilter : "self" })}
            >
              Log Score
            </Button>
          </div>
        }
      >
        Credit Score & Bureau Health Center
      </SectionTitle>

      {scores.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={44} />}
          title="No Credit Scores Logged Yet"
          description="Track your TransUnion CIBIL, Experian, CRIF, and Equifax credit health with automatic 5-pillar analytics and report auto-parsing."
          action={
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                variant="primary"
                icon={<Plus size={14} />}
                onClick={() => setModal({ bureau: "CIBIL", checkDate: today(), owner: "self" })}
              >
                Log First Credit Score
              </Button>
              <Button
                variant="secondary"
                icon={<Zap size={14} />}
                onClick={() => setImportModalOpen(true)}
              >
                Smart Import Bureau Report
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* 4-BUREAU COMMAND DECK */}
          <div
            className="bureau-command-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {BUREAUS.map((b) => {
              const data = bureauLatestMap[b];
              const isSelected = bureau === b;
              const bColor = BUREAU_COLORS[b];
              const latestScore = data.latest?.score;
              const grade = latestScore ? scoreGrade(latestScore) : null;
              const delta = data.delta;

              return (
                <div
                  key={b}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setBureau(b)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setBureau(b);
                    }
                  }}
                  className={`bureau-command-card ${isSelected ? "active" : ""}`}
                  style={{
                    borderRadius: "var(--radius-lg, 12px)",
                    border: `1.5px solid ${isSelected ? bColor : "var(--t-line)"}`,
                    background: isSelected
                      ? `color-mix(in srgb, ${bColor} 6%, var(--surface-0))`
                      : "var(--surface-0)",
                    padding: "14px 16px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow: isSelected ? `0 4px 16px color-mix(in srgb, ${bColor} 18%, transparent)` : "var(--shadow-sm)",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: bColor }}>{b}</span>
                      {data.count > 0 && (
                        <Badge variant="muted" style={{ fontSize: 9, padding: "1px 5px" }}>
                          {data.count}
                        </Badge>
                      )}
                    </div>
                    {delta !== null && delta !== 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: delta > 0 ? THEME.sage : THEME.rust,
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 24,
                        fontWeight: 700,
                        color: latestScore ? THEME.ink : THEME.muted,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {latestScore ? <Prv>{latestScore}</Prv> : "—"}
                    </span>
                    {grade && (
                      <Badge
                        style={{
                          background: grade.bg,
                          color: grade.color,
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "2px 6px",
                        }}
                      >
                        {grade.label}
                      </Badge>
                    )}
                  </div>

                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>
                      {data.latest && data.latest.checkDate
                        ? (() => {
                            const dt = new Date(data.latest.checkDate);
                            return !isNaN(dt.getTime())
                              ? dt.toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : data.latest.checkDate;
                          })()
                        : "No logs"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ bureau: b });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: bColor,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sub-Navigation Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderBottom: "1px solid var(--t-line)",
              paddingBottom: 6,
              overflowX: "auto",
            }}
          >
            <button
              className={`subnav-pill-btn ${activeSubTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveSubTab("overview")}
            >
              <PieChart size={14} /> Overview & 5 Pillars
            </button>
            <button
              className={`subnav-pill-btn ${activeSubTab === "roadmap" ? "active" : ""}`}
              onClick={() => setActiveSubTab("roadmap")}
            >
              <Target size={14} /> Score Target Roadmap
            </button>
            <button
              className={`subnav-pill-btn ${activeSubTab === "trends" ? "active" : ""}`}
              onClick={() => setActiveSubTab("trends")}
            >
              <TrendingUp size={14} /> Score Trends & Comparison
            </button>
            <button
              className={`subnav-pill-btn ${activeSubTab === "simulator" ? "active" : ""}`}
              onClick={() => setActiveSubTab("simulator")}
            >
              <Calculator size={14} /> What-If Simulator
            </button>
            <button
              className={`subnav-pill-btn ${activeSubTab === "history" ? "active" : ""}`}
              onClick={() => setActiveSubTab("history")}
            >
              <History size={14} /> Audit Log ({historyList.length})
            </button>
            <button
              className={`subnav-pill-btn ${activeSubTab === "disputes" ? "active" : ""}`}
              onClick={() => setActiveSubTab("disputes")}
            >
              <ShieldCheck size={14} /> Bureau Dispute Guide & Ombudsman
            </button>
          </div>

          {/* TAB 1: OVERVIEW & 5 PILLARS */}
          {activeSubTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {activeLatest ? (
                <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1.85fr", gap: 20, alignItems: "stretch" }}>
                  {/* Left Hero Speedometer Card */}
                  <Card style={{ padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: BUREAU_COLORS[bureau],
                            boxShadow: `0 0 8px ${BUREAU_COLORS[bureau]}`,
                            display: "inline-block",
                          }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 800, color: BUREAU_COLORS[bureau] }}>
                          {bureau} Bureau Score
                        </span>
                      </div>
                      <Badge variant="neutral" style={{ fontSize: 10, fontWeight: 600 }}>
                        {activeLatest.source || "Official Record"}
                      </Badge>
                    </div>

                    {/* Gauge Display */}
                    <div style={{ padding: "8px 0 12px", display: "flex", justifyContent: "center" }}>
                      <CreditGaugeVisual score={activeLatest.score} size={250} />
                    </div>

                    {/* 3-Column Micro-Stats Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 8,
                        background: "var(--surface-1)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        border: "1px solid var(--t-line)",
                        marginTop: 10,
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, textTransform: "uppercase" }}>Checked</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
                          {activeLatest.checkDate
                            ? (() => {
                                const dt = new Date(activeLatest.checkDate);
                                return !isNaN(dt.getTime())
                                  ? dt.toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : activeLatest.checkDate;
                              })()
                            : "Unknown"}
                        </div>
                      </div>

                      <div style={{ textAlign: "center", borderLeft: "1px solid var(--t-line)", borderRight: "1px solid var(--t-line)" }}>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, textTransform: "uppercase" }}>Momentum</div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: activeDelta !== null && activeDelta > 0 ? THEME.sage : activeDelta !== null && activeDelta < 0 ? THEME.rust : THEME.muted,
                            marginTop: 2,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          {activeDelta !== null ? (
                            <>
                              {activeDelta > 0 ? `+${activeDelta} pts` : activeDelta < 0 ? `${activeDelta} pts` : "Stable"}
                            </>
                          ) : (
                            "Baseline"
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, textTransform: "uppercase" }}>Approval Odds</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.sage, marginTop: 2 }}>
                          {activeLatest.score >= 750 ? "99% Prime" : activeLatest.score >= 700 ? "85% High" : activeLatest.score >= 650 ? "60% Fair" : "<35% Low"}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--t-line)" }}>
                      <span style={{ fontSize: 11, color: THEME.muted }}>
                        Official Portal: <strong style={{ color: THEME.ink }}>{BUREAU_INFO[bureau].fullName}</strong>
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <a
                          href={BUREAU_INFO[bureau].portal}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: BUREAU_COLORS[bureau],
                            textDecoration: "none",
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: `color-mix(in srgb, ${BUREAU_COLORS[bureau]} 10%, transparent)`,
                          }}
                        >
                          <ExternalLink size={11} /> Launch Portal
                        </a>
                      </div>
                    </div>
                  </Card>

                  {/* Right 5 Pillars Engine */}
                  <Card style={{ padding: "20px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Award size={18} color={THEME.accent} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                          5 Pillars Credit Health Breakdown
                        </span>
                      </div>
                      <Badge variant="accent" style={{ fontSize: 10 }}>
                        FICO / TransUnion Model
                      </Badge>
                    </div>

                    <CreditPillarsEngine
                      sorted={bureauSorted}
                      creditCards={ownerScopedCards}
                      loans={ownerScopedLoans}
                    />
                  </Card>
                </div>
              ) : (
                <EmptyState
                  icon={<CreditCard size={36} />}
                  title={`No ${bureau} Scores Logged`}
                  description={`You haven't logged any score entries for ${bureau} yet.`}
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus size={14} />}
                      onClick={() => setModal({ bureau })}
                    >
                      Log {bureau} Score
                    </Button>
                  }
                />
              )}

              {/* 36-Month DPD Payment Track */}
              <PaymentHistoryMatrix loans={ownerScopedLoans} />
            </div>
          )}

          {/* TAB 2: SCORE TARGET ROADMAP */}
          {activeSubTab === "roadmap" && (
            <CreditScoreRoadmap currentScore={activeLatest?.score || 720} />
          )}

          {/* TAB 3: SCORE TRENDS & MULTI-BUREAU OVERLAY */}
          {activeSubTab === "trends" && (
            <Card style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                    {overlayAllBureaus ? "Multi-Bureau Historical Comparison" : `${bureau} Score Trajectory`}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    Longitudinal credit score tracking across reporting cycles
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {/* Multi-Bureau Overlay Toggle */}
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: THEME.ink, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={overlayAllBureaus}
                      onChange={(e) => setOverlayAllBureaus(e.target.checked)}
                      style={{ accentColor: THEME.accent }}
                    />
                    <span>Overlay All 4 Bureaus</span>
                  </label>

                  {/* Range Filter */}
                  <div style={{ display: "flex", background: "var(--surface-1)", borderRadius: 8, padding: 3, border: "1px solid var(--t-line)" }}>
                    {(["6M", "1Y", "3Y", "ALL"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setTimeRange(r)}
                        style={{
                          background: timeRange === r ? "var(--surface-0)" : "transparent",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: timeRange === r ? 700 : 500,
                          color: timeRange === r ? THEME.accent : THEME.muted,
                          cursor: "pointer",
                          boxShadow: timeRange === r ? "var(--shadow-sm)" : "none",
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {chartData.length < 2 ? (
                <div style={{ height: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: THEME.muted, gap: 8 }}>
                  <TrendingUp size={32} opacity={0.4} />
                  <span style={{ fontSize: 12 }}>Need at least 2 entries in this time range to render trend trajectory.</span>
                </div>
              ) : (
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--t-line)" vertical={false} />
                      <XAxis dataKey="dateLabel" stroke="var(--t-muted)" fontSize={10} tickLine={false} />
                      <YAxis domain={[300, 900]} stroke="var(--t-muted)" fontSize={10} tickLine={false} ticks={[300, 500, 650, 750, 850, 900]} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface-0)",
                          border: "1px solid var(--t-line)",
                          borderRadius: 8,
                          fontSize: 11,
                          boxShadow: "var(--shadow-md)",
                        }}
                      />
                      <ReferenceLine y={750} stroke={THEME.sage} strokeDasharray="4 4" label={{ value: "Prime (750+)", fill: THEME.sage, fontSize: 10, position: "insideTopRight" }} />

                      {overlayAllBureaus ? (
                        <>
                          <Line type="monotone" dataKey="CIBIL" stroke={BUREAU_COLORS.CIBIL} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                          <Line type="monotone" dataKey="Experian" stroke={BUREAU_COLORS.Experian} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                          <Line type="monotone" dataKey="CRIF" stroke={BUREAU_COLORS.CRIF} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                          <Line type="monotone" dataKey="Equifax" stroke={BUREAU_COLORS.Equifax} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                        </>
                      ) : (
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke={BUREAU_COLORS[bureau]}
                          strokeWidth={3}
                          dot={{ r: 5, fill: BUREAU_COLORS[bureau] }}
                          activeDot={{ r: 7 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          )}

          {/* TAB 4: WHAT-IF SIMULATOR */}
          {activeSubTab === "simulator" && (
            <CreditScoreSimulator
              currentScore={activeLatest ? activeLatest.score : 750}
              creditCards={ownerScopedCards}
              loans={ownerScopedLoans}
            />
          )}

          {/* TAB 5: AUDIT LOG */}
          {activeSubTab === "history" && (
            <Card style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div style={{ position: "relative", minWidth: 240 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: THEME.muted }} />
                  <input
                    className="form-input"
                    placeholder="Search bureau, score, source, notes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: 32, fontSize: 12 }}
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={13} />}
                  onClick={() => setModal({ bureau, checkDate: today(), owner: ownerFilter !== "all" ? ownerFilter : "self" })}
                >
                  Add Score Entry
                </Button>
              </div>

              {historyList.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: THEME.muted, fontSize: 12 }}>
                  No historical entries match your search criteria.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {historyList.map((s) => {
                    const grade = scoreGrade(s.score);
                    const bColor = BUREAU_COLORS[s.bureau];

                    return (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          borderRadius: 10,
                          background: "var(--surface-0)",
                          border: "1px solid var(--t-line)",
                          gap: 12,
                        }}
                      >
                        {/* Score Tag */}
                        <div
                          style={{
                            width: 56,
                            height: 48,
                            borderRadius: 8,
                            background: `color-mix(in srgb, ${grade.color} 10%, var(--surface-0))`,
                            border: `1.5px solid ${grade.color}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: grade.color }}>
                            <Prv>{s.score}</Prv>
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 800, color: bColor, textTransform: "uppercase" }}>
                            {s.bureau}
                          </span>
                        </div>

                        {/* Middle Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: THEME.ink }}>
                              {s.checkDate
                                ? (() => {
                                    const dt = new Date(s.checkDate);
                                    return !isNaN(dt.getTime())
                                      ? dt.toLocaleDateString("en-IN", {
                                          day: "2-digit",
                                          month: "long",
                                          year: "numeric",
                                        })
                                      : s.checkDate;
                                  })()
                                : "No Date"}
                            </span>
                            <Badge style={{ background: grade.bg, color: grade.color, fontWeight: 700, fontSize: 10 }}>
                              {grade.label}
                            </Badge>
                          </div>

                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span>Source: <strong style={{ color: THEME.ink }}>{s.source || "Manual"}</strong></span>
                            {s.notes && (
                              <>
                                <span>•</span>
                                <span style={{ fontStyle: "italic", color: THEME.ink }}>&ldquo;{s.notes}&rdquo;</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Owner Avatar & Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <OwnerAvatar ownerId={s.owner} size={28} />
                          <button
                            type="button"
                            onClick={() => setModal(s)}
                            style={{
                              background: "none",
                              border: "none",
                              color: THEME.muted,
                              cursor: "pointer",
                              padding: 6,
                              borderRadius: 6,
                            }}
                            title="Edit entry"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(s.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: THEME.rust,
                              cursor: "pointer",
                              padding: 6,
                              borderRadius: 6,
                            }}
                            title="Delete entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* TAB 6: DISPUTE & OMBUDSMAN GUIDE */}
          {activeSubTab === "disputes" && <BureauDisputeCenter />}
        </>
      )}

      {/* MODAL: ADD / EDIT SCORE */}
      {modal && (
        <ScoreFormModal
          initial={modal}
          onSave={saveScore}
          onClose={() => setModal(null)}
          saving={savingScore}
        />
      )}

      {/* MODAL: SMART IMPORT & CONNECT HUB */}
      {importModalOpen && (
        <SmartCreditImportModal
          onImport={saveScore}
          onClose={() => setImportModalOpen(false)}
          saving={savingScore}
        />
      )}

      {/* CONFIRM DELETE DIALOG */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete Credit Score Entry?"
          message="Are you sure you want to delete this credit score record? This action cannot be undone."
          confirmLabel="Yes, Delete Score"
          onConfirm={() => {
            deleteScore(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
