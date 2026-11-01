import type { Metadata } from "next"

import { PageHeader } from "@/components/panel/page-header"
import { GuideIndex } from "./components/guide-index"

export const metadata: Metadata = {
  title: "Help",
}

export default function HelpPage() {
  return (
    <>
      <PageHeader
        title="Help"
        description="How each part of Morcheh works, with examples and recommended settings."
      />
      <GuideIndex />
    </>
  )
}
