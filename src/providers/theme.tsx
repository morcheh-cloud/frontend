// theme.ts
import {
	ChakraProvider,
	createSystem,
	defaultConfig,
	defineConfig,
	defineTextStyles,
	// ⬇️ add this only if you prefer the helper function form
	// defineRecipe,
} from "@chakra-ui/react"
import type { FunctionComponent, ReactNode } from "react"

export const textStyles = defineTextStyles({
	body: {
		description: "The body text style - used in paragraphs",
		value: {
			fontFamily: '"Inter", sans-serif',
			fontSize: "16px",
			fontWeight: "400",
			letterSpacing: "0",
			lineHeight: "24",
			textDecoration: "None",
			textTransform: "None",
		},
	},
})

const config = defineConfig({
	theme: {
		recipes: {
			iconButton: {},
		},
		textStyles,
		tokens: {
			colors: {},
		},
	},
})

const system = createSystem(defaultConfig, config)

interface ThemeProps {
	children: ReactNode
}

const ThemeProvider: FunctionComponent<ThemeProps> = ({ children }) => {
	return <ChakraProvider value={system}>{children}</ChakraProvider>
}

export default ThemeProvider
