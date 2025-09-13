import type { FunctionComponent, ReactNode } from "react"
import { lazy, useEffect } from "react"
import { useNavigate } from "react-router"
import useAuth from "@/hooks/useAuth"

const LazyAccessDenied = lazy(() => import("@/layouts/AccessDenied"))
const AppLoading = lazy(() => import("@/layouts/AppLoading"))

interface GuardProviderProps {
	children: ReactNode
}

const GuardProvider: FunctionComponent<GuardProviderProps> = ({ children }) => {
	const navigate = useNavigate()
	const { user, authenticated, authState, workspaceId } = useAuth()

	const isAllowed = !!user?.id && authenticated
	const loading = authState === "loading"

	useEffect(() => {
		if (isAllowed && !workspaceId && user?.workspaces?.length) {
			navigate(`/workspaces/add`)
		}
	}, [isAllowed, navigate, workspaceId, user?.workspaces?.length])

	if (!isAllowed) {
		return <LazyAccessDenied />
	}

	if (loading) {
		return <AppLoading />
	}

	return <>{children}</>
}

export default GuardProvider
