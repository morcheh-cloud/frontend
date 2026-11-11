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

export const packages: GuideSection[] = [
  {
    id: "what",
    title: "What this page shows",
    body: (
      <>
        <P>
          <UI>Packages</UI> is the server's package manager in the browser:
          what's installed, which updates are waiting, and what was installed,
          upgraded or removed before. Morche works with <C>apt</C> (Debian,
          Ubuntu), <C>dnf</C> and <C>yum</C> (Fedora, RHEL, Rocky, Alma),{" "}
          <C>zypper</C> (openSUSE, SLES), <C>apk</C> (Alpine) and <C>pacman</C>{" "}
          (Arch). It finds the one the server has by itself; nothing is
          installed on the server for this page.
        </P>
        <List>
          <li>
            <UI>Installed</UI>: every package with its version, size and when it
            last changed. The filter narrows it to packages installed by hand,
            dependencies, held ones, ones nothing needs any more, settings left
            behind by removed packages, or broken ones.
          </li>
          <li>
            <UI>Updates</UI>: newer versions in the repositories, with security
            updates marked. <UI>Security</UI> shows only those.
          </li>
          <li>
            <UI>History</UI>: the manager's own log, grouped by day. It also
            shows changes made over SSH or by automatic updates, not just ones
            made from Morche.
          </li>
        </List>
        <P>
          The line at the end of the toolbar says which manager the server uses
          and how old its package lists are. Open a package (its name, or a row
          on a phone) to see what it is, what it needs, what needs it, the files
          it put on the server and the versions you can install.
        </P>
      </>
    ),
  },
  {
    id: "updates",
    title: "Checking for and installing updates",
    body: (
      <>
        <P>
          Updates are worked out from the package lists the server already has.
          Lists go stale, so a server that hasn't refreshed them shows fewer
          updates than there are. A notice appears when they're more than a week
          old.
        </P>
        <Steps>
          <div>
            Open <UI>Updates</UI> and press <UI>Check for updates</UI>. It
            downloads fresh lists (<C>apt update</C>, <C>dnf makecache</C>…) as
            a background task.
          </div>
          <div>
            Press <UI>Upgrade all</UI>, or <UI>Upgrade</UI> on one row, or tick
            a few rows and use the bar that appears.
          </div>
          <div>
            Read the review: every package that will be installed, upgraded or
            removed, with its versions. Nothing has changed yet.
          </div>
          <div>
            Press <UI>Upgrade</UI>. The change runs as a background task; follow
            it from the notice at the top of the page or from <UI>Tasks</UI>.
          </div>
        </Steps>
        <P>
          Only one package change runs on a server at a time. Others wait until
          it ends, the same way the package manager itself would refuse a second
          one.
        </P>
        <Table
          head={["Action", "What it does"]}
          rows={[
            [
              <UI key="a">Upgrade all</UI>,
              "Upgrades every package that can be upgraded without removing anything.",
            ],
            [
              <UI key="s">Install security updates</UI>,
              "Only the updates the repositories mark as security fixes (apt, dnf, zypper).",
            ],
            [
              <UI key="f">Full upgrade…</UI>,
              <>
                apt only: <C>apt full-upgrade</C>. Also installs new
                dependencies and removes packages in the way, which is how new
                kernels arrive.
              </>,
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "review",
    title: "The review before a change",
    body: (
      <>
        <P>
          Every install, upgrade and removal shows a review first. Morche asks
          the package manager to simulate the change (<C>apt -s</C>,{" "}
          <C>dnf --assumeno</C>…), so the list is what the manager would really
          do, including what it pulls in or takes away.
        </P>
        <List>
          <li>
            <UI>The package manager refuses this</UI>: a package that doesn't
            exist, a conflict. The change can't start until it's fixed.
          </li>
          <li>
            <UI>Updates wait</UI>: updates a normal upgrade leaves alone,
            because they need new packages or removals, or because Ubuntu rolls
            them out in phases. <UI>Upgrade them too</UI> includes them.
          </li>
          <li>
            A change that removes a package the system needs (the kernel,{" "}
            <C>openssh-server</C>, <C>sudo</C>, the package manager…) asks you
            to type the server's name first.
          </li>
        </List>
        <Warn>
          Removing <C>openssh-server</C> or the package that gives Morche its
          login cuts off SSH: Morche, and you, can't reach the server any more
          except through its console.
        </Warn>
      </>
    ),
  },
  {
    id: "install",
    title: "Installing a package",
    body: (
      <>
        <Steps>
          <div>
            On <UI>Installed</UI>, press <UI>Install package</UI>.
          </div>
          <div>
            Search by name or description (two letters at least) and tick one or
            more results. An exact name you typed can be picked even when the
            search doesn't list it.
          </div>
          <div>
            Press <UI>Review</UI>, check what comes with it and press{" "}
            <UI>Install</UI>.
          </div>
        </Steps>
        <P>
          To install a particular version, open the package and pick it from{" "}
          <UI>Versions</UI> (<C>apt</C>, <C>dnf</C>, <C>zypper</C>). Going back
          to an older version is a downgrade; hold the package afterwards so the
          next upgrade doesn't undo it.
        </P>
        <Example title="Monitoring tools on a new server">
          <P>
            Search <C>htop</C>, tick it, search <C>iotop</C> and <C>ncdu</C> and
            tick those too, then <UI>Review (3)</UI>. The review lists the three
            packages plus any libraries they need; press <UI>Install</UI>.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "hold",
    title: "Holding a package at its version",
    body: (
      <>
        <P>
          <UI>Hold at this version</UI> (in a package's menu, or for several
          ticked rows) stops every upgrade from touching it, including{" "}
          <UI>Upgrade all</UI> and automatic updates. <UI>Let it upgrade</UI>{" "}
          undoes it. Held packages carry a <UI>Held</UI> tag and are listed
          under the <UI>Held</UI> filter.
        </P>
        <P>
          Morche uses the manager's own mechanism (<C>apt-mark hold</C>,{" "}
          <C>dnf versionlock</C>, <C>zypper addlock</C>), so the hold holds for
          anyone upgrading over SSH too. On Alpine and Arch, holding isn't
          offered; packages listed in pacman's <C>IgnorePkg</C> still show as
          held.
        </P>
        <Tip>
          Hold the database server (<C>postgresql-16</C>, <C>mysql-server</C>)
          and upgrade it on purpose, after a backup: a major version change can
          need its data migrated.
        </Tip>
      </>
    ),
  },
  {
    id: "remove",
    title: "Removing packages and cleaning up",
    body: (
      <>
        <List>
          <li>
            <UI>Remove</UI> uninstalls the package and keeps its settings files.{" "}
            <UI>Remove with its settings</UI> (apt) deletes those too.
          </li>
          <li>
            <UI>Remove unneeded</UI> (in the <UI>⋯</UI> menu) removes
            dependencies nothing needs any more, usually left by packages
            removed earlier and by old kernels. The <UI>Not needed</UI> filter
            lists them first.
          </li>
          <li>
            <UI>Settings left</UI> lists packages removed without their
            settings; <UI>Remove leftover settings</UI> clears them.
          </li>
          <li>
            <UI>Empty the cache</UI> deletes downloaded package files; the menu
            shows how much space it frees.
          </li>
        </List>
        <P>
          <UI>Keep it (installed by hand)</UI> and <UI>Mark as a dependency</UI>{" "}
          change how the manager sees a package: a dependency goes away with{" "}
          <UI>Remove unneeded</UI> once nothing needs it. Mark something you use
          directly as installed by hand so a cleanup never takes it.
        </P>
      </>
    ),
  },
  {
    id: "auto-updates",
    title: "Automatic updates",
    body: (
      <>
        <P>
          The <UI>Updates</UI> tab says whether the server installs updates by
          itself, and switches it on or off. Morche uses the distribution's own
          tool:
        </P>
        <Table
          head={["Manager", "Tool"]}
          rows={[
            [
              <C key="a">apt</C>,
              <>
                <C>unattended-upgrades</C>: security updates every day.
              </>,
            ],
            [
              <C key="d">dnf / yum</C>,
              <>
                <C>dnf-automatic</C>: its install timer.
              </>,
            ],
          ]}
        />
        <P>
          When the tool isn't installed, the notice offers to install it first.
          Other managers have no standard tool; schedule an{" "}
          <See guide="cronjobs" section="package-upgrade">
            Upgrade packages
          </See>{" "}
          cron job instead (<UI>⋯</UI> › <UI>Schedule upgrades…</UI>). It also
          works on apt and dnf servers, to take every update on a set day and
          restart only the servers that need it.
        </P>
        <Recommended
          rows={[
            {
              setting: "Automatic updates",
              value: "On",
              why: "Security fixes land the day they're published, even on servers nobody looks at.",
            },
            {
              setting: "Hold",
              value: "Databases and pinned runtimes",
              why: "Automatic updates skip held packages, so nothing big moves without you.",
            },
            {
              setting: "Restart",
              value: "In a quiet hour",
              why: "Kernel and libc updates only take effect after a restart; schedule it from the header's power button.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "restart",
    title: "When a restart is needed",
    body: (
      <>
        <P>
          Some updates (the kernel, <C>libc</C>, <C>systemd</C>) only take
          effect after a restart. When the server says one is needed, a notice
          lists the packages waiting on it and <UI>Restart…</UI> opens the power
          dialog, where you can restart now or at a set time.
        </P>
        <See guide="power" />
      </>
    ),
  },
  {
    id: "access",
    title: "Who can do what",
    body: (
      <>
        <Table
          head={["Level", "Can"]}
          rows={[
            [
              <UI key="v">Viewer</UI>,
              "See packages, updates, details and the history.",
            ],
            [<UI key="o">Operator</UI>, "Also check for updates."],
            [
              <UI key="e">Engineer</UI>,
              "Also install, upgrade, remove, hold, mark, clean up and turn automatic updates on or off.",
            ],
          ]}
        />
        <P>
          Changes also need root on the server: Morche logs in as root or uses{" "}
          <C>sudo</C> without a password. With a plain login the page is
          read-only and says so.
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
            <UI>The manager is busy</UI>: another program holds its lock (often
            automatic updates running in the background). Wait a few minutes and
            try again.
          </li>
          <li>
            <UI>Broken packages</UI>: a change was cut off halfway. Finish it in
            the <See guide="terminal">terminal</See>:
          </li>
        </List>
        <Code>{`sudo dpkg --configure -a
sudo apt -f install`}</Code>
        <List>
          <li>
            <UI>An update is missing</UI>: press <UI>Check for updates</UI>{" "}
            first; the page only knows what the last downloaded lists say.
          </li>
          <li>
            <UI>Nothing to change</UI> in the review: the package is already at
            that version, or held.
          </li>
          <li>
            <UI>No package manager found</UI>: the server's login has none of
            the supported managers on its <C>PATH</C>.
          </li>
        </List>
      </>
    ),
  },
]
