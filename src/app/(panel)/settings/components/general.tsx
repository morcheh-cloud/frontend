"use client"

import { PageHeader } from "@/components/panel/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { failed, useSettings, useUpdateSettings } from "../api"
import { AdminOnly } from "./no-access"

export function GeneralSettings() {
  return (
    <AdminOnly>
      <PageHeader title="Settings" guide="access" />
      <Registration />
    </AdminOnly>
  )
}

function Registration() {
  const settings = useSettings()
  const update = useUpdateSettings()
  return (
    <div className="w-full px-4 py-5 md:px-6">
      <section className="flex items-start justify-between gap-6 border-border max-md:border-y max-md:py-4 md:rounded-2xl md:border md:p-6">
        <div className="min-w-0">
          <h2 className="font-medium">Public registration</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Anyone who can reach this panel can sign up. They wait on a holding
            page and can't do anything until you approve them under Members.
          </p>
          {settings.isError && (
            <p className="mt-2 text-body-sm text-destructive">
              {settings.error.message}
            </p>
          )}
        </div>
        {settings.isPending ? (
          <Skeleton className="h-5 w-9 rounded-full" />
        ) : (
          <Switch
            aria-label="Public registration"
            checked={settings.data?.registration_open ?? false}
            disabled={update.isPending || settings.isError}
            onCheckedChange={(registration_open) =>
              update.mutate({ registration_open }, { onError: failed })
            }
          />
        )}
      </section>
    </div>
  )
}
