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

export interface CopyFilesRequest {
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

export interface ExtractResult {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  destination: string;
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

export interface ListTerminalsResponse {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  items: TerminalSession[];
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

export interface MoveFilesRequest {
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

export interface Session {
  from: string;
  /** As who printed it, in the server's time */
  since: string;
  tty: string;
  user: string;
}

export interface SetServerFavoriteRequest {
  /**
   * A URL to the JSON Schema for this object.
   * @format uri
   */
  $schema?: string;
  favorite: boolean;
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
     * @description All paths must be in one folder. The archive goes next to them unless destination is given; an existing name gets a number.
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
      this.request<FileEntry, ErrorModel>({
        path: `/servers/${id}/files/compress`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Copies with `cp -a` (keeps permissions and times). Copying into the same folder makes "name copy", "name copy 2"…; elsewhere an existing name is 409.
     *
     * @tags Files
     * @name CopyFiles
     * @summary Copy files into a folder
     * @request POST:/servers/{id}/files/copy
     */
    copyFiles: (
      id: string,
      data: CopyFilesRequest,
      params: RequestParams = {},
    ) =>
      this.request<AffectedOutputBody, ErrorModel>({
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
     * @description Handles .tar, .tar.gz/.tgz, .tar.bz2, .tar.xz, .zip and .gz with the server's tar, unzip and gzip. Existing files are overwritten.
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
      this.request<ExtractResult, ErrorModel>({
        path: `/servers/${id}/files/extract`,
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
     * @description Nothing moves if any name already exists in the destination (409).
     *
     * @tags Files
     * @name MoveFiles
     * @summary Move files into a folder
     * @request POST:/servers/{id}/files/move
     */
    moveFiles: (
      id: string,
      data: MoveFilesRequest,
      params: RequestParams = {},
    ) =>
      this.request<AffectedOutputBody, ErrorModel>({
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
  network = {
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
     * @description With the server's package manager (EPEL on RHEL-likes), then starts it and enables it at boot. Can take minutes. A failed install answers 200 with ok=false and the output.
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
      this.request<Fail2BanTask, ErrorModel>({
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
     * @description Stops it (lifting every ban) and removes the package.
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
      this.request<Fail2BanTask, ErrorModel>({
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
}
