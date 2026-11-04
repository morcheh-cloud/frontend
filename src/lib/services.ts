/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface AddCronJobRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  job: CronJobInput;
  /**
   * @minLength 1
   * @maxLength 300
   */
  table: string;
}

export interface AffectedOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * How many servers changed
   * @format int64
   */
  affected: number;
}

export interface AnsibleHost {
  host: string;
  /** What it's called in the playbook's output */
  inventory_name: string;
  name: string;
  /** @format uuid */
  server_id: string;
}

export interface AnsibleOptions {
  /** Dry run: report what would change */
  check?: boolean;
  /** Show the changes made to files */
  diff?: boolean;
  /**
   * Extra variables (YAML mapping). Kept with the run and shown to whoever can read it
   * @maxLength 262144
   */
  extra_vars?: string;
  /**
   * Hosts worked on at once (default 5)
   * @format int64
   * @min 1
   * @max 100
   */
  forks?: number;
  /**
   * Narrow the hosts further (Ansible host pattern)
   * @maxLength 500
   */
  limit?: string;
  skip_tags?: string[];
  /** Only tasks with these tags */
  tags?: string[];
  /**
   * @format int64
   * @min 0
   * @max 4
   */
  verbosity?: number;
}

export interface AnsibleOutputChunk {
  /**
   * Bytes printed before it
   * @format int64
   */
  offset: number;
  text: string;
}

export interface AnsibleRun {
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  error: string;
  /** @format int32 */
  exit_code?: number;
  /** @format date-time */
  finished_at?: string;
  hosts: AnsibleHost[];
  /** @format uuid */
  id: string;
  /** @format uuid */
  job_id?: string;
  options: AnsibleOptions;
  /** @format uuid */
  playbook_id?: string;
  playbook_name: string;
  /** By inventory host name */
  recap: Record<string, HostStats>;
  /** @format date-time */
  started_at?: string;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted";
  /** @format uuid */
  workspace_id: string;
}

export interface AnsibleRunDetail {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** The playbook as it ran */
  content: string;
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  error: string;
  /** @format int32 */
  exit_code?: number;
  /** @format date-time */
  finished_at?: string;
  hosts: AnsibleHost[];
  /** @format uuid */
  id: string;
  /** @format uuid */
  job_id?: string;
  options: AnsibleOptions;
  /** What ansible-playbook printed, ANSI colors included */
  output: string;
  /**
   * Bytes printed so far; output events continue from here
   * @format int64
   */
  output_offset: number;
  /** The middle was too long and was dropped */
  output_truncated: boolean;
  /** @format uuid */
  playbook_id?: string;
  playbook_name: string;
  plays: RunPlay[];
  /** By inventory host name */
  recap: Record<string, HostStats>;
  selection: AnsibleSelection;
  /** @format date-time */
  started_at?: string;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted";
  /** @format uuid */
  workspace_id: string;
}

export interface AnsibleSelection {
  /** Every server in the workspace */
  all?: boolean;
  /** Servers in these folders and their subfolders */
  folder_ids?: string[];
  server_ids?: string[];
  /** Servers with any of these tags */
  tags?: string[];
}

export interface AnsibleStatus {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** This person can start a run here (they still need Owner on every server) */
  can_run: boolean;
  installed: boolean;
  /** Why they can't */
  problem: string;
  /** Playbooks run in a bubblewrap sandbox on the Morcheh host */
  sandbox: boolean;
  /** ansible-core version */
  version: string;
}

export interface App {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Empty below Operator. */
  accounts: AppAccount[];
  address: string;
  /** @format uuid */
  category_id?: string;
  color: string;
  /** @format date-time */
  created_at: string;
  critical: boolean;
  /** @format uuid */
  id: string;
  logo_icon: string;
  logo_kind: "auto" | "upload" | "icon";
  /** Where to load the logo from; missing = draw the first letter or the icon. */
  logo_url?: string;
  name: string;
  note: string;
  /** @format int32 */
  position: number;
  /** @format date-time */
  updated_at: string;
  /** @format uuid */
  workspace_id: string;
}

export interface AppAccount {
  has_password: boolean;
  /** @format uuid */
  id: string;
  label: string;
  username: string;
}

export interface AppAccountInput {
  /** An existing account of this service. */
  id?: string;
  /** @maxLength 64 */
  label?: string;
  /**
   * Empty keeps the saved one.
   * @maxLength 4096
   */
  password?: string;
  remove_password?: boolean;
  /** @maxLength 255 */
  username?: string;
}

export interface AppActivityOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: AppSecretView[];
}

export interface AppCategory {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  color: string;
  /** @format uuid */
  id: string;
  name: string;
  /** @format int32 */
  position: number;
  /** @format uuid */
  workspace_id: string;
}

export interface AppCreateBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxItems 20 */
  accounts?: AppAccountInput[];
  /**
   * http(s) URL; https:// is added when there's no scheme.
   * @maxLength 2048
   */
  address: string;
  /** A category in the same workspace; empty = none. */
  category_id?: string;
  /** @default "slate" */
  color?:
    | "slate"
    | "red"
    | "orange"
    | "amber"
    | "green"
    | "teal"
    | "blue"
    | "indigo"
    | "violet"
    | "pink";
  critical?: boolean;
  /**
   * @maxLength 40
   * @pattern ^[a-z0-9-]*$
   */
  logo_icon?: string;
  /** @default "auto" */
  logo_kind?: "auto" | "icon";
  /**
   * @minLength 1
   * @maxLength 128
   */
  name: string;
  /** @maxLength 4000 */
  note?: string;
}

export interface AppLayoutBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Category order. */
  categories: string[];
  groups: AppLayoutGroup[];
}

export interface AppLayoutGroup {
  /** In order. Services of other workspaces or already removed are skipped. */
  app_ids: string[];
  /** null = uncategorized. */
  category_id?: string | null;
}

export interface AppList {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** The categories this person may see or place services in, empty ones included when they can. */
  categories: AppCategory[];
  items: App[];
}

export interface AppSecretOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  password: string;
  username: string;
}

export interface AppSecretView {
  /** As it was then; kept after the account is removed. */
  account_label: string;
  /** @format date-time */
  created_at: string;
  /** @format uuid */
  id: string;
  ip: string;
  user_name: string;
}

export interface AppUpdateBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * The whole list, in order.
   * @maxItems 20
   */
  accounts?: AppAccountInput[];
  /** @maxLength 2048 */
  address?: string;
  /** Moving it puts the service at the end of the new category; empty = none. */
  category_id?: string;
  color?:
    | "slate"
    | "red"
    | "orange"
    | "amber"
    | "green"
    | "teal"
    | "blue"
    | "indigo"
    | "violet"
    | "pink";
  critical?: boolean;
  /**
   * @maxLength 40
   * @pattern ^[a-z0-9-]*$
   */
  logo_icon?: string;
  /** auto drops an uploaded logo; upload needs one. */
  logo_kind?: "auto" | "upload" | "icon";
  /**
   * @minLength 1
   * @maxLength 128
   */
  name?: string;
  /** @maxLength 4000 */
  note?: string;
}

export interface AuthLoginBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 1024 */
  password: string;
  remember?: boolean;
  /** @maxLength 64 */
  username: string;
}

export interface AuthSetupBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 254 */
  email: string;
  /** @maxLength 64 */
  first_name: string;
  /** @maxLength 128 */
  full_name: string;
  /** @maxLength 1024 */
  password: string;
  /** @maxLength 256 */
  setup_token?: string;
  /** @maxLength 32 */
  username: string;
}

export interface AuthState {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** No user exists yet: show the first-run form. */
  needs_setup: boolean;
  registration_open: boolean;
  setup_token_required: boolean;
}

export interface Ban {
  ip: string;
  /**
   * Ban length; -1 is forever
   * @format int64
   */
  seconds?: number;
  /** Server-local time, as fail2ban prints it */
  since?: string;
  /** Server-local time the ban ends */
  until?: string;
}

export interface BulkMoveServersRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Target folder; leave out or null to take them out of every folder
   * @format uuid
   */
  folder_id?: string | null;
  /**
   * Server ids
   * @maxItems 500
   * @minItems 1
   */
  ids: string[];
}

export interface BulkTagServersRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxItems 20 */
  add?: string[];
  /**
   * Server ids
   * @maxItems 500
   * @minItems 1
   */
  ids: string[];
  /** @maxItems 20 */
  remove?: string[];
}

export interface CPU {
  /** @format double */
  load1: number;
  /** @format double */
  load15: number;
  /** @format double */
  load5: number;
  /** @format int64 */
  cores: number;
  /**
   * Time spent waiting on disk
   * @format double
   */
  iowait_percent: number;
  /**
   * Time the hypervisor gave to other VMs
   * @format double
   */
  steal_percent: number;
  /**
   * Busy share of all cores over the last second
   * @format double
   */
  usage_percent: number;
}

export interface ChangePasswordBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 1024 */
  current_password: string;
  /** @maxLength 1024 */
  new_password: string;
}

export interface ChmodFilesRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @pattern ^[0-7]{3,4}$ */
  mode: string;
  /**
   * @maxItems 1000
   * @minItems 1
   */
  paths: string[];
  /** Apply to everything inside folders too */
  recursive?: boolean;
}

export interface ChownFilesRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Group name or gid; empty keeps it */
  group?: string;
  /** User name or uid; empty keeps it */
  owner?: string;
  /**
   * @maxItems 1000
   * @minItems 1
   */
  paths: string[];
  recursive?: boolean;
}

export interface ClearJobsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  deleted: number;
}

export interface CompressFilesRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Archive path; default is next to the files */
  destination?: string;
  /** @default "tar.gz" */
  format: "tar.gz" | "zip";
  /**
   * @maxItems 1000
   * @minItems 1
   */
  paths: string[];
}

export interface ConnectionTestBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  auth_method: "password" | "private_key";
  /**
   * IP address or DNS name
   * @minLength 1
   * @maxLength 253
   */
  host: string;
  /**
   * Passphrase of an encrypted private key
   * @maxLength 1024
   */
  passphrase?: string;
  /**
   * For auth_method=password. On update, leave out to keep the stored one
   * @maxLength 1024
   */
  password?: string;
  /**
   * @format int32
   * @min 1
   * @max 65535
   * @default 22
   */
  port?: number;
  /**
   * PEM or OpenSSH private key, for auth_method=private_key. On update, leave out to keep the stored one
   * @maxLength 16384
   */
  private_key?: string;
  /**
   * When editing a saved server: reuse its stored credentials (for fields left out) and its trusted host key
   * @format uuid
   */
  server_id?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  username: string;
}

export interface ConnectionTestOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  host_key_fingerprint: string;
  hostname: string;
  /** @format int32 */
  latency_ms: number;
  message: string;
  os: ServerOS;
  status:
    | "online"
    | "unreachable"
    | "auth_failed"
    | "host_key_mismatch"
    | "error";
}

export interface CreateAppCategoryRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @default "slate" */
  color?:
    | "slate"
    | "red"
    | "orange"
    | "amber"
    | "green"
    | "teal"
    | "blue"
    | "indigo"
    | "violet"
    | "pink";
  /**
   * @minLength 1
   * @maxLength 64
   */
  name: string;
}

export interface CronEnv {
  name: string;
  value: string;
}

export interface CronHistory {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  note: string;
  /** Newest first */
  runs: CronRun[];
  /** journal, a log file's path, or empty when no cron log was readable */
  source: string;
}

export interface CronJob {
  command: string;
  /** false when the line is commented out */
  enabled: boolean;
  /**
   * 0-based line in the table's content; with the table's revision it identifies the job
   * @format int64
   */
  line: number;
  /** The comment line right above the job, if any */
  name: string;
  /** Five fields, or a nickname like @daily or @reboot */
  schedule: string;
  /** Who it runs as */
  user: string;
}

export interface CronJobInput {
  /**
   * @minLength 1
   * @maxLength 4000
   */
  command: string;
  enabled: boolean;
  /**
   * Saved as a comment above the job
   * @maxLength 200
   */
  name?: string;
  /**
   * @minLength 1
   * @maxLength 200
   */
  schedule: string;
  /**
   * Required in system tables; ignored in user crontabs
   * @maxLength 32
   */
  user?: string;
}

export interface CronOverview {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** root and sudo can see and change every user's crontab; user only its own */
  access: "root" | "sudo" | "user";
  /** The cron daemon running; empty when none is */
  daemon: string;
  login_user: string;
  /** Run by run-parts or periodic, e.g. /etc/cron.daily */
  scripts: CronScript[];
  /** @format date-time */
  server_time: string;
  tables: CronTable[];
  timers: CronTimer[];
  /** IANA name, when the server reports one */
  timezone: string;
  /** Accounts that can own a crontab */
  users: CronUser[];
  utc_offset: string;
  warnings: string[];
}

export interface CronRun {
  command: string;
  /** @format date-time */
  time: string;
  user: string;
}

export interface CronRunBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @minLength 1
   * @maxLength 4000
   */
  command: string;
  /**
   * Use this table's variables (PATH, SHELL…), as cron would
   * @maxLength 300
   */
  table?: string;
  /**
   * Seconds
   * @format int64
   * @min 1
   * @max 600
   * @default 60
   */
  timeout?: number;
  /**
   * Run as this user; default the login user
   * @maxLength 32
   */
  user?: string;
}

export interface CronRunResult {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  duration_ms: number;
  /**
   * -1 when it was stopped
   * @format int64
   */
  exit_code: number;
  /** stdout and stderr together */
  output: string;
  /** @format date-time */
  started_at: string;
  timed_out: boolean;
  truncated: boolean;
}

export interface CronScript {
  path: string;
  /** hourly, daily, weekly, monthly, 15min… */
  period: string;
}

export interface CronTable {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  content: string;
  editable: boolean;
  env: CronEnv[];
  /** user:<name> for a user's crontab, file:<path> for a system one */
  id: string;
  jobs: CronJob[];
  /** System tables name the user on every line */
  kind: "user" | "system";
  path: string;
  /** Send it back when changing the table, to detect edits made meanwhile */
  revision: string;
  /** Owner of a user crontab; empty for system files */
  user: string;
}

export interface CronTimer {
  /** The timer is armed */
  active: boolean;
  description: string;
  /** The unit file state: enabled, disabled, static… */
  enabled: string;
  /** @format int64 */
  exit_status: number;
  /** @format date-time */
  last?: string;
  /** @format date-time */
  next?: string;
  /** How the service's last run ended: success, exit-code, timeout… */
  result: string;
  /** Its service is running right now */
  running: boolean;
  /** OnCalendar= and monotonic settings, as systemd reports them */
  schedule: string[];
  /** What it starts */
  service: string;
  unit: string;
}

export interface CronTimerActionRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action: "run" | "enable" | "disable";
  /**
   * @maxLength 256
   * @pattern ^[A-Za-z0-9:_.@\\-]+\.timer$
   */
  unit: string;
}

export interface CronUser {
  name: string;
  /** @format int64 */
  uid: number;
}

export interface Database {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  alerts_enabled: boolean;
  allow_internal: boolean;
  /** PEM the certificate is checked against (verify); empty = the system's CAs */
  ca_cert: string;
  checks: DatabaseCheck[];
  /** @format int32 */
  connections: number | null;
  /** Docker container it runs in, on the server */
  container: string;
  /** @format date-time */
  created_at: string;
  /** Database it signs in to */
  dbname: string;
  description: string;
  engine: "postgres" | "mysql" | "mssql" | "redis" | "mongodb";
  favorite: boolean;
  flavor: string;
  has_password: boolean;
  /** The worst check that isn't muted */
  health: "unknown" | "ok" | "warning" | "critical";
  /** As the server sees it (mode server), or its public address */
  host: string;
  /** @format uuid */
  id: string;
  /** @format int32 */
  interval_seconds: number;
  /** @format date-time */
  last_checked_at: string | null;
  /** @format date-time */
  last_online_at: string | null;
  /** @format int32 */
  latency_ms: number | null;
  /** @format int32 */
  max_connections: number | null;
  /** server: reached through one of your servers over SSH; direct: Morcheh connects itself */
  mode: "server" | "direct";
  muted_checks: string[];
  name: string;
  /** Monitoring stopped */
  paused: boolean;
  /** @format int32 */
  port: number;
  /** primary, replica or standalone; empty until known */
  role: string;
  /**
   * The server it's reached through; null when direct, or when that server was removed
   * @format uuid
   */
  server_id: string | null;
  /** @format int64 */
  size_bytes: number | null;
  status:
    | "unknown"
    | "online"
    | "unreachable"
    | "auth_failed"
    | "tls_error"
    | "blocked"
    | "error";
  status_message: string;
  /** Limits changed from the defaults, by check id */
  thresholds: Record<string, DatabaseLimit>;
  tls: "disable" | "require" | "verify";
  /** @format date-time */
  updated_at: string;
  username: string;
  version: string;
  /** @format uuid */
  workspace_id: string;
}

export interface DatabaseActivity {
  app: string;
  /** Who it waits for */
  blocked_by: string[];
  client: string;
  database: string;
  /** What Kill takes: pid, thread id, session id, client id or opid */
  id: string;
  /** Morcheh's own monitoring connection */
  ours?: boolean;
  /** Empty below Engineer access, and when the login can't see it */
  query: string;
  /**
   * How long the current statement has run
   * @format double
   */
  seconds: number | null;
  state: string;
  /**
   * How long its transaction has been open
   * @format double
   */
  tx_seconds: number | null;
  user: string;
  wait?: string;
}

export interface DatabaseBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** direct only: allow private, loopback and link-local addresses. System admins only */
  allow_internal?: boolean;
  /**
   * verify only: PEM of the CA that signed the database's certificate
   * @maxLength 65536
   */
  ca_cert?: string;
  clear_password?: boolean;
  /**
   * mode server: the Docker container it runs in. Disk is then read inside it
   * @maxLength 128
   */
  container?: string;
  /**
   * Database to sign in to (MongoDB: the auth database; Redis: the db number). Empty = the engine's usual one
   * @maxLength 128
   */
  dbname?: string;
  /** @maxLength 500 */
  description?: string;
  engine: "postgres" | "mysql" | "mssql" | "redis" | "mongodb";
  favorite?: boolean;
  /**
   * mode server: as that server sees it (empty = 127.0.0.1, or the container's own address when a container is set). direct: public IP or domain
   * @maxLength 255
   */
  host?: string;
  /**
   * How often it's checked; 0 or left out = 60. At least 15
   * @format int32
   * @min 0
   * @max 3600
   */
  interval_seconds?: number;
  /** server: through one of your servers over SSH (the database may run on it, in Docker on it, or behind it); direct: Morcheh connects to a public address itself */
  mode: "server" | "direct";
  /**
   * @minLength 1
   * @maxLength 64
   */
  name: string;
  /**
   * On update, leave out to keep the stored one
   * @maxLength 1024
   */
  password?: string;
  /**
   * 0 or left out = the engine's default
   * @format int32
   * @min 0
   * @max 65535
   */
  port?: number;
  /**
   * mode server: the server it's reached through
   * @format uuid
   */
  server_id?: string;
  /** require: encrypted, the certificate isn't checked; verify: also checks it (against ca_cert, or the system's CAs). Default: require when direct, disable through a server (SSH already encrypts) */
  tls?: "disable" | "require" | "verify";
  /** @maxLength 128 */
  username?: string;
}

export interface DatabaseCheck {
  /** What to do about it */
  action?: string;
  area:
    | "availability"
    | "capacity"
    | "performance"
    | "replication"
    | "backup"
    | "security";
  id: string;
  level: "ok" | "warning" | "critical" | "unknown";
  /** Left out of health and alerts */
  muted?: boolean;
  pending?: string;
  /** What was found */
  reason: string;
  /** @format date-time */
  since: string | null;
  title: string;
  /**
   * The measured number the limits apply to
   * @format double
   */
  value: number | null;
}

export interface DatabaseCheckInfo {
  about: string;
  area: string;
  id: string;
  /** Default limits; absent = not adjustable */
  limit?: DatabaseLimit;
  /** Lower values are worse */
  lower?: boolean;
  title: string;
  /** ratio (0–1), seconds, hours, ms, count, bytes */
  unit?: string;
}

export interface DatabaseCheckList {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: DatabaseCheckInfo[];
}

export interface DatabaseClient {
  /** @format int32 */
  active: number;
  /** IP, or local socket */
  address: string;
  apps: string[];
  databases: string[];
  /** First showed up in the last day */
  new: boolean;
  /** @format int32 */
  total: number;
  users: string[];
}

export interface DatabaseConnections {
  /**
   * Running something right now
   * @format int32
   */
  active: number;
  /**
   * Waiting on another connection's lock
   * @format int32
   */
  blocked: number;
  /** @format int32 */
  idle: number;
  /**
   * Idle inside an open transaction (holds locks)
   * @format int32
   */
  idle_in_tx: number;
  /**
   * Most the server accepts
   * @format int32
   */
  max: number | null;
  /**
   * Kept back for admins
   * @format int32
   */
  reserved: number;
  /**
   * Client connections, ours included
   * @format int32
   */
  total: number;
}

export interface DatabaseCredentials {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  dbname: string;
  engine: "postgres" | "mysql" | "mssql" | "redis" | "mongodb";
  /** As the server it goes through sees it, when mode is server */
  host: string;
  password: string;
  /** @format int32 */
  port: number;
  tls: "disable" | "require" | "verify";
  username: string;
}

export interface DatabaseDisk {
  /** @format int64 */
  free_bytes: number;
  path: string;
  /** engine: the database reported it; server: df on its server */
  source: "engine" | "server";
  /** @format int64 */
  total_bytes: number;
}

export interface DatabaseEvent {
  /** @format date-time */
  at: string;
  /** The check that changed (kind check) */
  check_id: string;
  detail: string;
  /** @format uuid */
  id: string;
  /** check, version, restart, user, admin, address, setting, backup */
  kind: string;
  severity: "info" | "ok" | "warning" | "critical";
  title: string;
}

export interface DatabaseEventList {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: DatabaseEvent[];
}

export interface DatabaseFact {
  group: string;
  label: string;
  value: string;
}

export interface DatabaseGrowth {
  /**
   * Days until the disk is full at this pace; null when it isn't filling up
   * @format double
   */
  disk_full_days: number | null;
  /** @format double */
  size_bytes_per_day: number | null;
}

export interface DatabaseHistory {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int32 */
  bucket_seconds: number;
  growth: DatabaseGrowth;
  points: DatabaseHistoryPoint[];
  range: "1h" | "6h" | "24h" | "7d" | "30d";
  usual: DatabaseHourAverages;
  yesterday: DatabaseHourAverages;
}

export interface DatabaseHistoryPoint {
  /** @format double */
  active: number | null;
  /** @format date-time */
  at: string;
  /**
   * Peak
   * @format double
   */
  blocked: number | null;
  /** @format double */
  cache_hit: number | null;
  /**
   * Peak
   * @format double
   */
  connections: number | null;
  /**
   * Sum
   * @format double
   */
  deadlocks: number | null;
  /**
   * Lowest
   * @format double
   */
  disk_free_bytes: number | null;
  /** @format double */
  disk_total_bytes: number | null;
  /** @format double */
  latency_ms: number | null;
  /** @format double */
  max_connections: number | null;
  /** @format double */
  memory_bytes: number | null;
  /**
   * Share of looks that got in, 0–1
   * @format double
   */
  online: number | null;
  /** @format double */
  qps: number | null;
  /**
   * Peak, seconds
   * @format double
   */
  replication_lag: number | null;
  /** @format double */
  size_bytes: number | null;
  /** @format double */
  tps: number | null;
}

export interface DatabaseHourAverages {
  /** @format double */
  active: number | null;
  /** @format double */
  connections: number | null;
  /** @format double */
  latency_ms: number | null;
  /** @format double */
  qps: number | null;
  /**
   * 0 = no data to compare with
   * @format int32
   */
  samples: number;
}

