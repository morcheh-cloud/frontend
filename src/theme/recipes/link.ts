import { defineRecipe } from "@chakra-ui/react"

export const linkRecipe = defineRecipe({
	base: {
		alignItems: "center",
		borderRadius: "l1",
		cursor: "pointer",
		display: "inline-flex",
		focusRing: "outside",
		gap: "1.5",
		outline: "none",
	},
	className: "chakra-link",
	defaultVariants: {
		variant: "plain",
	},
	variants: {
		variant: {
			plain: {
				_hover: {
					textDecoration: "underline",
					textDecorationColor: "currentColor/20",
					textUnderlineOffset: "3px",
				},
				color: "colorPalette.fg",
			},
			underline: {
				color: "colorPalette.fg",
				textDecoration: "underline",
				textDecorationColor: "currentColor/20",
				textUnderlineOffset: "3px",
			},
		},
	},
})
