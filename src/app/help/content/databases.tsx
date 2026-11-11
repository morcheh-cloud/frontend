import {
  A,
  C,
  Code,
  Example,
  type GuideSection,
  List,
  P,
  Recommended,
  See,
  Steps,
  Table,
  Tip,
  UI,
  Warn,
} from "../components/prose"

export const databases: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <UI>Databases</UI> keeps an eye on the databases your apps depend on
          and tells you, in plain words, whether each one is working properly:
          can it be reached, is it running out of room, is something stuck, are
          its copies keeping up, is it backed up, is it exposed. The worst ones
          are listed first, and every problem comes with the reason and what to
          do about it.
        </P>
        <Table
          head={["Engine", "What Morche reads"]}
          rows={[
            [
              "PostgreSQL",
              "Sessions, locks, pg_stat_statements, table and index stats, WAL, replicas and slots",
            ],
            [
              "MySQL / MariaDB",
              "Process list, InnoDB locks, performance_schema, table sizes, replication",
            ],
            [
              "SQL Server",
              "DMVs: sessions, blocking, the plan cache, database states, transaction logs, backups",
            ],
            [
              "MongoDB",
              "serverStatus, current operations, collection sizes, replica set and oplog window",
            ],
            [
              "Redis",
              "INFO, client list, SLOWLOG, memory, persistence, a sample of keys",
            ],
          ]}
        />
        <P>
          Morche only reads. It never browses or changes your data or schema.
          The only things it can do to a database are stop a session (
          <UI>Kill</UI>) and ask for a query plan without running the query (
          <UI>Explain</UI>). <A href="#backups">Backups</A> only read too; the
          one exception is <A href="#restore">restoring a backup</A>, which an
          Owner starts and confirms.
        </P>
      </>
    ),
  },
  {
    id: "add",
    title: "Adding a database",
    body: (
      <>
        <Steps>
          <P>
            Open <UI>Databases</UI> (under Infrastructure) and press{" "}
            <UI>Add database</UI>.
          </P>
          <P>
            Pick the <UI>Engine</UI>. If you have a URL such as{" "}
            <C>postgres://user:pass@host:5432/shop</C>, paste it into{" "}
            <UI>Connection string</UI> and the fields fill in.
          </P>
          <P>
            Choose <UI>How Morche reaches it</UI> (see below) and fill in the
            address and <UI>Port</UI>.
          </P>
          <P>
            Enter the <UI>Username</UI> and <UI>Password</UI> of a monitoring
            login (see{" "}
            <See guide="databases" section="login">
              A login for Morche
            </See>
            ).
          </P>
          <P>
            Pick how often to look under <UI>Check every</UI> and press{" "}
            <UI>Add database</UI>. The first check runs straight away.
          </P>
        </Steps>
        <List>
          <li>
            <UI>Through a server</UI>: Morche opens an SSH tunnel to one of your
            servers and connects from there, so the database port never has to
            be open to the internet. Leave the address empty for a database on
            the server itself (<C>127.0.0.1</C>), or enter another host the
            server can reach. This is the safest choice.
          </li>
          <li>
            <UI>Docker container</UI>: when the database runs in a container on
            that server, enter its name or ID. Morche finds the container's
            address; the port doesn't need to be published.
          </li>
          <li>
            <UI>Direct address</UI>: for a managed database (RDS, Cloud SQL,
            Azure…) or anything on a public IP or domain. Morche connects from
            the panel itself.
          </li>
        </List>
        <P>
          For a direct address, <UI>Encryption</UI> is on by default:{" "}
          <UI>Encrypted</UI> uses TLS, <UI>Verified</UI> also checks the
          certificate (paste the provider's <UI>CA certificate</UI> when it
          isn't a public one), <UI>Off</UI> sends everything in clear text. The
          form shows the panel's outbound IP with <UI>Copy IP</UI>: add it to
          the database's firewall or allow list.
        </P>
        <P>
          A direct address that points into a private range (10.x, 192.168.x,
          localhost…) is refused unless a system admin ticks{" "}
          <UI>Allow a private address</UI>. That stops a form from being used to
          poke at the panel's own network. For a database on your LAN, prefer{" "}
          <UI>Through a server</UI>.
        </P>
      </>
    ),
  },
  {
    id: "login",
    title: "A login for Morche",
    body: (
      <>
        <P>
          Give Morche its own login with only the rights it needs to read
          statistics, not your admin account. Anything it can't read shows as a
          note on the dashboard saying which grant is missing.
        </P>
        <Example title="PostgreSQL">
          <Code>{`CREATE ROLE morcheh LOGIN PASSWORD 'change-me';
GRANT pg_monitor TO morcheh;
-- to stop other sessions with Kill:
GRANT pg_signal_backend TO morcheh;
-- for the Queries tab (needs shared_preload_libraries = 'pg_stat_statements'):
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`}</Code>
        </Example>
        <Example title="MySQL / MariaDB">
          <Code>{`CREATE USER 'morcheh'@'%' IDENTIFIED BY 'change-me';
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'morcheh'@'%';
GRANT SELECT ON performance_schema.* TO 'morcheh'@'%';
-- to stop other sessions with Kill (MySQL 8):
GRANT CONNECTION_ADMIN ON *.* TO 'morcheh'@'%';`}</Code>
        </Example>
        <Example title="SQL Server">
          <Code>{`CREATE LOGIN morcheh WITH PASSWORD = 'Change-me-2026!';
GRANT VIEW SERVER STATE TO morcheh;  -- 2022: VIEW SERVER PERFORMANCE STATE
GRANT VIEW ANY DEFINITION TO morcheh;
-- to stop other sessions with Kill:
GRANT ALTER ANY CONNECTION TO morcheh;`}</Code>
        </Example>
        <Example title="MongoDB">
          <Code>{`use admin
db.createUser({
  user: "morcheh",
  pwd: "change-me",
  roles: ["clusterMonitor"]  // add "hostManager" to stop operations
})`}</Code>
        </Example>
        <Example title="Redis (6 and later)">
          <Code>
            {
              "ACL SETUSER morcheh on >change-me -@all +ping +info +client|list +client|kill +slowlog|get +config|get +acl|list +scan +type +memory|usage +dbsize"
            }
          </Code>
        </Example>
        <Tip>
          Managed services often block some of these (for example{" "}
          <C>CONFIG GET</C> on managed Redis). Morche still works; it just shows
          less, and says what it couldn't read.
        </Tip>
      </>
    ),
  },
  {
    id: "health",
    title: "Health checks",
    body: (
      <>
        <P>
          On every look Morche runs a set of checks and gives each one a level:{" "}
          <UI>OK</UI>, <UI>Warning</UI> or <UI>Critical</UI> (or{" "}
          <UI>Unknown</UI> when it couldn't read what the check needs). The
          database takes the level of its worst check, and the list puts the
          worst databases first. Each check that isn't OK shows why, and the
          next step.
        </P>
        <Table
          head={["Area", "Checks"]}
          rows={[
            [
              "Availability",
              "Reachable, response time, database states (SQL Server)",
            ],
            [
              "Capacity",
              "Disk, connections, memory limit (Redis), auto-increment IDs, transaction log, replication slots, oplog window",
            ],
            [
              "Performance",
              "Blocking, long queries, long transactions, idle in transaction, deadlocks, cache hit",
            ],
            ["Replication", "How far replicas are behind, stopped copies"],
            ["Backups", "Last backup, restore test, persistence (Redis)"],
            [
              "Security",
              "Encryption, authentication, exposure, failed sign-ins, risky settings",
            ],
          ]}
        />
        <P>
          A new level must show up on two looks in a row before it counts, so
          one slow reply doesn't turn a database red. The overview's{" "}
          <UI>Recent changes</UI> lists when each check changed level.
        </P>
        <P>
          Morche looks at every database by itself on its schedule (every minute
          unless you change it), even when nobody has the panel open, and the
          pages on screen pick up the result every 10 seconds. The red number
          beside <UI>Databases</UI> in the sidebar (on a phone, in <UI>More</UI>
          ) counts the databases in this workspace that can't be reached or have
          a <UI>Critical</UI> check. Paused databases never count. Pick{" "}
          <UI>Needs a look</UI> on the list to see which.
        </P>
        <P>
          To get a message when a database goes down or turns critical, open its{" "}
          <UI>Alerts</UI> tab and press <UI>Database unreachable</UI> or{" "}
          <UI>Database critical</UI>. <See guide="alerts" section="databases" />
        </P>
      </>
    ),
  },
  {
    id: "limits",
    title: "Changing limits and muting",
    body: (
      <>
        <P>
          On the dashboard's <UI>Checks</UI> panel, press <UI>Settings</UI> to
          change the <UI>Warning</UI> and <UI>Critical</UI> limits of every
          check, or use a check's menu: <UI>Change limits…</UI> or <UI>Mute</UI>
          . A muted check still shows its level but no longer counts towards the
          database's health. Critical has to be at or above Warning (for checks
          where lower is worse, such as cache hit, it's the other way round).
        </P>
        <Recommended
          rows={[
            {
              setting: "Disk",
              value: "85% / 95%",
              why: "Time to clean up or grow before writes fail",
            },
            {
              setting: "Connections",
              value: "80% / 95%",
              why: "New clients are refused at the limit",
            },
            {
              setting: "Long queries",
              value: "60 s / 10 min",
              why: "Raise it on a reporting database",
            },
            {
              setting: "Long transactions",
              value: "10 min / 1 h",
              why: "Old transactions hold locks and stop cleanup",
            },
            {
              setting: "Replication",
              value: "30 s / 5 min",
              why: "A replica that far behind loses that much on failover",
            },
            {
              setting: "Last backup",
              value: "26 h / 72 h",
              why: "A nightly backup plus some slack",
            },
            {
              setting: "Check every",
              value: "1 min",
              why: "15 s for busy production, 5 min for test databases",
            },
          ]}
        />
        <P>
          To stop looking at a database for a while (maintenance, a planned
          migration), use <UI>Pause monitoring</UI> in its menu, and{" "}
          <UI>Resume monitoring</UI> afterwards.
        </P>
      </>
    ),
  },
  {
    id: "dashboard",
    title: "The dashboard",
    body: (
      <>
        <P>
          Open a database to see its dashboard. It updates every few seconds
          while it's open.
        </P>
        <Table
          head={["Tab", "What's on it"]}
          rows={[
            [
              "Overview",
              "Checks, load (queries per second, cache hit, connections), compared with yesterday and the usual for this hour, space and growth, recent changes",
            ],
            [
              "Sessions",
              "Who's connected and what they run, who blocks whom, what sessions wait on; Kill",
            ],
            [
              "Queries",
              "The statements that cost the most time (total, per call, calls); Explain. Redis: the slow log",
            ],
            [
              "Tables & space",
              "Databases, largest tables, dead rows, auto-increment IDs near their limit, unused indexes, transaction log. Redis: keys",
            ],
            [
              "Clients",
              "Connections grouped by address, with the logins, databases and apps each one uses",
            ],
            [
              "Replication",
              "Role, the source it copies from, replicas and how far behind they are, replication slots",
            ],
            ["Details", "Version, security, engine facts, logins and settings"],
          ]}
        />
        <P>
          On <UI>Clients</UI>, an address seen for the first time in the last
          day is tagged <UI>New</UI>. An unknown address on a production
          database is worth a look. <UI>Tables & space</UI> may suggest changes
          (an unused index, a table full of dead rows); Morche never makes them,
          you decide.
        </P>
      </>
    ),
  },
  {
    id: "sessions",
    title: "Stopping a session (Kill)",
    body: (
      <>
        <P>
          On <UI>Sessions</UI>, a session's menu stops what it's doing. Use it
          for a runaway query or the session at the top of a blocking chain
          (switch to <UI>Who blocks whom</UI> to find it). Press{" "}
          <UI>Hold updates</UI> first if the list moves too fast.
        </P>
        <Table
          head={["Engine", "What you can stop"]}
          rows={[
            [
              "PostgreSQL, MySQL",
              "The running statement only, or the whole connection (Close connection)",
            ],
            ["SQL Server, Redis", "The connection (Close connection)"],
            ["MongoDB", "The operation (Stop operation)"],
          ]}
        />
        <Warn>
          Closing a connection rolls back its open transaction. The app on the
          other side sees an error and usually reconnects. Morche's own session
          is marked and can't be stopped.
        </Warn>
      </>
    ),
  },
  {
    id: "explain",
    title: "Explain a query",
    body: (
      <>
        <P>
          <UI>Explain a query</UI> on the <UI>Queries</UI> tab (or{" "}
          <UI>Explain…</UI> in a statement's menu) shows how the database would
          run a statement: which indexes it uses, what it scans, the estimated
          cost. The statement itself is never run. Not available for Redis. For
          MongoDB, enter the filter as JSON and pick the database.
        </P>
        <Tip>
          A sequential scan (or <C>COLLSCAN</C>) over a big table in a query
          that runs often is the usual reason for a slow app.
        </Tip>
      </>
    ),
  },
  {
    id: "backups",
    title: "Backups",
    body: (
      <>
        <P>
          The <UI>Backups</UI> tab on a database copies it to one or more{" "}
          <See guide="storage">storages</See>, on a schedule or when you press
          the button. The dump is made once, then uploaded to every storage the
          plan names. Where it's made depends on how the database is reached
          (see <A href="#where-it-runs">Where a backup runs</A>).
        </P>
        <P>
          A database can have several plans, each with its own databases,
          storages, schedule and keeping rule: for example an hourly one kept
          for a day next to a nightly one kept for a year. A plan is made and
          changed on its own page.
        </P>
        <P>
          The tab has three lists, each with its count: <UI>Plans</UI>,{" "}
          <UI>Backups</UI> (every copy made, newest first) and <UI>Restores</UI>{" "}
          (the history of restores). A long list shows 20 rows at a time; the
          arrows under it change the page. A dot on <UI>Plans</UI> means a plan
          can't run, and the list says why.
        </P>
        <Steps>
          <P>
            Open the database, go to <UI>Backups</UI> and press{" "}
            <UI>New plan</UI>.
          </P>
          <P>
            <UI>What to back up</UI>: <UI>All databases</UI> (whatever is there
            at run time), <UI>Selected</UI> (tick them, or type a name) or{" "}
            <UI>Pattern</UI> (a regular expression; the box lists what it
            matches now). Each database becomes a file of its own.
          </P>
          <P>
            <UI>Backup type</UI>: <UI>Full</UI>, or <UI>Incremental</UI> where
            the engine has it (see{" "}
            <A href="#incremental">Incremental backups</A>).
          </P>
          <P>
            <UI>Where to store</UI>: tick up to 10 storages. <UI>+</UI> opens{" "}
            <UI>Storage</UI> in a new tab; come back and press refresh.
          </P>
          <P>
            <UI>Folder</UI>: where they go on each storage. <C>{"{year}"}</C>,{" "}
            <C>{"{month}"}</C> and <C>{"{day}"}</C> are filled in at run time,
            and the line below shows today's result.
          </P>
          <P>
            <UI>When to run</UI>: pick a schedule, press the gear for any other
            one, or <UI>Only by hand</UI>.
          </P>
          <P>
            <UI>How long to keep</UI>: <UI>Days</UI>, <UI>GFS</UI> or{" "}
            <UI>Forever</UI> (see <A href="#retention">Keeping backups</A>).
          </P>
          <P>
            <UI>Run it from</UI> (direct connections only): keep{" "}
            <UI>This Morche server</UI>, or pick a server that can reach the
            database.
          </P>
          <P>
            Turn on <UI>Use another login</UI> and enter one that can read all
            the data, unless the monitoring login already can. Check the{" "}
            <UI>Summary</UI>, then <UI>Create plan</UI>.
          </P>
          <P>
            Press <UI>Back up now</UI> on the toast (or the play button on the
            plan) and wait for <UI>Done</UI>, so you know it works before
            tonight. Then <UI>Check</UI> in the backup's menu reads the file
            back.
          </P>
        </Steps>
        <Example title="Nightly, to two places">
          <P>
            <UI>Selected</UI> <C>shop</C> and <C>billing</C>, storages{" "}
            <UI>Office NAS</UI> and <UI>S3 Frankfurt</UI>, folder{" "}
            <C>/backups/{"{year}-{month}-{day}"}</C>, <UI>Daily</UI> at 02:00,
            GFS 7 / 4 / 12. Each night makes two files, each uploaded to both
            storages, under <C>/backups/2026-11-07/&lt;database&gt;/</C>.
          </P>
        </Example>
        <Recommended
          rows={[
            {
              setting: "Storages",
              value: "Two, one of them off-site",
              why: "A copy that dies with the database isn't a backup",
            },
            {
              setting: "Keeping",
              value: "GFS 7 daily, 4 weekly, 12 monthly",
              why: "Mistakes are often found days or weeks later",
            },
            {
              setting: "Schedule",
              value: "When traffic is lowest",
              why: "A dump reads everything",
            },
            {
              setting: "Check",
              value: "After changing a plan, then now and then",
              why: "It's the only proof that the stored file is still good",
            },
          ]}
        />
        <Table
          head={["Engine", "What's made"]}
          rows={[
            ["PostgreSQL", "pg_dump custom format (.dump), one per database"],
            [
              "MySQL / MariaDB",
              "mysqldump of each database, gzipped; incrementals = binary log",
            ],
            ["MongoDB", "mongodump archive of each database, gzipped"],
            ["Redis", "A snapshot of everything (.rdb); no choice of database"],
            [
              "SQL Server",
              "BACKUP DATABASE (.bak); incrementals = differential; on its own server only",
            ],
          ]}
        />
        <P>
          The list under the plans shows every backup: database, type, the
          storages that hold it, size and state. If an upload to one storage
          fails the backup still counts, and the row says how many uploads
          failed; the details say why.
        </P>
        <P>
          <UI>Check</UI> reads the stored file back, compares it with the
          SHA-256 recorded when it was made and has the engine's own tool read
          it where it can. It proves the file is whole, not that a restore will
          work, so try a restore as a new database now and then. The health
          check <UI>Backup check</UI> on the Overview tab tells you when one is
          due.
        </P>
        <Warn>
          Anyone who can open those storages can read the backups, and the files
          aren't encrypted. Keep them in storages only the right people can
          reach.
        </Warn>
        <P>
          A plan runs with the access of whoever saved it last: Owner on the
          database, Engineer on every storage and on the server that runs it. If
          that person loses access, the plan shows why it can't run until
          someone with access saves it. Deleting a plan leaves its backups in
          place.
        </P>
        <Table
          head={["Level", "Can"]}
          rows={[
            ["Viewer", "See plans, backups and restores"],
            ["Operator", "Also back up now, Check and Stop"],
            [
              "Owner",
              "Also manage plans; download and restore (with Operator on a storage that holds it); delete (with Engineer on every storage that holds it)",
            ],
          ]}
        />
        <P>
          A plan whose last run failed adds to the red count on{" "}
          <UI>Databases</UI> and shows on{" "}
          <See guide="getting-started" section="home">
            Home
          </See>
          . Paused plans aren't counted.
        </P>
        <P>If a backup fails:</P>
        <List>
          <li>
            <UI>permission denied</UI> or similar: the login can't read
            everything. A monitoring login usually can't: use another login.
          </li>
          <li>
            <UI>command not found</UI>: the machine that runs it needs the
            engine's tools, such as <C>postgresql-client</C> or{" "}
            <C>default-mysql-client</C>. On <UI>This Morche server</UI>, use
            Morche's Docker image or install them next to the backend.
          </li>
          <li>
            A newer database than the tools: <C>pg_dump</C> refuses a server
            newer than itself. Update the client on the machine that runs it.
          </li>
          <li>
            <UI>Skipped</UI>: the database was gone, or the pattern matched
            nothing, at run time.
          </li>
          <li>
            SQL Server: the <C>.bak</C> is first written on the database's own
            disk, so it needs the room for it, and root or <C>sudo -n</C> to
            read and remove it.
          </li>
          <li>
            Redis: making the snapshot forks the process, which briefly needs
            spare memory on a busy instance.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "where-it-runs",
    title: "Where a backup runs",
    body: (
      <>
        <Table
          head={["Database", "The dump and the restore run on"]}
          rows={[
            [
              "Direct connection",
              "This Morche server by default, or a server you pick in Run it from",
            ],
            ["Reached through a server", "That server, always"],
            [
              "SQL Server",
              "Its own server only (the .bak is written on its disk)",
            ],
          ]}
        />
        <P>
          On <UI>This Morche server</UI> the engine's client tools must be
          installed where Morche's backend runs. Morche's Docker image has them
          all (<C>pg_dump</C> 18, <C>mariadb-dump</C> and <C>mariadb-binlog</C>,{" "}
          <C>mongodump</C>, <C>redis-cli</C>); on another install the plan form
          lists what's missing. The script gets only what it needs to find its
          tools, never Morche's own settings, and runs with the backend's user.
          Backups that run here queue together, two at a time.
        </P>
        <Tip>
          Pick a server in <UI>Run it from</UI> when the database is only
          reachable from inside its own network, or when the dump would be
          large: the data then crosses the network once, from that server to the
          storages.
        </Tip>
      </>
    ),
  },
  {
    id: "retention",
    title: "Keeping backups (Days, GFS, Forever)",
    body: (
      <>
        <P>
          After a run that worked, a plan deletes the backups it no longer
          needs, files included, on every storage. Each database in the plan is
          counted on its own.
        </P>
        <Table
          head={["Rule", "Keeps"]}
          rows={[
            ["Days", "Everything from the last N days"],
            [
              "GFS",
              "The newest backup of each of the last N days, N weeks and N months",
            ],
            ["Forever", "Everything; nothing is deleted"],
          ]}
        />
        <P>
          GFS (Grandfather-Father-Son) keeps a tiered set across several time
          spans. Set a tier to 0 to turn it off. A backup that fits several
          tiers (Sunday's daily is also that week's weekly) is kept once, so it
          only counts once toward the storage's space.
        </P>
        <Example title="GFS 3 / 4 / 12, run every night">
          <P>
            About 3 + 4 + 12 = 19 backups per database at most, usually fewer
            because tiers overlap: the last 3 nights, the newest of each of the
            last 4 weeks and of each of the last 12 months. A year back is
            covered with under twenty files.
          </P>
        </Example>
        <Tip>
          The newest backup of each database is never deleted, and neither is
          anything a kept incremental builds on, so a chain is never broken by
          the keeping rule.
        </Tip>
      </>
    ),
  },
  {
    id: "incremental",
    title: "Incremental backups",
    body: (
      <>
        <P>
          An incremental plan makes a full backup, then only the changes since
          the backup before, until <UI>Start over with a full backup every</UI>{" "}
          days have passed. They're smaller and quicker; a restore loads the
          full one and every step up to the one you pick, by itself.
        </P>
        <Table
          head={["Engine", "Incremental"]}
          rows={[
            [
              "MySQL / MariaDB",
              "Yes: the binary log since the last backup. Binary logging must be on (log_bin), and the login needs RELOAD, REPLICATION CLIENT and REPLICATION SLAVE",
            ],
            [
              "SQL Server",
              "Yes: a differential backup, everything changed since the last full one",
            ],
            [
              "PostgreSQL",
              "No: its incremental backups cover the whole server and need it stopped to bring back",
            ],
            ["MongoDB", "No: only through a replica set's oplog"],
            ["Redis", "No: only whole snapshots"],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "Full backup every",
              value: "7 days",
              why: "A long chain is slower to restore and breaks if one file goes",
            },
          ]}
        />
        <P>
          A backup's details show its chain: <UI>Open the one before</UI>, and
          how many incrementals build on it. Deleting a backup deletes the
          incrementals that build on it too, since they can't be restored
          without it. If the chain can't go on (the binary log was purged, the
          full one was deleted), the next run makes a full backup.
        </P>
        <Warn>
          A MySQL binary log names its database, so a MySQL incremental can only
          be restored into the database it came from.
        </Warn>
      </>
    ),
  },
  {
    id: "restore",
    title: "Restoring a backup",
    body: (
      <>
        <P>
          Restoring is the one thing Morche writes to a database, and only an
          Owner can start it. Every file is read back from the storage and
          checked against its SHA-256 before the database is touched.
        </P>
        <Steps>
          <P>
            In the backup list, press the restore icon on a row (or{" "}
            <UI>Restore…</UI> in its menu or details).
          </P>
          <P>
            <UI>Restore into</UI>: the database's name. The box says whether one
            with that name exists.
          </P>
          <P>
            <UI>As a new database</UI> creates it and loads the backup; nothing
            that exists is touched. <UI>Replace it</UI> overwrites the database
            with the backup.
          </P>
          <P>
            For a replace, keep <UI>Back it up first</UI> on: a full backup of
            the database as it is now goes to the same storage, so you can go
            back.
          </P>
          <P>
            <UI>Run it from</UI> (direct connections):{" "}
            <UI>Where the plan runs</UI>, <UI>This Morche server</UI> or a
            server. A backup made without a plan runs on this Morche server
            unless you pick one.
          </P>
          <P>
            Type the name again to confirm and press <UI>Replace</UI>. It runs
            as a background task; <UI>Restores</UI> at the bottom of the tab
            lists every one, with a link to the backup taken before.
          </P>
        </Steps>
        <Recommended
          rows={[
            {
              setting: "First restore of a plan",
              value: "As a new database, e.g. shop_check",
              why: "Proves the backup works without touching the real one",
            },
            {
              setting: "Back it up first",
              value: "On",
              why: "The only way back from a replace",
            },
          ]}
        />
        <Table
          head={["Backup", "Restored by Morche"]}
          rows={[
            ["PostgreSQL (one database)", "Yes, into any name"],
            [
              "MySQL / MariaDB (one database)",
              "Yes; incrementals only into their own name",
            ],
            ["SQL Server", "Yes, on its own server only"],
            ["MongoDB (one database)", "Yes, into any name"],
            [
              "Everything at once (pg_dumpall, an old all-databases dump), Redis",
              "No: the details have the commands to run by hand",
            ],
          ]}
        />
        <P>
          The details of every backup also have <UI>Restore by hand</UI>: the
          same steps as commands, for a machine Morche can't reach.
        </P>
        <P>If a restore fails:</P>
        <List>
          <li>
            <UI>You need … access</UI>: a restore needs Owner on the database,
            Operator on the storage (Engineer to write the backup before), and
            Engineer on the server that runs it (none when it runs on this
            Morche server).
          </li>
          <li>
            <UI>permission denied</UI>: the login can't create or overwrite
            databases. Turn on <UI>Use another login</UI> in the restore.
          </li>
          <li>
            <UI>No storage holds every file</UI>: a file of the chain was
            deleted from the storages. Pick an older full backup.
          </li>
          <li>
            A replace that failed halfway leaves the database partly loaded:
            restore the backup taken before, from <UI>Restores</UI>.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "insights",
    title: "Insights: charts and statistics",
    body: (
      <>
        <P>
          The <UI>Insights</UI> tab on the Databases page (next to <UI>All</UI>{" "}
          and <UI>Needs a look</UI>) shows how your databases have been doing
          over <UI>24 hours</UI>, <UI>7 days</UI> or <UI>30 days</UI>, from the
          monitor's checks (kept 30 days). It covers the selected workspace and
          refreshes every minute.
        </P>
        <Table
          head={["Part", "What it shows"]}
          rows={[
            [
              "Tiles",
              "Online now (paused ones aren't counted), availability, average response time, queries per second, total size and how many need a look.",
            ],
            [
              "Availability",
              "One strip per database: green = every check reached it, orange = some didn't, red = none did, grey = no checks (paused, or Morche wasn't running).",
            ],
            [
              "Response time",
              "How long the monitor took to connect and read, for all databases or the one you pick.",
            ],
            [
              "Load",
              "Queries (or commands) per second, or the most connections open at once, compared with the connection limit.",
            ],
            [
              "Size",
              "Data on disk for each database and how much it grew in the range.",
            ],
            [
              "Busiest databases",
              "The highest average queries per second, with the peak, connections and how much was read from memory.",
            ],
            [
              "Problems",
              "Each time a check started failing or recovered, with what it found.",
            ],
          ]}
        />
        <Tip>
          A database added today has short charts: history starts with its first
          check.
        </Tip>
      </>
    ),
  },
  {
    id: "server-tab",
    title: "On a server's page",
    body: (
      <P>
        A server's <UI>Databases</UI> tab (in the Monitoring group) lists only
        the databases Morche reaches through that server, and{" "}
        <UI>Add database</UI> there picks that server for you.
      </P>
    ),
  },
  {
    id: "access",
    title: "Who can do what",
    body: (
      <>
        <Table
          head={["Level", "Can"]}
          rows={[
            ["Viewer", "See the list and dashboards, without query text"],
            ["Operator", "Also check now and mark favorites"],
            [
              "Engineer",
              "Also see query text, Kill, Explain, pause, mute and change limits",
            ],
            [
              "Owner",
              "Also edit, remove, see the credentials, manage backup plans and restore backups",
            ],
          ]}
        />
        <P>
          Levels come from the workspace or a direct grant, see{" "}
          <See guide="access" />.
        </P>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          <UI>Unreachable</UI>: nothing answered. Check the address and port,
          that the database listens on that interface (<C>listen_addresses</C>,{" "}
          <C>bind-address</C>, <C>bind</C>), and the firewall. Through a server,
          the address is as the server sees it.
        </li>
        <li>
          <UI>Sign-in refused</UI>: wrong username or password, or the login
          isn't allowed from Morche's address (PostgreSQL <C>pg_hba.conf</C>,
          MySQL <C>'user'@'host'</C>).
        </li>
        <li>
          <UI>TLS error</UI>: the server doesn't offer TLS, or the certificate
          doesn't match. Paste the provider's <UI>CA certificate</UI>, or pick{" "}
          <UI>Encrypted</UI> instead of <UI>Verified</UI>.
        </li>
        <li>
          <UI>Blocked</UI>: a direct address in a private range. Ask a system
          admin to tick <UI>Allow a private address</UI>, or connect{" "}
          <UI>Through a server</UI>.
        </li>
        <li>
          A tab is empty or shows a note: the login lacks a grant (
          <C>pg_monitor</C>, <C>PROCESS</C>, <C>VIEW SERVER STATE</C>,{" "}
          <C>clusterMonitor</C>…). See{" "}
          <See guide="databases" section="login">
            A login for Morche
          </See>
          .
        </li>
        <li>
          <UI>Queries</UI> is empty on PostgreSQL: <C>pg_stat_statements</C>{" "}
          isn't loaded. Add it to <C>shared_preload_libraries</C>, restart, then{" "}
          <C>CREATE EXTENSION pg_stat_statements</C>.
        </li>
      </List>
    ),
  },
]
