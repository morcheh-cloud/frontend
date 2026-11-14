"use client"

import {
  Check,
  ChevronDown,
  Download,
  Layers,
  Server,
  Upload,
} from "lucide-react"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import { afterClose } from "../../servers/[id]/components/parts"

export type ScopeEnv = {
  id: string
  name: string
  // Settings of its own (saved or in the draft).
  own: number
  dirty: boolean
}

const ownText = (n: number) =>
  n === 0
    ? "Follows the workspace"
    : n === 1
      ? "1 of its own"
      : `${n} of its own`

// The page's toolbar: which settings are in view (the workspace's, or one
// environment's), and export / import.
export function ScopeBar({
  phone,
  workspace,
  envs,
  scope,
  wsDirty,
  onScope,
  onExport,
  onImport,
}: {
  phone: boolean
  workspace: string
  envs: ScopeEnv[]
  scope: string
  wsDirty: boolean
  onScope: (id: string) => void
  onExport: () => void
  onImport?: () => void
}) {
  const env = envs.find((e) => e.id === scope)
  const current = env?.name ?? "Whole workspace"
  const icon = env ? <Server /> : <Layers />
  const anyDirty = wsDirty || envs.some((e) => e.dirty)
  const transfer = (
    <div className="ms-auto flex items-center gap-1">
      <Button
        variant="ghost"
        size={phone ? "icon" : "sm"}
        className={cn(phone && "size-11")}
        aria-label="Export settings"
        title={phone ? undefined : "Download these settings as a file"}
        onClick={onExport}
      >
        <Download />
        {!phone && "Export"}
      </Button>
      {onImport && (
        <Button
          variant="ghost"
          size={phone ? "icon" : "sm"}
          className={cn(phone && "size-11")}
          aria-label="Import settings"
          title={phone ? undefined : "Load settings from a file"}
          onClick={onImport}
        >
          <Upload />
          {!phone && "Import"}
        </Button>
      )}
    </div>
  )
  return (
    <div className="flex items-center gap-2">
      {phone ? (
        <PhonePicker
          workspace={workspace}
          envs={envs}
          scope={scope}
          wsDirty={wsDirty}
          current={current}
          icon={icon}
          dot={anyDirty}
          onScope={onScope}
        />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="h-9 gap-1.5">
                {icon}
                <span className="text-muted-foreground">Settings for</span>
                <span className="max-w-60 truncate font-medium">{current}</span>
                {anyDirty && (
                  <span
                    className="size-1.5 rounded-full bg-brand"
                    title="Unsaved changes"
                  />
                )}
                <ChevronDown className="size-3.5 text-ash" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-72">
            <DropdownMenuRadioGroup value={scope} onValueChange={onScope}>
              <DropdownMenuRadioItem value="">
                <ScopeLabel
                  name="Whole workspace"
                  note={`Every environment of ${workspace}`}
                  dirty={wsDirty}
                />
              </DropdownMenuRadioItem>
              {envs.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Environments</DropdownMenuLabel>
                    {envs.map((e) => (
                      <DropdownMenuRadioItem key={e.id} value={e.id}>
                        <ScopeLabel
                          name={e.name}
                          note={ownText(e.own)}
                          dirty={e.dirty}
                        />
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {transfer}
    </div>
  )
}

function ScopeLabel({
  name,
  note,
  dirty,
}: {
  name: string
  note: string
  dirty: boolean
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="flex items-center gap-1.5">
        <span className="truncate">{name}</span>
        {dirty && <span className="size-1.5 shrink-0 rounded-full bg-brand" />}
      </span>
      <span className="truncate text-caption text-muted-foreground">
        {note}
      </span>
    </span>
  )
}

function PhonePicker({
  workspace,
  envs,
  scope,
  wsDirty,
  current,
  icon,
  dot,
  onScope,
}: {
  workspace: string
  envs: ScopeEnv[]
  scope: string
  wsDirty: boolean
  current: string
  icon: React.ReactNode
  dot: boolean
  onScope: (id: string) => void
}) {
  const [open, setOpen] = useOpen("docker-settings-scope")
  // The scope lives in the URL: write it once the sheet's history entry is
  // gone, or closing the sheet would undo it.
  const choose = (id: string) => afterClose(setOpen, () => onScope(id))
  const row = (id: string, name: string, note: string, dirty: boolean) => (
    <li key={id || "workspace"}>
      <SheetAction
        icon={<Check className={cn(scope !== id && "invisible")} />}
        label={name}
        description={note}
        trailing={
          dirty ? (
            <span className="size-2 rounded-full bg-brand" title="Unsaved" />
          ) : undefined
        }
        onClick={() => choose(id)}
      />
    </li>
  )
  return (
    <>
      <Button
        variant="outline"
        className="h-9 min-w-0 gap-1.5 rounded-full px-3.5"
        onClick={() => setOpen(true)}
      >
        {icon}
        <span className="truncate font-medium">{current}</span>
        {dot && <span className="size-1.5 shrink-0 rounded-full bg-brand" />}
        <ChevronDown className="size-3.5 shrink-0 text-ash" />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Settings for">
        <ul className="divide-y divide-border">
          {row(
            "",
            "Whole workspace",
            `Every environment of ${workspace}`,
            wsDirty,
          )}
          {envs.map((e) => row(e.id, e.name, ownText(e.own), e.dirty))}
        </ul>
      </BottomSheet>
    </>
  )
}
