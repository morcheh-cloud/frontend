import {
  C,
  Code,
  Example,
  type GuideSection,
  H3,
  List,
  P,
  Recommended,
  See,
  Steps,
  Tip,
  UI,
  Warn,
} from "../components/prose"

export const fail2ban: GuideSection[] = [
  {
    id: "what",
    title: "What fail2ban does",
    body: (
      <>
        <P>
          Fail2ban watches login logs and bans an address that fails too often:
          after <UI>Max retries</UI> failures within the <UI>Find time</UI>, the
          address is blocked in the firewall for the <UI>Ban time</UI>. Each set
          of rules for one service (SSH, nginx, a mail server) is a{" "}
          <UI>jail</UI>.
        </P>
        <P>
          On a public server, bots try SSH passwords around the clock. Fail2ban
          turns thousands of attempts into a handful before each bot is shut
          out.
        </P>
      </>
    ),
  },
  {
    id: "install",
    title: "Installing",
    body: (
      <>
        <P>
          If fail2ban isn't on the server, the tab offers to install it with the
          server's package manager (<UI>Install with apt</UI>, for example).
          This needs root or password-less sudo, and can take a few minutes.
        </P>
        <Steps>
          <div>
            Leave <UI>Protect SSH right away</UI> ticked (it turns on the{" "}
            <C>sshd</C> jail) and press install. It runs as a{" "}
            <See guide="tasks">task</See>: the tab shows its progress and you
            can leave the page. It can't be canceled once the package manager is
            running. The tab refreshes by itself when it ends.
          </div>
          <div>
            Open <UI>Settings</UI> and add your own addresses to{" "}
            <UI>Never ban</UI> (see below) before anything else.
          </div>
          <div>
            Check <UI>Jails</UI>: <C>sshd</C> should be turned on and{" "}
            <UI>Watching</UI>.
          </div>
        </Steps>
      </>
    ),
  },
  {
    id: "tabs",
    title: "Jails, bans and activity",
    body: (
      <List>
        <li>
          <UI>Jails</UI>: each jail, whether it's on, what it watches and how
          many addresses it has banned. Open one to change its settings, test
          its filter, or turn it on or off. <UI>Add jail</UI> creates one from a
          filter.
        </li>
        <li>
          <UI>Bans</UI>: every banned address, its jail and when the ban ends.{" "}
          <UI>Unban from</UI> its jail lifts it; <UI>Ban an address…</UI> bans
          one by hand.
        </li>
        <li>
          <UI>Settings</UI>: the defaults every jail inherits.
        </li>
        <li>
          <UI>Activity</UI>: recent failed logins, bans and unbans from
          fail2ban's log.
        </li>
      </List>
    ),
  },
  {
    id: "recommended",
    title: "Recommended settings",
    body: (
      <>
        <Recommended
          rows={[
            {
              setting: "Never ban",
              value: "127.0.0.1/8 ::1 + your office/VPN",
              why: "So a mistyped password never locks you out of your own server.",
            },
            {
              setting: "Max retries",
              value: "5",
              why: "Enough for a person who mistypes, far too few for a bot.",
            },
            {
              setting: "Find time",
              value: "10m",
              why: "Failures spread out over hours from a real user are forgotten.",
            },
            {
              setting: "Ban time",
              value: "1h",
              why: "Long enough to make guessing pointless; short enough to recover from a mistake.",
            },
            {
              setting: "Longer bans for repeat offenders",
              value: "On, growth factor 2",
              why: "Each new ban of the same address doubles: 1h, 2h, 4h…",
            },
            {
              setting: "Longest ban",
              value: "1 week",
              why: "Persistent bots stay out without banning an address forever.",
            },
            {
              setting: "Backend",
              value: "systemd (on systemd distros)",
              why: "Reads the journal directly; no log file path to get wrong.",
            },
          ]}
        />
        <P>
          A field left empty inherits its value; the hint under each field says
          where the current value comes from. Saving writes <C>jail.local</C>{" "}
          and reloads fail2ban. If fail2ban rejects the configuration, nothing
          is changed.
        </P>
        <Warn>
          Never set <UI>Ban time</UI> to <UI>Forever</UI> without your own
          addresses in <UI>Never ban</UI>. A forever-ban on your office IP needs
          console access to undo.
        </Warn>
      </>
    ),
  },
  {
    id: "custom-jail",
    title: "Protecting another service",
    body: (
      <>
        <P>
          Fail2ban ships filters for most common services. To use one, press{" "}
          <UI>Add jail</UI>, pick the filter, the log file (or the journal) and
          the ports to block.
        </P>
        <Example title="Ban login brute force on an nginx app">
          <P>
            Your app logs failed logins to nginx's access log as a 401 on{" "}
            <C>/login</C>. Create a filter with <UI>My own regex</UI>:
          </P>
          <Code>{`^<HOST> .* "POST /login HTTP/[0-9.]+" 401`}</Code>
          <P>
            Name the jail <C>nginx-login</C>, log file{" "}
            <C>/var/log/nginx/access.log</C>, ports <C>http,https</C>.
          </P>
          <H3>Test before you turn it on</H3>
          <P>
            <UI>Test a filter</UI> runs <C>fail2ban-regex</C> against real log
            lines (paste a few, or use the log file) and shows which lines
            matched. Turn the jail on only when it matches the failures and
            nothing else.
          </P>
        </Example>
        <Tip>
          <C>{"<HOST>"}</C> is where fail2ban expects the address. A regex
          without it can't ban anyone.
        </Tip>
      </>
    ),
  },
  {
    id: "unban",
    title: "If you lock yourself out",
    body: (
      <>
        <P>
          From Morcheh (it connects from its own address, which is usually not
          the one banned): open <UI>Bans</UI>, find your address and unban it (
          <UI>Unban from every jail</UI> if several jails banned it), then add
          it to <UI>Never ban</UI>.
        </P>
        <P>From the server's console:</P>
        <Code>sudo fail2ban-client unban 198.51.100.7</Code>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          A jail is on but bans nobody: its filter doesn't match the log. Use{" "}
          <UI>Test its filter</UI>; with the systemd backend, check that the
          service logs to the journal.
        </li>
        <li>
          A jail won't start: its log file doesn't exist. Point it at the right
          file, or switch the backend to systemd.
        </li>
        <li>
          The install task says <UI>Fail2ban was installed but didn't start</UI>
          : the package is on, and the tab opens as usual. Usually a jail has no
          log to read. Alpine, for example, turns on its own <C>sshd</C> jail
          that needs <C>/var/log/messages</C>, so run a syslog service or turn
          that jail off, then press <UI>Start</UI>.
        </li>
        <li>
          Read-only view: changes need root or password-less sudo for the login
          user.
        </li>
        <li>
          Banned, but still getting through: the server is behind a proxy or
          load balancer, so fail2ban sees the proxy's address. Ban at the proxy
          instead.
        </li>
      </List>
    ),
  },
]
