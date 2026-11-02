"use client"

import { useEffect, useState } from "react"

import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Database } from "@/lib/services"
import { useExplain } from "../../api"
import { num } from "./format"

export type ExplainTarget = { query: string; database?: string }

const mongoExample = `{"collection": "orders", "filter": {"status": "open"}}`

// The plan the database would use, without running the statement. A query
// from the lists arrives filled in; an empty one is typed here.
export function ExplainDialog({
  database: d,
  target,
  open,
  onOpenChange,
}: {
  database: Database
  target: ExplainTarget
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const explain = useExplain(d.id)
  const [query, setQuery] = useState(target.query)
  const [db, setDb] = useState(target.database ?? "")
  const { reset, mutate } = explain
  const mongo = d.engine === "mongodb"

  // A new target replaces what was typed and runs right away when it has a
  // statement, since that's why it was opened.
  useEffect(() => {
    if (!open) return
    setQuery(target.query)
    setDb(target.database ?? "")
    reset()
    if (target.query.trim()) {
      mutate({ query: target.query, database: target.database || undefined })
    }
  }, [open, target, reset, mutate])

  const run = () =>
    explain.mutate({ query: query.trim(), database: db.trim() || undefined })
  const plan = explain.data

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Explain"
      description="Shows how the database would run it. Nothing is executed."
      className="sm:max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={
              !query.trim() || (mongo && !db.trim()) || explain.isPending
            }
            onClick={run}
          >
            {explain.isPending ? "Explaining…" : "Explain"}
          </Button>
        </>
      }
    >
      <div className="flex max-h-[65svh] flex-col gap-4 overflow-y-auto max-md:max-h-none">
        <Field
          label={mongo ? "Query" : "Statement"}
          hint={
            mongo
              ? "JSON with the collection and its filter (sort, projection optional)."
              : "Parameters ($1, ?) are fine for PostgreSQL and MySQL."
          }
        >
          {(p) => (
            <Textarea
              {...p}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mongo ? mongoExample : "SELECT …"}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              rows={5}
              className="max-h-48 font-mono text-caption"
            />
          )}
        </Field>
        {d.engine !== "redis" && (
          <Field
            label="Database"
            hint={
              mongo
                ? "Required: the database holding the collection."
                : "Empty = the one the connection opens."
            }
          >
            {(p) => (
              <Input
                {...p}
                value={db}
                onChange={(e) => setDb(e.target.value)}
                placeholder={d.dbname || (mongo ? "shop" : "")}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Field>
        )}
        {explain.error && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-body-sm"
          >
            {explain.error.message}
          </p>
        )}
        {plan && (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-body-sm">
              {plan.cost != null && (
                <span>
                  <span className="text-muted-foreground">Estimated cost </span>
                  <span className="tabular-nums">{num(plan.cost)}</span>
                </span>
              )}
              {plan.rows != null && (
                <span>
                  <span className="text-muted-foreground">Rows </span>
                  <span className="tabular-nums">{num(plan.rows)}</span>
                </span>
              )}
            </div>
            {plan.warnings.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {plan.warnings.map((w) => (
                  <li
                    key={w}
                    className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-body-sm"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            )}
            <pre className="max-h-88 overflow-auto rounded-lg border border-border bg-subtle p-3 font-mono text-caption leading-relaxed whitespace-pre">
              {pretty(plan.plan, plan.format)}
            </pre>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}

function pretty(plan: string, format: "text" | "json") {
  if (format !== "json") return plan
  try {
    return JSON.stringify(JSON.parse(plan), null, 2)
  } catch {
    return plan
  }
}
