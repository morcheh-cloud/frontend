import { Overview } from "./components/overview"

// The shell shows a skeleton until the server loads in the browser, so this
// page never renders in the static shell: skip instant-navigation checks.
export const instant = false

export default function ServerOverviewPage() {
  return <Overview />
}
