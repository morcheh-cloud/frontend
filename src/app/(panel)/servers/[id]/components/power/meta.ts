import type { PowerAction } from "./api"

export const actionMeta: Record<
  PowerAction,
  {
    verb: string
    noun: string
    now: string
    sent: string
    effect: string
    placeholder: string
  }
> = {
  reboot: {
    verb: "Reboot",
    noun: "Reboot",
    now: "Reboot now",
    sent: "Rebooting",
    effect:
      "Everything running stops and starts again. Open terminals and SSH sessions are cut; services set to start at boot come back by themselves.",
    placeholder: "Rebooting for a kernel update, back in a minute",
  },
  poweroff: {
    verb: "Shut down",
    noun: "Shutdown",
    now: "Shut down now",
    sent: "Shutting down",
    effect:
      "The server powers off and stays off. Everything running on it stops and every session is cut.",
    placeholder: "Shutting down for maintenance",
  },
}

// Scheduled actions' "in …" choices, in minutes.
export const delays = [
  { value: "1", label: "1 minute" },
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "360", label: "6 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "24 hours" },
]

// A time today as "18:05", any other day as "Nov 2, 18:05" (the browser's
// time zone).
export function clock(iso: string) {
  const d = new Date(iso)
  const today = d.toDateString() === new Date().toDateString()
  return d.toLocaleString("en", {
    ...(today ? {} : { month: "short", day: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function fullDate(iso: string) {
  return new Date(iso).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

// "in 4 min", "in 1 h 20 min", "now".
export function countdown(ms: number) {
  const m = Math.ceil(ms / 60_000)
  if (m <= 0) return "now"
  if (m < 60) return `in ${m} min`
  const h = Math.floor(m / 60)
  return m % 60 ? `in ${h} h ${m % 60} min` : `in ${h} h`
}

// Seconds as "48 s" or "2 min 5 s".
export function took(ms: number) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} s`
  return s % 60
    ? `${Math.floor(s / 60)} min ${s % 60} s`
    : `${Math.floor(s / 60)} min`
}
