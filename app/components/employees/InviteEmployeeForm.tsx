import { Form } from "react-router";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Button } from "~/components/Button";
import { FormField, SelectField } from "~/components/FormField";

export interface InviteEmployeeFormProps {
  roleOptions: { value: string; label: string }[];
  canChooseRole: boolean;
  isSubmitting: boolean;
  onCancel?: () => void;
}

export function InviteEmployeeForm({
  roleOptions,
  canChooseRole,
  isSubmitting,
}: InviteEmployeeFormProps) {
  return (
    <IcyCard>
      <IcyCardHeader>
        <h2 className="eyebrow">SEND INVITATION</h2>
      </IcyCardHeader>
      <IcyCardBody>
        <Form method="post" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="hidden" name="intent" value="invite" />
          <FormField
            label="Email Address"
            name="email"
            type="email"
            placeholder="employee@company.com"
            required
          />
          {canChooseRole ? (
            <SelectField label="Role" name="role" defaultValue="employee" options={roleOptions} />
          ) : (
            <input type="hidden" name="role" value="employee" />
          )}
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" loading={isSubmitting}>
              Send Invitation
            </Button>
            <p className="text-xs text-ink-2 self-center">
              They will receive an email to set their password and join your workspace.
            </p>
          </div>
        </Form>
      </IcyCardBody>
    </IcyCard>
  );
}
