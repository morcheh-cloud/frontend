import { defineSlotRecipe } from "@chakra-ui/react"

export const segmentGroupSlotRecipe = defineSlotRecipe({
	base: {
		indicator: {
			bg: {
				_dark: "bg.emphasized",
				_light: "bg",
			},
			borderRadius: "var(--segment-radius)",
			height: "var(--height)",
			left: "var(--left)",
			pos: "absolute",
			shadow: "sm",
			top: "var(--top)",
			width: "var(--width)",
			zIndex: -1,
		},
		item: {
			_before: {
				bg: "border",
				content: '""',
				position: "absolute",
				transition: "opacity 0.2s",
			},
			_disabled: {
				opacity: "0.5",
			},
			_horizontal: {
				_before: {
					insetBlock: "1.5",
					insetInlineStart: 0,
					width: "1px",
				},
			},
			_vertical: {
				_before: {
					height: "1px",
					insetBlockStart: 0,
					insetInline: "1.5",
				},
			},
			"& + &[data-state=checked], &[data-state=checked] + &, &:first-of-type": {
				_before: {
					opacity: "0",
				},
			},
			"&:has(input:focus-visible)": {
				focusRing: "outside",
			},
			"&[data-state=checked][data-ssr]": {
				bg: "bg",
				borderRadius: "var(--segment-radius)",
				shadow: "sm",
			},
			alignItems: "center",
			borderRadius: "var(--segment-radius)",
			color: "fg",
			display: "flex",
			fontSize: "sm",
			justifyContent: "center",
			position: "relative",
			userSelect: "none",
		},
		root: {
			_vertical: {
				flexDirection: "column",
			},
			"--segment-radius": "radii.l2",
			bg: "bg.muted",
			borderRadius: "l2",
			boxShadow: "inset",
			display: "inline-flex",
			isolation: "isolate",
			minW: "max-content",
			position: "relative",
			textAlign: "center",
		},
	},
	className: "chakra-segment-group",
	defaultVariants: {
		size: "md",
	},
	slots: ["root", "label", "item", "itemText", "itemControl", "indicator"],
	variants: {
		size: {
			lg: {
				item: {
					gap: "3",
					height: "11",
					px: "4.5",
					textStyle: "md",
				},
			},
			md: {
				item: {
					gap: "2",
					height: "10",
					px: "4",
					textStyle: "sm",
				},
			},
			sm: {
				item: {
					gap: "2",
					height: "8",
					px: "4",
					textStyle: "sm",
				},
			},
			xs: {
				item: {
					gap: "1",
					height: "6",
					px: "3",
					textStyle: "xs",
				},
			},
		},
	},
})