export interface DatabaseIDColumn {
  column: string;
  /** @format double */
  current: number;
  database?: string;
  /** @format double */
  max: number;
  /**
   * Current / max
   * @format double
   */
  ratio: number;
  table: string;
  type: string;
}

export interface DatabaseIndex {
  database?: string;
  name: string;
  /** @format int64 */
  size_bytes: number | null;
  table: string;
  /**
   * Updates it cost (SQL Server)
   * @format int64
   */
  writes: number | null;
}

export interface DatabaseInfo {
  /** @format int32 */
  connections: number;
  /**
   * SQL Server: last full backup msdb knows of
   * @format date-time
   */
  last_backup: string | null;
  /** @format int64 */
  log_bytes: number | null;
  /** @format double */
  log_used: number | null;
  /** SQL Server: what keeps the log from being reused */
  log_wait?: string;
  name: string;
  /** SQL Server recovery model */
  recovery?: string;
  /** @format int64 */
  size_bytes: number | null;
  /** SQL Server: ONLINE, RESTORING… */
  state?: string;
  /**
   * Tables, collections or keys
   * @format int64
   */
  tables: number | null;
}

export interface DatabaseLimit {
  /** @format double */
  crit: number;
  /** @format double */
  warn: number;
}

export interface DatabaseList {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Database[];
}

export interface DatabaseLive {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  message: string;
  /** Absent when the database couldn't be reached */
  snapshot?: DatabaseSnapshot;
  status:
    | "online"
    | "unreachable"
    | "auth_failed"
    | "tls_error"
    | "blocked"
    | "error";
}

export interface DatabaseLog {
  held_by?: string;
  kind: string;
  /** @format int64 */
  size_bytes: number | null;
  /**
   * SQL Server: share of the log in use
   * @format double
   */
  used_ratio: number | null;
  /**
   * MongoDB: hours of changes the oplog holds
   * @format double
   */
  window_hours: number | null;
}

export interface DatabaseMemory {
  /**
   * Redis: keys pushed out to make room, since start
   * @format int64
   */
  evicted: number | null;
  /**
   * 0 = no limit set
   * @format int64
   */
  limit_bytes: number;
  /** @format int64 */
  used_bytes: number;
}

export interface DatabaseNote {
  area: string;
  message: string;
}

export interface DatabaseOutboundIP {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Empty when it couldn't be found out */
  ip: string;
}

export interface DatabasePersist {
  aof_enabled: boolean;
  aof_status: string;
  /**
   * Writes since the last snapshot
   * @format int64
   */
  rdb_changes: number;
  /** @format date-time */
  rdb_last_save: string | null;
  /** ok or err */
  rdb_status: string;
  /** The save setting; empty = snapshots off */
  save_schedule: string;
}

export interface DatabasePlan {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format double */
  cost: number | null;
  /** text: the engine's own tree; json: its JSON plan, pretty-printed */
  format: "text" | "json";
  plan: string;
  /** @format double */
  rows: number | null;
  /** What in the plan is usually slow, e.g. a full scan of a big table */
  warnings: string[];
}

export interface DatabaseQuery {
  /**
   * Redis slow log: when it ran
   * @format date-time
   */
  at?: string | null;
  /** @format int64 */
  calls: number;
  database?: string;
  /** @format double */
  mean_ms: number;
  query: string;
  /** @format int64 */
  rows: number | null;
  /** @format double */
  total_ms: number;
}

export interface DatabaseRates {
  /**
   * New deadlocks since the previous look
   * @format int64
   */
  deadlocks: number | null;
  /**
   * Failed sign-ins since the previous look
   * @format int64
   */
  failed_logins: number | null;
  /**
   * Statements (or commands) per second
   * @format double
   */
  queries: number | null;
  /**
   * Rows (or documents) read per second
   * @format double
   */
  reads: number | null;
  /**
   * Time between the two looks
   * @format double
   */
  seconds: number;
  /** @format double */
  transactions: number | null;
  /**
   * Rows written per second
   * @format double
   */
  writes: number | null;
}

export interface DatabaseReplica {
  address: string;
  healthy: boolean;
  /** @format int64 */
  lag_bytes: number | null;
  /** @format double */
  lag_seconds: number | null;
  name: string;
  state: string;
  sync?: string;
}

export interface DatabaseReplication {
  /** Primary: who copies from it. Cluster: every member */
  replicas: DatabaseReplica[];
  /** Replica set or availability group */
  set?: string;
  /** PostgreSQL replication slots */
  slots: DatabaseSlot[];
  /** Replica: where it copies from */
  source?: DatabaseSource;
}

export interface DatabaseSecurity {
  /** @format int32 */
  admins: number | null;
  /** Anyone who reaches the port gets in */
  auth_disabled: boolean;
  /** Our own connection is encrypted */
  encrypted: boolean | null;
  /**
   * Since start
   * @format int64
   */
  failed_logins: number | null;
  /** Addresses it accepts connections on */
  listens_on?: string;
  /**
   * Logins without a password
   * @format int32
   */
  no_password: number | null;
  /**
   * Other connections from the network without TLS
   * @format int32
   */
  plain_clients: number | null;
  /** Settings that open a door, e.g. xp_cmdshell */
  risks: string[];
}

export interface DatabaseSetting {
  name: string;
  value: string;
}

export interface DatabaseSlot {
  active: boolean;
  name: string;
  /**
   * WAL kept for it
   * @format int64
   */
  retained_bytes: number | null;
}

export interface DatabaseSnapshot {
  /**
   * Share of reads served from memory, 0–1
   * @format double
   */
  cache_hit: number | null;
  /** Connections grouped by address */
  clients: DatabaseClient[];
  /** @format date-time */
  collected_at: string;
  connections: DatabaseConnections;
  /** Where the data lives on its server */
  data_dir?: string;
  databases: DatabaseInfo[];
  /** @format date-time */
  details_at: string | null;
  /** The disk holding the data */
  disk?: DatabaseDisk;
  /** SQL Server edition, managed-service hints */
  edition?: string;
  engine: "postgres" | "mysql" | "mssql" | "redis" | "mongodb";
  /** Engine-specific numbers */
  facts: DatabaseFact[];
  /** What it really is: PostgreSQL, MySQL, MariaDB, SQL Server, Redis, Valkey, MongoDB */
  flavor: string;
  /** Auto-increment columns, fullest first */
  id_columns: DatabaseIDColumn[];
  /** Indexes nothing has used since statistics were reset */
  indexes: DatabaseIndex[];
  /**
   * Round trip of a trivial query
   * @format int32
   */
  latency_ms: number;
  /** Write-ahead log, binary log, transaction log or oplog */
  log?: DatabaseLog;
  memory?: DatabaseMemory;
  /** What couldn't be read, and why */
  notes: DatabaseNote[];
  /** Redis: snapshots and the append-only file */
  persistence?: DatabasePersist;
  /** Statements that took the most time in all */
  queries: DatabaseQuery[];
  /** Where Queries came from; empty when nothing could tell */
  queries_source: string;
  /** Per second since the previous look; absent on the first one */
  rates?: DatabaseRates;
  read_only: boolean;
  replication: DatabaseReplication;
  role: "primary" | "replica" | "standalone";
  security: DatabaseSecurity;
  /** Connections that are doing something, holding a transaction or blocked; longest first */
  sessions: DatabaseActivity[];
  /** Settings worth knowing (and watching for changes) */
  settings: DatabaseSetting[];
  /**
   * Everything stored, all databases together
   * @format int64
   */
  size_bytes: number | null;
  /**
   * When the server process started
   * @format date-time
   */
  started_at: string | null;
  /** Largest tables (collections, keys) */
  tables: DatabaseTable[];
  /** Which database Tables covers when it can't be all of them */
  tables_scope?: string;
  users: DatabaseUser[];
  version: string;
  /** What busy connections wait on right now */
  waits: DatabaseWait[];
}

export interface DatabaseSource {
  address: string;
  error?: string;
  /** @format double */
  lag_seconds: number | null;
  /** Receiving and applying changes */
  running: boolean;
}

export interface DatabaseTable {
  database?: string;
  /**
   * PostgreSQL: rows waiting for vacuum
   * @format int64
   */
  dead_rows: number | null;
  /**
   * MySQL: allocated but unused
   * @format int64
   */
  free_bytes: number | null;
  /** @format int64 */
  index_bytes: number | null;
  /** Redis: the key's type */
  kind?: string;
  /** @format date-time */
  last_vacuum: string | null;
  name: string;
  /**
   * Estimated
   * @format int64
   */
  rows: number | null;
  schema?: string;
  /** @format int64 */
  size_bytes: number;
}

export interface DatabaseTest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  flavor?: string;
  message: string;
  status:
    | "online"
    | "unreachable"
    | "auth_failed"
    | "tls_error"
    | "blocked"
    | "error";
  steps: DatabaseTestStep[];
  version?: string;
}

export interface DatabaseTestBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** direct only: allow private, loopback and link-local addresses. System admins only */
  allow_internal?: boolean;
  /**
   * verify only: PEM of the CA that signed the database's certificate
   * @maxLength 65536
   */
  ca_cert?: string;
  clear_password?: boolean;
  /**
   * mode server: the Docker container it runs in. Disk is then read inside it
   * @maxLength 128
   */
  container?: string;
  /**
   * When editing a saved database: reuse its stored password for a field left out
   * @format uuid
   */
  database_id?: string;
  /**
   * Database to sign in to (MongoDB: the auth database; Redis: the db number). Empty = the engine's usual one
   * @maxLength 128
   */
  dbname?: string;
  engine: "postgres" | "mysql" | "mssql" | "redis" | "mongodb";
  /**
   * mode server: as that server sees it (empty = 127.0.0.1, or the container's own address when a container is set). direct: public IP or domain
   * @maxLength 255
   */
  host?: string;
  /** server: through one of your servers over SSH (the database may run on it, in Docker on it, or behind it); direct: Morcheh connects to a public address itself */
  mode: "server" | "direct";
  /**
   * On update, leave out to keep the stored one
   * @maxLength 1024
   */
  password?: string;
  /**
   * 0 or left out = the engine's default
   * @format int32
   * @min 0
   * @max 65535
   */
  port?: number;
  /**
   * mode server: the server it's reached through
   * @format uuid
   */
  server_id?: string;
  /** require: encrypted, the certificate isn't checked; verify: also checks it (against ca_cert, or the system's CAs). Default: require when direct, disable through a server (SSH already encrypts) */
  tls?: "disable" | "require" | "verify";
  /** @maxLength 128 */
  username?: string;
}

export interface DatabaseTestStep {
  id: "dns" | "tcp" | "tls" | "auth" | "permissions";
  message: string;
  /**
   * How long the step took
   * @format int64
   */
  ms: number;
  status: "ok" | "warning" | "failed" | "skipped";
  title: string;
}

export interface DatabaseUser {
  /** Superuser, sysadmin, root-like */
  admin: boolean;
  disabled?: boolean;
  name: string;
  /** Signs in without a password */
  no_password?: boolean;
}

export interface DatabaseWait {
  /** @format int32 */
  count: number;
  event: string;
}

export interface DeleteCronJobsRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @maxItems 1000
   * @minItems 1
   */
  lines: number[];
  /** From the table as last read; a different one answers 409 */
  revision: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  table: string;
}

export interface DirListing {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  entries: FileEntry[];
  /** The login user's home directory */
  home: string;
  /** Empty at / */
  parent: string;
  path: string;
}

export interface Disk {
  /** @format int64 */
  available_bytes: number;
  device: string;
  mount: string;
  /** @format int64 */
  total_bytes: number;
  /** Empty when the server's df can't print it */
  type: string;
  /** @format int64 */
  used_bytes: number;
  /**
   * Used share of what non-root users can use, like df's Use%
   * @format double
   */
  used_percent: number;
}

export interface DiskUsage {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Who scanned: as root, through sudo or as the login user */
  access: "root" | "sudo" | "user";
  /** The filesystem path lives on; null when df failed */
  disk: UsageDisk;
  /** @format int64 */
  duration_ms: number;
  entries: UsageEntry[];
  /**
   * Smallest entries left out of the list
   * @format int64
   */
  more: number;
  /**
   * Bytes in the entries left out
   * @format int64
   */
  more_size: number;
  /** Empty at / */
  parent: string;
  path: string;
  /**
   * Bytes on disk under path, on its own filesystem
   * @format int64
   */
  size: number;
  /**
   * Folders du couldn't read: their bytes are missing
   * @format int64
   */
  unreadable: number;
}

export interface DockerStatus {
  /**
   * Running containers
   * @format int64
   */
  containers: number;
  /** What the CLI said when it failed */
  message?: string;
  runtime?: "docker" | "podman";
  /** absent: no docker or podman CLI; denied: the login user can't reach the daemon */
  status: "ok" | "denied" | "error" | "absent";
}

export interface EnableCronJobsRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  enabled: boolean;
  /**
   * @maxItems 1000
   * @minItems 1
   */
  lines: number[];
  /** From the table as last read; a different one answers 409 */
  revision: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  table: string;
}

export interface ErrorDetail {
  /** Where the error occurred, e.g. 'body.items[3].tags' or 'path.thing-id' */
  location?: string;
  /** Error message text */
  message?: string;
  /** The value at the given location */
  value?: any;
}

export interface ErrorModel {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** A human-readable explanation specific to this occurrence of the problem. */
  detail?: string;
  /** Optional list of individual error details */
  errors?: ErrorDetail[];
  /**
   * A URI reference that identifies the specific occurrence of the problem.
   * @format uri
   */
  instance?: string;
  /**
   * HTTP status code
   * @format int64
   */
  status?: number;
  /** A short, human-readable summary of the problem type. This value should not change between occurrences of the error. */
  title?: string;
  /**
   * A URI reference to human-readable documentation for the error.
   * @format uri
   * @default "about:blank"
   */
  type?: string;
}

export interface Event {
  /** found = a failure matched; restore = a ban put back after a restart */
  action: "found" | "ban" | "unban" | "restore" | "increase" | "ignore";
  ip: string;
  jail: string;
  /** Server-local time */
  time: string;
}

export interface ExplainDatabaseQueryRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Database to plan it in
   * @maxLength 128
   */
  database?: string;
  /**
   * MongoDB: {"collection": …, "filter": …} as JSON
   * @minLength 1
   * @maxLength 100000
   */
  query: string;
}

export interface ExtractArchiveRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Folder to unpack into; default is the archive's folder */
  destination?: string;
  /** @minLength 1 */
  path: string;
}

export interface Facet {
  /** @format int32 */
  count: number;
  value: string;
}

export interface FacetsOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int32 */
  favorites: number;
  os: OSFacet[];
  status: Facet[];
  tags: Facet[];
  /** @format int32 */
  total: number;
  /**
   * Servers outside every folder
   * @format int32
   */
  unfiled: number;
}

export interface Fail2BanBanBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * An address, or a network in CIDR form
   * @minLength 1
   * @maxLength 64
   */
  ip: string;
  /**
   * Required to ban; to unban, empty means every jail
   * @maxLength 64
   */
  jail?: string;
}

export interface Fail2BanConfigBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 262144 */
  content: string;
  revision: string;
}

export interface Fail2BanFile {
  content: string;
  exists: boolean;
  path: string;
  /** Send it back when changing the file, to detect edits made meanwhile */
  revision: string;
}

export interface Fail2BanFilter {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** filter.d/<name>.conf as the package ships it (read-only here) */
  conf: Fail2BanFile;
  /** filter.d/<name>.local: overrides, or the whole filter for a custom one */
  local: Fail2BanFile;
  name: string;
}

export interface Fail2BanInstallBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Turn the sshd jail on when no jail.local exists yet
   * @default true
   */
  protect_ssh?: boolean;
}

export interface Fail2BanJail {
  /** Running in fail2ban right now */
  active: boolean;
  /** Banned addresses with their time window */
  bans: Ban[];
  /** Defined only in .local files, so deleting it removes it (instead of resetting it) */
  custom: boolean;
  /** What the configuration says (the jail's own enabled, else [DEFAULT]'s) */
  enabled: boolean;
  name: string;
  /** For each key, the file its effective value comes from */
  origin: Record<string, string>;
  /** Effective value of every key the section sets, after all files are read */
  settings: Record<string, string>;
  /** The file that first defines the jail */
  source: string;
  /** Only for active jails */
  status?: JailStatus;
}

export interface Fail2BanLog {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Ban activity from those lines, newest first */
  events: Event[];
  /** Oldest first */
  lines: string[];
  /** The log file, journal, or empty when none was readable */
  source: string;
}

export interface Fail2BanOverview {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Managing fail2ban needs root or sudo */
  access: "root" | "sudo" | "user";
  /** Names in action.d */
  actions: string[];
  /** jail.local, where every change made here is written */
  config: Fail2BanFile;
  /** [DEFAULT]: what every jail inherits */
  defaults: Fail2BanSection;
  /** Jail config files, in the order fail2ban reads them (later wins) */
  files: string[];
  /** Names in filter.d */
  filters: string[];
  init: "systemd" | "openrc" | "none";
  installed: boolean;
  /** Every jail the configuration defines, enabled or not */
  jails: Fail2BanJail[];
  /** apt-get, dnf, yum, zypper, apk, pacman; empty when none is found */
  package_manager: string;
  /** fail2ban-client could talk to it (needs root), so jail status is known */
  responding: boolean;
  /** The fail2ban server process is up */
  running: boolean;
  starts_at_boot: boolean;
  version: string;
  warnings: string[];
}

export interface Fail2BanSection {
  /** For each key, the file its effective value comes from */
  origin: Record<string, string>;
  /** Effective value of every key the section sets, after all files are read */
  settings: Record<string, string>;
}

export interface Fail2BanServiceBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** enable/disable = start at boot or not */
  action: "start" | "stop" | "restart" | "reload" | "enable" | "disable";
}

export interface Fail2BanSettingsBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** jail.local's revision as last read; a different one answers 409 */
  revision: string;
  /** Keys to write into the section of jail.local; newlines make a multi-line value */
  set?: Record<string, string>;
  /** Keys to remove from the section of jail.local, so the inherited value applies again */
  unset?: string[];
}

export interface Fail2BanTask {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  duration_ms: number;
  /**
   * -1 when it was stopped
   * @format int64
   */
  exit_code: number;
  ok: boolean;
  /** stdout and stderr together */
  output: string;
  truncated: boolean;
}

export interface Fail2BanTestBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * A regex to try instead of a filter (<HOST> marks the address)
   * @maxLength 4000
   */
  failregex?: string;
  /**
   * A filter from filter.d; or give failregex
   * @maxLength 64
   */
  filter?: string;
  /** @maxLength 4000 */
  ignoreregex?: string;
  /**
   * A log file path, or "journal" for the systemd journal
   * @maxLength 1024
   */
  log?: string;
  /**
   * Log lines to test against instead of a file
   * @maxLength 262144
   */
  sample?: string;
}

export interface Fail2BanTestResult {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  ignored: number;
  /** @format int64 */
  lines: number;
  /** @format int64 */
  matched: number;
  /** The lines that matched (at most 200) */
  matches: string[];
  /** @format int64 */
  missed: number;
  /** fail2ban-regex's whole report */
  output: string;
}

export interface Fail2BanUninstallBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Also remove its configuration (apt, pacman) */
  purge?: boolean;
}

export interface FetchBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * File name; default is the last part of the URL
   * @maxLength 255
   */
  name?: string;
  /** Replace a file with that name */
  overwrite?: boolean;
  /** Folder to save into */
  path: string;
  /**
   * @minLength 1
   * @maxLength 4096
   */
  url: string;
}

export interface FileContent {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  content: string;
  /**
   * Send it back as expected_modified when saving, to detect edits made meanwhile
   * @format date-time
   */
  modified: string;
  path: string;
  /** @format int64 */
  size: number;
}

export interface FileEntry {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @format int32
   * @min 0
   */
  gid: number;
  group: string;
  /** Where a symlink points; empty otherwise */
  link_target: string;
  /** As ls shows it */
  mode: string;
  /** @format date-time */
  modified: string;
  name: string;
  /** User name, or the uid if the server doesn't list it */
  owner: string;
  path: string;
  /** Octal, with setuid/setgid/sticky */
  perm: string;
  /**
   * Bytes
   * @format int64
   */
  size: number;
  /** What a symlink resolves to; none for other entries */
  target_type: "none" | "file" | "dir" | "other" | "missing";
  type: "file" | "dir" | "symlink" | "other";
  /**
   * @format int32
   * @min 0
   */
  uid: number;
}

export interface FilePathsBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @maxItems 1000
   * @minItems 1
   */
  paths: string[];
}

export interface Folder {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  created_at: string;
  /** @format uuid */
  id: string;
  name: string;
  /**
   * Parent folder; null at the top level
   * @format uuid
   */
  parent_id: string | null;
  /**
   * Servers directly in this folder, not counting subfolders
   * @format int32
   */
  server_count: number;
  /** @format date-time */
  updated_at: string;
  /** @format uuid */
  workspace_id: string;
}

export interface FolderBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  name: string;
  /**
   * Parent folder; leave out or null for the top level
   * @format uuid
   */
  parent_id?: string | null;
}

export interface FolderListOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Folder[];
}

export interface FolderSize {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  path: string;
  /**
   * Bytes on disk
   * @format int64
   */
  size: number;
}

export interface GrantBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * A service on the Services page.
   * @format uuid
   */
  app_id?: string;
  /** Add servers and storages to the workspace. Defaults to on for Owner. */
  can_create?: boolean;
  /** @format uuid */
  group_id?: string;
  level: "viewer" | "operator" | "engineer" | "owner";
  /** @format uuid */
  server_id?: string;
  /** @format uuid */
  storage_id?: string;
  /** @format uuid */
  user_id?: string;
  /** @format uuid */
  workspace_id?: string;
}

export interface GrantListOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: PanelGrant[];
}

export interface GrantOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format uuid */
  id: string;
}

export interface GrantSpec {
  /**
   * A service on the Services page.
   * @format uuid
   */
  app_id?: string;
  /** Add servers and storages to the workspace. Defaults to on for Owner. */
  can_create?: boolean;
  level: "viewer" | "operator" | "engineer" | "owner";
  /** @format uuid */
  server_id?: string;
  /** @format uuid */
  storage_id?: string;
  /** @format uuid */
  workspace_id?: string;
}

export interface Group {
  /** @format int64 */
  gid: number;
  /** Users listed in /etc/group */
  members: string[];
  name: string;
  /** Users whose primary group it is (members too, though /etc/group doesn't list them) */
  primary: string[];
  /** Its members get sudo for every command */
  sudo: boolean;
  /** gid below UID_MIN */
  system: boolean;
}

export interface GroupCreateBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @format int64
   * @min 1
   * @max 2147483646
   */
  gid?: number;
  /** @maxItems 500 */
  members?: string[];
  /**
   * @minLength 1
   * @maxLength 32
   */
  name: string;
  /** gid below UID_MIN */
  system?: boolean;
}

export interface GroupUpdateBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * The full member list
   * @maxItems 500
   */
  members?: string[];
  /**
   * @minLength 1
   * @maxLength 32
   */
  name?: string;
}

export interface HealthOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Overall service status */
  status: string;
}

export interface HostNet {
  hostname: string;
  interfaces: NetInterface[];
  /** Default routes, v4 and v6 */
  routes: NetRoute[];
  /** The server has no ip tool (iproute2), so its addresses couldn't be read */
  unsupported: boolean;
}

export interface HostStats {
  /** @format int64 */
  changed: number;
  /** @format int64 */
  failed: number;
  /** @format int64 */
  ignored: number;
  /** @format int64 */
  ok: number;
  /** @format int64 */
  rescued: number;
  /** @format int64 */
  skipped: number;
  /** @format int64 */
  unreachable: number;
}

export interface IDsBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Server ids
   * @maxItems 500
   * @minItems 1
   */
  ids: string[];
}

