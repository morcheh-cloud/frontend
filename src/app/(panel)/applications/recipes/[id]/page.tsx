import type { Metadata } from "next"
import { Suspense } from "react"

import { RecipeEditorFromRoute } from "../../components/recipe-editor"

export const metadata: Metadata = {
  title: "Application",
}

export const instant = false

export default function RecipePage() {
  return (
    <Suspense>
      <RecipeEditorFromRoute />
    </Suspense>
  )
}
