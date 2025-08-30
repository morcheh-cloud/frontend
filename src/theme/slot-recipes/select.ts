import { defineSlotRecipe } from "@chakra-ui/react"

export const selectSlotRecipe = defineSlotRecipe({
	base: {
		clearTrigger: {
			color: "fg.muted",
			focusRingWidth: "2px",
			focusVisibleRing: "inside",
			pointerEvents: "auto",
			rounded: "l1",
		},
		content: {
			_closed: {
				animationDuration: "fastest",
				animationStyle: "slide-fade-out",
			},
			_open: {
				animationDuration: "fast",
				animationStyle: "slide-fade-in",
			},
			background: "bg.panel",
			borderRadius: "l2",
			boxShadow: "md",
			display: "flex",
			flexDirection: "column",
			maxH: "96",
			outline: 0,
			overflowY: "auto",
			zIndex: "dropdown",
		},
		control: {
			pos: "relative",
		},
		indicator: {
			alignItems: "center",
			color: {
				_disabled: "fg.subtle",
				_invalid: "fg.error",
				base: "fg.muted",
			},
			display: "flex",
			justifyContent: "center",
		},
		indicatorGroup: {
			alignItems: "center",
			bottom: "0",
			display: "flex",
			gap: "1",
			insetEnd: "0",
			pointerEvents: "none",
			pos: "absolute",
			px: "var(--select-trigger-padding-x)",
			top: "0",
		},
		item: {
			_disabled: {
				opacity: "0.5",
				pointerEvents: "none",
			},
			_highlighted: {
				bg: "bg.emphasized/60",
			},
			_icon: {
				height: "4",
				width: "4",
			},
			alignItems: "center",
			borderRadius: "l1",
			cursor: "option",
			display: "flex",
			flex: "1",
			gap: "2",
			justifyContent: "space-between",
			position: "relative",
			textAlign: "start",
			userSelect: "none",
		},
		itemGroup: {
			_first: {
				mt: "0",
			},
		},
		itemGroupLabel: {
			fontWeight: "medium",
			py: "1",
		},
		itemText: {
			flex: "1",
		},
		label: {
			_disabled: {
				layerStyle: "disabled",
			},
			fontWeight: "medium",
			textStyle: "sm",
			userSelect: "none",
		},
		root: {
			display: "flex",
			flexDirection: "column",
			gap: "1.5",
			width: "full",
		},
		trigger: {
			_disabled: {
				layerStyle: "disabled",
			},
			_invalid: {
				borderColor: "border.error",
			},
			_placeholderShown: {
				color: "fg.muted/80",
			},
			"--input-height": "var(--select-trigger-height)",
			alignItems: "center",
			borderRadius: "l2",
			display: "flex",
			focusVisibleRing: "inside",
			justifyContent: "space-between",
			minH: "var(--select-trigger-height)",
			px: "var(--select-trigger-padding-x)",
			textAlign: "start",
			userSelect: "none",
			width: "full",
		},
		valueText: {
			lineClamp: "1",
			maxW: "80%",
		},
	},
	className: "chakra-select",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	slots: [
		"label",
		"positioner",
		"trigger",
		"indicator",
		"clearTrigger",
		"item",
		"itemText",
		"itemIndicator",
		"itemGroup",
		"itemGroupLabel",
		"list",
		"content",
		"root",
		"control",
		"valueText",
		"indicatorGroup",
	],
	variants: {
		size: {
			lg: {
				content: {
					p: "1.5",
					textStyle: "md",
				},
				indicator: {
					_icon: {
						height: "5",
						width: "5",
					},
				},
				item: {
					px: "3",
					py: "2",
				},
				itemGroup: {
					mt: "2",
				},
				itemGroupLabel: {
					px: "3",
					py: "2",
				},
				root: {
					"--select-trigger-height": "sizes.12",
					"--select-trigger-padding-x": "spacing.4",
				},
				trigger: {
					gap: "2",
					py: "3",
					textStyle: "md",
				},
			},
			md: {
				content: {
					p: "1",
					textStyle: "sm",
				},
				indicator: {
					_icon: {
						height: "4",
						width: "4",
					},
				},
				item: {
					px: "2",
					py: "1.5",
				},
				itemGroup: {
					mt: "1.5",
				},
				itemGroupLabel: {
					px: "2",
					py: "1.5",
				},
				itemIndicator: {
					alignItems: "center",
					display: "flex",
					justifyContent: "center",
				},
				root: {
					"--select-trigger-height": "sizes.10",
					"--select-trigger-padding-x": "spacing.3",
				},
				trigger: {
					gap: "2",
					textStyle: "sm",
				},
			},
			sm: {
				content: {
					p: "1",
					textStyle: "sm",
				},
				indicator: {
					_icon: {
						height: "4",
						width: "4",
					},
				},
				item: {
					px: "1.5",
					py: "1",
				},
				itemGroup: {
					mt: "1",
				},
				itemGroupLabel: {
					px: "1.5",
					py: "1",
				},
				root: {
					"--select-trigger-height": "sizes.9",
					"--select-trigger-padding-x": "spacing.2.5",
				},
				trigger: {
					gap: "1",
					textStyle: "sm",
				},
			},
			xs: {
				content: {
					gap: "1",
					p: "1",
					textStyle: "xs",
				},
				indicator: {
					_icon: {
						height: "3.5",
						width: "3.5",
					},
				},
				item: {
					px: "2",
					py: "1",
				},
				itemGroupLabel: {
					px: "2",
					py: "1",
				},
				root: {
					"--select-trigger-height": "sizes.8",
					"--select-trigger-padding-x": "spacing.2",
				},
				trigger: {
					gap: "1",
					textStyle: "xs",
				},
			},
		},
		variant: {
			outline: {
				trigger: {
					_expanded: {
						borderColor: "border.emphasized",
					},
					bg: "transparent",
					borderColor: "border",
					borderWidth: "1px",
				},
			},
			subtle: {
				trigger: {
					bg: "bg.muted",
					borderColor: "transparent",
					borderWidth: "1px",
				},
			},
		},
	},
})
