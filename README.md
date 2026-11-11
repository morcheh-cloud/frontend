# Morcheh — Frontend

The admin panel of Morcheh: SSH-based server management and monitoring. The backend (Go) lives in `../backend`, and this panel talks to it from the browser.

Built with Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (on Base UI), TanStack Query and nuqs. Every request runs client-side: there is no SSR data and there are no Server Actions.

## Requirements

- Node.js 26. pnpm 12 (`npm install -g pnpm`, since Node 25+ has no corepack).
- The backend running on `:8080`. See `../backend/README.md` and its `CLAUDE.md`. In short, run these in `../backend`: `make up` starts Postgres, Redis, MinIO and the test targets (databases, FTP, WebDAV, DNS), and `make run` starts the backend.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8080
pnpm dev                     # http://localhost:3200
```

- Without `.env.local`, requests go to `:3200` and fail with 404.
- On a fresh database `/login` opens the first-run form, which creates the first admin. If the backend has a `SETUP_TOKEN`, the form asks for it.
- The session is a cookie set by the backend. Nothing is stored in JavaScript.

## Commands

| Command | |
|---|---|
| `pnpm dev` | dev server on `:3200` |
| `pnpm build` | production build with a type check; run it before calling work done (it stops a running `pnpm dev`) |
| `pnpm start` | serves the production build on `:3200` |
| `pnpm lint` | Biome: lint, format and import order; must pass |
| `pnpm lint:fix` | applies Biome's safe fixes and formatting |
| `pnpm gen:api` | regenerates `src/lib/services.ts` from the backend's OpenAPI spec (needs the backend up; another address via `OPENAPI_URL`) |
| `pnpm dlx shadcn@latest add <name>` | adds a shadcn component |

Type-check by hand with `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit -p .`. A stale `tsbuildinfo` can hide errors.

## Talking to the backend

- Use the generated client `api` from `src/lib/api.ts`. It is grouped by OpenAPI tag, for example `api.system.getHealth()`. `apiFetch` is only for endpoints that aren't in the spec yet.
- After a backend API change, run `pnpm gen:api`. Never edit `src/lib/services.ts` by hand.
- Reads use `useQuery` and writes use `useMutation` (TanStack Query). The backend has Swagger UI at `http://localhost:8080/docs`.

## Project layout

```
src/app/(panel)/<section>/   panel pages; components/ = used by that page only, api.ts = its requests
src/app/help/                the help center (/help), outside the panel
src/app/login/               sign-in, first-run setup, registration
src/components/              anything shared (ui/ = shadcn components)
src/hooks/                   shared hooks (useOpen, useIsPhone, usePersistedQuery…)
src/lib/                     api client, formatting, generated services.ts
```

- Every feature ships with its guide in `/help`. Content is in `src/app/help/content/` and is registered in `src/components/help/guides.ts`.
- Colors, type and spacing follow `DESIGN.md` and the tokens in `src/app/globals.css`. Use the token classes and never hex values. The design must work in both light and dark themes.
- On phones the panel behaves like a native app: bottom sheets, ≥44px touch targets, and Back closes layers.
- `CLAUDE.md` holds the detailed conventions and decisions per section.

## Sign-in security (before going live)

- **Behind a reverse proxy, run the backend with `TRUST_PROXY=true`.** Otherwise everyone shows up with the proxy's address: the IP allowlist can't tell people apart, and the sign-in log and new-address alerts show one address for all. Afterwards, Settings › Security › "Your address" must show your real address.
- **Alerts need a channel.** Create one under Alerts › Channels, then tick it on Settings › Security. Without a channel, only the in-panel "Was it you?" question remains.
- **Locked out by the allowlist:** `docker compose exec backend server allowlist off` (on a dev machine: `go run ./cmd/server allowlist off` in `../backend`). **Locked out of every admin account:** `server reset-admin`. Both are covered in `../backend/README.md`.

## Docker

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t morcheh-frontend .
```

- `NEXT_PUBLIC_API_URL` is baked in at build time. It must be the address people's browsers reach the backend at, so rebuild after changing it.
- The image serves the standalone build with `node server.js` on `:3200`.
- The whole stack (Postgres, Redis, backend, panel) is in `../backend/deploy/compose.yml`.
