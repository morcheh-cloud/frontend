import { defineSlotRecipe } from "@chakra-ui/react";

export const menuSlotRecipe = defineSlotRecipe({
	base: {
		content: {
			_closed: {
				animationDuration: "faster",
				animationStyle: "slide-fade-out",
			},
			_open: {
				animationDuration: "fast",
				animationStyle: "slide-fade-in",
			},
			"--menu-z-index": "zIndex.dropdown",
			bg: "bg.panel",
			borderRadius: "l2",
			boxShadow: "lg",
			color: "fg",
			maxHeight: "var(--available-height)",
			outline: 0,
			overflow: "hidden",
			overflowY: "auto",
			zIndex: "calc(var(--menu-z-index) + var(--layer-index, 0))",
		},
		indicator: {
			alignItems: "center",
			display: "inline-flex",
			flexShrink: "0",
			justifyContent: "center",
		},
		item: {
			_disabled: {
				layerStyle: "disabled",
			},
			"&[data-type]": {
				ps: "8",
			},
			alignItems: "center",
			borderRadius: "l1",
			color: "fg",
			cursor: "menuitem",
			display: "flex",
			flex: "0 0 auto",
			outline: 0,
			position: "relative",
			textAlign: "start",
			textDecoration: "none",
			userSelect: "none",
			width: "100%",
		},
		itemCommand: {
			fontFamily: "inherit",
			letterSpacing: "widest",
			ms: "auto",
			opacity: "0.6",
			ps: "4",
			textStyle: "xs",
		},
		itemGroupLabel: {
			fontWeight: "semibold",
			px: "2",
			py: "1.5",
			textStyle: "sm",
		},
		itemIndicator: {
			insetStart: "2",
			position: "absolute",
			top: "50%",
			transform: "translateY(-50%)",
		},
		itemText: {
			flex: "1",
		},
		separator: {
			bg: "bg.muted",
			height: "1px",
			mx: "-1",
			my: "1",
		},
	},
	className: "chakra-menu",
	defaultVariants: {
		size: "md",
		variant: "subtle",
	},
	slots: [
		"arrow",
		"arrowTip",
		"content",
		"contextTrigger",
		"indicator",
		"item",
		"itemGroup",
		"itemGroupLabel",
		"itemIndicator",
		"itemText",
		"positioner",
		"separator",
		"trigger",
		"triggerItem",
		"itemCommand",
	],
	variants: {
		size: {
			md: {
				content: {
					minW: "8rem",
					padding: "1.5",
				},
				item: {
					gap: "2",
					px: "2",
					py: "1.5",
					textStyle: "sm",
				},
			},
			sm: {
				content: {
					minW: "8rem",
					padding: "1",
				},
				item: {
					gap: "1",
					px: "1.5",
					py: "1",
					textStyle: "xs",
				},
			},
		},
		variant: {
			solid: {
				item: {
					_highlighted: {
						bg: "colorPalette.solid",
						color: "colorPalette.contrast",
					},
				},
			},
			subtle: {
				item: {
					_highlighted: {
						bg: "bg.emphasized/60",
					},
				},
			},
		},
	},
});
