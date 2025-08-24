import { defineSlotRecipe } from "@chakra-ui/react";

export const listSlotRecipe = defineSlotRecipe({
	base: {
		indicator: {
			display: "inline-block",
			flexShrink: 0,
			marginEnd: "2",
			minHeight: "1lh",
			verticalAlign: "middle",
		},
		item: {
			display: "list-item",
			whiteSpace: "normal",
		},
		root: {
			"& :where(ul, ol)": {
				marginTop: "var(--list-gap)",
			},
			display: "flex",
			flexDirection: "column",
			gap: "var(--list-gap)",
		},
	},
	className: "chakra-list",
	defaultVariants: {
		variant: "marker",
	},
	slots: ["root", "item", "indicator"],
	variants: {
		align: {
			center: {
				item: {
					alignItems: "center",
				},
			},
			end: {
				item: {
					alignItems: "flex-end",
				},
			},
			start: {
				item: {
					alignItems: "flex-start",
				},
			},
		},
		variant: {
			marker: {
				item: {
					_marker: {
						color: "fg.subtle",
					},
				},
				root: {
					listStyle: "revert",
				},
			},
			plain: {
				item: {
					alignItems: "flex-start",
					display: "inline-flex",
				},
			},
		},
	},
});
