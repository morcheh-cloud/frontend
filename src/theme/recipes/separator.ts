import { defineRecipe } from "@chakra-ui/react"

export const separatorRecipe = defineRecipe({
	base: {
		borderColor: "border",
		display: "block",
	},
	className: "chakra-separator",
	defaultVariants: {
		orientation: "horizontal",
		size: "sm",
		variant: "solid",
	},
	variants: {
		orientation: {
			horizontal: {
				borderTopWidth: "var(--separator-thickness)",
			},
			vertical: {
				borderInlineStartWidth: "var(--separator-thickness)",
			},
		},
		size: {
			lg: {
				"--separator-thickness": "3px",
			},
			md: {
				"--separator-thickness": "2px",
			},
			sm: {
				"--separator-thickness": "1px",
			},
			xs: {
				"--separator-thickness": "0.5px",
			},
		},
		variant: {
			dashed: {
				borderStyle: "dashed",
			},
			dotted: {
				borderStyle: "dotted",
			},
			solid: {
				borderStyle: "solid",
			},
		},
	},
})
