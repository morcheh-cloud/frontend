"use client"

import { useMutation } from "@tanstack/react-query"
import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react"
import {
  type KeyboardEvent,
  type SubmitEvent,
  useEffect,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { login } from "../api"

type FieldErrors = { username?: string; password?: string }

function errorMessage(error: Error) {
  if (error instanceof ApiError && error.status === 401) {
    return "Username or password is incorrect."
  }
  if (error instanceof ApiError) {
    return "The server couldn't sign you in. Try again in a moment."
  }
  return "Couldn't reach the server. Check your connection and try again."
}

export function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Focus the first field with a mouse/trackpad only; on phones an instant
  // keyboard would cover the screen before the user has seen it.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      usernameRef.current?.focus()
    }
  }, [])

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      // TODO: navigate to the dashboard once it exists.
    },
    onError: () => setPassword(""),
  })

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors: FieldErrors = {}
    if (!username.trim()) errors.username = "Enter your username."
    if (!password) errors.password = "Enter your password."
    setFieldErrors(errors)
    if (errors.username || errors.password) return

    mutation.mutate({ username: username.trim(), password, remember })
  }

  function trackCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"))
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {mutation.error && (
        <div
          role="alert"
          className="flex gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-body-sm text-foreground"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{errorMessage(mutation.error)}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          required
          ref={usernameRef}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          onKeyDown={(event) => {
            // Keyboard "Next" moves on to the password, like a native form.
            if (event.key === "Enter" && !password) {
              event.preventDefault()
              passwordRef.current?.focus()
            }
          }}
          aria-invalid={fieldErrors.username ? true : undefined}
          aria-describedby={fieldErrors.username ? "username-error" : undefined}
        />
        {fieldErrors.username && (
          <p id="username-error" className="text-body-sm text-destructive">
            {fieldErrors.username}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            enterKeyHint="go"
            required
            ref={passwordRef}
            className="pe-11"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={trackCapsLock}
            onKeyUp={trackCapsLock}
            onBlur={() => setCapsLock(false)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              [
                fieldErrors.password && "password-error",
                capsLock && "caps-lock",
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute inset-y-0 end-0 h-full w-11 rounded-s-none text-muted-foreground md:w-10"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        {fieldErrors.password && (
          <p id="password-error" className="text-body-sm text-destructive">
            {fieldErrors.password}
          </p>
        )}
        {capsLock && (
          <p id="caps-lock" className="text-body-sm text-muted-foreground">
            Caps Lock is on.
          </p>
        )}
      </div>

      <Label className="w-fit font-normal text-muted-foreground">
        <Checkbox
          name="remember"
          checked={remember}
          onCheckedChange={(checked) => setRemember(checked)}
        />
        Keep me signed in
      </Label>

      <Button
        type="submit"
        size="lg"
        className="mt-1 w-full"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <>
            <LoaderCircle className="animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  )
}
