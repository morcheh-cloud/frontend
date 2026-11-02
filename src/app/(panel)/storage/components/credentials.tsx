"use client"

import {
  CredentialNote,
  CredentialRow,
  CredentialsLayer,
  CredentialsQuery,
  knownHostsLine,
} from "@/components/credentials"
import type { Storage, StorageCredentials } from "@/lib/services"
import { useStorageCredentials } from "../api"
import { defaultPort, endpointUrl, protocolMeta } from "./meta"

export function StorageCredentialsLayer({
  open,
  onOpenChange,
  storage,
  onEdit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  storage: Storage | null
  onEdit: () => void
}) {
  return (
    <CredentialsLayer
      open={open}
      onOpenChange={onOpenChange}
      title={
        storage
          ? `${protocolMeta[storage.protocol].label} credentials`
          : "Credentials"
      }
      description={storage?.name}
      onEdit={onEdit}
    >
      {storage && <Details storage={storage} />}
    </CredentialsLayer>
  )
}

function Details({ storage }: { storage: Storage }) {
  const query = useStorageCredentials(storage.id)

  return (
    <CredentialsQuery query={query}>
      {(c) => <Fields storage={storage} c={c} />}
    </CredentialsQuery>
  )
}

const tlsLabels: Record<Storage["tls"], string> = {
  none: "None, the password travels unencrypted",
  explicit: "Explicit TLS",
  implicit: "Implicit TLS (FTPS)",
}

function Fields({ storage, c }: { storage: Storage; c: StorageCredentials }) {
  const s3 = c.protocol === "s3"
  const ftp = c.protocol === "ftp"
  const sftp = c.protocol === "sftp"
  // The API sends 0 for "the protocol's default"; other tools want the number.
  const port = c.port || defaultPort(storage)

  return (
    <div className="flex flex-col gap-4">
      {ftp || sftp ? (
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
          <CredentialRow label="Host" value={c.host} />
          <CredentialRow label="Port" value={String(port)} />
        </div>
      ) : (
        <CredentialRow label={s3 ? "Endpoint" : "URL"} value={c.host} wrap />
      )}
      <Username c={c} />
      {c.auth_method === "private_key" ? (
        <KeyAuth name={storage.name} c={c} />
      ) : (
        <Secret c={c} />
      )}
      {s3 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {storage.bucket ? (
              <CredentialRow label="Bucket" value={storage.bucket} />
            ) : (
              <CredentialNote label="Bucket">All buckets</CredentialNote>
            )}
            {storage.region ? (
              <CredentialRow label="Region" value={storage.region} />
            ) : (
              <CredentialNote label="Region">Not set</CredentialNote>
            )}
          </div>
          <CredentialNote label="URL style">
            {storage.path_style
              ? "Path-style (endpoint/bucket/key)"
              : "Virtual-hosted (bucket.endpoint/key)"}
          </CredentialNote>
        </>
      )}
      {ftp && (
        <CredentialNote label="Encryption">
          {tlsLabels[storage.tls]}
        </CredentialNote>
      )}
      {storage.root_path && (
        <CredentialRow label="Start folder" value={storage.root_path} />
      )}
      {sftp &&
        (c.host_key ? (
          <CredentialRow
            label="Host key"
            hint={c.host_key_fingerprint}
            value={knownHostsLine({ ...c, port })}
            copyLabel="known_hosts line"
            wrap
          />
        ) : (
          <CredentialNote label="Host key">
            Trusted on the first successful check
          </CredentialNote>
        ))}
      {sftp && (
        <CredentialRow label="SFTP command" value={sftpCommand(c, port)} />
      )}
      {ftp && <CredentialRow label="Address" value={endpointUrl(storage)} />}
    </div>
  )
}

function Username({ c }: { c: StorageCredentials }) {
  const label = c.protocol === "s3" ? "Access key" : "Username"
  if (c.username) return <CredentialRow label={label} value={c.username} />
  return (
    <CredentialNote label={label}>
      {c.protocol === "ftp" ? "None, logs in anonymously" : "None"}
    </CredentialNote>
  )
}

function Secret({ c }: { c: StorageCredentials }) {
  const label = c.protocol === "s3" ? "Secret key" : "Password"
  if (c.secret) return <CredentialRow label={label} value={c.secret} secret />
  return (
    <CredentialNote label={label}>
      No {label.toLowerCase()} is stored
    </CredentialNote>
  )
}

function KeyAuth({ name, c }: { name: string; c: StorageCredentials }) {
  return (
    <>
      <CredentialRow
        label="Private key"
        value={c.private_key}
        secret
        block
        download={`${name}.key`}
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
  )
}

function sftpCommand(c: StorageCredentials, port: number) {
  const host = c.host.includes(":") ? `[${c.host}]` : c.host
  const flag = port === 22 ? "" : `-P ${port} `
  return `sftp ${flag}${c.username}@${host}`
}
