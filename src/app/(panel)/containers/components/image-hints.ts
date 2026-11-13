// What a compose service should probably have, from its image: ports to
// publish, folders to keep on a volume, variables it needs, a healthcheck,
// a database it talks to… A catalog of well-known images, merged with what
// the image itself declares (EXPOSE / VOLUME) when it's on the server. Each
// suggestion carries the edit that applies it.

import type { DockerImageDetails } from "@/lib/services"
import {
  addDependsOn,
  addMount,
  addPort,
  addService,
  type ComposeModel,
  edit,
  type Healthcheck,
  hostPorts,
  readCompose,
  type ServiceInfo,
  setEnvVar,
  setHealthcheck,
  setImage,
  setKey,
  uniqueName,
} from "./compose-edit"
import { serviceFromImage } from "./docker-run"
import { parseEnv, setEnv } from "./env-vars"
import { splitRef } from "./image-meta"

// ---- Catalog --------------------------------------------------------------

type Family = "mysql" | "postgres" | "redis" | "mongo"

type PortHint = {
  port: string
  protocol?: "tcp" | "udp"
  label: string
  // yes = publish it; internal = only the other services need it;
  // optional = an extra (admin page, second protocol).
  publish: "yes" | "internal" | "optional"
  // Preferred host port.
  host?: string
}

type VolumeHint = {
  path: string
  label: string
  // Named volume `<service>-<suffix>` (default "data"), or a server path.
  suffix?: string
  bind?: string
  readOnly?: boolean
  optional?: boolean
  // Older major versions kept it elsewhere.
  legacy?: { below: number; path: string }
}

type EnvHint = {
  name: string
  // Template: {secret:X} = ${<PREFIX>_X} with a fresh secret in .env;
  // {host} / {port} / {link:user|db|password} = the linked database.
  value: string
  label: string
  optional?: boolean
}

export type ImageHint = {
  // Repository names it matches (last path part, or the whole name).
  match: string[]
  // Image to use when adding it.
  image: string
  title: string
  about: string
  role: "web" | "app" | "database" | "cache" | "queue" | "tool" | "monitoring"
  family?: Family
  // Suggested tag to pin.
  tag?: string
  ports?: PortHint[]
  volumes?: VolumeHint[]
  env?: EnvHint[]
  health?: Healthcheck
  hostname?: boolean
  command?: { value: string; label: string; optional?: boolean }
  socket?: { readOnly: boolean; why: string }
  needs?: { family: Family; optional?: boolean }
  featured?: boolean
}

const hc = (test: string[], start = "20s"): Healthcheck => ({
  test,
  interval: "10s",
  timeout: "5s",
  retries: 5,
  start_period: start,
})

const mysqlEnv = (p: "MYSQL" | "MARIADB"): EnvHint[] => [
  {
    name: `${p}_ROOT_PASSWORD`,
    value: "{secret:ROOT_PASSWORD}",
    label: "Root password",
  },
  { name: `${p}_DATABASE`, value: "app", label: "Database to create" },
  { name: `${p}_USER`, value: "app", label: "User for the apps" },
  { name: `${p}_PASSWORD`, value: "{secret:PASSWORD}", label: "Its password" },
]

