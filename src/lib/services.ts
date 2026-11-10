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

export interface AcknowledgeMonitorIncidentRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 2000 */
  note?: string;
}

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

export interface AlwaysOnline {
  /**
   * A copy no one asks for is dropped after this many days; 0 = 7
   * @format int64
   * @min 0
   * @max 365
   */
  keep_days?: number;
  /** Keep copies even when the app marks a page private or no-store (cache off only; with the cache on its own setting decides) */
  keep_private?: boolean;
  /** empty = off; backup = every visit asks the app, copies only when it fails; fast = answer from the copy at once and refresh it in the background; copies = never ask the app (maintenance), pages without a copy fail */
  mode?: "" | "backup" | "fast" | "copies";
  /**
   * Use the copy when the app takes longer than this to start answering a page (GET/HEAD); 0 = wait the site's own timeout. Other requests keep the site's timeout
   * @format int64
   * @min 0
   * @max 300
   */
  slow_seconds?: number;
  /**
   * App answers that also count as down (500, 502, 503, 504, 429); no answer at all always does
   * @maxItems 5
   */
  statuses?: number[];
  /**
   * How long to try reaching the app before using the copy; 0 = 5
   * @format int64
   * @min 0
   * @max 60
   */
  wait_seconds?: number;
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

export interface Auth {
  forward?: ForwardAuth;
  /** basic = user names and passwords; forward = ask a sign-in service; empty = off */
  mode?: "" | "basic" | "forward";
  /** Ask only on the paths marked login, not on the whole site */
  only_paths?: boolean;
  /**
   * Text the browser's sign-in box shows (basic); empty = Restricted
   * @maxLength 100
   */
  realm?: string;
  /** Addresses in the Always let in list don't have to sign in */
  skip_for_allowed?: boolean;
  /**
   * Who may sign in (basic)
   * @maxItems 200
   */
  users?: AuthUser[];
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

export interface AuthUser {
  /**
   * Set by Morcheh; never sent back, ignored when sent
   * @maxLength 200
   */
  hash?: string;
  /** @maxLength 64 */
  name: string;
  /**
   * New password; empty keeps the saved one. Never sent back
   * @maxLength 200
   */
  password?: string;
}

export interface Backup {
  sha256: string;
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  bytes: number;
  copies: BackupCopy[];
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  /** @format uuid */
  database_id: string;
  /**
   * Incrementals that build on it directly
   * @format int64
   */
  dependents: number;
  engine: string;
  /** Why it failed; on a backup that worked, a storage that didn't get its copy */
  error: string;
  /** @format date-time */
  finished_at: string | null;
  format: string;
  /** @format uuid */
  id: string;
  /** @format uuid */
  job_id: string | null;
  kind: "full" | "incremental";
  /**
   * What an incremental builds on
   * @format uuid
   */
  parent_id: string | null;
  /** The same on every storage it was written to */
  path: string;
  /** @format uuid */
  plan_id: string | null;
  plan_name: string;
  /** Morcheh can restore it from the panel */
  restorable: boolean;
  /** The commands that bring it back by hand, for copying */
  restore: string;
  /** Why it can't be restored from the panel; empty when it can */
  restore_problem: string;
  /** @format date-time */
  started_at: string | null;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted"
    | "skipped";
  /** The database it holds; empty = all of them */
  target: string;
  trigger: "schedule" | "manual" | "restore";
  /**
   * When the stored file was last read back
   * @format date-time
   */
  verified_at: string | null;
  /** What that check found wrong; empty = it passed */
  verify_error: string;
}

export interface BackupCopy {
  error: string;
  state: "pending" | "stored" | "failed";
  /**
   * Null when the storage was removed
   * @format uuid
   */
  storage_id: string | null;
  storage_name: string;
}

export interface BackupIncremental {
  /** How it works, or why not */
  note: string;
  supported: boolean;
}

export interface BackupListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Backup[];
  /** @format int64 */
  total: number;
}

export interface BackupOptions {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** The databases on it, without the system ones */
  databases: string[];
  /** Why they couldn't be listed; empty when they could */
  databases_error: string;
  incremental: BackupIncremental;
  /** Whether the machine Morcheh runs on can run its backups and restores */
  local: LocalTools;
  /** Why some don't */
  selection_note: string;
  /** Which ways of choosing databases work here */
  selections: string[];
}

export interface BackupPlan {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  created_at: string;
  cron: string;
  /** @format uuid */
  database_id: string;
  enabled: boolean;
  folder: string;
  /** @format int32 */
  full_every_days: number;
  /** @format int32 */
  gfs_daily: number;
  /** @format int32 */
  gfs_monthly: number;
  /** @format int32 */
  gfs_weekly: number;
  has_password: boolean;
  /** @format uuid */
  id: string;
  /** @format int32 */
  keep_days: number;
  last?: BackupRunBrief;
  /** @format date-time */
  last_good_at: string | null;
  method: "full" | "incremental";
  name: string;
  /** @format date-time */
  next_run_at: string | null;
  pattern: string;
  /** Why it can't run right now; empty when it can */
  problem: string;
  retention: "days" | "gfs" | "forever";
  /** The server the dump runs on ("This Morcheh server" for Morcheh's own machine) */
  runner_name: string;
  /** @format uuid */
  runner_server_id: string | null;
  running: boolean;
  /** The person whose access it runs with: whoever saved it last */
  runs_as: string;
  selection: "all" | "selected" | "pattern";
  storages: BackupPlanStorage[];
  targets: string[];
  timezone: string;
  /** @format date-time */
  updated_at: string;
  username: string;
}

export interface BackupPlanBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * When it runs; empty = only when started by hand
   * @maxLength 128
   */
  cron?: string;
  enabled: boolean;
  /**
   * Folder on the Storages; {year}, {month} and {day} are filled in at each run. Each database gets a folder of its own inside it
   * @minLength 1
   * @maxLength 1024
   */
  folder: string;
  /**
   * An incremental plan starts over with a full backup this often
   * @format int32
   * @min 1
   * @max 365
   */
  full_every_days: number;
  /**
   * For retention=gfs: the newest backup of this many days
   * @format int32
   * @min 0
   * @max 1000
   */
  gfs_daily: number;
  /**
   * … of this many months
   * @format int32
   * @min 0
   * @max 1000
   */
  gfs_monthly: number;
  /**
   * … of this many weeks
   * @format int32
   * @min 0
   * @max 1000
   */
  gfs_weekly: number;
  /**
   * For retention=days
   * @format int32
   * @min 1
   * @max 3650
   */
  keep_days: number;
  /** incremental: only what changed since the backup before (MySQL/MariaDB, SQL Server) */
  method: "full" | "incremental";
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /**
   * Blank keeps the saved one
   * @maxLength 1024
   */
  password?: string;
  /**
   * A regular expression, for selection=pattern
   * @maxLength 256
   */
  pattern?: string;
  /** How old backups are deleted */
  retention: "days" | "gfs" | "forever";
  /**
   * For a direct database: the server that runs the dump; empty = the machine Morcheh runs on. Ignored otherwise
   * @format uuid
   */
  runner_server_id?: string;
  /** Which databases: all of them, the ones named in targets, or the ones matching pattern */
  selection: "all" | "selected" | "pattern";
  /**
   * Where it's uploaded: the database is dumped once and sent to each of them
   * @maxItems 10
   * @minItems 1
   */
  storage_ids: string[];
  /**
   * The databases, for selection=selected
   * @maxItems 200
   */
  targets?: string[];
  /** @maxLength 64 */
  timezone?: string;
  /**
   * A login just for backups; empty = the database's own
   * @maxLength 255
   */
  username?: string;
}

export interface BackupPlanStorage {
  /** @format uuid */
  id: string;
  name: string;
  protocol: string;
}

export interface BackupProblem {
  /** @format date-time */
  at: string;
  /** @format uuid */
  database_id: string;
  database_name: string;
  error: string;
  /** @format uuid */
  plan_id: string;
  plan_name: string;
}

export interface BackupRestore {
  /**
   * Null when the backup was deleted since
   * @format uuid
   */
  backup_id: string | null;
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  /** @format uuid */
  database_id: string;
  error: string;
  /** @format date-time */
  finished_at: string | null;
  /** @format uuid */
  id: string;
  /** @format uuid */
  job_id: string | null;
  mode: "replace" | "new";
  /**
   * The backup taken just before
   * @format uuid
   */
  safety_backup_id: string | null;
  /** The backup's file */
  source: string;
  /** @format date-time */
  started_at: string | null;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted";
  storage_name: string;
  target_name: string;
  want_safety: boolean;
}

export interface BackupRunBrief {
  /** @format date-time */
  at: string;
  /** @format int64 */
  bytes: number;
  error: string;
  /** @format uuid */
  id: string;
  state: string;
}

export interface Balance {
  /** hash: adding or removing a server moves only a few keys (ketama) */
  consistent?: boolean;
  /**
   * Seconds the failures are counted in, and how long the server stays out; 0 = 10
   * @format int64
   * @min 0
   * @max 3600
   */
  fail_timeout?: number;
  /** hash: what the server is picked by; empty = ip */
  hash_key?: "" | "ip" | "uri" | "cookie" | "header" | "arg";
  /**
   * hash: the cookie, header or argument name
   * @maxLength 64
   */
  hash_name?: string;
  /**
   * Idle connections kept open to the servers, per worker (sites); 0 = none
   * @format int64
   * @min 0
   * @max 1024
   */
  keepalive?: number;
  /** Options of the main server (its address comes from upstream / stream_to) */
  main?: UpstreamServer;
  /**
   * Failures that take a server out for a while; 0 = 1
   * @format int64
   * @min 0
   * @max 100
   */
  max_fails?: number;
  /** How a server is picked; empty = round_robin. ip_hash is for sites only */
  method?: "" | "round_robin" | "least_conn" | "ip_hash" | "hash" | "random";
  /** Never try another server when one fails */
  no_retry?: boolean;
  /** random: pick two at random and send to the one with fewer connections */
  random_two?: boolean;
  /**
   * When to try the next server (sites): error, timeout, invalid_header, http_500, http_502, http_503, http_504, http_403, http_404, http_429, non_idempotent; empty = error and timeout
   * @maxItems 11
   */
  retry_on?: string[];
  /**
   * Seconds after which no other server is tried; 0 = no limit
   * @format int64
   * @min 0
   * @max 3600
   */
  retry_timeout?: number;
  /**
   * More servers beside the main address, as host:port; any = load balancing on
   * @maxItems 50
   */
  servers?: UpstreamServer[];
  /**
   * Most servers tried for one request; 0 = all of them
   * @format int64
   * @min 0
   * @max 20
   */
  tries?: number;
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

export interface Beat {
  /** @format date-time */
  at: string;
  /** @format int32 */
  latency_ms?: number;
  message: string;
  status: string;
}

export interface BucketCORSRule {
  /** @maxItems 100 */
  expose_headers: string[];
  /** @maxItems 100 */
  headers: string[];
  /**
   * @format int64
   * @min 0
   * @max 86400
   */
  max_age_seconds: number;
  /**
   * @maxItems 5
   * @minItems 1
   */
  methods: string[];
  /**
   * @maxItems 100
   * @minItems 1
   */
  origins: string[];
}

export interface BucketDetails {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Who can read without a key: nobody, anyone with a file's link, or anyone (and list it); custom = a policy Morcheh doesn't recognise */
  access: "private" | "download" | "public" | "custom";
  cors: BucketCORSRule[];
  /** @format date-time */
  created: string | null;
  encryption: "none" | "sse-s3" | "sse-kms";
  /** The storage is set to this one bucket */
  fixed: boolean;
  kms_key: string;
  lifecycle: BucketLifecycleRule[];
  name: string;
  /** Object lock is on (set when the bucket is made, can't be turned off) */
  object_lock: boolean;
  /** The raw bucket policy (JSON); empty = none */
  policy: string;
  /** Settings that couldn't be read (versioning, policy, lifecycle, tags, encryption, object_lock, cors, region) and why */
  problems: Record<string, string>;
  /** The policy lets anyone write or delete */
  public_write: boolean;
  region: string;
  /** @format int64 */
  retention_days: number;
  /** Default retention for new objects; empty = none */
  retention_mode: "" | "GOVERNANCE" | "COMPLIANCE";
  tags: Record<string, string>;
  versioning: "off" | "enabled" | "suspended";
}

export interface BucketLifecycleRule {
  /**
   * Drop unfinished multipart uploads after this many days (0 = never)
   * @format int64
   * @min 0
   * @max 36500
   */
  abort_uploads_days: number;
  /** Has parts Morcheh doesn't show (tag or size filters, dates…); they're kept when saved */
  advanced: boolean;
  /** Remove delete markers with no versions left behind them */
  delete_markers: boolean;
  enabled: boolean;
  /**
   * Delete objects this many days after they were written (0 = never)
   * @format int64
   * @min 0
   * @max 36500
   */
  expire_days: number;
  /**
   * Empty = a new rule (an id is made up)
   * @maxLength 255
   */
  id: string;
  /**
   * Delete old versions this many days after they were replaced (0 = never)
   * @format int64
   * @min 0
   * @max 36500
   */
  noncurrent_days: number;
  /**
   * Only objects whose key starts with this; empty = the whole bucket
   * @maxLength 1024
   */
  prefix: string;
  /**
   * Storage class to move to (GLACIER, STANDARD_IA…)
   * @maxLength 64
   */
  transition_class: string;
  /**
   * Move objects to transition_class after this many days (0 = never)
   * @format int64
   * @min 0
   * @max 36500
   */
  transition_days: number;
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

export interface CA {
  directory: string;
  /** Needs External Account Binding (a key ID and HMAC key from the CA's dashboard) */
  eab: boolean;
  id: string;
  label: string;
  note?: string;
  /** Issues untrusted test certificates, with high limits */
  test?: boolean;
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

export interface Cache {
  /** Keep the site answering from its last good copies while the app is down (proxy; works with the cache off too) */
  always_online?: AlwaysOnline;
  /**
   * Browsers keep css, js, images, fonts and media this many days; 0 = leave the answer's own header
   * @format int64
   * @min 0
   * @max 365
   */
  asset_days?: number;
  /** Keep the upstream's answers on the proxy's disk and serve them from there (proxy) */
  enabled?: boolean;
  /**
   * Cache rules: named sets of addresses with their own cache time (or never kept), cleared together; a group may also pick answers by a header the app sends (clearing only)
   * @maxItems 30
   */
  groups?: CacheGroup[];
  /** Cache even when the upstream says not to (Cache-Control, Expires); answers setting a cookie are still never kept */
  ignore_upstream?: boolean;
  /**
   * Disk space the cache may use; 0 = 1024
   * @format int64
   * @min 0
   * @max 1048576
   */
  max_size_mb?: number;
  /**
   * How long an answer stays fresh when the upstream doesn't say; 0 = 10
   * @format int64
   * @min 0
   * @max 43200
   */
  minutes?: number;
  /** Browsers check for a newer page (html) every time */
  pages_fresh?: boolean;
  /** What of the query string tells answers apart: empty = all of it, none = ignored (one copy per path), only = just QueryParams */
  query?: "" | "none" | "only";
  /**
   * With query only: the parameters that count, like page or lang; others (utm_source…) share one copy
   * @maxItems 20
   */
  query_params?: string[];
  /** When the upstream is down, slow or failing, answer from the cache; refresh in the background */
  serve_stale?: boolean;
  /**
   * Requests carrying a cookie whose name starts with one of these skip the cache (signed-in people), like wordpress_logged_in
   * @maxItems 20
   */
  skip_cookies?: string[];
  /**
   * Paths never cached, with everything under them, like /admin
   * @maxItems 50
   */
  skip_paths?: string[];
  /** Add X-Cache-Status (HIT, MISS, BYPASS…) to answers */
  status_header?: boolean;
  /**
   * Cookies whose value keeps copies apart, like lang or currency
   * @maxItems 3
   */
  vary_cookies?: string[];
  /** Separate copies for phones, tablets and computers (told apart by User-Agent) */
  vary_device?: boolean;
  /**
   * Request headers whose value keeps copies apart, like X-Country
   * @maxItems 3
   */
  vary_headers?: string[];
  /** Separate copies per visitor language: the first one in Accept-Language, like en or fa */
  vary_language?: boolean;
  /** Separate copies per operating system: windows, macos, linux, android, ios, chromeos, other */
  vary_os?: boolean;
}

export interface CacheGroup {
  /**
   * An answer header the app sends, like Cache-Tag (clearing only)
   * @maxLength 64
   */
  header?: string;
  /**
   * Answers at these addresses stay fresh this long; 0 = the site's time
   * @format int64
   * @min 0
   * @max 43200
   */
  minutes?: number;
  /**
   * Like Blog or Product images
   * @maxLength 60
   */
  name: string;
  /** Answers at these addresses are never kept */
  never?: boolean;
  /**
   * Addresses, as in PurgeFilter.Paths
   * @maxItems 100
   */
  paths?: string[];
  /**
   * That header's value (or one item of a comma-separated list); * = any characters; empty = any value
   * @maxLength 200
   */
  value?: string;
}

export interface Capabilities {
  /** Raw directives in the proxy's own language */
  advanced: boolean;
  /** Lists of addresses let in or refused */
  allow: boolean;
  /** Takes auth: basic sign-in, and forward when the server's proxy can */
  auth: boolean;
  /** Takes balance: load balancing over several servers (proxy, stream) */
  balancing: boolean;
  /** Takes cache (browsers, and the proxy's own cache for proxy sites) and can clear it */
  cache: boolean;
  /** Can get certificates on the server (ACME CAs like Let's Encrypt, self-signed, uploaded) */
  certificates: boolean;
  /** What its config is called, like nginx config */
  config_label: string;
  /** Can let in or refuse visitors by country (port forwards too, with the stream-geo module) */
  countries: boolean;
  /** Takes hardening, request_id and catch_all */
  hardening: boolean;
  headers: boolean;
  /** The config language, for syntax colors */
  language: string;
  /** Takes mirror: a copy of requests sent to a test server (proxy) */
  mirror: boolean;
  /** Takes maintenance and error_pages */
  pages: boolean;
  /** Paths take match and action (redirect, static, deny, return), strip_prefix, public, login, access and addresses */
  path_actions: boolean;
  paths: boolean;
  /** Can limit requests, connections and speed */
  rate_limit: boolean;
  /** Can forward TCP/UDP ports (type stream) */
  streams: boolean;
  /** Takes HostTLS's extra settings (profile, HTTP/3, OCSP, session cache, client certificates) */
  tls_options: boolean;
  /** Reports live request counts per site */
  traffic: boolean;
  /** Takes the tuning options: gzip, no_buffering, connect_timeout_seconds, real_ip, proxy_protocol, hide_version */
  tuning: boolean;
  types: string[];
  /** Takes upstream_tls */
  upstream_tls: boolean;
  websockets: boolean;
}

export interface CatalogOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  categories: string[];
  items: Recipe[];
}

export interface CertRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** One of the listed CAs, or custom */
  ca?: string;
  /**
   * PEM: the certificate, then its intermediates
   * @maxLength 200000
   */
  certificate?: string;
  /**
   * Validity of a self-signed certificate; 0 = 365
   * @format int64
   * @min 0
   * @max 3650
   */
  days?: number;
  /** ACME directory URL, for ca = custom */
  directory?: string;
  /**
   * Names it covers. Uploads read them from the certificate when left out
   * @maxItems 100
   */
  domains?: string[];
  /**
   * Kept sealed with the job (so Retry works), never in plain text
   * @maxLength 500
   */
  eab_hmac?: string;
  /** @maxLength 500 */
  eab_kid?: string;
  /** Where the CA sends expiry warnings; optional */
  email?: string;
  /** Get a new one even when the current one isn't due for renewal */
  force?: boolean;
  /**
   * PEM private key, without a password; kept sealed with the job, never in plain text
   * @maxLength 100000
   */
  key?: string;
  /** empty = ecdsa */
  key_type?: "" | "ecdsa" | "rsa";
  /**
   * Folder name; empty = the first domain
   * @maxLength 100
   */
  name?: string;
  source: "acme" | "self-signed" | "upload";
}

export interface Certificate {
  certificate: string;
  domains: string[];
  /** @format date-time */
  expires?: string;
  /** Who signed it, like Let's Encrypt; Self-signed when it signed itself */
  issuer?: string;
  key: string;
  name: string;
  /** certbot = renewed by certbot on the server; morcheh = uploaded or self-signed through the panel, never renewed */
  source: "certbot" | "morcheh";
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

export interface ChannelConfig {
  /**
   * Telegram/Bale: another Bot API address (a self-hosted or relay Bot API); blank for the official one
   * @maxLength 500
   */
  api_url?: string;
  /**
   * Telegram/Bale: the chat, group or channel id (or @channelname)
   * @maxLength 100
   */
  chat_id?: string;
  /**
   * Email: the sender, e.g. Morcheh <alerts@example.com>
   * @maxLength 255
   */
  from?: string;
  /**
   * Email: the SMTP server
   * @maxLength 255
   */
  host?: string;
  /** Webhook: the HTTP method */
  method?: "POST" | "PUT" | "PATCH" | "";
  /**
   * Email: 587 for STARTTLS, 465 for TLS, 25 for none
   * @format int64
   * @min 0
   * @max 65535
   */
  port?: number;
  /**
   * ntfy (1–5), Gotify (0–10), Pushover (-2–2 as 0–4): 0 = by the event
   * @format int64
   * @min 0
   * @max 10
   */
  priority?: number;
  /** Email: how the connection is encrypted */
  security?: "starttls" | "tls" | "none" | "";
  /** Telegram/Bale/Pushover: deliver without a sound */
  silent?: boolean;
  /**
   * Email: who gets it
   * @maxItems 50
   */
  to?: string[];
  /**
   * ntfy: the topic
   * @maxLength 200
   */
  topic?: string;
  /**
   * Webhook: where to POST; ntfy/Gotify: the server
   * @maxLength 1000
   */
  url?: string;
  /**
   * Email: the SMTP login, blank for none
   * @maxLength 255
   */
  username?: string;
}

export interface ChannelSecrets {
  /** Webhook: extra request headers. Left out = keep the saved ones; sent = exactly these names, a blank value keeps that header's saved value */
  headers?: Record<string, string>;
  /**
   * Email: the SMTP password
   * @maxLength 500
   */
  password?: string;
  /**
   * Webhook: signs each body (X-Morcheh-Signature: sha256=…)
   * @maxLength 500
   */
  signing_key?: string;
  /**
   * Telegram/Bale: the bot token; ntfy: an access token; Gotify: the app token; Pushover: the app token
   * @maxLength 500
   */
  token?: string;
  /**
   * Pushover: the user or group key
   * @maxLength 100
   */
  user_key?: string;
  /**
   * Slack/Discord/Mattermost/Teams: the incoming webhook address
   * @maxLength 1000
   */
  webhook_url?: string;
}

export interface ChannelTestBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Send to a private or loopback address. System admins only. */
  allow_internal?: boolean;
  /** Also add it to every monitor the workspace already has */
  attach_all?: boolean;
  /**
   * When editing: the saved channel, whose secrets blank ones stand for
   * @format uuid
   */
  channel_id?: string;
  config: ChannelConfig;
  /** Default true */
  enabled?: boolean;
  is_default?: boolean;
  /** Can't change after it's created */
  kind:
    | "email"
    | "telegram"
    | "bale"
    | "webhook"
    | "slack"
    | "discord"
    | "mattermost"
    | "teams"
    | "ntfy"
    | "gotify"
    | "pushover";
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** A blank secret keeps the saved one */
  secrets: ChannelSecrets;
}

export interface ChannelTestOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  message: string;
  ok: boolean;
}

export interface CheckOutBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  monitor: UptimeMonitor;
  result: CheckResult;
}

export interface CheckResult {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  cert_expires?: string;
  /** The answer in short: an HTTP status, a DNS rcode, an exit code… */
  code?: string;
  detail?: string;
  /** @format int64 */
  latency_ms?: number;
  message: string;
  status: "up" | "degraded" | "down";
}

export interface ChecksOutBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: MonitorChecksBetweenRow[];
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

export interface ComposeOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  content: string;
  /** Send it back when saving: a change made since is refused (409) */
  revision: string;
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

export interface ContainerInfo {
  /** The Compose project it belongs to */
  compose?: string;
  /** The Compose project's folder on the server */
  compose_dir?: string;
  id: string;
  image: string;
  /** The image is a proxy manager that writes nginx's config itself (Nginx Proxy Manager, nginx-proxy, SWAG): Morcheh doesn't take it over */
  managed?: string;
  mounts: ContainerMount[];
  name: string;
  /** host = shares the server's network; else a bridge (ports must be published) */
  network_mode: string;
  networks: ContainerNetwork[];
  /** @format int64 */
  pid?: number;
  ports: ContainerPort[];
  /** Restart policy: no, always, unless-stopped, on-failure */
  restart: string;
  running: boolean;
  runtime: "docker" | "podman";
  /** Its Compose service */
  service?: string;
  /** running, exited, paused, restarting, created… */
  state: string;
}

