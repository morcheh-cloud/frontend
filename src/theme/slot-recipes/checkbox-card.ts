import { defineSlotRecipe } from "@chakra-ui/react";

export const checkboxCardSlotRecipe = defineSlotRecipe({
	base: {
		addon: {
			_disabled: {
				opacity: "0.5",
			},
		},
		content: {
			alignItems: "var(--checkbox-card-align)",
			display: "flex",
			flex: "1",
			flexDirection: "column",
			gap: "1",
			justifyContent: "var(--checkbox-card-justify)",
		},
		control: {
			alignItems: "var(--checkbox-card-align)",
			borderRadius: "inherit",
			display: "inline-flex",
			flex: "1",
			justifyContent: "var(--checkbox-card-justify)",
			position: "relative",
		},
		description: {
			_disabled: {
				opacity: "0.5",
			},
			opacity: "0.64",
			textStyle: "sm",
		},
		indicator: {
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
			alignItems: "center",
			display: "flex",
			flex: "1",
			fontWeight: "medium",
			gap: "2",
		},
		root: {
			_disabled: {
				opacity: "0.8",
			},
			_invalid: {
				outline: "2px solid",
				outlineColor: "border.error",
			},
			borderRadius: "l2",
			display: "flex",
			flex: "1",
			flexDirection: "column",
			focusVisibleRing: "outside",
			position: "relative",
			userSelect: "none",
		},
	},
	className: "chakra-checkbox-card",
	defaultVariants: {
		align: "start",
		orientation: "horizontal",
		size: "md",
		variant: "outline",
	},
	slots: [
		"root",
		"control",
		"label",
		"description",
		"addon",
		"indicator",
		"content",
	],
	variants: {
		align: {
			center: {
				content: {
					textAlign: "center",
				},
				root: {
					"--checkbox-card-align": "center",
				},
			},
			end: {
				content: {
					textAlign: "end",
				},
				root: {
					"--checkbox-card-align": "flex-end",
				},
			},
			start: {
				content: {
					textAlign: "start",
				},
				root: {
					"--checkbox-card-align": "flex-start",
				},
			},
		},
		justify: {
			center: {
				root: {
					"--checkbox-card-justify": "center",
				},
			},
			end: {
				root: {
					"--checkbox-card-justify": "flex-end",
				},
			},
			start: {
				root: {
					"--checkbox-card-justify": "flex-start",
				},
			},
		},
		orientation: {
			horizontal: {
				control: {
					flexDirection: "row",
				},
			},
			vertical: {
				control: {
					flexDirection: "column",
				},
			},
		},
		size: {
			lg: {
				addon: {
					borderTopWidth: "1px",
					px: "4",
					py: "2",
				},
				control: {
					gap: "3.5",
					padding: "4",
				},
				indicator: {
					boxSize: "6",
					p: "0.5",
				},
				root: {
					textStyle: "md",
				},
			},
			md: {
				addon: {
					borderTopWidth: "1px",
					px: "4",
					py: "2",
				},
				control: {
					gap: "2.5",
					padding: "4",
				},
				indicator: {
					boxSize: "5",
					p: "0.5",
				},
				root: {
					textStyle: "sm",
				},
			},
			sm: {
				addon: {
					borderTopWidth: "1px",
					px: "3",
					py: "1.5",
				},
				control: {
					gap: "1.5",
					padding: "3",
				},
				indicator: {
					boxSize: "4",
				},
				root: {
					textStyle: "sm",
				},
			},
		},
		variant: {
			outline: {
				indicator: {
					"&:is([data-state=checked], [data-state=indeterminate])": {
						bg: "colorPalette.solid",
						borderColor: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
					borderColor: "border.emphasized",
				},
				root: {
					_checked: {
						borderColor: "colorPalette.solid",
						boxShadow: "0 0 0 1px var(--shadow-color)",
						boxShadowColor: "colorPalette.solid",
					},
					borderColor: "border",
					borderWidth: "1px",
				},
			},
			solid: {
				indicator: {
					"&:is([data-state=checked], [data-state=indeterminate])": {
						borderColor: "colorPalette.solid",
					},
					borderColor: "border",
					color: "colorPalette.fg",
				},
				root: {
					_checked: {
						bg: "colorPalette.solid",
						borderColor: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
					borderWidth: "1px",
				},
			},
			subtle: {
				control: {
					_checked: {
						bg: "colorPalette.muted",
						color: "colorPalette.fg",
					},
				},
				indicator: {
					"&:is([data-state=checked], [data-state=indeterminate])": {
						color: "colorPalette.fg",
					},
				},
				root: {
					bg: "bg.muted",
				},
			},
			surface: {
				indicator: {
					"&:is([data-state=checked], [data-state=indeterminate])": {
						bg: "colorPalette.solid",
						borderColor: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
					borderColor: "border.emphasized",
				},
				root: {
					_checked: {
						bg: "colorPalette.subtle",
						borderColor: "colorPalette.muted",
						color: "colorPalette.fg",
					},
					_disabled: {
						bg: "bg.muted",
					},
					borderColor: "border",
					borderWidth: "1px",
				},
			},
		},
	},
});
