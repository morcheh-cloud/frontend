import { defineSlotRecipe } from "@chakra-ui/react"

export const treeViewSlotRecipe = defineSlotRecipe({
	base: {
		branch: {
			position: "relative",
		},
		branchContent: {
			position: "relative",
		},
		branchControl: {
			_disabled: {
				layerStyle: "disabled",
			},
			"--tree-depth": "calc(var(--depth) - 1)",
			"--tree-icon-offset":
				"calc(var(--tree-icon-size) * var(--tree-depth) * 0.5)",
			"--tree-indentation-offset":
				"calc(var(--tree-indentation) * var(--tree-depth))",
			"--tree-offset":
				"calc(var(--tree-padding-inline) + var(--tree-indentation-offset) + var(--tree-icon-offset))",
			"&:hover, &:focus-visible": {
				bg: "bg.muted",
			},
			alignItems: "center",
			display: "flex",
			focusRingColor: "border.emphasized",
			focusRingWidth: "2px",
			focusVisibleRing: "inside",
			gap: "var(--tree-item-gap)",
			pe: "var(--tree-padding-inline)",
			position: "relative",
			ps: "var(--tree-offset)",
			py: "var(--tree-padding-block)",
			rounded: "l2",
			userSelect: "none",
		},
		branchIndentGuide: {
			"--tree-depth": "calc(var(--depth) - 1)",
			"--tree-icon-offset": "calc(var(--tree-icon-size) * 0.5 * var(--depth))",
			"--tree-indentation-offset":
				"calc(var(--tree-indentation) * var(--tree-depth))",
			"--tree-offset":
				"calc(var(--tree-padding-inline) + var(--tree-indentation-offset))",
			bg: "border",
			height: "100%",
			insetInlineStart: "calc(var(--tree-offset) + var(--tree-icon-offset))",
			position: "absolute",
			width: "1px",
			zIndex: "1",
		},
		branchIndicator: {
			_open: {
				transform: "rotate(90deg)",
			},
			color: "fg.muted",
			transformOrigin: "center",
			transitionDuration: "normal",
			transitionProperty: "transform",
			transitionTimingFunction: "default",
		},
		branchText: {
			flex: "1",
		},
		branchTrigger: {
			alignItems: "center",
			display: "inline-flex",
			justifyContent: "center",
		},
		item: {
			_disabled: {
				layerStyle: "disabled",
			},
			"--tree-depth": "calc(var(--depth) - 1)",
			"--tree-icon-offset":
				"calc(var(--tree-icon-size) * var(--tree-depth) * 0.5)",
			"--tree-indentation-offset":
				"calc(var(--tree-indentation) * var(--tree-depth))",
			"--tree-offset":
				"calc(var(--tree-padding-inline) + var(--tree-indentation-offset) + var(--tree-icon-offset))",
			"&:hover, &:focus-visible": {
				bg: "bg.muted",
			},
			alignItems: "center",
			display: "flex",
			focusRingColor: "border.emphasized",
			focusRingWidth: "2px",
			focusVisibleRing: "inside",
			gap: "var(--tree-item-gap)",
			pe: "var(--tree-padding-inline)",
			position: "relative",
			ps: "var(--tree-offset)",
			py: "var(--tree-padding-block)",
			rounded: "l2",
			userSelect: "none",
		},
		itemText: {
			flex: "1",
		},
		label: {
			fontWeight: "medium",
			textStyle: "sm",
		},
		nodeCheckbox: {
			display: "inline-flex",
		},
		root: {
			display: "flex",
			flexDirection: "column",
			gap: "2",
			width: "full",
		},
		tree: {
			_icon: {
				boxSize: "var(--tree-icon-size)",
			},
			"--tree-item-gap": "spacing.2",
			display: "flex",
			flexDirection: "column",
		},
	},
	className: "chakra-tree-view",
	defaultVariants: {
		size: "md",
		variant: "subtle",
	},
	slots: [
		"branch",
		"branchContent",
		"branchControl",
		"branchIndentGuide",
		"branchIndicator",
		"branchText",
		"branchTrigger",
		"item",
		"itemIndicator",
		"itemText",
		"label",
		"nodeCheckbox",
		"root",
		"tree",
	],
	variants: {
		animateContent: {
			true: {
				branchContent: {
					_closed: {
						animationDuration: "moderate",
						animationName: "collapse-height, fade-out",
					},
					_open: {
						animationDuration: "moderate",
						animationName: "expand-height, fade-in",
					},
				},
			},
		},
		size: {
			md: {
				tree: {
					"--tree-icon-size": "spacing.4",
					"--tree-indentation": "spacing.4",
					"--tree-padding-block": "spacing.1.5",
					"--tree-padding-inline": "spacing.3",
					textStyle: "sm",
				},
			},
			sm: {
				tree: {
					"--tree-icon-size": "spacing.3",
					"--tree-indentation": "spacing.4",
					"--tree-padding-block": "spacing.1",
					"--tree-padding-inline": "spacing.3",
					textStyle: "sm",
				},
			},
			xs: {
				tree: {
					"--tree-icon-size": "spacing.3",
					"--tree-indentation": "spacing.4",
					"--tree-padding-block": "spacing.1",
					"--tree-padding-inline": "spacing.2",
					textStyle: "xs",
				},
			},
		},
		variant: {
			solid: {
				branchControl: {
					_selected: {
						layerStyle: "fill.solid",
					},
				},
				item: {
					_selected: {
						layerStyle: "fill.solid",
					},
				},
			},
			subtle: {
				branchControl: {
					_selected: {
						bg: "colorPalette.subtle",
						color: "colorPalette.fg",
					},
				},
				item: {
					_selected: {
						bg: "colorPalette.subtle",
						color: "colorPalette.fg",
					},
				},
			},
		},
	},
})
