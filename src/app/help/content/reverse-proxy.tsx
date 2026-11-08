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

export const reverseProxy: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <UI>Reverse proxy</UI> puts your apps on their domains. Pick a server
          that runs (or will run) <UI>nginx</UI>, then add sites: send{" "}
          <C>app.example.com</C> to an app on <C>127.0.0.1:3000</C>, redirect an
          old domain, or serve a folder of files, with https from a certificate
          already on the server.
        </P>
        <P>
          Morcheh reaches the server over SSH, like everything else. Nothing
          else is installed: no agent, no container. To manage nginx on
          Morcheh's own machine, add that machine as a server first.
        </P>
        <Table
          head={["Page", "What you do there"]}
          rows={[
            [
              <UI key="s">Reverse proxy › Sites</UI>,
              "Every site on every proxy, searchable, with its state",
            ],
            [
              <UI key="p">Reverse proxy › Proxies</UI>,
              "The servers running a proxy and how each one is doing",
            ],
            [
              "A proxy's page",
              "Its sites, what else is on the server, logs and history",
            ],
            ["A site's page", "The site's settings and the config they make"],
          ]}
        />
        <P>
          A server's <UI>Overview</UI> shows a line when a proxy runs on it,
          linking here. There is no proxy tab on server pages.
        </P>
      </>
    ),
  },
  {
    id: "add",
    title: "Add a proxy",
    body: (
      <>
        <Steps>
          <P>
            Open <UI>Reverse proxy</UI> and press <UI>Add proxy</UI>.
          </P>
          <P>
            Pick the <UI>Server</UI>. Servers where you don't have Engineer
            access, or that already have a proxy, are greyed out with the
            reason.
          </P>
          <P>
            Leave <UI>Install and set it up now</UI> ticked. Morcheh installs
            nginx with the server's package manager if it's missing, makes the
            folder <C>/etc/nginx/morcheh/</C> and includes it in nginx's config.
            It runs as a background task (see <See guide="tasks" />
            ).
          </P>
          <P>
            When the status turns <UI>Running</UI>, press <UI>New site</UI>.
          </P>
        </Steps>
        <Tip>
          Sites already on the server keep working: setup only adds one{" "}
          <C>include</C> line and never edits or removes other files.
        </Tip>
      </>
    ),
  },
  {
    id: "sites",
    title: "Add a site",
    body: (
      <>
        <P>
          On the proxy's page press <UI>New site</UI>. The form has the settings
          on the left and, beside them, the config Morcheh will write, updated
          as you type. On a phone, <UI>Show the nginx config</UI> at the bottom
          opens it.
        </P>
        <Steps>
          <P>
            <UI>Domains</UI>: one per line. <C>*.example.com</C> covers every
            name one level under it. Each domain's DNS must point at this server
            (see <See guide="dns" />
            ).
          </P>
          <P>
            <UI>Where it goes</UI>: pick what the site does (below) and fill in
            its address, redirect target or folder.
          </P>
          <P>
            <UI>HTTPS</UI>: turn on <UI>Serve over https</UI> and pick a
            certificate (see <See guide="reverse-proxy" section="https" />
            ).
          </P>
          <P>
            Press <UI>Add site</UI>. Morcheh writes the site's file, runs{" "}
            <C>nginx -t</C> and reloads only if the test passes.
          </P>
        </Steps>
        <Table
          head={["What the site does", "Fill in"]}
          rows={[
            [
              <UI key="p">Proxy</UI>,
              <>
                <UI>App address</UI>, as the proxy's server reaches it, e.g.{" "}
                <C>http://127.0.0.1:3000</C> or <C>http://10.0.0.12:8080</C>
              </>,
            ],
            [
              <UI key="r">Redirect</UI>,
              <>
                <UI>Send visitors to</UI>, e.g. <C>https://www.example.com</C>,
                the kind of redirect, and whether to keep the path
              </>,
            ],
            [
              <UI key="s">Static files</UI>,
              <>
                A <UI>Folder</UI> on the server, e.g. <C>/var/www/example</C>.
                Tick <UI>Single-page app</UI> for React, Vue or Angular builds
              </>,
            ],
          ]}
        />
        <Example title="Grafana on its own domain">
          <P>
            Grafana listens on port 3000 of the same server. Domains{" "}
            <C>grafana.example.com</C>, Proxy to <C>http://127.0.0.1:3000</C>,
            WebSockets on (its live panels use them), https with the certificate
            for <C>grafana.example.com</C>.
          </P>
        </Example>
        <Example title="Old domain to the new one">
          <P>
            Domains <C>old-shop.com</C> and <C>www.old-shop.com</C>, Redirect to{" "}
            <C>https://shop.example.com</C>, <UI>301 · Moved for good</UI>,{" "}
            <UI>Keep the path</UI> on, so <C>old-shop.com/cart</C> lands on{" "}
            <C>shop.example.com/cart</C>.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "https",
    title: "HTTPS and certificates",
    body: (
      <>
        <P>
          A site uses certificate files that are already on the server, for
          example the ones certbot keeps in <C>/etc/letsencrypt/live/</C>.
          Morcheh lists every certificate it finds in nginx's config under{" "}
          <UI>Found on the server</UI>; one that covers all the site's domains
          is picked for you when you turn https on.
        </P>
        <List>
          <li>
            <UI>Send http visitors to https</UI>: plain http answers with a
            redirect. Leave it on.
          </li>
          <li>
            <UI>HTTP/2</UI>: faster pages; turn it off only if an old app has
            trouble with it.
          </li>
          <li>
            <UI>HSTS</UI>: browsers refuse plain http for this name for a year.
          </li>
        </List>
        <Warn>
          Turn HSTS on only once https works and will stay working. If the
          certificate later expires, visitors who came before can't reach the
          site at all until it's fixed.
        </Warn>
        <P>To get a certificate with certbot on the proxy's server:</P>
        <Code>
          {
            "sudo certbot certonly --webroot -w /var/www/html -d app.example.com"
          }
        </Code>
      </>
    ),
  },
  {
    id: "more",
    title: "More options",
    body: (
      <>
        <P>
          <UI>More options</UI> is folded; when closed it lists what's set
          inside.
        </P>
        <Table
          head={["Option", "What it does"]}
          rows={[
            [
              <UI key="p">Paths</UI>,
              <>
                Sends a path and everything under it to another app: <C>/api</C>{" "}
                → <C>http://127.0.0.1:8080</C>
              </>,
            ],
            [
              <UI key="h">Headers</UI>,
              "Adds a header to what visitors get back, or to what the app receives",
            ],
            [
              <UI key="o">Only from</UI>,
              <>
                Addresses or ranges allowed in (<C>10.0.0.0/8</C>); others get
                403. Empty = everyone
              </>,
            ],
            [
              <UI key="l">Limits</UI>,
              "Largest upload (nginx's default is 1 MB) and how long to wait for the app (60 s)",
            ],
            [
              <UI key="r">Raw directives</UI>,
              "nginx lines added as they are inside the site's server block",
            ],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "Largest upload",
              value: <C>100</C>,
              why: "For apps that take file uploads (Nextcloud, GitLab, a CMS)",
            },
            {
              setting: "Wait for the app",
              value: <C>300</C>,
              why: "For slow exports or reports that otherwise end in 504",
            },
            {
              setting: "Only from",
              value: "Your office or VPN range",
              why: "For admin tools that shouldn't be open to the internet",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "safety",
    title: "How changes stay safe",
    body: (
      <>
        <List>
          <li>
            Morcheh writes only its own files, one per site, in{" "}
            <C>/etc/nginx/morcheh/</C>. Nothing else on the server is changed.
          </li>
          <li>
            Every save is tested with <C>nginx -t</C> first. If the test fails,
            the old file is put back, nothing is reloaded, and the form shows
            nginx's own message under <UI>Not saved: nothing changed</UI>.
          </li>
          <li>
            Two people editing the same site: the second save is stopped with{" "}
            <UI>Someone else saved this site</UI>. <UI>Load theirs</UI> shows
            their version; <UI>Overwrite</UI> keeps yours.
          </li>
          <li>
            Every save keeps a copy of all the proxy's sites in <UI>History</UI>
            , so any earlier state can be restored in one step.
          </li>
          <li>
            If someone edits one of Morcheh's files by hand, the site shows as{" "}
            <UI>Changed</UI>. Saving it from Morcheh writes it back.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "existing",
    title: "Sites already on the server",
    body: (
      <>
        <P>
          The <UI>On the server</UI> tab lists the sites written by hand or by
          another tool (certbot, a control panel), what they listen on and
          serve, and the certificates nginx uses. They are read-only here and
          keep working next to Morcheh's sites.
        </P>
        <Tip>
          A domain served by both a hand-written site and a Morcheh site is a
          conflict: nginx picks one and warns. Remove the old one by hand before
          adding the same domain in Morcheh.
        </Tip>
      </>
    ),
  },
  {
    id: "logs",
    title: "Logs",
    body: (
      <>
        <P>
          The <UI>Logs</UI> tab reads the last lines of a site's{" "}
          <UI>Requests</UI> (access log) or <UI>Errors</UI> log, or nginx's own.
          It needs Operator access on the server.
        </P>
        <P>
          A <C>502 Bad Gateway</C> in Requests with <C>connect() failed</C> in
          Errors means the app isn't answering at its address: check the app,
          not nginx.
        </P>
      </>
    ),
  },
  {
    id: "status",
    title: "Statuses and troubleshooting",
    body: (
      <>
        <Table
          head={["Status", "Meaning"]}
          rows={[
            [<UI key="r">Running</UI>, "Serving its sites"],
            [
              <UI key="s">Stopped</UI>,
              "Installed but not running: no site answers. Start it from ⋯",
            ],
            [
              <UI key="n">Not installed / Not set up</UI>,
              "Press Set up: Morcheh installs it or wires in its folder",
            ],
            [
              <UI key="c">Config error</UI>,
              "nginx -t fails, usually because of a hand-edited file. Test config shows where",
            ],
            [
              <UI key="u">Unreachable</UI>,
              "The server doesn't answer over SSH; see the server's page",
            ],
          ]}
        />
        <Table
          head={["Problem", "What to do"]}
          rows={[
            [
              "The site shows nginx's welcome page",
              "The domain's DNS points here but the site isn't on: check its domain is spelled the same and the site is On",
            ],
            [
              "502 Bad Gateway",
              "The app isn't answering at its App address. Try it from the server's terminal with curl",
            ],
            [
              "504 Gateway Timeout",
              "The app is too slow: raise Wait for the app in Limits",
            ],
            ["413 Request Entity Too Large", "Raise Largest upload in Limits"],
            ["Live pages don't update", "Turn WebSockets on"],
            [
              "The app redirects to its own address",
              "Turn on Pass the visitor's domain",
            ],
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
        <P>A proxy follows its server's access level:</P>
        <Table
          head={["Level on the server", "Can"]}
          rows={[
            [
              "Viewer",
              "See the proxy and its sites (header values and raw directives hidden)",
            ],
            ["Operator", "Also check, test, reload and read logs"],
            [
              "Engineer",
              "Also set up, start/stop, add, change, turn off and delete sites, restore history",
            ],
            ["Owner", "Also remove the proxy"],
          ]}
        />
        <P>
          Removing a proxy asks whether to take Morcheh's sites off the server
          too, or leave them running unmanaged. nginx itself stays installed.
        </P>
      </>
    ),
  },
]
