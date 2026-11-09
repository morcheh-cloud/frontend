"use client"

import { Info, KeyRound, ShieldAlert, Users } from "lucide-react"

import {
  AddButton,
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ListInput } from "@/app/(panel)/dns/components/fields"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ProxyInspection, Proxy as ReverseProxy } from "@/lib/services"
import {
  type AuthMode,
  type Draft,
  type Errors,
  freshUser,
  keptUsers,
  splitList,
} from "./draft"
import { EditorCard as Card } from "./editor-card"
import { RemoveButton, typing } from "./rows"

type Props = {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
  inspection?: ProxyInspection
}

const modes = [
  { value: "", label: "Off" },
  { value: "basic", label: "Password" },
  { value: "forward", label: "Sign-in service" },
] as const

const MAX_USERS = 100

// Ready-made settings for the common sign-in services. The address is
// where the service answers from the proxy's server.
const presets = [
  {
    name: "Authelia",
    url: "http://127.0.0.1:9091/api/authz/auth-request",
    signin: "https://auth.example.com/",
    headers: "Remote-User\nRemote-Groups\nRemote-Email\nRemote-Name",
    pass: "",
  },
  {
    name: "oauth2-proxy",
    url: "http://127.0.0.1:4180/oauth2/auth",
    signin: "/oauth2/start",
    headers: "X-Auth-Request-User\nX-Auth-Request-Email",
    pass: "/oauth2/",
  },
  {
    name: "authentik",
    url: "http://127.0.0.1:9000/outpost.goauthentik.io/auth/nginx",
    signin: "/outpost.goauthentik.io/start",
    headers:
      "X-authentik-username\nX-authentik-groups\nX-authentik-email\nX-authentik-name",
    pass: "/outpost.goauthentik.io/",
  },
] as const

// Who may open the site at all: nobody is asked (Off), a username and
// password kept by the proxy, or a sign-in service (SSO) that answers
// for each request.
export function LoginTab(props: Props) {
  const { draft, set, errors, phone } = props
  return (
    <>
      <Card
        title="Ask for a login"
        hint="Visitors sign in before they see anything. Paths marked No login in Routing stay open."
        phone={phone}
      >
        <div>
          <Segmented
            label="Login"
            items={modes}
            value={draft.authMode}
            onChange={(authMode: AuthMode) => set({ authMode })}
          />
        </div>
        <FieldError text={errors["auth.mode"]} />
        {draft.authMode === "" && (
          <p className="text-caption text-muted-foreground">
            Anyone who can reach the site can open it. Use Security to limit who
            can reach it.
          </p>
        )}
      </Card>
      {draft.authMode === "basic" && <Accounts {...props} />}
      {draft.authMode === "forward" && <SignInService {...props} />}
      {draft.authMode && <SkipForAllowed {...props} />}
    </>
  )
}

function Accounts({ draft, set, errors, phone }: Props) {
  const rows = draft.authUsers
  const patch = (key: string, p: Partial<(typeof rows)[number]>) =>
    set({ authUsers: rows.map((r) => (r.key === key ? { ...r, ...p } : r)) })
  return (
    <Card
      title="Accounts"
      hint="Each person gets a name and a password. The proxy keeps only a hash of each password."
      count={keptUsers(draft).length}
      phone={phone}
    >
      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((u, i) => {
            const saved = !!u.savedName && u.name.trim() === u.savedName
            const renamed = !!u.savedName && !saved
            const invalid = errors[`auth.users.${u.key}`] ? true : undefined
            return (
              <li key={u.key} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                  <Input
                    {...typing}
                    aria-label={`Account ${i + 1} name`}
                    aria-invalid={invalid}
                    autoComplete="off"
                    value={u.name}
                    onChange={(e) => patch(u.key, { name: e.target.value })}
                    placeholder="name"
                    className="w-[calc(100%-3.25rem)] font-mono md:w-56 md:shrink-0"
                  />
                  <div className="order-last w-full min-w-0 md:order-0 md:flex-1">
                    <SecretInput
                      aria-label={`Account ${i + 1} password`}
                      aria-invalid={invalid}
                      autoComplete="new-password"
                      value={u.password}
                      onChange={(e) =>
                        patch(u.key, { password: e.target.value })
                      }
                      placeholder={
                        saved
                          ? "Unchanged: type to set a new one"
                          : renamed
                            ? "A new name needs a new password"
                            : "Password"
                      }
                    />
                  </div>
                  <RemoveButton
                    label={`Remove account ${u.name || i + 1}`}
                    onClick={() =>
                      set({ authUsers: rows.filter((x) => x.key !== u.key) })
                    }
                  />
                </div>
                <FieldError text={errors[`auth.users.${u.key}`]} />
              </li>
            )
          })}
        </ul>
      )}
      <FieldError text={errors["auth.users"]} />
      {rows.length < MAX_USERS && (
        <AddButton onClick={() => set({ authUsers: [...rows, freshUser()] })}>
          Add an account
        </AddButton>
      )}
      <Field
        label="Title of the login box"
        hint="Browsers show it in their sign-in prompt. Empty = Restricted."
        error={errors["auth.realm"]}
      >
        {(f) => (
          <Input
            {...f}
            value={draft.authRealm}
            onChange={(e) => set({ authRealm: e.target.value })}
            placeholder="Restricted"
            maxLength={100}
          />
        )}
      </Field>
      <Callout icon={<Info />}>
        Browsers send the password with every request, so turn on HTTPS for this
        site. To sign out, people close the browser.
      </Callout>
    </Card>
  )
}

