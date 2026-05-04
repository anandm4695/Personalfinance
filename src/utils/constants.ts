export const THEME = {
  ink: "var(--t-ink)",
  paper: "var(--t-paper)",
  accent: "var(--t-accent)",
  gold: "var(--t-gold)",
  sage: "var(--t-sage)",
  rust: "var(--t-rust)",
  muted: "var(--t-muted)",
  line: "var(--t-line)",
  darkInk: "var(--t-darkInk)",
};

export const ACCENT_PALETTES = {
  blue: { light: "#4F46E5", dark: "#818CF8", label: "Indigo", dot: "#4F46E5" },
  purple: { light: "#7C3AED", dark: "#A78BFA", label: "Violet", dot: "#7C3AED" },
  emerald: { light: "#059669", dark: "#34D399", label: "Emerald", dot: "#059669" },
  amber: { light: "#D97706", dark: "#FBBF24", label: "Amber", dot: "#D97706" },
  rose: { light: "#E11D48", dark: "#FB7185", label: "Rose", dot: "#E11D48" },
  indigo: { light: "#2563EB", dark: "#60A5FA", label: "Ocean Blue", dot: "#2563EB" },
};

export const DENSITY = {
  compact: { cardPad: 16, gap: 12, fontSize: 13, sectionGap: 20 },
  normal: { cardPad: 24, gap: 16, fontSize: 14, sectionGap: 32 },
  comfortable: { cardPad: 32, gap: 24, fontSize: 15, sectionGap: 40 },
};

export const LIGHT_VARS: Record<string, string> = {
  "--t-ink": "#0F172A",
  "--t-paper": "#F8FAFC",
  "--t-accent": "#4F46E5",
  "--t-gold": "#D97706",
  "--t-sage": "#059669",
  "--t-rust": "#DC2626",
  "--t-muted": "#64748B",
  "--t-line": "#E2E8F0",
  "--t-darkInk": "#FFFFFF",
};

export const DARK_VARS: Record<string, string> = {
  "--t-ink": "#E2E8F0",
  "--t-paper": "#0B0F1A",
  "--t-accent": "#818CF8",
  "--t-gold": "#FBBF24",
  "--t-sage": "#34D399",
  "--t-rust": "#FB7185",
  "--t-muted": "#94A3B8",
  "--t-line": "#1E293B",
  "--t-darkInk": "#0F172A",
};

export const PIE_COLORS = [
  "#4F46E5",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#EA580C",
  "#2563EB",
];

export const STORAGE_KEY = "finance_dashboard_v1";

export const PROFILES = [
  { id: "self", name: "Self" },
  { id: "wife", name: "Wife" },
  { id: "daughter", name: "Daughter" },
  { id: "huf", name: "HUF" }
];
