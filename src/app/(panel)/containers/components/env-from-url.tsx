"use client"

import { parseAsString, useQueryState } from "nuqs"
import { useEffect } from "react"

import { setDockerEnv } from "../env"

// A link with `?env=<server>` (from a job, a server page, the palette…)
// switches the Containers environment, then drops the parameter.
export function EnvFromUrl() {
  const [env, setEnv] = useQueryState(
    "env",
    parseAsString.withOptions({ history: "replace" }),
  )
  useEffect(() => {
    if (!env) return
    setDockerEnv(env)
    setEnv(null)
  }, [env, setEnv])
  return null
}
