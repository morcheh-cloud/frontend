import type { FunctionComponent, ReactNode } from "react"
import ThemeProvider from "@/providers/theme"

interface ProviderProps {
	children: ReactNode
}

const Provider: FunctionComponent<ProviderProps> = ({ children }) => {
	return (
		<>
			<ThemeProvider>{children}</ThemeProvider>
		</>
	)
}

export default Provider
