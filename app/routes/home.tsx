import { Link } from "react-router";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { Button } from "~/components/Button";

export function meta() {
  return [
    { title: "Glacia — Modern HRMS for Growing Teams" },
    { name: "description", content: "Multi-tenant HR management software with attendance, leave, and team management. Icy cool. Built for India." },
  ];
}

const features = [
  {
    icon: "📍",
    title: "GPS Attendance",
    desc: "Employees punch in/out with verified GPS location. HR sees all locations on an interactive map via OpenStreetMap.",
  },
  {
    icon: "🗓️",
    title: "Leave Management",
    desc: "Configure leave types, carry-forward rules, national holidays, and approval workflows — all in one CMS.",
  },
  {
    icon: "👥",
    title: "Team Directory",
    desc: "Invite employees by email. Manage roles — Employee, HR, Admin, Owner — with fine-grained permissions.",
  },
  {
    icon: "🏢",
    title: "Your HRMS, Your Brand",
    desc: "Upload your company logo, pick your accent colour. Your team logs in at glacia.supernovae.me/yourcompany.",
  },
  {
    icon: "🤖",
    title: "Rule-based Assistant",
    desc: "An intelligent no-LLM chatbot that answers HR queries — leave balance, holidays, attendance — from your data.",
  },
  {
    icon: "🔒",
    title: "Enterprise-grade Security",
    desc: "Row-level security enforced at the database layer. Every tenant is completely isolated.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50">
      {/* Frost blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-sky-200/25 blur-3xl" />
        <div className="absolute bottom-20 right-0 w-96 h-96 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <GlaciaLogo size="md" />
          <div className="flex items-center gap-3">
            <Link to="/pricing" className="text-sm font-medium text-slate-600 hover:text-sky-700 transition-colors px-3 py-1.5">
              Pricing
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            Multi-tenant HRMS for Indian companies
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
            HR management,{" "}
            <span className="bg-gradient-to-r from-sky-500 to-cyan-500 bg-clip-text text-transparent">
              crystal clear.
            </span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Glacia gives your team a beautiful, branded HRMS — GPS attendance, leave policies, team management and an AI-powered assistant. Free to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg">
                Start for Free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="secondary" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero card mockup */}
        <div className="mt-16 max-w-5xl mx-auto relative">
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-sky-100 shadow-[0_20px_60px_rgba(14,165,233,0.12)] overflow-hidden">
            {/* Mock browser bar */}
            <div className="bg-sky-50/80 border-b border-sky-100 px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-300" />
                <div className="w-3 h-3 rounded-full bg-amber-300" />
                <div className="w-3 h-3 rounded-full bg-emerald-300" />
              </div>
              <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-slate-400 border border-sky-100 max-w-xs mx-auto text-center">
                glacia.supernovae.me/nova/dashboard
              </div>
            </div>
            {/* Mock dashboard */}
            <div className="flex min-h-72">
              {/* Sidebar */}
              <div className="w-52 bg-white/70 border-r border-sky-50 p-3 space-y-1 hidden sm:block">
                <div className="px-2 py-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">N</div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Nova Tech</div>
                      <div className="text-xs text-slate-400">/nova</div>
                    </div>
                  </div>
                </div>
                {["Dashboard", "Attendance", "Leave", "Holidays", "Employees", "Settings"].map((item, i) => (
                  <div key={item} className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${i === 0 ? "bg-sky-100 text-sky-700" : "text-slate-500"}`}>
                    <span className="w-4 h-4 rounded bg-sky-100/50 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 p-4 space-y-3">
                <div className="text-sm font-bold text-slate-700">Good morning, Arjun 👋</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    { l: "Employees", v: "18", c: "bg-sky-100" },
                    { l: "On Leave", v: "3", c: "bg-amber-100" },
                    { l: "Present Today", v: "14", c: "bg-emerald-100" },
                    { l: "Holidays", v: "2", c: "bg-violet-100" },
                  ].map((s) => (
                    <div key={s.l} className={`${s.c} rounded-xl p-3`}>
                      <div className="text-lg font-bold text-slate-800">{s.v}</div>
                      <div className="text-xs text-slate-500">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-sky-50 rounded-xl p-3 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-600">Recent Team</div>
                    {["Priya M.", "Rahul K.", "Sneha P."].map((n) => (
                      <div key={n} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-sky-200 flex items-center justify-center text-sky-700 text-xs font-bold">{n[0]}</div>
                        <span className="text-xs text-slate-600">{n}</span>
                        <span className="ml-auto text-xs text-emerald-500 bg-emerald-50 px-1.5 rounded">active</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-cyan-50 rounded-xl p-3 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-600">Upcoming Holidays</div>
                    {[["Aug 15", "Independence Day"], ["Oct 2", "Gandhi Jayanti"]].map(([d, n]) => (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-600 w-10">{d}</span>
                        <span className="text-xs text-slate-600">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything your HR team needs
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              From attendance tracking to leave management — Glacia handles it all with a beautiful, icy interface.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white/60 backdrop-blur-md border border-sky-100 rounded-2xl p-6 hover:shadow-[0_8px_32px_rgba(14,165,233,0.1)] transition-all hover:-translate-y-0.5"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-r from-sky-500 to-cyan-500 rounded-3xl p-1">
            <div className="bg-white rounded-[22px] px-8 py-12">
              <GlaciaLogo size="lg" className="mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Start managing HR the right way
              </h2>
              <p className="text-slate-500 mb-8">
                Free for up to 5 employees. No credit card required.
              </p>
              <Link to="/signup">
                <Button size="lg">Create Your Company Now</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-sky-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <GlaciaLogo size="sm" />
          <div className="flex gap-6 text-sm text-slate-400">
            <Link to="/pricing" className="hover:text-sky-600 transition-colors">Pricing</Link>
            <Link to="/login" className="hover:text-sky-600 transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-sky-600 transition-colors">Sign Up</Link>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Glacia HRMS · Powered by Supernovae</p>
        </div>
      </footer>
    </div>
  );
}
