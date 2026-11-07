import type { Metadata } from "next"

import { HomeView } from "./components/home-view"

export const metadata: Metadata = {
  title: "Home",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function HomePage() {
  return <HomeView />
}
