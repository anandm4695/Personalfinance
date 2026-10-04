/**
 * Comprehensive Indian Credit Bureau Report & Statement Parser
 * Supports: TransUnion CIBIL, Experian India, CRIF High Mark, Equifax India,
 * OneScore, CRED, Paisabazaar, and SMS / Email text alerts.
 */

import { BureauType, CreditScoreEntry } from "../components/tabs/CreditScoreTab";
import { uid, today } from "./finance";

export interface ParsedCreditReport {
  bureau: BureauType;
  score: number;
  checkDate: string;
  source: string;
  confidence: number;
  owner?: string;
  notes: string;
  summary?: {
    totalAccounts?: number;
    activeAccounts?: number;
    closedAccounts?: number;
    totalLimit?: number;
    totalOutstanding?: number;
    overdueAmount?: number;
    recentInquiries?: number;
  };
  accounts?: Array<{
    bank: string;
    type: string;
    accountNo?: string;
    balance?: number;
    limit?: number;
    status?: string;
  }>;
}

/**
 * Parses raw text extracted from a Credit Report PDF, statement text, or SMS alert.
 */
export function parseCreditReportText(text: string, defaultOwner: string = "self"): ParsedCreditReport | null {
  if (!text || text.trim().length < 5) return null;

  const normalized = text.replace(/\r\n/g, "\n");

  // 1. Detect Bureau
  let bureau: BureauType = "CIBIL";
  if (/experian/i.test(normalized)) {
    bureau = "Experian";
  } else if (/crif|high\s*mark/i.test(normalized)) {
    bureau = "CRIF";
  } else if (/equifax/i.test(normalized)) {
    bureau = "Equifax";
  } else if (/cibil|transunion/i.test(normalized)) {
    bureau = "CIBIL";
  }

  // 2. Detect Source
  let source = `${bureau} Direct`;
  if (/onescore/i.test(normalized)) source = "OneScore";
  else if (/cred/i.test(normalized)) source = "CRED";
  else if (/paisabazaar/i.test(normalized)) source = "Paisabazaar";
  else if (/hdfc|icici|sbi|axis|kotak/i.test(normalized)) source = "BankApp";

  // 3. Extract Score (300 to 900)
  let score: number | null = null;

  const scorePatterns = [
    /(?:cibil|experian|crif|equifax|credit|onescore|cred)?\s*score\s*(?:is|:|is:|=|equals)?\s*[:\s]*([3-9]\d{2})\b/i,
    /\b([3-9]\d{2})\s*\/\s*900\b/i,
    /\bscore\s*:\s*([3-9]\d{2})\b/i,
    /\bscore\s+([3-9]\d{2})\b/i,
    /\b([3-9]\d{2})\s*(?:out of 900|pts|points)\b/i,
    /(?:transunion|cibil|experian|crif|equifax)[\s\S]{1,40}\b([3-9]\d{2})\b/i,
  ];

  for (const pat of scorePatterns) {
    const match = normalized.match(pat);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (val >= 300 && val <= 900) {
        score = val;
        break;
      }
    }
  }

  // Fallback: search for standalone 3-digit numbers between 300 and 900 near "score" keyword
  if (!score) {
    const scoreIdx = normalized.toLowerCase().indexOf("score");
    if (scoreIdx !== -1) {
      const vicinity = normalized.slice(Math.max(0, scoreIdx - 40), scoreIdx + 120);
      const m = vicinity.match(/\b([3-9]\d{2})\b/);
      if (m && m[1]) {
        const val = parseInt(m[1], 10);
        if (val >= 300 && val <= 900) {
          score = val;
        }
      }
    }
  }

  if (!score) return null;

  // 4. Extract Date
  let checkDate = today();
  const datePatterns = [
    /(?:date\s*of\s*report|report\s*date|as\s*of|generated\s*on|dated|as\s*on|checked\s*on)\s*[:\s]*(\d{1,2}[-/.\s]+[A-Za-z]{3,9}[-/.\s]+\d{2,4}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /\b(\d{1,2}[-/.\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/.\s]+\d{2,4})\b/i,
    /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/,
    /\b(\d{4}-\d{2}-\d{2})\b/,
  ];

  for (const pat of datePatterns) {
    const match = normalized.match(pat);
    if (match && match[1]) {
      const parsed = parseFlexibleDate(match[1]);
      if (parsed) {
        checkDate = parsed;
        break;
      }
    }
  }

  // 5. Extract Summary Accounts & Inquiries metadata
  const summary: ParsedCreditReport["summary"] = {};

  const totalAccMatch = normalized.match(/(?:total\s*accounts?|number\s*of\s*accounts?)\s*[:\s]*(\d+)/i);
  if (totalAccMatch) summary.totalAccounts = parseInt(totalAccMatch[1], 10);

  const activeAccMatch = normalized.match(/(?:active\s*accounts?|open\s*accounts?)\s*[:\s]*(\d+)/i);
  if (activeAccMatch) summary.activeAccounts = parseInt(activeAccMatch[1], 10);

  const closedAccMatch = normalized.match(/(?:closed\s*accounts?)\s*[:\s]*(\d+)/i);
  if (closedAccMatch) summary.closedAccounts = parseInt(closedAccMatch[1], 10);

  const inquiriesMatch = normalized.match(/(?:enquiries|inquiries|recent\s*inquiries)\s*(?:in\s*(?:last\s*)?\d+\s*days?)?\s*[:\s]*(\d+)/i);
  if (inquiriesMatch) summary.recentInquiries = parseInt(inquiriesMatch[1], 10);

  const limitMatch = normalized.match(/(?:total\s*(?:credit\s*)?limit|sanctioned\s*amount)\s*[:\s]*(?:₹|INR|Rs\.?)?\s*([\d,]+)/i);
  if (limitMatch) summary.totalLimit = parseFloat(limitMatch[1].replace(/,/g, ""));

  const balanceMatch = normalized.match(/(?:current\s*balance|total\s*outstanding|balance)\s*[:\s]*(?:₹|INR|Rs\.?)?\s*([\d,]+)/i);
  if (balanceMatch) summary.totalOutstanding = parseFloat(balanceMatch[1].replace(/,/g, ""));

  const notesParts: string[] = [];
  if (summary.totalAccounts) notesParts.push(`${summary.totalAccounts} total accounts`);
  if (summary.recentInquiries !== undefined) notesParts.push(`${summary.recentInquiries} inquiries`);
  if (summary.totalOutstanding) notesParts.push(`₹${summary.totalOutstanding.toLocaleString("en-IN")} outstanding`);

  const notes = notesParts.length > 0 ? `Report Import (${notesParts.join(", ")})` : `Imported from ${source}`;

  return {
    bureau,
    score,
    checkDate,
    source,
    confidence: score ? 0.95 : 0,
    owner: defaultOwner,
    notes,
    summary,
  };
}

