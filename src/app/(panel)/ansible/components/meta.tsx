import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Loader2,
  OctagonX,
} from "lucide-react"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type { AnsibleRun, HostStats, TaskResult } from "@/lib/services"
import { cn } from "@/lib/utils"

export type RunState = AnsibleRun["state"]

export const runStateLabels: Record<RunState, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
  interrupted: "Interrupted",
}

const stateIcons = {
  queued: Clock,
  running: Loader2,
  succeeded: CircleCheck,
  failed: CircleX,
  canceled: Ban,
  interrupted: OctagonX,
} as const

// A run's state as icon + text: the color only backs the word up.
export function RunStateBadge({
  state,
  className,
}: {
  state: string
  className?: string
}) {
  const s = (state in runStateLabels ? state : "queued") as RunState
  const Icon = stateIcons[s]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap",
        s === "succeeded" && "text-success",
        s === "failed" && "text-destructive",
        s === "interrupted" && "text-warning",
        (s === "canceled" || s === "queued") && "text-muted-foreground",
        s === "running" && "text-brand",
        className,
      )}
    >
      <Icon className={cn("size-4", s === "running" && "animate-spin")} />
      {runStateLabels[s]}
    </span>
  )
}

export const resultLabels: Record<TaskResult["status"], string> = {
  running: "Running",
  ok: "OK",
  changed: "Changed",
  failed: "Failed",
  ignored: "Failed (ignored)",
  skipped: "Skipped",
  unreachable: "Unreachable",
}

export function resultTone(status: string) {
  switch (status) {
    case "ok":
      return "text-success"
    case "changed":
      return "text-warning"
    case "failed":
    case "unreachable":
      return "text-destructive"
    case "running":
      return "text-brand"
    default:
      return "text-muted-foreground"
  }
}

export function ResultIcon({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const Icon =
    status === "running"
      ? Loader2
      : status === "ok" || status === "changed"
        ? CircleCheck
        : status === "failed" || status === "unreachable"
          ? CircleX
          : CircleDashed
  return (
    <Icon
      aria-hidden
      className={cn(
        "size-4 shrink-0",
        resultTone(status),
        status === "running" && "animate-spin",
        className,
      )}
    />
  )
}

export type Totals = {
  hosts: number
  ok: number
  changed: number
  failed: number
  unreachable: number
  skipped: number
}

// The recap summed over hosts (failed counts hosts with any failure).
export function totals(recap: Record<string, HostStats> | undefined): Totals {
  const t = {
    hosts: 0,
    ok: 0,
    changed: 0,
    failed: 0,
    unreachable: 0,
    skipped: 0,
  }
  for (const s of Object.values(recap ?? {})) {
    t.hosts++
    t.ok += s.ok
    t.changed += s.changed
    t.skipped += s.skipped
    if (s.failed > 0) t.failed++
    if (s.unreachable > 0) t.unreachable++
  }
  return t
}

// A host's outcome in one word, from its recap line.
export function hostOutcome(s: HostStats | undefined) {
  if (!s) return "pending"
  if (s.unreachable > 0) return "unreachable"
  if (s.failed > 0) return "failed"
  if (s.changed > 0) return "changed"
  return "ok"
}

// Compact recap text: "3 ok · 1 changed · 1 failed".
export function RecapText({
  recap,
  className,
}: {
  recap: Record<string, HostStats> | undefined
  className?: string
}) {
  const t = totals(recap)
  if (t.hosts === 0) return null
  const parts: { n: number; label: string; tone: string }[] = [
    { n: t.ok, label: "ok", tone: "" },
    { n: t.changed, label: "changed", tone: "text-warning" },
    {
      n: t.failed,
      label: t.failed === 1 ? "host failed" : "hosts failed",
      tone: "text-destructive",
    },
    {
      n: t.unreachable,
      label: "unreachable",
      tone: "text-destructive",
    },
  ]
  return (
    <span className={cn("text-caption text-muted-foreground", className)}>
      {parts
        .filter((p) => p.n > 0 || p.label === "ok")
        .map((p, i) => (
          <span key={p.label}>
            {i > 0 && " · "}
            <span className={p.n > 0 ? p.tone : undefined}>
              {p.n} {p.label}
            </span>
          </span>
        ))}
    </span>
  )
}

export function duration(from?: string, to?: string) {
  if (!from) return ""
  const ms =
    (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// ---- URL state of /ansible ----

const tabs = ["playbooks", "runs"] as const
const runShows = ["all", "running", "failed", "succeeded"] as const

const filters = {
  tab: parseAsStringLiteral(tabs).withDefault("playbooks"),
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(runShows).withDefault("all"),
}

export function useAnsibleFilters() {
  return useQueryStates(filters, { history: "replace" })
}

export const ansibleHref = createSerializer(filters)

// ---- Starter playbooks ----

export const templates: { key: string; label: string; content: string }[] = [
  {
    key: "blank",
    label: "Blank",
    content: `- name: My playbook
  hosts: all
  become: true
  tasks:
    - name: Say hello
      ansible.builtin.debug:
        msg: "Hello from {{ inventory_hostname }}"
`,
  },
  {
    key: "update",
    label: "Update packages",
    content: `- name: Update packages
  hosts: all
  become: true
  tasks:
    - name: Upgrade (Debian, Ubuntu)
      ansible.builtin.apt:
        update_cache: true
        upgrade: dist
      when: ansible_facts.pkg_mgr == "apt"

    - name: Upgrade (RHEL, Fedora, Rocky, Alma)
      ansible.builtin.dnf:
        name: "*"
        state: latest
      when: ansible_facts.pkg_mgr == "dnf"

    - name: Is a reboot needed?
      ansible.builtin.stat:
        path: /var/run/reboot-required
      register: reboot_required

    - name: Tell about it
      ansible.builtin.debug:
        msg: "This server needs a reboot"
      when: reboot_required.stat.exists | default(false)
`,
  },
  {
    key: "packages",
    label: "Install packages",
    content: `- name: Install packages
  hosts: all
  become: true
  vars:
    packages:
      - curl
      - htop
  tasks:
    - name: Install {{ packages | join(', ') }}
      ansible.builtin.package:
        name: "{{ packages }}"
        state: present
`,
  },
  {
    key: "user",
    label: "Add a user with a key",
    content: `- name: Add a user
  hosts: all
  become: true
  vars:
    username: deploy
    ssh_key: "ssh-ed25519 AAAA... you@laptop"
  tasks:
    - name: Create {{ username }}
      ansible.builtin.user:
        name: "{{ username }}"
        shell: /bin/bash
        state: present

    - name: Make ~/.ssh
      ansible.builtin.file:
        path: "/home/{{ username }}/.ssh"
        state: directory
        owner: "{{ username }}"
        mode: "0700"

    - name: Allow the key
      ansible.builtin.lineinfile:
        path: "/home/{{ username }}/.ssh/authorized_keys"
        line: "{{ ssh_key }}"
        create: true
        owner: "{{ username }}"
        mode: "0600"
`,
  },
  {
    key: "facts",
    label: "Gather facts",
    content: `- name: What's on these servers
  hosts: all
  gather_facts: true
  tasks:
    - name: Summary
      ansible.builtin.debug:
        msg: >-
          {{ ansible_facts.distribution }} {{ ansible_facts.distribution_version }},
          {{ ansible_facts.processor_vcpus }} CPUs,
          {{ (ansible_facts.memtotal_mb / 1024) | round(1) }} GB RAM,
          uptime {{ (ansible_facts.uptime_seconds / 86400) | round(1) }} days
`,
  },
]
