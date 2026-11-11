"use client"

import { Copy, ShieldBan } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"

// The backend's answer when the panel's allowlist keeps an address out.
export const ADDRESS_REFUSED = "urn:morcheh:address-not-allowed"

export function isAddressRefused(error: unknown) {
  return error instanceof ApiError && error.body?.type === ADDRESS_REFUSED
}

// The address the refusal names, read back from its message.
export function refusedAddress(error: unknown) {
  if (!(error instanceof ApiError)) return ""
  return /\(([^)]+)\)/.exec(error.message)?.[1] ?? ""
}

// What a person sees when the panel won't answer their address: no form, no
// data, just what happened and what to send an admin.
export function AddressBlocked({ address }: { address: string }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <ShieldBan className="size-5" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-subheading font-medium">
          This address isn't allowed
        </h1>
        <p className="text-body-sm text-muted-foreground">
          This panel only answers a list of addresses, and the one you're
          connecting from isn't on it. Connect from an allowed network (like the
          office or the VPN), or ask an admin to add your address.
        </p>
      </div>
      {address && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-subtle py-1 ps-3 pe-1">
          <span className="text-caption text-ash">Your address</span>
          <code className="min-w-0 flex-1 truncate font-mono text-body-sm">
            {address}
          </code>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy the address"
            onClick={() => {
              navigator.clipboard
                ?.writeText(address)
                .then(() => toast.success("Address copied"))
                .catch(() => {})
            }}
          >
            <Copy />
          </Button>
        </div>
      )}
    </div>
  )
}
