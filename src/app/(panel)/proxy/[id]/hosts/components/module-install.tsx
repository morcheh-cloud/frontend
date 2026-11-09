"use client"

import type { ReactNode } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/cronjobs/components/editor-parts"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { JobBar } from "@/components/jobs/meta"
import { Button } from "@/components/ui/button"
import type { Proxy as ReverseProxy } from "@/lib/services"
import { type ProxyModule, useModuleJob, useSetupModule } from "../../../api"
import { useProxyCan } from "../../../components/permissions"

// A module the proxy doesn't have yet: what it means, and the button that
// adds it from the server's own packages (job proxy-<module>, Engineer), or
// that job's progress while it runs.
export function ModuleInstall({
  proxy: p,
  module,
  icon,
  busy,
  button,
  warn,
  children,
}: {
  proxy: ReverseProxy
  module: ProxyModule
  icon: ReactNode
  // Shown while the job runs, like "Installing Brotli…".
  busy: string
  button: string
  // The site already uses it: say so louder.
  warn?: boolean
  children: ReactNode
}) {
  const job = useModuleJob(p.id, module)
  const setup = useSetupModule()
  const jobs = useJobActions()
  const can = useProxyCan()

  if (job) {
    return (
      <Callout icon={icon}>
        <p className="font-medium text-foreground">{busy}</p>
        <p className="truncate">
          {job.progress.current || job.progress.phase || job.title}
        </p>
        <JobBar job={job} className="mt-2" />
      </Callout>
    )
  }
  const install = () =>
    setup.mutate(
      { id: p.id, module },
      {
        onSuccess: (j) => jobs.track(j),
        onError: (e) => toast.error(e.message),
      },
    )
  return (
    <Callout icon={icon} tone={warn ? "warning" : undefined}>
      <div>{children}</div>
      {can(p, "engineer") ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-11 md:h-8"
          disabled={setup.isPending}
          onClick={install}
        >
          {icon}
          {button}
        </Button>
      ) : (
        <p className="mt-1">Someone with Engineer access can add it.</p>
      )}
    </Callout>
  )
}
