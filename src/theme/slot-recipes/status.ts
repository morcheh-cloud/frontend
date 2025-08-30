import { defineSlotRecipe } from "@chakra-ui/react"

export const statusSlotRecipe = defineSlotRecipe({
	base: {
		indicator: {
			bg: "colorPalette.solid",
			borderRadius: "full",
			flexShrink: 0,
			forcedColorAdjust: "none",
			height: "0.64em",
			width: "0.64em",
		},
		root: {
			alignItems: "center",
			display: "inline-flex",
			gap: "2",
		},
	},
	className: "chakra-status",
	defaultVariants: {
		size: "md",
	},
	slots: ["root", "indicator"],
	variants: {
		size: {
			lg: {
				root: {
					textStyle: "md",
				},
			},
			md: {
				root: {
					textStyle: "sm",
				},
			},
			sm: {
				root: {
					textStyle: "xs",
				},
			},
		},
	},
})
