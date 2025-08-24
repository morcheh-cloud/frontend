import { defineRecipe } from "@chakra-ui/react";

export const checkmarkRecipe = defineRecipe({
	base: {
		_disabled: {
			cursor: "disabled",
			opacity: "0.5",
		},
		_icon: {
			boxSize: "full",
		},
		_invalid: {
			borderColor: "border.error",
			colorPalette: "red",
		},
		alignItems: "center",
		borderColor: "transparent",
		borderRadius: "l1",
		borderWidth: "1px",
		color: "white",
		cursor: "checkbox",
		display: "inline-flex",
		flexShrink: "0",
		focusVisibleRing: "outside",
		justifyContent: "center",
	},
	className: "chakra-checkmark",
	defaultVariants: {
		size: "md",
		variant: "solid",
	},
	variants: {
		size: {
			lg: {
				boxSize: "6",
				p: "0.5",
			},
			md: {
				boxSize: "5",
				p: "0.5",
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
				"&:is([data-state=checked], [data-state=indeterminate])": {
					borderColor: "colorPalette.solid",
				},
				borderColor: "border",
				color: "colorPalette.fg",
			},
			outline: {
				"&:is([data-state=checked], [data-state=indeterminate])": {
					borderColor: "colorPalette.solid",
					color: "colorPalette.fg",
				},
				borderColor: "border",
			},
			plain: {
				"&:is([data-state=checked], [data-state=indeterminate])": {
					color: "colorPalette.fg",
				},
			},
			solid: {
				"&:is([data-state=checked], [data-state=indeterminate])": {
					bg: "colorPalette.solid",
					borderColor: "colorPalette.solid",
					color: "colorPalette.contrast",
				},
				borderColor: "border.emphasized",
			},
			subtle: {
				"&:is([data-state=checked], [data-state=indeterminate])": {
					color: "colorPalette.fg",
				},
				bg: "colorPalette.muted",
				borderColor: "colorPalette.muted",
			},
		},
	},
});
