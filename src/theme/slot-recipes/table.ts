import { defineSlotRecipe } from "@chakra-ui/react";

export const tableSlotRecipe = defineSlotRecipe({
	base: {
		caption: {
			fontWeight: "medium",
			textStyle: "xs",
		},
		cell: {
			alignItems: "center",
			textAlign: "start",
		},
		columnHeader: {
			color: "fg",
			fontWeight: "medium",
			textAlign: "start",
		},
		footer: {
			fontWeight: "medium",
		},
		root: {
			borderCollapse: "collapse",
			fontVariantNumeric: "lining-nums tabular-nums",
			textAlign: "start",
			verticalAlign: "top",
			width: "full",
		},
		row: {
			_selected: {
				bg: "colorPalette.subtle",
			},
		},
	},
	className: "chakra-table",
	defaultVariants: {
		size: "md",
		variant: "line",
	},
	slots: [
		"root",
		"header",
		"body",
		"row",
		"columnHeader",
		"cell",
		"footer",
		"caption",
	],
	variants: {
		interactive: {
			true: {
				body: {
					"& tr": {
						_hover: {
							bg: "colorPalette.subtle",
						},
					},
				},
			},
		},
		showColumnBorder: {
			true: {
				cell: {
					"&:not(:last-of-type)": {
						borderInlineEndWidth: "1px",
					},
				},
				columnHeader: {
					"&:not(:last-of-type)": {
						borderInlineEndWidth: "1px",
					},
				},
			},
		},
		size: {
			lg: {
				cell: {
					px: "4",
					py: "3",
				},
				columnHeader: {
					px: "4",
					py: "3",
				},
				root: {
					textStyle: "md",
				},
			},
			md: {
				cell: {
					px: "3",
					py: "3",
				},
				columnHeader: {
					px: "3",
					py: "3",
				},
				root: {
					textStyle: "sm",
				},
			},
			sm: {
				cell: {
					px: "2",
					py: "2",
				},
				columnHeader: {
					px: "2",
					py: "2",
				},
				root: {
					textStyle: "sm",
				},
			},
		},
		stickyHeader: {
			true: {
				header: {
					"& :where(tr)": {
						position: "sticky",
						top: "var(--table-sticky-offset, 0)",
						zIndex: 1,
					},
				},
			},
		},
		striped: {
			true: {
				row: {
					"&:nth-of-type(odd) td": {
						bg: "bg.muted",
					},
				},
			},
		},
		variant: {
			line: {
				cell: {
					borderBottomWidth: "1px",
				},
				columnHeader: {
					borderBottomWidth: "1px",
				},
				row: {
					bg: "bg",
				},
			},
			outline: {
				columnHeader: {
					borderBottomWidth: "1px",
				},
				footer: {
					borderTopWidth: "1px",
				},
				header: {
					bg: "bg.muted",
				},
				root: {
					boxShadow: "0 0 0 1px {colors.border}",
					overflow: "hidden",
				},
				row: {
					"&:not(:last-of-type)": {
						borderBottomWidth: "1px",
					},
				},
			},
		},
	},
});
