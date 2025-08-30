import { defineSlotRecipe } from "@chakra-ui/react"

export const stepsSlotRecipe = defineSlotRecipe({
	base: {
		content: {
			focusVisibleRing: "outside",
		},
		description: {
			color: "fg.muted",
		},
		indicator: {
			_icon: {
				flexShrink: "0",
				height: "var(--steps-icon-size)",
				width: "var(--steps-icon-size)",
			},
			alignItems: "center",
			borderRadius: "full",
			display: "flex",
			flexShrink: "0",
			fontWeight: "medium",
			height: "var(--steps-size)",
			justifyContent: "center",
			width: "var(--steps-size)",
		},
		item: {
			"&:last-of-type": {
				"& [data-part=separator]": {
					display: "none",
				},
				flex: "initial",
			},
			display: "flex",
			flex: "1 0 0",
			gap: "3",
			position: "relative",
		},
		list: {
			"--steps-gutter": "spacing.3",
			"--steps-thickness": "2px",
			display: "flex",
			justifyContent: "space-between",
		},
		root: {
			display: "flex",
			width: "full",
		},
		separator: {
			bg: "border",
			flex: "1",
		},
		title: {
			color: "fg",
			fontWeight: "medium",
		},
		trigger: {
			alignItems: "center",
			borderRadius: "l2",
			display: "flex",
			focusVisibleRing: "outside",
			gap: "3",
			textAlign: "start",
		},
	},
	className: "chakra-steps",
	defaultVariants: {
		orientation: "horizontal",
		size: "md",
		variant: "solid",
	},
	slots: [
		"root",
		"list",
		"item",
		"trigger",
		"indicator",
		"separator",
		"content",
		"title",
		"description",
		"nextTrigger",
		"prevTrigger",
		"progress",
	],
	variants: {
		orientation: {
			horizontal: {
				item: {
					alignItems: "center",
				},
				list: {
					alignItems: "center",
					flexDirection: "row",
				},
				root: {
					flexDirection: "column",
					width: "100%",
				},
				separator: {
					height: "var(--steps-thickness)",
					marginX: "var(--steps-gutter)",
					width: "100%",
				},
			},
			vertical: {
				item: {
					alignItems: "flex-start",
				},
				list: {
					alignItems: "flex-start",
					flexDirection: "column",
				},
				root: {
					flexDirection: "row",
					height: "100%",
				},
				separator: {
					height: "100%",
					insetStart: "calc(var(--steps-size) / 2 - 1px)",
					maxHeight: "calc(100% - var(--steps-size) - var(--steps-gutter) * 2)",
					position: "absolute",
					top: "calc(var(--steps-size) + var(--steps-gutter))",
					width: "var(--steps-thickness)",
				},
			},
		},
		size: {
			lg: {
				list: {
					"--steps-icon-size": "sizes.5",
					"--steps-size": "sizes.11",
					textStyle: "md",
				},
				root: {
					gap: "6",
				},
				title: {
					textStyle: "md",
				},
			},
			md: {
				list: {
					"--steps-icon-size": "sizes.4",
					"--steps-size": "sizes.10",
					textStyle: "sm",
				},
				root: {
					gap: "4",
				},
				title: {
					textStyle: "sm",
				},
			},
			sm: {
				list: {
					"--steps-icon-size": "sizes.4",
					"--steps-size": "sizes.8",
					textStyle: "xs",
				},
				root: {
					gap: "3",
				},
				title: {
					textStyle: "sm",
				},
			},
			xs: {
				list: {
					"--steps-icon-size": "sizes.3.5",
					"--steps-size": "sizes.6",
					textStyle: "xs",
				},
				root: {
					gap: "2.5",
				},
				title: {
					textStyle: "sm",
				},
			},
		},
		variant: {
			solid: {
				indicator: {
					_complete: {
						bg: "colorPalette.solid",
						borderColor: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
					_current: {
						bg: "colorPalette.muted",
						borderColor: "colorPalette.solid",
						borderWidth: "var(--steps-thickness)",
						color: "colorPalette.fg",
					},
					_incomplete: {
						borderWidth: "var(--steps-thickness)",
					},
				},
				separator: {
					_complete: {
						bg: "colorPalette.solid",
					},
				},
			},
			subtle: {
				indicator: {
					_complete: {
						bg: "colorPalette.emphasized",
						color: "colorPalette.fg",
					},
					_current: {
						bg: "colorPalette.muted",
						color: "colorPalette.fg",
					},
					_incomplete: {
						bg: "bg.muted",
					},
				},
				separator: {
					_complete: {
						bg: "colorPalette.emphasized",
					},
				},
			},
		},
	},
})
