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
      applications: {
        Row: {
          applied_at: string
          id: string
          job_id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          job_id: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cvs: {
        Row: {
          analysis: Json | null
          ats_score: number | null
          created_at: string
          file_name: string
          file_path: string | null
          global_score: number | null
          id: string
          raw_text: string | null
          readability_score: number | null
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          ats_score?: number | null
          created_at?: string
          file_name: string
          file_path?: string | null
          global_score?: number | null
          id?: string
          raw_text?: string | null
          readability_score?: number | null
          user_id: string
        }
        Update: {
          analysis?: Json | null
          ats_score?: number | null
          created_at?: string
          file_name?: string
          file_path?: string | null
          global_score?: number | null
          id?: string
          raw_text?: string | null
          readability_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string
          created_at: string
          cv_id: string | null
          doc_type: string
          id: string
          job_id: string | null
          language: string
          title: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          cv_id?: string | null
          doc_type: string
          id?: string
          job_id?: string | null
          language?: string
          title?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          cv_id?: string | null
          doc_type?: string
          id?: string
          job_id?: string | null
          language?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_cv_id_fkey"
            columns: ["cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string
          contract_type: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          level: string | null
          location: string | null
          posted_at: string | null
          salary: string | null
          source: string | null
          title: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          company: string
          contract_type?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          level?: string | null
          location?: string | null
          posted_at?: string | null
          salary?: string | null
          source?: string | null
          title: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          company?: string
          contract_type?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          level?: string | null
          location?: string | null
          posted_at?: string | null
          salary?: string | null
          source?: string | null
          title?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          breakdown: Json | null
          created_at: string
          cv_id: string
          id: string
          job_id: string
          reasoning: string | null
          score: number
          user_id: string
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string
          cv_id: string
          id?: string
          job_id: string
          reasoning?: string | null
          score?: number
          user_id: string
        }
        Update: {
          breakdown?: Json | null
          created_at?: string
          cv_id?: string
          id?: string
          job_id?: string
          reasoning?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_cv_id_fkey"
            columns: ["cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          contract_type: string | null
          countries: string[] | null
          created_at: string
          desired_salary: string | null
          domain: string | null
          email: string | null
          experience_years: number | null
          full_name: string | null
          id: string
          languages: string[] | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          contract_type?: string | null
          countries?: string[] | null
          created_at?: string
          desired_salary?: string | null
          domain?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id: string
          languages?: string[] | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          contract_type?: string | null
          countries?: string[] | null
          created_at?: string
          desired_salary?: string | null
          domain?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string
          languages?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
