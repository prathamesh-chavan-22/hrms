import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/pricing";
import { PLANS, formatPrice } from "~/lib/plans";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { Button } from "~/components/Button";

export function meta() {
  return [{ title: "Pricing — Glacia HRMS" }];
}

export function headers() {
  return {
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  };
}

export function loader({ context }: Route.LoaderArgs) {
  return { billingEnabled: context.cloudflare.env.BILLING_ENABLED === "true" };
}

export default function PricingPage() {
  const { billingEnabled } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-bg">
      {/* Top chrome */}
      <nav className="topbar sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link to="/">
            <GlaciaLogo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="secondary" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20">
        {/* Header */}
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow mb-3">PRICING</p>
          <h1 className="display text-4xl sm:text-5xl text-ink mb-4">
            Simple. Transparent.<br />No hidden fees.
          </h1>
          <p className="text-ink-2 text-base">
            Start free. Scale as you grow.
          </p>
          {!billingEnabled && (
            <div className="bevel mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-mono" style={{ color: "var(--warn)" }}>
              <span className="w-2 h-2" style={{ backgroundColor: "var(--warn)" }} />
              PAYMENTS VIA RAZORPAY COMING SOON — FREE DURING BETA
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-7 ${plan.highlight ? "bevel-accent dot-grid hard-shadow" : "bevel"}`}
            >
              {plan.highlight && (
                <span className="absolute top-4 right-4 chip" style={{ background: "#F4F9FC", color: "var(--accent-darker)" }}>
                  MOST POPULAR
                </span>
              )}

              <div className="mb-5">
                <p className={`eyebrow mb-2 ${plan.highlight ? "text-[#F4F9FC]/80" : ""}`}>{plan.name.toUpperCase()}</p>
                <p className={`text-sm ${plan.highlight ? "text-[#F4F9FC]/85" : "text-ink-2"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-5 flex items-baseline gap-1">
                <span className={`display text-4xl tnum ${plan.highlight ? "text-[#F4F9FC]" : "text-ink"}`}>
                  {formatPrice(plan)}
                </span>
                {plan.price > 0 && (
                  <span className={`text-xs font-mono ${plan.highlight ? "text-[#F4F9FC]/75" : "text-muted"}`}>
                    /MO
                  </span>
                )}
              </div>

              <div className={`chip mb-5 ${plan.highlight ? "" : ""}`} style={plan.highlight ? { background: "rgba(255,255,255,0.18)", color: "#F4F9FC", borderColor: "#F4F9FC" } : undefined}>
                UP TO {plan.maxEmployees} EMPLOYEES
              </div>

              <ul className="space-y-2.5 mb-7">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span className={`font-mono font-bold mt-0.5 ${plan.highlight ? "text-[#F4F9FC]" : "text-accent-dark"}`}>+</span>
                    <span className={`text-sm ${plan.highlight ? "text-[#F4F9FC]/90" : "text-ink-2"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link to="/signup" className="block">
                <Button variant={plan.highlight ? "secondary" : "primary"} fullWidth size="md">
                  {plan.price === 0 ? "Get Started" : billingEnabled ? `Start ${plan.name}` : "Join Beta"}
                </Button>
              </Link>
              {!billingEnabled && plan.price > 0 && (
                <p className={`eyebrow mt-2 ${plan.highlight ? "text-[#F4F9FC]/70" : ""}`}>RAZORPAY BILLING SOON</p>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <p className="eyebrow mb-2">FAQ</p>
          <h3 className="display text-2xl text-ink mb-6">Frequently asked questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
            {[
              { q: "Can I upgrade my plan later?", a: "Yes — upgrade anytime. Billing via Razorpay is coming soon. During beta, all plans are free." },
              { q: "Is there a free trial?", a: "The Starter plan is permanently free for up to 5 employees, no credit card needed." },
              { q: "What if I exceed my employee limit?", a: "You won't be able to invite new employees until you upgrade. Existing employees are unaffected." },
              { q: "Is my data safe?", a: "Yes. Each company's data is isolated with row-level security enforced at the database level." },
            ].map(({ q, a }) => (
              <div key={q} className="bevel p-5">
                <p className="font-mono font-bold text-sm text-ink mb-1.5">{q}</p>
                <p className="text-sm text-ink-2">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-rule max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <GlaciaLogo size="sm" />
        <p className="eyebrow">© {new Date().getFullYear()} GLACIA · SUPERNOVAE</p>
      </footer>
    </div>
  );
}
