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
      profiles: {
        Row: {
          id: string
          email: string | null
          role: string | null
          password_changed_at: string | null
          last_password_hash: string | null
        }
        Insert: {
          id: string
          email?: string | null
          role?: string | null
          password_changed_at?: string | null
          last_password_hash?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          role?: string | null
          password_changed_at?: string | null
          last_password_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      support_message_templates: {
        Row: {
          id: string
          bullying_type: string
          severity: string
          template_text: string
          status: string | null
          approved_by: string | null
          approved_at: string | null
          version: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          bullying_type: string
          severity: string
          template_text: string
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          version?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          bullying_type?: string
          severity?: string
          template_text?: string
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          version?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_message_templates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pdr_working_hours: {
        Row: {
          id: string
          school_id: string | null
          day_of_week: number
          start_time: string
          end_time: string
          max_hours_limit: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          school_id?: string | null
          day_of_week: number
          start_time: string
          end_time: string
          max_hours_limit?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          max_hours_limit?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      on_call_roster: {
        Row: {
          id: string
          school_id: string | null
          day_of_week: number
          start_time: string
          end_time: string
          assigned_name: string
          contact_channel: string
          contact_address: string
          is_active: boolean | null
          escalation_target_name: string | null
          escalation_contact_address: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          school_id?: string | null
          day_of_week: number
          start_time: string
          end_time: string
          assigned_name: string
          contact_channel: string
          contact_address: string
          is_active?: boolean | null
          escalation_target_name?: string | null
          escalation_contact_address?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          assigned_name?: string
          contact_channel?: string
          contact_address?: string
          is_active?: boolean | null
          escalation_target_name?: string | null
          escalation_contact_address?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      escalations: {
        Row: {
          id: string
          report_id: string | null
          roster_id: string | null
          sent_at: string | null
          is_acknowledged: boolean | null
          acknowledged_at: string | null
          escalated_to_backup: boolean | null
          backup_escalated_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          report_id?: string | null
          roster_id?: string | null
          sent_at?: string | null
          is_acknowledged?: boolean | null
          acknowledged_at?: string | null
          escalated_to_backup?: boolean | null
          backup_escalated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          report_id?: string | null
          roster_id?: string | null
          sent_at?: string | null
          is_acknowledged?: boolean | null
          acknowledged_at?: string | null
          escalated_to_backup?: boolean | null
          backup_escalated_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "on_call_roster"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          school_id: string | null
          tracking_code: string
          student_id: string | null
          category: string
          content: string
          risk_level: string
          status: string
          assigned_role: string
          evidence_url: string | null
          deadline_at: string | null
          identity_level: number | null
          encrypted_identity: string | null
          identity_updated_at: string | null
          created_at: string
          updated_at: string
          session_token: string | null
          identity_sharing_approved: boolean | null
          ai_analysis: Json | null
          location: string | null
          frequency: string | null
        }
        Insert: {
          id?: string
          school_id?: string | null
          tracking_code: string
          student_id?: string | null
          category: string
          content: string
          risk_level?: string
          status?: string
          assigned_role?: string
          evidence_url?: string | null
          deadline_at?: string | null
          identity_level?: number | null
          encrypted_identity?: string | null
          identity_updated_at?: string | null
          created_at?: string
          updated_at?: string
          session_token?: string | null
          identity_sharing_approved?: boolean | null
          ai_analysis?: Json | null
          location?: string | null
          frequency?: string | null
        }
        Update: {
          id?: string
          school_id?: string | null
          tracking_code?: string
          student_id?: string | null
          category?: string
          content?: string
          risk_level?: string
          status?: string
          assigned_role?: string
          evidence_url?: string | null
          deadline_at?: string | null
          identity_level?: number | null
          encrypted_identity?: string | null
          identity_updated_at?: string | null
          created_at?: string
          updated_at?: string
          session_token?: string | null
          identity_sharing_approved?: boolean | null
          ai_analysis?: Json | null
          location?: string | null
          frequency?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          log_id: string
          action: string
          actor: string
          status: string
          created_at: string
          actor_id: string | null
        }
        Insert: {
          id?: string
          log_id: string
          action: string
          actor: string
          status: string
          created_at?: string
          actor_id?: string | null
        }
        Update: {
          id?: string
          log_id?: string
          action?: string
          actor?: string
          status?: string
          created_at?: string
          actor_id?: string | null
        }
        Relationships: []
      }
      anonymous_messages: {
        Row: {
          id: string
          report_id: string | null
          session_token: string
          sender_role: string | null
          content: string
          is_read: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          report_id?: string | null
          session_token: string
          sender_role?: string | null
          content: string
          is_read?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string | null
          session_token?: string
          sender_role?: string | null
          content?: string
          is_read?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_messages_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          }
        ]
      }
      emergency_bypasses: {
        Row: {
          id: string
          report_id: string
          actor_id: string | null
          justification: string
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          actor_id?: string | null
          justification: string
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          actor_id?: string | null
          justification?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_bypasses_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_bypasses_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      schools: {
        Row: {
          id: string
          name: string
          school_code: string
          student_count: number | null
          pdr_count: number | null
          principal_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          school_code: string
          student_count?: number | null
          pdr_count?: number | null
          principal_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          school_code?: string
          student_count?: number | null
          pdr_count?: number | null
          principal_count?: number | null
          created_at?: string
        }
        Relationships: []
      }
      school_users: {
        Row: {
          id: string
          school_id: string
          username: string
          password_plain: string
          role: string
          full_name: string | null
          student_number: string | null
          created_at: string
        }
        Insert: {
          id?: string
          school_id: string
          username: string
          password_plain: string
          role: string
          full_name?: string | null
          student_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          username?: string
          password_plain?: string
          role?: string
          full_name?: string | null
          student_number?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      audit_logs_readable: {
        Row: {
          id: string
          log_id: string | null
          action: string | null
          actor_id: string | null
          actor: string | null
          status: string | null
          created_at: string | null
        }
        Relationships: []
      }
      reports_summary_view: {
        Row: {
          id: string
          school_id: string | null
          category: string
          risk_level: string
          status: string
          assigned_role: string
          created_at: string
          deadline_at: string | null
          resolution_time_hours: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_case_status_by_code: {
        Args: {
          target_code: string
        }
        Returns: Json
      }
      decrypt_identity_emergency: {
        Args: {
          target_report_id: string
          justification: string
        }
        Returns: string
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
