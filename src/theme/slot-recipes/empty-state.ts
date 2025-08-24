import { defineSlotRecipe } from "@chakra-ui/react";

export const emptyStateSlotRecipe = defineSlotRecipe({
	base: {
		content: {
			alignItems: "center",
			display: "flex",
			flexDirection: "column",
			justifyContent: "center",
		},
		description: {
			color: "fg.muted",
			textStyle: "sm",
		},
		indicator: {
			_icon: {
				boxSize: "1em",
			},
			alignItems: "center",
			color: "fg.subtle",
			display: "flex",
			justifyContent: "center",
		},
		root: {
			width: "full",
		},
		title: {
			fontWeight: "semibold",
		},
	},
	className: "chakra-empty-state",
	defaultVariants: {
		size: "md",
	},
	slots: ["root", "content", "indicator", "title", "description"],
	variants: {
		size: {
			lg: {
				content: {
					gap: "8",
				},
				indicator: {
					textStyle: "6xl",
				},
				root: {
					px: "12",
					py: "16",
				},
				title: {
					textStyle: "xl",
				},
			},
			md: {
				content: {
					gap: "6",
				},
				indicator: {
					textStyle: "4xl",
				},
				root: {
					px: "8",
					py: "12",
				},
				title: {
					textStyle: "lg",
				},
			},
			sm: {
				content: {
					gap: "4",
				},
				indicator: {
					textStyle: "2xl",
				},
				root: {
					px: "4",
					py: "6",
				},
				title: {
					textStyle: "md",
				},
			},
		},
	},
});
