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
      activities: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          hero_image: string | null
          icon: string | null
          id: string
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          translations: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          hero_image?: string | null
          icon?: string | null
          id?: string
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          hero_image?: string | null
          icon?: string | null
          id?: string
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          landing_path: string | null
          offer_id: string | null
          product_id: string | null
          referrer: string | null
          traffic_source_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          landing_path?: string | null
          offer_id?: string | null
          product_id?: string | null
          referrer?: string | null
          traffic_source_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          landing_path?: string | null
          offer_id?: string | null
          product_id?: string | null
          referrer?: string | null
          traffic_source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_traffic_source_id_fkey"
            columns: ["traffic_source_id"]
            isOneToOne: false
            referencedRelation: "traffic_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_networks: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          activity_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          translations: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          activity_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          activity_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          active: boolean
          affiliate_network_id: string | null
          affiliate_url: string
          availability: string
          commission_rate: number | null
          country: string | null
          created_at: string
          currency: string
          id: string
          last_updated: string
          original_price: number | null
          price: number
          priority: number
          product_id: string
          retailer_id: string
          shipping_info: string | null
        }
        Insert: {
          active?: boolean
          affiliate_network_id?: string | null
          affiliate_url: string
          availability?: string
          commission_rate?: number | null
          country?: string | null
          created_at?: string
          currency: string
          id?: string
          last_updated?: string
          original_price?: number | null
          price: number
          priority?: number
          product_id: string
          retailer_id: string
          shipping_info?: string | null
        }
        Update: {
          active?: boolean
          affiliate_network_id?: string | null
          affiliate_url?: string
          availability?: string
          commission_rate?: number | null
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          last_updated?: string
          original_price?: number | null
          price?: number
          priority?: number
          product_id?: string
          retailer_id?: string
          shipping_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_affiliate_network_id_fkey"
            columns: ["affiliate_network_id"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_activities: {
        Row: {
          activity_id: string
          product_id: string
        }
        Insert: {
          activity_id: string
          product_id: string
        }
        Update: {
          activity_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_activities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_import_errors: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          external_id: string | null
          id: string
          network_id: string | null
          raw_data: Json | null
          sync_run_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type: string
          external_id?: string | null
          id?: string
          network_id?: string | null
          raw_data?: Json | null
          sync_run_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          external_id?: string | null
          id?: string
          network_id?: string | null
          raw_data?: Json | null
          sync_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_import_errors_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_import_errors_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "product_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_import_sources: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          brand: string | null
          classification_activity_id: string | null
          classification_attempts: number
          classification_category_ids: string[]
          classification_confidence: number | null
          classification_countries: string[]
          classification_error: string | null
          classification_reason: string | null
          classification_status: string
          classified_at: string | null
          created_at: string
          dedup_confidence: number | null
          dedup_match_product_id: string | null
          dedup_match_source_id: string | null
          dedup_signals: string[]
          dedup_status: string
          external_offer_id: string | null
          external_product_id: string
          gtin: string | null
          id: string
          import_status: string
          last_synced_at: string | null
          network_id: string
          normalized_data: Json
          normalized_name: string | null
          offer_id: string | null
          opportunity_signal: Json
          product_id: string | null
          quality_score: number
          quality_score_factors: Json
          raw_data: Json
          rejection_reason: string | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          brand?: string | null
          classification_activity_id?: string | null
          classification_attempts?: number
          classification_category_ids?: string[]
          classification_confidence?: number | null
          classification_countries?: string[]
          classification_error?: string | null
          classification_reason?: string | null
          classification_status?: string
          classified_at?: string | null
          created_at?: string
          dedup_confidence?: number | null
          dedup_match_product_id?: string | null
          dedup_match_source_id?: string | null
          dedup_signals?: string[]
          dedup_status?: string
          external_offer_id?: string | null
          external_product_id: string
          gtin?: string | null
          id?: string
          import_status?: string
          last_synced_at?: string | null
          network_id: string
          normalized_data?: Json
          normalized_name?: string | null
          offer_id?: string | null
          opportunity_signal?: Json
          product_id?: string | null
          quality_score?: number
          quality_score_factors?: Json
          raw_data?: Json
          rejection_reason?: string | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          brand?: string | null
          classification_activity_id?: string | null
          classification_attempts?: number
          classification_category_ids?: string[]
          classification_confidence?: number | null
          classification_countries?: string[]
          classification_error?: string | null
          classification_reason?: string | null
          classification_status?: string
          classified_at?: string | null
          created_at?: string
          dedup_confidence?: number | null
          dedup_match_product_id?: string | null
          dedup_match_source_id?: string | null
          dedup_signals?: string[]
          dedup_status?: string
          external_offer_id?: string | null
          external_product_id?: string
          gtin?: string | null
          id?: string
          import_status?: string
          last_synced_at?: string | null
          network_id?: string
          normalized_data?: Json
          normalized_name?: string | null
          offer_id?: string | null
          opportunity_signal?: Json
          product_id?: string | null
          quality_score?: number
          quality_score_factors?: Json
          raw_data?: Json
          rejection_reason?: string | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_import_sources_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_import_sources_classification_activity_id_fkey"
            columns: ["classification_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_import_sources_dedup_match_product_id_fkey"
            columns: ["dedup_match_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_import_sources_dedup_match_source_id_fkey"
            columns: ["dedup_match_source_id"]
            isOneToOne: false
            referencedRelation: "product_import_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_import_sources_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_import_sources_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_import_sources_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_import_sources_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sync_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          errors_count: number
          id: string
          network_id: string | null
          products_found: number
          products_imported: number
          products_rejected: number
          products_updated: number
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          errors_count?: number
          id?: string
          network_id?: string | null
          products_found?: number
          products_imported?: number
          products_rejected?: number
          products_updated?: number
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          errors_count?: number
          id?: string
          network_id?: string | null
          products_found?: number
          products_imported?: number
          products_rejected?: number
          products_updated?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sync_runs_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          is_demo: boolean
          main_image: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          specifications: Json
          status: string
          tags: string[]
          translations: Json
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_demo?: boolean
          main_image?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          specifications?: Json
          status?: string
          tags?: string[]
          translations?: Json
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_demo?: boolean
          main_image?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          specifications?: Json
          status?: string
          tags?: string[]
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      retailers: {
        Row: {
          active: boolean
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          logo: string | null
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          logo?: string | null
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          logo?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      traffic_sources: {
        Row: {
          active: boolean
          activity_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          tracking_code: string
          website: string | null
        }
        Insert: {
          active?: boolean
          activity_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          tracking_code: string
          website?: string | null
        }
        Update: {
          active?: boolean
          activity_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          tracking_code?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traffic_sources_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      offers_public: {
        Row: {
          availability: string | null
          country: string | null
          currency: string | null
          id: string | null
          last_updated: string | null
          original_price: number | null
          price: number | null
          priority: number | null
          product_id: string | null
          retailer_country: string | null
          retailer_id: string | null
          retailer_logo: string | null
          retailer_name: string | null
          retailer_slug: string | null
          shipping_info: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      record_offer_click: {
        Args: {
          p_country?: string
          p_device_type?: string
          p_landing_path?: string
          p_offer_id: string
          p_ref?: string
          p_referrer?: string
        }
        Returns: {
          affiliate_url: string
          product_slug: string
          retailer_name: string
        }[]
      }
      search_products: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          brand_id: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          is_demo: boolean
          main_image: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          specifications: Json
          status: string
          tags: string[]
          translations: Json
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
