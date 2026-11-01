"use client"

import { createContext, useContext } from "react"

import type { Server } from "@/lib/services"
import type { Section } from "./sections"

type ServerPage = {
  server: Server
  checking: boolean
  section: Section
  phone: boolean
  // Leave the page once the server is deleted from it.
  onDeleted: () => void
}

export const ServerPageContext = createContext<ServerPage | null>(null)

// The server whose page this is, for every section under servers/[id].
export function useServerPage() {
  const ctx = useContext(ServerPageContext)
  if (!ctx) throw new Error("useServerPage outside ServerShell")
  return ctx
}
