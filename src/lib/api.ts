import { Api, type ErrorModel } from "@/lib/services"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: ErrorModel,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Huma answers failures with an RFC 9457 problem body (ErrorModel); use its
// detail as the message when there is one.
async function toApiError(response: Response) {
  const body = (await response.json().catch(() => undefined)) as
    | ErrorModel
    | undefined
  return new ApiError(
    response.status,
    body?.detail ?? body?.title ?? response.statusText,
    body,
  )
}

// The workspace the panel is showing. Sent with every request so lists narrow
// to it and new servers and storages land in it. Set before the requests that
// depend on it, so it's a plain variable rather than React state.
let activeWorkspace: string | null = null

export function setActiveWorkspace(id: string | null) {
  activeWorkspace = id
}

function withWorkspace(headers?: HeadersInit) {
  const out = new Headers(headers)
  // A request may ask about another workspace by naming it itself.
  if (activeWorkspace && !out.has("X-Workspace-Id")) {
    out.set("X-Workspace-Id", activeWorkspace)
  }
  return out
}

// Told when a request is refused for who's asking: the session ended, or this
// person's access changed since the page loaded.
let refusalListener: (() => void) | null = null

export function onRefused(listener: () => void) {
  refusalListener = listener
  return () => {
    refusalListener = null
  }
}

function noteRefusal(url: string, status: number) {
  if ((status === 401 || status === 403) && !url.includes("/auth/")) {
    refusalListener?.()
  }
}

// Typed client generated from the backend's OpenAPI spec (`pnpm gen:api`).
// Prefer it over apiFetch for endpoints that exist in the spec. Failures throw
// ApiError, same as apiFetch.
export const api = new Api({
  baseUrl: API_URL,
  baseApiParams: { credentials: "include" },
  customFetch: async (input, init) => {
    const response = await fetch(input, {
      ...init,
      headers: withWorkspace(init?.headers),
    })
    if (!response.ok) {
      noteRefusal(String(input), response.status)
      throw await toApiError(response)
    }
    return response
  },
})

// Thin fetch wrapper for client-side requests. Throws ApiError on non-2xx so
// TanStack Query puts the failure in `error`.
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = withWorkspace(init?.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  })

  if (!response.ok) {
    noteRefusal(path, response.status)
    throw await toApiError(response)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// A 422's per-field messages keyed by field name ("body.host" → "host"), so a
// form can show each next to its input.
export function fieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!(error instanceof ApiError)) return out
  for (const e of error.body?.errors ?? []) {
    if (!e.location || !e.message) continue
    const name = e.location.replace(/^body\./, "")
    out[name] ??= e.message
  }
  return out
}
