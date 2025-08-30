import { defineSlotRecipe } from "@chakra-ui/react"

export const accordionSlotRecipe = defineSlotRecipe({
	base: {
		item: {
			overflowAnchor: "none",
		},
		itemBody: {
			pb: "calc(var(--accordion-padding-y) * 2)",
			pt: "var(--accordion-padding-y)",
		},
		itemContent: {
			_closed: {
				animationDuration: "moderate",
				animationName: "collapse-height, fade-out",
			},
			_open: {
				animationDuration: "moderate",
				animationName: "expand-height, fade-in",
			},
			borderRadius: "var(--accordion-radius)",
			overflow: "hidden",
		},
		itemIndicator: {
			_icon: {
				height: "1.2em",
				width: "1.2em",
			},
			_open: {
				rotate: "180deg",
			},
			color: "fg.subtle",
			transformOrigin: "center",
			transition: "rotate 0.2s",
		},
		itemTrigger: {
			_disabled: {
				layerStyle: "disabled",
			},
			_focusVisible: {
				outline: "2px solid",
				outlineColor: "colorPalette.focusRing",
			},
			alignItems: "center",
			borderRadius: "var(--accordion-radius)",
			display: "flex",
			fontWeight: "medium",
			gap: "3",
			outline: "0",
			textAlign: "start",
			width: "full",
		},
		root: {
			"--accordion-radius": "radii.l2",
			width: "full",
		},
	},
	className: "chakra-accordion",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	slots: [
		"root",
		"item",
		"itemTrigger",
		"itemContent",
		"itemIndicator",
		"itemBody",
	],
	variants: {
		size: {
			lg: {
				itemTrigger: {
					py: "var(--accordion-padding-y)",
					textStyle: "lg",
				},
				root: {
					"--accordion-padding-x": "spacing.4.5",
					"--accordion-padding-y": "spacing.2.5",
				},
			},
			md: {
				itemTrigger: {
					py: "var(--accordion-padding-y)",
					textStyle: "md",
				},
				root: {
					"--accordion-padding-x": "spacing.4",
					"--accordion-padding-y": "spacing.2",
				},
			},
			sm: {
				itemTrigger: {
					py: "var(--accordion-padding-y)",
					textStyle: "sm",
				},
				root: {
					"--accordion-padding-x": "spacing.3",
					"--accordion-padding-y": "spacing.2",
				},
			},
		},
		variant: {
			enclosed: {
				item: {
					_open: {
						bg: "bg.subtle",
					},
				},
				itemContent: {
					px: "var(--accordion-padding-x)",
				},
				itemTrigger: {
					px: "var(--accordion-padding-x)",
				},
				root: {
					borderRadius: "var(--accordion-radius)",
					borderWidth: "1px",
					divideY: "1px",
					overflow: "hidden",
				},
			},
			outline: {
				item: {
					borderBottomWidth: "1px",
				},
			},
			plain: {},
			subtle: {
				item: {
					_open: {
						bg: "colorPalette.subtle",
					},
					borderRadius: "var(--accordion-radius)",
				},
				itemContent: {
					px: "var(--accordion-padding-x)",
				},
				itemTrigger: {
					px: "var(--accordion-padding-x)",
				},
			},
		},
	},
})