export interface ContainerMount {
  /** Where it appears inside the container */
  destination: string;
  /** The volume's name */
  name?: string;
  read_only?: boolean;
  /** The folder on the server (for a volume, where the runtime keeps it) */
  source: string;
  /** bind, volume or tmpfs */
  type: string;
}

export interface ContainerNetwork {
  aliases?: string[];
  /** The server's own address on this network: how the container reaches programs on the server */
  gateway?: string;
  ip?: string;
  name: string;
}

export interface ContainerPort {
  host_ip?: string;
  /** @format int64 */
  host_port: number;
  /** @format int64 */
  port: number;
  proto: "tcp" | "udp";
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

export interface CreateDnsZoneRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * A domain, or an IP or network for a reverse zone
   * @minLength 1
   * @maxLength 255
   */
  name: string;
  /**
   * Secondary: where to copy from. Blank asks the zone's SOA.
   * @maxItems 10
   */
  primary_addresses?: string[];
  /** Primary holds the records; Secondary copies them from a primary. */
  type: "Primary" | "Secondary";
}

export interface CreateDnsZoneResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  name: string;
}

export interface CreateProxyRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * The container's name, for docker and podman
   * @maxLength 128
   */
  container?: string;
  kind: string;
  /**
   * Where the proxy runs: on the server itself, or in a Docker / Podman container
   * @default "host"
   */
  runtime?: "host" | "docker" | "podman";
  /** @format uuid */
  server_id: string;
}

export interface CreateStorageBucketRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @minLength 3
   * @maxLength 63
   */
  name: string;
  object_lock?: boolean;
  /**
   * Empty = the storage's region
   * @maxLength 64
   */
  region?: string;
  versioning?: boolean;
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

export interface DNSRecord {
  comments: string;
  disabled: boolean;
  editable: boolean;
  /** @format int64 */
  flags?: number;
  /** Full name, like www.example.com */
  name: string;
  /** @format int64 */
  port?: number;
  /** @format int64 */
  priority?: number;
  tag?: string;
  /** @format int64 */
  ttl: number;
  type: string;
  value: string;
  /** @format int64 */
  weight?: number;
}

export interface DNSRecordBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 500 */
  comments?: string;
  disabled?: boolean;
  /**
   * @format int64
   * @min 0
   * @max 255
   */
  flags?: number;
  /**
   * Full name, like www.example.com
   * @minLength 1
   * @maxLength 255
   */
  name: string;
  /**
   * @format int64
   * @min 0
   * @max 65535
   */
  port?: number;
  /**
   * @format int64
   * @min 0
   * @max 65535
   */
  priority?: number;
  /** @maxLength 32 */
  tag?: string;
  /**
   * Seconds. 3600 when left out.
   * @format int64
   * @min 0
   * @max 2147483647
   */
  ttl?: number;
  type:
    | "A"
    | "AAAA"
    | "CNAME"
    | "ANAME"
    | "NS"
    | "PTR"
    | "MX"
    | "TXT"
    | "SRV"
    | "CAA";
  /**
   * @minLength 1
   * @maxLength 8192
   */
  value: string;
  /**
   * @format int64
   * @min 0
   * @max 65535
   */
  weight?: number;
}

export interface DNSServer {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  allow_internal: boolean;
  /** @format date-time */
  created_at: string;
  description: string;
  favorite: boolean;
  /** @format uuid */
  id: string;
  /** @format date-time */
  last_checked_at?: string;
  /** @format date-time */
  last_online_at?: string;
  /** @format int32 */
  latency_ms?: number;
  name: string;
  server_domain: string;
  status:
    | "unknown"
    | "online"
    | "unreachable"
    | "auth_failed"
    | "tls_error"
    | "blocked"
    | "error";
  status_message: string;
  tls_skip_verify: boolean;
  /** @format date-time */
  updated_at: string;
  url: string;
  version: string;
  /** @format uuid */
  workspace_id: string;
  /** @format int32 */
  zone_count: number;
}

export interface DNSServerBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Reach a private or loopback address. System admins only. */
  allow_internal?: boolean;
  /** @maxLength 500 */
  description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  tls_skip_verify?: boolean;
  /**
   * API token. Blank on update keeps the saved one.
   * @maxLength 500
   */
  token?: string;
  /**
   * The server's web console, like https://ns1.example.com:53443
   * @minLength 1
   * @maxLength 500
   */
  url: string;
}

export interface DNSServerProblem {
  message: string;
  /** @format uuid */
  server_id: string;
  server_name: string;
}

export interface DNSTestBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  allow_internal?: boolean;
  /**
   * When editing: the saved server, whose token a blank one stands for.
   * @format uuid
   */
  server_id?: string;
  tls_skip_verify?: boolean;
  /** @maxLength 500 */
  token?: string;
  /**
   * @minLength 1
   * @maxLength 500
   */
  url: string;
}

export interface DNSTestOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  latency_ms: number;
  message: string;
  ok: boolean;
  server_domain: string;
  status: string;
  version: string;
  /** @format int64 */
  zone_count: number;
}

export interface DNSZone {
  disabled: boolean;
  dnssec_status: string;
  expired: boolean;
  /** @format date-time */
  expiry?: string;
  /** @format date-time */
  last_modified?: string;
  name: string;
  notify_failed: boolean;
  /**
   * @format int32
   * @min 0
   */
  soa_serial: number;
  sync_failed: boolean;
  type: string;
}

export interface DNSZoneCopy {
  disabled: boolean;
  dnssec_status: string;
  expired: boolean;
  /** @format date-time */
  expiry?: string;
  /** @format date-time */
  last_modified?: string;
  name: string;
  notify_failed: boolean;
  /** @format uuid */
  server_id: string;
  server_name: string;
  /**
   * @format int32
   * @min 0
   */
  soa_serial: number;
  sync_failed: boolean;
  type: string;
}

export interface DNSZoneGroup {
  copies: DNSZoneCopy[];
  name: string;
  /** A secondary copy's serial differs from its primary's, or its last transfer failed. */
  out_of_sync: boolean;
}

export interface DNSZoneOptions {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  notify:
    | "None"
    | "ZoneNameServers"
    | "SpecifiedNameServers"
    | "BothZoneAndSpecifiedNameServers";
  notify_failed: boolean;
  notify_failed_for: string[];
  notify_servers: string[];
  /** Secondary zones only. */
  primary_addresses: string[];
  type: string;
  zone_transfer:
    | "Deny"
    | "Allow"
    | "AllowOnlyZoneNameServers"
    | "UseSpecifiedNetworkACL"
    | "AllowZoneNameServersAndUseSpecifiedNetworkACL";
  /** Addresses or networks; a leading ! refuses one. */
  zone_transfer_allowed: string[];
}

export interface DNSZoneOptionsBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  notify:
    | "None"
    | "ZoneNameServers"
    | "SpecifiedNameServers"
    | "BothZoneAndSpecifiedNameServers";
  /** @maxItems 50 */
  notify_servers: string[];
  /**
   * Sent only for a Secondary zone.
   * @maxItems 10
   */
  primary_addresses?: string[];
  zone_transfer:
    | "Deny"
    | "Allow"
    | "AllowOnlyZoneNameServers"
    | "UseSpecifiedNetworkACL"
    | "AllowZoneNameServersAndUseSpecifiedNetworkACL";
  /** @maxItems 50 */
  zone_transfer_allowed: string[];
}

export interface DNSZoneRecords {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  records: DNSRecord[];
  zone: DNSZone;
}

export interface DNSZonesEverywhereOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  problems: DNSServerProblem[];
  zones: DNSZoneGroup[];
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

export interface DatabaseInsight {
  /** @format double */
  latency_p95: number | null;
  /** @format double */
  blocked_max: number | null;
  /**
   * Average share of reads served from memory, 0–1
   * @format double
   */
  cache_hit: number | null;
  /** @format double */
  connections_max: number | null;
  /**
   * Sum over the range
   * @format double
   */
  deadlocks: number | null;
  engine: string;
  /** @format int64 */
  failures: number;
  favorite: boolean;
  /** mariadb for MariaDB; empty otherwise */
  flavor: string;
  health: string;
  /**
   * First sample in the range
   * @format date-time
   */
  history_since: string | null;
  /** @format uuid */
  id: string;
  /** @format double */
  latency_avg: number | null;
  name: string;
  paused: boolean;
  /** @format double */
  qps_avg: number | null;
  /** @format double */
  qps_max: number | null;
  /** @format int64 */
  samples: number;
  /**
   * From the last check
   * @format int64
   */
  size_bytes: number | null;
  /**
   * First measured size in the range
   * @format double
   */
  size_first: number | null;
  /** @format double */
  size_last: number | null;
  status: string;
  /**
   * Share of checks that reached it, 0–1; null without checks
   * @format double
   */
  uptime: number | null;
  /** @format uuid */
  workspace_id: string;
}

export interface DatabaseInsightEvent {
  /** @format date-time */
  at: string;
  check_id: string;
  /** @format uuid */
  database_id: string;
  detail: string;
  kind: string;
  severity: string;
  title: string;
}

export interface DatabaseInsightPoint {
  /**
   * Highest in the bucket
   * @format double
   */
  connections: number | null;
  /** @format uuid */
  database_id: string;
  /** @format int64 */
  failures: number;
  /** @format double */
  latency_avg: number | null;
  /** @format int32 */
  latency_max: number;
  /** @format double */
  max_connections: number | null;
  /** @format double */
  qps: number | null;
  /** @format int64 */
  samples: number;
  /** @format double */
  size_bytes: number | null;
  /** @format date-time */
  t: string;
  /** @format double */
  tps: number | null;
}

export interface DatabaseInsights {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  bucket_seconds: number;
  databases: DatabaseInsight[];
  /** Problems and recoveries, newest first (at most 200) */
  events: DatabaseInsightEvent[];
  /** @format date-time */
  from: string;
  range: string;
  series: DatabaseInsightPoint[];
  /** @format date-time */
  to: string;
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

export interface DetectedContainer {
  /** The Compose project it belongs to */
  compose?: string;
  /** The Compose project's folder on the server */
  compose_dir?: string;
  id: string;
  image: string;
  /** The image is a proxy manager that writes nginx's config itself (Nginx Proxy Manager, nginx-proxy, SWAG): Morcheh doesn't take it over */
  managed?: string;
  mounts: ContainerMount[];
  name: string;
  /** host = shares the server's network; else a bridge (ports must be published) */
  network_mode: string;
  networks: ContainerNetwork[];
  /** @format int64 */
  pid?: number;
  ports: ContainerPort[];
  /** Already in the panel as this proxy */
  proxy_id?: string;
  /** Running, not a proxy manager, and serving the web (80/443 published or the server's network) */
  recommended: boolean;
  /** Restart policy: no, always, unless-stopped, on-failure */
  restart: string;
  running: boolean;
  runtime: "docker" | "podman";
  /** Its Compose service */
  service?: string;
  /** running, exited, paused, restarting, created… */
  state: string;
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

export interface ErrorPage {
  /** @maxItems 11 */
  codes: number[];
  /** @maxLength 2000 */
  message?: string;
  /** @maxLength 200 */
  title?: string;
}

export interface Event {
  /** found = a failure matched; restore = a ban put back after a restart */
  action: "found" | "ban" | "unban" | "restore" | "increase" | "ignore";
  ip: string;
  jail: string;
  /** Server-local time */
  time: string;
}

export interface EventsOutBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: MonitorEvent[];
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

export interface FilterRule {
  action: "allow" | "block" | "reject" | "limit" | "other";
  comment?: string;
  deletable: boolean;
  direction: "in" | "out" | "routed";
  /** Can be changed here, not only removed */
  editable: boolean;
  family: "both" | "v4" | "v6";
  /** Empty = anywhere */
  from: string;
  /** Stable while the rule's meaning stays the same */
  id: string;
  interface?: string;
  log: boolean;
  /** Routed rules only */
  out_interface?: string;
  /** Empty = every port. A port, a range or a comma list */
  port: string;
  /** Lets SSH in for Morcheh or for everyone */
  protects_ssh: boolean;
  /** any, tcp, udp, or another protocol name */
  protocol: string;
  /** The rule as the tool writes it */
  raw: string;
  /** An application profile (ufw) or service (firewalld) */
  service?: string;
  source_port?: string;
  /** Empty = this server */
  to: string;
  /** firewalld */
  zone?: string;
}

export interface FirewallApplyBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @maxItems 100
   * @minItems 1
   */
  rules: FirewallRuleBody[];
  /**
   * Engineer access on each is needed
   * @maxItems 200
   * @minItems 1
   */
  server_ids: string[];
}

export interface FirewallCapabilities {
  comments: boolean;
  /** A forward can be limited to a source and an interface */
  forward_from: boolean;
  /** Morcheh can change port forwards */
  forwards: boolean;
  interface: boolean;
  /** Morcheh can change this firewall */
  manage: boolean;
  outbound: boolean;
  /** The order of the rules matters and can be changed */
  reorder: boolean;
  routed: boolean;
  zones: boolean;
}

export interface FirewallChange {
  /** Rules and forwards it added */
  added: string[];
  backend: string;
  /** @format date-time */
  created_at: string;
  /** @format uuid */
  id: string;
  /** Rules and forwards it removed */
  removed: string[];
  /** A copy of the firewall from before it was saved */
  restorable: boolean;
  /** pending = waiting to be kept; undone = it was taken back straight away */
  status: "applied" | "pending" | "undone";
  summary: string;
  /** Who made it */
  user: string;
}

export interface FirewallChangePreview {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Rules and forwards that would come back */
  adds: string[];
  change: FirewallChange;
  /** Why it can't go back; empty when it can */
  problem: string;
  /** Rules and forwards that would go */
  removes: string[];
  /** The order of the rules would change */
  reordered: boolean;
  /** Settings that would change */
  settings: string[];
}

export interface FirewallDefaults {
  /** What happens to incoming traffic no rule matches: allow, deny or reject */
  incoming: string;
  /** ufw: off, low, medium, high, full. firewalld: off, all, unicast, broadcast, multicast */
  logging: string;
  /** ufw only */
  outgoing: string;
  /** ufw only */
  routed: string;
}

export interface FirewallDeleteBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Rule ids from the overview
   * @maxItems 500
   * @minItems 1
   */
  ids: string[];
}

export interface FirewallEnableBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Rules to add before turning it on. SSH is always allowed
   * @maxItems 64
   */
  allow?: FirewallRuleBody[];
}

export interface FirewallForwardBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * ufw
   * @maxLength 120
   */
  comment?: string;
  /**
   * ufw: only from this IPv4 address or network
   * @maxLength 18
   */
  from?: string;
  /**
   * ufw: only arriving on this interface
   * @maxLength 15
   */
  interface?: string;
  /**
   * The port it arrives on, or a range like 5000-5010
   * @maxLength 16
   */
  port: string;
  protocol: "tcp" | "udp";
  /**
   * Empty = this server
   * @maxLength 15
   */
  to_address?: string;
  /**
   * Empty = the same port
   * @maxLength 5
   */
  to_port?: string;
  /**
   * firewalld; empty = the default zone
   * @maxLength 32
   */
  zone?: string;
}

export interface FirewallForwardDeleteBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Forward ids from the overview
   * @maxItems 200
   * @minItems 1
   */
  ids: string[];
}

export interface FirewallHistory {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Newest first; a server keeps its last 50 */
  items: FirewallChange[];
}

export interface FirewallLog {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Refused packets, newest first */
  events: LogEvent[];
  /** Where it was read from; empty when no log was readable */
  source: string;
}

export interface FirewallMoveBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Put it right above this rule; empty = after all the others
   * @maxLength 32
   */
  before?: string;
}

export interface FirewallOverview {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Reading and changing the firewall needs root or sudo */
  access: "root" | "sudo" | "user";
  /** Filtering traffic right now */
  active: boolean;
  /** The firewall in charge of this server */
  backend: "ufw" | "firewalld" | "nftables" | "iptables" | "none";
  capabilities: FirewallCapabilities;
  /** firewalld */
  default_zone?: string;
  defaults: FirewallDefaults;
  /** Ports sent on to another port or machine */
  forwards: Forward[];
  init: "systemd" | "openrc" | "none";
  /** The address this server sees Morcheh's connection from */
  morcheh_ip: string;
  package_manager: string;
  /** A change waiting to be kept; while it's here, other changes are refused */
  pending?: FirewallPending;
  /** What installing a firewall would install here; empty when it can't be done */
  recommended: string;
  /** In the order the firewall applies them */
  rules: FilterRule[];
  /**
   * The port Morcheh reaches this server on; 0 if unknown
   * @format int64
   */
  ssh_port: number;
  starts_at_boot: boolean;
  version: string;
  warnings: string[];
  /** The address of the person asking, when it isn't a loopback one */
  your_ip: string;
  /** firewalld: every zone */
  zones: Zone[];
}

export interface FirewallPending {
  /**
   * When it runs out the server undoes the change by itself
   * @format int64
   */
  seconds_left: number;
  /** What was changed */
  summary: string;
}

export interface FirewallRaw {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  sections: FirewallRawSection[];
}

export interface FirewallRawSection {
  content: string;
  title: string;
}

export interface FirewallRuleBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** limit = allow, but slow down an address opening many connections */
  action: "allow" | "block" | "reject" | "limit";
  /**
   * ufw only
   * @maxLength 120
   */
  comment?: string;
  /** @default "in" */
  direction?: "in" | "out" | "routed";
  /**
   * An address or network; empty = anywhere
   * @maxLength 64
   */
  from?: string;
  /** @maxLength 15 */
  interface?: string;
  log?: boolean;
  /** @maxLength 15 */
  out_interface?: string;
  /**
   * A port, a range (5000-5010) or a list (80,443); empty = every port
   * @maxLength 128
   */
  port?: string;
  /** @default "any" */
  protocol?: "any" | "tcp" | "udp";
  /**
   * Instead of a port: a firewalld service or ufw application
   * @maxLength 64
   */
  service?: string;
  /**
   * An address or network on this server; empty = any
   * @maxLength 64
   */
  to?: string;
  /** Put it before the other rules. Block and reject rules always go first */
  top?: boolean;
  /**
   * firewalld; empty = the default zone
   * @maxLength 32
   */
  zone?: string;
}

export interface FirewallSettingsBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * firewalld
   * @maxLength 32
   */
  default_zone?: string;
  incoming?: "allow" | "deny" | "reject";
  logging?:
    | "off"
    | "low"
    | "medium"
    | "high"
    | "full"
    | "all"
    | "unicast"
    | "broadcast"
    | "multicast";
  /** ufw only */
  outgoing?: "allow" | "deny" | "reject";
  /** ufw only */
  routed?: "allow" | "deny" | "reject";
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

export interface Forward {
  /** ufw */
  comment?: string;
  /** ufw: only from this address or network; empty = anywhere */
  from?: string;
  /** Stable while its meaning stays the same */
  id: string;
  /** ufw: only arriving on this interface */
  interface?: string;
  /** The port it arrives on, or a range */
  port: string;
  protocol: "tcp" | "udp";
  /** Empty = this server */
  to_address: string;
  /** Empty = the same port */
  to_port: string;
  /** firewalld */
  zone?: string;
}

export interface ForwardAuth {
  /**
   * Headers of the service's answer passed on to the upstream, like Remote-User
   * @maxItems 20
   */
  headers?: string[];
  /**
   * A path the service serves itself on this site, sent to it without a check, like /oauth2/
   * @maxLength 200
   */
  pass_path?: string;
  /** Where visitors who aren't signed in are sent (the page they wanted is added as rd=); empty = they get the 401 */
  signin_url?: string;
  /** The service's check address, like http://127.0.0.1:9091/api/authz/auth-request */
  url?: string;
}

export interface GetProxyLogsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** No such log on the server yet */
  missing: boolean;
  text: string;
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

export interface Hardening {
  /** AI training crawlers (GPTBot, ClaudeBot, CCBot, Bytespider …) */
  ai_crawlers?: boolean;
  /** Backup and dump files: .bak .old .orig .swp .sql .sqlite … and names ending in ~ */
  backups?: boolean;
  /** Hidden files and folders like /.git and /.env (/.well-known stays open) */
  dotfiles?: boolean;
  /**
   * Only these request methods are answered (others get 405); empty = all
   * @maxItems 9
   */
  methods?: string[];
  /** Paths bots try on every site: phpMyAdmin, cgi-bin, phpunit, router exploits */
  probes?: boolean;
  /** Known attack tools by their User-Agent (sqlmap, nikto, nuclei …) */
  scanners?: boolean;
  /**
   * Answer to refused requests; 0 = 404
   * @format int64
   */
  status?: 0 | 403 | 404 | 444;
}

export interface HeaderRule {
  /** @maxLength 100 */
  name: string;
  to: "request" | "response" | "hide";
  /** @maxLength 2000 */
  value: string;
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

export interface HostConfig {
  /**
   * Extra directives in the proxy's own language, added inside the site
   * @maxLength 16384
   */
  advanced?: string;
  /**
   * Addresses or ranges always let in
   * @maxItems 500
   */
  allow?: string[];
  /** Visitors sign in first (proxy, static) */
  auth?: Auth;
  /** Load balancing over more servers (proxy, stream) */
  balance?: Balance;
  /** Also compress with Brotli when the server's nginx has the module (proxy, static, storage) */
  brotli?: boolean;
  /** What browsers keep, and answers the proxy keeps itself (Capabilities.Cache) */
  cache?: Cache;
  /** Answer every name no other site has, as the default server (404 hosts; one per proxy) */
  catch_all?: boolean;
  /**
   * How long to try reaching the upstream; 0 = the proxy's default (proxy, stream)
   * @format int64
   * @min 0
   * @max 75
   */
  connect_timeout_seconds?: number;
  /**
   * Two-letter country codes (ISO 3166-1), like DE
   * @maxItems 250
   */
  countries?: string[];
  /** allow = only these countries get in; deny = these are refused */
  country_mode?: "" | "allow" | "deny";
  /**
   * The whole config file written by hand; when set it's written instead of the generated one
   * @maxLength 65536
   */
  custom?: string;
  /** Everyone else: allow or deny. Empty = deny when allow has entries, else allow */
  default_access?: "" | "allow" | "deny";
  /**
   * Addresses or ranges always refused
   * @maxItems 500
   */
  deny?: string[];
  /**
   * Names it answers, like example.com or *.example.com; empty for a stream
   * @maxItems 50
   */
  domains: string[];
  /**
   * Own pages for error statuses (sites)
   * @maxItems 11
   */
  error_pages?: ErrorPage[];
  /** Compress text answers (proxy, static) */
  gzip?: boolean;
  /** Refuse requests no real visitor makes (sites) */
  hardening?: Hardening;
  /** @maxItems 50 */
  headers?: HeaderRule[];
  /** Leave the proxy's version out of headers and error pages (sites only) */
  hide_version?: boolean;
  /** Resize images on the fly (proxy, static, storage; needs the image-filter module) */
  images?: Images;
  /** Show these pages for the upstream's own errors too (proxy) */
  intercept_errors?: boolean;
  /** Add the requested path and query to the target */
  keep_path?: boolean;
  /**
   * Port the proxy listens on
   * @format int64
   * @min 0
   * @max 65535
   */
  listen_port?: number;
  /** A 503 page for everyone but some addresses (sites) */
  maintenance?: Maintenance;
  /**
   * Largest upload; 0 = the proxy's default
   * @format int64
   * @min 0
   * @max 100000
   */
  max_body_mb?: number;
  /** A copy of requests sent to a test server (proxy; Capabilities.Mirror) */
  mirror?: Mirror;
  /** Pass data straight through without buffering it (proxy): live updates, streamed answers, big uploads */
  no_buffering?: boolean;
  /**
   * What a 404 host answers; 444 closes the connection without an answer. 0 = 404
   * @format int64
   */
  not_found_code?: 0 | 404 | 410 | 444;
  /**
   * Paths sent somewhere else than the main upstream
   * @maxItems 50
   */
  paths?: PathRule[];
  /** Send the visitor's Host header on, not the upstream's */
  preserve_host?: boolean;
  /** tcp (default) or udp */
  protocol?: "" | "tcp" | "udp";
  /** Tell the upstream the visitor's address with the PROXY protocol (stream) */
  proxy_protocol?: boolean;
  /** Limits on requests, connections and speed */
  rate_limit?: RateLimit;
  /** Read the visitor's address from a CDN or load balancer in front (sites only) */
  real_ip?: RealIP;
  /**
   * 0 = 301
   * @format int64
   */
  redirect_code?: 0 | 301 | 302 | 307 | 308;
  /** Where visitors are sent, like https://example.com */
  redirect_to?: string;
  /** Give every request an X-Request-ID, sent to the upstream and back to the visitor (sites) */
  request_id?: boolean;
  /** Folder the files are served from */
  root?: string;
  /** Answer unknown paths with index.html (single-page apps) */
  spa?: boolean;
  /** The bucket a storage site serves (type storage) */
  storage?: StorageSite;
  /** Where connections go, as host:port */
  stream_to?: string;
  /**
   * How long to wait for the upstream; 0 = the proxy's default
   * @format int64
   * @min 0
   * @max 86400
   */
  timeout_seconds?: number;
  /** Plain http only when left out */
  tls?: HostTLS;
  type: "proxy" | "redirect" | "static" | "notfound" | "stream" | "storage";
  /** Where requests go, like http://127.0.0.1:3000 */
  upstream?: string;
  /** How an https upstream is reached (proxy) */
  upstream_tls?: UpstreamTLS;
  /** Web application firewall (proxy, static, storage; needs the waf module) */
  waf?: WAF;
  websockets?: boolean;
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

export interface HostTLS {
  http2?: boolean;
  /** Also answer over HTTP/3 (QUIC, UDP port 443); needs nginx 1.25 or newer built with it */
  http3?: boolean;
  /** Path of the certificate (full chain) on the server */
  certificate?: string;
  /** Path of a CA file on the server: visitors must show a certificate it signed */
  client_ca?: string;
  enabled?: boolean;
  /**
   * Status of that redirect; 0 = 301. 308 keeps the method and body of a POST
   * @format int64
   */
  force_code?: 0 | 301 | 302 | 307 | 308;
  /** Send plain http visitors to https */
  force_https?: boolean;
  /** Tell browsers to only use https */
  hsts?: boolean;
  /**
   * How long browsers remember it, in seconds; 0 = a year
   * @format int64
   * @min 0
   * @max 63072000
   */
  hsts_max_age?: number;
  /** Ask to be built into browsers (hstspreload.org) */
  hsts_preload?: boolean;
  /** The rule covers every subdomain too */
  hsts_subdomains?: boolean;
  /** Path of its private key on the server */
  key?: string;
  /** OCSP stapling: send the certificate's revocation status along (only for certificates that list an OCSP address) */
  ocsp?: boolean;
  /** modern = TLS 1.3 only; intermediate = TLS 1.2 and 1.3 with strong ciphers; old = also TLS 1.0/1.1 for very old clients; empty = the proxy's defaults */
  profile?: "" | "modern" | "intermediate" | "old";
  /** Remember TLS sessions for a day so returning visitors connect faster */
  session_cache?: boolean;
  /** on = a client certificate is required; optional = asked for, not required; empty = off */
  verify_client?: "" | "on" | "optional";
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

export interface Images {
  /** Resize jpg, png, gif and webp images asked for with ?w= and ?h= */
  enabled?: boolean;
  /**
   * Largest original resized, in MB; 0 = 10
   * @format int64
   * @min 0
   * @max 100
   */
  max_size_mb?: number;
  /** resize keeps the proportions; crop fills the exact size. Empty = resize */
  mode?: "" | "resize" | "crop";
  /**
   * JPEG and WebP quality; 0 = 80
   * @format int64
   * @min 0
   * @max 100
   */
  quality?: number;
  /**
   * Widths and heights allowed in ?w= and ?h=; empty = 160, 320, 640, 960, 1280, 1920
   * @maxItems 30
   */
  sizes?: number[];
}

export interface IncidentsOutBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: UptimeIncident[];
}

export interface InstallsOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  hosts: SoftwareHost[];
  items: SoftwareInstall[];
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
  /** What it does: transfer, copy, move, storage-copy, storage-move, compress, extract, fetch, fail2ban-install, fail2ban-uninstall, firewall-install, firewall-apply, ansible-run, schedule-sync, schedule-run, script-run, database-backup, database-backup-verify, database-backup-restore, proxy-setup, proxy-geo, proxy-brotli, proxy-waf, proxy-image-filter, proxy-stream-geo, proxy-certificate, software-run or software-scan */
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
  /**
   * The database it backs up
   * @format uuid
   */
  database_id?: string;
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

export interface KeptPage {
  /**
   * Since the copy was fetched from the app, or last confirmed by it
   * @format int64
   */
  age_seconds: number;
  /** @format int64 */
  bytes: number;
  host: string;
  /** Path and query string */
  path: string;
  /**
   * The app's answer, like 200
   * @format int64
   */
  status?: number;
  /** The page, like https://example.com/blog?page=2 */
  url: string;
  /** Which separate copy, like mobile,android (Cache.Varies) */
  variant?: string;
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

export interface ListAnsibleModulesResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Module[];
  /** ansible-core version */
  version: string;
}

export interface ListDnsServersResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: DNSServer[];
}

export interface ListJobsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Job[];
}

