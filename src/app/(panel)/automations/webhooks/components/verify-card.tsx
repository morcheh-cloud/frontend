"use client"

import { ShieldCheck } from "lucide-react"
import Link from "next/link"

import { CodeTabs } from "@/components/code-block"
import { guideHref } from "@/components/help/guides"
import { cn } from "@/lib/utils"
import { signatureSamples } from "./signature"

// How an endpoint checks that a delivery is really from Morche, with code to
// copy. A card on desktop, a plain group on phones.
export function VerifyCard({ phone }: { phone: boolean }) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3",
        phone
          ? "border-t border-border p-4"
          : "rounded-2xl border border-border p-5",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <ShieldCheck className="size-5" />
        </span>
        <h2 className="text-body font-medium">Verify the signature</h2>
      </div>
      <p className="text-body-sm text-muted-foreground">
        Every delivery carries{" "}
        <code className="font-mono text-caption">X-Morche-Timestamp</code> and{" "}
        <code className="font-mono text-caption">X-Morche-Signature</code>:{" "}
        <code className="font-mono text-caption break-all">
          sha256=HMAC_SHA256(secret, timestamp + "." + body)
        </code>
        . Compute it over the raw body, compare in constant time, and refuse
        timestamps older than five minutes.
      </p>
      <CodeTabs label="signature check" samples={signatureSamples} />
      <Link
        href={guideHref("api", "verify")}
        className="self-start text-body-sm font-medium text-brand underline-offset-4 hover:underline max-md:py-2.5"
      >
        More in the guide
      </Link>
    </section>
  )
}
