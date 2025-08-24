import { defineRecipe } from "@chakra-ui/react";

export const skipNavLinkRecipe = defineRecipe({
	base: {
		_focusVisible: {
			clip: "auto",
			height: "auto",
			insetStart: "6",
			position: "fixed",
			top: "6",
			width: "auto",
		},
		bg: "bg.panel",
		border: "0",
		borderRadius: "l2",
		clip: "rect(0 0 0 0)",
		display: "inline-flex",
		focusVisibleRing: "outside",
		fontWeight: "semibold",
		height: "1px",
		margin: "-1px",
		outline: "0",
		overflow: "hidden",
		padding: "2.5",
		position: "absolute",
		textStyle: "sm",
		userSelect: "none",
		width: "1px",
	},
	className: "chakra-skip-nav",
});
