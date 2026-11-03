"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, LogOut, RefreshCw } from "lucide-react"
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { ApiError, api, onRefused } from "@/lib/api"
import type { MyAccess, PanelUser } from "@/lib/services"
import { ChangePasswordForm } from "./change-password"
import { accessKey, meKey } from "./keys"
import { atLeast, higher, type Level } from "./level"
import { clearLocalData, rememberUser } from "./local-data"

type AuthState = {
  user: PanelUser
  access: MyAccess
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const state = use(AuthContext)
  if (!state) throw new Error("useAuth needs an AuthGate")
  return state
}

export function useAccess() {
  const { access } = useAuth()
  return useMemo(() => {
    const workspace = new Map(access.workspaces.map((w) => [w.id, w]))
    const server = new Map(access.servers.map((s) => [s.id, s.level]))
    const storage = new Map(access.storages.map((s) => [s.id, s.level]))
    const app = new Map(access.apps.map((a) => [a.id, a.level]))
    return {
      admin: access.admin,
      // Can add a server, storage or service somewhere.
      canCreateAnywhere: access.admin || access.can_create,
      canCreateIn: (id: string | null | undefined) =>
        access.admin || (!!id && !!workspace.get(id)?.can_create),
      serverLevel: (id: string, workspaceId?: string): string =>
        access.admin
          ? "owner"
          : higher(
              server.get(id),
              workspaceId ? workspace.get(workspaceId)?.level : undefined,
            ),
      storageLevel: (id: string, workspaceId?: string): string =>
        access.admin
          ? "owner"
          : higher(
              storage.get(id),
              workspaceId ? workspace.get(workspaceId)?.level : undefined,
            ),
      appLevel: (id: string, workspaceId?: string): string =>
        access.admin
          ? "owner"
          : higher(
              app.get(id),
              workspaceId ? workspace.get(workspaceId)?.level : undefined,
            ),
      workspaceLevel: (id: string): string =>
        access.admin ? "owner" : (workspace.get(id)?.level ?? "none"),
      // Their best level anywhere: gates pages that aren't about one resource.
      highest: (min: Level) =>
        access.admin ||
        access.workspaces.some((w) => atLeast(w.level, min)) ||
        access.servers.some((s) => atLeast(s.level, min)) ||
        access.storages.some((s) => atLeast(s.level, min)) ||
        access.apps.some((a) => atLeast(a.level, min)),
    }
  }, [access])
}

function goToLogin() {
  const { pathname, search } = window.location
  const next = encodeURIComponent(pathname + search)
  window.location.replace(`/login?next=${next}`)
}

function useSignOut() {
  return useCallback(async () => {
    try {
      await api.auth.authLogout()
    } catch {}
    await clearLocalData()
    // A full load: nothing of this session stays in memory.
    window.location.replace("/login")
  }, [])
}

// Everything that needs a signed-in person goes inside this: nothing below it
// renders, or asks the backend anything, until they're known to be active.
export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const signOut = useSignOut()

  const me = useQuery({
    queryKey: meKey,
    queryFn: () => api.auth.getMe(),
    retry: (count, error) => !(error instanceof ApiError) && count < 2,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 10_000 : 60_000,
  })
  const user = me.data
  const ready = user?.status === "active" && !user.must_change_password

  const access = useQuery({
    queryKey: accessKey,
    queryFn: () => api.auth.getMyAccess(),
    enabled: ready,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  })

  // A refusal from any request can mean the session ended or the access
  // changed: look again, at most every few seconds.
  const last = useRef(0)
  useEffect(
    () =>
      onRefused(() => {
        if (Date.now() - last.current < 3000) return
        last.current = Date.now()
        queryClient.invalidateQueries({ queryKey: ["auth"] })
      }),
    [queryClient],
  )

  const lost =
    (me.error instanceof ApiError && me.error.status === 401) ||
    user?.status === "blocked"
  useEffect(() => {
    if (lost) goToLogin()
  }, [lost])

  const id = user?.id
  useEffect(() => {
    if (id) rememberUser(id)
  }, [id])

  if (lost) return null
  if (me.error && !user) {
    return <Unreachable onRetry={() => me.refetch()} checking={me.isFetching} />
  }
  if (!user) return null
  if (user.status === "pending") return <WaitingView onSignOut={signOut} />
  if (user.must_change_password) return <MustChangeView onSignOut={signOut} />
  if (access.error && !access.data) {
    return (
      <Unreachable
        onRetry={() => access.refetch()}
        checking={access.isFetching}
      />
    )
  }
  if (!access.data) return null

  return (
    <AuthContext value={{ user, access: access.data, signOut }}>
      {children}
    </AuthContext>
  )
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col bg-background px-6 pt-[max(--spacing(8),env(safe-area-inset-top))] pb-[max(--spacing(6),env(safe-area-inset-bottom))] sm:items-center sm:justify-center">
      <div className="flex w-full flex-1 flex-col gap-10 sm:max-w-sm sm:flex-none sm:gap-8">
        <Logo />
        {children}
      </div>
    </main>
  )
}

function Unreachable({
  onRetry,
  checking,
}: {
  onRetry: () => void
  checking: boolean
}) {
  return (
    <Screen>
      <div className="flex flex-col gap-3">
        <h1 className="text-subheading font-medium">Can't reach the server</h1>
        <p className="text-body-sm text-muted-foreground">
          Check your connection, then try again.
        </p>
        <Button
          size="lg"
          className="mt-3 w-full"
          disabled={checking}
          onClick={onRetry}
        >
          {checking ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
          Try again
        </Button>
      </div>
    </Screen>
  )
}

// A person who signed up on their own, until an admin lets them in. The query
// above keeps polling, so the panel opens by itself on approval.
function WaitingView({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <Screen>
      <div className="flex flex-1 flex-col gap-3 sm:flex-none">
        <h1 className="text-subheading font-medium">Waiting for approval</h1>
        <p className="text-body-sm text-muted-foreground">
          An admin has to approve your account before you can use Morcheh. This
          page opens by itself as soon as they do.
        </p>
        <Button
          variant="outline"
          size="lg"
          className="mt-auto w-full sm:mt-3"
          onClick={onSignOut}
        >
          <LogOut />
          Sign out
        </Button>
      </div>
    </Screen>
  )
}

// A temporary password from an admin has to go before anything else works.
function MustChangeView({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const [signingOut, setSigningOut] = useState(false)
  return (
    <Screen>
      <div className="flex flex-1 flex-col gap-6 sm:flex-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-subheading font-medium">
            Choose your own password
          </h1>
          <p className="text-body-sm text-muted-foreground">
            You signed in with a temporary password. Replace it to continue.
          </p>
        </div>
        <ChangePasswordForm currentLabel="Temporary password" />
        <Button
          variant="ghost"
          size="lg"
          disabled={signingOut}
          className="mt-auto w-full sm:mt-0"
          onClick={() => {
            setSigningOut(true)
            onSignOut()
          }}
        >
          Sign out
        </Button>
      </div>
    </Screen>
  )
}
