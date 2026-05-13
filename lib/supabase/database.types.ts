export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  bras_droit: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_color: string
          role: 'direction' | 'daf' | 'responsable_bu' | 'conseiller_senior' | 'sales' | 'consultant_junior' | 'bras_droit'
          manager_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_color?: string
          role?: 'direction' | 'daf' | 'responsable_bu' | 'conseiller_senior' | 'sales' | 'consultant_junior' | 'bras_droit'
          manager_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['bras_droit']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          color: string
          position: number
          is_archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          position?: number
          is_archived?: boolean
          created_at?: string
        }
        Update: Partial<Database['bras_droit']['Tables']['categories']['Insert']>
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'done'
          priority: number
          category_id: string | null
          assignee_id: string | null
          creator_id: string
          due_date: string | null
          estimated_minutes: number | null
          actual_minutes: number
          position: number
          completed_at: string | null
          is_private: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'done'
          priority?: number
          category_id?: string | null
          assignee_id?: string | null
          creator_id: string
          due_date?: string | null
          estimated_minutes?: number | null
          actual_minutes?: number
          position?: number
          completed_at?: string | null
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['bras_droit']['Tables']['tasks']['Insert']>
        Relationships: []
      }
      task_steps: {
        Row: {
          id: string
          task_id: string
          title: string
          is_done: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          is_done?: boolean
          position?: number
          created_at?: string
        }
        Update: Partial<Database['bras_droit']['Tables']['task_steps']['Insert']>
        Relationships: []
      }
      calendar_blocks: {
        Row: {
          id: string
          task_id: string
          user_id: string
          start_at: string
          end_at: string
          notes: string | null
          is_private: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          start_at: string
          end_at: string
          notes?: string | null
          is_private?: boolean
          created_at?: string
        }
        Update: Partial<Database['bras_droit']['Tables']['calendar_blocks']['Insert']>
        Relationships: []
      }
      activity_log: {
        Row: {
          id: string
          task_id: string
          user_id: string
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      current_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      user_can_see: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
  }
}

export type Profile = Database['bras_droit']['Tables']['profiles']['Row']
export type Role = Profile['role']
export type Category = Database['bras_droit']['Tables']['categories']['Row']
export type Task = Database['bras_droit']['Tables']['tasks']['Row']
export type TaskStep = Database['bras_droit']['Tables']['task_steps']['Row']
export type CalendarBlock = Database['bras_droit']['Tables']['calendar_blocks']['Row']
export type ActivityLog = Database['bras_droit']['Tables']['activity_log']['Row']

export type TaskWithRelations = Task & {
  category: Category | null
  assignee: Profile | null
  creator: Profile
  steps: TaskStep[]
}
