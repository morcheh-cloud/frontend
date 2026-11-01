import {
  C,
  Code,
  Example,
  type GuideSection,
  List,
  P,
  See,
  Table,
  Tip,
  UI,
} from "../components/prose"

export const serverOverview: GuideSection[] = [
  {
    id: "layout",
    title: "A server's page",
    body: (
      <>
        <P>
          Opening a server shows its <UI>Overview</UI>; its other tools are tabs
          next to it. On a desktop the header keeps the server's name and status
          with <UI>Check</UI>, <UI>SSH</UI> (opens the terminal),{" "}
          <UI>SSH command</UI> (copies <C>ssh user@host -p port</C>),{" "}
          <UI>Edit</UI> and the <UI>⋯</UI> menu. Tabs that don't fit move into{" "}
          <UI>More</UI>.
        </P>
        <P>
          On a phone the overview lists every section as a row; the top bar has
          Back, the <UI>?</UI> guide button and the <UI>⋯</UI> menu.
        </P>
      </>
    ),
  },
  {
    id: "resources",
    title: "Live resources",
    body: (
      <>
        <P>
          While the server is online, <UI>Resources</UI> updates every second
          and the header says <UI>Live</UI> with the time of the last sample. If
          the stream drops it shows <UI>Reconnecting…</UI> and picks up again on
          its own. Updates pause while the browser tab is hidden.
        </P>
        <Table
          head={["Tile", "What it shows"]}
          rows={[
            [
              <UI key="u">Uptime</UI>,
              "How long since the last boot. A sudden small number means the server rebooted.",
            ],
            [
              <UI key="c">CPU</UI>,
              "Use across all cores, with the last few minutes as a line. Short spikes are normal; a line stuck high is not.",
            ],
            [
              <UI key="m">Memory</UI>,
              "Memory in use by programs. Linux's file cache is not counted, so this is what really matters.",
            ],
            [
              <UI key="d">Disk</UI>,
              "The root filesystem. Other mounts appear in a Disks card below.",
            ],
            [
              <UI key="n">Network</UI>,
              "Received and sent per second, across all interfaces.",
            ],
          ]}
        />
        <P>
          Meters turn orange at 80% (<UI>High</UI>, <UI>Almost full</UI>) and
          red at 90% (<UI>Very high</UI>), always with the word next to the
          colour.
        </P>
        <Tip>
          Live resources need a Linux server. On other systems the overview
          still shows the facts below, just without live numbers.
        </Tip>
      </>
    ),
  },
  {
    id: "facts",
    title: "System, connection and health",
    body: (
      <List>
        <li>
          <UI>System</UI>: hostname, OS, kernel and architecture, detected on
          the first check.
        </li>
        <li>
          <UI>Connection</UI>: host, port, user, authentication and the trusted
          host key fingerprint.
        </li>
        <li>
          <UI>Health</UI>: status, latency, and when it was last checked and
          last reached. <UI>Check now</UI> re-checks it.
        </li>
        <li>
          <UI>Organization</UI> and <UI>Notes</UI>: folder, tags, favorite and
          your notes, editable in place.
        </li>
      </List>
    ),
  },
  {
    id: "example",
    title: "Reading the numbers",
    body: (
      <>
        <Example title="The disk is almost full">
          <P>
            <UI>Disk</UI> shows <UI>Almost full</UI> at 93%. Open the{" "}
            <UI>Files</UI> tab at <C>/var/log</C> (folder sizes are worked out
            for you) or run this in the terminal to find what grew:
          </P>
          <Code>{`
sudo du -xh / --max-depth=2 2>/dev/null | sort -h | tail -15
sudo journalctl --vacuum-size=200M
`}</Code>
          <P>
            The second line trims the systemd journal, a common culprit, to 200
            MB.
          </P>
        </Example>
        <Example title="Memory high, CPU calm">
          <P>
            Usually one process holding memory, often a database cache or a
            leak. Find the largest ones:
          </P>
          <Code>ps aux --sort=-rss | head -10</Code>
        </Example>
      </>
    ),
  },
  {
    id: "banner",
    title: "When the server isn't reachable",
    body: (
      <P>
        Every tab shows a banner when the last check failed, with the action
        that fixes it. What each status means, and how to fix it, is in{" "}
        <See guide="servers" section="status">
          server statuses
        </See>
        .
      </P>
    ),
  },
]
