---
description: Prohibit raw emoji usage and enforce Lucide icons and clean financial typography across all UI components and email templates
globs: "**/*.{ts,tsx,js,jsx,html}"
---

# UI & UX Design System: Icon & Typography Standards

## 1. Zero Raw Emoji Rule
- **Never** use raw emoji characters (e.g. ☀️, 📊, 📈, 💡, ⚡, ⚠️, 🚨, 🎯, 🚀, 💰, 💳, 🏦, ✅, 🎉, etc.) in user interfaces, component JSX, toasts, modals, badges, headers, or email templates.
- Always replace visual cues with vector SVG icons from `lucide-react` (e.g., `<Sun />`, `<Moon />`, `<BarChart3 />`, `<TrendingUp />`, `<Lightbulb />`, `<Zap />`, `<AlertTriangle />`, `<CheckCircle2 />`, `<Shield />`, `<Target />`).

## 2. Professional Financial Design Standards
- Use high-contrast, curated theme tokens (`THEME.accent`, `THEME.sage`, `THEME.rust`, `THEME.gold`, `THEME.ink`, `THEME.muted`).
- For text badges and status indicators, use clean typographic pills or SVG icon pairings (`display: "inline-flex", alignItems: "center", gap: 5`).
- For select dropdown `<option>` elements where JSX cannot render, use clean text labels without emoji prefixes.
- For automated email reports, use clean typographic section headers and styled status tags instead of emoji glyphs.
