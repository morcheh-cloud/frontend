import { ChakraProvider } from "@chakra-ui/react"
import type { FunctionComponent, ReactNode } from "react"
import { system } from "@/theme"

interface ThemeProps {
	children: ReactNode
}

const ThemeProvider: FunctionComponent<ThemeProps> = ({ children }) => {
	return <ChakraProvider value={system}>{children}</ChakraProvider>
}

export default ThemeProvider
