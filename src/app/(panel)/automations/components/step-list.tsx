"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
  ChevronDown,
  Copy,
  Ellipsis,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react"
import type { ReactNode } from "react"

import { ItemMenu } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import { type Names, stepSummary } from "./describe"
import {
  blankStep,
  type Errors,
  newKey,
  type StepDraft,
  stepError,
  toAction,
} from "./draft"
import {
  MAX_STEPS,
  StepIcon,
  type StepKind,
  stepKinds,
  stepMeta,
  type TriggerKind,
} from "./meta"
import { StepFields, type StepProps } from "./step-fields"
import { InsertScope } from "./var-chips"

type Props = {
  steps: StepDraft[]
  onSteps: (steps: StepDraft[]) => void
  open: string | null
  onOpen: (key: string | null) => void
  errors: Errors
  ws: string
  trigger: TriggerKind
  phone: boolean
  names: Map<string, string>
  onNames: (names: Map<string, string>) => void
  lookups: Names
}

// The steps as sortable cards (drag the grip, or Move up/down); one opens at
// a time to edit it.
export function StepList(p: Props) {
  const { steps, onSteps } = p
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = steps.findIndex((s) => s.key === e.active.id)
    const to = steps.findIndex((s) => s.key === e.over?.id)
    if (from >= 0 && to >= 0) onSteps(arrayMove(steps, from, to))
  }
  const setStep = (key: string, patch: Partial<StepDraft>) =>
    onSteps(steps.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const add = (kind: StepKind) => {
    const s = blankStep(kind, p.trigger)
    onSteps([...steps, s])
    p.onOpen(s.key)
  }

  return (
    <div className="flex flex-col gap-3">
      {steps.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.key)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <StepCard
                  key={s.key}
                  s={s}
                  index={i}
                  count={steps.length}
                  open={p.open === s.key}
                  onToggle={() => p.onOpen(p.open === s.key ? null : s.key)}
                  error={stepError(p.errors, s.key)}
                  summary={stepSummary(toAction(s), p.lookups)}
                  phone={p.phone}
                  onMove={(to) => onSteps(arrayMove(steps, i, to))}
                  onDuplicate={() => {
                    if (steps.length >= MAX_STEPS) return
                    const copy = {
                      ...s,
                      key: newKey(),
                      id: undefined,
                      savedUrl: undefined,
                      headers: s.headers.map((h) => ({
                        ...h,
                        key: newKey(),
                        saved: false,
                      })),
                    }
                    onSteps([
                      ...steps.slice(0, i + 1),
                      copy,
                      ...steps.slice(i + 1),
                    ])
                  }}
                  onRemove={() => onSteps(steps.filter((x) => x.key !== s.key))}
                >
                  <InsertScope>
                    <div className="flex flex-col gap-4">
                      <StepFields
                        {...({
                          s,
                          set: (patch) => setStep(s.key, patch),
                          errors: p.errors,
                          ws: p.ws,
                          trigger: p.trigger,
                          phone: p.phone,
                          names: p.names,
                          onNames: p.onNames,
                        } satisfies StepProps)}
                      />
                      <Field
                        label="Name in runs"
                        hint="Optional. Blank = said from what it does."
                      >
                        {(f) => (
                          <Input
                            {...f}
                            value={s.label}
                            onChange={(e) =>
                              setStep(s.key, { label: e.target.value })
                            }
                            maxLength={100}
                            placeholder={stepMeta[s.kind].label}
                            className="placeholder:text-ash md:max-w-sm"
                          />
                        )}
                      </Field>
                    </div>
                  </InsertScope>
                </StepCard>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
      {steps.length < MAX_STEPS ? (
        <AddStep phone={p.phone} onAdd={add} first={steps.length === 0} />
      ) : (
        <p className="text-caption text-ash">
          {MAX_STEPS} steps is the most an automation can have.
        </p>
      )}
    </div>
  )
}

