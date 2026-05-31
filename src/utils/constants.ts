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
  // Original
  blue:    { light: "#4F46E5", dark: "#818CF8",  label: "Indigo",     dot: "#4F46E5" },
  purple:  { light: "#7C3AED", dark: "#A78BFA",  label: "Violet",     dot: "#7C3AED" },
  emerald: { light: "#059669", dark: "#34D399",  label: "Emerald",    dot: "#059669" },
  amber:   { light: "#D97706", dark: "#FBBF24",  label: "Amber",      dot: "#D97706" },
  rose:    { light: "#E11D48", dark: "#FB7185",  label: "Rose",       dot: "#E11D48" },
  indigo:  { light: "#2563EB", dark: "#60A5FA",  label: "Ocean Blue", dot: "#2563EB" },
  // Corporate / professional additions
  navy:    { light: "#1E40AF", dark: "#93C5FD",  label: "Navy",       dot: "#1E40AF" },
  teal:    { light: "#0D9488", dark: "#5EEAD4",  label: "Teal",       dot: "#0D9488" },
  sky:     { light: "#0284C7", dark: "#38BDF8",  label: "Sky Blue",   dot: "#0284C7" },
  forest:  { light: "#15803D", dark: "#86EFAC",  label: "Forest",     dot: "#15803D" },
  crimson: { light: "#B91C1C", dark: "#FCA5A5",  label: "Crimson",    dot: "#B91C1C" },
};

// Named theme presets — each sets darkMode + accentKey + fontKey together.
// These are the "one-click" theme options shown at the top of Appearance settings.
export const THEME_PRESETS = [
  {
    id: "classic",
    label: "Classic",
    description: "Clean indigo on white",
    darkMode: false, accentKey: "blue", fontKey: "inter",
    bgLight: "#F8FAFC", bgDark: "#F8FAFC", accentDot: "#4F46E5",
  },
  {
    id: "corporate",
    label: "Corporate",
    description: "Deep navy — executive standard",
    darkMode: false, accentKey: "navy", fontKey: "inter",
    bgLight: "#F0F4F8", bgDark: "#F0F4F8", accentDot: "#1E40AF",
  },
  {
    id: "bloomberg",
    label: "Bloomberg",
    description: "Dark terminal, sky-blue data",
    darkMode: true, accentKey: "sky", fontKey: "inter",
    bgLight: "#0B0F1A", bgDark: "#0B0F1A", accentDot: "#0284C7",
  },
  {
    id: "goldman",
    label: "Goldman",
    description: "Premium dark, gold accent",
    darkMode: true, accentKey: "amber", fontKey: "inter",
    bgLight: "#0C0F14", bgDark: "#0C0F14", accentDot: "#D97706",
  },
  {
    id: "executive",
    label: "Executive",
    description: "Light mode with teal precision",
    darkMode: false, accentKey: "teal", fontKey: "inter",
    bgLight: "#F0FAFA", bgDark: "#F0FAFA", accentDot: "#0D9488",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep dark, smooth indigo",
    darkMode: true, accentKey: "purple", fontKey: "outfit",
    bgLight: "#0D0D1A", bgDark: "#0D0D1A", accentDot: "#7C3AED",
  },
  {
    id: "evergreen",
    label: "Evergreen",
    description: "Calm forest green, wealth-first",
    darkMode: false, accentKey: "forest", fontKey: "outfit",
    bgLight: "#F0FAF4", bgDark: "#F0FAF4", accentDot: "#15803D",
  },
  {
    id: "carbon",
    label: "Carbon",
    description: "Minimal dark, sharp Roboto type",
    darkMode: true, accentKey: "indigo", fontKey: "roboto",
    bgLight: "#111318", bgDark: "#111318", accentDot: "#2563EB",
  },
];

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
