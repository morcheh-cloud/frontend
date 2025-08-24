import { defineSlotRecipe } from "@chakra-ui/react";

export const hoverCardSlotRecipe = defineSlotRecipe({
	base: {
		arrow: {
			"--arrow-background": "var(--hovercard-bg)",
			"--arrow-size": "sizes.3",
		},
		arrowTip: {
			borderInlineStartWidth: "0.5px",
			borderTopWidth: "0.5px",
		},
		content: {
			_closed: {
				animationDuration: "faster",
				animationStyle: "slide-fade-out",
			},
			_open: {
				animationDuration: "fast",
				animationStyle: "slide-fade-in",
			},
			"--hovercard-bg": "colors.bg.panel",
			bg: "var(--hovercard-bg)",
			borderRadius: "l3",
			boxShadow: "lg",
			display: "flex",
			flexDirection: "column",
			maxWidth: "80",
			outline: "0",
			position: "relative",
			textStyle: "sm",
			transformOrigin: "var(--transform-origin)",
			zIndex: "popover",
		},
	},
	className: "chakra-hover-card",
	defaultVariants: {
		size: "md",
	},
	slots: ["arrow", "arrowTip", "trigger", "positioner", "content"],
	variants: {
		size: {
			lg: {
				content: {
					padding: "6",
				},
			},
			md: {
				content: {
					padding: "5",
				},
			},
			sm: {
				content: {
					padding: "4",
				},
			},
			xs: {
				content: {
					padding: "3",
				},
			},
		},
	},
});
