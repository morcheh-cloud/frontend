import { defineSlotRecipe } from "@chakra-ui/react";

export const avatarSlotRecipe = defineSlotRecipe({
	base: {
		fallback: {
			borderRadius: "var(--avatar-radius)",
			fontSize: "var(--avatar-font-size)",
			fontWeight: "medium",
			lineHeight: "1",
			textTransform: "uppercase",
		},
		image: {
			borderRadius: "var(--avatar-radius)",
			height: "100%",
			objectFit: "cover",
			width: "100%",
		},
		root: {
			"&[data-group-item]": {
				borderColor: "bg",
				borderWidth: "2px",
			},
			alignItems: "center",
			borderRadius: "var(--avatar-radius)",
			display: "inline-flex",
			flexShrink: "0",
			fontSize: "var(--avatar-font-size)",
			fontWeight: "medium",
			height: "var(--avatar-size)",
			justifyContent: "center",
			position: "relative",
			userSelect: "none",
			verticalAlign: "top",
			width: "var(--avatar-size)",
		},
	},
	className: "chakra-avatar",
	defaultVariants: {
		shape: "full",
		size: "md",
		variant: "subtle",
	},
	slots: ["root", "image", "fallback"],
	variants: {
		borderless: {
			true: {
				root: {
					"&[data-group-item]": {
						borderWidth: "0px",
					},
				},
			},
		},
		shape: {
			full: {
				root: {
					"--avatar-radius": "radii.full",
				},
			},
			rounded: {
				root: {
					"--avatar-radius": "radii.l3",
				},
			},
			square: {},
		},
		size: {
			"2xl": {
				root: {
					"--avatar-font-size": "fontSizes.xl",
					"--avatar-size": "sizes.16",
				},
			},
			"2xs": {
				root: {
					"--avatar-font-size": "fontSizes.2xs",
					"--avatar-size": "sizes.6",
				},
			},
			full: {
				root: {
					"--avatar-font-size": "100%",
					"--avatar-size": "100%",
				},
			},
			lg: {
				root: {
					"--avatar-font-size": "fontSizes.md",
					"--avatar-size": "sizes.11",
				},
			},
			md: {
				root: {
					"--avatar-font-size": "fontSizes.md",
					"--avatar-size": "sizes.10",
				},
			},
			sm: {
				root: {
					"--avatar-font-size": "fontSizes.sm",
					"--avatar-size": "sizes.9",
				},
			},
			xl: {
				root: {
					"--avatar-font-size": "fontSizes.lg",
					"--avatar-size": "sizes.12",
				},
			},
			xs: {
				root: {
					"--avatar-font-size": "fontSizes.xs",
					"--avatar-size": "sizes.8",
				},
			},
		},
		variant: {
			outline: {
				root: {
					borderColor: "colorPalette.muted",
					borderWidth: "1px",
					color: "colorPalette.fg",
				},
			},
			solid: {
				root: {
					bg: "colorPalette.solid",
					color: "colorPalette.contrast",
				},
			},
			subtle: {
				root: {
					bg: "colorPalette.muted",
					color: "colorPalette.fg",
				},
			},
		},
	},
});
