"use client"

import {
  CredentialNote,
  CredentialRow,
  CredentialsLayer,
  CredentialsQuery,
  knownHostsLine,
} from "@/components/credentials"
import type { Server } from "@/lib/services"
import { useCredentials } from "../api"
import { sshCommand } from "./meta"

export function ServerCredentialsLayer({
  open,
  onOpenChange,
  server,
  onEdit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: Server | null
  onEdit: () => void
}) {
  return (
    <CredentialsLayer
      open={open}
      onOpenChange={onOpenChange}
      title="SSH credentials"
      description={server ? server.name : undefined}
      onEdit={onEdit}
    >
      {server && <Details server={server} />}
    </CredentialsLayer>
  )
}

function Details({ server }: { server: Server }) {
  const query = useCredentials(server.id)

  return (
    <CredentialsQuery query={query}>
      {(c) => (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
            <CredentialRow label="Host" value={c.host} />
            <CredentialRow label="Port" value={String(c.port)} />
          </div>
          <CredentialRow label="Username" value={c.username} />
          {c.auth_method === "private_key" ? (
            <>
              <CredentialRow
                label="Private key"
                value={c.private_key}
                secret
                block
                download={`${server.name}.key`}
              />
              {c.passphrase ? (
                <CredentialRow label="Passphrase" value={c.passphrase} secret />
              ) : (
                <CredentialNote label="Passphrase">
                  None, the key isn't encrypted
                </CredentialNote>
              )}
              {c.public_key && (
                <CredentialRow
                  label="Public key"
                  hint={c.public_key_fingerprint}
                  value={c.public_key}
                  wrap
                />
              )}
            </>
          ) : c.password ? (
            <CredentialRow label="Password" value={c.password} secret />
          ) : (
            <CredentialNote label="Password">
              No password is stored
            </CredentialNote>
          )}
          {c.host_key ? (
            <CredentialRow
              label="Host key"
              hint={c.host_key_fingerprint}
              value={knownHostsLine(c)}
              copyLabel="known_hosts line"
              wrap
            />
          ) : (
            <CredentialNote label="Host key">
              Trusted on the first successful check
            </CredentialNote>
          )}
          <CredentialRow label="SSH command" value={sshCommand(c)} />
        </div>
      )}
    </CredentialsQuery>
  )
}
