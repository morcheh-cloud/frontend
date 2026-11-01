import { ServerSettings } from "../components/server-settings"

// The shell shows a skeleton until the server loads in the browser, so this
// page never renders in the static shell: skip instant-navigation checks.
export const instant = false

export default function ServerSettingsPage() {
  return <ServerSettings />
}
