import { defineRecipe } from "@chakra-ui/react";

export const markRecipe = defineRecipe({
	base: {
		bg: "transparent",
		color: "inherit",
		whiteSpace: "nowrap",
	},
	className: "chakra-mark",
	variants: {
		variant: {
			plain: {},
			solid: {
				bg: "colorPalette.solid",
				color: "colorPalette.contrast",
			},
			subtle: {
				bg: "colorPalette.subtle",
				color: "inherit",
			},
			text: {
				fontWeight: "medium",
			},
		},
	},
});
