"use client"

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
  X,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useFacets } from "../api"
import { authLabel, StatusDot, statusMeta } from "./meta"
import { SearchInput } from "./search-input"
import {
  authMethods,
  type SortField,
  statuses,
  useFilters,
} from "./use-filters"

export type Option = {
  value: string
  label: string
  count?: number
  dot?: string
}

export const sortLabels: Record<SortField, string> = {
  name: "Name",
  host: "Address",
  os: "Operating system",
  status: "Status",
  last_checked: "Last checked",
  created: "Date added",
}

// The filter dimensions, with counts from the facets endpoint. Shared by the
// desktop popovers and the phone sheets.
export function useFilterOptions() {
  const facets = useFacets()
  const data = facets.data
  const statusCounts = new Map(data?.status.map((f) => [f.value, f.count]))
  return {
    os: (data?.os ?? []).map((f) => ({
      value: f.value,
      label: f.value === "unknown" ? "Not detected yet" : f.label,
      count: f.count,
    })),
    status: statuses.map((s) => ({
      value: s,
      label: statusMeta[s].label,
      count: statusCounts.get(s) ?? 0,
      dot: s,
    })),
    tag: (data?.tags ?? []).map((f) => ({
      value: f.value,
      label: f.value,
      count: f.count,
    })),
    auth: authMethods.map((a) => ({ value: a, label: authLabel[a] })),
  }
}

export function Toolbar() {
  const { filters, setFilters } = useFilters()
  const options = useFilterOptions()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput shortcut className="min-w-56 flex-1" />
      <FilterPopover
        label="OS"
        options={options.os}
        value={filters.os}
        onChange={(os) => setFilters({ os })}
        emptyText="OS is detected on the first successful check."
      />
      <FilterPopover
        label="Status"
        options={options.status}
        value={filters.status}
        onChange={(status) =>
          setFilters({ status: status as typeof filters.status })
        }
      />
      <FilterPopover
        label="Tags"
        options={options.tag}
        value={filters.tag}
        onChange={(tag) => setFilters({ tag })}
        searchable
        emptyText="No tags yet. Add some when editing a server."
      />
      <FilterPopover
        label="Auth"
        options={options.auth}
        value={filters.auth}
        onChange={(auth) => setFilters({ auth: auth as typeof filters.auth })}
      />
      <SortMenu />
    </div>
  )
}

function FilterPopover({
  label,
  options,
  value,
  onChange,
  searchable = false,
  emptyText,
}: {
  label: string
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  searchable?: boolean
  emptyText?: string
}) {
  const [query, setQuery] = useState("")
  const shown = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-1.5 px-3",
              value.length > 0 &&
                "border-brand/40 bg-brand-soft text-brand-strong hover:bg-brand-soft",
            )}
          />
        }
      >
        {label}
        {value.length > 0 && (
          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white tabular-nums">
            {value.length}
          </span>
        )}
        <ChevronDown className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-1 p-1.5">
        {searchable && options.length > 6 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Find ${label.toLowerCase()}…`}
            className="mb-1 h-8 rounded-lg border border-input px-2.5 text-sm outline-none focus-visible:border-ring"
          />
        )}
        {options.length === 0 ? (
          <p className="px-2 py-3 text-body-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {shown.map((o) => {
              const checked = value.includes(o.value)
              return (
                <li key={o.value}>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox inside is the control */}
                  <label className="flex h-8 cursor-default items-center gap-2.5 rounded-lg px-2 text-body-sm hover:bg-muted">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(on) =>
                        onChange(
                          on
                            ? [...value, o.value]
                            : value.filter((v) => v !== o.value),
                        )
                      }
                    />
                    {o.dot && (
                      <StatusDot status={o.dot as keyof typeof statusMeta} />
                    )}
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.count !== undefined && (
                      <span className="text-caption text-ash tabular-nums">
                        {o.count}
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 self-start text-muted-foreground"
            onClick={() => onChange([])}
          >
            Clear {label.toLowerCase()}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

function SortMenu() {
  const { filters, setFilters } = useFilters()
  const Icon =
    filters.order === "desc" ? ArrowDownWideNarrow : ArrowUpNarrowWide
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="h-9 gap-1.5 px-3" />}
      >
        <Icon className="size-4" />
        {sortLabels[filters.sort]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.sort}
            onValueChange={(sort) => setFilters({ sort: sort as SortField })}
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={filters.order}
          onValueChange={(order) =>
            setFilters({ order: order as "asc" | "desc" })
          }
        >
          <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// The selected filter values as removable chips, under the toolbar.
export function ActiveFilters() {
  const { filters, setFilters, activeCount, clearFilters } = useFilters()
  const options = useFilterOptions()
  if (activeCount === 0) return null

  const label = (dim: keyof typeof options, v: string) =>
    options[dim].find((o) => o.value === v)?.label ?? v
  const chips = [
    ...filters.os.map((v) => ({
      key: `os-${v}`,
      text: label("os", v),
      remove: () => setFilters({ os: filters.os.filter((x) => x !== v) }),
    })),
    ...filters.status.map((v) => ({
      key: `status-${v}`,
      text: statusMeta[v].label,
      remove: () =>
        setFilters({ status: filters.status.filter((x) => x !== v) }),
    })),
    ...filters.tag.map((v) => ({
      key: `tag-${v}`,
      text: `#${v}`,
      remove: () => setFilters({ tag: filters.tag.filter((x) => x !== v) }),
    })),
    ...filters.auth.map((v) => ({
      key: `auth-${v}`,
      text: authLabel[v],
      remove: () => setFilters({ auth: filters.auth.filter((x) => x !== v) }),
    })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-muted ps-2.5 pe-1 text-body-sm"
        >
          {chip.text}
          <button
            type="button"
            aria-label={`Remove ${chip.text}`}
            onClick={chip.remove}
            className="flex size-5 items-center justify-center rounded-full text-ash hover:bg-mist hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={clearFilters}
      >
        Clear all
      </Button>
    </div>
  )
}
