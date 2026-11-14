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
          The <UI>Dashboard</UI> is a report on the chosen environment: how its
          containers are doing right now, what they used over time, who talks to
          whom, and the cards that lead to the other pages. It refreshes by
          itself every 10 seconds.
        </P>
        <Table
          head={["Block", "Shows"]}
          rows={[
            [
              "Top row",
              "Containers running, health checks passing, CPU (as a share of the whole server), memory, network in and out, and restarts Docker made",
            ],
            [
              "Needs a look",
              "Containers that failed, keep restarting or are unhealthy (or a calm line when there are none)",
            ],
            [
              "Usage",
              "CPU, memory or network of every container added up: Live (a point every few seconds while someone looks) or the last 24 hours",
            ],
            ["Busiest", "The containers using the most CPU or memory now"],
            [
              "Network map",
              "Containers, their networks and the connections between them (see below)",
            ],
            [
              "State and uptime",
              "Every container: state, health, how long it has been up (or since when it is stopped), restarts, exit code, CPU, memory, network and ports; problems first",
            ],
            [
              "Projects, Last 24 hours, engine, Updates, Vulnerabilities",
              "Compose projects, recent engine events, the server's CPU/memory/disk, images with a newer version and the last scans",
            ],
          ]}
        />
        <P>
          The <UI>24 hours</UI> chart covers containers of compose projects only
          (it reads the same recorded points as a project's{" "}
          <See guide="containers" section="project-usage">
            Usage
          </See>
          ): 15-minute averages, with the highest sample of each as the faint
          line.
        </P>
        <P>
          On a phone the same report is shorter: the numbers, the usage chart, a{" "}
          <UI>Network map</UI> row that opens the map full screen (pan and pinch
          to zoom), every container with its uptime, then every Containers page.
        </P>
        <P>
          <UI>New project</UI> (Engineer) starts a compose project on this
          server.
        </P>
      </>
    ),
  },
  {
    id: "network-map",
    title: "Network map",
    body: (
      <>
        <P>
          The map draws the running containers (or all of them, with{" "}
          <UI>All</UI>) as boxes, their Docker networks on the right, and the
          outside world on the left. Hover a container to light up its lines;
          click it to open it. Drag boxes to tidy the view, zoom with the
          buttons.
        </P>
        <Table
          head={["Line", "Means"]}
          rows={[
            [
              "Solid indigo, with moving dots",
              "Open connections from one container to another (or to the server itself), with the port and how many; thicker = more traffic",
            ],
            [
              "Dashed dark",
              "A published port: the outside world reaches the container through it",
            ],
            ["Dotted grey", "The container is attached to that network"],
          ]}
        />
        <P>
          Connections are read from inside each container's own network, so they
          show even for programs that don't log anything. How many bytes went
          over each connection needs a login that is root or can use sudo
          without a password, and <C>nsenter</C> and <C>ss</C> on the server;
          without them the lines are sized by the number of connections, and the
          map says so under it.
        </P>
        <Tip>
          A container on <C>network_mode: host</C> shares the server's network,
          so its own connections can't be told apart: it is drawn joined to the
          server.
        </Tip>
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
          made, the ones it finds by their containers and the ones it finds on
          the disk (see{" "}
          <See guide="containers" section="existing-projects">
            Compose projects already on the server
          </See>
          ). States: <UI>Running</UI>, <UI>Partly running</UI>, <UI>Stopped</UI>
          , <UI>Not deployed</UI> (saved but never brought up).
        </P>
        <Steps>
          {[
            <>
              <UI>New project</UI>: a name, then the <C>compose.yaml</C> and an
              optional <C>.env</C> (or <UI>Start from a template</UI>, or{" "}
              <UI>From docker run</UI>). The compose helper (image suggestions,
              networks, volumes, variables) and <UI>Check</UI> help before
              creating (see{" "}
              <See guide="containers" section="new-project">
                Making a new project
              </See>
              ).
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
          Each project is a card with its live numbers: containers running, CPU
          and memory (with a sparkline of the last minutes), network in and out,
          restarts, health, published ports, and a readiness ring (see{" "}
          <See guide="containers" section="production">
            Ready for production
          </See>
          ). A red edge = something needs a look: a stopped container, an
          unhealthy one or a restart loop. Press a card to open the project.
        </P>
        <P>A project's page has these tabs:</P>
        <Table
          head={["Tab", "Shows"]}
          rows={[
            [
              "Overview",
              "Title and note, live tiles, charts of the last minutes, readiness, folder and files",
            ],
            [
              "Containers",
              "Every container with state, CPU, memory, network, ports, restarts and uptime",
            ],
            ["Logs", "Every container's output merged by time, live"],
            [
              "Production",
              "The readiness checklist, with fixes written to the compose file",
            ],
            ["Alerts", "Rules that watch this project, and what they sent"],
            [
              "Files",
              "Edit the compose file and .env; Save and apply runs up after saving (Engineer)",
            ],
          ]}
        />
        <P>
          <UI>Edit</UI> beside the title on the Overview gives the project a
          display <UI>Title</UI> (shown instead of the folder name) and a{" "}
          <UI>Note</UI>: what it is, who looks after it, where it is reached.
          They are kept by Morche, not in the compose file. The menu:
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
    id: "existing-projects",
    title: "Compose projects already on the server",
    body: (
      <>
        <P>
          When you add a server, its compose projects don't have to be made
          again: Morche finds them, and from then on you edit and run them like
          the ones it made. It knows a project in three ways:
        </P>
        <Table
          head={["Tag on the card", "How it was found"]}
          rows={[
            [
              "(none)",
              "It is in the environment's projects folder, made by Morche or copied there",
            ],
            [
              "External",
              "Its running or stopped containers carry compose labels that say which file made them",
            ],
            [
              "On the disk",
              "Morche found its compose file by looking at the disk, or someone added it by its path",
            ],
          ]}
        />
        <P>
          The first time someone opens <UI>Projects</UI> for a server, Morche
          looks at the whole disk for <C>compose.yaml</C>,{" "}
          <C>docker-compose.yml</C> and their <C>.yml</C>/<C>.yaml</C> twins
          (and the <C>override</C> files beside them), in the background. It
          skips system folders (<C>/proc</C>, <C>/sys</C>, <C>/usr</C>,{" "}
          <C>/var/lib/docker</C>…) and caches like <C>node_modules</C>,{" "}
          <C>.git</C> and <C>vendor</C>. Nothing on the server changes.
        </P>
        <P>
          When it finds projects that aren't listed yet, a notice says{" "}
          <UI>Found N compose projects on this server</UI>. <UI>Review</UI>{" "}
          opens the list; <UI>Not now</UI> hides the notice on this browser
          until something new turns up.
        </P>
        <Steps>
          {[
            <>
              <UI>Review</UI> (or the toolbar's ⋯ ›{" "}
              <UI>Find compose projects on the disk</UI>).
            </>,
            <>
              Tick the ones to add. Each row shows its folder, its compose files
              and services. The name is the one compose itself would use: the
              file's <C>name:</C>, else <C>COMPOSE_PROJECT_NAME</C> in its{" "}
              <C>.env</C>, else the folder name.
            </>,
            <>
              <UI>Their name is taken</UI>: another project already has that
              name. Type another one to add it (its future containers get the
              new name).
            </>,
            <>
              <UI>Add N projects</UI>. They show up as projects at once, with
              every tab: Files edits their compose file and <C>.env</C> in
              place, and the menu runs up, down, pull, restart on them.
            </>,
          ]}
        </Steps>
        <P>
          <UI>Where to look</UI> narrows the next look to some folders (up to
          10) and sets how deep it goes (default 7). <UI>Look again</UI> runs it
          now; it stops after 3000 files or a minute.
        </P>
        <Example title="A compose file with another name">
          The shop runs from <C>/opt/shop/compose.prod.yml</C>, which a look
          doesn't pick up (only the standard names). Use ⋯ ›{" "}
          <UI>Add a project by its path…</UI>, type{" "}
          <C>/opt/shop/compose.prod.yml</C> (or pick the folder in the tree when
          the file has a standard name) and press <UI>Add project</UI>.
        </Example>
        <P>
          <UI>Stop listing it</UI> (in a project's menu, for projects outside
          the projects folder with no containers) takes it off the list; its
          files stay where they are and later looks leave it out. To bring it
          back, tick it under <UI>Not listed yet</UI> (it says{" "}
          <UI>Set aside</UI>) or add it by its path.
        </P>
        <Tip>
          Keep each project's compose file and <C>.env</C> in its own folder, as
          compose expects: Morche runs compose in that folder, so relative paths
          in the file keep working. Finding, adding and setting aside projects
          needs <UI>Engineer</UI> on the server.
        </Tip>
      </>
    ),
  },
  {
    id: "new-project",
    title: "Making a new project",
    body: (
      <>
        <P>
          <UI>New project</UI> opens on <UI>Write compose</UI>. The top row
          holds where the files come from, <UI>From a template</UI>,{" "}
          <UI>From docker run</UI>, and Cancel / Check / Create; under it the
          project's name and the <UI>Start after creating</UI> switch. Below,
          the editor (<C>compose.yaml</C> and <C>.env</C>) sits beside the{" "}
          <See guide="containers" section="compose-assistant">
            compose helper
          </See>
          . <UI>From git</UI> deploys a repository instead (see{" "}
          <See guide="containers" section="project-git">
            Deploy from git
          </See>
          ).
        </P>
        <Steps>
          {[
            <>
              Pick an image in the helper's <UI>Services</UI> tab (or write the
              file, start from a template, or convert a <C>docker run</C>{" "}
              command).
            </>,
            <>
              Add what the helper suggests for each service, and fill what its{" "}
              <UI>Variables</UI> tab says is missing from <C>.env</C>.
            </>,
            <>
              Press <UI>Check</UI> to have the server read the files and look
              for ports already taken.
            </>,
            <>
              <UI>Create and start</UI>.
            </>,
          ]}
        </Steps>
        <P>
          <strong>Your draft is kept.</strong> Everything typed (name, files,
          the Start switch) stays in this browser until the project is made, one
          draft per server and template. Coming back shows{" "}
          <UI>Your unfinished draft … is back</UI>; <UI>Start over</UI> drops it
          and puts the form back as it began.
        </P>
        <Tip>
          The draft lives only in this browser, .env included. On a shared
          computer, press <UI>Start over</UI> before leaving if the .env holds
          real passwords.
        </Tip>
      </>
    ),
  },
  {
    id: "compose-assistant",
    title: "The compose helper",
    body: (
      <>
        <P>
          Beside the editor (under it on phones) the helper reads the compose
          file as you type and lays it out in tabs. Everything it adds is
          written into the YAML, where you can read and change it; comments and
          your own layout stay as they are.
        </P>
        <Table
          head={["Tab", "What it does"]}
          rows={[
            [
              "Services",
              "One card per service: its ports and mounts (× removes one), whether the image is on the server (Pull now), and suggestions from the image",
            ],
            [
              "Networks",
              "The project's default network, networks in the file (tap a service to put it on or take it off), New network, and the server's networks to join",
            ],
            [
              "Volumes",
              "Named volumes and the services mounting them, folders from the server, unnamed volumes, Mount a volume or folder, and the server's volumes to reuse",
            ],
            ["Variables", "What .env lacks or holds weakly, with Generate"],
            ["Check", "The server's verdict on the files (see below)"],
          ]}
        />
        <P>
          <strong>Suggestions from the image.</strong> For about 30 well-known
          images (nginx, Traefik, PostgreSQL, MySQL, MariaDB, Redis, MinIO,
          WordPress, Nextcloud, Grafana…) the helper knows the usual ports, the
          folders that hold data, the variables and a healthcheck. For any other
          image already on the server it reads what the image exposes and
          declares. Each suggestion has an <UI>Add</UI> button, some with a
          field to change first (a host port, a volume name, a tag);{" "}
          <UI>Add all</UI> takes every recommended one with its defaults.
          Passwords go into <C>.env</C> as random values and the compose file
          reads them as <C>{"${NAME}"}</C>.
        </P>
        <Steps>
          {[
            <>
              On an empty file, pick a tile (or <UI>Another image…</UI>): the
              service is added with its suggested settings.
            </>,
            <>
              Read its card. A port already taken on the server or in the file
              gets the next free one; tick <UI>Only from the server itself</UI>{" "}
              for a port only a reverse proxy on the same server should reach.
            </>,
            <>
              For a database the app needs (WordPress, Nextcloud…), the{" "}
              <UI>Add a database</UI> suggestion adds it, wires the variables
              and waits for its healthcheck.
            </>,
          ]}
        </Steps>
        <Example title="Join a reverse proxy's network">
          Open <UI>Networks</UI>; under <UI>On this server</UI> press{" "}
          <UI>Join</UI> beside the proxy's network. It's declared as{" "}
          <C>external</C>; then tap each service that should be on it.
        </Example>
        <Tip>
          Keep data in named volumes rather than unnamed ones (they survive a
          clean-up and show on the Volumes page), pin image tags, and publish
          databases nowhere: the other services reach them by name.
        </Tip>
        <Tip>
          When the YAML doesn't read (a typo while typing), the helper shows why
          and waits; nothing is added until the file reads again.
        </Tip>
      </>
    ),
  },
  {
    id: "from-docker-run",
    title: "From a docker run command",
    body: (
      <>
        <P>
          <UI>From docker run</UI> (in the toolbar) turns one or more{" "}
          <C>docker run</C> commands into compose services. Paste them as you
          would type them: lines continued with <C>{"\\"}</C>, several commands
          on their own lines or joined with <C>&amp;&amp;</C>, with or without{" "}
          <C>sudo</C>. The services show as you paste.
        </P>
        <Example title="Pasted">
          <Code>{`docker run -d --name web -p 8080:80 \\
  -v web-data:/usr/share/nginx/html \\
  -e TZ=UTC --restart unless-stopped nginx:alpine`}</Code>
        </Example>
        <P>
          becomes a <C>web</C> service with its ports, volume, restart policy
          and <C>TZ</C>, plus a top-level <C>web-data</C> volume. Ports, volumes
          and <C>--mount</C>, environment, networks and aliases, limits (
          <C>--memory</C>, <C>--cpus</C>), health checks, capabilities, devices,{" "}
          <C>--gpus</C>, logging, ulimits and the command after the image are
          all carried over.
        </P>
        <Table
          head={["Option", "Does"]}
          rows={[
            [
              "Put environment values in .env",
              <>
                The service reads <C>${"{NAME}"}</C> and the value goes to .env
                (on by default)
              </>,
            ],
            [
              "Use the volumes that already exist",
              "Marks named volumes external, so the project keeps the old container's data instead of making new, empty volumes",
            ],
          ]}
        />
        <P>
          A service name already in the file gets <C>-2</C>. <UI>Left out</UI>{" "}
          lists flags compose has no place for (they're not lost silently), and{" "}
          <UI>Worth knowing</UI> notes things like <C>--rm</C> or <C>-P</C>. If
          the compose box itself holds a <C>docker run</C> command, a notice
          offers <UI>Convert it</UI>.
        </P>
        <Tip>
          Moving a container you already run: turn on{" "}
          <UI>Use the volumes that already exist</UI>, stop the old container,
          then create the project.
        </Tip>
      </>
    ),
  },
  {
    id: "project-variables",
    title: "Variables and secrets",
    body: (
      <>
        <P>
          The helper's <UI>Variables</UI> tab reads every <C>${"{NAME}"}</C> in
          the compose file and compares it with <C>.env</C>:
        </P>
        <Table
          head={["Shows", "Means"]}
          rows={[
            [
              "Not in .env",
              "Read by the compose file but not set; compose uses an empty value",
            ],
            [
              "required",
              <>
                Written <C>${"{NAME:?…}"}</C>: compose refuses to start without
                it
              </>,
            ],
            [
              "holds a placeholder",
              "A password, token, key or salt that is empty or still changeme, secret, password…",
            ],
            [
              "Not read by the compose file",
              "In .env but unused (fine when a service loads the file with env_file)",
            ],
          ]}
        />
        <P>
          <UI>Add to .env</UI> writes the missing names (secrets with a random
          value, the rest empty for you to fill), and <UI>Generate secrets</UI>{" "}
          replaces placeholders with random 32-character values. Both open the
          .env so you see the change. A variable with a fallback (
          <C>${"{NAME:-value}"}</C>) is never missing.
        </P>
        <Tip>
          Templates come with placeholder passwords: one press on{" "}
          <UI>Generate secrets</UI> makes them real.
        </Tip>
      </>
    ),
  },
  {
    id: "project-check",
    title: "Checking before creating",
    body: (
      <>
        <P>
          <UI>Check</UI> (beside Create) opens the helper's <UI>Check</UI> tab
          and copies the files to a temporary folder on the server, runs{" "}
          <C>docker compose config</C> there, removes the copy, and lists open
          ports with <C>ss</C>. Nothing is saved or started. It shows:
        </P>
        <Table
          head={["Part", "Shows"]}
          rows={[
            ["Ready to create", "Compose read the files and no port is taken"],
            [
              "Compose refused the files",
              "Compose's own message: a wrong key, a missing required variable…",
            ],
            [
              "Name",
              "A project with this name, or files in its folder, already exist",
            ],
            [
              "Services",
              "Each service and its image (or built from a Dockerfile)",
            ],
            [
              "In use on the server",
              "Something already listens on that host port: the container would fail to start",
            ],
            ["Twice in this file", "Two services publish the same host port"],
            [
              "Show the final file",
              "The files as compose reads them, variables filled in",
            ],
          ]}
        />
        <P>
          Changing anything afterwards marks the result{" "}
          <UI>changed since the check</UI>; press Check again. The check uses
          the files as they'll be saved, new-project defaults included.
        </P>
        <Warn>
          <UI>Show the final file</UI> shows .env values filled in, passwords
          too.
        </Warn>
      </>
    ),
  },
  {
    id: "project-logs",
    title: "A project's logs",
    body: (
      <>
        <P>
          <UI>Logs</UI> on a project's page merges the output of all its
          containers by time, like <C>docker compose logs -f</C>: the last lines
          first, then new ones as they come. Each line starts with its service;
          press the name (or a chip above the log) to see only that service. The
          filter stays in the address, so a link opens the same view.
        </P>
        <Table
          head={["Control", "Does"]}
          rows={[
            ["Search", "Keeps lines with the text (or from that container)"],
            [
              "All · Output · Errors",
              "Errors = what the containers wrote to stderr",
            ],
            ["Last 500", "How many earlier lines to load (200 to 5,000)"],
            ["Pause / Follow", "Stops or resumes the live lines"],
            ["Wrap · Times", "Wraps long lines · shows each line's time"],
            ["Copy · Download", "The lines shown, as plain text"],
          ]}
        />
        <Tip>
          A container's <UI>Logs</UI> menu item on the Containers tab jumps
          here, already filtered to its service. When every container stops, the
          log waits and picks up the new ones after a deploy.
        </Tip>
      </>
    ),
  },
  {
    id: "deploy-status",
    title: "Following a deploy",
    body: (
      <>
        <P>
          After <UI>Create</UI>, <UI>Deploy</UI> or <UI>Redeploy</UI> the
          project's page shows the deploy as it runs, above every tab: its steps
          (<UI>Read the compose file</UI>, <UI>Pull the images</UI>,{" "}
          <UI>Create and start</UI>, <UI>Done</UI>), how many images are left,
          and the command's output as it comes. You can leave the page; the
          deploy goes on as a background task.
        </P>
        <P>
          <UI>Services</UI> on the Overview and the <UI>Containers</UI> tab list
          every service of the compose file, also the ones that have no
          container yet, and say what each one is doing:
        </P>
        <Table
          head={["State", "Means"]}
          rows={[
            ["Waiting for its image", "Another image is downloading first"],
            ["Downloading its image", "Its image is being pulled now"],
            ["Image ready", "Made once every image is on the server"],
            ["Creating · Starting", "docker compose is making it now"],
            [
              "Waiting for what it depends on",
              "It starts after the services in its depends_on",
            ],
            ["Created, not started", "Made, but Docker couldn't start it"],
            ["Not created", "The deploy failed before it; the reason is shown"],
            ["Off", "Left out by a profile that isn't turned on"],
            ["No container", "It's in the file but nothing runs: Redeploy"],
          ]}
        />
        <P>
          When a deploy fails, the panel turns red and shows what Docker
          answered, a hint in plain words for the usual causes (a port already
          in use, an image or tag that doesn't exist, a registry login, a full
          disk, a mistake in the file, a variable without a value) with a button
          to fix it, and the output open. <UI>Try again</UI> runs it again;{" "}
          <UI>Hide</UI> puts it away until the next deploy.
        </P>
        <Tip>
          A container that stopped right after starting usually says why in its
          own log: open the <UI>Logs</UI> tab. A finished deploy stays on the
          page for five minutes.
        </Tip>
      </>
    ),
  },
  {
    id: "production",
    title: "Ready for production",
    body: (
      <>
        <P>
          The <UI>Production</UI> tab checks each service's running container
          for what it should have before it carries real traffic, and gives a
          score out of 100. Red = should be fixed, grey = a suggestion.
        </P>
        <Table
          head={["Check", "Why"]}
          rows={[
            [
              "Restarts on its own",
              "A crashed container comes back, also after a reboot",
            ],
            ["Memory limit", "One leaking service can't starve the others"],
            ["Health check", "Docker knows whether it answers, not only runs"],
            [
              "Log rotation",
              "json-file logs never shrink and can fill the disk",
            ],
            [
              "Pinned image version",
              "A redeploy pulls what you tested, not a new :latest",
            ],
            [
              "Not privileged",
              "A privileged container can do almost anything on the server",
            ],
            ["CPU limit (suggestion)", "A busy service can't take every core"],
            [
              "Not root (suggestion)",
              "Harder to escape if the app is broken into",
            ],
            ["Read-only (suggestion)", "The app can't change its own files"],
          ]}
        />
        <Steps>
          {[
            <>
              Press <UI>Edit</UI> on a service (Engineer): restart policy,
              memory and CPU limits, a health check (presets for PostgreSQL,
              MySQL, Redis, MongoDB and HTTP), log rotation, user and read-only.
            </>,
            <>
              <UI>Show the service after the change</UI> previews what will be
              written. Only the settings you changed are touched; the rest of
              the file stays as it was.
            </>,
            <>
              <UI>Save and apply</UI> writes the compose file and runs <C>up</C>
              , which recreates the changed services. <UI>Save</UI> alone leaves
              the running containers as they are: the check then shows a clock
              until you <UI>Apply now</UI>.
            </>,
          ]}
        </Steps>
        <P>
          The buttons at the top fix one thing on every service at once:{" "}
          <UI>Restart them on a crash</UI> (<C>restart: unless-stopped</C>) and{" "}
          <UI>Rotate their logs</UI> (3 files of 10 MB).
        </P>
        <P>
          <UI>Keep ports private</UI> shows when the compose file publishes a
          port on every address of the server (<C>"3030:3000"</C>). Docker opens
          those ahead of ufw and firewalld, so anyone can connect. The ticked
          ports are rewritten to <C>"127.0.0.1:3030:3000"</C>: apps and a
          reverse proxy on the same server still reach them, other machines
          don't. Ports 80 and 443 start unticked. To let a few addresses in
          instead, use{" "}
          <See guide="firewall" section="containers">
            the firewall's Containers tab
          </See>
          .
        </P>
        <Recommended
          rows={[
            {
              setting: <C>restart</C>,
              value: "unless-stopped",
              why: "Comes back after a crash or reboot, stays down when you stop it.",
            },
            {
              setting: <C>memory</C>,
              value: "about 2× what it uses now",
              why: "Room for peaks, but a leak stops at the limit.",
            },
            {
              setting: <C>logging</C>,
              value: "max-size 10m, max-file 3",
              why: "At most 30 MB of logs per container.",
            },
          ]}
        />
        <Warn>
          A health check's command runs inside the container: the tool it calls
          (curl, wget…) must be in the image, or the service turns unhealthy.
          Read-only needs testing too: many images write to <C>/tmp</C>.
        </Warn>
        <Tip>
          Only services written in the project's first compose file can be
          edited here; with several files, change the others in <UI>Files</UI>.
          A compose file with a YAML problem must be fixed there first.
        </Tip>
      </>
    ),
  },
  {
    id: "project-usage",
    title: "A project's usage over time",
    body: (
      <>
        <P>
          <UI>Usage</UI> on a project's Overview shows its CPU, memory, network
          and running containers. <UI>Live</UI> = the last minutes, as they
          come; <UI>24 h</UI>, <UI>7 days</UI> and <UI>30 days</UI> = the
          recorded history, a point every 5 minutes with its average and peak.
          The period you pick is remembered.
        </P>
        <P>
          Points are recorded while the server is in use by Morche (its
          containers looked at, or its updates checked). A gap in a chart means
          no point was recorded then, not that the project was idle.
        </P>
        <Recommended
          rows={[
            {
              setting: "Settings › Keep numbers for",
              value: "30 days",
              why: "Enough to see a slow memory leak or a monthly peak; Off stops recording",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "project-env",
    title: "Environment values (.env)",
    body: (
      <>
        <P>
          The <UI>Environment</UI> tab edits the project's <C>.env</C> file: one
          row per value, masked until you press the eye (or <UI>Show values</UI>
          ). <UI>Text</UI> edits the whole file as it is, for comments or values
          over several lines. Reading values needs Engineer access.
        </P>
        <Steps>
          {[
            <>Change, add or remove rows. Names start with a letter or _.</>,
            <>
              Optionally say <UI>What changed</UI>: it's kept in the History.
            </>,
            <>
              <UI>Save and apply</UI> recreates the containers so they read the
              new values; <UI>Save</UI> alone leaves them running with the old
              ones until the next deploy.
            </>,
          ]}
        </Steps>
        <Tip>
          If the file changed on the server while you edited, you're asked to
          load their version or overwrite it with yours.
        </Tip>
      </>
    ),
  },
  {
    id: "project-history",
    title: "History and rollback",
    body: (
      <>
        <P>
          Each time a project's compose file or <C>.env</C> is saved here,
          restored or deployed from git, the version before and after is kept
          (the last 50). The <UI>History</UI> tab lists them with when, who and
          why (<UI>Created</UI>, <UI>Saved</UI>, <UI>Restored</UI>,{" "}
          <UI>From git</UI>, <UI>As found</UI>).
        </P>
        <Steps>
          {[
            <>Press a version to compare it with the files now.</>,
            <>
              <UI>Put this version back…</UI> writes it to the server, and can
              deploy it at once. Without deploying, the containers keep running
              the old files until you apply.
            </>,
          ]}
        </Steps>
        <Tip>
          A notice says when the files on the server were changed outside
          Morche: the next save or restore keeps them first, so nothing is lost.
        </Tip>
      </>
    ),
  },
  {
    id: "project-git",
    title: "Deploy from git (GitOps)",
    body: (
      <>
        <P>
          Keep the compose file in a git repository and Morche deploys it: on a
          push (webhook), on a check every few minutes, or when you press{" "}
          <UI>Deploy now</UI>. Start one with <UI>New project</UI> ›{" "}
          <UI>From git</UI>, or connect an existing project on its <UI>Git</UI>{" "}
          tab. The server clones the repository itself, so it must reach it.
        </P>
        <Table
          head={["Field", "Means"]}
          rows={[
            ["Repository", "Its https address, without a login in it"],
            ["Branch", "The one to follow; pushes to others are ignored"],
            [
              "Compose file",
              "Its path in the repository; empty = the usual names at the top",
            ],
            [
              "User · Access token",
              "For a private repository (read access is enough, kept encrypted)",
            ],
            [
              "Deploy new commits by themselves",
              "Off = only Deploy now; the webhook and checks just note the commit",
            ],
            [
              "Look for new commits",
              "Webhook only, or every 5/15/60 minutes for hosts without webhooks",
            ],
          ]}
        />
        <Steps>
          {[
            <>
              Copy the <UI>Webhook address</UI> from the Git tab.
            </>,
            <>
              Add it to the repository as a push webhook (GitHub, GitLab,
              Gitea…); no secret is needed.
            </>,
            <>Push: the deploy shows in Background tasks and the History.</>,
          ]}
        </Steps>
        <Warn>
          Anyone with the webhook address can start a deploy: keep it private,
          and <UI>Make a new address</UI> if it leaks. Webhook and timed deploys
          run with the access of whoever connected the repository.
        </Warn>
        <Tip>
          Files the repository doesn't track, like <C>.env</C>, stay on the
          server: keep passwords there, not in git. Disconnecting leaves the
          files and containers running.
        </Tip>
      </>
    ),
  },
  {
    id: "alerts",
    title: "Container alerts",
    body: (
      <>
        <P>
          <UI>Alerts</UI> in the containers sidebar (and the <UI>Alerts</UI> tab
          of a project) holds alert rules for containers: crashed or stopped,
          unhealthy, restart loops, CPU, memory near its limit, and the Docker
          engine itself. They are ordinary alert rules, sent through the
          workspace's channels. <See guide="alerts" section="containers" />
        </P>
        <Steps>
          {[
            <>
              Pick a ready-made rule (<UI>Container crashed</UI>,{" "}
              <UI>Restart loop</UI>…) or <UI>New rule</UI>.
            </>,
            <>
              On a project's tab the rule is already limited to that project;
              narrow it further to a container or service name (wildcards{" "}
              <C>*</C> and <C>?</C> work).
            </>,
            <>
              Pick channels and save. Firing rules show a red count on the tab.
            </>,
          ]}
        </Steps>
      </>
    ),
  },
  {
    id: "templates",
    title: "Templates",
    body: (
      <>
        <P>
          <UI>Customization</UI> › <UI>Templates</UI> is an app store for your
          servers: over 350 built-in compose projects, from WordPress, Ghost and
          Nextcloud to Grafana, n8n, Gitea, Vaultwarden, Ollama, Immich and
          Jellyfin, plus your workspace's own. The container apps that used to
          be in <UI>Applications</UI> live here too.
        </P>
        <Steps>
          {[
            <>
              With nothing picked, the page opens on an overview:{" "}
              <UI>Popular</UI>, then every category (AI, Productivity, Media,
              Monitoring, Security…) with its best few. <UI>See all</UI> opens
              the whole list.
            </>,
            <>
              Or narrow it down: the chips under the bar pick a category, the
              search looks through names, tags, descriptions and image names
              (every word must match), and <UI>Built-in</UI> / <UI>Yours</UI>{" "}
              split by source.
            </>,
            <>
              Click a card to read it: what it runs, its website,{" "}
              <UI>Before you start</UI> (values you must fill in, how many
              passwords Morche makes) and its compose file and <C>.env</C>.
            </>,
            <>
              <UI>Deploy</UI> opens <UI>New project</UI> filled with it on the
              current environment. Change anything, then create it.
            </>,
          ]}
        </Steps>
        <P>
          Passwords and keys are never shipped in a template: the <C>.env</C>{" "}
          holds placeholders that get a fresh value for each new project, the
          moment <UI>New project</UI> opens. Values only you know (a domain, an
          API key, an admin email) sit under{" "}
          <C># Fill these in before starting</C>, and optional ones under{" "}
          <C># Optional settings</C>.
        </P>
        <Table
          head={["Placeholder", "Becomes"]}
          rows={[
            [<C key="s">{"{{secret}}"}</C>, "32 letters and digits"],
            [<C key="n">{"{{secret:16}}"}</C>, "that many letters and digits"],
            [<C key="u">{"{{user}}"}</C>, "a random lowercase user name"],
            [<C key="h">{"{{hex:32}}"}</C>, "that many hex digits (keys)"],
            [
              <C key="b">{"{{base64:32}}"}</C>,
              "that many random bytes, base64",
            ],
            [<C key="o">{"{{host}}"}</C>, "the server's address"],
          ]}
        />
        <P>
          <UI>New template</UI> (workspace Engineer) takes a name, category,
          description, the compose file and an optional <C>.env</C>; the compose
          file must be valid YAML with a <C>services:</C> section. A built-in
          one can't be changed, but <UI>Copy to edit</UI> makes it yours. In{" "}
          <UI>New project</UI>, <UI>From a template</UI> opens the same catalog
          with search and categories.
        </P>
        <Tip>
          Write placeholders in your own templates too: put{" "}
          <C>{"DB_PASSWORD={{secret}}"}</C> in the <C>.env</C> and use{" "}
          <C>{"${DB_PASSWORD}"}</C> in the compose file, so every project gets
          its own password and a deploy only edits one file.
        </Tip>
        <Warn>
          Templates are a starting point, not a hardened setup: read the compose
          file before starting it, keep admin ports off the internet (
          <UI>Firewall</UI> or the reverse proxy) and pin image tags for
          production. <UI>Portainer Agent</UI> gives control of Docker to
          whoever reaches its port: let only your Portainer server in.
        </Warn>
        <P>
          Many built-in templates are adapted from Coolify's service templates
          (Apache-2.0); logos belong to their owners.
        </P>
        <See guide="applications" section="container-apps" />
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
        <P>
          To keep containers updated by themselves (like Watchtower), use{" "}
          <See guide="containers" section="auto-update">
            Auto-update
          </See>
          . Or make a cron job with the <UI>Update containers</UI> action (
          <See guide="cronjobs" section="actions" />
          ): it can limit itself to some projects or containers and put the old
          image back when a container stops or turns unhealthy after the update.
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
    id: "auto-update",
    title: "Auto-update (keep containers on the newest image)",
    body: (
      <>
        <P>
          <UI>Auto-update</UI> (under Management) keeps chosen containers on the
          newest image of their tag by themselves, like Watchtower but without
          installing anything: Morche asks each registry for a newer image,
          pulls it and recreates the container with the same settings. A
          workspace can have several <UI>policies</UI>, each with its own
          servers, containers, schedule and safety settings.
        </P>
        <Steps>
          <>
            Open <UI>Auto-update</UI> and press <UI>New policy</UI> (or{" "}
            <UI>Keep up to date…</UI> in a container's menu, or{" "}
            <UI>Set up auto-update</UI> on a server's Updates page: the server
            and container are filled in).
          </>
          <>
            Tick the servers, then say which containers it takes in. The list
            under the form shows, live, every container it would take and the
            ones it leaves out, with why.
          </>
          <>
            Pick <UI>Update them</UI> or <UI>Only tell me</UI>, a schedule (or
            none: by hand and webhook only) and who to tell.
          </>
          <>
            Press <UI>Create</UI>. <UI>Check now</UI> / <UI>Run now</UI> on its
            page runs it at once; <UI>Run here</UI> runs it on one server.
          </>
        </Steps>
        <P>
          A policy's page has <UI>Overview</UI> (last and next run, what it did
          in the last 30 days, the containers it takes in now, its webhook),{" "}
          <UI>Activity</UI> (every container it updated, found, rolled back,
          skipped or failed on) and <UI>Settings</UI>. The <UI>Activity</UI> tab
          of the list shows every policy's, kept 180 days.
        </P>
        <Table
          head={["Activity", "Means"]}
          rows={[
            ["Updated", "Now runs the new image"],
            [
              "New image",
              "A newer image is waiting (Only tell me, or a monitor-only label)",
            ],
            [
              "Rolled back",
              "The new one stopped or turned unhealthy, so the old image came back",
            ],
            ["Skipped", "A pre-update hook asked to skip this time"],
            [
              "Failed",
              "The pull or the swap went wrong; the old container still runs",
            ],
          ]}
        />
        <Tip>
          Each run is a background task (<UI>Container auto-update</UI>) you can
          follow or cancel from Tasks. A policy runs with the access of whoever
          saved it last.
        </Tip>
        <P>
          Levels: workspace Viewer sees policies and their activity, Operator
          runs them, Engineer creates, edits and deletes them.
        </P>
      </>
    ),
  },
  {
    id: "auto-update-picking",
    title: "Auto-update: which containers, and labels",
    body: (
      <>
        <Table
          head={["Containers", "Takes in"]}
          rows={[
            [
              "Every container",
              "All of them on the servers, except the ones you leave out",
            ],
            [
              "Labelled ones",
              <>
                Only containers labelled <C>morcheh.auto-update.enable=true</C>
              </>,
            ],
            [
              "Chosen ones",
              "The containers, compose projects or images you name (labelled ones too)",
            ],
          ]}
        />
        <P>
          A name can be a container (<C>web</C>), a compose project (<C>shop</C>
          ), a project's service (<C>shop/api</C>) or an image (<C>nginx</C>,{" "}
          <C>ghcr.io/acme/*</C>); <C>*</C> and <C>?</C> work. <UI>Leave out</UI>{" "}
          takes the same names and always wins. Containers built on the server,
          pinned to a digest, paused or (unless ticked) stopped are never taken.
        </P>
        <P>
          Labels on a container tune it from its compose file. Watchtower's{" "}
          <C>com.centurylinklabs.watchtower.*</C> labels work as they are, so a
          stack moved from Watchtower needs no changes.
        </P>
        <Table
          head={["Label (morcheh.auto-update.…)", "Does"]}
          rows={[
            [
              <C key="e">enable=true|false</C>,
              "Take it in, or never touch it (false wins over every policy)",
            ],
            [
              <C key="m">monitor-only=true</C>,
              "Only report a new image for this one",
            ],
            [
              <C key="n">no-pull=true</C>,
              "Never pull; recreate only when the image was replaced on the server",
            ],
            [
              <C key="d">depends-on=db,cache</C>,
              "Restart this one after those are updated",
            ],
          ]}
        />
        <Example title="A compose service that updates itself, a database that only reports">
          <Code>{`services:
  web:
    image: ghcr.io/acme/web:1
    labels:
      morcheh.auto-update.enable: "true"
  db:
    image: postgres:16
    labels:
      morcheh.auto-update.enable: "true"
      morcheh.auto-update.monitor-only: "true"`}</Code>
        </Example>
      </>
    ),
  },
  {
    id: "auto-update-safety",
    title: "Auto-update: safety settings",
    body: (
      <>
        <P>
          Compose containers are recreated through <C>docker compose</C> (one
          service, <C>--no-deps</C>), others with their exact settings. Around
          that:
        </P>
        <Table
          head={["Setting", "Does"]}
          rows={[
            [
              "Roll back if it fails",
              "Watches the new container for the set time (its health check decides sooner); if it stops or turns unhealthy, the old image is put back",
            ],
            [
              "Wait before taking a new image",
              "Skips an image younger than this, so a broken release can be pulled back by its publisher first",
            ],
            [
              "Never pull",
              "Only recreates containers whose image was already replaced on the server",
            ],
            [
              "Restart linked containers",
              "Restarts containers that depend on an updated one (depends-on label, network_mode: container:)",
            ],
            ["Time to stop", "How long a container gets to shut down cleanly"],
            ["Remove the old image", "Once nothing uses it any more"],
            [
              "Stopped containers too / Start them",
              "Updates stopped containers; off leaves an updated one stopped",
            ],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "Mode",
              value: "Update for stateless apps, Only tell me for databases",
              why: "A database's major upgrade usually needs a migration step",
            },
            {
              setting: "Roll back if it fails",
              value: "On, 30–60 s",
              why: "A crash-looping release goes back to the old image by itself",
            },
            {
              setting: "Wait before taking a new image",
              value: "6–24 hours on production",
              why: "Bad releases are usually replaced within hours",
            },
            {
              setting: "Schedule",
              value: "Once a night, outside busy hours",
              why: "Each updated container restarts once",
            },
          ]}
        />
        <Warn>
          A tag like <C>latest</C> can jump a major version. Prefer tags such as{" "}
          <C>postgres:16</C> or <C>nginx:1.27</C>.
        </Warn>
      </>
    ),
  },
  {
    id: "auto-update-hooks",
    title: "Auto-update: lifecycle hooks",
    body: (
      <>
        <P>
          With <UI>Run lifecycle hooks</UI> on, a container can run its own
          commands (inside itself, with <C>sh -c</C>) around its update, set
          with labels:
        </P>
        <Table
          head={["Label (morcheh.auto-update.lifecycle.…)", "Runs"]}
          rows={[
            [<C key="a">pre-check</C>, "Before each check for a new image"],
            [
              <C key="b">pre-update</C>,
              "In the old container, just before it stops. Exit code 75 = skip this update",
            ],
            [
              <C key="c">post-update</C>,
              "In the new container, once it started",
            ],
            [<C key="d">post-check</C>, "After the run is done with it"],
          ]}
        />
        <P>
          A <C>pre-update</C> hook that fails (any exit code but 0 or 75) stops
          that container's update and the old one keeps running; the other hooks
          are only logged. Hooks run in running containers only.{" "}
          <C>…-timeout</C> labels (minutes) override the policy's{" "}
          <UI>Time a hook may take</UI>.
        </P>
        <Example title="Dump the database before an update">
          <Code>{`labels:
  morcheh.auto-update.lifecycle.pre-update: "pg_dump -U app app > /backup/before-update.sql"
  morcheh.auto-update.lifecycle.pre-update-timeout: "5"`}</Code>
        </Example>
      </>
    ),
  },
  {
    id: "auto-update-webhook",
    title: "Auto-update: webhook and notifications",
    body: (
      <>
        <P>
          Every policy has a webhook URL (its <UI>Overview</UI>). Calling it
          runs the policy at once, even when it has no schedule; add{" "}
          <C>?image=</C> to look only at containers of that image. No sign-in is
          needed, so treat the URL as a password: <UI>New URL</UI> makes the old
          one stop working.
        </P>
        <Example title="At the end of a CI pipeline">
          <Code>{`curl -fsS -X POST "https://morche.example.com/hooks/docker-update/<token>?image=ghcr.io/acme/web"`}</Code>
        </Example>
        <P>
          <UI>Tell me</UI> sends a summary to the policy's channels (
          <See guide="alerts">Alerts</See>): when something is updated, found or
          fails (default), only on failures, after every run, or never.
        </P>
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
    id: "daemon-config",
    title: "Engine config (daemon.json)",
    body: (
      <>
        <P>
          <UI>Engine config</UI> (under Administration) edits Docker's own
          settings file, <C>/etc/docker/daemon.json</C> on the selected
          environment (the rootless one for a rootless Docker), and applies it.
          Anyone with Engineer access can read it; only an Owner of the server
          can change it, since it affects every container there. Podman has no
          daemon.json, so the page says so instead.
        </P>
        <Steps>
          <li>
            Pick the environment at the top of the sidebar and open{" "}
            <UI>Engine config</UI>.
          </li>
          <li>
            Edit the JSON, or open a card under <UI>Suggested settings</UI>, set
            its values and press <UI>Add to the file</UI>.{" "}
            <UI>Add recommended</UI> adds every recommended one at once.
          </li>
          <li>
            Press <UI>Save</UI>. The dialog shows what changes and lets you
            choose: <UI>Save and restart Docker</UI>, <UI>Save and reload</UI>{" "}
            or <UI>Only save</UI>.
          </li>
        </Steps>
        <Table
          head={["Then", "What happens"]}
          rows={[
            [
              "Restart Docker",
              "Every setting applies. Running containers stop and start again (unless live-restore is on); ones without a restart policy stay stopped. If Docker doesn't come back, Morche puts the old file back and starts Docker again, and shows Docker's own error",
            ],
            [
              "Reload",
              "No downtime. Docker re-reads only some settings (labels, debug, log level, registry mirrors, insecure registries, live-restore, max concurrent downloads/uploads, shutdown timeout, runtimes, features). The rest wait for a restart, and the dialog names them",
            ],
            [
              "Only save",
              "The file is written; Docker uses it from its next restart. The page then shows Saved, but Docker isn't using it yet with Reload and Restart buttons",
            ],
          ]}
        />
        <P>
          Before writing, Morche asks Docker to check the file (
          <C>dockerd --validate</C>, Docker 23 and later), so a file Docker
          would refuse is never saved. The file before each save is kept as{" "}
          <C>daemon.json.morcheh-bak</C>; <UI>⋯</UI> ›{" "}
          <UI>Load the copy before the last save</UI> puts it back in the
          editor. An empty editor removes the file, so Docker uses its defaults.
        </P>
        <Recommended
          rows={[
            {
              setting: "Limit container log size",
              value: "10m × 3 files",
              why: "Stops container logs filling the disk",
            },
            {
              setting: "Keep containers running while Docker restarts",
              value: "On",
              why: "Later restarts of Docker no longer stop your containers",
            },
          ]}
        />
        <Tip>
          Add both, then restart once while nothing important is busy. After
          that most changes need only a reload or a calm restart.
        </Tip>
        <Warn>
          A setting given both as a flag on the service (for example{" "}
          <C>-H fd://</C> in <C>ExecStart</C>) and in daemon.json stops Docker
          from starting. The page warns about it and won't save until one of
          them goes. It also warns before you open Docker's API on a TCP port
          without TLS, turn off iptables, or move <C>data-root</C> or change{" "}
          <C>storage-driver</C> (existing containers and images seem to
          disappear until they're moved).
        </Warn>
        <Tip>
          Someone else changed the file meanwhile? Saving says so: choose{" "}
          <UI>Load theirs</UI> or <UI>Overwrite</UI>. If Docker runs as the
          container's main process (no systemd), Morche can only reload it;
          restart it yourself after saving.
        </Tip>
      </>
    ),
  },
  {
    id: "settings",
    title: "Settings",
    body: (
      <>
        <P>
          <UI>Settings</UI> belong to the workspace, and each environment can
          change some of them for itself (see{" "}
          <See guide="containers" section="environment-settings">
            Settings for one environment
          </See>
          ). A workspace Owner changes them; everyone else can read them.
          Changes wait in the form until you press <UI>Save</UI>. The bar at the
          bottom counts them, and <UI>Discard</UI> drops them.
        </P>
        <Table
          head={["Setting", "Does"]}
          rows={[
            [
              "Projects folder",
              "Where a new compose project is saved on each server, one folder per project. Projects already made stay where they are",
            ],
            [
              "Remove leftover containers",
              "Deploying removes the containers of services taken out of the compose file (--remove-orphans). Off leaves them running",
            ],
            [
              "Versions kept per project",
              "How many saved versions of a project's compose and .env files History keeps (10 to 200)",
            ],
            [
              "New projects",
              "A restart policy, memory and CPU limits and log rotation added to new projects (see below)",
            ],
            [
              "Check automatically · How often",
              "Compares the running images with their registries without pulling anything, every 6 or 12 hours, daily, every 3 days or weekly",
            ],
            [
              "Scanner image",
              "The Trivy image used when Trivy isn't installed on the server",
            ],
            [
              "Only problems with a fix",
              "Scans leave out vulnerabilities that have no fixed version yet (from the next scan)",
            ],
            [
              "Notifications",
              "Messages about new image versions and vulnerabilities, sent to alert channels",
            ],
            [
              "Clean-up",
              "Removes unused images, build cache, stopped containers and networks on a schedule",
            ],
            [
              "Volume backups",
              "The storage, folder and copies kept that Back up… starts with",
            ],
            [
              "Starting period",
              "How far back the event log reads when it opens",
            ],
            [
              "Keep numbers for",
              "How long each project's usage history is kept (a point every 5 minutes). Off stops recording",
            ],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "Projects folder",
              value: "/opt/projects",
              why: "Survives reboots and is easy to back up. Avoid /tmp",
            },
            {
              setting: "Check for image updates",
              value: "On, once a day",
              why: "Only asks the registries, and Docker Hub limits how often one address may ask",
            },
            {
              setting: "Scanner image",
              value: "A pinned version, like aquasec/trivy:0.58.1",
              why: "Results stay comparable between scans",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "new-project-defaults",
    title: "Defaults for new projects",
    body: (
      <>
        <P>
          <UI>Settings</UI> › <UI>New projects</UI> lists what a new compose
          project should have for production. When you create a project with{" "}
          <UI>Write compose</UI> or from a template, Morche adds these to every
          service that doesn&apos;t set them itself:
        </P>
        <Table
          head={["Setting", "Adds"]}
          rows={[
            ["Restart policy", "restart: (unless a restart_policy is set)"],
            ["Memory limit", "deploy.resources.limits.memory"],
            ["CPU limit", "deploy.resources.limits.cpus"],
            [
              "Log rotation",
              "logging: json-file with max-size and max-file (only when the service has no logging)",
            ],
          ]}
        />
        <P>
          On the <UI>New project</UI> page, the{" "}
          <UI>Add the production defaults</UI> card lists what each service will
          get. Turn it off to save the file exactly as written. Only those keys
          are added; the rest of the file keeps its comments and layout.
          Projects deployed from git aren&apos;t changed, because their file
          lives in the repository.
        </P>
        <Recommended
          rows={[
            {
              setting: "Restart policy",
              value: "unless-stopped",
              why: "Comes back after a crash or reboot, but stays stopped when you stop it",
            },
            {
              setting: "Log rotation",
              value: "10 MB × 3 files",
              why: "Docker's default log grows until the disk is full",
            },
            {
              setting: "Memory limit",
              value: "Off, or about what the biggest app needs",
              why: "One limit for every service is too low for databases. Set them per project in Production",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "docker-notifications",
    title: "Update and vulnerability messages",
    body: (
      <>
        <P>
          <UI>Settings</UI> › <UI>Notifications</UI> sends messages to the
          workspace&apos;s alert channels (email, Telegram, Slack…; see{" "}
          <See guide="alerts">Alerts</See>):
        </P>
        <Table
          head={["Setting", "Sends a message when"]}
          rows={[
            [
              "New image updates",
              "An update check finds an image with a newer version that wasn't waiting before (each image once, not on every check)",
            ],
            [
              "Vulnerabilities found",
              "A scan finds more critical problems (Critical) or more high and critical ones (High) than the image's last scan did",
            ],
            [
              "Send to",
              "The channels ticked here. None ticked = nothing is sent",
            ],
          ]}
        />
        <P>
          Each message names the server and the images, and links to its{" "}
          <UI>Updates</UI> or <UI>Security</UI> page. Messages about updates
          need <UI>Check automatically</UI> on (or someone pressing{" "}
          <UI>Check now</UI>).
        </P>
        <Tip>
          A channel saved in another workspace can&apos;t be picked. Add one
          under <UI>Alerts</UI> › <UI>Channels</UI> first.
        </Tip>
      </>
    ),
  },
  {
    id: "auto-cleanup",
    title: "Automatic clean-up",
    body: (
      <>
        <P>
          Images left behind by updates and builds fill disks slowly.{" "}
          <UI>Settings</UI> › <UI>Clean-up</UI> ›{" "}
          <UI>Clean up automatically</UI>
          removes them on every environment of the workspace as often as you
          pick (daily, every 3 days, weekly or monthly):
        </P>
        <Table
          head={["Setting", "Does"]}
          rows={[
            [
              "Images",
              "Untagged ones only, or every image no container uses (the next deploy pulls what it needs again)",
            ],
            ["Build cache", "What docker build kept to go faster"],
            ["Stopped containers", "Ones that exited and were never removed"],
            ["Unused networks", "Networks no container is attached to"],
            [
              "Only what's older than",
              "Keeps anything newer, in case it's about to be used",
            ],
          ]}
        />
        <P>
          Volumes are never removed automatically, because they hold data. When
          an environment has its own settings, its row shows the last clean-up:
          when it ran, the space it freed, or why it failed.
        </P>
        <P>
          For more control (some servers only, at a set time, volumes too) use a
          cron job: <UI>Cron jobs</UI> › <UI>New</UI> › <UI>Clean up Docker</UI>{" "}
          (see{" "}
          <See guide="cronjobs" section="docker-prune">
            Clean up Docker
          </See>
          ).
        </P>
        <Recommended
          rows={[
            {
              setting: "Clean up automatically",
              value: "On, weekly",
              why: "Frees the space without anyone remembering to",
            },
            {
              setting: "Images",
              value: "Untagged",
              why: "Safe: only layers a newer pull or build replaced",
            },
            {
              setting: "Only what's older than",
              value: "1 day",
              why: "Never removes something a deploy has just pulled",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "environment-settings",
    title: "Settings for one environment",
    body: (
      <>
        <P>
          <UI>Settings for</UI> at the top of the settings page switches from{" "}
          <UI>Whole workspace</UI> to one environment. The form then shows what
          that server uses. Change a value and it applies to this environment
          only; the row gets a <UI>This environment</UI> tag. Everything else
          keeps following the workspace, including later changes to the
          workspace.
        </P>
        <Steps>
          {[
            <>
              Open <UI>Settings</UI> and pick the environment under{" "}
              <UI>Settings for</UI>.
            </>,
            <>
              Change what should differ, for example a bigger{" "}
              <UI>Versions kept per project</UI> or a different backup storage.
            </>,
            <>
              <UI>Save</UI>. Changes for the workspace and several environments
              are saved together.
            </>,
          ]}
        </Steps>
        <P>
          <UI>Use the workspace&apos;s</UI> under a row takes one value back.{" "}
          <UI>Follow the workspace for everything</UI> takes them all back. Set
          a value back to the workspace&apos;s and it follows the workspace
          again by itself.
        </P>
        <Example title="A build server">
          The workspace cleans up weekly, keeping untagged images only. The
          build server (lots of images, little disk) gets its own: daily, every
          unused image, build cache included.
        </Example>
      </>
    ),
  },
  {
    id: "settings-file",
    title: "Export and import settings",
    body: (
      <>
        <P>
          <UI>Export</UI> saves the workspace&apos;s settings and every
          environment&apos;s own settings to a <C>.json</C> file.{" "}
          <UI>Import</UI> reads such a file (pick it, drop it or paste it),
          shows what it holds and loads the parts you tick into the form.
          Nothing changes until you <UI>Save</UI>.
        </P>
        <Table
          head={["In the file", "On import"]}
          rows={[
            [
              "Workspace settings",
              "Replace what the file sets; what it leaves out stays",
            ],
            [
              "An environment's settings",
              "Matched by server name; replace what that environment has now",
            ],
            [
              "Alert channels and backup storage",
              "Kept only when they exist in this workspace; otherwise left out, to be picked again",
            ],
          ]}
        />
        <Tip>
          Export before a big change: importing the file puts everything back.
          The same file sets up a new workspace the same way.
        </Tip>
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
        <P>Open a container by its name. Its page has these tabs:</P>
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
              <UI key="sh">Shell</UI>,
              "A terminal inside the running container (Engineer). See below.",
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
          The <UI>Shell</UI> tab on a running container's page (Engineer) opens
          a terminal inside the container: Morche runs <C>docker exec -it</C>{" "}
          (or Podman's) on the server over SSH, so nothing is installed in the
          container or on the server. You can also open it from the terminal
          button in the page header or <UI>Open a shell</UI> in a container's
          menu.
        </P>
        <Steps>
          {[
            <>
              Open the container and pick the <UI>Shell</UI> tab.
            </>,
            <>
              Type as in any terminal. Leave the page and come back, or reload
              it: the same shell is still there with what it printed.
            </>,
            <>
              To run as someone else or with another shell, fill <UI>User</UI>{" "}
              (a name, a uid, or <C>user:group</C>) and pick a <UI>Shell</UI>,
              then press <UI>New shell</UI>. The old one ends.
            </>,
            <>
              <UI>End</UI> (the power icon) closes the shell. Typing <C>exit</C>{" "}
              does the same.
            </>,
          ]}
        </Steps>
        <Table
          head={["Shell", "Uses"]}
          rows={[
            ["Auto", "bash when the image has it, else sh."],
            [<C key="b">bash</C>, "Debian/Ubuntu-based images and most apps."],
            [<C key="s">sh</C>, "Every image with a shell, including Alpine."],
            [<C key="a">ash</C>, "Alpine and BusyBox images."],
            [<C key="z">zsh</C>, "Only when the image ships it."],
          ]}
        />
        <Example title="Check the database from inside">
          <P>
            Open the database container, pick <UI>Shell</UI> and type{" "}
            <C>psql -U postgres -c "select now()"</C>.
          </P>
        </Example>
        <Recommended
          rows={[
            {
              setting: "User",
              value: "Empty",
              why: "The image's own user is what the app runs as.",
            },
            {
              setting: "root",
              value: "Only to install a debugging tool",
              why: "What you change is gone when the container is recreated.",
            },
          ]}
        />
        <Tip>
          Shells inside containers also appear as tabs on the server's{" "}
          <See guide="terminal">Terminal</See> page, and count toward its 10
          open shells. When the workspace records terminals, what the shell
          prints is recorded too; the Audit log lists only that a shell was
          opened, not the commands typed inside the container.
        </Tip>
        <Warn>
          A container with no shell at all (distroless or <C>scratch</C> images)
          can't be entered: the shell ends at once with{" "}
          <C>executable file not found</C>. Use its logs, or the server's
          terminal and <C>docker cp</C>, instead.
        </Warn>
      </>
    ),
  },
  {
    id: "images",
    title: "Images",
    body: (
      <>
        <P>
          <UI>Images</UI> lists what the server keeps. Each row shows whether an
          update is available or known vulnerabilities were found (the{" "}
          <UI>Status</UI> column), which containers use it (<UI>Used by</UI>,
          each a link to that container), and how big it is next to the biggest
          image.
        </P>
        <P>
          The strip at the top shows the space all images take, split into what
          containers use and what <UI>could be freed</UI>. Its buttons appear
          only when they have something to do:
        </P>
        <Table
          head={["Button", "What it does"]}
          rows={[
            [
              <UI key="u">N updates available</UI>,
              "Shows only images with a newer version in their registry (as found by the Updates page).",
            ],
            [
              <UI key="r">N with critical or high</UI>,
              "Shows only images whose last scan found critical or high vulnerabilities.",
            ],
            [
              <UI key="s">Scan N not scanned</UI>,
              "Scans every image that hasn't been scanned yet, as one background task.",
            ],
            [
              <UI key="o">Remove N older versions</UI>,
              "Removes unused images that have a newer image of the same name (old tags left after updates).",
            ],
            [
              <UI key="d">Remove N dangling</UI>,
              "Opens the clean-up set to untagged layers left behind by a newer build or pull.",
            ],
            [
              <UI key="c">Clean up…</UI>,
              "Opens the clean-up set to every unused image (tagged ones too); nothing goes until you confirm.",
            ],
          ]}
        />
        <P>
          <UI>Show</UI> narrows the list (<UI>In use</UI>, <UI>Unused</UI>,{" "}
          <UI>Dangling</UI>, <UI>Update available</UI>,{" "}
          <UI>Critical or high</UI>; only the ones with images are offered).{" "}
          <UI>Sort</UI> orders by size, age, name or how many containers use it.{" "}
          <UI>Group</UI> puts every version of a repository together, with its
          total size and a <UI>Remove N older</UI> button. Search matches tags,
          the short ID and the names of the containers using an image. All of
          these stay in the address, so a link opens the same view.
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
              folder (<C>docker compose up -d</C> in the server's terminal), or
              use the Updates page, which pulls and recreates in one step.
            </>,
          ]}
        </Steps>
        <P>
          Tick rows to <UI>Scan</UI>, <UI>Pull again</UI> or <UI>Remove…</UI>{" "}
          several at once. An image's ⋯ menu has <UI>Its containers</UI>,{" "}
          <UI>Copy name</UI>, <UI>Copy ID</UI>, <UI>Pull again</UI>,{" "}
          <UI>Scan for vulnerabilities</UI>, <UI>Add tag…</UI> and{" "}
          <UI>Remove…</UI>. Removing an image a container uses needs{" "}
          <UI>Force</UI>.
        </P>
        <P>
          Click an image's name to open its details: the same buttons, a{" "}
          <UI>Status</UI> card that links to its update and its scan report, a{" "}
          <C>docker pull</C> command to copy to another machine, how it runs by
          default, and its layers with a bar per layer, so the big ones stand
          out.
        </P>
        <Recommended
          rows={[
            {
              setting: <UI>Scan N not scanned</UI>,
              value: "After each pull",
              why: "New images often bring new vulnerabilities; a scan takes a minute.",
            },
            {
              setting: <UI>Remove N older versions</UI>,
              value: "Every few weeks",
              why: "Each update leaves the previous version on disk.",
            },
          ]}
        />
        <Tip>
          <UI>Pull again</UI> fetches the same tag fresh from the registry. It
          only changes running containers once they are recreated.
        </Tip>
      </>
    ),
  },
  {
    id: "image-run",
    title: "Running a container from an image",
    body: (
      <>
        <P>
          <UI>Run…</UI> starts a new container from an image already on the
          server, like <C>docker run -d</C>, without writing a compose file.
          Open it from an image's ⋯ menu or its details, or from the Images
          page's ⋯ › <UI>Run a container…</UI> (then pick the image first).
        </P>
        <Steps>
          {[
            <>
              Check the <UI>Name</UI> (suggested from the image; empty = Docker
              makes one up).
            </>,
            <>
              <UI>Ports</UI> and <UI>Volumes</UI> the image declares are already
              filled in. Change the host port, or leave it empty to let Docker
              pick a free one. A volume's source is a volume name (made when
              missing) or a folder on the server starting with <C>/</C>.
            </>,
            <>
              Add <UI>Environment</UI> variables. Paste a whole <C>.env</C> file
              into a name field and it becomes one row per line.
            </>,
            <>
              Pick <UI>Restart</UI> and <UI>Network</UI>, and limits if you want
              them. <UI>More options</UI> has the command, entrypoint, user,
              working folder, <UI>Create only</UI> and <UI>Privileged</UI>.
            </>,
            <>
              The <UI>Same as</UI> box shows the matching <C>docker run</C> line
              (values of variables hidden). Press <UI>Run</UI>; the toast has{" "}
              <UI>Open</UI> for the new container.
            </>,
          ]}
        </Steps>
        <Recommended
          rows={[
            {
              setting: <UI>Restart</UI>,
              value: "Unless stopped",
              why: "Comes back after a crash or a reboot, but stays down when you stop it.",
            },
            {
              setting: <UI>Memory limit</UI>,
              value: "Set one on shared servers",
              why: "One runaway container can't then starve the others.",
            },
          ]}
        />
        <Warn>
          <UI>Privileged</UI> gives the container full access to the server. Use
          it only for tools that really need it.
        </Warn>
        <Tip>
          A container that was created but couldn't start (a port already in
          use, say) is kept: the warning says why, and you can fix it and start
          it from the Containers page. For something you'll keep running, a
          compose project is easier to change later (see{" "}
          <See guide="containers" section="projects" />
          ).
        </Tip>
      </>
    ),
  },
  {
    id: "image-layers",
    title: "Exploring an image's layers",
    body: (
      <>
        <P>
          <UI>Explore layers</UI> (an image's ⋯ menu, or <UI>Layers</UI> in its
          details) shows what each build step put in the image, and how much
          space is wasted by files a later step replaced or deleted: they are
          still stored in the lower layer, so the image stays as big.
        </P>
        <P>
          The first time, Morche reads the image from the server (like{" "}
          <C>docker save</C>, streamed, nothing written to the server's disk). A
          bar shows how far it got; big images take a minute. The result is kept
          for 15 minutes; <UI>Read again</UI> reads it fresh.
        </P>
        <Table
          head={["Number", "What it means"]}
          rows={[
            [
              "Efficiency",
              "What a container sees ÷ what all layers hold. 100% = no wasted space.",
            ],
            [
              "Wasted",
              "Bytes of files that later layers replace or delete, but that are still shipped.",
            ],
            ["A container sees", "The size of the final file system."],
            ["All layers", "The size of every layer added up."],
          ]}
        />
        <Steps>
          {[
            <>
              Pick a layer on the left: its build step, its size, and how many
              files it added (+), changed (~) and removed (−).
            </>,
            <>
              The right side shows the image's files as they look after that
              layer. With <UI>Only this layer's changes</UI> on, only what it
              touched is listed, marked <UI>Added</UI>, <UI>Replaced</UI> or{" "}
              <UI>Deleted</UI>. Open folders to go down; the crumbs go back up.
            </>,
            <>
              <UI>Wasted space</UI> lists the paths that waste the most. Click
              one to jump to the first layer that holds a copy.
            </>,
          ]}
        </Steps>
        <Example title="A cache left in a layer">
          <P>
            A step runs <C>apt-get update && apt-get install …</C> and the next
            one runs <C>rm -rf /var/lib/apt/lists</C>. The lists are deleted,
            but they still sit in the first layer: <C>/var/lib/apt/lists</C>{" "}
            shows up under Wasted space. Clean up in the same <C>RUN</C> step
            and the space is gone.
          </P>
        </Example>
        <Tip>
          On a phone, tap a layer to see its files; <UI>Layers</UI> goes back to
          the list.
        </Tip>
      </>
    ),
  },
  {
    id: "image-transfer",
    title: "Saving, loading and copying images",
    body: (
      <>
        <P>
          Move an image without a registry: keep a copy on a storage, load it on
          any server later, or send it straight to other servers. Each runs as a
          background task (see the Tasks button).
        </P>
        <Table
          head={["Action", "What it does"]}
          rows={[
            [
              <UI key="s">Save to a storage…</UI>,
              "Image ⋯ menu. Writes every tag of the image into one compressed file on a storage, in <folder>/<server>/<name>-<date>-<time>.tar.gz (folder /backups/docker-images unless you pick another).",
            ],
            [
              <UI key="l">Load from a storage…</UI>,
              "Images page ⋯. Pick the storage and a folder, then a .tar or .tar.gz in it (or type the whole path). The image comes back with the tags it was saved with. Files made by docker save work too.",
            ],
            [
              <UI key="c">Copy to another server…</UI>,
              "Image ⋯ menu. Tick up to 20 servers with an engine; the image is streamed from this server into each one in turn, nothing written to disk on the way. A server that fails doesn't stop the others; the task lists each one.",
            ],
          ]}
        />
        <Recommended
          rows={[
            {
              setting: "Before removing an image you built by hand",
              value: "Save to a storage",
              why: "There is no registry to pull it back from.",
            },
            {
              setting: "Many servers, same private image",
              value: "Copy, or a registry",
              why: "Copy is fine now and then; a registry is better for regular deploys.",
            },
          ]}
        />
        <Tip>
          To see a saved file, open the storage on the Storage page. A load
          replaces a tag that already points to another image on that server.
        </Tip>
      </>
    ),
  },
  {
    id: "volumes",
    title: "Volumes and networks",
    body: (
      <>
        <P>
          <UI>Volumes</UI> lists the server's volumes with the containers using
          them (each a link, with its state), their size, when each was last
          copied to a storage, and when it was made. A click on a row opens the
          volume's own page (see{" "}
          <See guide="containers" section="volume-page">
            A volume's page
          </See>
          ).
          <UI>New volume</UI> takes a name, a driver and optional labels.
        </P>
        <P>
          The strip above the list shows how much space the volumes take and how
          much sits in volumes nothing uses. Its buttons show only when they
          have something to do: <UI>N unused</UI> and <UI>N never backed up</UI>{" "}
          filter the list, and <UI>Remove N unused anonymous</UI> clears the
          leftovers containers made for themselves (named volumes are never
          touched by it).
        </P>
        <Table
          head={["Control", "What it does"]}
          rows={[
            [
              "Show",
              "All, In use, Unused, Anonymous or Never backed up (with counts)",
            ],
            ["Sort", "Name, Largest first, Newest/Oldest first, Most used"],
            ["Group", "One block per compose project, with its total size"],
            [
              "Measure sizes",
              "Runs du over every volume (can take a while on a big server); Largest first measures by itself",
            ],
          ]}
        />
        <P>
          Tick rows to remove several volumes at once. Volumes still in use are
          left out and named, and removing named volumes asks you to type{" "}
          <C>remove N</C> first.
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
    id: "volume-page",
    title: "A volume's page",
    body: (
      <>
        <P>
          Every volume has its own page (a row's click, or <UI>Open</UI> in its
          menu) with three tabs:
        </P>
        <Table
          head={["Tab", "What's there"]}
          rows={[
            [
              "Overview",
              "What takes the space (the biggest folders, its share of the server's disk), who uses it, its project, driver, folder on the server, last copy, labels and options",
            ],
            ["Files", "A file manager inside the volume (Engineer)"],
            ["Backups", "Its copies on storages: restore, open or delete"],
          ]}
        />
        <P>
          The header has <UI>Back up</UI> and the menu (copy the path, remove).
          A folder in <UI>What takes the space</UI> opens it in the Files tab;{" "}
          <UI>Explore</UI> opens the full disk usage view, where you can drill
          down and delete what you don't need.
        </P>
        <Example title="Find what filled a database volume">
          Open the volume, look at <UI>What takes the space</UI>: a{" "}
          <C>pg_wal</C> or <C>binlog</C> folder taking most of it points to
          replication or archiving that stopped, not to real data.
        </Example>
      </>
    ),
  },
  {
    id: "volume-files",
    title: "Browsing a volume's files",
    body: (
      <>
        <P>
          The <UI>Files</UI> tab is the same file manager as a server's, opened
          at the volume's top folder: upload (drag files in), download, edit
          text files, rename, copy and move, permissions and owner, search,
          folder sizes and disk usage. It can't leave the volume: paths and
          links that lead outside it are refused.
        </P>
        <P>
          Files are read and written as root (volume folders belong to root), so
          the server's login needs root or <C>sudo</C>, and the server needs its
          SFTP server (<C>openssh-sftp-server</C>, installed with OpenSSH on
          most systems). Copying or moving many files runs as a background task.
        </P>
        <Warn>
          A running container sees your changes at once. Stop it first before
          changing a database's files, and back the volume up before big edits.
        </Warn>
        <Table
          head={["Who", "Can"]}
          rows={[
            ["Viewer / Operator", "See the volume's page, not its files"],
            ["Engineer", "Browse, download and change its files"],
          ]}
        />
      </>
    ),
  },
  {
    id: "volume-backups",
    title: "Volume copies (backups)",
    body: (
      <>
        <P>
          A volume's data can be copied to a Storage as a <C>.tar.gz</C>: from
          its menu (<UI>Back up…</UI>) or its page. The copy runs as a
          background task; the server packs the volume and sends it straight to
          the storage.
        </P>
        <Steps>
          {[
            <>Pick a storage of the server's workspace you can write to.</>,
            <>
              Keep or change the folder (<C>/backups/docker-volumes</C> by
              default).
            </>,
            <>
              Tick <UI>Stop the containers using it while it's copied</UI> for
              databases: their files are only safe to copy while stopped. They
              start again right after.
            </>,
          ]}
        </Steps>
        <P>
          <UI>Copies</UI> on the Volumes page (and the <UI>Backups</UI> tab of a
          volume's page) lists every copy with its size, storage and who made
          it. From there you open it on the storage, <UI>Restore</UI> it into
          the same volume (type its name; its containers are stopped meanwhile)
          or into a new one, or delete it.
        </P>
        <P>
          <UI>Settings</UI> › <UI>Volume backups</UI> sets what{" "}
          <UI>Back up…</UI> starts with: the storage, the folder and whether to
          stop the containers. <UI>Copies kept per volume</UI> removes the
          oldest copies of a volume made by hand once there are more than that.
          Copies made by cron jobs follow the job&apos;s own <UI>Keep</UI>.
        </P>
        <Recommended
          rows={[
            {
              setting: "Regular copies",
              value: "A cron job › Back up volumes, nightly, keep 7",
              why: "Old copies are removed by themselves",
            },
          ]}
        />
        <Table
          head={["Who", "Can"]}
          rows={[
            ["Viewer", "See the copies"],
            [
              "Engineer",
              "Make and delete copies (Engineer on the storage too)",
            ],
            ["Owner", "Restore (Operator on the storage)"],
          ]}
        />
        <Warn>
          Restoring into the same volume replaces everything in it. Restore into
          a new volume first when you're unsure which copy you need.
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
        <P>
          The clean up runs as a background task and says what it freed. To
          clean on a schedule, use <UI>Schedule a cleanup…</UI> in the Images
          page's ⋯ menu (a cron job, see{" "}
          <See guide="cronjobs" section="docker-prune" />
          ), or let the workspace clean up by itself (see{" "}
          <See guide="containers" section="auto-cleanup">
            Automatic clean-up
          </See>
          ).
        </P>
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
              "The network map has no lines between containers",
              "Nothing was connected at that moment, or the server couldn't be read (the note under the map says which). Lines only show open connections, not every possible route.",
            ],
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
