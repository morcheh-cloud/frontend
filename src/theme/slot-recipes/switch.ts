import { defineSlotRecipe } from "@chakra-ui/react"

export const switchSlotRecipe = defineSlotRecipe({
	base: {
		control: {
			_disabled: {
				cursor: "not-allowed",
				opacity: "0.5",
			},
			_invalid: {
				outline: "2px solid",
				outlineColor: "border.error",
				outlineOffset: "2px",
			},
			borderRadius: "full",
			cursor: "switch",
			display: "inline-flex",
			flexShrink: 0,
			gap: "0.5rem",
			height: "var(--switch-height)",
			justifyContent: "flex-start",
			position: "relative",
			transition: "backgrounds",
			width: "var(--switch-width)",
		},
		indicator: {
			_checked: {
				insetInlineStart: "2px",
			},
			display: "grid",
			flexShrink: 0,
			fontSize: "var(--switch-indicator-font-size)",
			fontWeight: "medium",
			height: "var(--switch-height)",
			insetInlineStart: "calc(var(--switch-x) - 2px)",
			placeContent: "center",
			position: "absolute",
			transition: "inset-inline-start 0.12s ease",
			userSelect: "none",
			width: "var(--switch-height)",
		},
		label: {
			_disabled: {
				opacity: "0.5",
			},
			fontSize: "sm",
			fontWeight: "medium",
			lineHeight: "1",
			userSelect: "none",
		},
		root: {
			"--switch-diff": "calc(var(--switch-width) - var(--switch-height))",
			"--switch-x": {
				_rtl: "calc(var(--switch-diff) * -1)",
				base: "var(--switch-diff)",
			},
			alignItems: "center",
			display: "inline-flex",
			gap: "2.5",
			position: "relative",
			verticalAlign: "middle",
		},
		thumb: {
			_checked: {
				translate: "var(--switch-x) 0",
			},
			alignItems: "center",
			borderRadius: "inherit",
			display: "flex",
			flexShrink: 0,
			justifyContent: "center",
			transitionDuration: "fast",
			transitionProperty: "translate",
		},
	},
	className: "chakra-switch",
	defaultVariants: {
		size: "md",
		variant: "solid",
	},
	slots: ["root", "label", "control", "thumb", "indicator"],
	variants: {
		size: {
			lg: {
				root: {
					"--switch-height": "sizes.6",
					"--switch-indicator-font-size": "fontSizes.md",
					"--switch-width": "sizes.12",
				},
			},
			md: {
				root: {
					"--switch-height": "sizes.5",
					"--switch-indicator-font-size": "fontSizes.sm",
					"--switch-width": "sizes.10",
				},
			},
			sm: {
				root: {
					"--switch-height": "sizes.4",
					"--switch-indicator-font-size": "fontSizes.xs",
					"--switch-width": "sizes.8",
				},
			},
			xs: {
				root: {
					"--switch-height": "sizes.3",
					"--switch-indicator-font-size": "fontSizes.xs",
					"--switch-width": "sizes.6",
				},
			},
		},
		variant: {
			raised: {
				control: {
					_checked: {
						bg: "colorPalette.solid/60",
					},
					bg: "bg.muted",
					borderRadius: "full",
					boxShadow: "inset",
					height: "calc(var(--switch-height) / 2)",
				},
				thumb: {
					_checked: {
						bg: "colorPalette.solid",
					},
					bg: "white",
					boxShadow: "xs",
					focusVisibleRing: "outside",
					height: "var(--switch-height)",
					position: "relative",
					top: "calc(var(--switch-height) * -0.25)",
					width: "var(--switch-height)",
				},
			},
			solid: {
				control: {
					_checked: {
						bg: "colorPalette.solid",
					},
					bg: "bg.emphasized",
					borderRadius: "full",
					focusVisibleRing: "outside",
				},
				thumb: {
					_checked: {
						bg: "colorPalette.contrast",
					},
					bg: "white",
					boxShadow: "sm",
					height: "var(--switch-height)",
					scale: "0.8",
					width: "var(--switch-height)",
				},
			},
		},
	},
})
