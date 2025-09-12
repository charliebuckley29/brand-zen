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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_twilio_settings: {
        Row: {
          account_sid: string | null
          auth_token: string | null
          created_at: string
          id: string
          is_active: boolean | null
          sms_from: string | null
          updated_at: string
          whatsapp_from: string | null
        }
        Insert: {
          account_sid?: string | null
          auth_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          sms_from?: string | null
          updated_at?: string
          whatsapp_from?: string | null
        }
        Update: {
          account_sid?: string | null
          auth_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          sms_from?: string | null
          updated_at?: string
          whatsapp_from?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          additional_config: Json | null
          api_key: string | null
          created_at: string
          id: string
          is_active: boolean | null
          source_name: string
          updated_at: string
        }
        Insert: {
          additional_config?: Json | null
          api_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          source_name: string
          updated_at?: string
        }
        Update: {
          additional_config?: Json | null
          api_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          source_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_usage_tracking: {
        Row: {
          api_source: string
          calls_count: number
          created_at: string
          edge_function: string | null
          endpoint: string | null
          id: string
          response_status: number | null
          user_id: string | null
        }
        Insert: {
          api_source: string
          calls_count?: number
          created_at?: string
          edge_function?: string | null
          endpoint?: string | null
          id?: string
          response_status?: number | null
          user_id?: string | null
        }
        Update: {
          api_source?: string
          calls_count?: number
          created_at?: string
          edge_function?: string | null
          endpoint?: string | null
          id?: string
          response_status?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_heartbeat: {
        Row: {
          id: number
          last_beat: string | null
        }
        Insert: {
          id?: number
          last_beat?: string | null
        }
        Update: {
          id?: number
          last_beat?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          created_at: string | null
          data: Json | null
          error_details: Json | null
          event_type: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          error_details?: Json | null
          event_type: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          error_details?: Json | null
          event_type?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      bug_report_comments: {
        Row: {
          bug_report_id: string
          comment: string
          created_at: string
          id: string
          is_internal: boolean
          user_id: string
        }
        Insert: {
          bug_report_id: string
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean
          user_id: string
        }
        Update: {
          bug_report_id?: string
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_report_comments_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          actual_behavior: string | null
          assigned_to: string | null
          browser_info: Json | null
          console_logs: string | null
          created_at: string
          description: string
          expected_behavior: string | null
          id: string
          internal_notes: string[] | null
          priority: string
          resolved_at: string | null
          screenshots: string[] | null
          status: string
          steps_to_reproduce: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_behavior?: string | null
          assigned_to?: string | null
          browser_info?: Json | null
          console_logs?: string | null
          created_at?: string
          description: string
          expected_behavior?: string | null
          id?: string
          internal_notes?: string[] | null
          priority?: string
          resolved_at?: string | null
          screenshots?: string[] | null
          status?: string
          steps_to_reproduce?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_behavior?: string | null
          assigned_to?: string | null
          browser_info?: Json | null
          console_logs?: string | null
          created_at?: string
          description?: string
          expected_behavior?: string | null
          id?: string
          internal_notes?: string[] | null
          priority?: string
          resolved_at?: string | null
          screenshots?: string[] | null
          status?: string
          steps_to_reproduce?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      keywords: {
        Row: {
          brand_name: string
          created_at: string
          google_alert_rss_url: string | null
          google_alerts_enabled: boolean | null
          id: string
          updated_at: string
          user_id: string
          variants: string[] | null
        }
        Insert: {
          brand_name: string
          created_at?: string
          google_alert_rss_url?: string | null
          google_alerts_enabled?: boolean | null
          id?: string
          updated_at?: string
          user_id: string
          variants?: string[] | null
        }
        Update: {
          brand_name?: string
          created_at?: string
          google_alert_rss_url?: string | null
          google_alerts_enabled?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string
          variants?: string[] | null
        }
        Relationships: []
      }
      mention_exclusions: {
        Row: {
          created_at: string
          id: string
          keyword_id: string
          reason: string
          source_domain: string | null
          source_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword_id: string
          reason?: string
          source_domain?: string | null
          source_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword_id?: string
          reason?: string
          source_domain?: string | null
          source_url?: string
          user_id?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          cleaned_text: string | null
          content_snippet: string
          created_at: string
          escalation_type: string | null
          flagged: boolean | null
          full_text: string | null
          id: string
          internal_notes: string | null
          keyword_id: string
          legal_escalated_at: string | null
          model_used: string | null
          pr_escalated_at: string | null
          published_at: string
          sentiment: number | null
          source_name: string
          source_type: string | null
          source_url: string
          summary: string | null
          topics: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cleaned_text?: string | null
          content_snippet: string
          created_at?: string
          escalation_type?: string | null
          flagged?: boolean | null
          full_text?: string | null
          id?: string
          internal_notes?: string | null
          keyword_id: string
          legal_escalated_at?: string | null
          model_used?: string | null
          pr_escalated_at?: string | null
          published_at: string
          sentiment?: number | null
          source_name: string
          source_type?: string | null
          source_url: string
          summary?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cleaned_text?: string | null
          content_snippet?: string
          created_at?: string
          escalation_type?: string | null
          flagged?: boolean | null
          full_text?: string | null
          id?: string
          internal_notes?: string | null
          keyword_id?: string
          legal_escalated_at?: string | null
          model_used?: string | null
          pr_escalated_at?: string | null
          published_at?: string
          sentiment?: number | null
          source_name?: string
          source_type?: string | null
          source_url?: string
          summary?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          external_delivery: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          external_delivery?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          external_delivery?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          automation_enabled: boolean
          created_at: string
          fetch_frequency_minutes: number | null
          full_name: string
          id: string
          legal_team_email: string | null
          notification_preferences: Json | null
          phone_number: string | null
          pr_team_email: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          automation_enabled?: boolean
          created_at?: string
          fetch_frequency_minutes?: number | null
          full_name: string
          id?: string
          legal_team_email?: string | null
          notification_preferences?: Json | null
          phone_number?: string | null
          pr_team_email?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          automation_enabled?: boolean
          created_at?: string
          fetch_frequency_minutes?: number | null
          full_name?: string
          id?: string
          legal_team_email?: string | null
          notification_preferences?: Json | null
          phone_number?: string | null
          pr_team_email?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          negatives: number | null
          neutrals: number | null
          positives: number | null
          report_month: string
          top_sources: string[] | null
          total_mentions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          negatives?: number | null
          neutrals?: number | null
          positives?: number | null
          report_month: string
          top_sources?: string[] | null
          total_mentions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          negatives?: number | null
          neutrals?: number | null
          positives?: number | null
          report_month?: string
          top_sources?: string[] | null
          total_mentions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      source_preferences: {
        Row: {
          created_at: string
          id: string
          show_in_analytics: boolean
          show_in_mentions: boolean
          show_in_reports: boolean
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          show_in_analytics?: boolean
          show_in_mentions?: boolean
          show_in_reports?: boolean
          source_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          show_in_analytics?: boolean
          show_in_mentions?: boolean
          show_in_reports?: boolean
          source_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_fetch_history: {
        Row: {
          completed_at: string | null
          created_at: string
          failed_keywords: number | null
          fetch_type: string
          id: string
          started_at: string
          successful_keywords: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failed_keywords?: number | null
          fetch_type?: string
          id?: string
          started_at?: string
          successful_keywords?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failed_keywords?: number | null
          fetch_type?: string
          id?: string
          started_at?: string
          successful_keywords?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      beat_automation_heartbeat: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_user_fetch: {
        Args: { _user_id: string }
        Returns: boolean
      }
      detect_user_timezone: {
        Args: { _timezone: string; _user_id: string }
        Returns: undefined
      }
      get_global_setting: {
        Args: { _setting_key: string }
        Returns: Json
      }
      get_user_emails_for_moderator: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_type: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_type"]
      }
      has_access_level: {
        Args: {
          _required_type: Database["public"]["Enums"]["user_type"]
          _user_id: string
        }
        Returns: boolean
      }
      log_api_usage: {
        Args: {
          _api_source: string
          _calls_count?: number
          _edge_function?: string
          _endpoint?: string
          _response_status?: number
          _user_id?: string
        }
        Returns: undefined
      }
      minutes_until_user_can_fetch: {
        Args: { _user_id: string }
        Returns: number
      }
      trigger_automated_fetch: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      trigger_mention_fetch: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_email_by_moderator: {
        Args: { new_email: string; target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_type: "moderator" | "legal_user" | "pr_user" | "basic_user" | "admin"
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
      user_type: ["moderator", "legal_user", "pr_user", "basic_user", "admin"],
    },
  },
} as const
