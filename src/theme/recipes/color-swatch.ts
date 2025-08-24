import { defineRecipe } from "@chakra-ui/react";

export const colorSwatchRecipe = defineRecipe({
	base: {
		"--checker-bg": "colors.bg",
		"--checker-fg": "colors.bg.emphasized",
		"--checker-size": "8px",
		alignItems: "center",
		background:
			"linear-gradient(var(--color), var(--color)), repeating-conic-gradient(var(--checker-fg) 0%, var(--checker-fg) 25%, var(--checker-bg) 0%, var(--checker-bg) 50%) 0% 50% / var(--checker-size) var(--checker-size) !important",
		boxSize: "var(--swatch-size)",
		display: "inline-flex",
		flexShrink: "0",
		justifyContent: "center",
		shadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.1)",
	},
	className: "color-swatch",
	defaultVariants: {
		shape: "rounded",
		size: "md",
	},
	variants: {
		shape: {
			circle: {
				borderRadius: "full",
			},
			rounded: {
				borderRadius: "l1",
			},
			square: {
				borderRadius: "none",
			},
		},
		size: {
			"2xl": {
				"--swatch-size": "sizes.8",
			},
			"2xs": {
				"--swatch-size": "sizes.3.5",
			},
			full: {
				"--swatch-size": "100%",
			},
			inherit: {
				"--swatch-size": "inherit",
			},
			lg: {
				"--swatch-size": "sizes.6",
			},
			md: {
				"--swatch-size": "sizes.5",
			},
			sm: {
				"--swatch-size": "sizes.4.5",
			},
			xl: {
				"--swatch-size": "sizes.7",
			},
			xs: {
				"--swatch-size": "sizes.4",
			},
		},
	},
});
