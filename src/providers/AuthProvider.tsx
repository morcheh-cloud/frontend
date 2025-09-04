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
import { Client } from "@/lib/client"
import { GetJwtToken, RemoveJwtToken, SaveJwtToken } from "@/lib/cookie"
import type { UserModel } from "@/lib/services"

interface AuthProviderProps {
	children: ReactNode
}

type AuthProviderState = "loading" | "done" | "error" | "start"

const AuthProvider: FunctionComponent<AuthProviderProps> = ({ children }) => {
	const navigate = useNavigate()

	const [user, setUser] = useLocalStorage<UserModel | undefined>(
		"user",
		undefined,
	)
	const [authState, setAuthState] = useState<AuthProviderState>("start")
	const [workspaceId, setWorkspaceId] = useLocalStorage<number | undefined>(
		"workspaceId",
		undefined,
	)

	const login = async (jwt: string, saveInCookie = false) => {
		SaveJwtToken(jwt, saveInCookie)
		Client.instance.defaults.headers.common.Authorization = `Bearer ${jwt}`
		const res = await Client.auth.whoAmI()
		if (res.data?.id) {
			setUser(res.data)
		}
	}

	const logout = useCallback(() => {
		RemoveJwtToken()
		setUser(undefined)
		setWorkspaceId(undefined)
		Client.instance.defaults.headers.common.Authorization = ""
	}, [setUser, setWorkspaceId])

	useEffect(() => {
		const jwt = GetJwtToken()

		if (!jwt) {
			setAuthState("done")
			logout()
			return
		}

		Client.instance.defaults.headers.common.Authorization = `Bearer ${jwt}`
		setAuthState("loading")
		Client.auth
			.whoAmI()
			.then((res) => {
				setUser(res.data)
			})
			.catch(() => {
				setAuthState("error")
			})
			.finally(() => {
				setAuthState("done")
			})
	}, [setUser, logout])

	useEffect(() => {
		if (!workspaceId) return
		Client.instance.defaults.headers.common.workspaceId = workspaceId.toString()
	}, [workspaceId])

	useEffect(() => {
		Client.instance.interceptors.response.use(
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
		login,
		logout,
		user,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
