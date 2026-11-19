import type { Asset, AssetBody, AssetGroup, AssetPerson } from "@/lib/services"
import {
  envLabel,
  kindMeta,
  kindOf,
  lifecycleLabel,
  manualKinds,
  ownerText,
} from "./meta"

// RFC 4180-ish: quotes, doubled quotes, commas/semicolons/tabs, CRLF.
export function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? ""
  const sep =
    (first.match(/\t/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0)
      ? "\t"
      : (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0)
        ? ";"
        : ","
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
      continue
    }
    if (c === '"' && cell === "") quoted = true
    else if (c === sep) {
      row.push(cell)
      cell = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      if (row.some((x) => x.trim() !== "")) rows.push(row)
      row = []
      cell = ""
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== "")) rows.push(row)
  return rows
}

const quote = (v: string) =>
  /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v

export function assetsCsv(items: Asset[]) {
  const head = [
    "name",
    "kind",
    "category",
    "owner",
    "deputy",
    "assigned_to",
    "environment",
    "criticality",
    "classification",
    "lifecycle",
    "tags",
    "vendor",
    "model",
    "serial_number",
    "asset_tag",
    "location",
    "cost",
    "currency",
    "billing",
    "cost_center",
    "purchased_on",
    "warranty_until",
    "expires_on",
    "auto_renew",
    "seats",
    "seats_used",
    "status",
    "managed_by_morche",
    "description",
    "notes",
  ]
  const lines = [head.join(",")]
  for (const a of items) {
    const row = [
      a.name,
      a.kind,
      a.category,
      ownerText(a),
      a.owner.deputy_name ?? "",
      a.assigned_user_name ?? "",
      a.environment,
      a.criticality ? String(a.criticality) : "",
      a.classification,
      a.lifecycle,
      a.tags.join(";"),
      a.vendor,
      a.model,
      a.serial_number,
      a.asset_tag,
      a.location,
      a.cost != null ? String(a.cost) : "",
      a.currency,
      a.billing,
      a.cost_center,
      a.purchased_on,
      a.warranty_until,
      a.expires_on,
      a.auto_renew ? "yes" : "",
      a.seats != null ? String(a.seats) : "",
      a.seats_used != null ? String(a.seats_used) : "",
      String(a.facts.status ?? ""),
      a.source_kind ? "yes" : "",
      a.description,
      a.notes,
    ]
    lines.push(row.map((v) => quote(v ?? "")).join(","))
  }
  return `${lines.join("\n")}\n`
}

