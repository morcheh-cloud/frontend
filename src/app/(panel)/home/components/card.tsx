"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

// The desktop card every Home widget sits in: a title row, then the body.
export function Card({
  title,
  caption,
  icon,
  action,
  children,
  className,
}: {
  title: string
  caption?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <header className="flex min-h-14 items-center gap-3 border-b border-border px-5 py-2">
        {icon}
        <h2 className="min-w-0 truncate text-body font-medium">{title}</h2>
        {caption && (
          <span className="min-w-0 truncate text-caption text-ash">
            {caption}
          </span>
        )}
        <span className="ms-auto flex shrink-0 items-center gap-2">
          {action}
        </span>
      </header>
      {children}
    </section>
  )
}

export function CardLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className="rounded-md text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  )
}

// An empty card body: what will show here, and how to start.
export function Blank({
  icon,
  text,
  action,
}: {
  icon: ReactNode
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-ash">
        {icon}
      </span>
      <p className="max-w-64 text-body-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  )
}

export const toneText = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
} as const

export const toneTile = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const

export const toneDot = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-mist",
} as const

export type Tone = keyof typeof toneText
