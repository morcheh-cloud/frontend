import { API_URL } from "@/lib/api"
import type { ApiToken } from "@/lib/services"

// The API's address as a script outside the browser must write it. In
// development without NEXT_PUBLIC_API_URL the API is on this origin.
export function apiAddress() {
  const base =
    typeof window === "undefined"
      ? API_URL
      : new URL(API_URL || "/", window.location.origin).href
  return base.replace(/\/+$/, "")
}

export const expiryChoices = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "0", label: "Never" },
] as const

export type Expiry = (typeof expiryChoices)[number]["value"]

const DAY = 24 * 60 * 60 * 1000

// Expired, ends within a week, or fine.
export function tokenState(t: ApiToken): "expired" | "soon" | "ok" {
  if (t.expired) return "expired"
  if (!t.expires_at) return "ok"
  return new Date(t.expires_at).getTime() - Date.now() < 7 * DAY ? "soon" : "ok"
}

// Ready-to-run examples with the token filled in.
export function curlExample(token: string) {
  return `curl -H "Authorization: Bearer ${token}" \\\n  ${apiAddress()}/auth/me`
}

export function cliExample(token: string) {
  return `morche login --url ${apiAddress()}\n# paste the token when it asks: ${token.slice(0, 14)}…\nmorche servers list`
}

export function envExample(token: string) {
  return `export MORCHE_URL=${apiAddress()}\nexport MORCHE_TOKEN=${token}\nmorche whoami`
}
