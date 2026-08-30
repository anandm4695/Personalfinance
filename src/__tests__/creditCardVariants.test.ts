import { describe, it, expect } from "vitest";
import { getCCDueDate } from "../utils/finance";
import type { CreditCardEntity, CardVariant, CreditCardTransaction } from "../types/finance";

describe("Credit Card Dual & Multi-Variant Account Support", () => {
  it("models Federal Bank Scapia (Visa + RuPay UPI) with 1 unified limit and statement", () => {
    const scapiaCard: CreditCardEntity = {
      id: "scapia-1",
      issuer: "Federal Scapia",
      network: "Visa",
      last4: "4589",
      limit: 500000,
      outstanding: 42500,
      billDate: 20,
      dueDay: 10,
      status: "active",
      variants: [
        {
          id: "scapia-rupay-upi",
          name: "RuPay UPI (Virtual)",
          network: "RuPay",
          last4: "8821",
          cardType: "virtual",
          status: "active",
        },
      ],
      transactions: [
        {
          id: "tx-1",
          date: "2026-08-05",
          merchant: "Flight Booking (MakeMyTrip)",
          amount: 35000,
          category: "Travel",
          variantId: "primary",
          variantName: "Primary (Visa •••• 4589)",
        },
        {
          id: "tx-2",
          date: "2026-08-10",
          merchant: "Local Tea Stall (UPI QR)",
          amount: 150,
          category: "Food",
          variantId: "scapia-rupay-upi",
          variantName: "RuPay UPI (Virtual)",
        },
        {
          id: "tx-3",
          date: "2026-08-12",
          merchant: "Grocery Mart (UPI QR)",
          amount: 7350,
          category: "Groceries",
          variantId: "scapia-rupay-upi",
          variantName: "RuPay UPI (Virtual)",
        },
      ],
    };

    expect(scapiaCard.limit).toBe(500000);
    expect(scapiaCard.variants?.length).toBe(1);
    expect(scapiaCard.variants?.[0].network).toBe("RuPay");
    expect(scapiaCard.variants?.[0].last4).toBe("8821");

    // Total transactions sum
    const totalSpent = (scapiaCard.transactions || []).reduce(
      (s, t) => s + Number(t.amount),
      0
    );
    expect(totalSpent).toBe(42500);

    // Spend breakdown by variant
    const visaSpent = (scapiaCard.transactions || [])
      .filter((t) => !t.variantId || t.variantId === "primary")
      .reduce((s, t) => s + Number(t.amount), 0);
    const rupaySpent = (scapiaCard.transactions || [])
      .filter((t) => t.variantId === "scapia-rupay-upi")
      .reduce((s, t) => s + Number(t.amount), 0);

    expect(visaSpent).toBe(35000);
    expect(rupaySpent).toBe(7500);
    expect(visaSpent + rupaySpent).toBe(42500);

    // Single due date calculation
    const dueDate = getCCDueDate(scapiaCard);
    expect(dueDate).toBeTruthy();
  });

  it("models ICICI Sapphiro (Mastercard + Amex Companion) sharing 1 limit and statement", () => {
    const sapphiroCard: CreditCardEntity = {
      id: "icici-sapphiro",
      issuer: "ICICI Sapphiro",
      network: "Mastercard",
      last4: "9102",
      limit: 800000,
      outstanding: 65000,
      billDate: 15,
      dueDay: 5,
      status: "active",
      variants: [
        {
          id: "sapphiro-amex",
          name: "Companion Amex",
          network: "Amex",
          last4: "3004",
          cardType: "physical",
          status: "active",
        },
      ],
      transactions: [
        {
          id: "tx-mc-1",
          date: "2026-08-02",
          merchant: "Apple Store",
          amount: 50000,
          category: "Electronics",
          variantId: "primary",
        },
        {
          id: "tx-amex-1",
          date: "2026-08-04",
          merchant: "Taj Dining",
          amount: 15000,
          category: "Dining",
          variantId: "sapphiro-amex",
        },
      ],
    };

    expect(sapphiroCard.limit).toBe(800000);
    expect(sapphiroCard.variants?.[0].network).toBe("Amex");
    expect(sapphiroCard.variants?.[0].last4).toBe("3004");

    // Single utilization computation (no double limit inflation)
    const utilization = (Number(sapphiroCard.outstanding) / Number(sapphiroCard.limit)) * 100;
    expect(utilization).toBe(8.125); // 65,000 / 8,00,000 * 100 = 8.125%
  });

  it("verifies metrics accounting does not inflate limit or count duplicate obligations", () => {
    const cards: CreditCardEntity[] = [
      {
        id: "c1",
        issuer: "Federal Scapia",
        network: "Visa",
        last4: "4589",
        limit: 500000,
        outstanding: 50000,
        status: "active",
        variants: [
          {
            id: "c1-rupay",
            name: "RuPay UPI",
            network: "RuPay",
            last4: "8821",
            cardType: "virtual",
          },
        ],
      },
      {
        id: "c2",
        issuer: "HDFC Regalia",
        network: "Visa",
        last4: "1234",
        limit: 300000,
        outstanding: 30000,
        status: "active",
      },
    ];

    // Total limit calculation as in useMetrics
    const totalCCLimit = cards.reduce((s, c) => s + Number(c.limit || 0), 0);
    const totalCCOutstanding = cards.reduce((s, c) => s + Number(c.outstanding || 0), 0);
    const creditUtilization = totalCCLimit > 0 ? (totalCCOutstanding / totalCCLimit) * 100 : 0;

    expect(totalCCLimit).toBe(800000); // 5L + 3L, not 5L + 5L + 3L
    expect(totalCCOutstanding).toBe(80000); // 50k + 30k
    expect(creditUtilization).toBe(10); // 80,000 / 800,000 = 10%
  });
});
