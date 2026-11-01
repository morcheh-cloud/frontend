"use client"

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type { Group, User, UsersOverview } from "@/lib/services"

const tabs = ["people", "groups", "sudo"] as const
const shows = ["people", "all"] as const
export type Tab = (typeof tabs)[number]
export type Show = (typeof shows)[number]

export function useUsersFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("people"),
      q: parseAsString.withDefault(""),
      show: parseAsStringLiteral(shows),
    },
    { history: "replace" },
  )
  return { filters, setFilters }
}

// What useradd and groupadd accept everywhere.
export const NAME_RE = /^[a-z_][a-z0-9_.-]{0,31}$/
export const NAME_HINT =
  "Lowercase letters, digits, _ . and -, starting with a letter or _."

// ---- Accounts ----

// Morcheh can't lock, remove or rename root or the account it logs in with.
export function guarded(o: UsersOverview, u: User) {
  if (u.uid === 0) return "It's root."
  if (u.name === o.login_user) return "Morcheh logs in to this server with it."
  return null
}

// The GECOS name, unless it only repeats the username (root's "root").
export function displayName(u: User) {
  return u.full_name && u.full_name !== u.name ? u.full_name : ""
}

// People: accounts above UID_MIN, plus root and Morcheh's own login (which
// may be a low uid on some images). The rest are service accounts.
export function isPerson(o: UsersOverview, u: User) {
  return !u.system || u.uid === 0 || u.name === o.login_user
}

export type UserState =
  | "active"
  | "locked"
  | "expired"
  | "empty"
  | "nologin"
  | "nopassword"

// One word for whether, and how, the account can log in.
export function userState(u: User): UserState {
  if (u.locked) return "locked"
  if (u.expired) return "expired"
  if (!u.can_login) return "nologin"
  if (u.password === "empty") return "empty"
  if (u.password === "unset") return "nopassword"
  return "active"
}

export const stateMeta: Record<
  UserState,
  { label: string; hint: string; tone: "success" | "warning" | "muted" }
> = {
  active: {
    label: "Active",
    hint: "Can log in with its password or a key",
    tone: "success",
  },
  nopassword: {
    label: "Key only",
    hint: "No password: it logs in with an SSH key, or not at all",
    tone: "success",
  },
  empty: {
    label: "Empty password",
    hint: "Logs in without a password where that is allowed",
    tone: "warning",
  },
  locked: {
    label: "Locked",
    hint: "No logins at all, password or key",
    tone: "muted",
  },
  expired: {
    label: "Expired",
    hint: "Past its expiry date: no logins",
    tone: "warning",
  },
  nologin: {
    label: "No login",
    hint: "Its shell refuses logins (a service account)",
    tone: "muted",
  },
}

export function sudoLabel(u: User) {
  if (u.sudo === "full") {
    return u.sudo_nopasswd ? "Full, no password" : "Full"
  }
  if (u.sudo === "limited") {
    return u.sudo_nopasswd ? "Some commands, no password" : "Some commands"
  }
  return "None"
}

// The level the sudo picker shows; "limited" rules aren't one of its choices.
export type SudoLevel = "none" | "password" | "nopasswd"

export function sudoLevel(u: User): SudoLevel {
  if (u.sudo !== "full") return "none"
  return u.sudo_nopasswd ? "nopasswd" : "password"
}

export const sudoLevels: {
  value: SudoLevel
  label: string
  hint: string
}[] = [
  { value: "none", label: "No sudo", hint: "Can't run commands as root." },
  {
    value: "password",
    label: "Sudo with password",
    hint: "Every command as root, after typing their own password.",
  },
  {
    value: "nopasswd",
    label: "Sudo without password",
    hint: "Every command as root without asking. Handy for automation; risky for people.",
  },
]

// "group:sudo" → "the sudo group"; a file → its path.
export function viaLabel(v: string) {
  return v.startsWith("group:") ? `the ${v.slice(6)} group` : v
}

export function sortUsers(list: User[]) {
  const rank = (u: User) => (u.uid === 0 ? 0 : u.system ? 2 : 1)
  return [...list].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
  )
}

export function filterUsers(o: UsersOverview, show: Show, q: string) {
  const needle = q.trim().toLowerCase()
  return sortUsers(o.users).filter((u) => {
    if (show === "people" && !isPerson(o, u)) return false
    if (!needle) return true
    return [u.name, u.full_name, String(u.uid), ...u.groups].some((s) =>
      s.toLowerCase().includes(needle),
    )
  })
}

// Shells that refuse logins, taken from the service accounts that use one
// (its path differs between distributions).
export function shellChoices(o: UsersOverview, current?: string) {
  const out = [...o.shells]
  const nologin = o.users.find((u) => /\/(nologin|false)$/.test(u.shell))?.shell
  for (const s of [nologin, current]) {
    if (s && !out.includes(s)) out.push(s)
  }
  return out
}

export function defaultShell(o: UsersOverview) {
  return o.shells.includes("/bin/bash") ? "/bin/bash" : "/bin/sh"
}

// ---- Groups ----

export function sortGroups(list: Group[]) {
  return [...list].sort(
    (a, b) =>
      Number(a.system) - Number(b.system) || a.name.localeCompare(b.name),
  )
}

export function filterGroups(list: Group[], show: Show, q: string) {
  const needle = q.trim().toLowerCase()
  return sortGroups(list).filter((g) => {
    if (show === "people" && g.system && !g.sudo) return false
    if (!needle) return true
    return [g.name, String(g.gid), ...g.members].some((s) =>
      s.toLowerCase().includes(needle),
    )
  })
}

// Members, primary or listed: usermod -g doesn't add a name to /etc/group.
export function everyMember(g: Group) {
  return [...new Set([...g.primary, ...g.members])]
}

// ---- Time ----

// Shadow dates: YYYY-MM-DD, days since the epoch in UTC.
export function day(d: string | undefined) {
  if (!d) return "—"
  const t = Date.parse(`${d}T00:00:00Z`)
  if (Number.isNaN(t)) return d
  return new Date(t).toLocaleDateString("en", {
    timeZone: "UTC",
    dateStyle: "medium",
  })
}

export function ago(iso: string | undefined, now = Date.now()) {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`
  return new Date(t).toLocaleDateString("en", { dateStyle: "medium" })
}

export function fullTime(iso: string | undefined) {
  if (!iso) return undefined
  const t = Date.parse(iso)
  return Number.isNaN(t)
    ? iso
    : new Date(t).toLocaleString("en", {
        dateStyle: "medium",
        timeStyle: "short",
      })
}

// A random password from characters that survive any terminal and keyboard.
export function generatePassword(length = 20) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_.!@#%+="
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}
