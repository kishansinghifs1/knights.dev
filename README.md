# Knight.dev – Design Documentation

This document describes the architecture and design of Knight.dev, including authentication, sandboxing, background jobs, API layer, UI system, and database schema. It also outlines key request flows and configuration.

## Tech Overview

- **Framework**: Next.js 15 (App Router)
- **Auth**: Clerk
- **API**: tRPC (server via fetch adapter, React Query client)
- **Background Jobs / Events**: Inngest (Next.js handler)
- **Sandboxing**: E2B sandboxes for running code and commands
- **UI**: Shadcn UI + Tailwind CSS
- **DB**: PostgreSQL with Prisma ORM

## High-Level Architecture

- UI routes under `src/app` render client components, connect via `tRPC` to server procedures.
- Clerk wraps the app to provide authentication context; `src/middleware.ts` protects non-public routes.
- Server-side logic is encapsulated in `tRPC` routers (`src/trpc/routers/_app.ts`) with protected procedures enforced by Clerk auth in `src/trpc/init.ts`.
- User requests trigger domain procedures (e.g., create project), which may enqueue an Inngest event.
- Inngest function (`knightFunction`) provisions/uses an E2B sandbox to run commands, create/update files, and persists outputs via Prisma.
- Prisma models store `Project`, `Message`, `Fragment`, and `Usage` data in Postgres.

```
[Next.js App] --tRPC--> [Procedures] --Prisma--> [Postgres]
       |                                   |
       +--Clerk (auth)---------------------+
       |
       +--(enqueue)--> [Inngest] --> [E2B Sandbox] --> (results) --> [Prisma]
```

## Authentication (Clerk)

- Provider: `src/app/layout.tsx` wraps app with `ClerkProvider`.
- Public/protected routing: `src/middleware.ts` uses `clerkMiddleware` and `createRouteMatcher` to protect non-public routes. Public: `/`, `/sign-in`, `/sign-up`, `/api/inngest`, `/projects(.*)`, `/pricing(.*)`.
- Sign-in/up pages: `src/app/(home)/sign-in/[[...sign-in]]/page.tsx`, `src/app/(home)/sign-up/[[...sign-up]]/page.tsx` using `@clerk/nextjs` components with theme adapted to current theme.
- Navbar integration: `src/modules/home/ui/components/navbar.tsx` uses `SignedIn`, `SignedOut`, `SignInButton`, `SignUpButton`, and renders `UserControl` when authenticated.
- tRPC auth: `src/trpc/init.ts` imports Clerk context to enforce `protectedProcedure` via middleware (`UNAUTHORIZED` if no `ctx.auth.userId`).

Environment:
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Sandboxes (E2B)

- Template config: `sandbox-templates/nextjs/e2b.toml`, Dockerfile, and `compile_page.sh` define a Next.js + Shadcn template for rapid boot.
- Inngest `knightFunction` creates a sandbox from template `knights-nextjs-test3` and connects via `@e2b/code-interpreter`.
- Utility: `src/inngest/utils.ts#getSandbox` connects by `sandboxId` and sets generous timeouts. Used to run terminal commands and file ops within the sandbox.

## Inngest (Background Jobs / Events)

- Client: `src/inngest/client.ts` (`id: "knight.dev"`).
- API handler: `src/app/api/inngest/route.ts` exposes Next.js route via `serve({ client, functions: [knightFunction] })` for GET/POST/PUT.
- Function: `src/inngest/functions.ts` listens to event `knight/run`:
  - Fetches last messages for context via Prisma.
  - Creates state and an AI agent with a prompt (`src/prompt/prompt.ts`), model `gemini-2.5-flash`.
  - Provides tools, notably `Terminal` to run commands in the sandbox, and a file write tool, then persists results.
- Triggering: `src/modules/projects/server/procedures.ts` sends the event after creating a project.

Note: Current setup is event-driven (no explicit cron). Cron can be added by scheduling Inngest functions if needed in future.

Environment:
- `INNGEST_EVENT_KEY` / project env as required by Inngest (and framework defaults)
- `GEMINI_API_KEY` for model
- `E2B_API_KEY` for sandbox client (if used by runtime/SDK)

## tRPC API

- Router composition: `src/trpc/routers/_app.ts` combines `messages`, `projects`, and `usage` routers.
- Server adapter: `src/app/api/trpc/[trpc]/route.ts` via `@trpc/server/adapters/fetch`.
- Context/middleware: `src/trpc/init.ts` sets `superjson` transformer and `protectedProcedure` using Clerk auth.
- Server utilities: `src/trpc/server.tsx` exposes `trpc` proxy and `caller` for server-only usage.
- Client: `src/trpc/client.tsx` sets up React Query + SSR-safe client provider `TRPCReactProvider` wrapped in `src/app/layout.tsx`.

