"use client"

import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { AsideCard, EditorPage, SummaryList } from "@/components/editor-page"
import { eventsText, useEventCatalog } from "@/components/events/catalog"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { fieldErrors } from "@/lib/api"
import { useSaveWebhook } from "../api"
import { hostOf, LIST, NEW, WebhookIcon, webhookHref } from "./meta"
import { useWebhookCan } from "./permissions"
import { handSecret } from "./secret-dialog"
import {
  check,
  type Draft,
  draftOf,
  type Errors,
  errorKey,
  serial,
  toBody,
  WebhookSections,
} from "./webhook-form"

// /automations/webhooks/new: a full page on desktop (EditorPage), a native
// screen on phones. Once added, the signing secret is shown once, then the
// webhook's own page takes over.
export function NewWebhook() {
  const phone = useIsPhone()
  const { workspace } = useWorkspace()
  const can = useWebhookCan(workspace?.id)
  usePageCrumbs([{ href: NEW, label: "New webhook" }])
  if (phone === null || !workspace) return null
  if (!can.edit)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={WebhookIcon}
          title={can.demo ? "Not in the demo" : "You can't add webhooks here"}
          body={
            can.demo
              ? "Webhooks send a workspace's events to any address, so the public demo keeps them closed."
              : "Webhooks need Owner access to this workspace."
          }
          action={<BackToList />}
        />
      </div>
    )
  return <Editor ws={workspace.id} phone={phone} />
}

export function BackToList() {
  return (
    <Button
      variant="outline"
      className="h-11 w-full md:h-9 md:w-auto"
      render={<Link href={LIST} />}
      nativeButton={false}
    >
      Back to webhooks
    </Button>
  )
}

export function scrollToProblem() {
  requestAnimationFrame(() =>
    document
      .querySelector("[aria-invalid=true], [data-error]")
      ?.scrollIntoView({ block: "center", behavior: "smooth" }),
  )
}

// Field errors from the backend, by this form's keys.
export function serverErrors(err: unknown): Errors {
  const out: Errors = {}
  for (const [location, message] of Object.entries(fieldErrors(err))) {
    out[errorKey(location)] ??= message
  }
  return out
}

function Editor({ ws, phone }: { ws: string; phone: boolean }) {
  const router = useRouter()
  const leave = useBackOr(LIST)
  const save = useSaveWebhook()
  const catalog = useEventCatalog()
  const [d, setD] = useState<Draft>(() => draftOf())
  const [initial] = useState(() => serial(draftOf()))
  const [errors, setErrors] = useState<Errors>({})
  const [done, setDone] = useState(false)
  const dirty = serial(d) !== initial && !done

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }))
    setErrors({})
  }

  const submit = () => {
    const e = check(d)
    setErrors(e)
    if (Object.keys(e).length) {
      toast.error(Object.values(e)[0])
      scrollToProblem()
      return
    }
    save.mutate(
      { ws, body: toBody(d) },
      {
        onSuccess: ({ webhook, secret }) => {
          toast.success(`${webhook.name} added`)
          // Its page opens in place of this one and shows the secret once.
          if (secret) handSecret(webhook.id, secret)
          setDone(true)
          router.replace(webhookHref(webhook.id))
        },
        onError: (err) => {
          const fields = serverErrors(err)
          setErrors(fields)
          toast.error(Object.values(fields)[0] ?? err.message)
          scrollToProblem()
        },
      },
    )
  }

  const sections = (
    <WebhookSections d={d} set={set} errors={errors} phone={phone} />
  )
  const blocked = save.isPending || done

  if (phone)
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={leave}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            New webhook
          </h1>
          <HelpButton
            href={guideHref("api", "webhooks")}
            label="Webhooks guide"
          />
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={blocked}
            onClick={submit}
          >
            {save.isPending ? "Adding…" : "Add"}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )

  const host = hostOf(d.url.trim())
  return (
    <EditorPage
      icon={<WebhookIcon />}
      title="New webhook"
      dirty={dirty}
      status={dirty ? "Unsaved changes" : "Not saved yet"}
      onSave={blocked ? undefined : submit}
      aside={
        <>
          <AsideCard title="Summary">
            <SummaryList
              rows={[
                ["Name", d.name.trim() || host || "Not set yet"],
                ["Sends to", host || "Not set yet", true],
                [
                  "Events",
                  d.all
                    ? "All events"
                    : d.events.length
                      ? `${d.events.length} · ${eventsText(d.events, catalog.data)}`
                      : "None picked yet",
                ],
                [
                  "Headers",
                  d.headers.filter((h) => h.name.trim()).length || "None",
                ],
                ["State", d.enabled ? "On" : "Off"],
              ]}
            />
          </AsideCard>
          <AsideCard title="What happens next">
            <p className="text-body-sm text-muted-foreground">
              You get the signing secret once. Then send a test from the
              webhook's page and watch it arrive under Deliveries.
            </p>
          </AsideCard>
        </>
      }
      actions={
        <>
          <Button variant="outline" className="h-9" onClick={leave}>
            Cancel
          </Button>
          <Button className="h-9" disabled={blocked} onClick={submit}>
            {save.isPending ? "Adding…" : "Add webhook"}
          </Button>
        </>
      }
    >
      {sections}
    </EditorPage>
  )
}
