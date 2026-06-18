import { Form } from "react-router";
import { IcyCard, IcyCardHeader } from "~/components/IcyCard";
import { Badge, roleBadge } from "~/components/Badge";

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  if (invites.length === 0) return null;

  return (
    <IcyCard>
      <IcyCardHeader>
        <h2 className="eyebrow">PENDING INVITATIONS</h2>
      </IcyCardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="panel-header">
              <th className="text-left px-5 py-2.5 eyebrow">Email</th>
              <th className="text-left px-5 py-2.5 eyebrow">Role</th>
              <th className="text-left px-5 py-2.5 eyebrow">Sent</th>
              <th className="text-left px-5 py-2.5 eyebrow">Expires</th>
              <th className="px-5 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id} className="rule-dashed hover:bg-surface-2 transition-colors">
                <td className="px-5 py-3 text-ink">{invite.email}</td>
                <td className="px-5 py-3">
                  <Badge {...roleBadge(invite.role)} size="sm">
                    {invite.role}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-muted text-xs font-mono">
                  {new Date(invite.created_at).toLocaleDateString("en-IN")}
                </td>
                <td className="px-5 py-3 text-muted text-xs font-mono">
                  {new Date(invite.expires_at).toLocaleDateString("en-IN")}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-3 justify-end">
                    <Form method="post" className="inline">
                      <input type="hidden" name="intent" value="resend_invite" />
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="eyebrow hover:underline text-accent-dark"
                      >
                        RESEND
                      </button>
                    </Form>
                    <Form method="post" className="inline">
                      <input type="hidden" name="intent" value="revoke_invite" />
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="eyebrow hover:underline"
                        style={{ color: "var(--err)" }}
                      >
                        REVOKE
                      </button>
                    </Form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </IcyCard>
  );
}
