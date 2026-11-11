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
          <A href="/home">Home</A> is the workspace's dashboard. It answers
          &quot;is anything wrong?&quot; first, then shows how things are
          running. Everything on it updates by itself every few seconds, from
          the same checks the rest of the panel uses, so its numbers always
          match the red counts in the menu.
        </P>
        <List>
          <li>
            <UI>Health</UI>: the ring at the top is one score out of 100 for the
            whole workspace. Every server, database, storage, DNS server, proxy,
            cron job, application and uptime monitor that was checked counts;
            down counts as 0, needs a look as half. Firing alerts and failed
            backup plans lower it too. 98 and up is <UI>Excellent</UI>, 90{" "}
            <UI>Good</UI>, 75 <UI>Fair</UI>, below that <UI>At risk</UI>. The
            chips beside it count what is down and what needs a look.
          </li>
          <li>
            <UI>Key numbers</UI> under it: availability of every server in the
            last 24 hours (with a strip per hour), average response time, CPU
            and memory across the fleet, uptime monitors, firing alerts, and
            requests per minute through your reverse proxies (or running tasks
            when you have none). Click a tile to open the page behind it.
          </li>
          <li>
            <UI>Needs attention</UI> lists every server, storage or DNS server
            Morcheh can't reach or log in to, every database that is down or
            critical, every firing alert and every cron job that can't run or
            whose last run failed. Red is down, orange needs a look. It only
            shows when something is wrong and can't be hidden.
          </li>
          <li>
            <UI>Sections</UI> count each section's things. The thin bar shows
            them by status: green online, orange needs a look, red down, grey
            not checked yet or paused.
          </li>
          <li>
            <UI>Availability and performance</UI>: every server's checks over 24
            hours, 7 or 30 days, and a chart of response time, CPU or memory.{" "}
            <UI>Insights</UI> opens the full report.
          </li>
          <li>
            <UI>Server resources</UI>: every server as one square, coloured by
            how busy its CPU, memory or disk is right now (orange from 80%, red
            from 90%, a red outline when it is offline), and the five busiest
            beside it. Point at a square for details, click it for the server's
            Metrics.
          </li>
          <li>
            <UI>Favorite servers</UI> with their status, CPU, memory, disk and
            ping. Star a server on the Servers page to keep it here; with no
            favorites, the first servers are shown.
          </li>
          <li>
            <UI>Activity</UI>: one timeline of what happened lately: servers
            going down and coming back, alerts firing and clearing, uptime
            incidents and finished tasks. <UI>Problems</UI> keeps only the bad
            news.
          </li>
          <li>
            <UI>Uptime</UI> (monitors, worst first, with their last checks) and{" "}
            <UI>Web traffic</UI> (requests in the last 30 minutes, server
            errors, busiest sites; only when the workspace has a reverse proxy).
          </li>
          <li>
            <UI>Services</UI> opens your team's web tools in a new tab;{" "}
            <UI>Tasks</UI> and <UI>Coming up</UI> show background tasks and the
            next scheduled cron jobs.
          </li>
          <li>
            <UI>Add</UI> (the <UI>+</UI> on phones) opens the form for a new
            server, database, storage, DNS server, service or cron job. It shows
            only when you may add things to the selected workspace.
          </li>
        </List>
        <Steps>
          <>
            Press <UI>Customize</UI> (the grid icon at the top; on phones{" "}
            <UI>Customize Home</UI> at the bottom of the page).
          </>
          <>Turn off the cards you don't need. Problems always show.</>
          <>
            <UI>Reset</UI> brings every card back. Your choice is kept on this
            browser only.
          </>
        </Steps>
        <Tip>
          The refresh button reloads every number at once; you rarely need it,
          since Home keeps itself up to date. Home shows the selected workspace
          only: switch workspace in the sidebar header (or under <UI>More</UI>{" "}
          on phones) to see another.
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
