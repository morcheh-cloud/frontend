import { defineRecipe } from "@chakra-ui/react"

export const inputRecipe = defineRecipe({
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
		height: "var(--input-height)",
		minW: "var(--input-height)",
		minWidth: "0",
		outline: "0",
		position: "relative",
		textAlign: "start",
		width: "100%",
	},
	className: "chakra-input",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	variants: {
		size: {
			"2xl": {
				"--input-height": "sizes.16",
				px: "5",
				textStyle: "lg",
			},
			"2xs": {
				"--input-height": "sizes.7",
				px: "2",
				textStyle: "xs",
			},
			lg: {
				"--input-height": "sizes.11",
				px: "4",
				textStyle: "md",
			},
			md: {
				"--input-height": "sizes.10",
				px: "3",
				textStyle: "sm",
			},
			sm: {
				"--input-height": "sizes.9",
				px: "2.5",
				textStyle: "sm",
			},
			xl: {
				"--input-height": "sizes.12",
				px: "4.5",
				textStyle: "md",
			},
			xs: {
				"--input-height": "sizes.8",
				px: "2",
				textStyle: "xs",
			},
		},
		variant: {
			flushed: {
				_focusVisible: {
					_invalid: {
						borderColor: "var(--error-color)",
						boxShadow: "0px 1px 0px 0px var(--error-color)",
					},
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
				focusRingColor: "var(--focus-color)",
				focusVisibleRing: "inside",
			},
			subtle: {
				bg: "bg.muted",
				borderColor: "transparent",
				borderWidth: "1px",
				focusRingColor: "var(--focus-color)",
				focusVisibleRing: "inside",
			},
		},
	},
})
