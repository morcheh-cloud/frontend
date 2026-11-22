# Automations + API access (tokens, webhooks, CLI) — design

User request 2026-11-22: feature #3 (event-driven automation) and #18 (API tokens, CLI, outgoing webhooks).
Backend = `../backend` (Go), frontend = this repo. Both share one **event bus**.

## 1. Event bus — `backend/internal/events`

```go
type Event struct {
    ID          uuid.UUID       `json:"id"`
    Type        string          `json:"type"`         // "alert.fired", see catalog
    WorkspaceID uuid.UUID       `json:"workspace_id"`
    At          time.Time       `json:"at"`
    Severity    string          `json:"severity"`     // info | warning | critical
    Title       string          `json:"title"`
    Text        string          `json:"text,omitempty"`
    URL         string          `json:"url,omitempty"` // panel link
    Subject     Subject         `json:"subject"`       // {kind: server|monitor|database|cronjob|project|alert-rule|automation, id, name}
    ServerID    *uuid.UUID      `json:"server_id,omitempty"` // the server it happened on, when there is one
    Data        map[string]any  `json:"data,omitempty"`
    // Origin: "automation:<id>" when an automation caused it (loop guard).
    Origin      string          `json:"origin,omitempty"`
}
type Bus struct{...}          // in-memory fan-out, non-blocking (buffered per subscriber, drop + log when full)
func (b *Bus) Publish(e Event) // fills ID/At when empty
func (b *Bus) Subscribe(name string, buf int) (<-chan Event, func())
var Catalog = []Type{{Name, Group, Label, Description, Severity, SubjectKind, ServerScoped bool, Sample Event}}
```

Event catalog (v1; each one emitted where the thing already happens):

| Type | Where | Subject |
|---|---|---|
| `alert.fired`, `alert.resolved` | `alertEngine.send` | target (server/database/cluster), Data: rule_id, rule_name, metric, value, detail, severity |
| `monitor.down`, `monitor.up`, `monitor.degraded` | `uptimeHandler.alertChange` | monitor; ServerID when it runs on a server |
| `server.offline`, `server.online` | server status change (alertEngine.onStatus or server monitor) | server |
| `cronjob.failed`, `cronjob.succeeded` | schedule run end | cronjob |
| `backup.failed`, `backup.succeeded` | database backup run end | database |
| `deploy.failed`, `deploy.succeeded` | docker compose / git deploy job end | project (ServerID) |
| `automation.failed` | automation run end (never triggers automations) | automation |
| `test.ping` | webhook "Send a test" only | — |

A missing workspace = don't publish. Publishing never blocks the caller.

## 2. API tokens (personal access tokens)

- Table `api_tokens`: id, user_id, name, prefix (first 8 chars after `morche_`), hash (auth.HashToken), `read_only` bool, expires_at null, last_used_at, last_used_ip, created_at. Token = `morche_` + 40 random base62 chars, shown once.
- Auth: middleware reads the cookie; when there is none, `Authorization: Bearer morche_…`. A token principal = the token's user (same grants, same blocking/approval rules; expired/revoked = 401). `principal.TokenID` set. `read_only` → only GET/HEAD operations (403 "This token can only read."). Tokens can **never** call: auth/account/session/token operations, sign-in security, grants/admin user writes? (admin writes ok if the user is admin and token not read-only), demo: refused entirely in demo (`demoRefused`). Touch `last_used_at` ≤1/min.
- Requests made with a token: command-log origin source says `API token <name>`.
- Endpoints: `GET/POST /auth/tokens`, `DELETE /auth/tokens/{id}` (own; session policy), admin `GET /admin/users/{id}/tokens`, `DELETE /admin/tokens/{id}`. Max 50 per user. Blocking/deleting a user stops their tokens (authorize already checks status).
- CORS already allows `Authorization`. Bearer requests carry no cookie, so the origin guard isn't needed for them (leave it as is).

## 3. Outgoing webhooks

- Tables `webhooks` (workspace_id, name, url, events text[] (empty = all), secret sealed, enabled, headers sealed (map), created_by, updated_at, last_status, last_delivery_at, failing_since) and `webhook_deliveries` (webhook_id, event_id, event_type, attempt, status pending|delivered|failed, http_status, response (≤4 KB), duration_ms, error, request body, next_try_at, created_at). Keep 30 days / ≤1000 per hook.
- Dispatcher subscribes to the bus; per matching hook POSTs JSON `{"id","type","at","workspace_id","severity","title","text","url","subject","server_id","data"}` with headers `Content-Type: application/json`, `User-Agent: Morche-Webhooks/1`, `X-Morche-Event`, `X-Morche-Delivery`, `X-Morche-Timestamp`, `X-Morche-Signature: sha256=HMAC(secret, ts + "." + body)` (same scheme as notify webhooks). 10 s timeout. Retries: 3 more tries after 30 s, 5 min, 30 min (persisted `next_try_at`, a loop picks them up, survives restarts). Private addresses need admin `allow_internal` like channels.
- Endpoints (workspace Owner): list/create/get/update/delete, `POST /webhooks/{id}/test` (sends `test.ping` now, returns the delivery), `GET /webhooks/{id}/deliveries`, `POST /webhook-deliveries/{id}/redeliver`, `POST /webhooks/{id}/secret` (rotate, returns once). `GET /events/catalog` (active) = event types for pickers.

