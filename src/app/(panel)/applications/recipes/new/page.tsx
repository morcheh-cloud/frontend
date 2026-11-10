import type { Metadata } from "next"
import { Suspense } from "react"

import { RecipeEditorFromRoute } from "../../components/recipe-editor"

export const metadata: Metadata = {
  title: "New application",
}

export const instant = false

export default function NewRecipePage() {
  return (
    <Suspense>
      <RecipeEditorFromRoute />
    </Suspense>
  )
}
