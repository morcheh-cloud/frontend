"use client"

import { CircleUser, LogOut, ShieldCheck } from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/components/auth/auth"
import { ThemeMenuItems } from "@/components/theme-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Up to two letters for the avatar: "Ali Marefati" → AM, "root" → RO.
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0] ?? "?").slice(0, 2).toUpperCase()
}

// The person signed in, at the very end of the header: account, sessions,
// theme and sign out.
export function AccountMenu() {
  const { user, signOut } = useAuth()
  const name = user.full_name || user.username

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              aria-label="Account"
              className="ms-1 flex size-8 items-center justify-center rounded-full bg-brand-soft text-caption font-medium text-brand-strong transition-shadow outline-none hover:ring-2 hover:ring-mist focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:ring-2 data-popup-open:ring-brand/40"
            />
          }
        >
          {initials(name)}
        </TooltipTrigger>
        <TooltipContent side="bottom">{name}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span dir="auto" className="truncate font-medium text-foreground">
              {name}
            </span>
            {user.full_name && (
              <span className="truncate font-normal">{user.username}</span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/account" />}>
            <CircleUser />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/account#sessions" />}>
            <ShieldCheck />
            Sessions and sign-ins
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={signOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
