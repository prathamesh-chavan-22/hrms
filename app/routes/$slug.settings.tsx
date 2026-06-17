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
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your company configuration</p>
      </div>

      {/* Flash */}
      {actionData?.success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {actionData.success}
        </div>
      )}
      {actionData?.error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {actionData.error}
        </div>
      )}

      {/* Company branding */}
      <IcyCard>
        <IcyCardHeader>
          <h2 className="text-base font-semibold text-slate-800">Company Branding</h2>
          <p className="text-xs text-slate-400 mt-0.5">Name and accent colour shown across your HRMS</p>
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
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Accent Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="accentColor"
                    defaultValue={tenant.theme?.accent ?? "#38bdf8"}
                    className="h-10 w-16 rounded-lg border border-sky-200 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">Primary accent</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Dark Accent</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="accentDark"
                    defaultValue={(tenant.theme as Tenant["theme"])?.accentDark ?? "#0ea5e9"}
                    className="h-10 w-16 rounded-lg border border-sky-200 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">Dark variant</span>
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
          <h2 className="text-base font-semibold text-slate-800">Company Logo</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload a PNG, JPEG, or WebP (max 2 MB). Shown in the sidebar.</p>
        </IcyCardHeader>
        <IcyCardBody className="space-y-5">
          {displayLogoUrl && (
            <div className="flex items-center gap-4">
              <img
                src={displayLogoUrl}
                alt="Company logo"
                className="w-20 h-20 rounded-xl object-contain border border-sky-100 bg-white p-1"
              />
              <Form method="post">
                <input type="hidden" name="intent" value="remove_logo" />
                <button type="submit" className="text-sm text-red-500 hover:underline font-medium">
                  Remove Logo
                </button>
              </Form>
            </div>
          )}

          <Form method="post" encType="multipart/form-data" className="space-y-4">
            <input type="hidden" name="intent" value="upload_logo" />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                {displayLogoUrl ? "Replace Logo" : "Upload Logo"}
              </label>
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200 cursor-pointer"
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
          <h2 className="text-base font-semibold text-slate-800">GPS Attendance</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            When enabled, employees must share their GPS location to punch in/out.
          </p>
        </IcyCardHeader>
        <IcyCardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">GPS Required for Attendance</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Currently:{" "}
                <span className={`font-semibold ${tenant.gps_required ? "text-emerald-600" : "text-slate-500"}`}>
                  {tenant.gps_required ? "Enabled" : "Disabled"}
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
          <h2 className="text-base font-semibold text-slate-800">Current Plan</h2>
        </IcyCardHeader>
        <IcyCardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-slate-800">{plan.name}</p>
              <p className="text-sm text-slate-500">
                {plan.maxEmployees} employees max &middot; {plan.price === 0 ? "Free" : `₹${plan.price}/mo`}
              </p>
            </div>
            <Button variant="secondary" size="sm" disabled title="Razorpay billing coming soon">
              Upgrade Plan (Coming Soon)
            </Button>
          </div>
          <p className="mt-3 text-xs text-sky-500 bg-sky-50 rounded-lg px-3 py-2 inline-block">
            Billing integration via Razorpay is coming soon.
          </p>
        </IcyCardBody>
      </IcyCard>

      {/* Company URL */}
      <IcyCard>
        <IcyCardHeader>
          <h2 className="text-base font-semibold text-slate-800">Your HRMS URL</h2>
        </IcyCardHeader>
        <IcyCardBody>
          <div className="flex items-center gap-3 bg-sky-50 rounded-xl px-4 py-3 font-mono text-sm text-sky-700 border border-sky-200">
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <path
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            glacia.supernovae.me/{tenant.slug}
          </div>
        </IcyCardBody>
      </IcyCard>
    </div>
  );
}
