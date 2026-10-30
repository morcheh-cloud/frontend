const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Thin fetch wrapper for client-side requests. Throws ApiError on non-2xx so
// TanStack Query puts the failure in `error`.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
