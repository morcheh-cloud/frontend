import type { GuideSection } from "../components/prose"
import { access } from "./access"
import { alerts } from "./alerts"
import { ansible } from "./ansible"
import { applications } from "./applications"
import { cloud } from "./cloud"
import { commandLog } from "./command-log"
import { containers } from "./containers"
import { cron } from "./cron"
import { cronjobs } from "./cronjobs"
import { databases } from "./databases"
import { dns } from "./dns"
import { fail2ban } from "./fail2ban"
import { files } from "./files"
import { firewall } from "./firewall"
import { gettingStarted } from "./getting-started"
import { logRetention } from "./log-retention"
import { networkMap } from "./network-map"
import { packages } from "./packages"
import { ports } from "./ports"
import { power } from "./power"
import { processes } from "./processes"
import { reverseProxy } from "./reverse-proxy"
import { scripts } from "./scripts"
import { serverMetrics } from "./server-metrics"
import { serverNotes } from "./server-notes"
import { serverOverview } from "./server-overview"
import { servers } from "./servers"
import { serviceLauncher } from "./service-launcher"
import { services } from "./services"
import { storage } from "./storage"
import { tasks } from "./tasks"
import { terminal } from "./terminal"
import { terminalRecordings } from "./terminal-recordings"
import { uptime } from "./uptime"
import { users } from "./users"
import { virtualMachines } from "./virtual-machines"

// Each guide's sections, by the slug in components/help/guides.ts.
export const content: Record<string, GuideSection[]> = {
  "getting-started": gettingStarted,
  servers,
  "network-map": networkMap,
  "server-overview": serverOverview,
  "server-metrics": serverMetrics,
  "server-notes": serverNotes,
  "command-log": commandLog,
  "terminal-recordings": terminalRecordings,
  uptime,
  alerts,
  terminal,
  files,
  cron,
  ports,
  firewall,
  fail2ban,
  users,
  services,
  processes,
  containers,
  packages,
  power,
  "virtual-machines": virtualMachines,
  databases,
  cloud,
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
  "log-retention": logRetention,
}
