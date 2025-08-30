import { defineSlotRecipe } from "@chakra-ui/react"

export const actionBarSlotRecipe = defineSlotRecipe({
	base: {
		content: {
			_closed: {
				animationDuration: "faster",
				animationName: "slide-to-bottom, fade-out",
			},
			_open: {
				animationDuration: "moderate",
				animationName: "slide-from-bottom, fade-in",
			},
			alignItems: "center",
			bg: "bg.panel",
			borderRadius: "l3",
			display: "flex",
			gap: "3",
			pointerEvents: "auto",
			px: "3",
			py: "2.5",
			shadow: "md",
			translate: "calc(-1 * var(--scrollbar-width) / 2) 0px",
		},
		positioner: {
			bottom: "calc(env(safe-area-inset-bottom) + 20px)",
			display: "flex",
			insetInline: "0",
			justifyContent: "center",
			pointerEvents: "none",
			position: "fixed",
			top: "unset",
		},
		selectionTrigger: {
			alignItems: "center",
			alignSelf: "stretch",
			borderRadius: "l2",
			borderStyle: "dashed",
			borderWidth: "1px",
			display: "inline-flex",
			gap: "2",
			px: "4",
			py: "1",
			textStyle: "sm",
		},
		separator: {
			bg: "border",
			height: "5",
			width: "1px",
		},
	},
	className: "chakra-action-bar",
	slots: [
		"positioner",
		"content",
		"separator",
		"selectionTrigger",
		"closeTrigger",
	],
})
