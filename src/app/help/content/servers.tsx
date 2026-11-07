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
              "Added but not checked yet. The background check picks it up within seconds, or press Check.",
            ],
          ]}
        />
        <P>
          When a server isn't online, every one of its pages shows a banner with
          the one action that fixes it: <UI>Check again</UI>,{" "}
          <UI>Edit credentials</UI> or <UI>Review key…</UI>.
        </P>
        <P>
          Morcheh re-checks every server by itself every 15 seconds, even when
          nobody has the panel open, and the list on screen picks up new
          statuses every 10 seconds. So a server that went down stops showing{" "}
          <UI>Online</UI> within about half a minute (an unreachable server
          takes up to 15 seconds to time out).
        </P>
        <P>
          The red number beside <UI>Servers</UI> in the sidebar (on a phone, on
          the Servers tab) counts the servers in this workspace that are{" "}
          <UI>Unreachable</UI>, <UI>Auth failed</UI>, <UI>Host key changed</UI>{" "}
          or <UI>Error</UI>. Filter the list by <UI>Status</UI> to see which.
        </P>
        <Recommended
          rows={[
            {
              setting: <C>SERVER_CHECK_INTERVAL</C>,
              value: "15s (the default)",
              why: "A backend setting (e.g. 1m, 5m; 0 turns background checks off). Every check is an SSH login that lands in the server's auth log; with many servers, or a strict fail2ban, raise it to 1m–5m.",
            },
          ]}
        />
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
    id: "credentials",
    title: "Seeing a server's SSH credentials",
    body: (
      <>
        <P>
          Morcheh stores passwords and keys encrypted and never shows them in
          lists. To connect by hand (from your own terminal, an SFTP client, a
          deploy script), open the credentials on demand:
        </P>
        <Steps>
          {[
            <P key="1">
              Open the server, then <UI>⋯</UI> → <UI>Show SSH credentials…</UI>,
              or <UI>Credentials</UI> on the <UI>Connection</UI> card (on a
              phone: the <UI>Show SSH credentials</UI> row under Connection).
              The same item is in each server's menu on the servers list.
            </P>,
            <P key="2">
              Host, port and user are shown as they are. The password, private
              key and passphrase stay hidden until you press the eye; the copy
              button works either way.
            </P>,
            <P key="3">
              <UI>Edit credentials</UI> opens the server form to change them.
            </P>,
          ]}
        </Steps>
        <Table
          head={["Field", "What it's for"]}
          rows={[
            [
              <UI key="pw">Password</UI>,
              "The login password (password servers). Also what sudo asks for when the user has no passwordless sudo.",
            ],
            [
              <UI key="pk">Private key</UI>,
              "The key Morcheh logs in with. The download button saves it as a file for ssh -i.",
            ],
            [
              <UI key="pub">Public key</UI>,
              "Worked out from the private key, with its fingerprint. Add this line to ~/.ssh/authorized_keys on other servers to log in with the same key.",
            ],
            [
              <UI key="hk">Host key</UI>,
              "The trusted host key as a known_hosts line, with its fingerprint, so your own ssh trusts the same key.",
            ],
          ]}
        />
        <Example title="Log in with the saved key from your computer">
          <P>Save the key with the download button, then:</P>
          <Code>{`
chmod 600 ~/Downloads/web-01.key
ssh -i ~/Downloads/web-01.key -p 22 deploy@10.0.0.12
`}</Code>
        </Example>
        <Warn>
          Anyone who can open Morcheh can read these. Don't share your screen
          with a secret visible, and delete a downloaded key once it is in{" "}
          <C>~/.ssh</C>.
        </Warn>
        <P>
          The server form has the same eye: on a blank password or passphrase it
          shows the saved value, on a field you typed in it shows your typing.
          For a private key, use <UI>Show saved key</UI>. Showing a saved value
          doesn't change it: leave the field blank and saving keeps it.
        </P>
        <P>
          Passwords of the server's own users (the <UI>Users</UI> section) can't
          be shown: Morcheh sets them on the server without keeping a copy, and
          the server stores only a one-way hash.
        </P>
        <Tip>
          The secrets are fetched only while the window is open and are
          forgotten when you close it. If it says the credentials can't be
          decrypted, the backend's <C>SECRETS_KEY</C> changed since they were
          saved: enter them again with <UI>Edit credentials</UI>.
        </Tip>
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
            <UI>Folders</UI> hold each server in one place, and nest. The page
            works like a drive: <UI>My servers</UI> is the top level, with its
            folders as cards above the servers outside every folder. Open a
            folder to see what's directly in it, and use the path above the list
            (or Back) to climb out. <UI>New subfolder</UI>,{" "}
            <UI>Rename or move…</UI> and <UI>Delete folder…</UI> are in each
            folder's menu: right-click its card, or use <UI>⋯</UI> on the card
            or the path. Deleting a folder keeps its servers; they move up a
            level.
          </li>
          <li>
            <UI>All servers</UI> is the flat list of everything in this
            workspace, and each server shows its folder. Switch between{" "}
            <UI>My servers</UI>, <UI>All servers</UI> and <UI>Favorites</UI>{" "}
            above the list.
          </li>
          <li>
            <UI>Cards</UI> and <UI>Table</UI> switch how the list looks; your
            browser remembers the choice. Cards show the essentials and open the
            server on a click. Table adds more columns, and you sort by clicking
            their headings. Phones always use their own list.
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
    id: "move",
    title: "Moving servers and folders",
    body: (
      <>
        <P>
          On a computer, drag a server (its card or row) onto a folder card, or
          onto a step of the path above the list to move it up. Drop on{" "}
          <UI>My servers</UI> to take it out of every folder.
        </P>
        <List>
          <li>Dragging a ticked server carries every ticked server along.</li>
          <li>
            Folders drag the same way, with everything inside them. A folder
            can't go into itself or one of its own subfolders; those places
            don't light up.
          </li>
          <li>
            Every move shows <UI>Undo</UI> for a few seconds, and puts each
            server back where it was.
          </li>
        </List>
        <P>
          Without dragging: <UI>Move to folder…</UI> in a server's menu,{" "}
          <UI>Move</UI> on the bulk bar, and <UI>Rename or move…</UI> for a
          folder. On a phone these are the way to move things. On a computer,
          right-click a server or a folder to open its menu; a server's menu
          there also has <UI>Open in new tab</UI>.
        </P>
        <Tip>
          Only the folders on screen take a drop. For one further away, or from{" "}
          <UI>All servers</UI>, use <UI>Move to folder…</UI>. Moving a server
          needs <UI>Owner</UI> on it, and one you can't move won't drag.
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
          A search or filter reaches past the level you're on: from{" "}
          <UI>My servers</UI> it covers every server, and inside a folder it
          covers that folder and its subfolders. Searching also finds folders by
          name.
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
            <UI>Check</UI>: re-check them all, e.g. after a network change. Four
            run at a time and each row shows its status as soon as its own check
            ends; the button counts how many are done.
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
    id: "insights",
    title: "Insights: charts and statistics",
    body: (
      <>
        <P>
          The <UI>Insights</UI> tab on the Servers page (next to{" "}
          <UI>Servers</UI>, at the start of the toolbar; on a phone, under the
          title) shows how your servers have been doing over <UI>24 hours</UI>,{" "}
          <UI>7 days</UI> or <UI>30 days</UI>. It covers the servers of the
          selected workspace that you can see, and refreshes by itself every
          minute.
        </P>
        <Table
          head={["Part", "What it shows"]}
          rows={[
            [
              "Tiles",
              "How many are online now, uptime over the range, the average SSH response time, average CPU and memory, and the fullest disk.",
            ],
            [
              "Availability",
              "One strip per server: each block is a stretch of status checks. Green = all passed, orange = some failed, red = all failed, grey = no checks (Morcheh wasn't running).",
            ],
            [
              "Response time",
              "How long an SSH check took, for all servers or the one you pick. Failed checks aren't counted.",
            ],
            [
              "Resources",
              "CPU, memory, root disk or network over time, for all servers together (average; network is summed) or the one you pick.",
            ],
            [
              "Disks",
              "Each server's root disk, fullest first, how much it grew, and when it will be full at this pace.",
            ],
            [
              "Busiest servers",
              "The servers with the highest average CPU in the range.",
            ],
            [
              "Status changes",
              "Each time a server went down or came back, with the error it gave.",
            ],
          ]}
        />
        <P>
          Resources come from a small sample Morcheh reads over SSH from every
          online Linux server, every 5 minutes by default. History starts when
          sampling starts, so a new server's charts fill up over time. Hover a
          chart (or tap it on a phone) for the exact numbers; on a keyboard,
          focus it and use the arrow keys.
        </P>
        <Tip>
          Keep an eye on <UI>Disks</UI>: a disk shown as full within two weeks
          is worth cleaning up now. Open <UI>Disk usage</UI> from the server's{" "}
          <UI>Files</UI> tab to find what grew.
        </Tip>
        <Tip>
          No resource charts? The server may not be Linux, or the admin turned
          sampling off (<C>SERVER_SAMPLE_INTERVAL=0</C> on the backend).
        </Tip>
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
