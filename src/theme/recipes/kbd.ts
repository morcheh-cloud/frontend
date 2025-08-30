import { defineRecipe } from "@chakra-ui/react"

export const kbdRecipe = defineRecipe({
	base: {
		alignItems: "center",
		borderRadius: "l2",
		display: "inline-flex",
		flexShrink: "0",
		fontFamily: "mono",
		fontWeight: "medium",
		px: "1",
		userSelect: "none",
		whiteSpace: "nowrap",
		wordSpacing: "-0.5em",
	},
	className: "chakra-kbd",
	defaultVariants: {
		size: "md",
		variant: "raised",
	},
	variants: {
		size: {
			lg: {
				height: "6",
				textStyle: "md",
			},
			md: {
				height: "5",
				textStyle: "sm",
			},
			sm: {
				height: "4.5",
				textStyle: "xs",
			},
		},
		variant: {
			outline: {
				borderWidth: "1px",
				color: "colorPalette.fg",
			},
			plain: {
				color: "colorPalette.fg",
			},
			raised: {
				bg: "colorPalette.subtle",
				borderBottomWidth: "2px",
				borderColor: "colorPalette.muted",
				borderWidth: "1px",
				color: "colorPalette.fg",
			},
			subtle: {
				bg: "colorPalette.muted",
				color: "colorPalette.fg",
			},
		},
	},
})
