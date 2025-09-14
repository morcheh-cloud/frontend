import { createContext } from "react"
import type { UserModel, WorkSpaceModel } from "@/lib/services"
import type { AuthProviderState } from "@/providers/AuthProvider"

export interface AuthContextType {
	logout: () => void
	login: (jwt: string, saveInCookie?: boolean) => Promise<void>
	user: UserModel | undefined
	authenticated: boolean
	workspaceId: string | undefined
	authState: AuthProviderState
	workspace: WorkSpaceModel | undefined
	changeWorkspace: (id: string) => void
}

const defaultValue: AuthContextType = {
	authenticated: false,
	authState: "loading",
	changeWorkspace: () => {},
	login: () => Promise.resolve(),
	logout: () => {},
	user: undefined,
	workspace: undefined,
	workspaceId: undefined,
}

const AuthContext = createContext<AuthContextType>(defaultValue)

export default AuthContext
