import {
  C,
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

export const tunnels: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          Some servers can't be reached straight from the machine Morche runs
          on: they sit in an office network, a customer's data centre or a
          private cloud network. From a laptop you'd first connect a VPN, go
          through a proxy, or ssh to one server and hop on from there.{" "}
          <UI>VPN &amp; tunnels</UI> sets that up once, for Morche.
        </P>
        <P>
          A tunnel is used by picking it under <UI>Reach it through</UI> in the
          settings of what's behind it. From then on everything Morche does with
          it goes through the tunnel.
        </P>
        <Table
          head={["Where", "What goes through it"]}
          rows={[
            [
              <UI key="s">Servers</UI>,
              "Checks, the terminal, files, containers, monitoring, scripts and Ansible runs.",
            ],
            [
              <UI key="d">Databases (by address)</UI>,
              "Monitoring, the data explorer, queries and syncs. Backups then run on a server inside that network (pick it as the runner), not on Morche's own machine.",
            ],
            [
              <UI key="p">Proxmox clusters</UI>,
              "Everything: machines, the console, backups, snapshots.",
            ],
            [
              <UI key="st">Storages</UI>,
              "S3, FTP, SFTP and WebDAV: browsing, transfers, syncs and backups to it.",
            ],
            [
              <UI key="m">Monitors</UI>,
              "Checks made from Morche (From Morche, through). Ping and UDP can't go through a tunnel: use a TCP check, or check from a server behind it.",
            ],
          ]}
        />
        <Tip>
          A tunnel is private to Morche. Nothing changes on the network of the
          machine Morche runs on: no routes, no DNS, no new interfaces. Two VPNs
          that use the same address ranges don't clash either.
        </Tip>
      </>
    ),
  },
  {
    id: "kinds",
    title: "Kinds of tunnel",
    body: (
      <>
        <Table
          head={["Kind", "Use it when"]}
          rows={[
            [
              <UI key="w">WireGuard</UI>,
              "Your VPN gave you a WireGuard .conf file. Runs inside Morche, needs nothing installed.",
            ],
            [
              <UI key="o">OpenVPN</UI>,
              "You have an .ovpn file. Runs openvpn in a private network of its own.",
            ],
            [
              <UI key="a">AnyConnect, Fortinet, GlobalProtect…</UI>,
              "A corporate SSL VPN: Cisco AnyConnect (and ocserv), Fortinet, Palo Alto GlobalProtect, Pulse / Ivanti, F5, Juniper, Array. Uses openconnect.",
            ],
            [
              <UI key="s">SSTP</UI>,
              "A Microsoft SSTP VPN. Needs extra rights on Morche's machine (see below).",
            ],
            [
              <UI key="j">Jump host</UI>,
              "You'd ssh to one server first and hop on from there (ssh -J). The jump host is one of your Morche servers.",
            ],
            [
              <UI key="p">SOCKS5 / HTTP proxy</UI>,
              "There's a proxy that can reach the servers (Dante, ssh -D, Squid, tinyproxy).",
            ],
          ]}
        />
        <P>
          L2TP/IPsec isn't offered: it needs kernel IPsec on Morche's machine
          and can't be kept private to Morche.
        </P>
      </>
    ),
  },
  {
    id: "set-up",
    title: "Set one up",
    body: (
      <>
        <Steps>
          {[
            <P key="1">
              Open <UI>VPN &amp; tunnels</UI> in the sidebar (Network) and pick
              a kind, or use <UI>+</UI> › <UI>VPN or tunnel</UI>.
            </P>,
            <P key="2">
              Fill in the connection. WireGuard: paste the .conf into{" "}
              <UI>Paste the config</UI>, the fields fill in by themselves.
              OpenVPN: <UI>Upload a file</UI>. The others: the address and your
              login.
            </P>,
            <P key="3">
              Under <UI>Test it</UI>, enter a server behind it as{" "}
              <C>host:port</C> (for example <C>10.0.0.5:22</C>) and press{" "}
              <UI>Test</UI>. Morche connects with what's on the page, reaches
              that address and shows what happened. Nothing is saved.
            </P>,
            <P key="4">
              Save, then open a server's <UI>Edit</UI> and pick the tunnel under{" "}
              <UI>Reach it through</UI>. Its Host is the address as seen from
              inside the VPN.
            </P>,
          ]}
        </Steps>
        <P>
          Setting up, changing or removing a tunnel needs Owner access to the
          workspace. Operators can connect and disconnect it, read its log and
          pick it for a server.
        </P>
      </>
    ),
  },
  {
    id: "how-it-runs",
    title: "When it connects",
    body: (
      <>
        <P>
          A tunnel opens the first time a server needs it and closes after 10
          minutes without use. <UI>Connect now</UI> on its page opens it right
          away (to check it works); <UI>Disconnect</UI> closes it and drops its
          servers' connections, which open it again on next use.
        </P>
        <P>
          Each card shows the state: <UI>Idle</UI> (opens when used),{" "}
          <UI>Connecting</UI>, <UI>Connected</UI> with Morche's address inside
          the VPN and how many connections are open, or <UI>Failed</UI> with the
          reason. A failing tunnel that servers use shows in red in the menu.
          The <UI>Log</UI> on its page shows what the VPN program wrote.
        </P>
        <P>
          Changing a tunnel's settings reconnects it on next use; the servers'
          connections through it are dropped so they pick up the new settings.
        </P>
      </>
    ),
  },
  {
    id: "alerts",
    title: "Get told when a tunnel fails",
    body: (
      <>
        <P>
          An alert rule <UI>Tunnel down</UI> (Alerts › New rule › Tunnels, or{" "}
          <UI>Alert me when it fails</UI> on a tunnel's page) watches every
          tunnel in the workspace that something goes through. It fires when one
          can't connect, on the channels you pick (Telegram, email…), and says
          so again when it connects.
        </P>
        <P>
          A tunnel nothing uses never fails: it only opens when needed. The
          servers, databases and monitors behind it keep it busy, since each is
          checked on its own.
        </P>
      </>
    ),
  },
  {
    id: "names",
    title: "Names inside the VPN",
    body: (
      <>
        <P>
          A server's Host can be a name that only exists inside the VPN. Morche
          looks it up with the VPN's name servers: the ones it hands out
          (OpenVPN, AnyConnect & co.) or the ones in <UI>DNS servers</UI>{" "}
          (WireGuard's <C>DNS =</C> line fills it in). Names the VPN doesn't
          know are looked up as usual.
        </P>
        <Recommended
          rows={[
            {
              setting: "Server Host behind a VPN",
              value: "Its IP address",
              why: "Unless the VPN has its own name server: one less thing to go wrong.",
            },
            {
              setting: "WireGuard keepalive",
              value: "25 s (blank)",
              why: "Keeps the tunnel open through NAT and firewalls.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "certificates",
    title: "Self-signed VPN servers",
    body: (
      <>
        <P>
          AnyConnect, Fortinet and the other openconnect VPNs check the server's
          certificate. When it isn't signed by a known authority (an ocserv with
          a self-signed certificate, say), <UI>Test</UI> stops and shows its
          fingerprint (<C>pin-sha256:…</C>). Compare it with what your VPN admin
          gives you, then press <UI>Trust this certificate</UI>: Morche trusts
          that one certificate only, and refuses if it ever changes.
        </P>
        <P>
          SSTP has <UI>Accept an untrusted certificate</UI> instead; only use it
          for a server you trust.
        </P>
      </>
    ),
  },
  {
    id: "jump-hosts",
    title: "Jump hosts",
    body: (
      <>
        <P>
          A jump host is one of your Morche servers. Morche signs in to it with
          its saved login and opens connections onward from there, like{" "}
          <C>ssh -J</C>. The jump host needs <C>AllowTcpForwarding</C> (on by
          default in OpenSSH).
        </P>
        <P>
          Chains work: the jump host can itself be reached through a VPN or
          another jump host, up to five hops. Morche refuses a chain that goes
          round in a loop.
        </P>
        <Example title="A bastion in a private network">
          Add the bastion as a server (it has a public address), add a{" "}
          <UI>Jump host</UI> tunnel through it, then add the private servers
          with their private addresses and pick the tunnel.
        </Example>
      </>
    ),
  },
  {
    id: "ovpn",
    title: "What an .ovpn file may hold",
    body: (
      <>
        <P>
          Morche uses an .ovpn file for its connection settings only. Lines that
          would run a program (<C>up</C>, <C>down</C>, <C>route-up</C>…), load a
          plugin, write files or read files from Morche's disk are refused when
          you save. Certificates and keys must be inside the file:
        </P>
        <Code>{`<ca>
-----BEGIN CERTIFICATE-----
…
-----END CERTIFICATE-----
</ca>`}</Code>
        <P>
          When the file has <C>auth-user-pass</C>, enter the username and
          password on the form. An encrypted private key asks for its
          passphrase.
        </P>
      </>
    ),
  },
  {
    id: "docker",
    title: "Running Morche in Docker",
    body: (
      <>
        <P>
          WireGuard, the openconnect VPNs, proxies and jump hosts work in the
          official image as it is. OpenVPN needs a tun device and user
          namespaces; SSTP needs root. In the backend's service:
        </P>
        <Code>{`devices:
  - /dev/net/tun        # OpenVPN
security_opt:
  - seccomp=unconfined  # user namespaces (also used by Ansible's sandbox)
  - apparmor=unconfined`}</Code>
        <List>
          <li>
            SSTP also needs <C>/dev/ppp</C> in <C>devices</C>, <C>user: root</C>{" "}
            and <C>cap_add: [NET_ADMIN]</C>.
          </li>
          <li>
            Outside Docker, install <C>openvpn</C>, <C>openconnect</C> or{" "}
            <C>sstp-client</C> for the kinds you use. A card says when its
            program is missing.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <Table
          head={["It says", "Try"]}
          rows={[
            [
              "No answer from the WireGuard server",
              "Check the endpoint, both keys, and that the server's UDP port is open to Morche's machine.",
            ],
            [
              "Connected, but couldn't reach 10.0.0.5:22",
              "The VPN is up but doesn't route there: check Allowed IPs (WireGuard) or the routes the VPN pushes, and that the server listens on that port.",
            ],
            [
              "The VPN refused the username or password",
              "Check the login; VPNs that ask for a one-time code can't be used.",
            ],
            [
              "Couldn't make a private network for the VPN",
              "User namespaces are blocked: in Docker add the security_opt lines above.",
            ],
            [
              "Couldn't look up …",
              "The name only exists inside the VPN: set its DNS servers, or use the IP address.",
            ],
          ]}
        />
        <Warn>
          A tunnel reaches a whole network, not just one server. Only Owners can
          set them up; anyone who can edit a server and has Operator access to
          the workspace can send it through one.
        </Warn>
        <P>
          See also <See guide="servers">Servers</See> for adding the servers
          themselves.
        </P>
      </>
    ),
  },
]
