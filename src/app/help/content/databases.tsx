import {
  A,
  C,
  Code,
  Example,
  type GuideSection,
  Keys,
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
            [
              "ClickHouse",
              "system tables: running queries, query_log, parts and table sizes, merges, mutations, replicas, disks",
            ],
            [
              "Elasticsearch / OpenSearch",
              "Cluster health, shards, node stats (heap, disk, watermarks), running tasks, index sizes, users",
            ],
            [
              "Meilisearch",
              "Health, stats, the task queue (waiting, running, failed), index sizes, API keys",
            ],
          ]}
        />
        <P>
          Monitoring only reads. Engineers can also{" "}
          <A href="#data">browse the data</A> and{" "}
          <A href="#query">run their own queries</A>, read only. Changing data
          is an Owner's, and only on purpose: a query run with{" "}
          <A href="#query-changes">Allow changes</A>, or{" "}
          <A href="#restore">restoring a backup</A>. Besides that Morche can
          stop a session (<UI>Kill</UI>) and ask for a query plan without
          running the query (<UI>Explain</UI>).
        </P>
      </>
    ),
  },
  {
    id: "add",
    title: "Adding a database",
    body: (
      <>
        <P>
          <UI>Add database</UI> opens its own page. Under <UI>Start from</UI>{" "}
          pick <UI>Connect to one that runs</UI> for a database you already have
          (the steps below), or{" "}
          <A href="#deploy-container">Start a new one in a container</A> to have
          Morche set one up on a server for you.
        </P>
        <Steps>
          <P>
            Open <UI>Databases</UI> (under Infrastructure), press{" "}
            <UI>Add database</UI> and keep <UI>Connect to one that runs</UI>.
          </P>
          <P>
            Pick the <UI>Engine</UI>, then <UI>By address</UI> or{" "}
            <UI>Through a server</UI> (see below).
          </P>
          <P>
            Fill in <UI>Host</UI> and <UI>Port</UI> (empty = the engine's usual
            port), then <UI>Username</UI> and <UI>Password</UI> (see{" "}
            <See guide="databases" section="login">
              A login for Morche
            </See>
            ). Have a URL such as <C>postgres://user:pass@host:5432/shop</C>?
            Paste it into <UI>Host</UI> and every field fills in.
          </P>
          <P>
            Press <UI>Test connection</UI> to see every step work, then{" "}
            <UI>Add database</UI> (or <Keys>Ctrl+S</Keys>). The first check runs
            straight away.
          </P>
        </Steps>
        <P>
          Everything else sits folded under <UI>More options</UI> with defaults
          that fit most databases: the <UI>Name</UI> (empty = the database,
          container or host name), <UI>Docker container</UI>,{" "}
          <UI>Encryption (TLS)</UI>, <UI>Check every</UI> and notes. When a test
          fails on encryption or a private address, it offers a one-click fix (
          <UI>Try without encryption</UI>, <UI>Allow a private address</UI>).
        </P>
        <P>
          To change a database later, open its menu and choose <UI>Edit</UI>:
          the same page, with the saved values. A blank password keeps the saved
          one.
        </P>
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
            that server, tap it under{" "}
            <UI>Database containers on this server</UI> (or enter its name or ID
            under <UI>More options</UI>). Morche finds the container's address;
            the port doesn't need to be published.
          </li>
          <li>
            <UI>By address</UI>: for a managed database (RDS, Cloud SQL, Azure…)
            or anything on a public IP or domain. Morche connects from the panel
            itself.
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
    id: "deploy-container",
    title: "Starting a new database in a container",
    body: (
      <>
        <P>
          When you need a fresh database, Morche can start one on any of your
          servers that runs Docker or Podman and add it to this list in one go.
          It becomes an ordinary compose project you also see under{" "}
          <See guide="containers" section="projects">
            Containers › Projects
          </See>
          .
        </P>
        <Steps>
          <P>
            Press <UI>Add database</UI> and pick{" "}
            <UI>Start a new one in a container</UI>.
          </P>
          <P>
            Pick the <UI>Engine</UI> and its <UI>Version</UI> (SQL Server also
            asks for the <UI>Edition</UI>).
          </P>
          <P>
            Under <UI>Where it runs</UI>, pick the server. With many servers,
            type into the search box (name, address, OS or Docker/Podman) and
            press <Keys>Enter</Keys> to take the first match. Each row shows how
            much memory is free; servers that can't take it (engine not
            reachable, or you lack Engineer access) are listed apart with the
            reason. Once picked, the list folds into a summary; <UI>Change</UI>{" "}
            opens it again.
          </P>
          <P>
            Give it a <UI>Name in Morche</UI>; the project and container name
            follow it. Set the first database and the admin user where the
            engine allows it.
          </P>
          <P>
            Keep the generated <UI>Password</UI> or type your own (at least 12
            characters, no spaces, quotes, <C>$</C> or <C>#</C>).
          </P>
          <P>
            Pick who can reach it, a memory limit and how often Morche checks
            it, then press <UI>Start</UI>.
          </P>
        </Steps>
        <P>
          Morche first checks the compose file and the port on the server, then
          writes <C>docker-compose.yml</C> and <C>.env</C>, pulls the image,
          starts the container and adds the database here, watched through SSH
          inside the container. The page shows each step; if one fails it says
          where it stopped and you can try again.
        </P>
        <Table
          head={["Port on the server", "Who can reach it"]}
          rows={[
            [
              "Not published",
              "Only containers on its networks. Morche goes in through SSH. The safest choice.",
            ],
            [
              "This server only",
              "Programs on the server at 127.0.0.1, nothing from outside.",
            ],
            [
              "Every address",
              "Anyone who can reach the server. Close it with the firewall.",
            ],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "Port on the server",
              value: "Not published",
              why: "Morche and your apps don't need it published",
            },
            {
              setting: "Also join a network",
              value: "Your app's network",
              why: "The app reaches the database by its container name",
            },
            {
              setting: "Memory limit",
              value: "Set one on shared servers (SQL Server: 2 GB or more)",
              why: "A busy database can't starve the other containers",
            },
          ]}
        />
        <Tip>
          The password lives only in the project's <C>.env</C> on the server and
          in Morche's encrypted copy for monitoring. Change it in the project's
          Environment tab and then in the database's <UI>Edit</UI> page.
        </Tip>
        <Warn>
          The data sits in a named Docker volume, kept when the container is
          recreated or updated. Removing the project's volumes deletes it: set
          up <A href="#backups">backups</A> before you rely on it.
        </Warn>
      </>
    ),
  },
  {
    id: "list",
    title: "The list of databases",
    body: (
      <>
        <P>
          Each database is a card, the ones needing attention first. A red or
          orange border means it's down or unhealthy; the line at the bottom
          says why.
        </P>
        <List>
          <li>
            <UI>Size</UI> with how much it grew today, <UI>Connections</UI>{" "}
            against its limit, and <UI>Response</UI> time (with the slow end,
            p95).
          </li>
          <li>
            <UI>Last 24 hours</UI>: the share of checks that worked, a response
            time line, and a strip where each slot is green, orange or red.
            Hover a slot to see that hour.
          </li>
          <li>
            Where it runs: the server (and container), or the direct address.
          </li>
        </List>
        <P>
          The star keeps a favorite at the top; <UI>⋯</UI> has check, pause,
          edit, credentials and remove. On a phone each row shows the same
          numbers and a small strip; tap it to open, <UI>⋯</UI> for actions.
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
          <Code>{`CREATE ROLE morche LOGIN PASSWORD 'change-me';
GRANT pg_monitor TO morche;
-- to stop other sessions with Kill:
GRANT pg_signal_backend TO morche;
-- for the Queries tab (needs shared_preload_libraries = 'pg_stat_statements'):
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`}</Code>
        </Example>
        <Example title="MySQL / MariaDB">
          <Code>{`CREATE USER 'morche'@'%' IDENTIFIED BY 'change-me';
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'morche'@'%';
GRANT SELECT ON performance_schema.* TO 'morche'@'%';
-- to stop other sessions with Kill (MySQL 8):
GRANT CONNECTION_ADMIN ON *.* TO 'morche'@'%';`}</Code>
        </Example>
        <Example title="SQL Server">
          <Code>{`CREATE LOGIN morche WITH PASSWORD = 'Change-me-2026!';
GRANT VIEW SERVER STATE TO morche;  -- 2022: VIEW SERVER PERFORMANCE STATE
GRANT VIEW ANY DEFINITION TO morche;
-- to stop other sessions with Kill:
GRANT ALTER ANY CONNECTION TO morche;`}</Code>
        </Example>
        <Example title="MongoDB">
          <Code>{`use admin
db.createUser({
  user: "morche",
  pwd: "change-me",
  roles: ["clusterMonitor"]  // add "hostManager" to stop operations
})`}</Code>
        </Example>
        <Example title="Redis (6 and later)">
          <Code>
            {
              "ACL SETUSER morche on >change-me -@all +ping +info +client|list +client|kill +slowlog|get +config|get +acl|list +scan +type +memory|usage +dbsize"
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
    id: "data",
    title: "Browse the data",
    body: (
      <>
        <P>
          The <UI>Data</UI> tab shows what the database holds and lets you read
          any table without writing a query. Everything on it only reads: rows
          are fetched inside a read-only transaction, so nothing you do there
          can change the data. It needs <UI>Engineer</UI> access, since it shows
          the data itself.
        </P>
        <Steps>
          <li>
            Pick the database inside the connection at the top of the list
            (PostgreSQL, MySQL and SQL Server can hold several).
          </li>
          <li>
            Find the table (MongoDB: the collection) and click it. Its rows open
            100 at a time, with how many match in all.
          </li>
          <li>
            Type in <UI>Search every column</UI> to find a value anywhere in the
            row, or press <UI>Filter</UI> to narrow by column: is, contains,
            starts with, greater than, is one of, is empty… Combine them with
            all or any.
          </li>
          <li>
            Click a column's name to sort by it (again for descending, a third
            time to stop). Hold <Keys>Shift</Keys> to sort by several columns.
          </li>
          <li>
            Click a row to see every value in full, copy one, or step through
            the rows with <Keys>↑</Keys> <Keys>↓</Keys>. MongoDB shows the whole
            document too.
          </li>
        </Steps>
        <P>
          <UI>Structure</UI> lists the columns with their types, defaults and
          the primary key, the indexes, foreign keys and checks, and a view's
          definition. For MongoDB it lists the fields found in a sample of 100
          documents. <UI>Query it</UI> opens a ready <C>SELECT</C> in the{" "}
          <UI>Query</UI> tab. <UI>Export</UI> copies the page as a table (paste
          it into a spreadsheet) or JSON, or downloads it as CSV or JSON.
        </P>
        <Example title="Orders over 100 from this week">
          <P>
            Filter <C>total</C> › <C>&gt;</C> › <C>100</C>, then{" "}
            <UI>Write a condition</UI>:{" "}
            <C>{"created_at > now() - interval '7 days'"}</C>. A condition is
            plain SQL after <C>WHERE</C> (MongoDB: a filter as JSON, e.g.{" "}
            <C>{'{ "total": { "$gt": 100 } }'}</C>) and still runs read only.
          </P>
        </Example>
        <P>
          Redis: the tab lists keys by pattern (<C>user:*</C>), with their type,
          size and expiry, and shows a key's value: a string in full (JSON
          formatted), a hash's fields, a list, a set or a sorted set with
          scores, a stream's newest entries. Keys are read with <C>SCAN</C>, so
          even a big database stays responsive; <UI>Look further</UI> reads the
          next batch.
        </P>
      </>
    ),
  },
  {
    id: "saved-filters",
    title: "Saved filters",
    body: (
      <>
        <P>
          Filters you use often can be kept per table: set the search, filters,
          condition and sort, then <UI>Saved filters</UI> ›{" "}
          <UI>Save these filters…</UI> and give them a name. Tick{" "}
          <UI>Share with the team</UI> so everyone who can browse this database
          sees them on this table. Next time pick it from the same menu and the
          rows open filtered and sorted. <UI>All rows, no filters</UI> clears
          everything.
        </P>
        <P>
          Change a saved filter's settings and a dot appears beside its name;{" "}
          <UI>Update “…”</UI> keeps the change, <UI>Save as new…</UI> keeps
          both. Only whoever saved it (or an Owner, for a shared one) can
          update, rename or delete it.
        </P>
      </>
    ),
  },
  {
    id: "edit-rows",
    title: "Add, edit and delete rows",
    body: (
      <>
        <P>
          An <UI>Owner</UI> of the database can change rows right in the{" "}
          <UI>Data</UI> tab, without writing SQL. Before anything runs you see
          the exact statements, and they run together: if one fails, nothing is
          saved.
        </P>
        <Steps>
          <li>
            <UI>Add row</UI>: fill in the fields you want. A field left on{" "}
            <UI>Default</UI> gets the table's default (an id counter, now()…);{" "}
            <UI>NULL</UI> leaves it empty.
          </li>
          <li>
            Edit: click a row, then <UI>Edit</UI>. Only the fields you change
            are written; changed ones are tinted.
          </li>
          <li>
            Delete: click a row, then the bin. Only a backup brings it back.
          </li>
          <li>
            Press <UI>Review and save</UI>, check the statements, then{" "}
            <UI>Save</UI>.
          </li>
        </Steps>
        <List>
          <li>
            A row is found by its primary key. A table without one can only get
            new rows here; change it with a query. Views can't be changed.
          </li>
          <li>
            If someone changed or removed the row since you read it, nothing is
            saved and you're told to read the rows again.
          </li>
          <li>
            MongoDB: edit the whole document as JSON; it replaces the stored
            one. A new document gets an <C>_id</C> when it has none.
          </li>
          <li>
            Every save lands in the query <UI>History</UI> with its statements,
            so it's clear who changed what.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "query",
    title: "Run queries",
    body: (
      <>
        <P>
          The <UI>Query</UI> tab (Redis: <UI>Console</UI>) is an editor for your
          own queries, with the results below it and your saved queries and
          history beside it. Table names complete as you type.
        </P>
        <Table
          head={["Engine", "What to type"]}
          rows={[
            [
              "PostgreSQL, MySQL, SQL Server",
              "SQL. Several statements separated by ; (SQL Server: also GO) each get their own result.",
            ],
            [
              "MongoDB",
              'db.orders.find({ status: "open" }).sort({ _id: -1 }).limit(20), also aggregate, countDocuments, distinct. Or the JSON form: { "collection": "orders", "find": { … } }',
            ],
            [
              "Redis",
              "One command per line, e.g. HGETALL user:42 or SCAN 0 MATCH session:* COUNT 100",
            ],
          ]}
        />
        <List>
          <li>
            <UI>New</UI> (at the start of the toolbar) clears the editor for a
            fresh query; it asks first when the text isn't saved.
          </li>
          <li>
            <Keys>Ctrl+Enter</Keys> (<Keys>⌘+Enter</Keys> on a Mac) runs it.
            Select part of the text to run only that.
          </li>
          <li>
            <UI>Stop</UI> cancels a query that runs too long; the database stops
            it too. A query also stops by itself after 30 seconds.
          </li>
          <li>
            Each result keeps up to 500 rows (change it beside the database
            picker, up to 10,000). Click a row to see it in full;{" "}
            <UI>Export</UI> copies or downloads the result.
          </li>
          <li>
            Drag the line between the editor and the results to give either more
            room.
          </li>
        </List>
        <P>
          <span className="font-medium">Read only by default.</span> Every
          statement is checked and run inside a read-only transaction (SQL
          Server: one that is rolled back), so <C>INSERT</C>, <C>UPDATE</C>,{" "}
          <C>DELETE</C>, <C>CREATE</C>, <C>DROP</C> and the like are refused
          with a short explanation. MongoDB only finds, aggregates (without{" "}
          <C>$out</C>/<C>$merge</C>) and counts; Redis only reads.
        </P>
      </>
    ),
  },
  {
    id: "query-changes",
    title: "Change data with a query",
    body: (
      <>
        <P>
          An <UI>Owner</UI> of the database can turn on <UI>Allow changes</UI>{" "}
          beside the Run button. The button turns red and reads{" "}
          <UI>Run with changes</UI>; it turns itself off again when you leave
          the page.
        </P>
        <List>
          <li>
            PostgreSQL and SQL Server run the whole script in one transaction:
            if a statement fails, nothing of it is kept. MySQL runs statement by
            statement (its schema changes can't be undone).
          </li>
          <li>
            A script that drops or empties data (<C>DROP</C>, <C>TRUNCATE</C>,{" "}
            <C>DELETE</C> or <C>UPDATE</C> without <C>WHERE</C>, a MongoDB
            delete with an empty filter, <C>FLUSHDB</C>…) or changes who may do
            what (<C>GRANT</C>) asks you to type the database's name first.
          </li>
          <li>The result says how many rows each statement changed.</li>
        </List>
        <Warn>
          Allow changes runs with the database login saved in Morche. Take a
          backup first when the change is big (
          <See guide="databases" section="backups" />
          ).
        </Warn>
        <Recommended
          rows={[
            {
              setting: "Morche's database login",
              value: "Read only",
              why: (
                <>
                  e.g. PostgreSQL's <C>pg_read_all_data</C> role. Unless you
                  really want to change data from here, then even an Owner can't
                  write by mistake.
                </>
              ),
            },
            {
              setting: "Allow changes",
              value: "Off",
              why: "Turn it on only for the change you mean to run; it turns itself off when you leave.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "saved-queries",
    title: "Saved queries and history",
    body: (
      <>
        <P>
          Press <UI>Save…</UI> (<Keys>Ctrl+S</Keys>) to keep a query with a name
          and notes. It stays yours, or tick <UI>Share with the team</UI> so
          everyone who can query this database sees it and can run it. Pin the
          ones you use most to the top. Opening a saved query, changing it and
          pressing <Keys>Ctrl+S</Keys> saves the change straight away;{" "}
          <UI>Save as new</UI> keeps the original.
        </P>
        <P>
          <UI>History</UI> lists every query you ran here (kept 90 days), with
          whether it worked, the rows and the time it took; click one to open it
          again. Owners can switch to <UI>Everyone's</UI>: the history is also
          the record of who looked at or changed what.
        </P>
        <Table
          head={["Who", "Can"]}
          rows={[
            [
              "Engineer",
              "Browse the data, run read-only queries, save their own and see shared ones",
            ],
            [
              "Owner",
              "Also run changes, add, edit and delete rows in the Data tab, see everyone's history, edit or delete shared queries and filters",
            ],
          ]}
        />
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
            [
              "PostgreSQL",
              "pg_dump custom format (.dump), one per database; with parallel jobs, its directory format in a .tar",
            ],
            [
              "MySQL / MariaDB",
              "mysqldump of each database, compressed (.sql.zst or .sql.gz); incrementals = binary log",
            ],
            ["MongoDB", "mongodump archive of each database, compressed"],
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
    id: "size-speed",
    title: "Compression and parallel jobs",
    body: (
      <>
        <P>
          A plan's <UI>Size and speed</UI> section says how its files are
          compressed and, for PostgreSQL and MongoDB, how many parts of a
          database are dumped at once. Both only change new backups; older ones
          restore as they always did.
        </P>
        <Table
          head={["Choice", "What it does"]}
          rows={[
            [
              "zstd",
              "Faster and smaller than gzip, and spread over every core. The default for new plans. Files end in .zst",
            ],
            [
              "gzip",
              "Opens anywhere with tools every system has. Plans from before this choice keep it",
            ],
            ["Fast", "Least CPU, slightly bigger files"],
            ["Balanced", "A good size and still quick"],
            ["Smallest", "The smallest file, and the slowest to make"],
            [
              "Parallel jobs",
              "How many tables (PostgreSQL) or collections (MongoDB) are read at once",
            ],
          ]}
        />
        <P>
          PostgreSQL compresses its own archive, so zstd needs <C>pg_dump</C> 16
          or newer built with it where the backup runs. An older one uses gzip
          instead, the run's log says so, and the backup's details show what was
          used. MySQL, Redis and SQL Server files are compressed by Morche while
          they're uploaded; MongoDB's gzip is mongodump's own and has no levels.
        </P>
        <P>
          With more than one job, PostgreSQL uses <C>pg_dump</C>'s directory
          format: the dump is written to a temporary folder where it runs first
          (Morche's machine, the server, or the database's container), then sent
          as one <C>.tar</C>. That folder needs room for the compressed dump,
          and each job holds a connection of its own, so the database needs jobs
          + 1 free connections. A restore of such a backup can use parallel jobs
          too: pick them under <UI>Parallel jobs</UI> in the restore window.
        </P>
        <P>
          The folder is the system's temporary one (<C>/tmp</C>) unless the plan
          names another under <UI>Temporary folder</UI>. On a big database pick
          a folder on a disk with room for the whole dump, since <C>/tmp</C> is
          often small or kept in memory; <UI>Browse</UI> lists the folders when
          a server runs the dump. The login Morche uses there must be able to
          write to it. A restore unpacks the file the same way: its window has
          the same field, and left empty it uses the plan's folder when it runs
          where the plan does. The run's log says how much room the folder had.
          For a database in a container, the path is one inside the container:
          pick a folder it has mounted from the server, since its own files sit
          on Docker's disk.
        </P>
        <Recommended
          rows={[
            {
              setting: "Compression",
              value: "zstd, Balanced",
              why: "Usually a third of gzip's size, made faster",
            },
            {
              setting: "Parallel jobs",
              value: "1 below a few GB, then 4",
              why: "Jobs help with many big tables; small databases gain nothing",
            },
            {
              setting: "Jobs on a busy server",
              value: "No more than half its cores",
              why: "Each job is a full backend process on the database",
            },
            {
              setting: "Temporary folder",
              value: "A big disk, e.g. /var/backups/tmp",
              why: "Needs room for the whole compressed dump; /tmp often doesn't have it",
            },
          ]}
        />
        <Warn>
          A restore with more than one job isn't a single transaction: if it
          fails half way, the database is left half loaded. Keep{" "}
          <UI>Back it up first</UI> on when replacing a database, or restore
          with one job.
        </Warn>
        <P>To restore such a file by hand:</P>
        <Code>{`mkdir dump && tar -xf shop_2026-11-22.tar -C dump
pg_restore -j 4 --no-owner -d shop dump`}</Code>
        <Tip>
          If a parallel backup fails with a full temporary folder, pick a
          <UI>Temporary folder</UI> on a bigger disk in the plan, free some
          space, or go back to one job: that one streams straight to the
          storages and needs no room.
        </Tip>
      </>
    ),
  },
  {
    id: "pitr",
    title: "Point-in-time recovery (PostgreSQL)",
    body: (
      <>
        <P>
          A plan's backups are dumps: a snapshot of a moment, taken on a
          schedule. For a big or busy PostgreSQL that's slow to restore and
          loses everything since the last dump. <UI>Point in time</UI> (in the{" "}
          <UI>Backups</UI> tab) keeps a copy of every change instead, with{" "}
          <A href="https://pgbackrest.org">pgBackRest</A>: a full backup now and
          then, smaller ones in between, and every WAL file (PostgreSQL's log of
          changes) sent to a storage within a minute. You can then go back to
          any second.
        </P>
        <Table
          head={["Question", "Answer"]}
          rows={[
            [
              "What can it restore",
              "Any second since the oldest full backup kept",
            ],
            [
              "How much can be lost",
              "Up to the archive interval (1 minute by default)",
            ],
            [
              "How fast a restore is",
              "File copy + replay of the WAL since the backup: minutes to an hour for 150 GB, instead of hours of pg_restore",
            ],
            [
              "What it covers",
              "The whole PostgreSQL (every database on it), not one database",
            ],
            [
              "Where it works",
              "PostgreSQL 12+ installed on a server Morche reaches over SSH (not in a container, not by address only)",
            ],
            [
              "Where it stores",
              "An S3 storage over HTTPS, or an SFTP storage that signs in with a key",
            ],
          ]}
        />
        <P>
          Dumps still have their place: one database on its own, a file to take
          elsewhere, another PostgreSQL version. Keep a weekly plan beside Point
          in time if you need those.
        </P>
        <P>To set it up (Owner of the database, Engineer on its server):</P>
        <Steps>
          <P>
            Open the database, <UI>Backups</UI> › <UI>Point in time</UI> and
            press <UI>Set it up</UI>.
          </P>
          <P>
            Read <UI>What changes on the server</UI>: Morche installs pgBackRest
            if it's missing, writes its own config to{" "}
            <C>/etc/pgbackrest/morche.conf</C> and sets <C>archive_command</C>,{" "}
            <C>archive_mode</C> and <C>archive_timeout</C>. Another tool's{" "}
            <C>archive_command</C> is only replaced if you tick{" "}
            <UI>Replace it</UI>.
          </P>
          <P>
            Pick the storage and a folder of its own. For S3 without a fixed
            bucket the folder starts with the bucket, which must exist.
          </P>
          <P>
            Pick the schedule, how many full backups to keep, encryption and
            speed, then <UI>Set up</UI>.
          </P>
          <P>
            If <C>archive_mode</C> was off, PostgreSQL needs one restart: press{" "}
            <UI>Restart PostgreSQL…</UI> and choose <UI>Now</UI> or{" "}
            <UI>At a quiet time</UI>. The first full backup follows by itself.
          </P>
        </Steps>
        <Recommended
          rows={[
            {
              setting: "Full backups",
              value: "Weekly, at night",
              why: "The starting points; a full one reads the whole database",
            },
            {
              setting: "Differential",
              value: "The other nights",
              why: "Small; a restore needs at most one full + one differential",
            },
            {
              setting: "Incremental",
              value: "Every 6 hours on a busy database",
              why: "Less WAL to replay in a restore",
            },
            {
              setting: "Full backups kept",
              value: "2 (about two weeks back)",
              why: "Each one more is one more stretch you can reach",
            },
            {
              setting: "Archive at least every",
              value: "1 minute",
              why: "The most a quiet database can lose",
            },
            {
              setting: "Encryption",
              value: "On",
              why: "The storage only ever sees encrypted files",
            },
          ]}
        />
        <Warn>
          The storage's keys live on the database's server (PostgreSQL sends
          each WAL file itself), readable by the postgres user only. Give Point
          in time a bucket and a key of its own, allowed only there.
        </Warn>
        <Tip>
          With encryption on, open the tab's <UI>⋯</UI> ›{" "}
          <UI>Encryption passphrase</UI> and keep a copy away from Morche.
          Without it the backups can't be read if Morche's own server is lost.
        </Tip>
      </>
    ),
  },
  {
    id: "pitr-restore",
    title: "Restore to a point in time",
    body: (
      <>
        <P>
          Press <UI>Restore to a point in time</UI>, a backup's{" "}
          <UI>Restore to here</UI>, or click the timeline. Pick{" "}
          <UI>The newest point</UI> or <UI>A moment in time</UI> (your own time
          zone; everything committed up to that second comes back), then where
          it goes:
        </P>
        <Table
          head={["Where", "What happens"]}
          rows={[
            [
              "A copy beside it (recommended)",
              "A second PostgreSQL starts on the same server, on its own port (from 15432), reachable from localhost only. It shows up in Morche as a database, so you can browse it in Data, copy rows back with a sync or a query, then press Take down. The live one isn't touched",
            ],
            [
              "Over the server's own PostgreSQL",
              "Every database on it stops, goes back to that moment and starts again. Type the name to confirm. The current point is archived first, so you could come back to it",
            ],
          ]}
        />
        <Example title="A DELETE without a WHERE">
          Someone ran <C>DELETE FROM orders</C> without a <C>WHERE</C> at 14:32.
          Restore a copy to 14:31:59, open it in Data, check the rows, then copy
          them back into the live database with a sync from the copy. Nothing
          else in the live database is lost.
        </Example>
        <P>
          A copy needs room for the whole database beside the data folder;
          Morche checks before it starts. If nothing changed between the moment
          you picked and the newest WAL, PostgreSQL can't tell where to stop, so
          the copy is restored to the newest point instead: it's the same data,
          and the run's log says so.
        </P>
      </>
    ),
  },
  {
    id: "pitr-troubleshoot",
    title: "Point in time: when something's wrong",
    body: (
      <>
        <Table
          head={["It says", "What to do"]}
          rows={[
            [
              "WAL can't reach the storage",
              "Check the storage from the server (address, keys, free space). Until it works PostgreSQL keeps the WAL on its own disk, which can fill it",
            ],
            [
              "The last check failed",
              "Press Set up again: it rewrites pgBackRest's config and archive_command on the server (someone may have changed them)",
            ],
            [
              "pgBackRest talks to S3 only over HTTPS",
              "Give the storage an https:// address. A self-signed certificate works with Skip TLS check on",
            ],
            [
              "pgBackRest signs in with a key only",
              "SFTP storages need a private key, and Morche must have checked the storage once to trust its host key",
            ],
            [
              "Waiting for a PostgreSQL restart",
              "archive_mode only changes with a restart: press Restart PostgreSQL…, now or at a set time",
            ],
            [
              "There isn't room for the copy",
              "Free space next to the data folder, or restore over the server instead",
            ],
          ]}
        />
        <P>
          The server must reach the storage at the same address Morche uses.
          pgBackRest's own logs are in <C>/var/log/pgbackrest</C> on the server.
        </P>
        <P>
          To turn it off: <UI>⋯</UI> › <UI>Turn off</UI>. Archiving stops, the
          backups stay in the storage unless you tick{" "}
          <UI>Delete the backups too</UI>, and <C>archive_mode</C> goes back to
          off at PostgreSQL's next restart.
        </P>
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
    id: "restore-file",
    title: "Restoring from a file",
    body: (
      <>
        <P>
          A dump Morche didn't take (one made by hand, by another tool, or
          copied over from another machine) can be loaded too, straight from the
          server or storage it sits on. Only an Owner can start it, and it
          follows the same rules as restoring a backup.
        </P>
        <Steps>
          <P>
            On the database's <UI>Backups</UI> tab press{" "}
            <UI>Restore from a file</UI> (on a phone: under <UI>Restores</UI>).
          </P>
          <P>
            Choose where the file is: any storage, or any server, you can read
            files on. Browse to it; files that look like dumps (<C>.sql</C>,{" "}
            <C>.dump</C>, <C>.gz</C>, <C>.bak</C>, <C>.archive</C>…) are listed
            first. A path you know can be typed in the box under the list.
          </P>
          <P>
            Morche reads the file and says what it is, how big, and which
            databases it holds. A file that can't go into this database says
            why, and <UI>Continue</UI> stays off.
          </P>
          <P>
            For a MongoDB archive with several databases, pick{" "}
            <UI>Which database to take</UI>.
          </P>
          <P>
            Then fill the form as for a backup: <UI>Restore into</UI>,{" "}
            <UI>Replace it</UI> or <UI>As a new database</UI>,{" "}
            <UI>Back it up first</UI>, <UI>Run it from</UI>, login, and type the
            name to confirm.
          </P>
        </Steps>
        <Table
          head={["File", "Restored by Morche"]}
          rows={[
            [
              "PostgreSQL: pg_dump -Fc archive or plain SQL dump",
              "Yes, into any name",
            ],
            [
              "MySQL / MariaDB: mysqldump of one database",
              "Yes, into any name",
            ],
            [
              "mysqldump with --databases (says USE <name>)",
              "Only into the database it names",
            ],
            [
              "MongoDB: mongodump --archive (gzipped or not)",
              "Yes, one database at a time, into any name",
            ],
            ["SQL Server .bak", "Yes, on its own server only"],
            [
              "pg_dumpall, pg_dump --create, several MySQL databases, Redis RDB",
              "No: restore it by hand",
            ],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "A file from somewhere else",
              value: "As a new database first",
              why: "Shows what's in it before it replaces anything",
            },
            {
              setting: "Back it up first",
              value: "On, next to the file or on a storage",
              why: "The only way back from a replace",
            },
          ]}
        />
        <P>
          The backup before goes next to the file when the file is on a storage
          you can write to. When it's on a server, or a storage you only read,
          choose a storage under <UI>Keep it on</UI> (with a bucket, give the
          folder, starting with the bucket).
        </P>
        <Tip>
          A <C>.gz</C> file is unpacked on the fly; nothing is written next to
          it. The whole file is read and checked once before the database is
          touched, so a dump that was cut short stops the restore with the
          database as it was.
        </Tip>
        <P>If it fails:</P>
        <List>
          <li>
            <UI>This is a … backup, but the database is …</UI>: the file is for
            another engine. Pick the right database.
          </li>
          <li>
            <UI>The dump doesn't reach its last line</UI>: the copy is
            incomplete. Copy it again.
          </li>
          <li>
            <UI>creates and connects to its own database</UI>: dump it again
            without <C>--create</C>, or load it by hand.
          </li>
          <li>
            Access: Operator on the file's server or storage, Engineer on the
            storage the backup before goes to.
          </li>
        </List>
        <See guide="databases" section="restore">
          Restoring a backup
        </See>
      </>
    ),
  },
  {
    id: "sync",
    title: "Syncing into another database",
    body: (
      <>
        <P>
          A sync copies one database into another of the same engine, by hand,
          every few minutes or on a schedule. Find them on the database's{" "}
          <UI>Syncs</UI> tab. Press <UI>Compare</UI> first: it shows what a run
          would add, change and delete, table by table with sample rows, and
          writes nothing. <UI>Apply these changes</UI> then runs it for real.
        </P>
        <Table
          head={["Kind", "What it does"]}
          rows={[
            [
              "Chosen tables",
              "Compares the tables you pick row by row: add new rows, update ones that differ, optionally delete extras. You choose who wins a difference and what happens when the target refuses a row.",
            ],
            [
              "Mirror",
              "Makes every table on the target match the source, row by row, with no downtime. Rows the source doesn't have are deleted.",
            ],
            [
              "Only new rows",
              "Copies rows added since the last run, using a column that grows (an id or updated_at). Fast; a full check every few hours catches deletions.",
            ],
            [
              "Replace",
              "Drops the target and loads a fresh dump each run. The target is briefly empty. Works for MongoDB too.",
            ],
          ]}
        />
        <Steps>
          <li>
            On the source database open <UI>Syncs</UI> tab › <UI>New sync</UI>.
          </li>
          <li>Pick the kind, then the target database and its name.</li>
          <li>
            Pick the tables (and the column that grows, for only new rows).
          </li>
          <li>
            Pick when it runs and press <UI>Save and compare</UI>.
          </li>
        </Steps>
        <Recommended
          rows={[
            {
              setting: "Staging copy",
              value: "Replace, every night",
              why: "A clean, exact copy; a short gap is fine there.",
            },
            {
              setting: "Reporting copy",
              value: "Mirror, every 5–15 minutes",
              why: "Stays close to live with no downtime.",
            },
            {
              setting: "Big append-only tables",
              value: "Only new rows, every few minutes",
              why: "Reads only what was added since the last run.",
            },
          ]}
        />
        <Warn>
          Mirror, Replace and Chosen tables with deleting on can remove data on
          the target: saving asks you to type the target's name. Row kinds work
          on PostgreSQL and MySQL/MariaDB; Replace also on MongoDB.
        </Warn>
        <Tip>
          Replace runs the dump and load tools on Morche's own machine or a
          server you pick (<UI>Where it runs</UI>); a database reached through a
          server always uses that server. A table without a primary or unique
          key can't be matched row by row: skip it or reload it whole.
        </Tip>
        <P>
          Access: Operator on the source, Owner on the target. A sync runs with
          the access of whoever saved it last.
        </P>
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
              "Also see query text, browse the data, run read-only queries, Kill, Explain, pause, mute and change limits",
            ],
            [
              "Owner",
              "Also edit, remove, see the credentials, run queries that change data, manage backup plans and restore backups",
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
    id: "search-engines",
    title: "Elasticsearch, OpenSearch and Meilisearch",
    body: (
      <>
        <P>
          Search engines are added like any other database and get the same
          pages: health checks, a <UI>Data</UI> tab, a <UI>Console</UI>,
          backups, restores, syncs and alerts. A few things work differently,
          because they speak HTTP and hold indexes of JSON documents instead of
          tables.
        </P>
        <Table
          head={["Here", "Is"]}
          rows={[
            ["Database", "Not used: one connection is the whole cluster"],
            [
              "Table",
              "An index (Elasticsearch also lists aliases and data streams)",
            ],
            ["Row", "A document, shown and edited as JSON"],
            [
              "Sessions",
              "Tasks: running searches and bulk loads, or Meilisearch's task queue",
            ],
            ["Query tab", "A console of HTTP requests"],
          ]}
        />
        <Steps>
          <li>
            Open <UI>Databases</UI>, press <UI>Add database</UI> and pick{" "}
            <UI>Elasticsearch</UI> or <UI>Meilisearch</UI>. OpenSearch is added
            as Elasticsearch; Morche tells them apart by itself.
          </li>
          <li>
            Enter the address and port (9200 and 7700 by default). Pasting an
            address like <C>https://elastic:secret@search.example.com:9200</C>{" "}
            fills the fields.
          </li>
          <li>
            Sign in. Elasticsearch takes a username and password, or leave the
            username empty and paste an <UI>API key</UI> (the base64 one
            Elasticsearch shows when the key is made). Meilisearch takes a{" "}
            <UI>Key</UI> only.
          </li>
          <li>
            Press <UI>Test connection</UI>, then <UI>Add</UI>.
          </li>
        </Steps>
        <Tip>
          For Meilisearch, use an API key with the actions{" "}
          <C>search, documents.get, indexes.get, stats.get, tasks.get</C> on all
          indexes for watching. Backups and restores also need{" "}
          <C>
            documents.add, documents.delete, indexes.create, indexes.delete,
            settings.get, settings.update
          </C>
          ; the master key has all of them. For Elasticsearch, a user with the{" "}
          <C>monitor</C> cluster privilege and <C>read, view_index_metadata</C>{" "}
          on the indices is enough to watch; backups and restores also need{" "}
          <C>create_index, write, delete_index</C>.
        </Tip>
        <P>
          <strong>Health checks.</strong> On top of the usual ones (reachable,
          response time, encryption, sign-in), Elasticsearch gets{" "}
          <UI>Cluster health</UI> (green, yellow, red),{" "}
          <UI>Unassigned shards</UI>, <UI>JVM heap</UI> and{" "}
          <UI>Disk watermarks</UI> (a node past the flood stage turns its
          indices read-only). Meilisearch gets <UI>Indexing queue</UI> (how long
          the oldest waiting task has waited) and <UI>Failed tasks</UI> in the
          last 24 hours. The overview shows a <UI>Cluster</UI> or{" "}
          <UI>Indexing</UI> card with the details.
        </P>
        <P>
          <strong>The console.</strong> Write one request per block: the method
          and path on the first line, a JSON body under it, like Kibana's Dev
          Tools. Several blocks run one after another. Read only, only reading
          requests go (searches, counts, GET); turn on{" "}
          <A href="#query-changes">Allow changes</A> to write.
        </P>
        <Example title="Elasticsearch">
          <Code>{`GET /_cat/indices?v

GET /orders/_search
{
  "query": { "match": { "status": "open" } },
  "size": 20
}`}</Code>
        </Example>
        <Example title="Meilisearch">
          <Code>{`POST /indexes/movies/search
{
  "q": "batman",
  "filter": "year > 2000",
  "limit": 20
}`}</Code>
        </Example>
        <P>
          In the <UI>Data</UI> tab, filters become a query: Elasticsearch writes
          Query DSL (<UI>Your own query</UI> takes Query DSL JSON or Lucene text
          like <C>status:open AND total:&gt;100</C>); Meilisearch writes a
          filter expression, which only works on attributes listed in the
          index's <C>filterableAttributes</C> (and sorting on{" "}
          <C>sortableAttributes</C>).
        </P>
        <P>
          <strong>Backups.</strong> There's no dump tool to run: Morche reads
          every document and the index's settings and mappings over the API
          itself (through the server's SSH connection when the database is
          reached through one) and stores one compressed NDJSON file per index.
          Nothing is installed or run on a server, so there's no{" "}
          <UI>Run it from</UI> choice. A restore creates the index again with
          its settings and loads the documents; it can go back over the same
          index or into a new one. Backups are always full.
        </P>
        <Tip>
          A big index takes a while: Morche reads 1,000 documents a page. For
          clusters of many gigabytes, Elasticsearch's own snapshots to a
          snapshot repository are faster; Morche's backups suit small and medium
          indexes and moving data between clusters.
        </Tip>
        <P>
          <strong>Syncs.</strong> Only <UI>Replace</UI>: the source index is
          copied over the target index (between two connections of the same
          engine, or into another index of the same one).
        </P>
        <P>
          <strong>Start one in a container.</strong> <UI>Add database</UI> ›{" "}
          <UI>Start in a container</UI> offers both. Elasticsearch runs as one
          node with security on (user <C>elastic</C>) and needs about 2 GB of
          memory; Meilisearch starts with a master key Morche makes for you.
        </P>
        <P>
          <strong>Common problems</strong>
        </P>
        <Table
          head={["What you see", "What to do"]}
          rows={[
            [
              "Cluster health is yellow on a single node",
              "Replicas can't be placed on the node that holds the primary. Set number_of_replicas to 0 on those indices, or add a node.",
            ],
            [
              "Indices turned read-only",
              "A node passed the flood stage. Free disk space; newer versions lift the block by themselves once below the high watermark.",
            ],
            [
              "Meilisearch: The key was refused",
              "The key is wrong or expired, or it's a search-only key. Use one with the actions listed above.",
            ],
            [
              "Meilisearch: AI search stopped working after a restore",
              "Meilisearch hides embedders' API keys in its settings, so the backup can't hold them. Enter the key again in the index's embedders settings.",
            ],
            [
              "A filter or sort on Meilisearch is refused",
              "Add the attribute to filterableAttributes or sortableAttributes in the index settings.",
            ],
          ]}
        />
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
