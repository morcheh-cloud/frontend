import { defineRecipe } from "@chakra-ui/react";

export const headingRecipe = defineRecipe({
	base: {
		fontFamily: "heading",
		fontWeight: "semibold",
	},
	className: "chakra-heading",
	defaultVariants: {
		size: "xl",
	},
	variants: {
		size: {
			"2xl": {
				textStyle: "2xl",
			},
			"3xl": {
				textStyle: "3xl",
			},
			"4xl": {
				textStyle: "4xl",
			},
			"5xl": {
				textStyle: "5xl",
			},
			"6xl": {
				textStyle: "6xl",
			},
			"7xl": {
				textStyle: "7xl",
			},
			lg: {
				textStyle: "lg",
			},
			md: {
				textStyle: "md",
			},
			sm: {
				textStyle: "sm",
			},
			xl: {
				textStyle: "xl",
			},
			xs: {
				textStyle: "xs",
			},
		},
	},
});
