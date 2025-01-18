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
      business_ideas: {
        Row: {
          city_id: string | null
          cons: string[]
          country: string
          created_at: string
          description: string
          id: string
          industry: string
          industry_id: string | null
          investment: string
          pros: string[]
          time_to_market: string
          title: string
        }
        Insert: {
          city_id?: string | null
          cons?: string[]
          country?: string
          created_at?: string
          description: string
          id?: string
          industry: string
          industry_id?: string | null
          investment: string
          pros?: string[]
          time_to_market: string
          title: string
        }
        Update: {
          city_id?: string | null
          cons?: string[]
          country?: string
          created_at?: string
          description?: string
          id?: string
          industry?: string
          industry_id?: string | null
          investment?: string
          pros?: string[]
          time_to_market?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_ideas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_ideas_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string | null
          created_at: string
          id: string
          name: string
          population: number
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          id?: string
          name: string
          population: number
        }
        Update: {
          country_id?: string | null
          created_at?: string
          id?: string
          name?: string
          population?: number
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      country_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          phone_code: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          phone_code: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          phone_code?: string
        }
        Relationships: []
      }
      industries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      sd_events: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          location: string
          max_attendees: number
          time: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          location: string
          max_attendees: number
          time: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          location?: string
          max_attendees?: number
          time?: string
        }
        Relationships: []
      }
      sd_profiles: {
        Row: {
          created_at: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          id: string
          last_name: string
          looking_for: string
          phone: string | null
          picture_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          id?: string
          last_name: string
          looking_for: string
          phone?: string | null
          picture_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          email?: string
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          looking_for?: string
          phone?: string | null
          picture_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sd_registrations: {
        Row: {
          event_id: string | null
          id: string
          profile_id: string | null
          registration_date: string
          verified: boolean | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          profile_id?: string | null
          registration_date?: string
          verified?: boolean | null
        }
        Update: {
          event_id?: string | null
          id?: string
          profile_id?: string | null
          registration_date?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sd_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sd_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sd_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sd_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_verified_registrations: {
        Args: Record<PropertyKey, never>
        Returns: {
          first_name: string
          last_name: string
          gender: string
          picture_url: string
          location: string
          date: string
          registration_date: string
          verified: boolean
          total_verified_registrations: number
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
