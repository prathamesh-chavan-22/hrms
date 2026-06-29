import { data, redirect, Form, useLoaderData, useActionData, useNavigation, Link } from "react-router";
import type { Route } from "./+types/invite.$token";
import { getInviteByToken, acceptInvite } from "~/lib/auth.server";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { FormField } from "~/components/FormField";
import { Button } from "~/components/Button";
import { IcyCard, IcyCardBody } from "~/components/IcyCard";
import { getTrimmedString, getString } from "~/lib/validation/form-data";
import { validatePasswordConfirmation } from "~/lib/validation/password";
import { enforceRateLimit, clientIpKey } from "~/lib/rate-limit.server";

export function meta() {
  return [{ title: "Accept Invitation — Glacia HRMS" }];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const invite = await getInviteByToken(context.cloudflare.env, params.token);
  if (!invite) {
    return data({ invalid: true, invite: null }, { status: 200 });
  }
  return { invalid: false, invite };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;

  await enforceRateLimit(request, env, {
    endpoint: "invite-accept",
    limit: 10,
    windowSeconds: 60 * 60,
    keys: [clientIpKey(request), params.token ?? ""],
  });

  const form = await request.formData();
  const fullName = getTrimmedString(form, "fullName");
  const password = getString(form, "password");
  const confirmPassword = getString(form, "confirmPassword");

  const errors: Record<string, string> = {};
  if (!fullName) errors.fullName = "Full name is required";
  const passwordError = validatePasswordConfirmation(password, confirmPassword);
  if (passwordError) {
    if (passwordError.includes("match")) errors.confirmPassword = passwordError;
    else errors.password = passwordError;
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  const result = await acceptInvite(env, params.token, { fullName, password });
  if (result.error) {
    return data({ errors: { form: result.error } }, { status: 400 });
  }

  return redirect(`/login?welcome=1`);
}

export default function InvitePage() {
  const { invalid, invite } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors ?? {};

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="mb-8">
          <Link to="/" className="inline-block">
            <GlaciaLogo size="lg" />
          </Link>
        </div>

        {invalid ? (
          <IcyCard className="hard-shadow">
            <IcyCardBody className="p-8">
              <p className="eyebrow mb-3" style={{ color: "var(--err)" }}>LINK EXPIRED</p>
              <h2 className="display text-2xl text-ink mb-2">Invalid or Expired Invite</h2>
              <p className="text-ink-2 text-sm mb-6">
                This invitation link has expired or already been used. Ask your HR admin to send a new invite.
              </p>
              <Link to="/login" className="font-mono font-bold text-accent-dark hover:underline text-xs uppercase tracking-wide">
                Go to Sign In →
              </Link>
            </IcyCardBody>
          </IcyCard>
        ) : (
          <IcyCard className="hard-shadow">
            <IcyCardBody className="p-8">
              <div className="mb-6">
                <p className="eyebrow mb-2">YOU'RE INVITED TO JOIN</p>
                <h2 className="display text-2xl text-ink">
                  {(invite as { tenant: { name: string } }).tenant?.name}
                </h2>
                <p className="text-sm font-mono text-accent-dark mt-1">{invite?.email}</p>
              </div>

              {errors.form && (
                <div className="bevel-sunken mb-5 p-4 text-sm font-mono text-err">
                  {errors.form}
                </div>
              )}

              <Form method="post" className="space-y-5">
                <FormField
                  label="Full Name"
                  name="fullName"
                  placeholder="Your full name"
                  required
                  error={errors.fullName}
                />
                <FormField
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  required
                  error={errors.password}
                  autoComplete="new-password"
                />
                <FormField
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  required
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                />
                <Button type="submit" fullWidth loading={isSubmitting} size="lg">
                  Accept & Create Account
                </Button>
              </Form>
            </IcyCardBody>
          </IcyCard>
        )}
      </div>
    </div>
  );
}
