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
      reports: {
        Row: {
          id: string
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
        }
        Insert: {
          id?: string
          log_id: string
          action: string
          actor: string
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          log_id?: string
          action?: string
          actor?: string
          status?: string
          created_at?: string
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
