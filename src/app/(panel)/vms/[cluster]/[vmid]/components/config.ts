// Reading Proxmox's config strings ("local-lvm:vm-100-disk-0,iothread=1,size=32G")
// into something the Hardware and Overview tabs can show.

export type Props = { head: string; props: Record<string, string> }

// The first part (without "=") is the head; the rest are key=value pairs.
export function parseProps(value: string): Props {
  const parts = value.split(",")
  let head = ""
  const props: Record<string, string> = {}
  parts.forEach((part, i) => {
    const at = part.indexOf("=")
    if (at < 0) {
      if (i === 0) head = part
      else props[part] = ""
      return
    }
    props[part.slice(0, at)] = part.slice(at + 1)
  })
  return { head, props }
}

export function printProps({ head, props }: Props) {
  return [
    ...(head ? [head] : []),
    ...Object.entries(props).map(([k, v]) => (v === "" ? k : `${k}=${v}`)),
  ].join(",")
}

// "32G" / "500M" / "1T" → bytes.
export function sizeToBytes(size: string) {
  const m = /^([0-9.]+)([KMGT]?)$/i.exec(size.trim())
  if (!m) return 0
  const unit = { "": 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 }[
    m[2].toUpperCase() as "" | "K" | "M" | "G" | "T"
  ]
  return Number(m[1]) * unit
}

const diskKey =
  /^(scsi|sata|virtio|ide|efidisk|tpmstate|unused|mp|rootfs)(\d*)$/

export type Disk = {
  key: string
  bus: string
  // Where it lives: "local-lvm:vm-100-disk-0"; for a CD drive, the ISO.
  volume: string
  storage: string
  size: string
  bytes: number
  cdrom: boolean
  cloudinit: boolean
  // A container's extra mount: its path inside.
  mountpoint?: string
  props: Record<string, string>
  // Resizable: a real disk, not a CD, cloud-init, EFI or TPM drive.
  grows: boolean
}

export function disksOf(config: Record<string, string>): Disk[] {
  const out: Disk[] = []
  for (const [key, value] of Object.entries(config)) {
    const m = diskKey.exec(key)
    if (!m) continue
    const { head, props } = parseProps(value)
    const volume = head || props.volume || props.file || ""
    const cdrom = props.media === "cdrom" || volume === "cdrom"
    const cloudinit = volume.includes("cloudinit")
    const bus = m[1]
    out.push({
      key,
      bus,
      volume,
      storage: volume.includes(":") ? volume.split(":")[0] : "",
      size: props.size ?? "",
      bytes: sizeToBytes(props.size ?? ""),
      cdrom,
      cloudinit,
      mountpoint: props.mp,
      props,
      grows:
        !cdrom &&
        !cloudinit &&
        bus !== "efidisk" &&
        bus !== "tpmstate" &&
        bus !== "unused",
    })
  }
  const order = [
    "rootfs",
    "scsi",
    "virtio",
    "sata",
    "ide",
    "mp",
    "efidisk",
    "tpmstate",
    "unused",
  ]
  return out.sort((a, b) => {
    const d = order.indexOf(a.bus) - order.indexOf(b.bus)
    if (d) return d
    return a.key.localeCompare(b.key, undefined, { numeric: true })
  })
}

export const busLabels: Record<string, string> = {
  scsi: "SCSI",
  sata: "SATA",
  virtio: "VirtIO block",
  ide: "IDE",
  efidisk: "EFI disk",
  tpmstate: "TPM state",
  unused: "Not attached",
  mp: "Mount point",
  rootfs: "Root disk",
}

export type Nic = {
  key: string
  // qemu: model (virtio, e1000…); lxc: interface name (eth0)
  model: string
  name: string
  mac: string
  bridge: string
  vlan: string
  firewall: boolean
  rate: string
  // lxc only: ip=…, gw=…
  ip: string
  gw: string
  ip6: string
  disconnected: boolean
  props: Record<string, string>
}

const macModels = [
  "virtio",
  "e1000",
  "e1000e",
  "rtl8139",
  "vmxnet3",
  "ne2k_pci",
  "pcnet",
  "i82551",
  "i82557b",
  "i82559er",
  "ne2k_isa",
]

export function nicsOf(config: Record<string, string>, kind: string): Nic[] {
  const out: Nic[] = []
  for (const [key, value] of Object.entries(config)) {
    if (!/^net\d+$/.test(key)) continue
    const { props } = parseProps(value)
    let model = ""
    let mac = props.hwaddr ?? props.macaddr ?? ""
    if (kind === "qemu") {
      const found = macModels.find((m) => m in props)
      model = found ?? parseProps(value).head
      if (found && props[found]) mac = props[found]
    } else {
      model = props.type ?? "veth"
    }
    out.push({
      key,
      model,
      name: props.name ?? key,
      mac,
      bridge: props.bridge ?? "",
      vlan: props.tag ?? "",
      firewall: props.firewall === "1",
      rate: props.rate ?? "",
      ip: props.ip ?? "",
      gw: props.gw ?? "",
      ip6: props.ip6 ?? "",
      disconnected: props.link_down === "1",
      props,
    })
  }
  return out.sort((a, b) =>
    a.key.localeCompare(b.key, undefined, { numeric: true }),
  )
}

// The next free netN / diskN slot.
export function nextKey(config: Record<string, string>, prefix: string) {
  for (let i = 0; i < 32; i++)
    if (!(`${prefix}${i}` in config)) return `${prefix}${i}`
  return `${prefix}0`
}

export const osLabels: Record<string, string> = {
  l26: "Linux",
  l24: "Linux 2.4",
  win11: "Windows 11 / 2022 / 2025",
  win10: "Windows 10 / 2016 / 2019",
  win8: "Windows 8 / 2012",
  win7: "Windows 7 / 2008 R2",
  wxp: "Windows XP",
  w2k: "Windows 2000",
  solaris: "Solaris",
  other: "Other",
  debian: "Debian",
  ubuntu: "Ubuntu",
  alpine: "Alpine",
  centos: "CentOS",
  fedora: "Fedora",
  archlinux: "Arch Linux",
  opensuse: "openSUSE",
  nixos: "NixOS",
  unmanaged: "Unmanaged",
}

export const osLabel = (os?: string) => (os ? (osLabels[os] ?? os) : "")

// Memory in MiB as Proxmox stores it → readable.
export const mib = (v?: string) => {
  const n = Number(v)
  if (!v || !Number.isFinite(n)) return ""
  return n >= 1024 && n % 1024 === 0 ? `${n / 1024} GiB` : `${n} MiB`
}

export const yes = (v?: string) => v === "1" || v === "on" || v === "yes"
