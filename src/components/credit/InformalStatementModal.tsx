/* eslint-disable */
import React, { useState } from "react";
import {
  MessageSquare,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Phone,
  Calendar,
  IndianRupee,
  Clock,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Modal } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Money } from "../ui/Money";

interface InformalStatementModalProps {
  direction: "borrowed" | "lent";
  person: any;
  onClose: () => void;
}

export function InformalStatementModal({
  direction,
  person,
  onClose,
}: InformalStatementModalProps) {
  const isBorrowed = direction === "borrowed";
  const personName = person?.person || person?.name || (isBorrowed ? "Lender" : "Borrower");

  const tranches: any[] = person?.tranches || [];
  const payments: any[] = person?.payments || [];
  const totalT = tranches.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const totalP = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const outstanding = Math.max(0, totalT - totalP);

  const [tone, setTone] = useState<"friendly" | "formal" | "urgent" | "statement">(
    isBorrowed ? "statement" : "friendly"
  );
  const [upiId, setUpiId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Next due date if any
  const nextDueDate = tranches
    .map((t: any) => t.dueDate)
    .filter(Boolean)
    .sort()[0];
  const dueDateStr = nextDueDate
    ? new Date(nextDueDate + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const isOverdue = nextDueDate && new Date(nextDueDate + "T00:00:00") < new Date();

  const fmtD = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const generateStatementText = () => {
    let text = `*STATEMENT OF ACCOUNT*\n`;
    text += `*Party:* ${personName}\n`;
    text += `*Date:* ${new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}\n\n`;

    text += `*Summary:*\n`;
    text += `• Total Principal (${isBorrowed ? "Received" : "Lent"}): ${fmtINR(totalT)}\n`;
    text += `• Total Repaid: ${fmtINR(totalP)}\n`;
    text += `• *Current Balance:* ${fmtINR(outstanding)}\n\n`;

    if (tranches.length > 0) {
      text += isBorrowed ? `*Borrowings / Loans Received:*\n` : `*Loans Given History:*\n`;
      tranches.forEach((t: any, idx: number) => {
        text += `${idx + 1}. ${fmtD(t.date)}: ${fmtINR(t.amount)}${
          t.note ? ` (${t.note})` : ""
        }${t.dueDate ? ` [Due: ${fmtD(t.dueDate)}]` : ""}\n`;
      });
      text += `\n`;
    }

    if (payments.length > 0) {
      text += `*Payments History:*\n`;
      payments.forEach((p: any, idx: number) => {
        text += `${idx + 1}. ${fmtD(p.date)}: ${fmtINR(p.amount)}${
          p.method ? ` via ${p.method}` : ""
        }${p.note ? ` (${p.note})` : ""}\n`;
      });
      text += `\n`;
    }

    if (outstanding > 0) {
      text += `*Outstanding Settlement:* ${fmtINR(outstanding)}\n`;
      if (dueDateStr) text += `*Due Date:* ${dueDateStr}\n`;
      if (!isBorrowed && upiId.trim()) {
        text += `\n*UPI Payment ID:* ${upiId.trim()}\n`;
      }
    } else {
      text += `*Account is fully settled and cleared.*\n`;
    }

    return text;
  };

  const generateMessage = () => {
    if (tone === "statement") {
      return generateStatementText();
    }

    const upiText = !isBorrowed && upiId.trim() ? `\n\nYou can pay directly via UPI to: ${upiId.trim()}` : "";
    const dueText = dueDateStr ? `which was due on ${dueDateStr}` : "as agreed";

    if (isBorrowed) {
      // User borrowed from person -> sending payment update/confirmation
      if (tone === "friendly") {
        return (
          `Hi ${personName}, hope you're doing well! Sharing a quick update on our loan account. ` +
          `Total received: ${fmtINR(totalT)}, Total repaid: ${fmtINR(totalP)}. ` +
          `Remaining balance to you: ${fmtINR(outstanding)}. Will keep you posted on the next repayment.\n\nThanks!`
        );
      } else {
        return (
          `Dear ${personName},\n\nPlease find the current status of the loan account:\n` +
          `• Principal Borrowed: ${fmtINR(totalT)}\n` +
          `• Total Repaid: ${fmtINR(totalP)}\n` +
          `• Net Outstanding Balance: ${fmtINR(outstanding)}\n\n` +
          `Thank you for your patience.`
        );
      }
    } else {
      // User lent to person -> sending friendly/formal/urgent reminder
      if (tone === "friendly") {
        return (
          `Hi ${personName}, hope you're doing well! Just a friendly reminder regarding the pending balance of ${fmtINR(
            outstanding
          )} ${dueText}. Whenever convenient, please arrange for the repayment.${upiText}\n\nThanks!`
        );
      } else if (tone === "formal") {
        return (
          `Dear ${personName},\n\nThis is a gentle reminder regarding the personal loan balance of ${fmtINR(
            outstanding
          )} ${dueText}. Please let me know when you can process the settlement.${upiText}\n\nWarm regards.`
        );
      } else {
        return (
          `Hi ${personName}, please note that your loan balance of ${fmtINR(
            outstanding
          )} is overdue (${dueDateStr || "past agreed date"}). Kindly prioritize settling this amount at the earliest or let me know a firm payment date.${upiText}\n\nThank you.`
        );
      }
    }
  };

  const messageText = generateMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(messageText);
    const phone = (person?.phone || "").replace(/[^0-9]/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <Modal title={`Statement & Reminder — ${personName}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Loan Context */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            background: "color-mix(in srgb, var(--surface-1) 60%, transparent)",
            borderRadius: 10,
            border: `1px solid var(--t-line)`,
          }}
        >
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--t-muted)" }}>
              {isBorrowed ? "Balance You Owe" : "Balance Owed To You"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
                color: outstanding > 0 ? (isBorrowed ? "var(--t-rust)" : "var(--t-accent)") : "var(--t-sage)",
                fontVariantNumeric: "tabular-nums",
                marginTop: 2,
              }}
            >
              <Money value={outstanding} variant="full" />
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--t-muted)" }}>
              {isOverdue ? "Overdue Target" : "Due Date"}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: isOverdue ? "var(--t-rust)" : "var(--t-ink)",
                marginTop: 2,
              }}
            >
              {dueDateStr || "No date set"}
            </div>
          </div>
        </div>

        {/* Tone Selector */}
        <Field label="Statement / Message Format">
          <div style={{ display: "grid", gridTemplateColumns: isBorrowed ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 8 }}>
            {!isBorrowed && (
              <>
                <button
                  type="button"
                  onClick={() => setTone("friendly")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${
                      tone === "friendly" ? "var(--t-accent)" : "var(--t-line)"
                    }`,
                    background:
                      tone === "friendly"
                        ? "color-mix(in srgb, var(--t-accent) 12%, transparent)"
                        : "var(--t-card-bg)",
                    color: tone === "friendly" ? "var(--t-accent)" : "var(--t-ink)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Friendly
                </button>
                <button
                  type="button"
                  onClick={() => setTone("formal")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${
                      tone === "formal" ? "var(--t-accent)" : "var(--t-line)"
                    }`,
                    background:
                      tone === "formal"
                        ? "color-mix(in srgb, var(--t-accent) 12%, transparent)"
                        : "var(--t-card-bg)",
                    color: tone === "formal" ? "var(--t-accent)" : "var(--t-ink)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Formal
                </button>
                <button
                  type="button"
                  onClick={() => setTone("urgent")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${
                      tone === "urgent" ? "var(--t-rust)" : "var(--t-line)"
                    }`,
                    background:
                      tone === "urgent"
                        ? "color-mix(in srgb, var(--t-rust) 12%, transparent)"
                        : "var(--t-card-bg)",
                    color: tone === "urgent" ? "var(--t-rust)" : "var(--t-ink)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Urgent
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setTone("statement")}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${
                  tone === "statement" ? "var(--t-sage)" : "var(--t-line)"
                }`,
                background:
                  tone === "statement"
                    ? "color-mix(in srgb, var(--t-sage) 12%, transparent)"
                    : "var(--t-card-bg)",
                color: tone === "statement" ? "var(--t-sage)" : "var(--t-ink)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Full Ledger
            </button>
          </div>
        </Field>

        {/* UPI ID input for borrower collections */}
        {!isBorrowed && (
          <Field label="Your UPI ID (optional for payment link)">
            <input
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--t-line)",
                background: "var(--t-card-bg)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="e.g. yourname@okaxis or yourname@okhdfcbank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </Field>
        )}

        {/* Message Preview */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--t-muted)",
              marginBottom: 6,
            }}
          >
            Message Preview
          </div>
          <textarea
            readOnly
            rows={7}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--t-line)",
              background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
              color: "var(--t-ink)",
              fontSize: 12,
              fontFamily: "monospace",
              lineHeight: 1.5,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
            value={messageText}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid var(--t-line)",
              background: "var(--t-card-bg)",
              color: "var(--t-ink)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={15} color="var(--t-sage)" /> : <Copy size={15} />}
            {copied ? "Copied to Clipboard!" : "Copy Statement"}
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#25D366",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <MessageSquare size={15} />
            Share on WhatsApp
          </button>
        </div>
      </div>
    </Modal>
  );
}
