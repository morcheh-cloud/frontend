import { defineLayerStyles } from "@chakra-ui/react"

export const layerStyles = defineLayerStyles({
	disabled: {
		value: {
			cursor: "not-allowed",
			opacity: "0.5",
		},
	},
	"fill.muted": {
		value: {
			background: "colorPalette.muted",
			color: "colorPalette.fg",
		},
	},
	"fill.solid": {
		value: {
			background: "colorPalette.solid",
			color: "colorPalette.contrast",
		},
	},
	"fill.subtle": {
		value: {
			background: "colorPalette.subtle",
			color: "colorPalette.fg",
		},
	},
	"fill.surface": {
		value: {
			background: "colorPalette.subtle",
			boxShadow: "0 0 0px 1px var(--shadow-color)",
			boxShadowColor: "colorPalette.muted",
			color: "colorPalette.fg",
		},
	},
	"indicator.bottom": {
		value: {
			_before: {
				background: "var(--indicator-color, var(--indicator-color-fallback))",
				bottom: "var(--indicator-offset-y, 0)",
				content: '""',
				height: "var(--indicator-thickness, 2px)",
				insetInline: "var(--indicator-offset-x, 0)",
				position: "absolute",
			},
			"--indicator-color-fallback": "colors.colorPalette.solid",
			position: "relative",
		},
	},
	"indicator.end": {
		value: {
			_before: {
				background: "var(--indicator-color, var(--indicator-color-fallback))",
				content: '""',
				insetBlock: "var(--indicator-offset-y, 0)",
				insetInlineEnd: "var(--indicator-offset-x, 0)",
				position: "absolute",
				width: "var(--indicator-thickness, 2px)",
			},
			"--indicator-color-fallback": "colors.colorPalette.solid",
			position: "relative",
		},
	},
	"indicator.start": {
		value: {
			_before: {
				background: "var(--indicator-color, var(--indicator-color-fallback))",
				content: '""',
				insetBlock: "var(--indicator-offset-y, 0)",
				insetInlineStart: "var(--indicator-offset-x, 0)",
				position: "absolute",
				width: "var(--indicator-thickness, 2px)",
			},
			"--indicator-color-fallback": "colors.colorPalette.solid",
			position: "relative",
		},
	},
	"indicator.top": {
		value: {
			_before: {
				background: "var(--indicator-color, var(--indicator-color-fallback))",
				content: '""',
				height: "var(--indicator-thickness, 2px)",
				insetInline: "var(--indicator-offset-x, 0)",
				position: "absolute",
				top: "var(--indicator-offset-y, 0)",
			},
			"--indicator-color-fallback": "colors.colorPalette.solid",
			position: "relative",
		},
	},
	none: {
		value: {},
	},
	"outline.solid": {
		value: {
			borderColor: "colorPalette.solid",
			borderWidth: "1px",
			color: "colorPalette.fg",
		},
	},
	"outline.subtle": {
		value: {
			boxShadow: "inset 0 0 0px 1px var(--shadow-color)",
			boxShadowColor: "colorPalette.subtle",
			color: "colorPalette.fg",
		},
	},
})
