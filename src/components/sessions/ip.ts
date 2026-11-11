// Address and range checks for the allowlist form, mirroring the backend's
// netip parsing closely enough to warn before a save: "203.0.113.7",
// "203.0.113.0/24", "2001:db8::/48", "::ffff:203.0.113.7" (read as IPv4).

type Addr = { v6: boolean; n: bigint }
export type Range = { v6: boolean; net: bigint; bits: number }

function parse4(s: string): bigint | null {
  const parts = s.split(".")
  if (parts.length !== 4) return null
  let n = BigInt(0)
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || (p.length > 1 && p.startsWith("0"))) return null
    const v = Number(p)
    if (v > 255) return null
    n = (n << BigInt(8)) | BigInt(v)
  }
  return n
}

function parse6(s: string): bigint | null {
  let text = s.split("%")[0]
  // An IPv4 tail ("::ffff:1.2.3.4") becomes two groups.
  const tail = text.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (tail) {
    const v4 = parse4(tail[2])
    if (v4 === null) return null
    text = `${tail[1]}${(v4 >> BigInt(16)).toString(16)}:${(v4 & BigInt(0xffff)).toString(16)}`
  }
  const halves = text.split("::")
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(":") : []
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : []
  const missing = 8 - head.length - rest.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null
  const groups = [...head, ...Array(Math.max(missing, 0)).fill("0"), ...rest]
  let n = BigInt(0)
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(g)) return null
    n = (n << BigInt(16)) | BigInt(Number.parseInt(g, 16))
  }
  return n
}

export function parseAddress(s: string): Addr | null {
  const text = s.trim()
  if (!text) return null
  if (!text.includes(":")) {
    const n = parse4(text)
    return n === null ? null : { v6: false, n }
  }
  const n = parse6(text)
  if (n === null) return null
  // IPv4-mapped IPv6 is the IPv4 address, as the backend reads it.
  if (n >> BigInt(32) === BigInt(0xffff))
    return { v6: false, n: n & BigInt(0xffffffff) }
  return { v6: true, n }
}

export function parseRange(s: string): Range | null {
  const [addr, size, extra] = s.trim().split("/")
  if (extra !== undefined) return null
  const a = parseAddress(addr)
  if (!a) return null
  const max = a.v6 ? 128 : 32
  if (size === undefined) return { v6: a.v6, net: a.n, bits: max }
  if (!/^\d{1,3}$/.test(size)) return null
  // "::ffff:1.2.3.0/120" is refused by the backend too.
  if (!a.v6 && addr.includes(":")) return null
  const bits = Number(size)
  if (bits > max) return null
  const shift = BigInt(max - bits)
  return { v6: a.v6, net: (a.n >> shift) << shift, bits }
}

export function rangeContains(r: Range, ip: string) {
  const a = parseAddress(ip)
  if (!a || a.v6 !== r.v6) return false
  const shift = BigInt((r.v6 ? 128 : 32) - r.bits)
  return a.n >> shift === r.net >> shift
}

// What's wrong with a typed entry, or "" when it's fine.
export function checkEntry(s: string) {
  if (!s.trim()) return "Enter an address or a range."
  const r = parseRange(s)
  if (!r) return "Not an address or range, e.g. 203.0.113.7 or 203.0.113.0/24."
  if (r.bits === 0)
    return "That range is every address: it would allow everyone."
  return ""
}

// The number of addresses a range covers, in words ("256 addresses").
export function rangeSize(s: string) {
  const r = parseRange(s)
  if (!r) return ""
  const free = (r.v6 ? 128 : 32) - r.bits
  if (free === 0) return "One address"
  if (r.v6 && free >= 64) return `${2 ** (free - 64)} × /64 networks`
  if (free > 24) return `${(2 ** free).toExponential(1)} addresses`
  return `${(2 ** free).toLocaleString()} addresses`
}
