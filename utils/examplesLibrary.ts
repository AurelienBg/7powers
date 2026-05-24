/**
 * Examples library — 12 case studies of companies analyzed through the
 * lens of Hamilton Helmer's 7 Powers. Used by `pages/examples.vue` and
 * cross-referenced from `pages/learn.vue`.
 *
 * Each case includes:
 *   - The dominant Power (the one that holds the value)
 *   - Estimated scores per Power on the same 0-100 scale the app uses,
 *     so users can compare their own scoring to canonical examples
 *   - One-line Benefit + Barrier framing for instant pedagogical hit
 *   - A short context paragraph explaining the case
 *
 * Scoring caveat: these are *interpretive* estimates by the 7Powers team,
 * not Helmer's own numbers. The point isn't precision — it's giving founders
 * a shared yardstick to ground their own assessments.
 *
 * Bilingual: every string the user sees is `{ fr, en }`.
 */

import type { ProjectSector, ProjectStage, PowerType } from '~/types/database'

/** Loosened sector for the library: includes "classic" cases that don't
 *  fit the 4-sector form taxonomy (Netflix, Uber, etc.). */
export type ExampleSector = ProjectSector | 'classic'

export interface LocalizedString {
  fr: string
  en: string
}

export interface ExampleCase {
  id: string
  name: string
  sector: ExampleSector
  stage: ProjectStage
  dominantPower: PowerType
  /** 0-100, one entry per Power. */
  scores: Record<PowerType, number>
  benefit: LocalizedString
  barrier: LocalizedString
  /** 2-4 sentences explaining the case, shown on expand. */
  context: LocalizedString
  /** Optional reference URL (Wikipedia, official site, Helmer write-up). */
  url?: string
}

// ============================================================
// The 12 cases
// ============================================================

