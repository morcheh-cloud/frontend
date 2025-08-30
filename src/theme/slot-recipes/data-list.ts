import { defineSlotRecipe } from "@chakra-ui/react"

export const dataListSlotRecipe = defineSlotRecipe({
	base: {
		itemLabel: {
			alignItems: "center",
			display: "flex",
			gap: "1",
		},
		itemValue: {
			display: "flex",
			flex: "1",
			minWidth: "0",
		},
	},
	className: "chakra-data-list",
	defaultVariants: {
		orientation: "vertical",
		size: "md",
		variant: "subtle",
	},
	slots: ["root", "item", "itemLabel", "itemValue"],
	variants: {
		orientation: {
			horizontal: {
				item: {
					alignItems: "center",
					display: "inline-flex",
					gap: "4",
				},
				itemLabel: {
					minWidth: "120px",
				},
				root: {
					display: "flex",
					flexDirection: "column",
				},
			},
			vertical: {
				item: {
					display: "flex",
					flexDirection: "column",
					gap: "1",
				},
				root: {
					display: "flex",
					flexDirection: "column",
				},
			},
		},
		size: {
			lg: {
				item: {
					textStyle: "md",
				},
				root: {
					gap: "5",
				},
			},
			md: {
				item: {
					textStyle: "sm",
				},
				root: {
					gap: "4",
				},
			},
			sm: {
				item: {
					textStyle: "xs",
				},
				root: {
					gap: "3",
				},
			},
		},
		variant: {
			bold: {
				itemLabel: {
					fontWeight: "medium",
				},
				itemValue: {
					color: "fg.muted",
				},
			},
			subtle: {
				itemLabel: {
					color: "fg.muted",
				},
			},
		},
	},
})