export interface ItemResult {
  /** The item (any JSON value) */
  item: any;
  msg?: string;
  /** @format int64 */
  rc?: number;
  status: "ok" | "changed" | "failed" | "skipped";
  stderr?: string;
  stdout?: string;
}

export interface JailStatus {
  banned_ips: string[];
  /** @format int64 */
  currently_banned: number;
  /** @format int64 */
  currently_failed: number;
  /** Log files the jail watches */
  files: string[];
  /** With the systemd backend: the journal filter instead of files */
  journal_matches: string;
  /** @format int64 */
  total_banned: number;
  /** @format int64 */
  total_failed: number;
}

export interface Job {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  created_at: string;
  /** Why it failed or was interrupted */
  error: string;
  /** @format date-time */
  finished_at?: string;
  /** @format uuid */
  id: string;
  /** What it does: transfer, copy, move, storage-copy, storage-move, compress, extract, fetch, fail2ban-install, fail2ban-uninstall, ansible-run or schedule-sync */
  kind: string;
  /** What it printed (newest last); only on GET /jobs/{id} */
  log?: string;
  progress: Progress;
  /** Servers and storages it touches */
  refs: string[];
  /** What it produced; the shape depends on kind */
  result?: Record<string, any>;
  /** @format uuid */
  retry_of?: string;
  /** @format date-time */
  started_at?: string;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted";
  /** Where its output lands */
  target?: JobPlace;
  title: string;
}

export interface JobPlace {
  /** The server's or storage's name when the job started */
  name?: string;
  path: string;
  /**
   * The Ansible or cron job run it belongs to
   * @format uuid
   */
  run_id?: string;
  /**
   * The cron job it is a run of
   * @format uuid
   */
  schedule_id?: string;
  /** @format uuid */
  server_id?: string;
  /** @format uuid */
  storage_id?: string;
}

export interface JobRemoved {
  id: string;
}

export interface KillDatabaseSessionRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  connection?: boolean;
  /**
   * The session's id from the live view
   * @minLength 1
   * @maxLength 64
   */
  id: string;
}

export interface ListJobsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Job[];
}

export interface ListPlaybooksResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Playbook[];
}

export interface ListStoragesResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Storage[];
}

export interface ListTerminalsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: TerminalSession[];
}

export interface LogEntry {
  /** Where this entry sits in the journal, to continue after it */
  cursor: string;
  /** Who logged it (SYSLOG_IDENTIFIER) */
  ident?: string;
  message: string;
  /** @format int64 */
  pid?: number;
  /**
   * 0 emerg … 3 err, 4 warning, 5 notice, 6 info, 7 debug
   * @format int64
   */
  priority: number;
  /** @format date-time */
  time: string;
}

export interface Login {
  /** Address, or empty for a local login */
  from: string;
  /** @format date-time */
  time: string;
  tty: string;
}

export interface MakeFolderRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @minLength 1 */
  path: string;
}

export interface Memory {
  /**
   * What programs can still get without swapping
   * @format int64
   */
  available_bytes: number;
  /**
   * Page cache and buffers (reclaimable)
   * @format int64
   */
  cached_bytes: number;
  /** @format int64 */
  swap_total_bytes: number;
  /** @format int64 */
  swap_used_bytes: number;
  /** @format int64 */
  total_bytes: number;
  /**
   * Total minus available
   * @format int64
   */
  used_bytes: number;
}

export interface MyAccess {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  admin: boolean;
  /** Services on the Services page. */
  apps: ResourceAccess[];
  /** Can add servers and storages somewhere. */
  can_create: boolean;
  servers: ResourceAccess[];
  storages: ResourceAccess[];
  workspaces: WorkspaceAccess[];
}

export interface NetAddress {
  family: "ipv4" | "ipv6";
  ip: string;
  /** @format int64 */
  prefix: number;
  scope: "public" | "private" | "cgnat" | "link" | "host";
  /** The subnet in CIDR form */
  subnet: string;
}

export interface NetInterface {
  addresses: NetAddress[];
  /**
   * Interfaces attached to this bridge (containers, on a Docker bridge)
   * @format int64
   */
  attached: number;
  kind:
    | "loopback"
    | "ethernet"
    | "wireless"
    | "bridge"
    | "container"
    | "veth"
    | "vlan"
    | "bond"
    | "vpn"
    | "overlay"
    | "virtual";
  /** What it belongs to, when known: a Docker network's name, Tailscale, WireGuard… */
  label: string;
  mac: string;
  /** The bridge or bond it is attached to */
  master: string;
  /** @format int64 */
  mtu: number;
  name: string;
  state: "up" | "down" | "unknown";
}

export interface NetRoute {
  family: "ipv4" | "ipv6";
  /** Empty for a route straight out of an interface (VPNs) */
  gateway: string;
  interface: string;
}

export interface Network {
  /**
   * Received over the last second, all interfaces except loopback and virtual ones
   * @format double
   */
  rx_bytes_per_sec: number;
  /**
   * Received since boot
   * @format int64
   */
  rx_bytes_total: number;
  /** @format double */
  tx_bytes_per_sec: number;
  /** @format int64 */
  tx_bytes_total: number;
}

export interface NetworkMap {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  duration_ms: number;
  /** One per ordered pair of servers */
  links: Reach[];
  networks: Subnet[];
  /** @format date-time */
  scanned_at: string;
  servers: NetworkServer[];
}

export interface NetworkServer {
  /** Why it couldn't be read */
  error: string;
  host?: HostNet;
  /** Its interfaces were read and it probed the others */
  scanned: boolean;
  server: Server;
}

export interface OSFacet {
  /** @format int32 */
  count: number;
  family: string;
  label: string;
  /** OS id; 'unknown' for servers never detected */
  value: string;
}

export interface OpenPort {
  /** Local addresses it is bound to; 0.0.0.0, :: and * mean every interface */
  addresses: string[];
  container?: PortContainer;
  /** public: every interface or a public address; private: a LAN/link-local address only; local: loopback only */
  exposure: "public" | "private" | "local";
  /** @format int64 */
  port: number;
  process?: PortProcess;
  protocol: "tcp" | "udp";
  /** A service that shouldn't be reachable from the internet (databases, caches, remote desktop…) */
  sensitive: boolean;
  /** Best guess at what this is; empty when nothing is known */
  service: string;
  service_source: "container" | "process" | "port" | "none";
  unit?: PortUnit;
}

export interface PanelApproveBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  grants?: GrantSpec[];
  group_ids?: string[];
}

export interface PanelGrant {
  /** @format uuid */
  app_id?: string;
  app_name?: string;
  can_create: boolean;
  /** @format date-time */
  created_at: string;
  full_name?: string;
  /** @format uuid */
  group_id?: string;
  group_name?: string;
  /** @format uuid */
  id: string;
  level: "viewer" | "operator" | "engineer" | "owner";
  /** @format uuid */
  server_id?: string;
  server_name?: string;
  /** @format uuid */
  storage_id?: string;
  storage_name?: string;
  /** @format uuid */
  user_id?: string;
  user_status?: string;
  username?: string;
  /** @format uuid */
  workspace_id?: string;
  workspace_name?: string;
}

export interface PanelGroup {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  description: string;
  /** @format uuid */
  id: string;
  member_ids: string[];
  name: string;
}

export interface PanelGroupBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 500 */
  description?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  name: string;
}

export interface PanelGroupListOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: PanelGroup[];
}

export interface PanelGroupMembersBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  user_ids: string[];
}

export interface PanelPasswordBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 1024 */
  password: string;
}

export interface PanelProfile {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 254 */
  email: string;
  /** @maxLength 64 */
  first_name: string;
  /** @maxLength 128 */
  full_name: string;
}

export interface PanelSettings {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  registration_open: boolean;
}

export interface PanelSignup {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 254 */
  email: string;
  /** @maxLength 64 */
  first_name: string;
  /** @maxLength 128 */
  full_name: string;
  /** @maxLength 1024 */
  password: string;
  /** @maxLength 32 */
  username: string;
}

export interface PanelUser {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  created_at: string;
  email: string;
  first_name: string;
  full_name: string;
  group_ids?: string[];
  /** @format uuid */
  id: string;
  /** @format date-time */
  last_login_at?: string;
  must_change_password: boolean;
  role: "admin" | "member";
  status: "pending" | "active" | "blocked";
  username: string;
}

export interface PanelUserCount {
  /** @format int32 */
  count: number;
  value: string;
}

export interface PanelUserCreateBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 254 */
  email: string;
  /** @maxLength 64 */
  first_name: string;
  /** @maxLength 128 */
  full_name: string;
  grants?: GrantSpec[];
  group_ids?: string[];
  /** @maxLength 1024 */
  password: string;
  role: "admin" | "member";
  /** @maxLength 32 */
  username: string;
}

export interface PanelUserListOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  counts: PanelUserCount[];
  items: PanelUser[];
}

export interface PanelUserUpdateBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 254 */
  email?: string;
  /** @maxLength 64 */
  first_name?: string;
  /** @maxLength 128 */
  full_name?: string;
  /** Replaces their groups; leave out to keep them. */
  group_ids?: string[];
  role?: "admin" | "member";
}

export interface PanelWorkspace {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Services you can reach here.
   * @format int32
   */
  app_count: number;
  /** You can add servers, storages and services here. */
  can_create: boolean;
  description: string;
  /** @format uuid */
  id: string;
  /** Your level on the whole workspace; none if you only reach some servers, storages or services in it. */
  level: string;
  name: string;
  /** You only reach some servers, storages or services in it. */
  partial: boolean;
  /**
   * Servers you can reach here.
   * @format int32
   */
  server_count: number;
  /**
   * Storages you can reach here.
   * @format int32
   */
  storage_count: number;
}

export interface Playbook {
  /** @format date-time */
  created_at: string;
  description: string;
  /** @format uuid */
  id: string;
  /** @format date-time */
  last_run_at?: string;
  /** @format uuid */
  last_run_id?: string;
  last_run_state?: string;
  name: string;
  /**
   * Length of the YAML
   * @format int32
   */
  size: number;
  /**
   * Send it back as revision when saving
   * @format date-time
   */
  updated_at: string;
  /** @format uuid */
  workspace_id: string;
}

export interface PlaybookBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * The playbook (YAML). Saved even if it isn't valid yet; checked when it runs
   * @maxLength 1048576
   */
  content: string;
  /** @maxLength 2000 */
  description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 262144 */
  variables?: string;
}

export interface PlaybookDetail {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** The playbook (YAML) */
  content: string;
  /** @format date-time */
  created_at: string;
  description: string;
  /** @format uuid */
  id: string;
  name: string;
  /** @format date-time */
  updated_at: string;
  /** Extra variables offered when running it (YAML) */
  variables: string;
  /** @format uuid */
  workspace_id: string;
}

export interface PlaybookUpdate {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 1048576 */
  content: string;
  /** @maxLength 2000 */
  description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /**
   * Its updated_at when loaded; a different one answers 409
   * @format date-time
   */
  revision?: string;
  /** @maxLength 262144 */
  variables?: string;
}

export interface PortContainer {
  compose_project?: string;
  compose_service?: string;
  /** Short (12 character) ID */
  id: string;
  image: string;
  name: string;
  /** Network mode; host means the container shares the server's network */
  network?: string;
  state?: string;
  /**
   * The container's own port this host port forwards to (unset for host networking)
   * @format int64
   */
  target_port?: number;
}

export interface PortProcess {
  command?: string;
  name: string;
  /** @format int64 */
  pid: number;
  /** Every process holding the socket (e.g. a server's workers) */
  pids: number[];
  user?: string;
}

export interface PortUnit {
  description?: string;
  name: string;
}

export interface PortsReport {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  collected_at: string;
  docker: DockerStatus;
  ports: OpenPort[];
  /** Read as root (the login user is root, or sudo -n works), so every socket's process is known */
  privileged: boolean;
  /** What listed the sockets; none means neither ss nor netstat is installed */
  tool: "ss" | "netstat" | "none";
}

export interface PowerActionBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action: "reboot" | "poweroff";
  /**
   * 0 = now. Later needs systemd
   * @format int64
   * @min 0
   * @max 10080
   */
  delay_minutes?: number;
  /**
   * Broadcast to logged-in users (wall)
   * @maxLength 200
   */
  message?: string;
}

export interface PowerActionResult {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action: "reboot" | "poweroff";
  /**
   * When it happens, by the server's clock
   * @format date-time
   */
  at: string;
  /**
   * The boot before this one; a later boot_time means the server is back
   * @format date-time
   */
  boot_time: string;
  /** Delayed: it can still be cancelled */
  scheduled: boolean;
}

export interface PowerOverview {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** How the login user can act as root; rebooting needs root or sudo */
  access: "root" | "sudo" | "user";
  /** @format date-time */
  boot_time: string;
  /** A delayed reboot or shutdown can be scheduled and cancelled (systemd) */
  can_schedule: boolean;
  /** The server is a container: rebooting or shutting it down usually stops the container */
  container: boolean;
  init: "systemd" | "openrc" | "none";
  /** The running kernel (uname -r) */
  kernel: string;
  /** Packages asking for it (Debian/Ubuntu reboot-required.pkgs) */
  reboot_packages: string[];
  /** Why a reboot is waiting, as sentences */
  reboot_reasons: string[];
  reboot_required: boolean;
  /** A pending delayed reboot or shutdown */
  scheduled?: PowerSchedule;
  /** @format date-time */
  server_time: string;
  /**
   * Login sessions open right now (who)
   * @format int64
   */
  sessions: number;
  /** @format int64 */
  uptime_seconds: number;
}

export interface PowerSchedule {
  action: "reboot" | "poweroff" | "halt" | "kexec";
  /** @format date-time */
  at: string;
  /** What logged-in users were told */
  message?: string;
}

export interface PreviewAnsibleTargetsRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  selection: AnsibleSelection;
}

export interface PreviewAnsibleTargetsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  hosts: PreviewHost[];
}

export interface PreviewHost {
  /** The Ansible groups it's in: its tags and os_<id> */
  groups: string[];
  host: string;
  /** What it's called in the playbook's output */
  inventory_name: string;
  name: string;
  /** Why it can't be in the run */
  problem: string;
  /** @format uuid */
  server_id: string;
  /** Its status at the last check */
  status: string;
}

export interface PreviewScheduleRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @format int64
   * @min 1
   * @max 20
   * @default 5
   */
  count?: number;
  /**
   * @minLength 1
   * @maxLength 200
   */
  cron: string;
  /** @maxLength 64 */
  timezone?: string;
}

export interface PreviewScheduleResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  next: string[];
}

export interface PrincipalGroup {
  /** @format uuid */
  id: string;
  name: string;
}

export interface PrincipalUser {
  full_name: string;
  /** @format uuid */
  id: string;
  username: string;
}

export interface PrincipalsOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  groups: PrincipalGroup[];
  users: PrincipalUser[];
}

export interface Progress {
  /** The file it's on */
  current?: string;
  /**
   * Bytes done
   * @format int64
   */
  done: number;
  /**
   * Files (or other units) done
   * @format int64
   */
  items: number;
  /**
   * Files in all; 0 = not known
   * @format int64
   */
  items_total: number;
  /** At a step that can't be stopped safely; cancel answers 409 until it's over */
  locked: boolean;
  /** What it's doing now */
  phase?: string;
  /**
   * Bytes per second, smoothed
   * @format double
   */
  rate: number;
  /**
   * Bytes in all; 0 = not known
   * @format int64
   */
  total: number;
}

export interface Reach {
  /** @format uuid */
  from: string;
  /**
   * Round trip on the best path
   * @format double
   */
  ping_ms?: number;
  probes: ReachProbe[];
  /** open: the SSH port accepts connections; up: the host answers (ping or a refused connect) but the port doesn't; blocked: nothing answered; unknown: the source couldn't be read, or there was no address to try */
  status: "open" | "up" | "blocked" | "unknown";
  /** @format uuid */
  to: string;
  /** The best path found */
  via: "lan" | "vpn" | "host" | "address" | "";
}

export interface ReachProbe {
  address: string;
  /** The connect error, if any */
  message: string;
  ping: "ok" | "lost" | "unavailable";
  /** @format double */
  ping_ms?: number;
  /** @format int64 */
  port: number;
  /** The route the kernel picked (ip route get) */
  route: string;
  /** The shared network's ID, for lan and vpn */
  subnet: string;
  /** refused still means the host answered */
  tcp:
    | "open"
    | "refused"
    | "timeout"
    | "unreachable"
    | "dns"
    | "failed"
    | "unavailable";
  /** Why this address was tried: a shared LAN or VPN, the address Morcheh uses, or one of the server's own */
  via: "lan" | "vpn" | "host" | "address";
}

export interface RenameFileRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @minLength 1 */
  from: string;
  /** @minLength 1 */
  to: string;
}

export interface RenameTerminalRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  title: string;
}

export interface ResourceAccess {
  /** @format uuid */
  id: string;
  level: string;
}

export interface Rule {
  /** false for files sudo skips (a . or ~ in the name) */
  active: boolean;
  /**
   * Last line (rules can continue with a backslash)
   * @format int64
   */
  end_line: number;
  file: string;
  /** Grants every command */
  full: boolean;
  /**
   * 1-based first line
   * @format int64
   */
  line: number;
  /** Written by Morcheh (sudoers.d/morcheh-*) */
  managed: boolean;
  nopasswd: boolean;
  text: string;
  /** User names, %group, %#gid, #uid or ALL */
  who: string[];
}

export interface RunEvent {
  action?: string;
  /** @format int64 */
  attempt?: number;
  data?: any;
  diff?: any;
  e: string;
  handler?: boolean;
  host?: string;
  hosts?: string;
  id?: string;
  items?: ItemResult[];
  msg?: string;
  name?: string;
  path?: string;
  play?: string;
  /** @format int64 */
  rc?: number;
  reason?: string;
  /** @format int64 */
  retries?: number;
  stats?: Record<string, HostStats>;
  status?: string;
  stderr?: string;
  stdout?: string;
  /** @format double */
  t: number;
  task?: string;
}

export interface RunListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: AnsibleRun[];
  /** @format int64 */
  total: number;
}

export interface RunListBody1 {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: ScheduleRun[];
  /** @format int64 */
  total: number;
}

export interface RunOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** The background job; null when the run was skipped */
  job: Job;
  run: ScheduleRun;
}

export interface RunPlay {
  /** Its host pattern */
  hosts: string;
  id: string;
  name: string;
  no_hosts?: "matched" | "remaining";
  tasks: RunTask[];
}

export interface RunScheduleRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Only count what would be copied and deleted */
  dry_run?: boolean;
}

export interface RunTask {
  action: string;
  handler: boolean;
  id: string;
  name: string;
  /** Where it's written (file:line) */
  path?: string;
  /** By inventory host name */
  results: Record<string, TaskResult>;
  /** @format date-time */
  started_at: string;
}

export interface SaveCrontabRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 262144 */
  content: string;
  /** From the table as last read; a different one answers 409 */
  revision: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  table: string;
}

export interface Schedule {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action: "sync";
  /** @format date-time */
  created_at: string;
  cron: string;
  description: string;
  destinations: ScheduleEndView[];
  enabled: boolean;
  /** @format uuid */
  id: string;
  last_run: ScheduleRunBrief;
  name: string;
  /**
   * null while paused
   * @format date-time
   */
  next_run_at: string | null;
  options: ScheduleOptions;
  problem: string;
  /**
   * Runs use this person's access: whoever saved it last
   * @format uuid
   */
  run_as_id: string | null;
  run_as_name: string;
  source: ScheduleEndView;
  timezone: string;
  /** @format date-time */
  updated_at: string;
  /** @format uuid */
  workspace_id: string;
}

export interface ScheduleBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Five fields (minute hour day month weekday), or @hourly, @daily, @weekly, @monthly, @every 2h
   * @minLength 1
   * @maxLength 200
   */
  cron: string;
  /** @maxLength 2000 */
  description?: string;
  /**
   * @maxItems 20
   * @minItems 1
   */
  destinations: ScheduleEnd[];
  /** Default true */
  enabled?: boolean;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  options: ScheduleOptions;
  source: ScheduleEnd;
  /**
   * IANA zone the times are read in; default UTC
   * @maxLength 64
   */
  timezone?: string;
}

export interface ScheduleEnd {
  /**
   * Absolute path. The source may be a file or a folder; a destination is a folder
   * @minLength 1
   * @maxLength 4096
   */
  path: string;
  /**
   * Exactly one of server_id and storage_id
   * @format uuid
   */
  server_id?: string;
  /** @format uuid */
  storage_id?: string;
}

export interface ScheduleEndView {
  /** The server or storage was deleted */
  missing: boolean;
  /** The server's or storage's name; empty when it was deleted */
  name: string;
  /**
   * Absolute path. The source may be a file or a folder; a destination is a folder
   * @minLength 1
   * @maxLength 4096
   */
  path: string;
  /**
   * Exactly one of server_id and storage_id
   * @format uuid
   */
  server_id?: string;
  /** @format uuid */
  storage_id?: string;
}

export interface ScheduleListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Schedule[];
}

export interface ScheduleOptions {
  /**
   * Glob patterns to leave out; without a slash they match a name at any depth
   * @maxItems 100
   */
  excludes?: string[];
  /**
   * Snapshots to keep (snapshot mode), 0 = all
   * @format int64
   * @min 0
   * @max 1000
   */
  keep?: number;
  /**
   * update: copy new and changed files. mirror: also delete what the source no longer has. snapshot: a full copy in a new dated folder each run
   * @default "update"
   */
  mode: "update" | "mirror" | "snapshot";
}

export interface ScheduleRun {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  bytes: number;
  /** @format date-time */
  created_at: string;
  /** Who pressed Run now; empty for a run on time */
  created_by_name: string;
  /** A test run: counted, nothing changed */
  dry_run: boolean;
  error: string;
  /**
   * Files copied in all
   * @format int64
   */
  files: number;
  /** @format date-time */
  finished_at: string | null;
  /** @format uuid */
  id: string;
  /** @format uuid */
  job_id: string | null;
  options: ScheduleOptions;
  /** While it runs */
  progress: Progress;
  results: ScheduleRunDest[];
  /** @format uuid */
  schedule_id: string;
  source: ScheduleEndView;
  /** @format date-time */
  started_at: string | null;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "partial"
    | "failed"
    | "canceled"
    | "interrupted"
    | "skipped";
  trigger: "schedule" | "manual";
}

export interface ScheduleRunBrief {
  /** @format date-time */
  at: string;
  error: string;
  /** @format date-time */
  finished_at: string | null;
  /** @format uuid */
  id: string;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "partial"
    | "failed"
    | "canceled"
    | "interrupted";
}

export interface ScheduleRunDest {
  /**
   * Bytes written
   * @format int64
   */
  bytes: number;
  /**
   * Files written
   * @format int64
   */
  copied: number;
  /**
   * Files and folders removed (mirror), or old snapshots
   * @format int64
   */
  deleted: number;
  error: string;
  /**
   * Files that couldn't be copied
   * @format int64
   */
  failed: number;
  /** @format date-time */
  finished_at: string | null;
  folder?: string;
  /** The server or storage was deleted */
  missing: boolean;
  /** The server's or storage's name; empty when it was deleted */
  name: string;
  /**
   * Absolute path. The source may be a file or a folder; a destination is a folder
   * @minLength 1
   * @maxLength 4096
   */
  path: string;
  problems?: string[];
  /**
   * Exactly one of server_id and storage_id
   * @format uuid
   */
  server_id?: string;
  /**
   * Files already up to date
   * @format int64
   */
  skipped: number;
  /** @format date-time */
  started_at: string | null;
  /** partial: some files couldn't be copied */
  state:
    | "pending"
    | "running"
    | "succeeded"
    | "partial"
    | "failed"
    | "canceled";
  /** @format uuid */
  storage_id?: string;
}

