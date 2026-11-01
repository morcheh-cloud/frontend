"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { type ApiError, api } from "@/lib/api"
import type {
  PowerActionBody,
  PowerActionResult,
  PowerOverview,
} from "@/lib/services"
import { keys as serverKeys } from "../../../api"

export const powerKeys = {
  overview: (serverId: string) => ["power", serverId] as const,
  wait: (serverId: string) => ["power-wait", serverId] as const,
}

// One SSH round trip: boot time, init system, sessions, whether a reboot is
// waiting and a pending scheduled one.
export function usePower(serverId: string, enabled = true) {
  return useQuery({
    queryKey: powerKeys.overview(serverId),
    queryFn: () => api.power.getPower(serverId),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export type PowerAction = PowerActionBody["action"]

// After a reboot or shutdown: the page follows the server until it's back
// (a later boot, or down then up again) or off. Kept in the query cache so it
// survives leaving the section.
export type Wait = {
  action: PowerAction
  started: number
  // The boot before this one.
  bootTime: string
  sawDown: boolean
  state: "waiting" | "back" | "off" | "timeout"
  ended?: number
}

export function usePowerWait(serverId: string) {
  const qc = useQueryClient()
  const key = powerKeys.wait(serverId)
  const { data } = useQuery<Wait | null>({
    queryKey: key,
    queryFn: () => null,
    initialData: null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
  return {
    wait: data,
    start: (action: PowerAction, bootTime: string) =>
      qc.setQueryData<Wait>(key, {
        action,
        bootTime,
        started: Date.now(),
        sawDown: false,
        state: "waiting",
      }),
    keepWaiting: () =>
      qc.setQueryData<Wait | null>(key, (w) =>
        w ? { ...w, started: Date.now(), state: "waiting" } : w,
      ),
    clear: () => qc.setQueryData(key, null),
  }
}

const POLL = 4_000
const GIVE_UP = 10 * 60_000

// Checks the server every few seconds while a wait is on: records its status
// (so the header and the list follow) and, once it answers again, whether it
// booted since.
export function useWatchPower(serverId: string) {
  const qc = useQueryClient()
  const active = usePowerWait(serverId).wait?.state === "waiting"

  useEffect(() => {
    if (!active) return
    const key = powerKeys.wait(serverId)
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const update = (patch: Partial<Wait>) =>
      qc.setQueryData<Wait | null>(key, (w) => (w ? { ...w, ...patch } : w))

    async function tick() {
      const w = qc.getQueryData<Wait | null>(key)
      if (stopped || w?.state !== "waiting") return
      if (Date.now() - w.started > GIVE_UP) {
        return update({ state: "timeout", ended: Date.now() })
      }
      let online = false
      try {
        const s = await api.servers.checkServer(serverId)
        qc.setQueryData(serverKeys.detail(serverId), s)
        online = s.status === "online"
      } catch {}
      if (stopped) return
      if (!online) {
        if (w.action === "poweroff") {
          update({ state: "off", sawDown: true, ended: Date.now() })
          qc.invalidateQueries({ queryKey: serverKeys.servers })
          return
        }
        update({ sawDown: true })
      } else if (w.action === "reboot") {
        try {
          const o = await api.power.getPower(serverId)
          const booted =
            Date.parse(o.boot_time) > Date.parse(w.bootTime) + 5_000
          if (!stopped && (booted || w.sawDown)) {
            qc.setQueryData(powerKeys.overview(serverId), o)
            update({ state: "back", ended: Date.now() })
            qc.invalidateQueries({ queryKey: serverKeys.servers })
            return
          }
        } catch {}
      }
      if (!stopped) timer = setTimeout(tick, POLL)
    }

    timer = setTimeout(tick, POLL)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [active, qc, serverId])
}

export function usePowerAction(serverId: string) {
  const qc = useQueryClient()
  const { start } = usePowerWait(serverId)
  return useMutation<PowerActionResult, ApiError, PowerActionBody>({
    mutationFn: (body) => api.power.powerAction(serverId, body),
    onSuccess: (r) => {
      if (r.scheduled) {
        qc.invalidateQueries({ queryKey: powerKeys.overview(serverId) })
      } else {
        start(r.action, r.boot_time)
      }
    },
  })
}

export function useCancelPower(serverId: string) {
  const qc = useQueryClient()
  return useMutation<PowerOverview, ApiError>({
    mutationFn: () => api.power.cancelPower(serverId),
    onSuccess: (o) => qc.setQueryData(powerKeys.overview(serverId), o),
  })
}