export const EXAMPLES_LIBRARY: ExampleCase[] = [
  // ------------------------------------------------------------
  // Netflix — Scale Economies (content amortization)
  // ------------------------------------------------------------
  {
    id: 'netflix',
    name: 'Netflix',
    sector: 'classic',
    stage: 'stability',
    dominantPower: 'scale',
    scores: {
      scale: 85, network: 30, counter: 70, switching: 40,
      branding: 65, cornered: 15, process: 50
    },
    benefit: {
      fr: "Coût par utilisateur du contenu original divisé par ~200M abonnés.",
      en: "Original content cost amortized across ~200M subscribers."
    },
    barrier: {
      fr: "Un challenger doit dépenser autant que Netflix sans la base d'abonnés pour amortir.",
      en: "Any challenger must match Netflix's content spend without the subscriber base to amortize over."
    },
    context: {
      fr: "Netflix a basculé du streaming licencié au contenu original (House of Cards, 2013) précisément pour activer Scale Economies. Le coût d'une saison est fixe ; le revenu croît linéairement avec le nombre d'abonnés. Disney+, HBO et Apple TV+ jouent sur le même axe — c'est la guerre des Scale Economies adjacentes, pas une remise en cause du modèle.",
      en: "Netflix's pivot from licensed streaming to original content (House of Cards, 2013) was a deliberate Scale Economies play. A season's cost is fixed; revenue scales linearly with subscriber count. Disney+, HBO, and Apple TV+ are all playing the same Scale game — this is adjacent Scale competition, not a challenge to the model."
    },
    url: 'https://7powers.com/book'
  },

  // ------------------------------------------------------------
  // Uber — Network Economies (riders ↔ drivers)
  // ------------------------------------------------------------
  {
    id: 'uber',
    name: 'Uber',
    sector: 'classic',
    stage: 'takeoff',
    dominantPower: 'network',
    scores: {
      scale: 50, network: 80, counter: 35, switching: 25,
      branding: 55, cornered: 10, process: 60
    },
    benefit: {
      fr: "Plus de chauffeurs → ETA plus court ; plus de passagers → revenu chauffeur plus stable.",
      en: "More drivers → shorter ETA for riders; more riders → steadier income for drivers."
    },
    barrier: {
      fr: "Démarrer Uber-bis exige une masse critique sur les DEUX côtés simultanément, ville par ville.",
      en: "Bootstrapping an Uber-clone requires critical mass on BOTH sides simultaneously, city by city."
    },
    context: {
      fr: "Network Economies par excellence : la valeur pour un côté du marché augmente avec la densité de l'autre. Mais Uber illustre aussi la fragilité de la Power — Network Economies sont locales (chaque ville est un marché distinct) et basses en switching costs (un chauffeur peut conduire Uber + Lyft + Bolt simultanément). D'où le combat permanent pour la dominance.",
      en: "Network Economies in their purest form: value to one side scales with density of the other. But Uber also illustrates the fragility — Network Economies are local (each city is a separate market) and have low switching costs (drivers run Uber + Lyft + Bolt at the same time). Hence the permanent fight for dominance."
    }
  },

  // ------------------------------------------------------------
  // Apple — Branding (premium device perception)
  // ------------------------------------------------------------
  {
    id: 'apple',
    name: 'Apple',
    sector: 'classic',
    stage: 'stability',
    dominantPower: 'branding',
    scores: {
      scale: 75, network: 60, counter: 30, switching: 70,
      branding: 90, cornered: 25, process: 70
    },
    benefit: {
      fr: "Marge brute ~40% sur l'iPhone vs ~10% sur Samsung S-series. Premium pricing pur Branding.",
      en: "iPhone gross margin ~40% vs ~10% on Samsung S-series. Pure Branding premium pricing."
    },
    barrier: {
      fr: "30 ans de signaling cohérent (design, storytelling, retail). Branding exige une hystérèse temporelle qu'un challenger ne peut accélérer avec du capital.",
      en: "30 years of consistent signaling (design, storytelling, retail). Branding requires temporal hysteresis no amount of capital can fast-forward."
    },
    context: {
      fr: "Apple combine plusieurs Powers, mais Branding est le pilier qui justifie le premium pricing. C'est l'archétype helmerien : la marque ne se construit pas par campagne marketing, elle s'accumule par cohérence sur des décennies. Note : Branding seul n'est jamais une Power à stage Origination — Apple a mis ~20 ans à la verrouiller.",
      en: "Apple combines several Powers, but Branding is the pillar justifying premium pricing. The canonical Helmer case: brand isn't built by ad campaigns, it accumulates through decades of consistency. Note: Branding alone is never a Power at Origination stage — it took Apple ~20 years to lock it in."
    }
  },

  // ------------------------------------------------------------
  // Visa — Network Economies (two-sided card network)
  // ------------------------------------------------------------
  {
    id: 'visa',
    name: 'Visa',
    sector: 'classic',
    stage: 'stability',
    dominantPower: 'network',
    scores: {
      scale: 70, network: 95, counter: 20, switching: 75,
      branding: 80, cornered: 30, process: 65
    },
    benefit: {
      fr: "Plus de cartes acceptées partout → plus de cardholders ; plus de cardholders → plus de marchands l'acceptent.",
      en: "More cards accepted everywhere → more cardholders; more cardholders → more merchants accept."
    },
    barrier: {
      fr: "Le réseau est mondial. Un challenger doit recruter cardholders + marchands + banques émettrices + acquéreurs simultanément.",
      en: "The network is global. A challenger must onboard cardholders + merchants + issuing banks + acquirers simultaneously."
    },
    context: {
      fr: "Le manuel Helmer pour Network Economies : un réseau bi-face si dense qu'un newcomer ne peut pas démarrer. Note que Visa empile aussi Branding (confiance) et Switching (intégrations banques). Les vraies fortifications sont composées — rarement mono-Power.",
      en: "Textbook Helmer Network Economies: a two-sided network so dense newcomers can't bootstrap. Note Visa also stacks Branding (trust) and Switching (bank integrations). Real fortresses are composite — rarely mono-Power."
    }
  },

  // ------------------------------------------------------------
  // Salesforce — Switching Costs (data + integrations lock-in)
  // ------------------------------------------------------------
  {
    id: 'salesforce',
    name: 'Salesforce',
    sector: 'saas',
    stage: 'stability',
    dominantPower: 'switching',
    scores: {
      scale: 65, network: 35, counter: 25, switching: 90,
      branding: 70, cornered: 15, process: 75
    },
    benefit: {
      fr: "Coûts cachés de migration : historique client, workflows custom, intégrations API, formation équipe.",
      en: "Hidden migration costs: customer history, custom workflows, API integrations, team training."
    },
    barrier: {
      fr: "Plus la durée d'usage augmente, plus le coût de migration croît exponentiellement. Une fois 5+ ans en place, le switching cost dépasse souvent la valeur du remplacement.",
      en: "The longer the deployment, the more switching cost compounds. After 5+ years, the cost of leaving usually exceeds the value of any replacement."
    },
    context: {
      fr: "Salesforce illustre comment Switching Costs *se construisent dans le temps* via l'accumulation de données client + customizations + intégrations tierces. C'est aussi pourquoi les pricing hikes annuels passent — les clients calculent le switch et restent. Attention : Switching Costs ne se déclenche qu'au Takeoff ou plus tard, pas à l'Origination.",
      en: "Salesforce shows how Switching Costs *compound over time* via accumulated customer data + customizations + third-party integrations. It's also why annual price hikes stick — customers run the switch math and stay. Note: Switching Costs only activates at Takeoff or later, never Origination."
    }
  },

  // ------------------------------------------------------------
  // Linear — Branding (modern dev-tool aesthetic)
  // ------------------------------------------------------------
  {
    id: 'linear',
    name: 'Linear',
    sector: 'saas',
    stage: 'takeoff',
    dominantPower: 'branding',
    scores: {
      scale: 35, network: 45, counter: 60, switching: 55,
      branding: 80, cornered: 10, process: 65
    },
    benefit: {
      fr: "Adoption virale bottom-up : les devs choisissent Linear pour le ressenti, pas pour les features.",
      en: "Viral bottom-up adoption: developers pick Linear for the feel, not the feature checklist."
    },
    barrier: {
      fr: "Identité visuelle + interaction si distincte qu'un clone fonctionnellement identique reste perçu comme inférieur.",
      en: "Visual + interaction identity so distinct that a functionally-identical clone still reads as inferior."
    },
    context: {
      fr: "Linear est Branding-first dans un marché (issue tracking) jusque-là dominé par Jira (anti-Branding). La proposition n'est pas \"meilleures features\" — c'est \"on respecte ton goût et ton temps\". À noter : Branding au Takeoff est rare et exigeant ; la plupart des startups SaaS ne l'atteignent pas avant Stability. Linear l'a comprimé par cohérence design extrême.",
      en: "Linear is Branding-first in a market (issue tracking) historically dominated by Jira (anti-Branding). The proposition isn't \"better features\" — it's \"we respect your taste and your time.\" Branding at Takeoff is rare and demanding; most SaaS startups don't get there before Stability. Linear compressed it through extreme design consistency."
    }
  },

  // ------------------------------------------------------------
  // Notion — Network Economies (collaborative workspaces) + Switching
  // ------------------------------------------------------------
  {
    id: 'notion',
    name: 'Notion',
    sector: 'saas',
    stage: 'takeoff',
    dominantPower: 'network',
    scores: {
      scale: 50, network: 70, counter: 50, switching: 75,
      branding: 65, cornered: 10, process: 60
    },
    benefit: {
      fr: "Plus l'équipe a documenté dans Notion, plus la valeur de référence interne croît. Effet de réseau intra-organisationnel.",
      en: "The more a team documents in Notion, the more internal-reference value grows. Intra-organisation network effect."
    },
    barrier: {
      fr: "Migrer N pages liées entre elles, avec databases custom + permissions imbriquées, est un projet à 6 chiffres pour une scale-up.",
      en: "Migrating N interlinked pages with custom databases + nested permissions is a six-figure project for a scale-up."
    },
    context: {
      fr: "Notion empile Network (intra-org : plus de contenu = plus de référence interne) et Switching (graphe de liens + permissions). Le pivot stratégique de Notion AI a ajouté un soupçon de Scale Economies (modèle entraîné sur les patterns d'usage agrégés). Beau cas de Powers composées sans concentration mono-axiale.",
      en: "Notion stacks Network (intra-org: more content = more internal reference value) and Switching (link graph + permissions). The Notion AI pivot added a sliver of Scale Economies (model trained on aggregate usage patterns). A clean case of composed Powers without mono-axis concentration."
    }
  },

  // ------------------------------------------------------------
  // Uniswap — Network Economies (LP ↔ traders)
  // ------------------------------------------------------------
  {
    id: 'uniswap',
    name: 'Uniswap',
    sector: 'defi',
    stage: 'takeoff',
    dominantPower: 'network',
    scores: {
      scale: 60, network: 85, counter: 70, switching: 30,
      branding: 70, cornered: 20, process: 55
    },
    benefit: {
      fr: "Plus de liquidité → meilleur slippage pour les traders ; plus de volume → meilleur APR pour les LP.",
      en: "More liquidity → better slippage for traders; more volume → better APR for LPs."
    },
    barrier: {
      fr: "Un challenger doit attirer la liquidité ET les traders simultanément, sans la légitimité d'usage des 4+ années Uniswap.",
      en: "A challenger needs to attract both liquidity AND traders simultaneously, without Uniswap's 4+ years of legitimacy."
    },
    context: {
      fr: "Uniswap est l'archétype DeFi du Network Economies, copié sur le modèle Visa mais open-source. Curve, Balancer, SushiSwap ont tenté du Counter-Positioning (frais inférieurs, courbes spécialisées). Uniswap a tenu en partie grâce à Branding émergent et au lock-in de l'intégration upstream (wallets, aggregators routent par défaut vers Uniswap).",
      en: "Uniswap is the DeFi archetype of Network Economies, structurally similar to Visa but open-source. Curve, Balancer, SushiSwap have tried Counter-Positioning (lower fees, specialized curves). Uniswap held partly thanks to emergent Branding and upstream integration lock-in (wallets, aggregators default to Uniswap routes)."
    }
  },

  // ------------------------------------------------------------
  // Aave — Process Power (audited, battle-tested risk engine)
  // ------------------------------------------------------------
  {
    id: 'aave',
    name: 'Aave',
    sector: 'defi',
    stage: 'takeoff',
    dominantPower: 'process',
    scores: {
      scale: 55, network: 65, counter: 45, switching: 60,
      branding: 70, cornered: 25, process: 80
    },
    benefit: {
      fr: "Risk engine éprouvé sur 4+ années + 0 exploit majeur = TVL premium vs concurrents.",
      en: "Battle-tested risk engine + 0 major exploits over 4+ years = premium TVL vs competitors."
    },
    barrier: {
      fr: "Un fork de Aave reste un fork — il n'hérite pas du track record d'audit. Or les whales déposent là où le risque est minimal.",
      en: "A fork of Aave is just a fork — it doesn't inherit the audit track record. Whales deposit where the risk is minimized."
    },
    context: {
      fr: "En DeFi le Process Power est rare mais critique : c'est l'accumulation de procédures de gestion du risque, de gouvernance, de monitoring. Compound a perdu sa position en partie parce qu'Aave a maintenu un Process supérieur (intégrations Chainlink, flash loans, isolation modes). Note : la Process Power se construit dans la durée — impossible à \"hacker\" en levant un round.",
      en: "Process Power is rare but critical in DeFi: the accumulation of risk-management procedures, governance, monitoring. Compound lost ground partly because Aave maintained superior Process (Chainlink integrations, flash loans, isolation modes). Note: Process Power is built over time — can't be \"hacked\" by raising a round."
    }
  },

  // ------------------------------------------------------------
  // Anthropic — Scale Economies (model training amortization)
  // ------------------------------------------------------------
  {
    id: 'anthropic',
    name: 'Anthropic',
    sector: 'ai',
    stage: 'takeoff',
    dominantPower: 'scale',
    scores: {
      scale: 85, network: 25, counter: 60, switching: 50,
      branding: 65, cornered: 50, process: 60
    },
    benefit: {
      fr: "Coût d'entraînement (100M$+) amorti sur des milliards de tokens d'API + millions d'abonnés Claude.",
      en: "Training cost ($100M+) amortized across billions of API tokens + millions of Claude subscribers."
    },
    barrier: {
      fr: "Un newcomer doit lever ~1B$ avant le premier token vendu. Capital intensity = barrière structurelle.",
      en: "A newcomer must raise ~$1B before selling a single token. Capital intensity = structural barrier."
    },
    context: {
      fr: "Anthropic (et OpenAI, Google DeepMind) jouent Scale Economies à la mode \"chip foundry\" : la R&D est massive et fixe, le revenu unitaire est marginal mais scalable. Distinction importante : ce n'est PAS Cornered Resource — les données d'entraînement sont largement accessibles. C'est bien Scale via investment intensity. Risque : open-source rattrape (Llama, Mistral). À surveiller.",
      en: "Anthropic (and OpenAI, Google DeepMind) play Scale Economies in the \"chip foundry\" mode: R&D is massive and fixed, unit revenue is marginal but scalable. Key distinction: this is NOT Cornered Resource — training data is broadly accessible. It's Scale via investment intensity. Risk: open-source catches up (Llama, Mistral). Worth watching."
    }
  },

  // ------------------------------------------------------------
  // Midjourney — Branding (artistic identity)
  // ------------------------------------------------------------
  {
    id: 'midjourney',
    name: 'Midjourney',
    sector: 'ai',
    stage: 'takeoff',
    dominantPower: 'branding',
    scores: {
      scale: 50, network: 55, counter: 65, switching: 35,
      branding: 80, cornered: 20, process: 70
    },
    benefit: {
      fr: "Le \"look Midjourney\" est si reconnaissable que des artistes le réclament explicitement comme style.",
      en: "The \"Midjourney look\" is so recognizable that artists explicitly request it as a style."
    },
    barrier: {
      fr: "L'esthétique distinctive est née d'un fine-tuning + RLHF spécifique. Imposable à reproduire 1:1 même avec le même modèle base.",
      en: "The distinctive aesthetic emerged from a specific fine-tuning + RLHF loop. Hard to replicate 1:1 even with the same base model."
    },
    context: {
      fr: "Cas rare de Branding à Takeoff : Midjourney a construit en ~2 ans une signature artistique aussi reconnaissable que celle d'un illustrateur humain. Combiné à un Process Power émergent (la RLHF loop avec la communauté Discord). Vulnérabilité : si l'esthétique devient mainstream, le premium disparaît. Modèle à étudier pour les startups AI cherchant à se différencier sans Scale.",
      en: "Rare case of Branding at Takeoff: Midjourney built a recognizable artistic signature in ~2 years — as recognizable as a human illustrator's. Combined with emergent Process Power (RLHF loop with the Discord community). Vulnerability: if the aesthetic becomes mainstream, the premium evaporates. Worth studying for AI startups trying to differentiate without Scale."
    }
  },

  // ------------------------------------------------------------
  // Cursor — Counter-Positioning (AI-first IDE vs JetBrains/VSCode)
  // ------------------------------------------------------------
  {
    id: 'cursor',
    name: 'Cursor',
    sector: 'ai',
    stage: 'takeoff',
    dominantPower: 'counter',
    scores: {
      scale: 40, network: 30, counter: 85, switching: 45,
      branding: 65, cornered: 25, process: 60
    },
    benefit: {
      fr: "AI-first dès la conception. Pas de retrofit comme GitHub Copilot greffé sur VSCode.",
      en: "AI-first from the architecture out. No retrofit, unlike GitHub Copilot bolted onto VSCode."
    },
    barrier: {
      fr: "JetBrains/Microsoft ne peuvent pas reproduire sans cannibaliser leur revenu existant (IDE payants, subscriptions, partenariats).",
      en: "JetBrains/Microsoft can't replicate without cannibalizing existing revenue (paid IDEs, subscriptions, partnerships)."
    },
    context: {
      fr: "Cursor illustre Counter-Positioning à la perfection : un nouveau modèle (AI-first + pricing par usage) qu'un incumbent ne PEUT PAS adopter sans détruire son business. JetBrains ne peut pas brader IntelliJ. Microsoft a Copilot mais ne peut pas refondre VSCode. Le \"won't do\" est la vraie Power, pas le \"can't do\". Stage Takeoff confirmé par PMF + croissance organique.",
      en: "Cursor textbook Counter-Positioning: a new model (AI-first + usage-based pricing) an incumbent CANNOT adopt without destroying its business. JetBrains can't undercut IntelliJ. Microsoft has Copilot but can't rebuild VSCode from scratch. The \"won't do\" is the real Power, not the \"can't do.\" Takeoff stage confirmed by PMF + organic growth."
    }
  }
]

// ============================================================
// Helpers consumed by pages/examples.vue
// ============================================================

/** Stable list of all sectors that appear in the library (for the filter UI). */
export const EXAMPLE_SECTORS: ExampleSector[] = ['defi', 'ai', 'saas', 'classic']

/** Sector display labels — sourced from the existing locale files when
 *  possible (defi/ai/saas already exist), with our own 'classic' bucket. */
export const SECTOR_LABEL_KEYS: Record<ExampleSector, string> = {
  defi: 'sectors.defi',
  ai: 'sectors.ai',
  saas: 'sectors.saas',
  'web3-other': 'sectors.web3-other',
  classic: 'examples.sectors.classic'
}
