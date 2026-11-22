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

export const dns: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <UI>DNS</UI> manages your domains' records on{" "}
          <UI>Technitium DNS Server</UI>, from Morche. Connect as many
          Technitium servers as you run (say <C>ns1</C> and <C>ns2</C>) and see
          every zone on all of them in one list: which server holds it, whether
          it's the editable Primary or a copied Secondary, and whether the
          copies agree.
        </P>
        <P>
          Morche talks to each server through Technitium's HTTP API with an API
          token. Nothing is installed on the DNS server, and what you change
          here is what Technitium's own console shows, and the other way round.
        </P>
        <Table
          head={["Page", "What you do there"]}
          rows={[
            [
              <UI key="z">DNS › Zones</UI>,
              "Every zone on every server, with its copies, serial and problems",
            ],
            [
              <UI key="s">DNS › Servers</UI>,
              "The connected servers and their status",
            ],
            [
              "A server's page",
              "Its zones; New zone, zone settings, enable/disable, delete",
            ],
            ["A zone's page", "Its records: add, edit, disable, delete"],
          ]}
        />
      </>
    ),
  },
  {
    id: "connect",
    title: "Connect a DNS server",
    body: (
      <>
        <P>
          First make an API token in Technitium. Use a user of its own (for
          example <C>morche</C>) so the token can be cut off without touching
          anyone's login.
        </P>
        <Steps>
          <P>
            In Technitium's console, open the user menu (top right) ›{" "}
            <UI>Create API Token</UI>. Name it <C>morche</C> and copy the token.
          </P>
          <P>
            In Morche open <UI>DNS</UI> and press <UI>Add DNS server</UI>.
          </P>
          <P>
            Fill in a <UI>Name</UI>, the <UI>Address</UI> of the console (e.g.{" "}
            <C>https://ns1.example.com:53443</C>, or <C>http://10.0.0.5:5380</C>{" "}
            on a private network) and paste the <UI>API token</UI>.
          </P>
          <P>
            Press <UI>Test connection</UI>: it shows the Technitium version and
            the number of zones without saving anything. Then <UI>Add</UI>.
          </P>
        </Steps>
        <P>
          Repeat for each server. The token is stored encrypted on Morche's side
          and is never shown again; to change it, use <UI>Edit connection</UI>{" "}
          and paste a new one (blank keeps the old one).
        </P>
        <Recommended
          rows={[
            {
              setting: "Address",
              value: <C>https://…:53443</C>,
              why: "Over plain http the token travels unencrypted. Fine inside a private network, not across the internet.",
            },
            {
              setting: "Accept a self-signed certificate",
              value: "Only for a self-signed console",
              why: "Turns off the certificate check for this server only. Better: give the console a real certificate.",
            },
            {
              setting: "Allow a private address",
              value: "When the server is on your LAN",
              why: "Addresses like 10.x, 192.168.x and 127.0.0.1 are refused unless this is on. Only an admin can turn it on.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "status",
    title: "Server status",
    body: (
      <>
        <P>
          Morche checks every DNS server by itself every 30 seconds, even when
          nobody has the panel open, and the pages pick up the result every 10
          seconds. Press <UI>Check</UI> on a server's page to check right now. A
          server that's down gets a red count on <UI>DNS</UI> in the menu.
        </P>
        <Table
          head={["Status", "Meaning"]}
          rows={[
            ["Online", "The API answered with this token"],
            [
              "Token refused",
              "The token is wrong, expired or deleted: paste a new one",
            ],
            [
              "Unreachable",
              "No answer: server down, wrong address or port, firewall",
            ],
            [
              "TLS error",
              "The certificate isn't trusted (self-signed or wrong name)",
            ],
            [
              "Address not allowed",
              "A private address without Allow a private address",
            ],
            ["Not checked", "Just added; the first check is on its way"],
          ]}
        />
      </>
    ),
  },
  {
    id: "zones",
    title: "Zones",
    body: (
      <>
        <P>
          A zone is a domain the server answers for, like <C>example.com</C>.
          Press <UI>New zone</UI>, pick the server (when you have more than
          one), type the domain and choose the type:
        </P>
        <List>
          <li>
            <UI>Primary</UI>: the server holds the records and you edit them
            here.
          </li>
          <li>
            <UI>Secondary</UI>: a read-only copy pulled from a primary server by
            zone transfer. Give the primary's IP addresses.
          </li>
        </List>
        <P>
          Under <UI>DNS › Zones</UI> each zone shows the servers that hold it. A
          row opens the Primary copy. <UI>Out of sync</UI> means the copies have
          different serials: a Secondary hasn't picked up the last change yet,
          or can't.
        </P>
        <P>
          A zone's ⋯ menu has <UI>Zone settings</UI> (who may copy it, who is
          told about changes), <UI>Disable zone</UI> (the server stops answering
          for it but keeps the records), <UI>Copy again from primary</UI> on a
          Secondary, and <UI>Delete zone</UI>.
        </P>
        <Warn>
          Deleting a zone deletes all its records on that server. A Secondary
          elsewhere keeps its copy until it expires.
        </Warn>
      </>
    ),
  },
  {
    id: "records",
    title: "Records",
    body: (
      <>
        <P>
          Open a zone to see its records, the zone's own ones (<C>@</C>) first.
          Filter by type with the chips, or search names, values and notes.
          Press <UI>Add record</UI>, or click a record to edit it.
        </P>
        <P>
          Names are typed inside the zone: <C>@</C> or empty is the zone itself,{" "}
          <C>www</C> becomes <C>www.example.com</C>. A name ending in a dot is
          taken as written.
        </P>
        <Table
          head={["Type", "Use it for"]}
          rows={[
            ["A / AAAA", "Point a name at an IPv4 / IPv6 address"],
            ["CNAME", "Make a name an alias of another (not at @)"],
            ["ANAME", "An alias that works at @, e.g. to a load balancer"],
            ["MX", "Mail servers, with a preference (lower is tried first)"],
            ["TXT", "SPF, DKIM, site verification"],
            [
              "NS",
              "Which servers answer for the zone, or a delegated subdomain",
            ],
            ["SRV", "Service location: priority, weight, port, target"],
            ["CAA", "Which certificate authorities may issue for the domain"],
            ["PTR", "Reverse lookup, in in-addr.arpa zones"],
          ]}
        />
        <P>
          <UI>Disable</UI> keeps a record but stops it being served: handy to
          switch an address off and back on. The <UI>Note</UI> is stored on the
          DNS server, so it shows in Technitium's console too. Records of types
          Morche doesn't edit (SOA, DNSSEC records…) are listed and can be
          copied, but are changed in Technitium.
        </P>
        <Example title="Point a website at a new server">
          <Steps>
            <P>
              Open the zone <C>example.com</C> and filter by <UI>A</UI>.
            </P>
            <P>
              Click the <C>www</C> record, change the value to the new address
              and lower the <UI>TTL</UI> to <C>5 min</C> a day before a move, so
              caches let go quickly.
            </P>
            <P>Save. Put the TTL back to 1 h once everything works.</P>
          </Steps>
        </Example>
        <Example title="Allow Let's Encrypt only">
          <P>
            Add a <C>CAA</C> record at <C>@</C> with tag <C>issue</C> and value{" "}
            <C>letsencrypt.org</C>.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "secondary",
    title: "ns1 and ns2: a Primary with a Secondary",
    body: (
      <>
        <P>
          The usual setup for a domain is two name servers: records are edited
          on one (Primary) and copied to the other (Secondary).
        </P>
        <Steps>
          <P>
            On the Primary server, make sure the zone's <C>NS</C> records at{" "}
            <C>@</C> list both servers (e.g. <C>ns1.example.com</C> and{" "}
            <C>ns2.example.com</C>).
          </P>
          <P>
            In the zone's settings on the Primary keep{" "}
            <UI>Who may copy this zone</UI> on{" "}
            <UI>Only the zone's name servers</UI>, or add ns2's address with{" "}
            <UI>Name servers and these addresses</UI>.
          </P>
          <P>
            Press <UI>New zone</UI>, pick ns2, type the same domain, choose{" "}
            <UI>Secondary</UI> and give ns1's IP address.
          </P>
          <P>
            The zone shows on both servers under <UI>DNS › Zones</UI>; once the
            serials match it's no longer <UI>Out of sync</UI>.
          </P>
          <P>
            At your domain registrar, set the domain's name servers to{" "}
            <C>ns1.example.com</C> and <C>ns2.example.com</C> (with glue records
            when they're inside the domain itself).
          </P>
        </Steps>
        <Tip>
          With <UI>Tell about changes</UI> on the zone's name servers, ns1 tells
          ns2 the moment a record changes, so the copy follows in seconds
          instead of waiting for the SOA refresh.
        </Tip>
      </>
    ),
  },
  {
    id: "arvancloud",
    title: "ArvanCloud domains and CDN",
    body: (
      <>
        <P>
          Besides Technitium servers, a DNS connection can be an{" "}
          <UI>ArvanCloud</UI> account. Its domains show up as zones next to the
          others, and each domain's page has its DNS records plus the CDN:
          traffic, HTTPS, caching, the www redirect and file optimisation.
        </P>
        <Steps>
          <P>
            In the ArvanCloud panel make an API key (Profile › Machine users or
            API keys) with access to CDN. A key that can only read is enough to
            look around.
          </P>
          <P>
            In Morche open <UI>DNS</UI> › <UI>Add DNS server</UI>, pick{" "}
            <UI>ArvanCloud</UI>, paste the key (with or without <C>Apikey</C>)
            and press <UI>Test connection</UI>.
          </P>
          <P>
            Leave <UI>Allow changes from Morche</UI> off to start read only.
            Turn it on (Owner) when you want to edit records and settings here.
          </P>
        </Steps>
        <Warn>
          Changes go straight to the live domains. A wrong record, or HTTPS
          turned off, takes a site down for everyone.
        </Warn>
        <Table
          head={["On a domain's page", "What it does"]}
          rows={[
            [
              "DNS records",
              "Add, edit and delete records. The CDN switch on A, AAAA, CNAME and ANAME records sends visitors through ArvanCloud (hides and protects the origin) or straight to the address. Several addresses on one name can be answered by weight, round robin or the visitor's country.",
            ],
            [
              "DNSSEC",
              "Turn it on, then give the DS record shown to your registrar.",
            ],
            [
              "Zone file",
              "Download the records as a BIND file, or add records from one.",
            ],
            [
              "Traffic",
              "Requests and data over 1 hour to 30 days, the share the cache answered, and the status codes.",
            ],
            [
              "HTTPS",
              "The certificate (a free one renews by itself), https redirect, HTTP/3, lowest TLS version, HSTS.",
            ],
            [
              "Caching",
              "Cache by path or path and query, how long to keep answers, development mode, Always online, cookies and query arguments that make separate copies.",
            ],
            [
              "Clear cache",
              "Empties the CDN cache: everything, or up to 50 addresses.",
            ],
            [
              "Firewall",
              "What happens when no rule matches (let in, challenge, block), and rules checked from the top: a name, a condition in ArvanCloud's filter language (the Add a condition helper writes it for country, address, path, host, user agent and method), and Let in / Challenge / Block / Skip protections.",
            ],
            [
              "WAF",
              "Off, Log only (records attacks, blocks nothing: start here) or Block; rule packages to add or turn off (the general set plus one for your app); path rules that let some paths through unchecked, like webhooks.",
            ],
            [
              "Rate limit",
              "Rules per path (/login, /api/*): so many requests a minute per visitor, then blocked for a while or challenged; methods counted, burst, addresses never limited; plus ArvanCloud's own flood detection.",
            ],
          ]}
        />
        <Tip>
          Rules are checked in order and the first match decides: move them with
          the arrows (or the ⋯ menu on a phone). Before setting the firewall's
          default to Block, add the Let in rules for your own addresses and
          tools.
        </Tip>
        <P>
          A new domain added from Morche (<UI>Add domain</UI>) stays{" "}
          <UI>Not active yet</UI> until its nameservers at the registrar are
          ArvanCloud's two (shown on the page, click to copy) or, for a CNAME
          setup, until the names point at ArvanCloud. <UI>Check now</UI> asks
          ArvanCloud to look again.
        </P>
        <Tip>
          Keep one connection per ArvanCloud account. Plans, billing, DDoS
          rules, page rules and load balancers stay in ArvanCloud's own panel (⋯
          › <UI>Open in ArvanCloud</UI>).
        </Tip>
      </>
    ),
  },
  {
    id: "proxy-sites",
    title: "DNS for reverse proxy sites",
    body: (
      <>
        <P>
          In a reverse proxy site's <UI>General</UI> tab, each domain shows what
          its DNS says when a zone Morche manages (Technitium or ArvanCloud)
          covers it: <UI>Points here</UI>, the address it points at instead, or
          that there's no record yet.
        </P>
        <P>
          <UI>Point it here</UI> changes the name's A (or AAAA) record to the
          proxy's server, or adds one. It needs Engineer access and a connection
          that allows changes; a name with a CNAME, or several addresses, is
          left for you to change in the zone.
        </P>
        <Tip>
          A name <UI>Through ArvanCloud CDN</UI> reaches the proxy from
          ArvanCloud's addresses. In the site's <UI>Advanced</UI> tab, under{" "}
          <UI>Behind a CDN or load balancer</UI>, press{" "}
          <UI>Use ArvanCloud's</UI>: logs, allow lists, countries and rate
          limits then see the real visitor (from the <C>AR-Real-IP</C> header).
        </Tip>
      </>
    ),
  },
  {
    id: "access",
    title: "Who can do what",
    body: (
      <>
        <P>
          DNS servers belong to a workspace, and access follows the workspace's
          levels (see <See guide="access" />
          ):
        </P>
        <Table
          head={["Level", "Can"]}
          rows={[
            ["Viewer", "See servers, zones, records and settings"],
            ["Operator", "Check servers, favorites, copy a Secondary again"],
            [
              "Operator",
              "ArvanCloud: check a domain's nameservers again, clear the CDN cache",
            ],
            [
              "Engineer",
              "Add, change and delete zones and records; ArvanCloud CDN settings",
            ],
            [
              "Owner",
              "Edit a server's connection (and Allow changes), remove it; remove a domain from ArvanCloud",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <Table
          head={["Problem", "What to do"]}
          rows={[
            [
              "Token refused",
              "Create a new token in Technitium and paste it with Edit connection. A token belongs to a user: deleting or disabling the user ends it.",
            ],
            [
              "Unreachable",
              "Open the address in a browser from where Morche runs. Technitium's console listens on 5380 (http) and 53443 (https) by default; check the firewall.",
            ],
            [
              "Couldn't read zones from …",
              "That server didn't answer while the zone list was built. The rest are still shown; open the server to see why.",
            ],
            [
              "Sync failed / Expired on a Secondary",
              "The Secondary can't copy from the primary: check the primary's address in its settings, Who may copy this zone on the primary, and port 53/TCP between them. Then Copy again from primary.",
            ],
            [
              "Out of sync for long",
              "Same checks as above; also make sure Tell about changes includes the Secondary.",
            ],
            [
              "A record can't be saved",
              "The message under the field comes from Technitium, e.g. a CNAME next to other records or at @ (use ANAME).",
            ],
          ]}
        />
      </>
    ),
  },
]
