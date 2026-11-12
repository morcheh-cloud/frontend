"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { setDockerEnv } from "../env"
import { type DockerTab, dockerHref, dockerTabs } from "./meta"

// Old links (/containers/<server>?tab=…) now open the same section with that
// server as the environment.
export function ServerRedirect() {
  const { server } = useParams<{ server: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const tab = search.get("tab")
  useEffect(() => {
    setDockerEnv(server)
    const section = dockerTabs.includes(tab as DockerTab)
      ? (tab as DockerTab)
      : "containers"
    router.replace(dockerHref(server, { tab: section }))
  }, [server, tab, router])
  return null
}
