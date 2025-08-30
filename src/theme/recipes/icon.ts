import { defineRecipe } from "@chakra-ui/react"

export const iconRecipe = defineRecipe({
	base: {
		color: "currentcolor",
		display: "inline-block",
		flexShrink: "0",
		lineHeight: "1em",
		verticalAlign: "middle",
	},
	className: "chakra-icon",
	defaultVariants: {
		size: "inherit",
	},
	variants: {
		size: {
			"2xl": {
				boxSize: "8",
			},
			inherit: {},
			lg: {
				boxSize: "6",
			},
			md: {
				boxSize: "5",
			},
			sm: {
				boxSize: "4",
			},
			xl: {
				boxSize: "7",
			},
			xs: {
				boxSize: "3",
			},
		},
	},
})
