import { describe, it, expect } from "vitest";
import { getHoldingMonths, isLongTerm } from "../components/tabs/CapitalGainsTab";

describe("CapitalGainsTab holding-period math", () => {
  describe("getHoldingMonths — day-of-month aware month diff", () => {
    it("does not overcount when sell day-of-month is earlier than buy day-of-month", () => {
      // Bug: the old implementation delegated to the shared monthsBetween()
      // helper, which only diffs (year, month) and ignores the day — it
      // returned 12 months here even though only ~11mo 26d actually elapsed.
      expect(getHoldingMonths("2023-02-15", "2024-02-10")).toBe(11);
    });

    it("counts exactly 12 complete months on the anniversary date", () => {
      expect(getHoldingMonths("2023-01-15", "2024-01-15")).toBe(12);
    });

    it("counts 12 months the day after the anniversary", () => {
      expect(getHoldingMonths("2023-01-15", "2024-01-16")).toBe(12);
    });
  });

  describe("isLongTerm — Section 2(42A) 'more than N months' rule", () => {
    it("classifies a sale exactly on the 12-month anniversary as short-term (not long-term)", () => {
      // Held for exactly 12 months = "not more than 12 months" = STCG.
      expect(isLongTerm("2023-01-15", "2024-01-15", 12)).toBe(false);
    });

    it("classifies a sale one day after the 12-month anniversary as long-term", () => {
      expect(isLongTerm("2023-01-15", "2024-01-16", 12)).toBe(true);
    });

    it("classifies a sale one day before the 12-month anniversary as short-term", () => {
      expect(isLongTerm("2023-01-15", "2024-01-14", 12)).toBe(false);
    });

    it("applies the 36-month threshold correctly for pre-Apr-2023 debt funds", () => {
      expect(isLongTerm("2021-01-15", "2024-01-15", 36)).toBe(false); // exactly 36mo -> STCG
      expect(isLongTerm("2021-01-15", "2024-01-16", 36)).toBe(true); // 36mo + 1d -> LTCG
    });

    it("returns false for missing dates instead of throwing", () => {
      expect(isLongTerm("", "2024-01-15", 12)).toBe(false);
      expect(isLongTerm("2023-01-15", "", 12)).toBe(false);
    });
  });
});