export function downloadText(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const importColumns =
  "name, kind, category, owner, deputy, assigned_to, environment, criticality, classification, lifecycle, tags, vendor, model, serial_number, asset_tag, location, cost, currency, billing, cost_center, purchased_on, warranty_until, expires_on, auto_renew, seats, seats_used, description, notes"

export const importExample = `name,kind,category,owner,vendor,model,serial_number,purchased_on,warranty_until,cost,currency
Sara's laptop,hardware,Laptop,sara,Lenovo,ThinkPad T14,PF3XK2,2025-02-10,2028-02-10,1450,EUR
JetBrains All Products,license,,dev-team,JetBrains,,,,2027-01-31,,
example.com,domain,,ops,Namecheap,,,,2027-06-12,,`

export type ImportRow = { body: AssetBody; problems: string[]; line: number }

const kindByWord: Record<string, string> = {
  licence: "license",
  license: "license",
  licenses: "license",
  domain: "domain",
  domains: "domain",
  laptop: "hardware",
  desktop: "hardware",
  hw: "hardware",
  vm: "virtual_machine",
  saas: "subscription",
  cert: "certificate",
}

function kindOfWord(raw: string): string {
  const w = raw.trim().toLowerCase().replaceAll(" ", "_")
  if ((manualKinds as readonly string[]).includes(w)) return w
  if (kindByWord[w]) return kindByWord[w]
  const byLabel = Object.entries(kindMeta).find(
    ([k, m]) =>
      (manualKinds as readonly string[]).includes(k) &&
      (m.label.toLowerCase() === raw.trim().toLowerCase() ||
        m.plural.toLowerCase() === raw.trim().toLowerCase()),
  )
  return byLabel?.[0] ?? ""
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

// Turns CSV rows (with a header) into bodies, naming what's wrong per row.
export function rowsToBodies(
  rows: string[][],
  people: AssetPerson[],
  groups: AssetGroup[],
): ImportRow[] {
  if (rows.length < 2) return []
  const head = rows[0].map((h) => h.trim().toLowerCase().replaceAll(" ", "_"))
  const col = (r: string[], name: string) => {
    const i = head.indexOf(name)
    return i >= 0 ? (r[i] ?? "").trim() : ""
  }
  const findUser = (v: string) => {
    const l = v.toLowerCase()
    return people.find(
      (p) =>
        p.username.toLowerCase() === l ||
        p.name.toLowerCase() === l ||
        p.id === v,
    )
  }
  const findGroup = (v: string) =>
    groups.find((g) => g.name.toLowerCase() === v.toLowerCase() || g.id === v)
  return rows.slice(1).map((r, i) => {
    const problems: string[] = []
    const name = col(r, "name")
    if (!name) problems.push("No name")
    const rawKind = col(r, "kind")
    const kind = rawKind ? kindOfWord(rawKind) : "other"
    if (!kind) problems.push(`Unknown kind “${rawKind}”`)
    const body: AssetBody = {
      name,
      kind: kind || "other",
      category: col(r, "category"),
      description: col(r, "description"),
      notes: col(r, "notes"),
      vendor: col(r, "vendor"),
      model: col(r, "model"),
      serial_number: col(r, "serial_number"),
      asset_tag: col(r, "asset_tag"),
      location: col(r, "location"),
      currency: col(r, "currency").toUpperCase(),
      cost_center: col(r, "cost_center"),
      lifecycle: "active",
      tags: col(r, "tags")
        .split(/[;|]/)
        .map((t) => t.trim())
        .filter(Boolean),
    }
    const owner = col(r, "owner")
    if (owner) {
      const u = findUser(owner)
      const g = u ? undefined : findGroup(owner)
      if (u) body.owner_user_id = u.id
      else if (g) body.owner_group_id = g.id
      else problems.push(`No person or group “${owner}”`)
    }
    for (const [field, key] of [
      ["deputy", "deputy_user_id"],
      ["assigned_to", "assigned_user_id"],
    ] as const) {
      const v = col(r, field)
      if (!v) continue
      const u = findUser(v)
      if (u) body[key] = u.id
      else problems.push(`No person “${v}”`)
    }
    const env = col(r, "environment").toLowerCase()
    if (env) {
      const e = ["production", "staging", "development", "test"].find(
        (x) =>
          x === env || x.startsWith(env) || envLabel(x).toLowerCase() === env,
      )
      if (e) body.environment = e as AssetBody["environment"]
      else problems.push(`Unknown environment “${env}”`)
    }
    const crit = col(r, "criticality")
    if (crit) {
      const n = Number(crit.replace(/\D/g, ""))
      if (n >= 1 && n <= 4) body.criticality = n
      else problems.push("Criticality is 1 to 4")
    }
    const cls = col(r, "classification").toLowerCase()
    if (cls) {
      if (["public", "internal", "confidential", "restricted"].includes(cls))
        body.classification = cls as AssetBody["classification"]
      else problems.push(`Unknown classification “${cls}”`)
    }
    const life = col(r, "lifecycle").toLowerCase()
    if (life) {
      const l = [
        "planned",
        "active",
        "maintenance",
        "deprecated",
        "retired",
      ].find((x) => x === life || lifecycleLabel(x).toLowerCase() === life)
      if (l) body.lifecycle = l as AssetBody["lifecycle"]
      else problems.push(`Unknown lifecycle “${life}”`)
    }
    const billing = col(r, "billing").toLowerCase()
    if (billing) {
      const b = billing.startsWith("month")
        ? "monthly"
        : billing.startsWith("year") || billing.startsWith("annual")
          ? "yearly"
          : billing.startsWith("once") || billing.startsWith("one")
            ? "once"
            : ""
      if (b) body.billing = b
      else problems.push(`Unknown billing “${billing}”`)
    }
    const cost = col(r, "cost").replace(/[^\d.]/g, "")
    if (cost) body.cost = Number(cost)
    for (const field of [
      "purchased_on",
      "warranty_until",
      "expires_on",
    ] as const) {
      const v = col(r, field)
      if (!v) continue
      if (isDate(v)) body[field] = v
      else
        problems.push(`${field.replaceAll("_", " ")} must look like 2027-03-31`)
    }
    const renew = col(r, "auto_renew").toLowerCase()
    if (renew) body.auto_renew = ["yes", "true", "1", "y"].includes(renew)
    for (const field of ["seats", "seats_used"] as const) {
      const v = col(r, field)
      if (!v) continue
      const n = Number(v)
      if (Number.isInteger(n) && n >= 0) body[field] = n
      else problems.push(`${field.replace("_", " ")} must be a whole number`)
    }
    return { body, problems, line: i + 2 }
  })
}

export const kindName = (k: string) => kindOf(k).label
