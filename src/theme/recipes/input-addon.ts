import { defineRecipe } from "@chakra-ui/react";

export const inputAddonRecipe = defineRecipe({
	base: {
		alignItems: "center",
		alignSelf: "stretch",
		borderRadius: "l2",
		display: "flex",
		flex: "0 0 auto",
		whiteSpace: "nowrap",
		width: "auto",
	},
	className: "chakra-input-addon",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	variants: {
		size: {
			"2xl": {
				"--input-height": "sizes.16",
				px: "5",
				textStyle: "lg",
			},
			"2xs": {
				"--input-height": "sizes.7",
				px: "2",
				textStyle: "xs",
			},
			lg: {
				"--input-height": "sizes.11",
				px: "4",
				textStyle: "md",
			},
			md: {
				"--input-height": "sizes.10",
				px: "3",
				textStyle: "sm",
			},
			sm: {
				"--input-height": "sizes.9",
				px: "2.5",
				textStyle: "sm",
			},
			xl: {
				"--input-height": "sizes.12",
				px: "4.5",
				textStyle: "md",
			},
			xs: {
				"--input-height": "sizes.8",
				px: "2",
				textStyle: "xs",
			},
		},
		variant: {
			flushed: {
				bg: "transparent",
				borderBottom: "1px solid",
				borderColor: "inherit",
				borderRadius: "0",
				px: "0",
			},
			outline: {
				bg: "bg.muted",
				borderColor: "border",
				borderWidth: "1px",
			},
			subtle: {
				bg: "bg.emphasized",
				borderColor: "transparent",
				borderWidth: "1px",
			},
		},
	},
});
