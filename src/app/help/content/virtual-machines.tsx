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

export const virtualMachines: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <UI>Virtual machines</UI> manages your <UI>Proxmox VE</UI> clusters
          from Morche: virtual machines (QEMU) and containers (LXC) side by
          side, with their power, console, hardware, snapshots, backups,
          cloud-init and firewall, plus the cluster's nodes and storages.
        </P>
        <P>
          Morche talks to each cluster through Proxmox's own HTTP API with an
          API token. Nothing is installed on the nodes, and everything you do
          here is what Proxmox's web UI shows too, and the other way round.
        </P>
        <Table
          head={["Page", "What you do there"]}
          rows={[
            [
              <UI key="m">Virtual machines › Machines</UI>,
              "Every VM and container on every cluster: state, usage, power",
            ],
            [
              <UI key="n">Virtual machines › Nodes</UI>,
              "The cluster's hosts: online, load, memory, Proxmox version",
            ],
            [
              <UI key="s">Virtual machines › Storage</UI>,
              "Each storage's space and content; upload or download ISOs and templates",
            ],
            [
              <UI key="c">Virtual machines › Clusters</UI>,
              "The connected clusters; add, edit, check, disconnect",
            ],
            [
              "A machine's page",
              "Overview, Console, Hardware, Snapshots, Backups, Cloud-init, Firewall, Activity",
            ],
            [<UI key="w">New machine</UI>, "Create a VM or container"],
          ]}
        />
      </>
    ),
  },
  {
    id: "connect",
    title: "Connect a cluster",
    body: (
      <>
        <P>
          Morche needs an <UI>API token</UI>. Make one in Proxmox, then add the
          cluster under <UI>Virtual machines › Clusters › Add cluster</UI>.
        </P>
        <Steps>
          {[
            <>
              In Proxmox, open <UI>Datacenter › Permissions › Users › Add</UI>{" "}
              and make a user for Morche, say <C>morcheh@pve</C>.
            </>,
            <>
              Under <UI>Permissions › Add › User Permission</UI>, give it path{" "}
              <C>/</C> and a role. <C>PVEAuditor</C> is enough to watch;{" "}
              <C>PVEVMAdmin</C> plus <C>PVEDatastoreUser</C> lets you run and
              change machines; <C>Administrator</C> covers everything, migration
              and HA included.
            </>,
            <>
              Under <UI>API Tokens › Add</UI>, make a token for that user.
              Untick <UI>Privilege Separation</UI>, or give the token the same
              permissions as the user.
            </>,
            <>
              In Morche, paste the address of any node (port <C>8006</C> is used
              if you leave it out) and the token. You can paste the whole{" "}
              <C>user@realm!name=secret</C> into the token ID field.
            </>,
            <>
              Press <UI>Test connection</UI>. It fills in the cluster's name
              and, for a self-signed certificate, offers its fingerprint to pin.
            </>,
          ]}
        </Steps>
        <Recommended
          rows={[
            {
              setting: "Certificate",
              value: "Pin the fingerprint",
              why: "Proxmox uses a self-signed certificate. Pinning it is safe; Don't check the certificate is not.",
            },
            {
              setting: "Token role",
              value: "PVEVMAdmin + PVEDatastoreUser",
              why: "Enough for daily work. Use Administrator only if you want migration, HA and the firewall.",
            },
            {
              setting: "Address",
              value: "A node that's always up",
              why: "Morche finds the other nodes from it and moves to them if it goes down.",
            },
          ]}
        />
        <Tip>
          A node on a private address (10.x, 192.168.x…) needs an admin to tick{" "}
          <UI>Allow a private address</UI>, so nobody can use Morche to reach
          your internal network by accident.
        </Tip>
      </>
    ),
  },
  {
    id: "machines",
    title: "Machines",
    body: (
      <>
        <P>
          The <UI>Machines</UI> tab lists every VM and container on every
          cluster you can see, with its state, node, processor and memory use,
          and uptime. Filter by state, kind (VMs / containers / templates), node
          or a search for name, ID, tag or address. Proxmox's own tags show as
          chips.
        </P>
        <P>
          Each row's menu has the power actions: <UI>Start</UI>,{" "}
          <UI>Shut down</UI> (asks the system to stop), <UI>Stop</UI> (pulls the
          plug), <UI>Restart</UI>, <UI>Pause</UI> and <UI>Resume</UI>. Stop and
          Reset ask first. Every action is a Proxmox task that shows in{" "}
          <See guide="tasks">Tasks</See> and on the machine's <UI>Activity</UI>{" "}
          tab.
        </P>
        <Table
          head={["Action", "Who can"]}
          rows={[
            ["See machines, nodes, storages", "Viewer"],
            ["Power, Check now", "Operator"],
            [
              "Console, create, clone, snapshot, edit hardware, migrate, back up, restore, firewall, HA, link, upload",
              "Engineer",
            ],
            [
              "Add, edit or remove a cluster; delete a machine or a volume",
              "Owner",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "new-machine",
    title: "Create a machine",
    body: (
      <>
        <P>
          <UI>New machine</UI> (the button on <UI>Machines</UI>, or{" "}
          <UI>Create a machine from it</UI> on a template) makes a VM or a
          container in one form. Leave a field empty and Morche picks a good
          value: the next free ID, the node with most free memory, the first
          storage that takes disks, <C>vmbr0</C>.
        </P>
        <Table
          head={["Start from", "What happens"]}
          rows={[
            [
              "A template (VM)",
              "The template is cloned, then cloud-init sets the user, keys and network. The fastest way.",
            ],
            [
              "An ISO (VM)",
              "An empty VM boots the installer. Install the system yourself in the Console.",
            ],
            [
              "A container image (LXC)",
              "The container is made from the image with its root password, keys and network.",
            ],
          ]}
        />
        <P>
          Ticking <UI>Add it to Servers</UI> waits for the new machine's address
          (from the guest agent, or the fixed one you typed) and adds it to{" "}
          <See guide="servers">Servers</See> with your SSH key or password,
          already linked to the machine. The progress page follows the task step
          by step; if it fails, <UI>Back to the form</UI> keeps everything you
          typed.
        </P>
        <Example title="A Ubuntu server in under a minute">
          <Steps>
            {[
              <>
                Make a cloud image template once (see{" "}
                <See guide="virtual-machines" section="templates">
                  Templates
                </See>
                ).
              </>,
              <>
                <UI>New machine</UI> › <UI>Virtual machine</UI> ›{" "}
                <UI>From a template</UI>, pick it.
              </>,
              <>
                Name it, paste your SSH public key, keep DHCP, tick{" "}
                <UI>Start it</UI> and <UI>Add it to Servers</UI>.
              </>,
              <>
                Press <UI>Create</UI>. When it's done, <UI>Open the server</UI>{" "}
                goes straight to its terminal and files.
              </>,
            ]}
          </Steps>
        </Example>
      </>
    ),
  },
  {
    id: "templates",
    title: "Templates and clones",
    body: (
      <>
        <P>
          A template is a machine that can't run but can be copied fast. Turn a
          prepared VM into one with <UI>Make a template</UI> in its menu
          (there's no way back). <UI>Clone</UI> copies any machine or template:
          a <UI>Full copy</UI> is independent; a linked clone (from a template
          only) shares its disk and takes seconds.
        </P>
        <P>A cloud-init template from an official cloud image, on a node:</P>
        <Code>{`wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
qm create 9000 --name ubuntu-24.04 --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0
qm importdisk 9000 noble-server-cloudimg-amd64.img local-lvm
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0
qm set 9000 --ide2 local-lvm:cloudinit --boot order=scsi0 --serial0 socket --vga serial0
qm set 9000 --agent enabled=1
qm template 9000`}</Code>
        <Tip>
          Install <C>qemu-guest-agent</C> in the template: Morche then sees the
          machine's addresses, and snapshots and backups flush its disks first.
        </Tip>
      </>
    ),
  },
  {
    id: "machine-page",
    title: "A machine's page",
    body: (
      <>
        <P>
          The <UI>Overview</UI> shows the state, addresses, live processor,
          memory, disk and network use with charts for the last hour, day, week,
          month or year, the machine's Proxmox notes, and the server it's linked
          to. The header has the power buttons and the menu with everything
          else.
        </P>
        <P>
          <UI>Activity</UI> lists Proxmox's tasks for the machine (started here
          or in Proxmox), with the log of each. Use <UI>Failed</UI> to see only
          what went wrong.
        </P>
      </>
    ),
  },
  {
    id: "console",
    title: "Console",
    body: (
      <>
        <P>
          The <UI>Console</UI> tab opens the machine's screen in the browser,
          through Morche (the browser never talks to Proxmox).
        </P>
        <List>
          <li>
            <UI>Screen</UI> (VMs): the graphical console over VNC. Use{" "}
            <UI>Send Ctrl+Alt+Del</UI> and <UI>Type text…</UI> for what the
            browser keeps to itself, like a long password.
          </li>
          <li>
            <UI>Serial</UI> (VMs with a <C>serial0</C> port): a text terminal on
            the serial port. Linux needs <C>console=ttyS0</C> on its kernel line
            to use it.
          </li>
          <li>
            <UI>Shell</UI> (containers): a terminal in the container.
          </li>
        </List>
        <P>Opening the console needs Engineer on the cluster.</P>
      </>
    ),
  },
  {
    id: "hardware",
    title: "Hardware",
    body: (
      <>
        <P>
          <UI>Hardware</UI> shows the processor, memory, disks, network cards
          and options. Engineers can change cores and memory, grow a disk, add
          or remove disks and network cards, change the bridge or VLAN, and set
          boot order, start with the node and the guest agent.
        </P>
        <P>
          Some changes only take effect after a restart; they show under{" "}
          <UI>Waiting for a restart</UI> until the machine is shut down and
          started again (a restart from inside the system isn't enough for a
          VM). A detached disk stays as <UI>unused</UI>: attach it again or
          delete it.
        </P>
        <Warn>
          A disk can only grow. Growing it doesn't grow the partition inside: on
          Linux run <C>growpart</C> and <C>resize2fs</C> (cloud images do it on
          the next boot).
        </Warn>
      </>
    ),
  },
  {
    id: "snapshots",
    title: "Snapshots",
    body: (
      <>
        <P>
          A snapshot keeps the machine's disks (and, if you tick{" "}
          <UI>With memory</UI>, a running VM's memory) as they are now, so you
          can go back in seconds. Take one before an upgrade, then{" "}
          <UI>Go back</UI> if it goes wrong or delete it when it went fine.
        </P>
        <Warn>
          Snapshots live on the machine's own storage: they are not backups.
          Many old snapshots slow the disks down and use space. Storages that
          can't snapshot (plain directories with raw disks) don't offer them.
        </Warn>
        <P>
          To take them on a schedule and keep only the last few, use a{" "}
          <See guide="cronjobs" section="pve-snapshot">
            cron job
          </See>
          .
        </P>
      </>
    ),
  },
  {
    id: "backups",
    title: "Backups and restore",
    body: (
      <>
        <P>
          <UI>Back up now</UI> runs Proxmox's <C>vzdump</C> to a storage that
          takes backups, or a <UI>Proxmox Backup Server</UI>. The{" "}
          <UI>Backups</UI> tab lists this machine's backups on every such
          storage, with their size, note and whether they're protected.
        </P>
        <Table
          head={["Mode", "When"]}
          rows={[
            [
              "Keep running (snapshot)",
              "Most machines. No downtime; with the guest agent the disks are flushed first.",
            ],
            [
              "Pause briefly (suspend)",
              "Containers on storage that can't snapshot.",
            ],
            ["Stop it (stop)", "The most consistent copy, with downtime."],
          ]}
        />
        <P>
          <UI>Restore</UI> puts a backup back over the machine (it must be
          stopped, and you type its name), or <UI>As a new machine</UI> with a
          new ID, on any node and storage.
        </P>
        <P>
          Schedule backups for many machines with a{" "}
          <See guide="cronjobs" section="pve-backup">
            cron job
          </See>
          ; how many are kept is the storage's own retention in Proxmox.
        </P>
      </>
    ),
  },
  {
    id: "cloud-init",
    title: "Cloud-init",
    body: (
      <>
        <P>
          For a VM with a cloud-init drive, <UI>Cloud-init</UI> sets the user,
          password and SSH keys, the network (DHCP or a fixed address with
          gateway) and DNS that the system takes on its next boot. Containers
          don't need it: their settings are in <UI>Hardware</UI>.
        </P>
        <Tip>
          Cloud-init applies on boot. After saving, restart the VM (shut down
          and start) for a new address or key to take effect.
        </Tip>
      </>
    ),
  },
  {
    id: "firewall",
    title: "Firewall",
    body: (
      <>
        <P>
          The <UI>Firewall</UI> tab edits Proxmox's own firewall for this
          machine: rules in and out, its settings (on/off, default policies,
          logging) and which network cards it covers. It works at the
          hypervisor, before traffic reaches the system, so it also guards a
          machine nobody can log in to.
        </P>
        <Warn>
          Proxmox's firewall only filters when it's on for the{" "}
          <UI>datacenter</UI>, the machine <UI>and</UI> the network card (
          <C>firewall=1</C>). The tab says which one is missing. Inside the
          machine, use the server's own <See guide="firewall">Firewall</See>.
        </Warn>
      </>
    ),
  },
  {
    id: "migrate",
    title: "Move to another node",
    body: (
      <>
        <P>
          <UI>Move to another node</UI> migrates the machine. A running VM moves
          live (no downtime) when its disks are on shared storage, or with{" "}
          <UI>Copy its local disks too</UI> for local ones. A running container
          is restarted on the new node.
        </P>
        <P>
          <UI>High availability</UI> (menu) adds the machine to Proxmox HA: if
          its node dies, another node starts it. Pick the wanted state and a
          group to limit the nodes.
        </P>
        <Tip>
          HA needs a cluster of at least three nodes and shared storage.
        </Tip>
      </>
    ),
  },
  {
    id: "nodes-storage",
    title: "Nodes and storage",
    body: (
      <>
        <P>
          <UI>Nodes</UI> lists each cluster's hosts with status, uptime,
          processor, load and memory; open one for its model, kernel and Proxmox
          version. <UI>Storage</UI> lists each storage with its space and
          content types.
        </P>
        <P>
          Open a storage to see what's on it (ISOs, container templates, disks,
          backups). <UI>Upload</UI> sends an ISO or template from your computer;{" "}
          <UI>Download</UI> makes the node fetch it from a URL itself (faster
          for big images), with an optional checksum.
        </P>
      </>
    ),
  },
  {
    id: "link",
    title: "Link to a server",
    body: (
      <>
        <P>
          A machine and the server it runs (in{" "}
          <See guide="servers">Servers</See>) can be linked:{" "}
          <UI>Link to a server…</UI> in the machine's menu. The machine's page
          then links to the server, and the server's overview shows{" "}
          <UI>Runs on</UI> with the machine's state, node and cluster.
        </P>
        <P>
          Machines made with <UI>Add it to Servers</UI> are linked by
          themselves.
        </P>
      </>
    ),
  },
  {
    id: "alerts",
    title: "Alerts",
    body: (
      <>
        <P>
          <See guide="alerts" section="rules">
            Alert rules
          </See>{" "}
          have three Proxmox metrics: a cluster <UI>has a node offline</UI>, a
          machine <UI>stopped on its own</UI> (not by someone here or in
          Proxmox), and a storage is getting full. Pick all clusters or some,
          and the channels to tell.
        </P>
        <P>
          A cluster Morche can't reach, or one with a node down, also shows a
          red count on <UI>Virtual machines</UI> in the menu and an issue on{" "}
          <See guide="getting-started" section="home">
            Home
          </See>
          .
        </P>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <Table
        head={["What you see", "What to do"]}
        rows={[
          [
            "401 / authentication failure",
            "The token ID or secret is wrong, or the token was deleted. Paste user@realm!name=secret again.",
          ],
          [
            "403 / Permission check failed",
            "The token lacks a privilege. Give the user (and the token, if Privilege Separation is on) a role on /.",
          ],
          [
            "Certificate error",
            "Use Test connection and pin the fingerprint it offers. After renewing the node's certificate, pin the new one.",
          ],
          [
            "No address shown",
            "Install and start qemu-guest-agent inside the VM, and turn Guest agent on in Hardware › Options.",
          ],
          [
            "Console stays black",
            "The VM may be using a serial display: try Serial. Otherwise press a key; the screen may be asleep.",
          ],
          [
            "Snapshot is greyed out",
            "The disk is on storage that can't snapshot (raw on a directory, or LVM thick). Move the disk to LVM-thin, ZFS or Ceph.",
          ],
          [
            "Create never gets an address",
            "The template has no guest agent, or DHCP gave none. Use a fixed address, or add the server by hand.",
          ],
        ]}
      />
    ),
  },
]
