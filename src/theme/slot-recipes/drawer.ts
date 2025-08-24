import { defineSlotRecipe } from "@chakra-ui/react";

export const drawerSlotRecipe = defineSlotRecipe({
	base: {
		backdrop: {
			_closed: {
				animationDuration: "moderate",
				animationName: "fade-out",
			},
			_open: {
				animationDuration: "slow",
				animationName: "fade-in",
			},
			bg: "blackAlpha.500",
			h: "100dvh",
			insetInlineStart: 0,
			pos: "fixed",
			top: 0,
			w: "100vw",
			zIndex: "overlay",
		},
		body: {
			flex: "1",
			overflow: "auto",
			px: "6",
			py: "2",
		},
		closeTrigger: {
			insetEnd: "2",
			pos: "absolute",
			top: "3",
		},
		content: {
			_closed: {
				animationDuration: "slower",
				animationTimingFunction: "ease-in-smooth",
			},
			_open: {
				animationDuration: "slowest",
				animationTimingFunction: "ease-in-smooth",
			},
			bg: "bg.panel",
			boxShadow: "lg",
			color: "inherit",
			display: "flex",
			flexDirection: "column",
			maxH: "100dvh",
			outline: 0,
			position: "relative",
			textStyle: "sm",
			width: "100%",
			zIndex: "modal",
		},
		description: {
			color: "fg.muted",
		},
		footer: {
			alignItems: "center",
			display: "flex",
			gap: "3",
			justifyContent: "flex-end",
			pb: "4",
			pt: "2",
			px: "6",
		},
		header: {
			alignItems: "center",
			display: "flex",
			flex: 0,
			gap: "2",
			pb: "4",
			pt: "6",
			px: "6",
		},
		positioner: {
			display: "flex",
			height: "100dvh",
			insetInlineStart: 0,
			overscrollBehaviorY: "none",
			position: "fixed",
			top: 0,
			width: "100vw",
			zIndex: "modal",
		},
		title: {
			flex: "1",
			fontWeight: "semibold",
			textStyle: "lg",
		},
	},
	className: "chakra-drawer",
	defaultVariants: {
		placement: "end",
		size: "xs",
	},
	slots: [
		"trigger",
		"backdrop",
		"positioner",
		"content",
		"title",
		"description",
		"closeTrigger",
		"header",
		"body",
		"footer",
		"backdrop",
	],
	variants: {
		contained: {
			true: {
				content: {
					borderRadius: "l3",
				},
				positioner: {
					padding: "4",
				},
			},
		},
		placement: {
			bottom: {
				content: {
					_closed: {
						animationName: "slide-to-bottom-full, fade-out",
					},
					_open: {
						animationName: "slide-from-bottom-full, fade-in",
					},
					maxW: "100%",
				},
				positioner: {
					alignItems: "flex-end",
					justifyContent: "stretch",
				},
			},
			end: {
				content: {
					_closed: {
						animationName: {
							_rtl: "slide-to-left-full, fade-out",
							base: "slide-to-right-full, fade-out",
						},
					},
					_open: {
						animationName: {
							_rtl: "slide-from-left-full, fade-in",
							base: "slide-from-right-full, fade-in",
						},
					},
				},
				positioner: {
					alignItems: "stretch",
					justifyContent: "flex-end",
				},
			},
			start: {
				content: {
					_closed: {
						animationName: {
							_rtl: "slide-to-right-full, fade-out",
							base: "slide-to-left-full, fade-out",
						},
					},
					_open: {
						animationName: {
							_rtl: "slide-from-right-full, fade-in",
							base: "slide-from-left-full, fade-in",
						},
					},
				},
				positioner: {
					alignItems: "stretch",
					justifyContent: "flex-start",
				},
			},
			top: {
				content: {
					_closed: {
						animationName: "slide-to-top-full, fade-out",
					},
					_open: {
						animationName: "slide-from-top-full, fade-in",
					},
					maxW: "100%",
				},
				positioner: {
					alignItems: "flex-start",
					justifyContent: "stretch",
				},
			},
		},
		size: {
			full: {
				content: {
					h: "100dvh",
					maxW: "100vw",
				},
			},
			lg: {
				content: {
					maxW: "2xl",
				},
			},
			md: {
				content: {
					maxW: "lg",
				},
			},
			sm: {
				content: {
					maxW: "md",
				},
			},
			xl: {
				content: {
					maxW: "4xl",
				},
			},
			xs: {
				content: {
					maxW: "xs",
				},
			},
		},
	},
});
