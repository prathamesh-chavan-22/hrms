import { data, Form, redirect, useOutletContext, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/$slug.settings";
import { requireChildLoaderAuth } from "~/lib/auth.server";
import type { Tenant } from "~/types/app";
import type { TenantOutletContext } from "./$slug";
import { getPlan } from "~/lib/plans";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Button } from "~/components/Button";
import { FormField } from "~/components/FormField";
import { FlashMessage } from "~/components/FlashMessage";
import { isHR } from "~/lib/roles";
import { dispatchIntent } from "~/lib/actions/intent-handler.server";
import { settingsIntentHandlers } from "~/lib/actions/settings/handlers.server";
import { getIntent } from "~/lib/validation/form-data";

export function meta() {
  return [{ title: "Settings — Glacia HRMS" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const slug = params.slug!;
  const { role } = await requireChildLoaderAuth(request, context.cloudflare.env);
  if (!isHR(role)) {
    throw redirect(`/${slug}/dashboard`);
  }
  return data({});
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = getIntent(form);

  if (!settingsIntentHandlers[intent]) {
    return data({ error: "Unknown action", intent, success: null, logoUrl: null }, { status: 400 });
  }

  return dispatchIntent(intent, settingsIntentHandlers, {
    request,
    form,
    env: context.cloudflare.env,
    params,
  });
}

export default function SettingsPage() {
  const { tenant } = useOutletContext<TenantOutletContext>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const plan = getPlan(tenant.plan);

  const currentIntent = navigation.formData?.get("intent");

  // Use optimistic updated logo if just uploaded
  const displayLogoUrl = actionData?.logoUrl ?? tenant.logo_url;

  return (
    <div className="p-5 lg:p-7 space-y-5">
      <div>
        <p className="eyebrow mb-2">SETTINGS</p>
        <h1 className="display text-3xl text-ink">Company Configuration</h1>
      </div>

      {/* Flash */}
      <FlashMessage message={actionData?.success} variant="success" />
      <FlashMessage message={actionData?.error} variant="error" />

      {/* Company branding */}
      <IcyCard>
        <IcyCardHeader>
          <h2 className="eyebrow">COMPANY BRANDING</h2>
        </IcyCardHeader>
        <IcyCardBody>
          <Form method="post" className="space-y-5">
            <input type="hidden" name="intent" value="update_company" />
            <FormField
              label="Company Name"
              name="name"
              defaultValue={tenant.name}
              required
              placeholder="Nova Technologies"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="eyebrow block mb-1.5">Accent Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="accentColor"
                    defaultValue={tenant.theme?.accent ?? "#06B6D4"}
                    className="h-10 w-16 bevel-sunken cursor-pointer p-0.5"
                  />
                  <span className="eyebrow">PRIMARY</span>
                </div>
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Dark Accent</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="accentDark"
                    defaultValue={(tenant.theme as Tenant["theme"])?.accentDark ?? "#0E7490"}
                    className="h-10 w-16 bevel-sunken cursor-pointer p-0.5"
                  />
                  <span className="eyebrow">DARK</span>
                </div>
              </div>
            </div>
            <Button type="submit" loading={isSubmitting && currentIntent === "update_company"}>
              Save Changes
            </Button>
          </Form>
        </IcyCardBody>
      </IcyCard>

      {/* Logo upload */}
      <IcyCard>
        <IcyCardHeader>
          <h2 className="eyebrow">COMPANY LOGO</h2>
        </IcyCardHeader>
        <IcyCardBody className="space-y-5">
          {displayLogoUrl && (
            <div className="flex items-center gap-4">
              <img
                src={displayLogoUrl}
                alt="Company logo"
                className="w-20 h-20 object-contain bevel bg-surface p-1"
              />
              <Form method="post">
                <input type="hidden" name="intent" value="remove_logo" />
                <button type="submit" className="eyebrow hover:underline" style={{ color: "var(--err)" }}>
                  REMOVE LOGO
                </button>
              </Form>
            </div>
          )}

          <Form method="post" encType="multipart/form-data" className="space-y-4">
            <input type="hidden" name="intent" value="upload_logo" />
            <div>
              <label className="eyebrow block mb-1.5">
                {displayLogoUrl ? "REPLACE LOGO" : "UPLOAD LOGO"}
              </label>
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="block w-full text-sm text-ink-2 font-mono file:mr-4 file:py-2 file:px-4 file:border-2 file:border-rule file:text-xs file:font-mono file:font-bold file:uppercase file:bg-accent file:text-[#F4F9FC] cursor-pointer"
              />
            </div>
            <Button type="submit" loading={isSubmitting && currentIntent === "upload_logo"}>
              Upload Logo
            </Button>
          </Form>
        </IcyCardBody>
      </IcyCard>

      {/* GPS Attendance */}
      <IcyCard>
        <IcyCardHeader>
          <h2 className="eyebrow">GPS ATTENDANCE</h2>
        </IcyCardHeader>
        <IcyCardBody>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-ink">GPS Required for Attendance</p>
              <p className="eyebrow mt-1">
                CURRENTLY:{" "}
                <span style={{ color: tenant.gps_required ? "var(--ok)" : "var(--muted)" }}>
                  {tenant.gps_required ? "ENABLED" : "DISABLED"}
                </span>
              </p>
              <p className="text-xs text-ink-2 mt-2 max-w-xl">
                When enabled, employees must submit browser-reported coordinates at punch time.
                Coordinates are stored for HR review but can be spoofed — use for audit trails,
                not as a sole anti-fraud control.
              </p>
            </div>
            <Form method="post">
              <input type="hidden" name="intent" value="toggle_gps" />
              <input type="hidden" name="gps_required" value={tenant.gps_required ? "false" : "true"} />
              <Button
                type="submit"
                variant={tenant.gps_required ? "secondary" : "primary"}
                size="sm"
                loading={isSubmitting && currentIntent === "toggle_gps"}
              >
                {tenant.gps_required ? "Disable GPS" : "Enable GPS"}
              </Button>
            </Form>
          </div>
        </IcyCardBody>
      </IcyCard>

      {/* Plan info */}
      <IcyCard>
        <IcyCardHeader>
          <h2 className="eyebrow">CURRENT PLAN</h2>
        </IcyCardHeader>
        <IcyCardBody>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="display text-xl text-ink">{plan.name}</p>
              <p className="eyebrow mt-1 tnum">
                {plan.maxEmployees} EMPLOYEES MAX · {plan.price === 0 ? "FREE" : `₹${plan.price}/MO`}
              </p>
            </div>
            <Button variant="secondary" size="sm" disabled title="Razorpay billing coming soon">
              Upgrade (Soon)
            </Button>
          </div>
          <p className="mt-3 chip">RAZORPAY BILLING COMING SOON</p>
        </IcyCardBody>
      </IcyCard>

      {/* Company URL */}
      <IcyCard>
        <IcyCardHeader>
          <h2 className="eyebrow">YOUR HRMS URL</h2>
        </IcyCardHeader>
        <IcyCardBody>
          <div className="bevel-sunken flex items-center gap-3 px-4 py-3 font-mono text-sm text-accent-dark">
            <span className="text-muted">↳</span>
            glacia.supernovae.me/{tenant.slug}
          </div>
        </IcyCardBody>
      </IcyCard>
    </div>
  );
}
