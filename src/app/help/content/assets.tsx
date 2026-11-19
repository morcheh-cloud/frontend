import {
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

export const assets: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          <UI>Assets</UI> is one inventory of everything the organisation owns
          or pays for, with who answers for each thing, how much it matters,
          what it costs and when it expires. It follows the asset-inventory
          parts of ISO 27001 (A.5.9–5.12), CIS Controls 1 and 2 and ITIL's
          configuration management, kept light.
        </P>
        <List>
          <li>
            <UI>Managed by Morche</UI>: every server, Proxmox cluster, cloud
            account, database, storage, compose project, installed application,
            web service, DNS server, reverse proxy and site shows up by itself
            and stays in step. You only add the owner, criticality and so on.
          </li>
          <li>
            <UI>Entered by hand</UI>: hardware (laptops, rack servers, switches,
            phones…), licences, subscriptions, contracts, domains, certificates,
            VMs and cloud resources Morche doesn't manage, anything else.
          </li>
        </List>
        <P>
          The section has six pages: <UI>Inventory</UI>, <UI>Coverage</UI>{" "}
          (what's missing), <UI>Discovery</UI> (what isn't listed yet),{" "}
          <UI>Map</UI> (what depends on what), <UI>Owners</UI> and{" "}
          <UI>Settings</UI>.
        </P>
      </>
    ),
  },
  {
    id: "add",
    title: "Adding an asset",
    body: (
      <>
        <Steps>
          {[
            <>
              Open <UI>Assets</UI> and press <UI>Add asset</UI> (phone:{" "}
              <UI>+</UI>), then pick the kind.
            </>,
            <>
              Give it a name. The form asks only what that kind needs: a serial
              number and warranty for hardware, seats and a key for a licence,
              the registrar and expiry for a domain.
            </>,
            <>
              Set the <UI>Owner</UI> (a person or a group) and, if useful, a{" "}
              <UI>Deputy</UI> and who it's <UI>Assigned to</UI>.
            </>,
            <>
              Press <UI>Add asset</UI>. You land on its page.
            </>,
          ]}
        </Steps>
        <Tip>
          Don't add servers, databases and the like by hand: add them in their
          own section and the asset appears within seconds. Their name and kind
          come from Morche; everything else on the asset is yours to fill in.
        </Tip>
      </>
    ),
  },
  {
    id: "import",
    title: "Importing from a spreadsheet",
    body: (
      <>
        <P>
          Save the sheet as CSV, then <UI>Inventory</UI> › <UI>⋯</UI> ›{" "}
          <UI>Import from CSV</UI>. Drop the file or paste the rows. The first
          row names the columns; each row is checked before anything is added,
          and rows with problems can be left out.
        </P>
        <Example title="A minimal sheet">
          <P>
            name, kind, category, owner, vendor, serial_number, warranty_until
            <br />
            Sara's laptop, hardware, Laptop, sara, Lenovo, PF3XK2, 2028-02-10
          </P>
        </Example>
        <P>
          <UI>owner</UI> takes a username, a person's name or a group name.
          Dates are written 2027-03-31; tags are separated by “;”. Export works
          the other way: <UI>⋯</UI> › <UI>Export as CSV</UI> (what the filters
          show, or what you ticked).
        </P>
      </>
    ),
  },
  {
    id: "owners",
    title: "Owners, deputies and owner rules",
    body: (
      <>
        <P>
          The owner is who answers for the asset: they get its reminders, they
          confirm its reviews.{" "}
          <strong>Owning grants no access in Morche</strong>: what someone may
          do still comes from their access level.
        </P>
        <P>
          Setting owners one by one gets old fast. <UI>Owners</UI> › Owner rules
          give an owner to every asset that has none of its own: match by kind,
          tag (a server's own tags count), environment or name (<UI>db-*</UI>).
          The first rule that matches wins; each rule shows how many assets it
          takes, and the page says how many still end up with nobody.
        </P>
        <Example title="Common rules">
          <List>
            <li>Kinds: Databases → owner: the DBA group.</li>
            <li>Tag payments → owner: the payments team, deputy: its lead.</li>
            <li>Kinds: Hardware → owner: IT support.</li>
          </List>
        </Example>
        <P>
          When an owner's account is blocked, their assets show{" "}
          <UI>Owner left</UI> on <UI>Coverage</UI>: give them to someone else in
          one go with <UI>Give them an owner</UI>.
        </P>
      </>
    ),
  },
  {
    id: "classification",
    title: "Environment, criticality and data",
    body: (
      <>
        <Table
          head={["Field", "Meaning"]}
          rows={[
            [
              <UI key="e">Environment</UI>,
              "Production, staging, development or test.",
            ],
            [
              <UI key="c">Criticality</UI>,
              "Tier 1 (the business stops without it) to tier 4 (nice to have).",
            ],
            [
              <UI key="d">Data it holds</UI>,
              "Public, internal, confidential or restricted (personal, financial, secret).",
            ],
            [
              <UI key="l">Lifecycle</UI>,
              "Planned, active, in maintenance, being phased out, retired. Retired assets drop out of totals and checks but keep their record.",
            ],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "Criticality",
              value: "Set it on everything in production",
              why: "Coverage counts it, and it tells the on-call person what to fix first.",
            },
            {
              setting: "Retire, don't delete",
              value: "Lifecycle › Retired",
              why: "The history stays for audits; deleting removes it.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "notes",
    title: "Notes",
    body: (
      <>
        <P>
          Each asset has a <UI>Notes</UI> tab: what the next person should know,
          who to call, how it's set up, what went wrong last time. Notes are
          written in Markdown (lists, <UI>code</UI>, links, tables), each shows
          who wrote and last changed it, and pinned ones show on the asset's{" "}
          <UI>Overview</UI>.
        </P>
        <Steps>
          {[
            <>
              Open the asset, then the <UI>Notes</UI> tab.
            </>,
            <>
              Click the box and write. Add a title if you like; <UI>Preview</UI>{" "}
              shows how it looks.
            </>,
            <>
              Press <UI>Add note</UI> (or Ctrl+Enter). Edit, pin or delete a
              note from its <UI>⋯</UI> menu.
            </>,
          ]}
        </Steps>
        <P>
          Everyone who sees the asset reads its notes. Operators on the
          workspace and the asset's owner, deputy or owning group write them.
          Adding or deleting a note shows in the asset's history.
        </P>
      </>
    ),
  },
  {
    id: "dates",
    title: "Dates, reminders and reviews",
    body: (
      <>
        <P>
          Expiry (licences, domains, contracts, subscriptions), warranty and
          certificate dates (a site's certificate comes from its uptime monitor)
          send reminders before they pass: by default 30, 7 and 1 days before,
          and once more when a date has passed. Change the days and channels in{" "}
          <UI>Settings</UI>; an asset can add channels of its own.
        </P>
        <P>
          <UI>Ask the owner to confirm it</UI> every month, quarter, half year
          or year: when it's due, a reminder goes out and the asset shows{" "}
          <UI>Review overdue</UI> until its owner, deputy, a member of the
          owning group or an Operator presses <UI>Confirm</UI>. This is the
          periodic review auditors ask for (ISO 27001, SOC 2).
        </P>
        <See guide="alerts" section="add">
          Alert channels
        </See>
      </>
    ),
  },
  {
    id: "coverage",
    title: "Coverage: what needs a look",
    body: (
      <>
        <P>
          <UI>Coverage</UI> scores the inventory and lists every problem with
          the assets it affects:
        </P>
        <List>
          <li>No owner, owner left, review overdue.</li>
          <li>
            Expired or expiring in 30 days; licences with more seats in use than
            bought.
          </li>
          <li>
            Servers whose operating system no longer (or soon won't) get
            security updates.
          </li>
          <li>
            Databases with no active backup plan; websites and web services no
            uptime monitor checks.
          </li>
          <li>
            Things Morche reports down, and linked assets whose source was
            removed.
          </li>
        </List>
        <P>
          Each card links to the inventory filtered to that problem. The{" "}
          <UI>Coming up</UI> column lists every date in the next 60 days.
        </P>
      </>
    ),
  },
  {
    id: "discovery",
    title: "Discovery: finding what isn't listed",
    body: (
      <>
        <P>
          Discovery reads only what Morche already reaches, with no network
          scans: the open ports of each online server, Proxmox clusters, cloud
          accounts and DNS servers. It finds:
        </P>
        <List>
          <li>
            Databases listening on a server (or in a container) that nobody
            added to Databases.
          </li>
          <li>Proxmox machines and cloud servers that aren't panel servers.</li>
          <li>Primary DNS zones not listed as domain assets.</li>
        </List>
        <P>For each finding you choose:</P>
        <Table
          head={["Action", "What happens"]}
          rows={[
            [
              <UI key="m">Add to Databases / Add as a server</UI>,
              "Opens that section's add form, filled in. Once added, Morche manages it, the asset appears by itself and the finding moves to Done on the next look.",
            ],
            [
              <UI key="t">Just list it</UI>,
              "Adds an asset entered by hand (an unmanaged database, a machine, a domain) without managing it.",
            ],
            [<UI key="i">Ignore</UI>, "Hides it; Bring back undoes that."],
          ]}
        />
        <P>
          It runs on a schedule (every day by default, <UI>Settings</UI>) and
          with <UI>Look now</UI> (Engineer). A database open to the internet is
          marked so.
        </P>
        <Warn>
          Reading open ports names every process only when Morche's login can
          use sudo without a password; otherwise some databases may be missed.
        </Warn>
      </>
    ),
  },
  {
    id: "relations",
    title: "Relations, impact and the map",
    body: (
      <>
        <P>
          Morche links what it sees: a database runs on a server, a site runs on
          a proxy and depends on the server it forwards to, a database backs up
          to a storage, a server runs on a Proxmox cluster. Add your own from an
          asset's <UI>Relations</UI> tab (runs on, uses, depends on, part of,
          licensed for…).
        </P>
        <P>
          The tab shows what the asset relies on, what relies on it, and{" "}
          <UI>If it goes down</UI>: who is affected. <UI>Map</UI> draws every
          relation; click an asset to light up its whole chain and see how many
          assets would be affected if it went down.
        </P>
      </>
    ),
  },
  {
    id: "owner-alerts",
    title: "Alerts to the owner's channels",
    body: (
      <P>
        Channels ticked under <UI>Also notify</UI> on a server's, database's or
        Proxmox cluster's asset also receive every alert rule notification about
        it, on top of the rule's own channels. Turn it off for the workspace in{" "}
        <UI>Settings</UI> › Owner alerts.
      </P>
    ),
  },
  {
    id: "access",
    title: "Who can do what",
    body: (
      <Table
        head={["Level on the workspace", "Can"]}
        rows={[
          ["Viewer", "See the inventory, coverage, map, owners and discovery."],
          ["Operator", "Also confirm reviews of any asset."],
          [
            "Engineer",
            "Add, edit, import, relate and delete assets; run discovery.",
          ],
          [
            "Owner",
            "Owner rules, settings, and see licence keys (each look is logged).",
          ],
        ]}
      />
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          <strong>A server isn't in the inventory.</strong> It's in another
          workspace: the inventory follows the workspace picked in the sidebar.
        </li>
        <li>
          <strong>I can't delete an asset.</strong> It mirrors something Morche
          manages: remove that in its own section, or set it to Retired.
        </li>
        <li>
          <strong>An asset says “Removed from Morche”.</strong> Its source was
          deleted. Delete the asset, or keep it as retired for the record.
        </li>
        <li>
          <strong>Discovery missed a database.</strong> The server must be
          online and its login able to read process names (sudo -n); a database
          in a container is matched by its published port.
        </li>
      </List>
    ),
  },
]
