import type { GuideSection } from "../components/prose"
import { access } from "./access"
import { ansible } from "./ansible"
import { applications } from "./applications"
import { cron } from "./cron"
import { cronjobs } from "./cronjobs"
import { databases } from "./databases"
import { dns } from "./dns"
import { fail2ban } from "./fail2ban"
import { files } from "./files"
import { firewall } from "./firewall"
import { gettingStarted } from "./getting-started"
import { networkMap } from "./network-map"
import { ports } from "./ports"
import { power } from "./power"
import { reverseProxy } from "./reverse-proxy"
import { scripts } from "./scripts"
import { serverNotes } from "./server-notes"
import { serverOverview } from "./server-overview"
import { servers } from "./servers"
import { serviceLauncher } from "./service-launcher"
import { services } from "./services"
import { storage } from "./storage"
import { tasks } from "./tasks"
import { terminal } from "./terminal"
import { terminalRecordings } from "./terminal-recordings"
import { users } from "./users"

// Each guide's sections, by the slug in components/help/guides.ts.
export const content: Record<string, GuideSection[]> = {
  "getting-started": gettingStarted,
  servers,
  "network-map": networkMap,
  "server-overview": serverOverview,
  "server-notes": serverNotes,
  "terminal-recordings": terminalRecordings,
  terminal,
  files,
  cron,
  ports,
  firewall,
  fail2ban,
  users,
  services,
  power,
  databases,
  dns,
  "reverse-proxy": reverseProxy,
  "service-launcher": serviceLauncher,
  applications,
  ansible,
  cronjobs,
  scripts,
  storage,
  tasks,
  access,
}
