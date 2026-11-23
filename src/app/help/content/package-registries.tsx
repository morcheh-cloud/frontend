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

export const packageRegistries: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <UI>Package registries</UI> deploys your own registry on one of your
          servers and sets it up for you, then lets you see and clean up what it
          holds. Two kinds, both free with no usage limits:
        </P>
        <Table
          head={["Registry", "What it holds"]}
          rows={[
            [
              <UI key="h">Harbor</UI>,
              "Container images and Helm charts (any OCI artifact). Docker Hub cache, robot accounts, cleanup, optional Trivy scanner. Apache 2.0, a CNCF project.",
            ],
            [
              <UI key="v">Verdaccio</UI>,
              "npm packages, for npm, pnpm, yarn and bun. An npmjs mirror and private scopes. MIT.",
            ],
          ]}
        />
        <P>
          Each one runs as a compose project on the server (you'll see it in{" "}
          <See guide="containers">Containers</See>), listens only on the
          server's loopback, and is published through the server's{" "}
          <See guide="reverse-proxy">reverse proxy</See> with a Let's Encrypt
          certificate. Morche talks to it over the server's SSH connection, so
          its admin page never has to be open to the internet for Morche.
        </P>
        <Tip>
          The biggest win is the mirror: Docker Hub's pull limits and npmjs
          outages stop mattering, because whatever was pulled once is served
          from your own network.
        </Tip>
      </>
    ),
  },
  {
    id: "deploy",
    title: "Deploy a registry",
    body: (
      <>
        <Steps>
          {[
            <P key="1">
              Open <UI>Package registries</UI> and click <UI>New registry</UI>,
              or <UI>Deploy Harbor</UI> / <UI>Deploy Verdaccio</UI> on the empty
              page.
            </P>,
            <P key="2">
              Pick the kind and a server with Docker. Morche checks the server
              at once: Docker and Compose, memory, free disk, a free port, and
              (for Harbor) that no container already uses one of its fixed names
              (<C>nginx</C>, <C>redis</C>, <C>registry</C>…).
            </P>,
            <P key="3">
              Under <UI>Address</UI>, give the domain clients will use (
              <C>registry.example.com</C>) and point it at the server in your
              DNS. Leave <UI>HTTPS with Let's Encrypt</UI> on.
            </P>,
            <P key="4">
              Choose the settings (mirror, who can pull, cleanup), give it a
              name and click <UI>Deploy</UI>.
            </P>,
          ]}
        </Steps>
        <P>
          The deploy runs as a background task: you can leave the page. Its page
          shows each step as it happens. Morche:
        </P>
        <List>
          <li>
            writes the files (Harbor: downloads its installer and writes{" "}
            <C>harbor.yml</C>; Verdaccio: <C>compose.yaml</C> and its config)
            into the workspace's projects folder;
          </li>
          <li>
            makes an admin with a long random password, kept sealed (Owners see
            it under <UI>Admin login</UI>);
          </li>
          <li>pulls the images, starts it and waits until it's healthy;</li>
          <li>turns on the mirror and the other settings through its API;</li>
          <li>
            adds the domain as a site on the reverse proxy, gets the certificate
            and forces https;
          </li>
          <li>
            for Harbor, makes a robot account and adds it to{" "}
            <See guide="containers" section="registries">
              Containers › Registries
            </See>
            , so pulls and update checks from it just work.
          </li>
        </List>
        <P>
          Harbor's first deploy takes a few minutes (it pulls about ten images);
          Verdaccio takes about a minute.
        </P>
        <Recommended
          rows={[
            {
              setting: "Server memory",
              value: "Harbor 4 GB, Verdaccio 512 MB",
              why: "Harbor runs a database, Redis and several services; below 2 GB Morche refuses.",
            },
            {
              setting: "Address",
              value: "A domain with HTTPS",
              why: "Docker refuses plain http registries unless every client lists them as insecure.",
            },
            {
              setting: "Mirror",
              value: "On",
              why: "Pulls and installs keep working when the public registry is slow, limited or out of reach.",
            },
            {
              setting: "Who can pull",
              value: "Signed-in only",
              why: "Give servers and CI their own robot account or user.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "no-domain",
    title: "Without a domain",
    body: (
      <>
        <P>
          Choose <UI>The server's port</UI> under <UI>Address</UI> to skip the
          proxy: the registry then answers plain http on that port, on every
          address of the server. Use it only on a private network. Docker
          clients need it listed as insecure:
        </P>
        <Code>{`# /etc/docker/daemon.json on each client
{
  "insecure-registries": ["10.0.0.5:8480"]
}`}</Code>
        <Warn>
          Logins travel unencrypted on plain http. Add a domain and HTTPS before
          using it across the internet.
        </Warn>
      </>
    ),
  },
  {
    id: "harbor",
    title: "Use Harbor",
    body: (
      <>
        <P>
          Make a robot account first (<UI>Robot accounts</UI> tab), one per
          server or pipeline. Then:
        </P>
        <Example title="Push your own image">
          <Code>{`docker login registry.example.com -u 'robot$ci-builds'
docker tag myapp:1.0 registry.example.com/library/myapp:1.0
docker push registry.example.com/library/myapp:1.0`}</Code>
        </Example>
        <Example title="Pull Docker Hub through the cache">
          <Code>{`docker pull registry.example.com/dockerhub/library/nginx:latest
docker pull registry.example.com/dockerhub/grafana/grafana:11.2.0`}</Code>
        </Example>
        <Example title="Helm charts (OCI)">
          <Code>{`helm registry login registry.example.com -u 'robot$ci-builds'
helm push mychart-0.1.0.tgz oci://registry.example.com/library`}</Code>
        </Example>
        <Tip>
          The cache keeps Docker Hub's names under the cache project:{" "}
          <C>nginx</C> is <C>library/nginx</C>, so it becomes{" "}
          <C>dockerhub/library/nginx</C>. Docker's own <C>registry-mirrors</C>{" "}
          setting can't point at a Harbor cache, so change the image names in
          your compose files instead.
        </Tip>
      </>
    ),
  },
  {
    id: "verdaccio",
    title: "Use Verdaccio",
    body: (
      <>
        <P>
          Add a user (<UI>Users</UI> tab) and copy the <C>.npmrc</C> lines it
          shows. Everything installs through Verdaccio: your own packages from
          it, the rest from npmjs through the mirror.
        </P>
        <Example title=".npmrc in a project or ~/.npmrc">
          <Code>{`registry=https://npm.example.com/
//npm.example.com/:_auth=BASE64_OF_USER_COLON_PASSWORD`}</Code>
        </Example>
        <Example title="Publish">
          <Code>{"npm publish --registry https://npm.example.com/"}</Code>
        </Example>
        <Example title="Only your scope from Verdaccio">
          <Code>{`@company:registry=https://npm.example.com/
//npm.example.com/:_auth=BASE64_OF_USER_COLON_PASSWORD`}</Code>
        </Example>
        <P>
          <UI>Private scopes</UI> (in Settings) are never fetched from the
          mirror. List your scope there, so nobody can slip in a public package
          that has your scope's name.
        </P>
      </>
    ),
  },
  {
    id: "contents",
    title: "Browse and clean up",
    body: (
      <>
        <P>
          The <UI>Repositories</UI> (Harbor) or <UI>Packages</UI> (Verdaccio)
          tab lists what it holds, newest first. Filter by what was pushed or
          published here and what came from the mirror; Harbor also filters by
          project. Click one for its artifacts or versions, with a copy button
          for the pull or install command.
        </P>
        <List>
          <li>
            Harbor: delete a whole repository or one artifact (with its tags).
            The space comes back at the next cleanup, every Sunday at 03:00 when{" "}
            <UI>Weekly cleanup</UI> is on, or now with <UI>Free space now</UI>.
          </li>
          <li>Verdaccio: delete a whole package with every version.</li>
        </List>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Robot accounts and users",
    body: (
      <>
        <P>
          Harbor's robot accounts can pull, or pull and push (and delete), for
          30 days, 90 days, a year or forever. Verdaccio's users can install and
          publish. Either way the secret is shown once: Morche doesn't keep it.
          Give a Verdaccio user a new password any time; for Harbor, make a new
          robot account and remove the old one.
        </P>
        <P>
          The account tagged <UI>Morche</UI> is Morche's own: Harbor's is the
          login in Containers › Registries; Verdaccio's admin is how Morche
          signs in. Removing Harbor's breaks Containers' pulls from it until you
          give it another login.
        </P>
      </>
    ),
  },
  {
    id: "settings",
    title: "Settings",
    body: (
      <>
        <P>
          Change the mirror, who can pull, private scopes and cleanup under{" "}
          <UI>Settings</UI>. Harbor applies them through its API at once;
          Verdaccio rewrites its config and restarts (a few seconds). Harbor's
          scanner only changes on a new deploy: <UI>Deploy again with it</UI>{" "}
          writes Harbor's files again and keeps every image.
        </P>
        <P>
          The <UI>Setup</UI> card on the Overview shows what's done around it
          (site, HTTPS, Containers login) and offers <UI>Add a monitor</UI> to
          get alerted when it stops answering.
        </P>
      </>
    ),
  },
  {
    id: "remove",
    title: "Remove a registry",
    body: (
      <P>
        <UI>Remove…</UI> (Owner) stops its containers and removes its site on
        the reverse proxy and its Containers login. Turn on{" "}
        <UI>Keep its data on the server</UI> to leave its folder (images,
        packages, database) where it is; deploying again in the same place picks
        it up.
      </P>
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
            "HTTPS isn't on yet",
            "Let's Encrypt couldn't reach the domain: check its DNS points at the server and port 80 is open, then Get HTTPS on the Overview.",
          ],
          [
            "Couldn't download Harbor's installer",
            "The server can't reach GitHub. Give it access (or a proxy) and click Deploy again.",
          ],
          [
            "Docker login says unauthorized",
            "Sign in with a robot account (robot$name, quotes in the shell) and its secret, not the admin.",
          ],
          [
            "Docker says http: server gave HTTP response to HTTPS client",
            "It has no HTTPS: add a domain and HTTPS, or list it under insecure-registries.",
          ],
          [
            "npm install returns 401",
            "Its Who can install setting needs a login: add the _auth line from the Users tab to .npmrc.",
          ],
          [
            "Not answering",
            "Open Its containers from the ⋯ menu to see which one stopped and read its logs, or Restart.",
          ],
        ]}
      />
    ),
  },
]
