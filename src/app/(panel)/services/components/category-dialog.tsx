"use client"

import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fieldErrors } from "@/lib/api"
import type { AppCategory } from "@/lib/services"
import { useCategoryMutations } from "../api"
import { ColorPicker } from "./app-form"
import { type AppColor, appColorKeys } from "./meta"

const FORM_ID = "app-category-form"

// New category, or rename / recolor one.
export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: AppCategory
  onSaved: (category: AppCategory) => void
}) {
  const [name, setName] = useState(category?.name ?? "")
  const [color, setColor] = useState<AppColor>(
    (appColorKeys as readonly string[]).includes(category?.color ?? "")
      ? (category?.color as AppColor)
      : "slate",
  )
  const [error, setError] = useState<string>()
  const { create, update } = useCategoryMutations()
  const pending = create.isPending || update.isPending

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Give the category a name.")
    const body = { name: name.trim(), color }
    const handlers = {
      onSuccess: onSaved,
      onError: (err: Error) => {
        const fields = fieldErrors(err)
        if (fields.name) setError(fields.name)
        else toast.error(err.message)
      },
    }
    if (category) update.mutate({ id: category.id, body }, handlers)
    else create.mutate(body, handlers)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? `Edit ${category.name}` : "New category"}
      description="Categories are shared by everyone in this workspace."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {category ? "Save" : "Add category"}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-5"
      >
        <Field label="Name" error={error}>
          {(p) => (
            <Input
              {...p}
              value={name}
              placeholder="Monitoring"
              enterKeyHint="done"
              onChange={(e) => {
                setName(e.target.value)
                setError(undefined)
              }}
            />
          )}
        </Field>
        <ColorPicker value={color} onChange={setColor} />
      </form>
    </ResponsiveDialog>
  )
}
