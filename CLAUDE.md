# CLAUDE.md

This file gives Claude Code persistent context for the **7Powers** project. Read it fully at the start of every session.

---

## Project identity

**Name:** 7Powers
**One-liner:** Post-workshop web app that stress-tests the defensibility of a project using Hamilton Helmer's 7 Powers framework.
**Live (target):** `7powersapp.vercel.app`
**Status:** Greenfield. Building from `sevenpowers-spec.md` (in repo root).

This app is part of a suite of post-workshop tools (Regul8, Grounds, Gameframe, Tokenlab, PitchCraft). Match their philosophy: **workshop method → 7-9 modules → AI coach context-aware → structured export**. Visual identity must be consistent with `tokenlabapp.vercel.app` and `regul8app.vercel.app`.

---

## Stack — non-negotiable

- **Nuxt 3** (NOT Next.js — this is the key difference from the rest of the suite)
- **TypeScript strict** (`strict: true` in tsconfig)
- **Vue 3 Composition API** with `<script setup>` syntax only (no Options API)
- **TailwindCSS** (via `@nuxtjs/tailwindcss`)
- **Pinia** for state (via `@pinia/nuxt`)
- **Supabase** (Postgres + Auth + RLS) — `@nuxtjs/supabase` module
- **`@nuxtjs/i18n`** — FR + EN, route-prefixed (`/fr/*`, `/en/*`)
- **Anthropic SDK** (`@anthropic-ai/sdk`) for the AI Coach — model `claude-sonnet-4-20250514` (Sonnet 4) by default
- **Vercel** deployment

Do not introduce other major libs without asking. Specifically: no Vuetify, no Element Plus, no shadcn ports unless explicitly approved. Build UI primitives from scratch in Tailwind.

---

## Repo structure (target)

Follow the structure documented in `sevenpowers-spec.md` section 5. Do not invent alternative organizations. Key folders:

- `pages/` — file-based routing
- `components/` — split into `landing/`, `modules/`, `coach/`, `viz/`, `ui/`
- `composables/` — reusable logic (`useProject`, `useCoach`, `usePowerScore`)
- `server/api/` — Nitro endpoints
- `server/utils/prompts.ts` — all Claude system prompts live here, nowhere else
- `server/utils/powers-library.ts` — the 7 Powers definitions + sector examples
- `stores/` — Pinia stores
- `content/` — methodology docs (if using `@nuxt/content`)
- `locales/fr.json` + `locales/en.json`

---

## Methodology — the source of truth

The 7 Powers framework rules are **non-negotiable** and must be respected throughout the app and the Coach IA.

**Every Power requires TWO components:**
1. **Benefit** — measurable cash-flow improvement (price ↑, cost ↓, or investment ↓)
2. **Barrier** — what prevents a competitor from arbitraging the Benefit away

Without BOTH, it is not a Power — just an arbitrable advantage. The Coach must push back on founders who claim a Power without a clear Barrier.

**Stage / S-Curve mapping** (use this for relevance scoring):
- Origination → Cornered Resource, Counter-Positioning
- Takeoff → Scale Economies, Network Economies, Switching Costs
- Stability → Branding, Process Power

**The "Me too won't do" test:** every claimed Power must be tested against the question "would an identical, well-funded ($50M) competitor fail to copy this?"

**Helmer's value formula:** `Value = Market Size × Power`. This is why we have a Market Sizing module (Module 1) — Power without Market = no Value.

---

## Scoring logic (Module-level)

Each Power scored 0-100 from 5 sub-questions Q1-Q5 rated 0-5:

```
power_score = ((Q1 + Q2) / 2) × ((Q3 + Q4) / 2) × Q5 / 25 × 100
```

Where:
- Q1, Q2 = Benefit (clarity + magnitude)
- Q3, Q4 = Barrier (height + me-too resistance)
- Q5 = Stage fit (S-Curve alignment)

**Multiplicative**, not additive — because Power requires BOTH Benefit AND Barrier. A 0 on either side kills the score, which is the intended behavior.

Global Defensibility Score:
```
defensibility = (top3_powers_avg × 0.7) + (market_attractiveness × 0.3)
```

Top 3 (not average of all 7) because Helmer is clear: most enduring businesses have 2-3 Powers, not all 7.

---

## AI Coach — implementation rules