export interface ListOutBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: UptimeMonitor[];
}

export interface ListOutBody1 {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: NotifyChannel[];
}

export interface ListPlaybooksResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Playbook[];
}

export interface ListProxiesResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Proxy[];
}

export interface ListProxyHistoryResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: ProxyChangeSummary[];
}

export interface ListProxyHostWafEventsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  events: WAFEvent[];
}

export interface ListProxyHostsEverywhereResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: ProxyFleetHost[];
}

export interface ListProxyKindsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: ProxyKind[];
}

export interface ListServerNotesResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: ServerNote[];
}

export interface ListServerScriptRunsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: ServerScriptRun[];
  /** @format int64 */
  total: number;
}

export interface ListServerSoftwareResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Null until its first scan */
  host: SoftwareHost;
  items: SoftwareInstall[];
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

export interface LocalTools {
  /** Tools a backup or restore needs that aren't installed here */
  missing: string[];
  /** Why not, when it can't */
  note: string;
  /** Whether this kind of database can be backed up from the Morcheh server at all */
  supported: boolean;
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

export interface LogEvent {
  /** limit = refused by a rate limit */
  action: "block" | "reject" | "limit";
  /** @format date-time */
  at: string;
  dest: string;
  interface?: string;
  /**
   * The port it wanted; 0 for protocols without one
   * @format int64
   */
  port: number;
  protocol: string;
  source: string;
}

export interface LogOutBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: NotificationLogEntry[];
}

export interface Login {
  /** Address, or empty for a local login */
  from: string;
  /** @format date-time */
  time: string;
  tty: string;
}

export interface Maintenance {
  /**
   * Addresses or ranges that still see the site
   * @maxItems 100
   */
  allow?: string[];
  enabled?: boolean;
  /** @maxLength 2000 */
  message?: string;
  /**
   * Sent as Retry-After; 0 = none
   * @format int64
   * @min 0
   * @max 10080
   */
  retry_minutes?: number;
  /**
   * Empty = We'll be back soon
   * @maxLength 200
   */
  title?: string;
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

export interface Mirror {
  /**
   * Share of requests copied; 0 = all
   * @format int64
   * @min 0
   * @max 100
   */
  percent?: number;
  /** Leave request bodies out of the copies */
  skip_body?: boolean;
  /** Test server that gets a copy of requests, like http://10.0.0.9:8080; empty = off */
  to?: string;
}

export interface Module {
  /** packages, files, commands, system, users, network, security, source, containers, databases, cloud, flow or other */
  category: string;
  collection: string;
  /** One line, may hold Ansible markup (C(), O(), V()…) */
  description: string;
  /** Fully qualified name */
  name: string;
  short_name: string;
}

export interface ModuleDoc {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** packages, files, commands, system, users, network, security, source, containers, databases, cloud, flow or other */
  category: string;
  /** full, partial, none or empty when unknown */
  check_mode: string;
  collection: string;
  /** Why not to use it, when it's on its way out */
  deprecated?: string;
  /** One line, may hold Ansible markup (C(), O(), V()…) */
  description: string;
  /** Paragraphs of the long description */
  details: string[];
  /** YAML tasks */
  examples: string;
  /** Takes its main argument as a bare string (command, shell, raw…) */
  free_form: boolean;
  /** Options worth showing up front besides the required ones */
  main: string[];
  /** Fully qualified name */
  name: string;
  notes: string[];
  /** Sorted by name */
  options: ModuleOption[];
  requirements: string[];
  short_name: string;
}

export interface ModuleOption {
  aliases?: string[];
  choices?: any[];
  default?: any;
  /** Paragraphs, may hold Ansible markup */
  description: string[];
  /** Type of a list's items */
  elements?: string;
  name: string;
  required: boolean;
  /** Keys of a dict (or of each item of a list of dicts) */
  suboptions?: ModuleOption[];
  /** str, bool, int, float, path, list, dict, raw, jsonarg… (empty = str) */
  type: string;
}

export interface MonitorBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Check a private or loopback address from Morcheh. System admins only. */
  allow_internal?: boolean;
  /** Where alerts go; left out on create = the workspace's default channels, on update = unchanged */
  channel_ids?: string[];
  config: MonitorConfig;
  /** @maxLength 2000 */
  description?: string;
  /**
   * @format int32
   * @min 10
   * @max 86400
   * @default 60
   */
  interval_seconds?: number;
  /** Can't change after it's created */
  kind:
    | "http"
    | "tcp"
    | "udp"
    | "ping"
    | "dns"
    | "tls"
    | "websocket"
    | "socketio"
    | "smtp"
    | "database"
    | "rabbitmq"
    | "kafka"
    | "nats"
    | "mqtt"
    | "memcached"
    | "elasticsearch"
    | "docker"
    | "systemd"
    | "command"
    | "push";
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** Also alert when it turns slow or degraded (default false) */
  notify_degraded?: boolean;
  /** Create it paused (ignored on update) */
  paused?: boolean;
  /**
   * While down, remind every this many checks; 0 = never
   * @format int32
   * @min 0
   * @max 10000
   */
  resend_every?: number;
  /** push: make a new heartbeat address (the old one stops working) */
  reset_push_token?: boolean;
  /**
   * Failures in a row before it counts as down
   * @format int32
   * @min 0
   * @max 20
   * @default 1
   */
  retries: number;
  /**
   * How soon to check again after a failure
   * @format int32
   * @min 5
   * @max 86400
   * @default 20
   */
  retry_seconds?: number;
  /** A blank secret keeps the saved one */
  secrets: MonitorSecrets;
  /**
   * The server it belongs to, shown on that server's page
   * @format uuid
   */
  server_id?: string;
  /** @maxItems 20 */
  tags?: string[];
  /**
   * @format int32
   * @min 1
   * @max 120
   * @default 10
   */
  timeout_seconds?: number;
  /**
   * Check from this server, over SSH (needed for docker, systemd and command)
   * @format uuid
   */
  via_server_id?: string;
}

export interface MonitorChecksBetweenRow {
  /** @format date-time */
  at: string;
  code: string;
  /** @format int32 */
  latency_ms: number | null;
  message: string;
  status: string;
}

export interface MonitorConfig {
  /** @maxLength 65536 */
  body?: string;
  /**
   * https/tls: degraded when the certificate expires within this many days; 0 = 14
   * @format int64
   * @min 0
   * @max 365
   */
  cert_days?: number;
  /**
   * docker: the container name or id
   * @maxLength 255
   */
  container?: string;
  /**
   * ping: packets to send (default 3)
   * @format int64
   * @min 0
   * @max 20
   */
  count?: number;
  /**
   * database: the database to connect to
   * @maxLength 255
   */
  database?: string;
  /**
   * Slower than this counts as degraded; 0 = never
   * @format int64
   * @min 0
   * @max 600000
   */
  degraded_ms?: number;
  /** database: which one */
  engine?: "postgres" | "mysql" | "mssql" | "redis" | "mongodb" | "";
  /**
   * tcp/udp/websocket: what the answer must contain
   * @maxLength 1000
   */
  expect?: string;
  /**
   * dns: values the answer must include
   * @maxItems 20
   */
  expected?: string[];
  /** Request headers (put secret ones in secrets.headers) */
  headers?: Record<string, string>;
  /** @maxLength 255 */
  host?: string;
  /** Accept a certificate that doesn't verify */
  ignore_tls?: boolean;
  /** How the value is compared (default eq) */
  json_op?: "eq" | "ne" | "contains" | "gt" | "lt" | "exists" | "";
  /**
   * http: a value in a JSON answer, e.g. status or data.items[0].ok
   * @maxLength 300
   */
  json_path?: string;
  /** @maxLength 1000 */
  json_value?: string;
  /**
   * http/websocket: text the answer must (or must not) contain
   * @maxLength 1000
   */
  keyword?: string;
  /** Match case */
  keyword_case?: boolean;
  /** contains (default), absent, or regex */
  keyword_mode?: "contains" | "absent" | "regex" | "";
  method?:
    | "GET"
    | "HEAD"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "OPTIONS"
    | "";
  /** elasticsearch: the worst cluster status still counted as up (default green) */
  min_health?: "green" | "yellow" | "";
  /**
   * dns: the name to look up
   * @maxLength 255
   */
  name?: string;
  /** Don't follow redirects */
  no_redirects?: boolean;
  /**
   * @format int64
   * @min 0
   * @max 65535
   */
  port?: number;
  /** dns: default A */
  record_type?: "A" | "AAAA" | "CNAME" | "MX" | "NS" | "TXT" | "";
  /**
   * dns: the server to ask (ip or ip:port); blank = the system's
   * @maxLength 255
   */
  resolver?: string;
  /**
   * command: a shell command; exit 0 = up, 1 = degraded, anything else = down
   * @maxLength 16384
   */
  script?: string;
  /**
   * tcp/udp/websocket: what to send once connected (\r\n and \n are understood)
   * @maxLength 4096
   */
  send?: string;
  /**
   * tls: the name to ask for (SNI), when not the host
   * @maxLength 255
   */
  server_name?: string;
  /**
   * Accepted status codes or ranges, e.g. 200-299, 301; blank = 200-399
   * @maxItems 20
   */
  statuses?: string[];
  /** command/docker: run through sudo -n */
  sudo?: boolean;
  /** tcp/queues: none or tls; smtp: none, tls or starttls; database: disable, require or verify */
  tls_mode?:
    | "none"
    | "tls"
    | "starttls"
    | "disable"
    | "require"
    | "verify"
    | "";
  /**
   * systemd: the unit, e.g. nginx.service
   * @maxLength 255
   */
  unit?: string;
  /** @maxLength 2000 */
  url?: string;
  /**
   * Basic auth for http; the login for databases, SMTP, queues
   * @maxLength 255
   */
  username?: string;
}

export interface MonitorEvent {
  /** @format date-time */
  at: string;
  from_status: string;
  /** @format int64 */
  id: number;
  message: string;
  monitor_id: string;
  to_status: string;
}

export interface MonitorReport {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  buckets: ReportBucket[];
  /** @format int64 */
  checks: number;
  /** The last 90 days, oldest first */
  days: ReportDay[];
  /** @format int64 */
  degraded: number;
  /** @format int64 */
  down: number;
  /** @format double */
  downtime_seconds: number;
  incident_list: UptimeIncident[];
  /** @format int32 */
  incidents: number;
  /** @format double */
  latency_avg?: number;
  /** @format int32 */
  latency_max?: number;
  range: string;
  /** @format date-time */
  since: string;
  /**
   * Seconds per bucket
   * @format int64
   */
  step: number;
  /** @format int64 */
  up: number;
  /** @format double */
  uptime?: number;
  /** Uptime over 24h, 7d, 30d and 365d */
  windows: ReportWindow[];
}

export interface MonitorSecrets {
  /** Secret request headers (API keys) */
  headers?: Record<string, string>;
  /** @maxLength 1000 */
  password?: string;
  /**
   * http/websocket/elasticsearch: sent as Authorization: Bearer; nats: the auth token
   * @maxLength 4000
   */
  token?: string;
}

export interface MonitorTestBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Check a private or loopback address from Morcheh. System admins only. */
  allow_internal?: boolean;
  /** Where alerts go; left out on create = the workspace's default channels, on update = unchanged */
  channel_ids?: string[];
  config: MonitorConfig;
  /** @maxLength 2000 */
  description?: string;
  /**
   * @format int32
   * @min 10
   * @max 86400
   * @default 60
   */
  interval_seconds?: number;
  /** Can't change after it's created */
  kind:
    | "http"
    | "tcp"
    | "udp"
    | "ping"
    | "dns"
    | "tls"
    | "websocket"
    | "socketio"
    | "smtp"
    | "database"
    | "rabbitmq"
    | "kafka"
    | "nats"
    | "mqtt"
    | "memcached"
    | "elasticsearch"
    | "docker"
    | "systemd"
    | "command"
    | "push";
  /**
   * When editing: the saved monitor, whose secrets blank ones stand for
   * @format uuid
   */
  monitor_id?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** Also alert when it turns slow or degraded (default false) */
  notify_degraded?: boolean;
  /** Create it paused (ignored on update) */
  paused?: boolean;
  /**
   * While down, remind every this many checks; 0 = never
   * @format int32
   * @min 0
   * @max 10000
   */
  resend_every?: number;
  /** push: make a new heartbeat address (the old one stops working) */
  reset_push_token?: boolean;
  /**
   * Failures in a row before it counts as down
   * @format int32
   * @min 0
   * @max 20
   * @default 1
   */
  retries: number;
  /**
   * How soon to check again after a failure
   * @format int32
   * @min 5
   * @max 86400
   * @default 20
   */
  retry_seconds?: number;
  /** A blank secret keeps the saved one */
  secrets: MonitorSecrets;
  /**
   * The server it belongs to, shown on that server's page
   * @format uuid
   */
  server_id?: string;
  /** @maxItems 20 */
  tags?: string[];
  /**
   * @format int32
   * @min 1
   * @max 120
   * @default 10
   */
  timeout_seconds?: number;
  /**
   * Check from this server, over SSH (needed for docker, systemd and command)
   * @format uuid
   */
  via_server_id?: string;
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

export interface NativeProxy {
  installed: boolean;
  running: boolean;
  version?: string;
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

export interface NotificationLogEntry {
  /** @format date-time */
  at: string;
  error: string;
  /** @format int64 */
  id: number;
  /** @format uuid */
  monitor_id?: string;
  monitor_name: string;
  ok: boolean;
  title: string;
}

export interface NotifyChannel {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  allow_internal: boolean;
  config: ChannelConfig;
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  enabled: boolean;
  /** @format uuid */
  id: string;
  /** Added to every new monitor in the workspace */
  is_default: boolean;
  kind: string;
  last_error: string;
  /** @format date-time */
  last_error_at?: string;
  /** @format date-time */
  last_sent_at?: string;
  /**
   * How many monitors use it
   * @format int32
   */
  monitors: number;
  name: string;
  /** Which secrets are saved */
  secrets: string[];
  /** @format date-time */
  updated_at: string;
  updated_by_name: string;
  /** @format uuid */
  workspace_id: string;
}

export interface NotifyChannelBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Send to a private or loopback address. System admins only. */
  allow_internal?: boolean;
  /** Also add it to every monitor the workspace already has */
  attach_all?: boolean;
  config: ChannelConfig;
  /** Default true */
  enabled?: boolean;
  is_default?: boolean;
  /** Can't change after it's created */
  kind:
    | "email"
    | "telegram"
    | "bale"
    | "webhook"
    | "slack"
    | "discord"
    | "mattermost"
    | "teams"
    | "ntfy"
    | "gotify"
    | "pushover";
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** A blank secret keeps the saved one */
  secrets: ChannelSecrets;
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
  /** A palette key; the panel owns the actual colors. */
  color: string;
  description: string;
  /** @format uuid */
  id: string;
  /** Your level on the whole workspace; none if you only reach some servers, storages or services in it. */
  level: string;
  logo_icon: string;
  logo_kind: "letter" | "icon" | "upload";
  /** Where to load the uploaded logo from; changes with the image. Missing = draw the letter or the icon. */
  logo_url?: string;
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

export interface PathRule {
  /** Who can open it: empty = as the site; only = only Addresses; except = everyone but Addresses; everyone = anyone, the site's address lists don't apply here (proxy and static paths) */
  access?: "" | "only" | "except" | "everyone";
  /** Empty = proxy */
  action?: "" | "proxy" | "redirect" | "static" | "deny" | "return";
  /**
   * Addresses or ranges for access only / except
   * @maxItems 200
   */
  addresses?: string[];
  /** @maxLength 4096 */
  advanced?: string;
  /**
   * return: the text answered
   * @maxLength 4096
   */
  body?: string;
  /** Ask to sign in on this path, when the site's sign-in is set to chosen paths only (proxy and static paths) */
  login?: boolean;
  /** Empty = prefix */
  match?: "" | "prefix" | "exact" | "regex";
  /**
   * prefix: starts with /, matches it and everything under it; exact: only this path; regex: a pattern
   * @maxLength 500
   */
  path: string;
  /** No sign-in on this path, when the site asks for one */
  public?: boolean;
  /**
   * redirect: 0 = 302
   * @format int64
   */
  redirect_code?: 0 | 301 | 302 | 307 | 308;
  /** redirect: a full address or a path on this site */
  redirect_to?: string;
  /** static: folder served for this path (exact: the file) */
  root?: string;
  /**
   * deny: 403, 404, 410 or 444; return: 200–599
   * @format int64
   * @min 0
   * @max 599
   */
  status?: number;
  /** proxy, prefix: take the path off before sending (/api/users goes as /users) */
  strip_prefix?: boolean;
  /** proxy: where requests go; empty = the site's own upstream (proxy sites) */
  upstream?: string;
  websockets?: boolean;
}

export interface PauseMonitorRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  paused: boolean;
}

export interface PinServerNoteRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  pinned: boolean;
}

export interface PlanListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: BackupPlan[];
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

export interface PreviewProxyHostRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  config: HostConfig;
  /**
   * The site being edited; empty for a new one
   * @format uuid
   */
  host?: string;
}

export interface PreviewProxyHostResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  problems: ProxyProblem[];
  text: string;
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

export interface ProblemListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: BackupProblem[];
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

export interface Proxy {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  capabilities: Capabilities;
  /** The container's name (docker/podman) */
  container?: string;
  /** @format date-time */
  created_at: string;
  /** @format int64 */
  host_count: number;
  /**
   * Sites whose file on the server isn't what the panel last wrote
   * @format int64
   */
  host_problems: number;
  id: string;
  kind: string;
  kind_label: string;
  /** @format date-time */
  last_checked_at?: string;
  /** host = installed on the server; docker/podman = runs in a container */
  runtime: "host" | "docker" | "podman";
  server_host: string;
  server_id: string;
  server_name: string;
  server_status: string;
  status:
    | "unknown"
    | "online"
    | "stopped"
    | "not_installed"
    | "not_set_up"
    | "config_error"
    | "unreachable"
    | "error";
  status_message: string;
  version: string;
  workspace_id: string;
}

export interface ProxyActionRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action: "test" | "reload" | "start" | "restart" | "stop";
}

export interface ProxyActionResult {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  exit_code: number;
  ok: boolean;
  output: string;
}

export interface ProxyCAListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  authorities: CA[];
}

export interface ProxyChangeDetail {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  created_at: string;
  /** @format int64 */
  host_count: number;
  /** Every site as it was right after this change */
  hosts: ProxyHost[];
  id: string;
  summary: string;
  user_name: string;
}

export interface ProxyChangeSummary {
  /** @format date-time */
  created_at: string;
  /** @format int64 */
  host_count: number;
  id: string;
  summary: string;
  user_name: string;
}

export interface ProxyDetail {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  hosts: ProxyHost[];
  proxy: Proxy;
}

export interface ProxyDetection {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  containers: DetectedContainer[];
  down?: string[];
  kind: string;
  native: NativeProxy;
  /** The one on the server is already in the panel as this proxy */
  native_id?: string;
  runtimes: string[];
  /** host: only on the server; container: one container fits; choose: both, or several containers; install: none found; added: everything found is already in the panel */
  suggestion: "host" | "container" | "choose" | "install" | "added";
}

export interface ProxyFleetHost {
  /** The proxy's container, when it runs in one */
  container?: string;
  host: ProxyHost;
  kind: string;
  proxy_status: string;
  server_id: string;
  server_name: string;
  workspace_id: string;
}

export interface ProxyHost {
  config: HostConfig;
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  domains: string[];
  enabled: boolean;
  /** Its config file is written by hand (config.custom) */
  handwritten?: boolean;
  id: string;
  note: string;
  proxy_id: string;
  /** Header values and raw directives left out (needs Operator) */
  redacted?: boolean;
  /**
   * Send it back as revision when saving
   * @format date-time
   */
  updated_at: string;
  updated_by_name: string;
}

export interface ProxyHostBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  config: HostConfig;
  /** Default true */
  enabled?: boolean;
  /** @maxLength 2000 */
  note?: string;
  /**
   * updated_at as you read it; 409 when someone saved since
   * @format date-time
   */
  revision?: string;
}

export interface ProxyHostReport {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  bots: ProxyReportCount[];
  /** Browsers, tools and bots */
  browsers: ProxyReportCount[];
  cache: ProxyReportCount[];
  detailed: boolean;
  /** Desktop, Phone, Tablet, Bot, Tool */
  devices: ProxyReportCount[];
  domains: ProxyReportCount[];
  durations: ProxyReportBin[];
  /** @format date-time */
  end: string;
  /** Paths answered 5xx */
  failing: ProxyReportCount[];
  /** @format date-time */
  generated: string;
  /**
   * Requests by weekday (0 = Sunday) and hour, in the time zone
   * @maxItems 7
   * @minItems 7
   */
  heatmap: number[][];
  ips: ProxyReportIP[];
  methods: ProxyReportCount[];
  missing: boolean;
  /** Paths answered 404 */
  not_found: ProxyReportCount[];
  /**
   * Oldest line read
   * @format date-time
   */
  oldest?: string;
  /** Too much to read: older lines were left out */
  partial: boolean;
  /** Most asked */
  paths: ProxyReportPath[];
  /** The same length of time before, when the logs reach back that far */
  previous: ProxyReportTotals;
  protocols: ProxyReportCount[];
  range: string;
  /** Other sites that sent visitors, by host */
  referrers: ProxyReportCount[];
  series: ProxyReportSeries;
  /** Highest average time, paths asked at least 3 times */
  slowest: ProxyReportPath[];
  /** @format date-time */
  start: string;
  statuses: ProxyReportCount[];
  stream: boolean;
  systems: ProxyReportCount[];
  time_zone: string;
  totals: ProxyReportTotals;
  upstreams: ProxyReportCount[];
}

