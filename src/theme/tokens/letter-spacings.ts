import { defineTokens } from "@chakra-ui/react";

export const letterSpacings = defineTokens.letterSpacings({
	tight: {
		value: "-0.025em",
	},
	tighter: {
		value: "-0.05em",
	},
	wide: {
		value: "0.025em",
	},
	wider: {
		value: "0.05em",
	},
	widest: {
		value: "0.1em",
	},
});
