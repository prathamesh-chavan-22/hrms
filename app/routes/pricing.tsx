import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/pricing";
import { PLANS, formatPrice } from "~/lib/plans";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { Button } from "~/components/Button";

export function meta() {
  return [{ title: "Pricing — Glacia HRMS" }];
}

export function loader({ context }: Route.LoaderArgs) {
  return { billingEnabled: context.cloudflare.env.BILLING_ENABLED === "true" };
}

export default function PricingPage() {
  const { billingEnabled } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-sky-200/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-cyan-200/30 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/">
            <GlaciaLogo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="secondary" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-20 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Simple, transparent pricing
            </h1>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Start free. Scale as you grow. No hidden fees.
            </p>
            {!billingEnabled && (
              <div className="mt-6 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-2 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Payments coming soon via Razorpay — all plans are free during beta!
              </div>
            )}
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl overflow-hidden transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-[0_20px_60px_rgba(14,165,233,0.35)] scale-105"
                    : "bg-white/70 backdrop-blur-md border border-sky-100 shadow-[0_4px_24px_rgba(14,165,233,0.08)]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-white text-sky-600 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg border border-sky-100">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  <div className="mb-6">
                    <h2 className={`text-xl font-bold mb-1 ${plan.highlight ? "text-white" : "text-slate-800"}`}>
                      {plan.name}
                    </h2>
                    <p className={`text-sm ${plan.highlight ? "text-sky-100" : "text-slate-500"}`}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <span className={`text-4xl font-extrabold ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                      {formatPrice(plan)}
                    </span>
                    {plan.price > 0 && (
                      <span className={`text-sm ml-1 ${plan.highlight ? "text-sky-100" : "text-slate-400"}`}>
                        /month
                      </span>
                    )}
                  </div>

                  <div className={`text-sm font-semibold mb-4 ${plan.highlight ? "text-sky-100" : "text-slate-500"}`}>
                    Up to {plan.maxEmployees} employees
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <svg
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-sky-200" : "text-sky-500"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-sm ${plan.highlight ? "text-sky-50" : "text-slate-600"}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {billingEnabled ? (
                    <Link to="/signup">
                      <button
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                          plan.highlight
                            ? "bg-white text-sky-600 hover:bg-sky-50"
                            : "bg-gradient-to-r from-sky-400 to-cyan-500 text-white hover:from-sky-500 hover:to-cyan-600 shadow-[0_2px_12px_rgba(14,165,233,0.3)]"
                        }`}
                      >
                        {plan.price === 0 ? "Get Started Free" : `Start ${plan.name}`}
                      </button>
                    </Link>
                  ) : (
                    <div>
                      <Link to="/signup">
                        <button
                          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mb-2 ${
                            plan.highlight
                              ? "bg-white text-sky-600 hover:bg-sky-50"
                              : "bg-gradient-to-r from-sky-400 to-cyan-500 text-white hover:from-sky-500 hover:to-cyan-600 shadow-[0_2px_12px_rgba(14,165,233,0.3)]"
                          }`}
                        >
                          {plan.price === 0 ? "Get Started Free" : "Join Beta (Free)"}
                        </button>
                      </Link>
                      {plan.price > 0 && (
                        <p className={`text-center text-xs ${plan.highlight ? "text-sky-200" : "text-slate-400"}`}>
                          Paid billing via Razorpay coming soon
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* FAQ teaser */}
          <div className="mt-16 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
              {[
                {
                  q: "Can I upgrade my plan later?",
                  a: "Yes — upgrade anytime. Billing via Razorpay is coming soon. During beta, all plans are free.",
                },
                {
                  q: "Is there a free trial?",
                  a: "The Starter plan is permanently free for up to 5 employees, no credit card needed.",
                },
                {
                  q: "What happens if I exceed my employee limit?",
                  a: "You won't be able to invite new employees until you upgrade. Existing employees are unaffected.",
                },
                {
                  q: "Is my data safe?",
                  a: "Yes. Each company's data is isolated with row-level security enforced at the database level.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="bg-white/60 backdrop-blur-md border border-sky-100 rounded-2xl p-5">
                  <p className="text-sm font-semibold text-slate-800 mb-1.5">{q}</p>
                  <p className="text-sm text-slate-500">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-sky-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <GlaciaLogo size="sm" />
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Glacia HRMS · Powered by Supernovae</p>
        </div>
      </footer>
    </div>
  );
}
