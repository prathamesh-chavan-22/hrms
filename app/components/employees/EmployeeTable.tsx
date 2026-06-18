import { Form } from "react-router";
import { IcyCard, IcyCardHeader } from "~/components/IcyCard";
import { Badge, roleBadge, statusBadge } from "~/components/Badge";

export interface EmployeeRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  department: string | null;
  designation: string | null;
  date_of_joining: string | null;
  created_at: string;
  must_change_password: boolean;
}

export interface EmployeeTableProps {
  employees: EmployeeRow[];
  currentUserId: string;
  canReset: boolean;
  onResetPassword: (userId: string) => void;
}

export function EmployeeTable({
  employees,
  currentUserId,
  canReset,
  onResetPassword,
}: EmployeeTableProps) {
  return (
    <IcyCard>
      <IcyCardHeader>
        <h2 className="eyebrow">ALL EMPLOYEES</h2>
      </IcyCardHeader>
      <div className="overflow-x-auto">
        {employees.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-ink-2">No employees yet. Invite your first team member.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="panel-header">
                <th className="text-left px-5 py-2.5 eyebrow">Name</th>
                <th className="text-left px-5 py-2.5 eyebrow">Role</th>
                <th className="text-left px-5 py-2.5 eyebrow">Department</th>
                <th className="text-left px-5 py-2.5 eyebrow">Status</th>
                <th className="text-left px-5 py-2.5 eyebrow">Joined</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="rule-dashed hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="bevel-accent w-8 h-8 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 !shadow-none">
                        {emp.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-ink">{emp.full_name}</p>
                        <p className="eyebrow mt-0.5 normal-case tracking-normal lowercase">
                          {emp.email}
                        </p>
                        {emp.must_change_password && (
                          <p className="text-xs font-mono mt-0.5" style={{ color: "var(--warn)" }}>
                            pending first login
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge {...roleBadge(emp.role)} size="sm">
                      {emp.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-2">{emp.department ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge {...statusBadge(emp.status)} size="sm">
                      {emp.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs font-mono tnum">
                    {emp.date_of_joining
                      ? new Date(emp.date_of_joining).toLocaleDateString("en-IN")
                      : new Date(emp.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-5 py-3">
                    {emp.id !== currentUserId && (
                      <div className="flex flex-col gap-1 items-end">
                        {canReset && emp.role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => onResetPassword(emp.id)}
                            className="eyebrow hover:underline text-accent-dark"
                          >
                            RESET PW
                          </button>
                        )}
                        <Form method="post">
                          <input type="hidden" name="userId" value={emp.id} />
                          <input
                            type="hidden"
                            name="intent"
                            value={emp.status === "active" ? "deactivate" : "activate"}
                          />
                          <button
                            type="submit"
                            className="eyebrow hover:underline"
                            style={{
                              color: emp.status === "active" ? "var(--err)" : "var(--ok)",
                            }}
                          >
                            {emp.status === "active" ? "DEACTIVATE" : "ACTIVATE"}
                          </button>
                        </Form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </IcyCard>
  );
}
