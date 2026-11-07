"use client"

import { createSerializer, parseAsString, useQueryState } from "nuqs"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { useCloseTerminal, useRenameTerminal, useTerminals } from "../api"
import type { Command, Status } from "./terminal-view"

// The backend allows this many shells per server.
export const MAX_TABS = 10

export type Tab = {
  // Stable React key; the session id only arrives once the shell starts.
  key: string
  sessionId?: string
  title: string
  cwd?: string
  status: Status
  // What was run in this shell, newest last (see TerminalView).
  commands?: Command[]
  // The workspace records this shell's output.
  recorded?: boolean
}

const cwdParser = parseAsString

// Link to the terminal opening a shell in `cwd`.
export const terminalHref = createSerializer({ cwd: cwdParser })

let seq = 0
const newKey = () => `tab-${++seq}`

// The open shells of one server as tabs: restored from the backend on load
// (so a reload resumes them), plus `?cwd=` to open one in a folder (the file
// manager's "Open terminal here").
export function useTabs(serverId: string) {
  const list = useTerminals(serverId)
  const rename = useRenameTerminal(serverId)
  const close = useCloseTerminal(serverId)
  const [cwd, setCwd] = useQueryState(
    "cwd",
    cwdParser.withOptions({ history: "replace" }),
  )
  const [tabs, setTabs] = useState<Tab[] | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const restored = useRef(false)
  // The ?cwd= already opened (nuqs clears the param asynchronously).
  const openedCwd = useRef<string | null>(null)

  // Mirrors `tabs` for callbacks that must not run inside a state updater
  // (StrictMode calls those twice).
  const tabsRef = useRef<Tab[]>([])
  const commit = useCallback((next: Tab[]) => {
    tabsRef.current = next
    setTabs(next)
  }, [])

  const add = useCallback(
    (dir?: string) => {
      const tabs = tabsRef.current
      if (tabs.length >= MAX_TABS) {
        toast.error(`You can open up to ${MAX_TABS} terminals per server.`)
        return
      }
      const key = newKey()
      const title = dir ? dir.split("/").filter(Boolean).pop() || "/" : "Shell"
      commit([
        ...tabs,
        { key, title, cwd: dir, status: { kind: "connecting" } },
      ])
      setActiveKey(key)
    },
    [commit],
  )

  useEffect(() => {
    if (!list.isFetchedAfterMount) return
    if (!restored.current) {
      restored.current = true
      const tabs: Tab[] = (list.data ?? []).map((s) => ({
        key: newKey(),
        sessionId: s.id,
        title: s.title,
        recorded: s.recorded,
        status: { kind: "connecting" },
      }))
      commit(tabs)
      setActiveKey(tabs.at(-1)?.key ?? null)
      if (tabs.length === 0 && !cwd) add()
    }
    // Also a later ?cwd=, while the page is already open.
    if (cwd && cwd !== openedCwd.current) {
      add(cwd)
      void setCwd(null)
    }
    openedCwd.current = cwd
  }, [list.isFetchedAfterMount, list.data, cwd, setCwd, add, commit])

  const update = useCallback(
    (key: string, patch: Partial<Tab>) =>
      commit(
        tabsRef.current.map((t) => (t.key === key ? { ...t, ...patch } : t)),
      ),
    [commit],
  )

  const remove = useCallback(
    (key: string) => {
      const tabs = tabsRef.current
      const index = tabs.findIndex((t) => t.key === key)
      const tab = tabs[index]
      if (!tab) return
      const alive = tab.status.kind !== "exited" && tab.status.kind !== "failed"
      if (tab.sessionId && alive) close.mutate(tab.sessionId)
      const next = tabs.filter((t) => t.key !== key)
      commit(next)
      setActiveKey((active) =>
        active === key
          ? (next[Math.min(index, next.length - 1)]?.key ?? null)
          : active,
      )
    },
    [close.mutate, commit],
  )

  // The tab's shell started (or was resumed). A new shell keeps the tab's
  // name when it already had one (a restart, or one opened in a folder).
  const attach = useCallback(
    (key: string, sessionId: string, title: string, recorded: boolean) => {
      const tab = tabsRef.current.find((t) => t.key === key)
      if (!tab) return
      const keep = tab.sessionId !== sessionId && (tab.sessionId || tab.cwd)
      update(key, { sessionId, recorded, title: keep ? tab.title : title })
      if (keep) rename.mutate({ session: sessionId, title: tab.title })
    },
    [update, rename.mutate],
  )

  const setTitle = useCallback(
    (key: string, title: string) => {
      const tab = tabsRef.current.find((t) => t.key === key)
      const clean = title.trim()
      if (!tab || !clean || clean === tab.title) return
      const previous = tab.title
      update(key, { title: clean })
      if (!tab.sessionId) return
      rename.mutate(
        { session: tab.sessionId, title: clean },
        {
          onError: (err) => {
            update(key, { title: previous })
            toast.error(err.message)
          },
        },
      )
    },
    [update, rename.mutate],
  )

  return {
    tabs,
    error: list.error,
    retry: () => list.refetch(),
    activeKey,
    setActiveKey,
    add,
    update,
    attach,
    remove,
    setTitle,
  }
}
