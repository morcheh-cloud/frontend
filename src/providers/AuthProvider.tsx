import {
	type FunctionComponent,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react"
import { useNavigate } from "react-router"
import AuthContext, { type AuthContextType } from "@/context/AuthContext"
import useLocalStorage from "@/hooks/useLocalStorage"
import { ClientApi } from "@/lib/client"
import { GetJwtToken, RemoveJwtToken, SaveJwtToken } from "@/lib/cookie"
import type { UserModel } from "@/lib/services"

interface AuthProviderProps {
	children: ReactNode
}

export type AuthProviderState = "done" | "error" | "loading"

const AuthProvider: FunctionComponent<AuthProviderProps> = ({ children }) => {
	const navigate = useNavigate()

	const [user, setUser] = useLocalStorage<UserModel | undefined>(
		"user",
		undefined,
	)

	const [authState, setAuthState] = useState<AuthProviderState>("loading")
	const [workspaceId, setWorkspaceId] = useLocalStorage<string | undefined>(
		"workspaceId",
		undefined,
	)

	const login = async (jwt: string, saveInCookie = false) => {
		SaveJwtToken(jwt, saveInCookie)
		ClientApi.instance.defaults.headers.common.Authorization = `Bearer ${jwt}`
		const res = await ClientApi.auth.whoAmI()
		if (res.data?.id) {
			setUser(res.data)
			if (res?.data?.workspaces?.length && !workspaceId) {
				const firstWorkspace = res.data.workspaces[0]
				setWorkspaceId(firstWorkspace.id)
			}
		}
	}

	const logout = useCallback(() => {
		RemoveJwtToken()
		setUser(undefined)
		setWorkspaceId(undefined)
		ClientApi.instance.defaults.headers.common.Authorization = ""
	}, [setUser, setWorkspaceId])

	useEffect(() => {
		const jwt = GetJwtToken()

		if (!jwt) {
			setAuthState("done")
			logout()
			return
		}

		ClientApi.instance.defaults.headers.common.Authorization = `Bearer ${jwt}`

		ClientApi.auth
			.whoAmI()
			.then((res) => {
				setUser(res.data)
				if (res?.data?.workspaces?.length && !workspaceId) {
					const firstWorkspace = res.data.workspaces[0]
					setWorkspaceId(firstWorkspace.id)
				}
			})
			.catch(() => {
				setAuthState("error")
			})
			.finally(() => {
				setAuthState("done")
				console.log("here")
			})
	}, [setUser, logout, setWorkspaceId, workspaceId])

	useEffect(() => {
		if (!workspaceId) return
		ClientApi.instance.defaults.headers.common.workspaceId = workspaceId
	}, [workspaceId])

	useEffect(() => {
		ClientApi.instance.interceptors.response.use(
			(response) => response,
			(error) => {
				if (error.response && error.response.status === 401) {
					logout()
					navigate("/login")
				}
				return Promise.reject(error)
			},
		)
	}, [logout, navigate])

	const value: AuthContextType = {
		authenticated: !!user?.id || authState === "error" || authState === "done",
		authState,
		login,
		logout,
		user,
		workspaceId,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
