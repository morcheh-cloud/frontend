import { defineSlotRecipe } from "@chakra-ui/react";

export const sliderSlotRecipe = defineSlotRecipe({
	base: {
		control: {
			alignItems: "center",
			display: "inline-flex",
			position: "relative",
		},
		label: {
			fontWeight: "medium",
			textStyle: "sm",
		},
		marker: {
			"--marker-bg": {
				_underValue: "colors.bg",
				base: "white",
			},
			alignItems: "center",
			color: "fg.muted",
			display: "flex",
			gap: "calc(var(--slider-thumb-size) / 2)",
			textStyle: "xs",
		},
		markerGroup: {
			position: "absolute!",
			zIndex: "1",
		},
		markerIndicator: {
			bg: "var(--marker-bg)",
			borderRadius: "full",
			height: "var(--slider-marker-size)",
			width: "var(--slider-marker-size)",
		},
		range: {
			_disabled: {
				bg: "border.emphasized!",
			},
			height: "inherit",
			width: "inherit",
		},
		root: {
			display: "flex",
			flexDirection: "column",
			gap: "1",
			isolation: "isolate",
			position: "relative",
			textStyle: "sm",
			touchAction: "none",
		},
		thumb: {
			_focusVisible: {
				ring: "2px",
				ringColor: "colorPalette.focusRing",
				ringOffset: "2px",
				ringOffsetColor: "bg",
			},
			alignItems: "center",
			borderRadius: "full",
			display: "flex",
			height: "var(--slider-thumb-size)",
			justifyContent: "center",
			outline: 0,
			width: "var(--slider-thumb-size)",
			zIndex: "2",
		},
		track: {
			borderRadius: "full",
			flex: "1",
			overflow: "hidden",
		},
	},
	className: "chakra-slider",
	defaultVariants: {
		orientation: "horizontal",
		size: "md",
		variant: "outline",
	},
	slots: [
		"root",
		"label",
		"thumb",
		"valueText",
		"track",
		"range",
		"control",
		"markerGroup",
		"marker",
		"draggingIndicator",
		"markerIndicator",
	],
	variants: {
		orientation: {
			horizontal: {
				control: {
					"&[data-has-mark-label], &:has(.chakra-slider__marker-label)": {
						marginBottom: "4",
					},
					flexDirection: "row",
					minHeight: "var(--slider-thumb-size)",
					width: "100%",
				},
				marker: {
					flexDirection: "column",
				},
				markerGroup: {
					insetInline: "var(--slider-marker-inset)",
					top: "var(--slider-marker-center)",
				},
				thumb: {
					top: "50%",
					translate: "0 -50%",
				},
				track: {
					height: "var(--slider-track-size)",
				},
			},
			vertical: {
				control: {
					"&[data-has-mark-label], &:has(.chakra-slider__marker-label)": {
						marginEnd: "4",
					},
					flexDirection: "column",
					height: "100%",
					minWidth: "var(--slider-thumb-size)",
				},
				marker: {
					flexDirection: "row",
				},
				markerGroup: {
					insetBlock: "var(--slider-marker-inset)",
					insetStart: "var(--slider-marker-center)",
				},
				root: {
					display: "inline-flex",
				},
				thumb: {
					left: "50%",
					translate: "-50% 0",
				},
				track: {
					width: "var(--slider-track-size)",
				},
			},
		},
		size: {
			lg: {
				root: {
					"--slider-marker-center": "9px",
					"--slider-marker-inset": "5px",
					"--slider-marker-size": "sizes.1.5",
					"--slider-thumb-size": "sizes.6",
					"--slider-track-size": "sizes.2.5",
				},
			},
			md: {
				root: {
					"--slider-marker-center": "8px",
					"--slider-marker-inset": "4px",
					"--slider-marker-size": "sizes.1",
					"--slider-thumb-size": "sizes.5",
					"--slider-track-size": "sizes.2",
				},
			},
			sm: {
				root: {
					"--slider-marker-center": "6px",
					"--slider-marker-inset": "3px",
					"--slider-marker-size": "sizes.1",
					"--slider-thumb-size": "sizes.4",
					"--slider-track-size": "sizes.1.5",
				},
			},
		},
		variant: {
			outline: {
				range: {
					bg: "colorPalette.solid",
				},
				thumb: {
					_disabled: {
						bg: "border.emphasized",
						borderColor: "border.emphasized",
					},
					bg: "bg",
					borderColor: "colorPalette.solid",
					borderWidth: "2px",
				},
				track: {
					bg: "bg.emphasized/72",
					shadow: "inset",
				},
			},
			solid: {
				range: {
					bg: "colorPalette.solid",
				},
				thumb: {
					_disabled: {
						bg: "border.emphasized",
					},
					bg: "colorPalette.solid",
				},
				track: {
					_disabled: {
						bg: "bg.muted",
					},
					bg: "colorPalette.subtle",
				},
			},
		},
	},
});
