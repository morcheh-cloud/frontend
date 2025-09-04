import type { FunctionComponent, ReactNode } from "react"
import useAuth from "@/hooks/useAuth"

interface GuardProviderProps {
	children: ReactNode
}

const GuardProvider: FunctionComponent<GuardProviderProps> = ({ children }) => {
	const { user, authenticated } = useAuth()

	const isAllowed = !!user?.id && authenticated

	if (!isAllowed) {
		return <>access denied</>
	}

	return <>{children}</>
}

export default GuardProvider
