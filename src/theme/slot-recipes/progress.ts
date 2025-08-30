import { defineSlotRecipe } from "@chakra-ui/react"

export const progressSlotRecipe = defineSlotRecipe({
	base: {
		label: {
			alignItems: "center",
			display: "inline-flex",
			fontWeight: "medium",
			gap: "1",
		},
		range: {
			_indeterminate: {
				"--animate-from-x": "-40%",
				"--animate-to-x": "100%",
				animation: "position 1s ease infinite normal none running",
				backgroundImage:
					"linear-gradient(to right, transparent 0%, var(--track-color) 50%, transparent 100%)",
				minWidth: "50%",
				position: "absolute",
				willChange: "left",
			},
			alignItems: "center",
			bgColor: "var(--track-color)",
			display: "flex",
			height: "100%",
			justifyContent: "center",
			transitionDuration: "slow",
			transitionProperty: "width, height",
		},
		root: {
			position: "relative",
			textStyle: "sm",
		},
		track: {
			overflow: "hidden",
			position: "relative",
		},
		valueText: {
			fontWeight: "medium",
			lineHeight: "1",
			textStyle: "xs",
		},
	},
	className: "chakra-progress",
	defaultVariants: {
		shape: "rounded",
		size: "md",
		variant: "outline",
	},
	slots: [
		"root",
		"label",
		"track",
		"range",
		"valueText",
		"view",
		"circle",
		"circleTrack",
		"circleRange",
	],
	variants: {
		animated: {
			true: {
				range: {
					"--animate-from": "var(--stripe-size)",
					animation: "bg-position 1s linear infinite",
				},
			},
		},
		shape: {
			full: {
				track: {
					borderRadius: "full",
				},
			},
			rounded: {
				track: {
					borderRadius: "l1",
				},
			},
			square: {},
		},
		size: {
			lg: {
				track: {
					h: "3",
				},
			},
			md: {
				track: {
					h: "2.5",
				},
			},
			sm: {
				track: {
					h: "2",
				},
			},
			xl: {
				track: {
					h: "4",
				},
			},
			xs: {
				track: {
					h: "1.5",
				},
			},
		},
		striped: {
			true: {
				range: {
					"--stripe-color": {
						_dark: "rgba(0, 0, 0, 0.3)",
						_light: "rgba(255, 255, 255, 0.3)",
					},
					"--stripe-size": "1rem",
					backgroundImage:
						"linear-gradient(45deg, var(--stripe-color) 25%, transparent 25%, transparent 50%, var(--stripe-color) 50%, var(--stripe-color) 75%, transparent 75%, transparent)",
					backgroundSize: "var(--stripe-size) var(--stripe-size)",
				},
			},
		},
		variant: {
			outline: {
				range: {
					bgColor: "colorPalette.solid",
				},
				track: {
					bgColor: "bg.muted",
					shadow: "inset",
				},
			},
			subtle: {
				range: {
					bgColor: "colorPalette.solid/72",
				},
				track: {
					bgColor: "colorPalette.muted",
				},
			},
		},
	},
})
