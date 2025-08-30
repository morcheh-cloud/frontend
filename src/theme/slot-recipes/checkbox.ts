import { defineSlotRecipe } from "@chakra-ui/react"

export const checkboxSlotRecipe = defineSlotRecipe({
	base: {
		control: {
			_disabled: {
				cursor: "disabled",
				opacity: "0.5",
			},
			_icon: {
				boxSize: "full",
			},
			_invalid: {
				borderColor: "border.error",
				colorPalette: "red",
			},
			alignItems: "center",
			borderColor: "transparent",
			borderRadius: "l1",
			borderWidth: "1px",
			color: "white",
			cursor: "checkbox",
			display: "inline-flex",
			flexShrink: "0",
			focusVisibleRing: "outside",
			justifyContent: "center",
		},
		label: {
			_disabled: {
				opacity: "0.5",
			},
			fontWeight: "medium",
			userSelect: "none",
		},
		root: {
			alignItems: "center",
			display: "inline-flex",
			gap: "2",
			position: "relative",
			verticalAlign: "top",
		},
	},
	className: "chakra-checkbox",
	defaultVariants: {
		size: "md",
		variant: "solid",
	},
	slots: ["root", "label", "control", "indicator", "group"],
	variants: {
		size: {
			lg: {
				control: {
					boxSize: "6",
					p: "0.5",
				},
				label: {
					textStyle: "md",
				},
				root: {
					gap: "3",
				},
			},
			md: {
				control: {
					boxSize: "5",
					p: "0.5",
				},
				label: {
					textStyle: "sm",
				},
				root: {
					gap: "2.5",
				},
			},
			sm: {
				control: {
					boxSize: "4",
				},
				label: {
					textStyle: "sm",
				},
				root: {
					gap: "2",
				},
			},
			xs: {
				control: {
					boxSize: "3",
				},
				label: {
					textStyle: "xs",
				},
				root: {
					gap: "1.5",
				},
			},
		},
		variant: {
			outline: {
				control: {
					"&:is([data-state=checked], [data-state=indeterminate])": {
						borderColor: "colorPalette.solid",
						color: "colorPalette.fg",
					},
					borderColor: "border",
				},
			},
			solid: {
				control: {
					"&:is([data-state=checked], [data-state=indeterminate])": {
						bg: "colorPalette.solid",
						borderColor: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
					borderColor: "border.emphasized",
				},
			},
			subtle: {
				control: {
					"&:is([data-state=checked], [data-state=indeterminate])": {
						color: "colorPalette.fg",
					},
					bg: "colorPalette.muted",
					borderColor: "colorPalette.muted",
				},
			},
		},
	},
})
