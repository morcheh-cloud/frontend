import type { FunctionComponent, ReactNode } from "react"
import { lazy } from "react"
import useAuth from "@/hooks/useAuth"

const LazyAccessDenied = lazy(() => import("@/layouts/AccessDenied"))

interface GuardProviderProps {
	children: ReactNode
}

const GuardProvider: FunctionComponent<GuardProviderProps> = ({ children }) => {
	const { user, authenticated } = useAuth()

	const isAllowed = !!user?.id && authenticated

	if (!isAllowed) {
		return <LazyAccessDenied />
	}

	return <>{children}</>
}

export default GuardProvider
