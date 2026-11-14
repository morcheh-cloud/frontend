import {
  C,
  Code,
  Example,
  type GuideSection,
  List,
  P,
  Recommended,
  See,
  Table,
  UI,
  Warn,
} from "../components/prose"

export const ports: GuideSection[] = [
  {
    id: "what",
    title: "What it shows",
    body: (
      <>
        <P>
          <UI>Open ports</UI> lists every TCP and UDP port something listens on,
          the program or container that holds it, and who can reach it. Press{" "}
          <UI>Refresh</UI> to scan again. Click a port for its details: every
          address it listens on, the process (PID, user, command) or container
          (image, Compose project, where it forwards to).
        </P>
        <Table
          head={["Reach", "Meaning"]}
          rows={[
            [
              <UI key="p">Public</UI>,
              "Listens on every address (0.0.0.0 or ::) or a public IP. Other machines can connect unless a firewall blocks it.",
            ],
            [
              <UI key="n">Private network</UI>,
              "Bound to a LAN or VPN address only, e.g. 10.0.0.5.",
            ],
            [
              <UI key="l">Local only</UI>,
              "Bound to 127.0.0.1 or ::1. Only programs on this server can connect.",
            ],
          ]}
        />
        <P>
          Reach is worked out from the address alone: Morche doesn't know about
          your cloud firewall, so <UI>Public</UI> means "open unless something
          else blocks it".
        </P>
      </>
    ),
  },
  {
    id: "risks",
    title: "Warnings",
    body: (
      <>
        <P>Two things get flagged on a port's details:</P>
        <List>
          <li>
            <UI>
              A database or admin service is reachable from other machines
            </UI>
            : MySQL, PostgreSQL, Redis, MongoDB, Elasticsearch and the like
            should almost never be public. The <UI>Exposed databases</UI> filter
            lists just those.
          </li>
          <li>
            <UI>Docker bypasses ufw for this port</UI>: Docker writes its own
            firewall rules ahead of ufw and firewalld, so a published container
            port stays open even if ufw says it's blocked.
          </li>
        </List>
        <P>
          A container's port also gets a <UI>Who can reach it</UI> section.{" "}
          <UI>Limit who can reach it</UI> (Engineer) lets only the addresses you
          list connect, or nobody from outside; the warnings go away once a
          limit covers the port. See{" "}
          <See guide="firewall" section="containers">
            Container ports
          </See>
          .
        </P>
      </>
    ),
  },
  {
    id: "examples",
    title: "Closing an exposed port",
    body: (
      <>
        <Example title="PostgreSQL listening publicly">
          <P>
            Port 5432 shows <UI>Public</UI>. If only apps on this server use it,
            bind it to loopback in <C>postgresql.conf</C>:
          </P>
          <Code>listen_addresses = 'localhost'</Code>
          <P>
            Then <C>sudo systemctl restart postgresql</C> and <UI>Refresh</UI>:
            it should now read <UI>Local only</UI>.
          </P>
        </Example>
        <Example title="Redis in Docker Compose">
          <P>Publish the port on 127.0.0.1 instead of every address:</P>
          <Code>{`
services:
  redis:
    image: redis:7
    ports:
      - "127.0.0.1:6379:6379"   # not "6379:6379"
`}</Code>
          <P>
            Better still, drop <C>ports:</C> entirely when only other containers
            in the same Compose project need it; they reach it by service name.
          </P>
        </Example>
        <Example title="A container port only some machines need">
          <P>
            Open the port's details › <UI>Limit who can reach it</UI>, add the
            addresses (or <UI>Private networks</UI>) and save. ufw rules don't
            work here, since Docker skips them.
          </P>
        </Example>
        <Example title="A service other machines do need">
          <P>Keep it public but allow only known addresses:</P>
          <Code>{`
sudo ufw allow from 203.0.113.0/24 to any port 5432 proto tcp
sudo ufw deny 5432/tcp
`}</Code>
        </Example>
      </>
    ),
  },
  {
    id: "recommended",
    title: "A sensible baseline",
    body: (
      <>
        <Recommended
          rows={[
            {
              setting: "Public",
              value: "SSH, 80, 443",
              why: "Usually all a web server needs. Anything else public should have a reason.",
            },
            {
              setting: "Databases, caches",
              value: "Local only",
              why: "Bind to 127.0.0.1, or a private network if another server needs them.",
            },
            {
              setting: "Admin panels",
              value: "Local only",
              why: "Reach them over an SSH tunnel or a VPN instead.",
            },
            {
              setting: "Docker ports",
              value: "127.0.0.1:host:container",
              why: "ufw can't close them, so don't publish them openly.",
            },
          ]}
        />
        <P>
          Protect the public SSH port against password guessing with{" "}
          <See guide="fail2ban" />.
        </P>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <List>
          <li>
            Owner shows <UI>Hidden</UI>: the login user can only see its own
            processes. Log in as root, or allow <C>sudo -n</C>, to see every
            owner.
          </li>
          <li>
            Containers have no names: the login user isn't in the <C>docker</C>{" "}
            group, so Morche can't ask Docker.
          </li>
          <li>
            <UI>No tool to list sockets</UI>: install <C>iproute2</C> (for{" "}
            <C>ss</C>) on the server.
          </li>
        </List>
        <Warn>
          Adding a user to the <C>docker</C> group is the same as giving it
          root. Do it only for an account you'd trust with root anyway.
        </Warn>
      </>
    ),
  },
]
