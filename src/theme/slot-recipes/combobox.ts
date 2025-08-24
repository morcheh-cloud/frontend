import { defineSlotRecipe } from "@chakra-ui/react";

export const comboboxSlotRecipe = defineSlotRecipe({
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
				animationDuration: "0s",
				animationStyle: "slide-fade-out",
			},
			_open: {
				animationDuration: "fast",
				animationStyle: "slide-fade-in",
			},
			"&[data-empty]:not(:has([data-scope=combobox][data-part=empty]))": {
				opacity: 0,
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
		empty: {
			px: "var(--combobox-item-padding-x)",
			py: "var(--combobox-item-padding-y)",
		},
		indicatorGroup: {
			_icon: {
				boxSize: "var(--combobox-indicator-size)",
			},
			"[data-disabled] &": {
				opacity: 0.5,
			},
			alignItems: "center",
			bottom: "0",
			display: "flex",
			gap: "1",
			insetEnd: "0",
			justifyContent: "center",
			pos: "absolute",
			px: "var(--combobox-input-padding-x)",
			top: "0",
		},
		input: {
			_disabled: {
				layerStyle: "disabled",
			},
			_invalid: {
				borderColor: "var(--error-color)",
				focusRingColor: "var(--error-color)",
			},
			_placeholderShown: {
				color: "fg.muted",
			},
			"--error-color": "colors.border.error",
			"--focus-color": "colors.colorPalette.focusRing",
			"--input-height": "var(--combobox-input-height)",
			alignItems: "center",
			background: "bg.panel",
			borderRadius: "l2",
			display: "flex",
			justifyContent: "space-between",
			minH: "var(--combobox-input-height)",
			outline: 0,
			px: "var(--combobox-input-padding-x)",
			textAlign: "start",
			userSelect: "none",
			width: "full",
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
				boxSize: "var(--combobox-indicator-size)",
			},
			alignItems: "center",
			borderRadius: "l1",
			cursor: "option",
			display: "flex",
			flex: "1",
			gap: "2",
			justifyContent: "space-between",
			position: "relative",
			px: "var(--combobox-item-padding-x)",
			py: "var(--combobox-item-padding-y)",
			textAlign: "start",
			userSelect: "none",
		},
		itemGroup: {
			_last: {
				pb: "0",
			},
			pb: "var(--combobox-item-padding-y)",
		},
		itemGroupLabel: {
			fontWeight: "medium",
			px: "var(--combobox-item-padding-x)",
			py: "var(--combobox-item-padding-y)",
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
			"--input-height": "var(--combobox-input-height)",
			alignItems: "center",
			display: "inline-flex",
			justifyContent: "center",
		},
	},
	className: "chakra-combobox",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	slots: [
		"root",
		"clearTrigger",
		"content",
		"control",
		"input",
		"item",
		"itemGroup",
		"itemGroupLabel",
		"itemIndicator",
		"itemText",
		"label",
		"list",
		"positioner",
		"trigger",
		"indicatorGroup",
		"empty",
	],
	variants: {
		size: {
			lg: {
				content: {
					"--combobox-indicator-size": "sizes.5",
					"--combobox-item-padding-x": "spacing.3",
					"--combobox-item-padding-y": "spacing.2",
					p: "1.5",
					textStyle: "md",
				},
				input: {
					textStyle: "md",
				},
				root: {
					"--combobox-indicator-size": "sizes.5",
					"--combobox-input-height": "sizes.12",
					"--combobox-input-padding-x": "spacing.4",
				},
				trigger: {
					gap: "2",
					py: "3",
					textStyle: "md",
				},
			},
			md: {
				content: {
					"--combobox-indicator-size": "sizes.4",
					"--combobox-item-padding-x": "spacing.2",
					"--combobox-item-padding-y": "spacing.1.5",
					p: "1",
					textStyle: "sm",
				},
				input: {
					textStyle: "sm",
				},
				itemIndicator: {
					alignItems: "center",
					display: "flex",
					justifyContent: "center",
				},
				root: {
					"--combobox-indicator-size": "sizes.4",
					"--combobox-input-height": "sizes.10",
					"--combobox-input-padding-x": "spacing.3",
				},
				trigger: {
					gap: "2",
					textStyle: "sm",
				},
			},
			sm: {
				content: {
					"--combobox-indicator-size": "sizes.4",
					"--combobox-item-padding-x": "spacing.2",
					"--combobox-item-padding-y": "spacing.1.5",
					p: "1",
					textStyle: "sm",
				},
				input: {
					textStyle: "sm",
				},
				root: {
					"--combobox-indicator-size": "sizes.4",
					"--combobox-input-height": "sizes.9",
					"--combobox-input-padding-x": "spacing.2.5",
				},
				trigger: {
					gap: "1",
					textStyle: "sm",
				},
			},
			xs: {
				content: {
					"--combobox-indicator-size": "sizes.3.5",
					"--combobox-item-padding-x": "spacing.1.5",
					"--combobox-item-padding-y": "spacing.1",
					p: "1",
					textStyle: "xs",
				},
				input: {
					textStyle: "xs",
				},
				root: {
					"--combobox-indicator-size": "sizes.3.5",
					"--combobox-input-height": "sizes.8",
					"--combobox-input-padding-x": "spacing.2",
				},
				trigger: {
					gap: "1",
					textStyle: "xs",
				},
			},
		},
		variant: {
			flushed: {
				indicatorGroup: {
					px: "0",
				},
				input: {
					_focusVisible: {
						borderColor: "var(--focus-color)",
						boxShadow: "0px 1px 0px 0px var(--focus-color)",
					},
					bg: "transparent",
					borderBottomColor: "border",
					borderBottomWidth: "1px",
					borderRadius: "0",
					px: "0",
				},
			},
			outline: {
				input: {
					bg: "transparent",
					borderColor: "border",
					borderWidth: "1px",
					focusVisibleRing: "inside",
				},
			},
			subtle: {
				input: {
					bg: "bg.muted",
					borderColor: "transparent",
					borderWidth: "1px",
					focusVisibleRing: "inside",
				},
			},
		},
	},
});
