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
          old domain, serve a folder of files, answer 404 for names you park, or
          forward a TCP/UDP port (a database, SSH) to another machine, with
          https from a certificate already on the server.
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
              <UI key="s">Reverse proxy</UI>,
              "Every site on every proxy as cards, in tabs Proxy hosts (the default) / Redirections / Streams / 404 hosts, each with its own live numbers",
            ],
            [
              <UI key="p">Reverse proxy › Proxies</UI>,
              "The button in the toolbar: the servers running a proxy, how each one is doing, Add proxy",
            ],
            [
              "A proxy's page",
              "The proxy's overall live numbers, its sites, what else is on the server, logs and history",
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
    id: "live",
    title: "Sites and live numbers",
    body: (
      <>
        <P>
          <UI>Reverse proxy</UI> opens on <UI>Proxy hosts</UI>: one card per
          site with its domain (and its other names), where it goes (
          <UI>Passes to</UI>, <UI>Redirects to</UI>…), https, its four live
          numbers and a column per minute (5xx in red). A turned-off site has a
          dashed border. Click a card to edit it; <UI>⋯</UI> turns it off,
          copies its domain or deletes it. The other tabs hold{" "}
          <UI>Redirections</UI>, <UI>Streams</UI> and <UI>404 hosts</UI>; each
          tab's count is in its label.
        </P>
        <P>
          <UI>All proxies</UI> next to the search shows only the sites of one
          proxy. The green <UI>Live</UI> dot says the numbers are fresh (hover
          it to see when they were read). <UI>Add</UI> at the end of the row
          adds a site of the open tab: straight to the form when one proxy can
          take it, else it asks which proxy.
        </P>
        <P>
          The overall numbers, every site of a proxy added up, are on that
          proxy's page, above its sites (open it from <UI>Proxies</UI> or the
          server name at the bottom of a card). If the proxy also has{" "}
          <UI>Streams</UI>, the switch next to <UI>Live</UI> moves between its
          sites and its streams.
        </P>
        <Table
          head={["Number", "What it counts"]}
          rows={[
            [
              <UI key="r">Requests</UI>,
              "Requests in the last 30 minutes (on a card: that site; on a proxy's page: all its sites)",
            ],
            [
              <UI key="m">Per minute</UI>,
              "The last full minute (the running one is left out), with the average below",
            ],
            [
              <UI key="e">Server errors</UI>,
              "Share of answers that were 5xx: amber from 1%, red from 5%",
            ],
            [
              <UI key="t">Sent</UI>,
              "Bytes sent back to visitors, and how much per request",
            ],
          ]}
        />
        <P>
          On a proxy's page, the chart beside the numbers has a column per
          minute: answered requests in indigo, 4xx in grey and 5xx in red on
          top. Hover a column (or focus the chart and use the arrow keys) to see
          that minute.
        </P>
        <P>
          Numbers refresh every 5 seconds. Morcheh reads them from each site's
          access log over SSH; nothing extra runs on the server. For{" "}
          <UI>Streams</UI> they count connections, and <UI>Failed</UI> = the
          target couldn't be reached.
        </P>
        <Tip>
          A card saying <UI>Couldn't read this proxy's log</UI> means Morcheh
          couldn't read that proxy's log just now (it's unreachable or the log
          was rotated away). The sites still work.
        </Tip>
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
          On the proxy's page press <UI>New site</UI>. A site's page works like
          a server's: a header with the site's name, then tabs, each holding one
          kind of setting (see <See guide="reverse-proxy" section="tabs" />
          ). The config Morcheh will write has a tab of its own, <UI>Config</UI>{" "}
          (see <See guide="reverse-proxy" section="config" />
          ). <UI>Save</UI> sits at the end of the tab bar, so it's in reach from
          every tab.
        </P>
        <Steps>
          <P>
            On <UI>General</UI>, under <UI>Domains</UI>, type a name and press
            Enter (or a comma). Paste a list to add them all at once.{" "}
            <C>*.example.com</C> covers every name one level under it. Each
            domain's DNS must point at the proxy's server; its address is shown
            under the list (press it to copy; see <See guide="dns" />
            ).
          </P>
          <P>
            <UI>What it does</UI>: pick what the site does (below) and fill in
            its address, redirect target or folder.
          </P>
          <P>
            On the <UI>HTTPS</UI> tab, turn on <UI>Serve over https</UI> and
            pick a certificate (see{" "}
            <See guide="reverse-proxy" section="https" />
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
                <C>http://127.0.0.1:3000</C> or <C>http://10.0.0.12:8080</C>.
                Under it Morcheh says whether the app runs on the proxy's server
                itself or across the network. Typed without <C>http://</C>?
                Press <UI>Use http://…</UI> under the box
              </>,
            ],
            [
              <UI key="r">Redirect</UI>,
              <>
                <UI>Send visitors to</UI>, e.g. <C>https://www.example.com</C>,
                then the kind of redirect: <C>301</C> moved for good
                (remembered), <C>302</C> moved for now, <C>308</C>/<C>307</C>{" "}
                the same but a sent form is sent again there. With{" "}
                <UI>Keep the path</UI> on, <C>/blog/post</C> lands on the same
                path there; the <UI>For example</UI> line shows where one visit
                ends up
              </>,
            ],
            [
              <UI key="s">Static files</UI>,
              <>
                A <UI>Folder</UI> on the server, e.g. <C>/var/www/example</C>:
                type it or press <UI>Browse</UI> to pick it from the server's
                folders. Turn on <UI>Single-page app</UI> for React, Vue or
                Angular builds
              </>,
            ],
            [
              <UI key="n">404 page</UI>,
              <>
                Only the domains, and the answer: <C>404</C> Not Found,{" "}
                <C>410</C> Gone (search engines drop the pages sooner) or{" "}
                <C>444</C> (the connection is closed with no answer at all).
                Parked or retired names never fall through to another site. With{" "}
                <UI>Answer every other name too</UI> on, it also answers every
                name no other site has (see{" "}
                <See guide="reverse-proxy" section="catch-all" />)
              </>,
            ],
            [
              <UI key="t">Stream</UI>,
              <>
                No domains: a <UI>Port</UI> on the proxy's server, <UI>TCP</UI>{" "}
                or <UI>UDP</UI>, and <UI>Forward to</UI> e.g.{" "}
                <C>10.0.0.12:5432</C>. Anything that isn't http: databases, SSH,
                game or mail servers. Open the port in the server's firewall too
                (the note under the fields links there)
              </>,
            ],
          ]}
        />
        <P>The domain list helps as you go:</P>
        <List>
          <li>
            The first name is the <UI>Main</UI> one: the site's title and the
            link you open. The arrow on another name makes it the main one.
          </li>
          <li>
            A name with a certificate on the server that covers it shows{" "}
            <UI>Certificate</UI>, so https will work for it.
          </li>
          <li>
            <UI>Also answered by</UI> warns that another site of this proxy, or
            a server block written on the server, already answers that name:
            only one of them will get the visitors.
          </li>
          <li>
            When you add <C>example.com</C> without <C>www.example.com</C> (or
            the other way round), the twin is offered with one tap.
          </li>
          <li>
            Pasted addresses are tidied: <C>https://App.example.com/login</C>{" "}
            becomes <C>app.example.com</C>. Backspace in the empty box takes the
            last name back to fix it.
          </li>
        </List>
        <P>
          On a wide screen, the <UI>State</UI> card beside them turns the site
          on or off and holds its note, and <UI>Route</UI> sums up where a
          visitor goes: the address they open, nginx on which server, and where
          it's passed on to. It also says when the site is still plain http.
        </P>
        <Tip>
          A new proxy host can <UI>Start from</UI> an app (WordPress, Next.js,
          Grafana, Portainer, n8n): it fills the settings that app needs, see{" "}
          <See guide="reverse-proxy" section="templates" />.
        </Tip>
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
        <Example title="A database behind the proxy">
          <P>
            PostgreSQL runs on <C>10.0.0.12</C>, which isn't reachable from
            outside. Open <UI>Streams</UI>, press <UI>Add stream</UI>: Port{" "}
            <C>5432</C>, <UI>TCP</UI>, Forward to <C>10.0.0.12:5432</C>, and on{" "}
            <UI>Security</UI> your office address under{" "}
            <UI>Who can reach it</UI>. Clients now connect to the proxy's server
            on 5432.
          </P>
        </Example>
        <Warn>
          Open the stream's port in the proxy server's firewall (see{" "}
          <See guide="firewall" />
          ), and always fill <UI>Who can reach it</UI> for databases and SSH: a
          stream has no password of its own.
        </Warn>
      </>
    ),
  },
  {
    id: "https",
    title: "HTTPS",
    body: (
      <>
        <P>
          The site's <UI>HTTPS</UI> tab turns https on and holds every TLS
          setting nginx offers. Turn on <UI>Serve over https</UI>, then pick a
          certificate under <UI>Found on the server</UI> (one that covers all
          the site's domains is picked for you), or get a new one with{" "}
          <UI>Get a certificate</UI> (see{" "}
          <See guide="reverse-proxy" section="certificates">
            Getting a certificate
          </See>
          ). Under the list you see who signed the certificate, whether certbot
          renews it and how many days it has left.
        </P>
        <Table
          head={["Setting", "What it does"]}
          rows={[
            [
              <UI key="f">Force https</UI>,
              "Every plain http request is redirected to the same address over https. Leave it on.",
            ],
            [
              <UI key="c">Redirect code</UI>,
              "301 (permanent, the usual), 308 (permanent and keeps a POST), 302 / 307 (temporary). Browsers remember a permanent redirect, so test with a temporary one.",
            ],
            [
              <UI key="h2">HTTP/2</UI>,
              "Faster pages; turn it off only if an old app has trouble with it.",
            ],
            [
              <UI key="h3">HTTP/3</UI>,
              "Over QUIC on UDP port 443. Needs nginx 1.25 or newer built with it; the switch stays off when the server's nginx can't.",
            ],
            [
              <UI key="t">TLS settings</UI>,
              "Mozilla's profiles: Intermediate (TLS 1.2 and 1.3), Modern (TLS 1.3 only), Old (also TLS 1.0 and 1.1), or the server's own defaults.",
            ],
            [
              <UI key="s">HSTS</UI>,
              "Browsers refuse plain http for the name for as long as they remember it; optionally for every subdomain, and preload.",
            ],
            [
              <UI key="o">OCSP stapling</UI>,
              "Sends the certificate's revocation status along. Only for certificates that list an OCSP address; Let's Encrypt's no longer do.",
            ],
            [
              <UI key="sc">Session cache</UI>,
              "Returning visitors skip part of the handshake. Leave it on.",
            ],
            [
              <UI key="m">Client certificates</UI>,
              "A CA file on the server: visitors must show a certificate it signed (Required), or are asked for one (Optional).",
            ],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "Force https",
              value: "On, 301",
              why: "Nobody stays on plain http by accident.",
            },
            {
              setting: "TLS settings",
              value: "Intermediate",
              why: "Safe, and every current browser and client connects.",
            },
            {
              setting: "HTTP/2, session cache",
              value: "On",
              why: "Faster pages and quicker repeat visits.",
            },
            {
              setting: "HSTS",
              value: "1 year, later",
              why: "Once https has worked for a while; start with a day.",
            },
          ]}
        />
        <Warn>
          Turn HSTS on only once https works and will stay working. If the
          certificate later expires, visitors who came before can't reach the
          site at all until it's fixed. Start with <UI>5 minutes</UI> or{" "}
          <UI>1 day</UI>, then raise it. <UI>Preload</UI> (needs subdomains and
          a year or more) puts the name into browsers themselves and takes
          months to undo.
        </Warn>
        <Tip>
          HTTP/3 also needs UDP port 443 open, in the server's firewall and in
          any cloud firewall in front of it. Until then browsers quietly stay on
          HTTP/2.
        </Tip>
      </>
    ),
  },
  {
    id: "certificates",
    title: "Getting a certificate",
    body: (
      <>
        <P>
          <UI>Get a certificate</UI> on the HTTPS tab puts a certificate on the
          proxy's server as a background task (it shows under the switch and in{" "}
          <UI>Tasks</UI>). When it's done, its files are filled in and https is
          turned on; save the site to use it. The site doesn't need to be saved
          before.
        </P>
        <List>
          <li>
            <UI>From a CA</UI>: Let's Encrypt (and its staging service for
            tests), ZeroSSL, Google Trust Services, SSL.com, or{" "}
            <UI>Another CA</UI> by its ACME address. certbot is installed if
            missing and renews the certificate by itself.
          </li>
          <li>
            <UI>Self-signed</UI>: made on the server with openssl, for tests,
            internal names and IP addresses. Browsers warn about it.
          </li>
          <li>
            <UI>Upload</UI>: a certificate (with its intermediates) and private
            key you already have, in PEM. It's checked before it's saved in{" "}
            <C>/etc/ssl/morcheh/</C>.
          </li>
        </List>
        <Steps>
          <P>
            Point the site's domains at the proxy's server (an A or AAAA record)
            and make sure port 80 is open.
          </P>
          <P>
            On the site's <UI>HTTPS</UI> tab press <UI>Get a certificate</UI>,
            keep <UI>From a CA</UI> and <UI>Let's Encrypt</UI>, add an email if
            you want renewal warnings, and start it.
          </P>
          <P>
            When it's done, check <UI>Force https</UI> and save the site.
          </P>
        </Steps>
        <P>
          ZeroSSL, Google and SSL.com ask for <UI>EAB</UI> keys (External
          Account Binding) from their dashboards: a key ID and an HMAC key. The
          HMAC key and an uploaded private key are kept encrypted, never in
          plain text, and never shown in the task's log.
        </P>
        <Example title="Test without hitting the limits">
          Pick <UI>Let's Encrypt (staging)</UI> first: it has no rate limits but
          its certificates aren't trusted by browsers. Once it works, get the
          real one with <UI>Get a new one now</UI> on.
        </Example>
        <Warn>
          Wildcard names (<C>*.example.com</C>) need a DNS check, which isn't
          available yet: list the names, or upload a wildcard certificate.
        </Warn>
        <P>
          <UI>No certificate</UI> usually means the CA couldn't reach{" "}
          <C>http://name/.well-known/acme-challenge/</C>: a domain points
          elsewhere, port 80 is closed, or a CDN in front answers for it. The
          task's details show certbot's own message. Every site Morcheh writes
          answers that path, even when it redirects to https or blocks visitors.
        </P>
      </>
    ),
  },
  {
    id: "tabs",
    title: "The site's tabs",
    body: (
      <>
        <P>
          A saved site opens on its <UI>Report</UI>; the tabs after it are its
          settings, then its <UI>Logs</UI> and the <UI>Config</UI> they make.
          Only the tabs a site can use show up: a stream has no HTTPS, Login,
          Routing or Pages, a 404 page has no Login or Routing. A tab with
          something set shows it beside its name (<UI>HTTPS On</UI>,{" "}
          <UI>Routing 3</UI>, <UI>Login SSO</UI>); a red dot means a field there
          was refused when you saved, and Save takes you to it. The open tab is
          kept in the address (<C>?tab=security</C>), so a link can open a site
          straight on it. When the window is too narrow for every tab, the rest
          wait under <UI>More</UI> at the end of the row.
        </P>
        <Table
          head={["Tab", "What's in it"]}
          rows={[
            [
              <UI key="rep">Report</UI>,
              "Charts and top lists of what visitors did: requests, errors, response times, busiest hours, pages, addresses, browsers (see Report). A saved site opens here",
            ],
            [
              <UI key="g">General</UI>,
              "Domains, what the site does and where it goes (with Test), the app's https settings, the note, On/Off, and the site's live traffic",
            ],
            [
              <UI key="t">HTTPS</UI>,
              "Certificate, http → https, HTTP/2 and HSTS (see HTTPS and certificates)",
            ],
            [
              <UI key="s">Security</UI>,
              <>
                <UI>Who can reach it</UI>: addresses always let in, always
                blocked, and what happens to everyone else; <UI>Countries</UI>{" "}
                (see Who can visit). <UI>Hardening</UI>: ready-made refusals for
                scanners and bots (see Hardening). <UI>Browser protections</UI>:
                switches for common safety headers (below);{" "}
                <UI>Hide the nginx version</UI>
              </>,
            ],
            [
              <UI key="l">Login</UI>,
              "A name and password, or a sign-in service (SSO) in front of the whole site (see Login)",
            ],
            [
              <UI key="r">Rate limit</UI>,
              "Requests per second or minute, open connections, speed, and what a refused visitor gets (see Rate limits)",
            ],
            [
              <UI key="k">Cache</UI>,
              "How long browsers keep files, and (proxy hosts) nginx keeping the app's answers; Clear cache (see Cache)",
            ],
            [
              <UI key="p">Routing</UI>,
              <>
                <UI>Paths</UI>: rules for part of the site, like <C>/api</C> →{" "}
                <C>http://127.0.0.1:8080</C>, a redirect or a block.{" "}
                <UI>Headers</UI>: add a header to the answer or the request, or
                remove one the app sends (see Paths and headers)
              </>,
            ],
            [
              <UI key="g">Pages</UI>,
              "Maintenance mode and your own error pages (see Maintenance and error pages)",
            ],
            [
              <UI key="a">Advanced</UI>,
              "Compression, passing answers straight through, the visitor's real address behind a CDN, the PROXY protocol for streams, upload size and timeouts, and raw nginx lines (see Advanced options)",
            ],
            [
              <UI key="log">Logs</UI>,
              "Every request as it arrives, with search and filters by time, status, path, address and more (see Logs of a site)",
            ],
            [
              <UI key="c">Config</UI>,
              "The whole file Morcheh writes for the site, tested on the server, and written by hand if you need to (see The config file)",
            ],
          ]}
        />
        <P>
          Each browser protection is an ordinary response header: turning it on
          adds the row to <UI>Routing › Headers</UI>, turning it off removes it.
          If you set one of them by hand with another value, the switch is on
          and shows that value.
        </P>
        <Table
          head={["Protection", "Header it adds"]}
          rows={[
            [
              <UI key="f">Block framing by other sites</UI>,
              <C key="c">X-Frame-Options: SAMEORIGIN</C>,
            ],
            [
              <UI key="n">Stop content-type guessing</UI>,
              <C key="c">X-Content-Type-Options: nosniff</C>,
            ],
            [
              <UI key="r">Share less with other sites</UI>,
              <C key="c">Referrer-Policy: strict-origin-when-cross-origin</C>,
            ],
            [
              <UI key="s">Keep out of search engines</UI>,
              <C key="c">X-Robots-Tag: noindex, nofollow</C>,
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
              setting: "Who can reach it",
              value: "Your office or VPN range",
              why: "For admin tools that shouldn't be open to the internet",
            },
            {
              setting: "Browser protections",
              value: "The first three on",
              why: "Safe for almost every site; add the search-engine one for internal tools",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "site-report",
    title: "Report",
    body: (
      <>
        <P>
          A site&apos;s <UI>Report</UI> tab is worked out from nginx&apos;s
          access log for that site, read on the server when you open it. Pick
          the period at the top: <UI>Last hour</UI>, <UI>24 hours</UI>,{" "}
          <UI>7 days</UI> or <UI>30 days</UI> (kept in the address as{" "}
          <C>?period=7d</C>). The time beside it says when the log was read; the
          refresh button reads it again. It needs Operator access on the server.
        </P>
        <Table
          head={["Part", "What it shows"]}
          rows={[
            [
              <UI key="t">Tiles</UI>,
              "Requests, different visitors (addresses), share of errors, response time (p95), data sent, and cache hits or the app's own time, each compared with the period before",
            ],
            [
              <UI key="r">Requests</UI>,
              "Requests over time, split into success, redirects, client errors (4xx) and server errors (5xx)",
            ],
            [
              <UI key="c">Response time, Error rate, Visitors, Data sent</UI>,
              "The same period, one chart each; hover (or use the arrow keys) for the exact values",
            ],
            [
              <UI key="h">Busiest hours</UI>,
              "Requests by weekday and hour, in your time zone",
            ],
            [
              <UI key="d">How long they took</UI>,
              "How many requests answered in under 100 ms, under 1 s, and so on",
            ],
            [
              <UI key="l">Top lists</UI>,
              "Pages, slowest pages, Not found, Server errors, visitors, status codes, referrers, browsers, systems, devices, bots, domains, methods, protocols, upstreams and cache states. Show all opens the whole list",
            ],
          ]}
        />
        <P>
          Click a row in any list (a page, an address, a status code) to open
          the <UI>Logs</UI> tab already filtered to it, to see the requests
          behind the number.
        </P>
        <Tip>
          Response times, domains and cache hits come from the detailed log
          format Morcheh writes since this version. A site saved before it shows
          a notice with <UI>Write the site again</UI> (Engineer): it saves the
          site as it is, nothing else changes, and new lines carry the details.
          Older lines stay as they were.
        </Tip>
        <P>
          The report can only reach back as far as the log does: when nginx
          (logrotate) has thrown older lines away, a notice says where the log
          starts. A stream counts connections instead of requests, and has no
          pages, browsers or status codes.
        </P>
      </>
    ),
  },
  {
    id: "site-logs",
    title: "Logs of a site",
    body: (
      <>
        <P>
          The site&apos;s <UI>Logs</UI> tab lists its requests, newest first,
          and follows new ones as they arrive (the blue <UI>Live</UI> dot).
          Press <UI>Live</UI> to pause while you read; a range that ends in the
          past never follows. Click a row for everything the line says: status,
          path, domain, address, time taken, the upstream that answered, cache
          state, request ID, referrer, browser, and the raw line with a copy
          button.
        </P>
        <Table
          head={["Filter", "How"]}
          rows={[
            [
              <UI key="s">Search</UI>,
              "Any text in the path, address, referrer or browser",
            ],
            [
              <UI key="st">Status</UI>,
              <>
                <UI>2xx</UI>, <UI>3xx</UI>, <UI>4xx</UI>, <UI>5xx</UI> or{" "}
                <UI>Errors</UI> (4xx and 5xx), with how many of each; exact
                codes like <C>404</C> or <C>502,504</C> under <UI>Filters</UI>
              </>,
            ],
            [
              <UI key="t">Time</UI>,
              "Last 15 minutes up to last 7 days, or your own From / To",
            ],
            [
              <UI key="f">Filters</UI>,
              <>
                Path (<C>/api/</C>), address or its start (<C>10.0.</C>),
                method, domain (when the site has several), status codes, slower
                than a number of milliseconds
              </>,
            ],
          ]}
        />
        <P>
          Every filter is kept in the address, so a link opens the same list for
          a colleague. Filters other than search, status and time show as pills
          under the bar: remove one with its ×, or all with <UI>Clear all</UI>.
          In a request&apos;s details, <UI>Only this address</UI> and{" "}
          <UI>Only this path</UI> narrow the list to it.
        </P>
        <Example title="Find what broke after a deploy">
          <Steps>
            <P>
              Open the site&apos;s <UI>Logs</UI> and pick <UI>5xx</UI>.
            </P>
            <P>
              Click one request: <UI>Upstream</UI> and <UI>Upstream status</UI>{" "}
              say whether the app answered at all.
            </P>
            <P>
              Press <UI>Only this path</UI> to see if every request there fails,
              then copy the request ID to look it up in the app&apos;s own logs.
            </P>
          </Steps>
        </Example>
        <P>
          The list reads the newest lines first and stops after a large number
          of them in one go; the footer says how many matched and how many lines
          were read, and <UI>Show more</UI> goes further. For the server&apos;s
          whole nginx log (errors too), use the proxy&apos;s own Logs tab (see
          Logs).
        </P>
      </>
    ),
  },
  {
    id: "visitors",
    title: "Who can visit",
    body: (
      <>
        <P>
          The <UI>Security</UI> tab decides who reaches a site (or a stream).
          Two lists name addresses or ranges, IPv4 or IPv6, one per line:{" "}
          <UI>Always let in</UI> and <UI>Always block</UI>.{" "}
          <UI>Everyone else</UI> says what happens to every visitor the lists
          don't name: <UI>Let in</UI> (the default) or <UI>Block</UI>. Blocked
          visitors get <C>403 Forbidden</C>; a stream just drops them. A line
          under the lists says in words who gets in, and warns when nobody
          would.
        </P>
        <Example title="Two common setups">
          <List>
            <li>
              Only the office and the VPN: Everyone else = <UI>Block</UI>,
              Always let in = <C>203.0.113.0/24</C> and <C>10.8.0.0/16</C>.
            </li>
            ,
            <li>
              Open, minus a few abusers: Everyone else = <UI>Let in</UI>, Always
              block = <C>198.51.100.23</C>, <C>192.0.2.0/24</C>.
            </li>
            ,
          </List>
        </Example>
        <P>
          When an address is in both lists (a single address inside a blocked
          range), the narrower entry wins: block <C>10.0.0.0/8</C> and let in{" "}
          <C>10.1.2.3</C>, and only that one machine of the range gets through.
          The same entry can't be in both lists.
        </P>
        <P>
          Countries (sites only, not streams): pick countries with{" "}
          <UI>Choose countries</UI> and say whether they're the{" "}
          <UI>Only these</UI> that get in, or the ones to <UI>Block these</UI>.
          The address lists are checked first, so <UI>Always let in</UI> still
          works for someone travelling abroad. With <UI>Only these</UI>,{" "}
          <UI>Everyone else</UI> decides visitors whose country isn't known
          (private addresses, very new ranges).
        </P>
        <Steps>
          {[
            <>
              The first time, the card says country lookup isn't on: press{" "}
              <UI>Turn on country lookup</UI> (Engineer). It runs as a
              background task: adds nginx's GeoIP2 module with the server's
              package manager, downloads a free country database (about 8 MB)
              and sets a monthly refresh.
            </>,
            <>Pick the countries and the mode, then Save.</>,
          ]}
        </Steps>
        <Tip>
          Countries are a coarse filter: VPNs and proxies hide where people are,
          and databases are never exact. Pair them with the address lists for
          anything that really matters. IP to country data by DB-IP.com,
          licensed CC BY 4.0.
        </Tip>
        <Warn>
          If the module can't be added (no package for it on that system),
          turning it on fails with a message and nothing is changed; sites with
          countries can't be saved on that proxy until it's on.
        </Warn>
        <Recommended
          rows={[
            {
              setting: "Admin tools",
              value: "Everyone else: Block + your office/VPN ranges",
              why: "The strongest and simplest rule",
            },
            {
              setting: "A local shop or service",
              value: "Countries: Only these, your country",
              why: "Cuts most bots; add Always let in for partners abroad",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "rate-limit",
    title: "Rate limits",
    body: (
      <>
        <P>
          The <UI>Rate limit</UI> tab (proxy hosts, static sites and streams)
          keeps one visitor, or a flood, from taking the whole site down.
          Nothing is limited until you set something.
        </P>
        <Table
          head={["Card", "What it does"]}
          rows={[
            [
              <UI key="r">Requests</UI>,
              <>
                Limits like <C>10 per second</C>, on the whole site or under a
                path (<C>/login</C>, <C>/api</C>), counted for each visitor or
                for all visitors together, optionally only for some methods
                (e.g. <C>POST</C>). Sites only.
              </>,
            ],
            [
              <UI key="c">Connections</UI>,
              "How many connections one visitor, or the whole site, may hold open at once",
            ],
            [
              <UI key="s">Speed</UI>,
              "KB/s per connection sent to visitors; sites can keep the first MB at full speed so pages stay fast; streams can also cap what clients send",
            ],
            [
              <UI key="w">When a limit is hit</UI>,
              <>
                The answer (<C>429</C>, <C>503</C>, or <C>444</C> = close
                without answering), addresses never limited, and{" "}
                <UI>Try it out first</UI>
              </>,
            ],
          ]}
        />
        <P>
          Burst is how many requests above the rate are taken at once; what
          happens to them is your choice: <UI>Serve them at once</UI> (the
          usual), <UI>Slow them to the rate</UI> (they wait in line), or{" "}
          <UI>Serve some at once, slow the rest</UI>. Beyond the burst, requests
          are refused. Each limit shows a sentence saying what it does. When
          several limits match a request, all of them count it and the strictest
          decides.
        </P>
        <Example title="Slow down password guessing">
          Add limit › <UI>Login form</UI>: path <C>/login</C>, <C>5</C> per
          minute, burst <C>5</C>, method <C>POST</C>, counted for each visitor.
          Opening the page stays free; the sixth wrong password in a minute gets
          429.
        </Example>
        <Steps>
          {[
            "Set the limits and turn on Try it out first, then Save.",
            <>
              Use the site for a day and look in the proxy's <UI>Logs</UI> tab
              (error log) for lines saying a request would have been limited.
            </>,
            "Raise the limits if real visitors show up there, then turn Try it out first off.",
          ]}
        </Steps>
        <Recommended
          rows={[
            {
              setting: "Whole site",
              value: "10–20 per second, burst 20–50, per visitor",
              why: "A page with its images and scripts is dozens of requests at once",
            },
            {
              setting: "Login / password reset",
              value: "5 per minute, burst 5, POST",
              why: "Stops guessing without bothering people",
            },
            {
              setting: "Connections per visitor",
              value: <C>20</C>,
              why: "Browsers open about 6; leaves room for several tabs",
            },
            {
              setting: "Never limit",
              value: "Monitoring, your office, other servers of yours",
              why: "So health checks and your own scripts aren't refused",
            },
          ]}
        />
        <Warn>
          Behind Cloudflare or another proxy every visitor looks like a few
          addresses, so per-visitor limits and address lists hit everyone at
          once. Count for all visitors together there, or limit at the outer
          proxy. <UI>Try it out first</UI> needs nginx 1.17.6 or newer.
        </Warn>
      </>
    ),
  },
  {
    id: "cache",
    title: "Cache",
    body: (
      <>
        <P>
          The <UI>Cache</UI> tab (proxy hosts and static sites) makes pages come
          back faster in two ways. Both are off until you set them.
        </P>
        <Table
          head={["Card", "What it does"]}
          rows={[
            [
              <UI key="b">Browsers</UI>,
              <>
                Tells visitors' browsers to keep images, styles, scripts and
                fonts for some days (<C>expires</C>), and with{" "}
                <UI>Always check pages again</UI> never to keep HTML pages, so a
                change shows at once
              </>,
            ],
            [
              <UI key="p">Proxy cache</UI>,
              <>
                Proxy hosts only: nginx keeps the app's answers on its own disk
                (<C>/var/cache/morcheh-nginx</C>) and hands them out again for
                the time you set (10 minutes if empty), up to a size (1 GB)
              </>,
            ],
          ]}
        />
        <P>
          The proxy cache never keeps an answer for a signed-in request (an{" "}
          <C>Authorization</C> header), a WebSocket, or an answer that sets a
          cookie, so one person's page isn't shown to another. Add the paths and
          cookie names of everything personal (admin, cart, account) to the two{" "}
          <UI>Never keep</UI> lists; the <UI>WordPress</UI> and{" "}
          <UI>Admin and API</UI> buttons fill in the usual ones.
        </P>
        <Table
          head={["Switch", "What it does"]}
          rows={[
            [
              <UI key="s">Serve the last copy when the app is down</UI>,
              "Visitors keep getting pages while the app restarts or errors; an old copy is refreshed in the background",
            ],
            [
              <UI key="i">Ignore the app's own cache headers</UI>,
              <>
                Keeps answers even when the app sends{" "}
                <C>Cache-Control: no-cache</C>. Only for apps that send it
                everywhere by mistake
              </>,
            ],
            [
              <UI key="h">Show whether an answer came from the cache</UI>,
              <>
                Adds <C>X-Cache-Status</C>: <C>HIT</C>, <C>MISS</C>,{" "}
                <C>EXPIRED</C>, <C>BYPASS</C>…
              </>,
            ],
          ]}
        />
        <Example title="Check that it works">
          <C>curl -sI https://app.example.com/ | grep -i x-cache</C> twice: the
          first answer says <C>MISS</C>, the second <C>HIT</C>.
        </Example>
        <P>
          After a release, <UI>Clear cache</UI> (on the Proxy cache card, or in
          the site's ⋯ menu; Operator access) empties the site's cache on the
          server at once.
        </P>
        <Recommended
          rows={[
            {
              setting: "Keep images, styles, scripts and fonts",
              value: "30 days",
              why: "When file names change with each release (most build tools do that)",
            },
            {
              setting: "Always check pages again",
              value: "On",
              why: "Pages pick up the new file names straight away",
            },
            {
              setting: "Proxy cache",
              value: "1–10 minutes",
              why: "For public pages (a blog, docs, a shop's catalogue); even a minute takes most of the load off the app",
            },
            {
              setting: "Serve the last copy",
              value: "On",
              why: "A restart of the app goes unnoticed",
            },
          ]}
        />
        <Warn>
          The proxy cache and <UI>Pass answers straight through</UI> (Advanced)
          can't be on together: turning one on turns the other off. If pages
          look old after a change, clear the cache; if a personal page shows up
          for someone else, turn the cache off and list that path first.
        </Warn>
      </>
    ),
  },
  {
    id: "advanced",
    title: "Advanced options",
    body: (
      <>
        <P>
          The <UI>Advanced</UI> tab holds what most sites never need to change.
        </P>
        <Table
          head={["Option", "What it does"]}
          rows={[
            [
              <UI key="g">Compress text answers</UI>,
              "On by default: pages, styles, scripts, JSON and SVG go out gzipped, often 70% smaller",
            ],
            [
              <UI key="b">Pass answers straight through</UI>,
              "Proxy hosts: nothing is held back, for server-sent events, streamed downloads and AI chat answers that arrive word by word; uploads reach the app as they come",
            ],
            [
              <UI key="r">Behind a CDN or load balancer</UI>,
              <>
                The addresses of Cloudflare or your load balancer, and the
                header they put the visitor's address in. Logs, address lists,
                countries and rate limits then see the real visitor.{" "}
                <UI>Use Cloudflare's</UI> fills in Cloudflare's ranges and{" "}
                <C>CF-Connecting-IP</C>
              </>,
            ],
            [
              <UI key="c">Give up connecting after</UI>,
              "Proxy hosts and streams: how long to try reaching the app (nginx's default is 60 s, up to 75); a few seconds shows an error fast when it's down",
            ],
            [
              <UI key="p">Send the PROXY protocol</UI>,
              "Streams: tells the target who connected. Only when the target expects it (HAProxy, Traefik, Postfix), or every connection fails",
            ],
            [
              <UI key="l">Largest upload, Wait for the app</UI>,
              "nginx's 1 MB limit and 60 s wait; raise them for uploads and slow exports",
            ],
            [
              <UI key="z">Brotli</UI>,
              "Also compress with Brotli, about 15–20% smaller than gzip for text. Needs nginx's brotli module: without it the switch is greyed out and only gzip is used",
            ],
            [
              <UI key="i">Give each request an ID</UI>,
              <>
                A unique <C>X-Request-ID</C> goes to the app, back to the
                visitor and into the access log. When someone reports an error,
                ask for the ID and find the same request in the app's log. An ID
                the visitor sends is kept
              </>,
            ],
            [
              <UI key="d">Raw directives</UI>,
              "nginx lines added as they are inside the site's block",
            ],
          ]}
        />
        <P>
          <UI>Hide the nginx version</UI> sits in the <UI>Security</UI> tab and
          is on by default: error pages and the <C>Server</C> header stop naming
          the exact version.
        </P>
        <Warn>
          Only list addresses you trust under{" "}
          <UI>Behind a CDN or load balancer</UI>: anything sending from them can
          claim to be any visitor. Cloudflare changes its list now and then;
          press <UI>Use Cloudflare's</UI> again and save to refresh it.
        </Warn>
      </>
    ),
  },
  {
    id: "templates",
    title: "Templates and copies",
    body: (
      <>
        <P>
          A new proxy host shows <UI>Start from</UI> above the address: press an
          app and the settings it needs are filled in. Nothing else changes, and
          the address is filled only when the box is empty; check it, since it's
          only where the app usually listens.
        </P>
        <Table
          head={["App", "What it sets"]}
          rows={[
            [
              <UI key="w">WordPress</UI>,
              <>
                64 MB uploads, 2 min wait, <C>/xmlrpc.php</C> blocked, hidden
                files, backups and scanners refused (Common probes stays off:
                its own <C>/wp-admin</C> must work)
              </>,
            ],
            [
              <UI key="n">Next.js</UI>,
              "WebSockets, gzip, browsers keep built files 30 days, hidden files refused",
            ],
            [
              <UI key="g">Grafana</UI>,
              "WebSockets for live panels, the site's name passed on, 5 min wait for heavy queries",
            ],
            [
              <UI key="p">Portainer</UI>,
              <>
                <C>https://127.0.0.1:9443</C> without checking its self-signed
                certificate, WebSockets for consoles, 1 GB uploads, 10 min wait
              </>,
            ],
            [
              <UI key="8">n8n</UI>,
              "WebSockets and Pass answers straight through for its editor, 16 MB payloads, 1 h wait",
            ],
          ]}
        />
        <P>
          To make a site like one you already have, open the site's ⋯ menu and
          press <UI>Duplicate</UI>. A new site opens with every setting copied
          except its domains, its certificate and its accounts' passwords (the
          names are kept): fill those in and save. The copy is saved as a new
          site; the original doesn't change.
        </P>
      </>
    ),
  },
  {
    id: "upstream-https",
    title: "An app that speaks https",
    body: (
      <>
        <P>
          Some apps only answer on https themselves (Portainer, Proxmox, a
          Kubernetes ingress). Write the address with <C>https://</C> and the{" "}
          <UI>App over https</UI> card appears under <UI>What it does</UI>.
        </P>
        <Table
          head={["Setting", "What it does"]}
          rows={[
            [
              <UI key="v">Check the app's certificate</UI>,
              "Off by default, since internal apps mostly use self-signed ones. On = refuse to connect unless the certificate is valid for the name",
            ],
            [
              <UI key="n">Name to ask for</UI>,
              "Sent to the app (SNI) and checked on its certificate. Needed when the address is an IP but the app's certificate names a domain",
            ],
            [
              <UI key="c">Trusted CA file</UI>,
              "Your own CA, as a path on the proxy's server; empty = the system's list",
            ],
            [
              <UI key="m">Client certificate, Its key</UI>,
              "Only when the app wants the proxy to prove who it is (mutual TLS)",
            ],
          ]}
        />
        <P>
          <UI>Test</UI> next to the address asks the app once from the proxy's
          server, with these settings, and says what it answered and how fast.
          Use it before saving: a refused connection or a certificate problem
          shows here instead of as a 502 later.
        </P>
        <Tip>
          The settings cover every https address of the site, including paths
          sent to another app on the <UI>Routing</UI> tab.
        </Tip>
      </>
    ),
  },
  {
    id: "load-balancing",
    title: "Load balancing",
    body: (
      <>
        <P>
          When the same app runs on several servers, a proxy site (or a stream)
          can spread its traffic over all of them: more capacity, and the site
          stays up when one server goes down. The address in <UI>General</UI> is
          always the first server (server 1). With no other servers nothing is
          balanced: every request goes to that one address.
        </P>
        <Steps>
          <P>
            In <UI>General</UI>, under the <UI>App address</UI> (or{" "}
            <UI>Forward to</UI> for a stream), press <UI>Add another server</UI>{" "}
            and type its address as <C>host:port</C>, like <C>10.0.0.6:3000</C>.
            Pasting a list (one per line, or comma separated) adds a row for
            each; a pasted URL is trimmed to its host and port.
          </P>
          <P>
            The <UI>Load balancing</UI> tab appears (also reached by{" "}
            <UI>Weights, backups and failover</UI>). Press <UI>Test all</UI>:
            each server is asked for the site's address from the proxy's server,
            with the same scheme and path as the main one.
          </P>
          <P>
            Pick <UI>How a server is picked</UI>, then save. The tab's badge
            shows how many servers share the site.
          </P>
        </Steps>
        <P>
          Each server has a <UI>Weight</UI> (its share compared with the others;
          the row shows the share it gets), <UI>Most connections</UI> at once,
          and a role:
        </P>
        <Table
          head={["Role", "What it means"]}
          rows={[
            [<UI key="o">In use</UI>, "Gets its share of the traffic"],
            [
              <UI key="b">Backup</UI>,
              "Gets traffic only while every server in use is down. Only with Take turns and Fewest connections",
            ],
            [
              <UI key="f">Off</UI>,
              "Gets nothing, but stays in the list: for maintenance, without losing its settings",
            ],
          ]}
        />
        <P>Ways a server is picked:</P>
        <Table
          head={["Way", "When to use it"]}
          rows={[
            [
              <UI key="r">Take turns</UI>,
              "The usual choice: each server gets the next request in turn, weights counted",
            ],
            [
              <UI key="l">Fewest connections</UI>,
              "Some requests take much longer than others (reports, uploads, websockets)",
            ],
            [
              <UI key="i">Same visitor, same server</UI>,
              "The app keeps logins or carts in memory. Picked by the visitor's network (first three parts of an IPv4 address). Sites only",
            ],
            [
              <UI key="h">By a key</UI>,
              "The same visitor address, page, cookie, header or query value always goes to the same server: per-tenant servers, or caches that should each hold their own pages. Streams use the client's address",
            ],
            [
              <UI key="n">Random</UI>,
              "Several proxies in front of the same servers. Pick the less busy of two spreads it more evenly",
            ],
          ]}
        />
        <Tip>
          With <UI>By a key</UI>, keep{" "}
          <UI>Move few keys when servers change</UI> on: adding or removing a
          server then moves only that server's share, instead of reshuffling
          every visitor.
        </Tip>
        <P>
          <UI>When a server fails</UI>: a server that fails the set number of
          times within the time given is taken out for that time, then tried
          again. nginx learns this from real requests: it doesn't check servers
          on its own.
        </P>
        <P>
          <UI>Try another server</UI>: when a server can't be reached, times out
          or (if picked) answers with one of the chosen error codes, before
          anything reached the visitor, the request goes to the next server. The
          visitor sees an error only when every server failed. POST and PATCH
          are never sent twice unless <UI>Also POST and PATCH</UI> is picked.
        </P>
        <Warn>
          Turn on <UI>Also POST and PATCH</UI> only for apps where sending a
          form twice is safe: otherwise an order or a payment can happen twice.
        </Warn>
        <P>
          <UI>Connections to the servers</UI> (sites): idle connections kept
          open, so requests don't wait for a new one each time.
        </P>
        <Recommended
          rows={[
            {
              setting: <UI>How a server is picked</UI>,
              value: "Take turns",
              why: "Fewest connections when requests vary a lot in length",
            },
            {
              setting: <UI>Failures before it's taken out</UI>,
              value: "3",
              why: "One slow answer shouldn't take a healthy server out",
            },
            {
              setting: <UI>Taken out for</UI>,
              value: "30 seconds",
              why: "Long enough for a restart, short enough to come back soon",
            },
            {
              setting: <UI>Servers tried at most</UI>,
              value: "2 or 3",
              why: "Caps how long a visitor waits when several servers are down",
            },
            {
              setting: <UI>Idle connections kept</UI>,
              value: "32",
              why: "Faster answers on busy sites, fewer ports used",
            },
          ]}
        />
        <Example title="An app on three servers, one kept in reserve">
          <P>
            General's address is <C>http://10.0.0.5:3000</C>. Add{" "}
            <C>10.0.0.6:3000</C> with weight 2 (a bigger machine) and{" "}
            <C>10.0.0.7:3000</C> as <UI>Backup</UI>. With <UI>Take turns</UI>,
            .5 gets a third of the requests, .6 two thirds, and .7 only when
            both are down. To update .5, set it to <UI>Off</UI>, save, update
            it, set it back to <UI>In use</UI>.
          </P>
        </Example>
        <P>
          How it's written: an <C>upstream</C> block named after the site (
          <C>…_pool</C>) with a shared <C>zone</C>, and <C>proxy_pass</C>{" "}
          pointed at it. The <C>Host</C> header and the https name stay the main
          address's, so the app sees the same request whichever server answers.
          Paths on the <UI>Routing</UI> tab that go to the main address use the
          pool too; paths sent to another app don't. See the result on the{" "}
          <UI>Config</UI> tab.
        </P>
        <Table
          head={["Problem", "What to do"]}
          rows={[
            [
              "Visitors get logged out now and then",
              "The app keeps sessions in memory: use Same visitor, same server, By a key with the session cookie, or a shared session store in the app",
            ],
            [
              "One server gets almost everything",
              "Check the weights and roles; with Same visitor, same server, visitors behind one company network count as one",
            ],
            [
              "Backups can't be saved",
              "Backups only work with Take turns and Fewest connections",
            ],
            [
              "A server name doesn't follow DNS changes",
              "nginx looks names up when it starts or reloads: use IP addresses, or reload after a change",
            ],
          ]}
        />
        <Tip>
          Not available in free nginx (they need nginx Plus): active health
          checks that probe servers on their own, sticky cookies, slow start and
          least time.
        </Tip>
      </>
    ),
  },
  {
    id: "login",
    title: "Login",
    body: (
      <>
        <P>
          The <UI>Login</UI> tab puts a sign-in in front of the whole site, even
          when the app has none of its own (an admin tool, a staging copy, a
          dashboard).
        </P>
        <Table
          head={["Choice", "How it works"]}
          rows={[
            [<UI key="o">Off</UI>, "Anyone who can reach the site opens it"],
            [
              <UI key="p">Password</UI>,
              "The browser asks for a name and password (HTTP basic auth). Each person gets an account; the proxy keeps only a hash of each password",
            ],
            [
              <UI key="s">Sign-in service</UI>,
              "Before each request nginx asks an SSO service (Authelia, oauth2-proxy, authentik…) whether the visitor is signed in; if not, they're sent to its sign-in page",
            ],
          ]}
        />
        <Steps>
          <P>
            Pick <UI>Password</UI>, press <UI>Add an account</UI>, and type a
            name and a password for each person.
          </P>
          <P>
            Turn on HTTPS for the site: browsers send the password with every
            request.
          </P>
          <P>Save. The browser now asks before showing anything.</P>
        </Steps>
        <P>
          Saved passwords are never shown again: the box says <UI>Unchanged</UI>
          ; type in it only to set a new one. A renamed account needs a new
          password.
        </P>
        <P>
          For a sign-in service, press its name under <UI>Start from</UI> to
          fill the usual addresses, then change them to yours:{" "}
          <UI>Check address</UI> is where the service answers each check as the
          proxy's server reaches it, <UI>Sign-in page</UI> where visitors go to
          sign in, and <UI>Pass these headers to the app</UI> who signed in (the
          app can trust them: visitors can't send their own).
        </P>
        <List>
          <li>
            A path marked <UI>No login</UI> on <UI>Routing</UI> stays open, e.g.{" "}
            <C>/api/webhook</C> or <C>/health</C>.
          </li>
          <li>
            <UI>No login from the Always let in list</UI>: visitors from the
            addresses in <UI>Security</UI> (your office, your VPN) come straight
            in; everyone else signs in.
          </li>
        </List>
        <Warn>
          A sign-in service needs nginx's <C>auth_request</C> module. The tab
          says so when the proxy's nginx lacks it; install the nginx.org package
          or your distro's <C>nginx-extras</C>.
        </Warn>
      </>
    ),
  },
  {
    id: "routing",
    title: "Paths and headers",
    body: (
      <>
        <P>
          The <UI>Routing</UI> tab holds rules for parts of the site. Each path
          row has how it matches, the path, and what happens:
        </P>
        <Table
          head={["Match", "Covers"]}
          rows={[
            [
              <UI key="s">Starts with</UI>,
              <>
                <C>/api/</C> covers <C>/api/users</C> and everything under it
              </>,
            ],
            [
              <UI key="e">Is exactly</UI>,
              <>
                Only <C>/xmlrpc.php</C> itself; wins over any other rule
              </>,
            ],
            [
              <UI key="r">Matches pattern</UI>,
              <>
                A regular expression, e.g. <C>\.(php|asp)$</C>
              </>,
            ],
          ]}
        />
        <Table
          head={["Action", "What happens"]}
          rows={[
            [
              <UI key="p">Send to an app</UI>,
              <>
                Passed on to another address. <UI>Drop the path</UI> sends{" "}
                <C>/api/users</C> on as <C>/users</C>
              </>,
            ],
            [
              <UI key="r">Redirect</UI>,
              "Sends visitors to another address, with the redirect kind",
            ],
            [
              <UI key="f">Serve files</UI>,
              "Files from a folder on the proxy's server",
            ],
            [
              <UI key="b">Block</UI>,
              "Refused with 403, 404, 410 or 444 (connection closed)",
            ],
            [
              <UI key="a">Answer with</UI>,
              <>
                A fixed status and text, e.g. <C>200</C> <C>ok</C> for a health
                check, without touching the app
              </>,
            ],
          ]}
        />
        <P>
          Header rows add a header to what visitors get back or to what the app
          receives. On a proxy host, <UI>Remove from the app's answer</UI>{" "}
          strips a header the app sends, e.g. <C>X-Powered-By</C> or{" "}
          <C>Server</C>, so it never reaches visitors.
        </P>
        <Example title="An API, a health check and a blocked file">
          <P>
            <UI>Starts with</UI> <C>/api/</C> → <UI>Send to an app</UI>{" "}
            <C>http://127.0.0.1:8080</C> with <UI>Drop the path</UI>;{" "}
            <UI>Is exactly</UI> <C>/health</C> → <UI>Answer with</UI> <C>200</C>{" "}
            <C>ok</C>, marked <UI>No login</UI> so the monitor needs no
            password; <UI>Is exactly</UI> <C>/xmlrpc.php</C> → <UI>Block</UI>{" "}
            <C>403</C>.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "pages",
    title: "Maintenance and error pages",
    body: (
      <>
        <P>
          <UI>Maintenance</UI> on the <UI>Pages</UI> tab shows visitors a simple
          “back soon” page (status 503) while you work on the app; the site's
          other settings stay as they are. <UI>Still let in</UI> lists addresses
          that see the real site, so you can test before turning it off.{" "}
          <UI>Back in about</UI> tells browsers and search engines when to try
          again, so rankings aren't hurt.
        </P>
        <P>
          <UI>Error pages</UI> replace nginx's plain ones. Add a page, tick the
          statuses it's for (each status can have one page), and give it a title
          and a short message. The first page starts with 502 and 504, what
          visitors see when the app is down or too slow.
        </P>
        <List>
          <li>
            By default the pages show only for the proxy's own errors.{" "}
            <UI>Also for the app's own errors</UI> (proxy hosts) shows them when
            the app itself answers with one of the statuses too.
          </li>
          <li>
            While maintenance is on, 503 belongs to it and can't have its own
            page.
          </li>
        </List>
        <Warn>
          Leave <UI>Also for the app's own errors</UI> off for apps with an API:
          an API that explains a 404 or 400 in its answer loses that text.
        </Warn>
      </>
    ),
  },
  {
    id: "hardening",
    title: "Hardening",
    body: (
      <>
        <P>
          <UI>Hardening</UI> on the <UI>Security</UI> tab refuses requests only
          scanners and bots send, before they reach the app:
        </P>
        <Table
          head={["Switch", "Refuses"]}
          rows={[
            [
              <UI key="h">Hidden files</UI>,
              <>
                <C>/.env</C>, <C>/.git</C>, <C>/.htaccess</C>… (
                <C>/.well-known</C> stays open for certificates)
              </>,
            ],
            [
              <UI key="b">Backups and dumps</UI>,
              <>
                Files ending in <C>.bak</C>, <C>.old</C>, <C>.sql</C>,{" "}
                <C>.swp</C>, <C>~</C>
              </>,
            ],
            [
              <UI key="s">Known scanners</UI>,
              "sqlmap, nikto, masscan, zgrab… by the name they send",
            ],
            [
              <UI key="a">AI crawlers</UI>,
              "GPTBot, ClaudeBot, CCBot, Bytespider… that collect pages for AI training",
            ],
            [
              <UI key="p">Common probes</UI>,
              <>
                <C>/wp-admin</C>, <C>/phpmyadmin</C>, <C>/cgi-bin</C>… Off for a
                site that really has them
              </>,
            ],
            [
              <UI key="m">Only these request methods</UI>,
              "Everything except the ticked methods (GET is always allowed)",
            ],
          ]}
        />
        <P>
          <UI>Answer</UI> picks what they get: <C>404</C> (looks like any
          missing page, the default), <C>403</C>, or <C>444</C> (the connection
          is closed with no answer).
        </P>
        <Recommended
          rows={[
            {
              setting: "Hidden files, Backups, Known scanners",
              value: "On",
              why: "Safe for almost every site",
            },
            {
              setting: "Only these request methods",
              value: "GET, HEAD, POST, OPTIONS",
              why: "For plain websites; APIs also need PUT, PATCH and DELETE",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "catch-all",
    title: "Names no site has",
    body: (
      <>
        <P>
          A request for a name none of the proxy's sites has (the server's IP,
          an old domain still pointing at it) lands on whichever site nginx
          takes as the default, often the first one. To stop that, add a{" "}
          <UI>404 host</UI> with <UI>Answer every other name too</UI> on: it
          needs no domains and answers every unknown name with 404, 410 or 444.
        </P>
        <List>
          <li>A proxy can have one such site.</li>
          <li>
            If a site written by hand on the server already does this (
            <C>default_server</C>, like nginx's stock{" "}
            <C>sites-enabled/default</C>), saving moves the role to Morcheh's
            site. Morcheh takes only the word <C>default_server</C> off that
            file's <C>listen</C> lines on ports 80 and 443 (a copy is kept), in
            the same change that adds its own site, tested with <C>nginx -t</C>;
            if the test fails, everything is put back.
          </li>
          <li>
            When the site stops answering other names, is turned off or removed,
            or the proxy is removed from Morcheh, the word goes back. A file
            someone edited by hand in the meantime is left as it is, and the
            change says so.
          </li>
          <li>
            <C>444</C> is the quietest: scanners going through IP addresses get
            nothing at all.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "config",
    title: "The config file",
    body: (
      <>
        <P>
          The <UI>Config</UI> tab shows the file Morcheh writes for the site,
          made from the other tabs and updated as you change them. Nothing is
          sent to the server until you save.
        </P>
        <List>
          <li>
            <UI>Test on the server</UI> runs <C>nginx -t</C> on the proxy's
            server with this file and every other site in place, then puts the
            old files back. Nothing is saved or reloaded. If nginx refuses it,
            its message is shown, and <UI>Go to line</UI> jumps to the line it
            names.
          </li>
          <li>
            The copy button copies the whole file, e.g. to keep it or to compare
            it with another server.
          </li>
        </List>
        <P>
          <UI>Edit by hand</UI> is for what the tabs can't express (a <C>map</C>
          , several <C>location</C> blocks with their own rules, a module's
          directives). It starts from the generated file. From then on, Morcheh
          writes your text exactly as it is, and the tab shows <UI>By hand</UI>.
        </P>
        <Steps>
          <P>
            Open <UI>Config</UI>, press <UI>Edit by hand</UI> and confirm.
          </P>
          <P>
            Change the file. Unclosed <C>{"{"}</C> blocks and quotes are flagged
            as you type.
          </P>
          <P>
            Press <UI>Test on the server</UI> until nginx accepts it, then{" "}
            <UI>Save</UI>.
          </P>
        </Steps>
        <Warn>
          At your own risk: while the file is written by hand, HTTPS, Security,
          Login, Routing, Pages and Advanced don't change it, and Morcheh
          doesn't check what's in it, only that nginx accepts it. A file nginx
          refuses is never loaded (every save is still tested), but one it
          accepts can still send visitors to the wrong place.
        </Warn>
        <Tip>
          Keep the <C>access_log</C> and <C>error_log</C> lines as they are:
          live traffic and the <UI>Logs</UI> tab read those files. Keep each
          domain from <UI>General</UI> in <C>server_name</C> too: the domains
          there only name the site in lists, the file decides what's answered.
          The tab reminds you when either is missing.
        </Tip>
        <P>
          <UI>Use the generated one</UI> drops your text; once you save, the
          file is made from the other tabs again. Lines starting with{" "}
          <C>MORCHEH_</C> or holding <C>@@morcheh-</C> are refused: Morcheh uses
          them for itself.
        </P>
        <P>
          People who can only view the site (Viewer, Operator) don't see a
          hand-written file, like header values.
        </P>
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
        <P>
          At the top, <UI>Default site</UI> says who answers names no site has
          and visits by the server's IP address: a site of Morcheh's, a
          hand-written one (tagged <UI>Default</UI> in the list), or nobody, in
          which case nginx uses the first site it reads.{" "}
          <UI>Manage in Morcheh</UI> (Engineer) opens a new 404 host with{" "}
          <UI>Answer every other name too</UI> on; saving it takes the role
          over, as{" "}
          <See guide="reverse-proxy" section="catch-all">
            Names no site has
          </See>{" "}
          explains. That is the only change Morcheh makes to hand-written files.
        </P>
        <Steps>
          <li>
            Open the proxy, tab <UI>On the server</UI>.
          </li>
          <li>
            In <UI>Default site</UI>, press <UI>Manage in Morcheh</UI> (or{" "}
            <UI>Set up a default site</UI> when nothing holds it).
          </li>
          <li>
            Pick the answer (<C>444</C> closes the connection, the quietest) and
            save.
          </li>
        </Steps>
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
            [
              "Add stream says streams aren't available",
              "nginx's stream module is missing or not wired in: press Set up on the proxy, which installs and includes it",
            ],
            [
              "A stream doesn't answer from outside",
              "Open its port in the server's firewall, and check Who can reach it (Security tab)",
            ],
            [
              "A stream's port is in use",
              "Another program (or another stream) already listens there: pick a free port",
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