export interface ScheduleUpdate {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Five fields (minute hour day month weekday), or @hourly, @daily, @weekly, @monthly, @every 2h
   * @minLength 1
   * @maxLength 200
   */
  cron: string;
  /** @maxLength 2000 */
  description?: string;
  /**
   * @maxItems 20
   * @minItems 1
   */
  destinations: ScheduleEnd[];
  /** Default true */
  enabled?: boolean;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  options: ScheduleOptions;
  /**
   * updated_at when you loaded it; 409 when it changed since
   * @format date-time
   */
  revision?: string;
  source: ScheduleEnd;
  /**
   * IANA zone the times are read in; default UTC
   * @maxLength 64
   */
  timezone?: string;
}

export interface SearchResult {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: FileEntry[];
  /** More matched than were returned */
  truncated: boolean;
}

export interface SearchStorageFilesResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: StorageEntry[];
  truncated: boolean;
}

export interface Server {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  auth_method: "password" | "private_key";
  /** @format date-time */
  created_at: string;
  description: string;
  favorite: boolean;
  /** @format uuid */
  folder_id: string | null;
  has_passphrase: boolean;
  has_password: boolean;
  has_private_key: boolean;
  /** IP address or DNS name */
  host: string;
  /** SHA256 fingerprint of the trusted host key; empty until the first successful check */
  host_key_fingerprint: string;
  /** The server's own hostname, as reported by uname */
  hostname: string;
  /** @format uuid */
  id: string;
  /** @format date-time */
  last_checked_at: string | null;
  /**
   * Last time a check reached the server
   * @format date-time
   */
  last_seen_at: string | null;
  /**
   * Time to connect and finish the SSH handshake on the last successful check
   * @format int32
   */
  latency_ms: number | null;
  name: string;
  os: ServerOS;
  /** @format int32 */
  port: number;
  /** Result of the last connection check */
  status:
    | "unknown"
    | "online"
    | "unreachable"
    | "auth_failed"
    | "host_key_mismatch"
    | "error";
  /** Human-readable detail for the status */
  status_message: string;
  tags: string[];
  /** @format date-time */
  updated_at: string;
  username: string;
  /** @format uuid */
  workspace_id: string;
}

export interface ServerBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  auth_method: "password" | "private_key";
  /** @maxLength 500 */
  description?: string;
  favorite?: boolean;
  /**
   * Leave out or null for no folder
   * @format uuid
   */
  folder_id?: string | null;
  /**
   * IP address or DNS name
   * @minLength 1
   * @maxLength 253
   */
  host: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  name: string;
  /**
   * Passphrase of an encrypted private key
   * @maxLength 1024
   */
  passphrase?: string;
  /**
   * For auth_method=password. On update, leave out to keep the stored one
   * @maxLength 1024
   */
  password?: string;
  /**
   * @format int32
   * @min 1
   * @max 65535
   * @default 22
   */
  port?: number;
  /**
   * PEM or OpenSSH private key, for auth_method=private_key. On update, leave out to keep the stored one
   * @maxLength 16384
   */
  private_key?: string;
  /**
   * Lowercase letters, digits and . _ - : /; at most 32 characters each
   * @maxItems 20
   */
  tags?: string[];
  /**
   * @minLength 1
   * @maxLength 64
   */
  username: string;
}

export interface ServerCredentials {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  auth_method: "password" | "private_key";
  host: string;
  /** Trusted host key in authorized_keys format; empty until the first successful check */
  host_key: string;
  host_key_fingerprint: string;
  /** The private key's passphrase; empty when it has none */
  passphrase: string;
  /** Empty unless auth_method=password */
  password: string;
  /** @format int32 */
  port: number;
  /** Empty unless auth_method=private_key */
  private_key: string;
  /** authorized_keys line derived from the private key; empty when it can't be parsed */
  public_key: string;
  public_key_fingerprint: string;
  username: string;
}

export interface ServerItemsOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Server[];
}

export interface ServerListOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Server[];
  /**
   * Matches across all pages
   * @format int32
   */
  total: number;
}

export interface ServerOS {
  arch: string;
  /** linux, darwin, freebsd, windows…; empty until a check detects it */
  family: string;
  /** os-release ID (ubuntu, debian, rocky…), macos or windows */
  id: string;
  kernel: string;
  name: string;
  version: string;
}

export interface Service {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** active, inactive, failed, activating, deactivating, reloading */
  active: string;
  /** It reloads its configuration without a restart */
  can_reload: boolean;
  can_start: boolean;
  can_stop: boolean;
  /**
   * CPU time used since it started, in nanoseconds
   * @format int64
   */
  cpu_ns?: number;
  /** Its unit file lives in /etc/systemd/system, so it can be edited or removed here */
  custom: boolean;
  description: string;
  /** Drop-in files that change it */
  drop_ins: string[];
  /** Starts at boot: enabled, disabled, static, masked, indirect, generated, alias, transient, linked… Empty when unknown */
  enabled: string;
  /**
   * Exit status of its main process's last run
   * @format int64
   */
  exit_code: number;
  /** loaded, not-found, masked, bad-setting, error (OpenRC: loaded) */
  load: string;
  /**
   * 0 when not running
   * @format int64
   */
  main_pid: number;
  /**
   * Bytes in use by its cgroup, when accounting is on
   * @format int64
   */
  memory?: number;
  /** The unit (systemd) or init script (OpenRC) */
  name: string;
  /** Its unit file changed on disk since systemd read it (daemon-reload) */
  need_reload: boolean;
  /** Its unit file */
  path?: string;
  /** What the distribution's preset says it should be */
  preset?: string;
  /** Morcheh reaches the server through it (sshd) or the system needs it to run; stopping it asks for force */
  protected: boolean;
  /**
   * Automatic restarts since it was started by hand
   * @format int64
   */
  restarts: number;
  /** How its last run ended: success, exit-code, signal, timeout, core-dump… */
  result?: string;
  /**
   * When it entered its current state
   * @format date-time
   */
  since?: string;
  /** The finer state: running, exited, dead, failed, auto-restart… (OpenRC: started, stopped, crashed…) */
  sub: string;
  /**
   * Processes and threads
   * @format int64
   */
  tasks?: number;
  /** Sockets, timers or paths that start it */
  triggered_by: string[];
  /** simple, exec, forking, oneshot, notify, dbus, idle */
  type?: string;
  /** User= it runs as; empty is root */
  user?: string;
}

export interface ServiceActionBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action:
    | "start"
    | "stop"
    | "restart"
    | "reload"
    | "enable"
    | "disable"
    | "mask"
    | "unmask"
    | "reset-failed"
    | "kill";
  /** Stop, disable, mask or kill a protected service (sshd, dbus, journald…) anyway */
  force?: boolean;
  /** With enable/disable/mask: also start or stop it now */
  now?: boolean;
  /**
   * With kill
   * @default "TERM"
   */
  signal?: "TERM" | "KILL" | "HUP" | "INT" | "USR1" | "USR2";
}

export interface ServiceCreateBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * The unit file
   * @minLength 1
   * @maxLength 262144
   */
  content: string;
  /** Start it at boot */
  enable?: boolean;
  /**
   * .service is added when missing
   * @minLength 1
   * @maxLength 200
   */
  name: string;
  /** Start it now */
  start?: boolean;
}

export interface ServiceDetails {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** active, inactive, failed, activating, deactivating, reloading */
  active: string;
  /**
   * When it last became active
   * @format date-time
   */
  active_since?: string;
  after: string[];
  before: string[];
  /** It reloads its configuration without a restart */
  can_reload: boolean;
  can_start: boolean;
  can_stop: boolean;
  conflicts: string[];
  /**
   * CPU time used since it started, in nanoseconds
   * @format int64
   */
  cpu_ns?: number;
  /** Its unit file lives in /etc/systemd/system, so it can be edited or removed here */
  custom: boolean;
  description: string;
  documentation: string[];
  /** Drop-in files that change it */
  drop_ins: string[];
  /** Starts at boot: enabled, disabled, static, masked, indirect, generated, alias, transient, linked… Empty when unknown */
  enabled: string;
  /** KEY=value pairs set on it */
  environment: string[];
  environment_files: string[];
  /** Command lines it starts */
  exec_start: string[];
  /**
   * Exit status of its main process's last run
   * @format int64
   */
  exit_code: number;
  /** Of the unit file, for editing a custom unit */
  file_revision: string;
  /** The unit file and its drop-ins, as systemd reads them */
  files: UnitFile[];
  init: "systemd" | "openrc";
  /** loaded, not-found, masked, bad-setting, error (OpenRC: loaded) */
  load: string;
  /**
   * 0 when not running
   * @format int64
   */
  main_pid: number;
  /**
   * Bytes in use by its cgroup, when accounting is on
   * @format int64
   */
  memory?: number;
  /** The unit (systemd) or init script (OpenRC) */
  name: string;
  /** Its unit file changed on disk since systemd read it (daemon-reload) */
  need_reload: boolean;
  /** Where Morcheh writes overrides: <unit>.d/override.conf in /etc/systemd/system */
  override: string;
  /** Its unit file */
  path?: string;
  /** What the distribution's preset says it should be */
  preset?: string;
  /** Morcheh reaches the server through it (sshd) or the system needs it to run; stopping it asks for force */
  protected: boolean;
  required_by: string[];
  requires: string[];
  /** Restart= policy: no, on-failure, always… */
  restart?: string;
  restart_sec?: string;
  /**
   * Automatic restarts since it was started by hand
   * @format int64
   */
  restarts: number;
  /** How its last run ended: success, exit-code, signal, timeout, core-dump… */
  result?: string;
  /** Of the override file as it is now (empty file when there is none); send it back when saving */
  revision: string;
  /**
   * When it entered its current state
   * @format date-time
   */
  since?: string;
  /** What the service itself reports (sd_notify STATUS=) */
  status_text?: string;
  /** The finer state: running, exited, dead, failed, auto-restart… (OpenRC: started, stopped, crashed…) */
  sub: string;
  /**
   * Processes and threads
   * @format int64
   */
  tasks?: number;
  /** Sockets, timers or paths that start it */
  triggered_by: string[];
  /** simple, exec, forking, oneshot, notify, dbus, idle */
  type?: string;
  /** User= it runs as; empty is root */
  user?: string;
  /** Targets that pull it in at boot */
  wanted_by: string[];
  wants: string[];
  working_directory?: string;
}

export interface ServiceFileBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * The whole file; empty removes an override
   * @maxLength 262144
   */
  content: string;
  /** Restart the service after systemd reloads it (when it runs) */
  restart?: boolean;
  /** From the details: 409 when the file changed since */
  revision: string;
}

export interface ServiceLogs {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Oldest first */
  entries: LogEntry[];
  note?: string;
  /** none: the server has no journal (OpenRC, no systemd-journald) */
  source: "journal" | "none";
}

export interface ServicesOverview {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Starting, stopping or changing services needs root or sudo */
  access: "root" | "sudo" | "user";
  /** The service manager; none = neither systemd nor OpenRC runs (e.g. a container) */
  init: "systemd" | "openrc" | "none";
  services: Service[];
  /** systemctl is-system-running: running, degraded (a unit failed), starting, maintenance… */
  state: string;
  version: string;
  warnings: string[];
}

export interface Session {
  from: string;
  /** As who printed it, in the server's time */
  since: string;
  tty: string;
  user: string;
}

export interface SetDatabaseFavoriteRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  favorite: boolean;
}

export interface SetDatabasePausedRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  paused: boolean;
}

export interface SetScheduleEnabledRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  enabled: boolean;
}

export interface SetServerFavoriteRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  favorite: boolean;
}

export interface SetStorageFavoriteRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  favorite: boolean;
}

export interface ShareStorageFileRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Seconds
   * @format int64
   * @min 60
   * @max 604800
   * @default 86400
   */
  expires_in?: number;
  /** @minLength 1 */
  path: string;
}

export interface ShareStorageFileResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  expires_at: string;
  url: string;
}

export interface StartRunBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Run this text instead of the saved one, or without saving at all
   * @maxLength 1048576
   */
  content?: string;
  /**
   * What to call it when it isn't saved
   * @maxLength 100
   */
  name?: string;
  options?: AnsibleOptions;
  /**
   * A saved playbook
   * @format uuid
   */
  playbook_id?: string;
  selection: AnsibleSelection;
}

export interface StartRunOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  job: Job;
  run: AnsibleRun;
}

export interface Stats {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  booted_at: string;
  /** @format date-time */
  collected_at: string;
  cpu: CPU;
  /** Real filesystems, largest first; pseudo ones (tmpfs, proc, snaps…) are left out */
  disks: Disk[];
  memory: Memory;
  network: Network;
  /**
   * Processes and threads that exist right now
   * @format int64
   */
  processes: number;
  /** @format int64 */
  uptime_seconds: number;
}

export interface StatsProblem {
  detail: string;
  /** The backend keeps trying and the stream resumes on its own; false means it's final */
  retrying: boolean;
  /**
   * What a request would have failed with: 404 no such server, 422 not Linux, 409 host key mismatch, 502 can't connect
   * @format int64
   */
  status: number;
}

export interface Storage {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  auth_method: "password" | "private_key";
  bucket: string;
  capabilities: StorageCapabilities;
  /** @format date-time */
  created_at: string;
  description: string;
  /** What the last good check found, e.g. "3 buckets" */
  detail: string;
  favorite: boolean;
  has_passphrase: boolean;
  has_private_key: boolean;
  /** A password (or S3 secret key) is stored */
  has_secret: boolean;
  /** S3 endpoint or WebDAV URL; host name for FTP and SFTP */
  host: string;
  host_key_fingerprint: string;
  /** @format uuid */
  id: string;
  insecure_tls: boolean;
  /** @format date-time */
  last_checked_at: string | null;
  /** @format int32 */
  latency_ms: number | null;
  name: string;
  path_style: boolean;
  /**
   * 0 = the protocol's default
   * @format int32
   */
  port: number;
  protocol: "s3" | "ftp" | "sftp" | "webdav";
  /** Preset the settings came from (aws, minio, r2, nextcloud…) */
  provider: string;
  /** Refuse every change through Morcheh */
  read_only: boolean;
  region: string;
  /** Folder shown as the top; empty = the login folder (or every bucket) */
  root_path: string;
  status:
    | "unknown"
    | "online"
    | "unreachable"
    | "auth_failed"
    | "host_key_mismatch"
    | "error";
  status_message: string;
  tls: "none" | "explicit" | "implicit";
  /** @format date-time */
  updated_at: string;
  /** Access key for S3 */
  username: string;
  /** @format uuid */
  workspace_id: string;
}

export interface StorageAffectedOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  affected: number;
}

export interface StorageBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * private_key is SFTP only
   * @default "password"
   */
  auth_method?: "password" | "private_key";
  /**
   * S3: stay in one bucket; empty lists every bucket
   * @maxLength 63
   */
  bucket?: string;
  /** On update: forget the stored password / secret key */
  clear_secret?: boolean;
  /** @maxLength 500 */
  description?: string;
  favorite?: boolean;
  /**
   * S3: endpoint URL or host (https unless given); WebDAV: the folder's URL; FTP/SFTP: host name or IP
   * @minLength 1
   * @maxLength 500
   */
  host: string;
  /** Accept any TLS certificate (self-signed). Anyone on the path can then read the traffic */
  insecure_tls?: boolean;
  /**
   * @minLength 1
   * @maxLength 64
   */
  name: string;
  /** @maxLength 1024 */
  passphrase?: string;
  /** S3: endpoint/bucket/key URLs (MinIO and most self-hosted servers) */
  path_style?: boolean;
  /**
   * 0 or left out = the default (21, 990 for implicit FTPS, 22; S3 and WebDAV take it from the URL)
   * @format int32
   * @min 0
   * @max 65535
   */
  port?: number;
  /**
   * On update, leave out to keep the stored one
   * @maxLength 16384
   */
  private_key?: string;
  protocol: "s3" | "ftp" | "sftp" | "webdav";
  /** @maxLength 32 */
  provider?: string;
  read_only?: boolean;
  /** @maxLength 64 */
  region?: string;
  /**
   * Folder to show as the top (S3: bucket/prefix)
   * @maxLength 1024
   */
  root_path?: string;
  /**
   * Password, or S3 secret key. On update, leave out to keep the stored one
   * @maxLength 4096
   */
  secret?: string;
  /**
   * FTP: explicit = AUTH TLS on the normal port, implicit = FTPS (990)
   * @default "none"
   */
  tls?: "none" | "explicit" | "implicit";
  /**
   * S3: access key id. Empty FTP user logs in anonymously
   * @maxLength 256
   */
  username?: string;
}

export interface StorageCapabilities {
  /** Top-level folders are buckets (S3 without a fixed bucket) */
  buckets: boolean;
  /** Downloads resume and media can seek */
  ranges: boolean;
  /** Copies happen on the storage itself */
  server_copy: boolean;
  /** Can make time-limited public download links */
  share_links: boolean;
}

export interface StorageCredentials {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  auth_method: "password" | "private_key";
  host: string;
  /** SFTP: trusted host key in authorized_keys format; empty until the first successful check */
  host_key: string;
  host_key_fingerprint: string;
  /** The private key's passphrase; empty when it has none */
  passphrase: string;
  /**
   * 0 = the protocol's default
   * @format int32
   */
  port: number;
  /** Empty unless auth_method=private_key */
  private_key: string;
  protocol: "s3" | "ftp" | "sftp" | "webdav";
  /** authorized_keys line derived from the private key; empty when it can't be parsed */
  public_key: string;
  public_key_fingerprint: string;
  /** Password, or S3 secret key. Empty unless auth_method=password */
  secret: string;
  /** Access key for S3 */
  username: string;
}

export interface StorageDeleteRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @maxItems 1000
   * @minItems 1
   */
  paths: string[];
}

export interface StorageEntry {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** A top-level folder that is an S3 bucket */
  bucket: boolean;
  content_type: string;
  etag: string;
  /**
   * Unknown for S3 prefixes
   * @format date-time
   */
  modified: string | null;
  name: string;
  /** From the storage's top ("/") */
  path: string;
  /**
   * Bytes; 0 for folders
   * @format int64
   */
  size: number;
  /** S3 storage class (STANDARD, GLACIER…) */
  storage_class: string;
  type: "file" | "dir";
}

export interface StorageFolderSizeResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  files: number;
  /** @format int64 */
  folders: number;
  /** Stopped before the end (too big to count in time) */
  partial: boolean;
  path: string;
  /** @format int64 */
  size: number;
}

export interface StorageListing {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  entries: StorageEntry[];
  /** Empty at the top */
  parent: string;
  path: string;
  /** The folder has more entries than limit */
  truncated: boolean;
}

export interface StorageMkdirRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @minLength 1 */
  path: string;
}

export interface StorageMoveBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Folder to put them in */
  destination: string;
  /**
   * @maxItems 1000
   * @minItems 1
   */
  paths: string[];
}

export interface StorageRenameRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @minLength 1
   * @maxLength 255
   */
  name: string;
  /** @minLength 1 */
  path: string;
}

export interface StorageTestBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * private_key is SFTP only
   * @default "password"
   */
  auth_method?: "password" | "private_key";
  /**
   * S3: stay in one bucket; empty lists every bucket
   * @maxLength 63
   */
  bucket?: string;
  /** On update: forget the stored password / secret key */
  clear_secret?: boolean;
  /**
   * S3: endpoint URL or host (https unless given); WebDAV: the folder's URL; FTP/SFTP: host name or IP
   * @minLength 1
   * @maxLength 500
   */
  host: string;
  /** Accept any TLS certificate (self-signed). Anyone on the path can then read the traffic */
  insecure_tls?: boolean;
  /** @maxLength 1024 */
  passphrase?: string;
  /** S3: endpoint/bucket/key URLs (MinIO and most self-hosted servers) */
  path_style?: boolean;
  /**
   * 0 or left out = the default (21, 990 for implicit FTPS, 22; S3 and WebDAV take it from the URL)
   * @format int32
   * @min 0
   * @max 65535
   */
  port?: number;
  /**
   * On update, leave out to keep the stored one
   * @maxLength 16384
   */
  private_key?: string;
  protocol: "s3" | "ftp" | "sftp" | "webdav";
  /** @maxLength 32 */
  provider?: string;
  /** @maxLength 64 */
  region?: string;
  /**
   * Folder to show as the top (S3: bucket/prefix)
   * @maxLength 1024
   */
  root_path?: string;
  /**
   * Password, or S3 secret key. On update, leave out to keep the stored one
   * @maxLength 4096
   */
  secret?: string;
  /**
   * When editing a saved storage: reuse its stored secrets (for fields left out) and trusted host key
   * @format uuid
   */
  storage_id?: string;
  /**
   * FTP: explicit = AUTH TLS on the normal port, implicit = FTPS (990)
   * @default "none"
   */
  tls?: "none" | "explicit" | "implicit";
  /**
   * S3: access key id. Empty FTP user logs in anonymously
   * @maxLength 256
   */
  username?: string;
}

export interface StorageTestOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  detail: string;
  host_key_fingerprint: string;
  /** @format int32 */
  latency_ms: number;
  message: string;
  status:
    | "online"
    | "unreachable"
    | "auth_failed"
    | "host_key_mismatch"
    | "error";
}

export interface StorageTransferBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  destination: StorageTransferBodyDestinationStruct;
  /** Delete each source once it's copied */
  move?: boolean;
  /** Replace what's already in the destination */
  overwrite?: boolean;
  source: StorageTransferBodySourceStruct;
}

export interface StorageTransferBodyDestinationStruct {
  /** Folder to put them in */
  path: string;
  /** @format uuid */
  server_id?: string;
  /** @format uuid */
  storage_id?: string;
}

export interface StorageTransferBodySourceStruct {
  /**
   * @maxItems 1000
   * @minItems 1
   */
  paths: string[];
  /** @format uuid */
  server_id?: string;
  /** @format uuid */
  storage_id?: string;
}

export interface Subnet {
  /** Empty for the internet */
  cidr: string;
  family: "ipv4" | "ipv6" | "";
  /** Default gateways inside it */
  gateways: string[];
  /** The CIDR; host-only networks (containers) are prefixed with their server's ID */
  id: string;
  /** A default route goes out through it */
  internet: boolean;
  /** internet gathers the public addresses that share no subnet with another server */
  kind: "lan" | "vpn" | "public" | "container" | "internet";
  /** Tailscale, a Docker network's name… */
  label: string;
  members: SubnetMember[];
}

export interface SubnetMember {
  interface: string;
  ip: string;
  /** @format uuid */
  server_id: string;
}

export interface TaskResult {
  /** @format int64 */
  attempts?: number;
  /** The rest of the module's answer */
  data?: any;
  /** Ansible's diff (with --diff) */
  diff?: any;
  /** @format date-time */
  ended_at?: string;
  /** Per loop item */
  items?: ItemResult[];
  msg?: string;
  /** @format int64 */
  rc?: number;
  /** @format date-time */
  started_at: string;
  status:
    | "running"
    | "ok"
    | "changed"
    | "failed"
    | "ignored"
    | "skipped"
    | "unreachable";
  stderr?: string;
  stdout?: string;
}

export interface TerminalSession {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Browser tabs attached right now; 0 means it runs detached
   * @format int64
   */
  clients: number;
  /** @format int64 */
  cols: number;
  /** @format date-time */
  created_at: string;
  /** @format uuid */
  id: string;
  /** @format int64 */
  rows: number;
  title: string;
}

export interface TransferFilesBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @minLength 1 */
  destination: string;
  /**
   * @maxItems 1000
   * @minItems 1
   */
  paths: string[];
}

export interface UnitFile {
  content: string;
  /** A drop-in (.conf in <unit>.d/) rather than the unit file */
  drop_in: boolean;
  path: string;
}

export interface UpdateAppCategoryRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  color?:
    | "slate"
    | "red"
    | "orange"
    | "amber"
    | "green"
    | "teal"
    | "blue"
    | "indigo"
    | "violet"
    | "pink";
  /**
   * @minLength 1
   * @maxLength 64
   */
  name?: string;
}

