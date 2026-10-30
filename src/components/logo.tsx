import { cn } from "@/lib/utils"

// Morcheh means "ant": the mark is its three body segments.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 16"
      fill="currentColor"
      aria-hidden="true"
      className={cn("h-4 w-8", className)}
    >
      <circle cx="4.5" cy="8" r="3.5" />
      <circle cx="12.5" cy="8" r="2.5" />
      <ellipse cx="24" cy="8" rx="7" ry="5.5" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-body font-medium text-foreground",
        className,
      )}
    >
      <LogoMark className="text-brand" />
      Morcheh
    </span>
  )
}
