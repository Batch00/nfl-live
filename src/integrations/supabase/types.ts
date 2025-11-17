export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      game_snapshots: {
        Row: {
          away_fpi: Json | null
          away_score: number
          away_stats: Json | null
          away_team: string
          away_team_abbr: string
          betting_lines: Json | null
          broadcast: string | null
          clock: string | null
          created_at: string
          drives: Json | null
          game_date: string
          game_id: string
          game_start_time: string | null
          game_status: string
          home_fpi: Json | null
          home_score: number
          home_stats: Json | null
          home_team: string
          home_team_abbr: string
          id: string
          last_scoring_team: string | null
          play_by_play: Json | null
          quarter: number
          venue: string | null
        }
        Insert: {
          away_fpi?: Json | null
          away_score?: number
          away_stats?: Json | null
          away_team: string
          away_team_abbr: string
          betting_lines?: Json | null
          broadcast?: string | null
          clock?: string | null
          created_at?: string
          drives?: Json | null
          game_date: string
          game_id: string
          game_start_time?: string | null
          game_status: string
          home_fpi?: Json | null
          home_score?: number
          home_stats?: Json | null
          home_team: string
          home_team_abbr: string
          id?: string
          last_scoring_team?: string | null
          play_by_play?: Json | null
          quarter: number
          venue?: string | null
        }
        Update: {
          away_fpi?: Json | null
          away_score?: number
          away_stats?: Json | null
          away_team?: string
          away_team_abbr?: string
          betting_lines?: Json | null
          broadcast?: string | null
          clock?: string | null
          created_at?: string
          drives?: Json | null
          game_date?: string
          game_id?: string
          game_start_time?: string | null
          game_status?: string
          home_fpi?: Json | null
          home_score?: number
          home_stats?: Json | null
          home_team?: string
          home_team_abbr?: string
          id?: string
          last_scoring_team?: string | null
          play_by_play?: Json | null
          quarter?: number
          venue?: string | null
        }
        Relationships: []
      }
      halftime_email_recipients: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      halftime_exports: {
        Row: {
          away_team: string | null
          created_at: string
          csv_content: string | null
          csv_filename: string
          csv_path: string | null
          email_status: string
          emailed_at: string
          error_message: string | null
          game_date: string | null
          game_id: string
          home_team: string | null
          id: string
          recipient_email: string
          week: number | null
          year: number | null
        }
        Insert: {
          away_team?: string | null
          created_at?: string
          csv_content?: string | null
          csv_filename: string
          csv_path?: string | null
          email_status?: string
          emailed_at?: string
          error_message?: string | null
          game_date?: string | null
          game_id: string
          home_team?: string | null
          id?: string
          recipient_email: string
          week?: number | null
          year?: number | null
        }
        Update: {
          away_team?: string | null
          created_at?: string
          csv_content?: string | null
          csv_filename?: string
          csv_path?: string | null
          email_status?: string
          emailed_at?: string
          error_message?: string | null
          game_date?: string | null
          game_id?: string
          home_team?: string | null
          id?: string
          recipient_email?: string
          week?: number | null
          year?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_old_snapshots: { Args: { cutoff_date: string }; Returns: number }
      delete_old_snapshots_batch: {
        Args: { batch_limit: number; cutoff_date: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
