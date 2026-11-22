import {
  A,
  C,
  Code,
  Example,
  type GuideSection,
  H3,
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

export const automations: GuideSection[] = [
  {
    id: "overview",
    title: "What it is",
    body: (
      <>
        <P>
          An automation waits for something and then does a few steps in order.
          It starts when something happens in the panel (an alert fires, a
          server goes offline, a backup fails), when a secret URL is called, or
          when someone presses <UI>Run now</UI>. It then does up to 10 steps:
          send a notification, run a script, restart a service, check again, run
          a cron job, call a URL or wait.
        </P>
        <List>
          <li>
            Every run is a background task, shown in <See guide="tasks" />, and
            kept in the automation's history with each step's result.
          </li>
          <li>
            Nothing is installed on your servers. Steps that touch a server use
            its saved SSH login, as the rest of the panel does.
          </li>
          <li>
            For things on a clock (every night, every hour), use{" "}
            <See guide="cronjobs" /> instead. An automation can run a cron job
            as one of its steps.
          </li>
        </List>
        <Table
          head={["Page", "What it holds"]}
          rows={[
            [
              <A key="list" href="/automations">
                Automations
              </A>,
              "Every automation of the workspace: what starts it, its steps, its last runs. Add one from here, blank or from a template.",
            ],
            [
              <A key="runs" href="/automations/runs">
                Runs
              </A>,
              "Every run of every automation in the workspace, newest first, with filters.",
            ],
            [
              <A key="hooks" href="/automations/webhooks">
                Webhooks
              </A>,
              <>
                Outgoing webhooks: the panel's events sent, signed, to your own
                tools. See <See guide="api" section="webhooks" />.
              </>,
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "triggers",
    title: "What starts it",
    body: (
      <>
        <P>An automation has one trigger. The editor offers three kinds.</P>
        <H3>When something happens</H3>
        <P>
          Pick one or more event types. The automation starts each time one of
          them happens in this workspace.
        </P>
        <Table
          head={["Event", "When it happens"]}
          rows={[
            [
              <>
                Alert fired <C>alert.fired</C>
              </>,
              "An alert rule's condition held for its time (servers, containers, databases, Proxmox clusters).",
            ],
            [
              <>
                Alert resolved <C>alert.resolved</C>
              </>,
              "A firing alert rule's condition no longer holds.",
            ],
            [
              <>
                Monitor down <C>monitor.down</C>
              </>,
              "An uptime monitor turned down (after its retries).",
            ],
            [
              <>
                Monitor up again <C>monitor.up</C>
              </>,
              "A down or degraded monitor is back up.",
            ],
            [
              <>
                Monitor degraded <C>monitor.degraded</C>
              </>,
              "A monitor answers, but slowly or with a warning.",
            ],
            [
              <>
                Server offline <C>server.offline</C>
              </>,
              "A server that was online can't be reached or signed in to any more.",
            ],
            [
              <>
                Server online again <C>server.online</C>
              </>,
              "A server that couldn't be reached is online again.",
            ],
            [
              <>
                Cron job failed <C>cronjob.failed</C>
              </>,
              "A cron job's run failed, or only partly worked (data.partial).",
            ],
            [
              <>
                Cron job succeeded <C>cronjob.succeeded</C>
              </>,
              "A cron job's run finished without problems.",
            ],
            [
              <>
                Database backup failed <C>backup.failed</C>
              </>,
              "A database backup run failed for at least one database.",
            ],
            [
              <>
                Database backup succeeded <C>backup.succeeded</C>
              </>,
              "Every database of a backup run was stored.",
            ],
            [
              <>
                Deploy failed <C>deploy.failed</C>
              </>,
              "A compose project's deploy (Deploy / Redeploy, or a git deploy) failed.",
            ],
            [
              <>
                Deploy succeeded <C>deploy.succeeded</C>
              </>,
              "A compose project was deployed (git deploys only when something new was deployed).",
            ],
          ]}
        />
        <P>
          Narrow it down with filters. Leave a filter empty to take everything.
          When you set several, all of them must match.
        </P>
        <List>
          <li>
            <UI>Servers</UI>: only events on these servers.
          </li>
          <li>
            <UI>Server tags</UI>: only events on a server with one of these
            tags.
          </li>
          <li>
            <UI>Severity</UI>: only events of these severities (info, warning,
            critical).
          </li>
          <li>
            <UI>Subjects</UI>: only events about these monitors, cron jobs,
            databases, projects…
          </li>
          <li>
            <UI>Title contains</UI>: only events whose title contains this text
            (not case sensitive). Alert titles start with the rule's name, so
            this is how you pick one alert rule.
          </li>
        </List>
        <P>
          <UI>Also react to muted alerts</UI> is off by default. An alert that
          fires while a mute covers it still makes an event, with{" "}
          <C>data.muted = true</C>; with the switch off, automations ignore it.
          See <See guide="alerts" section="mutes" />.
        </P>
        <H3>Incoming URL</H3>
        <P>
          The automation starts when a secret address is called, for example
          from CI or another tool. Save the automation first, then make the
          address on its page: <UI>Make the URL</UI> (or <UI>⋯</UI> ›{" "}
          <UI>Make the incoming URL</UI>). It's shown once, so copy it then.
        </P>
        <List>
          <li>
            Send a POST with a JSON body of up to 64 KB. The body becomes{" "}
            <C>event.data</C>; a <C>title</C> or <C>severity</C> in it is used
            as the event's title and severity.
          </li>
          <li>At most 30 calls a minute. Past that the address answers 429.</li>
          <li>Making a new URL stops the old one at once.</li>
          <li>
            Only this automation runs. The call isn't sent to other automations
            or to outgoing webhooks.
          </li>
        </List>
        <Code>
          {`curl -X POST -H "Content-Type: application/json" \\
  -d '{"title":"Deploy finished","branch":"main"}' \\
  https://morche.example.com/automation-hooks/mah_…`}
        </Code>
        <P>
          The steps can then use <C>{"{{data.branch}}"}</C> (see{" "}
          <See guide="automations" section="variables" />
          ).
        </P>
        <H3>By hand</H3>
        <P>
          Nothing starts it on its own; it runs only when someone presses{" "}
          <UI>Run now</UI>. Good for a runbook the team runs the same way every
          time.
        </P>
      </>
    ),
  },
  {
    id: "steps",
    title: "Steps",
    body: (
      <>
        <P>
          An automation has 1 to 10 steps, done in order. The first step that
          fails ends the run, and the rest are skipped. Turn on{" "}
          <UI>Continue on error</UI> on a step to go on to the next one even
          when it fails.
        </P>
        <Table
          head={["Step", "What it does"]}
          rows={[
            [
              <UI key="notify">Send a notification</UI>,
              "Sends a title and text to chosen notification channels. Both may use variables; left blank, they are the event's own title and text.",
            ],
            [
              <UI key="script">Run a script</UI>,
              "Runs a saved script (one whose parameters all have defaults) or a command typed into the step, in bash, sh or python3. Optionally as root (sudo -n), with a time limit (600 s by default). Runs on the event's server or on chosen servers, waits for the script run to end, and shows each server's output with a link to the script run.",
            ],
            [
              <UI key="service">Act on a service</UI>,
              "Starts, stops, restarts or reloads a systemd unit on the event's server or on chosen servers. The unit may come from a variable such as {{data.detail}}, except with an incoming URL trigger.",
            ],
            [
              <UI key="check">Check again</UI>,
              "Checks the server again, or the event's monitor if it's a monitor event.",
            ],
            [
              <UI key="cron">Run a cron job</UI>,
              "Presses Run now on a cron job and waits for its run to end.",
            ],
            [
              <UI key="url">Call a URL</UI>,
              "Sends a POST, PUT or GET to an address, with your headers and body. A blank body sends the event as JSON.",
            ],
            [
              <UI key="wait">Wait</UI>,
              "Waits 1 to 3600 seconds before the next step.",
            ],
          ]}
        />
        <H3>On the event's server or chosen servers</H3>
        <P>
          Steps that act on a server (script, service, check) run either on the
          server the event happened on, or on servers you pick in the step. Some
          events have no server: a monitor going down, an incoming URL, a Run
          now without a server. For those, choose the servers in the step.
        </P>
        <H3>Call a URL</H3>
        <List>
          <li>
            Header values are stored encrypted and come back blank when you edit
            the step: blank means keep. Changing the address drops the saved
            header values, so type them again.
          </li>
          <li>
            Each call carries <C>X-Morche-Event</C>, <C>X-Morche-Automation</C>{" "}
            and <C>X-Morche-Run</C> headers.
          </li>
          <li>Any answer other than 2xx fails the step.</li>
          <li>
            Private addresses (10.x, 192.168.x, localhost…) are refused unless a
            system admin turns on <UI>Allow a private address</UI> on the step.
          </li>
          <li>
            For a signed copy of every event, an outgoing webhook is usually the
            better tool: <See guide="api" section="webhooks" />.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "variables",
    title: "Variables",
    body: (
      <>
        <P>
          Text in a step can use <C>{"{{…}}"}</C> placeholders, filled from the
          event when the step runs. An unknown name becomes empty. It's plain
          substitution: no conditions or loops.
        </P>
        <Table
          head={["Variable", "What it is"]}
          rows={[
            [<C key="a">{"{{event.id}}"}</C>, "The event's id."],
            [<C key="b">{"{{event.type}}"}</C>, "Its type, e.g. alert.fired."],
            [
              <C key="c">{"{{event.title}}"}</C>,
              "Its title, e.g. High CPU on web-1.",
            ],
            [<C key="d">{"{{event.text}}"}</C>, "Its longer text."],
            [
              <C key="e">{"{{event.severity}}"}</C>,
              "info, warning or critical.",
            ],
            [
              <C key="f">{"{{event.url}}"}</C>,
              "A link into the panel, when it has one.",
            ],
            [
              <C key="g">{"{{event.at}}"}</C>,
              "When it happened (UTC, RFC 3339).",
            ],
            [<C key="h">{"{{event.json}}"}</C>, "The whole event as JSON."],
            [
              <C key="i">
                {"{{subject.kind}} {{subject.id}} {{subject.name}}"}
              </C>,
              "What the event is about: a server, monitor, cron job, database, project…",
            ],
            [
              <C key="j">{"{{server.id}} {{server.name}} {{server.host}}"}</C>,
              "The event's server, when it has one.",
            ],
            [
              <C key="k">{"{{data.<path>}}"}</C>,
              "A field of the event's data. Dotted paths go deeper; lists take an index, e.g. {{data.items.0.name}}.",
            ],
            [
              <C key="l">{"{{automation.name}} {{automation.id}}"}</C>,
              "This automation.",
            ],
            [
              <C key="m">{"{{run.id}} {{run.url}}"}</C>,
              "This run, and a link to it in the panel.",
            ],
          ]}
        />
        <P>
          They work in a notification's title and text, a URL step's body and
          header values, and a service step's unit. They never work in a URL
          step's address: put values in the body or a header.
        </P>
        <H3>In commands: environment variables</H3>
        <P>
          A script or command gets the same values as environment variables.
          They are never pasted into the command's text, so an event can't slip
          shell code into it.
        </P>
        <Table
          head={["Variable", "Same as"]}
          rows={[
            [
              <C key="a">
                MORCHE_EVENT_ID, _TYPE, _TITLE, _TEXT, _SEVERITY, _URL, _AT,
                _JSON
              </C>,
              "event.id … event.json",
            ],
            [
              <C key="b">MORCHE_SUBJECT_KIND, _ID, _NAME</C>,
              "subject.kind, subject.id, subject.name",
            ],
            [
              <C key="c">MORCHE_SERVER_ID, _NAME, _HOST</C>,
              "server.id, server.name, server.host",
            ],
            [
              <C key="d">MORCHE_AUTOMATION_ID, _NAME</C>,
              "automation.id, automation.name",
            ],
            [<C key="e">MORCHE_RUN_ID</C>, "run.id"],
          ]}
        />
        <Example title="Log what happened on the server">
          <Code>
            {`echo "$(date -Is) $MORCHE_EVENT_TITLE" >> /var/log/morche-events.log
echo "Cleaning up on $MORCHE_SERVER_NAME"
df -h /`}
          </Code>
          <P>
            Always quote the variables (<C>"$MORCHE_SERVER_NAME"</C>), as you
            would any outside value.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "safety",
    title: "Safety",
    body: (
      <>
        <P>
          An automation can restart services and run commands as root, so it has
          brakes.
        </P>
        <List>
          <li>
            <UI>No loops</UI>: events an automation caused (a server it
            restarted coming back, a cron job it ran failing) never start
            automations. An automation failing is never a trigger either.
          </li>
          <li>
            <UI>Cooldown</UI> (300 s by default): after a run for a subject (a
            server, a monitor…), the same automation skips that subject until
            the time is up. Other subjects still run.
          </li>
          <li>
            <UI>Max runs per hour</UI> (20 by default, 0 = no limit): past it,
            new runs are skipped.
          </li>
          <li>
            One run at a time per subject: an event that comes while a run for
            the same subject is still going is skipped.
          </li>
          <li>
            Muted alerts don't start automations unless the trigger says so.
          </li>
        </List>
        <P>
          A skipped run is still listed, with the reason, so you can see what
          was held back.
        </P>
        <H3>Whose access it uses</H3>
        <P>
          An automation runs with the access of whoever saved it last; the
          editor says who. Steps that run commands or act on services need
          Engineer on their servers, and checks need Operator. If that person is
          removed, their account is no longer active, or they lose the access a
          step needs, the automation stops and shows a problem banner. Press{" "}
          <UI>Fix</UI>: open it and save it, so it runs as you.
        </P>
        <Table
          head={["Workspace level", "What it allows"]}
          rows={[
            [
              "Viewer",
              "Sees automations and runs. Script and service output is hidden below Operator.",
            ],
            ["Operator", "Runs and stops them (Run now, Stop)."],
            [
              "Engineer",
              "Creates, edits and deletes them, and makes the incoming URL.",
            ],
          ]}
        />
        <Tip>
          On the public demo nothing runs or changes: you can look around and
          open the editor, but saving and running are refused.
        </Tip>
      </>
    ),
  },
  {
    id: "testing",
    title: "Running and testing",
    body: (
      <>
        <H3>Test</H3>
        <P>
          <UI>Test</UI> is a dry run. It says what each step would do (the
          notification's title with its variables filled, the servers a script
          would run on, the environment it would get) and runs nothing. Use it
          before turning an automation on.
        </P>
        <P>
          The editor also shows a live <UI>What would happen</UI> panel as you
          type, from a sample event of the chosen type.
        </P>
        <H3>Run now</H3>
        <List>
          <li>
            Runs the automation straight away, even when it's turned off or
            cooling down.
          </li>
          <li>
            <UI>A sample event</UI> gives the steps an example event to work
            with; pick a server for steps that run on the event's server.
          </li>
          <li>
            While it's running, another Run now is refused: wait for it to end
            or stop it.
          </li>
        </List>
        <H3>A run</H3>
        <P>
          Opening a run shows its steps as a timeline: each step's state,
          output, per-server rows, links (to the script run, the cron job's
          run…) and the event it was given, as JSON. A running one has{" "}
          <UI>Stop</UI>.
        </P>
        <P>
          The <A href="/automations/runs">Runs</A> page lists every run of the
          workspace; filter by automation and by result (Failed, Worked,
          Skipped, Running).
        </P>
      </>
    ),
  },
  {
    id: "templates",
    title: "Templates",
    body: (
      <>
        <P>
          <UI>New automation</UI> offers ready-made ones. They open in the
          editor filled in; read them and change what fits before saving. Their
          notification steps start with the workspace's default channels.
        </P>
        <Table
          head={["Template", "What to check"]}
          rows={[
            [
              <UI key="a">Restart a failed service</UI>,
              "Reacts to alerts whose title contains “A service failed” (the ready-made alert rule, see Alerts) and restarts the unit in {{data.detail}} on that server. With one rule per unit, only that one is restarted.",
            ],
            [
              <UI key="b">Re-check a server that went offline</UI>,
              "Waits a minute, checks the server again and tells the team how it went.",
            ],
            [
              <UI key="c">Clean up when a disk fills</UI>,
              "Reacts to “Disk almost full” and runs, as root, journalctl --vacuum-size=200M and docker system prune -f. Read the command before saving.",
            ],
            [
              <UI key="d">Tell the team when a backup fails</UI>,
              "Sends every failed database backup to your channels.",
            ],
            [
              <UI key="e">Call a URL after a deploy</UI>,
              "POSTs the event to your own tool when a compose project deploys. Put your address in the step.",
            ],
            [
              <UI key="f">Run a cron job from CI</UI>,
              "An incoming URL that runs a cron job. Pick the cron job, save, then make the URL on the automation's page.",
            ],
          ]}
        />
        <Example title="Restart nginx when it fails">
          <Steps>
            {[
              <P key="1">
                In <See guide="alerts" />, add the ready-made{" "}
                <UI>A service failed</UI> rule for <C>nginx.service</C>.
              </P>,
              <P key="2">
                In <A href="/automations">Automations</A>, pick{" "}
                <UI>Restart a failed service</UI>.
              </P>,
              <P key="3">
                Leave the cooldown at 10 minutes and check the{" "}
                <UI>What would happen</UI> panel beside the form.
              </P>,
              <P key="4">
                Press <UI>Create</UI>. The next time nginx fails, it's
                restarted.
              </P>,
            ]}
          </Steps>
        </Example>
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
            setting: "Cooldown",
            value: "5–10 minutes",
            why: "For self-healing (restart, clean up): if the fix doesn't hold, you hear about it instead of restarting in a loop.",
          },
          {
            setting: "Max runs per hour",
            value: "At least the real need",
            why: "A limit too low skips runs you wanted; 0 turns the brake off, keep it for notify-only automations.",
          },
          {
            setting: "Filters",
            value: "Servers or tags",
            why: "Keep a restart or a command to the servers it's meant for.",
          },
          {
            setting: "Before turning it on",
            value: "Press Test",
            why: "See the filled-in titles, servers and environment without running anything.",
          },
          {
            setting: "Order",
            value: "Notify last",
            why: "Turn on Continue on error on the risky steps, so the team still hears what happened.",
          },
          {
            setting: "Service step",
            value: "Name the unit",
            why: "Use {{data.detail}} only when one rule watches one unit; a named unit can't be swapped by the event.",
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
              "Skipped: “The run before for this was still going.”",
              "An earlier run for the same subject hadn't ended. Nothing to fix; shorten the steps if it happens often.",
            ],
            [
              "Skipped: “Cooling down: …”",
              "It ran for this subject within the cooldown. Lower the cooldown, or press Run now to run it anyway.",
            ],
            [
              "Skipped: “It already ran N times in the last hour…”",
              "It hit Max runs per hour. Raise it if the runs were wanted, or tighten the filters.",
            ],
            [
              "Banner: “The person who saved it was removed…” or “…'s account isn't active…”",
              "Press Fix, open it and save it: it then runs with your access.",
            ],
            [
              "“This event didn't happen on a server.”",
              "A step runs on the event's server, but the event has none (a monitor, an incoming URL, a Run now without a server). Choose servers in the step.",
            ],
            [
              "“Not an event type an automation can react to”",
              "The event is one automations can't use (a webhook test, an automation failing). Pick another.",
            ],
            [
              "The incoming URL answers 429",
              "More than 30 calls a minute. Call it less often.",
            ],
            [
              "The incoming URL answers 404 “No automation has this address”",
              "A new URL was made (the old one stopped) or the automation was deleted. Copy the current URL into the caller.",
            ],
            [
              "A notify step fails: “Notifications aren't set up.”",
              "The backend has no notification service running; ask your admin.",
            ],
            [
              "A URL step fails: “The address answered HTTP 500.”",
              "Your tool refused or broke on the call. Check its logs; the run shows the step's details.",
            ],
            [
              "“This script has a required parameter without a default…”",
              "An automation can't fill parameters. Give the parameter a default in the script, or use a command step.",
            ],
          ]}
        />
        <Warn>
          A step that runs as root runs with full power on every server it
          picks. Use filters, and Test before saving.
        </Warn>
        <P>
          Scripts and runs on their own: <See guide="scripts" />. Cron jobs:{" "}
          <See guide="cronjobs" />.
        </P>
      </>
    ),
  },
]
