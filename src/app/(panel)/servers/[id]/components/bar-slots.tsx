"use client"

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { createPortal } from "react-dom"

// A section's one-row bar is drawn by the section, but some of what goes in
// it (search, filters, a tab's own button) belongs to the tab below. The tab
// renders <BarSlot slot="…"> and its content is portalled into the bar, so
// the tab keeps its own state.
export type Slot = "search" | "filters" | "actions"

type Ctx = {
  nodes: Partial<Record<Slot, HTMLElement>>
  filled: Record<Slot, number>
  setNode: (slot: Slot, el: HTMLElement | null) => void
  fill: (slot: Slot, by: number) => void
}

const SlotsContext = createContext<Ctx | null>(null)

function useSlots() {
  const ctx = useContext(SlotsContext)
  if (!ctx) throw new Error("BarSlot needs a <BarSlots> around it")
  return ctx
}

export function BarSlots({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<Ctx["nodes"]>({})
  const [filled, setFilled] = useState<Ctx["filled"]>({
    search: 0,
    filters: 0,
    actions: 0,
  })
  const setNode = useCallback((slot: Slot, el: HTMLElement | null) => {
    setNodes((n) => (n[slot] === (el ?? undefined) ? n : { ...n, [slot]: el }))
  }, [])
  const fill = useCallback((slot: Slot, by: number) => {
    setFilled((f) => ({ ...f, [slot]: f[slot] + by }))
  }, [])
  const value = useMemo(
    () => ({ nodes, filled, setNode, fill }),
    [nodes, filled, setNode, fill],
  )
  return <SlotsContext value={value}>{children}</SlotsContext>
}

// Where a slot's content lands in the bar. Hidden while nothing fills it.
export function SlotTarget({
  slot,
  className,
}: {
  slot: Slot
  className?: string
}) {
  const { setNode } = useSlots()
  const ref = useCallback(
    (el: HTMLDivElement | null) => setNode(slot, el),
    [setNode, slot],
  )
  return <div ref={ref} className={className} />
}

// Render it only when there's something to show: an empty <BarSlot> still
// counts as filled.
export function BarSlot({
  slot,
  children,
}: {
  slot: Slot
  children: ReactNode
}) {
  const { nodes, fill } = useSlots()
  useEffect(() => {
    fill(slot, 1)
    return () => fill(slot, -1)
  }, [fill, slot])
  const node = nodes[slot]
  return node ? createPortal(children, node) : null
}

export function useSlotFilled(slot: Slot) {
  return useSlots().filled[slot] > 0
}
