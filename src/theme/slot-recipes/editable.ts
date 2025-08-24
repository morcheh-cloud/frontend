import { defineSlotRecipe } from "@chakra-ui/react";

export const editableSlotRecipe = defineSlotRecipe({
	base: {
		control: {
			alignItems: "center",
			display: "inline-flex",
			gap: "1.5",
		},
		input: {
			_placeholder: {
				opacity: 0.6,
			},
			bg: "transparent",
			borderRadius: "l2",
			focusRingWidth: "2px",
			focusVisibleRing: "inside",
			fontSize: "inherit",
			fontWeight: "inherit",
			outline: "0",
			px: "1",
			py: "1",
			textAlign: "inherit",
			transitionDuration: "normal",
			transitionProperty: "common",
			width: "full",
		},
		preview: {
			_disabled: {
				userSelect: "none",
			},
			_hover: {
				bg: "bg.muted",
			},
			alignItems: "center",
			bg: "transparent",
			borderRadius: "l2",
			cursor: "text",
			display: "inline-flex",
			fontSize: "inherit",
			fontWeight: "inherit",
			px: "1",
			py: "1",
			textAlign: "inherit",
			transitionDuration: "moderate",
			transitionProperty: "common",
		},
		root: {
			alignItems: "center",
			display: "inline-flex",
			gap: "1.5",
			position: "relative",
			width: "full",
		},
	},
	className: "chakra-editable",
	defaultVariants: {
		size: "md",
	},
	slots: [
		"root",
		"area",
		"label",
		"preview",
		"input",
		"editTrigger",
		"submitTrigger",
		"cancelTrigger",
		"control",
		"textarea",
	],
	variants: {
		size: {
			lg: {
				input: {
					minH: "10",
				},
				preview: {
					minH: "10",
				},
				root: {
					textStyle: "md",
				},
			},
			md: {
				input: {
					minH: "9",
				},
				preview: {
					minH: "9",
				},
				root: {
					textStyle: "sm",
				},
			},
			sm: {
				input: {
					minH: "8",
				},
				preview: {
					minH: "8",
				},
				root: {
					textStyle: "sm",
				},
			},
		},
	},
});
