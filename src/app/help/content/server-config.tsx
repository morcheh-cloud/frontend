import {
  C,
  type GuideSection,
  P,
  Recommended,
  Steps,
  Tip,
  UI,
  Warn,
} from "../components/prose"

export const serverConfig: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          The Linux files people edit most, with a form instead of a text
          editor: network interfaces, DNS, <C>/etc/hosts</C> (the server's{" "}
          <UI>Network</UI> tab), and the hostname, time zone, time sync and
          package sources (its <UI>System settings</UI> tab).
        </P>
        <P>
          Every save checks the new file with the tool itself before it counts (
          <C>netplan generate</C>, <C>apt-cache policy</C>…): if the tool
          refuses, the old file is put back and nothing changed. Lines Morche
          doesn't understand and comments stay as they were.
        </P>
        <P>
          Reading needs <UI>Viewer</UI>, the history <UI>Operator</UI>, changes{" "}
          <UI>Engineer</UI> plus root or sudo on the server.
        </P>
      </>
    ),
  },
  {
    id: "interfaces",
    title: "Network interfaces",
    body: (
      <>
        <P>
          Each interface shows its live addresses, gateway and MTU, and how it
          is set up (netplan or NetworkManager). The one tagged <UI>Morche</UI>{" "}
          is the one Morche connects through. Docker and bridge interfaces are
          listed but not edited.
        </P>
        <Steps>
          <li>Press the pencil on an interface.</li>
          <li>
            Pick <UI>Automatic (DHCP)</UI> or <UI>Fixed address</UI>; addresses
            are written with their prefix, like <C>192.168.1.10/24</C>.
          </li>
          <li>
            <UI>Review</UI> shows the file before and after and the commands
            that will run. Then <UI>Apply</UI>.
          </li>
          <li>
            Check the server still answers and press <UI>Keep it</UI> within 90
            seconds.
          </li>
        </Steps>
        <Warn>
          If you don't press Keep it, or Morche can't reach the server after the
          change, the server puts the old config back by itself. Taking away the
          address Morche connects to has to be confirmed.
        </Warn>
        <Tip>
          Clearing a set MTU takes effect after a reboot: netplan doesn't reset
          a running link. A file written by cloud-init (
          <C>50-cloud-init.yaml</C>) would be rewritten at boot, so saving it
          also turns cloud-init's network config off (Morche asks first).
        </Tip>
      </>
    ),
  },
  {
    id: "dns",
    title: "DNS and the hosts file",
    body: (
      <>
        <P>
          With systemd-resolved, the servers you set go into Morche's own file{" "}
          <C>/etc/systemd/resolved.conf.d/90-morche.conf</C> on top of what each
          interface brings; empty removes it. With a plain{" "}
          <C>/etc/resolv.conf</C>, that file is edited. When NetworkManager or
          resolvconf writes it, set DNS on the interface instead.{" "}
          <UI>Try a lookup</UI> asks from the server itself, or one chosen DNS
          server.
        </P>
        <P>
          <UI>Hosts file</UI> gives a name to an address for this server only.
          Entries can be turned off without deleting them; a name on two
          addresses is flagged. <UI>Look up</UI> shows what the server gets and
          whether it came from the file or DNS.
        </P>
      </>
    ),
  },
  {
    id: "time",
    title: "Hostname, time zone and time sync",
    body: (
      <>
        <P>
          <UI>Rename</UI> changes the server's own name (Morche's name for it
          stays). Keep <UI>Point 127.0.1.1 at the new name</UI> on, or sudo
          waits on a lookup every time.
        </P>
        <P>
          Time servers go into chrony (its <C>sources.d</C> folder on Ubuntu) or
          a timesyncd drop-in. <UI>Sync now</UI> steps the clock at once.
        </P>
        <Recommended
          rows={[
            {
              setting: "Time zone",
              value: "UTC",
              why: "Logs from every server line up; switch only if people read them in local time.",
            },
            {
              setting: "Time servers",
              value: "Two or three",
              why: "One that stops answering doesn't leave the clock drifting.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "sources",
    title: "Package sources and mirrors",
    body: (
      <>
        <P>
          Every apt source (one-line and <C>.sources</C> files) or yum/dnf{" "}
          <C>.repo</C> section, each with a switch. The distribution's own ones
          can only be turned off; ones you add go into{" "}
          <C>morche-&lt;name&gt;</C> files.
        </P>
        <P>
          <UI>Mirror</UI> (Ubuntu and Debian) points the distribution's
          repositories, security too, at another mirror. Press <UI>Try it</UI>{" "}
          first: the server fetches the release file from it. After any change,
          refresh the package lists on the <UI>Packages</UI> tab.
        </P>
      </>
    ),
  },
  {
    id: "history",
    title: "History and going back",
    body: (
      <P>
        The clock icon on each tab lists the changes made from Morche, with the
        files before and after. <UI>Go back to before this</UI> puts the files
        back through the same checks. Files holding secrets (Wi-Fi keys) are
        kept with them hidden and can't be put back; a time zone change isn't
        undone by it (pick the old zone again).
      </P>
    ),
  },
]
