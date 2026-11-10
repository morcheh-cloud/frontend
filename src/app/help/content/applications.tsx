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
          <UI>Applications</UI> is a catalog of software you can install on your
          servers in a few taps: system tools like Docker, Git or WireGuard, and
          Docker apps like Grafana, Portainer, Uptime Kuma or n8n. Pick one,
          tick the servers, fill in a port or two, and Morcheh installs it over
          SSH on all of them, with each server's output kept.
        </P>
        <P>It then keeps an eye on what it installed:</P>
        <List>
          <li>which version runs where, and whether a newer one is out;</li>
          <li>whether a Docker app's containers are still running;</li>
          <li>
            which servers have system package updates waiting (security ones
            counted apart), and which need a reboot.
          </li>
        </List>
        <P>
          A check also finds software that was there before Morcheh (Docker,
          nginx, PostgreSQL, a compose project you started by hand…), so the{" "}
          <UI>Installed</UI> list shows the whole picture, not just what was
          installed from here.
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
          The catalog lists Morcheh's built-in applications plus your
          workspace's own (marked <UI>Custom</UI>). Filter by category with the
          chips, or search by name. Each application says what kind it is:
        </P>
        <Table
          head={["Kind", "What happens on the server"]}
          rows={[
            [
              "Package",
              "Installed with the server's package manager (apt, dnf, yum, zypper, apk or pacman).",
            ],
            [
              "Docker",
              <>
                A Docker Compose app in <C>/opt/morcheh/apps/&lt;id&gt;</C>.
                Docker is installed first when the server doesn't have it.
              </>,
            ],
            ["Script", "The application's own shell scripts do the work."],
          ]}
        />
        <P>
          Open an application to read what it is, which settings it asks for,
          the addresses it answers on and where it is installed already.
        </P>
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
              manager, Docker, free disk, ports already in use, what has to be
              installed first. A server with a problem says why and can't be
              picked until it's fixed.
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
        <Example title="Grafana on three servers">
          Pick Grafana, tick the three servers, leave the port at 3000 and the
          admin password empty. Morcheh installs Docker where it's missing, then
          Grafana, with a different admin password on each server.{" "}
          <UI>Installed</UI> › Grafana › <UI>Show passwords</UI> shows them.
        </Example>
        <P>
          <UI>Options</UI> holds <UI>Servers at a time</UI> and{" "}
          <UI>Keep going when one server fails</UI> when you install on several,
          and <UI>Start with empty data</UI> for a Docker app that was installed
          on a server before and left its data behind.
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
              why: "Heavy installs pull images and packages at once.",
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
        <P>Open one to manage it:</P>
        <List>
          <li>
            <UI>Overview</UI>: version, where it lives, its containers, the
            settings it was installed with, the notes, and <UI>Open</UI> links
            for its web pages.
          </li>
          <li>
            <UI>Logs</UI> (Docker apps): the containers' recent logs.
          </li>
          <li>
            <UI>Compose file</UI> (Docker apps): edit it; Docker checks it
            before it is put in place, then the app restarts on it.
          </li>
          <li>
            Start, stop, restart, update, roll back, uninstall from the menu.
          </li>
        </List>
        <P>
          <UI>Forget</UI> only stops tracking it: nothing changes on the server,
          and the next check finds it again if it's still there.
        </P>
        <Tip>
          Uninstalling a Docker app keeps its data unless you turn on{" "}
          <UI>Delete its data too</UI>, so a later install starts where it left
          off.
        </Tip>
      </>
    ),
  },
  {
    id: "updates",
    title: "Updates",
    body: (
      <>
        <P>
          <UI>Updates</UI> shows two things: applications with a newer version
          (for Docker apps, a newer image under the same tag), and servers with
          system packages to upgrade. Tick what you want and press{" "}
          <UI>Update</UI>, or open a server to see its packages and press{" "}
          <UI>Upgrade all</UI> or <UI>Security only</UI>.
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
        <P>
          Before a Docker app is updated, Morcheh keeps the images it ran on.{" "}
          <UI>Roll back</UI> runs it on those again, until the next update.
        </P>
        <Warn>
          A kernel or libc update may ask for a reboot: the server shows{" "}
          <UI>Reboot needed</UI>. Morcheh never reboots by itself; use Power on
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
          Morcheh checks every server on its own every 6 hours, and right after
          each install, update or uninstall. <UI>Check servers</UI> on the page
          (or the refresh button on a server's tab) checks now; it runs as a
          background task.
        </P>
        <P>
          A check reads the package manager's pending updates, Docker and its
          compose projects, and asks each installed application for its version.
          If it fails, the server's tab says why.
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
          Every install, update, roll back, uninstall and system upgrade is a
          run, kept in <UI>Activity</UI>: who started it (or which cron job), on
          which servers, and each server's full output. A run that is still
          going can be stopped; servers not started yet are skipped.
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
          , start from a Docker, package or script template, and save. It shows
          in the catalog for the whole workspace. To change a built-in one, open
          it and press <UI>Copy as my own</UI>.
        </P>
        <Code>
          {`id: whoami
name: Whoami
summary: Answers with the request it got.
kind: docker
category: Tools
icon: globe
requires: [docker]
params:
  - name: PORT
    label: Port
    type: port
    default: "8081"
links:
  - label: Whoami
    port: PORT
compose: |
  services:
    whoami:
      image: traefik/whoami:latest
      restart: unless-stopped
      ports:
        - "\${PORT}:80"`}
        </Code>
        <Table
          head={["Field", "What it's for"]}
          rows={[
            [
              <C key="id">id</C>,
              "Short name: lowercase letters, digits, dashes.",
            ],
            [<C key="kind">kind</C>, "package, docker or script."],
            [
              <C key="look">icon / logo</C>,
              "icon = a lucide icon name (box, database, globe…). logo = a brand logo Morcheh ships (docker, redis, postgresql, grafana…; the editor's field list has them all), shown in place of the icon.",
            ],
            [
              <C key="params">params</C>,
              "Values asked at install: ${NAME} in a compose file, environment variables in scripts. type: password is sealed; generate: password makes one.",
            ],
            [
              <C key="packages">packages</C>,
              "Package names per manager (apt, dnf…, or default).",
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
          A mistake is shown with its line when you save. On wide screens the
          panel beside the editor lists every field; on a phone, the help button
          opens it.
        </P>
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
          [
            "Operator",
            "Start, stop, restart, read logs, check servers, see Activity.",
          ],
          [
            "Engineer",
            "Install, update, roll back, edit compose files, write recipes, stop runs.",
          ],
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
          <b>Stopped or Partly running.</b> A Docker app's containers aren't all
          up. Open it › <UI>Logs</UI>, then <UI>Restart</UI>.
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
