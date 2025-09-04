import type { FunctionComponent, ReactNode } from "react"
import AuthProvider from "@/providers/AuthProvider"
import ReactQueryProvider from "@/providers/reactQuery"
import ThemeProvider from "@/providers/theme"

interface ProviderProps {
	children: ReactNode
}

const AppProviders: FunctionComponent<ProviderProps> = ({ children }) => {
	return (
		<>
			<ThemeProvider>
				<AuthProvider>
					<ReactQueryProvider>{children}</ReactQueryProvider>
				</AuthProvider>
			</ThemeProvider>
		</>
	)
}

export default AppProviders
