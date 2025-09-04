import type { FunctionComponent, ReactNode } from "react"
import ReactQueryProvider from "@/providers/reactQuery"
import ThemeProvider from "@/providers/theme"

interface ProviderProps {
	children: ReactNode
}

const AppProviders: FunctionComponent<ProviderProps> = ({ children }) => {
	return (
		<>
			<ThemeProvider>
				<ReactQueryProvider>{children}</ReactQueryProvider>
			</ThemeProvider>
		</>
	)
}

export default AppProviders
