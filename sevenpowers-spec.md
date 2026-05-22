# 7Powers — Spec produit & technique

> Web app post-workshop pour structurer la défensibilité d'un projet (DeFi, Web3, AI agents, SaaS) à partir du framework **7 Powers** d'Hamilton Helmer.
>
> **Stack cible :** Nuxt 3 (au lieu de Next.js), conservant la philosophie des apps Regul8 / Gameframe / Tokenlab / PitchCraft / Grounds.

---

## 1. Vision produit

### 1.1 Problème résolu

Après un workshop "Building Defensibility: Intro to 7 Powers", les founders repartent avec :
- des post-its sur 7 Powers identifiés,
- des intuitions sur leur moat,
- aucun livrable structuré, ni stress-test, ni roadmap.

**7Powers** remplace ce workshop par une app web qui :
1. Guide le founder à travers les 7 Powers + cadres associés (Benefit/Barrier, S-Curve, Value = Market × Power).
2. Stress-teste chaque Power identifié (est-ce vraiment un Power, ou juste un bénéfice arbitrable ?).
3. Produit une **Power Map** visuelle et un **plan d'action de défensibilité** exportable.

### 1.2 Positionnement vs les autres apps

| App | Méthodologie | Output principal |
|---|---|---|
| Regul8 | 9-concept regulatory framework | Compliance report |
| Grounds | PostWeb diagnostic | Lean Canvas + roadmap |
| Gameframe | Fidbak gamification | Plan gamifié 7 modules |
| Tokenlab | 9-module tokenomics | Tokenomics doc + Value Flow SVG |
| PitchCraft | Pitch narrative frameworks | Script + PPTX deck |
| **7Powers** | **Helmer 7 Powers + Benefit/Barrier + S-Curve** | **Power Map + Defensibility Plan** |

Même ADN : workshop method → 7-9 modules → AI coach context-aware → export structuré.

### 1.3 Cibles

