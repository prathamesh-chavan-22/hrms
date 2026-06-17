import { data, Form, useLoaderData, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/$slug.settings";
import { requireHR } from "~/lib/auth.server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "~/lib/supabase.server";
import { getPlan } from "~/lib/plans";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Button } from "~/components/Button";
import { FormField } from "~/components/FormField";
import type { Tenant } from "~/types/app";

export function meta() {
  return [{ title: "Settings — Glacia HRMS" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const slug = params.slug!;
  const { profile, tenant } = await requireHR(request, context.cloudflare.env, slug);
  return data({ profile, tenant });
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { profile, tenant } = await requireHR(request, env, slug);
  const service = createSupabaseServiceClient(env);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "update_company") {
    const name = String(form.get("name") ?? "").trim();
    const accentColor = String(form.get("accentColor") ?? "#38bdf8");
    const accentDark = String(form.get("accentDark") ?? "#0ea5e9");

    if (!name) return data({ error: "Company name is required", intent, success: null, logoUrl: null }, { status: 400 });

    const { error } = await service
      .from("tenants")
      .update({ name, theme: { accent: accentColor, accentDark } })
      .eq("id", tenant.id);

    if (error) return data({ error: error.message, intent, success: null, logoUrl: null }, { status: 500 });
    return data({ success: "Company settings updated", intent, error: null, logoUrl: null });
  }

  if (intent === "upload_logo") {
    const file = form.get("logo") as File | null;
    if (!file || file.size === 0) return data({ error: "Please select a logo file", intent, success: null, logoUrl: null }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return data({ error: "Logo must be under 2 MB", intent, success: null, logoUrl: null }, { status: 400 });
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      return data({ error: "Only PNG, JPEG, WebP, or SVG allowed", intent, success: null, logoUrl: null }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${tenant.id}/logo.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { supabase } = createSupabaseServerClient(request, env);
    const { error: uploadError } = await supabase.storage
      .from("tenant-logos")
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

    if (uploadError) return data({ error: uploadError.message, intent, success: null, logoUrl: null }, { status: 500 });

    const { data: urlData } = supabase.storage.from("tenant-logos").getPublicUrl(path);
    const logoUrl = urlData.publicUrl + `?t=${Date.now()}`;

    await service.from("tenants").update({ logo_url: logoUrl }).eq("id", tenant.id);
    return data({ success: "Logo updated", intent, error: null, logoUrl });
  }

  if (intent === "remove_logo") {
    await service.from("tenants").update({ logo_url: null }).eq("id", tenant.id);
    return data({ success: "Logo removed", intent, error: null, logoUrl: null });
  }

  if (intent === "toggle_gps") {
    const gpsRequired = form.get("gps_required") === "true";
    await service.from("tenants").update({ gps_required: gpsRequired }).eq("id", tenant.id);
    return data({ success: `GPS attendance ${gpsRequired ? "enabled" : "disabled"}`, intent, error: null, logoUrl: null });
  }

  return data({ error: "Unknown action", intent, success: null, logoUrl: null }, { status: 400 });
}

export default function SettingsPage() {
  const { profile, tenant } = useLoaderData<typeof loader>();
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
      {actionData?.success && (
        <div className="bevel-sunken p-4 text-sm font-mono" style={{ color: "var(--ok)" }}>
          {actionData.success}
        </div>
      )}
      {actionData?.error && (
        <div className="bevel-sunken p-4 text-sm font-mono text-err">
          {actionData.error}
        </div>
      )}

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
