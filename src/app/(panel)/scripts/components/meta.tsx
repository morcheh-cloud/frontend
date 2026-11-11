import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type { Script } from "@/lib/services"

export type Interpreter = Script["interpreter"]
export type RunAs = Script["run_as"]

export const interpreterLabels: Record<Interpreter, string> = {
  bash: "Bash",
  sh: "sh (POSIX)",
  python3: "Python 3",
}

export const runAsLabels: Record<RunAs, string> = {
  user: "Login user",
  root: "root (sudo)",
}

export const runAsHints: Record<RunAs, string> = {
  user: "As the user Morche logs in with on each server.",
  root: "Through sudo when the login user isn't root. Servers where it can't become root fail with a clear message.",
}

// "10m", "1h 30m", "45s": a timeout in a few characters.
export function timeoutText(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`
}

// An exit code in words, for the codes people meet most.
export function exitText(code: number | undefined, timedOut?: boolean) {
  if (timedOut) return "Stopped: past its time limit"
  if (code === undefined) return ""
  if (code === 0) return "Exit code 0"
  if (code === 127) return "Exit code 127 (command not found)"
  if (code === 126) return "Exit code 126 (not executable)"
  if (code === 143) return "Exit code 143 (stopped)"
  if (code === 130) return "Exit code 130 (interrupted)"
  return `Exit code ${code}`
}

// ---- URL state of /scripts ----

const tabs = ["scripts", "runs"] as const
const runShows = ["all", "running", "failed", "succeeded"] as const

const filters = {
  tab: parseAsStringLiteral(tabs).withDefault("scripts"),
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(runShows).withDefault("all"),
}

export function useScriptsFilters() {
  return useQueryStates(filters, { history: "replace" })
}

export const scriptsHref = createSerializer(filters)

// ---- Starter scripts ----

export const templates: {
  key: string
  label: string
  interpreter: Interpreter
  run_as: RunAs
  content: string
  params?: Script["params"]
}[] = [
  {
    key: "blank",
    label: "Blank",
    interpreter: "bash",
    run_as: "user",
    content: `#!/usr/bin/env bash
set -euo pipefail

echo "Hello from $(hostname)"
`,
  },
  {
    key: "disk",
    label: "Disk space",
    interpreter: "sh",
    run_as: "user",
    content: `# Filesystems and the biggest folders under /var
df -h -x tmpfs -x devtmpfs
echo
du -xh --max-depth=1 /var 2>/dev/null | sort -rh | head -n 10
`,
  },
  {
    key: "restart",
    label: "Restart a service",
    interpreter: "bash",
    run_as: "root",
    params: [
      {
        name: "SERVICE",
        label: "Service",
        default: "nginx",
        required: true,
      },
    ],
    content: `#!/usr/bin/env bash
set -euo pipefail

systemctl restart "$SERVICE"
systemctl --no-pager --lines=5 status "$SERVICE"
`,
  },
  {
    key: "updates",
    label: "Pending updates",
    interpreter: "sh",
    run_as: "user",
    content: `# Lists packages waiting to be upgraded (changes nothing)
if command -v apt >/dev/null 2>&1; then
  apt list --upgradable 2>/dev/null | tail -n +2
elif command -v dnf >/dev/null 2>&1; then
  dnf -q check-update || true
else
  echo "No apt or dnf here."
fi
`,
  },
  {
    key: "python",
    label: "Python",
    interpreter: "python3",
    run_as: "user",
    content: `import os
import platform

print(platform.node(), platform.platform())
print("load:", os.getloadavg())
`,
  },
]
