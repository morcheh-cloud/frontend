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

export const cloud: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <UI>Cloud</UI> shows the servers you rent from a cloud provider,
          straight from the provider's API: their state, size, region and
          addresses, all accounts in one list. ArvanCloud is the first provider;
          more will follow.
        </P>
        <P>
          Connect as many accounts as you have API keys (one per company,
          project or team). Morche only reads them unless you turn on{" "}
          <UI>Allow changes from Morche</UI> for an account; then you can also
          turn servers on or off, restart and rename them from here.
        </P>
        <Table
          head={["Tab", "What you see there"]}
          rows={[
            [
              <UI key="s">Servers</UI>,
              "Every server of every account, with state, region, address and size",
            ],
            [
              <UI key="a">Accounts</UI>,
              "The first tab: a card per connected account with its status, servers at a glance, regions and read only or not. Click a card for the account's page",
            ],
          ]}
        />
        <Tip>
          A cloud server isn't the same as one of Morche's{" "}
          <See guide="servers">Servers</See>: Cloud is what the provider knows
          (power, size, addresses), Servers is what Morche reaches over SSH
          (terminal, files, monitoring). Use <UI>Add to Morche servers</UI> to
          have both.
        </Tip>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Connect an account",
    body: (
      <>
        <Steps>
          {[
            <P key="1">
              In the ArvanCloud panel open{" "}
              <UI>Profile › Access management › API keys</UI> and make a key.
              Give its access policy read access to <UI>Cloud Server</UI>; add
              actions only if you'll power servers from Morche.
            </P>,
            <P key="2">
              In Morche open <UI>Cloud</UI> and press <UI>Add account</UI> (or
              search “Add cloud account” with <C>Ctrl K</C>).
            </P>,
            <P key="3">
              Give it a name you'll recognise (say <C>Shop production</C>),
              paste the key and press <UI>Test connection</UI>. The test shows
              which regions answered and how many servers the key sees.
            </P>,
            <P key="4">
              Save. The servers appear on the <UI>Servers</UI> tab within a few
              seconds.
            </P>,
          ]}
        </Steps>
        <P>
          The key is stored encrypted and never shown again; the list only shows
          its last characters. To replace it, open the account's <UI>Edit</UI>{" "}
          and paste a new one; leaving the field blank keeps the saved key.
          Adding, editing and removing accounts needs <UI>Owner</UI> on the
          workspace.
        </P>
        <P>
          Removing an account only makes Morche forget it: nothing changes at
          the provider, and servers you added to Morche's Servers stay there.
        </P>
      </>
    ),
  },
  {
    id: "allow-changes",
    title: "Read only or changes allowed",
    body: (
      <>
        <P>
          Every account starts read only. Morche then sends nothing but reads to
          the provider, even if the key itself would allow more. The account
          shows a <UI>Read only</UI> tag and server menus have no power or
          rename items.
        </P>
        <P>
          Turn on <UI>Allow changes from Morche</UI> in the account's settings
          to get <UI>Turn on</UI>, <UI>Turn off</UI>, <UI>Restart</UI> and{" "}
          <UI>Rename</UI>. The key's own access policy still applies: if it
          lacks the action, the provider refuses and Morche says so.
        </P>
        <Recommended
          rows={[
            {
              setting: "Production accounts",
              value: "Read only",
              why: "Nobody can switch a live server off from Morche by mistake. Turn it on for a moment when you need it.",
            },
            {
              setting: "Test and staging accounts",
              value: "Changes allowed",
              why: "Restarting and powering test machines from here saves a trip to the provider's panel.",
            },
            {
              setting: "The key's access policy",
              value: "Read, plus actions only if needed",
              why: "Two locks are better than one: Morche's switch and the key's own permissions.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "servers",
    title: "The servers list",
    body: (
      <>
        <P>
          The list reads every region of every account and refreshes by itself
          every 30 seconds (every 5 while a server is starting, stopping or
          restarting). The refresh icon reads again from the provider right
          away.
        </P>
        <List>
          <li>
            Search finds a server by name, address, region, plan or system.
          </li>
          <li>
            <UI>Account</UI> and <UI>State</UI> narrow the list; the state menu
            shows how many servers each state has.
          </li>
          <li>
            Click a name (on phones, tap the row) for its details: every address
            with a copy button, size, plan, system, SSH key, backups and its ID
            at the provider.
          </li>
          <li>
            Click an address to copy it. <UI>In Morche</UI> links to the
            matching Morche server when there is one (same address).
          </li>
        </List>
        <Table
          head={["State", "Meaning"]}
          rows={[
            [<UI key="r">Running</UI>, "On and running"],
            [<UI key="o">Off</UI>, "Shut off; disks and addresses are kept"],
            [
              <UI key="b">Building</UI>,
              "Being created or changed at the provider",
            ],
            [<UI key="a">Archived</UI>, "Shelved by the provider"],
            [<UI key="e">Error</UI>, "The provider reports a fault"],
          ]}
        />
      </>
    ),
  },
  {
    id: "account-page",
    title: "An account's page",
    body: (
      <>
        <P>
          Click an account's card (on phones, tap it) to open its page: what the
          provider says about that account, read straight from its API. The page
          is split into tabs, each with its count; on phones they are a row of
          chips under the title. The tab you're on is part of the address, so a
          link opens on the same tab.
        </P>
        <Table
          head={["Tab", "What it shows"]}
          rows={[
            [
              <UI key="o">Overview</UI>,
              "A strip of the servers coloured by state, totals (servers running, processors, memory, storage), Needs a look (servers in error or busy, disks not attached, backup schedules at their limit, running servers without backups or not in Morche; each opens the right tab), a tile per resource, the servers at a glance, regions and operating systems",
            ],
            [
              <UI key="s">Servers</UI>,
              "A card per server: state, address (copy button), size and where it runs. Search and filter by All, Running, Off or Not in Morche. Its menu has the same actions as the servers list",
            ],
            [
              <UI key="d">Disks</UI>,
              "Extra disks: size, type and the server they're attached to. Not attached shows disks no server uses: they're still billed",
            ],
            [
              <UI key="f">Firewalls</UI>,
              "Your firewall groups and the provider's built-in ones, with their rule count. ArvanCloud repeats the same group in each zone; those are shown once, with every zone it's in",
            ],
            [
              <UI key="n">Networks</UI>,
              "The account's own private networks and their ranges (the provider's public networks are left out)",
            ],
            [
              <UI key="b">Backups</UI>,
              "The provider's backup schedules (which server, next copy, copies kept), then running servers nothing backs up, with Schedule a copy (a Morche cron job) once the server is in Morche",
            ],
            [
              <UI key="t">Settings</UI>,
              "Connection (Check now), the API key's ending, whether Morche may change things, the account's details, and Remove account",
            ],
          ]}
        />
        <P>
          A tab the provider doesn't offer is left out. Servers refresh every 30
          seconds and the rest every minute. <UI>Read again</UI> (the arrows at
          the top) asks the provider for everything right now.
        </P>
        <Tip>
          Everything on this page is read only. Power and rename stay behind
          their own confirmations, only when the account has{" "}
          <UI>Allow changes from Morche</UI> on.
        </Tip>
      </>
    ),
  },
  {
    id: "power",
    title: "Turn on, turn off, restart, rename",
    body: (
      <>
        <P>
          On an account with changes allowed, a server's ⋯ menu and its details
          offer what fits its state: <UI>Restart</UI> and <UI>Turn off</UI> when
          running, <UI>Turn on</UI> when off. Turning off and restarting ask you
          to type the server's name first.
        </P>
        <P>
          The provider does the work; the row shows the provider's task (for
          example <UI>Powering on</UI> or <UI>Rebooting</UI>) until it's done,
          and no other change can be sent meanwhile.
        </P>
        <Table
          head={["Action", "Who"]}
          rows={[
            ["See accounts and servers", "Viewer"],
            ["Turn on, turn off, restart, check an account", "Operator"],
            ["Rename a server", "Engineer"],
            ["Add, edit, remove accounts", "Owner"],
          ]}
        />
        <Warn>
          Turning off stops everything on the server: sites and services go down
          until it's turned on again. Check you've picked the right account
          before you confirm.
        </Warn>
      </>
    ),
  },
  {
    id: "add-to-morche",
    title: "Add a cloud server to Morche",
    body: (
      <>
        <P>
          <UI>Add to Morche servers</UI> (server menu or details) opens the
          usual Add server form with the name, public address and a likely login
          user already filled in (<C>ubuntu</C> on Ubuntu, <C>debian</C> on
          Debian, otherwise <C>root</C>). Add the password or key and save.
        </P>
        <Example title="A new VPS, managed end to end">
          <Steps>
            {[
              <P key="1">
                The server shows on <UI>Cloud › Servers</UI> as soon as it's
                created at ArvanCloud.
              </P>,
              <P key="2">
                Open its menu › <UI>Add to Morche servers</UI>, paste the SSH
                key you gave it at the provider, save.
              </P>,
              <P key="3">
                Its row now shows <UI>In Morche</UI>: terminal, files, packages
                and monitoring live there, power and size stay here.
              </P>,
            ]}
          </Steps>
        </Example>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <Table
        head={["What you see", "What to do"]}
        rows={[
          [
            <UI key="1">Key refused</UI>,
            "The key was deleted, expired or mistyped. Make a new one at the provider and paste it in the account's Edit.",
          ],
          [
            "Connected but no servers",
            "The key works but its access policy doesn't cover Cloud Server (or this account has none). Check the key's policy in ArvanCloud's access management.",
          ],
          [
            "Couldn't read a region",
            "That region didn't answer; the others are still shown. It usually clears by itself on the next read.",
          ],
          [
            <UI key="4">Unreachable</UI>,
            "Morche's machine can't reach the provider's API. Check its internet access and DNS.",
          ],
          [
            "No power or rename items",
            "The account is read only, or your role is too low. An owner turns on Allow changes from Morche.",
          ],
          [
            "Couldn't read firewalls / disks of a region",
            "The account page shows the rest; the key's access policy may not cover that part, or the region didn't answer. Read again later.",
          ],
          [
            "“Doesn't share disks, firewalls or networks yet”",
            "That provider's resources aren't read by Morche yet; only its servers are shown.",
          ],
          [
            "“The server is busy”",
            "Another change is still running at the provider. Wait until the row stops showing it.",
          ],
        ]}
      />
    ),
  },
]
