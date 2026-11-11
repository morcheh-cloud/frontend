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

export const commandLog: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          The <UI>Audit log</UI> keeps a row for every command Morche runs on a
          server over SSH: who ran it, from which address, why, in which folder,
          whether it ran as root, how long it took, how it ended and what it
          printed. It also keeps the command lines people type into Morche's
          terminals, with their output.
        </P>
        <P>
          It answers the questions that follow an incident: who restarted nginx,
          what ran on that server last night, which cron job failed, and what a
          teammate typed in a shell. A typed command that was recorded links
          straight to its moment in the{" "}
          <See guide="terminal-recordings">terminal recording</See>.
        </P>
        <P>
          The log is on by default for every workspace and keeps 90 days. Each
          workspace has its own settings.
        </P>
      </>
    ),
  },
  {
    id: "why",
    title: "Why a command ran",
    body: (
      <>
        <P>
          Each row says why it ran. Filter by it with <UI>Why</UI>:
        </P>
        <Table
          head={["Why", "What it covers"]}
          rows={[
            [
              <UI key="t">Typed in a terminal</UI>,
              "Command lines typed into a terminal opened from Morche (bash and zsh), plus a row for each terminal opened",
            ],
            [
              <UI key="c">Changes from the panel</UI>,
              "Someone pressed a button that changes a server: restart a service, add a firewall rule, edit a file…",
            ],
            [
              <UI key="j">Background tasks</UI>,
              "Copies, installs, scripts, Ansible runs and other tasks",
            ],
            [<UI key="s">Cron jobs</UI>, "Morche's own scheduled tasks"],
            [
              <UI key="r">Page reads</UI>,
              "Commands run just to show a page: lists, details, logs. On by default; can be turned off",
            ],
            [
              <UI key="a">Morche's upkeep</UI>,
              "Live stats, status checks and monitors nobody pressed anything for. Off by default",
            ],
          ]}
        />
        <P>
          A page read that runs the same way again within 10 minutes isn't a new
          row: the row counts it instead, shown as <C>×N</C>.
        </P>
      </>
    ),
  },
  {
    id: "find",
    title: "Find a command",
    body: (
      <>
        <P>
          Open <UI>Audit log</UI> in the menu for the whole workspace, or a
          server's <UI>Audit log</UI> tab for that server alone. Rows are
          grouped by day, newest first.
        </P>
        <List>
          <li>
            <UI>Search</UI> looks in the command, what it was for and the
            folder.
          </li>
          <li>
            <UI>Why</UI>, <UI>Result</UI>, <UI>Server</UI>, <UI>Person</UI> and
            the time range narrow the list; <UI>More</UI> has{" "}
            <UI>Only as root</UI> and whether to show commands, opened terminals
            or both.
          </li>
          <li>
            Click a row to open it: the command, what it printed and everything
            else kept about it. From there,{" "}
            <UI>Everything from this terminal</UI> (or task) shows the rest of
            what that shell or task ran, in order.
          </li>
          <li>
            <UI>Export CSV</UI> downloads the rows the filters show, for a
            report or another tool.
          </li>
        </List>
        <Example title="What did someone do on db-1 last night?">
          <Steps>
            {[
              <>
                Open db-1's <UI>Audit log</UI> tab.
              </>,
              <>
                Set <UI>Why</UI> to <UI>Typed in a terminal</UI> and the time to{" "}
                <UI>Last 24 hours</UI>.
              </>,
              <>
                Open a command: its <UI>Output</UI> shows what it printed. If
                the terminal was recorded, <UI>Watch it in the recording</UI>{" "}
                plays the moment it ran.
              </>,
            ]}
          </Steps>
        </Example>
        <P>
          The filters live in the address, so a filtered list can be shared.
        </P>
      </>
    ),
  },
  {
    id: "terminals",
    title: "Commands typed in a terminal",
    body: (
      <>
        <P>
          Morche starts bash and zsh with small hooks that report each command
          line, its folder and how it ended. Nothing reads keystrokes, so a
          password typed at a sudo prompt is never seen. The hooks live in{" "}
          <C>~/.cache/morcheh/shell</C> on the server.
        </P>
        <P>
          Each terminal also gets a row of its own (<UI>Terminal opened</UI>)
          that stays open while the shell runs, so you can see who had a shell
          on which server and for how long. Its note says whether the commands
          typed in it are listed.
        </P>
        <Warn>
          This is a record of normal work, not proof against someone hiding what
          they do. Commands inside another shell started from the first one (
          <C>sudo -i</C>, <C>su</C>, <C>ssh</C> to another machine) or in a
          shell other than bash and zsh aren't listed one by one: only the
          command that started it is. For tamper-proof auditing, run auditd on
          the server as well.
        </Warn>
      </>
    ),
  },
  {
    id: "output",
    title: "What it printed",
    body: (
      <>
        <P>
          Opening a row shows its <UI>Output</UI>: what the command wrote,
          normal output and errors together, in the order it came. A typed
          command keeps its colors, as it looked in the terminal.
        </P>
        <List>
          <li>
            Up to 64 KiB is kept per command: the first 16 KiB and the last 48
            KiB. When more was printed, the middle is left out and marked.
          </li>
          <li>
            <UI>Copy</UI> and <UI>Download</UI> give the plain text (no colors);{" "}
            <UI>Wrap lines</UI> folds long lines, and is remembered.
          </li>
          <li>
            Kept for every kind of row except <UI>Terminal opened</UI>. A page
            read that repeats (<C>×N</C>) shows what it printed the last time.
          </li>
          <li>
            Not kept: binary data (a downloaded file printed to the screen) and
            full-screen programs like <C>vim</C>, <C>top</C> or <C>less</C>; the
            row says so instead.
          </li>
          <li>
            Passwords Morche itself hands to a command (a sudo password, a
            database login) are blanked out before the output is stored.
            Anything else a command prints is kept as printed, so don't print
            secrets in a terminal.
          </li>
          <li>
            A database backup's dump is never kept: only what the tool wrote as
            messages.
          </li>
        </List>
        <Tip>
          Output is shown once a command ends. A command that is still running
          says so; open it again when it's done.
        </Tip>
      </>
    ),
  },
  {
    id: "settings",
    title: "Settings: how long it's kept",
    body: (
      <>
        <P>
          A workspace Owner opens <UI>Settings</UI> on the <UI>Commands</UI> tab
          (on a phone: <UI>⋯</UI> › <UI>Command log settings</UI>).
        </P>
        <List>
          <li>
            <UI>Log commands</UI> turns the whole log on or off. Turning it off
            keeps what's already logged until its time is up.
          </li>
          <li>
            <UI>Keep the log for</UI>: 1 to 3650 days. Rows older than that are
            deleted on their own, within the hour after you shorten it.
          </li>
          <li>
            <UI>Keep what commands print</UI> stores each command's output (see{" "}
            <See guide="command-log" section="output">
              What it printed
            </See>
            ). Turning it off stops keeping new output; what's kept stays until
            its row goes.
          </li>
          <li>
            <UI>Page reads</UI> and <UI>Morche's upkeep</UI> add the quieter
            kinds of rows.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "who",
    title: "Who sees what",
    body: (
      <>
        <P>
          Like recordings, an Owner of the workspace sees everyone's commands on
          its servers, and an Owner of a server sees everyone's on that server.
          Anyone else sees only their own. Owners can switch to <UI>Mine</UI>{" "}
          and filter by <UI>Person</UI>.
        </P>
        <P>
          Rows Morche ran by itself (cron jobs, upkeep) show <UI>Morche</UI> as
          who, and are seen by Owners only.
        </P>
      </>
    ),
  },
  {
    id: "recommended",
    title: "Recommended settings",
    body: (
      <Recommended
        rows={[
          {
            setting: <UI>Log commands</UI>,
            value: "On",
            why: "It costs little and is the first thing you need after an incident.",
          },
          {
            setting: <UI>Keep the log for</UI>,
            value: "90 to 365 days",
            why: "Long enough to trace a slow problem back; match your audit policy if you have one.",
          },
          {
            setting: <UI>Keep what commands print</UI>,
            value: "On",
            why: "Shows what a command did without asking the person who ran it. Each output is capped at 64 KiB.",
          },
          {
            setting: <UI>Page reads</UI>,
            value: "On",
            why: "Shows who looked at what. Repeats are folded, so it stays readable.",
          },
          {
            setting: <UI>Morche's upkeep</UI>,
            value: "Off",
            why: "Very many rows that are always the same few commands; turn it on only while chasing a problem.",
          },
        ]}
      />
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <P>
          <UI>A terminal is listed but none of its commands</UI>: the login
          shell isn't bash or zsh, or the hooks couldn't be written to the home
          folder (read-only or full). Open the terminal's row: its note says
          whether its commands were listed.
        </P>
        <P>
          <UI>A command shows Cut off</UI>: Morche was restarted, or the
          connection dropped, before it ended. Its result was never seen.
        </P>
        <P>
          <UI>Only the start of a command is shown</UI>: commands longer than 64
          KiB are cut there.
        </P>
        <P>
          <UI>A command shows no output</UI>: it printed nothing, it was a
          full-screen program or printed binary data, or{" "}
          <UI>Keep what commands print</UI> was off when it ran. Output kept
          before this feature existed isn't there either.
        </P>
        <P>
          <UI>The output says the middle was left out</UI>: it printed more than
          64 KiB; the first 16 KiB and the last 48 KiB are kept.
        </P>
        <P>
          <UI>The list is empty</UI>: the log may be off for this workspace, or
          you only see your own commands.
        </P>
        <Tip>
          The status checks behind the <See guide="servers">server list</See>{" "}
          aren't logged; they only test the connection.
        </Tip>
      </>
    ),
  },
]
