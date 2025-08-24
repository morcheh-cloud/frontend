import { defineSlotRecipe } from "@chakra-ui/react";

export const pinInputSlotRecipe = defineSlotRecipe({
	base: {
		control: {
			display: "inline-flex",
			gap: "2",
			isolation: "isolate",
		},
		input: {
			_disabled: {
				layerStyle: "disabled",
			},
			_invalid: {
				borderColor: "var(--error-color)",
				focusRingColor: "var(--error-color)",
			},
			"--error-color": "colors.border.error",
			"--focus-color": "colors.colorPalette.focusRing",
			appearance: "none",
			borderRadius: "l2",
			height: "var(--input-height)",
			minW: "var(--input-height)",
			minWidth: "0",
			outline: "0",
			position: "relative",
			textAlign: "center",
			width: "var(--input-height)",
		},
	},
	className: "chakra-pin-input",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	slots: ["root", "label", "input", "control"],
	variants: {
		attached: {
			true: {
				control: {
					gap: "0",
					spaceX: "-1px",
				},
				input: {
					_focusVisible: {
						zIndex: "1",
					},
					_notFirst: {
						borderStartRadius: "0",
					},
					_notLast: {
						borderEndRadius: "0",
					},
				},
			},
		},
		size: {
			"2xl": {
				input: {
					"--input-height": "sizes.16",
					px: "1",
					textStyle: "lg",
				},
			},
			"2xs": {
				input: {
					"--input-height": "sizes.7",
					px: "1",
					textStyle: "xs",
				},
			},
			lg: {
				input: {
					"--input-height": "sizes.11",
					px: "1",
					textStyle: "md",
				},
			},
			md: {
				input: {
					"--input-height": "sizes.10",
					px: "1",
					textStyle: "sm",
				},
			},
			sm: {
				input: {
					"--input-height": "sizes.9",
					px: "1",
					textStyle: "sm",
				},
			},
			xl: {
				input: {
					"--input-height": "sizes.12",
					px: "1",
					textStyle: "md",
				},
			},
			xs: {
				input: {
					"--input-height": "sizes.8",
					px: "1",
					textStyle: "xs",
				},
			},
		},
		variant: {
			flushed: {
				input: {
					_focusVisible: {
						_invalid: {
							borderColor: "var(--error-color)",
							boxShadow: "0px 1px 0px 0px var(--error-color)",
						},
						borderColor: "var(--focus-color)",
						boxShadow: "0px 1px 0px 0px var(--focus-color)",
					},
					bg: "transparent",
					borderBottomColor: "border",
					borderBottomWidth: "1px",
					borderRadius: "0",
					px: "0",
				},
			},
			outline: {
				input: {
					bg: "transparent",
					borderColor: "border",
					borderWidth: "1px",
					focusRingColor: "var(--focus-color)",
					focusVisibleRing: "inside",
				},
			},
			subtle: {
				input: {
					bg: "bg.muted",
					borderColor: "transparent",
					borderWidth: "1px",
					focusRingColor: "var(--focus-color)",
					focusVisibleRing: "inside",
				},
			},
		},
	},
});
