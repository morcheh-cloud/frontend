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
    id: "home",
    title: "The Home page",
    body: (
      <>
        <P>
          <A href="/home">Home</A> answers one question first: is anything wrong
          in this workspace? Everything on it updates by itself every few
          seconds, from the same checks the rest of the panel uses.
        </P>
        <List>
          <li>
            <UI>Needs attention</UI> lists every server, storage or DNS server
            Morcheh can't reach or log in to, every database that is down or
            critical, and every cron job that can't run or whose last run
            failed. Red is down, orange needs a look (for example a refused
            password). Click a row to open it. When the list is empty you see{" "}
            <UI>All systems normal</UI>.
          </li>
          <li>
            <UI>Overview tiles</UI> count each section's things. The thin bar
            shows them by status: green online, orange needs a look, red down,
            grey not checked yet or paused. A red number is the same count the
            menu shows.
          </li>
          <li>
            <UI>Favorite servers</UI>: star a server on the Servers page to keep
            it here. With no favorites, the first servers are shown.
          </li>
          <li>
            <UI>Services</UI> opens your team's web tools straight away in a new
            tab, critical ones first.
          </li>
          <li>
            <UI>Tasks</UI> (running first, then the newest) and{" "}
            <UI>Coming up</UI> (the next scheduled cron jobs).
          </li>
          <li>
            <UI>Add</UI> (the <UI>+</UI> on phones) opens the form for a new
            server, database, storage, DNS server, service or cron job. It shows
            only when you may add things to the selected workspace.
          </li>
        </List>
        <Tip>
          Home shows the selected workspace only. Switch workspace in the
          sidebar header (or under <UI>More</UI> on phones) to see another.
        </Tip>
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
    id: "search",
    title: "Search and quick actions",
    body: (
      <>
        <P>
          The search field at the end of the header (desktop) finds anything in
          the panel: servers, storages, pages, actions and guides. Press{" "}
          <Keys>Ctrl+K</Keys> (<Keys>⌘+K</Keys> on a Mac) from any page to open
          it; the same keys close it again.
        </P>
        <List>
          <li>
            <UI>Before you type</UI> it shows shortcuts: what you opened
            recently, the tools of the server you are on, quick actions (
            <UI>Add server</UI>, <UI>Add storage</UI>, this page's guide, toggle
            the sidebar, copy the page link) and the main pages.
          </li>
          <li>
            <UI>As you type</UI> it searches server names, addresses, host names
            and tags, storage names and endpoints, and every page, action and
            guide. Every word you type must match.
          </li>
          <li>
            Move with <Keys>↑</Keys> <Keys>↓</Keys>, open with{" "}
            <Keys>Enter</Keys>, close with <Keys>Esc</Keys>. The last row,{" "}
            <UI>Search all servers</UI>, opens the servers list filtered by what
            you typed.
          </li>
        </List>
        <Example title="Open a server's terminal in two keystrokes">
          On a server's page press <Keys>Ctrl+K</Keys>, type <C>term</C> and
          press <Keys>Enter</Keys>.
        </Example>
        <Tip>
          Inside the terminal <Keys>Ctrl+K</Keys> belongs to the shell (it
          deletes to the end of the line), so the search doesn't open there.
          Click the search field in the header instead.
        </Tip>
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
          on this browser. Admins create them; you only see those you have
          access to (see <See guide="access" section="workspaces" />
          ).
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
