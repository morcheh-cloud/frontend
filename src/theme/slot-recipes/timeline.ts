import { defineSlotRecipe } from "@chakra-ui/react"

export const timelineSlotRecipe = defineSlotRecipe({
	base: {
		connector: {
			alignSelf: "stretch",
			position: "relative",
		},
		content: {
			display: "flex",
			flexDirection: "column",
			gap: "2",
			pb: "6",
			width: "full",
		},
		description: {
			color: "fg.muted",
			textStyle: "xs",
		},
		indicator: {
			alignItems: "center",
			borderRadius: "full",
			boxSize: "var(--timeline-indicator-size)",
			display: "flex",
			flexShrink: "0",
			fontSize: "var(--timeline-font-size)",
			fontWeight: "medium",
			justifyContent: "center",
			outline: "2px solid {colors.bg}",
			position: "relative",
		},
		item: {
			_last: {
				"& :where(.chakra-timeline__separator)": {
					display: "none",
				},
			},
			alignItems: "flex-start",
			display: "flex",
			flexShrink: 0,
			gap: "4",
			position: "relative",
		},
		root: {
			"--timeline-gutter": "4px",
			"--timeline-thickness": "1px",
			display: "flex",
			flexDirection: "column",
			width: "full",
		},
		separator: {
			borderColor: "border",
			borderStartWidth: "var(--timeline-thickness)",
			insetBlock: "0",
			insetInlineStart: "calc(var(--timeline-indicator-size) / 2)",
			ms: "calc(-1 * var(--timeline-thickness) / 2)",
			position: "absolute",
		},
		title: {
			alignItems: "center",
			display: "flex",
			flexWrap: "wrap",
			fontWeight: "medium",
			gap: "1.5",
			mt: "var(--timeline-margin)",
		},
	},
	className: "chakra-timeline",
	defaultVariants: {
		size: "md",
		variant: "solid",
	},
	slots: [
		"root",
		"item",
		"content",
		"separator",
		"indicator",
		"connector",
		"title",
		"description",
	],
	variants: {
		size: {
			lg: {
				root: {
					"--timeline-font-size": "fontSizes.xs",
					"--timeline-indicator-size": "sizes.6",
				},
				title: {
					mt: "0.5",
					textStyle: "sm",
				},
			},
			md: {
				root: {
					"--timeline-font-size": "fontSizes.xs",
					"--timeline-indicator-size": "sizes.5",
				},
				title: {
					textStyle: "sm",
				},
			},
			sm: {
				root: {
					"--timeline-font-size": "fontSizes.2xs",
					"--timeline-indicator-size": "sizes.4",
				},
				title: {
					textStyle: "xs",
				},
			},
			xl: {
				root: {
					"--timeline-font-size": "fontSizes.sm",
					"--timeline-indicator-size": "sizes.8",
				},
				title: {
					mt: "1.5",
					textStyle: "sm",
				},
			},
		},
		variant: {
			outline: {
				indicator: {
					bg: "currentBg",
					borderColor: "colorPalette.muted",
					borderWidth: "1px",
				},
			},
			plain: {},
			solid: {
				indicator: {
					bg: "colorPalette.solid",
					color: "colorPalette.contrast",
				},
			},
			subtle: {
				indicator: {
					bg: "colorPalette.muted",
				},
			},
		},
	},
})
