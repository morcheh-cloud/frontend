import { defineSlotRecipe } from "@chakra-ui/react"

export const tagSlotRecipe = defineSlotRecipe({
	base: {
		closeTrigger: {
			alignItems: "center",
			borderRadius: "l1",
			color: "currentColor",
			display: "flex",
			focusRingWidth: "2px",
			focusVisibleRing: "inside",
			justifyContent: "center",
			outline: "0",
		},
		endElement: {
			_icon: {
				boxSize: "100%",
			},
			"&:has(button)": {
				ms: "calc(var(--tag-element-offset) * -1)",
			},
			boxSize: "var(--tag-element-size)",
			flexShrink: 0,
			me: "var(--tag-element-offset)",
		},
		label: {
			lineClamp: "1",
		},
		root: {
			alignItems: "center",
			borderRadius: "l2",
			display: "inline-flex",
			focusVisibleRing: "outside",
			maxWidth: "100%",
			userSelect: "none",
			verticalAlign: "top",
		},
		startElement: {
			_icon: {
				boxSize: "100%",
			},
			"&:has([data-scope=avatar])": {
				boxSize: "var(--tag-avatar-size)",
				ms: "calc(var(--tag-element-offset) * 1.5)",
			},
			boxSize: "var(--tag-element-size)",
			flexShrink: 0,
			ms: "var(--tag-element-offset)",
		},
	},
	className: "chakra-tag",
	defaultVariants: {
		size: "md",
		variant: "surface",
	},
	slots: ["root", "label", "closeTrigger", "startElement", "endElement"],
	variants: {
		size: {
			lg: {
				label: {
					textStyle: "sm",
				},
				root: {
					"--tag-avatar-size": "spacing.4.5",
					"--tag-element-offset": "-3px",
					"--tag-element-size": "spacing.4",
					gap: "1.5",
					minH: "6",
					px: "2",
				},
			},
			md: {
				label: {
					textStyle: "xs",
				},
				root: {
					"--tag-avatar-size": "spacing.3.5",
					"--tag-element-offset": "-2px",
					"--tag-element-size": "spacing.3.5",
					gap: "1",
					minH: "5",
					px: "1.5",
				},
			},
			sm: {
				label: {
					textStyle: "xs",
				},
				root: {
					"--tag-avatar-size": "spacing.3",
					"--tag-element-offset": "-2px",
					"--tag-element-size": "spacing.3",
					gap: "1",
					minH: "4.5",
					px: "1.5",
				},
			},
			xl: {
				label: {
					textStyle: "sm",
				},
				root: {
					"--tag-avatar-size": "spacing.6",
					"--tag-element-offset": "-4px",
					"--tag-element-size": "spacing.4.5",
					gap: "1.5",
					minH: "8",
					px: "2.5",
				},
			},
		},
		variant: {
			outline: {
				root: {
					color: "colorPalette.fg",
					shadow: "inset 0 0 0px 1px var(--shadow-color)",
					shadowColor: "colorPalette.muted",
				},
			},
			solid: {
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
