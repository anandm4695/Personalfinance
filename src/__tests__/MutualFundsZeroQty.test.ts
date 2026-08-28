import { describe, it, expect } from "vitest";

describe("Mutual Funds Sell & Zero-Quantity Handling", () => {
  it("consumes full lot accurately under floating-point FIFO multi-lot sells", () => {
    const lots = [
      { id: "l1", units: 92.898, buyNav: 10.764, buyDate: "2021-12-30" },
      { id: "l2", units: 99.875, buyNav: 10.012, buyDate: "2022-01-31" },
      { id: "l3", units: 101.343, buyNav: 9.867, buyDate: "2022-03-02" },
      { id: "l4", units: 96.558, buyNav: 10.356, buyDate: "2022-03-29" },
      { id: "l5", units: 102.527, buyNav: 9.753, buyDate: "2022-04-29" },
      { id: "l6", units: 102.981, buyNav: 9.71, buyDate: "2022-05-30" },
    ];

    const totalUnits = lots.reduce((s, l) => s + Number(l.units), 0);
    // 596.182
    const sellUnitsNum = totalUnits;
    const sellNavNum = 10.46;

    type MFAlloc = {
      lot: any;
      consume: number;
      buyNav: number;
      pnl: number;
      fullyConsumed: boolean;
    };

    const sortedLots = [...lots].sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());
    const result: MFAlloc[] = [];
    let remaining = Math.abs(sellUnitsNum - totalUnits) <= 0.0001 ? totalUnits : sellUnitsNum;

    for (const lot of sortedLots) {
      if (remaining <= 0.00001) break;
      const available = Number(lot.units) || 0;
      if (available <= 0.00001) continue;
      const isFull = remaining >= available - 0.0001;
      const consume = isFull ? available : Math.min(available, remaining);
      result.push({
        lot,
        consume,
        buyNav: lot.buyNav,
        pnl: (sellNavNum - lot.buyNav) * consume,
        fullyConsumed: isFull || consume >= available - 0.0001,
      });
      remaining -= consume;
    }

    expect(result.length).toBe(6);
    expect(result.every((a) => a.fullyConsumed)).toBe(true);
    expect(result[5].consume).toBe(102.981);
    expect(result[5].fullyConsumed).toBe(true);

    // Verify remaining after each lot
    result.forEach((alloc) => {
      const rem = Number(alloc.lot.units) - alloc.consume;
      const isRemoved = alloc.fullyConsumed || rem <= 0.0001;
      expect(isRemoved).toBe(true);
    });
  });

  it("filters out zero and sub-epsilon quantity lots from active portfolio", () => {
    const rawHoldings = [
      { id: "m1", name: "Mirae Asset S&P 500", units: "4999.75", buyNav: "10.00" },
      { id: "m2", name: "HDFC Developed World", units: "1.4210854715202e-14", buyNav: "9.71" },
      { id: "m3", name: "HDFC Developed World", units: "0", buyNav: "9.71" },
      { id: "m4", name: "Axis Bluechip", units: "500", buyNav: "40.00" },
    ];

    const activeItems = rawHoldings.filter((m) => (Number(m.units) || 0) > 0.0001);
    expect(activeItems.length).toBe(2);
    expect(activeItems.map((m) => m.id)).toEqual(["m1", "m4"]);
  });
});
