import { defineSlotRecipe } from "@chakra-ui/react"

export const tooltipSlotRecipe = defineSlotRecipe({
	base: {
		arrow: {
			"--arrow-background": "var(--tooltip-bg)",
			"--arrow-size": "sizes.2",
		},
		arrowTip: {
			borderColor: "var(--tooltip-bg)",
			borderInlineStartWidth: "1px",
			borderTopWidth: "1px",
		},
		content: {
			_closed: {
				animationDuration: "fast",
				animationStyle: "scale-fade-out",
			},
			_open: {
				animationDuration: "fast",
				animationStyle: "scale-fade-in",
			},
			"--tooltip-bg": "colors.bg.inverted",
			bg: "var(--tooltip-bg)",
			borderRadius: "l2",
			boxShadow: "md",
			color: "fg.inverted",
			fontWeight: "medium",
			maxW: "xs",
			px: "2.5",
			py: "1",
			textStyle: "xs",
			transformOrigin: "var(--transform-origin)",
			zIndex: "tooltip",
		},
	},
	className: "chakra-tooltip",
	slots: ["trigger", "arrow", "arrowTip", "positioner", "content"],
})
