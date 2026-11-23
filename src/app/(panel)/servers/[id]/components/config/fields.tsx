"use client"

import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const ipv6 = /^[0-9a-f:]+$/i

export function isIP(s: string) {
  return ipv4.test(s) || (s.includes(":") && ipv6.test(s))
}

export function isCIDR(s: string) {
  const [a, p, extra] = s.split("/")
  if (extra !== undefined || !p || !/^\d+$/.test(p) || !isIP(a)) return false
  return Number(p) <= (a.includes(":") ? 128 : 32)
}

const label = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/
export function isHostname(s: string) {
  return (
    s.length > 0 && s.length <= 253 && s.split(".").every((l) => label.test(l))
  )
}

// Rows of one value each, with add and remove. Blank rows are dropped by
// the caller; `check` marks a bad value inline.
export function ListEdit({
  values,
  onChange,
  placeholder,
  addLabel,
  check,
  problem,
  disabled,
  inputMode,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
  addLabel: string
  check?: (v: string) => boolean
  problem?: string
  disabled?: boolean
  inputMode?: "text" | "url" | "decimal"
}) {
  const rows = values.length ? values : [""]
  return (
    <div className="flex flex-col gap-2">
      {rows.map((v, i) => {
        const bad = v.trim() !== "" && check && !check(v.trim())
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity but their place
          <div key={i} className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                value={v}
                placeholder={placeholder}
                disabled={disabled}
                inputMode={inputMode}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={bad || undefined}
                className={cn(
                  "min-w-0 flex-1 font-mono",
                  bad && "border-destructive",
                )}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = e.target.value
                  onChange(next)
                }}
                onPaste={(e) => {
                  // A pasted list fills several rows.
                  const text = e.clipboardData.getData("text")
                  const parts = text.split(/[\s,]+/).filter(Boolean)
                  if (parts.length < 2) return
                  e.preventDefault()
                  const next = [...rows]
                  next.splice(i, 1, ...parts)
                  onChange(next)
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="max-md:size-11"
                aria-label="Remove"
                disabled={disabled || (rows.length === 1 && v === "")}
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </div>
            {bad && problem && (
              <span className="text-caption text-destructive">{problem}</span>
            )}
          </div>
        )
      })}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={disabled}
        onClick={() => onChange([...rows, ""])}
      >
        <Plus />
        {addLabel}
      </Button>
    </div>
  )
}

export const clean = (v: string[]) => v.map((s) => s.trim()).filter(Boolean)
