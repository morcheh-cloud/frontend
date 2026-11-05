"use client"

import { ArrowRight, ArrowRightLeft, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { Forward } from "@/lib/services"
import {
  Empty,
  Facts,
  type Item,
  ItemMenu,
  SheetItems,
} from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useFirewallActions } from "./firewall-actions"
import { forwardFrom, forwardTo } from "./meta"

function useForwardMenu(forward: Forward): Item[][] {
  const a = useFirewallActions()
  if (!a.manage) return []
  return [
    [
      {
        key: "edit",
        label: "Edit",
        icon: <Pencil />,
        disabled: a.locked,
        onSelect: () => a.editForward(forward),
      },
    ],
    [
      {
        key: "delete",
        label: "Delete",
        icon: <Trash2 />,
        destructive: true,
        disabled: a.locked,
        onSelect: () => a.deleteForward(forward),
      },
    ],
  ]
}

const scope = (f: Forward) =>
  [f.from || "Anyone", f.interface && `on ${f.interface}`, f.zone]
    .filter(Boolean)
    .join(" · ")

export function ForwardsTab() {
  const { phone } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview

  if (o.forwards.length === 0) {
    return (
      <Empty
        icon={ArrowRightLeft}
        title="No port forwards"
        className="max-md:mt-4"
        body="Send what arrives on a port to another port here, or to another machine."
        action={
          a.manage && (
            <Button
              className="max-md:h-11 max-md:w-full"
              disabled={a.locked}
              onClick={a.addForward}
            >
              Add a forward
            </Button>
          )
        }
      />
    )
  }

  const off = !o.active && (
    <p className="text-caption text-ash max-md:px-4 max-md:py-3">
      These start working when the firewall is on.
    </p>
  )

  if (phone) {
    return (
      <>
        <PhoneList forwards={o.forwards} />
        {off}
      </>
    )
  }

  const notes = o.forwards.some((f) => f.comment)
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-border text-caption text-ash">
              <th className="py-2 ps-4 text-start font-normal">Arrives on</th>
              <th className="px-4 py-2 text-start font-normal">Goes to</th>
              <th className="px-4 py-2 text-start font-normal">From</th>
              {notes && (
                <th className="px-4 py-2 text-start font-normal">Note</th>
              )}
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {o.forwards.map((f) => (
              <ForwardRow key={f.id} forward={f} notes={notes} />
            ))}
          </tbody>
        </table>
      </div>
      {off}
    </div>
  )
}

function ForwardRow({ forward, notes }: { forward: Forward; notes: boolean }) {
  const menu = useForwardMenu(forward)
  const name = forwardFrom(forward)
  return (
    <tr>
      <td className="py-2 ps-4 font-medium whitespace-nowrap">{name}</td>
      <td className="px-4 py-2">
        <span className="inline-flex items-center gap-2">
          <ArrowRight className="size-3.5 shrink-0 text-ash" />
          {forwardTo(forward)}
        </span>
      </td>
      <td className="px-4 py-2 text-muted-foreground">{scope(forward)}</td>
      {notes && (
        <td className="max-w-64 truncate px-4 py-2 text-muted-foreground">
          {forward.comment}
        </td>
      )}
      <td className="pe-2 text-end">
        <ItemMenu groups={menu} label={`Actions for ${name}`} />
      </td>
    </tr>
  )
}

function PhoneList({ forwards }: { forwards: Forward[] }) {
  const [open, setOpen] = useOpen("fw-forward-sheet")
  const [current, setCurrent] = useState<Forward>()
  return (
    <>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {forwards.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              className="flex min-h-14 w-full flex-col justify-center px-4 py-2 text-start active:bg-muted"
              onClick={() => {
                setCurrent(f)
                setOpen(true)
              }}
            >
              <span className="truncate text-body-sm font-medium">
                {forwardFrom(f)} → {forwardTo(f)}
              </span>
              <span className="truncate text-caption text-muted-foreground">
                {[scope(f), f.comment].filter(Boolean).join(" · ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <ForwardSheet forward={current} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

function ForwardSheet({
  forward,
  open,
  onOpenChange,
}: {
  forward: Forward
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useForwardMenu(forward)
  const facts = [
    { label: "Goes to", value: forwardTo(forward) },
    { label: "From", value: scope(forward) },
    ...(forward.comment
      ? [{ label: "Note", value: forward.comment, wide: true }]
      : []),
  ]
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Port ${forwardFrom(forward)}`}
    >
      <Facts items={facts} />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}