export interface ProxyHostState {
  /** Hand-written sites answering the same name */
  conflicts: ProxySiteRef[];
  id: string;
  /** changed = the file on the server differs from what the panel wrote; missing = not on the server */
  state: "ok" | "changed" | "missing" | "off";
  /** A port forward the proxy's container doesn't publish: nothing outside the server reaches it */
  unpublished?: boolean;
}

export interface ProxyHostTraffic {
  /** Bytes sent per minute */
  bytes: number[];
  /** 4xx answers per minute */
  client_errors: number[];
  host_id: string;
  proxy_id: string;
  /** Per minute, oldest first */
  requests: number[];
  /** 5xx answers per minute */
  server_errors: number[];
}

export interface ProxyInspection {
  /** The proxy was built with HTTP/3 (QUIC) */
  http3: boolean;
  ipv6: boolean;
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Signing in through another service (forward auth) works */
  auth_request: boolean;
  /** The Brotli module is loaded */
  brotli: boolean;
  /** The system's CA file, used to check https upstreams */
  ca_bundle?: string;
  /** certbot's version when it's installed (it renews certificates) */
  certbot?: string;
  certificates: Certificate[];
  config_error?: string;
  config_ok: boolean;
  /** What the runtime says about the proxy's container (docker/podman only) */
  container?: ContainerInfo;
  /** Starts at boot */
  enabled: boolean;
  /** Country lookup for country rules: ready, off (not turned on yet). Empty when the kind can't */
  geo: "" | "ready" | "off";
  hosts: ProxyHostState[];
  /** The image filter module is loaded (resizing pictures) */
  image_filter: boolean;
  init: string;
  installed: boolean;
  proxy: Proxy;
  /** Hand-written files Morcheh took default_server from (ports 80 and 443) because one of its sites answers unknown names; they get it back when none does, or when the proxy is removed with its files */
  released_default: string[];
  running: boolean;
  /** The panel's sites are loaded */
  set_up: boolean;
  sites: Site[];
  /** Country rules for port forwards: ready, off (not turned on yet). Empty when the kind can't */
  stream_geo: "" | "ready" | "off";
  /** Port forwards: ready; no_module = the stream module is missing; not_wired = setup hasn't added the stream block; taken = nginx.conf has its own stream block. Empty when the kind has no streams */
  streams: "" | "ready" | "no_module" | "not_wired" | "taken";
  /** Files in Morcheh's folder the panel doesn't know */
  unknown: string[];
  version: string;
  /** The web application firewall works: ModSecurity is loaded and Morcheh's rule set is written */
  waf: boolean;
}

export interface ProxyKeptPagesResult {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  bytes: number;
  /** @format int64 */
  exit_code?: number;
  ok: boolean;
  /** The script's output when it failed */
  output?: string;
  pages: KeptPage[];
  /** @format int64 */
  total: number;
}

export interface ProxyKind {
  capabilities: Capabilities;
  kind: string;
  label: string;
}

export interface ProxyProblem {
  /** Where, like body.config.domains[1] */
  field: string;
  message: string;
}

export interface ProxyPurgeBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Only count what would be cleared */
  dry_run?: boolean;
  /**
   * A saved group of the site (cache.groups), instead of paths and header
   * @maxLength 60
   */
  group?: string;
  /**
   * Only answers the app sent with this header, like Cache-Tag
   * @maxLength 64
   */
  header?: string;
  /**
   * Addresses: /blog/post (that page, everything under it, any query string), * for any characters (/img/*.png), ?query (/search?q=*), a domain in front (shop.example.com/cart) or a whole URL
   * @maxItems 200
   */
  paths?: string[];
  /**
   * That header's value, or one item of its comma-separated list; * = any characters; empty = any value
   * @maxLength 200
   */
  value?: string;
}

export interface ProxyPurgeResult {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * Their size on disk
   * @format int64
   */
  bytes: number;
  /** @format int64 */
  exit_code: number;
  /**
   * Answers cleared (or, with dry_run, that would be)
   * @format int64
   */
  matched: number;
  ok: boolean;
  /** What happened, in words; the script's output when it failed */
  output: string;
}

export interface ProxyReportBin {
  /** @format int64 */
  count: number;
  /**
   * 0 = everything slower than the bin before
   * @format double
   */
  up_to_ms: number;
}

export interface ProxyReportCount {
  /** @format int64 */
  bytes: number;
  /**
   * 4xx and 5xx
   * @format int64
   */
  errors: number;
  name: string;
  /** @format int64 */
  requests: number;
}

export interface ProxyReportIP {
  /** Its most recent browser or client */
  agent?: string;
  /** @format int64 */
  bytes: number;
  /** @format int64 */
  errors: number;
  ip: string;
  /** @format date-time */
  last: string;
  /** @format int64 */
  requests: number;
}

export interface ProxyReportPath {
  /** @format double */
  p95_ms: number | null;
  /** @format double */
  avg_ms: number | null;
  /** @format int64 */
  bytes: number;
  /** @format int64 */
  errors: number;
  /** Without the query string */
  path: string;
  /** @format int64 */
  requests: number;
}

export interface ProxyReportSeries {
  p95_ms: (number | null)[];
  avg_ms: (number | null)[];
  /**
   * Seconds per bucket
   * @format int64
   */
  bucket: number;
  bytes: number[];
  client_errors: number[];
  ok: number[];
  redirects: number[];
  server_errors: number[];
  /** @format date-time */
  start: string;
  visitors: number[];
}

export interface ProxyReportTotals {
  /** @format double */
  p50_ms: number | null;
  /** @format double */
  p95_ms: number | null;
  /** @format double */
  p99_ms: number | null;
  /** @format double */
  avg_ms: number | null;
  /** @format int64 */
  bytes: number;
  /** @format int64 */
  cache_hits: number;
  /**
   * Requests the proxy cache answered or looked up
   * @format int64
   */
  cache_lookups: number;
  /** @format int64 */
  client_errors: number;
  /** @format int64 */
  ok: number;
  /**
   * Bytes received (detailed lines only)
   * @format int64
   */
  received: number;
  /** @format int64 */
  redirects: number;
  /** @format int64 */
  requests: number;
  /** @format int64 */
  server_errors: number;
  /**
   * Average time the upstream took
   * @format double
   */
  upstream_ms: number | null;
  /**
   * Distinct addresses
   * @format int64
   */
  visitors: number;
}

export interface ProxyRequest {
  agent?: string;
  /**
   * Body bytes sent
   * @format int64
   */
  bytes: number;
  /** HIT, MISS, EXPIRED, BYPASS… */
  cache?: string;
  /** Host the request asked for */
  domain?: string;
  /**
   * Time to answer, absent on lines written before detailed logging
   * @format double
   */
  duration_ms?: number;
  /** What the web application firewall made of it, when it flagged it */
  firewall?: ProxyRequestFirewall;
  ip: string;
  /** The line as written */
  line: string;
  /** Empty for a stream */
  method: string;
  /** Path and query string as asked */
  path: string;
  protocol: string;
  referer?: string;
  request_id?: string;
  /**
   * Bytes received, headers included
   * @format int64
   */
  request_length?: number;
  /** @format int64 */
  status: number;
  /** @format date-time */
  time: string;
  upstream_addr?: string;
  /**
   * Time the upstream took
   * @format double
   */
  upstream_ms?: number;
  upstream_status?: string;
  /** Login name sent with the request */
  user?: string;
}

export interface ProxyRequestClasses {
  /**
   * 4xx
   * @format int64
   */
  client_errors: number;
  /**
   * 1xx and 2xx
   * @format int64
   */
  ok: number;
  /**
   * 3xx
   * @format int64
   */
  redirects: number;
  /**
   * 5xx
   * @format int64
   */
  server_errors: number;
}

export interface ProxyRequestFirewall {
  /** Refused by the firewall; false = only logged */
  blocked: boolean;
  rules: WAFMatch[];
}

export interface ProxyRequestFirewallCounts {
  /**
   * Refused by the firewall
   * @format int64
   */
  blocked: number;
  /**
   * Logged by the firewall but let through
   * @format int64
   */
  flagged: number;
}

export interface ProxyRequests {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Matching lines per status class, the status filter left out */
  classes: ProxyRequestClasses;
  /** Pass back to get only lines written after this read */
  cursor: string;
  /** Some lines carry response times (written since detailed logging) */
  detailed: boolean;
  /** Matching lines the firewall flagged, the firewall filter left out */
  firewall: ProxyRequestFirewallCounts;
  /** Newest first */
  items: ProxyRequest[];
  /**
   * Lines matching every filter (more than items when cut by limit)
   * @format int64
   */
  matched: number;
  /** No log for this site on the server yet */
  missing: boolean;
  /**
   * Oldest line read
   * @format date-time
   */
  oldest?: string;
  /** The range held more than could be read: older lines were left out */
  partial: boolean;
  /** The log was rotated since the cursor: read from its start */
  reset: boolean;
  /**
   * Lines read in the time range
   * @format int64
   */
  scanned: number;
  stream: boolean;
}

export interface ProxySiteRef {
  domain: string;
  file: string;
  /** @format int64 */
  line: number;
}

export interface ProxyTraffic {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  hosts: ProxyHostTraffic[];
  /** @format int64 */
  minutes: number;
  sources: ProxyTrafficSource[];
  /**
   * Start of the first minute
   * @format date-time
   */
  start: string;
}

export interface ProxyTrafficSource {
  /** @format date-time */
  collected_at?: string;
  error?: string;
  ok: boolean;
  proxy_id: string;
}

export interface ProxyUpstreamTest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Why it didn't answer */
  error?: string;
  /**
   * How long the answer took, seen from the proxy's server
   * @format int64
   */
  millis: number;
  /** The upstream answered with a status below 500 */
  ok: boolean;
  /**
   * Its HTTP status; 0 when it didn't answer
   * @format int64
   */
  status: number;
}

export interface PushOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  ok: boolean;
}

export interface RateLimit {
  /**
   * Connections one visitor may hold open at once; 0 = no limit
   * @format int64
   * @min 0
   * @max 100000
   */
  conn_per_ip?: number;
  /**
   * Connections the whole site may hold open at once; 0 = no limit
   * @format int64
   * @min 0
   * @max 1000000
   */
  conn_total?: number;
  /**
   * Speed sent to a visitor, per connection, in KB/s; 0 = no limit
   * @format int64
   * @min 0
   * @max 10000000
   */
  download_kbs?: number;
  /** Only log who would have been limited */
  dry_run?: boolean;
  /**
   * Addresses or ranges never limited
   * @maxItems 200
   */
  exempt?: string[];
  /**
   * The first MB of each answer go at full speed; sites only
   * @format int64
   * @min 0
   * @max 100000
   */
  full_speed_mb?: number;
  /**
   * Request limits; sites only
   * @maxItems 20
   */
  rules?: RateRule[];
  /**
   * Answer to refused requests; 0 = 429
   * @format int64
   */
  status?: 0 | 429 | 503 | 444;
  /**
   * Speed read from a visitor, per connection, in KB/s; port forwards only
   * @format int64
   * @min 0
   * @max 10000000
   */
  upload_kbs?: number;
}

export interface RateRule {
  /**
   * Extra requests let through at once above the rate
   * @format int64
   * @min 0
   * @max 100000
   */
  burst?: number;
  /**
   * With mode delay: how many of the burst go at once
   * @format int64
   * @min 0
   * @max 100000
   */
  delay?: number;
  /** ip (default) counts each visitor apart; site counts every visitor together */
  key?: "" | "ip" | "site";
  /**
   * Only these request methods count; empty = all
   * @maxItems 7
   */
  methods?: string[];
  /** What the burst does: nodelay (default) serves it at once, queue slows it to the rate, delay serves the first ones at once and slows the rest */
  mode?: "" | "nodelay" | "queue" | "delay";
  /**
   * Empty = the whole site; else this path and everything under it
   * @maxLength 500
   */
  path?: string;
  per: "second" | "minute";
  /**
   * @format int64
   * @min 1
   * @max 1000000
   */
  rate: number;
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

export interface RealIP {
  /**
   * Addresses or ranges of the CDN or load balancer
   * @maxItems 200
   */
  from?: string[];
  /** Header holding the visitor's address; empty = X-Forwarded-For */
  header?:
    | ""
    | "X-Forwarded-For"
    | "X-Real-IP"
    | "CF-Connecting-IP"
    | "True-Client-IP";
}

export interface Recipe {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Other package names it may be installed as (e.g. the distro's build), per package manager: updated and removed when they're the ones on the server */
  also?: Record<string, string[]>;
  builtin: boolean;
  category: string;
  compose?: string;
  description?: string;
  /** A lucide icon name for the panel */
  icon?: string;
  /** Short name: lowercase letters, digits and dashes */
  id: string;
  install?: string;
  kind: "package" | "docker" | "script";
  links?: RecipeLink[];
  /** A brand logo the panel ships (Simple Icons name, e.g. redis); shown in place of the icon when the panel has it */
  logo?: string;
  name: string;
  /** Shown after it's installed: first steps, where the password is… */
  notes?: string;
  os?: string[];
  packages?: Record<string, string[]>;
  params?: RecipeParam[];
  record_id?: string;
  requires?: string[];
  /** No longer offered for new installs; earlier installs can still be updated and removed */
  retired?: boolean;
  /** One line */
  summary: string;
  uninstall?: string;
  update?: string;
  version_command?: string;
  website?: string;
}

export interface RecipeLink {
  label: string;
  path?: string;
  /** The port parameter's name, or a number */
  port: string;
  scheme?: "http" | "https" | "";
}

export interface RecipeParam {
  default?: string;
  generate?: "password" | "hex" | "";
  help?: string;
  label: string;
  /** Variable name, upper case */
  name: string;
  options?: string[];
  required?: boolean;
  type:
    | "text"
    | "number"
    | "port"
    | "password"
    | "bool"
    | "select"
    | "path"
    | "domain"
    | "email";
}

export interface RecordingListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  everyone: boolean;
  items: TerminalRecording[];
  /** @format int64 */
  total: number;
}

export interface RecordingSettings {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  enabled: boolean;
  /**
   * Recordings older than this are deleted
   * @format int64
   */
  keep_days: number;
  /** @format date-time */
  updated_at?: string;
  updated_by_name?: string;
}

export interface RecordingSettingsBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  enabled: boolean;
  /**
   * @format int64
   * @min 1
   * @max 3650
   */
  keep_days: number;
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

export interface ReportBucket {
  /** @format double */
  latency_p95?: number;
  /** @format date-time */
  at: string;
  /** @format int32 */
  checks: number;
  /** @format int32 */
  degraded: number;
  /** @format int32 */
  down: number;
  /** @format double */
  latency_avg?: number;
  /** @format int32 */
  latency_max?: number;
  /** @format int32 */
  up: number;
}

export interface ReportDay {
  /** @format int32 */
  checks: number;
  /** YYYY-MM-DD, UTC */
  day: string;
  /** @format int32 */
  degraded: number;
  /** @format int32 */
  down: number;
  /** @format int32 */
  up: number;
}

export interface ReportWindow {
  /** @format int64 */
  checks: number;
  range: string;
  /** @format double */
  uptime?: number;
}

export interface ResourceAccess {
  /** @format uuid */
  id: string;
  level: string;
}

export interface RestoreBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * For replace: the target's name typed again
   * @maxLength 128
   */
  confirm?: string;
  /** replace = overwrite a database that exists; new = create one */
  mode: "replace" | "new";
  /** @maxLength 1024 */
  password?: string;
  /**
   * For a direct database: the server the restore runs on, or "local" for the machine Morcheh runs on; empty = the plan's (Morcheh's machine when there's no plan)
   * @maxLength 36
   */
  runner_server_id?: string;
  /** For replace: back the target up first, to the same storage */
  safety_backup?: boolean;
  /**
   * Which storage to read it from; empty = the first that holds all of it
   * @maxLength 36
   */
  storage_id?: string;
  /**
   * The database to load it into
   * @minLength 1
   * @maxLength 128
   */
  target_name: string;
  /**
   * A login for this restore only; empty = the database's saved one
   * @maxLength 256
   */
  username?: string;
}

export interface RestoreListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: BackupRestore[];
  /** @format int64 */
  total: number;
}

export interface RevealSoftwareSecretsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  values: Record<string, string>;
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
  items: SoftwareRun[];
  /** @format int64 */
  total: number;
}

export interface RunListBody1 {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: AnsibleRun[];
  /** @format int64 */
  total: number;
}

export interface RunListBody2 {
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

export interface SaveSoftwareComposeRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @minLength 1
   * @maxLength 262144
   */
  content: string;
  revision: string;
}

export interface Schedule {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action:
    | "sync"
    | "script"
    | "ansible"
    | "service"
    | "reboot"
    | "fetch"
    | "archive"
    | "verify-backup"
    | "software-update";
  /** @format date-time */
  created_at: string;
  cron: string;
  description: string;
  /** sync, archive and fetch */
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
  /** What the task names (servers, script, playbook, database), with names */
  refs: ScheduleRef[];
  /**
   * Runs use this person's access: whoever saved it last
   * @format uuid
   */
  run_as_id: string | null;
  run_as_name: string;
  /** sync and archive */
  source?: ScheduleEndView;
  task: ScheduleTask;
  timezone: string;
  /** @format date-time */
  updated_at: string;
  /** @format uuid */
  workspace_id: string;
}

export interface ScheduleAnsible {
  options?: AnsibleOptions;
  /**
   * A saved playbook; its text is read at each run
   * @format uuid
   */
  playbook_id: string;
  /** Read at each run: servers tagged later are included */
  selection: AnsibleSelection;
}

export interface ScheduleBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * What it does. sync and archive use source and destinations, fetch only destinations (server folders); the rest use task
   * @default "sync"
   */
  action?:
    | "sync"
    | "script"
    | "ansible"
    | "service"
    | "reboot"
    | "fetch"
    | "archive"
    | "verify-backup"
    | "software-update";
  /**
   * Five fields (minute hour day month weekday), or @hourly, @daily, @weekly, @monthly, @every 2h
   * @minLength 1
   * @maxLength 200
   */
  cron: string;
  /** @maxLength 2000 */
  description?: string;
  /** @maxItems 20 */
  destinations?: ScheduleEnd[];
  /** Default true */
  enabled?: boolean;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  options?: ScheduleOptions;
  source?: ScheduleEnd;
  task?: ScheduleTask;
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

export interface ScheduleFetch {
  /**
   * File name to save as; default the address's last part
   * @maxLength 255
   */
  name?: string;
  /** Replace the file each time; without it a run fails where the file is already there */
  overwrite?: boolean;
  /**
   * @minLength 1
   * @maxLength 4096
   */
  url: string;
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
   * Snapshots to keep (snapshot mode), or archives (archive action); 0 = all
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

export interface ScheduleReboot {
  /**
   * Shown to logged-in users first (wall)
   * @maxLength 200
   */
  message?: string;
  /** Skip a server that isn't asking for a reboot (updated kernel or packages) */
  only_if_required?: boolean;
  /**
   * Rebooted one at a time; the next waits until the last is back
   * @maxItems 50
   * @minItems 1
   */
  server_ids: string[];
  /** Skip a server someone is logged in to */
  skip_if_logged_in?: boolean;
}

export interface ScheduleRef {
  /** @format uuid */
  id: string;
  kind: "server" | "storage" | "script" | "playbook" | "database";
  missing: boolean;
  /** Empty when it was deleted */
  name: string;
}

export interface ScheduleRun {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action:
    | "sync"
    | "script"
    | "ansible"
    | "service"
    | "reboot"
    | "fetch"
    | "archive"
    | "verify-backup"
    | "software-update";
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
  link?: ScheduleRunLink;
  options: ScheduleOptions;
  /** While it runs */
  progress: Progress;
  /** One row per destination, server or backup checked */
  results: ScheduleRunDest[];
  /** @format uuid */
  schedule_id: string;
  source?: ScheduleEndView;
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
  /** What happened, when it isn't an error */
  note?: string;
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
  /** partial: some files couldn't be copied. skipped: nothing to do there (a reboot that wasn't needed) */
  state:
    | "pending"
    | "running"
    | "succeeded"
    | "partial"
    | "failed"
    | "canceled"
    | "skipped";
  /** @format uuid */
  storage_id?: string;
}

export interface ScheduleRunLink {
  /** @format uuid */
  id: string;
  kind: "script-run" | "ansible-run" | "database" | "software-run";
}

export interface ScheduleScript {
  /** @maxLength 262144 */
  content?: string;
  /** Values for the script's parameters (or any variables, without a saved script). Kept with the run and shown to whoever can read it */
  env?: Record<string, string>;
  interpreter?: "sh" | "bash" | "python3";
  /**
   * For a command run without saving
   * @maxLength 100
   */
  name?: string;
  run_as?: "user" | "root";
  /**
   * A saved script; the fields below are then ignored
   * @format uuid
   */
  script_id?: string;
  /**
   * @maxItems 200
   * @minItems 1
   */
  server_ids: string[];
  /**
   * @format int32
   * @min 0
   * @max 86400
   */
  timeout_seconds?: number;
}

export interface ScheduleService {
  action: "start" | "stop" | "restart" | "reload";
  /** Stop a protected service (sshd, dbus, journald…) anyway. Needs Engineer */
  force?: boolean;
  /**
   * @maxItems 200
   * @minItems 1
   */
  server_ids: string[];
  /**
   * @minLength 1
   * @maxLength 256
   */
  unit: string;
}

export interface ScheduleSoftware {
  /** Carry on with the other servers after one fails */
  keep_going?: boolean;
  /**
   * Servers at a time; default 1
   * @format int64
   * @min 0
   * @max 20
   */
  parallel?: number;
  /**
   * Applications to update; empty = every one with an update, read at each run
   * @maxItems 100
   */
  recipes?: string[];
  /** System packages: only security updates (apt servers) */
  security_only?: boolean;
  /**
   * @maxItems 200
   * @minItems 1
   */
  server_ids: string[];
  /** Also upgrade the system packages */
  system?: boolean;
}

export interface ScheduleTask {
  /** action ansible */
  ansible?: ScheduleAnsible;
  /** action fetch: what to download into the destination folders */
  fetch?: ScheduleFetch;
  /** action reboot */
  reboot?: ScheduleReboot;
  /** action script */
  script?: ScheduleScript;
  /** action service */
  service?: ScheduleService;
  /** action software-update */
  software?: ScheduleSoftware;
  /** action verify-backup */
  verify?: ScheduleVerify;
}

export interface ScheduleUpdate {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * What it does. sync and archive use source and destinations, fetch only destinations (server folders); the rest use task
   * @default "sync"
   */
  action?:
    | "sync"
    | "script"
    | "ansible"
    | "service"
    | "reboot"
    | "fetch"
    | "archive"
    | "verify-backup"
    | "software-update";
  /**
   * Five fields (minute hour day month weekday), or @hourly, @daily, @weekly, @monthly, @every 2h
   * @minLength 1
   * @maxLength 200
   */
  cron: string;
  /** @maxLength 2000 */
  description?: string;
  /** @maxItems 20 */
  destinations?: ScheduleEnd[];
  /** Default true */
  enabled?: boolean;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  options?: ScheduleOptions;
  /**
   * updated_at when you loaded it; 409 when it changed since
   * @format date-time
   */
  revision?: string;
  source?: ScheduleEnd;
  task?: ScheduleTask;
  /**
   * IANA zone the times are read in; default UTC
   * @maxLength 64
   */
  timezone?: string;
}

export interface ScheduleVerify {
  /** @format uuid */
  database_id: string;
  /**
   * Only this plan's backups; default every plan's
   * @format uuid
   */
  plan_id?: string;
}

export interface Script {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  content: string;
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  description: string;
  /** @format uuid */
  id: string;
  interpreter: "sh" | "bash" | "python3";
  last_run?: ScriptLastRun;
  name: string;
  params: ScriptParam[];
  run_as: "user" | "root";
  /** @format int32 */
  timeout_seconds: number;
  /** @format date-time */
  updated_at: string;
  updated_by_name: string;
  /** @format uuid */
  workspace_id: string;
}

export interface ScriptInput {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 262144 */
  content: string;
  /** @maxLength 2000 */
  description?: string;
  interpreter: "sh" | "bash" | "python3";
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxItems 30 */
  params: ScriptParam[];
  /** user = the server's login user; root = through sudo when it isn't root */
  run_as: "user" | "root";
  /**
   * @format int32
   * @min 1
   * @max 86400
   */
  timeout_seconds: number;
}

export interface ScriptLastRun {
  /** @format date-time */
  at: string;
  /** @format int32 */
  exit_code?: number;
  /** @format uuid */
  run_id: string;
  state: string;
}

export interface ScriptListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: Script[];
}

