# Glacia HRMS

Multi-tenant HR management for growing teams — GPS attendance, leave policy, team directory, and tenant branding. Built with React Router 7 on Cloudflare Workers and Supabase.

## Prerequisites

- Node.js 20+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (included as a dev dependency)
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) API key (for invite and welcome emails)

## Environment variables

Local development uses [Wrangler `.dev.vars`](https://developers.cloudflare.com/workers/configuration/secrets/#local-development-with-secrets). Create `.dev.vars` in the project root:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key

# Resend
RESEND_API_KEY=re_your_resend_api_key

# App
APP_BASE_URL=http://localhost:5173
BILLING_ENABLED=false
```

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_SECRET_KEY` | Supabase secret (service role) key — server only |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `APP_BASE_URL` | Public base URL for links in emails and redirects |
| `BILLING_ENABLED` | Set to `true` when Razorpay billing is live; `false` during beta |

Production secrets are set via Wrangler (`wrangler secret put …`) or the Cloudflare dashboard. Non-secret defaults live in `wrangler.json` under `vars`.

## Database migrations

SQL migrations live in `supabase/migrations/`:

1. `001_initial_schema.sql` — tenants, profiles, attendance, leave, holidays, RLS policies
2. `002_seed_defaults.sql` — default leave types and national holidays
3. `003_storage.sql` — logo upload bucket and policies

Apply with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Or run the migration files manually in the Supabase SQL editor, in order.

## Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`. Tenant routes use `/{slug}/dashboard` (e.g. `/acme/dashboard`).

## Type generation

Regenerate Cloudflare binding types and React Router route types:

```bash
npm run cf-typegen
```

## Build & deploy

```bash
npm run build          # production build
npm run preview        # build + local preview
npm run deploy         # deploy to Cloudflare Workers
npm run check          # typecheck + build + wrangler dry-run
```

Preview deployments:

```bash
npx wrangler versions upload
npx wrangler versions deploy
```

## Bundle analysis

Inspect client bundle composition:

```bash
npm run analyze
```

Opens an interactive treemap (`stats.html`) after build. Client chunks are split into `react`, `leaflet`, and `vendor` via `manualChunks` in `vite.config.ts`.

## Project structure

```
app/
  routes/          # React Router file-based routes
  components/      # Shared UI
  lib/             # Server utilities (auth, Supabase, email, attendance)
workers/app.ts     # Cloudflare Worker entry
supabase/migrations/
wrangler.json      # Worker config and public vars
```

## License

Private — Supernovae.
