import { defineSlotRecipe } from "@chakra-ui/react"

export const radioCardSlotRecipe = defineSlotRecipe({
	base: {
		item: {
			_checked: {
				zIndex: "1",
			},
			_disabled: {
				borderColor: "border.disabled",
				opacity: "0.8",
			},
			_focus: {
				bg: "colorPalette.muted/20",
			},
			borderRadius: "l2",
			display: "flex",
			flex: "1",
			flexDirection: "column",
			position: "relative",
			userSelect: "none",
		},
		itemAddon: {
			_disabled: {
				color: "fg.muted",
			},
			roundedBottom: "inherit",
		},
		itemContent: {
			alignItems: "var(--radio-card-align)",
			display: "flex",
			flex: "1",
			flexDirection: "column",
			gap: "1",
			justifyContent: "var(--radio-card-justify)",
		},
		itemControl: {
			_disabled: {
				bg: "bg.muted",
			},
			alignItems: "var(--radio-card-align)",
			display: "inline-flex",
			flex: "1",
			justifyContent: "var(--radio-card-justify)",
			pos: "relative",
			rounded: "inherit",
		},
		itemDescription: {
			opacity: "0.64",
			textStyle: "sm",
		},
		itemIndicator: {
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
		itemText: {
			flex: "1",
			fontWeight: "medium",
		},
		label: {
			_disabled: {
				opacity: "0.5",
			},
			display: "inline-flex",
			fontWeight: "medium",
			textStyle: "sm",
		},
		root: {
			display: "flex",
			flexDirection: "column",
			gap: "1.5",
			isolation: "isolate",
		},
	},
	className: "chakra-radio-card",
	defaultVariants: {
		align: "start",
		orientation: "horizontal",
		size: "md",
		variant: "outline",
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
		"itemContent",
		"itemDescription",
	],
	variants: {
		align: {
			center: {
				item: {
					"--radio-card-align": "center",
				},
				itemControl: {
					textAlign: "center",
				},
			},
			end: {
				item: {
					"--radio-card-align": "flex-end",
				},
				itemControl: {
					textAlign: "end",
				},
			},
			start: {
				item: {
					"--radio-card-align": "flex-start",
				},
				itemControl: {
					textAlign: "start",
				},
			},
		},
		justify: {
			center: {
				item: {
					"--radio-card-justify": "center",
				},
			},
			end: {
				item: {
					"--radio-card-justify": "flex-end",
				},
			},
			start: {
				item: {
					"--radio-card-justify": "flex-start",
				},
			},
		},
		orientation: {
			horizontal: {
				itemControl: {
					flexDirection: "row",
				},
			},
			vertical: {
				itemControl: {
					flexDirection: "column",
				},
			},
		},
		size: {
			lg: {
				item: {
					textStyle: "md",
				},
				itemAddon: {
					borderTopWidth: "1px",
					px: "4",
					py: "2",
				},
				itemControl: {
					gap: "3.5",
					padding: "4",
				},
				itemIndicator: {
					boxSize: "6",
				},
			},
			md: {
				item: {
					textStyle: "sm",
				},
				itemAddon: {
					borderTopWidth: "1px",
					px: "4",
					py: "2",
				},
				itemControl: {
					gap: "2.5",
					padding: "4",
				},
				itemIndicator: {
					boxSize: "5",
				},
			},
			sm: {
				item: {
					textStyle: "sm",
				},
				itemAddon: {
					borderTopWidth: "1px",
					px: "3",
					py: "1.5",
				},
				itemControl: {
					gap: "1.5",
					padding: "3",
				},
				itemIndicator: {
					boxSize: "4",
				},
			},
		},
		variant: {
			outline: {
				item: {
					_checked: {
						borderColor: "colorPalette.solid",
						boxShadow: "0 0 0 1px var(--shadow-color)",
						boxShadowColor: "colorPalette.solid",
					},
					borderWidth: "1px",
				},
				itemIndicator: {
					_checked: {
						bg: "colorPalette.solid",
						borderColor: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
					borderColor: "border.emphasized",
					borderWidth: "1px",
				},
			},
			solid: {
				item: {
					_checked: {
						bg: "colorPalette.solid",
						borderColor: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
					borderWidth: "1px",
				},
				itemIndicator: {
					_checked: {
						borderColor: "currentcolor",
						color: "colorPalette.solid",
					},
					bg: "bg",
					borderColor: "inherit",
					borderWidth: "1px",
				},
			},
			subtle: {
				item: {
					bg: "bg.muted",
				},
				itemControl: {
					_checked: {
						bg: "colorPalette.muted",
						color: "colorPalette.fg",
					},
				},
				itemIndicator: {
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
			surface: {
				item: {
					_checked: {
						bg: "colorPalette.subtle",
						borderColor: "colorPalette.muted",
						color: "colorPalette.fg",
					},
					borderWidth: "1px",
				},
				itemIndicator: {
					_checked: {
						bg: "colorPalette.solid",
						borderColor: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
					borderColor: "border.emphasized",
					borderWidth: "1px",
				},
			},
		},
	},
})
