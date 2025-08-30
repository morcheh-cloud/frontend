import { defineSlotRecipe } from "@chakra-ui/react"

export const nativeSelectSlotRecipe = defineSlotRecipe({
	base: {
		field: {
			_disabled: {
				layerStyle: "disabled",
			},
			_invalid: {
				borderColor: "var(--error-color)",
				focusRingColor: "var(--error-color)",
			},
			"--error-color": "colors.border.error",
			"--input-height": "var(--select-field-height)",
			"& > option, & > optgroup": {
				bg: "bg",
			},
			appearance: "none",
			borderRadius: "l2",
			focusVisibleRing: "inside",
			height: "var(--select-field-height)",
			lineHeight: "normal",
			minWidth: "0",
			outline: "0",
			width: "100%",
		},
		indicator: {
			_disabled: {
				opacity: "0.5",
			},
			_icon: {
				height: "1em",
				width: "1em",
			},
			_invalid: {
				color: "fg.error",
			},
			alignItems: "center",
			color: "fg.muted",
			display: "inline-flex",
			height: "100%",
			justifyContent: "center",
			pointerEvents: "none",
			position: "absolute",
			top: "50%",
			transform: "translateY(-50%)",
		},
		root: {
			display: "flex",
			height: "fit-content",
			position: "relative",
			width: "100%",
		},
	},
	className: "chakra-native-select",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	slots: ["root", "field", "indicator"],
	variants: {
		size: {
			lg: {
				field: {
					pe: "8",
					ps: "4",
					textStyle: "md",
				},
				indicator: {
					insetEnd: "3",
					textStyle: "xl",
				},
				root: {
					"--select-field-height": "sizes.11",
				},
			},
			md: {
				field: {
					pe: "8",
					ps: "3",
					textStyle: "sm",
				},
				indicator: {
					insetEnd: "2",
					textStyle: "lg",
				},
				root: {
					"--select-field-height": "sizes.10",
				},
			},
			sm: {
				field: {
					pe: "8",
					ps: "2.5",
					textStyle: "sm",
				},
				indicator: {
					insetEnd: "2",
					textStyle: "md",
				},
				root: {
					"--select-field-height": "sizes.9",
				},
			},
			xl: {
				field: {
					pe: "10",
					ps: "4.5",
					textStyle: "md",
				},
				indicator: {
					insetEnd: "3",
					textStyle: "xl",
				},
				root: {
					"--select-field-height": "sizes.12",
				},
			},
			xs: {
				field: {
					pe: "6",
					ps: "2",
					textStyle: "xs",
				},
				indicator: {
					insetEnd: "1.5",
					textStyle: "sm",
				},
				root: {
					"--select-field-height": "sizes.8",
				},
			},
		},
		variant: {
			outline: {
				field: {
					_expanded: {
						borderColor: "border.emphasized",
					},
					bg: "transparent",
					borderColor: "border",
					borderWidth: "1px",
				},
			},
			plain: {
				field: {
					bg: "transparent",
					color: "fg",
					focusRingWidth: "2px",
				},
			},
			subtle: {
				field: {
					bg: "bg.muted",
					borderColor: "transparent",
					borderWidth: "1px",
				},
			},
		},
	},
})
