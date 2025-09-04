import type { FunctionComponent } from "react"
import GuardProvider from "@/providers/guardProvider"

interface LayoutWrapperProps {
	children: React.ReactNode
}

const LayoutWrapper: FunctionComponent<LayoutWrapperProps> = ({ children }) => {
	return (
		<>
			<GuardProvider>{children}</GuardProvider>
		</>
	)
}

export default LayoutWrapper
