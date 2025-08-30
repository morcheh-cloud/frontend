import { defineRecipe } from "@chakra-ui/react"

export const badgeRecipe = defineRecipe({
	base: {
		alignItems: "center",
		borderRadius: "l2",
		display: "inline-flex",
		fontVariantNumeric: "tabular-nums",
		fontWeight: "medium",
		gap: "1",
		userSelect: "none",
		whiteSpace: "nowrap",
	},
	className: "chakra-badge",
	defaultVariants: {
		size: "sm",
		variant: "subtle",
	},
	variants: {
		size: {
			lg: {
				minH: "7",
				px: "2.5",
				textStyle: "sm",
			},
			md: {
				minH: "6",
				px: "2",
				textStyle: "sm",
			},
			sm: {
				minH: "5",
				px: "1.5",
				textStyle: "xs",
			},
			xs: {
				minH: "4",
				px: "1",
				textStyle: "2xs",
			},
		},
		variant: {
			outline: {
				color: "colorPalette.fg",
				shadow: "inset 0 0 0px 1px var(--shadow-color)",
				shadowColor: "colorPalette.muted",
			},
			plain: {
				color: "colorPalette.fg",
			},
			solid: {
				bg: "colorPalette.solid",
				color: "colorPalette.contrast",
			},
			subtle: {
				bg: "colorPalette.subtle",
				color: "colorPalette.fg",
			},
			surface: {
				bg: "colorPalette.subtle",
				color: "colorPalette.fg",
				shadow: "inset 0 0 0px 1px var(--shadow-color)",
				shadowColor: "colorPalette.muted",
			},
		},
	},
})
