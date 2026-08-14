// Generated via mcp__Supabase__generate_typescript_types against the
// amblux-production project (ref: vymtfqgvxhjbhkrgvgol), after applying
// supabase/migrations/0001 through 0007. Regenerate this file any time
// the schema changes rather than hand-editing it — it's meant to always
// mirror the real database exactly.
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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      amblux_linear_families: {
        Row: {
          created_at: string
          id: string
          install_accessory_label: string | null
          install_accessory_optional: boolean
          install_accessory_sku: string | null
          label: string
          mounting: string
          power_cord_sku: string | null
          type: string
          updated_at: string
          watts_per_metre: number
        }
        Insert: {
          created_at?: string
          id: string
          install_accessory_label?: string | null
          install_accessory_optional?: boolean
          install_accessory_sku?: string | null
          label: string
          mounting: string
          power_cord_sku?: string | null
          type: string
          updated_at?: string
          watts_per_metre: number
        }
        Update: {
          created_at?: string
          id?: string
          install_accessory_label?: string | null
          install_accessory_optional?: boolean
          install_accessory_sku?: string | null
          label?: string
          mounting?: string
          power_cord_sku?: string | null
          type?: string
          updated_at?: string
          watts_per_metre?: number
        }
        Relationships: []
      }
      amblux_pricing: {
        Row: {
          currency: string
          id: string
          price_cents: number
          product_sku: string
          tier: string
          updated_at: string
        }
        Insert: {
          currency?: string
          id?: string
          price_cents: number
          product_sku: string
          tier: string
          updated_at?: string
        }
        Update: {
          currency?: string
          id?: string
          price_cents?: number
          product_sku?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amblux_pricing_product_sku_fkey"
            columns: ["product_sku"]
            isOneToOne: false
            referencedRelation: "amblux_products"
            referencedColumns: ["sku"]
          },
        ]
      }
      amblux_pricing_parameters: {
        Row: {
          amblux_margin_pct: number
          brokerage_usd: number
          dealer_margin_pct: number
          distributor_margin_pct: number
          duty_pct: number
          freight_usd: number
          fx_usd_cad: number
          id: string
          inland_cad: number
          insurance_usd: number
          qc_pct: number
          scope: string
          scope_key: string | null
          updated_at: string
        }
        Insert: {
          amblux_margin_pct: number
          brokerage_usd: number
          dealer_margin_pct: number
          distributor_margin_pct: number
          duty_pct: number
          freight_usd: number
          fx_usd_cad: number
          id?: string
          inland_cad: number
          insurance_usd: number
          qc_pct: number
          scope: string
          scope_key?: string | null
          updated_at?: string
        }
        Update: {
          amblux_margin_pct?: number
          brokerage_usd?: number
          dealer_margin_pct?: number
          distributor_margin_pct?: number
          duty_pct?: number
          freight_usd?: number
          fx_usd_cad?: number
          id?: string
          inland_cad?: number
          insurance_usd?: number
          qc_pct?: number
          scope?: string
          scope_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      amblux_product_cost: {
        Row: {
          fob_usd: number
          is_estimated: boolean
          notes: string | null
          sku: string
          updated_at: string
        }
        Insert: {
          fob_usd: number
          is_estimated?: boolean
          notes?: string | null
          sku: string
          updated_at?: string
        }
        Update: {
          fob_usd?: number
          is_estimated?: boolean
          notes?: string | null
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amblux_product_cost_sku_fkey"
            columns: ["sku"]
            isOneToOne: true
            referencedRelation: "amblux_products"
            referencedColumns: ["sku"]
          },
        ]
      }
      amblux_products: {
        Row: {
          category: string
          cct: string | null
          created_at: string
          family_id: string | null
          label: string
          length_m: number | null
          mounting: string | null
          short_description: string | null
          sku: string
          spec: Json
          status: string
          updated_at: string
          watts: number | null
        }
        Insert: {
          category: string
          cct?: string | null
          created_at?: string
          family_id?: string | null
          label: string
          length_m?: number | null
          mounting?: string | null
          short_description?: string | null
          sku: string
          spec?: Json
          status?: string
          updated_at?: string
          watts?: number | null
        }
        Update: {
          category?: string
          cct?: string | null
          created_at?: string
          family_id?: string | null
          label?: string
          length_m?: number | null
          mounting?: string | null
          short_description?: string | null
          sku?: string
          spec?: Json
          status?: string
          updated_at?: string
          watts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "amblux_products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "amblux_linear_families"
            referencedColumns: ["id"]
          },
        ]
      }
      amblux_profiles: {
        Row: {
          approved: boolean
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          role: string
        }
        Insert: {
          approved?: boolean
          company_name?: string | null
          created_at?: string
          email?: string | null
          id: string
          role?: string
        }
        Update: {
          approved?: boolean
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      amblux_quote_line_items: {
        Row: {
          description: string
          id: string
          notes: string | null
          qty: number
          quote_id: string
          sku: string
          zone: string
        }
        Insert: {
          description: string
          id?: string
          notes?: string | null
          qty: number
          quote_id: string
          sku: string
          zone: string
        }
        Update: {
          description?: string
          id?: string
          notes?: string | null
          qty?: number
          quote_id?: string
          sku?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "amblux_quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "amblux_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      amblux_quotes: {
        Row: {
          account_id: string | null
          bom: Json
          created_at: string
          id: string
          job_number: string
          state: Json
          status: string
          total_watts: number | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          bom: Json
          created_at?: string
          id?: string
          job_number: string
          state: Json
          status?: string
          total_watts?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          bom?: Json
          created_at?: string
          id?: string
          job_number?: string
          state?: Json
          status?: string
          total_watts?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      amblux_recalculate_pricing: {
        Args: never
        Returns: {
          skus_priced: number
        }[]
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
    Enums: {},
  },
} as const
