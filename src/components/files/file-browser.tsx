"use client"

import { FileManager } from "./file-manager"
import { FilesDesktop } from "./files-desktop"
import { FilesMobile } from "./files-mobile"
import { type FileSource, FileSourceProvider } from "./source"
import { UploadsProvider } from "./uploads"

// The whole file manager over one source (a server or a storage). Its
// folder and search live in the URL (`?path=`, `?q=`).
export function FileBrowser({
  source,
  phone,
}: {
  source: FileSource
  phone: boolean
}) {
  return (
    <FileSourceProvider source={source}>
      <UploadsProvider>
        <FileManager phone={phone}>
          {phone ? <FilesMobile /> : <FilesDesktop />}
        </FileManager>
      </UploadsProvider>
    </FileSourceProvider>
  )
}
