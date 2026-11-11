"use client"

import { BellOff, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { useDatabaseAlertRules } from "@/app/(panel)/alerts/api"
import { AlertEventList } from "@/app/(panel)/alerts/components/events-list"
import { MutesNotice } from "@/app/(panel)/alerts/components/mutes"
import {
  RuleActionsProvider,
  useRuleActions,
} from "@/app/(panel)/alerts/components/rule-actions"
import {
  FiringNotice,
  RulesList,
} from "@/app/(panel)/alerts/components/rules-list"
import {
  alertsHref,
  byRuleState,
  metricOf,
  presets,
  targetOf,
} from "@/app/(panel)/alerts/components/rules-meta"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Panel, useDashboard } from "./parts"

// The alert rules that watch this database (unreachable, health critical),
// mutes for maintenance, and what they sent.
export function AlertsTab() {
  const { phone, operator } = useDashboard()
  const router = useRouter()
  return (
    <RuleActionsProvider
      phone={phone}
      canMute={operator}
      activity={(r) =>
        router.push(alertsHref("/alerts", { tab: "activity", rule: r.id }))
      }
    >
      <Content />
    </RuleActionsProvider>
  )
}

function Content() {
  const { database, phone } = useDashboard()
  const rules = useDatabaseAlertRules(database.id)
  const a = useRuleActions()
  const list = [...(rules.data ?? [])].sort(byRuleState)

  const actions = (
    <>
      {a.canMute && (
        <Button
          variant="ghost"
          size={phone ? "icon" : "sm"}
          className="max-md:size-10"
          aria-label="Mute alerts on this database"
          onClick={() =>
            a.mute({
              target: {
                kind: "database",
                id: database.id,
                name: database.name,
              },
            })
          }
        >
          <BellOff />
          {!phone && "Mute"}
        </Button>
      )}
      {a.can && list.length > 0 && (
        <Button
          variant="ghost"
          size={phone ? "icon" : "sm"}
          className="max-md:size-10"
          aria-label="New alert rule"
          onClick={() => a.create({ database: database.id })}
        >
          <Plus />
          {!phone && "New rule"}
        </Button>
      )}
    </>
  )

  return (
    <div className="flex flex-col md:gap-4">
      {list.length > 0 && (
        <div className={cn(phone && "px-4 pt-3")}>
          <FiringNotice rules={list} targetId={database.id} />
        </div>
      )}
      <MutesNotice
        databaseId={database.id}
        canEnd={a.canMute}
        className={cn(phone && "mx-4 mt-3")}
      />
      <Panel
        title="Alert rules"
        caption={
          !phone &&
          (list.length
            ? "The rules that watch this database."
            : "Get a message when this database needs a look.")
        }
        actions={actions}
        flush={list.length > 0}
      >
        {rules.isPending ? null : list.length ? (
          <RulesList rules={list} phone={phone} targetId={database.id} />
        ) : (
          <QuickStart />
        )}
      </Panel>
      <Panel
        title="Recent alerts"
        flush
        actions={
          <Button
            variant="ghost"
            size="sm"
            className="max-md:h-10"
            render={<Link href={alertsHref("/alerts", { tab: "activity" })} />}
            nativeButton={false}
          >
            All activity
          </Button>
        }
      >
        <AlertEventList
          databaseId={database.id}
          limit={20}
          phone={phone}
          emptyText="No rule has fired on this database yet."
        />
      </Panel>
    </div>
  )
}

// Nothing set up yet: one tap starts the common ones for this database.
function QuickStart() {
  const { database, phone } = useDashboard()
  const a = useRuleActions()
  if (!a.can) {
    return (
      <p className="text-body-sm text-muted-foreground">
        No rule watches this database. Someone with Engineer access to the
        workspace can add one.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {presets
        .filter((p) => targetOf(p.metric) === "database")
        .map((p) => {
          const Icon = metricOf(p.metric).icon
          return (
            <Button
              key={p.key}
              variant="outline"
              className={cn(phone ? "h-11 w-full" : "h-9")}
              onClick={() => a.create({ preset: p, database: database.id })}
            >
              <Icon />
              {p.name}
            </Button>
          )
        })}
    </div>
  )
}
