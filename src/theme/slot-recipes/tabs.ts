import { defineSlotRecipe } from "@chakra-ui/react";

export const tabsSlotRecipe = defineSlotRecipe({
	base: {
		content: {
			_horizontal: {
				pt: "var(--tabs-content-padding)",
				width: "100%",
			},
			_vertical: {
				height: "100%",
				ps: "var(--tabs-content-padding)",
			},
			focusVisibleRing: "inside",
		},
		indicator: {
			bg: "var(--tabs-indicator-bg)",
			borderRadius: "var(--tabs-indicator-radius)",
			height: "var(--height)",
			shadow: "var(--tabs-indicator-shadow)",
			width: "var(--width)",
			zIndex: -1,
		},
		list: {
			_horizontal: {
				flexDirection: "row",
			},
			_vertical: {
				flexDirection: "column",
			},
			"--tabs-indicator-bg": "colors.bg",
			"--tabs-indicator-shadow": "shadows.xs",
			display: "inline-flex",
			isolation: "isolate",
			minH: "var(--tabs-height)",
			position: "relative",
		},
		root: {
			_horizontal: {
				display: "block",
			},
			_vertical: {
				display: "flex",
			},
			"--tabs-trigger-radius": "radii.l2",
			position: "relative",
		},
		trigger: {
			_disabled: {
				cursor: "not-allowed",
				opacity: 0.5,
			},
			_focusVisible: {
				outline: "2px solid",
				outlineColor: "colorPalette.focusRing",
				zIndex: 1,
			},
			alignItems: "center",
			cursor: "button",
			display: "flex",
			fontWeight: "medium",
			gap: "2",
			height: "var(--tabs-height)",
			minW: "var(--tabs-height)",
			outline: "0",
			position: "relative",
		},
	},
	className: "chakra-tabs",
	defaultVariants: {
		size: "md",
		variant: "line",
	},
	slots: ["root", "trigger", "list", "content", "contentGroup", "indicator"],
	variants: {
		fitted: {
			true: {
				list: {
					display: "flex",
				},
				trigger: {
					flex: 1,
					justifyContent: "center",
					textAlign: "center",
				},
			},
		},
		justify: {
			center: {
				list: {
					justifyContent: "center",
				},
			},
			end: {
				list: {
					justifyContent: "flex-end",
				},
			},
			start: {
				list: {
					justifyContent: "flex-start",
				},
			},
		},
		size: {
			lg: {
				root: {
					"--tabs-content-padding": "spacing.4.5",
					"--tabs-height": "sizes.11",
				},
				trigger: {
					px: "4.5",
					py: "2",
					textStyle: "md",
				},
			},
			md: {
				root: {
					"--tabs-content-padding": "spacing.4",
					"--tabs-height": "sizes.10",
				},
				trigger: {
					px: "4",
					py: "2",
					textStyle: "sm",
				},
			},
			sm: {
				root: {
					"--tabs-content-padding": "spacing.3",
					"--tabs-height": "sizes.9",
				},
				trigger: {
					px: "3",
					py: "1",
					textStyle: "sm",
				},
			},
		},
		variant: {
			enclosed: {
				list: {
					bg: "bg.muted",
					borderRadius: "l3",
					minH: "calc(var(--tabs-height) - 4px)",
					padding: "1",
				},
				trigger: {
					_selected: {
						bg: "bg",
						color: "colorPalette.fg",
						shadow: "xs",
					},
					borderRadius: "var(--tabs-trigger-radius)",
					color: "fg.muted",
					justifyContent: "center",
				},
			},
			line: {
				list: {
					_horizontal: {
						borderBottomWidth: "1px",
					},
					_vertical: {
						borderEndWidth: "1px",
					},
					borderColor: "border",
					display: "flex",
				},
				trigger: {
					_disabled: {
						_active: {
							bg: "initial",
						},
					},
					_selected: {
						_horizontal: {
							"--indicator-color": "colors.colorPalette.solid",
							"--indicator-offset-y": "-1px",
							layerStyle: "indicator.bottom",
						},
						_vertical: {
							"--indicator-offset-x": "-1px",
							layerStyle: "indicator.end",
						},
						color: "fg",
					},
					color: "fg.muted",
				},
			},
			outline: {
				list: {
					_horizontal: {
						_before: {
							borderBottomColor: "border",
							borderBottomWidth: "var(--line-thickness)",
							bottom: "0px",
							content: '""',
							position: "absolute",
							width: "100%",
						},
					},
					_vertical: {
						_before: {
							borderEndColor: "border",
							borderEndWidth: "var(--line-thickness)",
							content: '""',
							height: "calc(100% - calc(var(--line-thickness) * 2))",
							insetInline: "var(--line-offset)",
							position: "absolute",
						},
					},
					"--line-offset": "calc(var(--line-thickness) * -1)",
					"--line-thickness": "1px",
					borderColor: "border",
					display: "flex",
				},
				trigger: {
					_horizontal: {
						_selected: {
							borderBottomColor: "transparent",
							borderColor: "border",
						},
						borderTopRadius: "var(--tabs-trigger-radius)",
						marginBottom: "var(--line-offset)",
						marginEnd: {
							_notLast: "var(--line-offset)",
						},
					},
					_selected: {
						bg: "currentBg",
						color: "colorPalette.fg",
					},
					_vertical: {
						_selected: {
							borderColor: "border",
							borderEndColor: "transparent",
						},
						borderStartRadius: "var(--tabs-trigger-radius)",
						marginBottom: {
							_notLast: "var(--line-offset)",
						},
						marginEnd: "var(--line-offset)",
					},
					borderColor: "transparent",
					borderWidth: "1px",
					color: "fg.muted",
				},
			},
			plain: {
				trigger: {
					_selected: {
						color: "colorPalette.fg",
					},
					"&[data-selected][data-ssr]": {
						bg: "var(--tabs-indicator-bg)",
						borderRadius: "var(--tabs-indicator-radius)",
						shadow: "var(--tabs-indicator-shadow)",
					},
					borderRadius: "var(--tabs-trigger-radius)",
					color: "fg.muted",
				},
			},
			subtle: {
				trigger: {
					_selected: {
						bg: "colorPalette.subtle",
						color: "colorPalette.fg",
					},
					borderRadius: "var(--tabs-trigger-radius)",
					color: "fg.muted",
				},
			},
		},
	},
});
