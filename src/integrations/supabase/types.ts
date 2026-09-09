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
      agent_alerts: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          job_id: string | null
          message: string
          mission_id: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          job_id?: string | null
          message: string
          mission_id?: string | null
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          job_id?: string | null
          message?: string
          mission_id?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_alerts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_alerts_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "agent_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_missions: {
        Row: {
          cities: string[]
          contract_type: string | null
          countries: string[]
          created_at: string
          cv_id: string | null
          id: string
          is_active: boolean
          languages: string[]
          last_run_at: string | null
          min_score: number
          remote_only: boolean
          salary_min: number | null
          target_role: string | null
          title: string
          updated_at: string
          user_id: string
          visa_required: boolean
        }
        Insert: {
          cities?: string[]
          contract_type?: string | null
          countries?: string[]
          created_at?: string
          cv_id?: string | null
          id?: string
          is_active?: boolean
          languages?: string[]
          last_run_at?: string | null
          min_score?: number
          remote_only?: boolean
          salary_min?: number | null
          target_role?: string | null
          title: string
          updated_at?: string
          user_id: string
          visa_required?: boolean
        }
        Update: {
          cities?: string[]
          contract_type?: string | null
          countries?: string[]
          created_at?: string
          cv_id?: string | null
          id?: string
          is_active?: boolean
          languages?: string[]
          last_run_at?: string | null
          min_score?: number
          remote_only?: boolean
          salary_min?: number | null
          target_role?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          visa_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agent_missions_cv_id_fkey"
            columns: ["cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string
          cv_id: string | null
          follow_up_at: string | null
          id: string
          job_id: string
          match_breakdown: Json | null
          match_reasoning: string | null
          match_score: number | null
          notes: string | null
          recruiter_note: string | null
          stage: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          cv_id?: string | null
          follow_up_at?: string | null
          id?: string
          job_id: string
          match_breakdown?: Json | null
          match_reasoning?: string | null
          match_score?: number | null
          notes?: string | null
          recruiter_note?: string | null
          stage?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          cv_id?: string | null
          follow_up_at?: string | null
          id?: string
          job_id?: string
          match_breakdown?: Json | null
          match_reasoning?: string | null
          match_score?: number | null
          notes?: string | null
          recruiter_note?: string | null
          stage?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_cv_id_fkey"
            columns: ["cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          culture: string | null
          description: string | null
          id: string
          industry: string | null
          name: string
          owner_id: string | null
          rating: number | null
          salary_range: string | null
          size: string | null
          technologies: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          culture?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name: string
          owner_id?: string | null
          rating?: number | null
          salary_range?: string | null
          size?: string | null
          technologies?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          culture?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name?: string
          owner_id?: string | null
          rating?: number | null
          salary_range?: string | null
          size?: string | null
          technologies?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      cvs: {
        Row: {
          analysis: Json | null
          ats_breakdown: Json | null
          ats_score: number | null
          created_at: string
          file_name: string
          file_path: string | null
          global_score: number | null
          id: string
          is_anonymous: boolean
          is_primary: boolean
          label: string | null
          language: string
          learning_plan: Json | null
          prediction: Json | null
          raw_text: string | null
          readability_score: number | null
          source_cv_id: string | null
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          ats_breakdown?: Json | null
          ats_score?: number | null
          created_at?: string
          file_name: string
          file_path?: string | null
          global_score?: number | null
          id?: string
          is_anonymous?: boolean
          is_primary?: boolean
          label?: string | null
          language?: string
          learning_plan?: Json | null
          prediction?: Json | null
          raw_text?: string | null
          readability_score?: number | null
          source_cv_id?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json | null
          ats_breakdown?: Json | null
          ats_score?: number | null
          created_at?: string
          file_name?: string
          file_path?: string | null
          global_score?: number | null
          id?: string
          is_anonymous?: boolean
          is_primary?: boolean
          label?: string | null
          language?: string
          learning_plan?: Json | null
          prediction?: Json | null
          raw_text?: string | null
          readability_score?: number | null
          source_cv_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cvs_source_cv_id_fkey"
            columns: ["source_cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
        ]
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
          company_id: string | null
          contract_type: string | null
          country: string | null
          created_at: string
          deadline: string | null
          description: string | null
          experience_min: number | null
          id: string
          is_demo: boolean
          is_published: boolean
          level: string | null
          location: string | null
          posted_at: string | null
          remote: string | null
          required_language: string | null
          salary: string | null
          salary_currency: string | null
          salary_min: number | null
          skills: string[]
          source: string | null
          title: string
          url: string | null
          user_id: string | null
          visa_sponsorship: boolean
        }
        Insert: {
          company: string
          company_id?: string | null
          contract_type?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          experience_min?: number | null
          id?: string
          is_demo?: boolean
          is_published?: boolean
          level?: string | null
          location?: string | null
          posted_at?: string | null
          remote?: string | null
          required_language?: string | null
          salary?: string | null
          salary_currency?: string | null
          salary_min?: number | null
          skills?: string[]
          source?: string | null
          title: string
          url?: string | null
          user_id?: string | null
          visa_sponsorship?: boolean
        }
        Update: {
          company?: string
          company_id?: string | null
          contract_type?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          experience_min?: number | null
          id?: string
          is_demo?: boolean
          is_published?: boolean
          level?: string | null
          location?: string | null
          posted_at?: string | null
          remote?: string | null
          required_language?: string | null
          salary?: string | null
          salary_currency?: string | null
          salary_min?: number | null
          skills?: string[]
          source?: string | null
          title?: string
          url?: string | null
          user_id?: string | null
          visa_sponsorship?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          sectors: string[]
          target_roles: string[]
          updated_at: string
          voice_gender: string
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
          sectors?: string[]
          target_roles?: string[]
          updated_at?: string
          voice_gender?: string
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
          sectors?: string[]
          target_roles?: string[]
          updated_at?: string
          voice_gender?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "candidate" | "recruiter" | "admin"
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
    Enums: {
      app_role: ["candidate", "recruiter", "admin"],
    },
  },
} as const
