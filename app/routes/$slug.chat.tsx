import { data, Form, useLoaderData, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/$slug.chat";
import { requireTenantAccess } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import type { Profile, Tenant, ChatbotIntent } from "~/types/app";
import { useState, useRef, useEffect } from "react";

export function meta() {
  return [{ title: "Assistant — Glacia HRMS" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { profile, tenant } = await requireTenantAccess(request, env, slug);
  const { supabase } = createSupabaseServerClient(request, env);

  const { data: intents } = await supabase
    .from("chatbot_intents")
    .select("*")
    .or(`is_global.eq.true,tenant_id.eq.${tenant.id}`)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  return data({ profile, tenant, intents: intents ?? [] });
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { profile, tenant } = await requireTenantAccess(request, env, slug);
  const { supabase } = createSupabaseServerClient(request, env);
  const form = await request.formData();
  const message = String(form.get("message") ?? "").trim().toLowerCase();

  if (!message) return data({ reply: null, error: "Empty message" });

  const { data: intents } = await supabase
    .from("chatbot_intents")
    .select("*")
    .or(`is_global.eq.true,tenant_id.eq.${tenant.id}`)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  let reply = "I'm not sure how to answer that. Try asking about your leave balance, upcoming holidays, or attendance.";

  for (const intent of (intents ?? []) as ChatbotIntent[]) {
    const matched = intent.patterns.some((pattern) =>
      message.includes(pattern.toLowerCase())
    );
    if (!matched) continue;

    if (intent.query_type === "leave_balance") {
      const { data: leaveTypes } = await supabase
        .from("leave_types")
        .select("name, code, days_per_year")
        .eq("tenant_id", tenant.id);
      const list = (leaveTypes ?? [])
        .map((lt) => `${lt.name} (${lt.code}): ${lt.days_per_year} days/year`)
        .join(", ");
      reply = `Your company leave types: ${list || "None configured yet."}`;
    } else if (intent.query_type === "holidays") {
      const { data: holidays } = await supabase
        .from("holidays")
        .select("name, date")
        .eq("tenant_id", tenant.id)
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date")
        .limit(5);
      const list = (holidays ?? [])
        .map((h) => `${h.name} on ${new Date(h.date).toLocaleDateString("en-IN")}`)
        .join("; ");
      reply = `Upcoming holidays: ${list || "None scheduled."}`;
    } else if (intent.query_type === "attendance_today") {
      const today = new Date().toISOString().slice(0, 10);
      const { data: att } = await supabase
        .from("attendance")
        .select("punch_in_at, punch_out_at")
        .eq("tenant_id", tenant.id)
        .eq("user_id", profile.id)
        .eq("date", today)
        .single();
      if (!att) {
        reply = "You haven't punched in today.";
      } else {
        const inTime = att.punch_in_at ? new Date(att.punch_in_at).toLocaleTimeString("en-IN") : "—";
        const outTime = att.punch_out_at ? new Date(att.punch_out_at).toLocaleTimeString("en-IN") : "not yet";
        reply = `Today: Punch in ${inTime}, Punch out ${outTime}.`;
      }
    } else {
      reply = intent.response;
    }
    break;
  }

  return data({ reply, error: null });
}

interface Message {
  from: "user" | "bot";
  text: string;
}

export default function ChatPage() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: `Hello ${profile.full_name.split(" ")[0]}! 👋 I'm the Glacia Assistant. Ask me about leave, holidays, or attendance.`,
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevSubmitting = useRef(false);

  useEffect(() => {
    if (prevSubmitting.current && !isSubmitting && actionData?.reply) {
      setMessages((m) => [...m, { from: "bot", text: actionData.reply! }]);
    }
    prevSubmitting.current = isSubmitting;
  }, [isSubmitting, actionData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!input.trim()) {
      e.preventDefault();
      return;
    }
    setMessages((m) => [...m, { from: "user", text: input }]);
    setInput("");
  };

  return (
    <div className="p-6 lg:p-8 h-full flex flex-col space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Glacia Assistant</h1>
        <p className="text-slate-500 mt-1 text-sm">Ask about leave, attendance, holidays and more</p>
      </div>

      <div
        className="flex-1 flex flex-col bg-white/60 backdrop-blur-md border border-sky-100 rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(14,165,233,0.08)]"
        style={{ minHeight: 480 }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              {msg.from === "bot" && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
                  ❄
                </div>
              )}
              <div
                className={`max-w-xs sm:max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                  msg.from === "user"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-br-sm"
                    : "bg-white border border-sky-100 text-slate-700 rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isSubmitting && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                ❄
              </div>
              <div className="bg-white border border-sky-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-sky-100 p-4">
          <Form method="post" onSubmit={handleSubmit} className="flex gap-3">
            <input
              name="message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about leave, holidays, attendance…"
              autoComplete="off"
              className="flex-1 px-4 py-2.5 rounded-xl border border-sky-200 bg-white/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-400 to-cyan-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-sky-500 hover:to-cyan-600 transition-all"
            >
              Send
            </button>
          </Form>
          <p className="mt-2 text-center text-xs text-slate-300">
            Rule-based assistant — no AI/LLM used
          </p>
        </div>
      </div>
    </div>
  );
}
