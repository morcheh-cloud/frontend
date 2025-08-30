import { defineSlotRecipe } from "@chakra-ui/react"

export const statSlotRecipe = defineSlotRecipe({
	base: {
		helpText: {
			color: "fg.muted",
			textStyle: "xs",
		},
		indicator: {
			"& :where(svg)": {
				h: "1em",
				w: "1em",
			},
			"&[data-type=down]": {
				color: "fg.error",
			},
			"&[data-type=up]": {
				color: "fg.success",
			},
			alignItems: "center",
			display: "inline-flex",
			justifyContent: "center",
			marginEnd: 1,
		},
		label: {
			alignItems: "center",
			color: "fg.muted",
			display: "inline-flex",
			gap: "1.5",
			textStyle: "sm",
		},
		root: {
			display: "flex",
			flex: "1",
			flexDirection: "column",
			gap: "1",
			position: "relative",
		},
		valueText: {
			display: "inline-flex",
			fontFeatureSettings: "pnum",
			fontVariantNumeric: "proportional-nums",
			fontWeight: "semibold",
			gap: "1",
			letterSpacing: "tight",
			verticalAlign: "baseline",
		},
		valueUnit: {
			color: "fg.muted",
			fontWeight: "initial",
			letterSpacing: "initial",
			textStyle: "xs",
		},
	},
	className: "chakra-stat",
	defaultVariants: {
		size: "md",
	},
	slots: ["root", "label", "helpText", "valueText", "valueUnit", "indicator"],
	variants: {
		size: {
			lg: {
				valueText: {
					textStyle: "3xl",
				},
			},
			md: {
				valueText: {
					textStyle: "2xl",
				},
			},
			sm: {
				valueText: {
					textStyle: "xl",
				},
			},
		},
	},
})
