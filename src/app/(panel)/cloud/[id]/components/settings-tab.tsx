"use client"

import {
  Activity,
  FileText,
  KeyRound,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import type { ReactNode } from "react"

import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCheckingAccounts } from "../../api"
import { AccountStatusLine, ChangesTag } from "../../components/account-parts"
import { useCloudActions } from "../../components/cloud-actions"
import { useCloudCan } from "../../components/permissions"
import type { Model } from "./model"
import { dateText, Panel, PhoneGroup, PhoneRow, plural } from "./parts"

// How Morche reaches the account and what it may do there.

function Facts({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2.5 px-5 py-4 text-body-sm">
      {children}
    </dl>
  )
}

function F({ k, children }: { k: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </>
  )
}

const changesText = (allowed: boolean) =>
  allowed
    ? "People with Operator access can turn servers on and off from Morche, and Engineers can rename them."
    : "Morche only reads this account: nothing is changed at the provider. Turn on Allow changes from Morche to power or rename servers from here."

export function SettingsDesktop({ model: m }: { model: Model }) {
  const a = m.account
  const actions = useCloudActions()
  const can = useCloudCan()
  const checking = useCheckingAccounts().has(a.id)
  const owner = can(a, "owner")
  const linked = (m.servers ?? []).filter((s) => s.linked.length > 0).length

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <Panel
        icon={<Activity />}
        title="Connection"
        action={
          can(a, "operator") && (
            <Button
              variant="outline"
              size="sm"
              disabled={checking}
              onClick={() => actions.check(a)}
            >
              <RefreshCw className={cn(checking && "animate-spin")} />
              Check now
            </Button>
          )
        }
      >
        <Facts>
          <F k="Status">
            <AccountStatusLine account={a} checking={checking} />
          </F>
          <F k="Checked">{timeAgo(a.last_checked_at ?? null)}</F>
          <F k="Last online">{timeAgo(a.last_online_at ?? null)}</F>
          <F k="Read">{m.readAt ? timeAgo(m.readAt) : "—"}</F>
        </Facts>
        {a.status_message && a.status !== "online" && (
          <p className="mx-5 mb-4 rounded-lg bg-muted px-3 py-2 font-mono text-caption break-words text-muted-foreground">
            {a.status_message}
          </p>
        )}
      </Panel>

      <Panel
        icon={<KeyRound />}
        title="API key"
        action={
          owner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.editAccount(a)}
            >
              <Pencil />
              Change key
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-3 px-5 py-4">
          <p className="flex items-baseline gap-2">
            <span className="font-mono text-subheading font-light">
              {a.key_hint ? `…${a.key_hint}` : "—"}
            </span>
            <span className="text-caption text-ash">last characters</span>
          </p>
          <p className="text-caption text-muted-foreground">
            The key is kept encrypted and never shown again. To use another one,
            paste it in the account's settings; leaving the field blank keeps
            this one.
          </p>
        </div>
      </Panel>

      <Panel
        icon={<ShieldCheck />}
        title="Changes from Morche"
        action={
          owner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.editAccount(a)}
            >
              {a.allow_changes ? "Make read only" : "Allow changes"}
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-2 px-5 py-4">
          <ChangesTag allowed={a.allow_changes} className="font-medium" />
          <p className="text-caption text-muted-foreground">
            {changesText(a.allow_changes)}
          </p>
        </div>
      </Panel>

      <Panel
        icon={<FileText />}
        title="Details"
        action={
          owner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.editAccount(a)}
            >
              <Pencil />
              Edit
            </Button>
          )
        }
      >
        <Facts>
          <F k="Provider">{a.provider_label}</F>
          <F k="Name">
            <span dir="auto">{a.name}</span>
          </F>
          <F k="Description">
            {a.description ? (
              <span dir="auto" className="whitespace-normal">
                {a.description}
              </span>
            ) : (
              <span className="text-ash">None</span>
            )}
          </F>
          <F k="In Morche">
            {m.servers
              ? `${plural(linked, "server")} of ${m.servers.length}`
              : "—"}
          </F>
          <F k="Added">{dateText(a.created_at)}</F>
          <F k="Changed">{timeAgo(a.updated_at)}</F>
        </Facts>
      </Panel>

      {owner && (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-destructive/30 bg-card px-5 py-4 shadow-sm xl:col-span-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body-sm font-medium">Remove this account</p>
            <p className="text-caption text-muted-foreground">
              Morche forgets the key. The servers keep running at{" "}
              {a.provider_label}, and the ones added to Morche stay there.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => actions.removeAccount(a)}
          >
            <Trash2 />
            Remove account
          </Button>
        </section>
      )}
    </div>
  )
}

export function SettingsPhone({ model: m }: { model: Model }) {
  const a = m.account
  const actions = useCloudActions()
  const can = useCloudCan()
  const checking = useCheckingAccounts().has(a.id)
  const owner = can(a, "owner")

  return (
    <>
      <PhoneGroup title="Connection">
        <PhoneRow
          icon={<Activity />}
          title={<AccountStatusLine account={a} checking={checking} />}
          sub={`Checked ${timeAgo(a.last_checked_at ?? null)}`}
          onClick={can(a, "operator") ? () => actions.check(a) : undefined}
          end={can(a, "operator") ? "Check" : undefined}
        />
      </PhoneGroup>

      <PhoneGroup title="Access">
        <PhoneRow
          icon={<KeyRound />}
          title="API key"
          sub={a.key_hint ? `Ends in …${a.key_hint}` : "—"}
          onClick={owner ? () => actions.editAccount(a) : undefined}
        />
        <PhoneRow
          icon={<ShieldCheck />}
          title={<ChangesTag allowed={a.allow_changes} />}
          sub={
            a.allow_changes
              ? "Power and rename from Morche"
              : "Nothing is changed at the provider"
          }
          onClick={owner ? () => actions.editAccount(a) : undefined}
        />
      </PhoneGroup>

      <PhoneGroup title="Details">
        <PhoneRow
          icon={<FileText />}
          title={a.provider_label}
          sub={a.description || `Added ${dateText(a.created_at)}`}
          onClick={owner ? () => actions.editAccount(a) : undefined}
        />
      </PhoneGroup>

      {owner && (
        <section className="mt-7 border-y border-border bg-card">
          <button
            type="button"
            onClick={() => actions.removeAccount(a)}
            className="flex min-h-12 w-full items-center gap-3 px-4 text-body text-destructive outline-none active:bg-muted"
          >
            <Trash2 className="size-5" />
            Remove account
          </button>
        </section>
      )}
    </>
  )
}
