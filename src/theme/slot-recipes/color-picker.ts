import { defineSlotRecipe } from "@chakra-ui/react"

export const colorPickerSlotRecipe = defineSlotRecipe({
	base: {
		area: {
			borderRadius: "l2",
			height: "180px",
			overflow: "hidden",
		},
		areaBackground: {
			height: "full",
		},
		areaThumb: {
			borderColor: "white",
			borderRadius: "full",
			borderWidth: "2px",
			focusRingColor: "white",
			focusVisibleRing: "mixed",
			height: "var(--thumb-size)",
			shadow: "sm",
			width: "var(--thumb-size)",
		},
		channelInput: {
			_disabled: {
				layerStyle: "disabled",
			},
			_invalid: {
				borderColor: "var(--error-color)",
				focusRingColor: "var(--error-color)",
			},
			"--error-color": "colors.border.error",
			"--focus-color": "colors.colorPalette.focusRing",
			"&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
				margin: 0,
				WebkitAppearance: "none",
			},
			appearance: "none",
			borderRadius: "l2",
			height: "var(--input-height)",
			minW: "var(--input-height)",
			minWidth: "0",
			outline: "0",
			position: "relative",
			textAlign: "start",
			width: "100%",
		},
		channelSlider: {
			borderRadius: "l2",
			flex: "1",
		},
		channelSliderThumb: {
			borderColor: "white",
			borderRadius: "full",
			borderWidth: "2px",
			focusRingOffset: "1px",
			focusVisibleRing: "outside",
			height: "var(--thumb-size)",
			shadow: "sm",
			transform: "translate(-50%, -50%)",
			width: "var(--thumb-size)",
		},
		channelSliderTrack: {
			borderRadius: "inherit",
			boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
			height: "var(--slider-height)",
		},
		channelText: {
			color: "fg.muted",
			fontWeight: "medium",
			textStyle: "xs",
			textTransform: "capitalize",
		},
		content: {
			_closed: {
				animationDuration: "faster",
				animationStyle: "slide-fade-out",
			},
			_open: {
				animationDuration: "fast",
				animationStyle: "slide-fade-in",
			},
			bg: "bg.panel",
			borderRadius: "l3",
			boxShadow: "lg",
			display: "flex",
			flexDirection: "column",
			gap: "3",
			p: "4",
			width: "64",
			zIndex: "dropdown",
		},
		control: {
			alignItems: "center",
			display: "flex",
			flexDirection: "row",
			gap: "2",
			position: "relative",
		},
		formatSelect: {
			borderWidth: "1px",
			focusRing: "inside",
			minH: "6",
			rounded: "l2",
			textStyle: "xs",
			textTransform: "uppercase",
		},
		label: {
			_disabled: {
				opacity: "0.5",
			},
			color: "fg",
			fontWeight: "medium",
			textStyle: "sm",
		},
		root: {
			display: "flex",
			flexDirection: "column",
			gap: "1.5",
		},
		swatch: {
			"--checker-bg": "colors.bg",
			"--checker-fg": "colors.bg.emphasized",
			"--checker-size": "8px",
			alignItems: "center",
			background:
				"linear-gradient(var(--color), var(--color)), repeating-conic-gradient(var(--checker-fg) 0%, var(--checker-fg) 25%, var(--checker-bg) 0%, var(--checker-bg) 50%) 0% 50% / var(--checker-size) var(--checker-size) !important",
			borderRadius: "l1",
			boxSize: "var(--swatch-size)",
			display: "inline-flex",
			flexShrink: "0",
			justifyContent: "center",
			shadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.1)",
		},
		swatchGroup: {
			display: "flex",
			flexDirection: "row",
			flexWrap: "wrap",
			gap: "2",
		},
		swatchIndicator: {
			color: "white",
			rounded: "full",
		},
		swatchTrigger: {
			alignItems: "center",
			display: "flex",
			justifyContent: "center",
		},
		transparencyGrid: {
			borderRadius: "l2",
		},
		trigger: {
			_disabled: {
				opacity: "0.5",
			},
			"--focus-color": "colors.colorPalette.focusRing",
			"&:focus-visible": {
				borderColor: "var(--focus-color)",
				outline: "1px solid var(--focus-color)",
			},
			"&[data-fit-content]": {
				"--input-height": "unset",
				border: "0",
				px: "0",
			},
			alignItems: "center",
			display: "flex",
			flexDirection: "row",
			flexShrink: "0",
			gap: "2",
			justifyContent: "center",
			minH: "var(--input-height)",
			minW: "var(--input-height)",
			px: "1",
			rounded: "l2",
			textStyle: "sm",
		},
		valueText: {
			textAlign: "start",
		},
		view: {
			display: "flex",
			flexDirection: "column",
			gap: "2",
		},
	},
	className: "colorPicker",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	slots: [
		"root",
		"label",
		"control",
		"trigger",
		"positioner",
		"content",
		"area",
		"areaThumb",
		"valueText",
		"areaBackground",
		"channelSlider",
		"channelSliderLabel",
		"channelSliderTrack",
		"channelSliderThumb",
		"channelSliderValueText",
		"channelInput",
		"transparencyGrid",
		"swatchGroup",
		"swatchTrigger",
		"swatchIndicator",
		"swatch",
		"eyeDropperTrigger",
		"formatTrigger",
		"formatSelect",
		"view",
		"channelText",
	],
	variants: {
		size: {
			"2xl": {
				area: {
					"--thumb-size": "sizes.3.5",
				},
				channelInput: {
					"--input-height": "sizes.16",
					px: "5",
					textStyle: "lg",
				},
				channelSlider: {
					"--slider-height": "sizes.3.5",
					"--thumb-size": "sizes.3.5",
				},
				swatch: {
					"--swatch-size": "sizes.10",
				},
				trigger: {
					"--input-height": "sizes.16",
				},
			},
			"2xs": {
				area: {
					"--thumb-size": "sizes.3",
				},
				channelInput: {
					"--input-height": "sizes.7",
					px: "2",
					textStyle: "xs",
				},
				channelSlider: {
					"--slider-height": "sizes.3",
					"--thumb-size": "sizes.3",
				},
				swatch: {
					"--swatch-size": "sizes.4.5",
				},
				trigger: {
					"--input-height": "sizes.7",
				},
			},
			lg: {
				area: {
					"--thumb-size": "sizes.3.5",
				},
				channelInput: {
					"--input-height": "sizes.11",
					px: "4",
					textStyle: "md",
				},
				channelSlider: {
					"--slider-height": "sizes.3.5",
					"--thumb-size": "sizes.3.5",
				},
				swatch: {
					"--swatch-size": "sizes.7",
				},
				trigger: {
					"--input-height": "sizes.11",
				},
			},
			md: {
				area: {
					"--thumb-size": "sizes.3.5",
				},
				channelInput: {
					"--input-height": "sizes.10",
					px: "3",
					textStyle: "sm",
				},
				channelSlider: {
					"--slider-height": "sizes.3.5",
					"--thumb-size": "sizes.3.5",
				},
				swatch: {
					"--swatch-size": "sizes.7",
				},
				trigger: {
					"--input-height": "sizes.10",
				},
			},
			sm: {
				area: {
					"--thumb-size": "sizes.3.5",
				},
				channelInput: {
					"--input-height": "sizes.9",
					px: "2.5",
					textStyle: "sm",
				},
				channelSlider: {
					"--slider-height": "sizes.3.5",
					"--thumb-size": "sizes.3.5",
				},
				swatch: {
					"--swatch-size": "sizes.6",
				},
				trigger: {
					"--input-height": "sizes.9",
				},
			},
			xl: {
				area: {
					"--thumb-size": "sizes.3.5",
				},
				channelInput: {
					"--input-height": "sizes.12",
					px: "4.5",
					textStyle: "md",
				},
				channelSlider: {
					"--slider-height": "sizes.3.5",
					"--thumb-size": "sizes.3.5",
				},
				swatch: {
					"--swatch-size": "sizes.8",
				},
				trigger: {
					"--input-height": "sizes.12",
				},
			},
			xs: {
				area: {
					"--thumb-size": "sizes.3.5",
				},
				channelInput: {
					"--input-height": "sizes.8",
					px: "2",
					textStyle: "xs",
				},
				channelSlider: {
					"--slider-height": "sizes.3.5",
					"--thumb-size": "sizes.3.5",
				},
				swatch: {
					"--swatch-size": "sizes.5",
				},
				trigger: {
					"--input-height": "sizes.8",
				},
			},
		},
		variant: {
			outline: {
				channelInput: {
					bg: "transparent",
					borderColor: "border",
					borderWidth: "1px",
					focusRingColor: "var(--focus-color)",
					focusVisibleRing: "inside",
				},
				trigger: {
					borderWidth: "1px",
				},
			},
			subtle: {
				channelInput: {
					bg: "bg.muted",
					borderColor: "transparent",
					borderWidth: "1px",
					focusRingColor: "var(--focus-color)",
					focusVisibleRing: "inside",
				},
				trigger: {
					bg: "bg.muted",
					borderColor: "transparent",
					borderWidth: "1px",
				},
			},
		},
	},
})
