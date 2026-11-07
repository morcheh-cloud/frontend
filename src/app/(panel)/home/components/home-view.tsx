"use client"

import { useAuth } from "@/components/auth/auth"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useHome } from "../api"
import { HomeDesktop } from "./home-desktop"
import { HomeMobile } from "./home-mobile"
import { greeting, statusLine } from "./parts"

export function HomeView() {
  const phone = useIsPhone()
  const { user } = useAuth()
  const home = useHome()
  if (phone === null) return null

  const title = greeting(user.first_name || user.username)
  const subtitle = statusLine(home)
  return phone ? (
    <HomeMobile home={home} title={title} subtitle={subtitle} />
  ) : (
    <HomeDesktop home={home} title={title} subtitle={subtitle} />
  )
}
