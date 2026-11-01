"use client"

import {
  Archive,
  ClipboardCopy,
  Copy,
  Download,
  Eye,
  FileInput,
  FolderArchive,
  FolderInput,
  FolderOpen,
  Info,
  type LucideIcon,
  PackageOpen,
  Pencil,
  Scissors,
  ShieldCheck,
  SquarePen,
  SquareTerminal,
  Trash2,
} from "lucide-react"

import type { FileEntry } from "@/lib/services"
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

  return (entry: FileEntry): { targets: FileEntry[]; groups: MenuItem[][] } => {
    const targets =
      files.selected.has(entry.path) && files.selectedEntries.length > 1
        ? files.selectedEntries
        : [entry]
    const one = targets.length === 1
    const dir = isDir(entry)

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
      if (dir)
        openGroup.push({
          key: "terminal",
          label: "Open in terminal",
          icon: SquareTerminal,
          onSelect: () => files.openTerminal(entry.path),
        })
    }
    openGroup.push({
      key: "download",
      label: one && !dir ? "Download" : "Download as zip",
      icon: Download,
      onSelect: () => actions.download(targets),
    })

    const editGroup: MenuItem[] = []
    if (one)
      editGroup.push({
        key: "rename",
        label: "Rename",
        icon: Pencil,
        shortcut: "F2",
        onSelect: () => actions.rename(entry),
      })
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

    const moreGroup: MenuItem[] = [
      {
        key: "compress",
        label: "Compress…",
        icon: Archive,
        onSelect: () => actions.compress(targets),
      },
    ]
    if (one && isArchive(entry)) {
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

    const deleteGroup: MenuItem[] = [
      {
        key: "delete",
        label: one ? "Delete" : `Delete ${targets.length} items`,
        icon: Trash2,
        shortcut: "Del",
        destructive: true,
        onSelect: () => actions.remove(targets),
      },
    ]

    return {
      targets,
      groups: [openGroup, editGroup, moreGroup, deleteGroup],
    }
  }
}
