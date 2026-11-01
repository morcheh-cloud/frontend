import {
  A,
  C,
  Code,
  Example,
  type GuideSection,
  List,
  P,
  Recommended,
  Steps,
  Table,
  Tip,
  UI,
  Warn,
} from "../components/prose"

export const servers: GuideSection[] = [
  {
    id: "add",
    title: "Adding a server",
    body: (
      <>
        <P>
          On <A href="/servers">Servers</A>, press <UI>Add server</UI> (the{" "}
          <UI>+</UI> button on a phone) and fill in:
        </P>
        <Table
          head={["Field", "What to enter"]}
          rows={[
            [
              <UI key="n">Name</UI>,
              "How the server shows up in Morcheh, e.g. web-1 or db-prod.",
            ],
            [
              <UI key="h">Host</UI>,
              <>
                An IP address or hostname. Paste a whole{" "}
                <C>ssh user@host -p 2222</C> command and the user and port are
                filled in too.
              </>,
            ],
            [<UI key="p">Port</UI>, "The SSH port, 22 unless you changed it."],
            [
              <UI key="u">Username</UI>,
              "The account Morcheh logs in as. Every feature runs as this user.",
            ],
            [
              <UI key="a">Authentication</UI>,
              <>
                <UI>Password</UI>, or <UI>Private key</UI> (paste it or load the
                file; add the <UI>Passphrase</UI> if the key has one). Both are
                stored encrypted; when editing, leave them blank to keep the
                saved one.
              </>,
            ],
            [
              <UI key="o">Folder, Tags, Notes</UI>,
              "Optional. Where it lives in the list, labels to filter by, and what runs there or who owns it.",
            ],
          ]}
        />
        <P>
          Press <UI>Test connection</UI> to try the login before saving. Morcheh
          then checks the server, detects its OS and trusts its host key (see{" "}
          <A href="#host-keys">Host keys</A>).
        </P>
      </>
    ),
  },
  {
    id: "recommended",
    title: "Recommended login setup",
    body: (
      <>
        <Recommended
          rows={[
            {
              setting: "Authentication",
              value: "Private key (ed25519)",
              why: "Can't be guessed, and lets you turn off SSH passwords entirely.",
            },
            {
              setting: "User",
              value: "A dedicated user, e.g. morcheh",
              why: "Its actions are easy to tell apart in logs, and you can revoke it alone.",
            },
            {
              setting: "sudo",
              value: "Without a password (sudo -n)",
              why: "Lets Morcheh see every port owner and crontab and manage fail2ban without logging in as root.",
            },
            {
              setting: "Key passphrase",
              value: "Optional",
              why: "Morcheh stores the key encrypted already; a passphrase adds a second secret to keep.",
            },
          ]}
        />
        <Example title="Create a key and a dedicated user">
          <P>On the server (as root, or with sudo):</P>
          <Code>{`
sudo adduser --disabled-password --gecos "" morcheh
echo 'morcheh ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/morcheh
sudo chmod 440 /etc/sudoers.d/morcheh
`}</Code>
          <P>On your computer, make a key and install it for that user:</P>
          <Code>{`
ssh-keygen -t ed25519 -C morcheh -f ~/.ssh/morcheh
ssh-copy-id -i ~/.ssh/morcheh.pub morcheh@203.0.113.10
`}</Code>
          <P>
            Then add the server with user <C>morcheh</C>, authentication{" "}
            <UI>Private key</UI>, and load <C>~/.ssh/morcheh</C> (the file
            without <C>.pub</C>).
          </P>
        </Example>
        <Warn>
          Password-less sudo gives that user full control of the server. Use it
          for a key-only account that nobody shares, never for a password login.
        </Warn>
      </>
    ),
  },
  {
    id: "status",
    title: "What each status means",
    body: (
      <>
        <Table
          head={["Status", "Meaning and fix"]}
          rows={[
            [
              <UI key="1">Online</UI>,
              "The last check logged in. The number beside it is the round trip in milliseconds.",
            ],
            [
              <UI key="2">Unreachable</UI>,
              "Nothing answered on the host and port: the server is down, the address or port is wrong, or a firewall drops the connection.",
            ],
            [
              <UI key="3">Auth failed</UI>,
              "The server answered but refused the credentials: wrong user, changed password, or the key isn't in that user's ~/.ssh/authorized_keys. Use Edit credentials.",
            ],
            [
              <UI key="4">Host key changed</UI>,
              "The server presented a different key from the one Morcheh trusted. Morcheh won't connect until you review it.",
            ],
            [
              <UI key="5">Error</UI>,
              "Something else went wrong; the message under the status says what.",
            ],
            [
              <UI key="6">Not checked</UI>,
              "Added but not checked yet. Press Check.",
            ],
          ]}
        />
        <P>
          When a server isn't online, every one of its pages shows a banner with
          the one action that fixes it: <UI>Check again</UI>,{" "}
          <UI>Edit credentials</UI> or <UI>Review key…</UI>.
        </P>
      </>
    ),
  },
  {
    id: "host-keys",
    title: "Host keys",
    body: (
      <>
        <P>
          Every SSH server has a host key that proves it is the same machine.
          Morcheh trusts the key the server presents on its first check and
          refuses to connect if it ever changes, which is what a
          man-in-the-middle would cause.
        </P>
        <P>
          A key also changes for harmless reasons: the server was reinstalled,
          rebuilt from an image, or the address now points at a new machine. If
          you know that happened, use <UI>Review key…</UI> (or{" "}
          <UI>Trust new host key…</UI> in the server's menu) and accept it.
        </P>
        <Example title="Check the fingerprint before trusting it">
          <P>
            From the provider's web console (not over SSH, which is what you are
            verifying), print the server's key fingerprint and compare it with
            the one Morcheh shows:
          </P>
          <Code>ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub</Code>
        </Example>
        <Warn>
          If you don't know why the key changed, don't trust it. Check with
          whoever runs the server or network first.
        </Warn>
      </>
    ),
  },
  {
    id: "organize",
    title: "Folders, tags and favorites",
    body: (
      <>
        <List>
          <li>
            <UI>Folders</UI> hold each server in one place, and nest. Use the
            folder rail on the start side: <UI>New subfolder</UI>,{" "}
            <UI>Rename or move…</UI> and <UI>Delete folder…</UI> are in each
            folder's menu. Deleting a folder keeps its servers; they move up a
            level.
          </li>
          <li>
            <UI>Tags</UI> cut across folders: a server can have many. Click a
            tag on a server's page to list every server with it.
          </li>
          <li>
            <UI>Favorites</UI> (the star) are the servers you open most; the{" "}
            <UI>Favorites</UI> view lists only them.
          </li>
        </List>
        <Tip>
          A good default: folders for <em>where</em> a server is (environment,
          customer, region), tags for <em>what</em> it does (<C>web</C>,{" "}
          <C>db</C>, <C>backup</C>). Keep tags lowercase and short so filters
          stay tidy.
        </Tip>
      </>
    ),
  },
  {
    id: "find",
    title: "Finding servers",
    body: (
      <>
        <P>
          Search matches names, hosts and notes. Filter by status, operating
          system, tag and authentication method, and sort by name, host, OS,
          status, last check or date added. On a phone, the chips under the
          search open each filter.
        </P>
        <P>
          The whole view (folder, search, filters, sort and page) is kept in the
          address bar, so you can bookmark a view or send it to a colleague.
        </P>
        <Example title="A bookmark for what needs attention">
          <P>
            Filter <UI>Status</UI> to <UI>Unreachable</UI>, <UI>Auth failed</UI>{" "}
            and <UI>Host key changed</UI>, sort by <UI>Last checked</UI>, and
            bookmark the page. Opening it later shows only the servers that need
            you.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "bulk",
    title: "Working with many servers",
    body: (
      <>
        <P>
          On a desktop, tick servers in the table to get the bar for the
          selection:
        </P>
        <Steps>
          <div>
            <UI>Check</UI>: re-check them all, e.g. after a network change.
          </div>
          <div>
            <UI>Move</UI>: put them in a folder.
          </div>
          <div>
            <UI>Tags</UI>: add or remove tags on all of them at once.
          </div>
          <div>
            <UI>Delete</UI>: remove them from Morcheh.
          </div>
        </Steps>
      </>
    ),
  },
  {
    id: "server-settings",
    title: "A server's settings",
    body: (
      <>
        <P>
          The <UI>Settings</UI> tab on a server's page gathers its{" "}
          <UI>Connection</UI> (host, port, user, credentials),{" "}
          <UI>Organization</UI> (folder, tags, favorite), its trusted{" "}
          <UI>Host key</UI> fingerprint and the <UI>Danger zone</UI>.
        </P>
        <P>
          <UI>Delete server</UI> only makes Morcheh forget the server and its
          saved credentials. Nothing on the server is touched: remove Morcheh's
          key from <C>authorized_keys</C> yourself if you want to revoke its
          access.
        </P>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          <UI>Unreachable</UI> but you can SSH from your computer? Morcheh
          connects from where its backend runs, not from your browser. Allow
          that machine's address in the server's firewall or security group.
        </li>
        <li>
          <UI>Auth failed</UI> with a key: check that the public key is in{" "}
          <C>~/.ssh/authorized_keys</C> of the same user, and that the folder is{" "}
          <C>700</C> and the file <C>600</C>.
        </li>
        <li>
          A key that won't load: Morcheh needs the private key (it starts with{" "}
          <C>-----BEGIN</C>), not the <C>.pub</C> file.
        </li>
      </List>
    ),
  },
]
