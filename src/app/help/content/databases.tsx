import {
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
          head={["Engine", "What Morcheh reads"]}
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
          Morcheh only reads. It never browses or changes your data or schema.
          The only things it can do to a database are stop a session (
          <UI>Kill</UI>) and ask for a query plan without running the query (
          <UI>Explain</UI>).
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
            Choose <UI>How Morcheh reaches it</UI> (see below) and fill in the
            address and <UI>Port</UI>.
          </P>
          <P>
            Enter the <UI>Username</UI> and <UI>Password</UI> of a monitoring
            login (see{" "}
            <See guide="databases" section="login">
              A login for Morcheh
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
            <UI>Through a server</UI>: Morcheh opens an SSH tunnel to one of
            your servers and connects from there, so the database port never has
            to be open to the internet. Leave the address empty for a database
            on the server itself (<C>127.0.0.1</C>), or enter another host the
            server can reach. This is the safest choice.
          </li>
          <li>
            <UI>Docker container</UI>: when the database runs in a container on
            that server, enter its name or ID. Morcheh finds the container's
            address; the port doesn't need to be published.
          </li>
          <li>
            <UI>Direct address</UI>: for a managed database (RDS, Cloud SQL,
            Azure…) or anything on a public IP or domain. Morcheh connects from
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
    title: "A login for Morcheh",
    body: (
      <>
        <P>
          Give Morcheh its own login with only the rights it needs to read
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
          <C>CONFIG GET</C> on managed Redis). Morcheh still works; it just
          shows less, and says what it couldn't read.
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
          On every look Morcheh runs a set of checks and gives each one a level:{" "}
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
          (an unused index, a table full of dead rows); Morcheh never makes
          them, you decide.
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
          other side sees an error and usually reconnects. Morcheh's own session
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
    id: "server-tab",
    title: "On a server's page",
    body: (
      <P>
        A server's <UI>Databases</UI> tab (in the Monitoring group) lists only
        the databases Morcheh reaches through that server, and{" "}
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
            ["Owner", "Also edit, remove and see the credentials"],
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
          isn't allowed from Morcheh's address (PostgreSQL <C>pg_hba.conf</C>,
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
            A login for Morcheh
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
