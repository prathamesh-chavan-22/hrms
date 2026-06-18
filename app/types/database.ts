export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          plan: "starter" | "plus" | "pro";
          gps_required: boolean;
          theme: Json;
          owner_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tenants"]["Row"]> & {
          slug: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Row"]>;
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          role: "owner" | "hr" | "admin" | "employee";
          full_name: string;
          email: string;
          employee_code: string | null;
          phone: string | null;
          department: string | null;
          designation: string | null;
          date_of_joining: string | null;
          status: "active" | "inactive" | "invited";
          avatar_url: string | null;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          tenant_id: string;
          full_name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      invites: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          role: "owner" | "hr" | "admin" | "employee";
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invites"]["Row"]> & {
          tenant_id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Row"]>;
      };
      leave_types: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          code: string;
          days_per_year: number;
          carry_forward: boolean;
          carry_forward_max: number | null;
          encashable: boolean;
          requires_doc: boolean;
          doc_after_days: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["leave_types"]["Row"]> & {
          tenant_id: string;
          name: string;
          code: string;
        };
        Update: Partial<Database["public"]["Tables"]["leave_types"]["Row"]>;
      };
      holidays: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          date: string;
          type: "national" | "optional" | "company";
          description: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["holidays"]["Row"]> & {
          tenant_id: string;
          name: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["holidays"]["Row"]>;
      };
      leave_requests: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          total_days: number;
          reason: string | null;
          status: "pending" | "approved" | "rejected" | "cancelled";
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["leave_requests"]["Row"]> & {
          tenant_id: string;
          user_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          total_days: number;
        };
        Update: Partial<Database["public"]["Tables"]["leave_requests"]["Row"]>;
      };
      attendance: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          date: string;
          punch_in_at: string | null;
          punch_in_lat: number | null;
          punch_in_lng: number | null;
          punch_in_addr: string | null;
          punch_out_at: string | null;
          punch_out_lat: number | null;
          punch_out_lng: number | null;
          punch_out_addr: string | null;
          status: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance"]["Row"]> & {
          tenant_id: string;
          user_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Row"]>;
      };
      chatbot_intents: {
        Row: {
          id: string;
          tenant_id: string | null;
          patterns: string[];
          response: string;
          query_type: string | null;
          is_global: boolean;
          priority: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["chatbot_intents"]["Row"]> & {
          patterns: string[];
          response: string;
        };
        Update: Partial<Database["public"]["Tables"]["chatbot_intents"]["Row"]>;
      };
      password_reset_requests: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string | null;
          email: string;
          escalation: "super_admin" | "company_admin";
          status: string;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["password_reset_requests"]["Row"]> & {
          user_id: string;
          email: string;
          escalation: "super_admin" | "company_admin";
        };
        Update: Partial<Database["public"]["Tables"]["password_reset_requests"]["Row"]>;
      };
    };
    Functions: {
      seed_tenant_defaults: { Args: { p_tenant_id: string }; Returns: void };
      auth_tenant_id: { Args: Record<string, never>; Returns: string };
      auth_role: { Args: Record<string, never>; Returns: string };
    };
  };
}
