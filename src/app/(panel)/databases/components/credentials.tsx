"use client"

import {
  CredentialNote,
  CredentialRow,
  CredentialsLayer,
  CredentialsQuery,
} from "@/components/credentials"
import type { Database, DatabaseCredentials } from "@/lib/services"
import { useDatabaseCredentials } from "../api"
import { engineMeta, engineName } from "./meta"

export function DatabaseCredentialsLayer({
  open,
  onOpenChange,
  database,
  onEdit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  database: Database | null
  onEdit: () => void
}) {
  return (
    <CredentialsLayer
      open={open}
      onOpenChange={onOpenChange}
      title={database ? `${engineName(database)} credentials` : "Credentials"}
      description={database?.name}
      onEdit={onEdit}
    >
      {database && <Details database={database} />}
    </CredentialsLayer>
  )
}

function Details({ database }: { database: Database }) {
  const query = useDatabaseCredentials(database.id)
  return (
    <CredentialsQuery query={query}>
      {(c) => <Fields database={database} c={c} />}
    </CredentialsQuery>
  )
}

const tlsLabels: Record<Database["tls"], string> = {
  disable: "Off",
  require: "Encrypted, certificate not checked",
  verify: "Encrypted and verified",
}

function Fields({
  database,
  c,
}: {
  database: Database
  c: DatabaseCredentials
}) {
  const port = c.port || engineMeta[c.engine].port
  const meta = engineMeta[c.engine]
  return (
    <div className="flex flex-col gap-4">
      {database.mode === "server" && (
        <p className="text-caption text-muted-foreground">
          {database.container
            ? `Inside the ${database.container} container: these work from the server it runs on.`
            : "These work from the server Morche reaches it through."}
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <CredentialRow label="Host" value={c.host} />
        <CredentialRow label="Port" value={String(port)} />
      </div>
      {c.username ? (
        <CredentialRow label="Username" value={c.username} />
      ) : (
        <CredentialNote label="Username">The default user</CredentialNote>
      )}
      {c.password ? (
        <CredentialRow label="Password" value={c.password} secret />
      ) : (
        <CredentialNote label="Password">No password is stored</CredentialNote>
      )}
      {c.dbname ? (
        <CredentialRow label={meta.dbLabel} value={c.dbname} />
      ) : (
        <CredentialNote label={meta.dbLabel}>Not set</CredentialNote>
      )}
      <CredentialNote label="TLS">{tlsLabels[c.tls]}</CredentialNote>
      <CredentialRow
        label="Connection string"
        value={connectionUrl(c, port)}
        secret={!!c.password}
        wrap
      />
      <CredentialRow label="Command line" value={command(c, port)} wrap />
    </div>
  )
}

const enc = encodeURIComponent
const bracket = (host: string) => (host.includes(":") ? `[${host}]` : host)

function connectionUrl(c: DatabaseCredentials, port: number) {
  const auth = c.username
    ? `${enc(c.username)}${c.password ? `:${enc(c.password)}` : ""}@`
    : c.password
      ? `:${enc(c.password)}@`
      : ""
  const at = `${auth}${bracket(c.host)}:${port}`
  switch (c.engine) {
    case "postgres":
      return `postgres://${at}/${enc(c.dbname || "postgres")}${
        c.tls === "disable"
          ? ""
          : `?sslmode=${c.tls === "verify" ? "verify-full" : "require"}`
      }`
    case "mysql":
      return `mysql://${at}/${enc(c.dbname)}${c.tls === "disable" ? "" : "?ssl-mode=REQUIRED"}`
    case "mssql":
      return `sqlserver://${at}?database=${enc(c.dbname || "master")}&encrypt=${
        c.tls === "disable" ? "disable" : "true"
      }${c.tls === "require" ? "&TrustServerCertificate=true" : ""}`
    case "mongodb":
      return `mongodb://${at}/?authSource=${enc(c.dbname || "admin")}${
        c.tls === "disable" ? "" : "&tls=true"
      }`
    case "redis":
      return `${c.tls === "disable" ? "redis" : "rediss"}://${at}/${c.dbname || "0"}`
  }
}

function command(c: DatabaseCredentials, port: number) {
  const h = c.host
  switch (c.engine) {
    case "postgres":
      return `psql "host=${h} port=${port} user=${c.username} dbname=${c.dbname || "postgres"}${
        c.tls === "disable"
          ? ""
          : ` sslmode=${c.tls === "verify" ? "verify-full" : "require"}`
      }"`
    case "mysql":
      return `mysql -h ${h} -P ${port} -u ${c.username} -p${c.dbname ? ` ${c.dbname}` : ""}`
    case "mssql":
      return `sqlcmd -S ${h},${port} -U ${c.username} -d ${c.dbname || "master"}${
        c.tls === "disable" ? "" : c.tls === "require" ? " -N -C" : " -N"
      }`
    case "mongodb":
      return `mongosh --host ${h} --port ${port}${
        c.username
          ? ` -u ${c.username} -p --authenticationDatabase ${c.dbname || "admin"}`
          : ""
      }${c.tls === "disable" ? "" : " --tls"}`
    case "redis":
      return `redis-cli -h ${h} -p ${port}${c.username ? ` --user ${c.username}` : ""}${
        c.password ? " --askpass" : ""
      }${c.tls === "disable" ? "" : " --tls"}${c.dbname && c.dbname !== "0" ? ` -n ${c.dbname}` : ""}`
  }
}