- Founders Web3 / DeFi (cible primaire — fit avec ton incubateur)
- Founders AI / agents (cible secondaire — le framework s'y prête particulièrement)
- Founders SaaS / B2B classiques (cible tertiaire)
- VCs / accelerator program managers (mode "evaluator")

---

## 2. Méthodologie intégrée

### 2.1 Les 7 Powers (rappel Helmer)

Chaque Power = **Benefit** (cash flow ↑) + **Barrier** (durée). Sans Barrier, pas de Power — juste un avantage arbitrable.

| # | Power | Benefit | Barrier | Exemple DeFi/AI |
|---|---|---|---|---|
| 1 | **Scale Economies** | Cost ↓ as volume ↑ | Concurrent doit grossir pour égaler | TVL Uniswap → meilleur pricing |
| 2 | **Network Economies** | Valeur ↑ pour user avec ↑ users | Coût d'acquisition de share | Lending pools, agent marketplaces |
| 3 | **Counter-Positioning** | Modèle supérieur incumbents ne peuvent copier | Cannibalisation de leur biz | DeFi vs banques, open-source AI vs closed |
| 4 | **Switching Costs** | Prix premium captif | Coût de switch pour user | Governance tokens locked, agent personnalisé |
| 5 | **Branding** | Premium pricing | Hysteresis (temps + investment) | "Blue-chip DeFi", trusted oracle |
| 6 | **Cornered Resource** | Accès exclusif à actif critique | Fiat / contrat / IP | RWA partnerships, exclusive dataset |
| 7 | **Process Power** | Excellence opérationnelle | Complexité + opacité du process | Risk mgmt Aave, oracle design |

### 2.2 Cadres complémentaires

- **Formule Helmer :** `Value = Market Size × Power`
- **3 stades S-Curve :** Origination → Takeoff → Stability  
  - Origination : surtout **Cornered Resource** + **Counter-Positioning**
  - Takeoff : **Scale**, **Network**, **Switching Costs**
  - Stability : **Branding**, **Process Power**
- **Test "Me too won't do" :** chaque Power doit résister à un concurrent identique-mais-bien-financé.

### 2.3 Adaptation DeFi/Web3 (le tableau de l'utilisateur)

Le tableau "7 Powers for DeFi Projects" fourni par l'utilisateur sert de **bibliothèque d'exemples par défaut** dans chaque module. À étendre avec :
- AI agents (du contenu fourni)
- SaaS classique (Helmer original)

---

## 3. Modules de l'app (les "9 étapes")

Comme Tokenlab a 9 modules, on garde la même structure mentale. Ici :

### Module 0 — Project Setup
- Nom projet, secteur (DeFi / AI / SaaS / Web3-other), stade (Origination / Takeoff / Stability), description (1 paragraphe).
- → Détermine quels Powers sont **prioritaires** à analyser pour ce stade.

### Module 1 — Market Sizing
- TAM / SAM / SOM rapide (3 inputs chiffrés + sources).
- Pourquoi : `Value = Market × Power`. Pas de Market, pas de Value, même avec un Power.
- Score : `market_attractiveness` (0-100).

### Modules 2-8 — Les 7 Powers (un module chacun)

**Template identique pour chaque Power module :**

1. **Definition card** (Helmer + adaptation DeFi/AI/SaaS selon secteur projet).
2. **Self-assessment 5 questions** (échelle 0-5 ou Likert) :
   - Avez-vous déjà ce Power, partiellement, ou pas ?
   - Quel est le **Benefit** mesurable ?
   - Quelle est la **Barrier** ? (le point critique)
   - Test "Me too won't do" : un concurrent identique pourrait-il vous copier ?
   - À quel **stade** ce Power se construit-il pour vous ?
3. **AI Coach chat** : context-aware (connaît projet, secteur, réponses des autres modules).
4. **Power Strength Score** (0-100) calculé : combinaison Benefit clarity × Barrier durability × Stage fit.
5. **Action items** : 3 next-steps recommandés pour renforcer ce Power.

### Module 9 — Power Map & Synthesis
- **Power Radar** SVG interactif (7 axes, 0-100 par Power) — type Tokenlab Value Flow.
- **Stage check** : alignement Power × Stade S-Curve.
- **Top 2-3 Powers** à prioriser (les plus crédibles + alignés stade).
- **Red flags** : Powers revendiqués mais Barrier faible.
- **Defensibility Score global** (0-100).
- Export PDF complet.

---

## 4. Stack technique

### 4.1 Frontend

- **Nuxt 3** (au lieu de Next.js des autres apps) — SSR + Nitro server.
- **Vue 3 Composition API** + `<script setup>`.
- **TypeScript** strict.
- **TailwindCSS** + design system identique aux autres apps (cf. screenshots Regul8/Tokenlab : dark mode, accent bleu, cards bordées).
- **Pinia** pour state management (projet courant, modules complétés, etc.).
- **VueUse** pour utilitaires (useLocalStorage, useDebounce…).

### 4.2 Backend / Data

- **Nitro server routes** (`server/api/*.ts`) — équivalent Next.js API routes.
- **Supabase** (PostgreSQL + Auth + Row Level Security) — cohérent avec les autres apps qui ont auth/projects.
- Tables minimales :
  - `projects` (id, user_id, name, sector, stage, market_size_json, created_at)
  - `power_assessments` (id, project_id, power_type, answers_json, score, action_items_json)
  - `coach_messages` (id, project_id, power_context, role, content, created_at)

### 4.3 IA

- **Anthropic Claude API** (Sonnet 4 par défaut pour le Coach, comme Tokenlab/PitchCraft).
- Endpoint serveur `/api/coach` qui :
  - Reçoit `{ projectId, powerContext, userMessage }`
  - Récupère le **contexte complet du projet** (tous modules remplis)
  - Construit un system prompt qui embarque la méthodologie Helmer + le contexte projet
  - Stream la réponse (Server-Sent Events) → meilleure UX
- Endpoint `/api/score` pour calcul auto des scores après chaque module (peut être déterministe ou Claude-assisté).

### 4.4 Export

- **PDF** : `@react-pdf/renderer` ne marche pas en Vue → utiliser **`pdfmake`** ou **Puppeteer côté server** (rendre une page Nuxt en print mode → PDF). Tokenlab fait du PDF → cohérent.
- **Power Map SVG** : généré côté client en Vue components (D3 ou pur SVG).

### 4.5 Déploiement

- **Vercel** (comme les 5 autres apps).
- Variables env : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, `ANTHROPIC_API_KEY`.

### 4.6 i18n

- **`@nuxtjs/i18n`** — FR + EN comme Regul8, Tokenlab. Routes `/fr/*` `/en/*`.

---

## 5. Structure du repo Nuxt

```
sevenpowers/
├── nuxt.config.ts
├── app.vue
├── pages/
│   ├── index.vue                     # Landing
│   ├── login.vue
│   ├── dashboard.vue                 # Liste des projets
│   └── project/
│       ├── new.vue                   # Module 0 — setup
│       └── [id]/
│           ├── index.vue             # Hub modules
│           ├── market.vue            # Module 1
│           ├── power/[type].vue      # Modules 2-8 (route dynamique)
│           └── synthesis.vue         # Module 9 — Power Map
├── components/
│   ├── landing/                      # Hero, How it works, Pricing
│   ├── modules/
│   │   ├── PowerCard.vue
│   │   ├── PowerAssessmentForm.vue
│   │   ├── BenefitBarrierSplit.vue   # UI split-screen pour Benefit/Barrier
│   │   └── StageSelector.vue
│   ├── coach/
│   │   ├── CoachChat.vue             # Sidebar chat sticky
│   │   └── CoachMessage.vue
│   ├── viz/
│   │   ├── PowerRadar.vue            # SVG radar 7 axes
│   │   ├── SCurveStageMap.vue        # S-curve avec Powers placés
│   │   └── DefensibilityScore.vue    # Big number + breakdown
│   └── ui/                           # Boutons, inputs, cards (shadcn-vue style)
├── composables/
│   ├── useProject.ts
│   ├── useCoach.ts                   # Streaming chat
│   ├── usePowerScore.ts              # Logique scoring
│   └── useSupabase.ts
├── server/
│   ├── api/
│   │   ├── projects.post.ts
│   │   ├── projects/[id].get.ts
│   │   ├── coach.post.ts             # Stream Claude response
│   │   ├── score.post.ts
│   │   └── export-pdf.post.ts
│   └── utils/
│       ├── prompts.ts                # System prompts Helmer
│       └── powers-library.ts         # Définitions + exemples par secteur
├── content/                          # Si on utilise @nuxt/content pour la doc méthodo
│   ├── concepts/
│   │   ├── 7-powers.md
│   │   ├── benefit-barrier.md
│   │   └── s-curve.md
│   └── examples/
│       ├── defi.md
│       ├── ai-agents.md
│       └── saas.md
├── stores/
│   └── project.ts                    # Pinia store
├── locales/
│   ├── fr.json
│   └── en.json
└── public/
    └── logo.svg
```

---

## 6. Système de scoring

### 6.1 Power Strength Score (par Power)

Pour chaque Power, 5 questions notées 0-5 :
- Q1 — **Benefit clarity** : Le bénéfice cash-flow est-il quantifiable ?
- Q2 — **Benefit magnitude** : L'impact économique est-il significatif ?
- Q3 — **Barrier height** : Combien de temps/argent faut-il à un concurrent pour copier ?
- Q4 — **Me-too test** : Un concurrent identique-bien-financé échouerait-il à copier ?
- Q5 — **Stage fit** : Ce Power se construit-il au bon stade S-Curve pour ce projet ?

```
power_score = ((Q1+Q2)/2) × ((Q3+Q4)/2) × Q5 / 25 × 100
```

Pondération : Barrier × Benefit (multiplicatif, car sans l'un OU l'autre, pas de Power) × Stage fit en bonus.

### 6.2 Defensibility Score global

```
defensibility = (top3_powers_avg × 0.7) + (market_attractiveness × 0.3)
```

→ Reflète la formule Helmer `Value = Market × Power` en pondérant les **meilleurs** Powers (pas la moyenne, car un projet n'a pas besoin des 7 — souvent 2-3 suffisent).

### 6.3 Coherence checks (red flags)

L'app détecte et signale :
- "Vous revendiquez Network Effects mais TVL < 10M$ → Power non encore activé."
- "Vous revendiquez Branding au stade Origination → impossible, Branding nécessite hysteresis (3-5 ans+)."
- "Aucun Power au-dessus de 60 → projet sans moat clair, risque d'arbitrage."

---

## 7. Pages landing — copywriting (à itérer)

### Hero
> **Construisez la défensibilité de votre projet — comme Helmer**  
> 7Powers stress-teste votre moat avec le framework Hamilton Helmer. 7 Powers, 1 Power Map, un plan d'action. Du workshop à la roadmap en 90 minutes.

### Cible
- Founders DeFi / Web3 qui pitchent leur "moat" sans framework
- Founders AI qui veulent défendre leur position face aux LLM providers
- Programs / incubators qui veulent un livrable structuré post-workshop

### How it works (4-5 steps)
1. **Setup projet** — secteur, stade, market size
2. **7 modules Power** — un par Power, avec Coach IA
3. **Power Map** — visualisation radar + stage fit
4. **Defensibility Score** — note globale + red flags
5. **Plan d'action** — top 2-3 Powers à renforcer + next steps + export PDF

### Pricing (cohérent avec Tokenlab)
- **Free** : projets illimités, 7 modules, Coach IA (10 msg/jour), export PDF
- **Coaching** : session 90min avec expert défensibilité — 290€

---

## 8. Roadmap de build (suggestion Claude Code)

### Phase 1 — MVP (1-2 semaines)
- Setup Nuxt 3 + Tailwind + Supabase + Pinia + i18n
- Auth (magic link Supabase)
- Module 0 + Module 1 (setup + market sizing) — fonctionnels sans IA
- 1 Power module template (ex: Scale Economies) — fonctionnel avec form + scoring déterministe
- Landing page minimaliste

### Phase 2 — Méthodologie complète (1 semaine)
- Les 6 autres Power modules (réutiliser le template)
- Power Map SVG (Module 9)
- Defensibility Score + red flags

### Phase 3 — Coach IA (3-5 jours)
- Endpoint `/api/coach` avec streaming Claude
- Component CoachChat sticky
- Context injection (projet complet → system prompt)

### Phase 4 — Export PDF (2-3 jours)
- Page print-mode Nuxt
- Endpoint Puppeteer → PDF
- Layout : cover, executive summary, 7 powers detail, power map, action plan

### Phase 5 — Polish (3-5 jours)
- i18n FR/EN complet
- Examples library par secteur (DeFi/AI/SaaS)
- Onboarding tour
- Analytics (Plausible / Vercel Analytics)

---

## 9. System prompt du Coach IA (squelette)

```
You are a strategy coach specialized in Hamilton Helmer's 7 Powers framework.
Your job is to help a founder stress-test the defensibility of their project.

PROJECT CONTEXT:
- Name: {project.name}
- Sector: {project.sector}        # defi / ai / saas / web3-other
- Stage: {project.stage}           # origination / takeoff / stability
- Description: {project.description}
- Market sizing: TAM={tam}, SAM={sam}, SOM={som}
- Powers already assessed: {summary of completed power modules with scores}

CURRENT MODULE: {current_power}    # e.g. "Switching Costs"

METHODOLOGY RULES:
- Every Power requires BOTH a Benefit (cash flow ↑) AND a Barrier (prevents arbitrage).
  If only Benefit → not a Power, just an advantage that will be arbitraged.
- Apply "Me too won't do" test: would an identical, well-funded competitor fail to copy?
- Match Power to S-Curve stage:
  - Origination → Cornered Resource, Counter-Positioning
  - Takeoff → Scale Economies, Network Economies, Switching Costs
  - Stability → Branding, Process Power
- Be skeptical. Founders overclaim Powers. Push back politely.

TONE:
- Direct, founder-to-founder, no fluff.
- Use sector-specific examples (DeFi: Uniswap/Aave/Curve; AI: agent moats; SaaS: classic).
- French or English depending on user's language.

When the founder claims a Power, ask:
1. What's the measurable Benefit?
2. What's the Barrier — and would it hold against a $50M-funded copycat?
3. Is this realistic at your current stage?
```

---

## 10. Identité visuelle (cohérence avec les autres apps)

Vu sur Regul8, Tokenlab, Gameframe :
- **Dark mode par défaut**, fond `#0a0a0f` ou similaire
- **Accent bleu électrique** sur les CTAs et bordures (le bord bleu du screenshot fourni)
- **Cards bordées subtiles** avec hover glow
- **Typo** : sans-serif moderne (Inter / Geist)
- **Icons symboliques** type ⬡ ◈ ◎ ⇄ △ — pas de Lucide générique
- **Pas de bullet points** → tout en cards ou en grid

Pour 7Powers spécifiquement, suggestion :
- Chaque Power a un **glyphe** unique (ex: ⚖ pour Process, ⬡ pour Scale, ◉ pour Network…)
- Le **Power Radar** est l'objet visuel signature (comme Value Flow chez Tokenlab)
- Couleur d'accent secondaire : ambre/or sur les "high-score Powers" pour suggérer "ce qui brille = ce qui tient"

---

## 11. Ce que tu donnes à Claude Code pour démarrer

Quand tu lances Claude Code dans le dossier vide, tu peux dire :

> Build the 7Powers webapp following the spec in `sevenpowers-spec.md`. Stack: Nuxt 3, TypeScript, Tailwind, Supabase, Pinia, i18n FR/EN, Anthropic Claude API for the AI Coach. Start with Phase 1 of the roadmap. Match the visual identity of these existing apps: regul8app.vercel.app, tokenlabapp.vercel.app, gameframeapp.vercel.app (dark mode, blue accent, bordered cards, symbolic glyphs, no bullet lists).

---

## 12. Questions ouvertes à trancher avant build

1. **Account model :** comme Gameframe ("aucun compte requis pour commencer") ou comme Tokenlab (auth dès le départ) ? → Recommandation : Gameframe-style, on stocke en local storage tant que pas de login, on migre vers Supabase au login.
2. **Branding du nom :** "7Powers" / "Powerframe" / "Moatlab" / "Sevenframe" → cohérent avec le naming des autres (Tokenlab, Gameframe, Pitchcraft) suggère **Powerlab** ou **Moatframe**.
3. **Mode "evaluator" pour VCs :** ajout d'un mode où on évalue le projet d'un *autre* founder sur la base de son pitch — utile pour ton incubateur et pour les programs partners.
4. **Library d'exemples :** précharger 20-30 cas (Uniswap, Aave, OpenAI, Anthropic, Linear, Notion…) que le founder peut consulter pour s'inspirer.

---

**Fin de spec.** Prêt à donner à Claude Code.
