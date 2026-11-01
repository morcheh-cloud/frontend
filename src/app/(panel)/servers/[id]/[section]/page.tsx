import { notFound } from "next/navigation"

import { ComingSoon } from "../components/coming-soon"
import { sectionFor } from "../components/sections"

// Never in the static shell (see ../page.tsx).
export const instant = false

// Sections that are planned but not built yet. A built section gets its own
// folder next to this one, which takes precedence over [section].
export default async function PlannedSectionPage({
  params,
}: PageProps<"/servers/[id]/[section]">) {
  const { section } = await params
  if (!sectionFor(section)) notFound()
  return <ComingSoon />
}
