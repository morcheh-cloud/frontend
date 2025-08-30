import { defineSlotRecipe } from "@chakra-ui/react"

export const fieldSlotRecipe = defineSlotRecipe({
	base: {
		errorText: {
			alignItems: "center",
			color: "fg.error",
			display: "inline-flex",
			fontWeight: "medium",
			gap: "1",
			textStyle: "xs",
		},
		helperText: {
			color: "fg.muted",
			textStyle: "xs",
		},
		label: {
			_disabled: {
				opacity: "0.5",
			},
			alignItems: "center",
			display: "flex",
			fontWeight: "medium",
			gap: "1",
			textAlign: "start",
			textStyle: "sm",
			userSelect: "none",
		},
		requiredIndicator: {
			color: "fg.error",
			lineHeight: "1",
		},
		root: {
			display: "flex",
			gap: "1.5",
			position: "relative",
			width: "100%",
		},
	},
	className: "chakra-field",
	defaultVariants: {
		orientation: "vertical",
	},
	slots: [
		"root",
		"errorText",
		"helperText",
		"input",
		"label",
		"select",
		"textarea",
		"requiredIndicator",
		"requiredIndicator",
	],
	variants: {
		orientation: {
			horizontal: {
				label: {
					flex: "0 0 var(--field-label-width, 80px)",
				},
				root: {
					alignItems: "center",
					flexDirection: "row",
					justifyContent: "space-between",
				},
			},
			vertical: {
				root: {
					alignItems: "flex-start",
					flexDirection: "column",
				},
			},
		},
	},
})
