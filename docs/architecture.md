# Glacia HRMS Architecture

## Request flow

```
Browser → Cloudflare Worker (workers/app.ts)
       → React Router SSR (app/entry.server.tsx)
       → Route loader/action
       → Domain service / auth guard
       → Supabase (RLS or service role)
```

## Layer conventions

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routes | `app/routes/` | HTTP wiring, page composition, form submission |
| Components | `app/components/` | Presentational UI |
| Actions | `app/lib/actions/` | Intent handler registries (polymorphic dispatch) |
| Services | `app/lib/services/` | Business rules orchestrating repositories |
| Repositories | `app/lib/repositories/` | Supabase data access |
| Auth | `app/lib/auth/` | Session guards, tenant provisioning, invites, passwords |
| Server lib | `app/lib/*.server.ts` | Cross-cutting server utilities (email, attendance, Supabase) |

## Auth and tenant boundaries

- **Session client** (`createSupabaseServerClient`): used in loaders/actions with the user's cookies. Respects RLS.
- **Service client** (`createSupabaseServiceClient`): bypasses RLS for admin operations (tenant creation, invites, password resets). Use only in `app/lib/auth/` and admin flows.
- **Layout guard** (`$slug.tsx` loader): calls `requireTenantAccess` and passes `profile` + `tenant` via outlet context.
- **Child loaders**: use `requireChildLoaderAuth` for lightweight scoping (tenant_id, role) without re-fetching full profile.
- **Actions**: re-authenticate with `requireTenantAccess` or `requireHR` before mutations.

## Module map

```
app/lib/
  auth/
    session.server.ts      # getSession, requireUser, requireProfile
    guards.server.ts       # requireTenantAccess, requireHR, requireSuperAdmin
    tenant.server.ts       # createTenantWithOwner
    company-requests.server.ts
    invites.server.ts
    passwords.server.ts
    helpers.ts             # isSuperAdminEmail, generateTempPassword
  repositories/            # Supabase table access
  services/                # Business logic
  actions/                 # Intent handler registries
  validation/              # FormData and password rules
  email/                   # Transactional email templates
```

## Verification

```bash
npm run cf-typegen   # Regenerate route and Worker types
npm run typecheck    # TypeScript project references
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run check        # Full build + wrangler dry-run
```
