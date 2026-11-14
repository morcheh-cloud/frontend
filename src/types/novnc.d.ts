// @novnc/novnc ships plain ES modules without types: just what the
// virtual machine console uses.
declare module "@novnc/novnc" {
  export type RFBOptions = {
    credentials?: { username?: string; password?: string; target?: string }
    shared?: boolean
    repeaterID?: string
    wsProtocols?: string[]
  }

  export default class RFB extends EventTarget {
    constructor(target: HTMLElement, url: string, options?: RFBOptions)
    scaleViewport: boolean
    resizeSession: boolean
    clipViewport: boolean
    viewOnly: boolean
    focusOnClick: boolean
    background: string
    qualityLevel: number
    compressionLevel: number
    disconnect(): void
    sendCredentials(credentials: { password?: string }): void
    sendKey(keysym: number, code: string | null, down?: boolean): void
    sendCtrlAltDel(): void
    clipboardPasteFrom(text: string): void
    focus(options?: FocusOptions): void
    blur(): void
  }
}
