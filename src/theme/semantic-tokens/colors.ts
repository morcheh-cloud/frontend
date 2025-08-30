import { defineSemanticTokens } from "@chakra-ui/react"

export const colors = defineSemanticTokens.colors({
	bg: {
		DEFAULT: {
			value: {
				_dark: "{colors.black}",
				_light: "{colors.white}",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.gray.800}",
				_light: "{colors.gray.200}",
			},
		},
		error: {
			value: {
				_dark: "{colors.red.950}",
				_light: "{colors.red.50}",
			},
		},
		info: {
			value: {
				_dark: "{colors.blue.950}",
				_light: "{colors.blue.50}",
			},
		},
		inverted: {
			value: {
				_dark: "{colors.white}",
				_light: "{colors.black}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.gray.900}",
				_light: "{colors.gray.100}",
			},
		},
		panel: {
			value: {
				_dark: "{colors.gray.950}",
				_light: "{colors.white}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.gray.950}",
				_light: "{colors.gray.50}",
			},
		},
		success: {
			value: {
				_dark: "{colors.green.950}",
				_light: "{colors.green.50}",
			},
		},
		warning: {
			value: {
				_dark: "{colors.orange.950}",
				_light: "{colors.orange.50}",
			},
		},
	},
	blue: {
		contrast: {
			value: {
				_dark: "white",
				_light: "white",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.blue.700}",
				_light: "{colors.blue.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.blue.300}",
				_light: "{colors.blue.700}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.blue.500}",
				_light: "{colors.blue.500}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.blue.800}",
				_light: "{colors.blue.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.blue.600}",
				_light: "{colors.blue.600}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.blue.900}",
				_light: "{colors.blue.100}",
			},
		},
	},
	border: {
		DEFAULT: {
			value: {
				_dark: "{colors.gray.800}",
				_light: "{colors.gray.200}",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.gray.700}",
				_light: "{colors.gray.300}",
			},
		},
		error: {
			value: {
				_dark: "{colors.red.400}",
				_light: "{colors.red.500}",
			},
		},
		info: {
			value: {
				_dark: "{colors.blue.400}",
				_light: "{colors.blue.500}",
			},
		},
		inverted: {
			value: {
				_dark: "{colors.gray.200}",
				_light: "{colors.gray.800}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.gray.900}",
				_light: "{colors.gray.100}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.gray.950}",
				_light: "{colors.gray.50}",
			},
		},
		success: {
			value: {
				_dark: "{colors.green.400}",
				_light: "{colors.green.500}",
			},
		},
		warning: {
			value: {
				_dark: "{colors.orange.400}",
				_light: "{colors.orange.500}",
			},
		},
	},
	cyan: {
		contrast: {
			value: {
				_dark: "white",
				_light: "white",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.cyan.700}",
				_light: "{colors.cyan.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.cyan.300}",
				_light: "{colors.cyan.700}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.cyan.500}",
				_light: "{colors.cyan.500}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.cyan.800}",
				_light: "{colors.cyan.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.cyan.600}",
				_light: "{colors.cyan.600}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.cyan.900}",
				_light: "{colors.cyan.100}",
			},
		},
	},
	fg: {
		DEFAULT: {
			value: {
				_dark: "{colors.gray.50}",
				_light: "{colors.black}",
			},
		},
		error: {
			value: {
				_dark: "{colors.red.400}",
				_light: "{colors.red.500}",
			},
		},
		info: {
			value: {
				_dark: "{colors.blue.300}",
				_light: "{colors.blue.600}",
			},
		},
		inverted: {
			value: {
				_dark: "{colors.black}",
				_light: "{colors.gray.50}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.gray.400}",
				_light: "{colors.gray.600}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.gray.500}",
				_light: "{colors.gray.400}",
			},
		},
		success: {
			value: {
				_dark: "{colors.green.300}",
				_light: "{colors.green.600}",
			},
		},
		warning: {
			value: {
				_dark: "{colors.orange.300}",
				_light: "{colors.orange.600}",
			},
		},
	},
	gray: {
		contrast: {
			value: {
				_dark: "{colors.black}",
				_light: "{colors.white}",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.gray.700}",
				_light: "{colors.gray.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.gray.200}",
				_light: "{colors.gray.800}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.gray.400}",
				_light: "{colors.gray.400}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.gray.800}",
				_light: "{colors.gray.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.white}",
				_light: "{colors.gray.900}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.gray.900}",
				_light: "{colors.gray.100}",
			},
		},
	},
	green: {
		contrast: {
			value: {
				_dark: "white",
				_light: "white",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.green.700}",
				_light: "{colors.green.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.green.300}",
				_light: "{colors.green.700}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.green.500}",
				_light: "{colors.green.500}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.green.800}",
				_light: "{colors.green.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.green.600}",
				_light: "{colors.green.600}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.green.900}",
				_light: "{colors.green.100}",
			},
		},
	},
	orange: {
		contrast: {
			value: {
				_dark: "black",
				_light: "white",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.orange.700}",
				_light: "{colors.orange.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.orange.300}",
				_light: "{colors.orange.700}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.orange.500}",
				_light: "{colors.orange.500}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.orange.800}",
				_light: "{colors.orange.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.orange.500}",
				_light: "{colors.orange.600}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.orange.900}",
				_light: "{colors.orange.100}",
			},
		},
	},
	pink: {
		contrast: {
			value: {
				_dark: "white",
				_light: "white",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.pink.700}",
				_light: "{colors.pink.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.pink.300}",
				_light: "{colors.pink.700}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.pink.500}",
				_light: "{colors.pink.500}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.pink.800}",
				_light: "{colors.pink.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.pink.600}",
				_light: "{colors.pink.600}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.pink.900}",
				_light: "{colors.pink.100}",
			},
		},
	},
	purple: {
		contrast: {
			value: {
				_dark: "white",
				_light: "white",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.purple.700}",
				_light: "{colors.purple.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.purple.300}",
				_light: "{colors.purple.700}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.purple.500}",
				_light: "{colors.purple.500}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.purple.800}",
				_light: "{colors.purple.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.purple.600}",
				_light: "{colors.purple.600}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.purple.900}",
				_light: "{colors.purple.100}",
			},
		},
	},
	red: {
		contrast: {
			value: {
				_dark: "white",
				_light: "white",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.red.700}",
				_light: "{colors.red.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.red.300}",
				_light: "{colors.red.700}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.red.500}",
				_light: "{colors.red.500}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.red.800}",
				_light: "{colors.red.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.red.600}",
				_light: "{colors.red.600}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.red.900}",
				_light: "{colors.red.100}",
			},
		},
	},
	teal: {
		contrast: {
			value: {
				_dark: "white",
				_light: "white",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.teal.700}",
				_light: "{colors.teal.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.teal.300}",
				_light: "{colors.teal.700}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.teal.500}",
				_light: "{colors.teal.500}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.teal.800}",
				_light: "{colors.teal.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.teal.600}",
				_light: "{colors.teal.600}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.teal.900}",
				_light: "{colors.teal.100}",
			},
		},
	},
	yellow: {
		contrast: {
			value: {
				_dark: "black",
				_light: "black",
			},
		},
		emphasized: {
			value: {
				_dark: "{colors.yellow.700}",
				_light: "{colors.yellow.300}",
			},
		},
		fg: {
			value: {
				_dark: "{colors.yellow.300}",
				_light: "{colors.yellow.800}",
			},
		},
		focusRing: {
			value: {
				_dark: "{colors.yellow.500}",
				_light: "{colors.yellow.500}",
			},
		},
		muted: {
			value: {
				_dark: "{colors.yellow.800}",
				_light: "{colors.yellow.200}",
			},
		},
		solid: {
			value: {
				_dark: "{colors.yellow.300}",
				_light: "{colors.yellow.300}",
			},
		},
		subtle: {
			value: {
				_dark: "{colors.yellow.900}",
				_light: "{colors.yellow.100}",
			},
		},
	},
})
