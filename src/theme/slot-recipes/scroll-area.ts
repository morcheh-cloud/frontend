import { defineSlotRecipe } from "@chakra-ui/react"

export const scrollAreaSlotRecipe = defineSlotRecipe({
	base: {
		content: {
			minWidth: "100%",
		},
		corner: {
			"&[data-hover]": {
				opacity: 1,
				transitionDelay: "0ms",
			},
			bg: "bg.muted",
			margin: "var(--scrollbar-margin)",
			opacity: 0,
			transition: "opacity 150ms 300ms",
		},
		root: {
			"--scrollbar-click-area":
				"calc(var(--scrollbar-size) + calc(var(--scrollbar-margin) * 2))",
			"--scrollbar-margin": "2px",
			display: "flex",
			flexDirection: "column",
			height: "100%",
			overflow: "hidden",
			position: "relative",
			width: "100%",
		},
		scrollbar: {
			_before: {
				content: '""',
				position: "absolute",
			},
			_horizontal: {
				"&::before": {
					height: "var(--scrollbar-click-area)",
					top: "calc(var(--scrollbar-margin) * -1)",
					width: "100%",
				},
				flexDirection: "row",
				height: "var(--scrollbar-size)",
			},
			_vertical: {
				"&::before": {
					height: "100%",
					insetInlineStart: "calc(var(--scrollbar-margin) * -1)",
					width: "var(--scrollbar-click-area)",
				},
				flexDirection: "column",
				width: "var(--scrollbar-size)",
			},
			"--thumb-bg": "{colors.colorPalette.solid/25}",
			"&:is(:hover, :active)": {
				"--thumb-bg": "{colors.colorPalette.solid/50}",
			},
			"&:not([data-overflow-x], [data-overflow-y])": {
				display: "none",
			},
			bg: "{colors.colorPalette.solid/10}",
			borderRadius: "full",
			colorPalette: "gray",
			display: "flex",
			margin: "var(--scrollbar-margin)",
			position: "relative",
			touchAction: "none",
			transition: "opacity 150ms 300ms",
			userSelect: "none",
		},
		thumb: {
			_horizontal: {
				height: "full",
			},
			_vertical: {
				width: "full",
			},
			bg: "var(--thumb-bg)",
			borderRadius: "inherit",
			transition: "backgrounds",
		},
		viewport: {
			"&::-webkit-scrollbar": {
				display: "none",
			},
			borderRadius: "inherit",
			display: "flex",
			flexDirection: "column",
			height: "100%",
			scrollbarWidth: "none",
			WebkitOverflowScrolling: "touch",
			width: "100%",
		},
	},
	className: "chakra-scroll-area",
	defaultVariants: {
		size: "md",
		variant: "hover",
	},
	slots: ["root", "viewport", "content", "scrollbar", "thumb", "corner"],
	variants: {
		size: {
			lg: {
				root: {
					"--scrollbar-size": "sizes.3",
				},
			},
			md: {
				root: {
					"--scrollbar-size": "sizes.2",
				},
			},
			sm: {
				root: {
					"--scrollbar-size": "sizes.1.5",
				},
			},
			xs: {
				root: {
					"--scrollbar-size": "sizes.1",
				},
			},
		},
		variant: {
			always: {
				scrollbar: {
					opacity: "1",
				},
			},
			hover: {
				scrollbar: {
					"&[data-hover], &[data-scrolling]": {
						opacity: "1",
						transitionDelay: "0ms",
						transitionDuration: "faster",
					},
					opacity: "0",
				},
			},
		},
	},
})
