"use client"

import { ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { SignInEntry } from "@/lib/services"
import { useAnswerSignInAlert, useSignInAlerts } from "./api"
import { deviceName } from "./meta"

const whenFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

// Asks about a sign-in to your account from a network it hadn't used, one at
// a time, until each is answered. "Not me" signs that device out at once.
export function SignInAlertBanner() {
  const alerts = useSignInAlerts()
  const answer = useAnswerSignInAlert()
  const router = useRouter()
  const items = alerts.data ?? []
  const e: SignInEntry | undefined = items[0]
  if (!e) return null

  const reply = (value: "me" | "not_me") =>
    answer.mutate(
      { id: e.id, answer: value },
      {
        onSuccess: () => {
          if (value === "me") return
          toast.success("That device is signed out", {
            description:
              "If someone else knows your password, change it now: that also signs out every other device.",
            action: {
              label: "Change password",
              onClick: () => router.push("/account#password"),
            },
            duration: 15_000,
          })
        },
        onError: (err) => toast.error(err.message),
      },
    )

  const where = `${deviceName(e)} · ${e.ip}`
  return (
    <div
      role="alert"
      className="border-b border-warning/30 bg-warning/10 px-4 py-3 md:px-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="min-w-0 text-body-sm">
            <p className="font-medium">
              New sign-in to your account. Was it you?
            </p>
            <p className="text-muted-foreground">
              {where} · {whenFmt.format(new Date(e.at))}
              {!e.session_open && " · already signed out"}
              {items.length > 1 && ` · ${items.length - 1} more to check`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 max-md:ps-8">
          <Button
            variant="outline"
            className="max-md:h-11 max-md:flex-1"
            disabled={answer.isPending}
            onClick={() => reply("me")}
          >
            Yes, it was me
          </Button>
          <Button
            variant="destructive"
            className="max-md:h-11 max-md:flex-1"
            disabled={answer.isPending}
            onClick={() => reply("not_me")}
          >
            No, sign it out
          </Button>
        </div>
      </div>
    </div>
  )
}
