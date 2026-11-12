import {
  C,
  Code,
  Example,
  type GuideSection,
  P,
  Recommended,
  See,
  Steps,
  Table,
  Tip,
  UI,
  Warn,
} from "../components/prose"

export const containers: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          <UI>Containers</UI> manages Docker (and Podman) on your servers from
          one place, the way Portainer or Arcane would, but over the same SSH
          login Morche already uses: nothing is installed on the server and no
          Docker port is opened.
        </P>
        <P>
          A click on <UI>Containers</UI> in the sidebar swaps the sidebar for
          its own menu; <UI>Main menu</UI> at its top brings the panel's menu
          back. On a phone the same pages are listed on the <UI>Dashboard</UI>.
        </P>
        <Table
          head={["Group", "Pages"]}
          rows={[
            [
              "Management",
              "Dashboard, Updates, Security, Projects, Environments",
            ],
            ["Resources", "Containers, Images, Networks, Volumes"],
            [
              "Administration",
              "Event log, Customization (Templates, Registries), Settings",
            ],
          ]}
        />
        <Table
          head={["Who", "Can"]}
          rows={[
            [
              "Viewer",
              "See containers, images, volumes, networks, projects, updates, scans, events and live numbers (environment values stay hidden)",
            ],
            [
              "Operator",
              "Start, stop, restart, pause and resume containers and projects, read logs, check for updates",
            ],
            [
              "Engineer",
              "Everything else on the server: remove, rename, kill, pull, update, scan, clean up, new and edited projects, read environment values and the full inspect",
            ],
            [
              "Workspace Owner",
              "Settings and registry logins; Engineers on the workspace add their own templates",
            ],
          ]}
        />
        <P>
          The level is the one you have on the server (see{" "}
          <See guide="access">Access</See>).
        </P>
      </>
    ),
  },
  {
    id: "environments",
    title: "Environments",
    body: (
      <>
        <P>
          Each server that runs Docker or Podman is an{" "}
          <strong>environment</strong>. Most pages (Dashboard, Updates,
          Security, Projects, Containers, Images, Networks, Volumes, Event log)
          show one of them: pick it in the box under <UI>Main menu</UI> (on a
          phone, the name in the top bar). The choice is kept, and links carry
          it in the address (<C>?env=</C>), so a shared link opens the same
          server.
        </P>
        <P>
          <UI>Environments</UI> lists all of them as cards, the ones that need a
          look first:
        </P>
        <Table
          head={["On the card", "Means"]}
          rows={[
            [
              "The bar",
              "Its containers by state: running, unhealthy, restarting, paused, failed (stopped with an error) and stopped",
            ],
            ["CPU · Memory · Disk", "How busy the server itself is right now"],
            [
              "Images · Projects",
              "How many images it keeps, how many compose projects run on it",
            ],
            [
              "The engine line",
              "Docker or Podman, its version, and how Morche reaches it (socket, sudo…)",
            ],
          ]}
        />
        <P>
          The switch at the top turns the page into every container of every
          server in one list, with the same search and filters.
        </P>
        <Tip>
          A server is listed once its last check found Docker. If one you know
          runs Docker is missing, open the server and press <UI>Check</UI>, or
          open its <UI>Containers</UI> tab: it says what is wrong (not
          installed, the login can't reach the socket…) and how to fix it.
        </Tip>
      </>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    body: (
      <>
        <P>
          The <UI>Dashboard</UI> is the chosen environment at a glance. Every
          block leads to the page that does something about it:
        </P>
        <Table
          head={["Block", "Shows"]}
          rows={[
            [
              "Needs a look",
              "Containers that failed, keep restarting or are unhealthy (or a calm line when there are none)",
            ],
            [
              "Projects",
              "Compose projects and how many of their containers run",
            ],
            ["Last 24 hours", "What the engine reported lately"],
            ["The engine card", "Containers by state, CPU, memory and disk"],
            ["Updates", "Images with a newer version, and when it was checked"],
            [
              "Vulnerabilities",
              "Findings of the last scans by severity, and the riskiest images",
            ],
          ]}
        />
        <P>
          <UI>New project</UI> (Engineer) starts a compose project on this
          server.
        </P>
      </>
    ),
  },
  {
    id: "projects",
    title: "Projects (compose)",
    body: (
      <>
        <P>
          <UI>Projects</UI> lists the server's compose projects: the ones Morche
          made and the ones it finds running (by their compose labels). States:{" "}
          <UI>Running</UI>, <UI>Partly running</UI>, <UI>Stopped</UI>,{" "}
          <UI>Not deployed</UI> (saved but never brought up).
        </P>
        <Steps>
          {[
            <>
              <UI>New project</UI>: a name, then the <C>compose.yaml</C> and an
              optional <C>.env</C> (or <UI>Start from a template</UI>).
            </>,
            <>
              Leave <UI>Start after creating</UI> on to pull and run it as a
              background task, or save it and deploy later.
            </>,
            <>
              It is saved on the server in the projects folder (see{" "}
              <UI>Settings</UI>), one folder per project.
            </>,
          ]}
        </Steps>
        <P>
          A project's page has <UI>Overview</UI> (its containers, folder, files,
          services, images) and <UI>Files</UI> (edit the compose file and{" "}
          <C>.env</C>; <UI>Save and apply</UI> runs <C>up</C> after saving). Its
          menu:
        </P>
        <Table
          head={["Action", "Does"]}
          rows={[
            ["Start · Stop · Restart", "docker compose start / stop / restart"],
            ["Deploy / Apply changes (up)", "docker compose up -d"],
            ["Pull images", "Pulls new versions without restarting"],
            ["Redeploy (pull + up)", "Pulls, then recreates what changed"],
            ["Take down", "docker compose down: containers go, files stay"],
            [
              "Destroy…",
              "Down with its volumes, then deletes the folder (type the name)",
            ],
          ]}
        />
        <Warn>
          <UI>Destroy</UI> deletes the project's volumes and files for good.
        </Warn>
      </>
    ),
  },
  {
    id: "templates",
    title: "Templates",
    body: (
      <>
        <P>
          <UI>Customization</UI> › <UI>Templates</UI> holds ready compose
          projects: built-in ones (nginx, WordPress, databases…) and your
          workspace's own. Filter by <UI>Built-in</UI> / <UI>Yours</UI> and by
          category, open one to read its files, and <UI>Deploy</UI> opens{" "}
          <UI>New project</UI> filled with it on the current environment.
        </P>
        <P>
          <UI>New template</UI> (workspace Engineer) takes a name, category,
          description, the compose file and an optional <C>.env</C>. The compose
          file must be valid YAML with a <C>services:</C> section.
        </P>
        <Tip>
          Put values people change (passwords, ports, domains) in the{" "}
          <C>.env</C> as <C>{"${NAME}"}</C> placeholders, so a deploy only edits
          that file.
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
          <UI>Updates</UI> compares each image a container runs with its
          registry, without pulling it. <UI>Check now</UI> asks again; with the
          setting on, Morche checks once a day by itself.
        </P>
        <Table
          head={["State", "Means"]}
          rows={[
            [
              "Update available",
              "The registry has a newer image under the same tag",
            ],
            ["Up to date", "The registry has the same image"],
            [
              "Built here",
              "Not from a registry, so there is nothing to compare",
            ],
            ["Pinned", "Asked for by digest: it never changes"],
            [
              "Couldn't check",
              "The registry didn't answer or refused the login (see Registries)",
            ],
          ]}
        />
        <P>
          <UI>Update</UI> (one image, or ticked ones) pulls the new image and
          recreates its containers with the same settings; compose services go
          through <C>docker compose</C>, one service at a time. Each container
          restarts once, and the old one is kept until the new one runs.
        </P>
        <Recommended
          rows={[
            {
              setting: "Tags",
              value: "A major or minor tag (postgres:16, nginx:1.27)",
              why: "Gets fixes without surprise major upgrades; latest can jump versions",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "security",
    title: "Security (vulnerability scans)",
    body: (
      <>
        <P>
          <UI>Security</UI> scans the server's images for known vulnerabilities
          with Trivy: the one installed on the server, or else the scanner image
          from <UI>Settings</UI> in a throwaway container. Nothing is left
          running.
        </P>
        <Steps>
          {[
            <>
              <UI>Scan every image</UI>, or <UI>Scan</UI> from one image's menu
              (Engineer). Scans run as background tasks.
            </>,
            <>
              The bar at the top adds up the findings by severity:{" "}
              <UI>Critical</UI>, <UI>High</UI>, <UI>Medium</UI>, <UI>Low</UI>.
            </>,
            <>
              <UI>Show the findings</UI> lists one image's CVEs with the
              package, the installed and the fixed version. <UI>Has a fix</UI>{" "}
              keeps only those an update would solve.
            </>,
          ]}
        </Steps>
        <Tip>
          Most findings go away with a newer image: fix what has a fix by
          updating the image (see Updates) rather than one package at a time.
        </Tip>
      </>
    ),
  },
  {
    id: "events",
    title: "Event log",
    body: (
      <>
        <P>
          <UI>Event log</UI> is what the engine itself reports: containers
          created, started, stopped, exited (with the code), killed, out of
          memory, health changes, images pulled or removed, volumes and
          networks. Newest first, grouped by day, refreshed every 15 seconds.
        </P>
        <P>
          Pick a <UI>Period</UI> (last hour to 7 days; the default comes from{" "}
          <UI>Settings</UI>), <UI>Show</UI> one kind, or search by name, image
          or project. <UI>Exec</UI> adds commands run inside containers, hidden
          by default since health checks make many.
        </P>
        <P>
          Docker keeps a limited number of events: a busy server may not reach
          back the whole period.
        </P>
      </>
    ),
  },
  {
    id: "registries",
    title: "Registries",
    body: (
      <>
        <P>
          <UI>Customization</UI> › <UI>Registries</UI> keeps the workspace's
          logins to private registries (GitHub, GitLab, Docker Hub, your own…).
          Morche uses the matching one whenever it pulls an image from there:
          deploys, updates and pulls. Public images need none.
        </P>
        <Steps>
          {[
            <>
              <UI>Add registry</UI> (workspace Owner): the address (
              <C>ghcr.io</C>, <C>registry.example.com</C>…), a name, a username
              and a password or access token.
            </>,
            <>
              <UI>Try it</UI> logs in from the current environment before
              saving. From a saved login's menu, <UI>Test the login</UI> does
              the same.
            </>,
          ]}
        </Steps>
        <Recommended
          rows={[
            {
              setting: "Password",
              value: "A read-only access token",
              why: "Pulling needs nothing more, and a token can be revoked alone",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "settings",
    title: "Settings",
    body: (
      <>
        <P>
          <UI>Settings</UI> belong to the workspace; a workspace Owner changes
          them, everyone else reads them.
        </P>
        <Table
          head={["Setting", "Does"]}
          rows={[
            [
              "Projects folder",
              "Where a new compose project is saved on each server, one folder per project (projects already made stay where they are)",
            ],
            [
              "Check for image updates",
              "Once a day, compare running images with their registries (nothing is pulled)",
            ],
            [
              "Scanner image",
              "The Trivy image used when Trivy isn't installed on the server",
            ],
            [
              "Starting period",
              "How far back the event log reads when it opens",
            ],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "Projects folder",
              value: "/opt/projects",
              why: "Survives reboots and is easy to back up; avoid /tmp",
            },
            {
              setting: "Check for image updates",
              value: "On",
              why: "Only asks the registries; you still choose what to update",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "containers",
    title: "Containers",
    body: (
      <>
        <P>
          <UI>Resources</UI> › <UI>Containers</UI> lists the environment's
          containers, grouped by compose project (switch to a flat list with{" "}
          <UI>By project</UI>). A server's own <UI>Containers</UI> tab shows the
          same list. Filter by state with <UI>All</UI> / <UI>Running</UI> /{" "}
          <UI>Stopped</UI> / <UI>Problems</UI>, or search by name, image or
          project.
        </P>
        <P>Each row's ⋯ menu (a long press on a phone) has every action:</P>
        <Table
          head={["Action", "Does"]}
          rows={[
            ["Start · Stop · Restart", "As docker start / stop / restart"],
            ["Pause · Resume", "Freezes its processes without stopping it"],
            ["Kill", "Sends a signal straight away (KILL by default)"],
            [
              "Rename",
              "Gives it a new name (compose may name it back on its next up)",
            ],
            ["Remove…", "Deletes it; optionally its anonymous volumes too"],
          ]}
        />
        <P>
          Tick several rows to start, stop, restart or remove them together;
          four go at a time and one toast reports the lot.
        </P>
      </>
    ),
  },
  {
    id: "container-page",
    title: "A container's page",
    body: (
      <>
        <P>Open a container by its name. Its page has four tabs:</P>
        <Table
          head={["Tab", "Shows"]}
          rows={[
            [
              <UI key="o">Overview</UI>,
              "Image, command, restart policy, ports (with an Open link for published web ports), networks and addresses, mounts, limits, environment, health check history and labels. A note at the top says when it ran out of memory, fails its health check or keeps restarting.",
            ],
            [
              <UI key="l">Logs</UI>,
              "The last 100–5000 lines, then new ones live. Search, show only errors (stderr), wrap, times, download.",
            ],
            [
              <UI key="s">Live stats</UI>,
              "CPU, memory, network, disk and processes, once a second, with the last 90 seconds drawn.",
            ],
            [
              <UI key="i">Inspect</UI>,
              "The full docker inspect as JSON, to copy or download (Engineer, since it holds the environment values).",
            ],
          ]}
        />
        <P>
          CPU is counted the way Docker counts it: 100% is one core, so a
          container using two cores shows 200%. The bar under it is the share of
          what the container may use.
        </P>
      </>
    ),
  },
  {
    id: "shell",
    title: "A shell inside a container",
    body: (
      <>
        <P>
          Morche doesn't open a shell inside the container directly yet. The
          terminal button on a running container's page (Engineer) copies this
          command and opens the server's terminal, where you paste it:
        </P>
        <Code>docker exec -it my-container sh</Code>
        <P>
          Use <C>bash</C> instead of <C>sh</C> when the image has it. See{" "}
          <See guide="terminal">Terminal</See>.
        </P>
      </>
    ),
  },
  {
    id: "images",
    title: "Images",
    body: (
      <>
        <P>
          <UI>Images</UI> lists what the server keeps, with which containers use
          each one. Filter <UI>In use</UI>, <UI>Unused</UI> or <UI>Dangling</UI>{" "}
          (layers left behind by a newer build or pull).
        </P>
        <Steps>
          {[
            <>
              <UI>Pull image</UI>, type a name like <C>nginx:1.27</C> or{" "}
              <C>ghcr.io/org/app:latest</C>.
            </>,
            <>The pull runs as a background task (see the Tasks button).</>,
            <>
              To run the new version, recreate the container from its compose
              folder (<C>docker compose up -d</C> in the server's terminal).
            </>,
          ]}
        </Steps>
        <P>
          An image's ⋯ menu can <UI>Tag</UI> it under another name or{" "}
          <UI>Remove</UI> it. An image a container uses needs <UI>Force</UI>.
        </P>
      </>
    ),
  },
  {
    id: "volumes",
    title: "Volumes and networks",
    body: (
      <>
        <P>
          <UI>Volumes</UI> lists named volumes and who uses them.{" "}
          <UI>Measure sizes</UI> asks Docker for each one's size (it can take a
          while on a big server). <UI>New volume</UI> takes a name, a driver and
          optional labels.
        </P>
        <P>
          <UI>Networks</UI> lists the server's networks; the built-in{" "}
          <C>bridge</C>, <C>host</C> and <C>none</C> can't be changed.{" "}
          <UI>New network</UI> takes a driver, an optional subnet and gateway,
          and <UI>Internal</UI> (no way out to the internet). From a network's
          menu you can connect a container to it or disconnect one.
        </P>
        <Warn>
          Removing a volume deletes its data for good. Docker refuses while a
          container still uses it.
        </Warn>
      </>
    ),
  },
  {
    id: "cleanup",
    title: "Disk use and clean up",
    body: (
      <>
        <P>
          <UI>System</UI> shows how much disk images, containers, volumes and
          the build cache take, and how much of it can be reclaimed.{" "}
          <UI>Clean up</UI> picks what to remove:
        </P>
        <Recommended
          rows={[
            {
              setting: "Stopped containers",
              value: "On",
              why: "Containers that ended and won't start again on their own",
            },
            {
              setting: "Unused images",
              value: "Untagged leftovers only",
              why: "All unused images frees more, but the next start pulls them again",
            },
            {
              setting: "Build cache",
              value: "On",
              why: "Rebuilt when needed",
            },
            {
              setting: "Unused volumes",
              value: "Keep all",
              why: "Volumes hold data: remove them one by one, on purpose",
            },
          ]}
        />
        <P>The clean up runs as a background task and says what it freed.</P>
      </>
    ),
  },
  {
    id: "examples",
    title: "Examples",
    body: (
      <>
        <Example title="A container keeps restarting">
          <P>
            The card shows it under <UI>restarting</UI> or <UI>failed</UI>. Open
            it: the note at the top of <UI>Overview</UI> says whether it ran out
            of memory or fails its health check. Then <UI>Logs</UI> ›{" "}
            <UI>Errors</UI> usually shows why it stops.
          </P>
        </Example>
        <Example title="Run a new app from a template">
          <P>
            <UI>Templates</UI> › pick one › <UI>Deploy</UI>. Change the
            passwords in the <C>.env</C>, leave <UI>Start after creating</UI> on
            and press <UI>Create and start</UI>. The project then shows in{" "}
            <UI>Projects</UI>; its <UI>Files</UI> tab edits it later.
          </P>
        </Example>
        <Example title="Keep images current every week">
          <P>
            Leave <UI>Check for image updates</UI> on in <UI>Settings</UI>. Once
            a week, open <UI>Updates</UI>, tick what shows{" "}
            <UI>Update available</UI> and press <UI>Update</UI>. Then{" "}
            <UI>Security</UI> › <UI>Scan every image</UI> to see what is left.
          </P>
        </Example>
        <Example title="The disk is filling up">
          <P>
            Open the server's <UI>System</UI> page: if images take most of it,{" "}
            <UI>Clean up</UI> with unused images; if one volume is large, see
            which container uses it in <UI>Volumes</UI>.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <Table
          head={["It says", "Do this"]}
          rows={[
            [
              "Docker isn't installed",
              "Install it from Applications (the Docker recipe) or with the server's package manager.",
            ],
            [
              "Can't reach Docker",
              "The login isn't in the docker group and has no sudo without a password. Add it to the group (then reconnect), or give it sudo.",
            ],
            [
              "Docker isn't running",
              "Start the docker service from the server's Services tab.",
            ],
            [
              "Couldn't check (Updates)",
              "The image is private: add a login in Registries, then Check now.",
            ],
            [
              "A scan fails",
              "The server can't pull the scanner image (no internet or a private mirror): install Trivy on the server, or set a reachable Scanner image in Settings.",
            ],
            [
              "A new project fails to start",
              "Open the task (Tasks button) to read docker compose's error; fix the file in the project's Files tab and Deploy again.",
            ],
            [
              "Logs are empty",
              "The container logs to something other than json-file / journald (see Logging under Limits), or it hasn't printed anything.",
            ],
          ]}
        />
      </>
    ),
  },
]
