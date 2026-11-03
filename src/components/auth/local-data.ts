import localforage from "localforage"

const USER_KEY = "morcheh.user"
// What one person worked on, which the next person on this browser shouldn't
// see. Preferences like the terminal's font size stay.
const PERSONAL = [
  "morcheh.palette.recent",
  "morcheh.workspace",
  "morcheh.services.view",
]
const PERSONAL_PREFIX = "morcheh.netmap.layout."

export function clearLocalData() {
  try {
    for (const key of PERSONAL) localStorage.removeItem(key)
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PERSONAL_PREFIX)) localStorage.removeItem(key)
    }
    localStorage.removeItem(USER_KEY)
    sessionStorage.clear()
  } catch {}
  return localforage.clear().catch(() => {})
}

// A session can end without Sign out (expired, blocked), so this also runs
// when someone else signs in on the same browser.
export function rememberUser(id: string) {
  try {
    const previous = localStorage.getItem(USER_KEY)
    if (previous !== id) {
      if (previous) clearLocalData()
      localStorage.setItem(USER_KEY, id)
    }
  } catch {}
}

// Only a path inside the panel: a crafted ?next= can't send someone off-site.
// Judged as the browser will parse it: it drops tabs and newlines, so
// "/\t/evil.com" would otherwise pass as a path and land on evil.com.
export function safeNext(next: string | null | undefined) {
  if (!next?.startsWith("/")) return "/home"
  const here = window.location.origin
  let url: URL
  try {
    url = new URL(next, here)
  } catch {
    return "/home"
  }
  if (url.origin !== here || url.pathname === "/login") return "/home"
  return url.pathname + url.search + url.hash
}
