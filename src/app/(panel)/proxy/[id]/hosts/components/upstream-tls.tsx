"use client"

import { Info } from "lucide-react"

import {
  Callout,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Field } from "@/components/field"
import { Input } from "@/components/ui/input"
import type { Proxy as ReverseProxy } from "@/lib/services"
import { type Draft, type Errors, httpsUpstream } from "./draft"
import { EditorCard as Card } from "./editor-card"
import { typing } from "./rows"

// How the proxy talks https to the app: shown once an address (the site's
// or a path's) starts with https://.
export function UpstreamTlsCard({
  proxy: p,
  draft,
  set,
  errors,
  phone,
}: {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  if (!p.capabilities.upstream_tls || !httpsUpstream(draft)) return null
  return (
    <Card
      title="App over https"
      hint={`The app answers on https, so ${p.kind_label} talks to it encrypted. These settings apply to every https address of this site.`}
      phone={phone}
    >
      <ToggleRow
        id="up-verify"
        label="Check the app's certificate"
        hint="Refuse to connect when the certificate isn't valid for the name below. Off = any certificate is taken, as most internal apps use self-signed ones."
        checked={draft.upVerify}
        onChange={(upVerify) => set({ upVerify })}
      />
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <Field
          label="Name to ask for"
          hint="Sent to the app (SNI) and checked on its certificate. Empty = the address's host."
          error={errors["upstream_tls.name"]}
        >
          {(f) => (
            <Input
              {...f}
              {...typing}
              value={draft.upName}
              onChange={(e) => set({ upName: e.target.value })}
              placeholder="app.internal"
              className="font-mono"
            />
          )}
        </Field>
        {draft.upVerify && (
          <Field
            label="Trusted CA file"
            hint="Path on the proxy's server. Empty = the system's CA list."
            error={errors["upstream_tls.ca"]}
          >
            {(f) => (
              <Input
                {...f}
                {...typing}
                value={draft.upCa}
                onChange={(e) => set({ upCa: e.target.value })}
                placeholder="/etc/ssl/internal-ca.pem"
                className="font-mono"
              />
            )}
          </Field>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <Field
          label="Client certificate"
          hint="Only when the app asks the proxy to prove who it is (mutual TLS)."
          error={errors["upstream_tls.certificate"]}
        >
          {(f) => (
            <Input
              {...f}
              {...typing}
              value={draft.upCert}
              onChange={(e) => set({ upCert: e.target.value })}
              placeholder="/etc/ssl/proxy-client.pem"
              className="font-mono"
            />
          )}
        </Field>
        <Field
          label="Its key"
          hint="Path on the proxy's server."
          error={errors["upstream_tls.key"]}
        >
          {(f) => (
            <Input
              {...f}
              {...typing}
              value={draft.upKey}
              onChange={(e) => set({ upKey: e.target.value })}
              placeholder="/etc/ssl/proxy-client.key"
              className="font-mono"
            />
          )}
        </Field>
      </div>
      {!draft.upVerify && (
        <Callout icon={<Info />}>
          Without the check the link is encrypted, but anyone between the proxy
          and the app could pretend to be it. Fine on a private network.
        </Callout>
      )}
    </Card>
  )
}
