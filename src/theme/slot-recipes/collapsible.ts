import { defineSlotRecipe } from "@chakra-ui/react"

export const collapsibleSlotRecipe = defineSlotRecipe({
	base: {
		content: {
			_closed: {
				animationDuration: "moderate",
				animationName: "collapse-height, fade-out",
			},
			_open: {
				animationDuration: "moderate",
				animationName: "expand-height, fade-in",
			},
			overflow: "hidden",
		},
	},
	className: "chakra-collapsible",
	slots: ["root", "trigger", "content", "indicator"],
})
