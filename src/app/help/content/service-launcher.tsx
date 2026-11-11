import {
  A,
  C,
  Example,
  type GuideSection,
  Keys,
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

export const serviceLauncher: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <A href="/services">Services</A> is your team's list of web services:
          Portainer, MinIO, Grafana, an internal wiki, a router's admin page.
          Each one has its address, a logo and the logins to it, so nobody has
          to dig through a shared sheet to find a link or a password.
        </P>
        <List>
          <li>
            A click on a service shows its address and logins, with an{" "}
            <UI>Open in a new tab</UI> button; the arrow icon on a tile opens it
            straight away.
          </li>
          <li>
            Logins sit behind access levels: who can see a password is decided
            per workspace or per service, and every look at a password is
            written to a log.
          </li>
          <li>
            Categories group the services, in the same order for everyone in the
            workspace.
          </li>
          <li>
            Every service can be found from any page with{" "}
            <A href="#search">the search</A>.
          </li>
        </List>
        <Tip>
          These are web services you open in a browser. The programs running on
          one of your servers (nginx, docker, sshd…) are in that server's{" "}
          <See guide="services" /> tab.
        </Tip>
      </>
    ),
  },
  {
    id: "add",
    title: "Adding a service",
    body: (
      <>
        <Steps>
          {[
            <>
              Open <UI>Services</UI> and press <UI>Add service</UI>. From any
              other page, search for <UI>Add service</UI> with{" "}
              <Keys>Ctrl+K</Keys>.
            </>,
            <>
              Paste the <UI>Address</UI>. Without <C>http://</C> or{" "}
              <C>https://</C>, Morche adds <C>https://</C>. The <UI>Name</UI>{" "}
              fills itself from the address (<C>portainer.acme.ir</C> becomes{" "}
              <C>Portainer</C>); change it if you like.
            </>,
            <>
              Pick a <UI>Category</UI>, a logo and a color, and turn on{" "}
              <UI>Critical</UI> for the services that must never be down. They
              get a red dot and their own filter.
            </>,
            <>
              Under <UI>Accounts</UI>, add the logins (see{" "}
              <A href="#accounts">Several logins</A>), and press{" "}
              <UI>Add service</UI>.
            </>,
          ]}
        </Steps>
        <P>
          Only <C>http</C> and <C>https</C> addresses are accepted. A private
          address or a port is fine: <C>10.0.0.5:9000</C>,{" "}
          <C>http://localhost:3000</C>.
        </P>
        <Warn>
          The <UI>Note</UI> is plain text that everyone who can see the service
          reads, Viewers included. Never put a password there, or in the address
          (<C>https://user:pass@…</C> is refused). Logins go in an account.
        </Warn>
        <Example title="Your Portainer">
          <Table
            head={["Field", "Value"]}
            rows={[
              [<UI key="a">Address</UI>, <C key="v">10.0.0.5:9000</C>],
              [<UI key="n">Name</UI>, "Portainer"],
              [<UI key="c">Category</UI>, "Dev tools"],
              [<UI key="l">Logo</UI>, "Site icon"],
              [<UI key="k">Accounts</UI>, "admin, with its password"],
              [<UI key="o">Note</UI>, "Only reachable over the office VPN"],
            ]}
          />
        </Example>
      </>
    ),
  },
  {
    id: "categories",
    title: "Categories and arranging",
    body: (
      <>
        <P>
          The row of chips above the services holds <UI>All services</UI>,{" "}
          <UI>Critical</UI> and your categories, each with its color and count.
          Press the <UI>+</UI> at the end of the row for a new one; a category's{" "}
          <UI>⋯</UI> (on hover) has <UI>Edit category</UI> (name and color),{" "}
          <UI>Move left</UI>, <UI>Move right</UI> and <UI>Delete category</UI>.
          Deleting one keeps its services: they move to <UI>Uncategorized</UI>.
        </P>
        <P>There are three ways to move a service:</P>
        <List>
          <li>
            <UI>Drag</UI> a tile or row to another place or category, or onto a
            category's chip. The chips drag too, to reorder categories.
          </li>
          <li>
            <UI>Move to category</UI> in the service's <UI>⋯</UI> menu. It goes
            to the end of that category.
          </li>
          <li>
            With the keyboard: focus a tile, press <Keys>Space</Keys>, move it
            with the arrow keys, and press <Keys>Space</Keys> again (
            <Keys>Esc</Keys> puts it back).
          </li>
        </List>
        <P>
          On a phone, hold a row for a moment, then drag it. A quick swipe just
          scrolls.
        </P>
        <Tip>
          Dragging is off while you search or show only <UI>Critical</UI>,
          because the list on screen isn't the real order then. Clear the filter
          to rearrange.
        </Tip>
        <P>
          The order and the categories are the same for everyone in the
          workspace, so changing them needs Engineer on the workspace. Someone
          who is Engineer on one service can still move that service with{" "}
          <UI>Move to category</UI>.
        </P>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Several logins",
    body: (
      <>
        <P>
          A service can have no account, one, or several, each with an optional{" "}
          <UI>Label</UI> (<C>admin</C>, <C>read-only</C>), a <UI>Username</UI>{" "}
          and a <UI>Password</UI>. The first one is the <UI>Default</UI>: the
          tiles and the table show it, and the copy buttons copy it. Reorder
          accounts with the arrows in the form.
        </P>
        <List>
          <li>
            With several accounts, the table shows a <C>+2</C> chip and a tile's
            copy button asks which account. <UI>Details</UI> lists them all.
          </li>
          <li>
            When you edit a service, a blank password keeps the saved one.{" "}
            <UI>Remove it</UI> under the field deletes it.
          </li>
          <li>Passwords are stored encrypted.</li>
        </List>
      </>
    ),
  },
  {
    id: "levels",
    title: "Who sees what",
    body: (
      <>
        <P>
          Services use the same levels as servers and storage, given on the
          whole workspace or on one service (the highest wins). Someone with
          access to only a few services sees just those, under their categories.
        </P>
        <Table
          head={["Level", "On a service"]}
          rows={[
            ["Viewer", "The service, its link and its note. No logins"],
            ["Operator", "Usernames, and showing or copying passwords"],
            ["Engineer", "Editing it; the workspace's categories and order"],
            ["Owner", "Removing it, giving others access, the password log"],
          ]}
        />
        <Warn>
          Passwords start at <UI>Operator</UI>, not Owner as on a server. That's
          on purpose, since sharing logins is the point of this page, but it
          means an Operator on a workspace can read every password in it.
        </Warn>
        <Recommended
          rows={[
            {
              setting: "Only needs the links",
              value: "Viewer",
              why: "They can open every service but can't read a single login.",
            },
            {
              setting: "Logs into the services",
              value: "Operator",
              why: "Enough to copy passwords; they can't change anything.",
            },
            {
              setting: "Keeps the list tidy",
              value: "Engineer on the workspace",
              why: "Edits services, categories and the order.",
            },
          ]}
        />
        <P>
          Give access from a service's <UI>⋯</UI> menu › <UI>Access</UI>, or for
          a person or group on their access page, where services appear next to
          servers and storage (see <See guide="access" />
          ). Whoever adds a service becomes its Owner.
        </P>
      </>
    ),
  },
  {
    id: "passwords",
    title: "Copying passwords and the log",
    body: (
      <>
        <P>
          A password never travels with the list. It's fetched from the backend
          only when you press the eye or a copy button, and forgotten when you
          close what showed it.
        </P>
        <List>
          <li>
            <UI>Copy password</UI> (key icon on a tile, beside the password in
            the table) copies without showing it.
          </li>
          <li>
            The eye in the table and in <UI>Details</UI> shows it until you hide
            it or leave.
          </li>
          <li>
            Every show or copy is one line in the service's log: who, from which
            IP, when, and which account. Owners read it under{" "}
            <UI>Details › Activity</UI>.
          </li>
        </List>
        <Tip>Removing a service removes its log too.</Tip>
      </>
    ),
  },
  {
    id: "logos",
    title: "Logos and site icons",
    body: (
      <>
        <P>
          The form's <UI>Logo</UI> has three choices:
        </P>
        <Table
          head={["Choice", "What shows"]}
          rows={[
            [
              <UI key="s">Site icon</UI>,
              "The service's own favicon, fetched by the backend after you save. Until it arrives, or if there's none, the first letter on the service's color",
            ],
            [
              <UI key="u">Upload</UI>,
              "An image you pick: PNG, JPEG, GIF, WebP, ICO or SVG, up to 1 MB",
            ],
            [<UI key="i">Icon</UI>, "One of a short list of simple icons"],
          ]}
        />
        <P>
          An upload or a chosen icon always wins; a later favicon never replaces
          it. The color is behind the letter and the icon.
        </P>
      </>
    ),
  },
  {
    id: "search",
    title: "Opening from anywhere",
    body: (
      <>
        <P>
          Press <Keys>Ctrl+K</Keys> (<Keys>⌘+K</Keys> on a Mac) on any page and
          type part of a service's name, address or note. Pick it with{" "}
          <Keys>Enter</Keys> or a click and it opens in a new tab, while the
          page you were on stays as it was. Services you opened show under{" "}
          <UI>Recent</UI> next time.
        </P>
        <P>
          Usernames aren't searched. A service without a web address opens its
          place in the list instead.
        </P>
        <Example title="From a server's terminal to Grafana's password">
          <Steps>
            {[
              <>
                <Keys>Ctrl+K</Keys>, type <C>graf</C>, <Keys>Enter</Keys>:
                Grafana opens in a new tab.
              </>,
              <>
                Back in Morche, open <UI>Services</UI> and press the key icon on
                Grafana's tile: the password is copied, ready to paste into its
                sign-in page.
              </>,
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
        head={["Problem", "What to do"]}
        rows={[
          [
            "The site icon never showed up",
            "The backend couldn't reach the address, or the site has no icon. Edit the service and press Fetch again under Logo, or upload one.",
          ],
          [
            "“Copying isn't available on this connection”",
            "Browsers only allow copying on https or localhost. The password is shown instead; select and copy it. Serving the panel over https fixes it.",
          ],
          [
            "I can see the service but not its username or password",
            "You're a Viewer on it. Ask its Owner or an admin for Operator.",
          ],
          [
            "I can't drag anything",
            "Clear the search and the Critical filter. If it still won't move, you aren't Engineer on the workspace: use Move to category.",
          ],
          [
            "“Use an http:// or https:// address”",
            "The address has another scheme, like ftp:// or javascript:. Services are web pages; use a Storage for FTP.",
          ],
          [
            "A service someone mentioned isn't here",
            "You have no access to it, or it's in another workspace. Switch workspace in the sidebar, or ask its Owner.",
          ],
        ]}
      />
    ),
  },
]
