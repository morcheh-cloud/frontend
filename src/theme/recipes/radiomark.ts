import { defineRecipe } from "@chakra-ui/react";

export const radiomarkRecipe = defineRecipe({
	base: {
		_disabled: {
			cursor: "disabled",
			opacity: "0.5",
		},
		_focusVisible: {
			outline: "2px solid",
			outlineColor: "colorPalette.focusRing",
			outlineOffset: "2px",
		},
		_invalid: {
			borderColor: "red.500",
			colorPalette: "red",
		},
		"& .dot": {
			bg: "currentColor",
			borderRadius: "full",
			height: "100%",
			scale: "0.4",
			width: "100%",
		},
		alignItems: "center",
		borderColor: "transparent",
		borderRadius: "full",
		borderWidth: "1px",
		color: "white",
		cursor: "radio",
		display: "inline-flex",
		flexShrink: 0,
		justifyContent: "center",
		verticalAlign: "top",
	},
	className: "chakra-radiomark",
	defaultVariants: {
		size: "md",
		variant: "solid",
	},
	variants: {
		size: {
			lg: {
				boxSize: "6",
			},
			md: {
				boxSize: "5",
			},
			sm: {
				boxSize: "4",
			},
			xs: {
				boxSize: "3",
			},
		},
		variant: {
			inverted: {
				_checked: {
					borderColor: "currentcolor",
					color: "colorPalette.solid",
				},
				bg: "bg",
				borderColor: "inherit",
				borderWidth: "1px",
			},
			outline: {
				_checked: {
					borderColor: "colorPalette.solid",
					color: "colorPalette.fg",
				},
				"& .dot": {
					scale: "0.6",
				},
				borderColor: "inherit",
				borderWidth: "1px",
			},
			solid: {
				_checked: {
					bg: "colorPalette.solid",
					borderColor: "colorPalette.solid",
					color: "colorPalette.contrast",
				},
				borderColor: "border.emphasized",
				borderWidth: "1px",
			},
			subtle: {
				_checked: {
					color: "colorPalette.fg",
				},
				bg: "colorPalette.muted",
				borderColor: "colorPalette.muted",
				borderWidth: "1px",
				color: "transparent",
			},
		},
	},
});