/**
 * Flexible date parser for Indian formats (DD/MM/YYYY, DD-Mon-YYYY, YYYY-MM-DD)
 */
function parseFlexibleDate(dateStr: string): string | null {
  try {
    const s = dateStr.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (dmy) {
      let yr = parseInt(dmy[3], 10);
      if (yr < 100) yr += 2000;
      const mo = String(parseInt(dmy[2], 10)).padStart(2, "0");
      const day = String(parseInt(dmy[1], 10)).padStart(2, "0");
      return `${yr}-${mo}-${day}`;
    }

    // 02-Oct-2026 or 02 Oct 2026 or 02-October-2026
    const monthNames: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const namedMonth = s.match(/^(\d{1,2})[-/\s]+([A-Za-z]{3,9})[-/\s]+(\d{2,4})$/);
    if (namedMonth) {
      const d = String(parseInt(namedMonth[1], 10)).padStart(2, "0");
      const mKey = namedMonth[2].slice(0, 3).toLowerCase();
      const m = monthNames[mKey] || "01";
      let yr = parseInt(namedMonth[3], 10);
      if (yr < 100) yr += 2000;
      return `${yr}-${m}-${d}`;
    }

    // Fallback date constructor
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const yr = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, "0");
      const da = String(dt.getDate()).padStart(2, "0");
      return `${yr}-${mo}-${da}`;
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Converts a parsed report into a full CreditScoreEntry
 */
export function parsedReportToEntry(parsed: ParsedCreditReport): CreditScoreEntry {
  return {
    id: uid(),
    score: parsed.score,
    bureau: parsed.bureau,
    checkDate: parsed.checkDate,
    owner: parsed.owner || "self",
    source: parsed.source,
    notes: parsed.notes,
  };
}
