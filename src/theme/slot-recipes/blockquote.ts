import { defineSlotRecipe } from "@chakra-ui/react";

export const blockquoteSlotRecipe = defineSlotRecipe({
	base: {
		caption: {
			color: "fg.muted",
			textStyle: "sm",
		},
		icon: {
			boxSize: "5",
		},
		root: {
			display: "flex",
			flexDirection: "column",
			gap: "2",
			position: "relative",
		},
	},
	className: "chakra-blockquote",
	defaultVariants: {
		justify: "start",
		variant: "subtle",
	},
	slots: ["root", "icon", "content", "caption"],
	variants: {
		justify: {
			center: {
				root: {
					alignItems: "center",
					textAlign: "center",
				},
			},
			end: {
				root: {
					alignItems: "flex-end",
					textAlign: "end",
				},
			},
			start: {
				root: {
					alignItems: "flex-start",
					textAlign: "start",
				},
			},
		},
		variant: {
			plain: {
				icon: {
					color: "colorPalette.solid",
				},
				root: {
					paddingX: "5",
				},
			},
			solid: {
				icon: {
					color: "colorPalette.solid",
				},
				root: {
					borderStartColor: "colorPalette.solid",
					borderStartWidth: "4px",
					paddingX: "5",
				},
			},
			subtle: {
				icon: {
					color: "colorPalette.fg",
				},
				root: {
					borderStartColor: "colorPalette.muted",
					borderStartWidth: "4px",
					paddingX: "5",
				},
			},
		},
	},
});
