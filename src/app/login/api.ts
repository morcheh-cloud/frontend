import { apiFetch } from "@/lib/api"

export type LoginInput = {
  username: string
  password: string
  remember: boolean
}

// TODO: confirm the endpoint and response shape once the backend auth API exists.
export function login(input: LoginInput) {
  return apiFetch<void>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
