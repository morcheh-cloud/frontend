import { defineSlotRecipe } from "@chakra-ui/react"

export const alertSlotRecipe = defineSlotRecipe({
	base: {
		content: {
			display: "flex",
			flex: "1",
			gap: "1",
		},
		description: {
			display: "inline",
		},
		indicator: {
			_icon: {
				boxSize: "full",
			},
			alignItems: "center",
			display: "inline-flex",
			flexShrink: "0",
			height: "1em",
			justifyContent: "center",
			width: "1em",
		},
		root: {
			alignItems: "flex-start",
			borderRadius: "l3",
			display: "flex",
			position: "relative",
			width: "full",
		},
		title: {
			fontWeight: "medium",
		},
	},
	className: "chakra-alert",
	defaultVariants: {
		inline: false,
		size: "md",
		status: "info",
		variant: "subtle",
	},
	slots: ["title", "description", "root", "indicator", "content"],
	variants: {
		inline: {
			false: {
				content: {
					display: "flex",
					flexDirection: "column",
				},
			},
			true: {
				content: {
					alignItems: "center",
					display: "inline-flex",
					flexDirection: "row",
				},
			},
		},
		size: {
			lg: {
				indicator: {
					textStyle: "2xl",
				},
				root: {
					gap: "3",
					px: "4",
					py: "4",
					textStyle: "md",
				},
			},
			md: {
				indicator: {
					textStyle: "xl",
				},
				root: {
					gap: "3",
					px: "4",
					py: "4",
					textStyle: "sm",
				},
			},
			sm: {
				indicator: {
					textStyle: "lg",
				},
				root: {
					gap: "2",
					px: "3",
					py: "3",
					textStyle: "xs",
				},
			},
		},
		status: {
			error: {
				root: {
					colorPalette: "red",
				},
			},
			info: {
				root: {
					colorPalette: "blue",
				},
			},
			neutral: {
				root: {
					colorPalette: "gray",
				},
			},
			success: {
				root: {
					colorPalette: "green",
				},
			},
			warning: {
				root: {
					colorPalette: "orange",
				},
			},
		},
		variant: {
			outline: {
				indicator: {
					color: "colorPalette.fg",
				},
				root: {
					color: "colorPalette.fg",
					shadow: "inset 0 0 0px 1px var(--shadow-color)",
					shadowColor: "colorPalette.muted",
				},
			},
			solid: {
				indicator: {
					color: "colorPalette.contrast",
				},
				root: {
					bg: "colorPalette.solid",
					color: "colorPalette.contrast",
				},
			},
			subtle: {
				root: {
					bg: "colorPalette.subtle",
					color: "colorPalette.fg",
				},
			},
			surface: {
				indicator: {
					color: "colorPalette.fg",
				},
				root: {
					bg: "colorPalette.subtle",
					color: "colorPalette.fg",
					shadow: "inset 0 0 0px 1px var(--shadow-color)",
					shadowColor: "colorPalette.muted",
				},
			},
		},
	},
})
