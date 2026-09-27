import React, { useState } from "react";
import { User, Phone, Tag, FileText, Sparkles, IndianRupee, Calendar, Landmark, Clock } from "lucide-react";
import { THEME } from "../../utils/constants";
import { today } from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";

const RELATIONSHIP_OPTIONS = [
  "Friend",
  "Family",
  "Relative",
  "Colleague",
  "Business Partner",
  "Neighbor",
  "Other",
];

interface InformalPersonModalProps {
  direction: "borrowed" | "lent";
  initial?: any | null;
  bankAccounts?: any[];
  onSave: (personData: any, bankTxn?: any) => Promise<void> | void;
  onClose: () => void;
  saving?: boolean;
}

export function InformalPersonModal({
  direction,
  initial = null,
  bankAccounts = [],
  onSave,
  onClose,
  saving = false,
}: InformalPersonModalProps) {
  const { familyProfiles } = useMasterData();
  const isBorrowed = direction === "borrowed";
  const personRole = isBorrowed ? "Lender (Person borrowed from)" : "Borrower (Person lent to)";
  const shortLabel = isBorrowed ? "Lender" : "Borrower";

  const [person, setPerson] = useState(initial?.person || initial?.name || "");
  const [owner, setOwner] = useState(initial?.owner || "self");
  const [relationship, setRelationship] = useState(initial?.relationship || "Friend");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [note, setNote] = useState(initial?.note || "");
  const [initialAmount, setInitialAmount] = useState<string>("");
  const [date, setDate] = useState<string>(today());
  const [dueDate, setDueDate] = useState<string>("");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [mode, setMode] = useState<string>("Bank Transfer");
  const [narration, setNarration] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedName = person.trim();
    if (!trimmedName) {
      setError(`Please enter the ${shortLabel.toLowerCase()}'s name`);
      return;
    }
    setError(null);

    const payload: any = {
      person: trimmedName,
      name: trimmedName, // For backwards compatibility
      owner,
      relationship,
      phone: phone.trim(),
      note: note.trim(),
    };

    let bankTxn: any = null;
    const initialNum = Number(initialAmount);

    // If new person, initialize tranches and payments arrays
    if (!initial) {
      payload.payments = [];
      if (initialNum > 0) {
        payload.tranches = [
          {
            id: `tr-${Date.now()}`,
            amount: initialNum,
            date: date || today(),
            ...(dueDate ? { dueDate } : {}),
            note: note.trim() || (isBorrowed ? "Initial loan received" : "Initial loan given"),
            mode,
            method: mode,
            ...(narration.trim() ? { narration: narration.trim() } : {}),
            ...(referenceNumber.trim() ? { referenceNumber: referenceNumber.trim(), reference: referenceNumber.trim() } : {}),
            ...(selectedBankId ? { bankAccountId: selectedBankId } : {}),
          },
        ];

        if (selectedBankId) {
          const selectedBank = bankAccounts.find((b: any) => b.id === selectedBankId);
          if (isBorrowed) {
            // Borrowed money received -> Credit user's bank account
            bankTxn = {
              id: `txn-${Date.now()}`,
              date: date || today(),
              amount: initialNum,
              type: "credit",
              category: "Loan Received",
              note: note.trim() || `Loan received from ${trimmedName}`,
              description: note.trim() || `Loan received from ${trimmedName} via ${mode}`,
              narration: narration.trim() || `Loan received from ${trimmedName} - Ref: ${referenceNumber.trim() || mode}`,
              referenceNumber: referenceNumber.trim() || undefined,
              accountId: selectedBankId,
              bankAccountId: selectedBankId,
              bankName: selectedBank?.bankName || "Bank",
              mode,
              owner: owner || "self",
              linkedType: "informalBorrowed",
            };
          } else {
            // Lent money disbursed -> Debit user's bank account
            bankTxn = {
              id: `txn-${Date.now()}`,
              date: date || today(),
              amount: initialNum,
              type: "debit",
              category: "Loan Given",
              note: note.trim() || `Personal loan given to ${trimmedName}`,
              description: note.trim() || `Personal loan given to ${trimmedName} via ${mode}`,
              narration: narration.trim() || `Loan given to ${trimmedName} - Ref: ${referenceNumber.trim() || mode}`,
              referenceNumber: referenceNumber.trim() || undefined,
              accountId: selectedBankId,
              bankAccountId: selectedBankId,
              bankName: selectedBank?.bankName || "Bank",
              mode,
              owner: owner || "self",
              linkedType: "informalLent",
            };
          }
        }
      } else {
        payload.tranches = [];
      }
    }

    if (bankTxn) {
      await onSave(payload, bankTxn);
    } else {
      await onSave(payload);
    }
  };

  return (
    <Modal
      title={initial ? `Edit ${shortLabel}` : `Add New ${shortLabel}`}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Helper Banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: isBorrowed
              ? "color-mix(in srgb, var(--t-rust) 8%, transparent)"
              : "color-mix(in srgb, var(--t-accent) 8%, transparent)",
            borderRadius: 8,
            border: `1px solid ${
              isBorrowed
                ? "color-mix(in srgb, var(--t-rust) 20%, transparent)"
                : "color-mix(in srgb, var(--t-accent) 20%, transparent)"
            }`,
            fontSize: 12,
            color: isBorrowed ? "var(--t-rust)" : "var(--t-accent)",
            fontWeight: 600,
          }}
        >
          <Sparkles size={16} style={{ flexShrink: 0 }} />
          <span>
            {isBorrowed
              ? "Track loans or money you have received from this person."
              : "Track personal loans or money given to this person."}
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 6,
              color: "var(--t-rust)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* Profile / Owner */}
        <Field label="Household Owner / Profile">
          <select
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--t-line)",
              background: "var(--t-card-bg)",
              color: "var(--t-ink)",
              fontSize: 13,
              outline: "none",
            }}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            {familyProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>

        {/* Person Name */}
        <Field label={`${shortLabel} Name`}>
          <div style={{ position: "relative" }}>
            <input
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--t-line)",
                background: "var(--t-card-bg)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder={`e.g. ${isBorrowed ? "Uncle Ramesh, Rohit" : "Rajesh Sharma, Priya"}`}
              value={person}
              onChange={(e) => {
                setPerson(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
            <User
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--t-muted)",
              }}
            />
          </div>
        </Field>

        {/* Grid: Relationship & Phone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Relationship">
            <div style={{ position: "relative" }}>
              <select
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--t-line)",
                  background: "var(--t-card-bg)",
                  color: "var(--t-ink)",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                {RELATIONSHIP_OPTIONS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
              <Tag
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--t-muted)",
                }}
              />
            </div>
          </Field>

          <Field label="Phone / WhatsApp (optional)">
            <div style={{ position: "relative" }}>
              <input
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--t-line)",
                  background: "var(--t-card-bg)",
                  color: "var(--t-ink)",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                type="tel"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Phone
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--t-muted)",
                }}
              />
            </div>
          </Field>
        </div>

        {/* Notes */}
        <Field label="Notes / Purpose (optional)">
          <div style={{ position: "relative" }}>
            <input
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--t-line)",
                background: "var(--t-card-bg)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="e.g. Medical emergency assistance, Home renovation"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <FileText
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--t-muted)",
              }}
            />
          </div>
        </Field>

        {/* Initial Loan Tranche (Optional - Only on Add) */}
        {!initial && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "14px",
              background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--t-line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IndianRupee size={15} color={isBorrowed ? "var(--t-rust)" : "var(--t-accent)"} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t-ink)" }}>
                Initial Loan Record (Optional)
              </span>
            </div>

            <Field label={isBorrowed ? "Initial Amount Borrowed (₹)" : "Initial Amount Lent (₹)"}>
              <div style={{ position: "relative" }}>
                <input
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 36px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--t-line)",
                    background: "var(--t-card-bg)",
                    color: "var(--t-ink)",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  type="number"
                  min="0"
                  placeholder="e.g. 50000 (leave blank to add later)"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                />
                <IndianRupee
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--t-muted)",
                  }}
                />
              </div>
            </Field>

            {Number(initialAmount) > 0 && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Transaction Date">
                    <div style={{ position: "relative" }}>
                      <input
                        style={{
                          width: "100%",
                          padding: "10px 12px 10px 36px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--t-line)",
                          background: "var(--t-card-bg)",
                          color: "var(--t-ink)",
                          fontSize: 13,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                      <Calendar
                        size={15}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--t-muted)",
                        }}
                      />
                    </div>
                  </Field>

                  <Field label="Repayment Due Date (optional)">
                    <div style={{ position: "relative" }}>
                      <input
                        style={{
                          width: "100%",
                          padding: "10px 12px 10px 36px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--t-line)",
                          background: "var(--t-card-bg)",
                          color: "var(--t-ink)",
                          fontSize: 13,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                      <Clock
                        size={15}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--t-muted)",
                        }}
                      />
                    </div>
                  </Field>
                </div>

                {bankAccounts.length > 0 && (
                  <>
                    <Field label={isBorrowed ? "Auto-Credit Bank Account (optional)" : "Auto-Debit Bank Account (optional)"}>
                      <div style={{ position: "relative" }}>
                        <select
                          style={{
                            width: "100%",
                            padding: "10px 12px 10px 36px",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--t-line)",
                            background: "var(--t-card-bg)",
                            color: "var(--t-ink)",
                            fontSize: 13,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                          value={selectedBankId}
                          onChange={(e) => setSelectedBankId(e.target.value)}
                        >
                          <option value="">— Do not record in bank account —</option>
                          {bankAccounts.map((acc: any) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.bankName} {acc.accountNumber ? `(••••${acc.accountNumber.slice(-4)})` : ""}
                            </option>
                          ))}
                        </select>
                        <Landmark
                          size={15}
                          style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--t-muted)",
                          }}
                        />
                      </div>
                      {selectedBankId && (
                        <div
                          style={{
                            fontSize: 11,
                            color: THEME.sage,
                            marginTop: 6,
                            fontWeight: 600,
                          }}
                        >
                          ✓ Will automatically create a {isBorrowed ? "credit" : "debit"} transaction in Banks & Transactions
                        </div>
                      )}
                    </Field>

                    {selectedBankId && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          padding: "12px 14px",
                          background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
                          borderRadius: "var(--radius-md)",
                          border: "1px dashed var(--t-line)",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Bank Ledger Details
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Payment Mode">
                            <select
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--t-line)",
                                background: "var(--t-card-bg)",
                                color: "var(--t-ink)",
                                fontSize: 13,
                                outline: "none",
                              }}
                              value={mode}
                              onChange={(e) => setMode(e.target.value)}
                            >
                              <option value="Bank Transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                              <option value="UPI">UPI</option>
                              <option value="Cheque">Cheque</option>
                              <option value="Cash">Cash</option>
                              <option value="Card">Card</option>
                              <option value="Other">Other</option>
                            </select>
                          </Field>

                          <Field label="Reference / Cheque / UTR No.">
                            <input
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--t-line)",
                                background: "var(--t-card-bg)",
                                color: "var(--t-ink)",
                                fontSize: 13,
                                outline: "none",
                              }}
                              placeholder="e.g. Cheque #4521 / UTR No."
                              value={referenceNumber}
                              onChange={(e) => setReferenceNumber(e.target.value)}
                            />
                          </Field>
                        </div>

                        <Field label="Narration / Description (for Bank Ledger)">
                          <input
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--t-line)",
                              background: "var(--t-card-bg)",
                              color: "var(--t-ink)",
                              fontSize: 13,
                              outline: "none",
                            }}
                            placeholder="e.g. IMPS/P2A/524312441/Personal Loan"
                            value={narration}
                            onChange={(e) => setNarration(e.target.value)}
                          />
                        </Field>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        <ModalActions
          onSave={handleSubmit}
          onClose={onClose}
          saveLabel={initial ? "Save Changes" : `Add ${shortLabel}`}
          disabled={saving || !person.trim()}
          loading={saving}
        />
      </div>
    </Modal>
  );
}
