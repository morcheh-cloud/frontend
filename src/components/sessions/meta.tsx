import {
  CircleHelp,
  LogIn,
  LogOut,
  type LucideIcon,
  Monitor,
  ShieldX,
  Smartphone,
  Tablet,
  UserX,
} from "lucide-react"

import type { PanelSession, SignInEntry } from "@/lib/services"

export type DeviceKind = PanelSession["device_kind"]

export const deviceIcon: Record<DeviceKind, LucideIcon> = {
  desktop: Monitor,
  phone: Smartphone,
  tablet: Tablet,
  other: CircleHelp,
}

export const deviceName = (d: { device: string }) =>
  d.device || "Unknown device"

export type SignInKind = SignInEntry["kind"]
export type Tone = "ok" | "bad" | "quiet"

export const kindMeta: Record<
  SignInKind,
  { label: string; icon: LucideIcon; tone: Tone }
> = {
  signed_in: { label: "Signed in", icon: LogIn, tone: "ok" },
  failed: { label: "Failed sign-in", icon: ShieldX, tone: "bad" },
  signed_out: { label: "Signed out", icon: LogOut, tone: "quiet" },
  ended: { label: "Session ended", icon: UserX, tone: "quiet" },
}

// The filter choices for the log's "Result" menu.
export const kindChoices: { value: SignInKind; label: string }[] = [
  { value: "signed_in", label: "Signed in" },
  { value: "failed", label: "Failed" },
  { value: "signed_out", label: "Signed out" },
  { value: "ended", label: "Ended" },
]

const reasons: Record<string, string> = {
  unknown_user: "No account by that name",
  wrong_password: "Wrong password",
  blocked_account: "Account can't sign in",
  address_not_allowed: "Address not allowed",
  everywhere: "Signed out everywhere",
  by_self: "Ended from another device",
  by_admin: "Ended by an admin",
  by_admin_everywhere: "Signed out everywhere by an admin",
  not_me: "Ended: marked as not them",
  password_changed: "Password changed",
}

// What happened, in a few words: "Wrong password", "Ended by Sara".
export function reasonText(e: SignInEntry) {
  if (e.reason === "by_admin" && e.by_name) return `Ended by ${e.by_name}`
  if (e.reason === "by_admin_everywhere" && e.by_name)
    return `Signed out everywhere by ${e.by_name}`
  return reasons[e.reason] ?? e.reason
}

export function eventText(e: SignInEntry) {
  const label = kindMeta[e.kind]?.label ?? e.kind
  const why = e.reason ? reasonText(e) : ""
  if (e.kind === "failed" && why) return why
  return why ? `${label} · ${why}` : label
}

// "Active now" for a session seen in the last two minutes.
export function isActive(iso: string) {
  return Date.now() - new Date(iso).getTime() < 2 * 60_000
}
