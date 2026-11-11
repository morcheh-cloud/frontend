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

export const uptime: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          <UI>Uptime</UI> keeps checking the things your users depend on and
          tells you the moment one stops answering: websites and APIs, open
          ports, certificates, DNS records, mail servers, databases, message
          queues, containers, systemd units and your own scripts. Each check is
          a <UI>monitor</UI>.
        </P>
        <P>
          A monitor is <UI>Up</UI>, <UI>Degraded</UI> (it answered, but too
          slowly or with a warning), <UI>Down</UI>, <UI>Paused</UI> or{" "}
          <UI>Pending</UI> (no result yet). Every change of state is kept, so
          each monitor has its own uptime report, response-time chart and list
          of incidents.
        </P>
        <List>
          <li>
            <UI>Uptime</UI> in the sidebar (phone: the <UI>Uptime</UI> tab) =
            every monitor in the workspace, worst first, and the{" "}
            <UI>Incidents</UI> tab.
          </li>
          <li>
            A server's <UI>Uptime</UI> tab = the monitors linked to that server.
          </li>
          <li>
            <UI>Home</UI> shows a tally of your monitors and lists the ones that
            are down or slow under <UI>Needs attention</UI>.
          </li>
          <li>
            Where the alerts go (Telegram, Slack, email…) is set up once, in{" "}
            <UI>Alerts</UI>. <See guide="alerts" />
          </li>
        </List>
      </>
    ),
  },
  {
    id: "add",
    title: "Adding a monitor",
    body: (
      <>
        <Steps>
          {[
            <>
              Open <UI>Uptime</UI> and press <UI>New monitor</UI> (phone: the{" "}
              <UI>+</UI> button).
            </>,
            <>
              Under <UI>What to watch</UI>, pick the kind: a website, a port, a
              database… The form below changes to fit it.
            </>,
            <>
              Fill in <UI>What to check</UI> (the address, host and port, or the
              server and unit). The name is suggested from it; change it if you
              like.
            </>,
            <>
              Press <UI>Try it</UI> to run the check once without saving. You
              see the result, the message and the response time.
            </>,
            <>
              Pick the <UI>Alerts</UI> channels and press <UI>Save</UI>. The
              first check runs straight away.
            </>,
          ]}
        </Steps>
        <Tip>
          From a server's <UI>Uptime</UI> tab, an empty list offers quick starts
          (ping the server, watch its SSH port, a systemd service, a container)
          with the server already filled in.
        </Tip>
        <P>
          <UI>Duplicate</UI> in a monitor's menu opens the form with a copy of
          it, handy for ten similar sites.
        </P>
      </>
    ),
  },
  {
    id: "kinds",
    title: "What it can watch",
    body: (
      <>
        <Table
          head={["Kind", "What counts as up"]}
          rows={[
            [
              "Website or API",
              "The status code you expect; optionally a word in the page, a JSON value, and a certificate that isn't about to expire.",
            ],
            [
              "WebSocket",
              "The connection upgrades (and a reply, if you set one).",
            ],
            ["Socket.IO", "The Socket.IO handshake completes."],
            [
              "Elasticsearch / OpenSearch",
              "Cluster health green (yellow = degraded).",
            ],
            ["TCP port", "The port accepts a connection."],
            [
              "UDP port",
              "An answer to the payload you send. From Morcheh only.",
            ],
            ["Ping", "The host answers ICMP echo."],
            [
              "DNS record",
              "The record resolves, optionally to the value you expect.",
            ],
            ["TLS certificate", "Valid, trusted and not close to expiry."],
            [
              "Mail server (SMTP)",
              "The server greets, optionally after STARTTLS.",
            ],
            [
              "Database",
              "PostgreSQL, MySQL/MariaDB, SQL Server, MongoDB or Redis accepts a login and answers a query.",
            ],
            [
              "RabbitMQ",
              "AMQP login works (and the queue exists, if you name one).",
            ],
            ["Kafka", "The brokers answer and the topic exists."],
            ["NATS", "The server accepts a connection."],
            ["MQTT broker", "The broker accepts a connection."],
            ["Memcached", "The server answers a stats request."],
            [
              "Docker container",
              "The container is running (and healthy, if it has a health check).",
            ],
            ["systemd unit", "The unit is active."],
            [
              "Command",
              "Your command on a server exits 0. Exit 1 = degraded, anything else = down.",
            ],
            ["Push (heartbeat)", "Your job calls Morcheh's address in time."],
          ]}
        />
        <P>
          <UI>What counts as up</UI> holds each kind's own rules (expected
          status codes, keyword, JSON path, expected DNS value…).{" "}
          <UI>Sign-in and headers</UI> is where logins, tokens and request
          headers go; saved passwords never come back to the page (blank =
          keep).
        </P>
      </>
    ),
  },
  {
    id: "check-from",
    title: "Where the check runs",
    body: (
      <>
        <P>
          <UI>Locations</UI> under <UI>Check from</UI> decide who knocks on the
          door. Tick one or several:
        </P>
        <List>
          <li>
            <UI>Morcheh</UI>: the check runs on Morcheh's own machine. Use it
            for anything public, like your website.
          </li>
          <li>
            <UI>A server</UI>: the check runs on one of your servers over SSH.
            Use it for things only reachable inside a network (a database on
            127.0.0.1, a private API).
          </li>
        </List>
        <P>
          Containers, systemd units and commands always run on one server, so
          they take exactly one location: the server they run on. With more than
          one location, see{" "}
          <See guide="uptime" section="locations">
            Checking from several locations
          </See>
          .
        </P>
        <P>
          By default Morcheh won't check private addresses (10.x, 192.168.x,
          localhost) from its own machine. A system admin can tick{" "}
          <UI>Allow a private address</UI> on a monitor that really needs it.
        </P>
        <P>
          <UI>Related server</UI> only links the monitor to a server: it then
          shows on that server's <UI>Uptime</UI> tab. It doesn't change where
          the check runs.
        </P>
        <Tip>Checking from a server needs Engineer access on that server.</Tip>
      </>
    ),
  },
  {
    id: "locations",
    title: "Checking from several locations",
    body: (
      <>
        <P>
          One place can be wrong on its own: its network hiccups, its DNS
          differs, a firewall in between drops it. Tick several locations and
          every round checks from all of them at the same moment; a rule then
          turns their answers into one status. Alerts, incidents and the report
          follow that one status.
        </P>
        <Steps>
          {[
            <>
              Open the monitor's <UI>Edit</UI> page and, in <UI>Check from</UI>,
              tick two or more locations (Morcheh and any servers you have
              Engineer access on).
            </>,
            <>
              Under <UI>When the locations disagree</UI>, pick when it counts as{" "}
              <UI>Down</UI>: <UI>Any</UI> (one failing is enough), <UI>Most</UI>{" "}
              (more than half), <UI>All</UI>, or <UI>At least…</UI> a number.
            </>,
            <>
              Pick when fewer failures make it <UI>Degraded</UI> instead of up:{" "}
              <UI>Any</UI>, <UI>Most</UI>, <UI>At least…</UI> or <UI>Never</UI>.
              A location that's slow (over the slow limit) counts as trouble
              here too.
            </>,
            <>
              Read the sentence under the rule: it says in plain words what will
              happen. Press <UI>Try it now</UI> to see every location's answer
              before saving.
            </>,
          ]}
        </Steps>
        <Example title="Your website, from three places">
          <P>
            Morcheh plus two servers in different data centers, <UI>Down</UI> ={" "}
            <UI>Most</UI>, <UI>Degraded</UI> = <UI>Any</UI>. One location
            failing makes it degraded (you see it, no outage alert); two of
            three failing make it down and send the alert.
          </P>
        </Example>
        <Example title="Strict: any failure is an outage">
          <P>
            A payment API checked from two servers with <UI>Down</UI> ={" "}
            <UI>Any</UI>: if either can't reach it, it's down.
          </P>
        </Example>
        <Recommended
          rows={[
            {
              setting: "Locations",
              value: "3",
              why: "An odd number gives a clear majority; one bad network can't decide alone.",
            },
            {
              setting: "Down",
              value: "Most",
              why: "Two of three must fail. With two locations, Most means both.",
            },
            {
              setting: "Degraded",
              value: "Any",
              why: "One location's trouble still shows, without an outage alert.",
            },
          ]}
        />
        <P>
          On the monitor's page, the <UI>Locations</UI> card shows each
          location's own state, response time and uptime in the range, with a
          strip of how it went over time (24h and 7d ranges). In{" "}
          <UI>Recent checks</UI>, press <UI>N locations</UI> under a check to
          see what each one answered. The list shows a dot per location.
        </P>
        <List>
          <li>
            A location whose server can't be reached over SSH{" "}
            <UI>couldn't check</UI>: it doesn't vote, and the others decide.
            When none can check, the monitor is down.
          </li>
          <li>
            The response time shown is the average of the locations that
            answered; the certificate date is the one that ends first.
          </li>
          <li>
            A DNS monitor checked from a server needs a <UI>Resolver</UI>{" "}
            address, since the server asks it with its own tools.
          </li>
          <li>
            Removing a server from the panel removes it as a location too.
            Someone without access to a location's server can still edit the
            monitor; they can't add new servers they can't reach.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "timing",
    title: "How often and how strict",
    body: (
      <>
        <List>
          <li>
            <UI>Check every</UI>: the time between checks.
          </li>
          <li>
            <UI>Failures before down</UI>: how many failed checks in a row turn
            the monitor down. Raise it to ignore a single blip.
          </li>
          <li>
            <UI>Retry after (s)</UI>: after a failure, the next check comes
            sooner, so a real outage is confirmed quickly.
          </li>
          <li>
            <UI>Time limit (s)</UI>: a check that takes longer fails.
          </li>
          <li>
            <UI>Slow when over (ms)</UI>: an answer slower than this turns the
            monitor degraded instead of up.
          </li>
          <li>
            <UI>Warn before expiry (days)</UI>: for certificates and https
            sites, degraded this many days before the certificate expires.
          </li>
        </List>
        <Recommended
          rows={[
            {
              setting: "Check every",
              value: "60 s",
              why: "Fast enough to notice an outage in about a minute.",
            },
            {
              setting: "Failures before down",
              value: "2–3",
              why: "One lost packet won't wake anyone up.",
            },
            {
              setting: "Retry after",
              value: "20 s",
              why: "Confirms a real outage before the next normal check.",
            },
            {
              setting: "Warn before expiry",
              value: "14 days",
              why: "Enough time to renew by hand if automatic renewal broke.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "alerts",
    title: "Getting alerted",
    body: (
      <>
        <P>
          Under <UI>Alerts</UI> in the monitor form, tick the channels that
          should hear about it. A new monitor starts with the channels marked{" "}
          <UI>Default for new monitors</UI>.
        </P>
        <List>
          <li>
            A message goes out when the monitor goes down and when it comes
            back.
          </li>
          <li>
            <UI>Also when it turns degraded</UI> adds slow answers and
            certificate warnings.
          </li>
          <li>
            <UI>Remind while down, every … checks</UI> repeats the alert while
            the outage lasts, so it isn't forgotten.
          </li>
          <li>A paused monitor sends nothing.</li>
        </List>
        <See guide="alerts" section="add" />
      </>
    ),
  },
  {
    id: "push",
    title: "Push monitors (heartbeats)",
    body: (
      <>
        <P>
          Some things can't be checked from outside: a nightly backup, a cron
          job, a worker behind a firewall. Turn it around: the job calls Morcheh
          when it's done, and the monitor goes down when the call doesn't come
          in time.
        </P>
        <Steps>
          {[
            <>
              Pick <UI>Push (heartbeat)</UI> and set <UI>Expect a ping</UI>{" "}
              every … (a bit longer than the job's real interval).
            </>,
            <>
              Save, then copy the address from <UI>Heartbeat address</UI> (or{" "}
              <UI>Copy push address</UI> in the monitor's menu).
            </>,
            <>Call it at the end of the job.</>,
          ]}
        </Steps>
        <Example title="At the end of a backup script">
          <Code>
            {'curl -fsS -m 10 "<heartbeat address>?msg=backup+ok&ping=5300"'}
          </Code>
        </Example>
        <P>The address takes these optional parameters (GET or POST):</P>
        <Table
          head={["Parameter", "Meaning"]}
          rows={[
            [
              <C key="s">status</C>,
              "up (default), degraded or down: report a failure yourself.",
            ],
            [<C key="m">msg</C>, "A short message shown with the result."],
            [
              <C key="p">ping</C>,
              "A duration in milliseconds, drawn on the response-time chart.",
            ],
          ]}
        />
        <Warn>
          The token in the address is the only key: anyone who has it can report
          for this monitor. If it leaks, edit the monitor and tick{" "}
          <UI>Make a new address when saving</UI>.
        </Warn>
      </>
    ),
  },
  {
    id: "report",
    title: "A monitor's report",
    body: (
      <>
        <P>
          Open a monitor to see how it has been doing. Pick a range (24h, 7d,
          30d, 90d, 365d) and the tiles and charts follow:
        </P>
        <List>
          <li>
            <UI>Uptime</UI>: the share of time it was up (degraded counts as
            up).
          </li>
          <li>
            <UI>Response time</UI>: average, with the chart below it.
          </li>
          <li>
            <UI>Downtime</UI>: the total time it was down.
          </li>
          <li>
            <UI>Incidents</UI>: how many outages started in the range.
          </li>
        </List>
        <P>
          <UI>Check now</UI> runs a check at once; <UI>Pause</UI> stops checks
          (and alerts) until you press <UI>Resume</UI>, for planned work.
        </P>
      </>
    ),
  },
  {
    id: "incidents",
    title: "Incidents",
    body: (
      <>
        <P>
          An incident starts when a monitor goes down and ends when it comes
          back. The <UI>Incidents</UI> tab on <UI>Uptime</UI> lists what is{" "}
          <UI>Going on</UI> and the <UI>History</UI>; each monitor's page has
          its own.
        </P>
        <P>
          Press <UI>I'm on it</UI> on an open incident so the team knows someone
          is handling it: it then shows who took it. It needs Operator access.
        </P>
      </>
    ),
  },
  {
    id: "access",
    title: "Who can do what",
    body: (
      <Table
        head={["Workspace access", "Can"]}
        rows={[
          ["Viewer", "See monitors, reports and incidents."],
          ["Operator", "Check now, pause and resume, take an incident."],
          ["Engineer", "Add, edit and duplicate monitors."],
          ["Owner", "Delete monitors; manage alert channels."],
        ]}
      />
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <List>
          <li>
            <UI>Down</UI> but the site works in your browser: the check runs
            from Morcheh's machine (or the server you picked), not from yours. A
            firewall, DNS that differs inside your network, or a site that
            blocks unknown clients can explain it. Try it from a server.
          </li>
          <li>
            Degraded although the site works: one location has trouble. Open the
            monitor and look at the <UI>Locations</UI> card to see which one, or
            set <UI>Degraded</UI> to <UI>Never</UI> if a single location's
            trouble shouldn't show.
          </li>
          <li>
            A location says <UI>Couldn't check</UI>: Morcheh can't reach that
            server over SSH; fix the server (its page shows why), or untick it.
          </li>
          <li>
            A private address is refused: tick <UI>Allow a private address</UI>{" "}
            (system admin) or check from a server inside that network.
          </li>
          <li>
            Up and down every few minutes: raise <UI>Failures before down</UI>{" "}
            and the <UI>Time limit</UI>.
          </li>
          <li>
            A push monitor goes down although the job ran: check the job can
            reach Morcheh's address (try the <C>curl</C> line by hand) and that{" "}
            <UI>Expect a ping</UI> is longer than the job's interval.
          </li>
          <li>
            No alert came: open <UI>Alerts</UI>, press <UI>Send a test</UI> on
            the channel and look at <UI>Messages sent</UI>.{" "}
            <See guide="alerts" section="troubleshooting" />
          </li>
        </List>
      </>
    ),
  },
]
