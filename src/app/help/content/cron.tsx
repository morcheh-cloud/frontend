import {
  C,
  Code,
  Example,
  type GuideSection,
  List,
  P,
  Recommended,
  Steps,
  Table,
  Tip,
  UI,
  Warn,
} from "../components/prose"

export const cron: GuideSection[] = [
  {
    id: "what",
    title: "What's on this tab",
    body: (
      <>
        <P>
          <UI>Cron jobs</UI> lists every scheduled command Morche can read on
          the server, grouped by table: each user's crontab and the system ones
          (<C>/etc/crontab</C>, <C>/etc/cron.d/*</C>). Each row shows the
          schedule in plain words, the user it runs as, the next run and, when
          the system log has it, how the last run went.
        </P>
        <List>
          <li>
            <UI>Timers</UI>: systemd timers, the modern alternative to cron
            (read-only here).
          </li>
          <li>
            <UI>Periodic</UI>: scripts in <C>/etc/cron.daily</C>, <C>weekly</C>{" "}
            and <C>monthly</C>, run by run-parts.
          </li>
        </List>
        <Tip>
          Times are always the server's time zone, shown next to the schedule,
          not your browser's.
        </Tip>
      </>
    ),
  },
  {
    id: "add",
    title: "Adding a job",
    body: (
      <>
        <Steps>
          <div>
            Press <UI>Add job</UI> and pick <UI>Save in</UI>: whose crontab it
            goes in decides the user it runs as.
          </div>
          <div>
            Give it a <UI>Name</UI> (saved as a comment above the line) and the{" "}
            <UI>Command</UI>.
          </div>
          <div>
            Pick a schedule: a preset like <UI>Daily at 03:00</UI>, the builder
            (every N minutes, at a time, on certain days), or a raw cron{" "}
            <UI>Expression</UI>. The next runs are listed as you type.
          </div>
          <div>
            Read the hints under the command and apply the fixes they offer,
            then press <UI>Test run</UI> to run it once and see its output.
          </div>
          <div>
            <UI>Save</UI>. The job is on right away.
          </div>
        </Steps>
        <Table
          head={["Expression", "Runs"]}
          rows={[
            [<C key="1">*/5 * * * *</C>, "Every 5 minutes"],
            [<C key="2">0 * * * *</C>, "Every hour, on the hour"],
            [<C key="3">0 3 * * *</C>, "Every day at 03:00"],
            [<C key="4">0 9 * * 1-5</C>, "Weekdays at 09:00"],
            [<C key="5">0 0 1 * *</C>, "The 1st of every month at midnight"],
            [<C key="6">@reboot</C>, "Once, every time the server boots"],
          ]}
        />
      </>
    ),
  },
  {
    id: "hints",
    title: "The command hints",
    body: (
      <>
        <P>
          Cron runs commands differently from your shell. The editor warns about
          the usual traps and fixes them in one click:
        </P>
        <List>
          <li>
            <C>%</C> means a new line to cron: <UI>Escape %</UI> turns{" "}
            <C>date +%F</C> into <C>date +\%F</C>.
          </li>
          <li>
            Output that isn't redirected gets mailed to the user, or silently
            dropped: <UI>Discard output</UI> adds <C>{">/dev/null 2>&1"}</C>, or
            send it to a log file instead.
          </li>
          <li>
            <C>sudo</C> can't ask for a password under cron: put the job in
            root's crontab.
          </li>
          <li>
            <C>cd /dir; cmd</C> runs <C>cmd</C> in the wrong place if <C>cd</C>{" "}
            fails: <UI>Use &&</UI>.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "manage",
    title: "Running, turning off and editing as text",
    body: (
      <>
        <List>
          <li>
            <UI>Run now…</UI> runs a job once, as its user, and shows the
            output. <UI>Stop after</UI> limits how long it may take.
          </li>
          <li>
            <UI>Turn off</UI> comments the line out instead of deleting it, so
            you can turn it back on later. Select several to turn off or delete
            them together.
          </li>
          <li>
            <UI>Duplicate</UI> copies a job as a starting point for a similar
            one.
          </li>
          <li>
            <UI>Edit table as text</UI> opens the whole crontab in an editor. An
            invalid line is pointed out and nothing is saved until it's fixed.
          </li>
        </List>
        <P>
          If someone else changed the crontab while you were editing, saving
          stops: reload theirs, or overwrite it with yours.
        </P>
      </>
    ),
  },
  {
    id: "examples",
    title: "Examples",
    body: (
      <>
        <Example title="Nightly database backup, kept for 14 days">
          <P>
            In root's crontab, <UI>Daily at 03:00</UI>, with a log you can read
            later:
          </P>
          <Code>{`
pg_dump -U postgres app | gzip > /var/backups/app-$(date +\\%F).sql.gz && find /var/backups -name 'app-*.sql.gz' -mtime +14 -delete >> /var/log/backup.log 2>&1
`}</Code>
          <P>
            Note the <C>\%</C>: without it cron would cut the command at{" "}
            <C>%F</C>.
          </P>
        </Example>
        <Example title="A job that must not overlap itself">
          <P>
            A sync every 5 minutes that sometimes takes longer. <C>flock</C>{" "}
            skips a run while the previous one still holds the lock:
          </P>
          <Code>{`
flock -n /tmp/sync.lock /opt/app/sync.sh >> /var/log/sync.log 2>&1
`}</Code>
        </Example>
      </>
    ),
  },
  {
    id: "recommended",
    title: "Recommended practice",
    body: (
      <>
        <Recommended
          rows={[
            {
              setting: "Long commands",
              value: "A script file",
              why: "Cron runs one line. A script is easier to read, test and keep in version control.",
            },
            {
              setting: "Paths",
              value: "Absolute",
              why: "Cron's PATH is minimal; /usr/bin/python3 works where python3 might not.",
            },
            {
              setting: "Output",
              value: ">> /var/log/<job>.log 2>&1",
              why: "You can see what went wrong last night.",
            },
            {
              setting: "Minute",
              value: "Not 0",
              why: "Many jobs fire at :00; 17 3 * * * avoids competing with them.",
            },
            {
              setting: "Overlap",
              value: "flock -n",
              why: "Frequent jobs that may run long can't pile up.",
            },
          ]}
        />
        <Warn>
          Test a destructive job (deleting, syncing with <C>--delete</C>) with{" "}
          <UI>Test run</UI> on a copy first. A wrong path in a nightly job does
          its damage while nobody is watching.
        </Warn>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          <UI>No cron daemon is running</UI>: jobs are saved but never run.
          Start it with <C>sudo systemctl enable --now cron</C> (<C>crond</C> on
          RHEL and Alpine).
        </li>
        <li>
          Only one crontab is shown: the login user isn't root and sudo asks for
          a password. Allow <C>sudo -n</C> for it to see every table.
        </li>
        <li>
          Works in the terminal, fails under cron: almost always PATH or a
          missing variable. Use absolute paths, or set <C>PATH</C> at the top of
          the table.
        </li>
        <li>
          <UI>Last runs unavailable</UI>: the server doesn't log cron runs where
          Morche can read them; redirect the job's output to a log file.
        </li>
      </List>
    ),
  },
]
