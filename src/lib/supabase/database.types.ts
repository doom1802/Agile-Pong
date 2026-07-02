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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      match_events: {
        Row: {
          automatic: boolean
          created_at: string
          id: string
          match_id: string
          type: Database["public"]["Enums"]["match_event_type"]
          user_id: string
        }
        Insert: {
          automatic?: boolean
          created_at?: string
          id?: string
          match_id: string
          type: Database["public"]["Enums"]["match_event_type"]
          user_id: string
        }
        Update: {
          automatic?: boolean
          created_at?: string
          id?: string
          match_id?: string
          type?: Database["public"]["Enums"]["match_event_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          match_id: string
          position: number
          rating_after: number | null
          rating_before: number | null
          rating_delta: number | null
          rating_kind: Database["public"]["Enums"]["rating_kind"]
          side: Database["public"]["Enums"]["match_side"]
          user_id: string
        }
        Insert: {
          match_id: string
          position: number
          rating_after?: number | null
          rating_before?: number | null
          rating_delta?: number | null
          rating_kind: Database["public"]["Enums"]["rating_kind"]
          side: Database["public"]["Enums"]["match_side"]
          user_id: string
        }
        Update: {
          match_id?: string
          position?: number
          rating_after?: number | null
          rating_before?: number | null
          rating_delta?: number | null
          rating_kind?: Database["public"]["Enums"]["rating_kind"]
          side?: Database["public"]["Enums"]["match_side"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_sets: {
        Row: {
          match_id: string
          set_number: number
          side_a_points: number
          side_b_points: number
        }
        Insert: {
          match_id: string
          set_number: number
          side_a_points: number
          side_b_points: number
        }
        Update: {
          match_id?: string
          set_number?: number
          side_a_points?: number
          side_b_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          anti_farming_factor: number
          auto_confirmed_at: string | null
          best_of: number | null
          confirmed_by_user_id: string | null
          created_at: string
          created_by_user_id: string
          id: string
          mode: Database["public"]["Enums"]["match_mode"]
          played_at: string | null
          points_to_win: number | null
          rating_applied: boolean
          season_id: string | null
          status: Database["public"]["Enums"]["match_status"]
          submitted_by_user_id: string | null
          type: Database["public"]["Enums"]["match_type"]
          updated_at: string
          winner_side: Database["public"]["Enums"]["match_side"] | null
        }
        Insert: {
          anti_farming_factor?: number
          auto_confirmed_at?: string | null
          best_of?: number | null
          confirmed_by_user_id?: string | null
          created_at?: string
          created_by_user_id: string
          id?: string
          mode: Database["public"]["Enums"]["match_mode"]
          played_at?: string | null
          points_to_win?: number | null
          rating_applied?: boolean
          season_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          submitted_by_user_id?: string | null
          type: Database["public"]["Enums"]["match_type"]
          updated_at?: string
          winner_side?: Database["public"]["Enums"]["match_side"] | null
        }
        Update: {
          anti_farming_factor?: number
          auto_confirmed_at?: string | null
          best_of?: number | null
          confirmed_by_user_id?: string | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["match_mode"]
          played_at?: string | null
          points_to_win?: number | null
          rating_applied?: boolean
          season_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          submitted_by_user_id?: string | null
          type?: Database["public"]["Enums"]["match_type"]
          updated_at?: string
          winner_side?: Database["public"]["Enums"]["match_side"] | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_confirmed_by_user_id_fkey"
            columns: ["confirmed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_ratings: {
        Row: {
          created_at: string
          doubles_ranked_matches: number
          doubles_rating: number
          season_id: string
          singles_ranked_matches: number
          singles_rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doubles_ranked_matches?: number
          doubles_rating?: number
          season_id: string
          singles_ranked_matches?: number
          singles_rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doubles_ranked_matches?: number
          doubles_rating?: number
          season_id?: string
          singles_ranked_matches?: number
          singles_rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_login_at: string
          last_name: string
          nickname: string
          office_location: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string
          created_at?: string
          email: string
          first_name?: string
          id: string
          last_login_at?: string
          last_name?: string
          nickname?: string
          office_location?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_login_at?: string
          last_name?: string
          nickname?: string
          office_location?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          name: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          name: string
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          name?: string
          starts_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_match_command: { Args: { p_match_id: string }; Returns: undefined }
      confirm_match_result_command: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      create_match_command: {
        Args: {
          p_best_of: number
          p_mode: Database["public"]["Enums"]["match_mode"]
          p_player_ids: string[]
          p_points_to_win: number
          p_type: Database["public"]["Enums"]["match_type"]
        }
        Returns: string
      }
      dispute_match_command: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      edit_last_match_result_command: {
        Args: { p_match_id: string; p_sets: Json }
        Returns: undefined
      }
      submit_match_result_command: {
        Args: { p_match_id: string; p_sets: Json }
        Returns: undefined
      }
    }
    Enums: {
      match_event_type:
        | "created"
        | "submitted"
        | "confirmed"
        | "disputed"
        | "cancelled"
        | "admin_edited"
        | "admin_deleted"
      match_mode: "ranked" | "unranked"
      match_side: "A" | "B"
      match_status:
        | "ready"
        | "submitted"
        | "confirmed"
        | "disputed"
        | "cancelled"
      match_type: "singles" | "doubles"
      rating_kind: "singles" | "doubles" | "none"
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
      match_event_type: [
        "created",
        "submitted",
        "confirmed",
        "disputed",
        "cancelled",
        "admin_edited",
        "admin_deleted",
      ],
      match_mode: ["ranked", "unranked"],
      match_side: ["A", "B"],
      match_status: [
        "ready",
        "submitted",
        "confirmed",
        "disputed",
        "cancelled",
      ],
      match_type: ["singles", "doubles"],
      rating_kind: ["singles", "doubles", "none"],
    },
  },
} as const