Key procedures (examples):
- `projects.create` creates a project, consumes credits via `src/lib/usage.ts`, persists initial user message, and enqueues `knight/run`.
- `projects.getOne`/list fetch user projects with auth.
- `messages.*` and `usage.*` provide message persistence and credit usage tracking.

## UI System (Shadcn UI + Tailwind)

- Components live under `src/components/ui/*` and are consumed across modules.
- Global theming: `src/app/layout.tsx` wraps with a `ThemeProvider` and includes `Toaster` for notifications; `useCurrentTheme` hook influences Clerk components.
- Example usage: `Navbar` uses `Button`, authenticated Clerk buttons, and `UserControl`.

### Hint Component

- `src/components/hint.tsx` wraps Shadcn `Tooltip` to provide a simple `Hint` API:
  - Props: `children`, `text`, optional `side` (default `top`), and `align`.
  - Usage: Wrap the target element to show a tooltip with provided text.

## Database (Postgres + Prisma)

- Prisma client: generated to `src/generated/prisma`; instantiated in `src/lib/db.ts` with global reuse in dev.
- Schema: `prisma/schema.prisma`
  - `Project`: user-scoped container with `messages` relation
  - `Message`: content with `role` (USER|ASSISTANT), `type` (RESULT|ERROR), belongs to `Project`
  - `Fragment`: one-to-one with `Message`, stores `sandboxUrl`, `title`, and `files` (JSON tree)
  - `Usage`: tracks rate/credits (key, points, expiry)
- Migrations are in `prisma/migrations/*`.

Environment:
- `DATABASE_URL` (Postgres connection string)

## Key Flows

1) Create Project (and trigger agent)
- User submits a prompt in `MessageForm` → `projects.create` (protected)
- `consumeCredits()` validates usage → `prisma.project.create()` with initial message
- Event `knight/run` is sent to Inngest → `knightFunction` runs agent in E2B sandbox
- Outputs (messages/fragments/files) are persisted and rendered in project view

2) Authentication
- Public pages are accessible; protected routes invoke `auth.protect()` via middleware
- UI reacts using `SignedIn`/`SignedOut` and Clerk components

3) Tooling inside Inngest function
- Terminal tool runs commands inside sandbox and streams stdout/stderr
- File tool creates/updates files in sandbox; results summarize back to messages/fragments

## Local Development

1. Install dependencies
    ```bash
    npm install
    ```

2. Environment variables (example `.env.local`)
    ```bash
    DATABASE_URL="postgresql://user:pass@localhost:5432/knight"
    CLERK_PUBLISHABLE_KEY=pk_...
    CLERK_SECRET_KEY=sk_...
    GEMINI_API_KEY=...
    E2B_API_KEY=...
    ```

3. Database
    ```bash
    npx prisma migrate dev
    npx prisma generate
    ```

4. Run app
    ```bash
    npm run dev
    ```

## Notable Paths

- Auth: `src/app/layout.tsx`, `src/middleware.ts`, `src/app/(home)/sign-in/*`, `src/app/(home)/sign-up/*`, `src/modules/home/ui/components/navbar.tsx`
- Inngest: `src/app/api/inngest/route.ts`, `src/inngest/client.ts`, `src/inngest/functions.ts`, `src/inngest/utils.ts`
- Sandboxes: `sandbox-templates/nextjs/*`
- tRPC: `src/app/api/trpc/[trpc]/route.ts`, `src/trpc/*`, routers under `src/modules/*/server/procedures.ts`
- UI: `src/components/ui/*`, `src/components/hint.tsx`, module components under `src/modules/*/ui` 
- DB: `prisma/schema.prisma`, `src/lib/db.ts`, migrations under `prisma/migrations/*`

## Future Enhancements

- Add Inngest schedules for periodic maintenance (credits reset, cleanup)
- Improve sandbox lifecycle management (timeouts, teardown)
- Expand usage metering and pricing integrations

## Frontend Tree

