# PostgreSQL continuous backup (PITR) — plan

Status: approved 2026-11-22. Decisions: pgBackRest; phase 1 = Postgres installed on the host (the user's 150 GB one); S3 over HTTPS first, SFTP right after (both repo types); Morche restarts Postgres after a typed confirmation (now or at a set time).
Date: 2026-11-22.

## Why

Today a PostgreSQL plan is a logical `pg_dump` (custom or directory format,
zstd, streamed through Morche to the Storages). For a 150 GB database that means:

- **Slow recovery.** `pg_restore` rebuilds every index and constraint: hours.
- **Up to a day of lost data.** One dump a night; no incrementals for Postgres.
- **Load and bloat.** A dump reads everything for hours and holds a snapshot open,
  so vacuum can't clean up behind it.
- **Everything every night.** All 150 GB is read and sent again each time.

A physical backup plus continuous WAL archiving fixes all four:

- weekly full + daily differential + continuous WAL;
- recovery to any second;
- a restore is a file copy;
- it can run from a standby.

## Tool: pgBackRest (recommended)

| | pgBackRest | WAL-G | Barman |
|---|---|---|---|
| Runs on | the DB host | the DB host | its own backup server |
| Repos | S3, SFTP, Azure, GCS, posix | S3, GCS, Azure, SSH | its own disk |
| Full / diff / incr | yes (+ block incremental) | full + delta | full + incr (rsync) |
| Parallel, zstd, encryption | yes | yes | partly |
| Retention prunes WAL too | yes | by hand-ish | yes |
| `info --output=json`, `verify` | yes | `backup-list --json` | yes |
| Packages | PGDG, Debian/Ubuntu, RHEL | one static binary | PGDG |

pgBackRest has the most complete retention, verify, delta-restore and JSON
status, which is what the UI needs. WAL-G is the fallback, if a single binary
matters more than features.

## Scope by phase

**Phase 1 (this plan):**
- PostgreSQL reached through its server (`mode = server`), installed on the host.
- Repo = a Morche S3 Storage over **HTTPS** (pgBackRest speaks S3 only over TLS;
  a plain-http MinIO can't be used, and the UI says so).

**Phase 2:**
- SFTP repo.
- Postgres in a Docker container: `archive_command` runs inside it, so the image
  needs pgBackRest; offer a derived image or a mounted static binary.
- Scheduled restore tests.
- Alert metrics.

**Phase 3:**
- Direct databases (no SSH to the host): `pg_basebackup` + `pg_receivewal`
  on a runner server.

## Data model (backend)

- `database_pitr` (one per database = one Postgres cluster), with these columns:
  - `database_id`, `storage_id`, `repo_path` (`/pgbackrest/<db id>`), `stanza` (`morche`)
  - `full_cron`, `diff_cron`, `incr_cron` (optional), `timezone`
  - `retention_full` (count), `compress` (zstd level), `process_max`, `encrypt` (bool + passphrase sealed)
  - `state` = `new | setting_up | needs_restart | ready | broken`, `problem`
  - `last_info` jsonb (`pgbackrest info` output), `checked_at`
  - `created_by`, `updated_by` (runs as whoever saved it last, like plans)
- `database_pitr_runs`:
  - kind = `setup | backup | check | restore | teardown`, plus type full/diff/incr
  - job id, state, bytes, started/finished, error
- `database_pitr_restores`:
  - target time / `latest`, mode = `new_instance | replace`
  - for a new instance: data dir, port, `temp_database_id`
  - state

## Backend (`internal/pitr` writes scripts, `api/database_pitr*.go` runs them)

### Setup (job `pg-pitr-setup`, Owner on the database + Engineer and root/sudo on the server)

1. **Detect.** Read the Postgres major version, `data_directory`, `archive_mode`,
   `archive_command`, `wal_level`, the service unit (systemd `postgresql@18-main`
   or `postgresql-18`), the package manager, and whether an existing
   `archive_command` belongs to someone else. If it does, refuse unless the user
   ticks "Replace it".
2. **Install** `pgbackrest`: the distro package, or PGDG when that's too old.
3. **Write `/etc/pgbackrest/pgbackrest.conf`** (owner `postgres`, mode 0640):
   - `[global]`: `repo1-type=s3`, endpoint, bucket, region, `uri-style=path`,
     key and secret (from the Storage, sealed in Morche), `repo1-path`,
     `repo1-retention-full`, `compress-type=zst`, `process-max`,
     `archive-async=y` + `spool-path`, optional `repo1-cipher-type=aes-256-cbc`
   - `[morche]`: `pg1-path`, `pg1-port`
4. **`pgbackrest stanza-create`, then point Postgres at it** with `ALTER SYSTEM SET`:
   - `archive_mode = on`
   - `archive_command = 'pgbackrest --stanza=morche archive-push %p'`
   - `wal_level >= replica`
   - then `pg_reload_conf()`
5. **`archive_mode` needs a restart.** State becomes `needs_restart`, and the UI
   offers *Restart now* (type the name), *At a time* (a scheduled job), or
   *I'll restart it*. After the restart, `pgbackrest check`, then the first full backup.

**Secrets:** the S3 key has to live on the DB host, because Postgres calls
archive-push on its own. The UI recommends a dedicated bucket and a key that can
reach only that bucket.

### Backups

- Morche's scheduler runs `sudo -u postgres pgbackrest backup --type=full|diff|incr`
  over SSH, as job `pg-pitr-backup`.
- Progress comes from `pgbackrest info --output=json` and the log.
- Retention is pgBackRest's own (`expire` runs after each backup).

### Status (cheap poll, part of the database monitor)

- `pgbackrest info --output=json`:
  - backups with type, size, repo size, start/stop time, LSN;
  - the archive's min/max WAL.
- `pg_stat_archiver`: `archived_count`, `last_archived_time`, `failed_count`,
  `last_failed_wal`, `last_failed_time`.
- From these:
  - the recoverable window = first backup's stop time → last archived WAL time;
  - archive lag;
  - a `problem` for each of: archive failing, no backup newer than X, repo unreachable.

### Restore (job `pg-pitr-restore`)

**To a new instance (default, safe):**
- `pgbackrest restore --stanza=morche --pg1-path=<new dir> --type=time "--target=<ts>" --target-action=promote`
  into `/var/lib/postgresql/morche-restore-<ts>`.
- Then `pg_ctl start` on a free port, with `archive_mode=off`.
- It shows up in Morche as a temporary database. From there the user can:
  - look around with the data explorer;
  - pull data out (database sync or dump);
  - remove it (teardown = stop + delete the dir).
- Free space on the disk is checked before starting.

**Replace the cluster:**
- Type the name to confirm; optionally take a full backup first.
- Stop the service, run `pgbackrest restore --delta --type=time --target=…`,
  then start it.
- `--delta` only rewrites the files that differ, so it's fast on a big data dir.

**Latest:** the same, without `--type=time`, which replays to the end of the WAL.

## Frontend

- New database tab **"Point in time"** (`?tab=pitr`), only for Postgres.
  Desktop has its toolbar row with no title (house rules); phones get a chip row.
- **Not set up:** a short explainer (dump vs PITR, what will change on the server:
  install, config, restart), then **Set up** → full-page editor
  `/databases/[id]/pitr/setup` (`EditorPage`):
  - Storage (HTTPS S3 only; others disabled with the reason);
  - Schedule: full weekly / diff daily / incr optional;
  - Retention;
  - Compression and process-max;
  - Encryption;
  - Summary aside: "What Morche will change on <server>".
- **Set up:**
  - Hero: a timeline bar of the recoverable window (earliest → now), with full,
    diff and incr ticks and gaps shown red.
  - "Restore to a point in time" button.
  - KPI tiles: last backup, archive lag, repo size, WAL/day.
  - Archive health notice.
  - List of backups.
  - Runs.
  - Settings (edit, pause, remove + tear down the config).
- **Restore layer:**
  - Pick a point: a datetime field limited to the window, with quick picks
    (5 min ago, before the last failed migration…).
  - Choose New instance (recommended) or Replace.
  - Free-space check, type to confirm, then job progress.
- `needs_restart` banner on the database page and a Home issue.
  Red nav count for `broken`.
- Guide `databases#pitr` with sections for setup, restore, troubleshooting and
  recommended settings.
- Palette action: "Restore to a point in time".

## Testing

- Compose service `test-pitr`: `postgres:18` + `pgbackrest` + `openssh-server`
  (sshd + `pg_ctl`, no systemd; the restart path detects `pg_ctl`).
  It's registered as a server, with its Postgres as a server-mode database.
- A TLS MinIO for the repo: `test-minio-tls`, self-signed, with
  `repo1-storage-verify-tls=n` allowed only behind an "Allow a self-signed
  certificate" switch on the Storage.
- Live tests (`-tags pitrlive`):
  1. set up;
  2. full backup;
  3. write rows, note the time, write more;
  4. restore to the noted time as a new instance;
  5. compare the rows;
  6. tear down.
- Unit tests for the scripts (quoting, no secrets on command lines) and for
  parsing `info` JSON.

## Open questions (for the user)

1. Tool: pgBackRest (recommended) or WAL-G?
2. How does the 150 GB database run: Postgres installed on the host, in Docker,
   or managed (no SSH)? This decides whether phase 1 covers it.
3. Repo: S3 over HTTPS available (MinIO with TLS, Arvan, R2…)? Or does it need SFTP first?
4. Restart: is Morche allowed to restart Postgres when the user confirms
   (now / at a set time), or should it only tell the user to?
