// Reads a wg-quick config ([Interface] + one [Peer]) into the form's fields.
// Only what Morche uses is taken; everything else (PostUp, Table…) is
// ignored, since nothing runs on the machine.
export type WireGuardConf = {
  privateKey?: string
  addresses?: string
  dns?: string
  mtu?: string
  peerPublicKey?: string
  presharedKey?: string
  endpoint?: string
  allowedIPs?: string
  keepalive?: string
}

export function parseWireGuard(text: string): WireGuardConf | null {
  if (!/\[Interface\]/i.test(text) && !/\[Peer\]/i.test(text)) return null
  const out: WireGuardConf = {}
  let section = ""
  let peers = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[#;].*$/, "").trim()
    if (!line) continue
    const head = line.match(/^\[(\w+)\]$/)
    if (head) {
      section = head[1].toLowerCase()
      if (section === "peer") peers++
      continue
    }
    const kv = line.match(/^([A-Za-z]+)\s*=\s*(.*)$/)
    if (!kv) continue
    const key = kv[1].toLowerCase()
    const value = kv[2].trim()
    if (section === "interface") {
      if (key === "privatekey") out.privateKey = value
      if (key === "address") out.addresses = join(out.addresses, value)
      if (key === "dns")
        out.dns = join(
          out.dns,
          value
            .split(",")
            .map((v) => v.trim())
            // Search domains aren't name servers.
            .filter((v) => /^[0-9a-f.:]+$/i.test(v))
            .join(", "),
        )
      if (key === "mtu") out.mtu = value
    }
    // Only the first peer: one tunnel talks to one server.
    if (section === "peer" && peers === 1) {
      if (key === "publickey") out.peerPublicKey = value
      if (key === "presharedkey") out.presharedKey = value
      if (key === "endpoint") out.endpoint = value
      if (key === "allowedips") out.allowedIPs = join(out.allowedIPs, value)
      if (key === "persistentkeepalive") out.keepalive = value
    }
  }
  return out
}

const join = (a: string | undefined, b: string) =>
  [a, b].filter((v) => v?.trim()).join(", ")

// The servers an .ovpn file connects to (the backend checks the rest).
export function ovpnRemotes(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/^\s*remote\s+(\S+)(?:\s+(\d+))?/gim)) {
    out.push(m[2] ? `${m[1]}:${m[2]}` : m[1])
  }
  return out
}

export const ovpnNeedsLogin = (text: string) =>
  /^\s*auth-user-pass\b/im.test(text) || /<auth-user-pass>/i.test(text)

export const ovpnEncryptedKey = (text: string) =>
  /ENCRYPTED PRIVATE KEY|Proc-Type: 4,ENCRYPTED/.test(text)
