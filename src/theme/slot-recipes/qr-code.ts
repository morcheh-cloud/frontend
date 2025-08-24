import { defineSlotRecipe } from "@chakra-ui/react";

export const qrCodeSlotRecipe = defineSlotRecipe({
	base: {
		frame: {
			fill: "currentColor",
			height: "var(--qr-code-size)",
			width: "var(--qr-code-size)",
		},
		overlay: {
			alignItems: "center",
			bg: "bg",
			display: "flex",
			height: "var(--qr-code-overlay-size)",
			justifyContent: "center",
			padding: "1",
			rounded: "l1",
			width: "var(--qr-code-overlay-size)",
		},
		root: {
			"--qr-code-overlay-size": "calc(var(--qr-code-size) / 3)",
			position: "relative",
			width: "fit-content",
		},
	},
	className: "chakra-qr-code",
	defaultVariants: {
		size: "md",
	},
	slots: ["root", "frame", "pattern", "overlay", "downloadTrigger"],
	variants: {
		size: {
			"2xl": {
				root: {
					"--qr-code-size": "240px",
				},
			},
			"2xs": {
				root: {
					"--qr-code-size": "40px",
				},
			},
			full: {
				root: {
					"--qr-code-size": "100%",
				},
			},
			lg: {
				root: {
					"--qr-code-size": "160px",
				},
			},
			md: {
				root: {
					"--qr-code-size": "120px",
				},
			},
			sm: {
				root: {
					"--qr-code-size": "80px",
				},
			},
			xl: {
				root: {
					"--qr-code-size": "200px",
				},
			},
			xs: {
				root: {
					"--qr-code-size": "64px",
				},
			},
		},
	},
});
