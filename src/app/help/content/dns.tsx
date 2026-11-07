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
          <UI>Technitium DNS Server</UI>, from Morcheh. Connect as many
          Technitium servers as you run (say <C>ns1</C> and <C>ns2</C>) and see
          every zone on all of them in one list: which server holds it, whether
          it's the editable Primary or a copied Secondary, and whether the
          copies agree.
        </P>
        <P>
          Morcheh talks to each server through Technitium's HTTP API with an API
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
          example <C>morcheh</C>) so the token can be cut off without touching
          anyone's login.
        </P>
        <Steps>
          <P>
            In Technitium's console, open the user menu (top right) ›{" "}
            <UI>Create API Token</UI>. Name it <C>morcheh</C> and copy the
            token.
          </P>
          <P>
            In Morcheh open <UI>DNS</UI> and press <UI>Add DNS server</UI>.
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
          Repeat for each server. The token is stored encrypted on Morcheh's
          side and is never shown again; to change it, use{" "}
          <UI>Edit connection</UI> and paste a new one (blank keeps the old
          one).
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
          Morcheh checks every DNS server by itself every 30 seconds, even when
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
          Morcheh doesn't edit (SOA, DNSSEC records…) are listed and can be
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
            ["Engineer", "Add, change and delete zones and records"],
            ["Owner", "Edit a server's connection, remove it"],
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
              "Open the address in a browser from where Morcheh runs. Technitium's console listens on 5380 (http) and 53443 (https) by default; check the firewall.",
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
