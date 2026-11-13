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

export const logRetention: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          Morche keeps a lot of history in its own database: the command log,
          sign-ins, background tasks, alert events, server and database samples,
          uptime checks and more. Left alone these tables only grow.{" "}
          <UI>Logs &amp; archives</UI> (<UI>Settings</UI> ›{" "}
          <UI>Logs &amp; archives</UI>) shows every kind of log with its size
          and decides what happens to old rows.
        </P>
        <List>
          <li>
            A <UI>policy</UI> per kind of log says when rows count as old and
            whether they're archived, copied or deleted.
          </li>
          <li>
            Archived rows go into zip files, one per day, week or month, kept on
            Morche's own disk, on one or more Storages, or both.
          </li>
          <li>
            Any file can be <UI>put back</UI> into the database for a while, so
            the usual pages (Audit log, Insights, alerts…) show those rows
            again.
          </li>
          <li>
            <UI>Export</UI> writes any range of days into a file for a report,
            without touching the database.
          </li>
          <li>
            <UI>Free up space</UI> gives the space of removed rows back.
          </li>
        </List>
        <P>
          Only system admins can open this page: the files hold every
          workspace's history.
        </P>
      </>
    ),
  },
  {
    id: "kinds",
    title: "Kinds of logs",
    body: (
      <>
        <P>
          The page lists each kind of log, grouped (Audit, Runs, Alerts,
          Monitoring, Containers), with its rows, size on disk (indexes
          included), oldest row and what happens to old rows today. Rows are an
          estimate for big tables; <UI>Refresh</UI> measures again.
        </P>
        <P>
          Every kind starts with its <UI>default policy</UI>, already on (see{" "}
          <UI>Default policies</UI> below). The list tags it <UI>Default</UI>,
          or <UI>Changed</UI> once an admin edited it, and says when it ran or
          runs first. A policy turned off shows <UI>Policy off</UI> with the
          built-in clean-up that runs instead.
        </P>
        <P>
          Open a kind to see its policy, its files and its tables. A notice at
          the top warns when Morche's disk is nearly full or when a policy
          failed last time.
        </P>
      </>
    ),
  },
  {
    id: "defaults",
    title: "Default policies",
    body: (
      <>
        <P>
          Nothing has to be set up: when Morche starts, every kind of log
          without a policy gets its default one, turned on:
        </P>
        <List>
          <li>
            <UI>Archive</UI> rows older than the kind's usual age (30 days for
            samples and tasks, 90 for the command log, a year for secret
            views…).
          </li>
          <li>
            Weekly files for kinds kept under 90 days, monthly ones for the
            rest, kept on Morche's own disk.
          </li>
          <li>
            Every night at 03:00 in Morche's own time zone; files are never
            deleted by themselves.
          </li>
        </List>
        <P>
          Change anything on the kind's <UI>Policy</UI> tab and save: the top of
          the tab then says <UI>Changed by an admin</UI> and offers{" "}
          <UI>Reset to default</UI> (also in the page's menu). Resetting keeps
          the last run and every file already made. A policy you changed or
          turned off is never overwritten on a restart; a kind of log added in a
          later version gets its default on the first start.
        </P>
        <Warn>
          While a default (archive) policy is on, it replaces the built-in
          clean-up of that kind, including per-workspace settings such as the
          Audit log's <UI>Keep for</UI>: rows move into files at the policy's
          age instead. To go back to the built-in clean-up, turn{" "}
          <UI>Policy on</UI> off.
        </Warn>
        <Tip>
          Add a Storage to the default policies of the kinds you care about
          (audit, sign-ins): the files on Morche's disk alone go with the
          machine if it dies.
        </Tip>
      </>
    ),
  },
  {
    id: "policies",
    title: "Policies: archive, copy or delete",
    body: (
      <>
        <Table
          head={["Mode", "What happens to old rows"]}
          rows={[
            [
              <UI key="a">Archive</UI>,
              "They go into zip files, then leave the database. You can put them back any time.",
            ],
            [
              <UI key="c">Copy</UI>,
              "They're copied into zip files and stay in the database. The built-in clean-up still removes them on its own schedule.",
            ],
            [
              <UI key="d">Delete</UI>,
              "They're deleted for good. No file is written.",
            ],
          ]}
        />
        <P>
          With <UI>Archive</UI> or <UI>Delete</UI>, the policy takes over: the
          built-in clean-up for that kind stops, so nothing disappears before
          the policy has written it. With <UI>Copy</UI> the built-in clean-up
          keeps running, so pick fewer days than it keeps, or the copy finds
          nothing (the form warns you).
        </P>
        <P>
          <UI>Rows older than</UI> sets the age in days.{" "}
          <UI>Keep the tables under</UI> (optional) also takes whole periods,
          oldest first, until the tables fit that many MB; the newest period
          always stays.
        </P>
        <P>
          The <UI>If it ran now</UI> card shows what the next run would take
          with the form as it is, before you save: rows, size and which periods.{" "}
          <UI>Rows by …</UI> lists every period, marks the ones that go next and
          the ones already in a file.
        </P>
        <Warn>
          Deleted rows can't be brought back. Export the range first if a report
          or an audit might ever need it.
        </Warn>
      </>
    ),
  },
  {
    id: "files",
    title: "Files and where they're kept",
    body: (
      <>
        <P>
          Each file holds one period (<UI>Day</UI>, <UI>Week</UI> or{" "}
          <UI>Month</UI>) of one kind of log: a CSV per table with a header row,
          plus <C>manifest.json</C> (tables, columns, row counts) and a{" "}
          <C>README.txt</C>. Any spreadsheet or script can read them. A file's
          name looks like:
        </P>
        <Code>command-log_20261001-20261031_1a2b3c4d.zip</Code>
        <P>
          In the policy's <UI>Files</UI> section turn on <UI>Morche's disk</UI>{" "}
          (the folder shown, with its free space), tick one or more Storages, or
          both. On a Storage they go under the folder you choose (default{" "}
          <C>/morcheh-archives</C>), then a folder per kind of log. A file
          counts as stored once at least one place has it; a place that failed
          shows with its error in the file's details and in the run's task. If
          no place takes it, the run stops and the rows stay in the database.
        </P>
        <P>
          <UI>Delete the files after</UI> (optional) removes files that many
          days after they were made. Files whose rows are back, or that someone
          is holding, are never deleted.
        </P>
        <Tip>
          Keep at least one copy off Morche's own machine: if that disk dies,
          the files on it go with the database they came from.
        </Tip>
        <See guide="storage">Storage</See>
      </>
    ),
  },
  {
    id: "schedule",
    title: "When a policy runs",
    body: (
      <>
        <P>
          Every policy has a schedule (every night at 03:00 by default) in a
          time zone you pick; the time zone also decides where a day, week or
          month starts. Each run takes whatever is old enough by then, writes
          the files, checks them and only then removes the rows. A run that
          stops half-way leaves the rows where they were.
        </P>
        <P>
          <UI>Run now</UI> on the policy (or <UI>Run the policy now</UI> in the
          menu) starts it straight away. Runs show in <UI>Tasks</UI>; the
          policy's <UI>Runs</UI> card shows the last result and the next run.
          Turn <UI>Policy on</UI> off to keep the settings without running them;
          the built-in clean-up then runs instead.
        </P>
        <See guide="tasks">Background tasks</See>
      </>
    ),
  },
  {
    id: "put-back",
    title: "Putting rows back",
    body: (
      <>
        <Steps>
          {[
            <>
              Open the kind of log, tab <UI>Files</UI> (or the main page's{" "}
              <UI>Files</UI> tab for every kind).
            </>,
            <>
              Pick the file for the days you need and choose <UI>Put back…</UI>.
            </>,
            <>
              Choose how long to keep them back: 1, 7, 30 or 90 days, or{" "}
              <UI>Until put away</UI>.
            </>,
          ]}
        </Steps>
        <P>
          The rows go back into the database, so the usual pages show them
          again. The file stays where it is. While they're back the policy
          leaves those rows alone; when the time runs out they're taken out
          again by themselves. <UI>Keep back longer…</UI> changes the time,{" "}
          <UI>Put away now</UI> takes them out straight away.
        </P>
        <P>
          Putting back a <UI>Copy</UI> or an export adds only the rows that are
          missing from the database and doesn't hold them: they're treated like
          any other row afterwards.
        </P>
        <Tip>
          Morche reads the file from its own disk first, then from each Storage
          in turn, and checks it against the checksum taken when it was written:
          a copy that doesn't match is skipped.
        </Tip>
      </>
    ),
  },
  {
    id: "export",
    title: "Exporting for a report",
    body: (
      <>
        <P>
          <UI>Export…</UI> (on a kind's page, in its menu, or by picking a
          period in <UI>Rows by …</UI>) writes the rows between two days into a
          zip file of the same shape, kept wherever you choose. Nothing leaves
          the database. Exports show in <UI>Files</UI> with an <UI>Export</UI>{" "}
          tag and can be downloaded from the file's menu.
        </P>
        <Example title="An audit asks for last quarter's sign-ins">
          <Steps>
            {[
              <>
                Open <UI>Sign-ins</UI> and press <UI>Export…</UI>.
              </>,
              <>
                Set <UI>From</UI> 1 July and <UI>To (included)</UI> 30
                September, keep it on Morche's disk.
              </>,
              <>
                When the task ends, open <UI>Files</UI> and <UI>Download</UI>{" "}
                it.
              </>,
            ]}
          </Steps>
        </Example>
      </>
    ),
  },
  {
    id: "free-space",
    title: "Freeing up space",
    body: (
      <>
        <P>
          PostgreSQL doesn't give the space of removed rows back to the disk; it
          reuses it for new rows. The <UI>Tables</UI> card shows each table's
          size and how many removed rows still take space.{" "}
          <UI>Free up space…</UI> offers two ways:
        </P>
        <Table
          head={["Option", "What it does"]}
          rows={[
            [
              <UI key="t">Tidy up</UI>,
              "Marks the space as free for new rows. Runs alongside everything else; the files on disk don't get smaller.",
            ],
            [
              <UI key="s">Shrink the tables</UI>,
              "Rewrites each table so the space goes back to the disk. The tables are locked while it runs and it needs free disk space about the size of the biggest table.",
            ],
          ]}
        />
        <P>
          Archiving a big backlog for the first time is a good moment to shrink
          once, in a quiet hour.
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
            setting: "Audit (command log, sign-ins)",
            value: "Archive after 90 days, monthly files, a Storage",
            why: "Small but often asked for later; monthly files are easy to hand over.",
          },
          {
            setting: "Server and database samples",
            value: "Archive after 30 days, weekly files",
            why: "The biggest tables; Insights only shows 30 days anyway.",
          },
          {
            setting: "Uptime checks",
            value: "Archive after 30–90 days, or Delete",
            why: "Status changes and incidents are kept separately and say more.",
          },
          {
            setting: "Background tasks, runs",
            value: "Archive after 180 days",
            why: "Keeps who ran what without filling the database.",
          },
          {
            setting: "Delete the files after",
            value: "Empty, or what your rules ask",
            why: "Files are small: keep them unless a rule says otherwise.",
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
        <Table
          head={["What you see", "What to do"]}
          rows={[
            [
              "A policy failed",
              "Open the kind of log: the Runs card shows the error, and the task in Tasks has the full output. The rows were left where they were; run it again once fixed.",
            ],
            [
              "A file shows a place as failed",
              "The Storage couldn't be reached or refused the write; the other places still have the file. Fix the Storage: later files go there again. To put this one there too, download it and upload it by hand.",
            ],
            [
              "Morche's disk is almost full",
              "Send the files to a Storage, set Delete the files after, or move LOG_ARCHIVE_DIR to a bigger disk.",
            ],
            [
              "If it ran now says nothing is old enough",
              "No row is older than the days set, or those periods are already archived. Lower the days to take more.",
            ],
            [
              "Put back refuses the file",
              "No copy could be read or matched its checksum. The task lists each place's problem; fix the Storage and try again.",
            ],
            [
              "A workspace's Keep for setting seems ignored",
              "That kind of log has its policy on, which replaces the built-in clean-up. Change the policy's days, or turn it off to let Keep for decide again.",
            ],
            [
              "Copy finds no rows",
              "The built-in clean-up removed them first. Use fewer days than it keeps, or Archive.",
            ],
          ]}
        />
        <See guide="storage" section="credentials">
          Storage connections
        </See>
      </>
    ),
  },
]