## 4. Automations

- Tables `automations` (workspace_id, name, description, enabled, trigger jsonb, actions jsonb, cooldown_seconds (default 300), max_runs_per_hour (default 20), hook_token hash null, updated_by (= run as), created_by, created_at, updated_at, last_run_at, last_status, problem text) and `automation_runs` (automation_id, workspace_id, trigger_kind event|webhook|manual|test, event jsonb, status running|succeeded|failed|skipped|canceled, steps jsonb (per action: kind, label, status, started_at, finished_at, output ≤16 KB, error, link {kind,id}), reason (why skipped), job_id, started_at, finished_at, started_by).
- Trigger: `{kind: "event"|"webhook"|"manual", events: [types], filter: {servers: [ids], tags: [..], severity: [..], subjects: [ids], match: "text contained in title"}}`. `webhook` = incoming URL `POST /automation-hooks/{token}` (public, token compared by hash, JSON body becomes `event.data`, rate limited 30/min). Every automation can also be run by hand (Operator).
- Actions (ordered, ≤10, each with optional `continue_on_error`):
  - `notify`: channel_ids, title, text (templates)
  - `webhook`: url, method POST|PUT|GET, headers, body (template; default = the event JSON)
  - `script`: script_id or inline `command` (+ interpreter, as_root), `on`: `event` (the event's server) or server ids; waits for the script-run and reports per-server output
  - `service`: unit, action restart|start|stop|reload, `on` as above
  - `cronjob`: schedule_id → Run now, waits for it
  - `check`: re-check the event's server / monitor
  - `wait`: seconds (1–3600)
- Templates: `{{event.title}}`, `{{event.text}}`, `{{event.type}}`, `{{event.severity}}`, `{{event.url}}`, `{{subject.name}}`, `{{subject.id}}`, `{{server.name}}`, `{{server.host}}`, `{{data.<key>}}` — plain substitution, unknown = empty; in shell commands the values are passed as env vars `MORCHE_EVENT_*` (never spliced into the command).
- Safety: events with `Origin` from an automation never trigger automations; cooldown per (automation, subject); max runs per hour → `skipped` run with reason; runs as `updated_by` with access re-checked at run time (like cron jobs: inactive user / lost access → `problem`, nothing runs); actions that execute commands need Engineer on the target at save and run time. A run = job kind `automation-run`. `POST /automations/{id}/test` runs with a sample event of its first event type, `dry_run` = say what would happen without doing it.
- Levels: workspace Viewer read, Operator run now/cancel, Engineer create/edit/delete/hook URL.
- Endpoints: list/create/get/update/delete, enable/disable (in update), `POST /automations/{id}/run` (body: optional event), `POST /automations/{id}/test` (dry_run), `POST /automations/{id}/hook` (new incoming URL, returned once; DELETE removes), `GET /automations/{id}/runs`, `GET /automation-runs/{id}`, `POST /automation-runs/{id}/cancel`, `GET /automation-runs` (workspace, all automations).

## 5. CLI — `backend/cmd/morche`

Go binary, no new deps beyond stdlib (+ existing). Config `~/.config/morche/config.json` (0600) or env `MORCHE_URL`/`MORCHE_TOKEN`. Commands: `login` (asks URL + token, checks `/auth/me`), `logout`, `whoami`, `servers` (`list [-q]`, `check <name|id>`), `jobs` (`list`, `watch <id>`), `run <script-name|id> --on <server>[,…]` (+ `--wait`), `cronjobs` (`list`, `run <id>`), `automations` (`list`, `run <id>`), `api <METHOD> <path> [-d json|@file]` (raw, like `gh api`), `--json` output on every list, `--workspace`. `make cli` builds `bin/morche`.

## 6. Frontend

- `/account#api-tokens` (`src/components/tokens/`): list, New token dialog (name, Read only, expires 30/90/365 days/never) → shows the token once with copy + curl example; revoke. Member details (admin): tokens + revoke. Hidden in the demo.
- Automation nav group gets `Automations` (`/automations`, children: Automations / Runs / Webhooks at `/automations/webhooks`).
  - `/automations`: cards (trigger → steps as a flow strip, last 10 runs strip, enabled switch), templates gallery when empty + "Start from a template".
  - `/automations/new?template=` + `/automations/[id]/edit` = `EditorPage`: When (trigger tiles, event picker grouped by catalog group, filters), Do (sortable steps with per-kind fields, template variable chips), Safety (cooldown, max/hour), Test (sample event, dry run result), aside summary "In plain words".
  - `/automations/[id]`: hero + tabs Runs / Settings / Incoming URL; run in `?run=` → run layer with steps + outputs.
  - `/automations/runs`: all runs.
  - `/automations/webhooks` (+ `/new`, `/[id]`): list with health, editor (URL, events, headers, secret rotate), deliveries with request/response, Redeliver, Send a test, verify-signature code samples.
- Guides: `automations` (with templates, variables, safety, troubleshooting) and `api` (tokens, curl, CLI, webhooks + signature verification in Node/Python/Go, event catalog).
