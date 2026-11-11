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

export const firewall: GuideSection[] = [
  {
    id: "what",
    title: "What this page does",
    body: (
      <>
        <P>
          The firewall decides who can reach this server, and on which ports.
          This page lets you do that without typing commands. It works with{" "}
          <UI>ufw</UI> (usual on Ubuntu and Debian) and <UI>firewalld</UI>{" "}
          (usual on RHEL, Rocky and Fedora), and the rules stay in that tool, so
          they keep working if you stop using Morche.
        </P>
        <List>
          <li>
            <UI>Rules</UI>: everything the firewall allows or blocks.
          </li>
          <li>
            <UI>Ports</UI>: what's listening on this server, and whether the
            outside world can reach it. Start here if you aren't sure.
          </li>
          <li>
            <UI>Forwarding</UI>: sends what arrives on a port to another port,
            or to another machine.
          </li>
          <li>
            <UI>Blocked</UI>: who tried to connect and was stopped, with one
            click to allow them or block them for good.
          </li>
        </List>
        <P>
          Less common actions sit behind the <UI>⋯</UI> button, and rarely used
          rule options behind <UI>More options</UI> in the rule form.
        </P>
      </>
    ),
  },
  {
    id: "turn-on",
    title: "Turning the firewall on",
    body: (
      <>
        <P>
          If the server has no firewall, the page offers to install one with the
          server's package manager. Installing changes nothing yet: the firewall
          stays off until you turn it on.
        </P>
        <Steps>
          <div>
            Press <UI>Turn on</UI>.
          </div>
          <div>
            Tick the ports that should stay open. The list shows what's
            listening now. SSH is always kept open, so Morche can still reach
            the server.
          </div>
          <div>Confirm, then check that what you use still works.</div>
          <div>
            Press <UI>Keep it</UI> in the banner. If you don't, the firewall
            goes back to how it was (see{" "}
            <See guide="firewall" section="undo">
              the safety net
            </See>
            ).
          </div>
        </Steps>
      </>
    ),
  },
  {
    id: "daily",
    title: "Everyday tasks",
    body: (
      <>
        <H3>Open a port</H3>
        <P>
          On <UI>Ports</UI>, press <UI>Allow</UI> on the row. Or press{" "}
          <UI>Add rule</UI> and pick a shortcut such as <UI>Web</UI>, or type a
          port.
        </P>
        <Example title="Let the office reach PostgreSQL, and nobody else">
          <UI>Add rule</UI> › <UI>Allow</UI> › port <C>5432</C> ›{" "}
          <UI>Specific address</UI> › <C>203.0.113.0/24</C> › note <C>Office</C>
          .
        </Example>
        <P>
          The port field takes one port (<C>443</C>), a range (<C>5000-5010</C>)
          or a list (<C>80,443</C>). The address field takes one address or a
          network like <C>10.0.0.0/8</C>. <UI>Use mine</UI> fills in the address
          you're connected from.
        </P>
        <H3>Close a port</H3>
        <P>
          On <UI>Ports</UI>, press <UI>Close</UI>: this removes the rules that
          open it. The program keeps running, it just can't be reached from
          outside.
        </P>
        <H3>Block an address</H3>
        <P>
          Press <UI>Block address</UI> at the top, or use the button on a row of
          the <UI>Blocked</UI> tab. Blocks go first, so they win over any allow
          rule.
        </P>
        <H3>Change or remove a rule</H3>
        <P>
          Use the <UI>⋯</UI> on a row (on a phone, tap the row). Tick several
          rows to delete them together. Search and the <UI>Allow</UI> /{" "}
          <UI>Block</UI> filters help on a long list.
        </P>
        <H3>Change the order of the rules</H3>
        <P>
          On ufw the first rule that matches decides, so order matters. Drag a
          row by its grip, or use <UI>Move to top</UI>, <UI>Move up</UI> and{" "}
          <UI>Move down</UI> in its <UI>⋯</UI> menu. Dragging is off while you
          search or filter, because only the whole list has an order. A rule
          that only applies to IPv6 can't be moved among the others. firewalld
          has no order, so these aren't offered there.
        </P>
      </>
    ),
  },
  {
    id: "undo",
    title: "The safety net",
    body: (
      <>
        <P>
          A firewall mistake can cut you off from your own server. Before a
          change that could affect SSH, or turns the firewall on, Morche saves
          the current rules and starts a 90-second timer on the server itself.
        </P>
        <List>
          <li>
            If Morche can't open a new connection after the change, it puts
            everything back and tells you the change was undone.
          </li>
          <li>
            If it can, a banner counts down. Press <UI>Keep it</UI> to keep the
            change, or <UI>Undo now</UI> to go back.
          </li>
          <li>
            If you do nothing, or you lose your connection, the server restores
            the old rules by itself when the time runs out.
          </li>
        </List>
        <P>
          While the banner is showing, other firewall changes are paused.
          Ordinary rules that don't affect SSH apply straight away, without a
          countdown.
        </P>
        <Tip>
          The SSH rule shows a lock icon. Morche won't stop you editing it, but
          check the banner before moving on.
        </Tip>
      </>
    ),
  },
  {
    id: "history",
    title: "History: going back",
    body: (
      <>
        <P>
          <UI>⋯</UI> › <UI>History</UI> lists the last 50 changes made through
          Morche: what changed, who did it and when. It still opens while the
          server is down.
        </P>
        <Steps>
          <div>
            Press <UI>Go back to before this…</UI> on a change.
          </div>
          <div>
            Read what would come back, what would go, and which settings would
            change. Nothing has happened yet.
          </div>
          <div>
            Press <UI>Go back</UI>, then <UI>Keep it</UI> in the banner once
            you've checked that everything still works.
          </div>
        </Steps>
        <P>
          Going back returns the whole firewall to how it was at that moment, so
          it also takes back every change made after it. Going back is itself a
          change in the list, so you can take it back too.
        </P>
        <Tip>
          Changes made by hand on the server aren't in the list. Going back
          replaces them too, and the preview shows them, so read it first.
        </Tip>
      </>
    ),
  },
  {
    id: "forwarding",
    title: "Port forwarding",
    body: (
      <>
        <P>
          A forward sends what arrives on a port somewhere else: to another port
          on this server, or to another machine this server can reach. Open the{" "}
          <UI>Forwarding</UI> tab and press <UI>Add forward</UI>.
        </P>
        <Example title="Reach a web server on a private network">
          Port it arrives on <C>8080</C> › <UI>Another machine</UI> › address{" "}
          <C>10.0.0.5</C> › port there <C>80</C>. Opening port 8080 on this
          server now shows that machine's site.
        </Example>
        <Example title="Answer on a second port">
          Port it arrives on <C>8443</C> › <UI>This server</UI> › port{" "}
          <C>443</C>.
        </Example>
        <P>
          <UI>More options</UI> limits a forward to one address or network, or
          to one network card (ufw), or puts it in a zone (firewalld).
        </P>
        <List>
          <li>
            Morche also allows the traffic a forward needs, so you don't need a
            separate rule.
          </li>
          <li>
            When a forward goes to this server, its target port can then be
            reached directly too.
          </li>
          <li>
            Forwards to another machine turn on IP forwarding on this server. It
            stays on after the last one is deleted, in case something else
            relies on it.
          </li>
          <li>
            Forwards only work while the firewall is on. They wait while it's
            off.
          </li>
          <li>IPv4 only.</li>
        </List>
        <Warn>
          The port Morche reaches the server on can't be forwarded, because that
          would cut Morche off.
        </Warn>
      </>
    ),
  },
  {
    id: "apply",
    title: "Applying rules to other servers",
    body: (
      <>
        <P>
          Use this when several servers should have the same rules. Tick rows
          and press <UI>Apply to other servers…</UI>, or use{" "}
          <UI>Apply rules to other servers…</UI> in the <UI>⋯</UI> menu. Then
          tick the servers and start it. It runs as a background task, and{" "}
          <See guide="tasks">Tasks</See> shows what happened on each server.
        </P>
        <List>
          <li>Rules are only added. Nothing is removed from a server.</li>
          <li>Rules a server already has are skipped.</li>
          <li>
            Each server gets all the rules or none of them, and one failing
            doesn't stop the others.
          </li>
          <li>
            A server is left alone if the rules could cut SSH off. Make that
            change on its own page, where the safety net can ask you to confirm.
          </li>
          <li>
            If a server's firewall is off, the rules are saved and do nothing
            until it's on.
          </li>
          <li>
            Between ufw and firewalld, what the other tool lacks is dropped:
            zones going to ufw, notes going to firewalld.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "more-options",
    title: "More options on a rule",
    body: (
      <>
        <P>Most rules don't need these. Open them when you do:</P>
        <List>
          <li>
            <UI>Rate limit</UI>: slows down an address that opens many
            connections. Good for SSH.
          </li>
          <li>
            <UI>Protocol</UI>: TCP, UDP or both. DNS and game servers often need
            UDP.
          </li>
          <li>
            <UI>Direction</UI>: traffic leaving the server, to stop it reaching
            something (ufw).
          </li>
          <li>
            <UI>Interface</UI>: only on one network card, such as a private one
            (ufw).
          </li>
          <li>
            <UI>Zone</UI>: which zone the rule belongs to (firewalld).
          </li>
          <li>
            <UI>To this address</UI>: only for one of the server's own
            addresses.
          </li>
          <li>
            <UI>Log matches</UI>: write a line to the log each time the rule
            applies.
          </li>
          <li>
            <UI>Put first</UI>: on ufw the first matching rule decides, so this
            makes the rule win over the others. For a rule that already exists,
            use <UI>Move to top</UI> in its <UI>⋯</UI> menu.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "settings",
    title: "Settings and the ⋯ menu",
    body: (
      <>
        <List>
          <li>
            <See guide="firewall" section="history">
              History
            </See>
            : what changed through Morche, with a way back.
          </li>
          <li>
            <See guide="firewall" section="apply">
              Apply rules to other servers
            </See>
            : copy rules from here to the servers you tick.
          </li>
          <li>
            <UI>Settings</UI>: what happens to traffic no rule mentions, and how
            much is logged. On firewalld, also the default zone.
          </li>
          <li>
            <UI>View raw rules</UI>: the firewall's own output, to read or copy.
          </li>
          <li>
            <UI>Turn off</UI>: every port becomes reachable. Your rules are
            kept.
          </li>
          <li>
            <UI>Remove every rule</UI>: starts from an empty firewall, keeping
            SSH open.
          </li>
        </List>
        <Recommended
          rows={[
            {
              setting: "Incoming",
              value: "Block",
              why: "Only what your rules allow gets in.",
            },
            {
              setting: "Outgoing",
              value: "Allow",
              why: "Blocking it means listing everything the server needs.",
            },
            {
              setting: "Logging",
              value: "Low",
              why: "Fills the Blocked tab without filling the disk.",
            },
            {
              setting: "Databases, admin tools",
              value: "Specific address",
              why: "These should never be open to the whole internet.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "ufw-firewalld",
    title: "ufw and firewalld",
    body: (
      <>
        <P>
          The page looks the same on both, but the tools differ in a few ways:
        </P>
        <List>
          <li>
            <UI>ufw</UI> checks rules from the top and the first match decides.
            It has notes, outgoing rules and per-interface rules.
          </li>
          <li>
            <UI>firewalld</UI> groups rules into zones and has no order: a block
            for one address always wins over a general allow. It has no notes,
            so the note field isn't shown.
          </li>
        </List>
        <P>
          On firewalld the list shows the default zone and the zones in use.
          Zones nothing is assigned to have no effect, so they aren't offered.
        </P>
        <P>
          If the server uses plain iptables or nftables, the rules are shown but
          can't be changed here. <UI>View raw rules</UI> shows them in full.
        </P>
      </>
    ),
  },
  {
    id: "access",
    title: "Who can do what",
    body: (
      <List>
        <li>
          <UI>Viewer</UI>: sees rules, ports and forwards.
        </li>
        <li>
          <UI>Operator</UI>: also the <UI>Blocked</UI> tab, raw rules and
          history.
        </li>
        <li>
          <UI>Engineer</UI>: changes everything, including moving rules,
          forwards and going back, and needs root or password-less sudo on the
          server. Applying rules to other servers needs Engineer on each of
          them.
        </li>
      </List>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <H3>The change was undone</H3>
        <P>
          Morche lost its connection after the change, so it put the old rules
          back. Check that a rule still allows the SSH port from Morche's
          address.
        </P>
        <H3>I allowed a port but it still can't be reached</H3>
        <List>
          <li>
            Check <UI>Ports</UI>. If the port isn't listed, nothing is listening
            on it from outside, or the program only listens on <C>127.0.0.1</C>.
          </li>
          <li>
            On ufw, a block rule above it may match first: use{" "}
            <UI>Move to top</UI> on your rule or remove that one.
          </li>
          <li>
            A cloud provider's firewall (security groups) sits in front of this
            one and has to allow the port too.
          </li>
        </List>
        <H3>A blocked port can still be reached</H3>
        <P>
          Ports published by Docker usually skip ufw and firewalld, because
          Docker writes its own rules. The page warns you about this. Publish
          the port on <C>127.0.0.1</C> instead, for example:
        </P>
        <Code>{"docker run -p 127.0.0.1:8080:80 nginx"}</Code>
        <H3>A forward doesn't work</H3>
        <List>
          <li>The firewall has to be on.</li>
          <li>
            From this server itself a forward doesn't apply: test from another
            machine.
          </li>
          <li>
            Going to another machine, that machine has to be reachable from this
            server, and allow the port.
          </li>
          <li>
            A forward set up by hand that Morche doesn't recognise isn't listed:
            see <UI>View raw rules</UI>.
          </li>
        </List>
        <H3>Applying rules failed on some servers</H3>
        <P>
          Open the task: each server has a line with its reason. The servers
          that worked keep their rules, and running it again skips what they
          have.
        </P>
        <H3>The Blocked tab is empty</H3>
        <P>
          Blocked connections are only recorded while logging is on. The tab
          offers <UI>Turn on logging</UI>, or use <UI>Settings</UI>. Without
          root or password-less sudo, Morche may not be able to read the log.
        </P>
        <H3>"Couldn't list the ports"</H3>
        <P>
          The server has neither <C>ss</C> nor <C>netstat</C>. Install{" "}
          <C>iproute2</C>, or add rules by hand with <UI>Add rule</UI>.
        </P>
        <Warn>
          If you're ever locked out for good, use your provider's web console
          and run <C>ufw disable</C>, or <C>systemctl stop firewalld</C>.
        </Warn>
      </>
    ),
  },
]
