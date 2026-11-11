import {
  C,
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

export const processes: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          A server's <UI>Processes</UI> tab is a live view of every program
          running on it, like <C>top</C> or <C>htop</C> but in the browser: what
          uses the CPU and memory right now, who started it, which service or
          container it belongs to and how long it has been running. From the
          same page you can end, pause or resume a process, send it any signal,
          change its priority and look inside it (open files, network
          connections, environment).
        </P>
        <P>
          The list refreshes itself every 5 seconds. Above it, a quiet line sums
          up the server: how many processes, the total CPU, the load and the
          memory in use.
        </P>
        <Table
          head={["Who", "Can"]}
          rows={[
            ["Viewer", "See the list (without command lines)"],
            ["Operator", "Open a process's details"],
            [
              "Engineer",
              "Send signals, change priority, see a process's environment",
            ],
          ]}
        />
        <P>
          With a plain login (no root, no <C>sudo</C> without a password) you
          can only act on that login's own processes, and some details of other
          users' processes (open files, connections) stay hidden. The page says
          so at the top.
        </P>
      </>
    ),
  },
  {
    id: "views",
    title: "List, tree and by program",
    body: (
      <>
        <P>
          The switch at the start of the toolbar picks how the list is laid out:
        </P>
        <Table
          head={["View", "Shows"]}
          rows={[
            [
              <UI key="l">List</UI>,
              "One row per process, sorted by the column you pick. Best for finding what is busy.",
            ],
            [
              <UI key="t">Tree</UI>,
              "Each process under the one that started it. Fold a branch with its arrow; a folded one shows +N for what it hides. When a search or filter is on, the parents of each match stay in grey so you still see where it hangs.",
            ],
            [
              <UI key="p">By program</UI>,
              "Processes of the same program in one row (e.g. 12 × php-fpm) with their CPU and memory added up. Open the row to see each one; its ⋯ menu acts on all of them.",
            ],
          ]}
        />
        <P>
          Click a column header to sort by it, click again to flip the order.
          Numbers start with the biggest, names from A to Z. On a phone, the{" "}
          <UI>Sort</UI> chip does the same.
        </P>
        <Tip>
          While the mouse is over the list, rows stay where they are even if the
          numbers change, so the row you're about to click never jumps away. New
          processes are added at the end; the order catches up as soon as the
          mouse leaves.
        </Tip>
      </>
    ),
  },
  {
    id: "filters",
    title: "Search and filters",
    body: (
      <>
        <P>
          The search matches a process's name, its full command line, its user,
          its service and its container. Type a number to find that PID and
          everything it started.
        </P>
        <Table
          head={["Show", "Includes"]}
          rows={[
            [
              <UI key="a">Programs</UI>,
              "Everything but the kernel's own threads (the default)",
            ],
            [
              <UI key="b">Busy</UI>,
              "Using at least 1% of a core or 1% of the memory right now",
            ],
            [
              <UI key="n">Need a look</UI>,
              "Zombies, paused processes and ones stuck waiting on a disk",
            ],
            [
              <UI key="e">Everything</UI>,
              "Kernel threads too, shown in [brackets]",
            ],
          ]}
        />
        <P>
          The <UI>User</UI> menu narrows the list to one user; the login Morcheh
          uses is marked. Search, view, filters and sort are kept in the
          address, so a link opens the same list.
        </P>
      </>
    ),
  },
  {
    id: "reading",
    title: "Reading the numbers",
    body: (
      <>
        <Table
          head={["Column", "Meaning"]}
          rows={[
            [
              "CPU",
              "Share of one core over the last few seconds. A program using two cores fully shows 200%; the bar fills at one core. Hover it for the share of the whole server.",
            ],
            [
              "Memory",
              "Resident memory (RSS): what it holds in RAM now. Shared libraries count in each process that uses them, so a program's processes added up can exceed what it really uses.",
            ],
            ["Running for", "Time since it started"],
            ["Threads", "Threads inside the process"],
            ["State", "Running, Sleeping, Paused, Zombie or Waiting on disk"],
          ]}
        />
        <P>
          Tags beside the name say where a process comes from: its systemd
          service, its container, <UI>Morcheh</UI> for the panel's own SSH
          connection and <UI>system</UI> for programs the server can't do
          without. A process that needs a look carries its state as an orange
          tag.
        </P>
        <P>
          The summary's load turns orange when the 5-minute load is above 1.5 ×
          the number of cores, i.e. more work is waiting than the CPU can take.
        </P>
      </>
    ),
  },
  {
    id: "live",
    title: "Live updates",
    body: (
      <>
        <P>
          The menu at the end of the toolbar sets how often the list is read: 2,
          5 (the default) or 10 seconds, or <UI>Paused</UI>. Pause it to study a
          moment without it changing; <UI>Refresh</UI> still reads it once. On a
          phone, the play/pause button next to the search does the same. Your
          choice is remembered in this browser.
        </P>
        <P>
          Reading the list costs the server a little CPU itself; on a small or
          overloaded server, 10 seconds or Paused is kinder. Reading stops while
          the tab is in the background.
        </P>
      </>
    ),
  },
  {
    id: "signals",
    title: "Ending a process and other signals",
    body: (
      <>
        <P>
          Every row's <UI>⋯</UI> menu (phone: open the process) has the common
          actions; <UI>Send a signal…</UI> lists all of them with what each
          does.
        </P>
        <Table
          head={["Action", "What happens"]}
          rows={[
            [
              <UI key="t">Terminate</UI>,
              "Asks it to end (TERM). Well-behaved programs save their work and exit. If it is still there after 2 seconds, the message offers Kill.",
            ],
            [
              <UI key="k">Kill</UI>,
              "Ends it at once (KILL). It can't clean up; use it only when Terminate didn't work.",
            ],
            [
              <UI key="p">Pause / Resume</UI>,
              "Freezes it where it is (STOP) and lets it carry on (CONT)",
            ],
            [
              <UI key="h">Hang up (HUP)</UI>,
              "Many daemons (nginx, sshd…) reload their settings on it",
            ],
            [
              <UI key="u">USR1 / USR2</UI>,
              "Mean whatever the program says: nginx reopens its logs on USR1",
            ],
          ]}
        />
        <Steps>
          {[
            <>
              Find the process: sort by <UI>CPU</UI> or <UI>Memory</UI>, or
              search for its name.
            </>,
            <>
              Open its <UI>⋯</UI> menu and pick <UI>Terminate</UI>.
            </>,
            <>Check the list in the dialog (name, PID, command) and confirm.</>,
            <>
              If it is still running after 2 seconds, press <UI>Kill</UI> in the
              message that appears.
            </>,
          ]}
        </Steps>
        <P>
          A process's <UI>⋯</UI> menu also has <UI>Show in the tree</UI>,{" "}
          <UI>Every …</UI> (lists the same program), <UI>Restart …</UI> for a
          process that belongs to a service, and <UI>Copy PID</UI> /{" "}
          <UI>Copy command</UI>.
        </P>
        <Recommended
          rows={[
            {
              setting: "A process run by a service",
              value: "Restart the service",
              why: "Its service manager would start it again anyway; Restart <service> in the menu does it cleanly.",
            },
            {
              setting: "A stuck process",
              value: "Terminate, then Kill",
              why: "Give it the chance to clean up first.",
            },
            {
              setting: "A daemon after a config change",
              value: "Hang up (HUP)",
              why: "Most reload without dropping connections.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "many",
    title: "Acting on several at once",
    body: (
      <>
        <P>
          Tick the boxes on the left (the header's box ticks every row shown); a
          bar appears at the bottom with <UI>Terminate</UI>, <UI>Kill</UI> and,
          in its <UI>⋯</UI>, Pause / Resume, any signal and priority. In{" "}
          <UI>By program</UI>, a program's box ticks all its processes.
        </P>
        <P>
          On a phone, tap <UI>Select</UI> in the chip row, tap the rows, then{" "}
          <UI>Done</UI> when finished.
        </P>
        <Example title="Clear out leftover workers">
          <P>
            Search <C>php-fpm</C>, switch to <UI>By program</UI>, open the
            program's <UI>⋯</UI> and choose <UI>Terminate all</UI>. One dialog
            confirms every process at once.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "protected",
    title: "Protected processes",
    body: (
      <>
        <P>
          Some processes keep the server alive or reachable: <C>init</C> /{" "}
          <C>systemd</C>, <C>sshd</C>, the journal, <C>dbus</C> and the like.
          They carry a <UI>system</UI> tag, and ending, pausing or slowing one
          down asks you to tick <UI>I understand, do it anyway</UI> first.
        </P>
        <P>
          Two kinds are never offered: kernel threads (they can't be signalled)
          and Morcheh's own SSH connection, since ending it would cut the panel
          off this very page.
        </P>
        <Warn>
          Killing <C>sshd</C> or <C>systemd</C> can leave the server unreachable
          until someone restarts it at the console. Restart a service from its
          own page instead.
        </Warn>
      </>
    ),
  },
  {
    id: "priority",
    title: "Priority (nice)",
    body: (
      <>
        <P>
          <UI>Change priority…</UI> sets how much CPU time a process gets when
          the CPU is busy. It changes nothing while the CPU is idle.
        </P>
        <Table
          head={["Choice", "Nice value"]}
          rows={[
            [<UI key="1">Lowest</UI>, "19: only spare CPU"],
            [<UI key="2">Low</UI>, "10: yields to normal work"],
            [<UI key="3">Normal</UI>, "0: where most programs start"],
            [<UI key="4">High</UI>, "−5: ahead of normal work"],
            [<UI key="5">Highest</UI>, "−20: ahead of everything"],
          ]}
        />
        <P>
          Lowering a priority works with any login on its own processes. Raising
          one (a value below the current one) needs root or <C>sudo</C> without
          a password. The change lasts until the process ends; to keep it, set{" "}
          <C>Nice=</C> in the service's settings.
        </P>
        <Tip>
          A backup or compression hogging the server? Set it to <UI>Low</UI>: it
          still finishes, just behind your users' requests.
        </Tip>
      </>
    ),
  },
  {
    id: "details",
    title: "A process's details",
    body: (
      <>
        <P>
          Click a process's name (phone: tap the row) to open its details. They
          stay live while open, with a CPU trend of the last minutes.
        </P>
        <List>
          <li>
            <UI>Overview</UI>: full command, program file, working folder (opens
            in Files), user, parent, start time, memory (peak, split, swap), CPU
            time, threads, priority, disk read/write, service, container, open
            files against its limit, out-of-memory score and the processes it
            started.
          </li>
          <li>
            <UI>Files</UI>: what it has open: files, sockets, pipes and devices,
            with a link to each file's folder.
          </li>
          <li>
            <UI>Network</UI>: its connections and the ports it listens on (see
            them all in <See guide="ports" />
            ).
          </li>
          <li>
            <UI>Environment</UI> (Engineer): the variables it was started with.
            Values are hidden until you press <UI>Show values</UI>; they often
            hold passwords.
          </li>
        </List>
        <P>
          If the process ends while its details are open, they say so and the
          actions are disabled; the last numbers stay readable.
        </P>
      </>
    ),
  },
  {
    id: "problems",
    title: "What the warnings mean",
    body: (
      <>
        <Table
          head={["You see", "What to do"]}
          rows={[
            [
              "Zombie",
              "It has ended but its parent hasn't collected it. It uses nothing; a few are harmless. Many mean the parent is buggy: restart the parent (Show in the tree finds it). Killing a zombie does nothing.",
            ],
            [
              "Waiting on disk",
              "Stuck in the kernel waiting for storage. It can't be killed until the disk or network share answers. Many of these = slow or hung storage; check the disks and mounts.",
            ],
            ["Paused", "Something sent it STOP (or Ctrl+Z). Resume it."],
            [
              "Program file deleted",
              "It is still running an old copy of its program, usually after an update. Restart it (or its service) to run the new one.",
            ],
            [
              "Deleted files still open",
              "Disk space isn't freed until the process closes them. Restart it to get the space back.",
            ],
          ]}
        />
        <P>
          Notices above the list point these out (many zombies, processes
          waiting on disk, memory almost full, load above the cores) with a
          button that shows the culprits.
        </P>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <Table
          head={["Problem", "Why / fix"]}
          rows={[
            [
              "Actions are greyed out",
              "You need Engineer on this server, and the login must be root, have sudo without a password, or own the process.",
            ],
            [
              "Commands show as hidden",
              "The server hides other users' command lines (hidepid on /proc). Use a root login to see them.",
            ],
            [
              "A process comes straight back after Kill",
              "Its service manager restarts it. Stop the service in Services instead.",
            ],
            [
              "“… had already ended”",
              "The process ended (or its PID was reused) between the list and your click. Nothing was sent.",
            ],
            [
              "The page says it can't read the processes",
              "The server is unreachable, or it isn't Linux (the list reads /proc).",
            ],
          ]}
        />
        <P>
          See also <See guide="services" />, <See guide="ports" /> and{" "}
          <See guide="terminal" />.
        </P>
      </>
    ),
  },
]