function SignInService({
  proxy: p,
  draft,
  set,
  errors,
  phone,
  inspection,
}: Props) {
  const missing = inspection && !inspection.auth_request
  return (
    <Card
      title="Sign-in service"
      hint={`Before each request ${p.kind_label} asks the service; it lets the visitor in or sends them to sign in. Works with Authelia, oauth2-proxy, authentik and others.`}
      phone={phone}
    >
      {missing && (
        <Callout icon={<ShieldAlert />} tone="warning">
          {p.kind_label} on {p.server_name} was built without the auth_request
          module, so it can't ask a sign-in service. Install a build that has it
          (the nginx package from nginx.org or your distro's nginx-extras).
        </Callout>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-muted-foreground">Start from:</span>
        {presets.map((x) => (
          <Button
            key={x.name}
            type="button"
            variant="outline"
            size="sm"
            className="h-9 md:h-8"
            onClick={() =>
              set({
                fwdUrl: x.url,
                fwdSignin: x.signin,
                fwdHeaders: x.headers,
                fwdPassPath: x.pass,
              })
            }
          >
            {x.name}
          </Button>
        ))}
      </div>
      <Field
        label="Check address"
        hint="Where the service answers each check, as the proxy's server sees it. 2xx lets the visitor in, 401 sends them to sign in, 403 refuses."
        error={errors["auth.forward.url"]}
      >
        {(f) => (
          <Input
            {...f}
            {...typing}
            inputMode="url"
            value={draft.fwdUrl}
            onChange={(e) => set({ fwdUrl: e.target.value })}
            placeholder="http://127.0.0.1:9091/api/authz/auth-request"
            className="font-mono"
          />
        )}
      </Field>
      <Field
        label="Sign-in page"
        hint="Where a visitor who isn't signed in is sent, with the page they wanted added. Empty = they get 401."
        error={errors["auth.forward.signin_url"]}
      >
        {(f) => (
          <Input
            {...f}
            {...typing}
            inputMode="url"
            value={draft.fwdSignin}
            onChange={(e) => set({ fwdSignin: e.target.value })}
            placeholder="https://auth.example.com/"
            className="font-mono"
          />
        )}
      </Field>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <Field
          label="Pass these headers to the app"
          hint="Who signed in, as the service tells it. One per line."
          error={errors["auth.forward.headers"]}
        >
          {(f) => (
            <ListInput
              {...f}
              value={draft.fwdHeaders}
              onChange={(fwdHeaders) => set({ fwdHeaders })}
              placeholder={"Remote-User\nRemote-Groups"}
            />
          )}
        </Field>
        <Field
          label="Service's own path on this site"
          hint="Some services sign people in on the site itself (oauth2-proxy: /oauth2/). That path goes to the service, without a login."
          error={errors["auth.forward.pass_path"]}
        >
          {(f) => (
            <Input
              {...f}
              {...typing}
              value={draft.fwdPassPath}
              onChange={(e) => set({ fwdPassPath: e.target.value })}
              placeholder="/oauth2/"
              className="font-mono"
            />
          )}
        </Field>
      </div>
      {splitList(draft.fwdHeaders).length > 0 && (
        <Callout icon={<Users />}>
          The app can trust these headers: the proxy always replaces them with
          what the service said, so visitors can't send their own.
        </Callout>
      )}
    </Card>
  )
}

function SkipForAllowed({ draft, set, phone }: Props) {
  const allowed = splitList(draft.allow).length
  return (
    <Card title="Trusted addresses" phone={phone}>
      <ToggleRow
        id="auth-skip-allowed"
        label="No login from the Always let in list"
        hint={
          allowed
            ? `Visitors from the ${allowed} address${allowed === 1 ? "" : "es"} in Security › Always let in come straight in; everyone else signs in.`
            : "Add addresses to Security › Always let in first (an office or VPN range)."
        }
        checked={draft.authSkipAllowed}
        onChange={(authSkipAllowed) => set({ authSkipAllowed })}
        disabled={!allowed && !draft.authSkipAllowed}
      />
      {!allowed && draft.authSkipAllowed && (
        <Callout icon={<KeyRound />}>
          The list is empty, so everyone signs in.
        </Callout>
      )}
    </Card>
  )
}
