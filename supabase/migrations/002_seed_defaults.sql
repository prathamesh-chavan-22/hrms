-- ============================================================
-- Glacia HRMS - Seed default leave types and holidays per new tenant
-- Called via DB function triggered after tenant creation
-- ============================================================

-- Function to seed default leave types for a new tenant
create or replace function seed_tenant_defaults(p_tenant_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Default leave types (common Indian corporate standard)
  insert into leave_types (tenant_id, name, code, days_per_year, carry_forward, carry_forward_max, encashable, requires_doc, doc_after_days)
  values
    (p_tenant_id, 'Earned Leave',     'EL',  15, true,  30,   true,  false, null),
    (p_tenant_id, 'Casual Leave',     'CL',  12, false, null, false, false, null),
    (p_tenant_id, 'Sick Leave',       'SL',   7, false, null, false, true,  2),
    (p_tenant_id, 'Maternity Leave',  'ML',  182, false, null, false, true,  0),
    (p_tenant_id, 'Leave Without Pay','LWP',  0, false, null, false, false, null),
    (p_tenant_id, 'Compensatory Off', 'COMP', 0, false, 30,   false, false, null),
    (p_tenant_id, 'Bereavement Leave','BL',   3, false, null, false, false, null)
  on conflict (tenant_id, code) do nothing;

  -- National/Government holidays 2026 (India)
  insert into holidays (tenant_id, name, date, type, description)
  values
    (p_tenant_id, 'New Year''s Day',          '2026-01-01', 'national', 'New Year celebration'),
    (p_tenant_id, 'Republic Day',             '2026-01-26', 'national', 'National holiday'),
    (p_tenant_id, 'Holi',                     '2026-03-03', 'national', 'Festival of Colors'),
    (p_tenant_id, 'Good Friday',              '2026-04-03', 'national', 'Christian holiday'),
    (p_tenant_id, 'Ambedkar Jayanti',         '2026-04-14', 'national', 'Dr. Ambedkar birthday'),
    (p_tenant_id, 'Ram Navami',               '2026-04-26', 'optional', 'Hindu festival'),
    (p_tenant_id, 'Maharashtra Day',          '2026-05-01', 'national', 'Labour Day / Maharashtra Day'),
    (p_tenant_id, 'Eid ul-Fitr',              '2026-03-31', 'national', 'Islamic festival'),
    (p_tenant_id, 'Eid ul-Adha',             '2026-06-07', 'national', 'Islamic festival'),
    (p_tenant_id, 'Independence Day',         '2026-08-15', 'national', 'National holiday'),
    (p_tenant_id, 'Gandhi Jayanti',           '2026-10-02', 'national', 'Mahatma Gandhi birthday'),
    (p_tenant_id, 'Dussehra',                 '2026-10-20', 'national', 'Hindu festival'),
    (p_tenant_id, 'Diwali',                   '2026-11-08', 'national', 'Festival of Lights'),
    (p_tenant_id, 'Diwali (Lakshmi Puja)',    '2026-11-09', 'national', 'Festival of Lights'),
    (p_tenant_id, 'Christmas Day',            '2026-12-25', 'national', 'Christian holiday')
  on conflict (tenant_id, date, name) do nothing;
end;
$$;

-- Global chatbot intents (is_global = true, no tenant)
insert into chatbot_intents (tenant_id, patterns, response, query_type, is_global, priority)
values
  (null, ARRAY['hi','hello','hey','good morning','good afternoon'], 'Hello! I am Glacia Assistant. How can I help you today? You can ask about leave balance, attendance, or holidays.', null, true, 10),
  (null, ARRAY['help','what can you do','commands','features'], 'I can help you with: leave balance, apply leave, attendance records, holidays list, company info. Try asking "my leave balance" or "upcoming holidays".', null, true, 9),
  (null, ARRAY['bye','goodbye','see you','thanks bye'], 'Goodbye! Have a great day!', null, true, 8)
on conflict do nothing;
