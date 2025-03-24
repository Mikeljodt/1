export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: number
          name: string
          business_type: string | null
          owner: string | null
          address: string | null
          city: string | null
          province: string | null
          postal_code: string | null
          phone: string | null
          email: string | null
          tax_id: string | null
          morning_open_time: string | null
          morning_close_time: string | null
          evening_open_time: string | null
          evening_close_time: string | null
          closing_day: string | null
          machines: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          business_type?: string | null
          owner?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          phone?: string | null
          email?: string | null
          tax_id?: string | null
          morning_open_time?: string | null
          morning_close_time?: string | null
          evening_open_time?: string | null
          evening_close_time?: string | null
          closing_day?: string | null
          machines?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          business_type?: string | null
          owner?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          phone?: string | null
          email?: string | null
          tax_id?: string | null
          morning_open_time?: string | null
          morning_close_time?: string | null
          evening_open_time?: string | null
          evening_close_time?: string | null
          closing_day?: string | null
          machines?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      machines: {
        Row: {
          id: string
          serial_number: string
          type: string
          model: string
          brand: string
          cost: number
          purchase_date: string
          status: 'warehouse' | 'installed' | 'repair'
          client_id: number | null
          current_counter: number
          initial_counter: number
          split_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          serial_number: string
          type: string
          model: string
          brand: string
          cost: number
          purchase_date: string
          status?: 'warehouse' | 'installed' | 'repair'
          client_id?: number | null
          current_counter?: number
          initial_counter?: number
          split_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          serial_number?: string
          type?: string
          model?: string
          brand?: string
          cost?: number
          purchase_date?: string
          status?: 'warehouse' | 'installed' | 'repair'
          client_id?: number | null
          current_counter?: number
          initial_counter?: number
          split_percentage?: number
          created_at?: string
          updated_at?: string
        }
      }
      // Additional table types would be defined here
      // This is a simplified version for brevity
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      machine_status: 'warehouse' | 'installed' | 'repair'
      maintenance_type: 'preventive' | 'corrective'
      maintenance_status: 'pending' | 'in-progress' | 'completed'
      user_role: 'admin' | 'technician'
    }
  }
}
