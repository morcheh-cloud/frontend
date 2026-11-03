import {
  A,
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

export const access: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          Nothing in Morcheh opens without signing in. Each person gets their
          own account, and sees only the servers and storage they were given
          access to. The rules are enforced on the backend, so a hidden button
          is never the only thing standing in the way.
        </P>
        <Table
          head={["Who", "What they can do"]}
          rows={[
            [
              "Admin",
              "Everything, everywhere: members, groups, workspaces, registration",
            ],
            [
              "Member",
              "Only what a grant gives them, directly or through a group",
            ],
            [
              "Waiting for approval",
              "Can sign in but only sees a holding page; every API is closed",
            ],
            ["Blocked", "Can't sign in; sessions and terminals end at once"],
          ]}
        />
      </>
    ),
  },
  {
    id: "first-run",
    title: "The first account",
    body: (
      <>
        <P>
          While there are no users, the sign-in page shows a form that creates
          the first admin. It disappears for good once that account exists.
        </P>
        <Warn>
          Until then, anyone who can reach the panel can claim it. On a server
          reachable by others, set <UI>SETUP_TOKEN</UI> in the backend's
          environment: the form then asks for that token too.
        </Warn>
      </>
    ),
  },
  {
    id: "levels",
    title: "The four access levels",
    body: (
      <>
        <P>Each level includes everything from the ones above it.</P>
        <Table
          head={["Level", "On a server"]}
          rows={[
            [
              "Viewer",
              "Status, live resources, read-only lists of services, ports, cron and Linux users, network map",
            ],
            [
              "Operator",
              "Logs, reading and downloading files, restarting services, reboot",
            ],
            [
              "Engineer",
              "Terminal, editing files, cron (running a job included), services, fail2ban, Linux users",
            ],
            [
              "Owner",
              "Seeing the SSH password or key, editing or deleting the server, giving others access",
            ],
          ]}
        />
        <Table
          head={["Level", "On a storage"]}
          rows={[
            ["Viewer", "See it and list its files"],
            ["Operator", "Download"],
            ["Engineer", "Upload, change and delete files"],
            ["Owner", "See its keys, edit or delete it, give others access"],
          ]}
        />
        <Tip>
          The terminal starts at Engineer because a shell can do anything the
          SSH account can, whatever the panel's level says.
        </Tip>
      </>
    ),
  },
  {
    id: "grants",
    title: "Giving access",
    body: (
      <>
        <P>
          A grant gives a person or a group a level on a whole workspace or on
          one server or storage. If several apply, the highest wins: a Viewer on
          the workspace who is an Engineer on one server is an Engineer there.
        </P>
        <Steps>
          {[
            <>
              For one person or group, open <UI>Settings › Members</UI> or{" "}
              <UI>Groups</UI> and choose <UI>Manage access</UI> from the row's
              menu.
            </>,
            <>
              Choose the level at the top, then tick workspaces, servers and
              storage. Each one appears as a tag on the side; change its level
              from the tag, or remove it with its ×.
            </>,
            <>
              Press <UI>Save changes</UI>. Nothing applies before that, and{" "}
              <UI>Discard</UI> forgets what you did.
            </>,
          ]}
        </Steps>
        <List>
          <li>
            Type to search by name, address or tag. <UI>Enter</UI> picks the
            first match and clears the search, so you can pick several without
            touching the mouse; the arrow keys walk the list and <UI>Space</UI>{" "}
            ticks.
          </li>
          <li>
            <UI>Select all results</UI> picks everything a search found. A
            server-tag pill above the list picks every server with that tag.
            These pick today's servers: one tagged later doesn't get access by
            itself.
          </li>
          <li>
            <UI>Set all to…</UI> changes the level of everything selected.
          </li>
          <li>
            A row saying <UI>Engineer through ops</UI> already has that level
            from its workspace or a group. Tick it only to give more.
          </li>
        </List>
        <P>
          For one place instead, open the server's <UI>Access</UI> tab, the
          storage's <UI>Manage access…</UI> menu item, or the workspace under{" "}
          <UI>Settings › Workspaces</UI>. Those apply immediately.
        </P>
        <P>
          Lowering or removing access takes effect at once and closes that
          person's open terminals and live streams on whatever they lost.
        </P>
        <Example title="A small team">
          <P>
            Make a group <UI>ops</UI> with Viewer on the <UI>Production</UI>{" "}
            workspace, so everybody on call can see what's happening. Give the
            two people who fix things Engineer on the workspace directly. Give a
            contractor Engineer on the one server they work on, and nothing
            else.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "members",
    title: "Members",
    body: (
      <>
        <P>
          <UI>Settings › Members</UI> lists everyone. <UI>Add member</UI> needs
          a username, name, email and a temporary password that they have to
          replace at first sign-in. You can set groups in the same form, and
          saving takes you straight to choosing their access.
        </P>
        <List>
          <li>
            <UI>Block</UI> signs them out and closes their terminals; their
            access stays for when you <UI>Unblock</UI> them.
          </li>
          <li>
            <UI>Set a temporary password</UI> is the way back in for a forgotten
            password. Morcheh doesn't send email yet.
          </li>
          <li>
            <UI>Sign out everywhere</UI> ends their sessions without changing
            anything else, for a lost laptop for example.
          </li>
          <li>
            <UI>Delete</UI> removes the account and its grants. Servers and
            storage stay.
          </li>
        </List>
        <Tip>
          You can have several admins. The last active admin can't be blocked,
          demoted or deleted, and nobody can do those to themselves.
        </Tip>
      </>
    ),
  },
  {
    id: "locked-out",
    title: "Locked out of every admin",
    body: (
      <>
        <P>
          If another admin can sign in, they can use{" "}
          <UI>Set a temporary password</UI>. If nobody can, reset the account
          from the command line on the machine that runs the backend, with the
          same environment or <UI>.env</UI> file. The backend can stay running.
        </P>
        <Code>bin/server reset-admin</Code>
        <P>
          It asks for the new password twice without showing it. With a source
          checkout, run <UI>make reset-admin</UI> instead. It then:
        </P>
        <List>
          <li>
            Sets the password, with the same rules as the panel: 12 to 128
            characters, and not the username.
          </li>
          <li>Signs the account out everywhere.</li>
          <li>
            Unblocks the account if it was blocked, and clears the failed
            sign-in count on it.
          </li>
        </List>
        <Table
          head={["Option", "What it does"]}
          rows={[
            [
              "-user NAME",
              "Which admin. Needed only when there are several; the error lists them.",
            ],
            ["-rename NEW", "Also changes the username."],
            [
              "-temporary",
              "Makes them choose a new password at next sign-in. Use it when you reset the account for someone else.",
            ],
          ]}
        />
        <Example title="A new username and password">
          <Code>bin/server reset-admin -user alice -rename alice.ops</Code>
          <Code>{`make reset-admin args="-user alice -rename alice.ops"`}</Code>
        </Example>
        <P>
          The command only works on admins; a member is reset from{" "}
          <UI>Settings › Members</UI>. In a script, pipe the password in as one
          line. It is never a command-line option, so it stays out of your shell
          history.
        </P>
        <Warn>
          The command runs outside the backend, so it can't close a terminal
          directly. Open connections end within a minute, but a shell left
          running can last until <UI>TERMINAL_DETACHED_TIMEOUT</UI> (15 minutes
          by default). If the old password may have leaked, restart the backend
          too.
        </Warn>
      </>
    ),
  },
  {
    id: "registration",
    title: "Public registration",
    body: (
      <>
        <P>
          Off by default. Turn it on under <UI>Settings</UI> and the sign-in
          page offers a sign-up form. New accounts wait under{" "}
          <UI>Settings › Members › Pending</UI>:
        </P>
        <List>
          <li>
            <UI>Approve</UI> opens their access page: choose groups and access,
            then press <UI>Approve</UI> there to activate them.
          </li>
          <li>
            <UI>Reject</UI> deletes the sign-up.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "workspaces",
    title: "Workspaces",
    body: (
      <>
        <P>
          Admins create workspaces under <UI>Settings › Workspaces</UI>. Every
          server and storage belongs to exactly one. A new one lands in the
          workspace selected in the sidebar.
        </P>
        <P>
          To move something, open the workspace and use{" "}
          <UI>Move to workspace…</UI> on its row, or <UI>Move all…</UI>. Grants
          on the old workspace stop covering it; grants directly on that server
          or storage stay. A workspace can only be deleted once it's empty.
        </P>
      </>
    ),
  },
  {
    id: "create",
    title: "Who can add servers",
    body: (
      <>
        <P>
          Adding servers, storage and services is a separate switch on a
          workspace grant, <UI>Can add servers, storage and services</UI>. It's
          on by default for Owners and off for everyone else, and only an admin
          can change it, so you can have an Owner who can't add machines or an
          Engineer who can.
        </P>
        <P>
          Workspace Owners also get <UI>Settings › Workspaces</UI>, limited to
          their own workspaces, where they can give others access inside them.
        </P>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <>
        <P>
          <A href="/account">Account</A>, at the bottom of the sidebar, changes
          your name, email and password. Changing the password signs out your
          other browsers and closes your terminals. <UI>Sign out everywhere</UI>{" "}
          ends every session, including this one.
        </P>
      </>
    ),
  },
  {
    id: "recommended",
    title: "Recommended settings",
    body: (
      <Recommended
        rows={[
          {
            setting: "Public registration",
            value: "Off",
            why: "Turn it on only for an onboarding window. Pending accounts can't do anything, but the fewer the better.",
          },
          {
            setting: "Grants",
            value: "On groups",
            why: "Change access for a whole team in one place; use direct grants for exceptions.",
          },
          {
            setting: "Default level",
            value: "Viewer",
            why: "Raise it when someone needs it. Terminal access is effectively the machine.",
          },
          {
            setting: "Admins",
            value: "Two",
            why: "One to work, one spare in case that account is locked out.",
          },
          {
            setting: "SETUP_TOKEN",
            value: "Set in production",
            why: "Nobody can claim a fresh install before you do.",
          },
        ]}
      />
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
            "Nobody remembers an admin password",
            "Run bin/server reset-admin on the backend's machine. See “Locked out of every admin” above.",
          ],
          [
            "“Too many attempts” right after reset-admin",
            "It clears the count on the account, not the one on your address. Wait up to 15 minutes, or sign in from another address.",
          ],
          [
            "“Waiting for approval” after signing in",
            "An admin has to approve you under Settings › Members.",
          ],
          [
            "Asked for a new password straight after signing in",
            "An admin set a temporary password. Choose your own to continue.",
          ],
          [
            "A server someone mentioned isn't in my list",
            "You have no access to it. It doesn't show at all, and its link says not found. Ask an admin or the workspace's owner.",
          ],
          [
            "“You need operator access for this”",
            "You can see the page but not do this. Someone has to raise your level.",
          ],
          [
            "My terminal closed by itself",
            "Your access dropped, your account was blocked, or your password changed.",
          ],
          [
            "Can't delete a workspace",
            "It still holds servers or storage. Move them out first.",
          ],
          [
            "Can't block or delete an admin",
            "They are the last active admin. Make another one first.",
          ],
          [
            "“N changes weren't saved” on the access page",
            "Those changes stay selected and the rest went through. Read the message, fix the cause, and press Save changes again.",
          ],
          [
            "Signing in works but I'm sent straight back",
            "The session cookie isn't being kept. The panel and the API have to be on the same site, and over HTTPS unless COOKIE_INSECURE is set for local use.",
          ],
        ]}
      />
    ),
  },
  {
    id: "related",
    title: "Related",
    body: (
      <P>
        <See guide="getting-started" section="workspaces" /> ·{" "}
        <See guide="servers" /> · <See guide="storage" />
      </P>
    ),
  },
]
