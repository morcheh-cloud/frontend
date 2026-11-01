"use client"

import { ChevronRight, FileCode, ShieldCheck, ShieldOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Rule, User } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { guarded, isPerson, sortUsers, sudoLabel, viaLabel } from "./meta"
import { useUsersActions } from "./users-actions"

export function SudoTab() {
  const a = useUsersActions()
  const o = a.overview

  if (!o.sudo_installed) {
    return (
      <Empty
        icon={ShieldOff}
        title="sudo isn't installed"
        body="Only root can run commands as root on this server. Install the sudo package with the server's package manager to give it to other accounts."
        className="max-md:mt-4"
      />
    )
  }

  // Everyone who has it, plus the people who could get it.
  const list = sortUsers(
    o.users.filter((u) => u.sudo !== "none" || isPerson(o, u)),
  ).sort((x, y) => Number(y.sudo !== "none") - Number(x.sudo !== "none"))

  return (
    <>
      <Block
        title="Who can use sudo"
        hint={
          o.sudo_group
            ? `Sudo with a password comes from the ${o.sudo_group} group; without a password, from a rule in /etc/sudoers.d/morcheh-<name>.`
            : "Morcheh gives sudo with a rule in /etc/sudoers.d/morcheh-<name>."
        }
      >
        <People users={list} />
      </Block>
      <Block
        title="Rules"
        hint={
          o.sudo_readable
            ? "Everything /etc/sudoers and /etc/sudoers.d grant, line by line. Morcheh only changes its own files."
            : "The sudoers files can't be read with this login."
        }
      >
        {o.sudo_readable && <Rules rules={o.sudo_rules} />}
      </Block>
    </>
  )
}

function Block({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children?: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 max-md:mt-4">
      <div className="max-md:px-4">
        <h3 className="text-body font-medium">{title}</h3>
        <p className="text-body-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  )
}

function People({ users }: { users: User[] }) {
  const { phone } = useServerPage()
  const a = useUsersActions()
  const o = a.overview
  return (
    <ul className="divide-y divide-border border-y border-border md:rounded-2xl md:border">
      {users.map((u) => {
        const guard = guarded(o, u)
        const via = u.sudo_via.map(viaLabel).join(", ")
        const has = u.sudo !== "none"
        const open = () => (guard || !a.canManage ? a.details(u) : a.sudo(u))
        const info = (
          <>
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg md:size-9",
                has ? "bg-brand-soft text-brand-strong" : "bg-muted text-ash",
              )}
            >
              {has ? (
                <ShieldCheck className="size-5 md:size-4" />
              ) : (
                <ShieldOff className="size-5 md:size-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium max-md:text-body">
                {u.name}
              </span>
              <span className="block truncate text-body-sm text-muted-foreground">
                {sudoLabel(u)}
                {via && <span className="text-ash"> · through {via}</span>}
              </span>
            </span>
          </>
        )
        return (
          <li key={u.name}>
            {phone ? (
              <button
                type="button"
                onClick={open}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
              >
                {info}
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </button>
            ) : (
              <div className="flex min-h-14 items-center gap-3 px-4 py-2 text-body-sm">
                {info}
                {guard ? (
                  <span className="text-caption text-ash">{guard}</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!a.canManage}
                    onClick={() => a.sudo(u)}
                  >
                    Change
                  </Button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Rules({ rules }: { rules: Rule[] }) {
  if (rules.length === 0) {
    return (
      <Empty
        icon={FileCode}
        title="No sudo rules"
        body="Nothing in the sudoers files grants sudo to anyone."
      />
    )
  }
  return (
    <ul className="divide-y divide-border border-y border-border md:rounded-2xl md:border">
      {rules.map((r) => (
        <li
          key={`${r.file}:${r.line}`}
          className={cn(
            "flex flex-col gap-1 px-4 py-3",
            !r.active && "opacity-60",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
            <span className="font-mono text-ash">
              {r.file}:{r.line}
              {r.end_line > r.line && `–${r.end_line}`}
            </span>
            {r.managed && <Tag>Morcheh</Tag>}
            {!r.active && <Tag>Ignored by sudo</Tag>}
            {r.full && <Tag>Every command</Tag>}
            {r.nopasswd && <Tag>No password</Tag>}
          </div>
          <code className="font-mono text-caption break-all whitespace-pre-wrap text-foreground">
            {r.text}
          </code>
          <p className="text-caption text-muted-foreground">
            For {r.who.map(whoLabel).join(", ")}
          </p>
        </li>
      ))}
    </ul>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 text-muted-foreground">
      {children}
    </span>
  )
}

// %sudo → the sudo group; #1000 → uid 1000; ALL → everyone.
function whoLabel(w: string) {
  if (w === "ALL") return "everyone"
  if (w.startsWith("%#")) return `group id ${w.slice(2)}`
  if (w.startsWith("%")) return `the ${w.slice(1)} group`
  if (w.startsWith("#")) return `uid ${w.slice(1)}`
  return w
}
