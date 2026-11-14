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

export const applications: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          <UI>Applications</UI> is a catalog of the infrastructure software a
          server needs, installed in a few taps: the basic tools, time sync,
          automatic security updates, swap, Docker, Podman or k3s, VPNs and
          backup tools. Apps that run in containers (Portainer, Grafana, Uptime
          Kuma…) live in <UI>Containers</UI> › <UI>Templates</UI>. Pick one,
          tick the servers, fill in a setting or two, and Morche installs it
          over SSH on all of them, with each server's output kept.
        </P>
        <P>It then keeps an eye on what it installed:</P>
        <List>
          <li>which version runs where, and whether a newer one is out;</li>
          <li>
            which servers have system package updates waiting (security ones
            counted apart), and which need a reboot.
          </li>
        </List>
        <P>
          A check also finds software that was there before Morche (Docker,
          nginx, PostgreSQL…), so the <UI>Installed</UI> list shows the whole
          picture, not just what was installed from here.
        </P>
        <P>
          The page has four tabs: <UI>Catalog</UI>, <UI>Installed</UI>,{" "}
          <UI>Updates</UI> and <UI>Activity</UI>. Each server page also has an{" "}
          <UI>Applications</UI> tab with the same things for that one server.
        </P>
      </>
    ),
  },
  {
    id: "catalog",
    title: "The catalog",
    body: (
      <>
        <P>
          The catalog lists Morche's built-in applications plus your workspace's
          own (marked <UI>Custom</UI>). Filter by category with the chips, or
          search by name. Each application says what kind it is:
        </P>
        <Table
          head={["Kind", "What happens on the server"]}
          rows={[
            [
              "Package",
              "Installed with the server's package manager (apt, dnf, yum, zypper, apk or pacman).",
            ],
            ["Script", "The application's own shell scripts do the work."],
          ]}
        />
        <P>
          Open an application to read what it is, which settings it asks for,
          the addresses it answers on and where it is installed already.
        </P>
        <P>
          The built-in catalog keeps to what a server itself needs. Apps that
          run on it in containers are compose templates in <UI>Containers</UI> ›{" "}
          <UI>Templates</UI>; the last tile of the catalog leads there.
        </P>
        <Table
          head={["Group", "Applications"]}
          rows={[
            [
              "Base server",
              "Basic tools (htop, btop, ncdu, tmux, jq, rsync, dig…), Chrony, Automatic security updates, Swap file, QEMU guest agent",
            ],
            ["Containers", "Docker, Podman, k3s"],
            ["Backup", "restic, rclone"],
            ["Networking", "WireGuard, Tailscale"],
            ["Security", "Certbot"],
            ["Developer tools", "Git, Node.js, Python 3"],
          ]}
        />
        <P>
          nginx, fail2ban and the firewall aren't in the catalog: they have
          their own sections (<UI>Reverse proxy</UI>, and <UI>Fail2ban</UI> and{" "}
          <UI>Firewall</UI> on each server page), which install them too.
        </P>
        <P>
          Some applications left the catalog (htop is part of{" "}
          <UI>Basic tools</UI> now). Where one was installed before, it stays in{" "}
          <UI>Installed</UI> and can still be updated and removed; it just can't
          be installed anywhere new.
        </P>
        <Tip>
          A few notes on the new ones: <UI>Swap file</UI> is resized by
          installing it again with another size. <UI>k3s</UI> starts a new
          cluster, or joins one when you give it the first server's address and
          token; removing it deletes the cluster's data on that server.
        </Tip>
      </>
    ),
  },
  {
    id: "container-apps",
    title: "Container apps moved to Containers",
    body: (
      <>
        <P>
          Applications used to install Docker apps too. Those are now compose
          templates in <UI>Containers</UI> › <UI>Templates</UI>, deployed as a
          project, with everything Containers gives a project: live numbers,
          logs, production checks, updates, alerts, history and volume backups.
        </P>
        <Table
          head={["Before", "Now"]}
          rows={[
            [
              "Built-in Docker apps (Portainer, Grafana, Uptime Kuma, MariaDB, Vaultwarden…)",
              "Built-in templates in Containers › Templates.",
            ],
            [
              "Your workspace's own Docker recipes",
              'Your workspace\'s templates, with the same compose file and settings as .env values (a name already taken gets " (Applications)").',
            ],
            [
              "Docker apps installed from here",
              "Still running, untouched. They show in Containers › Projects on that server; Find on the disk (or Add by path: /opt/morcheh/apps/<id>) lists them with their compose file.",
            ],
          ]}
        />
        <Steps>
          {[
            <>
              <UI>Containers</UI> › <UI>Templates</UI>, pick the app and press{" "}
              <UI>Deploy</UI>.
            </>,
            <>
              Choose the environment (server), check the compose file and its
              variables, then <UI>Create</UI>.
            </>,
          ]}
        </Steps>
        <See guide="containers" section="templates" />
      </>
    ),
  },
  {
    id: "install",
    title: "Installing",
    body: (
      <>
        <Steps>
          {[
            <>
              In <UI>Catalog</UI>, open the application and press{" "}
              <UI>Install</UI>. From a server's <UI>Applications</UI> tab, press{" "}
              <UI>Install</UI> and pick it: that server is already chosen.
            </>,
            <>
              Tick the servers. Each one is checked straight away: package
              manager, free disk, ports already in use, what has to be installed
              first. A server with a problem says why and can't be picked until
              it's fixed.
            </>,
            <>
              Fill in the settings (port, domain, passwords…). A password left
              empty is made up for each server and kept sealed; only Owners can
              see it later.
            </>,
            <>
              Press <UI>Install</UI>. The run opens with each server's output
              live; you can leave it, it carries on in the background.
            </>,
          ]}
        </Steps>
        <Example title="Docker on three servers">
          Pick Docker, tick the three servers and press <UI>Install</UI>. Each
          server's output shows live; one that already has Docker installed from
          the distro keeps it.
        </Example>
        <P>
          <UI>Options</UI> holds <UI>Servers at a time</UI> and{" "}
          <UI>Keep going when one server fails</UI> when you install on several.
        </P>
        <Recommended
          rows={[
            {
              setting: "First install",
              value: "One server",
              why: "Check it works before the rest.",
            },
            {
              setting: "Servers at a time",
              value: "2–5",
              why: "Heavy installs download packages at once.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "installed",
    title: "Installed applications",
    body: (
      <>
        <P>
          <UI>Installed</UI> lists every application on every server: version,
          state, and whether an update is waiting. Problems come first. Use the
          filter to see only <UI>Updates</UI> or <UI>Problems</UI>.
        </P>
        <P>
          Open one to see its version, the settings it was installed with, the
          notes, <UI>Open</UI> links for its web pages and (Owners) the
          passwords it was given. Update and uninstall are in its menu.
        </P>
        <P>
          <UI>Forget</UI> only stops tracking it: nothing changes on the server,
          and the next check finds it again if it's still there.
        </P>
      </>
    ),
  },
  {
    id: "updates",
    title: "Updates",
    body: (
      <>
        <P>
          <UI>Updates</UI> shows two things: applications with a newer version,
          and servers with system packages to upgrade. Tick what you want and
          press <UI>Update</UI>, or open a server to see its packages and press{" "}
          <UI>Upgrade all</UI> or <UI>Security only</UI>.
        </P>
        <P>
          A package application updates only the packages the server really has:
          Docker installed from the distro (<C>docker.io</C>) is updated as it
          is, never switched to Docker's own <C>docker-ce</C>.
        </P>
        <Table
          head={["Upgrade", "What it installs"]}
          rows={[
            [
              "Security only",
              "Only updates marked as security fixes (apt, dnf, yum, zypper; the others install everything).",
            ],
            [
              "All updates",
              "Every package with a newer version. Nothing is removed.",
            ],
            [
              "Full upgrade",
              "apt full-upgrade / dist-upgrade: may add or remove packages to finish.",
            ],
          ]}
        />
        <Warn>
          A kernel or libc update may ask for a reboot: the server shows{" "}
          <UI>Reboot needed</UI>. Morche never reboots by itself; use Power on
          the server's page when it suits you.
        </Warn>
        <See guide="power" />
      </>
    ),
  },
  {
    id: "checks",
    title: "Checking servers",
    body: (
      <>
        <P>
          Morche checks every server on its own every 6 hours, and right after
          each install, update or uninstall. <UI>Check servers</UI> on the page
          (or the refresh button on a server's tab) checks now; it runs as a
          background task.
        </P>
        <P>
          A check reads the package manager's pending updates and Docker's
          version, and asks each installed application for its version. If it
          fails, the server's tab says why.
        </P>
        <Tip>
          The backend's <C>SOFTWARE_CHECK_INTERVAL</C> sets how often checks
          run.
        </Tip>
      </>
    ),
  },
  {
    id: "server-tab",
    title: "On a server's page",
    body: (
      <>
        <P>
          A server's <UI>Applications</UI> tab (System group) shows only that
          server: <UI>Installed</UI>, <UI>Updates</UI> (its applications and its
          packages) and <UI>Activity</UI> (runs that touched it). The line above
          the list says its package manager, how many packages wait, Docker's
          version and when it was last checked.
        </P>
      </>
    ),
  },
  {
    id: "activity",
    title: "Activity",
    body: (
      <>
        <P>
          Every install, update, uninstall and system upgrade is a run, kept in{" "}
          <UI>Activity</UI>: who started it (or which cron job), on which
          servers, and each server's full output. A run that is still going can
          be stopped; servers not started yet are skipped.
        </P>
        <P>
          Runs also show in <UI>Tasks</UI> while they work.
        </P>
        <See guide="tasks" />
      </>
    ),
  },
  {
    id: "schedule",
    title: "Updating on a schedule",
    body: (
      <>
        <P>
          To keep servers updated without thinking about it, make a cron job
          with the action <UI>Update applications</UI>:
        </P>
        <Steps>
          {[
            <>
              <UI>Cron jobs</UI> › <UI>New cron job</UI> ›{" "}
              <UI>Update applications</UI>.
            </>,
            <>
              Pick the servers, then <UI>Every one with an update</UI> or only
              some applications, and whether to upgrade system packages too
              (optionally security only).
            </>,
            <>
              Set how many servers at a time and a schedule, for example every
              Sunday at 03:00.
            </>,
          ]}
        </Steps>
        <Recommended
          rows={[
            {
              setting: "System packages",
              value: "Security only, nightly",
              why: "Fixes land fast with little change.",
            },
            {
              setting: "Applications + everything else",
              value: "Weekly",
              why: "Bigger changes at a time you watch.",
            },
            {
              setting: "Servers at a time",
              value: "1–2",
              why: "Servers that serve the same thing never all restart at once.",
            },
            {
              setting: "Carry on after a failure",
              value: "Off",
              why: "One failure stops the rest before they break too.",
            },
          ]}
        />
        <See guide="cronjobs" />
      </>
    ),
  },
  {
    id: "custom",
    title: "Your own applications",
    body: (
      <>
        <P>
          Anything not in the catalog can be added as a recipe: a short YAML
          file that says what to install and how. Press <UI>New application</UI>
          , fill in the form, and press <UI>Add to catalog</UI>. It shows in the
          catalog for the whole workspace. To change a built-in one, open it and
          press <UI>Copy as my own</UI>.
        </P>
        <Steps>
          {[
            <>
              <UI>How it installs</UI>: Package (the package manager) or Script
              (your own install script). A container app belongs in{" "}
              <UI>Containers</UI> › <UI>Templates</UI> instead. Switching sets
              the other kind's parts aside, and switching back brings them
              again.
            </>,
            <>
              <UI>About</UI>: name, summary and category; the id is made from
              the name. Press the icon to pick a brand logo or an icon.
            </>,
            <>
              <UI>Install form</UI>: the questions asked at install. Quick
              buttons add a port, a password, a domain or a data folder; the
              variable name is made from the question. Copy <C>{"${NAME}"}</C>{" "}
              from a question into a script.
            </>,
            <>
              The kind's own part (<UI>Packages</UI> or <UI>Scripts</UI>), then{" "}
              <UI>After installing</UI> (Open buttons and notes) and{" "}
              <UI>Where it runs</UI> (what to install first, which package
              managers).
            </>,
          ]}
        </Steps>
        <P>
          The switch at the top flips between <UI>Visual</UI> and <UI>YAML</UI>:
          both edit the same text, so a change in one shows in the other. The
          form remembers which you used last. The same recipe in YAML:
        </P>
        <Code>
          {`id: mycli
name: My CLI
summary: Our command-line tool.
kind: script
category: Tools
icon: terminal
params:
  - name: VERSION
    label: Version
    type: text
    default: "1.4.0"
version: mycli --version
install: |
  command -v curl >/dev/null 2>&1 || { pkg_refresh; pkg_install curl; }
  curl -fsSL "https://example.com/mycli-\${VERSION}" -o /usr/local/bin/mycli
  chmod +x /usr/local/bin/mycli
uninstall: rm -f /usr/local/bin/mycli`}
        </Code>
        <Table
          head={["Field", "What it's for"]}
          rows={[
            [
              <C key="id">id</C>,
              "Short name: lowercase letters, digits, dashes.",
            ],
            [<C key="kind">kind</C>, "package or script."],
            [
              <C key="look">icon / logo</C>,
              "icon = a lucide icon name (box, database, globe…). logo = a brand logo Morche ships (docker, redis, postgresql, grafana…; the editor's field list has them all), shown in place of the icon.",
            ],
            [
              <C key="params">params</C>,
              "Values asked at install, given to the scripts as environment variables. type: password is sealed; generate: password makes one.",
            ],
            [
              <C key="packages">packages</C>,
              "Package names per manager (apt, dnf…, or default).",
            ],
            [
              <C key="also">also</C>,
              "Other names it may be installed as, per manager (the distro's build, like docker.io for Docker). Never installed by Morche; updated and removed when they're the ones on the server.",
            ],
            [
              <C key="scripts">install / update / uninstall</C>,
              "Shell scripts, run as root. Optional for packages.",
            ],
            [
              <C key="version">version</C>,
              "A command that prints the installed version.",
            ],
            [
              <C key="links">links</C>,
              "Addresses it answers on, shown as Open.",
            ],
          ]}
        />
        <P>
          Save checks everything at once: each problem is listed, and in the
          form a click on it jumps to the field (in YAML it names the line).
          Wide screens show a live <UI>Preview</UI> beside the form (the catalog
          tile, the install form to try out, the Open buttons) and the{" "}
          <UI>Fields</UI> list of every YAML key; elsewhere the eye button opens
          them.
        </P>
        <Tip>
          The form writes the YAML again on each change, so comments in the text
          go away once you edit in Visual. Keep commented recipes in YAML.
        </Tip>
        <Tip>
          Recipes are the workspace's: Engineers write them, everyone in the
          workspace can install them where they have access.
        </Tip>
      </>
    ),
  },
  {
    id: "access",
    title: "Who can do what",
    body: (
      <Table
        head={["Level", "Can"]}
        rows={[
          ["Viewer", "See the catalog and what is installed."],
          ["Operator", "Check servers, see Activity."],
          ["Engineer", "Install, update, write recipes, stop runs."],
          [
            "Owner",
            "Uninstall, and see the passwords an app was installed with.",
          ],
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
          <b>A server can't be picked.</b> Its line says why: no supported
          package manager, port in use, not enough disk, or no access. Fix it or
          choose another port.
        </li>
        <li>
          <b>The install failed.</b> Open the run: each server's output shows
          the command that failed. Fix the cause, then install again.
        </li>
        <li>
          <b>Waiting for another package manager.</b> Something else is
          installing on the server (often automatic security updates). Morche
          waits up to 15 minutes for it, then stops with a message; run it again
          once the other one is done.
        </li>
        <li>
          <b>“None of its packages is installed with apt here”.</b> The
          application was installed another way (a snap, a static binary, a
          vendor script). Update it the same way it was installed.
        </li>
        <li>
          <b>A Docker app I installed here is gone from the list.</b> Container
          apps moved to <UI>Containers</UI>: open <UI>Projects</UI> on that
          server; <UI>Find on the disk</UI> (or <UI>Add by path</UI> with{" "}
          <C>/opt/morcheh/apps/&lt;id&gt;</C>) lists it with its compose file.
        </li>
        <li>
          <b>Not found.</b> The last check couldn't find it on the server any
          more. Install it again, or <UI>Forget</UI> it.
        </li>
        <li>
          <b>No update shown although one is out.</b> Press{" "}
          <UI>Check servers</UI>; checks otherwise run every 6 hours.
        </li>
      </List>
    ),
  },
]
