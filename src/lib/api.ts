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

// Typed client generated from the backend's OpenAPI spec (`pnpm gen:api`).
// Prefer it over apiFetch for endpoints that exist in the spec. Failures throw
// ApiError, same as apiFetch.
export const api = new Api({
  baseUrl: API_URL,
  baseApiParams: { credentials: "include" },
  customFetch: async (...args) => {
    const response = await fetch(...args)
    if (!response.ok) throw await toApiError(response)
    return response
  },
})

// Thin fetch wrapper for client-side requests. Throws ApiError on non-2xx so
// TanStack Query puts the failure in `error`.
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })

  if (!response.ok) throw await toApiError(response)

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
