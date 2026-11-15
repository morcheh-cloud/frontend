import type { Engine } from "../meta"

// What /databases/new?source=container can start: one compose service per
// database, its data in a named volume, the password in the project's .env.

export type Kind =
  | "postgres"
  | "mysql"
  | "mariadb"
  | "mssql"
  | "mongodb"
  | "redis"

export type Recipe = {
  kind: Kind
  label: string
  // How Morche watches it.
  engine: Engine
  flavor?: string
  versions: { tag: string; label: string }[]
  port: number
  // The admin it starts with; `fixed` = the image doesn't let you rename it.
  user: string
  userFixed: boolean
  // The image can create a first database by itself.
  firstDatabase: boolean
  // What Morche signs in to when no first database is set.
  dbname: string
  // Below this the engine doesn't run well (MB).
  minMemory?: number
  blurb: string
}

export const recipes: Recipe[] = [
  {
    kind: "postgres",
    label: "PostgreSQL",
    engine: "postgres",
    versions: [
      { tag: "17", label: "17" },
      { tag: "18", label: "18" },
      { tag: "16", label: "16" },
      { tag: "15", label: "15" },
    ],
    port: 5432,
    user: "postgres",
    userFixed: false,
    firstDatabase: true,
    dbname: "postgres",
    blurb: "The usual pick for apps",
  },
  {
    kind: "mysql",
    label: "MySQL",
    engine: "mysql",
    versions: [
      { tag: "8.4", label: "8.4 LTS" },
      { tag: "9", label: "9" },
      { tag: "8.0", label: "8.0" },
    ],
    port: 3306,
    user: "root",
    userFixed: true,
    firstDatabase: true,
    dbname: "",
    blurb: "WordPress, Laravel, most PHP apps",
  },
  {
    kind: "mariadb",
    label: "MariaDB",
    engine: "mysql",
    flavor: "mariadb",
    versions: [
      { tag: "11.4", label: "11.4 LTS" },
      { tag: "10.11", label: "10.11 LTS" },
    ],
    port: 3306,
    user: "root",
    userFixed: true,
    firstDatabase: true,
    dbname: "",
    blurb: "Drop-in for MySQL",
  },
  {
    kind: "mssql",
    label: "SQL Server",
    engine: "mssql",
    versions: [
      { tag: "2022-latest", label: "2022" },
      { tag: "2019-latest", label: "2019" },
    ],
    port: 1433,
    user: "sa",
    userFixed: true,
    firstDatabase: false,
    dbname: "master",
    minMemory: 2048,
    blurb: "Microsoft's, needs 2 GB of memory",
  },
  {
    kind: "mongodb",
    label: "MongoDB",
    engine: "mongodb",
    versions: [
      { tag: "8", label: "8" },
      { tag: "7", label: "7" },
    ],
    port: 27017,
    user: "root",
    userFixed: false,
    firstDatabase: false,
    dbname: "admin",
    blurb: "Documents instead of tables",
  },
  {
    kind: "redis",
    label: "Redis",
    engine: "redis",
    versions: [
      { tag: "8", label: "8" },
      { tag: "7", label: "7" },
    ],
    port: 6379,
    user: "",
    userFixed: true,
    firstDatabase: false,
    dbname: "",
    blurb: "Cache, queues and sessions",
  },
]

export const recipeOf = Object.fromEntries(
  recipes.map((r) => [r.kind, r]),
) as Record<Kind, Recipe>

export const kindOfEngine = (engine: string | undefined): Kind | undefined =>
  recipes.find((r) => r.kind === engine || r.engine === engine)?.kind

export type Publish = "none" | "local" | "all"
export type Edition = "Express" | "Developer"

export const memories = [
  { value: "", label: "No limit" },
  { value: "512m", label: "512 MB", mb: 512 },
  { value: "1g", label: "1 GB", mb: 1024 },
  { value: "2g", label: "2 GB", mb: 2048 },
  { value: "4g", label: "4 GB", mb: 4096 },
] as const

export type Memory = (typeof memories)[number]["value"]

export type DeploySpec = {
  kind: Kind
  version: string
  edition: Edition
  project: string
  username: string
  dbname: string
  publish: Publish
  hostPort: number
  network: string
  memory: Memory
}

export const SERVICE = "db"

// The image a spec runs.
export function imageOf(s: Pick<DeploySpec, "kind" | "version">) {
  switch (s.kind) {
    case "mssql":
      return `mcr.microsoft.com/mssql/server:${s.version}`
    case "mongodb":
      return `mongo:${s.version}`
    default:
      return `${s.kind}:${s.version}`
  }
}

// JSON strings are valid YAML double-quoted scalars, so every value that
// came from the form goes through this.
const q = (v: string) => JSON.stringify(v)

