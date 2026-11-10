import {
  A,
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

export const cronjobs: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <A href="/cronjobs">Cron jobs</A> are jobs Morcheh runs itself, on a
          schedule: every night, every hour, every 15 minutes, whatever you set.
          Each job does one thing, chosen when it's made: copy files, archive a
          folder, download a file, run a script or a playbook, act on a service,
          reboot servers or verify database backups (see{" "}
          <See guide="cronjobs" section="actions" />
          ).
        </P>
        <List>
          <li>
            Copying works in any direction: server → storage (backups), storage
            → server (deploying files), server → server, storage → storage. One
            source can go to up to 20 destinations at once.
          </li>
          <li>
            Nothing is installed on your servers. Morcheh connects with the
            saved SSH login or storage credentials and streams the files itself.
          </li>
          <li>
            Each run is kept in the job's history with its result on every
            destination, server or database. A run is also a background task,
            shown in <See guide="tasks" />.
          </li>
          <li>
            To schedule a command on one server (its own crontab), use the
            server's <See guide="cron" /> tab instead.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "actions",
    title: "What a job can do",
    body: (
      <>
        <Table
          head={["Action", "What it does"]}
          rows={[
            [
              <UI key="sync">Copy files</UI>,
              "Copies a folder (or one file) from a server or storage to up to 20 servers and storages, in one of three modes (see Modes).",
            ],
            [
              <UI key="archive">Archive a folder</UI>,
              "Packs a server folder into one .tar.gz on that server (name-2026-11-08_03-00-00.tar.gz), sends it to servers and storages and deletes all but the newest N there.",
            ],
            [
              <UI key="fetch">Download a file</UI>,
              "Each chosen server downloads an http(s) address into its folder: block lists, GeoIP files, a release. It must reach the address itself.",
            ],
            [
              <UI key="script">Run a script</UI>,
              "A saved script (with its parameters) or a command typed into the job, on up to 200 servers, 5 at a time. The output is a normal script run.",
            ],
            [
              <UI key="ansible">Run a playbook</UI>,
              "A saved playbook on servers picked by name, tag or folder. Tags and folders are read at each run, so new servers join on their own.",
            ],
            [
              <UI key="service">Service action</UI>,
              "Starts, stops, restarts or reloads a systemd service on servers. A server without it is marked failed; the others go on.",
            ],
            [
              <UI key="reboot">Reboot servers</UI>,
              "Reboots servers one at a time, waiting for each to come back. Can skip those that don't need it or have someone logged in.",
            ],
            [
              <UI key="software">Update applications</UI>,
              "Updates the applications installed on chosen servers (all with an update, or only some) and, if asked, upgrades system packages (optionally security only), a few servers at a time.",
            ],
            [
              <UI key="verify">Verify backups</UI>,
              "Reads back the latest backup of a database (every plan, or one) on every storage it's kept on and compares its checksum. Nothing is restored.",
            ],
          ]}
        />
        <P>
          The action can't be changed later: for something else, make a new job.
          A saved script or playbook is read again at every run, so edits to it
          count from the next run. Script, playbook, application and backup
          check runs link to their own page (<See guide="scripts" />,{" "}
          <See guide="ansible" />,{" "}
          <See guide="applications" section="schedule" />,{" "}
          <See guide="databases" section="backups" />) from the run's details.
        </P>
        <Tip>
          Only <UI>Copy files</UI> has a <UI>Test run</UI>. To try any other
          job, press <UI>Run now</UI> on a server you can afford to touch.
        </Tip>
      </>
    ),
  },
  {
    id: "create",
    title: "Making a cron job",
    body: (
      <>
        <Steps>
          {[
            <>
              Open <A href="/cronjobs">Cron jobs</A> and press{" "}
              <UI>New cron job</UI>.
            </>,
            <>
              Under <UI>What it does</UI> pick the action, then give it a name,
              like <C>Nightly uploads backup</C>.
            </>,
            <>
              Fill in the action's part. For copying: under <UI>Copy from</UI>{" "}
              press <UI>Choose source</UI>, pick the server or storage, then the
              folder (browse the tree or type the path; both stay in step), and
              add each destination under <UI>Copy to</UI> the same way. Missing
              folders are created on the first run. Other actions ask for their
              script, playbook, service, servers or database instead.
            </>,
            <>
              Set <UI>When</UI>: every few minutes, hourly, daily, weekly,
              monthly, or a custom expression. Check the time zone and the next
              runs shown under it.
            </>,
            <>
              For copying, pick the mode (see{" "}
              <See guide="cronjobs" section="modes" />) and add anything to
              leave out. Then press <UI>Create</UI>.
            </>,
            <>
              On the job's page, press <UI>Test run</UI> (copying only) to see
              what it would do, then <UI>Run now</UI> or wait for its time.
            </>,
          ]}
        </Steps>
        <Tip>
          The source is copied by its contents: choosing <C>/var/www/site</C> as
          the source and <C>/backups/site</C> as a destination gives{" "}
          <C>/backups/site/index.html</C>, not <C>/backups/site/site/…</C>.
        </Tip>
      </>
    ),
  },
  {
    id: "examples",
    title: "Examples",
    body: (
      <>
        <Example title="Back up a site's uploads to S3 every night">
          <P>
            Source: server <C>web-1</C>, <C>/var/www/app/uploads</C>.
            Destination: storage <C>backups</C> (S3),{" "}
            <C>/site-backups/uploads</C>. When: <UI>Every day</UI> at 03:00.
            Mode: <UI>Snapshot</UI>, keep <C>14</C>. You get one dated folder
            per night and two weeks of history.
          </P>
        </Example>
        <Example title="Push the same config files to every web server">
          <P>
            Source: storage <C>shared</C>, <C>/configs/nginx</C>. Destinations:{" "}
            <C>web-1</C>, <C>web-2</C>, <C>web-3</C>, each{" "}
            <C>/etc/nginx/conf.d</C>. When: every 15 minutes. Mode:{" "}
            <UI>Update</UI>, so only changed files are copied and nothing local
            is deleted.
          </P>
        </Example>
        <Example title="Keep a standby server in step">
          <P>
            Source: <C>app-1</C>, <C>/srv/data</C>. Destination: <C>app-2</C>,{" "}
            <C>/srv/data</C>. When: every hour. Mode: <UI>Mirror</UI>, with{" "}
            <C>*.tmp</C> and <C>cache</C> left out.
          </P>
        </Example>
        <Example title="Weekly archive of a site, 8 kept on S3">
          <P>
            Action: <UI>Archive a folder</UI>. Folder: <C>web-1</C>,{" "}
            <C>/var/www/site</C>. Send to: storage <C>backups</C>,{" "}
            <C>/archives/site</C>. When: <UI>Every week</UI>, Sunday 02:00.
            Archives to keep: <C>8</C>, leave out <C>cache</C>. Two months of
            single-file archives, easy to download whole.
          </P>
        </Example>
        <Example title="Refresh a block list every 6 hours">
          <P>
            Action: <UI>Download a file</UI>. Address{" "}
            <C>https://example.com/lists/blocklist.txt</C>, save in{" "}
            <C>/etc/nginx/blocklist</C> on every web server,{" "}
            <UI>Replace the file each time</UI> on. Follow it with a{" "}
            <UI>Service action</UI> job that reloads <C>nginx</C> 5 minutes
            later.
          </P>
        </Example>
        <Example title="Clean old logs every night">
          <P>
            Action: <UI>Run a script</UI>, <UI>Type a command</UI>, run as{" "}
            <C>root</C>:
          </P>
          <Code>{"find /var/log/app -name '*.log' -mtime +14 -delete"}</Code>
        </Example>
        <Example title="Patch reboots on Sunday night">
          <P>
            Action: <UI>Reboot servers</UI> on the app servers, with{" "}
            <UI>Only when a reboot is needed</UI> and{" "}
            <UI>Not while someone is logged in</UI> on. When: Sunday 04:00. Only
            servers that got a kernel update reboot, one after another.
          </P>
        </Example>
        <Example title="Check backups every morning">
          <P>
            Action: <UI>Verify backups</UI>, database <C>shop</C>, every plan.
            When: every day at 07:00, after the night's backups. A copy that
            doesn't read back fails the run, which shows on the menu's red
            count.
          </P>
        </Example>
        <Example title="Copy one bucket to another provider">
          <P>
            Source: storage <C>aws</C>, <C>/media</C>. Destination: storage{" "}
            <C>r2</C>, <C>/media</C>. When: <UI>Every day</UI>. Mode:{" "}
            <UI>Update</UI>. Good for a second copy with another company.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "modes",
    title: "Modes",
    body: (
      <>
        <Table
          head={["Mode", "What a run does"]}
          rows={[
            [
              <UI key="u">Update</UI>,
              "Copies files that are new, or whose size or time changed. Never deletes anything at the destination. The safe default.",
            ],
            [
              <UI key="m">Mirror</UI>,
              "Like Update, then deletes files and folders at the destination that the source doesn't have, so both end up the same.",
            ],
            [
              <UI key="s">Snapshot</UI>,
              "Copies everything into a new folder named by the time (2026-11-04_03-00-00) inside the destination, then deletes the oldest ones beyond Keep.",
            ],
          ]}
        />
        <Warn>
          Mirror deletes. Point it only at a folder that holds nothing but this
          copy, and run a <UI>Test run</UI> first. If the source turns out empty
          (a disk that didn't mount, say), a mirror deletes nothing and the run
          fails instead.
        </Warn>
        <Tip>
          Snapshot only ever removes folders named like a snapshot, so other
          things you keep in the same folder are safe. Keep <C>0</C> keeps every
          snapshot.
        </Tip>
      </>
    ),
  },
  {
    id: "schedule",
    title: "Schedule and time zone",
    body: (
      <>
        <P>
          The builder covers the usual cases. <UI>Custom</UI> takes a standard
          five-field cron expression (minute, hour, day of month, month, day of
          week) or a shortcut:
        </P>
        <Table
          head={["Expression", "Runs"]}
          rows={[
            [<C key="a">*/15 * * * *</C>, "Every 15 minutes"],
            [<C key="b">0 3 * * *</C>, "Every day at 03:00"],
            [<C key="c">0 20 * * 1-5</C>, "Weekdays at 20:00"],
            [<C key="d">0 1 1 * *</C>, "The 1st of each month at 01:00"],
            [<C key="e">@daily</C>, "Every day at midnight"],
            [<C key="f">@every 6h</C>, "Every 6 hours, counted from now"],
          ]}
        />
        <P>
          Times are read in the job's time zone (your browser's by default), so{" "}
          <C>0 3 * * *</C> in <C>Asia/Tehran</C> is 03:00 in Tehran whatever
          zone the Morcheh server uses. The editor shows the next three runs
          before you save.
        </P>
        <List>
          <li>
            If Morcheh was down when a run was due, it runs once when Morcheh is
            back (not once per missed time).
          </li>
          <li>
            If a run is still going when the next one is due, the new one is
            recorded as <UI>Skipped</UI> rather than started twice.
          </li>
          <li>
            A paused job doesn't make up for the runs it missed when resumed.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "excludes",
    title: "Leaving files out",
    body: (
      <>
        <P>
          <UI>Leave out</UI> takes one pattern per line. A pattern without a
          slash matches a file or folder name at any depth; one with a slash
          matches a path from the source folder. A left-out folder is skipped
          with everything in it.
        </P>
        <Code>{`*.log
node_modules
.git
cache/tmp`}</Code>
        <P>
          In mirror mode, left-out files at the destination are not touched.
        </P>
      </>
    ),
  },
  {
    id: "runs",
    title: "Test runs and the history",
    body: (
      <>
        <P>
          <UI>Test run</UI> goes through the whole job without writing or
          deleting anything, then shows what it would copy and delete at each
          destination. Use it after every change to a mirror.
        </P>
        <P>
          The job's page lists every run (newest first, filter by Failed, Partly
          done or Skipped). Open one to see, per destination, the files copied
          and their size, files already up to date, files deleted, files that
          couldn't be copied and the first problems. While a run is going it
          shows the file it's on and its speed; <UI>Stop</UI> ends it after that
          file.
        </P>
        <Table
          head={["State", "Meaning"]}
          rows={[
            [<UI key="s">Succeeded</UI>, "Every destination got everything."],
            [
              <UI key="p">Partly done</UI>,
              "Some files or some destinations failed; the rest were copied. Open the run to see which.",
            ],
            [
              <UI key="f">Failed</UI>,
              "Nothing could be done: usually the source couldn't be reached.",
            ],
            [<UI key="k">Skipped</UI>, "The run before was still going."],
            [
              <UI key="i">Interrupted</UI>,
              "Morcheh was restarted during the run. The next run picks up what's missing.",
            ],
            [<UI key="c">Stopped</UI>, "Someone pressed Stop."],
          ]}
        />
      </>
    ),
  },
  {
    id: "access",
    title: "Who can do what",
    body: (
      <>
        <Table
          head={["Workspace level", "Can"]}
          rows={[
            ["Viewer", "See cron jobs and their runs."],
            ["Operator", "Also Run now, Test run and Stop a run."],
            [
              "Engineer",
              "Also create, edit, pause and delete jobs, and delete runs from the history.",
            ],
          ]}
        />
        <P>
          Saving a job also needs access to what it touches; pickers grey out
          what you can't use (and read-only storages as destinations):
        </P>
        <Table
          head={["Action", "Needs"]}
          rows={[
            [
              "Copy files",
              "Operator on the source, Engineer on every destination",
            ],
            [
              "Archive a folder",
              "Engineer on the folder's server and every destination",
            ],
            ["Download a file", "Engineer on every server it saves to"],
            ["Run a script", "Engineer on every server"],
            ["Run a playbook", "Owner on every server it runs on"],
            [
              "Service action",
              "Operator; Engineer to stop a protected service",
            ],
            ["Reboot servers", "Operator on every server"],
            ["Update applications", "Engineer on every server"],
            ["Verify backups", "Operator on the database"],
          ]}
        />
        <P>
          <UI>Run now</UI> on a reboot job asks first, since it reboots straight
          away.
        </P>
        <P>
          A job runs with the access of whoever saved it last, shown as{" "}
          <UI>Runs as</UI> on its page. If that person loses access, is disabled
          or removed, the job stops with a note saying why; someone with access
          opens it and saves it to take it over.
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
            setting: "Backups",
            value: "Snapshot, keep 7–30",
            why: "A bad file overwritten today is still in yesterday's folder.",
          },
          {
            setting: "Keeping copies in step",
            value: "Update, or Mirror after a Test run",
            why: "Update can never lose data at the destination.",
          },
          {
            setting: "Big folders",
            value: "Hourly or slower",
            why: "Every run lists both sides; too often and runs start getting skipped.",
          },
          {
            setting: "Leave out",
            value: "*.log, cache, node_modules, .git",
            why: "Smaller, faster runs with only what you need.",
          },
          {
            setting: "Time zone",
            value: "Where the people are",
            why: "So 03:00 means 03:00 for whoever reads the history.",
          },
        ]}
      />
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <Table
        head={["What you see", "What to do"]}
        rows={[
          [
            "“It can't run” on the job",
            "A server or storage it uses was deleted, or the person it runs as lost their account. Press Fix, choose another place or just save it again.",
          ],
          [
            "Failed: source …",
            "Morcheh couldn't reach or read the source. Check the server or storage status and its saved login.",
          ],
          [
            "Partly done with permission errors",
            "The SSH user can't read those files (source) or write that folder (destination). Fix ownership, or pick a folder the user owns.",
          ],
          [
            "Many runs Skipped",
            "Runs take longer than the gap between them. Run less often, or leave out what doesn't need copying.",
          ],
          [
            "Mirror failed: source folder is empty",
            "On purpose: an empty source usually means a mount went missing, so nothing was deleted. Check the source.",
          ],
          [
            "Reboot skipped: “login session(s) open”",
            "Someone was logged in to that server. It's tried again at the next run; turn Not while someone is logged in off to reboot anyway.",
          ],
          [
            "Reboot failed: “didn't come back within 15 minutes”",
            "The server wasn't reachable 15 minutes after rebooting, so the servers after it were left alone (Not rebooted). Check its console.",
          ],
          [
            "Service action failed on some servers",
            "Open the run: usually that server has no unit with that name. Check the exact name on its Services tab (.service is added for you).",
          ],
          [
            "A protected service wasn't stopped",
            "sshd, dbus, journald and the like keep the server reachable. Edit the job and turn on Even if it's protected (needs Engineer).",
          ],
          [
            "Playbook run failed before starting",
            "A target server is unreachable or the person it runs as lost Owner on it. Fix the server, or change the job's servers and save.",
          ],
          [
            "Download failed: couldn't fetch",
            "The server itself couldn't reach the address (firewall, DNS, proxy) or got an error page. Try the address with curl on that server.",
          ],
          [
            "Every file copied every time (FTP)",
            "FTP servers often report times to the minute only; Morcheh allows for that, but a server that reports no times at all is compared by size.",
          ],
        ]}
      />
    ),
  },
]
