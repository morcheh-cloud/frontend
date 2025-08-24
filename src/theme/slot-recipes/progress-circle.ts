import { defineSlotRecipe } from "@chakra-ui/react";

export const progressCircleSlotRecipe = defineSlotRecipe({
	base: {
		circle: {
			_indeterminate: {
				animation: "spin 2s linear infinite",
			},
		},
		circleRange: {
			_indeterminate: {
				animation: "circular-progress 1.5s linear infinite",
			},
			stroke: "colorPalette.solid",
			transitionDuration: "0.6s",
			transitionProperty: "stroke-dashoffset, stroke-dasharray",
		},
		circleTrack: {
			"--track-color": "colors.colorPalette.muted",
			stroke: "var(--track-color)",
		},
		label: {
			display: "inline-flex",
		},
		root: {
			display: "inline-flex",
			position: "relative",
			textStyle: "sm",
		},
		valueText: {
			fontVariantNumeric: "tabular-nums",
			fontWeight: "medium",
			letterSpacing: "tight",
			lineHeight: "1",
		},
	},
	className: "chakra-progress-circle",
	defaultVariants: {
		size: "md",
	},
	slots: [
		"root",
		"label",
		"track",
		"range",
		"valueText",
		"view",
		"circle",
		"circleTrack",
		"circleRange",
	],
	variants: {
		size: {
			lg: {
				circle: {
					"--size": "48px",
					"--thickness": "7px",
				},
				valueText: {
					textStyle: "sm",
				},
			},
			md: {
				circle: {
					"--size": "40px",
					"--thickness": "6px",
				},
				valueText: {
					textStyle: "xs",
				},
			},
			sm: {
				circle: {
					"--size": "32px",
					"--thickness": "5px",
				},
				valueText: {
					textStyle: "2xs",
				},
			},
			xl: {
				circle: {
					"--size": "64px",
					"--thickness": "8px",
				},
				valueText: {
					textStyle: "sm",
				},
			},
			xs: {
				circle: {
					"--size": "24px",
					"--thickness": "4px",
				},
				valueText: {
					textStyle: "2xs",
				},
			},
		},
	},
});
