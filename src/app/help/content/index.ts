import type { GuideSection } from "../components/prose"
import { cron } from "./cron"
import { fail2ban } from "./fail2ban"
import { files } from "./files"
import { gettingStarted } from "./getting-started"
import { networkMap } from "./network-map"
import { ports } from "./ports"
import { power } from "./power"
import { serverOverview } from "./server-overview"
import { servers } from "./servers"
import { services } from "./services"
import { storage } from "./storage"
import { tasks } from "./tasks"
import { terminal } from "./terminal"
import { users } from "./users"

// Each guide's sections, by the slug in components/help/guides.ts.
export const content: Record<string, GuideSection[]> = {
  "getting-started": gettingStarted,
  servers,
  "network-map": networkMap,
  "server-overview": serverOverview,
  terminal,
  files,
  cron,
  ports,
  fail2ban,
  users,
  services,
  power,
  storage,
  tasks,
}
