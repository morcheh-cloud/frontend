"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  Check,
  CopyPlus,
  GripVertical,
  ListChecks,
  Lock,
  Pencil,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useOpen } from "@/hooks/useOpen"
import type { FilterRule } from "@/lib/services"
import { cn } from "@/lib/utils"
import { BarSlot } from "../../components/bar-slots"
import {
  Empty,
  Facts,
  type Item,
  ItemMenu,
  SearchBox,
  SheetItems,
} from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useFirewallActions } from "./firewall-actions"
import {
  ACTION_LABELS,
  canCopy,
  lets,
  ruleFrom,
  ruleMatches,
  ruleName,
  rulePort,
  stops,
  useFirewallFilters,
} from "./meta"
import { ActionTag, Badges, Chips, ruleBadges, SshLock } from "./parts"

// An IPv6-only rule lives in its own list, after all the others.
const canMove = (r: FilterRule) => r.family !== "v6"

function useMoveItems(rule: FilterRule): Item[] {
  const a = useFirewallActions()
  const order = a.overview.rules.filter(canMove)
  const at = order.findIndex((r) => r.id === rule.id)
  if (!a.overview.capabilities.reorder || at < 0 || order.length < 2) return []
  const move = (before: string) => () => {
    void a.moveRule(rule, before)
  }
  return [
    {
      key: "top",
      label: "Move to top",
      icon: <ArrowUpToLine />,
      disabled: a.locked || at === 0,
      onSelect: move(order[0]?.id ?? ""),
    },
    {
      key: "up",
      label: "Move up",
      icon: <ArrowUp />,
      disabled: a.locked || at === 0,
      onSelect: move(order[at - 1]?.id ?? ""),
    },
    {
      key: "down",
      label: "Move down",
      icon: <ArrowDown />,
      disabled: a.locked || at === order.length - 1,
      onSelect: move(order[at + 2]?.id ?? ""),
    },
  ]
}

function useRuleMenu(rule: FilterRule): Item[][] {
  const a = useFirewallActions()
  const moves = useMoveItems(rule)
  if (!a.manage) return []
  const edit: Item[] = rule.editable
    ? [
        {
          key: "edit",
          label: "Edit",
          icon: <Pencil />,
          disabled: a.locked,
          onSelect: () => a.editRule(rule),
        },
      ]
    : []
  const remove: Item[] = rule.deletable
    ? [
        {
          key: "delete",
          label: "Delete",
          icon: <Trash2 />,
          destructive: true,
          disabled: a.locked,
          onSelect: () => a.deleteRules([rule]),
        },
      ]
    : []
  const copy: Item[] = canCopy(rule)
    ? [
        {
          key: "apply",
          label: "Apply to other servers…",
          icon: <CopyPlus />,
          onSelect: () => a.applyTo([rule]),
        },
      ]
    : []
  return [[...edit, ...copy], moves, remove]
}

export function RulesTab() {
  const { phone } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const { filters, setFilters } = useFirewallFilters()
  const q = filters.q.trim()

  const rules = useMemo(
    () =>
      o.rules.filter((r) => {
        if (filters.show === "allow" && !lets(r)) return false
        if (filters.show === "block" && !stops(r)) return false
        return !q || ruleMatches(r, q)
      }),
    [o.rules, filters.show, q],
  )
  const allowed = o.rules.filter(lets).length
  const blocked = o.rules.filter(stops).length

  return (
    <>
      <BarSlot slot="search">
        <SearchBox
          value={filters.q}
          onChange={(v) => setFilters({ q: v || null })}
          placeholder="Search rules"
          label="Search rules"
          className="w-full md:w-full"
        />
      </BarSlot>
      {o.rules.length > 0 && (
        <BarSlot slot="filters">
          <Chips
            items={[
              { value: "allow", label: `Allow ${allowed}` },
              { value: "block", label: `Block ${blocked}` },
            ]}
            value={filters.show}
            onChange={(v) =>
              setFilters({ show: v === filters.show ? null : v })
            }
          />
        </BarSlot>
      )}
      {o.rules.length === 0 ? (
        <Empty
          icon={ListChecks}
          title="No rules yet"
          className="max-md:mt-4"
          body={
            o.active
              ? defaultLine(o.defaults.incoming)
              : "Add what should stay open, then turn the firewall on."
          }
          action={
            a.manage && (
              <Button
                className="max-md:h-11 max-md:w-full"
                disabled={a.locked}
                onClick={() => a.addRule()}
              >
                Add a rule
              </Button>
            )
          }
        />
      ) : rules.length === 0 ? (
        <Empty
          icon={ListChecks}
          title="No rules match"
          className="max-md:mt-4"
          body="Try another search or filter."
          action={
            <Button
              variant="outline"
              className="max-md:h-11 max-md:w-full"
              onClick={() => setFilters({ q: null, show: null })}
            >
              Clear filters
            </Button>
          }
        />
      ) : phone ? (
        <PhoneList rules={rules} />
      ) : (
        <DesktopTable rules={rules} filtered={rules.length < o.rules.length} />
      )}
    </>
  )
}

