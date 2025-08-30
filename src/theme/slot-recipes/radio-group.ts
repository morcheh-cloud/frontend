import { defineSlotRecipe } from "@chakra-ui/react"

export const radioGroupSlotRecipe = defineSlotRecipe({
	base: {
		item: {
			_disabled: {
				cursor: "disabled",
			},
			alignItems: "center",
			display: "inline-flex",
			fontWeight: "medium",
			position: "relative",
		},
		itemControl: {
			_disabled: {
				cursor: "disabled",
				opacity: "0.5",
			},
			_focusVisible: {
				outline: "2px solid",
				outlineColor: "colorPalette.focusRing",
				outlineOffset: "2px",
			},
			_invalid: {
				borderColor: "red.500",
				colorPalette: "red",
			},
			"& .dot": {
				bg: "currentColor",
				borderRadius: "full",
				height: "100%",
				scale: "0.4",
				width: "100%",
			},
			alignItems: "center",
			borderColor: "transparent",
			borderRadius: "full",
			borderWidth: "1px",
			color: "white",
			cursor: "radio",
			display: "inline-flex",
			flexShrink: 0,
			justifyContent: "center",
			verticalAlign: "top",
		},
		label: {
			_disabled: {
				opacity: "0.5",
			},
			textStyle: "sm",
			userSelect: "none",
		},
	},
	className: "chakra-radio-group",
	defaultVariants: {
		size: "md",
		variant: "solid",
	},
	slots: [
		"root",
		"label",
		"item",
		"itemText",
		"itemControl",
		"indicator",
		"itemAddon",
		"itemIndicator",
	],
	variants: {
		size: {
			lg: {
				item: {
					gap: "3",
					textStyle: "md",
				},
				itemControl: {
					boxSize: "6",
				},
			},
			md: {
				item: {
					gap: "2.5",
					textStyle: "sm",
				},
				itemControl: {
					boxSize: "5",
				},
			},
			sm: {
				item: {
					gap: "2",
					textStyle: "sm",
				},
				itemControl: {
					boxSize: "4",
				},
			},
			xs: {
				item: {
					gap: "1.5",
					textStyle: "xs",
				},
				itemControl: {
					boxSize: "3",
				},
			},
		},
		variant: {
			outline: {
				itemControl: {
					_checked: {
						borderColor: "colorPalette.solid",
						color: "colorPalette.fg",
					},
					"& .dot": {
						scale: "0.6",
					},
					borderColor: "inherit",
					borderWidth: "1px",
				},
			},
			solid: {
				itemControl: {
					_checked: {
						bg: "colorPalette.solid",
						borderColor: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
					borderColor: "border.emphasized",
					borderWidth: "1px",
				},
			},
			subtle: {
				itemControl: {
					_checked: {
						color: "colorPalette.fg",
					},
					bg: "colorPalette.muted",
					borderColor: "colorPalette.muted",
					borderWidth: "1px",
					color: "transparent",
				},
			},
		},
	},
})