export interface ScriptParam {
  /** @maxLength 4096 */
  default?: string;
  /**
   * What the run form asks
   * @maxLength 100
   */
  label?: string;
  /**
   * The environment variable
   * @minLength 1
   * @maxLength 64
   * @pattern ^[A-Za-z_][A-Za-z0-9_]*$
   */
  name: string;
  /** A run must give it a value */
  required?: boolean;
}

export interface ScriptRun {
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  error?: string;
  /** @format int32 */
  failed: number;
  /** @format date-time */
  finished_at?: string;
  /** @format uuid */
  id: string;
  interpreter: string;
  /** @format uuid */
  job_id?: string;
  name: string;
  run_as: string;
  /**
   * Unset for a command run without saving, or a script deleted since
   * @format uuid
   */
  script_id?: string;
  server_names: string[];
  /** @format int32 */
  servers: number;
  /** @format date-time */
  started_at?: string;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted";
  /** @format int32 */
  succeeded: number;
  /** @format uuid */
  workspace_id: string;
}

export interface ScriptRunDetail {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  content: string;
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  /** The values it ran with */
  env: Record<string, string>;
  error?: string;
  /** @format int32 */
  failed: number;
  /** @format date-time */
  finished_at?: string;
  /** @format uuid */
  id: string;
  interpreter: string;
  /** @format uuid */
  job_id?: string;
  name: string;
  run_as: string;
  /**
   * Unset for a command run without saving, or a script deleted since
   * @format uuid
   */
  script_id?: string;
  server_names: string[];
  /** @format int32 */
  servers: number;
  /** @format date-time */
  started_at?: string;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted";
  /** @format int32 */
  succeeded: number;
  targets: ScriptRunTarget[];
  /** @format int32 */
  timeout_seconds: number;
  /** @format uuid */
  workspace_id: string;
}

export interface ScriptRunListBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: ScriptRun[];
  /** @format int64 */
  total: number;
}

export interface ScriptRunTarget {
  /** Why it couldn't run at all */
  error?: string;
  /** @format int32 */
  exit_code?: number;
  /** @format date-time */
  finished_at?: string;
  /** stdout and stderr together */
  output: string;
  /** @format int32 */
  position: number;
  /**
   * Unset once the server is deleted
   * @format uuid
   */
  server_id?: string;
  server_name: string;
  /** @format date-time */
  started_at?: string;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted";
  timed_out: boolean;
  /** Output past 1 MiB was dropped */
  truncated: boolean;
}

export interface ScriptUpdate {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 262144 */
  content: string;
  /** @maxLength 2000 */
  description?: string;
  interpreter: "sh" | "bash" | "python3";
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxItems 30 */
  params: ScriptParam[];
  /**
   * Its updated_at when you loaded it: 409 if someone saved in between
   * @format date-time
   */
  revision?: string;
  /** user = the server's login user; root = through sudo when it isn't root */
  run_as: "user" | "root";
  /**
   * @format int32
   * @min 1
   * @max 86400
   */
  timeout_seconds: number;
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

export interface ServerCheckPoint {
  /** @format int64 */
  checks: number;
  /** @format int64 */
  failures: number;
  /**
   * Online checks only; 0 when none
   * @format double
   */
  latency_avg: number;
  /** @format int32 */
  latency_max: number;
  /** @format uuid */
  server_id: string;
  /** @format date-time */
  t: string;
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

export interface ServerInsight {
  /** @format int64 */
  checks: number;
  /** @format int64 */
  failures: number;
  favorite: boolean;
  /**
   * First check in the range
   * @format date-time
   */
  history_since: string | null;
  host: string;
  /** @format uuid */
  id: string;
  /** @format double */
  latency_avg: number | null;
  /** @format int32 */
  latency_max: number | null;
  /**
   * From the last check
   * @format int32
   */
  latency_ms: number | null;
  /** Last sample, any age; missing = never sampled */
  latest?: ServerResourceInfo;
  name: string;
  os_id: string;
  os_name: string;
  /** Missing = no sample in the range */
  resources?: ServerResourceSummary;
  status: string;
  /**
   * Share of checks that found it online, 0–1; null without checks
   * @format double
   */
  uptime: number | null;
  /** @format uuid */
  workspace_id: string;
}

export interface ServerInsights {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format int64 */
  bucket_seconds: number;
  checks: ServerCheckPoint[];
  /** Status changes, newest first (at most 200) */
  events: ServerStatusEvent[];
  /** @format date-time */
  from: string;
  range: string;
  resources: ServerResourcePoint[];
  /**
   * How often resources are read; 0 = off
   * @format int64
   */
  sample_seconds: number;
  servers: ServerInsight[];
  /** @format date-time */
  to: string;
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

export interface ServerNote {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** Markdown */
  body: string;
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  /** @format uuid */
  id: string;
  /** Shown on the server's overview */
  pinned: boolean;
  title: string;
  /**
   * Send it back as revision when saving
   * @format date-time
   */
  updated_at: string;
  updated_by_name: string;
}

export interface ServerNoteBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 100000 */
  body: string;
  pinned?: boolean;
  /** @maxLength 200 */
  title: string;
}

export interface ServerNoteUpdate {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 100000 */
  body: string;
  pinned?: boolean;
  /**
   * The note's updated_at when you loaded it: 409 when someone saved in between
   * @format date-time
   */
  revision?: string;
  /** @maxLength 200 */
  title: string;
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

export interface ServerResourceInfo {
  /** @format double */
  load1: number;
  /** @format date-time */
  at: string;
  /** @format int32 */
  cores: number;
  /** @format double */
  cpu_percent: number;
  disk_max_mount: string;
  /**
   * The fullest filesystem's Use%
   * @format double
   */
  disk_max_percent: number;
  /** @format int64 */
  disk_total_bytes: number;
  /**
   * The root filesystem (the largest one without /)
   * @format int64
   */
  disk_used_bytes: number;
  /** @format int64 */
  mem_total_bytes: number;
  /** @format int64 */
  mem_used_bytes: number;
  /** @format double */
  rx_bytes_per_sec: number;
  /** @format int64 */
  swap_total_bytes: number;
  /** @format int64 */
  swap_used_bytes: number;
  /** @format double */
  tx_bytes_per_sec: number;
}

export interface ServerResourcePoint {
  /** @format double */
  cpu_avg: number;
  /** @format double */
  cpu_max: number;
  /** @format double */
  disk_max: number;
  /** @format int64 */
  disk_used: number;
  /** @format double */
  load_avg: number;
  /** @format double */
  mem_avg: number;
  /** @format double */
  mem_max: number;
  /** @format double */
  rx_avg: number;
  /** @format int64 */
  samples: number;
  /** @format uuid */
  server_id: string;
  /** @format date-time */
  t: string;
  /** @format double */
  tx_avg: number;
}

export interface ServerResourceSummary {
  /** @format double */
  cpu_avg: number;
  /** @format double */
  cpu_max: number;
  /** @format int64 */
  disk_first: number;
  /** @format int64 */
  disk_last: number;
  /**
   * Fullest filesystem's highest Use%
   * @format double
   */
  disk_max: number;
  /** @format date-time */
  first_at: string;
  /** @format date-time */
  last_at: string;
  /**
   * Percent of memory used
   * @format double
   */
  mem_avg: number;
  /** @format double */
  mem_max: number;
  /** @format double */
  rx_avg: number;
  /** @format int64 */
  samples: number;
  /** @format double */
  tx_avg: number;
}

export interface ServerScriptRun {
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  error?: string;
  /** @format int32 */
  exit_code?: number;
  /** @format date-time */
  finished_at?: string;
  interpreter: string;
  name: string;
  run_as: string;
  /** @format uuid */
  run_id: string;
  run_state: string;
  /** @format uuid */
  script_id?: string;
  /**
   * Servers in the whole run
   * @format int32
   */
  servers: number;
  /** @format date-time */
  started_at?: string;
  /** How it went on this server */
  state: string;
  timed_out: boolean;
}

export interface ServerStatusEvent {
  /** @format date-time */
  at: string;
  message: string;
  prev_status: string;
  /** @format uuid */
  server_id: string;
  status: string;
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

export interface SetDnsServerFavoriteRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  favorite: boolean;
}

export interface SetDnsZoneEnabledRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  enabled: boolean;
}

export interface SetProxyHostEnabledRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  enabled: boolean;
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

export interface SetStorageBucketAccessRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  access: "private" | "download" | "public" | "custom";
  /**
   * custom only: the whole policy (JSON)
   * @maxLength 20480
   */
  policy?: string;
}

export interface SetStorageBucketCorsRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxItems 100 */
  rules: BucketCORSRule[];
}

export interface SetStorageBucketEncryptionRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * sse-kms only; empty = the provider's default key
   * @maxLength 2048
   */
  kms_key?: string;
  mode: "none" | "sse-s3" | "sse-kms";
}

export interface SetStorageBucketLifecycleRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxItems 100 */
  rules: BucketLifecycleRule[];
}

export interface SetStorageBucketRetentionRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /**
   * @format int64
   * @min 0
   * @max 36500
   */
  days: number;
  /** Empty = no default retention */
  mode: "" | "GOVERNANCE" | "COMPLIANCE";
}

export interface SetStorageBucketTagsRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  tags: Record<string, string>;
}

export interface SetStorageBucketVersioningRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  enabled: boolean;
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

export interface Site {
  domains: string[];
  file: string;
  /** @format int64 */
  line: number;
  listen: string[];
  /** Written by Morcheh */
  managed: boolean;
  redirect?: string;
  root?: string;
  text?: string;
  tls: boolean;
  upstream?: string;
}

export interface SoftwareHost {
  /** @format date-time */
  checked_at: string;
  compose: string;
  /** Docker's version; empty when it isn't installed or running */
  docker: string;
  /** Why the last scan failed */
  error: string;
  packages: SoftwarePackage[];
  /** Package manager: apt, dnf, yum, zypper, apk or pacman */
  pm: string;
  reboot_required: boolean;
  /**
   * Of which security updates
   * @format int32
   */
  security: number;
  /** @format uuid */
  server_id: string;
  server_name: string;
  server_status: string;
  /**
   * System packages with a newer version
   * @format int32
   */
  upgradable: number;
}

export interface SoftwareImage {
  image: string;
  service: string;
  /** The container's state: running, exited, restarting… */
  state: string;
  /** The registry has a newer image under the same tag */
  update?: boolean;
  version?: string;
}

export interface SoftwareInstall {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  can_rollback: boolean;
  /** @format date-time */
  checked_at: string | null;
  dir?: string;
  error: string;
  /** @format uuid */
  id: string;
  images: SoftwareImage[];
  /** @format date-time */
  installed_at: string | null;
  kind: "package" | "docker" | "script";
  latest: string;
  name: string;
  /** morcheh = installed from the panel; found = a scan found it */
  origin: "morcheh" | "found";
  /** The values it was installed with, without the secret ones */
  params: Record<string, string>;
  /** Runs the version before its last update (rolled back) */
  pinned: boolean;
  project?: string;
  recipe_id: string;
  /** Names of the secret values kept for it (Owners can reveal them) */
  secret_params: string[];
  /** @format uuid */
  server_id: string;
  server_name: string;
  server_status: string;
  /** Docker apps: running, stopped or partial */
  state: string;
  status:
    | "installing"
    | "installed"
    | "updating"
    | "failed"
    | "removing"
    | "missing";
  update_available: boolean;
  /** @format date-time */
  updated_at: string;
  version: string;
  /** @format uuid */
  workspace_id: string;
}

export interface SoftwareInstallActionRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action: "start" | "stop" | "restart";
}

export interface SoftwareInstallLogsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  text: string;
}

export interface SoftwarePackage {
  latest: string;
  name: string;
  security?: boolean;
  version?: string;
}

export interface SoftwarePreflight {
  arch?: string;
  docker?: string;
  /** Applications installed before it on this server (what it requires) */
  first: string[];
  /** @format int64 */
  free_mb?: number;
  /** Already on this server */
  installed: boolean;
  /** Nothing stops the install */
  ok: boolean;
  pm?: string;
  /** What would make it fail */
  problems: string[];
  /** @format uuid */
  server_id: string;
  server_name: string;
  version?: string;
  warnings: string[];
}

export interface SoftwarePreflightRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  params?: Record<string, string>;
  recipe_id: string;
  /**
   * @maxItems 500
   * @minItems 1
   */
  server_ids: string[];
}

export interface SoftwarePreflightResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: SoftwarePreflight[];
}

export interface SoftwareRun {
  action: "install" | "update" | "uninstall" | "rollback" | "upgrade-system";
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  error: string;
  /** @format int32 */
  failed: number;
  /** @format date-time */
  finished_at: string | null;
  /** @format uuid */
  id: string;
  /** @format uuid */
  job_id?: string;
  name: string;
  server_ids: string[];
  server_names: string[];
  /** @format date-time */
  started_at: string | null;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted";
  /** @format int32 */
  succeeded: number;
  /** @format int32 */
  targets: number;
  /** @format uuid */
  workspace_id: string;
}

export interface SoftwareRunDetail {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action: "install" | "update" | "uninstall" | "rollback" | "upgrade-system";
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  error: string;
  /** @format int32 */
  failed: number;
  /** @format date-time */
  finished_at: string | null;
  /** @format uuid */
  id: string;
  /** @format uuid */
  job_id?: string;
  name: string;
  options: SoftwareRunOptions;
  /** The values given, without the secret ones */
  params: Record<string, string>;
  server_ids: string[];
  server_names: string[];
  /** @format date-time */
  started_at: string | null;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted";
  /** One per server and application, in the order they run on each server */
  steps: SoftwareRunTarget[];
  /** @format int32 */
  succeeded: number;
  /** @format int32 */
  targets: number;
  /** @format uuid */
  workspace_id: string;
}

export interface SoftwareRunOptions {
  /** Install of a Docker app: delete data an earlier install left first */
  fresh?: boolean;
  /** System upgrade: apt full-upgrade / dist-upgrade, which may remove packages */
  full?: boolean;
  /**
   * Servers at a time; 0 = 5 for install and uninstall, 1 for the rest
   * @format int64
   * @min 0
   * @max 20
   */
  parallel?: number;
  /** Uninstall of a Docker app: delete its volumes and folder too */
  remove_data?: boolean;
  /** System upgrade: security updates only (apt, dnf, yum, zypper) */
  security_only?: boolean;
  /** Skip the servers not started yet once one fails. Default: on for updates, off for installs */
  stop_on_failure?: boolean;
}

export interface SoftwareRunTarget {
  error: string;
  /** @format date-time */
  finished_at: string | null;
  output: string;
  /** @format int32 */
  position: number;
  recipe_id: string;
  recipe_name: string;
  /** @format uuid */
  server_id?: string;
  server_name: string;
  /** @format date-time */
  started_at: string | null;
  state:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "canceled"
    | "interrupted"
    | "skipped";
  truncated: boolean;
  version_after: string;
  version_before: string;
}

export interface StartOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  job: Job;
  run: SoftwareRunDetail;
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

export interface StartScriptRunBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 262144 */
  content?: string;
  /** Values for the script's parameters (or any variables, without a saved script). Kept with the run and shown to whoever can read it */
  env?: Record<string, string>;
  interpreter?: "sh" | "bash" | "python3";
  /**
   * For a command run without saving
   * @maxLength 100
   */
  name?: string;
  run_as?: "user" | "root";
  /**
   * A saved script; the fields below are then ignored
   * @format uuid
   */
  script_id?: string;
  /**
   * @maxItems 200
   * @minItems 1
   */
  server_ids: string[];
  /**
   * @format int32
   * @min 0
   * @max 86400
   */
  timeout_seconds?: number;
}

export interface StartScriptRunResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  job: Job;
  run: ScriptRunDetail;
}

export interface StartSoftwareRunBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  action: "install" | "update" | "uninstall" | "rollback" | "upgrade-system";
  options?: SoftwareRunOptions;
  /** Install: the recipe's parameters. Empty generated ones are made for each server */
  params?: Record<string, string>;
  /**
   * Install: exactly one. Update, uninstall, rollback: the applications ("system" = the server's packages); empty for update = every one with an update. Ignored by upgrade-system
   * @maxItems 100
   */
  recipes?: string[];
  /**
   * @maxItems 500
   * @minItems 1
   */
  server_ids: string[];
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

export interface StorageActivityPoint {
  /** @format int64 */
  bytes: number;
  /** @format int64 */
  failed: number;
  /** @format int64 */
  files: number;
  /** transfer = copies and moves, sync = cron job runs, backup = database backups */
  kind: "transfer" | "sync" | "backup";
  /** @format int64 */
  ok: number;
  /** @format date-time */
  t: string;
}

