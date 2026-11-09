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
              "Only the domains: every request gets 404 Not Found, so parked or retired names never fall through to another site",
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
          Only the tabs a site can use show up: a stream has no HTTPS, Paths or
          Headers, a 404 page has no Paths. A tab with something set shows it
          beside its name (<UI>HTTPS On</UI>, <UI>Headers 3</UI>); a red dot
          means a field there was refused when you saved, and Save takes you to
          it. The open tab is kept in the address (<C>?tab=security</C>), so a
          link can open a site straight on it.
        </P>
        <Table
          head={["Tab", "What's in it"]}
          rows={[
            [
              <UI key="g">General</UI>,
              "Domains, what the site does and where it goes, the note, and On/Off",
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
                (see Who can visit). <UI>Browser protections</UI>: switches for
                common safety headers (below); <UI>Hide the nginx version</UI>
              </>,
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
              <UI key="a">Advanced</UI>,
              "Compression, passing answers straight through, the visitor's real address behind a CDN, the PROXY protocol for streams, upload size and timeouts, and raw nginx lines (see Advanced options)",
            ],
            [
              <UI key="c">Config</UI>,
              "The whole file Morcheh writes for the site, tested on the server, and written by hand if you need to (see The config file)",
            ],
          ]}
        />
        <P>
          Each browser protection is an ordinary response header: turning it on
          adds the row to <UI>Headers</UI>, turning it off removes it. If you
          set one of them by hand with another value, the switch is on and shows
          that value.
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
          Paths, Headers and Advanced don't change it, and Morcheh doesn't check
          what's in it, only that nginx accepts it. A file nginx refuses is
          never loaded (every save is still tested), but one it accepts can
          still send visitors to the wrong place.
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
