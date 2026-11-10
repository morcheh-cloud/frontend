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
          <UI>Alerts</UI> holds the places Morcheh sends a message when
          something breaks: a Telegram or Bale group, a Slack or Teams channel,
          a phone push, an email list or your own webhook. Each one is a{" "}
          <UI>channel</UI>, set up once per workspace and then picked by any
          monitor.
        </P>
        <List>
          <li>
            <UI>Alerts</UI> in the sidebar (phone: <UI>More</UI> ›{" "}
            <UI>Alerts</UI>) lists the channels, whether the last message
            arrived, and how many monitors use each.
          </li>
          <li>
            A monitor's <UI>Alerts</UI> section picks which channels hear about
            it. <See guide="uptime" section="alerts" />
          </li>
        </List>
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
          (for example when api.telegram.org isn't reachable from Morcheh's
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
          Morcheh sends through your own SMTP server: <UI>SMTP server</UI>,{" "}
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
              value: "Morcheh <alerts@your-domain>",
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
          <C>reminder</C> or <C>test</C>, also sent in the{" "}
          <C>X-Morcheh-Event</C> header.
        </P>
        <P>
          With a <UI>Signing key</UI>, each request carries{" "}
          <C>X-Morcheh-Timestamp</C> and{" "}
          <C>{"X-Morcheh-Signature: sha256=<hex>"}</C>, the HMAC-SHA256 of{" "}
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
          Times out: Morcheh's machine can't reach the service. Use a relay in{" "}
          <UI>Bot API address</UI>, your own ntfy/Gotify server, or email.
        </li>
        <li>
          Emails land in spam: send from an address of a domain your SMTP server
          is allowed to send for (SPF/DKIM).
        </li>
        <li>
          A monitor went down but nothing came: check the channel is ticked on
          that monitor and turned on, and that the monitor isn't paused.
        </li>
      </List>
    ),
  },
]