const defaultLine = (policy: string) => {
  if (policy === "allow") return "Everything gets through unless you block it."
  return "Nothing gets in unless a rule allows it."
}

const defaultName = (policy: string) =>
  policy === "allow" ? "Allowed" : policy === "reject" ? "Refused" : "Blocked"

function DesktopTable({
  rules,
  filtered,
}: {
  rules: FilterRule[]
  filtered: boolean
}) {
  const a = useFirewallActions()
  const o = a.overview
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  // The new order while the server catches up, so a dropped row stays put.
  const [draft, setDraft] = useState<string[]>()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const movable = rules.filter(canMove)
  // Only the whole list has an order to change.
  const dragging =
    a.manage && o.capabilities.reorder && !filtered && movable.length > 1
  const shown = draft
    ? rules.toSorted((x, y) => draft.indexOf(x.id) - draft.indexOf(y.id))
    : rules

  async function drop({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const ids = movable.map((r) => r.id)
    const next = arrayMove(
      ids,
      ids.indexOf(String(active.id)),
      ids.indexOf(String(over.id)),
    )
    const rule = movable.find((r) => r.id === active.id)
    if (!rule) return
    setDraft([...next, ...rules.filter((r) => !canMove(r)).map((r) => r.id)])
    await a.moveRule(rule, next[next.indexOf(rule.id) + 1] ?? "")
    setDraft(undefined)
  }

  const selectable = a.manage ? rules.filter((r) => r.deletable) : []
  const selected = selectable.filter((r) => picked[r.id])
  const toggle = (ids: string[], on: boolean) =>
    setPicked((p) => ({
      ...p,
      ...Object.fromEntries(ids.map((id) => [id, on])),
    }))
  const noNotes = !rules.some((r) => r.comment)
  const allOn = selectable.length > 0 && selected.length === selectable.length
  const copyable = selected.filter(canCopy)

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <DndContext
          id="fw-rules"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={drop}
        >
          <SortableContext
            items={movable.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-border text-start text-caption text-ash">
                  {dragging && <th className="w-8" />}
                  {a.manage && (
                    <th className="w-10 ps-4">
                      <Checkbox
                        aria-label="Select all"
                        checked={allOn}
                        indeterminate={selected.length > 0 && !allOn}
                        disabled={selectable.length === 0}
                        onCheckedChange={(on) =>
                          toggle(
                            selectable.map((r) => r.id),
                            on,
                          )
                        }
                      />
                    </th>
                  )}
                  <th className="py-2 ps-4 text-start font-normal">Traffic</th>
                  <th className="px-4 py-2 text-start font-normal">Action</th>
                  <th className="px-4 py-2 text-start font-normal">From</th>
                  {!noNotes && (
                    <th className="px-4 py-2 text-start font-normal">Note</th>
                  )}
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((r) => (
                  <RuleRow
                    key={r.id}
                    rule={r}
                    grip={dragging}
                    gripDisabled={a.locked || a.busy || !canMove(r)}
                    notes={!noNotes}
                    picked={Boolean(picked[r.id])}
                    onPick={(on) => toggle([r.id], on)}
                  />
                ))}
                {!filtered && (
                  <tr className="bg-subtle text-muted-foreground">
                    {dragging && <td />}
                    {a.manage && <td />}
                    <td className="py-2.5 ps-4">Everything else incoming</td>
                    <td className="px-4 py-2.5" colSpan={noNotes ? 3 : 4}>
                      {o.active
                        ? defaultName(o.defaults.incoming)
                        : "Not filtered while the firewall is off"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
      {!filtered && o.rules.length > 1 && o.backend === "ufw" && (
        <p className="text-caption text-ash">
          Checked from the top: the first rule that matches decides.
          {dragging && " Drag a row to change its place."}
        </p>
      )}
      {selected.length > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center gap-3 self-center rounded-2xl border border-border bg-card px-4 py-2 text-body-sm shadow-md">
          <span className="flex items-center gap-1.5">
            <Check className="size-4 text-ash" />
            {selected.length} selected
          </span>
          <Button variant="ghost" size="sm" onClick={() => setPicked({})}>
            Clear
          </Button>
          {copyable.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => a.applyTo(copyable)}
            >
              Apply to other servers…
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            disabled={a.locked}
            onClick={() => a.deleteRules(selected, () => setPicked({}))}
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}

function RuleRow({
  rule,
  grip,
  gripDisabled,
  notes,
  picked,
  onPick,
}: {
  rule: FilterRule
  grip: boolean
  gripDisabled: boolean
  notes: boolean
  picked: boolean
  onPick: (on: boolean) => void
}) {
  const a = useFirewallActions()
  const menu = useRuleMenu(rule)
  const port = rulePort(rule)
  const sort = useSortable({ id: rule.id, disabled: !grip || gripDisabled })
  return (
    <tr
      ref={sort.setNodeRef}
      style={{
        // Rows only ever move up and down, and keep their shape.
        transform: CSS.Translate.toString(
          sort.transform && { ...sort.transform, x: 0 },
        ),
        transition: sort.transition,
      }}
      className={cn(
        "group",
        picked && "bg-subtle",
        sort.isDragging && "relative z-10 bg-card shadow-md",
      )}
    >
      {grip && (
        <td className="ps-2">
          {canMove(rule) && (
            <button
              type="button"
              ref={sort.setActivatorNodeRef}
              {...sort.attributes}
              {...sort.listeners}
              disabled={gripDisabled}
              aria-label={`Move ${ruleName(rule)}`}
              title="Drag to change its place"
              className="flex size-7 cursor-grab touch-none items-center justify-center rounded-lg text-ash outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
            >
              <GripVertical className="size-4" />
            </button>
          )}
        </td>
      )}
      {a.manage && (
        <td className="ps-4">
          {rule.deletable && (
            <Checkbox
              aria-label={`Select ${ruleName(rule)}`}
              checked={picked}
              onCheckedChange={onPick}
            />
          )}
        </td>
      )}
      <td className="max-w-80 py-2 ps-4">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium" title={rule.raw}>
            {ruleName(rule)}
          </span>
          {rule.protects_ssh && <SshLock />}
          {port && port !== ruleName(rule) && (
            <span className="text-caption whitespace-nowrap text-muted-foreground">
              {port}
            </span>
          )}
          <Badges rule={rule} />
        </div>
      </td>
      <td className="px-4 py-2">
        <ActionTag action={rule.action} />
      </td>
      <td className="max-w-56 truncate px-4 py-2 font-mono text-caption">
        <span className={cn(!rule.from && "font-sans text-body-sm")}>
          {ruleFrom(rule)}
        </span>
      </td>
      {notes && (
        <td className="max-w-64 truncate px-4 py-2 text-muted-foreground">
          {rule.comment}
        </td>
      )}
      <td className="pe-2 text-end">
        <ItemMenu groups={menu} label={`Actions for ${ruleName(rule)}`} />
      </td>
    </tr>
  )
}

function PhoneList({ rules }: { rules: FilterRule[] }) {
  const o = useFirewallActions().overview
  const [open, setOpen] = useOpen("fw-rule-sheet")
  const [current, setCurrent] = useState<FilterRule>()
  return (
    <>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {rules.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start active:bg-muted"
              onClick={() => {
                setCurrent(r)
                setOpen(true)
              }}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  lets(r) && "bg-success",
                  stops(r) && "bg-destructive",
                  r.action === "other" && "bg-ash",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-body-sm font-medium">
                    {ruleName(r)}
                  </span>
                  {r.protects_ssh && <Lock className="size-3 text-ash" />}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {[rulePort(r), ruleFrom(r), ...ruleBadges(r), r.comment]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-caption text-muted-foreground">
                {ACTION_LABELS[r.action]}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="px-4 py-3 text-caption text-ash">
        Everything else incoming:{" "}
        {o.active ? defaultName(o.defaults.incoming) : "not filtered"}.
        {o.backend === "ufw" && " The first rule that matches decides."}
      </p>
      {current && (
        <RuleSheet rule={current} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

function RuleSheet({
  rule,
  open,
  onOpenChange,
}: {
  rule: FilterRule
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useRuleMenu(rule)
  const facts = [
    { label: "Action", value: ACTION_LABELS[rule.action] },
    { label: "From", value: ruleFrom(rule) },
    ...(rulePort(rule) ? [{ label: "Port", value: rulePort(rule) }] : []),
    ...(rule.to ? [{ label: "To", value: rule.to }] : []),
    ...(rule.comment
      ? [{ label: "Note", value: rule.comment, wide: true }]
      : []),
    { label: "As written", value: rule.raw, wide: true, mono: true },
  ]
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={ruleName(rule)}>
      <Facts items={facts} />
      {rule.protects_ssh && (
        <p className="px-4 pb-3 text-caption text-muted-foreground">
          This rule keeps SSH open for Morcheh.
        </p>
      )}
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}
