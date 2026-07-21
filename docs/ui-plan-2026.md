# UI/UX Modernization Plan — 2026 (Step 2)

Based on `docs/ui-audit-2026.md`. Still no code changes — this is the proposal to review before Step 3 (branch + implement).

**Legend**
- **Classification:** `visual` (styling/CSS/markup only, no logic change) · `component` (touches a shared component's structure/props, used in many places) · `structural` (changes data flow, adds new state/routes/dead-code revival, or changes a flow the user relies on) — **structural items are called out explicitly and need your yes/no before I touch them in Step 3.**
- **Risk:** how likely this is to break something that currently works.
- **Effort:** rough size, not hours — XS (<30 min), S (~1 session), M (~half a day equivalent), L (multi-session).

---

## A. Design tokens & cross-cutting system

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| A1 | Add one new **"Midnight" theme preset** — charcoal base (`#0B0B0F`) + mint (`#10D9A0`) or violet (`#8B5CF6`) accent — as an **11th option** alongside the existing 10 accent presets, not a replacement. Selectable from the same Settings → Appearance preset grid. | Delivers the specific 2026 fintech palette from your brief as an additive choice, without disrupting the theme system you already have or forcing it on you. | visual | low | S |
| A2 | Add a shared numeric **count-up animation hook** (`useAnimatedNumber` or similar) and apply it to `StatCard` values and a few headline numbers (Net Worth, Dashboard hero figure). | Brief explicitly asks for animated number counters; currently every number renders instantly, everywhere. | component | low | S |
| A3 | Standardize the ~60+ raw `toLocaleString("en-IN")` currency call sites (DematTab, InvestmentsTab, TxnHistoryTab, CreditTab, RealEstateTab, etc.) onto the existing `fmtINRFull`/`fmtINRExact` helpers in `src/utils/finance.ts`. | Removes silent formatting drift risk between screens; no visible behavior change for correctly-formatted values (this is a correctness/consistency fix, not a redesign). | visual | low | M |
| A4 | Add `tabular-nums` to the ~21 files missing it (RealEstateTab, VehiclesTab, InsuranceSummaryTab, FIREPlannerTab, etc.), matching the 34 files that already have it. | Currency columns/totals should align vertically everywhere, not just in some tabs. | visual | low | S |
| A5 | Introduce a shared `minmax()` breakpoint token set (e.g. `--stat-grid-min-sm/md/lg`) and adopt it in AnalyticsTab's stat-card grids, replacing the ~6 different hardcoded pixel values found there. | Reduces one real inconsistency the audit found; makes future grid tweaks a one-line token change instead of hunting hardcoded values. | component | low | S |
| A6 | Add a `loading` prop (spinner swap-in, disabled state) to the shared `Button` component. | Currently every screen improvises its own loading-button behavior; a shared primitive reduces future duplication and gives buttons a consistent "busy" feel. | component | low | S |
| A7 | Activate the currently-dead `.skeleton` CSS as a real `Skeleton` UI component, and use it for the 2-3 heaviest data screens' initial paint (e.g. Dashboard stat cards, BanksTab ledger, InvestmentsTab holdings) instead of nothing/instant-render. | Brief specifically wants "skeleton loaders, never spinners"; the CSS already exists and is unused — this finishes a half-built feature rather than inventing one. | component | low-med | M |
| A8 | Consolidate BanksTab's hand-rolled inline "TRANSFER"/"LINKED" tag `<span>`s into the shared `Badge` component (add a `size="xs"` prop to `Badge` to support it). | Removes a duplicate "small pill" implementation; one badge system app-wide. | component | low | S |

---

## B. Navigation, header & wayfinding

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| B1 | Add a small **breadcrumb / current-section label** in the header, next to (not replacing) the time-of-day greeting — e.g. small muted text "Executive Dashboard" or "Banks & Transactions › Ledger". | Right now there's no textual confirmation of which of 82 destinations you're on except the sidebar highlight (which is hidden on mobile). Low-effort, high wayfinding value. | visual | low | S |
| B2 | Persist sidebar **minimize state** and **group-collapse state** to the same settings store everything else uses (localStorage/DB), instead of resetting every reload. | Every other preference (theme, density, font) survives reload; sidebar state currently doesn't, which reads as a bug/oversight. | component | low | S |
| B3 | Expand the **command palette** (`CommandPaletteModal.tsx`) action list from 34 to all 82 nav destinations, using `NAV_GROUPS` directly instead of the separate hand-maintained array. | The palette's whole value is "type anything, get there" — missing 48 destinations undercuts that. Also makes future nav additions automatically show up in the palette without a second edit. | component | low | S |
| B4 | Remove or repurpose the dead `settings.sidebarNav` flag (currently wired through DB + Settings props but never rendered/used). | Dead plumbing; either delete cleanly or decide what it was meant to control. | component | low | XS |
| B5 | Either **wire up** the existing radius / background-style / animation-speed pickers into Settings → Appearance (the theming engine already supports all three, just needs the JSX), or **remove the dead prop-drilling** if you'd rather not expose them. | Right now the engine supports it but users can't reach it — asking you which way you want this resolved rather than guessing. | component (wire-up) or visual (remove) | low | S |

**B3 and B5 touch a hardcoded action list / prop wiring that's been this way for a while — flagging as worth a quick nod from you, but I'd call both low-risk enough to do without a full stop if you'd rather I just proceed. Your call.**

---

## C. Auth / onboarding

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| C1 | Visual polish pass only — no flow changes: refine spacing/contrast on the existing split-panel layout, ensure the new Midnight theme preset (A1) renders correctly here too. | Auth already scores well in the audit; this is touch-up, not a redesign. | visual | low | XS-S |
| C2 (structural, needs your decision) | Wire the existing but currently-orphaned `OnboardingWizard.tsx` (5-step: Profile → Bank → Investment → Goal → AI Advisor) into the actual post-signup flow. | Right now new users land on a completely empty dashboard with no guided setup — this component is fully built and just never gets rendered. This is a real flow/UX change (new users would see a new step after signup), not styling. **I will not do this without your explicit go-ahead** — see question below. | **structural** | medium | M |

---

## D. Dashboard (Executive Dashboard / AnalyticsTab)

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| D1 | Apply the shared `minmax()` tokens from A5 to this screen's stat grids. | Direct consumer of A5; this is where the inconsistency was found. | visual | low | S |
| D2 | Apply count-up animation (A2) to the hero net-worth figure and top stat cards on this screen specifically. | Highest-visibility numbers in the app — best place to show the new micro-interaction. | visual | low | XS |
| D3 | Add the breadcrumb treatment (B1) to also show which of the 7 hidden sub-tabs (Dashboard/Trends/Allocation/Planning/Spending/Calendar/Habits & Rewards) is active, since none of those 7 are visible in the sidebar. | These 7 destinations are currently invisible to wayfinding entirely. | visual | low | S |
| D4 (flagging only, no action proposed) | The gamification layer (badges/XP/streaks/peer benchmarking) and overall information density on this screen is a product question, not a styling one — do you want it kept as-is, toned down visually, or made collapsible/optional? I'm not proposing a specific change here without your input. | Brief's tone guidance says "celebrate progress, never shame" — gamification can cut either way depending on execution; this is your call, not a default I should make. | — | — | — |

---

## E. Transactions (BanksTab — accounts + ledger)

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| E1 | Add a **mobile card-list fallback** for the transaction ledger below ~640px (each transaction becomes a compact card: date, category pill, note, amount — instead of a horizontally-scrolling 7-column table). | This is the single clearest "looks dated on mobile" finding — Copilot/Monarch both use card-per-transaction on small screens; current behavior is a wide table + `overflow-x: auto`. | component | low-med | M |
| E2 | Unify the two existing edit entry points (double-click-to-inline-edit vs. pencil-icon → modal) into one consistent pattern — recommend keeping **inline edit** as primary (faster, already built) and dropping the redundant modal-edit-of-existing-row path (the modal stays for creating *new* records). | Two ways to do the same thing on the same row is confusing; consolidating removes code too. | component | low-med | S |
| E3 (structural, needs your decision) | Introduce a **right-side slide-over panel** for viewing a transaction/account's full detail (reusing the dead `slideRight` CSS keyframe that already exists), as a proof-of-concept on this one screen before considering it elsewhere. | This is the one new *pattern* from your brief ("right-side context panel slides in for detail views") — it doesn't exist anywhere in the app today. Proposing BanksTab as the pilot screen since it's the most "list + detail" shaped tab. This adds a new shared component and a new interaction pattern, so I'm flagging it as structural even though it's additive and doesn't remove anything. | **structural** | medium | L |

---

## F. Budgets & Goals

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| F1 | Align the color-coding thresholds between BudgetTab (3-band) and GoalsTab (4-band ring) so "on track / warning / over" means the same percentage cutoffs in both places. | Minor but real cross-tab inconsistency found in the audit — same visual language (rust/gold/sage) currently means different things on two adjacent screens. | visual | low | XS |
| F2 | Apply count-up animation (A2) to budget/goal percentage figures. | Consistent with A2/D2 elsewhere. | visual | low | XS |

---

## G. Insights (AI Assistant)

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| G1 | No changes proposed beyond the global token pass (A1, A3, A4 where applicable). | This screen already scored well in the audit (proper chat UI, typing indicator, suggested prompts, visually consistent with rest of app) — flagged in the brief as "AI-powered insights, ask before adding" and it already exists and works well. Nothing to add here beyond what's covered elsewhere. | — | — | — |

---

## H. Settings

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| H1 | Add the Midnight preset (A1) into the existing Light/Dark preset tile grids. | Direct consumer of A1. | visual | low | XS |
| H2 | Resolve the dead radius/background/animation-speed pickers per your answer to B5. | Same item as B5, listed here since it's a Settings-screen change specifically. | component | low | S |

---

## I. Mobile & responsive (cross-cutting)

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| I1 | Audit the ~20 tab files with ad hoc/no responsive breakpoints (starting with BanksTab per E1) and bring them onto shared, consistent breakpoint tokens as each is touched. | Rather than a single giant "responsive pass" commit (high risk, hard to review), this rides along with other per-screen work in Steps 3-4 as a side effect where it's cheap. | visual | low | rolling (S per screen) |

---

## J. Loading & empty states

| # | Change | Why | Class. | Risk | Effort |
|---|---|---|---|---|---|
| J1 | Ship the `Skeleton` component from A7 and adopt it on 2-3 heaviest-load screens first (Dashboard, BanksTab, InvestmentsTab), leaving the rest on current behavior for now. | Matches brief's "skeleton loaders, never spinners" without a risky app-wide swap in one commit. | component | low-med | M |
| J2 | No changes to `EmptyState.tsx` — already a consolidated "gold standard" component per the audit. | Nothing to fix here. | — | — | — |

---

## Summary: what needs your explicit yes/no before Step 3

Everything above marked **visual** or **component** I'll proceed with as part of the normal small-commit branch work, per your "don't ask for confirmation on straightforward changes" preference — unless you tell me otherwise below.

The two items marked **structural** are the ones I will genuinely wait on:

1. **C2 — Revive the orphaned OnboardingWizard** into the real signup flow. New users would see 5 extra guided-setup steps after signing up (skippable, presumably). Do you want this?
2. **E3 — Build a right-side slide-over panel**, piloted on BanksTab, as a new interaction pattern. This is the one genuinely new pattern in your brief; it doesn't exist in the app today.

There's also one open **product** question, not a build question:

3. **D4 — the Dashboard's gamification layer** (badges/XP/streaks). Keep as-is, tone down, or make collapsible/optional?

---

## Not proposing (out of scope / would need a much bigger conversation)

- Any change to the single-URL / no-router navigation model, or to the monolithic `App.tsx` state architecture — these are foundational and weren't asked for.
- Changing the `Card` `hero` variant's "always dark regardless of theme" behavior — assuming that's intentional.
- Adding OAuth/social login to Auth — not in your brief, and a real backend-touching change.

---

Let me know: (1) any items above you want removed/changed/added, (2) your calls on C2, E3, and D4, and I'll create the `ui-refresh-2026` branch and start Step 3 with the approved scope.
