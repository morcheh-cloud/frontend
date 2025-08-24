import { defineRecipe } from "@chakra-ui/react";

export const buttonRecipe = defineRecipe({
	base: {
		_disabled: {
			layerStyle: "disabled",
		},
		_icon: {
			flexShrink: "0",
		},
		alignItems: "center",
		appearance: "none",
		borderColor: "transparent",
		borderRadius: "l2",
		borderWidth: "1px",
		cursor: "button",
		display: "inline-flex",
		flexShrink: "0",
		focusVisibleRing: "outside",
		fontWeight: "medium",
		isolation: "isolate",
		justifyContent: "center",
		lineHeight: "1.2",
		outline: "0",
		position: "relative",
		transitionDuration: "moderate",
		transitionProperty: "common",
		userSelect: "none",
		verticalAlign: "middle",
		whiteSpace: "nowrap",
	},
	className: "chakra-button",
	defaultVariants: {
		size: "md",
		variant: "solid",
	},
	variants: {
		size: {
			"2xl": {
				_icon: {
					height: "6",
					width: "6",
				},
				gap: "3",
				h: "16",
				minW: "16",
				px: "7",
				textStyle: "lg",
			},
			"2xs": {
				_icon: {
					height: "3.5",
					width: "3.5",
				},
				gap: "1",
				h: "6",
				minW: "6",
				px: "2",
				textStyle: "xs",
			},
			lg: {
				_icon: {
					height: "5",
					width: "5",
				},
				gap: "3",
				h: "11",
				minW: "11",
				px: "5",
				textStyle: "md",
			},
			md: {
				_icon: {
					height: "5",
					width: "5",
				},
				gap: "2",
				h: "10",
				minW: "10",
				px: "4",
				textStyle: "sm",
			},
			sm: {
				_icon: {
					height: "4",
					width: "4",
				},
				gap: "2",
				h: "9",
				minW: "9",
				px: "3.5",
				textStyle: "sm",
			},
			xl: {
				_icon: {
					height: "5",
					width: "5",
				},
				gap: "2.5",
				h: "12",
				minW: "12",
				px: "5",
				textStyle: "md",
			},
			xs: {
				_icon: {
					height: "4",
					width: "4",
				},
				gap: "1",
				h: "8",
				minW: "8",
				px: "2.5",
				textStyle: "xs",
			},
		},
		variant: {
			ghost: {
				_expanded: {
					bg: "colorPalette.subtle",
				},
				_hover: {
					bg: "colorPalette.subtle",
				},
				bg: "transparent",
				color: "colorPalette.fg",
			},
			outline: {
				_expanded: {
					bg: "colorPalette.subtle",
				},
				_hover: {
					bg: "colorPalette.subtle",
				},
				borderColor: "colorPalette.muted",
				borderWidth: "1px",
				color: "colorPalette.fg",
			},
			plain: {
				color: "colorPalette.fg",
			},
			solid: {
				_expanded: {
					bg: "colorPalette.solid/90",
				},
				_hover: {
					bg: "colorPalette.solid/90",
				},
				bg: "colorPalette.solid",
				borderColor: "transparent",
				color: "colorPalette.contrast",
			},
			subtle: {
				_expanded: {
					bg: "colorPalette.muted",
				},
				_hover: {
					bg: "colorPalette.muted",
				},
				bg: "colorPalette.subtle",
				borderColor: "transparent",
				color: "colorPalette.fg",
			},
			surface: {
				_expanded: {
					bg: "colorPalette.muted",
				},
				_hover: {
					bg: "colorPalette.muted",
				},
				bg: "colorPalette.subtle",
				color: "colorPalette.fg",
				shadow: "0 0 0px 1px var(--shadow-color)",
				shadowColor: "colorPalette.muted",
			},
		},
	},
});
