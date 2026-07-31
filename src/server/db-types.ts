// Hand-written to match supabase/migrations/0001_init.sql — no Supabase CLI
// in this project, so there's no `supabase gen types` output to import.
// Keep this in sync manually when the schema changes.
//
// NOTE: each table's Row/Insert/Update must be inline object literals, not
// built through a shared generic helper (e.g. `TableDef<Row, Optional>`).
// postgrest-js's `.select()` string-parsing types pattern-match against the
// literal shape and resolve to `never` when the shape comes from a generic
// alias instantiation instead — verified by isolated repro against
// @supabase/supabase-js 2.110.

export type NewsCategoryRow =
  "ai" | "finance" | "politics" | "international" | "technology"
export type NewsRegionRow = "us" | "tw"
export type MbtiTypeRow =
  | "INTJ"
  | "INTP"
  | "ENTJ"
  | "ENTP"
  | "INFJ"
  | "INFP"
  | "ENFJ"
  | "ENFP"
  | "ISTJ"
  | "ISFJ"
  | "ESTJ"
  | "ESFJ"
  | "ISTP"
  | "ISFP"
  | "ESTP"
  | "ESFP"
export type AppRoleRow = "admin" | "user"

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          category: NewsCategoryRow
          region: NewsRegionRow
          headline: string
          source_name: string
          source_url: string
          published_at: string
          summary: string
          cache_date: string
          created_at: string
        }
        Insert: {
          id?: string
          category: NewsCategoryRow
          region?: NewsRegionRow
          headline: string
          source_name: string
          source_url: string
          published_at: string
          summary: string
          cache_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          category?: NewsCategoryRow
          region?: NewsRegionRow
          headline?: string
          source_name?: string
          source_url?: string
          published_at?: string
          summary?: string
          cache_date?: string
          created_at?: string
        }
        Relationships: []
      }
      decision_makers: {
        Row: {
          id: string
          event_id: string
          name: string
          role: string
          mbti: MbtiTypeRow
          reasoning: string
          confidence: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          role: string
          mbti: MbtiTypeRow
          reasoning: string
          confidence: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          role?: string
          mbti?: MbtiTypeRow
          reasoning?: string
          confidence?: number
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          id: string
          event_id: string
          is_default: boolean
          overall_confidence: number
          reasoning_summary: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          is_default?: boolean
          overall_confidence: number
          reasoning_summary: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          is_default?: boolean
          overall_confidence?: number
          reasoning_summary?: string
          created_at?: string
        }
        Relationships: []
      }
      prediction_nodes: {
        Row: {
          id: string
          prediction_id: string
          day_offset: number
          predicted_date: string
          headline: string
          summary: string
          driver_names: string[]
          trait_reasoning: string
          confidence: number
          sort_order: number
        }
        Insert: {
          id?: string
          prediction_id: string
          day_offset: number
          predicted_date: string
          headline: string
          summary: string
          driver_names?: string[]
          trait_reasoning: string
          confidence: number
          sort_order?: number
        }
        Update: {
          id?: string
          prediction_id?: string
          day_offset?: number
          predicted_date?: string
          headline?: string
          summary?: string
          driver_names?: string[]
          trait_reasoning?: string
          confidence?: number
          sort_order?: number
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          label: string
          overrides: Record<string, string>
          prediction_id: string
          branch_color: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          label: string
          overrides?: Record<string, string>
          prediction_id: string
          branch_color?: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          label?: string
          overrides?: Record<string, string>
          prediction_id?: string
          branch_color?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: AppRoleRow
        }
        Insert: {
          user_id: string
          role: AppRoleRow
        }
        Update: {
          user_id?: string
          role?: AppRoleRow
        }
        Relationships: []
      }
      provider_audits: {
        Row: {
          id: string
          checked_at: string
          region: NewsRegionRow
          provider: string
          ok: boolean
          article_count: number
          error: string | null
        }
        Insert: {
          id?: string
          checked_at?: string
          region: NewsRegionRow
          provider: string
          ok: boolean
          article_count?: number
          error?: string | null
        }
        Update: {
          id?: string
          checked_at?: string
          region?: NewsRegionRow
          provider?: string
          ok?: boolean
          article_count?: number
          error?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRoleRow }
        Returns: boolean
      }
    }
    Enums: {
      news_category: NewsCategoryRow
      news_region: NewsRegionRow
      mbti_type: MbtiTypeRow
      app_role: AppRoleRow
    }
  }
}
