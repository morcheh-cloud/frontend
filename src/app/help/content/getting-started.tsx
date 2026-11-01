import {
  A,
  C,
  Example,
  type GuideSection,
  Keys,
  List,
  P,
  See,
  Steps,
  Tip,
  UI,
} from "../components/prose"

export const gettingStarted: GuideSection[] = [
  {
    id: "what",
    title: "What Morcheh does",
    body: (
      <>
        <P>
          Morcheh manages your servers and the services on them from one place.
          It logs in over SSH, the same way you would, so there is nothing to
          install on the servers themselves: add a server with its address and
          credentials and you can open a terminal, edit files, schedule jobs,
          see open ports and protect logins right away.
        </P>
        <P>
          Each feature runs real commands on the server as the SSH user you
          saved. What a feature can see or change is what that user can: a root
          login (or a user with password-less <C>sudo</C>) sees everything, an
          ordinary user sees only its own processes, crontab and files.
        </P>
      </>
    ),
  },
  {
    id: "layout",
    title: "Finding your way",
    body: (
      <>
        <List>
          <li>
            <UI>Sidebar</UI> (desktop): every section of the panel. Collapse it
            to icons with the button at the top-start of the header, or with{" "}
            <Keys>Ctrl+B</Keys> (<Keys>⌘+B</Keys> on a Mac).
          </li>
          <li>
            <UI>Breadcrumbs</UI> in the header show where you are; click any
            part to go back up.
          </li>
          <li>
            <UI>Guide</UI>, at the end of the header, opens the guide for the
            page you are on. Pages without one link to this help instead.
          </li>
          <li>
            <UI>A server's page</UI> has its tools as tabs: Overview, Open
            ports, Fail2ban, Cron jobs, Files, Terminal and Settings. Tabs
            marked <UI>Soon</UI> are planned; opening one lists what it will do.
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
          A workspace keeps one team's or one customer's servers apart from the
          rest. Switch workspace from the top of the sidebar, or on a phone from{" "}
          <UI>More</UI> in the tab bar. Morcheh remembers the last one you used
          on this browser.
        </P>
        <Tip>
          Use workspaces for things that should never mix (different companies,
          different owners). Inside one workspace, use folders and tags instead
          (see <See guide="servers" section="organize" />
          ).
        </Tip>
      </>
    ),
  },
  {
    id: "phone",
    title: "On a phone",
    body: (
      <List>
        <li>
          The tab bar at the bottom holds Home, Servers, Services and Alerts;{" "}
          <UI>More</UI> has the rest, the workspace switcher and this help.
        </li>
        <li>
          Menus open as sheets from the bottom. Swipe them down, tap outside, or
          use your phone's Back gesture to close them; Back never leaves the
          page while a sheet is open.
        </li>
        <li>
          The <UI>?</UI> button in a page's top bar opens that page's guide.
        </li>
      </List>
    ),
  },
  {
    id: "first-steps",
    title: "Your first ten minutes",
    body: (
      <>
        <Steps>
          <div>
            Open <A href="/servers">Servers</A> and press <UI>Add server</UI>.
            Paste <C>ssh deploy@203.0.113.10 -p 22</C> into <UI>Host</UI> to
            fill host, user and port at once.
          </div>
          <div>
            Choose <UI>Private key</UI> as authentication if you can (see{" "}
            <See guide="servers" section="add">
              adding a server
            </See>
            ), then press <UI>Test connection</UI> before saving.
          </div>
          <div>
            Open the server. The <UI>Overview</UI> shows live CPU, memory, disk
            and network within a second or two.
          </div>
          <div>
            Check <UI>Open ports</UI>: anything marked <UI>Public</UI> that you
            didn't expect (a database, Redis, an admin panel) deserves a look
            first.
          </div>
          <div>
            Install <UI>Fail2ban</UI> from its tab to stop password-guessing on
            SSH. The defaults are good; add your office or VPN address to{" "}
            <UI>Never ban</UI>.
          </div>
        </Steps>
      </>
    ),
  },
  {
    id: "example",
    title: "Example setup",
    body: (
      <Example title="A small team with six servers">
        <P>
          Two web servers, one database and one worker in production, plus a
          staging pair.
        </P>
        <List>
          <li>
            Folders by environment: <UI>Production</UI> and <UI>Staging</UI>.
          </li>
          <li>
            Tags by role: <C>web</C>, <C>db</C>, <C>worker</C>. Filtering by{" "}
            <C>web</C> then shows both environments' web servers together.
          </li>
          <li>Star the production database so it is one click away.</li>
          <li>
            Bookmark the filtered list (filters live in the URL), e.g. every{" "}
            <UI>Unreachable</UI> server in Production, as a quick health page.
          </li>
        </List>
      </Example>
    ),
  },
]
