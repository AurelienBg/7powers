// Hand-maintained DB types for the 7Powers schema.
// Keep in sync with supabase/migrations/0001_init.sql.
// (When the schema stabilizes, switch to `supabase gen types typescript`.)

export type ProjectSector = 'defi' | 'ai' | 'saas' | 'web3-other'

export type ProjectStage = 'origination' | 'takeoff' | 'stability'

export type PowerType =
  | 'scale'
  | 'network'
  | 'counter'
  | 'switching'
  | 'branding'
  | 'cornered'
  | 'process'

export type CoachRole = 'user' | 'assistant' | 'system'

export interface MarketSize {
  tam?: number
  sam?: number
  som?: number
  unit?: 'usd' | 'eur'
  sources?: string[]
  notes?: string
}

export interface PowerAnswers {
  q1?: number // Benefit clarity 0-5
  q2?: number // Benefit magnitude 0-5
  q3?: number // Barrier height 0-5
  q4?: number // Me-too test 0-5
  q5?: number // Stage fit 0-5
  benefit?: string
  barrier?: string
  notes?: string
}

export interface ActionItem {
  title: string
  why?: string
  eta?: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  sector: ProjectSector
  stage: ProjectStage
  description: string | null
  market_size: MarketSize
  created_at: string
  updated_at: string
}

export interface PowerAssessment {
  id: string
  project_id: string
  power: PowerType
  answers: PowerAnswers
  score: number | null
  action_items: ActionItem[]
  created_at: string
  updated_at: string
}

export interface CoachMessage {
  id: string
  project_id: string
  power_context: PowerType | null
  role: CoachRole
  content: string
  created_at: string
}

// Local-only variants (no DB ids yet) for Gameframe-style local-first storage.
// When the user logs in, these get migrated to Supabase.

export type LocalProject = Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'> & {
  local_id: string
  created_at: string
  updated_at: string
}

export type LocalPowerAssessment = Omit<
  PowerAssessment,
  'id' | 'project_id' | 'created_at' | 'updated_at'
> & {
  local_id: string
  local_project_id: string
  created_at: string
  updated_at: string
}
