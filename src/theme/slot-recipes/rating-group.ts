import { defineSlotRecipe } from "@chakra-ui/react";

export const ratingGroupSlotRecipe = defineSlotRecipe({
	base: {
		control: {
			alignItems: "center",
			display: "inline-flex",
		},
		item: {
			alignItems: "center",
			display: "inline-flex",
			justifyContent: "center",
			userSelect: "none",
		},
		itemIndicator: {
			_icon: {
				display: "inline-block",
				flexShrink: 0,
				height: "100%",
				left: 0,
				position: "absolute",
				stroke: "currentColor",
				top: 0,
				width: "100%",
			},
			"--clip-path": {
				_rtl: "inset(0 0 0 50%)",
				base: "inset(0 50% 0 0)",
			},
			"& [data-bg]": {
				color: "bg.emphasized",
			},
			"& [data-fg]": {
				color: "transparent",
			},
			"&[data-half]": {
				"& [data-fg]": {
					clipPath: "var(--clip-path)",
					color: "colorPalette.solid",
				},
			},
			"&[data-highlighted]:not([data-half])": {
				"& [data-fg]": {
					color: "colorPalette.solid",
				},
			},
			alignItems: "center",
			display: "inline-flex",
			height: "1em",
			justifyContent: "center",
			position: "relative",
			width: "1em",
		},
		root: {
			display: "inline-flex",
		},
	},
	className: "chakra-rating-group",
	defaultVariants: {
		size: "md",
	},
	slots: ["root", "label", "item", "control", "itemIndicator"],
	variants: {
		size: {
			lg: {
				item: {
					textStyle: "2xl",
				},
			},
			md: {
				item: {
					textStyle: "xl",
				},
			},
			sm: {
				item: {
					textStyle: "md",
				},
			},
			xs: {
				item: {
					textStyle: "sm",
				},
			},
		},
	},
});
