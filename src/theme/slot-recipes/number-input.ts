import { defineSlotRecipe } from "@chakra-ui/react"

export const numberInputSlotRecipe = defineSlotRecipe({
	base: {
		control: {
			borderStartWidth: "1px",
			display: "flex",
			divideY: "1px",
			flexDirection: "column",
			height: "calc(100% - 2px)",
			insetEnd: "0px",
			margin: "1px",
			position: "absolute",
			top: "0",
			width: "var(--stepper-width)",
			zIndex: "1",
		},
		decrementTrigger: {
			_active: {
				bg: "bg.emphasized",
			},
			_disabled: {
				opacity: "0.5",
			},
			_hover: {
				bg: "bg.muted",
			},
			_icon: {
				boxSize: "1em",
			},
			"--stepper-base-radius": "radii.l1",
			"--stepper-radius": "calc(var(--stepper-base-radius) + 1px)",
			alignItems: "center",
			borderBottomEndRadius: "var(--stepper-radius)",
			color: "fg.muted",
			cursor: "button",
			display: "flex",
			flex: "1",
			justifyContent: "center",
			lineHeight: "1",
			userSelect: "none",
		},
		incrementTrigger: {
			_active: {
				bg: "bg.emphasized",
			},
			_disabled: {
				opacity: "0.5",
			},
			_hover: {
				bg: "bg.muted",
			},
			_icon: {
				boxSize: "1em",
			},
			"--stepper-base-radius": "radii.l1",
			"--stepper-radius": "calc(var(--stepper-base-radius) + 1px)",
			alignItems: "center",
			borderTopEndRadius: "var(--stepper-radius)",
			color: "fg.muted",
			cursor: "button",
			display: "flex",
			flex: "1",
			justifyContent: "center",
			lineHeight: "1",
			userSelect: "none",
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
			pe: "calc(var(--stepper-width) + 0.5rem)",
			position: "relative",
			textAlign: "start",
			verticalAlign: "top",
			width: "100%",
		},
		root: {
			isolation: "isolate",
			position: "relative",
			zIndex: "0",
		},
		valueText: {
			fontFeatureSettings: "pnum",
			fontVariantNumeric: "proportional-nums",
			fontWeight: "medium",
		},
	},
	className: "chakra-number-input",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	slots: [
		"root",
		"label",
		"input",
		"control",
		"valueText",
		"incrementTrigger",
		"decrementTrigger",
		"scrubber",
	],
	variants: {
		size: {
			lg: {
				control: {
					"--stepper-width": "sizes.6",
					fontSize: "sm",
				},
				input: {
					"--input-height": "sizes.11",
					px: "4",
					textStyle: "md",
				},
			},
			md: {
				control: {
					"--stepper-width": "sizes.6",
					fontSize: "sm",
				},
				input: {
					"--input-height": "sizes.10",
					px: "3",
					textStyle: "sm",
				},
			},
			sm: {
				control: {
					"--stepper-width": "sizes.5",
					fontSize: "xs",
				},
				input: {
					"--input-height": "sizes.9",
					px: "2.5",
					textStyle: "sm",
				},
			},
			xs: {
				control: {
					"--stepper-width": "sizes.4",
					fontSize: "2xs",
				},
				input: {
					"--input-height": "sizes.8",
					px: "2",
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
})