```text
src/
  app/
    (home)/
      layout.tsx
      page.tsx
      pricing/
        page.tsx
      sign-in/[[...sign-in]]/
        page.tsx
      sign-up/[[...sign-up]]/
        page.tsx
    projects/[projectId]/
      page.tsx
    api/
      trpc/[trpc]/route.ts       (tRPC fetch adapter endpoint)
      inngest/route.ts           (Inngest handler)
    error.tsx
    globals.css
    layout.tsx                    (Root layout: Clerk, tRPC provider, ThemeProvider)

  components/
    hint.tsx                      (Tooltip wrapper)
    file-explorer.tsx
    tree-view.tsx
    code-view/
      index.tsx
      code-theme.css
    ui/                           (Shadcn UI components)
      button.tsx, input.tsx, dialog.tsx, ...

  modules/
    home/
      ui/components/
        navbar.tsx
        project-form.tsx
        project-list.tsx
    projects/
      ui/components/
        fragment-web.tsx
        message-card.tsx
        message-container.tsx
        message-form.tsx
        message-loading.tsx
        project-header.tsx
        usage.tsx
      ui/views/
        project-view.tsx

  hooks/
    use-current-theme.ts
    use-mobile.ts
    use-scroll.ts

  types/
    prismjs-components.d.ts
  types.ts
```

## Routes Tree

```text
src/app/
  (home)/
    page.tsx                   → GET /                 (public)
    pricing/page.tsx           → GET /pricing          (public)
    sign-in/[[...sign-in]]/    → ALL /sign-in          (public)
      page.tsx
    sign-up/[[...sign-up]]/    → ALL /sign-up          (public)
      page.tsx
  projects/[projectId]/        → GET /projects/:id     (public per middleware)
    page.tsx
  api/
    trpc/[trpc]/route.ts       → /api/trpc             (server adapter)
    inngest/route.ts           → /api/inngest          (public)
  error.tsx                    → error boundary
  layout.tsx                   → root layout (Clerk, tRPC provider, ThemeProvider)

Middleware:
  src/middleware.ts            → protects non-public routes using Clerk
  Public matchers: '/', '/sign-in(.*)', '/sign-up(.*)', '/api/inngest(.*)', '/projects(.*)', '/pricing(.*)'
```

## Frontend Interactions

```text
[Navbar]
  ├─ Uses Clerk: SignedIn / SignedOut
  └─ Shows SignIn/SignUp buttons or UserControl

[Home Page]
  └─ Links to create/view projects

[Project View]
  ├─ <MessageForm>
  │    └─ tRPC: projects.create (protected)
  │         ├─ consumeCredits() (usage)
  │         ├─ prisma.project.create(..., messages: [USER])
  │         └─ inngest.send('knight/run', { projectId, value })
  ├─ <MessageContainer>
  │    └─ Renders messages (USER/ASSISTANT) via tRPC queries
  └─ <FragmentPreview> / <FileExplorer>
       └─ Shows files and outputs returned by Inngest agent

[tRPC Client Provider]
  └─ Wraps the app in root layout; enables hooks in UI components

[ThemeProvider + Toaster]
  └─ Global UI state, notifications, and theming
```

## Environment Variables (.env.example)

```env
# --- Core App ---
# Base URL of your app (optional, used by some services)
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- Database (PostgreSQL) ---
# Example: postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/knight?schema=public"

# --- Clerk Authentication ---
# Public key is safe to expose to the browser
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXX"
# Secret key must stay on server only
CLERK_SECRET_KEY="sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Optional Clerk routes (uncomment to override defaults)
# NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
# NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
# NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
# NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

# --- Inngest ---
# If using Inngest Cloud or authenticated event delivery
# INNGEST_EVENT_KEY=""
# INNGEST_APP_ID="knight.dev"

# --- E2B Sandbox ---
# Needed to create/connect sandboxes via SDK
E2B_API_KEY="e2b_XXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# --- AI Model (Gemini) ---
GEMINI_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# --- Node / Runtime ---
# Set by scripts or environment; included here for completeness
# NODE_ENV="development"
```

## Screenshots

Add the following image files into `public/docs/` to render these screenshots in the README. Filenames are suggestions; you can replace them with your own but keep the markdown paths consistent or update them here.

- Authentication (Clerk sign-in)

![Clerk Sign In](public/docs/clerk-sign-in.png)

- Signed-in Home with User Menu

![Home Signed In](public/docs/home-signed-in.png)

- Builder: Video Homepage Example (Sidebar + Grid)

![Chat Builder](public/docs/chat.png)

-Builder: Generated Code

![Code Preview](public/docs/generated-code.png)

- Landing Page with Animations (Preview)

![Animated Landing Page](public/docs/landing-animated.png)

If images do not display on platforms that strip relative paths, consider using absolute raw URLs (e.g., GitHub raw links) once the images are pushed to the repository.
