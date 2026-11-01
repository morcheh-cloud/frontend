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

export const power: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          The power icon in a server's header reboots or shuts it down, right
          away or on a timer. Its menu also shows how long the server has been
          up, who is logged in and whether a reboot is waiting (after a kernel
          or library update). On a phone the same actions are in the app bar's{" "}
          <UI>⋯</UI> sheet.
        </P>
        <Table
          head={["Action", "What happens"]}
          rows={[
            [
              <UI key="r">Reboot</UI>,
              "Everything stops and starts again. Services enabled at boot come back by themselves; open terminals and SSH sessions are cut.",
            ],
            [
              <UI key="s">Shut down</UI>,
              "The server powers off and stays off. Morcheh can't turn it back on: you'll need your provider's console, a power button or Wake-on-LAN.",
            ],
          ]}
        />
        <P>
          Both run as root, so the login user must be root or allowed{" "}
          <C>sudo</C>. Otherwise the actions are greyed out and the menu says
          why.
        </P>
      </>
    ),
  },
  {
    id: "reboot",
    title: "Reboot a server",
    body: (
      <>
        <Steps>
          <div>
            Open the server, press the power icon in the header (phone:{" "}
            <UI>⋯</UI>) and pick <UI>Reboot…</UI>.
          </div>
          <div>
            Pick <UI>Now</UI>, or <UI>Later</UI> and how long to wait (1 minute
            to 24 hours). <UI>Later</UI> needs systemd.
          </div>
          <div>
            Optionally write a message: everyone logged in gets it on their
            terminal (<C>wall</C>).
          </div>
          <div>
            Confirm. A panel above every section of the server follows it while
            it's down and tells you when it's back and how long it took.
          </div>
        </Steps>
        <P>
          A scheduled reboot shows as a notice with a countdown and a{" "}
          <UI>Cancel it</UI> button on every section until it happens (also in
          the power menu). Anyone on the server can also cancel it with{" "}
          <C>sudo shutdown -c</C>.
        </P>
        <Tip>
          If the server isn't back after 10 minutes the page stops waiting.
          Press <UI>Keep waiting</UI> for slow machines, or check your
          provider's console.
        </Tip>
      </>
    ),
  },
  {
    id: "shutdown",
    title: "Shut down a server",
    body: (
      <>
        <P>
          Pick <UI>Shut down…</UI> in the power menu. Shutting down right away
          asks you to type the server's name, since there's no undo from
          Morcheh. A scheduled shutdown doesn't ask: you can still cancel it
          until it happens.
        </P>
        <Warn>
          Many cloud providers keep billing a stopped VM. To stop paying, delete
          or stop it in the provider's panel instead.
        </Warn>
      </>
    ),
  },
  {
    id: "reboot-needed",
    title: "Reboot needed",
    body: (
      <>
        <P>
          A dot on the power icon and a <UI>Reboot needed</UI> line in its menu
          appear when the server reports it needs one, with the reason:
        </P>
        <List>
          <li>
            Debian and Ubuntu: <C>/var/run/reboot-required</C> exists (with the
            packages that asked for it).
          </li>
          <li>
            RHEL, Rocky, Alma, Fedora: <C>needs-restarting -r</C> says so.
          </li>
          <li>
            Any distribution: the running kernel's modules are gone from{" "}
            <C>/lib/modules</C>, i.e. a newer kernel was installed.
          </li>
        </List>
        <P>
          Until you reboot, the server keeps running the old kernel and
          libraries, including their security holes.
        </P>
      </>
    ),
  },
  {
    id: "examples",
    title: "Examples",
    body: (
      <>
        <Example title="Kernel update on a production server">
          <P>
            After installing updates the page shows <UI>Reboot needed</UI>. Pick{" "}
            <UI>Reboot</UI> → <UI>Later</UI> → <UI>15 minutes</UI> with the
            message:
          </P>
          <Code>Rebooting for a kernel update, back in about a minute</Code>
          <P>
            Logged-in users are warned, and you can cancel if someone asks for
            more time.
          </P>
        </Example>
        <Example title="Reboot during a quiet hour">
          <P>
            Scheduling goes up to 24 hours ahead. For a fixed time every week,
            use a <See guide="cron" /> job instead:
          </P>
          <Code>0 4 * * 0 /sbin/shutdown -r now</Code>
        </Example>
      </>
    ),
  },
  {
    id: "recommended",
    title: "Good habits",
    body: (
      <Recommended
        rows={[
          {
            setting: "Busy server",
            value: "Later, 5–15 minutes",
            why: "Gives logged-in users time to save their work, and you time to cancel.",
          },
          {
            setting: "Message",
            value: "Why, and for how long",
            why: "Saves you from questions while the server is down.",
          },
          {
            setting: "Services",
            value: "Enabled at boot",
            why: "Check with systemctl is-enabled before rebooting, so they come back by themselves.",
          },
          {
            setting: "After a kernel update",
            value: "Reboot within days",
            why: "The fix isn't in effect until the new kernel runs.",
          },
        ]}
      />
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          <UI>Reboot…</UI> and <UI>Shut down…</UI> are greyed out: the menu says
          why. Usually the server is offline, or the login user has no root
          access. Log in as root or allow passwordless <C>sudo</C> (see{" "}
          <See guide="users" />
          ).
        </li>
        <li>
          No <UI>Later</UI> option: the server has no systemd (e.g. Alpine,
          containers), so only immediate actions work. Use a{" "}
          <See guide="cron" /> job to reboot at a set time.
        </li>
        <li>
          A container stopped instead of rebooting: in a container, reboot and
          shutdown stop it, and it only comes back if its restart policy (e.g.{" "}
          <C>restart: unless-stopped</C>) or orchestrator starts it.
        </li>
        <li>
          The server never came back: it may be stuck at boot (a full disk, a
          bad <C>/etc/fstab</C> line, a disk check). Open your provider's
          console to see the boot screen.
        </li>
      </List>
    ),
  },
]
