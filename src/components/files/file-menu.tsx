"use client"

import {
  Archive,
  ChartPie,
  ClipboardCopy,
  Copy,
  Download,
  Eye,
  FileInput,
  FolderArchive,
  FolderInput,
  FolderOpen,
  Info,
  Link,
  type LucideIcon,
  PackageOpen,
  Pencil,
  Scissors,
  Send,
  ShieldCheck,
  SquarePen,
  SquareTerminal,
  Trash2,
} from "lucide-react"

import { useFileActions } from "./file-actions"
import { useFiles } from "./file-manager"
import {
  archiveStem,
  dirname,
  freeName,
  isArchive,
  isDir,
  joinPath,
  previewable,
  shortcut,
} from "./meta"
import { type FileEntry, useSource } from "./source"

export type MenuItem = {
  key: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  shortcut?: string
  destructive?: boolean
}

// Actions for one entry, or for the whole selection when the entry is part
// of it. Groups are separated in menus. Shared by the desktop context and
// ⋯ menus and the phone action sheet.
export function useEntryMenu() {
  const files = useFiles()
  const actions = useFileActions()
  const source = useSource()
  const write = !source.readOnly

  return (entry: FileEntry): { targets: FileEntry[]; groups: MenuItem[][] } => {
    const targets =
      files.selected.has(entry.path) && files.selectedEntries.length > 1
        ? files.selectedEntries
        : [entry]
    const one = targets.length === 1
    const dir = isDir(entry)
    // Buckets can't be renamed or moved.
    const fixed = targets.some((e) => e.bucket)

    const openGroup: MenuItem[] = []
    if (one) {
      openGroup.push(
        dir
          ? {
              key: "open",
              label: "Open",
              icon: FolderOpen,
              onSelect: () => files.open(entry),
            }
          : previewable(entry)
            ? {
                key: "open",
                label: "Preview",
                icon: Eye,
                onSelect: () => files.open(entry),
              }
            : {
                key: "open",
                label: "Edit",
                icon: SquarePen,
                onSelect: () => files.open(entry),
              },
      )
      const { openTerminal } = files
      if (dir && openTerminal)
        openGroup.push({
          key: "terminal",
          label: "Open in terminal",
          icon: SquareTerminal,
          onSelect: () => openTerminal(entry.path),
        })
      const { analyse } = files
      if (dir && analyse)
        openGroup.push({
          key: "usage",
          label: "Disk usage",
          icon: ChartPie,
          onSelect: () => analyse(entry.path),
        })
      if (!dir && source.share)
        openGroup.push({
          key: "share",
          label: "Share link…",
          icon: Link,
          onSelect: () => actions.share(entry),
        })
    }
    openGroup.push({
      key: "download",
      label: one && !dir ? "Download" : "Download as zip",
      icon: Download,
      onSelect: () => actions.download(targets),
    })

    const editGroup: MenuItem[] = []
    if (one && write && !fixed)
      editGroup.push({
        key: "rename",
        label: "Rename",
        icon: Pencil,
        shortcut: "F2",
        onSelect: () => actions.rename(entry),
      })
    if (write && !fixed)
      editGroup.push(
        {
          key: "copy",
          label: "Copy",
          icon: Copy,
          shortcut: shortcut("C"),
          onSelect: () => files.copy(targets),
        },
        {
          key: "cut",
          label: "Cut",
          icon: Scissors,
          shortcut: shortcut("X"),
          onSelect: () => files.cut(targets),
        },
        {
          key: "copy-to",
          label: "Copy to…",
          icon: FileInput,
          onSelect: () => actions.copyTo(targets),
        },
        {
          key: "move-to",
          label: "Move to…",
          icon: FolderInput,
          onSelect: () => actions.moveTo(targets),
        },
      )
    editGroup.push({
      key: "transfer",
      label: "Send to…",
      icon: Send,
      onSelect: () => actions.transfer(targets),
    })

    const moreGroup: MenuItem[] = []
    if (write && source.compress)
      moreGroup.push({
        key: "compress",
        label: "Compress…",
        icon: Archive,
        onSelect: () => actions.compress(targets),
      })
    if (one && write && source.extract && isArchive(entry)) {
      const folder = freeName(
        archiveStem(entry.name),
        dirname(entry.path) === files.listing?.path
          ? files.listing.entries
          : [],
      )
      moreGroup.push(
        {
          key: "extract",
          label: "Extract here",
          icon: PackageOpen,
          onSelect: () => actions.extract(entry),
        },
        {
          key: "extract-into",
          label: `Extract to “${folder}/”`,
          icon: FolderArchive,
          onSelect: () =>
            actions.extract(entry, joinPath(dirname(entry.path), folder)),
        },
      )
    }
    if (write && source.chmod)
      moreGroup.push({
        key: "permissions",
        label: "Permissions…",
        icon: ShieldCheck,
        onSelect: () => actions.permissions(targets),
      })
    if (one)
      moreGroup.push(
        {
          key: "copy-path",
          label: "Copy path",
          icon: ClipboardCopy,
          onSelect: () => actions.copyPath(entry),
        },
        {
          key: "info",
          label: "Info",
          icon: Info,
          onSelect: () => actions.info(entry),
        },
      )

    const deleteGroup: MenuItem[] = write
      ? [
          {
            key: "delete",
            label: one ? "Delete" : `Delete ${targets.length} items`,
            icon: Trash2,
            shortcut: "Del",
            destructive: true,
            onSelect: () => actions.remove(targets),
          },
        ]
      : []

    return {
      targets,
      groups: [openGroup, editGroup, moreGroup, deleteGroup],
    }
  }
}
