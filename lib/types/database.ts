export type UserRole = 'admin' | 'manager' | 'analyst' | 'client'

export type OrderStatus = 'new' | 'submitted' | 'in_progress' | 'review' | 'completed' | 'cancelled'
export type OrderPriority = 'normal' | 'same_day' | 'priority_24h' | 'priority_48h'
export type SampleStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type ResultStatus = 'pending' | 'entered' | 'reviewed' | 'approved'
export type NotificationType = 'order_submitted' | 'order_assigned' | 'order_completed' | 'result_entered' | 'amendment_requested' | 'overdue_alert' | 'general'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          company_name: string | null
          phone_number: string | null
          is_active: boolean
          force_password_change: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role: UserRole
          company_name?: string | null
          phone_number?: string | null
          is_active?: boolean
          force_password_change?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          company_name?: string | null
          phone_number?: string | null
          is_active?: boolean
          force_password_change?: boolean
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          profile_id: string | null
          company_name: string
          contact_name: string | null
          email: string
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          company_name: string
          contact_name?: string | null
          email: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          profile_id?: string | null
          company_name?: string
          contact_name?: string | null
          email?: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          client_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          client_id: string
          project_id: string | null
          status: OrderStatus
          priority: OrderPriority
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          shipping_address: string | null
          notes: string | null
          date_received: string | null
          date_due: string | null
          date_assigned: string | null
          date_completed: string | null
          assigned_analyst_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          client_id: string
          project_id?: string | null
          status?: OrderStatus
          priority?: OrderPriority
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          shipping_address?: string | null
          notes?: string | null
          date_received?: string | null
          date_due?: string | null
          date_assigned?: string | null
          date_completed?: string | null
          assigned_analyst_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          project_id?: string | null
          status?: OrderStatus
          priority?: OrderPriority
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          shipping_address?: string | null
          notes?: string | null
          date_received?: string | null
          date_due?: string | null
          date_assigned?: string | null
          date_completed?: string | null
          assigned_analyst_id?: string | null
          updated_at?: string
        }
      }
      samples: {
        Row: {
          id: string
          order_id: string
          sample_id: string
          description: string | null
          matrix_type: string | null
          collection_date: string | null
          collection_location: string | null
          status: SampleStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          sample_id: string
          description?: string | null
          matrix_type?: string | null
          collection_date?: string | null
          collection_location?: string | null
          status?: SampleStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          sample_id?: string
          description?: string | null
          matrix_type?: string | null
          collection_date?: string | null
          collection_location?: string | null
          status?: SampleStatus
          notes?: string | null
          updated_at?: string
        }
      }
      tests: {
        Row: {
          id: string
          name: string
          code: string | null
          category: string | null
          method: string | null
          unit: string | null
          turnaround_days: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          category?: string | null
          method?: string | null
          unit?: string | null
          turnaround_days?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          code?: string | null
          category?: string | null
          method?: string | null
          unit?: string | null
          turnaround_days?: number | null
          is_active?: boolean
          updated_at?: string
        }
      }
      sample_tests: {
        Row: {
          id: string
          sample_id: string
          test_id: string
          status: ResultStatus
          created_at: string
        }
        Insert: {
          id?: string
          sample_id: string
          test_id: string
          status?: ResultStatus
          created_at?: string
        }
        Update: {
          status?: ResultStatus
        }
      }
      results: {
        Row: {
          id: string
          sample_test_id: string
          value: string | null
          unit: string | null
          status: ResultStatus
          notes: string | null
          entered_by: string | null
          reviewed_by: string | null
          entered_at: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sample_test_id: string
          value?: string | null
          unit?: string | null
          status?: ResultStatus
          notes?: string | null
          entered_by?: string | null
          reviewed_by?: string | null
          entered_at?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          value?: string | null
          unit?: string | null
          status?: ResultStatus
          notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          is_read: boolean
          link: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          is_read?: boolean
          link?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string
          old_values: Record<string, unknown> | null
          new_values: Record<string, unknown> | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id: string
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          ip_address?: string | null
          created_at?: string
        }
        Update: never
      }
    }
    Views: {}
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: UserRole
      }
    }
    Enums: {
      user_role: UserRole
      order_status: OrderStatus
      order_priority: OrderPriority
      sample_status: SampleStatus
      result_status: ResultStatus
      notification_type: NotificationType
    }
  }
}
