import {
  C,
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

export const serverMetrics: GuideSection[] = [
  {
    id: "what",
    title: "What it shows",
    body: (
      <>
        <P>
          A server's <UI>Metrics</UI> tab (Monitoring group) draws how busy it
          was over time: CPU, memory, load, network and each disk. Morcheh reads
          these over SSH on its own, every minute by default, and keeps them 30
          days, so the charts are there even if nobody had the page open.
        </P>
        <P>
          Below the charts are the alert rules that watch this server and the
          alerts they sent. For what is happening this second, use the live
          tiles on the server's overview. <See guide="server-overview" />
        </P>
      </>
    ),
  },
  {
    id: "reading",
    title: "Reading the charts",
    body: (
      <>
        <P>
          Pick the span at the top: 1 hour, 6 hours, 24 hours, 7 days or 30
          days. Each point is an average over a short slice of that span:
        </P>
        <Table
          head={["Span", "Each point covers"]}
          rows={[
            ["1 hour", "1 minute"],
            ["6 hours", "5 minutes"],
            ["24 hours", "15 minutes"],
            ["7 days", "1 hour"],
            ["30 days", "6 hours"],
          ]}
        />
        <List>
          <li>
            <UI>CPU</UI>: the average use of every core. The faint line is the
            busiest moment in each slice, the grey one is I/O wait (time spent
            waiting for the disks).
          </li>
          <li>
            <UI>Memory</UI>: used memory without the caches the system can give
            back; grey = swap, when the server has any.
          </li>
          <li>
            <UI>Load per core</UI>: the 1-minute load divided by the cores. Up
            to 1 every core has work; above it, work is waiting.
          </li>
          <li>
            <UI>Network</UI>: traffic in (download) and out (upload) over every
            interface, in Mbit/s.
          </li>
          <li>
            <UI>Disks</UI>: how full each filesystem is, the root one first.
          </li>
        </List>
        <P>
          Hover a chart (phone: tap it) for the exact values; with the chart
          focused, the arrow keys move along it. A gap means no sample was taken
          then, usually because the server was unreachable.
        </P>
        <Tip>
          A dashed line across a chart is an alert rule's limit, orange for a
          warning and red for critical. It shows how close the server came.
        </Tip>
      </>
    ),
  },
  {
    id: "alerts",
    title: "Alerts from a chart",
    body: (
      <>
        <Steps>
          {[
            <>
              Press the bell on a chart (or <UI>Alert</UI> beside a disk) to
              start a rule for that metric on this server;{" "}
              <UI>New alert rule</UI> at the top starts an empty one.
            </>,
            <>
              Set the limit and how long it must last, pick the channels to
              tell, and <UI>Save</UI>.
            </>,
          ]}
        </Steps>
        <P>
          The rule then shows under <UI>Alert rules</UI> with what it reads now
          (<UI>Normal</UI>, <UI>Waiting</UI> or <UI>Firing</UI>), and on the
          charts as a dashed line. Rules for every server, or servers with a
          tag, also show here when they cover this one.{" "}
          <See guide="alerts" section="rules" />
        </P>
        <Recommended
          rows={[
            {
              setting: <C>Server unreachable</C>,
              value: "2 min, critical",
              why: "Someone hears about an outage before the users do.",
            },
            {
              setting: <C>Disk almost full</C>,
              value: "Above 85%, at once",
              why: "A full disk stops databases and logs; there is time to clean up.",
            },
            {
              setting: <C>Memory running out</C>,
              value: "Above 90% for 10 min",
              why: "Long enough to skip short peaks, early enough to act before the OOM killer.",
            },
          ]}
        />
        <P>When the tab has no rules yet, these are one press away.</P>
      </>
    ),
  },
  {
    id: "sampling",
    title: "How often it samples",
    body: (
      <>
        <P>
          The caption beside the span says how often the server is read and when
          the last sample came in. Whoever runs Morcheh sets it with{" "}
          <C>SERVER_SAMPLE_INTERVAL</C> (default <C>1m</C>; <C>0</C> turns
          sampling off) and how long samples are kept with <C>SERVER_HISTORY</C>{" "}
          (default 31 days).
        </P>
        <P>
          Only online Linux servers are sampled. Each sample is one short SSH
          command reading <C>/proc</C> and <C>df</C>; nothing is installed on
          the server.
        </P>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <List>
          <li>
            <UI>Sampling is off</UI>: <C>SERVER_SAMPLE_INTERVAL</C> is <C>0</C>{" "}
            on Morcheh's backend. Set it (for example <C>1m</C>) and restart it.
          </li>
          <li>
            <UI>No samples yet</UI>: the first one comes within one interval of
            the server being reachable. Servers that aren't Linux are never
            sampled.
          </li>
          <li>
            <UI>No new sample since …</UI>: the server stopped answering. Check
            its status on the overview.
          </li>
          <li>
            A disk is missing: pseudo filesystems (tmpfs, overlay below <C>/</C>
            ) and bind mounts of the same disk are left out.
          </li>
        </List>
        <Warn>
          Short spikes can hide in long spans: on 30 days each point is a 6-hour
          average. Look at the faint <UI>busiest</UI> line, or pick a shorter
          span.
        </Warn>
      </>
    ),
  },
]
