# UI/UX Audit — 2026 Modernization (Step 1)

**Scope:** Read-only audit. No code was changed to produce this document.
**Date:** 2026-07-21
**Branch:** `main` (working tree clean; `ui-refresh-2026` branch not yet created — that's Step 3)

## 0. Headline finding

This app is **already substantially more modern than a typical legacy React finance app**. It is not a CRA-era relic that needs a ground-up redesign — it has a mature CSS custom-property token system, glassmorphism, a 12-column bento dashboard grid, a real command palette, 10 accent themes, dark/light mode, framer-motion on the auth screen, and a branded loading screen. The work here is closer to **consolidation, consistency, and filling specific gaps** than "modernize a dated UI."

The honest gaps are specific and listed below — not vague "make it feel more 2026" hand-waving.

---

## 1. Stack & architecture snapshot

- **Framework:** React 18.2 + TypeScript 5.9, bundled with **Vite** (migrated off CRA — `package.json` scripts are `vite`/`vite build`/`vite preview`; despite this, some old naming like `REACT_APP_*` env vars and the CRA-era `.env.example` docs survive as legacy naming).
- **Styling:** Hand-written `src/styles.css` (2,801 lines) using CSS custom properties (`--t-*`, `--shadow-*`, `--radius-*`, `--space-*`, `--ease-*`). **No Tailwind, no CSS-in-JS library** — components use plain inline `style={}` objects plus shared utility classes. This is a deliberate, consistent choice across the whole codebase, not something to migrate away from.
- **State:** No Redux/Zustand — a single large state object lives in `src/App.tsx` (~5,139 lines), persisted to `localStorage` (`finance_dashboard_v1`) and optionally synced to Supabase (`user_state` table) when `REACT_APP_SUPABASE_*` env vars are set. `isDemo` flag drives a first-visit demo-data experience.
- **Routing:** No React Router — a single `tab`/`subTab` state pair drives which of **82 nav destinations** (6 groups) renders. URLs do not reflect the current tab (no deep links today — worth knowing before any nav restructuring, since "preserve route URLs" is moot here: there's only one URL).
- **Components:** `src/components/{tabs,ui,layout,modals}` — 52 tab files, 11 shared `ui/` primitives (Button, Badge, Card, StatCard, EmptyState, Modal, Form, etc.), 2 layout files (LoadingScreen, MobileNav), 10 modals.
- **Charts:** Recharts throughout.
- **Auth:** Supabase Auth (email/password only — no OAuth), hand-rolled `src/Auth.tsx` (1,766 lines) with framer-motion.
- **Testing/tooling:** Vitest + Testing Library, ESLint (flat config) + Prettier, `tsc --noEmit` — all wired as npm scripts (`lint`, `typecheck`, `test`, `build`). Good CI-checkable baseline for Step 3/4.

---

## 2. Current design tokens

### Color
```
--t-ink: #0f172a          (text)
--t-paper: #f8fafc        (page bg, light)
--t-accent: #4f46e5       (indigo — swapped per accent-theme preset)
--t-gold: #d97706
--t-sage: #059669         (success/positive)
--t-rust: #dc2626         (danger/negative)
--t-muted: #64748b
--t-line: #e2e8f0         (borders)
--surface-0/1/2           (card/page/sunken surface hierarchy, light + dark variants)
```
- **10 selectable accent presets** (`ACCENT_PALETTES` in `src/utils/constants.ts`): Indigo, Violet, Emerald, Amber, Ocean Blue, Navy, Teal, Sky Blue, Forest, Crimson — each with a light and dark variant, live-swapped via `useTheme.ts` by writing CSS vars onto `<html>`/`<body>`.
- Dark theme (`.dark-theme` class) is a genuine separate palette, not just an inverted filter — reads as a "Bloomberg Terminal" aesthetic per the CSS file's own header comment.

### Elevation
8-step shadow scale (`--shadow-xs` → `--shadow-2xl`) plus semantic `--shadow-card`, `--shadow-card-hover`, `--shadow-focus` — each redefined for dark mode with different opacity/color math, not a blanket `filter: invert`.

### Radius
`--radius-xs` (4px) → `--radius-2xl` (28px), plus a user-selectable `--t-radius` (sharp/modern/round: 4/12/24px) driven from Settings → Appearance.

### Typography
- `--font-sans`: **Inter** (already matches the target design language exactly).
- `--font-display`: **Outfit**.
- 9 selectable interface fonts total (Inter, Outfit, Roboto, Poppins, DM Sans, Nunito, Space Grotesk, Lato, SF Pro) via Settings.
- `--font-mono`: JetBrains Mono / Fira Code / SF Mono.
- `tabular-nums` / `font-variant-numeric` is applied in **34 of 55 tab/component files** for currency alignment — inconsistent, not absent (see §7).

### Motion
Named easing curves: `--ease-bounce`, `--ease-out`, `--ease-spring`, `--ease-premium` — used consistently in transitions across cards, modals, sidebar. User-selectable animation speed (snappy/smooth/relaxed) exists in the theming engine but **has no UI control to change it** (see §5.4).

### Spacing / density
`--space-1` (4px) → `--space-12` (48px) scale, plus a user-selectable density mode (Compact/Normal/Comfortable) that scales `--card-pad`, `--app-font-size`, `--section-gap` app-wide.

### Effects already in use
- `.glass` glassmorphism utility (`backdrop-filter: blur(24px) saturate(180%)`) — on sidebar + header.
- Ambient aurora radial-gradient background layer on `body::before`.
- 3 selectable background styles (dots/mesh/plain) — wired in `useTheme.ts` but **no UI control in Settings** (see §5.4).

---

## 3. Navigation & information architecture

- **Sidebar** (`src/utils/appConstants.ts` `NAV_GROUPS`, rendered `App.tsx:3255-3491`): 6 groups, **82 total destinations** (top items + nested children). Collapsible per-group (chevron), and the whole sidebar can minimize to a 72px icon rail with hover-to-peek.
  - Group collapse state and sidebar minimize/expand state are **plain `useState`, not persisted** — resets on every reload, unlike almost every other user preference in the app (theme, density, font, etc. are all DB/localStorage-backed).
  - A `settings.sidebarNav` boolean is wired through the DB schema and Settings props but is destructured as `_sidebarNav` (unused) in `SettingsTab.tsx` — dead setting.
- **Mobile nav** (`MobileNav.tsx`): 4 fixed bottom-tab slots (Home/Banks/Stocks/Credit) + a 5th "More" button opening a full bottom-sheet drawer that mirrors the full `NAV_GROUPS` tree, with its own search box. Nicely, the "More" label truncates to show the actual active tab name when it's one of the 78 non-primary destinations, so users aren't stranded without a "where am I" signal.
- **Header** (`App.tsx:3505+`): sticky glass bar with a time-of-day greeting instead of a page title/breadcrumb, global search (hidden <768px, replaced by a mobile icon toggle), profile/family-member switcher, alerts bell with snooze/dismiss, privacy-mask toggle, theme toggle, backup-export button, avatar menu. **No breadcrumb and no persistent page title anywhere** — the only "current location" signal is the (desktop-only) sidebar highlight.
- **Command palette** (Cmd/Ctrl+K, `CommandPaletteModal.tsx`): proper ARIA combobox/listbox semantics, arrow-key nav, focus trap. Covers only **34 of the 82** nav destinations — entire groups (Reports & Tools, most of System, Govt Schemes' 11 sub-items, several Life Planning items) are unreachable from the palette.
- **Keyboard shortcuts**: bare (no-modifier) single letters and number keys navigate directly, guarded only by an input/dialog-focus check — unusual and slightly risky compared to the more common modifier-required convention, but a documented "?" help modal exists and lists everything transparently.
- **Executive Dashboard** (`AnalyticsTab.tsx`, 15,165 lines — the single largest file in the repo) hides its own second-level tab bar with 7 sub-destinations (Dashboard/Trends/Allocation/Planning/Spending/Calendar/Habits & Rewards) that are **not discoverable from the sidebar or command palette at all** — effectively 7 more destinations layered under one nav entry.

---

## 4. Screen-by-screen notes

### 4.1 Auth / onboarding
Already strong. True split-panel layout (brand story left, form right on desktop; single column on mobile), framer-motion transitions between login/signup/forgot/reset modes, password-strength meter, live validation, friendly Supabase-error translation, `prefers-reduced-motion` and dark-mode support, a mobile-only onboarding carousel gated behind a `localStorage` flag. No OAuth/social login exists (email/password only — worth confirming this is intentional before any redesign touches it).

**Real gap:** `src/components/modals/OnboardingWizard.tsx` is a fully-built 5-step post-signup wizard (Profile → Bank → Investment → Goal → AI Advisor) that is **never imported anywhere** — dead code. New users currently land on an empty dashboard with no guided setup; only a passive informational carousel exists (it explains the app but creates no data).

### 4.2 Dashboard (Executive Dashboard / AnalyticsTab)
Has a genuine 12-column `.bento-grid` responsive layout (not ad hoc flexbox), a gradient hero card with a decorative watermark, a "Smart Insights" strip, and Recharts visualizations for net worth trend, allocation, YoY comparison. Confirms: FIRE widget, 80C tracker, MoM delta, YTD, badges/XP/streak gamification layer, peer benchmarking.

**Concerns:** extremely high information density (7 hidden sub-tabs, dozens of stat-card grids using inconsistent `minmax()` breakpoints — 130/180/260/280/300/320px all appear as separate hardcoded values with no shared token) and a gamification layer (badges/XP/streaks) bolted onto what's otherwise a serious net-worth analytics tool — worth a product decision on whether that fits the "confident, human, never gamify shame/streaks" tone goal, or should be visually toned down / made optional.

### 4.3 "Transactions" (BanksTab — accounts + ledger)
Bank accounts render as cards (logo, masked account number via the privacy system, tabular-nums balance, colored accent strip); the transaction ledger below is a real sortable `<table>` with category pills, debit/credit color coding, and a totals row. Add/edit is a modal for new records but **double-click-to-inline-edit directly in the table row** for existing ones — two different edit entry points for the same action (inline vs. pencil-icon modal), worth simplifying to one pattern.

**No responsive fallback:** the ledger table has zero `@media` queries and just gets `overflow-x: auto` — on a phone that means horizontal-scrolling a 7-column table rather than collapsing into a transaction-card list, which is the standard mobile-fintech pattern (Monarch/Copilot both do card-per-transaction on mobile).

### 4.4 Budgets & Goals
Both use the shared `.progress-track`/`.progress-fill` linear bar (shimmer-sweep animation) plus **SVG ring progress indicators with animated `stroke-dashoffset`** — genuinely modern touches already in place. Color-coding logic differs subtly between the two tabs (Budget: 3-band rust/gold/sage; Goals: 4-band rust/accent/gold/sage with different thresholds) — a minor cross-tab inconsistency, not a redesign need.

### 4.5 AI Assistant (Insights)
Already a proper chat UI: bubble-tail corner-radius trick, staggered-dot typing indicator, category-tabbed suggested prompts that persist through a conversation, auto-growing textarea, avatar badges. Visually consistent with the rest of the app's gradient/pill vocabulary rather than looking like a bolted-on generic chat widget. This screen needs the least work of anything in the app.

### 4.6 Settings
8-section pill-nav (Appearance, Profile, Family Profiles, Master Data, AI Advisor, Email Reports, Documents, Data & Account). Theme presets bundle accent+font+mode into one-click tiles; density and font are exposed as pill pickers.

**Real gap:** the theming engine (`useTheme.ts`) supports radius, background-style, and animation-speed customization, and `SettingsTab.tsx` receives all the corresponding props — but they're destructured with underscore prefixes and never rendered as controls. Users cannot actually change radius/background-style/animation-speed today even though the plumbing exists end-to-end. Likely either an intentionally hidden feature or a UI that got removed without removing the prop wiring — worth a decision on whether to finish exposing it or delete the dead plumbing.

### 4.7 Right-side detail panels
**None exist.** All detail/edit views are centered modal dialogs (`Modal.tsx`) or full tab navigations. A `slideRight` CSS keyframe is defined but applied nowhere — looks like a drawer pattern was planned and abandoned. This is the single clearest "add a 2026 pattern" opportunity the brief already anticipated (view/edit a transaction or holding in a right-side panel without losing the list behind it).

### 4.8 Empty states & loading
`EmptyState.tsx` is a single, deliberately-consolidated "gold standard" component used everywhere — good. Loading is a mix of: a polished branded full-app `LoadingScreen` (pulsing logo, gold shimmer bar), contextual button-level spinners (submit/refresh), and a full-screen spinner for the destructive "reset all data" confirmation.

**Real gap:** a `.skeleton` shimmer CSS class exists but is used **nowhere** — no component in the app renders a skeleton loader for in-content loading states, despite the brief's "skeleton loaders, never spinners" target already being half-built (the CSS exists, just unused).

### 4.9 Mobile responsiveness
Sidebar → bottom tab bar + drawer (good, already matches target). But responsiveness is inconsistent at the component level: BanksTab's ledger has zero media queries (table just scrolls), while AnalyticsTab has many different ad hoc `minmax()` breakpoints. No single shared "mobile transaction/data list" pattern exists to reuse.

---

## 5. Core UI primitives (used across 37+ files each)

| Component | Spec | Notes |
|---|---|---|
| **StatCard** | 16px radius, 20/22px padding, 4px colored top border, subtle diagonal gradient bg, 38×38 icon badge, value: 28px/900/-0.04em tabular-nums | Canonical "big number" look-and-feel; no built-in variants |
| **Card** | 4 variants: base / tile / insight / hero. `hero` forces a permanent dark-navy gradient + white text via `!important`, independent of light/dark theme | `hero` variant is intentionally always-dark — confirm this is still wanted before any palette change |
| **Button** | 5 variants (primary/secondary/ghost/danger/accent), 3 sizes | No built-in `loading` state/spinner — every screen improvises its own (e.g., AI Assistant swaps in `TypingIndicator` instead) |
| **Badge** | 5 color variants, single size | BanksTab bypasses it entirely for small inline tags (`TRANSFER`/`LINKED`) with hand-rolled spans — two "small pill" implementations exist |

---

## 6. Currency & number formatting consistency

`src/utils/finance.ts` defines `fmtINR` (compact ₹1.5L/₹2.3Cr), `fmtINRFull` (grouped whole-rupee), `fmtINRExact` (with paisa) — used correctly in 49 files. But **~60+ call sites across 14+ tab files** (DematTab, InvestmentsTab, TxnHistoryTab, CreditTab, RealEstateTab, etc.) call raw `toLocaleString("en-IN")` directly instead, risking silent formatting drift between screens. `tabular-nums` alignment is present in 34 files but missing from 21 others that do render prominent currency totals (RealEstateTab, VehiclesTab, InsuranceSummaryTab, FIREPlannerTab, etc.) — e.g., `RealEstateTab.tsx`'s payment-schedule "Total" row lacks it while the equivalent row in `BanksTab.tsx` has it.

No animated "count-up" number transitions exist anywhere (confirmed via grep) — all stat values render their final number instantly; only SVG progress rings animate.

---

## 7. Quick wins vs. deeper refactors (preview — full detail goes in `docs/ui-plan-2026.md` at Step 2)

**Quick wins** (visual-only or small, low-risk, high-consistency payoff):
- Standardize `toLocaleString` currency call sites onto `fmtINRFull`/`fmtINRExact`.
- Add `tabular-nums` to the ~21 files/tables missing it.
- Unify the `minmax()` breakpoint values used across AnalyticsTab's stat-card grids into shared tokens.
- Persist sidebar minimize + group-collapse state (small state + localStorage/DB write).
- Either wire up or remove the dead radius/background-style/animation-speed Settings controls.
- Consolidate BanksTab's small inline tag spans into the shared `Badge` component.

**Component-refactor tier** (touches shared components/patterns, needs care but not structural):
- Add a `loading` prop + spinner to the shared `Button` component; adopt it app-wide instead of ad hoc per-screen handling.
- Introduce an actual skeleton-loading pattern using the existing (currently dead) `.skeleton` CSS, for at least the heaviest data screens.
- Build a right-side slide-over/drawer primitive (the dead `slideRight` CSS suggests this was already planned) and adopt it for at least one or two "view/edit without leaving the list" flows (e.g., transaction detail in BanksTab) as a proof of concept.
- Unify BanksTab's two transaction-edit entry points (inline double-click vs. modal) into one pattern.
- Add a mobile card-list fallback for the BanksTab transaction table instead of horizontal scroll.

**Structural / needs-explicit-approval tier:**
- Expanding the command palette to cover all 82 nav destinations (safe, but touches a hardcoded actions array in a way worth flagging).
- Wiring the orphaned `OnboardingWizard.tsx` into the actual post-signup flow (currently dead code — reviving it is a real UX/flow change, needs your sign-off on whether you even want a guided wizard).
- Any change to the Executive Dashboard's information density/gamification layer (badges/XP/streaks) — this is a product decision, not a styling one.
- Adding a breadcrumb/page-title to the header in place of (or alongside) the time-of-day greeting.
- Introducing route-based URLs (currently there are none — the whole app is one URL) — out of scope unless you explicitly want deep-linkable tabs; flagging only because "preserve route URLs" in your brief doesn't really apply today since none exist.

---

## What I'm explicitly NOT proposing to touch structurally without your sign-off
- The single-URL, no-router navigation model.
- The monolithic `App.tsx` state architecture.
- The `hero` Card variant's "always dark" design (independent of light/dark theme).
- Reviving `OnboardingWizard.tsx`.
- The gamification layer on the Executive Dashboard.

---

**This concludes Step 1. Per the workflow, I'm stopping here for your review before writing `docs/ui-plan-2026.md` (Step 2 — the concrete change-by-change proposal with risk levels).** Let me know if anything above looks wrong, missing, or if you want me to dig into any screen deeper before I move to the plan.
