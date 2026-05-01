export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      receipt_tags: {
        Row: {
          created_at: string
          receipt_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          receipt_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          receipt_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_tags_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          ai_processed_at: string | null
          client_name: string | null
          created_at: string
          file_type: string | null
          id: string
          image_path: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          notes: string | null
          product_image_path: string | null
          purchase_date: string | null
          text_content: string | null
          total_amount: number | null
          type: string | null
          updated_at: string
          user_id: string
          vendor_name: string | null
          warranty: boolean
          warranty_expires_at: string | null
        }
        Insert: {
          ai_processed_at?: string | null
          client_name?: string | null
          created_at?: string
          file_type?: string | null
          id?: string
          image_path: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          notes?: string | null
          product_image_path?: string | null
          purchase_date?: string | null
          text_content?: string | null
          total_amount?: number | null
          type?: string | null
          updated_at?: string
          user_id: string
          vendor_name?: string | null
          warranty?: boolean
          warranty_expires_at?: string | null
        }
        Update: {
          ai_processed_at?: string | null
          client_name?: string | null
          created_at?: string
          file_type?: string | null
          id?: string
          image_path?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          notes?: string | null
          product_image_path?: string | null
          purchase_date?: string | null
          text_content?: string | null
          total_amount?: number | null
          type?: string | null
          updated_at?: string
          user_id?: string
          vendor_name?: string | null
          warranty?: boolean
          warranty_expires_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_registration_acceptances: {
        Row: {
          accepted_at: string
          id: string
          signup_context: string
          terms_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          signup_context?: string
          terms_version?: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          signup_context?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          preferred_display_currency: string
          receipt_location_disabled: boolean
          rescan_empty_only: boolean
          rescan_preview_diff: boolean
          return_window_days: number
          user_type: "admin" | "user"
          warranty_default_months: number
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          preferred_display_currency?: string
          receipt_location_disabled?: boolean
          rescan_empty_only?: boolean
          rescan_preview_diff?: boolean
          return_window_days?: number
          user_type?: "admin" | "user"
          warranty_default_months?: number
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          preferred_display_currency?: string
          receipt_location_disabled?: boolean
          rescan_empty_only?: boolean
          rescan_preview_diff?: boolean
          return_window_days?: number
          user_type?: "admin" | "user"
          warranty_default_months?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_receipts_per_month: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          receipts_count: number
        }[]
      }
      get_tag_usage: {
        Args: Record<PropertyKey, never>
        Returns: {
          tag: string
          count: number
        }[]
      }
      has_role: {
        Args: { role_param: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