export interface StorageActivityTotals {
  /** @format int64 */
  bytes: number;
  /** @format int64 */
  failed: number;
  /** @format int64 */
  ok: number;
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

export interface StorageInsight {
  /** @format double */
  latency_p95: number | null;
  activity: StorageActivityTotals;
  /** @format int64 */
  checks: number;
  /** @format int64 */
  failures: number;
  /**
   * First check in the range
   * @format date-time
   */
  history_since: string | null;
  /** @format uuid */
  id: string;
  /** @format double */
  latency_avg: number | null;
  /**
   * From the last check
   * @format int32
   */
  latency_ms: number | null;
  name: string;
  protocol: string;
  provider: string;
  status: string;
  /**
   * Share of checks that found it online, 0–1; null without checks
   * @format double
   */
  uptime: number | null;
  /** Last measurement, any age; missing = never measured */
  usage?: StorageUsageInfo;
  /** @format uuid */
  workspace_id: string;
}

export interface StorageInsights {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  activity: StorageActivityPoint[];
  /** @format int64 */
  bucket_seconds: number;
  /** Status changes, newest first (at most 200) */
  events: StorageStatusEvent[];
  /** @format date-time */
  from: string;
  latency: StorageLatencyPoint[];
  range: string;
  storages: StorageInsight[];
  /** @format date-time */
  to: string;
  /** Measurements in the range, plus each storage's last one before it */
  usage: StorageUsagePoint[];
}

export interface StorageLatencyPoint {
  /** @format int64 */
  checks: number;
  /** @format int64 */
  failures: number;
  /**
   * Online checks only; 0 when none
   * @format double
   */
  latency_avg: number;
  /** @format int32 */
  latency_max: number;
  /** @format uuid */
  storage_id: string;
  /** @format date-time */
  t: string;
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

export interface StorageSite {
  /** Bucket the site serves */
  bucket: string;
  /** Filled in by the server: where the files are read from, like https://s3.example.com */
  endpoint?: string;
  /** Folder inside the bucket, like /site; empty = the whole bucket */
  folder?: string;
  /** Filled in by the server: the bucket goes in the path, not the host name */
  path_style?: boolean;
  /** The S3 storage (from the Storage section) the files come from */
  storage_id: string;
}

export interface StorageStatusEvent {
  /** @format date-time */
  at: string;
  message: string;
  prev_status: string;
  status: string;
  /** @format uuid */
  storage_id: string;
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

export interface StorageUsageInfo {
  /** @format int32 */
  duration_ms: number;
  /** @format int64 */
  files: number;
  /** @format int64 */
  folders: number;
  /**
   * Free space on that disk (SFTP only)
   * @format int64
   */
  free_bytes: number | null;
  /** @format date-time */
  measured_at: string;
  /** Stopped before the end: too big to walk in time */
  partial: boolean;
  top: StorageUsagePart[];
  /**
   * Size of the disk behind it (SFTP only)
   * @format int64
   */
  total_bytes: number | null;
  /** @format int64 */
  used_bytes: number;
}

export interface StorageUsagePart {
  /** @format int64 */
  bytes: number;
  /** @format int64 */
  files: number;
  /** Top-level folder or bucket; empty = files right in the top folder */
  name: string;
  /** Everything past the biggest folders, summed */
  other: boolean;
}

export interface StorageUsagePoint {
  /** @format int64 */
  files: number;
  /** @format uuid */
  storage_id: string;
  /** @format date-time */
  t: string;
  /** @format int64 */
  used_bytes: number;
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

export interface TerminalRecording {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  can_delete: boolean;
  /** @format int64 */
  cols: number;
  /** @format int64 */
  duration_ms: number;
  /**
   * Missing while the shell runs
   * @format date-time
   */
  ended_at?: string;
  /** @format int64 */
  exit_code?: number;
  /** @format uuid */
  id: string;
  /** Morcheh restarted while the shell was open; the end is missing */
  interrupted: boolean;
  /** The shell is still open */
  live: boolean;
  /** The caller opened this shell */
  mine: boolean;
  /** @format int64 */
  rows: number;
  /**
   * Missing when the server was deleted
   * @format uuid
   */
  server_id?: string;
  server_name: string;
  /**
   * Output bytes recorded
   * @format int64
   */
  size: number;
  /** @format date-time */
  started_at: string;
  title: string;
  /** It reached the size limit; later output wasn't kept */
  truncated: boolean;
  /** Who opened the shell */
  user_name: string;
  /** @format uuid */
  workspace_id: string;
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
  /** Its output is being recorded (the workspace records terminals) */
  recorded: boolean;
  /** @format int64 */
  rows: number;
  title: string;
}

export interface TestProxyHostRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  config: HostConfig;
  /**
   * The site being edited; empty for a new one
   * @format uuid
   */
  host?: string;
}

export interface TestProxyUpstreamRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @maxLength 500 */
  upstream: string;
  upstream_tls?: UpstreamTLS;
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

export interface UpdateDnsRecordRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  current: DNSRecordBody;
  new: DNSRecordBody;
}

export interface UpstreamServer {
  /** host:port, like 10.0.0.6:3000; empty for the main server */
  address?: string;
  /** Only used when the others are down (not with ip_hash, hash or random) */
  backup?: boolean;
  /** Taken out by hand: gets nothing */
  down?: boolean;
  /**
   * Most connections at once; 0 = no limit
   * @format int64
   * @min 0
   * @max 100000
   */
  max_conns?: number;
  /**
   * What it is, for people
   * @maxLength 200
   */
  note?: string;
  /**
   * Share of the traffic compared with the others; 0 = 1
   * @format int64
   * @min 0
   * @max 1000
   */
  weight?: number;
}

export interface UpstreamTLS {
  /** CA file on the server to check it against; empty = the system's */
  ca?: string;
  /** Client certificate shown to the upstream (mutual TLS) */
  certificate?: string;
  /** Its private key */
  key?: string;
  /** Name sent (SNI) and checked; empty = the upstream address's host */
  name?: string;
  /** Check the upstream's certificate; off accepts any (self-signed included) */
  verify?: boolean;
}

export interface UptimeIncident {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  /** @format date-time */
  acknowledged_at?: string;
  acknowledged_by_name: string;
  cause: string;
  /** @format uuid */
  id: string;
  /** @format uuid */
  monitor_id: string;
  monitor_kind?: string;
  monitor_name?: string;
  note: string;
  /** @format date-time */
  resolved_at?: string;
  /**
   * How long it lasted (so far, when open)
   * @format double
   */
  seconds: number;
  /** @format date-time */
  started_at: string;
  workspace_id?: string;
}

export interface UptimeMonitor {
  /**
   * Percent of checks up or degraded
   * @format double
   */
  uptime_24h?: number;
  /** @format double */
  uptime_30d?: number;
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  allow_internal: boolean;
  /** @format date-time */
  cert_expires_at?: string;
  channel_ids: string[];
  config: MonitorConfig;
  /** @format date-time */
  created_at: string;
  created_by_name: string;
  description: string;
  /**
   * Failed checks in a row; above 0 while still up = retrying
   * @format int32
   */
  fail_count: number;
  /** @format uuid */
  id: string;
  /** @format int32 */
  interval_seconds: number;
  kind: string;
  /** @format date-time */
  last_checked_at?: string;
  /** @format int32 */
  last_latency_ms?: number;
  name: string;
  /** @format date-time */
  next_check_at: string;
  notify_degraded: boolean;
  paused: boolean;
  /** push: the secret in the heartbeat address (Engineer and up) */
  push_token?: string;
  /** The newest checks, oldest first */
  recent: Beat[];
  /** @format int32 */
  resend_every: number;
  /** @format int32 */
  retries: number;
  /** @format int32 */
  retry_seconds: number;
  /** Which secrets are saved */
  secrets: string[];
  /** @format uuid */
  server_id?: string;
  status: "pending" | "up" | "degraded" | "down";
  status_message: string;
  /** @format date-time */
  status_since: string;
  tags: string[];
  /** @format int32 */
  timeout_seconds: number;
  /** @format date-time */
  updated_at: string;
  updated_by_name: string;
  /** @format uuid */
  via_server_id?: string;
  /** @format uuid */
  workspace_id: string;
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

export interface WAF {
  /** Empty = off; detect = only log what it would refuse; block = refuse it (403) */
  mode?: "" | "detect" | "block";
  /**
   * Paranoia level 1-4; 0 = 1
   * @format int64
   * @min 0
   * @max 4
   */
  paranoia?: number;
  /**
   * Path prefixes the firewall doesn't check, like /api/upload
   * @maxItems 50
   */
  skip_paths?: string[];
  /**
   * Rule ids turned off for this site, like 942100
   * @maxItems 200
   */
  skip_rules?: number[];
  /**
   * Anomaly score that refuses a request; 0 = 5 (the rule set's default)
   * @format int64
   * @min 0
   * @max 100
   */
  threshold?: number;
}

export interface WAFEvent {
  /** The firewall refused it; false = only logged (Log only, or under the score) */
  blocked: boolean;
  /** The request's unique id (the access log's request id, for requests since the site was saved with the firewall on) */
  id: string;
  ip: string;
  method: string;
  rules: WAFMatch[];
  /**
   * What the visitor got (403 = refused by the firewall)
   * @format int64
   */
  status: number;
  /** When, as the server logged it */
  time: string;
  /** Path and query string */
  uri: string;
}

export interface WAFMatch {
  /** What matched, and where */
  data?: string;
  id: string;
  message: string;
  severity?: string;
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
  /** Empty keeps the current one (indigo for a new workspace). */
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
  /** @maxLength 500 */
  description?: string;
  /**
   * The Lucide icon for logo_kind icon.
   * @maxLength 40
   * @pattern ^[a-z0-9-]*$
   */
  logo_icon?: string;
  /** Empty keeps the current one. Leaving upload drops the picture; upload needs one (PUT /workspaces/{id}/logo). */
  logo_kind?: "letter" | "icon" | "upload";
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
  /** A palette key; the panel owns the actual colors. */
  color: string;
  description: string;
  /** @format uuid */
  id: string;
  /** Your level on the whole workspace; none if you only reach some servers, storages or services in it. */
  level: string;
  logo_icon: string;
  logo_kind: "letter" | "icon" | "upload";
  /** Where to load the uploaded logo from; changes with the image. Missing = draw the letter or the icon. */
  logo_url?: string;
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

export interface Zone {
  /** It has interfaces or sources, so it's in use */
  active: boolean;
  default: boolean;
  interfaces: string[];
  masquerade: boolean;
  name: string;
  sources: string[];
  /** What happens to traffic no rule matches */
  target: string;
}

export interface ZonesOutputBody {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: DNSZone[];
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
     * @description For anyone who sees the workspace in their list. Use logo_url from the workspace, which changes with the image.
     *
     * @tags Workspaces
     * @name GetWorkspaceLogo
     * @summary A workspace's uploaded logo
     * @request GET:/workspaces/{id}/logo
     */
    getWorkspaceLogo: (id: string, params: RequestParams = {}) =>
      this.request<Blob, ErrorModel>({
        path: `/workspaces/${id}/logo`,
        method: "GET",
        format: "blob",
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
     * @description The raw image (PNG, JPEG, GIF, WebP, ICO or SVG, up to 1 MB); its type is read from the bytes. The workspace switches to it (logo_kind = upload).
     *
     * @tags Workspaces
     * @name PutWorkspaceLogo
     * @summary Upload a workspace's logo
     * @request PUT:/workspaces/{id}/logo
     */
    putWorkspaceLogo: (id: string, data: File, params: RequestParams = {}) =>
      this.request<PanelWorkspace, ErrorModel>({
        path: `/workspaces/${id}/logo`,
        method: "PUT",
        body: data,
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
     * @description Its name, description and how it shows in the panel (color and logo). An uploaded logo goes up with PUT /workspaces/{id}/logo.
     *
     * @tags Workspaces
     * @name UpdateWorkspace
     * @summary Edit a workspace
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
     * @name GetAnsibleModule
     * @summary Describe a module: its options and examples
     * @request GET:/ansible/modules/{name}
     */
    getAnsibleModule: (name: string, params: RequestParams = {}) =>
      this.request<ModuleDoc, ErrorModel>({
        path: `/ansible/modules/${name}`,
        method: "GET",
        format: "json",
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
     * @description Read from ansible-doc and kept until Ansible is upgraded.
     *
     * @tags Ansible
     * @name ListAnsibleModules
     * @summary List the modules installed with Ansible
     * @request GET:/ansible/modules
     */
    listAnsibleModules: (params: RequestParams = {}) =>
      this.request<ListAnsibleModulesResponse, ErrorModel>({
        path: `/ansible/modules`,
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
      this.request<RunListBody1, ErrorModel>({
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
  databaseBackups = {
    /**
     * @description Stops the whole run: other databases of it that haven't finished stop too.
     *
     * @tags Database backups
     * @name CancelDatabaseBackup
     * @summary Stop a backup that's running
     * @request POST:/database-backups/{id}/cancel
     */
    cancelDatabaseBackup: (id: string, params: RequestParams = {}) =>
      this.request<Backup, ErrorModel>({
        path: `/database-backups/${id}/cancel`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Database backups
     * @name CreateDatabaseBackupPlan
     * @summary Add a backup plan
     * @request POST:/databases/{id}/backup-plans
     */
    createDatabaseBackupPlan: (
      id: string,
      data: BackupPlanBody,
      params: RequestParams = {},
    ) =>
      this.request<BackupPlan, ErrorModel>({
        path: `/databases/${id}/backup-plans`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Deletes its file from every storage, and the incrementals that build on it with theirs.
     *
     * @tags Database backups
     * @name DeleteDatabaseBackup
     * @summary Delete a backup and its files
     * @request DELETE:/database-backups/{id}
     */
    deleteDatabaseBackup: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/database-backups/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Its backups stay, in the list and on the Storages.
     *
     * @tags Database backups
     * @name DeleteDatabaseBackupPlan
     * @summary Delete a backup plan
     * @request DELETE:/database-backup-plans/{id}
     */
    deleteDatabaseBackupPlan: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/database-backup-plans/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description From the storage named, or else the first one holding it that the caller can read.
     *
     * @tags Database backups
     * @name DownloadDatabaseBackup
     * @summary Download a backup's file
     * @request GET:/database-backups/{id}/download
     */
    downloadDatabaseBackup: (
      id: string,
      query?: {
        /**
         * Which copy
         * @format uuid
         */
        storage?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorModel>({
        path: `/database-backups/${id}/download`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Database backups
     * @name GetDatabaseBackup
     * @summary Get a backup
     * @request GET:/database-backups/{id}
     */
    getDatabaseBackup: (id: string, params: RequestParams = {}) =>
      this.request<Backup, ErrorModel>({
        path: `/database-backups/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Lists its databases (it connects to do so) and says which ways of choosing them, and whether incrementals, work here.
     *
     * @tags Database backups
     * @name GetDatabaseBackupOptions
     * @summary What a backup plan for this database can choose from
     * @request GET:/databases/{id}/backup-options
     */
    getDatabaseBackupOptions: (id: string, params: RequestParams = {}) =>
      this.request<BackupOptions, ErrorModel>({
        path: `/databases/${id}/backup-options`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Database backups
     * @name GetDatabaseBackupPlan
     * @summary Get a backup plan
     * @request GET:/database-backup-plans/{id}
     */
    getDatabaseBackupPlan: (id: string, params: RequestParams = {}) =>
      this.request<BackupPlan, ErrorModel>({
        path: `/database-backup-plans/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Database backups
     * @name ListDatabaseBackupPlans
     * @summary List a database's backup plans
     * @request GET:/databases/{id}/backup-plans
     */
    listDatabaseBackupPlans: (id: string, params: RequestParams = {}) =>
      this.request<PlanListBody, ErrorModel>({
        path: `/databases/${id}/backup-plans`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Database backups
     * @name ListDatabaseBackupProblems
     * @summary Backup plans whose newest run failed
     * @request GET:/database-backup-problems
     */
    listDatabaseBackupProblems: (params: RequestParams = {}) =>
      this.request<ProblemListBody, ErrorModel>({
        path: `/database-backup-problems`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Database backups
     * @name ListDatabaseBackups
     * @summary List a database's backups, newest first
     * @request GET:/databases/{id}/backups
     */
    listDatabaseBackups: (
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
      },
      params: RequestParams = {},
    ) =>
      this.request<BackupListBody, ErrorModel>({
        path: `/databases/${id}/backups`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Database backups
     * @name ListDatabaseRestores
     * @summary A database's restores, newest first
     * @request GET:/databases/{id}/restores
     */
    listDatabaseRestores: (
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
      },
      params: RequestParams = {},
    ) =>
      this.request<RestoreListBody, ErrorModel>({
        path: `/databases/${id}/restores`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Loads the backup, and the full one an incremental builds on, into a database that exists (replace, with its name typed again, optionally backed up first) or a new one. Every file is read back and checked before the database is touched.
     *
     * @tags Database backups
     * @name RestoreDatabaseBackup
     * @summary Restore a backup into a database
     * @request POST:/database-backups/{id}/restore
     */
    restoreDatabaseBackup: (
      id: string,
      data: RestoreBody,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/database-backups/${id}/restore`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Database backups
     * @name RunDatabaseBackupPlan
     * @summary Back up now
     * @request POST:/database-backup-plans/{id}/run
     */
    runDatabaseBackupPlan: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/database-backup-plans/${id}/run`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description It runs with the access of whoever saves it last.
     *
     * @tags Database backups
     * @name UpdateDatabaseBackupPlan
     * @summary Change a backup plan
     * @request PUT:/database-backup-plans/{id}
     */
    updateDatabaseBackupPlan: (
      id: string,
      data: BackupPlanBody,
      params: RequestParams = {},
    ) =>
      this.request<BackupPlan, ErrorModel>({
        path: `/database-backup-plans/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Reads every stored copy and compares its size and checksum with what was sent, and looks at its format. It doesn't restore anything.
     *
     * @tags Database backups
     * @name VerifyDatabaseBackup
     * @summary Read a backup back and check it
     * @request POST:/database-backups/{id}/verify
     */
    verifyDatabaseBackup: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/database-backups/${id}/verify`,
        method: "POST",
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
     * @description For the databases this person can see (in the selected workspace), from the monitor's samples (kept 30 days). Series come bucketed: 30 min for 24h, 4 h for 7d, a day for 30d.
     *
     * @tags Databases
     * @name DatabaseInsights
     * @summary Availability, response time, load and size of the databases
     * @request GET:/databases/insights
     */
    databaseInsights: (
      query?: {
        /** @default "7d" */
        range?: "24h" | "7d" | "30d";
        /** IANA time zone the buckets line up with (days start at its midnight) */
        tz?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DatabaseInsights, ErrorModel>({
        path: `/databases/insights`,
        method: "GET",
        query: query,
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
  dns = {
    /**
     * @description Answers with the zone's records, fresh.
     *
     * @tags DNS
     * @name AddDnsRecord
     * @summary Add a record
     * @request POST:/dns-servers/{id}/zones/{zone}/records
     */
    addDnsRecord: (
      id: string,
      zone: string,
      data: DNSRecordBody,
      params: RequestParams = {},
    ) =>
      this.request<DNSZoneRecords, ErrorModel>({
        path: `/dns-servers/${id}/zones/${zone}/records`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DNS
     * @name CheckDnsServer
     * @summary Check a DNS server's connection
     * @request POST:/dns-servers/{id}/check
     */
    checkDnsServer: (id: string, params: RequestParams = {}) =>
      this.request<DNSServer, ErrorModel>({
        path: `/dns-servers/${id}/check`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DNS
     * @name CreateDnsServer
     * @summary Connect a DNS server
     * @request POST:/dns-servers
     */
    createDnsServer: (data: DNSServerBody, params: RequestParams = {}) =>
      this.request<DNSServer, ErrorModel>({
        path: `/dns-servers`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DNS
     * @name CreateDnsZone
     * @summary Create a zone
     * @request POST:/dns-servers/{id}/zones
     */
    createDnsZone: (
      id: string,
      data: CreateDnsZoneRequest,
      params: RequestParams = {},
    ) =>
      this.request<CreateDnsZoneResponse, ErrorModel>({
        path: `/dns-servers/${id}/zones`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description A POST because the record's data says which one. Answers with the zone's records, fresh.
     *
     * @tags DNS
     * @name DeleteDnsRecord
     * @summary Delete a record
     * @request POST:/dns-servers/{id}/zones/{zone}/records/delete
     */
    deleteDnsRecord: (
      id: string,
      zone: string,
      data: DNSRecordBody,
      params: RequestParams = {},
    ) =>
      this.request<DNSZoneRecords, ErrorModel>({
        path: `/dns-servers/${id}/zones/${zone}/records/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Morcheh forgets the connection and its token. Nothing on the DNS server changes.
     *
     * @tags DNS
     * @name DeleteDnsServer
     * @summary Disconnect a DNS server
     * @request DELETE:/dns-servers/{id}
     */
    deleteDnsServer: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/dns-servers/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Deletes it from the DNS server, with every record in it.
     *
     * @tags DNS
     * @name DeleteDnsZone
     * @summary Delete a zone
     * @request DELETE:/dns-servers/{id}/zones/{zone}
     */
    deleteDnsZone: (id: string, zone: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/dns-servers/${id}/zones/${zone}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DNS
     * @name GetDnsServer
     * @summary Get a DNS server
     * @request GET:/dns-servers/{id}
     */
    getDnsServer: (id: string, params: RequestParams = {}) =>
      this.request<DNSServer, ErrorModel>({
        path: `/dns-servers/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DNS
     * @name GetDnsZoneOptions
     * @summary A zone's transfer and notify settings
     * @request GET:/dns-servers/{id}/zones/{zone}/options
     */
    getDnsZoneOptions: (id: string, zone: string, params: RequestParams = {}) =>
      this.request<DNSZoneOptions, ErrorModel>({
        path: `/dns-servers/${id}/zones/${zone}/options`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DNS
     * @name ListDnsRecords
     * @summary List a zone's records
     * @request GET:/dns-servers/{id}/zones/{zone}/records
     */
    listDnsRecords: (id: string, zone: string, params: RequestParams = {}) =>
      this.request<DNSZoneRecords, ErrorModel>({
        path: `/dns-servers/${id}/zones/${zone}/records`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Favourites first, then by name.
     *
     * @tags DNS
     * @name ListDnsServers
     * @summary List DNS servers
     * @request GET:/dns-servers
     */
    listDnsServers: (params: RequestParams = {}) =>
      this.request<ListDnsServersResponse, ErrorModel>({
        path: `/dns-servers`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description The server's built-in zones are left out.
     *
     * @tags DNS
     * @name ListDnsZones
     * @summary List a DNS server's zones
     * @request GET:/dns-servers/{id}/zones
     */
    listDnsZones: (id: string, params: RequestParams = {}) =>
      this.request<ZonesOutputBody, ErrorModel>({
        path: `/dns-servers/${id}/zones`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Asks every server in scope at once. A server that doesn't answer is listed under problems, and the rest still come back.
     *
     * @tags DNS
     * @name ListDnsZonesEverywhere
     * @summary Zones across every DNS server
     * @request GET:/dns-zones
     */
    listDnsZonesEverywhere: (params: RequestParams = {}) =>
      this.request<DNSZonesEverywhereOutputBody, ErrorModel>({
        path: `/dns-zones`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description The server fetches the zone from its primary now instead of waiting.
     *
     * @tags DNS
     * @name ResyncDnsZone
     * @summary Copy a Secondary zone again
     * @request POST:/dns-servers/{id}/zones/{zone}/resync
     */
    resyncDnsZone: (id: string, zone: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/dns-servers/${id}/zones/${zone}/resync`,
        method: "POST",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DNS
     * @name SetDnsServerFavorite
     * @summary Star or unstar a DNS server
     * @request PUT:/dns-servers/{id}/favorite
     */
    setDnsServerFavorite: (
      id: string,
      data: SetDnsServerFavoriteRequest,
      params: RequestParams = {},
    ) =>
      this.request<DNSServer, ErrorModel>({
        path: `/dns-servers/${id}/favorite`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description A disabled zone stays on the server but isn't answered for.
     *
     * @tags DNS
     * @name SetDnsZoneEnabled
     * @summary Enable or disable a zone
     * @request PUT:/dns-servers/{id}/zones/{zone}/enabled
     */
    setDnsZoneEnabled: (
      id: string,
      zone: string,
      data: SetDnsZoneEnabledRequest,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorModel>({
        path: `/dns-servers/${id}/zones/${zone}/enabled`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Answers with the settings, fresh.
     *
     * @tags DNS
     * @name SetDnsZoneOptions
     * @summary Change a zone's transfer and notify settings
     * @request PUT:/dns-servers/{id}/zones/{zone}/options
     */
    setDnsZoneOptions: (
      id: string,
      zone: string,
      data: DNSZoneOptionsBody,
      params: RequestParams = {},
    ) =>
      this.request<DNSZoneOptions, ErrorModel>({
        path: `/dns-servers/${id}/zones/${zone}/options`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Connects with the given settings without saving anything.
     *
     * @tags DNS
     * @name TestDnsConnection
     * @summary Test DNS server settings
     * @request POST:/dns-servers/test-connection
     */
    testDnsConnection: (data: DNSTestBody, params: RequestParams = {}) =>
      this.request<DNSTestOutputBody, ErrorModel>({
        path: `/dns-servers/test-connection`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description `current` says which record, as it was read. Answers with the zone's records, fresh.
     *
     * @tags DNS
     * @name UpdateDnsRecord
     * @summary Change a record
     * @request PUT:/dns-servers/{id}/zones/{zone}/records
     */
    updateDnsRecord: (
      id: string,
      zone: string,
      data: UpdateDnsRecordRequest,
      params: RequestParams = {},
    ) =>
      this.request<DNSZoneRecords, ErrorModel>({
        path: `/dns-servers/${id}/zones/${zone}/records`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DNS
     * @name UpdateDnsServer
     * @summary Change a DNS server's connection
     * @request PUT:/dns-servers/{id}
     */
    updateDnsServer: (
      id: string,
      data: DNSServerBody,
      params: RequestParams = {},
    ) =>
      this.request<DNSServer, ErrorModel>({
        path: `/dns-servers/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  firewall = {
    /**
     * @description Sends what arrives on a port to another port here or to another machine. IPv4 only. On ufw it also adds the rule that lets that traffic through. The port Morcheh uses for SSH can't be forwarded.
     *
     * @tags Firewall
     * @name AddFirewallForward
     * @summary Forward a port
     * @request POST:/servers/{id}/firewall/forwards
     */
    addFirewallForward: (
      id: string,
      data: FirewallForwardBody,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/forwards`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description A rule that could cut the SSH connection off answers with `pending`, like turning it on.
     *
     * @tags Firewall
     * @name AddFirewallRule
     * @summary Add a rule
     * @request POST:/servers/{id}/firewall/rules
     */
    addFirewallRule: (
      id: string,
      data: FirewallRuleBody,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/rules`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Runs as a background job (kind `firewall-apply`), a few servers at a time. Rules a server already has are skipped. Each server gets all the rules or none. A server is left alone if the rules could cut SSH off, since nobody is there to confirm it.
     *
     * @tags Firewall
     * @name ApplyFirewallRules
     * @summary Add rules to many servers
     * @request POST:/firewall/apply
     */
    applyFirewallRules: (data: FirewallApplyBody, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/firewall/apply`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description All of them or none. The rules Morcheh added beside them go too.
     *
     * @tags Firewall
     * @name DeleteFirewallForwards
     * @summary Delete port forwards
     * @request POST:/servers/{id}/firewall/forwards/delete
     */
    deleteFirewallForwards: (
      id: string,
      data: FirewallForwardDeleteBody,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/forwards/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description All of them or none. Removing what lets SSH in answers with `pending`.
     *
     * @tags Firewall
     * @name DeleteFirewallRules
     * @summary Delete rules
     * @request POST:/servers/{id}/firewall/rules/delete
     */
    deleteFirewallRules: (
      id: string,
      data: FirewallDeleteBody,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/rules/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Rules are kept, but nothing is filtered until it's turned on again.
     *
     * @tags Firewall
     * @name DisableFirewall
     * @summary Turn the firewall off
     * @request POST:/servers/{id}/firewall/disable
     */
    disableFirewall: (id: string, params: RequestParams = {}) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/disable`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Allows the SSH port Morcheh uses first, whatever the body says. Answers with `pending`: keep it within the time shown or the server undoes it.
     *
     * @tags Firewall
     * @name EnableFirewall
     * @summary Turn the firewall on
     * @request POST:/servers/{id}/firewall/enable
     */
    enableFirewall: (
      id: string,
      data: FirewallEnableBody,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/enable`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Compares the firewall as it was with how it is now.
     *
     * @tags Firewall
     * @name FirewallChange
     * @summary What going back to before a change would do
     * @request GET:/servers/{id}/firewall/history/{change}
     */
    firewallChange: (id: string, change: string, params: RequestParams = {}) =>
      this.request<FirewallChangePreview, ErrorModel>({
        path: `/servers/${id}/firewall/history/${change}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Read from Morcheh's database, so it works while the server is down. Changes made on the server by hand aren't here.
     *
     * @tags Firewall
     * @name FirewallHistory
     * @summary Changes made through Morcheh
     * @request GET:/servers/{id}/firewall/history
     */
    firewallHistory: (id: string, params: RequestParams = {}) =>
      this.request<FirewallHistory, ErrorModel>({
        path: `/servers/${id}/firewall/history`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description From ufw's log, the journal or the kernel log. Empty until logging is on.
     *
     * @tags Firewall
     * @name FirewallLog
     * @summary Traffic the firewall refused
     * @request GET:/servers/{id}/firewall/log
     */
    firewallLog: (
      id: string,
      query?: {
        /**
         * How many log lines to look through
         * @format int64
         * @min 100
         * @max 20000
         * @default 5000
         */
        lines?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<FirewallLog, ErrorModel>({
        path: `/servers/${id}/firewall/log`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Firewall
     * @name FirewallRaw
     * @summary The firewall's own view of its rules
     * @request GET:/servers/{id}/firewall/raw
     */
    firewallRaw: (id: string, params: RequestParams = {}) =>
      this.request<FirewallRaw, ErrorModel>({
        path: `/servers/${id}/firewall/raw`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Which firewall is in charge (ufw, firewalld, or plain nftables/iptables, which are read-only here), whether it's on, its defaults and rules in one shape, the SSH port Morcheh depends on, and any change waiting to be kept.
     *
     * @tags Firewall
     * @name GetFirewall
     * @summary The firewall on a server
     * @request GET:/servers/{id}/firewall
     */
    getFirewall: (id: string, params: RequestParams = {}) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description ufw, or firewalld on the RHEL and SUSE families. It stays off until it's turned on. Runs as a background job (kind `firewall-install`). 409 when one is already under way.
     *
     * @tags Firewall
     * @name InstallFirewall
     * @summary Install a firewall
     * @request POST:/servers/{id}/firewall/install
     */
    installFirewall: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/servers/${id}/firewall/install`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description 409 when nothing is waiting, for instance because time ran out and it was undone.
     *
     * @tags Firewall
     * @name KeepFirewallChange
     * @summary Keep the change that's waiting
     * @request POST:/servers/{id}/firewall/pending/keep
     */
    keepFirewallChange: (id: string, params: RequestParams = {}) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/pending/keep`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description ufw only: the first rule that matches decides. A move that could cut the SSH connection off answers with `pending`.
     *
     * @tags Firewall
     * @name MoveFirewallRule
     * @summary Change a rule's place
     * @request POST:/servers/{id}/firewall/rules/{rule}/move
     */
    moveFirewallRule: (
      id: string,
      rule: string,
      data: FirewallMoveBody,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/rules/${rule}/move`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Keeps SSH allowed and the firewall on or off as it was.
     *
     * @tags Firewall
     * @name ResetFirewall
     * @summary Remove every rule
     * @request POST:/servers/{id}/firewall/reset
     */
    resetFirewall: (id: string, params: RequestParams = {}) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/reset`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Puts the whole firewall back as it was, which also takes back later changes. It's a change like any other: with the firewall on it answers with `pending`, and it shows up in the history, so it can be taken back too.
     *
     * @tags Firewall
     * @name RestoreFirewallChange
     * @summary Go back to before a change
     * @request POST:/servers/{id}/firewall/history/{change}/restore
     */
    restoreFirewallChange: (
      id: string,
      change: string,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/history/${change}/restore`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Firewall
     * @name UndoFirewallChange
     * @summary Undo the change that's waiting
     * @request POST:/servers/{id}/firewall/pending/undo
     */
    undoFirewallChange: (id: string, params: RequestParams = {}) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/pending/undo`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description 404 when it's gone, for instance changed by hand meanwhile.
     *
     * @tags Firewall
     * @name UpdateFirewallForward
     * @summary Change a port forward
     * @request PUT:/servers/{id}/firewall/forwards/{forward}
     */
    updateFirewallForward: (
      id: string,
      forward: string,
      data: FirewallForwardBody,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/forwards/${forward}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Replaces it in the same place. 404 when it's gone, for instance changed by hand meanwhile.
     *
     * @tags Firewall
     * @name UpdateFirewallRule
     * @summary Change a rule
     * @request PUT:/servers/{id}/firewall/rules/{rule}
     */
    updateFirewallRule: (
      id: string,
      rule: string,
      data: FirewallRuleBody,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/rules/${rule}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Only what's sent changes. Tightening a default answers with `pending`.
     *
     * @tags Firewall
     * @name UpdateFirewallSettings
     * @summary Change default policies, logging or the default zone
     * @request PUT:/servers/{id}/firewall/settings
     */
    updateFirewallSettings: (
      id: string,
      data: FirewallSettingsBody,
      params: RequestParams = {},
    ) =>
      this.request<FirewallOverview, ErrorModel>({
        path: `/servers/${id}/firewall/settings`,
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
  uptime = {
    /**
     * @description Says someone is on it, with an optional note.
     *
     * @tags Uptime
     * @name AcknowledgeMonitorIncident
     * @summary Acknowledge an incident
     * @request POST:/monitor-incidents/{id}/acknowledge
     */
    acknowledgeMonitorIncident: (
      id: string,
      data: AcknowledgeMonitorIncidentRequest,
      params: RequestParams = {},
    ) =>
      this.request<UptimeIncident, ErrorModel>({
        path: `/monitor-incidents/${id}/acknowledge`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Runs a check now and records it like a scheduled one.
     *
     * @tags Uptime
     * @name CheckMonitor
     * @summary Check now
     * @request POST:/monitors/{id}/check
     */
    checkMonitor: (id: string, params: RequestParams = {}) =>
      this.request<CheckOutBody, ErrorModel>({
        path: `/monitors/${id}/check`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Uptime
     * @name CreateMonitor
     * @summary Add an uptime monitor
     * @request POST:/monitors
     */
    createMonitor: (data: MonitorBody, params: RequestParams = {}) =>
      this.request<UptimeMonitor, ErrorModel>({
        path: `/monitors`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Its history and incidents go with it.
     *
     * @tags Uptime
     * @name DeleteMonitor
     * @summary Remove an uptime monitor
     * @request DELETE:/monitors/{id}
     */
    deleteMonitor: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/monitors/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Uptime
     * @name GetMonitor
     * @summary Get an uptime monitor
     * @request GET:/monitors/{id}
     */
    getMonitor: (id: string, params: RequestParams = {}) =>
      this.request<UptimeMonitor, ErrorModel>({
        path: `/monitors/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Uptime, response times and incidents over a range.
     *
     * @tags Uptime
     * @name GetMonitorReport
     * @summary A monitor's report
     * @request GET:/monitors/{id}/report
     */
    getMonitorReport: (
      id: string,
      query?: {
        /** @default "24h" */
        range?: "24h" | "7d" | "30d" | "90d" | "365d";
      },
      params: RequestParams = {},
    ) =>
      this.request<MonitorReport, ErrorModel>({
        path: `/monitors/${id}/report`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Newest first, in the workspaces you can see.
     *
     * @tags Uptime
     * @name ListIncidents
     * @summary Incidents across monitors
     * @request GET:/monitor-incidents
     */
    listIncidents: (
      query?: {
        /**
         * @format int32
         * @min 1
         * @max 1000
         * @default 200
         */
        limit?: number;
        /** Only the ones still going on */
        open?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<IncidentsOutBody, ErrorModel>({
        path: `/monitor-incidents`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Newest first. Old checks are pruned (MONITOR_HISTORY).
     *
     * @tags Uptime
     * @name ListMonitorChecks
     * @summary A monitor's checks
     * @request GET:/monitors/{id}/checks
     */
    listMonitorChecks: (
      id: string,
      query?: {
        /**
         * @format int32
         * @min 1
         * @max 2000
         * @default 200
         */
        limit?: number;
        /**
         * Default: the start
         * @format date-time
         */
        since?: string;
        /** Only checks with this result */
        status?: "up" | "degraded" | "down" | "";
        /**
         * Default: now
         * @format date-time
         */
        until?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ChecksOutBody, ErrorModel>({
        path: `/monitors/${id}/checks`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Newest first.
     *
     * @tags Uptime
     * @name ListMonitorEvents
     * @summary A monitor's status changes
     * @request GET:/monitors/{id}/events
     */
    listMonitorEvents: (
      id: string,
      query?: {
        /**
         * @format int32
         * @min 1
         * @max 1000
         * @default 100
         */
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<EventsOutBody, ErrorModel>({
        path: `/monitors/${id}/events`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Newest first.
     *
     * @tags Uptime
     * @name ListMonitorIncidents
     * @summary A monitor's incidents
     * @request GET:/monitors/{id}/incidents
     */
    listMonitorIncidents: (
      id: string,
      query?: {
        /**
         * @format int32
         * @min 1
         * @max 1000
         * @default 100
         */
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<IncidentsOutBody, ErrorModel>({
        path: `/monitors/${id}/incidents`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Uptime
     * @name ListMonitors
     * @summary List uptime monitors
     * @request GET:/monitors
     */
    listMonitors: (
      query?: {
        /** Only monitors that belong to or check from this server */
        server_id?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ListOutBody, ErrorModel>({
        path: `/monitors`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Resuming starts over: pending until the next check.
     *
     * @tags Uptime
     * @name PauseMonitor
     * @summary Pause or resume a monitor
     * @request POST:/monitors/{id}/pause
     */
    pauseMonitor: (
      id: string,
      data: PauseMonitorRequest,
      params: RequestParams = {},
    ) =>
      this.request<UptimeMonitor, ErrorModel>({
        path: `/monitors/${id}/pause`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description For push monitors: call it from a cron job or an app. No sign-in; the token is the secret.
     *
     * @tags Uptime
     * @name PushHeartbeat
     * @summary Send a heartbeat
     * @request GET:/push/{token}
     */
    pushHeartbeat: (
      token: string,
      query?: {
        /** @maxLength 1000 */
        msg?: string;
        /**
         * A latency to record, in milliseconds
         * @format int64
         * @min 0
         * @max 86400000
         */
        ping?: number;
        /** Default up */
        status?: "up" | "degraded" | "down" | "";
      },
      params: RequestParams = {},
    ) =>
      this.request<PushOutputBody, ErrorModel>({
        path: `/push/${token}`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Same as the GET.
     *
     * @tags Uptime
     * @name PushHeartbeatPost
     * @summary Send a heartbeat (POST)
     * @request POST:/push/{token}
     */
    pushHeartbeatPost: (
      token: string,
      query?: {
        /** @maxLength 1000 */
        msg?: string;
        /**
         * A latency to record, in milliseconds
         * @format int64
         * @min 0
         * @max 86400000
         */
        ping?: number;
        /** Default up */
        status?: "up" | "degraded" | "down" | "";
      },
      params: RequestParams = {},
    ) =>
      this.request<PushOutputBody, ErrorModel>({
        path: `/push/${token}`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Runs one check with the given settings and returns what it found, without saving anything.
     *
     * @tags Uptime
     * @name TestMonitorSettings
     * @summary Run a check with unsaved settings
     * @request POST:/monitors/test
     */
    testMonitorSettings: (data: MonitorTestBody, params: RequestParams = {}) =>
      this.request<CheckResult, ErrorModel>({
        path: `/monitors/test`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Uptime
     * @name UpdateMonitor
     * @summary Update an uptime monitor
     * @request PUT:/monitors/{id}
     */
    updateMonitor: (
      id: string,
      data: MonitorBody,
      params: RequestParams = {},
    ) =>
      this.request<UptimeMonitor, ErrorModel>({
        path: `/monitors/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
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
  notifications = {
    /**
     * No description
     *
     * @tags Notifications
     * @name CreateNotificationChannel
     * @summary Add a notification channel
     * @request POST:/notification-channels
     */
    createNotificationChannel: (
      data: NotifyChannelBody,
      params: RequestParams = {},
    ) =>
      this.request<NotifyChannel, ErrorModel>({
        path: `/notification-channels`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Notifications
     * @name DeleteNotificationChannel
     * @summary Remove a notification channel
     * @request DELETE:/notification-channels/{id}
     */
    deleteNotificationChannel: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/notification-channels/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Notifications
     * @name GetNotificationChannel
     * @summary Get a notification channel
     * @request GET:/notification-channels/{id}
     */
    getNotificationChannel: (id: string, params: RequestParams = {}) =>
      this.request<NotifyChannel, ErrorModel>({
        path: `/notification-channels/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Notifications
     * @name ListNotificationChannels
     * @summary List notification channels
     * @request GET:/notification-channels
     */
    listNotificationChannels: (params: RequestParams = {}) =>
      this.request<ListOutBody1, ErrorModel>({
        path: `/notification-channels`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Newest first.
     *
     * @tags Notifications
     * @name ListNotificationLog
     * @summary What a channel sent
     * @request GET:/notification-channels/{id}/log
     */
    listNotificationLog: (
      id: string,
      query?: {
        /**
         * @format int32
         * @min 1
         * @max 500
         * @default 100
         */
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<LogOutBody, ErrorModel>({
        path: `/notification-channels/${id}/log`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Notifications
     * @name TestNotificationChannel
     * @summary Send a test message
     * @request POST:/notification-channels/{id}/test
     */
    testNotificationChannel: (id: string, params: RequestParams = {}) =>
      this.request<ChannelTestOutputBody, ErrorModel>({
        path: `/notification-channels/${id}/test`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Sends a test message with the given settings without saving anything.
     *
     * @tags Notifications
     * @name TestNotificationSettings
     * @summary Send a test with unsaved settings
     * @request POST:/notification-channels/test
     */
    testNotificationSettings: (
      data: ChannelTestBody,
      params: RequestParams = {},
    ) =>
      this.request<ChannelTestOutputBody, ErrorModel>({
        path: `/notification-channels/test`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Notifications
     * @name UpdateNotificationChannel
     * @summary Update a notification channel
     * @request PUT:/notification-channels/{id}
     */
    updateNotificationChannel: (
      id: string,
      data: NotifyChannelBody,
      params: RequestParams = {},
    ) =>
      this.request<NotifyChannel, ErrorModel>({
        path: `/notification-channels/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  reverseProxy = {
    /**
     * @description Adds the proxy to the panel and checks the server. Nothing is installed or written yet: call setup for that. Needs Engineer on the server.
     *
     * @tags Reverse proxy
     * @name CreateProxy
     * @summary Manage a proxy on a server
     * @request POST:/proxies
     */
    createProxy: (data: CreateProxyRequest, params: RequestParams = {}) =>
      this.request<Proxy, ErrorModel>({
        path: `/proxies`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description `acme`: certbot asks the CA over HTTP-01 (the names must point at this server, port 80 open); certbot is installed when missing and renews the certificate itself. `self-signed`: made with openssl. `upload`: the PEM pair is checked and written to /etc/ssl/morcheh/<name>. Secrets (EAB HMAC key, private key) are kept sealed with the job, never in plain text. Runs as a background job (kind `proxy-certificate`); its result has the certificate and key paths.
     *
     * @tags Reverse proxy
     * @name CreateProxyCertificate
     * @summary Get, make or save a certificate on the proxy's server
     * @request POST:/proxies/{id}/certificates
     */
    createProxyCertificate: (
      id: string,
      data: CertRequest,
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/proxies/${id}/certificates`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Writes it to the server, tests and reloads. 422 when a value is wrong or the proxy refuses it (nothing is saved then).
     *
     * @tags Reverse proxy
     * @name CreateProxyHost
     * @summary Add a site
     * @request POST:/proxies/{id}/hosts
     */
    createProxyHost: (
      id: string,
      data: ProxyHostBody,
      params: RequestParams = {},
    ) =>
      this.request<ProxyDetail, ErrorModel>({
        path: `/proxies/${id}/hosts`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description With remove_files, first takes Morcheh's sites off the server and reloads (the proxy itself stays installed). Hand-written sites are left as they are, except that files Morcheh took default_server from get it back.
     *
     * @tags Reverse proxy
     * @name DeleteProxy
     * @summary Stop managing a proxy
     * @request DELETE:/proxies/{id}
     */
    deleteProxy: (
      id: string,
      query?: {
        remove_files?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorModel>({
        path: `/proxies/${id}`,
        method: "DELETE",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Reverse proxy
     * @name DeleteProxyHost
     * @summary Remove a site
     * @request DELETE:/proxies/{id}/hosts/{host}
     */
    deleteProxyHost: (id: string, host: string, params: RequestParams = {}) =>
      this.request<ProxyDetail, ErrorModel>({
        path: `/proxies/${id}/hosts/${host}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description Looks for the proxy installed on the server and in its Docker / Podman containers, so it can be added the right way. Needs Engineer on the server.
     *
     * @tags Reverse proxy
     * @name DetectProxy
     * @summary Find a proxy on a server
     * @request GET:/servers/{id}/proxy-detect
     */
    detectProxy: (
      id: string,
      query?: {
        /** @default "nginx" */
        kind?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ProxyDetection, ErrorModel>({
        path: `/servers/${id}/proxy-detect`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Reverse proxy
     * @name GetProxy
     * @summary A proxy and its sites
     * @request GET:/proxies/{id}
     */
    getProxy: (id: string, params: RequestParams = {}) =>
      this.request<ProxyDetail, ErrorModel>({
        path: `/proxies/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Reverse proxy
     * @name GetProxyChange
     * @summary Every site as it was after one change
     * @request GET:/proxies/{id}/history/{change}
     */
    getProxyChange: (id: string, change: string, params: RequestParams = {}) =>
      this.request<ProxyChangeDetail, ErrorModel>({
        path: `/proxies/${id}/history/${change}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Totals, requests over time, response times, statuses, paths, visitors, browsers and more, worked out from the site's access log (rotated files included). Kept for a minute.
     *
     * @tags Reverse proxy
     * @name GetProxyHostReport
     * @summary A report on a site's requests
     * @request GET:/proxies/{id}/hosts/{host}/report
     */
    getProxyHostReport: (
      id: string,
      host: string,
      query?: {
        /** Read again, even if a report from the last minute is kept */
        fresh?: boolean;
        /** @default "24h" */
        range?: "1h" | "24h" | "7d" | "30d";
        /** IANA time zone for the buckets and the heatmap; default UTC */
        tz?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ProxyHostReport, ErrorModel>({
        path: `/proxies/${id}/hosts/${host}/report`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Reverse proxy
     * @name GetProxyLogs
     * @summary The last lines of a site's log, or the proxy's own
     * @request GET:/proxies/{id}/logs
     */
    getProxyLogs: (
      id: string,
      query?: {
        /**
         * A site; empty = the proxy's own log
         * @format uuid
         */
        host?: string;
        /**
         * @format int64
         * @min 1
         * @max 2000
         * @default 200
         */
        lines?: number;
        /** @default "access" */
        log?: "access" | "error";
      },
      params: RequestParams = {},
    ) =>
      this.request<GetProxyLogsResponse, ErrorModel>({
        path: `/proxies/${id}/logs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Requests, errors and bytes per minute over the last 30 minutes, for every site on the proxies you can see, read from their access logs. Calling it reads what the logs gained since the last call (at most every few seconds per proxy).
     *
     * @tags Reverse proxy
     * @name GetProxyTraffic
     * @summary Live requests per site
     * @request GET:/proxy-traffic
     */
    getProxyTraffic: (
      query?: {
        /**
         * Only this proxy's sites
         * @format uuid
         */
        proxy_id?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ProxyTraffic, ErrorModel>({
        path: `/proxy-traffic`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Status, every site in its live config (text only for Operator+), certificates found, and whether each panel site's file is what the panel wrote. Also records the check.
     *
     * @tags Reverse proxy
     * @name InspectProxy
     * @summary Read the proxy's live state from its server
     * @request GET:/proxies/{id}/inspect
     */
    inspectProxy: (id: string, params: RequestParams = {}) =>
      this.request<ProxyInspection, ErrorModel>({
        path: `/proxies/${id}/inspect`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Reverse proxy
     * @name ListProxies
     * @summary Reverse proxies you can see
     * @request GET:/proxies
     */
    listProxies: (
      query?: {
        /**
         * Only this server's
         * @format uuid
         */
        server_id?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ListProxiesResponse, ErrorModel>({
        path: `/proxies`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description `custom` (any ACME directory URL) is also accepted.
     *
     * @tags Reverse proxy
     * @name ListProxyCertificateAuthorities
     * @summary Certificate authorities the panel can ask over ACME
     * @request GET:/proxies/{id}/certificates/authorities
     */
    listProxyCertificateAuthorities: (id: string, params: RequestParams = {}) =>
      this.request<ProxyCAListBody, ErrorModel>({
        path: `/proxies/${id}/certificates/authorities`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description The last 50 are kept.
     *
     * @tags Reverse proxy
     * @name ListProxyHistory
     * @summary Changes to the proxy's sites, newest first
     * @request GET:/proxies/{id}/history
     */
    listProxyHistory: (id: string, params: RequestParams = {}) =>
      this.request<ListProxyHistoryResponse, ErrorModel>({
        path: `/proxies/${id}/history`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description The answers the proxy keeps for the site (its cache, or Always online's copies), newest first, with how old each copy is: what visitors would still get while the app is down.
     *
     * @tags Reverse proxy
     * @name ListProxyHostKeptPages
     * @summary The pages a site keeps a copy of
     * @request GET:/proxies/{id}/hosts/{host}/cache/pages
     */
    listProxyHostKeptPages: (
      id: string,
      host: string,
      query?: {
        /**
         * Most pages listed, newest first
         * @format int64
         * @min 1
         * @max 1000
         * @default 300
         */
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<ProxyKeptPagesResult, ErrorModel>({
        path: `/proxies/${id}/hosts/${host}/cache/pages`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Lines of the site's access log in a time range, filtered, newest first. Pass the answer's cursor back to get only what was written since (live view).
     *
     * @tags Reverse proxy
     * @name ListProxyHostRequests
     * @summary A site's requests, from its access log
     * @request GET:/proxies/{id}/hosts/{host}/requests
     */
    listProxyHostRequests: (
      id: string,
      host: string,
      query?: {
        /** From a previous answer: only lines written since */
        cursor?: string;
        /** @maxLength 253 */
        domain?: string;
        /** Only requests the firewall flagged: any, blocked (refused) or flagged (logged, let through) */
        firewall?: "any" | "blocked" | "flagged";
        /** RFC 3339; overrides range */
        from?: string;
        /**
         * An address or its start (10.0.)
         * @maxLength 100
         */
        ip?: string;
        /**
         * @format int64
         * @min 1
         * @max 2000
         * @default 300
         */
        limit?: number;
        /** Comma list */
        method?: string;
        /**
         * Only requests that took at least this long
         * @format int64
         * @min 0
         */
        min_ms?: number;
        /**
         * Part of the path, any case
         * @maxLength 500
         */
        path?: string;
        /**
         * Text anywhere in the line, any case
         * @maxLength 200
         */
        q?: string;
        /** @default "1h" */
        range?: "15m" | "1h" | "6h" | "24h" | "7d";
        /** Comma list of classes (2xx, 4xx…) and codes (404) */
        status?: string;
        /** RFC 3339 */
        to?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ProxyRequests, ErrorModel>({
        path: `/proxies/${id}/hosts/${host}/requests`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Reverse proxy
     * @name ListProxyHostsEverywhere
     * @summary Every site on every proxy you can see
     * @request GET:/proxy-hosts
     */
    listProxyHostsEverywhere: (params: RequestParams = {}) =>
      this.request<ListProxyHostsEverywhereResponse, ErrorModel>({
        path: `/proxy-hosts`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Read from the site's ModSecurity audit log on the server (only requests that matched a rule). Empty when the firewall is off or nothing matched yet.
     *
     * @tags Reverse proxy
     * @name ListProxyHostWafEvents
     * @summary Requests the site's firewall flagged, newest first
     * @request GET:/proxies/{id}/hosts/{host}/waf-events
     */
    listProxyHostWafEvents: (
      id: string,
      host: string,
      query?: {
        /**
         * @format int64
         * @min 1
         * @max 500
         * @default 100
         */
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<ListProxyHostWafEventsResponse, ErrorModel>({
        path: `/proxies/${id}/hosts/${host}/waf-events`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Reverse proxy
     * @name ListProxyKinds
     * @summary Proxy kinds Morcheh can manage
     * @request GET:/proxy-kinds
     */
    listProxyKinds: (params: RequestParams = {}) =>
      this.request<ListProxyKindsResponse, ErrorModel>({
        path: `/proxy-kinds`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Renders without saving. Problems with the values come back as a list, not an error.
     *
     * @tags Reverse proxy
     * @name PreviewProxyHost
     * @summary The config a site would get
     * @request POST:/proxies/{id}/hosts/preview
     */
    previewProxyHost: (
      id: string,
      data: PreviewProxyHostRequest,
      params: RequestParams = {},
    ) =>
      this.request<PreviewProxyHostResponse, ErrorModel>({
        path: `/proxies/${id}/hosts/preview`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Start, restart and reload test the config first. Stop needs Engineer.
     *
     * @tags Reverse proxy
     * @name ProxyAction
     * @summary Test, reload, start, restart or stop the proxy
     * @request POST:/proxies/{id}/action
     */
    proxyAction: (
      id: string,
      data: ProxyActionRequest,
      params: RequestParams = {},
    ) =>
      this.request<ProxyActionResult, ErrorModel>({
        path: `/proxies/${id}/action`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Removes the answers the proxy kept for the site (all of them, those of some addresses, of a saved group or carrying an answer header); the next visits ask the upstream again. Browsers keep their own copies. `dry_run` only counts them.
     *
     * @tags Reverse proxy
     * @name PurgeProxyHostCache
     * @summary Clear a site's cache, or part of it
     * @request POST:/proxies/{id}/hosts/{host}/cache/purge
     */
    purgeProxyHostCache: (
      id: string,
      host: string,
      data: ProxyPurgeBody,
      params: RequestParams = {},
    ) =>
      this.request<ProxyPurgeResult, ErrorModel>({
        path: `/proxies/${id}/hosts/${host}/cache/purge`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Replaces every site with the snapshot and writes them to the server, as one new change.
     *
     * @tags Reverse proxy
     * @name RestoreProxyChange
     * @summary Go back to how the sites were after a change
     * @request POST:/proxies/{id}/history/{change}/restore
     */
    restoreProxyChange: (
      id: string,
      change: string,
      params: RequestParams = {},
    ) =>
      this.request<ProxyDetail, ErrorModel>({
        path: `/proxies/${id}/history/${change}/restore`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description A site that's off keeps its settings but its file is taken off the server.
     *
     * @tags Reverse proxy
     * @name SetProxyHostEnabled
     * @summary Turn a site on or off
     * @request PUT:/proxies/{id}/hosts/{host}/enabled
     */
    setProxyHostEnabled: (
      id: string,
      host: string,
      data: SetProxyHostEnabledRequest,
      params: RequestParams = {},
    ) =>
      this.request<ProxyDetail, ErrorModel>({
        path: `/proxies/${id}/hosts/${host}/enabled`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Installs the package if needed, adds Morcheh's include, starts the proxy and writes the panel's sites. Runs as a background job (kind `proxy-setup`); 409 when one is already running.
     *
     * @tags Reverse proxy
     * @name SetupProxy
     * @summary Install (when missing) and wire up the proxy
     * @request POST:/proxies/{id}/setup
     */
    setupProxy: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/proxies/${id}/setup`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Adds nginx's GeoIP2 module, downloads DB-IP's free country database (CC BY 4.0) and refreshes it monthly. Runs as a background job (kind `proxy-geo`); 409 when a setup is already running.
     *
     * @tags Reverse proxy
     * @name SetupProxyGeo
     * @summary Turn on the IP-to-country lookup for country rules
     * @request POST:/proxies/{id}/geo
     */
    setupProxyGeo: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/proxies/${id}/geo`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Installs one of nginx's extra modules from the system's packages, reloads, and writes the panel's sites again: `brotli` (Brotli compression), `waf` (ModSecurity with the OWASP Core Rule Set; Debian/Ubuntu), `image-filter` (resizing pictures) or `stream-geo` (country rules for port forwards; also downloads the country database). Runs as a background job (kind `proxy-<module>`); 409 when a setup is already running.
     *
     * @tags Reverse proxy
     * @name SetupProxyModule
     * @summary Add a module to the proxy
     * @request POST:/proxies/{id}/modules/{module}
     */
    setupProxyModule: (
      id: string,
      module: "brotli" | "waf" | "image-filter" | "stream-geo",
      params: RequestParams = {},
    ) =>
      this.request<Job, ErrorModel>({
        path: `/proxies/${id}/modules/${module}`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Puts every site's file in place with this one as sent, runs the proxy's own config test and puts the old files back. Nothing is reloaded or saved. ok=false carries the proxy's message.
     *
     * @tags Reverse proxy
     * @name TestProxyHost
     * @summary Test a site on the server without saving
     * @request POST:/proxies/{id}/hosts/test
     */
    testProxyHost: (
      id: string,
      data: TestProxyHostRequest,
      params: RequestParams = {},
    ) =>
      this.request<ProxyActionResult, ErrorModel>({
        path: `/proxies/${id}/hosts/test`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Sends one GET from the proxy's server (curl, 10 s) with the site's https settings. Nothing is saved.
     *
     * @tags Reverse proxy
     * @name TestProxyUpstream
     * @summary Check that the proxy's server can reach an upstream
     * @request POST:/proxies/{id}/hosts/test-upstream
     */
    testProxyUpstream: (
      id: string,
      data: TestProxyUpstreamRequest,
      params: RequestParams = {},
    ) =>
      this.request<ProxyUpstreamTest, ErrorModel>({
        path: `/proxies/${id}/hosts/test-upstream`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Reverse proxy
     * @name UpdateProxyHost
     * @summary Change a site
     * @request PUT:/proxies/{id}/hosts/{host}
     */
    updateProxyHost: (
      id: string,
      host: string,
      data: ProxyHostBody,
      params: RequestParams = {},
    ) =>
      this.request<ProxyDetail, ErrorModel>({
        path: `/proxies/${id}/hosts/${host}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
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
     * @description You need Engineer on the workspace, plus what the action needs done by hand: a sync needs Operator on the source and Engineer on every destination; a script Engineer on its servers; a playbook Owner on them; a service action or reboot Operator; fetch and archive Engineer; checking backups Operator on the database. Runs act with your access, checked each time.
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
      this.request<RunListBody2, ErrorModel>({
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
  scripts = {
    /**
     * @description Servers not started yet are skipped; a running script gets SIGTERM, then its session is closed. Needs Engineer on every server it touched.
     *
     * @tags Scripts
     * @name CancelScriptRun
     * @summary Stop a script run
     * @request POST:/script-runs/{id}/cancel
     */
    cancelScriptRun: (id: string, params: RequestParams = {}) =>
      this.request<ScriptRunDetail, ErrorModel>({
        path: `/script-runs/${id}/cancel`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scripts
     * @name CreateScript
     * @summary Save a new script
     * @request POST:/workspaces/{id}/scripts
     */
    createScript: (id: string, data: ScriptInput, params: RequestParams = {}) =>
      this.request<Script, ErrorModel>({
        path: `/workspaces/${id}/scripts`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Its past runs stay, with the text they ran.
     *
     * @tags Scripts
     * @name DeleteScript
     * @summary Delete a saved script
     * @request DELETE:/scripts/{id}
     */
    deleteScript: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/scripts/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Needs Engineer on every server it touched.
     *
     * @tags Scripts
     * @name DeleteScriptRun
     * @summary Delete a finished script run
     * @request DELETE:/script-runs/{id}
     */
    deleteScriptRun: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/script-runs/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scripts
     * @name GetScript
     * @summary Get a saved script
     * @request GET:/scripts/{id}
     */
    getScript: (id: string, params: RequestParams = {}) =>
      this.request<Script, ErrorModel>({
        path: `/scripts/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Needs Operator on every server it touched. While it runs, the output is saved about every second: poll this.
     *
     * @tags Scripts
     * @name GetScriptRun
     * @summary Get a script run with its output on each server
     * @request GET:/script-runs/{id}
     */
    getScriptRun: (id: string, params: RequestParams = {}) =>
      this.request<ScriptRunDetail, ErrorModel>({
        path: `/script-runs/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scripts
     * @name ListScriptRuns
     * @summary List a workspace's script runs, newest first
     * @request GET:/workspaces/{id}/script-runs
     */
    listScriptRuns: (
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
        /** In the run's name or who ran it */
        q?: string;
        /** @format uuid */
        script_id?: string;
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
      this.request<ScriptRunListBody, ErrorModel>({
        path: `/workspaces/${id}/script-runs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description By name, each with its newest run.
     *
     * @tags Scripts
     * @name ListScripts
     * @summary List a workspace's saved scripts
     * @request GET:/workspaces/{id}/scripts
     */
    listScripts: (id: string, params: RequestParams = {}) =>
      this.request<ScriptListBody, ErrorModel>({
        path: `/workspaces/${id}/scripts`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scripts
     * @name ListServerScriptRuns
     * @summary Script runs on a server, newest first
     * @request GET:/servers/{id}/script-runs
     */
    listServerScriptRuns: (
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
        script_id?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ListServerScriptRunsResponse, ErrorModel>({
        path: `/servers/${id}/script-runs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Its workspace's saved scripts, each with its newest run on this server.
     *
     * @tags Scripts
     * @name ListServerScripts
     * @summary Scripts that can run on a server
     * @request GET:/servers/{id}/scripts
     */
    listServerScripts: (id: string, params: RequestParams = {}) =>
      this.request<ScriptListBody, ErrorModel>({
        path: `/servers/${id}/scripts`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description A saved script (script_id) or one written for this run. Queues a background job. You need Engineer on every server, as for its terminal. All servers must be in one workspace.
     *
     * @tags Scripts
     * @name StartScriptRun
     * @summary Run a script on servers
     * @request POST:/script-runs
     */
    startScriptRun: (data: StartScriptRunBody, params: RequestParams = {}) =>
      this.request<StartScriptRunResponse, ErrorModel>({
        path: `/script-runs`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description With revision (its updated_at when you loaded it), answers 409 when someone else saved in between. Past runs keep the text they ran.
     *
     * @tags Scripts
     * @name UpdateScript
     * @summary Save changes to a script
     * @request PATCH:/scripts/{id}
     */
    updateScript: (
      id: string,
      data: ScriptUpdate,
      params: RequestParams = {},
    ) =>
      this.request<Script, ErrorModel>({
        path: `/scripts/${id}`,
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
        /** With a folder id: only the folder's own servers, not its subfolders' */
        direct?: boolean;
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
     * @description For the servers this person can see (in the selected workspace). Series come bucketed: 30 min for 24h, 4 h for 7d, a day for 30d. Resources are read from online Linux servers every SERVER_SAMPLE_INTERVAL.
     *
     * @tags Servers
     * @name ServerInsights
     * @summary Uptime, response time and resources of the servers
     * @request GET:/servers/insights
     */
    serverInsights: (
      query?: {
        /** @default "7d" */
        range?: "24h" | "7d" | "30d";
        /** IANA time zone the buckets line up with (days start at its midnight) */
        tz?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ServerInsights, ErrorModel>({
        path: `/servers/insights`,
        method: "GET",
        query: query,
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
  serverNotes = {
    /**
     * No description
     *
     * @tags Server notes
     * @name CreateServerNote
     * @summary Write a note on a server
     * @request POST:/servers/{id}/notes
     */
    createServerNote: (
      id: string,
      data: ServerNoteBody,
      params: RequestParams = {},
    ) =>
      this.request<ServerNote, ErrorModel>({
        path: `/servers/${id}/notes`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Server notes
     * @name DeleteServerNote
     * @summary Delete a note
     * @request DELETE:/servers/{id}/notes/{note}
     */
    deleteServerNote: (id: string, note: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/servers/${id}/notes/${note}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Pinned first, then the most recently changed.
     *
     * @tags Server notes
     * @name ListServerNotes
     * @summary List a server's notes
     * @request GET:/servers/{id}/notes
     */
    listServerNotes: (id: string, params: RequestParams = {}) =>
      this.request<ListServerNotesResponse, ErrorModel>({
        path: `/servers/${id}/notes`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Server notes
     * @name PinServerNote
     * @summary Pin a note to the overview, or unpin it
     * @request PUT:/servers/{id}/notes/{note}/pinned
     */
    pinServerNote: (
      id: string,
      note: string,
      data: PinServerNoteRequest,
      params: RequestParams = {},
    ) =>
      this.request<ServerNote, ErrorModel>({
        path: `/servers/${id}/notes/${note}/pinned`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Server notes
     * @name UpdateServerNote
     * @summary Save changes to a note
     * @request PUT:/servers/{id}/notes/{note}
     */
    updateServerNote: (
      id: string,
      note: string,
      data: ServerNoteUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ServerNote, ErrorModel>({
        path: `/servers/${id}/notes/${note}`,
        method: "PUT",
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
  applications = {
    /**
     * @description Steps not started are skipped; a running one gets SIGTERM, which can leave a half-done install. Engineer on every server it touched.
     *
     * @tags Applications
     * @name CancelSoftwareRun
     * @summary Stop a run
     * @request POST:/software-runs/{id}/cancel
     */
    cancelSoftwareRun: (id: string, params: RequestParams = {}) =>
      this.request<SoftwareRunDetail, ErrorModel>({
        path: `/software-runs/${id}/cancel`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Applications
     * @name CreateSoftwareRecipe
     * @summary Add an application of the workspace's own to the catalog
     * @request POST:/workspaces/{id}/software/recipes
     */
    createSoftwareRecipe: (
      id: string,
      data: Recipe,
      params: RequestParams = {},
    ) =>
      this.request<Recipe, ErrorModel>({
        path: `/workspaces/${id}/software/recipes`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Servers keep what is installed; it can no longer be updated or removed from the panel.
     *
     * @tags Applications
     * @name DeleteSoftwareRecipe
     * @summary Remove one of the workspace's own applications from the catalog
     * @request DELETE:/software-recipes/{id}
     */
    deleteSoftwareRecipe: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/software-recipes/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Needs Engineer on every server it touched.
     *
     * @tags Applications
     * @name DeleteSoftwareRun
     * @summary Delete a finished run
     * @request DELETE:/software-runs/{id}
     */
    deleteSoftwareRun: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/software-runs/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Nothing changes on the server. A scan finds it again if it is still there.
     *
     * @tags Applications
     * @name ForgetSoftwareInstall
     * @summary Forget an application record
     * @request DELETE:/software-installs/{id}
     */
    forgetSoftwareInstall: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/software-installs/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Applications
     * @name GetSoftwareCompose
     * @summary A Docker app's compose file
     * @request GET:/software-installs/{id}/compose
     */
    getSoftwareCompose: (id: string, params: RequestParams = {}) =>
      this.request<ComposeOutputBody, ErrorModel>({
        path: `/software-installs/${id}/compose`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Applications
     * @name GetSoftwareInstall
     * @summary One application on one server
     * @request GET:/software-installs/{id}
     */
    getSoftwareInstall: (id: string, params: RequestParams = {}) =>
      this.request<SoftwareInstall, ErrorModel>({
        path: `/software-installs/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Needs Operator on every server it touched. While it runs, the output is saved about every second: poll this.
     *
     * @tags Applications
     * @name GetSoftwareRun
     * @summary A run with its output on each server
     * @request GET:/software-runs/{id}
     */
    getSoftwareRun: (id: string, params: RequestParams = {}) =>
      this.request<SoftwareRunDetail, ErrorModel>({
        path: `/software-runs/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Applications
     * @name ListServerSoftware
     * @summary Applications on a server and its system updates
     * @request GET:/servers/{id}/software
     */
    listServerSoftware: (id: string, params: RequestParams = {}) =>
      this.request<ListServerSoftwareResponse, ErrorModel>({
        path: `/servers/${id}/software`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description The built-in recipes and the workspace's own, by name.
     *
     * @tags Applications
     * @name ListSoftwareCatalog
     * @summary The applications a workspace's servers can install
     * @request GET:/workspaces/{id}/software/catalog
     */
    listSoftwareCatalog: (id: string, params: RequestParams = {}) =>
      this.request<CatalogOutputBody, ErrorModel>({
        path: `/workspaces/${id}/software/catalog`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Only servers the caller can see. Refreshed by a scan every SOFTWARE_CHECK_INTERVAL and after every run.
     *
     * @tags Applications
     * @name ListSoftwareInstalls
     * @summary Applications on a workspace's servers, and each server's system updates
     * @request GET:/workspaces/{id}/software/installs
     */
    listSoftwareInstalls: (id: string, params: RequestParams = {}) =>
      this.request<InstallsOutputBody, ErrorModel>({
        path: `/workspaces/${id}/software/installs`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Applications
     * @name ListSoftwareRuns
     * @summary A workspace's application runs, newest first
     * @request GET:/workspaces/{id}/software-runs
     */
    listSoftwareRuns: (
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
        /** In the run's name or who started it */
        q?: string;
        recipe_id?: string;
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
        path: `/workspaces/${id}/software-runs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Passwords Morcheh made or was given at install time. Owner of the server.
     *
     * @tags Applications
     * @name RevealSoftwareSecrets
     * @summary Show the secret values an application was installed with
     * @request POST:/software-installs/{id}/reveal
     */
    revealSoftwareSecrets: (id: string, params: RequestParams = {}) =>
      this.request<RevealSoftwareSecretsResponse, ErrorModel>({
        path: `/software-installs/${id}/reveal`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Checked with docker compose config first (422 with its words when wrong); the old file stays as compose.yml.previous.
     *
     * @tags Applications
     * @name SaveSoftwareCompose
     * @summary Change a Docker app's compose file and apply it
     * @request PUT:/software-installs/{id}/compose
     */
    saveSoftwareCompose: (
      id: string,
      data: SaveSoftwareComposeRequest,
      params: RequestParams = {},
    ) =>
      this.request<ComposeOutputBody, ErrorModel>({
        path: `/software-installs/${id}/compose`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Applications
     * @name ScanServerSoftware
     * @summary Look again at what is installed on a server and what has updates
     * @request POST:/servers/{id}/software/scan
     */
    scanServerSoftware: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/servers/${id}/software/scan`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Only servers the caller has Operator on.
     *
     * @tags Applications
     * @name ScanWorkspaceSoftware
     * @summary Look again at every reachable server of a workspace
     * @request POST:/workspaces/{id}/software/scan
     */
    scanWorkspaceSoftware: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/workspaces/${id}/software/scan`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Operator. Answers the record after a fresh look at the app.
     *
     * @tags Applications
     * @name SoftwareInstallAction
     * @summary Start, stop or restart a Docker app
     * @request POST:/software-installs/{id}/action
     */
    softwareInstallAction: (
      id: string,
      data: SoftwareInstallActionRequest,
      params: RequestParams = {},
    ) =>
      this.request<SoftwareInstall, ErrorModel>({
        path: `/software-installs/${id}/action`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Applications
     * @name SoftwareInstallLogs
     * @summary The last lines a Docker app's containers wrote
     * @request GET:/software-installs/{id}/logs
     */
    softwareInstallLogs: (
      id: string,
      query?: {
        /**
         * @format int64
         * @min 10
         * @max 5000
         * @default 300
         */
        lines?: number;
        /** One compose service; empty = all */
        service?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SoftwareInstallLogsResponse, ErrorModel>({
        path: `/software-installs/${id}/logs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Package manager, root, Docker, free space, busy ports and leftovers from an earlier install. Engineer on every server.
     *
     * @tags Applications
     * @name SoftwarePreflight
     * @summary Check servers before installing an application on them
     * @request POST:/software/preflight
     */
    softwarePreflight: (
      data: SoftwarePreflightRequest,
      params: RequestParams = {},
    ) =>
      this.request<SoftwarePreflightResponse, ErrorModel>({
        path: `/software/preflight`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Queues a background job. Install, update, rollback and system upgrades need Engineer on every server, uninstall needs Owner. All servers must be in one workspace.
     *
     * @tags Applications
     * @name StartSoftwareRun
     * @summary Install, update, roll back or remove applications on servers
     * @request POST:/software-runs
     */
    startSoftwareRun: (
      data: StartSoftwareRunBody,
      params: RequestParams = {},
    ) =>
      this.request<StartOutputBody, ErrorModel>({
        path: `/software-runs`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Its id stays. What is installed already changes on its next update.
     *
     * @tags Applications
     * @name UpdateSoftwareRecipe
     * @summary Change one of the workspace's own applications
     * @request PUT:/software-recipes/{id}
     */
    updateSoftwareRecipe: (
      id: string,
      data: Recipe,
      params: RequestParams = {},
    ) =>
      this.request<Recipe, ErrorModel>({
        path: `/software-recipes/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  terminalRecordings = {
    /**
     * @description Workspace Owner only, and not while its shell is open.
     *
     * @tags Terminal recordings
     * @name DeleteRecording
     * @summary Delete a terminal recording
     * @request DELETE:/terminal-recordings/{id}
     */
    deleteRecording: (id: string, params: RequestParams = {}) =>
      this.request<void, ErrorModel>({
        path: `/terminal-recordings/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Terminal recordings
     * @name GetRecording
     * @summary A terminal recording's details
     * @request GET:/terminal-recordings/{id}
     */
    getRecording: (id: string, params: RequestParams = {}) =>
      this.request<TerminalRecording, ErrorModel>({
        path: `/terminal-recordings/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description While the shell runs, everything recorded so far.
     *
     * @tags Terminal recordings
     * @name GetRecordingCast
     * @summary A terminal recording as an asciicast v2 file
     * @request GET:/terminal-recordings/{id}/cast
     */
    getRecordingCast: (id: string, params: RequestParams = {}) =>
      this.request<string, ErrorModel>({
        path: `/terminal-recordings/${id}/cast`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Terminal recordings
     * @name GetRecordingSettings
     * @summary Whether a workspace records its terminals
     * @request GET:/workspaces/{id}/terminal-recording
     */
    getRecordingSettings: (id: string, params: RequestParams = {}) =>
      this.request<RecordingSettings, ErrorModel>({
        path: `/workspaces/${id}/terminal-recording`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description An Owner of the server gets everyone's; anyone else only their own.
     *
     * @tags Terminal recordings
     * @name ListServerRecordings
     * @summary List the terminal recordings made on a server, newest first
     * @request GET:/servers/{id}/terminal-recordings
     */
    listServerRecordings: (
      id: string,
      query?: {
        /**
         * @format int32
         * @min 1
         * @max 200
         * @default 50
         */
        limit?: number;
        /** Only the caller's own, even for an Owner */
        mine?: boolean;
        /**
         * @format int32
         * @min 0
         */
        offset?: number;
        /** In the title, server or person */
        q?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<RecordingListBody, ErrorModel>({
        path: `/servers/${id}/terminal-recordings`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description A workspace Owner gets everyone's; anyone else only their own.
     *
     * @tags Terminal recordings
     * @name ListWorkspaceRecordings
     * @summary List a workspace's terminal recordings, newest first
     * @request GET:/workspaces/{id}/terminal-recordings
     */
    listWorkspaceRecordings: (
      id: string,
      query?: {
        /**
         * @format int32
         * @min 1
         * @max 200
         * @default 50
         */
        limit?: number;
        /** Only the caller's own, even for an Owner */
        mine?: boolean;
        /**
         * @format int32
         * @min 0
         */
        offset?: number;
        /** In the title, server or person */
        q?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<RecordingListBody, ErrorModel>({
        path: `/workspaces/${id}/terminal-recordings`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Applies to shells opened from now on; open ones keep going as they started.
     *
     * @tags Terminal recordings
     * @name SetRecordingSettings
     * @summary Turn terminal recording on or off for a workspace
     * @request PUT:/workspaces/{id}/terminal-recording
     */
    setRecordingSettings: (
      id: string,
      data: RecordingSettingsBody,
      params: RequestParams = {},
    ) =>
      this.request<RecordingSettings, ErrorModel>({
        path: `/workspaces/${id}/terminal-recording`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
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
     * @description Walks the whole storage in the background (a job of kind storage-scan) and stores the result for Insights. 409 while it's being measured.
     *
     * @tags Storage
     * @name MeasureStorageUsage
     * @summary Measure how much a storage holds
     * @request POST:/storages/{id}/usage/measure
     */
    measureStorageUsage: (id: string, params: RequestParams = {}) =>
      this.request<Job, ErrorModel>({
        path: `/storages/${id}/usage/measure`,
        method: "POST",
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
     * @description For the storages this person can see (in the selected workspace). Latency and activity come bucketed: 30 min for 24h, 4 h for 7d, a day for 30d.
     *
     * @tags Storage
     * @name StorageInsights
     * @summary Uptime, latency, space and activity of the storages
     * @request GET:/storages/insights
     */
    storageInsights: (
      query?: {
        /** @default "7d" */
        range?: "24h" | "7d" | "30d";
        /** IANA time zone the buckets line up with (days start at its midnight) */
        tz?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<StorageInsights, ErrorModel>({
        path: `/storages/insights`,
        method: "GET",
        query: query,
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
  storageBuckets = {
    /**
     * @description Only on an S3 storage that shows every bucket. Object lock can only be chosen now; it also turns versioning on.
     *
     * @tags Storage buckets
     * @name CreateStorageBucket
     * @summary Make a bucket
     * @request POST:/storages/{id}/buckets
     */
    createStorageBucket: (
      id: string,
      data: CreateStorageBucketRequest,
      params: RequestParams = {},
    ) =>
      this.request<BucketDetails, ErrorModel>({
        path: `/storages/${id}/buckets`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Deletes every object, old versions and delete markers included, and keeps the bucket and its settings. Objects under object lock retention stay.
     *
     * @tags Storage buckets
     * @name EmptyStorageBucket
     * @summary Empty a bucket
     * @request POST:/storages/{id}/buckets/{bucket}/empty
     */
    emptyStorageBucket: (
      id: string,
      bucket: string,
      params: RequestParams = {},
    ) =>
      this.request<StorageAffectedOutputBody, ErrorModel>({
        path: `/storages/${id}/buckets/${bucket}/empty`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Each setting is read on its own; one the provider doesn't support is listed in problems.
     *
     * @tags Storage buckets
     * @name GetStorageBucket
     * @summary A bucket's settings
     * @request GET:/storages/{id}/buckets/{bucket}
     */
    getStorageBucket: (
      id: string,
      bucket: string,
      params: RequestParams = {},
    ) =>
      this.request<BucketDetails, ErrorModel>({
        path: `/storages/${id}/buckets/${bucket}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description private / download / public replace only the policy's anonymous statements and keep the rest; custom sets policy as given (empty removes it). Some providers (R2, B2) refuse bucket policies.
     *
     * @tags Storage buckets
     * @name SetStorageBucketAccess
     * @summary Who can read a bucket without a key
     * @request PUT:/storages/{id}/buckets/{bucket}/access
     */
    setStorageBucketAccess: (
      id: string,
      bucket: string,
      data: SetStorageBucketAccessRequest,
      params: RequestParams = {},
    ) =>
      this.request<BucketDetails, ErrorModel>({
        path: `/storages/${id}/buckets/${bucket}/access`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Which web pages may call the bucket from a browser. An empty list removes them.
     *
     * @tags Storage buckets
     * @name SetStorageBucketCors
     * @summary Replace a bucket's CORS rules
     * @request PUT:/storages/{id}/buckets/{bucket}/cors
     */
    setStorageBucketCors: (
      id: string,
      bucket: string,
      data: SetStorageBucketCorsRequest,
      params: RequestParams = {},
    ) =>
      this.request<BucketDetails, ErrorModel>({
        path: `/storages/${id}/buckets/${bucket}/cors`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Objects already there keep the encryption they were written with. MinIO needs a KMS set up for either kind.
     *
     * @tags Storage buckets
     * @name SetStorageBucketEncryption
     * @summary Default encryption for new objects
     * @request PUT:/storages/{id}/buckets/{bucket}/encryption
     */
    setStorageBucketEncryption: (
      id: string,
      bucket: string,
      data: SetStorageBucketEncryptionRequest,
      params: RequestParams = {},
    ) =>
      this.request<BucketDetails, ErrorModel>({
        path: `/storages/${id}/buckets/${bucket}/encryption`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description The whole list; an empty list removes them. A rule with an existing id keeps its parts not shown here.
     *
     * @tags Storage buckets
     * @name SetStorageBucketLifecycle
     * @summary Replace a bucket's lifecycle rules
     * @request PUT:/storages/{id}/buckets/{bucket}/lifecycle
     */
    setStorageBucketLifecycle: (
      id: string,
      bucket: string,
      data: SetStorageBucketLifecycleRequest,
      params: RequestParams = {},
    ) =>
      this.request<BucketDetails, ErrorModel>({
        path: `/storages/${id}/buckets/${bucket}/lifecycle`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Only on a bucket made with object lock. COMPLIANCE can't be shortened or lifted by anyone, root included, until it runs out.
     *
     * @tags Storage buckets
     * @name SetStorageBucketRetention
     * @summary Default retention for new objects
     * @request PUT:/storages/{id}/buckets/{bucket}/retention
     */
    setStorageBucketRetention: (
      id: string,
      bucket: string,
      data: SetStorageBucketRetentionRequest,
      params: RequestParams = {},
    ) =>
      this.request<BucketDetails, ErrorModel>({
        path: `/storages/${id}/buckets/${bucket}/retention`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description At most 50; an empty map removes them.
     *
     * @tags Storage buckets
     * @name SetStorageBucketTags
     * @summary Replace a bucket's tags
     * @request PUT:/storages/{id}/buckets/{bucket}/tags
     */
    setStorageBucketTags: (
      id: string,
      bucket: string,
      data: SetStorageBucketTagsRequest,
      params: RequestParams = {},
    ) =>
      this.request<BucketDetails, ErrorModel>({
        path: `/storages/${id}/buckets/${bucket}/tags`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Once on, versioning can only be suspended: old versions stay until deleted.
     *
     * @tags Storage buckets
     * @name SetStorageBucketVersioning
     * @summary Turn versioning on or pause it
     * @request PUT:/storages/{id}/buckets/{bucket}/versioning
     */
    setStorageBucketVersioning: (
      id: string,
      bucket: string,
      data: SetStorageBucketVersioningRequest,
      params: RequestParams = {},
    ) =>
      this.request<BucketDetails, ErrorModel>({
        path: `/storages/${id}/buckets/${bucket}/versioning`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
}