export interface UpdateCronJobRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  job: CronJobInput;
  /**
   * @format int64
   * @min 0
   */
  line: number;
  /** From the table as last read; a different one answers 409 */
  revision: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  table: string;
}

export interface UpdateDatabaseMonitoringRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  alerts_enabled: boolean;
  muted_checks: string[];
  thresholds: Record<string, DatabaseLimit>;
}

export interface UsageDisk {
  /** @format int64 */
  available: number;
  device: string;
  mount: string;
  /** @format int64 */
  size: number;
  type: string;
  /** @format int64 */
  used: number;
}

export interface UsageEntry {
  /** Filesystem type when this is another filesystem's mount point (its bytes aren't counted here); empty otherwise */
  mount: string;
  name: string;
  path: string;
  /**
   * Bytes on disk
   * @format int64
   */
  size: number;
  type: "file" | "dir" | "symlink" | "other";
}

export interface User {
  /** YYYY-MM-DD, when the account stops working */
  account_expires?: string;
  /** Has a real shell (not nologin or false) */
  can_login: boolean;
  /** The account's expiry date has passed, so it can't log in at all (keys included) */
  expired: boolean;
  /** The first GECOS field */
  full_name: string;
  /** @format int64 */
  gid: number;
  /** Supplementary groups */
  groups: string[];
  home: string;
  home_exists: boolean;
  last_login?: Login;
  /** Locked: the password has a ! in front (it comes back on unlock), or the account expired on 1970-01-02, which also stops key logins */
  locked: boolean;
  /** Has to pick a new password at the next login */
  must_change_password: boolean;
  name: string;
  /** set: has a password; empty: logs in WITHOUT one; unset: can't log in with a password; unknown: /etc/shadow unreadable */
  password: "set" | "empty" | "unset" | "unknown";
  /** YYYY-MM-DD */
  password_changed?: string;
  /** YYYY-MM-DD, when the password has to be changed (from the max age) */
  password_expires?: string;
  primary_group: string;
  /**
   * Logged in right now
   * @format int64
   */
  sessions: number;
  shell: string;
  /**
   * Keys in ~/.ssh/authorized_keys; -1 when it can't be read
   * @format int64
   */
  ssh_keys: number;
  /** full: any command as root; limited: only some commands */
  sudo: "none" | "full" | "limited";
  /** sudo doesn't ask for a password */
  sudo_nopasswd: boolean;
  /** What grants it: group:<name> or a sudoers file */
  sudo_via: string[];
  /** A service account: uid below UID_MIN, or nobody. root is not one */
  system: boolean;
  /** @format int64 */
  uid: number;
}

export interface UserCreateBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * A public key for ~/.ssh/authorized_keys
   * @maxLength 16000
   */
  authorized_key?: string;
  /** Create the home folder (from /etc/skel) */
  create_home: boolean;
  /** @maxLength 200 */
  full_name?: string;
  /**
   * Supplementary groups
   * @maxItems 200
   */
  groups?: string[];
  /**
   * Default /home/<name>
   * @maxLength 500
   */
  home?: string;
  /** Ask for a new password at the first login */
  must_change_password?: boolean;
  /**
   * @minLength 1
   * @maxLength 32
   */
  name: string;
  /**
   * Empty: no password, so it logs in with a key only. Sent hashed (SHA-512) to the server
   * @maxLength 256
   */
  password?: string;
  /**
   * An existing group; default a new group named after the user
   * @maxLength 32
   */
  primary_group?: string;
  /**
   * Default /bin/bash when the server has it, else /bin/sh
   * @maxLength 200
   */
  shell?: string;
  /** @default "none" */
  sudo?: "none" | "password" | "nopasswd";
  /** A service account (uid below UID_MIN) */
  system?: boolean;
  /**
   * Default the next free one
   * @format int64
   * @min 1
   * @max 2147483646
   */
  uid?: number;
}

export interface UserLockBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** true: no logins at all, password or key (the password is kept for unlock) */
  locked: boolean;
  /** With locked: also end their sessions and processes */
  logout?: boolean;
}

export interface UserPasswordBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Ask for a new one at the next login */
  must_change_password?: boolean;
  /**
   * Sent hashed (SHA-512) to the server; also unlocks a locked password
   * @minLength 1
   * @maxLength 256
   */
  password: string;
}

export interface UserUpdateBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** YYYY-MM-DD, or empty for never */
  account_expires?: string;
  /** @maxLength 200 */
  full_name?: string;
  /**
   * The full list of supplementary groups
   * @maxItems 200
   */
  groups?: string[];
  /** @maxLength 500 */
  home?: string;
  /** With home: move the old folder's contents there */
  move_home?: boolean;
  /**
   * Rename (its personal group too)
   * @minLength 1
   * @maxLength 32
   */
  name?: string;
  /** @maxLength 32 */
  primary_group?: string;
  /** @maxLength 200 */
  shell?: string;
  /** none: no sudo; password: every command, asking for the user's password; nopasswd: every command, without asking */
  sudo?: "none" | "password" | "nopasswd";
}

export interface UsersOverview {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Changing accounts needs root or sudo */
  access: "root" | "sudo" | "user";
  /** Account tools found on the server */
  commands: string[];
  groups: Group[];
  /** The server keeps login records (lastlog or wtmp), so last_login means something */
  login_history: boolean;
  /** The account Morcheh logs in as; it can't be deleted, locked, renamed or lose sudo here */
  login_user: string;
  /** Logged in right now (who) */
  sessions: Session[];
  /** /etc/shadow could be read, so password and expiry states are known */
  shadow_readable: boolean;
  /** From /etc/shells */
  shells: string[];
  /** A group (sudo, wheel or admin) whose members get sudo for every command; empty when none does */
  sudo_group: string;
  /** /etc/sudoers reads /etc/sudoers.d, where Morcheh writes its rules */
  sudo_includes_dir: boolean;
  sudo_installed: boolean;
  /** sudoers could be read; otherwise sudo rights are guessed from the sudo/wheel/admin groups */
  sudo_readable: boolean;
  /** Every user rule in sudoers and sudoers.d */
  sudo_rules: Rule[];
  /** shadow: useradd/usermod…; busybox: adduser/addgroup only (no renames, expiry or usermod changes) */
  tools: "shadow" | "busybox" | "none";
  /**
   * First uid of a regular account (UID_MIN in login.defs)
   * @format int64
   */
  uid_min: number;
  users: User[];
  warnings: string[];
}

export interface WorkspaceAccess {
  can_create: boolean;
  /** @format uuid */
  id: string;
  level: string;
}

export interface WorkspaceApp {
  address: string;
  /** @format uuid */
  id: string;
  name: string;
}

export interface WorkspaceAssignBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Services; they leave their category, which belongs to the old workspace. */
  app_ids?: string[];
  server_ids?: string[];
  storage_ids?: string[];
}

export interface WorkspaceBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 500 */
  description?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  name: string;
}

export interface WorkspaceDetail {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Services you can reach here.
   * @format int32
   */
  app_count: number;
  apps: WorkspaceApp[];
  /** You can add servers, storages and services here. */
  can_create: boolean;
  description: string;
  /** @format uuid */
  id: string;
  /** Your level on the whole workspace; none if you only reach some servers, storages or services in it. */
  level: string;
  name: string;
  /** You only reach some servers, storages or services in it. */
  partial: boolean;
  /**
   * Servers you can reach here.
   * @format int32
   */
  server_count: number;
  servers: WorkspaceServer[];
  /**
   * Storages you can reach here.
   * @format int32
   */
  storage_count: number;
  storages: WorkspaceStorage[];
}

export interface WorkspaceListOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: PanelWorkspace[];
}

export interface WorkspaceServer {
  host: string;
  /** @format uuid */
  id: string;
  name: string;
}

export interface WorkspaceStorage {
  /** @format uuid */
  id: string;
  name: string;
  protocol: string;
}

export interface WriteFileRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  content: string;
  create?: boolean;
  /** @format date-time */
  expected_modified?: string;
  /** @minLength 1 */
  path: string;
}

export interface WriteStorageFileRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  content: string;
  create?: boolean;
  /** @format date-time */
  expected_modified?: string;
  /** @minLength 1 */
  path: string;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<T> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data.data;
    });
  };
}

