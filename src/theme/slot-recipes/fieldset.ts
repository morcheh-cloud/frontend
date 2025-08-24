import { defineSlotRecipe } from "@chakra-ui/react";

export const fieldsetSlotRecipe = defineSlotRecipe({
	base: {
		content: {
			display: "flex",
			flexDirection: "column",
			width: "full",
		},
		errorText: {
			alignItems: "center",
			color: "fg.error",
			display: "inline-flex",
			fontWeight: "medium",
			gap: "2",
			textStyle: "sm",
		},
		helperText: {
			color: "fg.muted",
			textStyle: "sm",
		},
		legend: {
			_disabled: {
				opacity: "0.5",
			},
			color: "fg",
			fontWeight: "medium",
		},
		root: {
			display: "flex",
			flexDirection: "column",
			width: "full",
		},
	},
	className: "fieldset",
	defaultVariants: {
		size: "md",
	},
	slots: ["root", "errorText", "helperText", "legend", "content"],
	variants: {
		size: {
			lg: {
				content: {
					gap: "4",
				},
				legend: {
					textStyle: "md",
				},
				root: {
					spaceY: "6",
				},
			},
			md: {
				content: {
					gap: "4",
				},
				legend: {
					textStyle: "sm",
				},
				root: {
					spaceY: "4",
				},
			},
			sm: {
				content: {
					gap: "1.5",
				},
				legend: {
					textStyle: "sm",
				},
				root: {
					spaceY: "2",
				},
			},
		},
	},
});
