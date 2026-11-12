# Containers (Docker / Podman) — plan

User request 2026-11-12: a section like Portainer and Arcane, with everything they offer.
Nav: Infrastructure › **Containers** (`/containers`), plus a server tab `/servers/[id]/containers`.

## Transport (decision)

No agent on servers. The backend talks the **Docker Engine API** through the server's pooled SSH
connection:

1. `direct-streamlocal` to `/var/run/docker.sock` (`ssh.Client.Dial("unix", …)`) when the login user
   can open the socket (root or in the `docker` group);
2. else an SSH session running `sudo -n docker system dial-stdio` (or `sudo -S` with the stored
   password), its stdin/stdout wrapped as a `net.Conn`;
3. Podman: the same over `/run/podman/podman.sock` (Docker-compatible API) — later phase.

One `http.Client` per server whose `DialContext` opens a new channel per HTTP connection (cheap on
an open SSH connection). Own small client in `internal/docker` (typed structs for the OpenAPI spec,
no moby SDK). Compose has no Engine API, so stacks run `docker compose` over SSH (rootShell).

## Phases

### 1 — Engine, containers, images, volumes, networks (this turn)
- Engine overview per server: reachable / not installed / no permission, version, API, OS, CPUs,
  memory, storage driver, counts, how Morche reaches it.
- Fleet page: every server's containers in one list (parallel, cached), server filter.
- Containers: list (state, image, compose project/service, ports, networks, created, health),
  group by compose project; start / stop / restart / pause / unpause / kill / remove (force,
  volumes) / rename; bulk actions; details (overview, ports, mounts, networks, env (Engineer),
  labels, health, restart policy, resources); logs (tail, since, timestamps, live SSE, download);
  live stats (CPU, memory, network, block I/O); raw inspect.
- Images: list (tags, size, in use by, dangling), pull (job with progress), remove, tag, prune.
- Volumes: list (driver, in use by, size from `/system/df`), create, remove, prune.
- Networks: list (driver, scope, subnet, containers), create, remove, prune, connect/disconnect.
- System: disk usage (`/system/df`), prune everything.
- Levels: Viewer read (no env), Operator start/stop/restart/logs, Engineer everything else.

### 2 — Console + create/edit
- Exec console over WebSocket (sh/bash/ash/custom, user), attach.
- Create container form (image, name, ports, volumes/binds, env, labels, restart, network +
  static IP + aliases, command/entrypoint, workdir, user, resources, capabilities, devices,
  privileged, DNS, hosts, healthcheck, log driver); Duplicate/Edit = recreate with rollback;
  Redeploy (pull + recreate); commit to image.

### 3 — Stacks (compose projects)
- Discover projects by compose labels (working dir), plus Morche's own under `/opt/morcheh/stacks`.
- Editor (YAML + `.env`, CodeMirror), files tree, deploy options (pull policy, force recreate,
  remove orphans), up / down / restart / pull / redeploy / destroy (keep volumes?), live output
  (job), services list, logs per service.
- From Git (token / SSH key, branch, path, poll interval, webhook, pull + redeploy after sync).
- Templates: built-in + custom per workspace, variables form.

### 4 — Updates, registries, security
- Registries (Docker Hub, GHCR, GitLab, ECR, custom) with sealed credentials, used by pull/updates.
- Image update check (digest compare via registry API), Updates tab, update one / all, auto-update
  schedule with exclusions + delay, notifications through alert channels.
- Vulnerability scan with Trivy (per image, severity counts, CVE table, fixable filter, CSV).
- Image build (Dockerfile editor / upload context / Git), push, import/export (tar via storage).
- Volume file browser (FileSource over a helper container), volume backup to a Storage.

### 5 — Fleet and extras
- Events (live list, alert rules on die/oom/unhealthy), container metrics history + alert metrics.
- Podman (pods), Swarm (services, nodes, configs, secrets) if asked.
- Cron job actions: prune, update images, redeploy stack.

## Frontend shape
- `(panel)/containers/`: `api.ts` (`dockerKeys` under `["docker"]`), `layout.tsx` =
  `ContainerActionsProvider`, `containers-view.tsx` (tabs Containers / Images / Volumes / Networks
  (/ Stacks later), server picker, search, state filter in the URL), container page
  `/containers/[server]/[container]` (tabs Overview / Logs / Stats / Inspect (/ Console)).
- Server tab `/servers/[id]/containers` reuses the views with a fixed server.
- Guide `containers` in `/help`.
