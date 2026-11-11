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

export const alerts: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          <UI>Alerts</UI> decides when Morche tells someone and where. It has
          three tabs:
        </P>
        <List>
          <li>
            <UI>Rules</UI>: conditions on your servers, their services and your
            databases, like <C>Disk above 85%</C>,{" "}
            <C>Server unreachable for 2 min</C> or <C>nginx stopped</C>. When
            one holds long enough it <UI>fires</UI> and sends a message.{" "}
            <See guide="alerts" section="rules" />
          </li>
          <li>
            <UI>Channels</UI>: the places a message goes: a Telegram or Bale
            group, a Slack or Teams channel, a phone push, an email list or your
            own webhook. Set up once per workspace, then picked by rules and
            uptime monitors. <See guide="uptime" section="alerts" />
          </li>
          <li>
            <UI>Activity</UI>: every alert the rules sent, and when each went
            back to normal.
          </li>
        </List>
        <P>
          Websites, ports, certificates and other outside checks are{" "}
          <UI>Uptime</UI> monitors, not rules: each one alerts through the
          channels ticked on it. <See guide="uptime" section="alerts" />
        </P>
      </>
    ),
  },
  {
    id: "rules",
    title: "Alert rules",
    body: (
      <>
        <P>
          A rule watches one measure on some servers, checked on every sample
          Morche takes (every minute by default), or on every connection check
          for <UI>Unreachable</UI>.
        </P>
        <Steps>
          {[
            <>
              On <UI>Alerts</UI> › <UI>Rules</UI> press <UI>New rule</UI>, or
              pick a ready-made one under <UI>Start from</UI>. From a server's{" "}
              <UI>Metrics</UI> tab, the bell on a chart starts one for that
              server. <See guide="server-metrics" section="alerts" />
            </>,
            <>
              <UI>Watch</UI>: the measure (CPU, memory, disk, unreachable, load
              per core, I/O wait, swap, download, upload, a service, or a
              database's reachability or health), <UI>Above</UI> or{" "}
              <UI>Below</UI>, the limit, and how long it must last. For a disk,
              leave <UI>Filesystem</UI> empty to watch the fullest one, or name
              a mount like <C>/var</C>.
            </>,
            <>
              <UI>On</UI>: <UI>Every server</UI> (new ones too),{" "}
              <UI>Chosen servers</UI>, or <UI>By tag</UI> (any server with one
              of the tags, now or later).
            </>,
            <>
              <UI>Right now</UI> shows what each server reads at the moment and
              whether the rule would fire, before you save.
            </>,
            <>
              <UI>Tell</UI>: the channels, <UI>Warning</UI> or <UI>Critical</UI>
              , <UI>Remind</UI> (while it keeps firing), and whether to send a
              message when it's back to normal.
            </>,
          ]}
        </Steps>
        <Table
          head={["State", "Means"]}
          rows={[
            [<UI key="n">Normal</UI>, "The condition doesn't hold."],
            [
              <UI key="w">Waiting</UI>,
              "It holds, but not yet for as long as the rule asks.",
            ],
            [
              <UI key="f">Firing</UI>,
              "It held long enough; the message went out. Counted in red on the menu and on Home.",
            ],
            [<UI key="o">Off</UI>, "Turned off: watches and sends nothing."],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: <C>Server unreachable</C>,
              value: "2 min, critical",
              why: "Skips a single dropped check, still tells within minutes.",
            },
            {
              setting: <C>Disk almost full</C>,
              value: "Above 85%, at once",
              why: "Disks fill slowly; a warning leaves time to clean up.",
            },
            {
              setting: <C>CPU busy</C>,
              value: "Above 90% for 10 min",
              why: "Builds and backups spike for a minute; 10 min means it's stuck.",
            },
            {
              setting: <C>Memory running out</C>,
              value: "Above 90% for 10 min, critical",
              why: "The next step is the kernel killing processes.",
            },
          ]}
        />
        <Tip>
          Workspace Engineers add, edit, turn off and delete rules; everyone
          else in the workspace sees them and their state.
        </Tip>
      </>
    ),
  },
  {
    id: "services",
    title: "Services that stop or fail",
    body: (
      <>
        <P>
          Pick <UI>Service</UI> under <UI>Watch</UI> to hear about systemd
          services on your servers. It's read on every sample, like the other
          server measures.
        </P>
        <Table
          head={["Service field", "Fires when"]}
          rows={[
            [
              "Empty",
              "Any service on the server failed (crashed, or gave up restarting). One stopped on purpose doesn't count.",
            ],
            [
              <C key="n">nginx</C>,
              "That service isn't running: stopped or failed. A server without it is skipped.",
            ],
          ]}
        />
        <Example title="Know when the web server dies">
          <P>
            <UI>Watch</UI> <C>Service</C>, <UI>Service</UI> <C>nginx</C>,{" "}
            <UI>On</UI> <C>By tag</C> <C>web</C>, <C>2 min</C>, critical.
          </P>
        </Example>
        <Recommended
          rows={[
            {
              setting: <C>A service failed</C>,
              value: "Every server, 2 min, warning",
              why: "One rule covers every unit; the message names the ones that failed.",
            },
          ]}
        />
        <Tip>
          A service that is meant to stop now and then (a one-shot job) shows as
          failed only when it ends with an error. Reset it on the server's{" "}
          <UI>Services</UI> tab once fixed. <See guide="services" />
        </Tip>
      </>
    ),
  },
  {
    id: "databases",
    title: "Databases",
    body: (
      <>
        <P>
          Under <UI>Watch</UI> › <UI>Databases</UI> two measures watch the
          databases Morche monitors: <UI>Unreachable</UI> (Morche can't connect)
          and <UI>Health</UI> (one of its health checks turned critical:
          connections, replication lag, disk…). <UI>On</UI> then picks{" "}
          <UI>Every database</UI> (new ones too) or <UI>Chosen databases</UI>.
        </P>
        <P>
          A database's own page has an <UI>Alerts</UI> tab: the rules that watch
          it, mutes, and what they sent, with the two common rules one press
          away. <See guide="databases" section="health" />
        </P>
        <Recommended
          rows={[
            {
              setting: <C>Database unreachable</C>,
              value: "2 min, critical",
              why: "Apps stop working; someone should hear about it at once.",
            },
            {
              setting: <C>Database critical</C>,
              value: "5 min, warning",
              why: "Skips a short spike in connections or lag.",
            },
          ]}
        />
        <Tip>
          A check you muted on the database's Overview (its limits) never turns
          critical, so it never fires this rule either.
        </Tip>
      </>
    ),
  },
  {
    id: "mutes",
    title: "Muting for maintenance",
    body: (
      <>
        <P>
          Before a planned reboot or upgrade, mute alerts so nobody gets paged
          for something you're doing on purpose.
        </P>
        <Steps>
          {[
            <>
              Press <UI>Mute alerts</UI> on <UI>Alerts</UI> › <UI>Rules</UI>,{" "}
              <UI>Mute</UI> on a server's <UI>Metrics</UI> tab or a database's{" "}
              <UI>Alerts</UI> tab, or <UI>Mute…</UI> in a rule's menu.
            </>,
            <>
              <UI>Which alerts</UI>: <UI>Every rule</UI> or one. <UI>Where</UI>:{" "}
              <UI>Everywhere</UI> or one server or database.
            </>,
            <>
              <UI>Starts</UI>: <UI>Now</UI>, or <UI>Later</UI> for a planned
              window. Then how long (<C>30 min</C> to <C>1 week</C>, or{" "}
              <UI>Until…</UI> a time), and an optional note like{" "}
              <C>Kernel upgrade</C>.
            </>,
          ]}
        </Steps>
        <P>While a mute holds:</P>
        <List>
          <li>
            Rules keep watching: a firing rule still shows in red, on Home and
            in <UI>Activity</UI> (marked <UI>Muted</UI>), but no message goes
            out.
          </li>
          <li>
            If it's still firing when the mute ends, the message goes out then.
            If it went back to normal during the mute, nothing is sent.
          </li>
          <li>
            Mutes in effect or planned show above the rules, with{" "}
            <UI>End now</UI> or <UI>Drop</UI>.
          </li>
        </List>
        <Recommended
          rows={[
            {
              setting: "Reboot of one server",
              value: "That server, every rule, 30 min",
              why: "Covers unreachable and the services coming back.",
            },
          ]}
        />
        <Tip>
          A mute lasts up to 90 days. Anyone with Operator access to what it
          covers can add or end one; <UI>Everywhere</UI> needs Operator on the
          workspace. Uptime monitors have their own pause.
        </Tip>
      </>
    ),
  },
  {
    id: "add",
    title: "Adding a channel",
    body: (
      <>
        <Steps>
          {[
            <>
              Open <UI>Alerts</UI> and press <UI>Add channel</UI> (phone: the{" "}
              <UI>+</UI> button).
            </>,
            <>Pick the kind: Chat, Phone push, or Email and webhooks.</>,
            <>
              Fill in its fields (see below) and give it a name your team will
              recognise, like <C>Telegram: on-call</C>.
            </>,
            <>
              Press <UI>Send a test</UI>: a test message goes out with what you
              typed, before anything is saved.
            </>,
            <>
              Tick <UI>Default for new monitors</UI> if every new monitor should
              use it; <UI>Add to every monitor now</UI> also adds it to the
              monitors you already have. Then <UI>Save</UI>.
            </>,
          ]}
        </Steps>
        <P>
          Tokens, passwords, webhook addresses and webhook header values are
          stored encrypted and never shown again. When editing, a blank secret
          field keeps the saved one.
        </P>
        <Tip>
          Only workspace Owners add, edit and delete channels. Engineers pick
          them on monitors.
        </Tip>
      </>
    ),
  },
  {
    id: "telegram",
    title: "Telegram and Bale",
    body: (
      <>
        <Steps>
          {[
            <>
              Create a bot: in Telegram talk to <C>@BotFather</C>, in Bale to{" "}
              <C>@botfather</C>, send <C>/newbot</C> and copy the{" "}
              <UI>Bot token</UI>.
            </>,
            <>
              Add the bot to the group or channel (in a channel, as an admin
              that can post).
            </>,
            <>
              <UI>Chat id</UI>: a public channel can use <C>@channelname</C>.
              For a group, send it a message, open{" "}
              <C>{"https://api.telegram.org/bot<token>/getUpdates"}</C> and copy{" "}
              <C>chat.id</C> (a negative number for groups).
            </>,
          ]}
        </Steps>
        <P>
          <UI>Bot API address</UI> is only for a self-hosted Bot API or a relay
          (for example when api.telegram.org isn't reachable from Morche's
          machine). Leave it blank for the official one; Bale uses{" "}
          <C>tapi.bale.ai</C> by default. <UI>Without a sound</UI> delivers
          quietly, good for a busy group.
        </P>
      </>
    ),
  },
  {
    id: "chat-webhooks",
    title: "Slack, Discord, Mattermost and Teams",
    body: (
      <>
        <P>
          These take one <UI>Webhook address</UI>, made in the chat app itself:
        </P>
        <Table
          head={["App", "Where to make it"]}
          rows={[
            [
              "Slack",
              "An app with Incoming Webhooks › Add New Webhook to Workspace › pick the channel.",
            ],
            [
              "Discord",
              "Channel settings › Integrations › Webhooks › New Webhook › Copy Webhook URL.",
            ],
            ["Mattermost", "Integrations › Incoming Webhooks › Add."],
            [
              "Microsoft Teams",
              "The channel's Workflows › “Post to a channel when a webhook request is received” (or an older Incoming Webhook connector).",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "push",
    title: "Phone push: ntfy, Gotify, Pushover",
    body: (
      <>
        <List>
          <li>
            <UI>ntfy</UI>: <UI>Server</UI> (blank = ntfy.sh) and a{" "}
            <UI>Topic</UI>; subscribe to the same topic in the ntfy app. On
            ntfy.sh anyone who guesses the topic reads it: pick a long random
            one, or use your own server with an <UI>Access token</UI>.
          </li>
          <li>
            <UI>Gotify</UI>: your Gotify <UI>Server</UI> and an{" "}
            <UI>App token</UI> (Apps › Create application).
          </li>
          <li>
            <UI>Pushover</UI>: an application's token (Create an Application)
            and your <UI>User or group key</UI> from the dashboard.
          </li>
        </List>
        <P>
          <UI>Priority</UI> left at <UI>By the event</UI> sends outages loud and
          recoveries quiet. Pick a number to use the same priority for
          everything.
        </P>
      </>
    ),
  },
  {
    id: "email",
    title: "Email",
    body: (
      <>
        <P>
          Morche sends through your own SMTP server: <UI>SMTP server</UI>,{" "}
          <UI>Port</UI>, <UI>Encryption</UI>, the login, <UI>From</UI> and up to
          50 addresses in <UI>To</UI>.
        </P>
        <Recommended
          rows={[
            {
              setting: "Port + Encryption",
              value: "587 + STARTTLS",
              why: "What most providers expect. 465 = TLS, 25 = none.",
            },
            {
              setting: "From",
              value: "Morche <alerts@your-domain>",
              why: "A sender your mail server is allowed to use, so it isn't marked as spam.",
            },
          ]}
        />
        <Tip>
          Gmail and Microsoft 365 need an app password, not your normal one.
        </Tip>
      </>
    ),
  },
  {
    id: "webhook",
    title: "Your own webhook",
    body: (
      <>
        <P>
          <UI>Webhook</UI> sends a JSON body to any <UI>Address</UI> with the{" "}
          <UI>Method</UI> you pick, plus any headers you add (an{" "}
          <C>Authorization</C>
          header, for instance). Header values are stored encrypted: when
          editing, a blank value keeps the saved one.
        </P>
        <Example title="What arrives">
          <Code>
            {`{
  "event": "down",
  "title": "Shop API is down",
  "text": "Connection refused",
  "url": "https://morcheh.example.com/uptime/…",
  "at": "2026-11-10T08:15:00Z",
  "fields": { "Check": "Website or API", "Target": "https://shop.example.com/health" },
  "monitor_id": "…",
  "monitor_name": "Shop API",
  "kind": "http",
  "status": "down",
  "message": "Connection refused",
  "code": "",
  "latency_ms": null
}`}
          </Code>
        </Example>
        <P>
          <C>event</C> is <C>down</C>, <C>up</C>, <C>degraded</C>,{" "}
          <C>reminder</C> or <C>test</C>, also sent in the <C>X-Morche-Event</C>{" "}
          header.
        </P>
        <P>
          With a <UI>Signing key</UI>, each request carries{" "}
          <C>X-Morche-Timestamp</C> and{" "}
          <C>{"X-Morche-Signature: sha256=<hex>"}</C>, the HMAC-SHA256 of{" "}
          <C>timestamp + "." + body</C> with your key. Check it on your side and
          refuse old timestamps.
        </P>
        <Example title="Checking the signature (Python)">
          <Code>
            {`import hmac, hashlib
mac = hmac.new(key, f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
ok = hmac.compare_digest("sha256=" + mac, signature_header)`}
          </Code>
        </Example>
        <Warn>
          By default a channel can't send to a private address (10.x, 192.168.x,
          localhost). A system admin can tick <UI>Allow a private address</UI>{" "}
          on the channel.
        </Warn>
      </>
    ),
  },
  {
    id: "manage",
    title: "Testing, turning off and the log",
    body: (
      <List>
        <li>
          <UI>Send a test</UI> in a channel's menu sends a message now.
        </li>
        <li>
          <UI>Messages sent</UI> lists the last messages, with the error of any
          that failed.
        </li>
        <li>
          Turning a channel off keeps it on its monitors but sends nothing until
          you turn it on again.
        </li>
        <li>
          <UI>Make a default</UI> / <UI>Not a default</UI> changes only which
          channels new monitors start with.
        </li>
      </List>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          <UI>Last message failed</UI>: open <UI>Messages sent</UI> for the
          error the app returned (a wrong token, a deleted webhook, a bot
          removed from the group).
        </li>
        <li>
          Telegram says <C>chat not found</C>: the bot isn't in the group yet,
          or the chat id lost its leading minus.
        </li>
        <li>
          Times out: Morche's machine can't reach the service. Use a relay in{" "}
          <UI>Bot API address</UI>, your own ntfy/Gotify server, or email.
        </li>
        <li>
          Emails land in spam: send from an address of a domain your SMTP server
          is allowed to send for (SPF/DKIM).
        </li>
        <li>
          A rule fired but nothing came: the rule has no channel (its row says{" "}
          <UI>No channel</UI>) or its channels are turned off.
        </li>
        <li>
          A rule stays <UI>Firing</UI> while the server is unreachable: no new
          samples come in, so it can't clear. Add an <UI>Unreachable</UI> rule
          so you hear about that instead.
        </li>
        <li>
          Editing or turning off a firing rule starts it over: it goes back to{" "}
          <UI>Normal</UI> without a back-to-normal message.
        </li>
        <li>
          A rule is firing but nothing was sent: a mute covers it (see the list
          above the rules). The message goes out when the mute ends if it still
          holds.
        </li>
        <li>
          A <UI>Service</UI> rule never fires for a named service: that server
          doesn't have it (skipped), or the name is wrong; try it with{" "}
          <C>.service</C> and check <UI>Right now</UI>.
        </li>
        <li>
          A monitor went down but nothing came: check the channel is ticked on
          that monitor and turned on, and that the monitor isn't paused.
        </li>
      </List>
    ),
  },
]