export const catalog: ImageHint[] = [
  {
    match: ["nginx", "nginx-unprivileged"],
    image: "nginx",
    title: "Nginx",
    about: "Web server and reverse proxy",
    role: "web",
    tag: "stable-alpine",
    featured: true,
    ports: [
      { port: "80", label: "Web", publish: "yes" },
      { port: "443", label: "HTTPS", publish: "optional" },
    ],
    volumes: [
      {
        path: "/usr/share/nginx/html",
        label: "Site files",
        bind: "./html",
        readOnly: true,
      },
      {
        path: "/etc/nginx/conf.d",
        label: "Site configs",
        bind: "./nginx",
        readOnly: true,
        optional: true,
      },
    ],
  },
  {
    match: ["httpd"],
    image: "httpd",
    title: "Apache httpd",
    about: "Web server",
    role: "web",
    tag: "2.4-alpine",
    ports: [{ port: "80", label: "Web", publish: "yes" }],
    volumes: [
      {
        path: "/usr/local/apache2/htdocs",
        label: "Site files",
        bind: "./html",
        readOnly: true,
      },
    ],
  },
  {
    match: ["caddy"],
    image: "caddy",
    title: "Caddy",
    about: "Web server with automatic HTTPS",
    role: "web",
    tag: "2",
    ports: [
      { port: "80", label: "Web", publish: "yes" },
      { port: "443", label: "HTTPS", publish: "yes" },
      { port: "443", protocol: "udp", label: "HTTP/3", publish: "optional" },
    ],
    volumes: [
      { path: "/data", label: "Certificates", suffix: "data" },
      { path: "/config", label: "Saved config", suffix: "config" },
      {
        path: "/etc/caddy/Caddyfile",
        label: "Caddyfile",
        bind: "./Caddyfile",
        readOnly: true,
      },
    ],
  },
  {
    match: ["traefik"],
    image: "traefik",
    title: "Traefik",
    about: "Reverse proxy that reads container labels",
    role: "web",
    tag: "v3",
    ports: [
      { port: "80", label: "Web", publish: "yes" },
      { port: "443", label: "HTTPS", publish: "yes" },
      { port: "8080", label: "Dashboard", publish: "optional", host: "8081" },
    ],
    volumes: [{ path: "/letsencrypt", label: "Certificates", suffix: "certs" }],
    socket: { readOnly: true, why: "to see the other containers" },
  },
  {
    match: ["postgres", "postgresql"],
    image: "postgres",
    title: "PostgreSQL",
    about: "Relational database",
    role: "database",
    family: "postgres",
    tag: "18",
    featured: true,
    ports: [{ port: "5432", label: "PostgreSQL", publish: "internal" }],
    // 18 moved the data under a versioned folder of /var/lib/postgresql and
    // refuses to start with a volume on the old /data path.
    volumes: [
      {
        path: "/var/lib/postgresql",
        label: "Database files",
        legacy: { below: 18, path: "/var/lib/postgresql/data" },
      },
    ],
    env: [
      {
        name: "POSTGRES_PASSWORD",
        value: "{secret:PASSWORD}",
        label: "Password",
      },
      { name: "POSTGRES_USER", value: "app", label: "User" },
      { name: "POSTGRES_DB", value: "app", label: "Database to create" },
    ],
    health: hc([
      "CMD-SHELL",
      'pg_isready -U "$${POSTGRES_USER:-postgres}" -d "$${POSTGRES_DB:-postgres}"',
    ]),
  },
  {
    match: ["mysql", "mysql-server"],
    image: "mysql",
    title: "MySQL",
    about: "Relational database",
    role: "database",
    family: "mysql",
    tag: "8.4",
    ports: [{ port: "3306", label: "MySQL", publish: "internal" }],
    volumes: [{ path: "/var/lib/mysql", label: "Database files" }],
    env: mysqlEnv("MYSQL"),
    health: hc(["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "--silent"]),
  },
  {
    match: ["mariadb"],
    image: "mariadb",
    title: "MariaDB",
    about: "MySQL-compatible database",
    role: "database",
    family: "mysql",
    tag: "lts",
    featured: true,
    ports: [{ port: "3306", label: "MariaDB", publish: "internal" }],
    volumes: [{ path: "/var/lib/mysql", label: "Database files" }],
    env: mysqlEnv("MARIADB"),
    health: hc(["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]),
  },
  {
    match: ["mongo", "mongodb"],
    image: "mongo",
    title: "MongoDB",
    about: "Document database",
    role: "database",
    family: "mongo",
    tag: "8",
    ports: [{ port: "27017", label: "MongoDB", publish: "internal" }],
    volumes: [{ path: "/data/db", label: "Database files" }],
    env: [
      { name: "MONGO_INITDB_ROOT_USERNAME", value: "admin", label: "Admin" },
      {
        name: "MONGO_INITDB_ROOT_PASSWORD",
        value: "{secret:PASSWORD}",
        label: "Admin password",
      },
    ],
    health: hc([
      "CMD",
      "mongosh",
      "--quiet",
      "--eval",
      "db.adminCommand('ping')",
    ]),
  },
  {
    match: ["redis", "redis-stack"],
    image: "redis",
    title: "Redis",
    about: "In-memory cache and queue",
    role: "cache",
    family: "redis",
    tag: "8-alpine",
    featured: true,
    ports: [{ port: "6379", label: "Redis", publish: "internal" }],
    volumes: [{ path: "/data", label: "Saved data" }],
    command: {
      value: "redis-server --appendonly yes",
      label: "Write every change to disk (AOF), so a restart loses nothing",
      optional: true,
    },
    health: hc(["CMD", "redis-cli", "ping"], "5s"),
  },
  {
    match: ["valkey"],
    image: "valkey/valkey",
    title: "Valkey",
    about: "Open-source Redis fork",
    role: "cache",
    family: "redis",
    tag: "8-alpine",
    ports: [{ port: "6379", label: "Valkey", publish: "internal" }],
    volumes: [{ path: "/data", label: "Saved data" }],
    health: hc(["CMD", "valkey-cli", "ping"], "5s"),
  },
  {
    match: ["memcached"],
    image: "memcached",
    title: "Memcached",
    about: "In-memory cache",
    role: "cache",
    tag: "1-alpine",
    ports: [{ port: "11211", label: "Memcached", publish: "internal" }],
  },
  {
    match: ["rabbitmq"],
    image: "rabbitmq",
    title: "RabbitMQ",
    about: "Message broker",
    role: "queue",
    tag: "4-management-alpine",
    ports: [
      { port: "5672", label: "AMQP", publish: "internal" },
      { port: "15672", label: "Management page", publish: "optional" },
    ],
    volumes: [{ path: "/var/lib/rabbitmq", label: "Queues and settings" }],
    env: [
      { name: "RABBITMQ_DEFAULT_USER", value: "app", label: "User" },
      {
        name: "RABBITMQ_DEFAULT_PASS",
        value: "{secret:PASSWORD}",
        label: "Password",
      },
    ],
    hostname: true,
    health: hc(["CMD", "rabbitmq-diagnostics", "-q", "ping"], "30s"),
  },
  {
    match: ["elasticsearch"],
    image: "docker.elastic.co/elasticsearch/elasticsearch",
    title: "Elasticsearch",
    about: "Search engine",
    role: "database",
    tag: "9.2.0",
    ports: [{ port: "9200", label: "HTTP API", publish: "internal" }],
    volumes: [{ path: "/usr/share/elasticsearch/data", label: "Indexes" }],
    env: [
      { name: "discovery.type", value: "single-node", label: "One node" },
      {
        name: "ES_JAVA_OPTS",
        value: "-Xms512m -Xmx512m",
        label: "Memory it takes",
      },
      {
        name: "ELASTIC_PASSWORD",
        value: "{secret:PASSWORD}",
        label: "Password of the elastic user",
      },
    ],
  },
  {
    match: ["minio"],
    image: "minio/minio",
    title: "MinIO",
    about: "S3-compatible object storage",
    role: "database",
    ports: [
      { port: "9000", label: "S3 API", publish: "yes" },
      { port: "9001", label: "Console", publish: "yes" },
    ],
    volumes: [{ path: "/data", label: "Buckets" }],
    env: [
      { name: "MINIO_ROOT_USER", value: "admin", label: "Admin" },
      {
        name: "MINIO_ROOT_PASSWORD",
        value: "{secret:PASSWORD}",
        label: "Admin password",
      },
    ],
    command: {
      value: 'server /data --console-address ":9001"',
      label: "Start the server and its console (the image has no default)",
    },
  },
  {
    match: ["wordpress"],
    image: "wordpress",
    title: "WordPress",
    about: "Blog and website builder",
    role: "app",
    tag: "6-apache",
    featured: true,
    ports: [{ port: "80", label: "Website", publish: "yes" }],
    volumes: [{ path: "/var/www/html", label: "Site, plugins and uploads" }],
    needs: { family: "mysql" },
    env: [
      { name: "WORDPRESS_DB_HOST", value: "{host}", label: "Database" },
      { name: "WORDPRESS_DB_USER", value: "{link:user}", label: "User" },
      {
        name: "WORDPRESS_DB_PASSWORD",
        value: "{link:password}",
        label: "Password",
      },
      { name: "WORDPRESS_DB_NAME", value: "{link:db}", label: "Database name" },
    ],
  },
  {
    match: ["ghost"],
    image: "ghost",
    title: "Ghost",
    about: "Publishing platform",
    role: "app",
    tag: "6-alpine",
    ports: [{ port: "2368", label: "Website", publish: "yes" }],
    volumes: [{ path: "/var/lib/ghost/content", label: "Content and images" }],
    needs: { family: "mysql" },
    env: [
      { name: "url", value: "http://localhost:2368", label: "Public address" },
      { name: "database__client", value: "mysql", label: "Database kind" },
      {
        name: "database__connection__host",
        value: "{host}",
        label: "Database",
      },
      {
        name: "database__connection__user",
        value: "{link:user}",
        label: "User",
      },
      {
        name: "database__connection__password",
        value: "{link:password}",
        label: "Password",
      },
      {
        name: "database__connection__database",
        value: "{link:db}",
        label: "Database name",
      },
    ],
  },
  {
    match: ["nextcloud"],
    image: "nextcloud",
    title: "Nextcloud",
    about: "Files, calendar and contacts",
    role: "app",
    tag: "stable-apache",
    ports: [{ port: "80", label: "Website", publish: "yes" }],
    volumes: [{ path: "/var/www/html", label: "Files and apps" }],
    needs: { family: "postgres" },
    env: [
      { name: "POSTGRES_HOST", value: "{host}", label: "Database" },
      { name: "POSTGRES_USER", value: "{link:user}", label: "User" },
      {
        name: "POSTGRES_PASSWORD",
        value: "{link:password}",
        label: "Password",
      },
      { name: "POSTGRES_DB", value: "{link:db}", label: "Database name" },
    ],
  },
  {
    match: ["grafana", "grafana-oss", "grafana-enterprise"],
    image: "grafana/grafana",
    title: "Grafana",
    about: "Dashboards",
    role: "monitoring",
    featured: true,
    ports: [{ port: "3000", label: "Website", publish: "yes" }],
    volumes: [{ path: "/var/lib/grafana", label: "Dashboards and users" }],
    env: [
      {
        name: "GF_SECURITY_ADMIN_PASSWORD",
        value: "{secret:ADMIN_PASSWORD}",
        label: "Admin password",
      },
    ],
  },
  {
    match: ["prometheus"],
    image: "prom/prometheus",
    title: "Prometheus",
    about: "Metrics database",
    role: "monitoring",
    ports: [{ port: "9090", label: "Website", publish: "yes" }],
    volumes: [
      { path: "/prometheus", label: "Recorded metrics" },
      {
        path: "/etc/prometheus/prometheus.yml",
        label: "Config file",
        bind: "./prometheus.yml",
        readOnly: true,
      },
    ],
  },
  {
    match: ["portainer-ce", "portainer-ee", "portainer"],
    image: "portainer/portainer-ce",
    title: "Portainer",
    about: "Docker management UI",
    role: "tool",
    tag: "lts",
    ports: [
      { port: "9443", label: "Website (https)", publish: "yes" },
      { port: "8000", label: "Edge agents", publish: "optional" },
    ],
    volumes: [{ path: "/data", label: "Settings" }],
    socket: { readOnly: false, why: "to manage Docker" },
  },
  {
    match: ["uptime-kuma"],
    image: "louislam/uptime-kuma",
    title: "Uptime Kuma",
    about: "Uptime monitor",
    role: "monitoring",
    tag: "2",
    ports: [{ port: "3001", label: "Website", publish: "yes" }],
    volumes: [{ path: "/app/data", label: "Monitors and history" }],
  },
  {
    match: ["adminer"],
    image: "adminer",
    title: "Adminer",
    about: "Database admin page",
    role: "tool",
    ports: [{ port: "8080", label: "Website", publish: "yes", host: "8081" }],
  },
  {
    match: ["phpmyadmin"],
    image: "phpmyadmin",
    title: "phpMyAdmin",
    about: "MySQL/MariaDB admin page",
    role: "tool",
    ports: [{ port: "80", label: "Website", publish: "yes", host: "8081" }],
    needs: { family: "mysql", optional: true },
    env: [{ name: "PMA_HOST", value: "{host}", label: "Database" }],
  },
  {
    match: ["pgadmin4"],
    image: "dpage/pgadmin4",
    title: "pgAdmin",
    about: "PostgreSQL admin page",
    role: "tool",
    ports: [{ port: "80", label: "Website", publish: "yes", host: "8081" }],
    volumes: [{ path: "/var/lib/pgadmin", label: "Saved servers" }],
    env: [
      {
        name: "PGADMIN_DEFAULT_EMAIL",
        value: "admin@example.com",
        label: "Sign-in email",
      },
      {
        name: "PGADMIN_DEFAULT_PASSWORD",
        value: "{secret:PASSWORD}",
        label: "Password",
      },
    ],
  },
  {
    match: ["gitea"],
    image: "gitea/gitea",
    title: "Gitea",
    about: "Git hosting",
    role: "app",
    tag: "1",
    ports: [
      { port: "3000", label: "Website", publish: "yes" },
      { port: "22", label: "Git over SSH", publish: "optional", host: "2222" },
    ],
    volumes: [{ path: "/data", label: "Repositories and settings" }],
    needs: { family: "postgres", optional: true },
    env: [
      { name: "GITEA__database__DB_TYPE", value: "postgres", label: "Kind" },
      {
        name: "GITEA__database__HOST",
        value: "{host}:{port}",
        label: "Database",
      },
      { name: "GITEA__database__NAME", value: "{link:db}", label: "Name" },
      { name: "GITEA__database__USER", value: "{link:user}", label: "User" },
      {
        name: "GITEA__database__PASSWD",
        value: "{link:password}",
        label: "Password",
      },
    ],
  },
  {
    match: ["n8n"],
    image: "docker.n8n.io/n8nio/n8n",
    title: "n8n",
    about: "Workflow automation",
    role: "app",
    featured: true,
    ports: [{ port: "5678", label: "Website", publish: "yes" }],
    volumes: [{ path: "/home/node/.n8n", label: "Workflows and keys" }],
    env: [
      {
        name: "N8N_ENCRYPTION_KEY",
        value: "{secret:ENCRYPTION_KEY}",
        label: "Key that encrypts saved logins",
      },
    ],
  },
  {
    match: ["node-red"],
    image: "nodered/node-red",
    title: "Node-RED",
    about: "Flow-based automation",
    role: "app",
    ports: [{ port: "1880", label: "Website", publish: "yes" }],
    volumes: [{ path: "/data", label: "Flows" }],
  },
  {
    match: ["mailpit"],
    image: "axllent/mailpit",
    title: "Mailpit",
    about: "Catches outgoing email for testing",
    role: "tool",
    ports: [
      { port: "8025", label: "Website", publish: "yes" },
      { port: "1025", label: "SMTP", publish: "internal" },
    ],
  },
  {
    match: ["registry"],
    image: "registry",
    title: "Docker registry",
    about: "Private image registry",
    role: "tool",
    tag: "3",
    ports: [{ port: "5000", label: "Registry", publish: "yes" }],
    volumes: [{ path: "/var/lib/registry", label: "Images" }],
  },
  {
    match: ["vaultwarden"],
    image: "vaultwarden/server",
    title: "Vaultwarden",
    about: "Password manager (Bitwarden-compatible)",
    role: "app",
    ports: [{ port: "80", label: "Website", publish: "yes" }],
    volumes: [{ path: "/data", label: "Vault" }],
    env: [
      {
        name: "ADMIN_TOKEN",
        value: "{secret:ADMIN_TOKEN}",
        label: "Admin page token",
        optional: true,
      },
    ],
  },
  {
    match: ["influxdb"],
    image: "influxdb",
    title: "InfluxDB",
    about: "Time-series database",
    role: "database",
    tag: "2",
    ports: [{ port: "8086", label: "HTTP API", publish: "yes" }],
    volumes: [{ path: "/var/lib/influxdb2", label: "Data" }],
  },
  {
    match: ["clickhouse-server"],
    image: "clickhouse/clickhouse-server",
    title: "ClickHouse",
    about: "Analytics database",
    role: "database",
    ports: [
      { port: "8123", label: "HTTP", publish: "internal" },
      { port: "9000", label: "Native", publish: "internal" },
    ],
    volumes: [{ path: "/var/lib/clickhouse", label: "Data" }],
    env: [
      {
        name: "CLICKHOUSE_PASSWORD",
        value: "{secret:PASSWORD}",
        label: "Password",
      },
    ],
  },
  {
    match: ["jenkins"],
    image: "jenkins/jenkins",
    title: "Jenkins",
    about: "Build server",
    role: "app",
    tag: "lts",
    ports: [
      { port: "8080", label: "Website", publish: "yes" },
      { port: "50000", label: "Agents", publish: "optional" },
    ],
    volumes: [{ path: "/var/jenkins_home", label: "Jobs and settings" }],
  },
]

// The whole repository name first ("vaultwarden/server"), then its last part
// ("bitnami/postgresql" → postgres).
export function hintFor(image?: string): ImageHint | undefined {
  if (!image) return undefined
  const [repo] = splitRef(image)
  const lower = repo.toLowerCase()
  const byWhole = catalog.find((h) => {
    const img = h.image.toLowerCase()
    return lower === img || lower.endsWith(`/${img}`)
  })
  if (byWhole) return byWhole
  const last = lower.split("/").pop() ?? lower
  return catalog.find((h) => h.match.includes(last))
}

export const featured = catalog.filter((h) => h.featured)

export function searchCatalog(q: string) {
  const t = q.trim().toLowerCase()
  if (!t) return catalog
  return catalog.filter(
    (h) =>
      h.title.toLowerCase().includes(t) ||
      h.image.toLowerCase().includes(t) ||
      h.about.toLowerCase().includes(t) ||
      h.match.some((m) => m.includes(t)),
  )
}

const familyLabel: Record<Family, string> = {
  mysql: "MySQL/MariaDB",
  postgres: "PostgreSQL",
  redis: "Redis",
  mongo: "MongoDB",
}

const familyImage: Record<Family, string> = {
  mysql: "mariadb",
  postgres: "postgres",
  redis: "redis",
  mongo: "mongo",
}

const familyKeys: Record<
  Family,
  { user: string[]; db: string[]; password: string[]; port: string }
> = {
  mysql: {
    user: ["MARIADB_USER", "MYSQL_USER"],
    db: ["MARIADB_DATABASE", "MYSQL_DATABASE"],
    password: ["MARIADB_PASSWORD", "MYSQL_PASSWORD"],
    port: "3306",
  },
  postgres: {
    user: ["POSTGRES_USER"],
    db: ["POSTGRES_DB", "POSTGRES_USER"],
    password: ["POSTGRES_PASSWORD"],
    port: "5432",
  },
  redis: { user: [], db: [], password: [], port: "6379" },
  mongo: {
    user: ["MONGO_INITDB_ROOT_USERNAME"],
    db: [],
    password: ["MONGO_INITDB_ROOT_PASSWORD"],
    port: "27017",
  },
}

// ---- Advice ---------------------------------------------------------------

export type AdviceInput = { value?: string; local?: boolean }
export type Files = { compose: string; env: string }

export type Advice = {
  id: string
  kind:
    | "port"
    | "volume"
    | "env"
    | "health"
    | "restart"
    | "tag"
    | "hostname"
    | "command"
    | "socket"
    | "needs"
    | "depends"
  level: "recommended" | "optional"
  title: string
  detail?: string
  done: boolean
  // Something to adjust before adding it.
  field?: {
    kind: "port" | "volume" | "bind" | "tag"
    value: string
    local?: boolean
    label: string
  }
  apply: (files: Files, input?: AdviceInput) => Files
}

export type AdviceContext = {
  model: ComposeModel
  // Ports already listening on the server ("80/tcp").
  serverPorts: Set<string>
  // Volume names on the server.
  serverVolumes: Set<string>
  // The new-project defaults will add restart: to every service.
  defaultRestart: boolean
}

export function envPrefix(service: string) {
  return service.toUpperCase().replace(/[^A-Z0-9]+/g, "_")
}

// A host port nobody uses yet: the wanted one, 80 → 8080, 443 → 8443, else
// the next free.
export function freePort(
  want: string,
  protocol: string,
  taken: Set<string>,
  preferred?: string,
) {
  const n = Number(want)
  if (!Number.isInteger(n)) return want
  const first = preferred
    ? Number(preferred)
    : n === 80
      ? 8080
      : n === 443
        ? 8443
        : n < 1024
          ? n + 8000
          : n
  for (let p = first; p < 65536; p++) {
    if (!taken.has(`${p}/${protocol}`)) return String(p)
  }
  return String(first)
}

function linkOf(model: ComposeModel, family: Family, self: string) {
  return model.services.find(
    (s) => s.name !== self && hintFor(s.image)?.family === family,
  )
}

function fromLink(link: ServiceInfo | undefined, keys: string[], fb: string) {
  for (const k of keys) {
    const v = link?.env.get(k)
    if (v) return v
  }
  return fb
}

// Fills an EnvHint template; secrets it names land in .env (once).
function fillEnv(
  hint: EnvHint,
  service: string,
  model: ComposeModel,
  family: Family | undefined,
) {
  const secrets: string[] = []
  const link = family ? linkOf(model, family, service) : undefined
  const keys = family ? familyKeys[family] : undefined
  const value = hint.value.replace(
    /\{([a-z]+)(?::([A-Za-z_]+))?\}/g,
    (_, k, a) => {
      if (k === "secret") {
        const name = `${envPrefix(service)}_${a}`
        secrets.push(name)
        return `\${${name}}`
      }
      if (k === "host") return link?.name ?? "db"
      if (k === "port") return keys?.port ?? ""
      if (k === "link" && keys) {
        if (a === "user") return fromLink(link, keys.user, "app")
        if (a === "db") return fromLink(link, keys.db, "app")
        if (a === "password") return fromLink(link, keys.password, "")
      }
      return ""
    },
  )
  return { value, secrets }
}

function withSecrets(env: string, names: string[], make: () => string) {
  const have = parseEnv(env)
  const add = names.filter((n) => !have.get(n))
  return add.length
    ? setEnv(
        env,
        add.map((n) => [n, make()]),
      )
    : env
}

const run = (f: Files, ...edits: Parameters<typeof edit>[1][]) => ({
  ...f,
  compose: edit(f.compose, ...edits),
})

export function adviceFor(
  s: ServiceInfo,
  details: DockerImageDetails | undefined,
  ctx: AdviceContext,
  makeSecret: () => string,
): Advice[] {
  const hint = hintFor(s.image)
  const out: Advice[] = []
  const name = s.name
  const taken = new Set([...ctx.serverPorts, ...hostPorts(ctx.model)])
  const hasPort = (port: string, proto: string) =>
    s.ports.some((p) => p.target === port && p.protocol === proto)
  const hasMount = (path: string) => s.mounts.some((m) => m.target === path)
  const isDb = hint?.role === "database" || hint?.role === "cache"

  // Ports: the catalog's, then the ones the image exposes that it lacks.
  const ports: PortHint[] = [...(hint?.ports ?? [])]
  for (const raw of details?.exposed_ports ?? []) {
    const [port, protocol = "tcp"] = raw.split("/")
    if (
      !ports.some((p) => p.port === port && (p.protocol ?? "tcp") === protocol)
    )
      ports.push({
        port,
        protocol: protocol === "udp" ? "udp" : "tcp",
        label: "Exposed by the image",
        publish: hint ? "optional" : isDb ? "internal" : "yes",
      })
  }
  for (const p of ports) {
    const proto = p.protocol ?? "tcp"
    const internal = p.publish === "internal"
    const host = freePort(p.port, proto, taken, p.host)
    const shown = `${p.port}${proto === "udp" ? "/udp" : ""}`
    out.push({
      id: `port:${shown}`,
      kind: "port",
      level: p.publish === "yes" ? "recommended" : "optional",
      title: internal
        ? `Publish ${p.label} (${shown}) on the server`
        : `Publish ${p.label} (${shown})`,
      detail: internal
        ? `The other services already reach it at ${name}:${p.port}. Publish it only to reach it from outside.`
        : host !== p.port
          ? `${p.port} on the server is taken or reserved, so ${host} is suggested.`
          : undefined,
      done: hasPort(p.port, proto),
      field: {
        kind: "port",
        value: host,
        local: internal,
        label: "Port on the server",
      },
      apply: (f, i) =>
        run(
          f,
          addPort(name, {
            host: i?.value?.trim() || host,
            target: p.port,
            protocol: proto,
            ip: (i?.local ?? internal) ? "127.0.0.1" : undefined,
          }),
        ),
    })
  }

  // Folders to keep: the catalog's, then the image's VOLUME lines.
  const major = Number.parseInt(s.image ? splitRef(s.image)[1] : "", 10)
  const volumes: VolumeHint[] = (hint?.volumes ?? []).map((v) =>
    v.legacy && major < v.legacy.below ? { ...v, path: v.legacy.path } : v,
  )
  for (const path of details?.volumes ?? []) {
    if (!volumes.some((v) => v.path === path))
      volumes.push({ path, label: "Kept by the image (VOLUME)" })
  }
  const used = new Set(ctx.model.volumes.map((v) => v.key))
  for (const s2 of ctx.model.services)
    for (const m of s2.mounts) if (m.source) used.add(m.source)
  for (const v of volumes) {
    const suggested = v.bind
      ? v.bind
      : uniqueName(`${name}-${v.suffix ?? "data"}`, used)
    const anonymous = v.label.startsWith("Kept by the image")
    out.push({
      id: `volume:${v.path}`,
      kind: "volume",
      level: v.optional ? "optional" : "recommended",
      title: v.bind
        ? `Mount ${v.label.toLowerCase()} from the server`
        : `Keep ${v.label.toLowerCase()} on a volume`,
      detail: v.bind
        ? `${v.bind} next to the compose file → ${v.path}${v.readOnly ? ", read-only" : ""}.`
        : anonymous
          ? `Without one, ${v.path} goes to an unnamed volume that's easy to lose.`
          : `${v.path} is lost when the container is recreated without one.`,
      done: hasMount(v.path),
      field: {
        kind: v.bind ? "bind" : "volume",
        value: suggested,
        label: v.bind ? "Folder or file on the server" : "Volume name",
      },
      apply: (f, i) => {
        const source = i?.value?.trim() || suggested
        return run(
          f,
          addMount(
            name,
            { source, target: v.path, readOnly: v.readOnly },
            { external: ctx.serverVolumes.has(source) && !used.has(source) },
          ),
        )
      },
    })
  }

  // Variables.
  for (const e of hint?.env ?? []) {
    const link = hint?.needs
      ? linkOf(ctx.model, hint.needs.family, name)
      : undefined
    // A link variable without the database in the file waits for it.
    if (/\{(host|link)/.test(e.value) && !link) continue
    const preview = fillEnv(
      e,
      name,
      ctx.model,
      hint?.needs?.family ?? hint?.family,
    )
    out.push({
      id: `env:${e.name}`,
      kind: "env",
      level: e.optional ? "optional" : "recommended",
      title: `Set ${e.label.toLowerCase()}`,
      detail: `${e.name}: ${preview.value}${preview.secrets.length ? " (a random secret goes in .env)" : ""}`,
      done: s.env.has(e.name),
      apply: (f) => {
        const m = readCompose(f.compose)
        const v = fillEnv(e, name, m, hint?.needs?.family ?? hint?.family)
        const next = run(f, setEnvVar(name, e.name, v.value))
        return { ...next, env: withSecrets(next.env, v.secrets, makeSecret) }
      },
    })
  }

  // The database it needs.
  if (hint?.needs) {
    const fam = hint.needs.family
    const link = linkOf(ctx.model, fam, name)
    if (!link) {
      out.push({
        id: `needs:${fam}`,
        kind: "needs",
        level: hint.needs.optional ? "optional" : "recommended",
        title: `Add a ${familyLabel[fam]} database`,
        detail: `${hint.title} keeps its data there. It's added with its own volume, password and healthcheck, then ${name} is pointed at it.`,
        done: false,
        apply: (f) => {
          const taken = readCompose(f.compose).services.map((x) => x.name)
          const db = uniqueName(fam === "redis" ? "redis" : "db", taken)
          const image = familyImage[fam]
          const tag = hintFor(image)?.tag
          let next = run(f, addService(db, tag ? `${image}:${tag}` : image))
          next = applyRecommended(next, db, ctx, makeSecret)
          // Now the link variables and depends_on can be filled.
          return applyRecommended(next, name, ctx, makeSecret)
        },
      })
    } else {
      out.push({
        id: `depends:${link.name}`,
        kind: "depends",
        level: "recommended",
        title: `Start after ${link.name}`,
        detail: link.healthcheck
          ? `Waits until ${link.name} reports healthy.`
          : `Starts ${link.name} first (add a healthcheck to it to wait until it's ready).`,
        done: s.dependsOn.includes(link.name),
        apply: (f) => run(f, addDependsOn(name, link.name, link.healthcheck)),
      })
    }
  }

  if (hint?.command) {
    const c = hint.command
    out.push({
      id: "command",
      kind: "command",
      level: c.optional ? "optional" : "recommended",
      title: c.optional ? "Change the start command" : "Set the start command",
      detail: `${c.label}: ${c.value}`,
      done: s.command,
      apply: (f) => run(f, setKey(name, "command", c.value)),
    })
  }

  if (hint?.hostname) {
    out.push({
      id: "hostname",
      kind: "hostname",
      level: "recommended",
      title: "Give it a fixed hostname",
      detail: `${hint.title} names its data after the hostname; a new random one after a recreate looks like an empty server.`,
      done: !!s.hostname,
      apply: (f) => run(f, setKey(name, "hostname", name)),
    })
  }

  if (hint?.socket) {
    const sock = "/var/run/docker.sock"
    out.push({
      id: "socket",
      kind: "socket",
      level: "recommended",
      title: "Mount the Docker socket",
      detail: `${hint.title} needs it ${hint.socket.why}. It gives full control of Docker on this server${hint.socket.readOnly ? "; read-only is enough here" : ""}.`,
      done: hasMount(sock),
      apply: (f) =>
        run(
          f,
          addMount(name, {
            source: sock,
            target: sock,
            readOnly: hint.socket?.readOnly,
          }),
        ),
    })
  }

  if (hint?.health) {
    const h = hint.health
    out.push({
      id: "health",
      kind: "health",
      level: "recommended",
      title: "Add a healthcheck",
      detail: `${h.test.slice(1).join(" ")} — shows when it's really ready, and lets other services wait for it.`,
      done: s.healthcheck,
      apply: (f) => run(f, setHealthcheck(name, h)),
    })
  }

  if (!ctx.defaultRestart && !s.build) {
    out.push({
      id: "restart",
      kind: "restart",
      level: "recommended",
      title: "Restart it after a crash or reboot",
      detail: "restart: unless-stopped",
      done: !!s.restart,
      apply: (f) => run(f, setKey(name, "restart", "unless-stopped")),
    })
  }

  if (s.image) {
    const [repo, tag] = splitRef(s.image)
    const pinned = tag !== "latest" || /@sha256:/.test(s.image)
    const want = hint?.tag ?? ""
    out.push({
      id: "tag",
      kind: "tag",
      level: "recommended",
      title: "Pin a version",
      detail: `${repo}:latest changes under you on the next pull${want ? `; ${want} stays on one release line` : ""}.`,
      done: pinned,
      field: { kind: "tag", value: want, label: "Tag" },
      apply: (f, i) => {
        const t = i?.value?.trim() || want
        if (!t) return f
        const keepHost = s.image?.startsWith("docker.io/") ? "docker.io/" : ""
        return run(f, setImage(name, `${keepHost}${repo}:${t}`))
      },
    })
  }

  return out
}

// Applies every recommended, not-yet-done suggestion with its defaults,
// re-reading the file after each (one change can make another possible).
export function applyRecommended(
  files: Files,
  service: string,
  ctx: Omit<AdviceContext, "model">,
  makeSecret: () => string,
  details?: DockerImageDetails,
): Files {
  let f = files
  const tried = new Set<string>()
  for (let n = 0; n < 40; n++) {
    const model = readCompose(f.compose)
    const s = model.services.find((x) => x.name === service)
    if (!s) return f
    const next = adviceFor(s, details, { ...ctx, model }, makeSecret).find(
      (a) =>
        a.level === "recommended" &&
        !a.done &&
        !tried.has(a.id) &&
        // Pinning without a known tag would only ask; a database is added
        // only when asked for.
        !(a.kind === "tag" && !a.field?.value) &&
        a.kind !== "needs",
    )
    if (!next) return f
    tried.add(next.id)
    f = next.apply(f)
  }
  return f
}

// A new service from an image, with its recommended settings when asked.
export function addFromImage(
  files: Files,
  image: string,
  opts: {
    name?: string
    recommended: boolean
    ctx: Omit<AdviceContext, "model">
    details?: DockerImageDetails
    makeSecret: () => string
  },
): { files: Files; service: string } {
  const model = readCompose(files.compose)
  const service = uniqueName(
    opts.name?.trim() || serviceFromImage(image),
    model.services.map((s) => s.name),
  )
  let f = run(files, addService(service, image))
  if (opts.recommended)
    f = applyRecommended(f, service, opts.ctx, opts.makeSecret, opts.details)
  return { files: f, service }
}

// Image with the catalog's tag when none was typed.
export function imageWithTag(input: string) {
  const v = input.trim()
  if (!v) return v
  const [repo, tag] = splitRef(v)
  const typedTag = v.includes(":") && v.lastIndexOf(":") > v.lastIndexOf("/")
  if (typedTag || v.includes("@")) return v
  const want = hintFor(repo)?.tag
  return want && tag === "latest" ? `${v}:${want}` : v
}
