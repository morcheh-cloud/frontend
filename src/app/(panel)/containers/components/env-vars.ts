// What a compose file asks of its .env: the variables it reads, which of them
// the .env lacks, which secrets still hold a placeholder. Pure functions.

export type ComposeVar = {
  name: string
  // `${NAME:?…}` / `${NAME?…}`: compose refuses to start without it.
  required: boolean
  // `${NAME:-x}` / `${NAME-x}`: compose falls back to x.
  fallback?: string
}

// $$ is a literal $; ${NAME}, ${NAME:-d}, ${NAME-d}, ${NAME:?e}, ${NAME?e},
// ${NAME:+x}, $NAME.
const VAR =
  /\$\$|\$\{([A-Za-z_][A-Za-z0-9_]*)(?:(:?[-?+])((?:[^{}]|\{[^{}]*\})*))?\}|\$([A-Za-z_][A-Za-z0-9_]*)/g

export function composeVars(compose: string): ComposeVar[] {
  const found = new Map<string, ComposeVar>()
  for (const raw of compose.split("\n")) {
    // A whole-line comment reads nothing; a trailing one is rare in values.
    if (/^\s*#/.test(raw)) continue
    for (const m of raw.matchAll(VAR)) {
      const name = m[1] ?? m[4]
      if (!name) continue
      const op = m[2] ?? ""
      const cur = found.get(name) ?? { name, required: false }
      if (op.endsWith("?")) cur.required = true
      if (op.endsWith("-") && cur.fallback === undefined) cur.fallback = m[3]
      found.set(name, cur)
    }
  }
  return [...found.values()]
}

// NAME=value lines (export, quotes and comments allowed), the way compose
// reads a .env. Later lines win.
export function parseEnv(text: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const raw of text.split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/.exec(line)
    if (!m) continue
    let value = m[2]
    const q = value[0]
    if ((q === '"' || q === "'") && value.lastIndexOf(q) > 0) {
      value = value.slice(1, value.lastIndexOf(q))
    } else {
      value = value.replace(/\s+#.*$/, "")
    }
    out.set(m[1], value)
  }
  return out
}

// Sets NAME=value: replaces the line already there, else appends one.
export function setEnv(text: string, entries: [string, string][]) {
  const lines = text === "" ? [] : text.replace(/\n$/, "").split("\n")
  for (const [name, value] of entries) {
    const line = `${name}=${quoteEnv(value)}`
    const at = lines.findIndex((l) =>
      new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(l),
    )
    if (at >= 0) lines[at] = line
    else lines.push(line)
  }
  return lines.length > 0 ? `${lines.join("\n")}\n` : ""
}

function quoteEnv(value: string) {
  return /[\s#"'$`\\]/.test(value) ? `'${value.replaceAll("'", "")}'` : value
}

const SECRET =
  /PASS|SECRET|TOKEN|(^|_)KEY($|_)|SALT|PRIVATE|CREDENTIAL|API_?KEY/i

export function isSecretName(name: string) {
  return SECRET.test(name)
}

// Values that are clearly not a real secret yet.
const PLACEHOLDER =
  /^(|changeme|change[-_ ]?me|change[-_ ]?this|password|secret|example|xxx+|todo|replace[-_ ]?me|your[-_].*|<.*>|admin|root|123456|1234|test)$/i

export function isPlaceholder(value: string) {
  return PLACEHOLDER.test(value.trim())
}

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// A random 32-character letters-and-digits secret: safe in any .env, URL or
// YAML without quoting.
export function newSecret(length = 32) {
  const out: string[] = []
  const bytes = new Uint8Array(length * 2)
  while (out.length < length) {
    crypto.getRandomValues(bytes)
    for (const b of bytes) {
      // 248 = 4 × 62: drop the rest so every character is equally likely.
      if (b < 248 && out.length < length) out.push(ALPHABET[b % 62])
    }
  }
  return out.join("")
}

export type EnvReport = {
  // Read by the compose file, not in .env, no fallback.
  missing: ComposeVar[]
  // Secret-looking names that are empty or hold a placeholder.
  weak: string[]
  // In .env but not read by the compose file (compose itself may still pass
  // them through env_file: .env).
  unused: string[]
  // Every name the compose file reads.
  used: ComposeVar[]
}

export function envReport(compose: string, env: string): EnvReport {
  const used = composeVars(compose)
  const values = parseEnv(env)
  const usesEnvFile = /env_file:[\s\S]*?\.env\b/.test(compose)
  const missing = used.filter(
    (v) => !values.has(v.name) && v.fallback === undefined,
  )
  const weak = [
    ...new Set([...used.map((v) => v.name), ...values.keys()]),
  ].filter(
    (n) =>
      isSecretName(n) && values.has(n) && isPlaceholder(values.get(n) ?? ""),
  )
  // Missing secrets are listed in `missing`; weak = present but placeholder.
  const names = new Set(used.map((v) => v.name))
  const unused = usesEnvFile
    ? []
    : [...values.keys()].filter((k) => !names.has(k))
  return { missing, weak, unused, used }
}
