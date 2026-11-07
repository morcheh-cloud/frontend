"use client"

import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react"

import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { type ThemeChoice, useTheme } from "./theme"

export const themeChoices: {
  value: ThemeChoice
  label: string
  icon: LucideIcon
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

const isChoice = (v: unknown): v is ThemeChoice =>
  themeChoices.some((c) => c.value === v)

/** Light / Dark / System as radio items, for a dropdown menu. */
export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme()
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={theme}
        onValueChange={(v) => isChoice(v) && setTheme(v)}
      >
        {themeChoices.map(({ value, label, icon: Icon }) => (
          <DropdownMenuRadioItem key={value} value={value} closeOnClick>
            <Icon />
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  )
}

/** Three tiles (Account page): what the panel looks like on this browser. */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("grid grid-cols-3 gap-2 sm:max-w-md", className)}
    >
      {themeChoices.map(({ value, label, icon: Icon }) => {
        const on = theme === value
        return (
          // biome-ignore lint/a11y/useSemanticElements: a tile, not a bare radio input
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(value)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-lg border border-border p-3 text-body-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              on &&
                "border-brand bg-brand-soft font-medium text-brand-strong hover:bg-brand-soft hover:text-brand-strong",
            )}
          >
            <Icon className="size-5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