function StepCard({
  s,
  index,
  count,
  open,
  onToggle,
  error,
  summary,
  phone,
  onMove,
  onDuplicate,
  onRemove,
  children,
}: {
  s: StepDraft
  index: number
  count: number
  open: boolean
  onToggle: () => void
  error?: string
  summary: string
  phone: boolean
  onMove: (to: number) => void
  onDuplicate: () => void
  onRemove: () => void
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: s.key })
  // Fold an open step as soon as it's grabbed: a tall card's centre barely
  // moves, so it would never pass its neighbours.
  const fold = () => {
    if (open) onToggle()
  }
  const title = s.label.trim() || stepMeta[s.kind].label
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-card",
        isDragging && "relative z-10 shadow-md",
        open && "border-mist shadow-sm",
        error && !open && "border-destructive/40",
      )}
    >
      <div className="flex min-w-0 items-center gap-1 pe-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onMouseDownCapture={(e) => {
            if (e.button === 0) fold()
          }}
          onKeyDownCapture={(e) => {
            if (e.key === " " || e.key === "Enter") fold()
          }}
          aria-label={`Drag ${title}`}
          className="flex h-16 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-s-2xl text-ash outline-none select-none [-webkit-touch-callout:none] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-lg py-2 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              error
                ? "bg-destructive/10 text-destructive"
                : "bg-brand-soft text-brand-strong",
            )}
          >
            <StepIcon kind={s.kind} className="size-[18px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="text-caption text-ash tabular-nums">
                {index + 1}
              </span>
              <span className="truncate text-body-sm font-medium">{title}</span>
              {s.continueOnError && (
                <span className="hidden shrink-0 text-caption text-ash sm:inline">
                  · goes on if it fails
                </span>
              )}
            </span>
            <span
              className={cn(
                "truncate text-caption",
                error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {error ?? summary}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-ash transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {!phone && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Move up"
              title="Move up"
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
            >
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Move down"
              title="Move down"
              disabled={index === count - 1}
              onClick={() => onMove(index + 1)}
            >
              <ArrowDown />
            </Button>
          </>
        )}
        <ItemMenu
          label={`${title} actions`}
          trigger={
            phone ? (
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={`${title} actions`}
              >
                <Ellipsis />
              </Button>
            ) : undefined
          }
          groups={[
            phone
              ? [
                  {
                    key: "up",
                    label: "Move up",
                    icon: <ArrowUp />,
                    disabled: index === 0,
                    onSelect: () => onMove(index - 1),
                  },
                  {
                    key: "down",
                    label: "Move down",
                    icon: <ArrowDown />,
                    disabled: index === count - 1,
                    onSelect: () => onMove(index + 1),
                  },
                ]
              : [],
            [
              {
                key: "dup",
                label: "Duplicate",
                icon: <Copy />,
                disabled: count >= MAX_STEPS,
                onSelect: onDuplicate,
              },
              {
                key: "remove",
                label: "Remove",
                icon: <Trash2 />,
                destructive: true,
                onSelect: onRemove,
              },
            ],
          ]}
        />
      </div>
      {open && (
        <div className="border-t border-border p-4 md:px-5 md:ps-12">
          {children}
        </div>
      )}
    </li>
  )
}

function AddStep({
  phone,
  onAdd,
  first,
}: {
  phone: boolean
  onAdd: (kind: StepKind) => void
  first: boolean
}) {
  const [open, setOpen] = useOpen("automation-add-step")
  const label = first ? "Add the first step" : "Add a step"
  const button = (
    <Button
      variant="outline"
      className="h-11 justify-start self-stretch border-dashed md:h-10 md:self-start"
      onClick={phone ? () => setOpen(true) : undefined}
    >
      <Plus />
      {label}
    </Button>
  )
  if (phone) {
    return (
      <>
        {button}
        <BottomSheet open={open} onOpenChange={setOpen} title="Add a step">
          <ul className="divide-y divide-border">
            {stepKinds.map((k) => (
              <li key={k}>
                <SheetAction
                  icon={<StepIcon kind={k} />}
                  label={stepMeta[k].label}
                  description={stepMeta[k].hint}
                  onClick={() => {
                    window.addEventListener("popstate", () => onAdd(k), {
                      once: true,
                    })
                    setOpen(false)
                  }}
                />
              </li>
            ))}
          </ul>
        </BottomSheet>
      </>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="h-10 self-start border-dashed" />
        }
      >
        <Plus />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-80">
        {stepKinds.map((k) => (
          <DropdownMenuItem
            key={k}
            onClick={() => onAdd(k)}
            className="items-start gap-3 py-2"
          >
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <StepIcon kind={k} className="size-4" />
            </span>
            <span className="flex flex-col">
              <span className="font-medium">{stepMeta[k].label}</span>
              <span className="text-caption text-muted-foreground">
                {stepMeta[k].hint}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
