import {
  C,
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

export const networkMap: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          The <UI>Network map</UI> draws all your servers on one canvas, with
          the networks they sit on and whether they can actually reach each
          other. Use it to answer questions like “are these two on the same
          LAN?”, “which servers are on the VPN?” or “why can't the app server
          talk to the database?”.
        </P>
        <P>
          Open <UI>Network map</UI> in the sidebar, right below Servers. On a
          phone, tap the network icon at the top of the Servers page, or find it
          under <UI>More</UI>.
        </P>
        <Table
          head={["View", "Answers"]}
          rows={[
            [
              "Networks",
              "Who shares a network, and what leads to the internet",
            ],
            ["Reachability", "Which servers can open a connection to which"],
            [
              "Matrix",
              "The same tests as a table: every pair, both directions",
            ],
            ["From Morche", "How Morche itself gets to each server"],
          ]}
        />
      </>
    ),
  },
  {
    id: "scan",
    title: "How the scan works",
    body: (
      <>
        <P>
          Morche connects to each server over SSH and reads its interfaces,
          addresses and default routes. Then each server tries to reach the
          others on their SSH port, and pings them. Nothing is installed and no
          settings change.
        </P>
        <Steps>
          <>
            Open the page. The latest scan loads, or a new one runs if there
            isn't any. It takes a few seconds.
          </>
          <span>
            Press the <UI>Scan again</UI> icon after changing a firewall or a
            network. The old map stays on screen until the new one is ready.
          </span>
          <>
            Check the caption next to it for the scan's age, and for any servers
            that couldn't be read.
          </>
        </Steps>
      </>
    ),
  },
  {
    id: "networks",
    title: "Networks view",
    body: (
      <>
        <P>
          Round nodes are networks, square nodes are servers. A line means the
          server has an address on that network. The map reads left to right:
          the internet, then the networks, then the servers, then any container
          networks inside them.
        </P>
        <List>
          <li>
            <UI>Private network</UI>: a LAN range such as <C>192.168.1.0/24</C>.
          </li>
          <li>
            <UI>VPN</UI>: WireGuard, Tailscale, OpenVPN and similar.
          </li>
          <li>
            <UI>Containers</UI>: Docker and similar bridges. These are hidden at
            first because they're private to one server; turn them on with the{" "}
            <UI>Containers</UI> chip.
          </li>
          <li>
            <UI>IPv6</UI>: hidden at first too; turn it on with its chip.
          </li>
        </List>
        <Warn>
          The same range on two servers doesn't prove they share a network:
          every office can use <C>192.168.1.0/24</C>. Check the Reachability
          view to see whether they really connect.
        </Warn>
      </>
    ),
  },
  {
    id: "reachability",
    title: "Reachability and Matrix",
    body: (
      <>
        <P>
          Each pair is tested in both directions, because a firewall can allow
          one and block the other. A line with one arrow means only that
          direction is known to work; the other was blocked or couldn't be
          tested.
        </P>
        <Table
          head={["Result", "What it means"]}
          rows={[
            ["Reachable", "The connection opened on the tested port"],
            [
              "Host up, port closed",
              "The server answers, but nothing accepts connections on that port, or a firewall refuses it",
            ],
            [
              "Blocked",
              "No answer at all: a firewall, or no route between them",
            ],
            [
              "Not tested",
              "The source server couldn't be read, so it couldn't try",
            ],
          ]}
        />
        <P>
          Click a line, or a cell in the Matrix, to see each address that was
          tried, which route it took, and the exact error.
        </P>
        <Example title="The app server can't reach the database">
          <P>
            Open <UI>Reachability</UI> and click the line between the two. If it
            says <UI>Blocked</UI> one way only, look at the firewall on the
            server being reached. If it says <UI>Host up, port closed</UI>, the
            network is fine and the problem is on that server: see its{" "}
            <See guide="ports" />.
          </P>
        </Example>
        <Tip>
          Tests use the SSH port saved for each server. A database or web port
          can still be closed on a pair that shows as reachable.
        </Tip>
      </>
    ),
  },
  {
    id: "from-morcheh",
    title: "From Morche view",
    body: (
      <P>
        Morche sits in the middle, with a line to each server colored by its
        current status and labeled with the connection time. A red line here
        with green lines in Reachability means the server is fine and only
        Morche can't get to it.
      </P>
    ),
  },
  {
    id: "using",
    title: "Moving around",
    body: (
      <>
        <List>
          <li>
            <UI>Click a node or a line</UI> for its details: interfaces, routes,
            members and test results.
          </li>
          <li>
            <UI>Hover a node</UI> to fade everything not connected to it.
          </li>
          <li>
            <UI>Search</UI> by name or IP to fade everything that doesn't match.
          </li>
          <li>
            <UI>Drag nodes</UI> to arrange them (desktop). The arrangement is
            saved in this browser for each view; <UI>Reset layout</UI> brings
            back the automatic one.
          </li>
          <li>
            <UI>Problems only</UI> hides every pair that works.
          </li>
          <li>
            On a phone, pinch to zoom and drag to pan. The Matrix becomes a list
            grouped by source server.
          </li>
        </List>
        <P>
          The view, search and chips are kept in the page's address, so a copied
          link opens the same map.
        </P>
      </>
    ),
  },
  {
    id: "recommended",
    title: "Recommended use",
    body: (
      <Recommended
        rows={[
          {
            setting: "Daily check",
            value: "Reachability + Problems only",
            why: "An empty canvas means every tested pair connects.",
          },
          {
            setting: "Finding what's on a network",
            value: "Networks, containers off",
            why: "Docker bridges add clutter unless you're looking for them.",
          },
          {
            setting: "After changing a firewall",
            value: "Scan again, then check the Matrix",
            why: "Scans are kept for a while, so the map doesn't update by itself.",
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
        head={["Problem", "What to do"]}
        rows={[
          [
            "A server shows a warning triangle",
            "Morche couldn't read it. Click it for the error, usually a connection or login problem. Other servers still try to reach it.",
          ],
          [
            "Two servers in one office aren't joined",
            "They may be on different ranges. Check each server's interfaces in its details.",
          ],
          [
            "Everything says Not tested",
            "The source servers have neither bash nor nc, or couldn't be read. Open a link to see the message.",
          ],
          [
            "Ping says no answer but the port is open",
            "Normal when a firewall drops ping. The port result is the one that counts.",
          ],
          [
            "A server has no addresses",
            "It's missing the ip tool and its fallback data was empty. Install iproute2.",
          ],
          [
            "The map looks out of date",
            "Press Scan again. The previous result is reused for a while to keep the page fast.",
          ],
        ]}
      />
    ),
  },
]
