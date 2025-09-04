import { createContext } from "react"
import type { UserModel } from "@/lib/services"

export interface AuthContextType {
	logout: () => void
	login: (jwt: string, saveInCookie?: boolean) => Promise<void>
	user: UserModel | undefined
	authenticated: boolean
}

const defaultValue: AuthContextType = {
	authenticated: false,
	login: () => Promise.resolve(),
	logout: () => {},
	user: undefined,
}

const AuthContext = createContext<AuthContextType>(defaultValue)

export default AuthContext
