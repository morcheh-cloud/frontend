"use client"

import { useServerPage } from "../../components/server-page"
import { FileManager } from "./file-manager"
import { FilesDesktop } from "./files-desktop"
import { FilesMobile } from "./files-mobile"
import { UploadsProvider } from "./uploads"

export function FilesView() {
  const { server, phone } = useServerPage()
  return (
    <UploadsProvider serverId={server.id}>
      <FileManager>{phone ? <FilesMobile /> : <FilesDesktop />}</FileManager>
    </UploadsProvider>
  )
}
