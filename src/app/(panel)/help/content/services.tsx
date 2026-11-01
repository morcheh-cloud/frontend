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

export const services: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          A server's <UI>Services</UI> tab lists the programs its service
          manager (systemd, or OpenRC on Alpine and Gentoo) keeps running: web
          servers, databases, agents, your own apps. For each one you see its
          state, whether it starts at boot, how long it has been up and how much
          memory it uses. You can start, stop and restart it, read its logs as
          they're written, change its settings with an override and add new
          services, all without opening a terminal.
        </P>
        <P>
          Open a service by its name (phone: tap the row) to see its details in
          a side panel with three tabs: <UI>Overview</UI>, <UI>Logs</UI> and{" "}
          <UI>Unit files</UI>. Actions are in the panel's footer and in each
          row's <UI>⋯</UI> menu.
        </P>
        <P>
          Looking is enough with any login. Changing anything needs root or{" "}
          <C>sudo</C> without a password; otherwise the page says so and the
          actions are greyed out.
        </P>
      </>
    ),
  },
  {
    id: "states",
    title: "Reading the list",
    body: (
      <>
        <P>
          The tabs at the top filter by state, with a count in each:{" "}
          <UI>Running</UI> (the default), <UI>Failed</UI>, <UI>Stopped</UI> and{" "}
          <UI>All</UI>. The search matches the name and the description. Next to
          them, the caption shows the service manager and how the system is
          doing (for example <C>systemd 255 · a unit failed</C>).
        </P>
        <Table
          head={["State", "Meaning"]}
          rows={[
            [<UI key="r">Running</UI>, "Its process is up."],
            [
              <UI key="d">Done</UI>,
              "A one-shot job that ran, finished fine and stays active (common for setup units).",
            ],
            [
              <UI key="f">Failed</UI>,
              "Its last run ended badly: it crashed, exited with an error or timed out. Read its logs.",
            ],
            [
              <UI key="rs">Restarting</UI>,
              "It stopped and systemd is about to start it again (Restart= is set).",
            ],
            [
              <UI key="c">Changing</UI>,
              "Starting, stopping or reloading right now.",
            ],
            [<UI key="s">Stopped</UI>, "Not running."],
          ]}
        />
        <P>
          Tags next to a name: <UI>custom</UI> means its unit file lives in{" "}
          <C>/etc/systemd/system</C> (made by hand or here, so it can be edited
          and removed); <UI>changed on disk</UI> means its file was edited but
          systemd hasn't reloaded it yet. A banner above the list offers{" "}
          <UI>Reload systemd</UI> for that.
        </P>
        <Tip>
          The wider the window, the more columns show (At boot, Up for, Memory,
          PID). On a phone the same facts sit under each name.
        </Tip>
      </>
    ),
  },
  {
    id: "actions",
    title: "Start, stop and restart",
    body: (
      <>
        <Table
          head={["Action", "What happens"]}
          rows={[
            [<UI key="s">Start</UI>, "Starts it now. Doesn't change boot."],
            [
              <UI key="st">Stop</UI>,
              "Stops it now. It comes back at the next boot if it starts at boot.",
            ],
            [
              <UI key="r">Restart</UI>,
              "Stops and starts it: the way to pick up a new config for most programs.",
            ],
            [
              <UI key="rl">Reload configuration</UI>,
              "Asks the running program to re-read its config without stopping (only when the service supports it, e.g. nginx).",
            ],
            [
              <UI key="c">Clear failed state</UI>,
              "Forgets an old failure so the service shows Stopped and its restart counter resets.",
            ],
            [
              <UI key="k">Send signal…</UI>,
              "Sends a signal (SIGTERM, SIGHUP, SIGKILL…) to its processes. SIGKILL is the last resort for a hung program.",
            ],
          ]}
        />
        <P>
          A toast follows each action. When a service fails straight after a
          start or restart, the toast says so and its <UI>Logs</UI> button opens
          the reason.
        </P>
        <Example title="nginx after a config change">
          <Steps>
            <div>
              Edit the config in <See guide="files">Files</See>.
            </div>
            <div>
              Open <UI>nginx</UI> here and press <UI>Reload configuration</UI>{" "}
              (no dropped connections). If it fails, check the config in a
              terminal with <C>nginx -t</C>.
            </div>
          </Steps>
        </Example>
      </>
    ),
  },
  {
    id: "protected",
    title: "Protected services",
    body: (
      <>
        <P>
          Some services keep the server reachable or alive: <C>sshd</C> (how
          Morcheh logs in), <C>dbus</C>, <C>systemd-journald</C>,{" "}
          <C>systemd-logind</C>, <C>udev</C> and the network services. They show
          a shield on phones, and stopping, disabling, masking or sending them a
          signal asks you to confirm first.
        </P>
        <Warn>
          Stopping <C>sshd</C> (or the network) cuts Morcheh off from the
          server. The terminal, files and this page stop working until someone
          starts it again from the provider's console. Restart is safe: running
          sessions survive it.
        </Warn>
      </>
    ),
  },
  {
    id: "boot",
    title: "Starting at boot",
    body: (
      <>
        <P>
          <UI>Start at boot</UI> enables a service (<C>systemctl enable</C>);{" "}
          <UI>Don't start at boot</UI> disables it. Neither starts or stops it
          now. The <UI>At boot</UI> column shows:
        </P>
        <Table
          head={["Label", "Meaning"]}
          rows={[
            [<UI key="a">At boot</UI>, "Enabled: starts at every boot."],
            [<UI key="m">Manual</UI>, "Disabled: starts only when asked."],
            [
              <UI key="s">Static</UI>,
              "Can't be enabled on its own: another unit (a socket, timer or target) starts it.",
            ],
            [
              <UI key="i">Indirect</UI>,
              "Enabled through another unit (often a socket or a template).",
            ],
            [
              <UI key="ms">Masked</UI>,
              "Blocked: nothing can start it, not even by hand, until it's unmasked.",
            ],
          ]}
        />
        <P>
          <UI>Mask…</UI> is stronger than disabling: use it for something that
          must never run (say a second database a package pulled in).{" "}
          <UI>Unmask</UI> undoes it.
        </P>
      </>
    ),
  },
  {
    id: "logs",
    title: "Logs",
    body: (
      <>
        <P>
          The <UI>Logs</UI> tab shows the service's journal (
          <C>journalctl -u</C>) right in the panel, newest at the bottom. Errors
          are red, warnings orange and debug lines grey.
        </P>
        <List>
          <li>
            <UI>All</UI> / <UI>Warnings</UI> / <UI>Errors</UI>: how serious a
            line must be to show.
          </li>
          <li>
            The time picker: <UI>Latest</UI>, <UI>15 min</UI>, <UI>1 hour</UI>,{" "}
            <UI>24 hours</UI> or <UI>This boot</UI>.
          </li>
          <li>
            <UI>Live</UI> streams new lines as they're written and keeps the
            view at the bottom (scroll up to stop following).
          </li>
          <li>
            The filter box searches the lines shown; <UI>Load older lines</UI>{" "}
            reads further back (up to 5,000 lines); <UI>Download</UI> saves
            what's shown as a <C>.log</C> file.
          </li>
        </List>
        <Tip>
          For a failed service, pick <UI>Errors</UI> and <UI>This boot</UI>{" "}
          first: the reason is usually in the last few lines before "Failed with
          result".
        </Tip>
        <P>
          On OpenRC servers there is no journal per service, so logs come from
          the service's own files (see its <UI>Unit files</UI> tab) or{" "}
          <C>/var/log/messages</C>.
        </P>
      </>
    ),
  },
  {
    id: "override",
    title: "Change a service's settings (override)",
    body: (
      <>
        <P>
          Packaged unit files (in <C>/usr/lib/systemd/system</C>) are replaced
          on every package update, so don't edit them. An override (
          <C>…service.d/override.conf</C>) holds only the settings you change,
          survives updates and wins over the packaged file.
        </P>
        <Steps>
          <div>
            Open the service and pick <UI>Override settings…</UI> (once one
            exists: <UI>Edit override</UI>).
          </div>
          <div>
            Write the sections and keys to change. A template with common
            examples is filled in; <UI>What it overrides</UI> shows the packaged
            file for reference.
          </div>
          <div>
            Keep <UI>Restart after saving</UI> on to apply it now, then{" "}
            <UI>Save</UI>.
          </div>
        </Steps>
        <P>
          Before keeping the file, Morcheh checks it with{" "}
          <C>systemd-analyze verify</C>. If systemd rejects it, the old file
          goes back and the error shows above the editor. To remove an override,
          empty the file and save.
        </P>
        <Example title="Restart a crashing app by itself, with more open files">
          <Code>{`[Service]
Restart=on-failure
RestartSec=5
LimitNOFILE=65536`}</Code>
        </Example>
        <Example title="Replace the start command">
          <P>
            A list setting like <C>ExecStart</C> must be cleared first with an
            empty line, or systemd adds a second command:
          </P>
          <Code>{`[Service]
ExecStart=
ExecStart=/usr/sbin/nginx -g 'daemon off; worker_processes 2;'`}</Code>
        </Example>
        <P>
          If someone else changed the file since you opened it, saving stops and
          offers <UI>Load theirs</UI> or <UI>Overwrite</UI>.
        </P>
      </>
    ),
  },
  {
    id: "new",
    title: "Run your own app as a service",
    body: (
      <>
        <P>
          <UI>New service</UI> (systemd only) turns any command into a service
          that starts at boot and comes back when it crashes: a Node or Python
          app, a binary, a script.
        </P>
        <Steps>
          <div>
            Press <UI>New service</UI> and give it a short name (letters,
            digits, <C>-</C>, <C>_</C>, <C>.</C>), e.g. <C>myapp</C>.
          </div>
          <div>
            Fill in the command with a full path (
            <C>/usr/bin/node /srv/myapp/server.js</C>), the user it runs as and
            its working folder. Add environment variables one per line (
            <C>PORT=3000</C>).
          </div>
          <div>
            Check the unit preview (or <UI>Edit by hand</UI> for anything the
            form doesn't cover), then <UI>Add service</UI>.
          </div>
        </Steps>
        <Recommended
          rows={[
            {
              setting: "Runs as",
              value: "a dedicated user",
              why: "Never root unless it must: a bug in the app then can't touch the whole server.",
            },
            {
              setting: "Restart",
              value: "When it fails",
              why: "Brings it back after a crash, but a clean stop stays stopped.",
            },
            {
              setting: "Start at boot",
              value: "on",
              why: "So it survives reboots.",
            },
            {
              setting: "Command",
              value: "runs in the foreground",
              why: "systemd tracks the process it started; a command that forks to the background looks like it exited.",
            },
          ]}
        />
        <P>
          The file goes to <C>/etc/systemd/system/&lt;name&gt;.service</C>.
          Services made this way (or by hand there) are <UI>custom</UI>: you can{" "}
          <UI>Edit unit file</UI> and <UI>Remove service…</UI> (stops it,
          disables it and deletes the file).
        </P>
      </>
    ),
  },
  {
    id: "openrc",
    title: "OpenRC and servers without a service manager",
    body: (
      <>
        <P>
          On OpenRC (Alpine, Gentoo) the list, start, stop, restart, reload,
          start at boot and clearing a failed state work the same way. Masking,
          signals, overrides, new services and the journal need systemd.
        </P>
        <P>
          Containers often run no service manager at all; the page then says{" "}
          <UI>No service manager</UI>. Their processes still show in the{" "}
          <See guide="terminal">terminal</See> with <C>ps aux</C> or <C>top</C>.
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
          head={["Problem", "What to do"]}
          rows={[
            [
              "Actions are greyed out",
              "The login user isn't root and can't sudo without a password. Use root, or add a sudo rule for it (see Users & groups).",
            ],
            [
              "A service fails right after Start",
              "Open Logs with Errors + This boot. Common causes: a typo in its config, a port already in use (see Open ports), a missing file or wrong permissions.",
            ],
            [
              "It keeps restarting",
              "Restart= brings it back each time it crashes. Read the logs for the crash; systemd gives up after a few quick failures (start-limit) and marks it Failed.",
            ],
            [
              '"changed on disk" won\'t go away',
              "Press Reload systemd in the banner (daemon-reload). Running services keep going.",
            ],
            [
              "Saving an override fails",
              "systemd-analyze rejected it: the message names the bad line. Nothing was changed on the server.",
            ],
            [
              "Live stopped",
              "The connection to the server dropped; it retries by itself. If it doesn't come back, check the server's status.",
            ],
          ]}
        />
        <P>
          Related: <See guide="ports">Open ports</See> to see what a service
          listens on, <See guide="users">Users & groups</See> for sudo, and{" "}
          <See guide="cron">Cron jobs</See> for systemd timers.
        </P>
      </>
    ),
  },
]