function environment(s: DeploySpec): [string, string][] {
  switch (s.kind) {
    case "postgres":
      return [
        ["POSTGRES_USER", s.username],
        ["POSTGRES_PASSWORD", "${DB_PASSWORD}"],
        ...(s.dbname
          ? ([["POSTGRES_DB", s.dbname]] as [string, string][])
          : []),
      ]
    case "mysql":
      return [
        ["MYSQL_ROOT_PASSWORD", "${DB_PASSWORD}"],
        ...(s.dbname
          ? ([["MYSQL_DATABASE", s.dbname]] as [string, string][])
          : []),
      ]
    case "mariadb":
      return [
        ["MARIADB_ROOT_PASSWORD", "${DB_PASSWORD}"],
        ...(s.dbname
          ? ([["MARIADB_DATABASE", s.dbname]] as [string, string][])
          : []),
      ]
    case "mssql":
      return [
        ["ACCEPT_EULA", "Y"],
        ["MSSQL_PID", s.edition],
        ["MSSQL_SA_PASSWORD", "${DB_PASSWORD}"],
      ]
    case "mongodb":
      return [
        ["MONGO_INITDB_ROOT_USERNAME", s.username],
        ["MONGO_INITDB_ROOT_PASSWORD", "${DB_PASSWORD}"],
      ]
    case "redis":
      return [["REDIS_PASSWORD", "${DB_PASSWORD}"]]
  }
}

function dataPath(s: DeploySpec) {
  switch (s.kind) {
    case "postgres":
      // 18 keeps its data in a versioned folder under this one.
      return Number(s.version) >= 18
        ? "/var/lib/postgresql"
        : "/var/lib/postgresql/data"
    case "mysql":
    case "mariadb":
      return "/var/lib/mysql"
    case "mssql":
      return "/var/opt/mssql"
    case "mongodb":
      return "/data/db"
    case "redis":
      return "/data"
  }
}

// `$$` reaches the container as `$`: these read the container's own env.
function healthcheck(s: DeploySpec): string[] {
  switch (s.kind) {
    case "postgres":
      return ["CMD-SHELL", 'pg_isready -U "$${POSTGRES_USER}"']
    case "mysql":
      return [
        "CMD-SHELL",
        'mysqladmin ping -h 127.0.0.1 -uroot -p"$${MYSQL_ROOT_PASSWORD}" --silent',
      ]
    case "mariadb":
      return ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
    case "mssql": {
      const tools = s.version.startsWith("2019")
        ? "/opt/mssql-tools/bin/sqlcmd"
        : "/opt/mssql-tools18/bin/sqlcmd -C"
      return [
        "CMD-SHELL",
        `${tools} -S localhost -U sa -P "$\${MSSQL_SA_PASSWORD}" -Q "SELECT 1" -b -o /dev/null`,
      ]
    }
    case "mongodb":
      return ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
    case "redis":
      return [
        "CMD-SHELL",
        'redis-cli -a "$${REDIS_PASSWORD}" --no-auth-warning ping | grep -q PONG',
      ]
  }
}

// The whole docker-compose.yml.
export function composeOf(s: DeploySpec) {
  const r = recipeOf[s.kind]
  const lines = [
    "services:",
    `  ${SERVICE}:`,
    `    image: ${q(imageOf(s))}`,
    `    container_name: ${q(s.project)}`,
    "    restart: unless-stopped",
  ]
  if (s.kind === "redis") {
    lines.push(
      "    command:",
      ...[
        "redis-server",
        "--requirepass",
        "${DB_PASSWORD}",
        "--appendonly",
        "yes",
      ].map((a) => `      - ${q(a)}`),
    )
  }
  lines.push("    environment:")
  for (const [k, v] of environment(s)) lines.push(`      ${k}: ${q(v)}`)
  lines.push("    volumes:", `      - ${q(`data:${dataPath(s)}`)}`)
  if (s.publish !== "none") {
    const host = s.publish === "local" ? "127.0.0.1:" : ""
    lines.push("    ports:", `      - ${q(`${host}${s.hostPort}:${r.port}`)}`)
  }
  if (s.network)
    lines.push("    networks:", "      - default", "      - shared")
  lines.push(
    "    healthcheck:",
    "      test:",
    ...healthcheck(s).map((a) => `        - ${q(a)}`),
    "      interval: 10s",
    "      timeout: 5s",
    "      retries: 5",
    `      start_period: ${s.kind === "mssql" ? "60s" : "30s"}`,
  )
  if (s.memory) lines.push(`    mem_limit: ${s.memory}`)
  lines.push(
    "    logging:",
    "      driver: json-file",
    "      options:",
    '        max-size: "10m"',
    '        max-file: "3"',
    "volumes:",
    "  data: {}",
  )
  if (s.network) {
    lines.push(
      "networks:",
      "  shared:",
      "    external: true",
      `    name: ${q(s.network)}`,
    )
  }
  return `${lines.join("\n")}\n`
}

// 24 letters and digits, at least one of each kind: strong, needs no
// quoting anywhere, and passes SQL Server's complexity rule.
export function newPassword(length = 24) {
  const sets = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
  ]
  const all = sets.join("")
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint32Array(length))
    const out = Array.from(bytes, (b) => all[b % all.length]).join("")
    if (sets.every((set) => [...out].some((c) => set.includes(c)))) return out
  }
}

// Characters a password may hold: a .env value, a shell argument in the
// health check and a YAML string must all take it as is.
export const passwordProblem = (pw: string, kind: Kind) => {
  if (pw.length < 12) return "Use at least 12 characters."
  if (/[\s"'`\\$#]/.test(pw))
    return "Spaces, quotes, backslashes, $ and # aren't allowed here."
  if (kind === "mssql") {
    const kinds = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((r) =>
      r.test(pw),
    ).length
    if (kinds < 3)
      return "SQL Server needs three of: capitals, small letters, digits, symbols."
  }
  return null
}

// "Orders DB" → "orders-db": a compose project and container name.
export function slugOf(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 40)
}

export const projectPattern = /^[a-z0-9][a-z0-9_-]*$/
export const identPattern = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/