- All Coach calls go through `server/api/coach.post.ts`
- **Always stream** via Server-Sent Events (SSE) — no blocking responses
- The full project context is injected into the system prompt on every call (project name, sector, stage, market sizing, all already-completed Powers and their scores)
- The Coach is **module-aware**: it knows which Power the founder is currently working on
- System prompts live in `server/utils/prompts.ts` — never inline them in API routes
- The Coach must be **skeptical by default**. Founders overclaim Powers. The Coach's job is to push back politely.
- Sector-specific examples in answers (DeFi: Uniswap/Aave/Curve; AI: agent moats; SaaS: classic Helmer cases)
- Language follows the user's i18n locale (FR or EN)

---

## Visual identity — match the suite

Reference: `tokenlabapp.vercel.app`, `regul8app.vercel.app`, `gameframeapp.vercel.app`.

- **Dark mode by default**, background near `#0a0a0f`
- **Electric blue accent** on CTAs and card borders
- **Subtle bordered cards** with hover glow — never flat
- **Typography:** Inter or Geist, sans-serif
- **Iconography:** symbolic glyphs (⬡ ◈ ◎ ⇄ △ ⚖ ◉) — NOT Lucide icons by default
- **No bullet point lists in UI** — use cards or grids instead. This is a hard rule and a strong differentiator vs generic AI-generated UIs.
- **Power Radar SVG** is the signature visual object of this app (equivalent of Tokenlab's Value Flow). Treat it as the hero of the synthesis page.
- Secondary accent (amber/gold) on high-score Powers to suggest "what shines = what holds"

---

## Power glyphs (assign and stay consistent)

| Power | Glyph |
|---|---|
| Scale Economies | ⬡ |
| Network Economies | ◉ |
| Counter-Positioning | ⇄ |
| Switching Costs | 🔒 (or `◈`) |
| Branding | ✦ |
| Cornered Resource | △ |
| Process Power | ⚖ |

Use these consistently across modules, the Radar, the PDF export, and the i18n labels.

---

## Build phases — work in order

Reference `sevenpowers-spec.md` section 8 for full detail. Do not skip ahead.

1. **Phase 1 — MVP:** Nuxt + Tailwind + Supabase + auth + Module 0 + Module 1 + ONE Power module (Scale Economies) end-to-end + landing
2. **Phase 2 — Full methodology:** the 6 other Power modules + Module 9 (Power Map + synthesis)
3. **Phase 3 — Coach IA:** streaming endpoint + sticky chat component + context injection
4. **Phase 4 — Export PDF:** print-mode page + Puppeteer endpoint
5. **Phase 5 — Polish:** i18n complete, examples library, onboarding, analytics

At the end of each phase, **stop and ask for review** before starting the next. Do not chain phases without confirmation.

---

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)
- **Components:** PascalCase filenames (`PowerRadar.vue`, not `power-radar.vue`)
- **Composables:** `use` prefix camelCase (`useCoach.ts`)
- **API routes:** `[name].[method].ts` (`coach.post.ts`, `projects.get.ts`)
- **i18n keys:** dotted namespace (`module.scale.title`, `coach.placeholder`)
- **No `any` in TypeScript.** Use `unknown` and narrow.
- **Server-side env access only** for secrets. Never expose `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE` to client.

---

## What NOT to do

- Do not use Next.js patterns (no `getServerSideProps`, no `app/` router conventions). This is Nuxt.
- Do not generate generic AI-looking UI (purple gradients, glassmorphism, emoji-heavy headers). The suite has a specific identity — match it.
- Do not add features outside the spec without asking. If you think something is missing, raise it as a question first.
- Do not write the AI Coach prompts inline in API routes. They go in `server/utils/prompts.ts`.
- Do not store sensitive data in localStorage. Use Supabase + RLS.
- Do not skip the methodology rules. If a Power scoring logic feels "too strict" — that's intentional. Helmer's framework is meant to be skeptical.

---

## Open questions to confirm before final build

These were flagged in the spec — confirm with the user before locking them:

1. **Account model:** Gameframe-style (no account to start, optional login) vs Tokenlab-style (auth gated)?
2. **Evaluator mode:** Phase 2+ feature for VCs/incubators to score third-party projects. Defer for now unless told otherwise.
3. **Examples library:** which 20-30 reference cases (Uniswap, Aave, OpenAI, Anthropic, Linear, Notion…) to preload as inspiration?

---

## Reference files in this repo

- `sevenpowers-spec.md` — full product + technical spec (read first)
- `CLAUDE.md` — this file (rules of engagement)

When in doubt, the spec wins over assumptions. When the spec is silent, ask before deciding.
