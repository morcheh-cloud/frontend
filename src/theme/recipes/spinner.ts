import { defineRecipe } from "@chakra-ui/react"

export const spinnerRecipe = defineRecipe({
	base: {
		"--spinner-track-color": "transparent",
		animation: "spin",
		animationDuration: "slowest",
		borderBottomColor: "var(--spinner-track-color)",
		borderColor: "currentColor",
		borderInlineStartColor: "var(--spinner-track-color)",
		borderRadius: "full",
		borderStyle: "solid",
		borderWidth: "2px",
		display: "inline-block",
		height: "var(--spinner-size)",
		width: "var(--spinner-size)",
	},
	className: "chakra-spinner",
	defaultVariants: {
		size: "md",
	},
	variants: {
		size: {
			inherit: {
				"--spinner-size": "1em",
			},
			lg: {
				"--spinner-size": "sizes.8",
			},
			md: {
				"--spinner-size": "sizes.5",
			},
			sm: {
				"--spinner-size": "sizes.4",
			},
			xl: {
				"--spinner-size": "sizes.10",
			},
			xs: {
				"--spinner-size": "sizes.3",
			},
		},
	},
})
