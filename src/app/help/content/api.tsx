import { signatureSamples } from "@/app/(panel)/automations/webhooks/components/signature"
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

const sample = (key: string) =>
  signatureSamples.find((s) => s.key === key)?.code ?? ""

export const api: GuideSection[] = [
  {
    id: "tokens",
    title: "API tokens",
    body: (
      <>
        <P>
          An API token lets a script, the <C>morche</C> command-line tool or
          another program call Morche's API as you, without your password. It
          has exactly your access: the servers, workspaces and levels you have,
          nothing more. If your access changes, the token's changes with it.
        </P>
        <Steps>
          {[
            <>
              Open <A href="/account#api-tokens">Account › API tokens</A> (or
              search <UI>New API token</UI> with <C>Ctrl+K</C>).
            </>,
            <>
              Press <UI>New token</UI> and give it a name that says where it's
              used, like <C>CI deploy</C> or <C>Grafana report</C>.
            </>,
            <>
              Turn on <UI>Read only</UI> if it only needs to look (dashboards,
              reports, inventory exports).
            </>,
            <>
              Pick when it expires: <UI>30 days</UI>, <UI>90 days</UI>,{" "}
              <UI>1 year</UI> or <UI>Never</UI>.
            </>,
            <>
              Press <UI>Make token</UI> and copy it. It starts with{" "}
              <C>morche_</C> and is shown only this once: Morche keeps just a
              fingerprint of it.
            </>,
          ]}
        </Steps>
        <P>
          The list shows each token's first characters (to tell them apart),
          when it was last used and from which address, and tags for{" "}
          <UI>Read only</UI>, <UI>Expires soon</UI> (within a week) and{" "}
          <UI>Expired</UI>. <UI>Revoke</UI> stops a token at once. You can have
          up to 50.
        </P>
        <H3>What a token can't do</H3>
        <List>
          <li>
            Change your password, your profile, your sessions or other tokens,
            or answer sign-in alerts: those need you signed in in a browser.
          </li>
          <li>
            Work for an account that is blocked, still waiting for approval, or
            has to choose a new password.
          </li>
          <li>
            A read-only token can only send <C>GET</C> requests; anything else
            is refused with <C>This token can only read.</C>
          </li>
          <li>
            In the public demo, tokens can't be made or used: everyone shares
            the demo account.
          </li>
        </List>
        <P>
          System admins see a member's tokens on that member's details (
          <A href="/settings/members">Settings › Members</A>) and can revoke
          them, for example when someone leaves. Blocking or removing a member
          stops their tokens too.
        </P>
        <Recommended
          rows={[
            {
              setting: "Expires after",
              value: "90 days",
              why: "Anything that leaves your laptop should end on its own.",
            },
            {
              setting: "Read only",
              value: "On for reports",
              why: "A leaked read-only token can't change anything.",
            },
            {
              setting: "One per place",
              value: "Yes",
              why: "Revoking the CI's token then doesn't break your scripts.",
            },
          ]}
        />
        <See guide="access" section="levels">
          Access levels
        </See>
      </>
    ),
  },
  {
    id: "using",
    title: "Using the API",
    body: (
      <>
        <P>
          Send the token in the <C>Authorization</C> header of every request, to
          the API's address: the one your admin set as <C>API_URL</C> when
          installing (like <C>https://api.example.com</C> or{" "}
          <C>http://10.0.0.5:8080</C>). The examples under a new token already
          have it filled in.
        </P>
        <Code>{`curl -H "Authorization: Bearer morche_…" https://api.example.com/auth/me`}</Code>
        <P>
          Answers are JSON. A failure comes back as a problem object with a{" "}
          <C>detail</C> that says what went wrong, and for a form a list of{" "}
          <C>errors</C> per field.
        </P>
        <H3>Workspaces</H3>
        <P>
          Lists like <C>GET /servers</C> cover every workspace you can reach.
          Add <C>X-Workspace-Id</C> with a workspace's id to narrow them to that
          one, the way the panel does for the workspace you picked.
        </P>
        <Example title="Run a cron job after a deploy">
          <P>
            A CI job finishes deploying and wants the nightly cache warm-up to
            run now:
          </P>
          <Code>{`curl -X POST \\
  -H "Authorization: Bearer $MORCHE_TOKEN" \\
  https://api.example.com/schedules/<id>/run`}</Code>
          <P>
            The job shows up under <A href="/tasks">Tasks</A> like any other,
            and the audit log says it came from <C>API token CI deploy</C>.
          </P>
        </Example>
        <H3>Finding the endpoints</H3>
        <P>
          On a development server the full API is browsable at <C>/docs</C>{" "}
          (Swagger UI) with its spec at <C>/openapi.json</C>. Production servers
          don't publish them; ask your admin for the spec, or watch which
          requests the panel makes in your browser's developer tools.
        </P>
      </>
    ),
  },
  {
    id: "cli",
    title: "The morche command line",
    body: (
      <>
        <P>
          <C>morche</C> is a small program that talks to the API with a token.
          Build it from the backend's source with <C>make cli</C> (it lands in{" "}
          <C>bin/morche</C>) or <C>go build ./cmd/morche</C>, then put it
          somewhere on your <C>PATH</C>.
        </P>
        <Steps>
          {[
            <>
              Make a token on <A href="/account#api-tokens">Account</A>.
            </>,
            <>
              Run <C>morche login</C>. It asks for the API address and the
              token, checks them, and saves both in{" "}
              <C>~/.config/morche/config.json</C> (readable only by you).
            </>,
            <>
              Try <C>morche whoami</C>, then <C>morche servers list</C>.
            </>,
          ]}
        </Steps>
        <Table
          head={["Command", "What it does"]}
          rows={[
            [<C key="c">morche whoami</C>, "Who the token belongs to"],
            [
              <C key="c">morche servers list [-q text]</C>,
              "Servers you can reach, optionally searched",
            ],
            [
              <C key="c">morche servers check web-1</C>,
              "Check a server's connection now",
            ],
            [
              <C key="c">morche jobs list / jobs watch &lt;id&gt;</C>,
              "Background tasks, or follow one until it ends",
            ],
            [
              <C key="c">morche run deploy.sh --on web-1,web-2 --wait</C>,
              "Run a saved script (name or id) on servers and wait for it",
            ],
            [
              <C key="c">morche cronjobs list / run &lt;name&gt;</C>,
              "The workspace's cron jobs, or run one now",
            ],
            [
              <C key="c">morche automations list / run &lt;name&gt;</C>,
              "The workspace's automations, or run one now",
            ],
            [
              <C key="c">morche api GET /servers</C>,
              "Any API call, printed as it comes back",
            ],
            [<C key="c">morche logout</C>, "Forget the saved token"],
          ]}
        />
        <P>
          Every list takes <C>--json</C>, and <C>--workspace NAME</C> picks the
          workspace for workspace lists and runs. In CI, skip <C>login</C> and
          set <C>MORCHE_URL</C> and <C>MORCHE_TOKEN</C> (and optionally{" "}
          <C>MORCHE_WORKSPACE</C>) instead.
        </P>
        <Code>{`morche servers list --json | jq -r '.[].name'
morche api POST /servers/<id>/check
morche api GET /jobs`}</Code>
      </>
    ),
  },
  {
    id: "webhooks",
    title: "Webhooks",
    body: (
      <>
        <P>
          A webhook sends Morche's events (an alert fired, a monitor went down,
          a backup failed…) to an address of yours as they happen: an incident
          tool, a chat bridge, a ticket system or a small service you wrote.
          Webhooks belong to a workspace and need <UI>Owner</UI> access to it.
        </P>
        <Steps>
          {[
            <>
              Open <A href="/automations/webhooks">Automations › Webhooks</A>{" "}
              and press <UI>New webhook</UI>.
            </>,
            <>
              Paste the <UI>Address</UI> (http or https). The name defaults to
              its host.
            </>,
            <>
              Pick <UI>All events</UI> or tick the ones you want, by group. All
              events also takes event types added in later versions.
            </>,
            <>
              Add <UI>Headers</UI> if your endpoint expects a token of its own.
              Values are kept encrypted and never shown again.
            </>,
            <>
              Press <UI>Add webhook</UI> and copy the <UI>signing secret</UI>{" "}
              (shown once).
            </>,
            <>
              On the webhook's page, press <UI>Send a test</UI>: a{" "}
              <C>test.ping</C> arrives and shows under <UI>Deliveries</UI>.
            </>,
          ]}
        </Steps>
        <H3>What's sent</H3>
        <P>
          A <C>POST</C> with the event as JSON, and these headers:{" "}
          <C>Content-Type: application/json</C>,{" "}
          <C>User-Agent: Morche-Webhooks/1</C>, <C>X-Morche-Event</C> (the
          type), <C>X-Morche-Delivery</C> (this delivery's id, the same on every
          retry), <C>X-Morche-Timestamp</C> and <C>X-Morche-Signature</C>.
        </P>
        <Code>{`{
  "id": "0b6c…",
  "type": "alert.fired",
  "at": "2026-11-22T09:41:00Z",
  "workspace_id": "5f1e…",
  "severity": "warning",
  "title": "High CPU on web-1",
  "text": "CPU is 93% (above 90%).",
  "url": "https://morche.example.com/servers/…/metrics",
  "subject": { "kind": "server", "id": "…", "name": "web-1" },
  "server_id": "…",
  "data": { "rule_name": "High CPU", "metric": "cpu", "value": 93.4, "threshold": 90, "muted": false }
}`}</Code>
        <H3>Retries</H3>
        <P>
          Any <C>2xx</C> answer within 10 seconds counts as delivered. Anything
          else (another status, a timeout, no connection) is tried again after
          30 seconds, 5 minutes and 30 minutes, then marked <UI>Failed</UI>.
          Waiting retries survive a restart. Use <C>X-Morche-Delivery</C> to
          ignore a delivery you already handled.
        </P>
        <P>
          Each delivery keeps the body sent and the first 4 KB of the answer for
          30 days (at most 1,000 per webhook). Open one to see both, and{" "}
          <UI>Send it again</UI> to repeat it once, now. When every try has been
          failing, the webhook's card turns red and says so.
        </P>
        <H3>Muted alerts</H3>
        <P>
          An alert that fires while a mute covers it is left out, unless{" "}
          <UI>Also send muted alerts</UI> is on; then it arrives with{" "}
          <C>data.muted = true</C>, so a ticket system can still log it.
        </P>
        <H3>Private addresses</H3>
        <P>
          Addresses inside your network (<C>10.x</C>, <C>192.168.x</C>,{" "}
          <C>localhost</C>…) are refused unless a system admin turns on{" "}
          <UI>Allow a private address</UI>. An Owner can keep an allowed address
          but can't point it somewhere else without an admin.
        </P>
        <Tip>
          Turning a webhook off keeps it and its history: events that happen
          meanwhile are simply not sent. <UI>Send a test</UI> still works.
        </Tip>
        <See guide="alerts" section="rules">
          Alert rules
        </See>
      </>
    ),
  },
  {
    id: "verify",
    title: "Verify the signature",
    body: (
      <>
        <P>
          Anyone who knows your endpoint's address could post to it. The
          signature proves a delivery came from Morche and wasn't changed:
        </P>
        <Code>{`X-Morche-Signature: sha256=<hex of HMAC-SHA256(secret, X-Morche-Timestamp + "." + body)>`}</Code>
        <List>
          <li>
            The key is the whole signing secret, <C>whsec_</C> included.
          </li>
          <li>
            Compute it over the <UI>raw</UI> body bytes, before any JSON parsing
            (re-serialised JSON won't match).
          </li>
          <li>Compare in constant time.</li>
          <li>
            <C>X-Morche-Timestamp</C> is Unix seconds: refuse ones more than a
            few minutes old, so a captured delivery can't be replayed.
          </li>
        </List>
        <H3>Node.js</H3>
        <Code>{sample("node")}</Code>
        <H3>Python</H3>
        <Code>{sample("python")}</Code>
        <H3>Go</H3>
        <Code>{sample("go")}</Code>
        <P>
          Leaked the secret? On the webhook's <UI>Settings</UI> tab, press{" "}
          <UI>Make a new secret</UI>. The old one stops at once, so update the
          endpoint right away.
        </P>
      </>
    ),
  },
  {
    id: "events",
    title: "Event types",
    body: (
      <>
        <P>
          The types a webhook can send (the picker shows the same list, grouped,
          with a description for each).
        </P>
        <Table
          head={["Type", "When"]}
          rows={[
            [
              <C key="t">alert.fired</C>,
              "An alert rule's condition held for its time (servers, containers, databases, Proxmox). Severity is the rule's.",
            ],
            [
              <C key="t">alert.resolved</C>,
              "A firing alert rule is fine again.",
            ],
            [
              <C key="t">monitor.down</C>,
              "An uptime monitor turned down, after its retries.",
            ],
            [
              <C key="t">monitor.degraded</C>,
              "A monitor answers, but slowly or with a warning.",
            ],
            [
              <C key="t">monitor.up</C>,
              "A down or degraded monitor is back up.",
            ],
            [
              <C key="t">server.offline</C>,
              "A server that was online can't be reached or signed in to.",
            ],
            [<C key="t">server.online</C>, "That server is online again."],
            [
              <C key="t">cronjob.failed</C>,
              "A cron job's run failed or only partly worked (data.partial).",
            ],
            [
              <C key="t">cronjob.succeeded</C>,
              "A cron job's run finished fine.",
            ],
            [
              <C key="t">backup.failed</C>,
              "A database backup run failed for at least one database.",
            ],
            [
              <C key="t">backup.succeeded</C>,
              "Every database of a backup run was stored.",
            ],
            [
              <C key="t">deploy.failed</C>,
              "A compose project's deploy (or git deploy) failed.",
            ],
            [
              <C key="t">deploy.succeeded</C>,
              "A compose project was deployed.",
            ],
            [<C key="t">automation.failed</C>, "An automation's run failed."],
            [<C key="t">test.ping</C>, "Only from Send a test."],
          ]}
        />
        <P>
          Every type's full sample is in the API at <C>GET /events/catalog</C>.
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
          head={["What you see", "What to do"]}
          rows={[
            [
              <C key="p">This API token isn't valid</C>,
              "It was revoked or has expired: make a new one. Check you copied it whole (morche_ + 40 characters).",
            ],
            [
              <C key="p">This token can only read.</C>,
              "It's a read-only token and the request changes something. Use a token without Read only.",
            ],
            [
              "A 403 on an account or token call",
              "Tokens can't manage your account, sessions or tokens: do that signed in.",
            ],
            [
              "A 403 You need … access",
              "The token has your access; the request needs a higher level on that server or workspace.",
            ],
            [
              "Lists come back empty",
              "Check X-Workspace-Id, or leave it out to see every workspace you can reach.",
            ],
            [
              "Webhook deliveries fail with no answer",
              "Morche couldn't connect: check the address is reachable from Morche's server, and its firewall. A private address needs an admin.",
            ],
            [
              "Deliveries fail with HTTP 401 or 403",
              "Your endpoint refused it: check the header it expects, or the signature check (raw body, whole secret).",
            ],
            [
              "Signature never matches",
              "Your framework parsed the body before you checked it. Read the raw bytes; the secret includes whsec_.",
            ],
            [
              "Nothing arrives at all",
              "Is the webhook On, and does it take that event? An alert during a mute is left out unless muted alerts are on.",
            ],
          ]}
        />
        <Warn>
          A token or a signing secret is as good as a password. Keep them in
          your CI's secret store, never in a repository; revoke and replace one
          that leaked.
        </Warn>
      </>
    ),
  },
]
