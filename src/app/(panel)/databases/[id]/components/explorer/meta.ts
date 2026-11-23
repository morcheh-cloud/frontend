import type { Database, QueryResult, RowFilter } from "@/lib/services"

export type Engine = Database["engine"]

export const sqlEngine = (e: Engine) =>
  e === "postgres" || e === "mysql" || e === "mssql" || e === "clickhouse"

// Databases an engine keeps for itself: listed last, never opened first.
export const systemDatabases: Record<string, string[]> = {
  postgres: ["postgres"],
  mysql: ["information_schema", "mysql", "performance_schema", "sys"],
  mssql: ["master", "model", "msdb", "tempdb"],
  mongodb: ["admin", "local", "config"],
  redis: [],
  clickhouse: ["system", "information_schema"],
  elasticsearch: [],
  meilisearch: [],
}

// Search engines take a console of HTTP requests instead of a query language.
export const consoleEngine = (e: Engine) =>
  e === "elasticsearch" || e === "meilisearch"

export const isSystemDb = (e: Engine, name: string) =>
  (systemDatabases[e] ?? []).includes(name.toLowerCase())

export const filterOps: {
  value: RowFilter["op"]
  label: string
  noValue?: boolean
}[] = [
  { value: "eq", label: "is" },
  { value: "ne", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "doesn't contain" },
  { value: "starts", label: "starts with" },
  { value: "ends", label: "ends with" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "in", label: "is one of" },
  { value: "null", label: "is empty (null)", noValue: true },
  { value: "not_null", label: "has a value", noValue: true },
]

export const opLabel = (op: RowFilter["op"]) =>
  filterOps.find((o) => o.value === op)?.label ?? op

export const numericType = (t: string) =>
  /^(int|integer|bigint|smallint|tinyint|mediumint|int2|int4|int8|serial|bigserial|numeric|decimal|float|float4|float8|double|real|money|smallmoney|long|bit|number|year)\b/i.test(
    t.trim(),
  ) || /\b(INT|DECIMAL|NUMERIC|FLOAT|DOUBLE)\b/.test(t)

// How a name is written in a query.
export function quoteName(engine: Engine, name: string) {
  if (engine === "clickhouse")
    // Backslash escapes work inside ClickHouse's backticks too.
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
      ? name
      : `\`${name.replaceAll("\\", "\\\\").replaceAll("`", "\\`")}\``
  if (engine === "mysql") return `\`${name.replaceAll("`", "``")}\``
  if (engine === "mssql") return `[${name.replaceAll("]", "]]")}]`
  return /^[a-z_][a-z0-9_]*$/.test(name)
    ? name
    : `"${name.replaceAll('"', '""')}"`
}

// A first query for a table, opened in the query editor.
export function selectFor(engine: Engine, schema: string, name: string) {
  if (engine === "mongodb")
    return `db.getCollection("${name}").find({}).limit(100)`
  if (engine === "redis") return "SCAN 0 MATCH * COUNT 100"
  if (engine === "elasticsearch")
    return `GET /${encodeURIComponent(name)}/_search\n{\n  "query": { "match_all": {} },\n  "size": 100\n}`
  if (engine === "meilisearch")
    return `POST /indexes/${encodeURIComponent(name)}/search\n{\n  "q": "",\n  "limit": 100\n}`
  const table =
    schema && !(engine === "postgres" && schema === "public")
      ? `${quoteName(engine, schema)}.${quoteName(engine, name)}`
      : quoteName(engine, name)
  if (engine === "mssql") return `SELECT TOP 100 *\nFROM ${table};`
  return `SELECT *\nFROM ${table}\nLIMIT 100;`
}

export const placeholders: Record<Engine, string> = {
  postgres: "SELECT now();",
  mysql: "SHOW TABLES;",
  mssql: "SELECT name FROM sys.tables;",
  mongodb: 'db.collection.find({ status: "open" }).sort({ _id: -1 }).limit(50)',
  redis: "SCAN 0 MATCH user:* COUNT 100\nGET some:key",
  clickhouse:
    "SELECT database, name, total_rows\nFROM system.tables\nWHERE database = currentDatabase();",
  elasticsearch:
    'GET /_cat/indices?v\n\nGET /my-index/_search\n{\n  "query": { "match": { "title": "hello" } }\n}',
  meilisearch:
    'GET /indexes\n\nPOST /indexes/movies/search\n{\n  "q": "batman",\n  "limit": 20\n}',
}

export const kindLabel: Record<string, string> = {
  table: "Table",
  view: "View",
  materialized_view: "Materialized view",
  foreign_table: "Foreign table",
  collection: "Collection",
  timeseries: "Time series",
  dictionary: "Dictionary",
  index: "Index",
  alias: "Alias",
  data_stream: "Data stream",
}

// ---- export ----

function csvCell(v: string | null | undefined) {
  if (v == null) return ""
  return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v
}

export function toCsv(r: Pick<QueryResult, "columns" | "rows">) {
  const lines = [r.columns.map((c) => csvCell(c.name)).join(",")]
  for (const row of r.rows) lines.push(row.map((v) => csvCell(v)).join(","))
  return lines.join("\r\n")
}

export function toTsv(r: Pick<QueryResult, "columns" | "rows">) {
  const clean = (v: string | null | undefined) =>
    (v ?? "").replaceAll("\t", " ").replaceAll(/\r?\n/g, " ")
  return [
    r.columns.map((c) => clean(c.name)).join("\t"),
    ...r.rows.map((row) => row.map(clean).join("\t")),
  ].join("\n")
}

export function toJson(r: Pick<QueryResult, "columns" | "rows" | "documents">) {
  if (r.documents?.length) {
    return `[\n${r.documents.map((d) => `  ${d}`).join(",\n")}\n]`
  }
  const items = r.rows.map((row) =>
    Object.fromEntries(r.columns.map((c, i) => [c.name, row[i] ?? null])),
  )
  return JSON.stringify(items, null, 2)
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const fileName = (base: string) =>
  `${base.replaceAll(/[^\w.-]+/g, "_").slice(0, 60) || "result"}-${new Date()
    .toISOString()
    .slice(0, 19)
    .replaceAll(":", "")}`

// A value written out, JSON pretty-printed when it is JSON.
export function pretty(v: string) {
  const t = v.trim()
  if (
    (t.startsWith("{") && t.endsWith("}")) ||
    (t.startsWith("[") && t.endsWith("]"))
  ) {
    try {
      return JSON.stringify(JSON.parse(t), null, 2)
    } catch {}
  }
  return v
}

export const rowsText = (n: number) =>
  `${n.toLocaleString()} ${n === 1 ? "row" : "rows"}`

// The modifier key's name on this machine (⌘ on a Mac, Ctrl elsewhere).
export const modKey = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? "⌘"
    : "Ctrl"
