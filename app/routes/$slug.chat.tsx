import { data, Form, useOutletContext, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/$slug.chat";
import { requireTenantAccess, requireChildLoaderAuth } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import type { ChatbotIntent } from "~/types/app";
import type { TenantOutletContext } from "./$slug";
import { useState, useRef, useEffect } from "react";
import { todayIST } from "~/lib/dates";

export function meta() {
  return [{ title: "Assistant — Glacia HRMS" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  // Auth guard only — profile/tenant come from outlet context; intents only
  // needed in action when a message is submitted.
  await requireChildLoaderAuth(request, context.cloudflare.env);
  return data({});
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
        .gte("date", todayIST())
        .order("date")
        .limit(5);
      const list = (holidays ?? [])
        .map((h) => `${h.name} on ${new Date(h.date).toLocaleDateString("en-IN")}`)
        .join("; ");
      reply = `Upcoming holidays: ${list || "None scheduled."}`;
    } else if (intent.query_type === "attendance_today") {
      const today = todayIST();
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
  const { profile } = useOutletContext<TenantOutletContext>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: `Hello ${profile.full_name.split(" ")[0]}. I'm the Glacia Assistant. Ask me about leave, holidays, or attendance.`,
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
    <div className="p-5 lg:p-7 h-full flex flex-col space-y-4 max-w-2xl">
      <div>
        <p className="eyebrow mb-2">ASSISTANT</p>
        <h1 className="display text-3xl text-ink">Glacia Assistant</h1>
      </div>

      <div className="bevel hard-shadow flex-1 flex flex-col overflow-hidden" style={{ minHeight: 480 }}>
        {/* Title strip */}
        <div className="panel-header flex items-center gap-2 px-4 py-2">
          <span className="chip chip-accent">BOT</span>
          <span className="eyebrow">RULE-BASED · NO LLM</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              {msg.from === "bot" && (
                <div className="bevel-accent w-7 h-7 flex items-center justify-center text-[10px] font-mono font-bold mr-2 flex-shrink-0 mt-1 !shadow-none">AI</div>
              )}
              <div
                className={`max-w-xs sm:max-w-sm px-3.5 py-2.5 text-sm border-2 border-rule ${
                  msg.from === "user"
                    ? "bevel-accent !shadow-none"
                    : "bg-surface text-ink"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isSubmitting && (
            <div className="flex justify-start">
              <div className="bevel-accent w-7 h-7 flex items-center justify-center text-[10px] font-mono font-bold mr-2 flex-shrink-0 !shadow-none">AI</div>
              <div className="bg-surface border-2 border-rule px-3.5 py-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t-2 border-rule p-3">
          <Form method="post" onSubmit={handleSubmit} className="flex gap-2">
            <input
              name="message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about leave, holidays, attendance…"
              autoComplete="off"
              className="bevel-sunken flex-1 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSubmitting}
              className="bevel-accent bevel-press px-5 py-2.5 font-mono font-bold uppercase tracking-[0.08em] text-xs disabled:opacity-45"
            >
              Send
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}
