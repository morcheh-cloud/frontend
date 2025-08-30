import { defineSlotRecipe } from "@chakra-ui/react"

export const popoverSlotRecipe = defineSlotRecipe({
	base: {
		arrow: {
			"--arrow-background": "var(--popover-bg)",
			"--arrow-size": "sizes.3",
		},
		arrowTip: {
			borderInlineStartWidth: "1px",
			borderTopWidth: "1px",
		},
		body: {
			flex: "1",
			padding: "var(--popover-padding)",
		},
		content: {
			_closed: {
				animationDuration: "faster",
				animationStyle: "scale-fade-out",
			},
			_open: {
				animationDuration: "fast",
				animationStyle: "scale-fade-in",
			},
			"--popover-bg": "colors.bg.panel",
			"--popover-mobile-size": "calc(100dvw - 1rem)",
			"--popover-size": "sizes.xs",
			"--popover-z-index": "zIndex.popover",
			bg: "var(--popover-bg)",
			borderRadius: "l3",
			boxShadow: "lg",
			display: "flex",
			flexDirection: "column",
			maxHeight: "var(--available-height)",
			outline: "0",
			position: "relative",
			textStyle: "sm",
			transformOrigin: "var(--transform-origin)",
			width: {
				base: "min(var(--popover-mobile-size), var(--popover-size))",
				sm: "var(--popover-size)",
			},
			zIndex: "calc(var(--popover-z-index) + var(--layer-index, 0))",
		},
		footer: {
			alignItems: "center",
			display: "flex",
			paddingBottom: "var(--popover-padding)",
			paddingInline: "var(--popover-padding)",
		},
		header: {
			paddingInline: "var(--popover-padding)",
			paddingTop: "var(--popover-padding)",
		},
	},
	className: "chakra-popover",
	defaultVariants: {
		size: "md",
	},
	slots: [
		"arrow",
		"arrowTip",
		"anchor",
		"trigger",
		"indicator",
		"positioner",
		"content",
		"title",
		"description",
		"closeTrigger",
		"header",
		"body",
		"footer",
	],
	variants: {
		size: {
			lg: {
				content: {
					"--popover-padding": "spacing.6",
				},
			},
			md: {
				content: {
					"--popover-padding": "spacing.5",
				},
			},
			sm: {
				content: {
					"--popover-padding": "spacing.4",
				},
			},
			xs: {
				content: {
					"--popover-padding": "spacing.3",
				},
			},
		},
	},
})
