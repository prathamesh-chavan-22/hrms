import { data, redirect, Form, useActionData, useNavigation, Link } from "react-router";
import type { Route } from "./+types/signup";
import { submitCompanyRequest } from "~/lib/auth.server";
import {
  sendCompanyRequestConfirmationEmail,
  sendCompanyRequestSuperAdminEmail,
} from "~/lib/email.server";
import { fireAndForgetEmail } from "~/lib/email/send-async.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getTrimmedString, getLowercaseEmail } from "~/lib/validation/form-data";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { FormField } from "~/components/FormField";
import { Button } from "~/components/Button";
import { IcyCard, IcyCardBody } from "~/components/IcyCard";

export function meta() {
  return [{ title: "Request Company Account — Glacia HRMS" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request, context.cloudflare.env);
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return redirect("/login");
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const form = await request.formData();

  const companyName = getTrimmedString(form, "companyName");
  const slug = getTrimmedString(form, "slug").toLowerCase();
  const ownerName = getTrimmedString(form, "ownerName");
  const ownerEmail = getLowercaseEmail(form, "ownerEmail");

  const result = await submitCompanyRequest(env, {
    companyName,
    slug,
    ownerName,
    ownerEmail,
  });

  if (result.errors) {
    return data(
      { errors: result.errors, values: { companyName, slug, ownerName, ownerEmail }, submitted: false },
      { status: 400 }
    );
  }

  fireAndForgetEmail(
    sendCompanyRequestConfirmationEmail(env, { to: ownerEmail, ownerName, companyName }),
    "company_request_confirmation",
    { email: ownerEmail },
    context.cloudflare.ctx.waitUntil
  );

  fireAndForgetEmail(
    sendCompanyRequestSuperAdminEmail(env, { companyName, slug, ownerName, ownerEmail }),
    "company_request_superadmin",
    { company: companyName },
    context.cloudflare.ctx.waitUntil
  );

  return data({ submitted: true, errors: null, values: null });
}

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const errors = actionData?.errors ?? {};
  const values = actionData?.values ?? {};
  const submitted = actionData?.submitted === true;

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4 py-10">
        <div className="relative w-full max-w-lg">
          <div className="mb-8">
            <Link to="/" className="inline-block">
              <GlaciaLogo size="lg" />
            </Link>
            <p className="eyebrow mt-4">REQUEST SUBMITTED</p>
          </div>

          <IcyCard className="hard-shadow">
            <IcyCardBody className="p-8">
              <h2 className="font-mono font-bold text-sm uppercase tracking-[0.06em] text-ink mb-3">
                We&apos;ll be in touch
              </h2>
              <p className="text-ink-2 leading-relaxed">
                Your company account request has been submitted. We&apos;ll email you when it&apos;s approved.
                You can sign in once you receive the approval email.
              </p>
              <Link to="/login" className="inline-block mt-6">
                <Button variant="secondary">Back to Sign In</Button>
              </Link>
            </IcyCardBody>
          </IcyCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 py-10">
      <div className="relative w-full max-w-lg">
        <div className="mb-8">
          <Link to="/" className="inline-block">
            <GlaciaLogo size="lg" />
          </Link>
          <p className="eyebrow mt-4">REQUEST A COMPANY ACCOUNT</p>
        </div>

        <IcyCard className="hard-shadow">
          <IcyCardBody className="p-8">
            {errors.form && (
              <div className="bevel-sunken mb-6 p-4 text-sm font-mono text-err">
                {errors.form}
              </div>
            )}

            <Form method="post" className="space-y-5">
              <div>
                <h2 className="font-mono font-bold text-sm uppercase tracking-[0.06em] text-ink">Company Details</h2>
                <p className="eyebrow mt-1">SUBMITTED FOR SUPERADMIN REVIEW</p>
              </div>

              <FormField
                label="Company Name"
                name="companyName"
                placeholder="Nova Technologies"
                required
                defaultValue={values.companyName}
                error={errors.companyName}
              />

              <FormField
                label="Company URL Slug"
                name="slug"
                placeholder="nova"
                required
                defaultValue={values.slug}
                error={errors.slug}
                hint="glacia.supernovae.me/nova — lowercase, letters, numbers, hyphens"
              />

              <div className="rule-solid pt-5">
                <h2 className="font-mono font-bold text-sm uppercase tracking-[0.06em] text-ink">Account Owner</h2>
                <p className="eyebrow mt-1">YOU WILL BE THE COMPANY ADMIN</p>
              </div>

              <FormField
                label="Full Name"
                name="ownerName"
                placeholder="Arjun Sharma"
                required
                defaultValue={values.ownerName}
                error={errors.ownerName}
              />

              <FormField
                label="Work Email"
                name="ownerEmail"
                type="email"
                placeholder="arjun@nova.in"
                required
                defaultValue={values.ownerEmail}
                error={errors.ownerEmail}
                autoComplete="email"
              />

              <Button type="submit" fullWidth loading={isSubmitting} size="lg" className="mt-2">
                Request Company Account
              </Button>
            </Form>

            <p className="mt-6 text-sm text-ink-2">
              Already have an account?{" "}
              <Link to="/login" className="font-mono font-bold text-accent-dark hover:underline uppercase text-xs tracking-wide">
                Sign in →
              </Link>
            </p>
          </IcyCardBody>
        </IcyCard>

        <p className="eyebrow mt-6">EMPLOYEES JOIN VIA INVITE ONLY — NO PUBLIC SIGNUP</p>
      </div>
    </div>
  );
}
