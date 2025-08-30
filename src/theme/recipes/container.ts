import { defineRecipe } from "@chakra-ui/react"

export const containerRecipe = defineRecipe({
	base: {
		maxWidth: "8xl",
		mx: "auto",
		position: "relative",
		px: {
			base: "4",
			lg: "8",
			md: "6",
		},
		w: "100%",
	},
	className: "chakra-container",
	variants: {
		centerContent: {
			true: {
				alignItems: "center",
				display: "flex",
				flexDirection: "column",
			},
		},
		fluid: {
			true: {
				maxWidth: "full",
			},
		},
	},
})