/**
 * @title Morcheh API
 * @version 0.1.0
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  workspaces = {
    /**
     * @description Moved servers leave their folder and moved services their category; both belong to the old workspace.
     *
     * @tags Workspaces
     * @name AssignWorkspace
     * @summary Move servers, storages and services into a workspace
     * @request POST:/workspaces/{id}/assign
     */
    assignWorkspace: (
      id: string,
      data: WorkspaceAssignBody,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorModel>({
        path: `/workspaces/${id}/assign`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Workspaces
     * @name CreateWorkspace
     * @summary Create a workspace
     * @request POST:/workspaces
     */
    createWorkspace: (data: WorkspaceBody, params: RequestParams = {}) =>
      this.request<PanelWorkspace, ErrorModel>({
        path: `/workspaces`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Workspaces
     * @name DeleteGrant
     * @summary Remove access
     * @request DELETE:/grants/{id}
     */
    deleteGrant: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/grants/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Workspaces
     * @name DeleteWorkspace
     * @summary Delete an empty workspace
     * @request DELETE:/workspaces/{id}
     */
    deleteWorkspace: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/workspaces/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Workspaces
     * @name GetWorkspace
     * @summary Get a workspace and what's in it
     * @request GET:/workspaces/{id}
     */
    getWorkspace: (id: string, params: RequestParams = {}) =>
      this.request<WorkspaceDetail, ErrorModel>({
        path: `/workspaces/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Admins can filter by anything. Others must name a workspace, server, storage or service they own.
     *
     * @tags Workspaces
     * @name ListGrants
     * @summary List who has access
     * @request GET:/grants
     */
    listGrants: (
      query?: {
        /** @format uuid */
        app_id?: string;
        /** @format uuid */
        group_id?: string;
        /** @format uuid */
        server_id?: string;
        /** @format uuid */
        storage_id?: string;
        /** @format uuid */
        user_id?: string;
        /** @format uuid */
        workspace_id?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<GrantListOutputBody, ErrorModel>({
        path: `/grants`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Workspaces
     * @name ListPrincipals
     * @summary People and groups you can give access to
     * @request GET:/access/principals
     */
    listPrincipals: (params: RequestParams = {}) =>
      this.request<PrincipalsOutputBody, ErrorModel>({
        path: `/access/principals`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Workspaces
     * @name ListWorkspaces
     * @summary List the workspaces you can open
     * @request GET:/workspaces
     */
    listWorkspaces: (params: RequestParams = {}) =>
      this.request<WorkspaceListOutputBody, ErrorModel>({
        path: `/workspaces`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description One person or group, one workspace, server, storage or service. Admins and the target's Owners can. Only admins decide who may add servers: an Owner passes on at most what they have themselves.
     *
     * @tags Workspaces
     * @name SetGrant
     * @summary Give or change access
     * @request PUT:/grants
     */
    setGrant: (data: GrantBody, params: RequestParams = {}) =>
      this.request<GrantOutputBody, ErrorModel>({
        path: `/grants`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Workspaces
     * @name UpdateWorkspace
     * @summary Rename a workspace
     * @request PATCH:/workspaces/{id}
     */
    updateWorkspace: (
      id: string,
      data: WorkspaceBody,
      params: RequestParams = {},
    ) =>
      this.request<PanelWorkspace, ErrorModel>({
        path: `/workspaces/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  admin = {
    /**
     * No description
     *
     * @tags Admin
     * @name AdminApproveUser
     * @summary Approve someone who signed up
     * @request POST:/admin/users/{id}/approve
     */
    adminApproveUser: (
      id: string,
      data: PanelApproveBody,
      params: RequestParams = {},
    ) =>
      this.request<PanelUser, ErrorModel>({
        path: `/admin/users/${id}/approve`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Signs them out at once, closes their terminals and streams, and cancels their running jobs.
     *
     * @tags Admin
     * @name AdminBlockUser
     * @summary Block a panel user
     * @request POST:/admin/users/{id}/block
     */
    adminBlockUser: (id: string, params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/admin/users/${id}/block`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminCreateGroup
     * @summary Create a group
     * @request POST:/admin/groups
     */
    adminCreateGroup: (data: PanelGroupBody, params: RequestParams = {}) =>
      this.request<PanelGroup, ErrorModel>({
        path: `/admin/groups`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description The password is temporary: they must change it when they first sign in.
     *
     * @tags Admin
     * @name AdminCreateUser
     * @summary Add a panel user
     * @request POST:/admin/users
     */
    adminCreateUser: (data: PanelUserCreateBody, params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/admin/users`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Its members lose the access it gave them.
     *
     * @tags Admin
     * @name AdminDeleteGroup
     * @summary Delete a group
     * @request DELETE:/admin/groups/{id}
     */
    adminDeleteGroup: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/admin/groups/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminDeleteUser
     * @summary Delete a panel user
     * @request DELETE:/admin/users/{id}
     */
    adminDeleteUser: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/admin/users/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminGetSettings
     * @summary Get panel settings
     * @request GET:/admin/settings
     */
    adminGetSettings: (params: RequestParams = {}) =>
      this.request<PanelSettings, ErrorModel>({
        path: `/admin/settings`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminGetUser
     * @summary Get a panel user
     * @request GET:/admin/users/{id}
     */
    adminGetUser: (id: string, params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/admin/users/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminListGroups
     * @summary List groups
     * @request GET:/admin/groups
     */
    adminListGroups: (params: RequestParams = {}) =>
      this.request<PanelGroupListOutputBody, ErrorModel>({
        path: `/admin/groups`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminListUsers
     * @summary List panel users
     * @request GET:/admin/users
     */
    adminListUsers: (
      query?: {
        /** @maxLength 128 */
        q?: string;
        status?: "pending" | "active" | "blocked";
      },
      params: RequestParams = {},
    ) =>
      this.request<PanelUserListOutputBody, ErrorModel>({
        path: `/admin/users`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Deletes the account; they can sign up again while registration is open.
     *
     * @tags Admin
     * @name AdminRejectUser
     * @summary Reject someone who signed up
     * @request POST:/admin/users/{id}/reject
     */
    adminRejectUser: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/admin/users/${id}/reject`,
        method: "POST",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminRevokeSessions
     * @summary Sign someone out everywhere
     * @request POST:/admin/users/{id}/revoke-sessions
     */
    adminRevokeSessions: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/admin/users/${id}/revoke-sessions`,
        method: "POST",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminSetGroupMembers
     * @summary Set a group's members
     * @request PUT:/admin/groups/{id}/members
     */
    adminSetGroupMembers: (
      id: string,
      data: PanelGroupMembersBody,
      params: RequestParams = {},
    ) =>
      this.request<PanelGroup, ErrorModel>({
        path: `/admin/groups/${id}/members`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Signs them out everywhere and closes their terminals; they must pick a new password at next sign-in.
     *
     * @tags Admin
     * @name AdminSetPassword
     * @summary Set a temporary password
     * @request POST:/admin/users/{id}/password
     */
    adminSetPassword: (
      id: string,
      data: PanelPasswordBody,
      params: RequestParams = {},
    ) =>
      this.request<PanelUser, ErrorModel>({
        path: `/admin/users/${id}/password`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminUnblockUser
     * @summary Unblock a panel user
     * @request POST:/admin/users/{id}/unblock
     */
    adminUnblockUser: (id: string, params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/admin/users/${id}/unblock`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminUpdateGroup
     * @summary Rename a group
     * @request PATCH:/admin/groups/{id}
     */
    adminUpdateGroup: (
      id: string,
      data: PanelGroupBody,
      params: RequestParams = {},
    ) =>
      this.request<PanelGroup, ErrorModel>({
        path: `/admin/groups/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminUpdateSettings
     * @summary Change panel settings
     * @request PATCH:/admin/settings
     */
    adminUpdateSettings: (data: PanelSettings, params: RequestParams = {}) =>
      this.request<PanelSettings, ErrorModel>({
        path: `/admin/settings`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminUpdateUser
     * @summary Edit a panel user
     * @request PATCH:/admin/users/{id}
     */
    adminUpdateUser: (
      id: string,
      data: PanelUserUpdateBody,
      params: RequestParams = {},
    ) =>
      this.request<PanelUser, ErrorModel>({
        path: `/admin/users/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  ansible = {
    /**
     * @description A queued run is dropped; a running one stops soon. What it already did on the servers stays done.
     *
     * @tags Ansible
     * @name CancelAnsibleRun
     * @summary Stop a run
     * @request POST:/ansible/runs/{id}/cancel
     */
    cancelAnsibleRun: (id: string, params: RequestParams = {}) =>
      this.request<AnsibleRunDetail, ErrorModel>({
        path: `/ansible/runs/${id}/cancel`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Ansible
     * @name CreatePlaybook
     * @summary Save a new playbook
     * @request POST:/workspaces/{id}/ansible/playbooks
     */
    createPlaybook: (
      id: string,
      data: PlaybookBody,
      params: RequestParams = {},
    ) =>
      this.request<PlaybookDetail, ErrorModel>({
        path: `/workspaces/${id}/ansible/playbooks`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Ansible
     * @name DeleteAnsibleRun
     * @summary Delete a finished run
     * @request DELETE:/ansible/runs/{id}
     */
    deleteAnsibleRun: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/ansible/runs/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Its past runs stay, with the text they ran.
     *
     * @tags Ansible
     * @name DeletePlaybook
     * @summary Delete a playbook
     * @request DELETE:/ansible/playbooks/{id}
     */
    deletePlaybook: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/ansible/playbooks/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Ansible
     * @name GetAnsibleRun
     * @summary Get a run with its output and results
     * @request GET:/ansible/runs/{id}
     */
    getAnsibleRun: (id: string, params: RequestParams = {}) =>
      this.request<AnsibleRunDetail, ErrorModel>({
        path: `/ansible/runs/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Ansible
     * @name GetAnsibleStatus
     * @summary Can playbooks run on this Morcheh?
     * @request GET:/ansible/status
     */
    getAnsibleStatus: (params: RequestParams = {}) =>
      this.request<AnsibleStatus, ErrorModel>({
        path: `/ansible/status`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Ansible
     * @name GetPlaybook
     * @summary Get a playbook
     * @request GET:/ansible/playbooks/{id}
     */
    getPlaybook: (id: string, params: RequestParams = {}) =>
      this.request<PlaybookDetail, ErrorModel>({
        path: `/ansible/playbooks/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Ansible
     * @name ListAnsibleRuns
     * @summary List runs, newest first
     * @request GET:/workspaces/{id}/ansible/runs
     */
    listAnsibleRuns: (
      id: string,
      query?: {
        /**
         * @format int32
         * @min 1
         * @max 200
         * @default 50
         */
        limit?: number;
        /**
         * @format int32
         * @min 0
         */
        offset?: number;
        /** @format uuid */
        playbook_id?: string;
        /** In the playbook's name or who ran it */
        q?: string;
        /** @format uuid */
        server_id?: string;
        state?:
          | "queued"
          | "running"
          | "succeeded"
          | "failed"
          | "canceled"
          | "interrupted";
      },
      params: RequestParams = {},
    ) =>
      this.request<RunListBody, ErrorModel>({
        path: `/workspaces/${id}/ansible/runs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Ansible
     * @name ListPlaybooks
     * @summary List a workspace's playbooks
     * @request GET:/workspaces/{id}/ansible/playbooks
     */
    listPlaybooks: (id: string, params: RequestParams = {}) =>
      this.request<ListPlaybooksResponse, ErrorModel>({
        path: `/workspaces/${id}/ansible/playbooks`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Ansible
     * @name PreviewAnsibleTargets
     * @summary See which servers a selection means
     * @request POST:/workspaces/{id}/ansible/preview
     */
    previewAnsibleTargets: (
      id: string,
      data: PreviewAnsibleTargetsRequest,
      params: RequestParams = {},
    ) =>
      this.request<PreviewAnsibleTargetsResponse, ErrorModel>({
        path: `/workspaces/${id}/ansible/preview`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Queues a background job. You need Owner on every chosen server: a playbook can do anything there, including reading its login.
     *
     * @tags Ansible
     * @name StartAnsibleRun
     * @summary Run a playbook
     * @request POST:/workspaces/{id}/ansible/runs
     */
    startAnsibleRun: (
      id: string,
      data: StartRunBody,
      params: RequestParams = {},
    ) =>
      this.request<StartRunOutputBody, ErrorModel>({
        path: `/workspaces/${id}/ansible/runs`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Server-sent events. `snapshot` is the whole run: on connecting, and last when it ends (state is then final, and the stream closes). In between `output` carries new text and `event` what the callback reported: apply it to plays and recap as GET returns them.
     *
     * @tags Ansible
     * @name StreamAnsibleRun
     * @summary Follow a run
     * @request GET:/ansible/runs/{id}/stream
     */
    streamAnsibleRun: (id: string, params: RequestParams = {}) =>
      this.request<
        (
          | {
              data: RunEvent;
              /** The event name. */
              event: "event";
              /** The event ID. */
              id?: number | string;
              /** The retry time in milliseconds. */
              retry?: number;
            }
          | {
              data: AnsibleOutputChunk;
              /** The event name. */
              event: "output";
              /** The event ID. */
              id?: number | string;
              /** The retry time in milliseconds. */
              retry?: number;
            }
          | {
              data: AnsibleRunDetail;
              /** The event name. */
              event: "snapshot";
              /** The event ID. */
              id?: number | string;
              /** The retry time in milliseconds. */
              retry?: number;
            }
        )[],
        ErrorModel
      >({
        path: `/ansible/runs/${id}/stream`,
        method: "GET",
        ...params,
      }),

    /**
     * @description With revision (its updated_at when you loaded it), answers 409 when someone else saved in between.
     *
     * @tags Ansible
     * @name UpdatePlaybook
     * @summary Save changes to a playbook
     * @request PATCH:/ansible/playbooks/{id}
     */
    updatePlaybook: (
      id: string,
      data: PlaybookUpdate,
      params: RequestParams = {},
    ) =>
      this.request<PlaybookDetail, ErrorModel>({
        path: `/ansible/playbooks/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  apps = {
    /**
     * @description Goes in the open workspace, at the end of its category.
     *
     * @tags apps
     * @name CreateApp
     * @summary Add a service
     * @request POST:/apps
     */
    createApp: (data: AppCreateBody, params: RequestParams = {}) =>
      this.request<App, ErrorModel>({
        path: `/apps`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description It goes last.
     *
     * @tags apps
     * @name CreateAppCategory
     * @summary Add a service category
     * @request POST:/workspaces/{id}/app-categories
     */
    createAppCategory: (
      id: string,
      data: CreateAppCategoryRequest,
      params: RequestParams = {},
    ) =>
      this.request<AppCategory, ErrorModel>({
        path: `/workspaces/${id}/app-categories`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags apps
     * @name DeleteApp
     * @summary Remove a service
     * @request DELETE:/apps/{id}
     */
    deleteApp: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/apps/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Its services stay, uncategorized.
     *
     * @tags apps
     * @name DeleteAppCategory
     * @summary Remove a service category
     * @request DELETE:/workspaces/{id}/app-categories/{categoryId}
     */
    deleteAppCategory: (
      id: string,
      categoryId: string,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorModel>({
        path: `/workspaces/${id}/app-categories/${categoryId}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags apps
     * @name GetApp
     * @summary Get a service
     * @request GET:/apps/{id}
     */
    getApp: (id: string, params: RequestParams = {}) =>
      this.request<App, ErrorModel>({
        path: `/apps/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description The image its logo_kind picks. Use logo_url from the service, which changes with the image.
     *
     * @tags apps
     * @name GetAppLogo
     * @summary A service's logo image
     * @request GET:/apps/{id}/logo
     */
    getAppLogo: (id: string, params: RequestParams = {}) =>
      this.request<Blob, ErrorModel>({
        path: `/apps/${id}/logo`,
        method: "GET",
        format: "blob",
        ...params,
      }),

    /**
     * @description The last 200 reveals, newest first.
     *
     * @tags apps
     * @name ListAppActivity
     * @summary Who revealed this service's passwords
     * @request GET:/apps/{id}/activity
     */
    listAppActivity: (id: string, params: RequestParams = {}) =>
      this.request<AppActivityOutputBody, ErrorModel>({
        path: `/apps/${id}/activity`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description By category, then the order inside it; uncategorized last. q matches the name, address and note.
     *
     * @tags apps
     * @name ListApps
     * @summary List services
     * @request GET:/apps
     */
    listApps: (
      query?: {
        /** @maxLength 200 */
        q?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<AppList, ErrorModel>({
        path: `/apps`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description The raw image (PNG, JPEG, GIF, WebP, ICO or SVG, up to 1 MB); its type is read from the bytes. The service switches to it (logo_kind = upload).
     *
     * @tags apps
     * @name PutAppLogo
     * @summary Upload a service's logo
     * @request PUT:/apps/{id}/logo
     */
    putAppLogo: (id: string, data: File, params: RequestParams = {}) =>
      this.request<App, ErrorModel>({
        path: `/apps/${id}/logo`,
        method: "PUT",
        body: data,
        format: "json",
        ...params,
      }),

    /**
     * @description Waits for it. Only the stored favicon changes; logo_kind stays as it is.
     *
     * @tags apps
     * @name RefetchAppIcon
     * @summary Fetch a service's favicon again
     * @request POST:/apps/{id}/refetch-icon
     */
    refetchAppIcon: (id: string, params: RequestParams = {}) =>
      this.request<App, ErrorModel>({
        path: `/apps/${id}/refetch-icon`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Logged in the service's activity. POST and `Cache-Control: no-store` so nothing caches it.
     *
     * @tags apps
     * @name RevealAppAccount
     * @summary Reveal a service account's password
     * @request POST:/apps/{id}/accounts/{accountId}/reveal
     */
    revealAppAccount: (
      id: string,
      accountId: string,
      params: RequestParams = {},
    ) =>
      this.request<AppSecretOutputBody, ErrorModel>({
        path: `/apps/${id}/accounts/${accountId}/reveal`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Sets the category order and which category each service is in, in what order (position = index). Answers the page as list-apps does.
     *
     * @tags apps
     * @name SetAppsLayout
     * @summary Arrange the Services page
     * @request PUT:/workspaces/{id}/apps/layout
     */
    setAppsLayout: (
      id: string,
      data: AppLayoutBody,
      params: RequestParams = {},
    ) =>
      this.request<AppList, ErrorModel>({
        path: `/workspaces/${id}/apps/layout`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Fields left out stay as they are.
     *
     * @tags apps
     * @name UpdateApp
     * @summary Change a service
     * @request PATCH:/apps/{id}
     */
    updateApp: (id: string, data: AppUpdateBody, params: RequestParams = {}) =>
      this.request<App, ErrorModel>({
        path: `/apps/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags apps
     * @name UpdateAppCategory
     * @summary Rename or recolor a service category
     * @request PATCH:/workspaces/{id}/app-categories/{categoryId}
     */
    updateAppCategory: (
      id: string,
      categoryId: string,
      data: UpdateAppCategoryRequest,
      params: RequestParams = {},
    ) =>
      this.request<AppCategory, ErrorModel>({
        path: `/workspaces/${id}/app-categories/${categoryId}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  auth = {
    /**
     * No description
     *
     * @tags Auth
     * @name AuthLogin
     * @summary Sign in
     * @request POST:/auth/login
     */
    authLogin: (data: AuthLoginBody, params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/auth/login`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name AuthLogout
     * @summary Sign out
     * @request POST:/auth/logout
     */
    authLogout: (params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/auth/logout`,
        method: "POST",
        ...params,
      }),

    /**
     * @description Ends every session of this user and closes their terminals.
     *
     * @tags Auth
     * @name AuthLogoutAll
     * @summary Sign out everywhere
     * @request POST:/auth/logout-all
     */
    authLogoutAll: (params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/auth/logout-all`,
        method: "POST",
        ...params,
      }),

    /**
     * @description Only while an admin has registration open. The account can do nothing until approved.
     *
     * @tags Auth
     * @name AuthRegister
     * @summary Sign up
     * @request POST:/auth/register
     */
    authRegister: (data: PanelSignup, params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/auth/register`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Works only while no user exists.
     *
     * @tags Auth
     * @name AuthSetup
     * @summary Create the first admin
     * @request POST:/auth/setup
     */
    authSetup: (data: AuthSetupBody, params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/auth/setup`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Ends your other sessions and closes your terminals: if the old password leaked, whoever had it is out.
     *
     * @tags Auth
     * @name ChangePassword
     * @summary Change your password
     * @request POST:/auth/password
     */
    changePassword: (data: ChangePasswordBody, params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/auth/password`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GetAuthState
     * @summary What the sign-in page should offer
     * @request GET:/auth/state
     */
    getAuthState: (params: RequestParams = {}) =>
      this.request<AuthState, ErrorModel>({
        path: `/auth/state`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GetMe
     * @summary The signed-in user
     * @request GET:/auth/me
     */
    getMe: (params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/auth/me`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GetMyAccess
     * @summary What the signed-in user can reach
     * @request GET:/auth/access
     */
    getMyAccess: (params: RequestParams = {}) =>
      this.request<MyAccess, ErrorModel>({
        path: `/auth/access`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name UpdateMe
     * @summary Edit your profile
     * @request PATCH:/auth/me
     */
    updateMe: (data: PanelProfile, params: RequestParams = {}) =>
      this.request<PanelUser, ErrorModel>({
        path: `/auth/me`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  databases = {
    /**
     * @description Connects afresh, runs every check and records the result.
     *
     * @tags Databases
     * @name CheckDatabase
     * @summary Check a database now
     * @request POST:/databases/{id}/check
     */
    checkDatabase: (id: string, params: RequestParams = {}) =>
      this.request<Database, ErrorModel>({
        path: `/databases/${id}/check`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Through a server: Engineer on that server; it joins the server's workspace. Direct: Engineer and the right to add in the open workspace. Monitoring starts at once.
     *
     * @tags Databases
     * @name CreateDatabase
     * @summary Add a database
     * @request POST:/databases
     */
    createDatabase: (data: DatabaseBody, params: RequestParams = {}) =>
      this.request<Database, ErrorModel>({
        path: `/databases`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Forgets it in Morcheh with its history and events; nothing on the database itself is touched.
     *
     * @tags Databases
     * @name DeleteDatabase
     * @summary Remove a database
     * @request DELETE:/databases/{id}
     */
    deleteDatabase: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/databases/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Asks the database how it would run the statement, without running it (EXPLAIN without ANALYZE, SHOWPLAN, explain queryPlanner). Not available for Redis.
     *
     * @tags Databases
     * @name ExplainDatabaseQuery
     * @summary Show a query's plan
     * @request POST:/databases/{id}/explain
     */
    explainDatabaseQuery: (
      id: string,
      data: ExplainDatabaseQueryRequest,
      params: RequestParams = {},
    ) =>
      this.request<DatabasePlan, ErrorModel>({
        path: `/databases/${id}/explain`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Databases
     * @name GetDatabase
     * @summary Get a database
     * @request GET:/databases/{id}
     */
    getDatabase: (id: string, params: RequestParams = {}) =>
      this.request<Database, ErrorModel>({
        path: `/databases/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Recorded looks in buckets, this hour compared with yesterday and the usual, and how fast it grows. Kept 30 days.
     *
     * @tags Databases
     * @name GetDatabaseHistory
     * @summary Charts over time
     * @request GET:/databases/{id}/history
     */
    getDatabaseHistory: (
      id: string,
      query?: {
        /** @default "24h" */
        range?: "1h" | "6h" | "24h" | "7d" | "30d";
      },
      params: RequestParams = {},
    ) =>
      this.request<DatabaseHistory, ErrorModel>({
        path: `/databases/${id}/history`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description One look (at most a few seconds old): connections, sessions, queries, sizes, replication. Statement text is empty below Engineer access.
     *
     * @tags Databases
     * @name GetDatabaseLive
     * @summary What the database is doing now
     * @request GET:/databases/{id}/live
     */
    getDatabaseLive: (id: string, params: RequestParams = {}) =>
      this.request<DatabaseLive, ErrorModel>({
        path: `/databases/${id}/live`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description The public address direct connections come from, to allow in the database's firewall. Asked from api.ipify.org (or ifconfig.me) and cached for 10 minutes.
     *
     * @tags Databases
     * @name GetDatabaseOutboundIp
     * @summary Morcheh's outbound address
     * @request GET:/databases/outbound-ip
     */
    getDatabaseOutboundIp: (params: RequestParams = {}) =>
      this.request<DatabaseOutboundIP, ErrorModel>({
        path: `/databases/outbound-ip`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description connection=false cancels what it runs (where the engine can); true closes the connection and rolls back its transaction.
     *
     * @tags Databases
     * @name KillDatabaseSession
     * @summary Stop a session's statement, or close it
     * @request POST:/databases/{id}/kill
     */
    killDatabaseSession: (
      id: string,
      data: KillDatabaseSessionRequest,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorModel>({
        path: `/databases/${id}/kill`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Every check with its default limits.
     *
     * @tags Databases
     * @name ListDatabaseChecks
     * @summary Health checks
     * @request GET:/databases/checks
     */
    listDatabaseChecks: (params: RequestParams = {}) =>
      this.request<DatabaseCheckList, ErrorModel>({
        path: `/databases/checks`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Newest first: checks changing state, restarts, new versions, logins, client addresses and settings. Kept 90 days.
     *
     * @tags Databases
     * @name ListDatabaseEvents
     * @summary What happened to a database
     * @request GET:/databases/{id}/events
     */
    listDatabaseEvents: (
      id: string,
      query?: {
        /**
         * Older than this (the last item's at), for the next page
         * @format date-time
         */
        before?: string;
        /**
         * @format int32
         * @min 1
         * @max 200
         * @default 50
         */
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<DatabaseEventList, ErrorModel>({
        path: `/databases/${id}/events`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Worst health first, then favourites, then by name.
     *
     * @tags Databases
     * @name ListDatabases
     * @summary List databases
     * @request GET:/databases
     */
    listDatabases: (
      query?: {
        /**
         * Only the ones reached through this server
         * @format uuid
         */
        server_id?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DatabaseList, ErrorModel>({
        path: `/databases`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Opens the stored password. POST and `Cache-Control: no-store` so nothing caches it.
     *
     * @tags Databases
     * @name RevealDatabaseCredentials
     * @summary Reveal a database's sign-in
     * @request POST:/databases/{id}/credentials
     */
    revealDatabaseCredentials: (id: string, params: RequestParams = {}) =>
      this.request<DatabaseCredentials, ErrorModel>({
        path: `/databases/${id}/credentials`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Databases
     * @name SetDatabaseFavorite
     * @summary Star or unstar a database
     * @request PUT:/databases/{id}/favorite
     */
    setDatabaseFavorite: (
      id: string,
      data: SetDatabaseFavoriteRequest,
      params: RequestParams = {},
    ) =>
      this.request<Database, ErrorModel>({
        path: `/databases/${id}/favorite`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description A paused database isn't checked, recorded or alerted on; its live view still works.
     *
     * @tags Databases
     * @name SetDatabasePaused
     * @summary Pause or resume monitoring
     * @request PUT:/databases/{id}/paused
     */
    setDatabasePaused: (
      id: string,
      data: SetDatabasePausedRequest,
      params: RequestParams = {},
    ) =>
      this.request<Database, ErrorModel>({
        path: `/databases/${id}/paused`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Connects step by step (name, port, encryption, sign-in, monitoring permissions) without saving anything. The failure is in the result, not the status code.
     *
     * @tags Databases
     * @name TestDatabaseConnection
     * @summary Test database settings
     * @request POST:/databases/test-connection
     */
    testDatabaseConnection: (
      data: DatabaseTestBody,
      params: RequestParams = {},
    ) =>
      this.request<DatabaseTest, ErrorModel>({
        path: `/databases/test-connection`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Replaces the connection settings. A password left out keeps the stored one. Moving it to another address drops an admin's permission for private addresses unless an admin makes the change.
     *
     * @tags Databases
     * @name UpdateDatabase
     * @summary Update a database
     * @request PUT:/databases/{id}
     */
    updateDatabase: (
      id: string,
      data: DatabaseBody,
      params: RequestParams = {},
    ) =>
      this.request<Database, ErrorModel>({
        path: `/databases/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description thresholds replaces every override; a check left out goes back to its default limits.
     *
     * @tags Databases
     * @name UpdateDatabaseMonitoring
     * @summary Change limits, muted checks and alerts
     * @request PUT:/databases/{id}/monitoring
     */
    updateDatabaseMonitoring: (
      id: string,
      data: UpdateDatabaseMonitoringRequest,
      params: RequestParams = {},
    ) =>
      this.request<Database, ErrorModel>({
        path: `/databases/${id}/monitoring`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  folders = {
    /**
     * No description
     *
     * @tags Folders
     * @name CreateFolder
     * @summary Create a folder
     * @request POST:/folders
     */
    createFolder: (data: FolderBody, params: RequestParams = {}) =>
      this.request<Folder, ErrorModel>({
        path: `/folders`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Its servers and subfolders move up to the folder's parent; nothing else is deleted.
     *
     * @tags Folders
     * @name DeleteFolder
     * @summary Delete a folder
     * @request DELETE:/folders/{id}
     */
    deleteFolder: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/folders/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Every folder, flat; build the tree from parent_id.
     *
     * @tags Folders
     * @name ListFolders
     * @summary List folders
     * @request GET:/folders
     */
    listFolders: (params: RequestParams = {}) =>
      this.request<FolderListOutputBody, ErrorModel>({
        path: `/folders`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Folders
     * @name UpdateFolder
     * @summary Rename or move a folder
     * @request PUT:/folders/{id}
     */
    updateFolder: (id: string, data: FolderBody, params: RequestParams = {}) =>
      this.request<Folder, ErrorModel>({
        path: `/folders/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  system = {
    /**
     * No description
     *
     * @tags System
     * @name GetHealth
     * @summary Health check
     * @request GET:/health
     */
    getHealth: (params: RequestParams = {}) =>
      this.request<HealthOutputBody, ErrorModel>({
        path: `/health`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  jobs = {
    /**
     * @description A queued job is dropped at once; a running one stops as soon as it can (its state changes on the stream). 409 when it has already finished, or while progress.locked is true (a package manager running).
     *
     * @tags Jobs
     * @name CancelJob
     * @summary Cancel a job
     * @request POST:/jobs/{id}/cancel
     */
    cancelJob: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/jobs/${id}/cancel`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Jobs
     * @name ClearJobs
     * @summary Remove finished jobs
     * @request DELETE:/jobs
     */
    clearJobs: (
      query?: {
        /**
         * Only jobs touching this server or storage
         * @format uuid
         */
        ref?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ClearJobsResponse, ErrorModel>({
        path: `/jobs`,
        method: "DELETE",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Jobs
     * @name DeleteJob
     * @summary Remove a finished job from the list
     * @request DELETE:/jobs/{id}
     */
    deleteJob: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/jobs/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Jobs
     * @name GetJob
     * @summary Get a job with its log
     * @request GET:/jobs/{id}
     */
    getJob: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/jobs/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Newest first. Finished jobs are kept for 30 days.
     *
     * @tags Jobs
     * @name ListJobs
     * @summary List background jobs
     * @request GET:/jobs
     */
    listJobs: (
      query?: {
        /** Only this kind */
        kind?: string;
        /**
         * @format int32
         * @min 1
         * @max 200
         * @default 50
         */
        limit?: number;
        /**
         * Only jobs touching this server or storage
         * @format uuid
         */
        ref?: string;
        /** @default "all" */
        show?: "all" | "active" | "finished";
      },
      params: RequestParams = {},
    ) =>
      this.request<ListJobsResponse, ErrorModel>({
        path: `/jobs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Queues a new job with the same settings. Checks (like a name already taken) run again when it starts.
     *
     * @tags Jobs
     * @name RetryJob
     * @summary Run a finished job again
     * @request POST:/jobs/{id}/retry
     */
    retryJob: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/jobs/${id}/retry`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Server-sent events: `job` whenever one is queued, makes progress (about twice a second) or finishes; `removed` when one is deleted (empty id: several were, reload the list). Load GET /jobs once connected; the stream only sends changes.
     *
     * @tags Jobs
     * @name StreamJobs
     * @summary Stream job changes
     * @request GET:/jobs/stream
     */
    streamJobs: (params: RequestParams = {}) =>
      this.request<
        (
          | {
              data: Job;
              /** The event name. */
              event: "job";
              /** The event ID. */
              id?: number | string;
              /** The retry time in milliseconds. */
              retry?: number;
            }
          | {
              data: JobRemoved;
              /** The event name. */
              event: "removed";
              /** The event ID. */
              id?: number | string;
              /** The retry time in milliseconds. */
              retry?: number;
            }
        )[],
        ErrorModel
      >({
        path: `/jobs/stream`,
        method: "GET",
        ...params,
      }),
  };
  network = {
    /**
     * @description Each server's interfaces, addresses and default routes (ip over SSH), the subnets they share, and whether each server reaches every other one: a TCP connect to its SSH port and a ping, on their shared LAN/VPN addresses and on the address Morcheh uses. Returns the last scan unless `refresh` is set or there is none; a scan takes a few seconds.
     *
     * @tags Network
     * @name GetNetworkMap
     * @summary Network map of every server
     * @request GET:/network/map
     */
    getNetworkMap: (
      query?: {
        /** Scan again instead of returning the last scan */
        refresh?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<NetworkMap, ErrorModel>({
        path: `/network/map`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Listening TCP and UDP sockets (ss, else netstat), each with the process holding it, its systemd unit, the Docker/Podman container a published port forwards to, and a best guess at the service. Read-only; runs as root through `sudo -n` when that works without a password, else only the login user's processes are named.
     *
     * @tags Network
     * @name ListPorts
     * @summary List open ports
     * @request GET:/servers/{id}/ports
     */
    listPorts: (id: string, params: RequestParams = {}) =>
      this.request<PortsReport, ErrorModel>({
        path: `/servers/${id}/ports`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  cronJobs = {
    /**
     * @description Files already copied stay. 409 when it has finished.
     *
     * @tags Cron jobs
     * @name CancelScheduleRun
     * @summary Stop a run
     * @request POST:/schedule-runs/{id}/cancel
     */
    cancelScheduleRun: (id: string, params: RequestParams = {}) =>
      this.request<ScheduleRun, ErrorModel>({
        path: `/schedule-runs/${id}/cancel`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description You need Engineer on the workspace, Operator on the source and Engineer on every destination. Runs act with your access, checked each time.
     *
     * @tags Cron jobs
     * @name CreateSchedule
     * @summary Create a cron job
     * @request POST:/workspaces/{id}/schedules
     */
    createSchedule: (
      id: string,
      data: ScheduleBody,
      params: RequestParams = {},
    ) =>
      this.request<Schedule, ErrorModel>({
        path: `/workspaces/${id}/schedules`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description A run going now is stopped. Files it already copied stay.
     *
     * @tags Cron jobs
     * @name DeleteSchedule
     * @summary Delete a cron job and its runs
     * @request DELETE:/schedules/{id}
     */
    deleteSchedule: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/schedules/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Cron jobs
     * @name DeleteScheduleRun
     * @summary Delete a finished run's record
     * @request DELETE:/schedule-runs/{id}
     */
    deleteScheduleRun: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/schedule-runs/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Cron jobs
     * @name GetSchedule
     * @summary Get a cron job
     * @request GET:/schedules/{id}
     */
    getSchedule: (id: string, params: RequestParams = {}) =>
      this.request<Schedule, ErrorModel>({
        path: `/schedules/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Cron jobs
     * @name GetScheduleRun
     * @summary Get a run, with each destination's result
     * @request GET:/schedule-runs/{id}
     */
    getScheduleRun: (id: string, params: RequestParams = {}) =>
      this.request<ScheduleRun, ErrorModel>({
        path: `/schedule-runs/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Cron jobs
     * @name ListScheduleRuns
     * @summary List a cron job's runs, newest first
     * @request GET:/schedules/{id}/runs
     */
    listScheduleRuns: (
      id: string,
      query?: {
        /**
         * @format int32
         * @min 1
         * @max 200
         * @default 50
         */
        limit?: number;
        /**
         * @format int32
         * @min 0
         */
        offset?: number;
        state?:
          | "queued"
          | "running"
          | "succeeded"
          | "partial"
          | "failed"
          | "canceled"
          | "interrupted"
          | "skipped";
      },
      params: RequestParams = {},
    ) =>
      this.request<RunListBody1, ErrorModel>({
        path: `/schedules/${id}/runs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Cron jobs
     * @name ListSchedules
     * @summary List a workspace's cron jobs
     * @request GET:/workspaces/{id}/schedules
     */
    listSchedules: (
      id: string,
      query?: {
        /**
         * Only those using this server
         * @format uuid
         */
        server_id?: string;
        /**
         * Only those using this storage
         * @format uuid
         */
        storage_id?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ScheduleListBody, ErrorModel>({
        path: `/workspaces/${id}/schedules`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Cron jobs
     * @name PreviewSchedule
     * @summary Check a cron expression and see when it would run
     * @request POST:/schedules/preview
     */
    previewSchedule: (
      data: PreviewScheduleRequest,
      params: RequestParams = {},
    ) =>
      this.request<PreviewScheduleResponse, ErrorModel>({
        path: `/schedules/preview`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Queues a background job, with the access of the person who saved the job. dry_run counts what would change and changes nothing. 409 while a run is going.
     *
     * @tags Cron jobs
     * @name RunSchedule
     * @summary Run a cron job now
     * @request POST:/schedules/{id}/run
     */
    runSchedule: (
      id: string,
      data: RunScheduleRequest,
      params: RequestParams = {},
    ) =>
      this.request<RunOutputBody, ErrorModel>({
        path: `/schedules/${id}/run`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description A run already going isn't stopped. Resuming doesn't make up for runs missed while paused.
     *
     * @tags Cron jobs
     * @name SetScheduleEnabled
     * @summary Pause or resume a cron job
     * @request POST:/schedules/{id}/enabled
     */
    setScheduleEnabled: (
      id: string,
      data: SetScheduleEnabledRequest,
      params: RequestParams = {},
    ) =>
      this.request<Schedule, ErrorModel>({
        path: `/schedules/${id}/enabled`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description The whole job is sent. From now on it runs with your access. With revision, answers 409 when someone else saved in between.
     *
     * @tags Cron jobs
     * @name UpdateSchedule
     * @summary Save changes to a cron job
     * @request PATCH:/schedules/{id}
     */
    updateSchedule: (
      id: string,
      data: ScheduleUpdate,
      params: RequestParams = {},
    ) =>
      this.request<Schedule, ErrorModel>({
        path: `/schedules/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  servers = {
    /**
     * @description Runs connection checks in parallel and returns the updated servers.
     *
     * @tags Servers
     * @name BulkCheckServers
     * @summary Check several servers
     * @request POST:/servers/bulk/check
     */
    bulkCheckServers: (data: IDsBody, params: RequestParams = {}) =>
      this.request<ServerItemsOutputBody, ErrorModel>({
        path: `/servers/bulk/check`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Servers
     * @name BulkDeleteServers
     * @summary Delete several servers
     * @request POST:/servers/bulk/delete
     */
    bulkDeleteServers: (data: IDsBody, params: RequestParams = {}) =>
      this.request<AffectedOutputBody, ErrorModel>({
        path: `/servers/bulk/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Servers
     * @name BulkMoveServers
     * @summary Move servers to a folder
     * @request POST:/servers/bulk/move
     */
    bulkMoveServers: (
      data: BulkMoveServersRequest,
      params: RequestParams = {},
    ) =>
      this.request<AffectedOutputBody, ErrorModel>({
        path: `/servers/bulk/move`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Servers
     * @name BulkTagServers
     * @summary Add or remove tags on servers
     * @request POST:/servers/bulk/tags
     */
    bulkTagServers: (data: BulkTagServersRequest, params: RequestParams = {}) =>
      this.request<AffectedOutputBody, ErrorModel>({
        path: `/servers/bulk/tags`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Connects over SSH, records the status and detects the OS. The first successful check trusts the host key; pass trust_new_host_key after a legitimate key change.
     *
     * @tags Servers
     * @name CheckServer
     * @summary Check a server's connection
     * @request POST:/servers/{id}/check
     */
    checkServer: (
      id: string,
      query?: {
        /** Forget the trusted host key and trust the one the server presents now */
        trust_new_host_key?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Server, ErrorModel>({
        path: `/servers/${id}/check`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Servers
     * @name CreateServer
     * @summary Add a server
     * @request POST:/servers
     */
    createServer: (data: ServerBody, params: RequestParams = {}) =>
      this.request<Server, ErrorModel>({
        path: `/servers`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Servers
     * @name DeleteServer
     * @summary Delete a server
     * @request DELETE:/servers/{id}
     */
    deleteServer: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/servers/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Copies the server's settings and credentials under a new name ("web-01 copy"). Status, OS and host key start fresh.
     *
     * @tags Servers
     * @name DuplicateServer
     * @summary Duplicate a server
     * @request POST:/servers/{id}/duplicate
     */
    duplicateServer: (id: string, params: RequestParams = {}) =>
      this.request<Server, ErrorModel>({
        path: `/servers/${id}/duplicate`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Servers
     * @name GetServer
     * @summary Get a server
     * @request GET:/servers/{id}
     */
    getServer: (id: string, params: RequestParams = {}) =>
      this.request<Server, ErrorModel>({
        path: `/servers/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Totals and per-value counts (OS, status, tags) over all servers, for filter menus.
     *
     * @tags Servers
     * @name GetServerFacets
     * @summary Counts for the server filters
     * @request GET:/servers/facets
     */
    getServerFacets: (params: RequestParams = {}) =>
      this.request<FacetsOutputBody, ErrorModel>({
        path: `/servers/facets`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Uptime, CPU, memory, disks and network, read from /proc and df over SSH. CPU and network are sampled over one second, so the request takes about that long. Linux only (422 elsewhere). For a live view use the stream.
     *
     * @tags Servers
     * @name GetServerStats
     * @summary Live resource usage
     * @request GET:/servers/{id}/stats
     */
    getServerStats: (id: string, params: RequestParams = {}) =>
      this.request<Stats, ErrorModel>({
        path: `/servers/${id}/stats`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Search, filter, sort and page servers. Filters combine with AND; several values of one filter combine with OR.
     *
     * @tags Servers
     * @name ListServers
     * @summary List servers
     * @request GET:/servers
     */
    listServers: (
      query?: {
        auth?: ("password" | "private_key")[];
        /** Only favourites */
        favorites?: boolean;
        /** A folder id (subfolders included), or 'none' for servers outside every folder */
        folder?: string;
        /**
         * @format int32
         * @min 1
         * @max 500
         * @default 50
         */
        limit?: number;
        /**
         * @format int32
         * @min 0
         * @default 0
         */
        offset?: number;
        /** @default "asc" */
        order?: "asc" | "desc";
        /** OS ids from the facets (ubuntu, debian…, 'unknown' for undetected) */
        os?: string[];
        /**
         * Case-insensitive match on name, host, hostname or description, or an exact tag
         * @maxLength 200
         */
        q?: string;
        /** @default "name" */
        sort?: "name" | "host" | "os" | "status" | "last_checked" | "created";
        status?: (
          | "unknown"
          | "online"
          | "unreachable"
          | "auth_failed"
          | "host_key_mismatch"
          | "error"
        )[];
        /** Servers with any of these tags */
        tag?: string[];
      },
      params: RequestParams = {},
    ) =>
      this.request<ServerListOutputBody, ErrorModel>({
        path: `/servers`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Opens the stored secrets of the chosen auth method. POST and `Cache-Control: no-store` so nothing caches them.
     *
     * @tags Servers
     * @name RevealServerCredentials
     * @summary Reveal a server's SSH credentials
     * @request POST:/servers/{id}/credentials
     */
    revealServerCredentials: (id: string, params: RequestParams = {}) =>
      this.request<ServerCredentials, ErrorModel>({
        path: `/servers/${id}/credentials`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Servers
     * @name SetServerFavorite
     * @summary Star or unstar a server
     * @request PUT:/servers/{id}/favorite
     */
    setServerFavorite: (
      id: string,
      data: SetServerFavoriteRequest,
      params: RequestParams = {},
    ) =>
      this.request<Server, ErrorModel>({
        path: `/servers/${id}/favorite`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Server-sent events: `stats` every second, `problem` while they can't be read. One script runs on the server however many clients watch; a new client gets the latest event at once.
     *
     * @tags Servers
     * @name StreamServerStats
     * @summary Stream live resource usage
     * @request GET:/servers/{id}/stats/stream
     */
    streamServerStats: (id: string, params: RequestParams = {}) =>
      this.request<
        (
          | {
              data: StatsProblem;
              /** The event name. */
              event: "problem";
              /** The event ID. */
              id?: number | string;
              /** The retry time in milliseconds. */
              retry?: number;
            }
          | {
              data: Stats;
              /** The event name. */
              event: "stats";
              /** The event ID. */
              id?: number | string;
              /** The retry time in milliseconds. */
              retry?: number;
            }
        )[],
        ErrorModel
      >({
        path: `/servers/${id}/stats/stream`,
        method: "GET",
        ...params,
      }),

    /**
     * @description Connects with the given settings without saving anything, and reports what it found.
     *
     * @tags Servers
     * @name TestServerConnection
     * @summary Test SSH connection settings
     * @request POST:/servers/test-connection
     */
    testServerConnection: (
      data: ConnectionTestBody,
      params: RequestParams = {},
    ) =>
      this.request<ConnectionTestOutputBody, ErrorModel>({
        path: `/servers/test-connection`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Replaces the editable fields. Secrets left out keep their stored values. Changing host or port forgets the trusted host key.
     *
     * @tags Servers
     * @name UpdateServer
     * @summary Update a server
     * @request PUT:/servers/{id}
     */
    updateServer: (id: string, data: ServerBody, params: RequestParams = {}) =>
      this.request<Server, ErrorModel>({
        path: `/servers/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  cron = {
    /**
     * @description Appends to the table, creating a user's crontab if it has none.
     *
     * @tags Cron
     * @name AddCronJob
     * @summary Add a job
     * @request POST:/servers/{id}/cron/jobs
     */
    addCronJob: (
      id: string,
      data: AddCronJobRequest,
      params: RequestParams = {},
    ) =>
      this.request<CronTable, ErrorModel>({
        path: `/servers/${id}/cron/jobs`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Read from the journal or the syslog files; reading them usually needs root or sudo.
     *
     * @tags Cron
     * @name CronHistory
     * @summary Recent cron runs
     * @request GET:/servers/{id}/cron/history
     */
    cronHistory: (id: string, params: RequestParams = {}) =>
      this.request<CronHistory, ErrorModel>({
        path: `/servers/${id}/cron/history`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description `run` starts the timer's service now without waiting for it. Needs root or sudo.
     *
     * @tags Cron
     * @name CronTimerAction
     * @summary Run, enable or disable a systemd timer
     * @request POST:/servers/{id}/cron/timers/action
     */
    cronTimerAction: (
      id: string,
      data: CronTimerActionRequest,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorModel>({
        path: `/servers/${id}/cron/timers/action`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Removes the jobs at these lines of one table, with their name comments.
     *
     * @tags Cron
     * @name DeleteCronJobs
     * @summary Delete jobs
     * @request POST:/servers/{id}/cron/jobs/delete
     */
    deleteCronJobs: (
      id: string,
      data: DeleteCronJobsRequest,
      params: RequestParams = {},
    ) =>
      this.request<CronTable, ErrorModel>({
        path: `/servers/${id}/cron/jobs/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description A turned-off job stays in the table, commented out.
     *
     * @tags Cron
     * @name EnableCronJobs
     * @summary Turn jobs on or off
     * @request POST:/servers/{id}/cron/jobs/enable
     */
    enableCronJobs: (
      id: string,
      data: EnableCronJobsRequest,
      params: RequestParams = {},
    ) =>
      this.request<CronTable, ErrorModel>({
        path: `/servers/${id}/cron/jobs/enable`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description User crontabs, /etc/crontab and /etc/cron.d, systemd timers and periodic scripts. With root or sudo every user's crontab is read; otherwise only the login user's.
     *
     * @tags Cron
     * @name GetCron
     * @summary Every scheduled job on a server
     * @request GET:/servers/{id}/cron
     */
    getCron: (id: string, params: RequestParams = {}) =>
      this.request<CronOverview, ErrorModel>({
        path: `/servers/${id}/cron`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Runs it the way cron would: as the job's user, from its home folder, with a bare environment (the table's variables, PATH=/usr/bin:/bin by default) and `%` read as cron reads it. Waits for it to finish.
     *
     * @tags Cron
     * @name RunCronCommand
     * @summary Run a job's command now
     * @request POST:/servers/{id}/cron/run
     */
    runCronCommand: (
      id: string,
      data: CronRunBody,
      params: RequestParams = {},
    ) =>
      this.request<CronRunResult, ErrorModel>({
        path: `/servers/${id}/cron/run`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Every line must be a job, a variable, a comment or blank.
     *
     * @tags Cron
     * @name SaveCrontab
     * @summary Replace a table's text
     * @request PUT:/servers/{id}/cron/tables
     */
    saveCrontab: (
      id: string,
      data: SaveCrontabRequest,
      params: RequestParams = {},
    ) =>
      this.request<CronTable, ErrorModel>({
        path: `/servers/${id}/cron/tables`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Cron
     * @name UpdateCronJob
     * @summary Change a job
     * @request PUT:/servers/{id}/cron/jobs
     */
    updateCronJob: (
      id: string,
      data: UpdateCronJobRequest,
      params: RequestParams = {},
    ) =>
      this.request<CronTable, ErrorModel>({
        path: `/servers/${id}/cron/jobs`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  files = {
    /**
     * No description
     *
     * @tags Files
     * @name ChmodFiles
     * @summary Change permissions
     * @request POST:/servers/{id}/files/chmod
     */
    chmodFiles: (
      id: string,
      data: ChmodFilesRequest,
      params: RequestParams = {},
    ) =>
      this.request<AffectedOutputBody, ErrorModel>({
        path: `/servers/${id}/files/chmod`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Runs `chown`, so it usually needs a root login.
     *
     * @tags Files
     * @name ChownFiles
     * @summary Change owner and group
     * @request POST:/servers/{id}/files/chown
     */
    chownFiles: (
      id: string,
      data: ChownFilesRequest,
      params: RequestParams = {},
    ) =>
      this.request<AffectedOutputBody, ErrorModel>({
        path: `/servers/${id}/files/chown`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description All paths must be in one folder. The archive goes next to them unless destination is given; an existing name gets a number. Runs as a background job (kind `compress`, result FileEntry of the archive).
     *
     * @tags Files
     * @name CompressFiles
     * @summary Pack files into an archive
     * @request POST:/servers/{id}/files/compress
     */
    compressFiles: (
      id: string,
      data: CompressFilesRequest,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/servers/${id}/files/compress`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Copies with `cp -a` (keeps permissions and times). Copying into the same folder makes "name copy", "name copy 2"…; elsewhere an existing name is 409. Runs as a background job (kind `copy`, result StorageTransferResult).
     *
     * @tags Files
     * @name CopyFiles
     * @summary Copy files into a folder
     * @request POST:/servers/{id}/files/copy
     */
    copyFiles: (
      id: string,
      data: TransferFilesBody,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/servers/${id}/files/copy`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Folders are deleted with everything in them. `/` is refused.
     *
     * @tags Files
     * @name DeleteFiles
     * @summary Delete files and folders
     * @request POST:/servers/{id}/files/delete
     */
    deleteFiles: (
      id: string,
      data: FilePathsBody,
      params: RequestParams = {},
    ) =>
      this.request<AffectedOutputBody, ErrorModel>({
        path: `/servers/${id}/files/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Runs `du -x` one level deep (as root when the login user can) and `df` for the filesystem. Stays on path's filesystem: other disks mounted below it are flagged, not counted. Big trees can take minutes.
     *
     * @tags Files
     * @name DiskUsage
     * @summary What takes the space in a folder
     * @request GET:/servers/{id}/files/usage
     */
    diskUsage: (
      id: string,
      query?: {
        /** Absolute path; empty, ~ or a relative path are taken from the home directory */
        path?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DiskUsage, ErrorModel>({
        path: `/servers/${id}/files/usage`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description One file streams as itself (with Range support). Several paths, or a folder, stream as one zip. `inline` shows images, media, PDFs and plain text in the browser instead of saving them.
     *
     * @tags Files
     * @name DownloadFiles
     * @summary Download files
     * @request GET:/servers/{id}/files/download
     */
    downloadFiles: (
      id: string,
      query: {
        /** Show in the browser instead of saving (images, media, PDF, plain text only) */
        inline?: boolean;
        /** File name for a zip of several paths */
        name?: string;
        /**
         * Repeat for several files
         * @minItems 1
         */
        path: string[];
      },
      params: RequestParams = {},
    ) =>
      this.request<Blob, ErrorModel>({
        path: `/servers/${id}/files/download`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * @description Handles .tar, .tar.gz/.tgz, .tar.bz2, .tar.xz, .zip and .gz with the server's tar, unzip and gzip. Existing files are overwritten. Runs as a background job (kind `extract`, result ExtractResult).
     *
     * @tags Files
     * @name ExtractArchive
     * @summary Unpack an archive
     * @request POST:/servers/{id}/files/extract
     */
    extractArchive: (
      id: string,
      data: ExtractArchiveRequest,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/servers/${id}/files/extract`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description The server downloads it itself with curl (or wget), so it never passes through Morcheh or the browser. Only http and https. It's written to a hidden .part file and renamed when complete. Runs as a background job (kind `fetch`, result FileEntry); 409 when the name is taken and overwrite isn't set.
     *
     * @tags Files
     * @name FetchUrl
     * @summary Download a file from the web onto the server
     * @request POST:/servers/{id}/files/fetch
     */
    fetchUrl: (id: string, data: FetchBody, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/servers/${id}/files/fetch`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Runs `du` on the server; unreadable subfolders are left out of the total.
     *
     * @tags Files
     * @name FolderSize
     * @summary Total size of a folder
     * @request GET:/servers/{id}/files/size
     */
    folderSize: (
      id: string,
      query?: {
        /** Absolute path; empty, ~ or a relative path are taken from the home directory */
        path?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<FolderSize, ErrorModel>({
        path: `/servers/${id}/files/size`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Over SFTP, as the server's login user. Symlinks report what they point to.
     *
     * @tags Files
     * @name ListFiles
     * @summary List a folder
     * @request GET:/servers/{id}/files
     */
    listFiles: (
      id: string,
      query?: {
        /** Absolute path; empty, ~ or a relative path are taken from the home directory */
        path?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DirListing, ErrorModel>({
        path: `/servers/${id}/files`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Creates missing parents too.
     *
     * @tags Files
     * @name MakeFolder
     * @summary Create a folder
     * @request POST:/servers/{id}/files/mkdir
     */
    makeFolder: (
      id: string,
      data: MakeFolderRequest,
      params: RequestParams = {},
    ) =>
      this.request<FileEntry, ErrorModel>({
        path: `/servers/${id}/files/mkdir`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Nothing moves if any name already exists in the destination (409); 422 when they're already there. Runs as a background job (kind `move`) that starts at once: a rename takes no time. Between filesystems it's `mv`, which can take long.
     *
     * @tags Files
     * @name MoveFiles
     * @summary Move files into a folder
     * @request POST:/servers/{id}/files/move
     */
    moveFiles: (
      id: string,
      data: TransferFilesBody,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/servers/${id}/files/move`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description For the editor: UTF-8 text up to 5 MB. Bigger files are 413, binary ones 415.
     *
     * @tags Files
     * @name ReadFile
     * @summary Read a text file
     * @request GET:/servers/{id}/files/content
     */
    readFile: (
      id: string,
      query?: {
        /** Absolute path; empty, ~ or a relative path are taken from the home directory */
        path?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<FileContent, ErrorModel>({
        path: `/servers/${id}/files/content`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Refuses to replace an existing entry.
     *
     * @tags Files
     * @name RenameFile
     * @summary Rename or move one file or folder
     * @request POST:/servers/{id}/files/rename
     */
    renameFile: (
      id: string,
      data: RenameFileRequest,
      params: RequestParams = {},
    ) =>
      this.request<FileEntry, ErrorModel>({
        path: `/servers/${id}/files/rename`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Case-insensitive name match anywhere under path (skipping /proc, /sys, /dev and /run), up to 200 results.
     *
     * @tags Files
     * @name SearchFiles
     * @summary Find files by name
     * @request GET:/servers/{id}/files/search
     */
    searchFiles: (
      id: string,
      query?: {
        /** Absolute path; empty, ~ or a relative path are taken from the home directory */
        path?: string;
        /**
         * Part of the name; * and ? work as wildcards
         * @minLength 1
         * @maxLength 200
         */
        q?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SearchResult, ErrorModel>({
        path: `/servers/${id}/files/search`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Files
     * @name StatFile
     * @summary Details of one file or folder
     * @request GET:/servers/{id}/files/stat
     */
    statFile: (
      id: string,
      query?: {
        /** Absolute path; empty, ~ or a relative path are taken from the home directory */
        path?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<FileEntry, ErrorModel>({
        path: `/servers/${id}/files/stat`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description The raw body is the file. It is written next to the destination first and renamed into place once complete, so a broken upload never leaves half a file. Missing parent folders are created (for folder uploads). An existing file is 409 unless overwrite is set.
     *
     * @tags Files
     * @name UploadFile
     * @summary Upload a file
     * @request PUT:/servers/{id}/files/upload
     */
    uploadFile: (
      id: string,
      query: {
        /** Replace an existing file */
        overwrite?: boolean;
        /** Destination, including the file name */
        path: string;
      },
      data: File,
      params: RequestParams = {},
    ) =>
      this.request<FileEntry, ErrorModel>({
        path: `/servers/${id}/files/upload`,
        method: "PUT",
        query: query,
        body: data,
        format: "json",
        ...params,
      }),

    /**
     * @description Overwrites the file in place, keeping its owner and permissions. With expected_modified, refuses (409) if the file changed since it was read. With create, makes a new file and refuses if one exists.
     *
     * @tags Files
     * @name WriteFile
     * @summary Save a text file
     * @request PUT:/servers/{id}/files/content
     */
    writeFile: (
      id: string,
      data: WriteFileRequest,
      params: RequestParams = {},
    ) =>
      this.request<FileEntry, ErrorModel>({
        path: `/servers/${id}/files/content`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  users = {
    /**
     * No description
     *
     * @tags Users
     * @name CreateGroup
     * @summary Add a group
     * @request POST:/servers/{id}/groups
     */
    createGroup: (
      id: string,
      data: GroupCreateBody,
      params: RequestParams = {},
    ) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/groups`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description useradd (or BusyBox adduser), then the password, sudo level and SSH key. Answers the fresh overview.
     *
     * @tags Users
     * @name CreateUser
     * @summary Add an account
     * @request POST:/servers/{id}/users
     */
    createUser: (
      id: string,
      data: UserCreateBody,
      params: RequestParams = {},
    ) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/users`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Refused while it is an account's primary group.
     *
     * @tags Users
     * @name DeleteGroup
     * @summary Remove a group
     * @request DELETE:/servers/{id}/groups/{group}
     */
    deleteGroup: (id: string, group: string, params: RequestParams = {}) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/groups/${group}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description userdel (or deluser), and its Morcheh sudo rule. The login user and root can't be removed.
     *
     * @tags Users
     * @name DeleteUser
     * @summary Remove an account
     * @request DELETE:/servers/{id}/users/{user}
     */
    deleteUser: (
      id: string,
      user: string,
      query?: {
        /** End its processes first (else a logged-in account can't be removed) */
        force?: boolean;
        /** Also delete the home folder and mail spool */
        remove_home?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/users/${user}`,
        method: "DELETE",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Every account in /etc/passwd with its groups, password and expiry state (from /etc/shadow), sudo rights (from sudoers), last login and current sessions; every group; and the sudoers rules.
     *
     * @tags Users
     * @name GetUsers
     * @summary Accounts and groups on a server
     * @request GET:/servers/{id}/users
     */
    getUsers: (id: string, params: RequestParams = {}) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/users`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Locking puts ! in front of the password and expires the account (1970-01-02), which also stops SSH key logins. Unlocking undoes both and keeps the old password.
     *
     * @tags Users
     * @name LockUser
     * @summary Lock or unlock an account
     * @request POST:/servers/{id}/users/{user}/lock
     */
    lockUser: (
      id: string,
      user: string,
      data: UserLockBody,
      params: RequestParams = {},
    ) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/users/${user}/lock`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description loginctl terminate-user where systemd runs, then kills every process the account owns.
     *
     * @tags Users
     * @name LogoutUser
     * @summary End an account's sessions
     * @request POST:/servers/{id}/users/{user}/logout
     */
    logoutUser: (id: string, user: string, params: RequestParams = {}) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/users/${user}/logout`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Hashed here (SHA-512 crypt) and written with chpasswd -e, so the plain password never reaches the server.
     *
     * @tags Users
     * @name SetUserPassword
     * @summary Set an account's password
     * @request POST:/servers/{id}/users/{user}/password
     */
    setUserPassword: (
      id: string,
      user: string,
      data: UserPasswordBody,
      params: RequestParams = {},
    ) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/users/${user}/password`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name UpdateGroup
     * @summary Rename a group or set its members
     * @request PATCH:/servers/{id}/groups/{group}
     */
    updateGroup: (
      id: string,
      group: string,
      data: GroupUpdateBody,
      params: RequestParams = {},
    ) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/groups/${group}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Only the fields sent change. sudo rewrites how the account gets sudo: the sudo group, or a rule in /etc/sudoers.d/morcheh-<name>; its own rules elsewhere are commented out. Every sudoers change is checked with visudo and put back when it fails.
     *
     * @tags Users
     * @name UpdateUser
     * @summary Change an account
     * @request PATCH:/servers/{id}/users/{user}
     */
    updateUser: (
      id: string,
      user: string,
      data: UserUpdateBody,
      params: RequestParams = {},
    ) =>
      this.request<UsersOverview, ErrorModel>({
        path: `/servers/${id}/users/${user}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  power = {
    /**
     * @description Runs `shutdown -c` and answers the power state after it.
     *
     * @tags Power
     * @name CancelPower
     * @summary Cancel a scheduled reboot or shutdown
     * @request DELETE:/servers/{id}/power/schedule
     */
    cancelPower: (id: string, params: RequestParams = {}) =>
      this.request<PowerOverview, ErrorModel>({
        path: `/servers/${id}/power/schedule`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description Boot time, init system, logged-in sessions, whether a reboot is waiting (reboot-required, needs-restarting, a removed running kernel) and a pending scheduled reboot or shutdown.
     *
     * @tags Power
     * @name GetPower
     * @summary Power state
     * @request GET:/servers/{id}/power
     */
    getPower: (id: string, params: RequestParams = {}) =>
      this.request<PowerOverview, ErrorModel>({
        path: `/servers/${id}/power`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Now (the command runs detached a couple of seconds later, so the answer gets back first) or in `delay_minutes` (systemd's shutdown, cancellable). Needs root or sudo. Poll the server's check until `boot_time` is later than the one answered here to know it's back.
     *
     * @tags Power
     * @name PowerAction
     * @summary Reboot or shut down
     * @request POST:/servers/{id}/power
     */
    powerAction: (
      id: string,
      data: PowerActionBody,
      params: RequestParams = {},
    ) =>
      this.request<PowerActionResult, ErrorModel>({
        path: `/servers/${id}/power`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  security = {
    /**
     * @description Removes the jail's section from jail.local: a jail defined elsewhere goes back to its shipped settings, a custom one is gone.
     *
     * @tags Security
     * @name DeleteFail2BanJail
     * @summary Reset or delete a jail
     * @request DELETE:/servers/{id}/security/fail2ban/jails/{jail}
     */
    deleteFail2BanJail: (
      id: string,
      jail: string,
      query?: {
        /** jail.local's revision as last read */
        revision?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Fail2BanOverview, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/jails/${jail}`,
        method: "DELETE",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Security
     * @name Fail2BanBan
     * @summary Ban an address in a jail
     * @request POST:/servers/{id}/security/fail2ban/ban
     */
    fail2BanBan: (
      id: string,
      data: Fail2BanBanBody,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/ban`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description From its log target: a file, else the journal.
     *
     * @tags Security
     * @name Fail2BanLog
     * @summary Fail2ban's recent log and ban activity
     * @request GET:/servers/{id}/security/fail2ban/log
     */
    fail2BanLog: (
      id: string,
      query?: {
        /**
         * @format int64
         * @min 10
         * @max 5000
         * @default 500
         */
        lines?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<Fail2BanLog, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/log`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Security
     * @name Fail2BanService
     * @summary Start, stop, restart or reload fail2ban, or set it to start at boot
     * @request POST:/servers/{id}/security/fail2ban/service
     */
    fail2BanService: (
      id: string,
      data: Fail2BanServiceBody,
      params: RequestParams = {},
    ) =>
      this.request<Fail2BanTask, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/service`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Security
     * @name Fail2BanUnban
     * @summary Lift a ban, in one jail or all
     * @request POST:/servers/{id}/security/fail2ban/unban
     */
    fail2BanUnban: (
      id: string,
      data: Fail2BanBanBody,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/unban`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Whether it's installed and running, the effective configuration of every jail (merged from jail.conf, jail.d and jail.local), live counts and banned addresses for the active ones, and jail.local itself.
     *
     * @tags Security
     * @name GetFail2Ban
     * @summary Fail2ban on a server
     * @request GET:/servers/{id}/security/fail2ban
     */
    getFail2Ban: (id: string, params: RequestParams = {}) =>
      this.request<Fail2BanOverview, ErrorModel>({
        path: `/servers/${id}/security/fail2ban`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Security
     * @name GetFail2BanFilter
     * @summary A filter's definition
     * @request GET:/servers/{id}/security/fail2ban/filters/{filter}
     */
    getFail2BanFilter: (
      id: string,
      filter: string,
      params: RequestParams = {},
    ) =>
      this.request<Fail2BanFilter, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/filters/${filter}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description With the server's package manager (EPEL on RHEL-likes), then starts it and enables it at boot. Checked at once, then runs as a background job (kind `fail2ban-install`); it can't be canceled once the package manager is running. 409 when an install or removal is already under way.
     *
     * @tags Security
     * @name InstallFail2Ban
     * @summary Install fail2ban
     * @request POST:/servers/{id}/security/fail2ban/install
     */
    installFail2Ban: (
      id: string,
      data: Fail2BanInstallBody,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/install`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description The whole file as text; checked and reloaded like any other change.
     *
     * @tags Security
     * @name SaveFail2BanConfig
     * @summary Replace jail.local
     * @request PUT:/servers/{id}/security/fail2ban/config
     */
    saveFail2BanConfig: (
      id: string,
      data: Fail2BanConfigBody,
      params: RequestParams = {},
    ) =>
      this.request<Fail2BanOverview, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/config`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Overrides for a shipped filter, or a whole new one. Empty content deletes the .local file. Checked and reloaded like jail.local.
     *
     * @tags Security
     * @name SaveFail2BanFilter
     * @summary Write a filter's .local file
     * @request PUT:/servers/{id}/security/fail2ban/filters/{filter}
     */
    saveFail2BanFilter: (
      id: string,
      filter: string,
      data: Fail2BanConfigBody,
      params: RequestParams = {},
    ) =>
      this.request<Fail2BanFilter, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/filters/${filter}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Runs fail2ban-regex on a log file, the journal or pasted lines, and reports how many lines match.
     *
     * @tags Security
     * @name TestFail2BanFilter
     * @summary Try a filter or regex against a log
     * @request POST:/servers/{id}/security/fail2ban/test
     */
    testFail2BanFilter: (
      id: string,
      data: Fail2BanTestBody,
      params: RequestParams = {},
    ) =>
      this.request<Fail2BanTestResult, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/test`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Stops it (lifting every ban) and removes the package. Runs as a background job (kind `fail2ban-uninstall`), like install.
     *
     * @tags Security
     * @name UninstallFail2Ban
     * @summary Remove fail2ban
     * @request POST:/servers/{id}/security/fail2ban/uninstall
     */
    uninstallFail2Ban: (
      id: string,
      data: Fail2BanUninstallBody,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/uninstall`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Writes [DEFAULT] keys into jail.local, checks the configuration (fail2ban-client -t) and reloads; a configuration fail2ban rejects is put back and answers 422.
     *
     * @tags Security
     * @name UpdateFail2BanDefaults
     * @summary Change what every jail inherits
     * @request PUT:/servers/{id}/security/fail2ban/defaults
     */
    updateFail2BanDefaults: (
      id: string,
      data: Fail2BanSettingsBody,
      params: RequestParams = {},
    ) =>
      this.request<Fail2BanOverview, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/defaults`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Writes the jail's keys into its section of jail.local (adding the section, which creates a custom jail when no other file defines it), checks the configuration and reloads. Set enabled=true/false to turn it on or off.
     *
     * @tags Security
     * @name UpdateFail2BanJail
     * @summary Change, enable or add a jail
     * @request PUT:/servers/{id}/security/fail2ban/jails/{jail}
     */
    updateFail2BanJail: (
      id: string,
      jail: string,
      data: Fail2BanSettingsBody,
      params: RequestParams = {},
    ) =>
      this.request<Fail2BanOverview, ErrorModel>({
        path: `/servers/${id}/security/fail2ban/jails/${jail}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  services = {
    /**
     * @description Writes /etc/systemd/system/<name>, reloads systemd, checks it loads, then enables and starts it when asked.
     *
     * @tags Services
     * @name CreateService
     * @summary Add a service
     * @request POST:/servers/{id}/services
     */
    createService: (
      id: string,
      data: ServiceCreateBody,
      params: RequestParams = {},
    ) =>
      this.request<Service, ErrorModel>({
        path: `/servers/${id}/services`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Stops and disables it, deletes its unit file and drop-ins from /etc/systemd/system and reloads systemd. Packaged units can't be removed here.
     *
     * @tags Services
     * @name DeleteService
     * @summary Remove a custom service
     * @request DELETE:/servers/{id}/services/{unit}
     */
    deleteService: (id: string, unit: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/servers/${id}/services/${unit}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Its state plus dependencies, commands, environment, restart policy and its unit file with drop-ins (systemctl cat). OpenRC: the init script and its conf.d file.
     *
     * @tags Services
     * @name GetService
     * @summary One service in detail
     * @request GET:/servers/{id}/services/{unit}
     */
    getService: (id: string, unit: string, params: RequestParams = {}) =>
      this.request<ServiceDetails, ErrorModel>({
        path: `/servers/${id}/services/${unit}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description The last `lines` journal entries for the unit (journalctl -u), oldest first. For new entries as they come, use the stream.
     *
     * @tags Services
     * @name GetServiceLogs
     * @summary A service's recent journal
     * @request GET:/servers/{id}/services/{unit}/logs
     */
    getServiceLogs: (
      id: string,
      unit: string,
      query?: {
        /**
         * @format int64
         * @min 1
         * @max 5000
         * @default 300
         */
        lines?: number;
        /**
         * Only entries this important or more: 3 errors, 4 warnings, 6 info, 7 everything
         * @format int64
         * @min 0
         * @max 7
         * @default 7
         */
        priority?: number;
        /** Only entries since then; boot = since the last boot */
        since?: "" | "15m" | "1h" | "24h" | "7d" | "boot";
      },
      params: RequestParams = {},
    ) =>
      this.request<ServiceLogs, ErrorModel>({
        path: `/servers/${id}/services/${unit}/logs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Every systemd service unit (loaded or installed) with its state, boot setting, main PID, memory, CPU and restarts; OpenRC init scripts with their state and runlevels; nothing when neither runs.
     *
     * @tags Services
     * @name ListServices
     * @summary Services on a server
     * @request GET:/servers/{id}/services
     */
    listServices: (id: string, params: RequestParams = {}) =>
      this.request<ServicesOverview, ErrorModel>({
        path: `/servers/${id}/services`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description systemctl daemon-reload: systemd rereads every unit file changed on disk. Running services keep running.
     *
     * @tags Services
     * @name ReloadServices
     * @summary Reload systemd
     * @request POST:/servers/{id}/services/daemon-reload
     */
    reloadServices: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/servers/${id}/services/daemon-reload`,
        method: "POST",
        ...params,
      }),

    /**
     * @description Only for units whose file is in /etc/systemd/system (not a link to a package's file): writes it, reloads systemd and checks it loads, else restores it (422). Packaged units are changed with an override.
     *
     * @tags Services
     * @name SaveServiceFile
     * @summary Save a custom service's unit file
     * @request PUT:/servers/{id}/services/{unit}/file
     */
    saveServiceFile: (
      id: string,
      unit: string,
      data: ServiceFileBody,
      params: RequestParams = {},
    ) =>
      this.request<Service, ErrorModel>({
        path: `/servers/${id}/services/${unit}/file`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Writes /etc/systemd/system/<unit>.d/override.conf (what `systemctl edit` does; empty content removes it), reloads systemd and checks the unit still loads, else puts the old file back (422 with systemd's reason). A stale `revision` answers 409.
     *
     * @tags Services
     * @name SaveServiceOverride
     * @summary Save a service's override
     * @request PUT:/servers/{id}/services/{unit}/override
     */
    saveServiceOverride: (
      id: string,
      unit: string,
      data: ServiceFileBody,
      params: RequestParams = {},
    ) =>
      this.request<Service, ErrorModel>({
        path: `/servers/${id}/services/${unit}/override`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Waits for systemd to finish the job; a failed start answers 422 with systemd's reason. Answers the service as it is after. Stopping, disabling, masking or killing a protected service (sshd, dbus, journald…) needs `force`. OpenRC: start/stop/restart/reload, enable/disable (default runlevel), reset-failed (zap).
     *
     * @tags Services
     * @name ServiceAction
     * @summary Start, stop, restart, enable… a service
     * @request POST:/servers/{id}/services/{unit}/action
     */
    serviceAction: (
      id: string,
      unit: string,
      data: ServiceActionBody,
      params: RequestParams = {},
    ) =>
      this.request<Service, ErrorModel>({
        path: `/servers/${id}/services/${unit}/action`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Server-sent events: an `entry` for every new journal line of the unit (journalctl -f), after `after` when given; `problem` when it can't be followed, and the stream ends.
     *
     * @tags Services
     * @name StreamServiceLogs
     * @summary Follow a service's journal
     * @request GET:/servers/{id}/services/{unit}/logs/stream
     */
    streamServiceLogs: (
      id: string,
      unit: string,
      query?: {
        /**
         * A cursor from the last entry already shown
         * @maxLength 1000
         */
        after?: string;
        /**
         * @format int64
         * @min 0
         * @max 7
         * @default 7
         */
        priority?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        (
          | {
              data: LogEntry;
              /** The event name. */
              event: "entry";
              /** The event ID. */
              id?: number | string;
              /** The retry time in milliseconds. */
              retry?: number;
            }
          | {
              data: StatsProblem;
              /** The event name. */
              event: "problem";
              /** The event ID. */
              id?: number | string;
              /** The retry time in milliseconds. */
              retry?: number;
            }
        )[],
        ErrorModel
      >({
        path: `/servers/${id}/services/${unit}/logs/stream`,
        method: "GET",
        query: query,
        ...params,
      }),
  };
  terminal = {
    /**
     * @description Ends the shell (the server sends it SIGHUP). Attached browsers get an `exit` message.
     *
     * @tags Terminal
     * @name CloseTerminal
     * @summary Close a terminal
     * @request DELETE:/servers/{id}/terminals/{session}
     */
    closeTerminal: (id: string, session: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/servers/${id}/terminals/${session}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Shells keep running on the backend while no browser is attached, so a reload or a dropped network resumes them. Connect with a WebSocket to `/servers/{id}/terminals/connect` (`?session=` to attach to one of these, else a new shell; `cols`, `rows`, `cwd` for a new one). Binary frames carry terminal bytes both ways; JSON text frames carry control: the client sends `{type:"resize",cols,rows}`; the server sends `session`, `title`, `exit` and `error`.
     *
     * @tags Terminal
     * @name ListTerminals
     * @summary List a server's open terminals
     * @request GET:/servers/{id}/terminals
     */
    listTerminals: (id: string, params: RequestParams = {}) =>
      this.request<ListTerminalsResponse, ErrorModel>({
        path: `/servers/${id}/terminals`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Terminal
     * @name RenameTerminal
     * @summary Rename a terminal
     * @request PATCH:/servers/{id}/terminals/{session}
     */
    renameTerminal: (
      id: string,
      session: string,
      data: RenameTerminalRequest,
      params: RequestParams = {},
    ) =>
      this.request<TerminalSession, ErrorModel>({
        path: `/servers/${id}/terminals/${session}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  storage = {
    /**
     * @description Connects afresh and records the status. For SFTP, the first good check trusts the host key; pass trust_new_host_key after a legitimate key change.
     *
     * @tags Storage
     * @name CheckStorage
     * @summary Check a storage's connection
     * @request POST:/storages/{id}/check
     */
    checkStorage: (
      id: string,
      query?: {
        trust_new_host_key?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Storage, ErrorModel>({
        path: `/storages/${id}/check`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Storage
     * @name CreateStorage
     * @summary Add a storage
     * @request POST:/storages
     */
    createStorage: (data: StorageBody, params: RequestParams = {}) =>
      this.request<Storage, ErrorModel>({
        path: `/storages`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Forgets the storage in Morcheh; nothing on the storage itself is touched.
     *
     * @tags Storage
     * @name DeleteStorage
     * @summary Remove a storage
     * @request DELETE:/storages/{id}
     */
    deleteStorage: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/storages/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Storage
     * @name GetStorage
     * @summary Get a storage
     * @request GET:/storages/{id}
     */
    getStorage: (id: string, params: RequestParams = {}) =>
      this.request<Storage, ErrorModel>({
        path: `/storages/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Favourites first, then by name.
     *
     * @tags Storage
     * @name ListStorages
     * @summary List storages
     * @request GET:/storages
     */
    listStorages: (params: RequestParams = {}) =>
      this.request<ListStoragesResponse, ErrorModel>({
        path: `/storages`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Opens the stored secrets of the chosen auth method. POST and `Cache-Control: no-store` so nothing caches them.
     *
     * @tags Storage
     * @name RevealStorageCredentials
     * @summary Reveal a storage's credentials
     * @request POST:/storages/{id}/credentials
     */
    revealStorageCredentials: (id: string, params: RequestParams = {}) =>
      this.request<StorageCredentials, ErrorModel>({
        path: `/storages/${id}/credentials`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Storage
     * @name SetStorageFavorite
     * @summary Star or unstar a storage
     * @request PUT:/storages/{id}/favorite
     */
    setStorageFavorite: (
      id: string,
      data: SetStorageFavoriteRequest,
      params: RequestParams = {},
    ) =>
      this.request<Storage, ErrorModel>({
        path: `/storages/${id}/favorite`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Connects with the given settings without saving anything.
     *
     * @tags Storage
     * @name TestStorageConnection
     * @summary Test storage settings
     * @request POST:/storages/test-connection
     */
    testStorageConnection: (
      data: StorageTestBody,
      params: RequestParams = {},
    ) =>
      this.request<StorageTestOutputBody, ErrorModel>({
        path: `/storages/test-connection`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Replaces the editable fields. Secrets left out keep their stored values. Changing the host or port forgets the trusted SFTP host key.
     *
     * @tags Storage
     * @name UpdateStorage
     * @summary Update a storage
     * @request PUT:/storages/{id}
     */
    updateStorage: (
      id: string,
      data: StorageBody,
      params: RequestParams = {},
    ) =>
      this.request<Storage, ErrorModel>({
        path: `/storages/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  storageFiles = {
    /**
     * @description One file streams as itself (Range support on S3 and SFTP). Several paths, or a folder, stream as one zip.
     *
     * @tags Storage files
     * @name DownloadStorageFiles
     * @summary Download files
     * @request GET:/storages/{id}/files/download
     */
    downloadStorageFiles: (
      id: string,
      query: {
        /** Show in the browser instead of saving (images, media, PDF, plain text only) */
        inline?: boolean;
        /** File name for a zip of several paths */
        name?: string;
        /**
         * Repeat for several files
         * @minItems 1
         */
        path: string[];
      },
      params: RequestParams = {},
    ) =>
      this.request<Blob, ErrorModel>({
        path: `/storages/${id}/files/download`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * @description Direct children of a folder. On S3 without a fixed bucket, "/" lists the buckets.
     *
     * @tags Storage files
     * @name ListStorageFiles
     * @summary List a storage folder
     * @request GET:/storages/{id}/files
     */
    listStorageFiles: (
      id: string,
      query?: {
        /**
         * @format int64
         * @min 1
         * @max 20000
         * @default 5000
         */
        limit?: number;
        /** From the storage's top; empty = "/" */
        path?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<StorageListing, ErrorModel>({
        path: `/storages/${id}/files`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description For the editor: UTF-8 text up to 5 MB. Bigger files are 413, binary ones 415.
     *
     * @tags Storage files
     * @name ReadStorageFile
     * @summary Read a text file
     * @request GET:/storages/{id}/files/content
     */
    readStorageFile: (
      id: string,
      query?: {
        /** From the storage's top; empty = "/" */
        path?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<FileContent, ErrorModel>({
        path: `/storages/${id}/files/content`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Case-insensitive name match under path (recursive). At most 200 results; stops after a minute.
     *
     * @tags Storage files
     * @name SearchStorageFiles
     * @summary Find files by name
     * @request GET:/storages/{id}/files/search
     */
    searchStorageFiles: (
      id: string,
      query: {
        /** From the storage's top; empty = "/" */
        path?: string;
        /**
         * @minLength 1
         * @maxLength 200
         */
        q: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SearchStorageFilesResponse, ErrorModel>({
        path: `/storages/${id}/files/search`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description A pre-signed link anyone can open until it expires (S3 only; at most 7 days). It can't be revoked early except by rotating the access key.
     *
     * @tags Storage files
     * @name ShareStorageFile
     * @summary Make a public download link
     * @request POST:/storages/{id}/files/share
     */
    shareStorageFile: (
      id: string,
      data: ShareStorageFileRequest,
      params: RequestParams = {},
    ) =>
      this.request<ShareStorageFileResponse, ErrorModel>({
        path: `/storages/${id}/files/share`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Storage files
     * @name StatStorageFile
     * @summary Details of one file or folder
     * @request GET:/storages/{id}/files/stat
     */
    statStorageFile: (
      id: string,
      query?: {
        /** From the storage's top; empty = "/" */
        path?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<StorageEntry, ErrorModel>({
        path: `/storages/${id}/files/stat`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Copies into their own folder get a free "copy" name; any other clash is 409. Runs as a background job (kind `storage-copy`, result StorageTransferResult).
     *
     * @tags Storage files
     * @name StorageCopy
     * @summary Copy files into a folder
     * @request POST:/storages/{id}/files/copy
     */
    storageCopy: (
      id: string,
      data: StorageMoveBody,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/storages/${id}/files/copy`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Folders go with everything in them. On S3, deleting a top-level bucket folder deletes the bucket.
     *
     * @tags Storage files
     * @name StorageDelete
     * @summary Delete files and folders
     * @request POST:/storages/{id}/files/delete
     */
    storageDelete: (
      id: string,
      data: StorageDeleteRequest,
      params: RequestParams = {},
    ) =>
      this.request<StorageAffectedOutputBody, ErrorModel>({
        path: `/storages/${id}/files/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Walks the folder. Stops after a minute and reports what it counted so far (partial).
     *
     * @tags Storage files
     * @name StorageFolderSize
     * @summary Total size of a folder
     * @request GET:/storages/{id}/files/size
     */
    storageFolderSize: (
      id: string,
      query?: {
        /** From the storage's top; empty = "/" */
        path?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<StorageFolderSizeResponse, ErrorModel>({
        path: `/storages/${id}/files/size`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description On S3 without a fixed bucket, a folder at the top creates a bucket.
     *
     * @tags Storage files
     * @name StorageMkdir
     * @summary Create a folder
     * @request POST:/storages/{id}/files/mkdir
     */
    storageMkdir: (
      id: string,
      data: StorageMkdirRequest,
      params: RequestParams = {},
    ) =>
      this.request<StorageEntry, ErrorModel>({
        path: `/storages/${id}/files/mkdir`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description A name already in the destination is 409 and nothing moves; 422 when they're already there. Runs as a background job (kind `storage-move`) that starts at once.
     *
     * @tags Storage files
     * @name StorageMove
     * @summary Move files into a folder
     * @request POST:/storages/{id}/files/move
     */
    storageMove: (
      id: string,
      data: StorageMoveBody,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/storages/${id}/files/move`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description On S3 a rename copies every object and deletes the old ones, so big folders take a while. Buckets can't be renamed.
     *
     * @tags Storage files
     * @name StorageRename
     * @summary Rename a file or folder
     * @request POST:/storages/{id}/files/rename
     */
    storageRename: (
      id: string,
      data: StorageRenameRequest,
      params: RequestParams = {},
    ) =>
      this.request<StorageEntry, ErrorModel>({
        path: `/storages/${id}/files/rename`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Each end is a storage or a server (over SFTP). Files stream through Morcheh; two places on one storage copy on the storage itself when it can. Server paths are absolute or relative to the login user's home. A name already in the destination is 409 unless overwrite is set. The request is checked at once, then the copy runs as a background job (kind `transfer`, result StorageTransferResult); follow it on /jobs/stream.
     *
     * @tags Storage files
     * @name TransferFiles
     * @summary Copy or move files between storages and servers
     * @request POST:/storages/transfer
     */
    transferFiles: (data: StorageTransferBody, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/storages/transfer`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description The raw body is the file. Missing parent folders are created. An existing file is 409 unless overwrite is set.
     *
     * @tags Storage files
     * @name UploadStorageFile
     * @summary Upload a file
     * @request PUT:/storages/{id}/files/upload
     */
    uploadStorageFile: (
      id: string,
      query: {
        /** Replace an existing file */
        overwrite?: boolean;
        /** Destination, including the file name */
        path: string;
      },
      data: File,
      params: RequestParams = {},
    ) =>
      this.request<StorageEntry, ErrorModel>({
        path: `/storages/${id}/files/upload`,
        method: "PUT",
        query: query,
        body: data,
        format: "json",
        ...params,
      }),

    /**
     * @description Replaces the file. With expected_modified, refuses (409) if it changed since it was read. With create, makes a new file and refuses if one exists.
     *
     * @tags Storage files
     * @name WriteStorageFile
     * @summary Save a text file
     * @request PUT:/storages/{id}/files/content
     */
    writeStorageFile: (
      id: string,
      data: WriteStorageFileRequest,
      params: RequestParams = {},
    ) =>
      this.request<StorageEntry, ErrorModel>({
        path: `/storages/${id}/files/content`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
}
