import { describe, it, expect } from "vitest";
import {
  POPULAR_MERCHANTS,
  CARD_PERK_RULES,
  resolveMerchant,
  rankCardsForPayment,
  generateCategoryCardMatrix,
} from "../utils/cardRewardEngine";

describe("Smart Card Reward Engine - Which Card to Use?", () => {
  const samplePortfolio = [
    {
      id: "card-hdfc-swiggy",
      issuer: "HDFC Swiggy Credit Card",
      network: "Mastercard",
      limit: 300000,
      outstanding: 25000,
      status: "active",
      last4: "1234",
    },
    {
      id: "card-icici-amazon",
      issuer: "ICICI Amazon Pay",
      network: "Visa",
      limit: 250000,
      outstanding: 10000,
      status: "active",
      last4: "5678",
    },
    {
      id: "card-sbi-cb",
      issuer: "SBI Cashback Credit Card",
      network: "Visa",
      limit: 200000,
      outstanding: 15000,
      status: "active",
      last4: "9012",
    },
    {
      id: "card-sc-ultimate",
      issuer: "Standard Chartered Ultimate",
      network: "Visa",
      limit: 500000,
      outstanding: 50000,
      status: "active",
      last4: "3456",
    },
    {
      id: "card-scapia",
      issuer: "Federal Scapia",
      network: "Visa",
      limit: 400000,
      outstanding: 5000,
      status: "active",
      last4: "7890",
    },
  ];

  it("identifies Swiggy and ranks HDFC Swiggy card as #1 with 10% cashback", () => {
    const result = rankCardsForPayment(samplePortfolio, "Swiggy", "Food & Dining", 1500);

    expect(result.merchantName).toBe("Swiggy");
    expect(result.topCard).not.toBeNull();
    expect(result.topCard?.cardName).toContain("HDFC Swiggy");
    expect(result.topCard?.returnPct).toBe(10.0);
    expect(result.topCard?.savingsInINR).toBe(150); // 10% of 1500
    expect(result.topCard?.perkType).toBe("cashback");

    // Runner ups should include SBI Cashback (5%) and SC Ultimate (3.33%)
    const sbiCb = result.rankedCards.find((c) => c.cardName.includes("SBI Cashback"));
    expect(sbiCb?.returnPct).toBe(5.0);
    expect(sbiCb?.savingsInINR).toBe(75);

    const scUlt = result.rankedCards.find((c) => c.cardName.includes("Standard Chartered Ultimate"));
    expect(scUlt?.returnPct).toBe(3.33);
  });

  it("ranks ICICI Amazon Pay as #1 for Amazon purchases with 5% unlimited cashback", () => {
    const result = rankCardsForPayment(samplePortfolio, "Amazon", "Online Shopping", 5000);

    expect(result.topCard).not.toBeNull();
    expect(result.topCard?.returnPct).toBe(5.0);
    expect(result.topCard?.savingsInINR).toBe(250); // 5% of 5000
    expect(["ICICI Amazon Pay", "SBI Cashback Credit Card"]).toContain(result.topCard?.cardName);
  });

  it("ranks Federal Scapia as #1 for international forex spends", () => {
    const result = rankCardsForPayment(samplePortfolio, "International Travel", "International Spends", 50000);

    expect(result.topCard).not.toBeNull();
    expect(result.topCard?.cardName).toContain("Federal Scapia");
    expect(result.topCard?.returnPct).toBeGreaterThanOrEqual(4.0);
  });

  it("generates an at-a-glance Category Matrix across all key everyday categories", () => {
    const matrix = generateCategoryCardMatrix(samplePortfolio);

    expect(matrix.length).toBe(8);
    const foodCat = matrix.find((m) => m.category === "Food & Dining");
    expect(foodCat).toBeDefined();
    expect(foodCat?.bestCard?.cardName).toContain("HDFC Swiggy");
    expect(foodCat?.bestCard?.returnPct).toBe(10.0);

    const travelCat = matrix.find((m) => m.category === "Travel & Flights");
    expect(travelCat?.bestCard).not.toBeNull();
  });

  it("suggests a smart market upgrade if user doesn't own the best card for a merchant", () => {
    // User only has a generic card
    const limitedPortfolio = [
      {
        id: "generic-1",
        issuer: "Basic Bank Silver Card",
        limit: 100000,
        outstanding: 0,
        status: "active",
      },
    ];

    const result = rankCardsForPayment(limitedPortfolio, "Swiggy", "Food & Dining", 2000);
    expect(result.topCard?.returnPct).toBe(1.0); // 1% fallback
    expect(result.bestMarketAlternative).not.toBeNull();
    expect(result.bestMarketAlternative?.returnPct).toBeGreaterThanOrEqual(10.0);
    expect(result.bestMarketAlternative?.savingsInINR).toBeGreaterThanOrEqual(200);
  });
});
