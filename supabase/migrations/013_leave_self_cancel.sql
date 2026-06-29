-- Allow employees to cancel their own pending leave requests
create policy "leave_requests: self cancel pending" on leave_requests
  for update
  using (
    tenant_id = auth_tenant_id()
    and user_id = auth.uid()
    and status = 'pending'
  )
  with check (
    tenant_id = auth_tenant_id()
    and user_id = auth.uid()
    and status = 'cancelled'
  );
