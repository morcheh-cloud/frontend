import { defineSlotRecipe } from "@chakra-ui/react"

export const dialogSlotRecipe = defineSlotRecipe({
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
			left: 0,
			pos: "fixed",
			top: 0,
			w: "100dvw",
			zIndex: "var(--z-index)",
		},
		body: {
			flex: "1",
			pb: "6",
			pt: "2",
			px: "6",
		},
		closeTrigger: {
			insetEnd: "2",
			pos: "absolute",
			top: "2",
		},
		content: {
			_closed: {
				animationDuration: "faster",
			},
			_open: {
				animationDuration: "moderate",
			},
			"--dialog-z-index": "zIndex.modal",
			bg: "bg.panel",
			borderRadius: "l3",
			boxShadow: "lg",
			display: "flex",
			flexDirection: "column",
			my: "var(--dialog-margin, var(--dialog-base-margin))",
			outline: 0,
			position: "relative",
			textStyle: "sm",
			width: "100%",
			zIndex: "calc(var(--dialog-z-index) + var(--layer-index, 0))",
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
			display: "flex",
			flex: 0,
			gap: "2",
			pb: "4",
			pt: "6",
			px: "6",
		},
		positioner: {
			"--dialog-z-index": "zIndex.modal",
			display: "flex",
			height: "100dvh",
			justifyContent: "center",
			left: 0,
			overscrollBehaviorY: "none",
			position: "fixed",
			top: 0,
			width: "100dvw",
			zIndex: "calc(var(--dialog-z-index) + var(--layer-index, 0))",
		},
		title: {
			fontWeight: "semibold",
			textStyle: "lg",
		},
	},
	className: "chakra-dialog",
	defaultVariants: {
		motionPreset: "scale",
		placement: "top",
		scrollBehavior: "outside",
		size: "md",
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
		motionPreset: {
			none: {},
			scale: {
				content: {
					_closed: {
						animationName: "scale-out, fade-out",
					},
					_open: {
						animationName: "scale-in, fade-in",
					},
				},
			},
			"slide-in-bottom": {
				content: {
					_closed: {
						animationName: "slide-to-bottom, fade-out",
					},
					_open: {
						animationName: "slide-from-bottom, fade-in",
					},
				},
			},
			"slide-in-left": {
				content: {
					_closed: {
						animationName: "slide-to-left, fade-out",
					},
					_open: {
						animationName: "slide-from-left, fade-in",
					},
				},
			},
			"slide-in-right": {
				content: {
					_closed: {
						animationName: "slide-to-right, fade-out",
					},
					_open: {
						animationName: "slide-from-right, fade-in",
					},
				},
			},
			"slide-in-top": {
				content: {
					_closed: {
						animationName: "slide-to-top, fade-out",
					},
					_open: {
						animationName: "slide-from-top, fade-in",
					},
				},
			},
		},
		placement: {
			bottom: {
				content: {
					"--dialog-base-margin": "spacing.16",
					mx: "auto",
				},
				positioner: {
					alignItems: "flex-end",
				},
			},
			center: {
				content: {
					"--dialog-base-margin": "auto",
					mx: "auto",
				},
				positioner: {
					alignItems: "center",
				},
			},
			top: {
				content: {
					"--dialog-base-margin": "spacing.16",
					mx: "auto",
				},
				positioner: {
					alignItems: "flex-start",
				},
			},
		},
		scrollBehavior: {
			inside: {
				body: {
					overflow: "auto",
				},
				content: {
					maxH: "calc(100% - 7.5rem)",
				},
				positioner: {
					overflow: "hidden",
				},
			},
			outside: {
				positioner: {
					overflow: "auto",
					pointerEvents: "auto",
				},
			},
		},
		size: {
			cover: {
				content: {
					"--dialog-margin": "0",
					height: "100%",
					width: "100%",
				},
				positioner: {
					padding: "10",
				},
			},
			full: {
				content: {
					"--dialog-margin": "0",
					borderRadius: "0",
					maxW: "100dvw",
					minH: "100dvh",
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
					maxW: "sm",
				},
			},
		},
	},
})
