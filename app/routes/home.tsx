import { Link } from "react-router";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { Button } from "~/components/Button";

export function meta() {
  return [
    { title: "Glacia — HRMS for Growing Teams" },
    { name: "description", content: "Multi-tenant HR management software with attendance, leave, and team management. A tool, not a brochure. Built for India." },
  ];
}

export function headers() {
  return {
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  };
}

const features = [
  {
    no: "01",
    title: "GPS ATTENDANCE",
    desc: "Employees punch in/out with verified GPS location. HR sees every location on an interactive OpenStreetMap.",
  },
  {
    no: "02",
    title: "LEAVE POLICY",
    desc: "Configure leave types, carry-forward rules, national holidays, and approval workflows in one place.",
  },
  {
    no: "03",
    title: "TEAM DIRECTORY",
    desc: "Invite by email. Roles — Employee, HR, Admin, Owner — with fine-grained permissions.",
  },
  {
    no: "04",
    title: "OWN BRANDING",
    desc: "Upload your logo, pick an accent. Your team signs in at glacia.supernovae.me/yourcompany.",
  },
  {
    no: "05",
    title: "RULE-BASED BOT",
    desc: "A no-LLM assistant that answers leave balance, holidays, and attendance straight from your data.",
  },
  {
    no: "06",
    title: "ROW-LEVEL SECURITY",
    desc: "Isolation enforced at the database layer. Every tenant is sealed off from every other.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Top chrome */}
      <nav className="topbar sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <GlaciaLogo size="md" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/pricing" className="hidden sm:block eyebrow hover:text-ink transition-colors px-2 py-1">
              PRICING
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — asymmetric, left-weighted */}
      <section className="border-b-2 border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-8 py-16 lg:py-20">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-5">MULTI-TENANT HRMS · BUILT FOR INDIA</p>
            <h1 className="display text-5xl sm:text-6xl lg:text-7xl text-ink mb-6">
              HR MANAGEMENT,<br />
              <span className="text-accent-dark">WITHOUT THE FLUFF.</span>
            </h1>
            <p className="text-ink-2 text-base max-w-xl mb-8 leading-relaxed">
              Glacia is a branded HR workspace for your company — GPS attendance, leave
              policy, team management, and a rule-based assistant. Dense, fast, free to start.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link to="/signup">
                <Button size="lg">Start for Free →</Button>
              </Link>
              <Link to="/pricing">
                <Button variant="secondary" size="lg">View Pricing</Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="chip">NO CREDIT CARD</span>
              <span className="chip">UP TO 5 FREE</span>
              <span className="chip chip-accent">BETA</span>
            </div>
          </div>

          {/* Window mock */}
          <div className="lg:col-span-5">
            <div className="bevel hard-shadow">
              {/* Title bar */}
              <div className="panel-header flex items-center gap-2 px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-3 h-3 bevel-sunken !shadow-none" />
                  <span className="w-3 h-3 bevel-sunken !shadow-none" />
                  <span className="w-3 h-3 bevel-accent !shadow-none" />
                </div>
                <span className="ml-2 eyebrow truncate">/NOVA/DASHBOARD</span>
              </div>
              <div className="p-3 space-y-3">
                <p className="text-sm font-bold text-ink">Good morning, Arjun</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: "EMPLOYEES", v: "18" },
                    { l: "ON LEAVE", v: "03" },
                    { l: "PRESENT", v: "14" },
                    { l: "HOLIDAYS", v: "02" },
                  ].map((s) => (
                    <div key={s.l} className="bevel-sunken px-3 py-2">
                      <p className="text-2xl font-bold text-ink tnum leading-none">{s.v}</p>
                      <p className="eyebrow mt-1.5">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className="bevel-sunken p-3 space-y-2">
                  <p className="eyebrow">RECENT TEAM</p>
                  {["Priya M.", "Rahul K.", "Sneha P."].map((n) => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="bevel-accent w-5 h-5 flex items-center justify-center text-[9px] font-mono font-bold !shadow-none">{n[0]}</span>
                      <span className="text-xs text-ink-2">{n}</span>
                      <span className="ml-auto chip" style={{ backgroundColor: "var(--ok)", color: "#F4F9FC" }}>ACTIVE</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — dense beveled grid, mono indices, no emoji */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <p className="eyebrow mb-2">WHAT'S INSIDE</p>
            <h2 className="display text-3xl sm:text-4xl text-ink">Everything HR needs.<br />Nothing it doesn't.</h2>
          </div>
          <span className="chip">06 MODULES</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bevel p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="bevel-accent w-8 h-8 flex items-center justify-center font-mono font-bold text-xs !shadow-[inset_2px_2px_0_0_rgba(255,255,255,0.45),inset_-2px_-2px_0_0_var(--accent-darker)]">{f.no}</span>
              </div>
              <h3 className="font-mono font-bold text-sm tracking-[0.04em] text-ink">{f.title}</h3>
              <p className="text-sm text-ink-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band — accent + dot grid */}
      <section className="border-y-2 border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="bevel-accent dot-grid hard-shadow p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="eyebrow mb-3" style={{ color: "rgba(255,255,255,0.75)" }}>GET STARTED</p>
              <h2 className="display text-3xl sm:text-4xl text-[#F4F9FC]">Run HR the right way.</h2>
              <p className="text-[#F4F9FC]/80 mt-2 text-sm font-mono">FREE FOR UP TO 5 EMPLOYEES · NO CARD</p>
            </div>
            <Link to="/signup">
              <Button variant="secondary" size="lg">Create Company →</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <GlaciaLogo size="sm" />
        <div className="flex gap-5">
          <Link to="/pricing" className="eyebrow hover:text-ink transition-colors">PRICING</Link>
          <Link to="/login" className="eyebrow hover:text-ink transition-colors">SIGN IN</Link>
          <Link to="/signup" className="eyebrow hover:text-ink transition-colors">SIGN UP</Link>
        </div>
        <p className="eyebrow">© {new Date().getFullYear()} GLACIA · SUPERNOVAE</p>
      </footer>
    </div>
  );
}
