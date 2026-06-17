export type PlanType = "starter" | "plus" | "pro";
export type UserRole = "owner" | "hr" | "admin" | "employee";
export type EmployeeStatus = "active" | "inactive" | "invited";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type HolidayType = "national" | "optional" | "company";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  plan: PlanType;
  gps_required: boolean;
  theme: { accent: string; accentDark: string };
  owner_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  employee_code: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  date_of_joining: string | null;
  status: EmployeeStatus;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invite {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface LeaveType {
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
}

export interface Holiday {
  id: string;
  tenant_id: string;
  name: string;
  date: string;
  type: HolidayType;
  description: string | null;
}

export interface AttendanceRecord {
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
}

export interface ChatbotIntent {
  id: string;
  tenant_id: string | null;
  patterns: string[];
  response: string;
  query_type: string | null;
  is_global: boolean;
  priority: number;
  is_active: boolean;
}
