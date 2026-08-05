// Single source of truth for Indian market benchmark returns, consumed by both
// DematTab ("Portfolio vs Benchmark") and PerformanceBenchmarkTab. These are
// illustrative long-run averages, not live index data (no historical index-return
// API is wired up) — every consumer must surface BENCHMARK_DATA_ASOF next to the
// numbers so they never read as authoritative live data. Previously each tab kept
// its own hardcoded copy of "Nifty 50 1Y return" etc. and the two had drifted to
// contradictory values (15% vs 8.5%) — keep this the only place these are defined.
export const BENCHMARK_DATA_ASOF = "Mar 2026";

export const INDEX_BENCHMARKS = {
  nifty50: { label: "Nifty 50", "1Y": 8.5, "3Y": 11.2, "5Y": 14.8, "10Y": 12.1 },
  sensex: { label: "Sensex", "1Y": 8.2, "3Y": 10.9, "5Y": 14.5, "10Y": 12.0 },
  niftyMidcap: { label: "Nifty Midcap", "1Y": 15.3, "3Y": 18.7, "5Y": 19.2, "10Y": 16.5 },
  niftySmallcap: { label: "Nifty Smallcap", "1Y": 12.1, "3Y": 20.5, "5Y": 18.9, "10Y": 15.8 },
};

export const OTHER_BENCHMARKS = {
  fdRate: { label: "FD Rate (SBI)", "1Y": 7.1, "3Y": 6.5, "5Y": 6.8 },
  inflation: { label: "Inflation (CPI)", "1Y": 5.5, "3Y": 5.8, "5Y": 5.5 },
  gold: { label: "Gold", "1Y": 18, "3Y": 13, "5Y": 12 },
  ppf: { label: "PPF Rate", "1Y": 7.1, "3Y": 7.1, "5Y": 7.6 },
};
