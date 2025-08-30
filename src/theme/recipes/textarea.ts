import { defineRecipe } from "@chakra-ui/react"

export const textareaRecipe = defineRecipe({
	base: {
		_disabled: {
			layerStyle: "disabled",
		},
		_invalid: {
			borderColor: "var(--error-color)",
			focusRingColor: "var(--error-color)",
		},
		"--error-color": "colors.border.error",
		"--focus-color": "colors.colorPalette.focusRing",
		appearance: "none",
		borderRadius: "l2",
		minWidth: "0",
		outline: "0",
		position: "relative",
		textAlign: "start",
		width: "100%",
	},
	className: "chakra-textarea",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	variants: {
		size: {
			lg: {
				px: "4",
				py: "3",
				scrollPaddingBottom: "3",
				textStyle: "md",
			},
			md: {
				px: "3",
				py: "2",
				scrollPaddingBottom: "2",
				textStyle: "sm",
			},
			sm: {
				px: "2.5",
				py: "2",
				scrollPaddingBottom: "2",
				textStyle: "sm",
			},
			xl: {
				px: "4.5",
				py: "3.5",
				scrollPaddingBottom: "3.5",
				textStyle: "md",
			},
			xs: {
				px: "2",
				py: "1.5",
				scrollPaddingBottom: "1.5",
				textStyle: "xs",
			},
		},
		variant: {
			flushed: {
				_focusVisible: {
					borderColor: "var(--focus-color)",
					boxShadow: "0px 1px 0px 0px var(--focus-color)",
				},
				bg: "transparent",
				borderBottomColor: "border",
				borderBottomWidth: "1px",
				borderRadius: "0",
				px: "0",
			},
			outline: {
				bg: "transparent",
				borderColor: "border",
				borderWidth: "1px",
				focusVisibleRing: "inside",
			},
			subtle: {
				bg: "bg.muted",
				borderColor: "transparent",
				borderWidth: "1px",
				focusVisibleRing: "inside",
			},
		},
	},
})
