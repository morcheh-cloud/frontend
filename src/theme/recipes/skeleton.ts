import { defineRecipe } from "@chakra-ui/react"

export const skeletonRecipe = defineRecipe({
	base: {},
	className: "chakra-skeleton",
	defaultVariants: {
		loading: true,
		variant: "pulse",
	},
	variants: {
		loading: {
			false: {
				animation: "fade-in var(--fade-duration, 0.1s) ease-out !important",
				background: "unset",
			},
			true: {
				"&::before, &::after, *": {
					visibility: "hidden",
				},
				backgroundClip: "padding-box",
				borderRadius: "l2",
				boxShadow: "none",
				color: "transparent",
				cursor: "default",
				flexShrink: "0",
				pointerEvents: "none",
				userSelect: "none",
			},
		},
		variant: {
			none: {
				animation: "none",
			},
			pulse: {
				animation: "pulse",
				animationDuration: "var(--duration, 1.2s)",
				background: "bg.emphasized",
			},
			shine: {
				"--animate-from": "200%",
				"--animate-to": "-200%",
				"--end-color": "colors.bg.emphasized",
				"--start-color": "colors.bg.muted",
				animation: "bg-position var(--duration, 5s) ease-in-out infinite",
				backgroundImage:
					"linear-gradient(270deg,var(--start-color),var(--end-color),var(--end-color),var(--start-color))",
				backgroundSize: "400% 100%",
			},
		},
	},
})
