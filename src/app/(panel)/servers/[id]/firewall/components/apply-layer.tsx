"use client"

import { useState } from "react"
import { toast } from "sonner"

import {
  Checklist,
  ServerChecklist,
} from "@/app/(panel)/servers/components/server-checklist"
import { AccessLayer } from "@/components/access/grants"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { Button } from "@/components/ui/button"
import type { FilterRule } from "@/lib/services"
import { useServerPage } from "../../components/server-page"
import { useApplyFirewallRules } from "../api"
import { useFirewallActions } from "./firewall-actions"
import {
  ACTION_LABELS,
  canCopy,
  ruleFrom,
  ruleName,
  rulePort,
  toBody,
} from "./meta"

const plural = (n: number, word: string) =>
  n === 1 ? `1 ${word}` : `${n} ${word}s`

// Copies rules from here to other servers, in the background. It only ever
// adds, so ticking one server too many can't take anything away from it.
export function ApplyLayer({
  open,
  onOpenChange,
  rules,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rules?: FilterRule[]
}) {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const access = useAccess()
  const jobs = useJobActions()
  const send = useApplyFirewallRules()
  const offered = a.overview.rules.filter(canCopy)
  const [ticked, setTicked] = useState(
    () => new Set((rules ?? offered).map((r) => r.id)),
  )
  const [servers, setServers] = useState<Map<string, string>>(new Map())
  const chosen = offered.filter((r) => ticked.has(r.id))

  function submit() {
    send.mutate(
      {
        server_ids: [...servers.keys()],
        rules: chosen.map(toBody),
      },
      {
        onSuccess: (job) => {
          jobs.track(job)
          onOpenChange(false)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  return (
    <AccessLayer
      open={open}
      onOpenChange={onOpenChange}
      title="Apply rules to other servers"
      description="Adds these rules to the servers you tick. Rules they already have are skipped, and nothing is removed."
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            size={phone ? "lg" : "default"}
            disabled={
              chosen.length === 0 || servers.size === 0 || send.isPending
            }
            onClick={submit}
          >
            {servers.size > 0
              ? `Add to ${plural(servers.size, "server")}`
              : "Add to servers"}
          </Button>
          <Button
            size={phone ? "lg" : "default"}
            variant={phone ? "ghost" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium">
            Rules · {chosen.length} of {offered.length}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <Checklist
              empty="This server has no rules to copy."
              items={offered.map((r) => ({
                id: r.id,
                label: `${ACTION_LABELS[r.action]} ${ruleName(r)}`,
                meta: [rulePort(r), ruleFrom(r), r.comment]
                  .filter(Boolean)
                  .join(" · "),
              }))}
              checked={(id) => ticked.has(id)}
              onToggle={(id, on) =>
                setTicked((t) => {
                  const next = new Set(t)
                  if (on) next.add(id)
                  else next.delete(id)
                  return next
                })
              }
              tall={!phone}
            />
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium">
            Servers{servers.size > 0 && ` · ${servers.size}`}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <ServerChecklist
              value={servers}
              onChange={setServers}
              phone={phone}
              canPick={(s) =>
                s.id !== server.id &&
                atLeast(access.serverLevel(s.id, s.workspace_id), "engineer")
              }
            />
          </div>
          <p className="text-caption text-ash">
            A server is left alone if these rules could cut SSH off: change that
            one from its own page, where you can confirm it. If its firewall is
            off, the rules wait until it's on.
          </p>
        </section>
      </div>
    </AccessLayer>
  )
}
