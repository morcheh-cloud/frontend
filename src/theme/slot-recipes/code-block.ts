import { defineSlotRecipe } from "@chakra-ui/react";

export const codeBlockSlotRecipe = defineSlotRecipe({
	base: {
		code: {
			counterReset: "line 0",
			fontFamily: "mono",
			lineHeight: "tall",
			whiteSpace: "pre",
		},
		codeText: {
			"& [data-line]": {
				"--highlight-bg": "var(--code-block-highlight-bg)",
				"--highlight-border": "var(--code-block-highlight-border)",
				"&[data-diff='added']": {
					"--highlight-bg": "var(--code-block-highlight-added-bg)",
					"--highlight-border": "var(--code-block-highlight-added-border)",
				},
				"&[data-diff='removed']": {
					"--highlight-bg": "var(--code-block-highlight-removed-bg)",
					"--highlight-border": "var(--code-block-highlight-removed-border)",
				},
				"&[data-highlight], &[data-diff]": {
					"&:after": {
						bg: "var(--highlight-bg)",
						borderStartColor: "var(--highlight-border)",
						borderStartWidth: "2px",
						content: "''",
						display: "block",
						height: "100%",
						insetEnd: "0px",
						insetStart: "calc(var(--code-block-padding) * -1)",
						position: "absolute",
						width: "calc(100% + var(--code-block-padding) * 2)",
					},
					display: "inline-block",
					width: "full",
				},
				position: "relative",
			},
			"&[data-has-focused]": {
				"& [data-line]:not([data-focused])": {
					filter: "blur(var(--code-block-obscured-blur))",
					opacity: "var(--code-block-obscured-opacity)",
					transitionDuration: "moderate",
					transitionProperty: "opacity, filter",
					transitionTimingFunction: "ease-in-out",
				},
				"&:hover": {
					"--code-block-obscured-blur": "0px",
					"--code-block-obscured-opacity": "1",
				},
			},
			"&[data-has-line-numbers]": {
				"--content": "counter(line)",
				"& [data-diff='added']:before": {
					content: "'+'",
				},
				"& [data-diff='removed']:before": {
					content: "'-'",
				},
				"& [data-line]:before": {
					content: "var(--content)",
					counterIncrement: "line",
					display: "inline-block",
					marginRight: "var(--code-block-line-number-margin)",
					opacity: 0.4,
					textAlign: "end",
					userSelect: "none",
					width: "var(--code-block-line-number-width)",
				},
			},
			"&[data-has-line-numbers][data-plaintext]": {
				paddingInlineStart:
					"calc(var(--code-block-line-number-width) + var(--code-block-line-number-margin) + var(--code-block-padding))",
			},
			"&[data-word-wrap]": {
				"&[data-plaintext], & [data-line]": {
					whiteSpace: "pre-wrap",
					wordBreak: "break-all",
				},
			},
			display: "block",
			position: "relative",
			px: "var(--code-block-padding)",
			py: "var(--code-block-padding)",
			width: "100%",
		},
		content: {
			_expanded: {
				maxHeight: "unset",
			},
			"& ::selection": {
				bg: "blue.500/40",
			},
			borderBottomRadius: "var(--code-block-radius)",
			colorScheme: "dark",
			maxHeight: "var(--code-block-max-height)",
			overflow: "hidden",
			position: "relative",
		},
		control: {
			alignItems: "center",
			display: "inline-flex",
			gap: "1.5",
		},
		footer: {
			alignItems: "center",
			display: "flex",
			gap: "2",
			justifyContent: "center",
			minH: "var(--code-block-header-height)",
			px: "var(--code-block-padding)",
		},
		header: {
			alignItems: "center",
			display: "flex",
			gap: "2",
			mb: "calc(var(--code-block-padding) / 2 * -1)",
			minH: "var(--code-block-header-height)",
			position: "relative",
			px: "var(--code-block-padding)",
		},
		overlay: {
			_expanded: {
				display: "none",
			},
			"--bg": "{colors.black/50}",
			alignItems: "flex-end",
			bgImage: "linear-gradient(0deg,var(--bg) 25%,transparent 100%)",
			bottom: "0",
			color: "white",
			display: "flex",
			fontWeight: "medium",
			insetInline: "0",
			justifyContent: "center",
			minH: "5rem",
			padding: "4",
			pos: "absolute",
			zIndex: "1",
		},
		root: {
			"--code-block-bg": "colors.bg",
			"--code-block-fg": "colors.fg",
			"--code-block-highlight-added-bg": "{colors.green.focusRing/20}",
			"--code-block-highlight-added-border": "colors.green.focusRing",
			"--code-block-highlight-bg": "{colors.teal.focusRing/20}",
			"--code-block-highlight-border": "colors.teal.focusRing",
			"--code-block-highlight-removed-bg": "{colors.red.focusRing/20}",
			"--code-block-highlight-removed-border": "colors.red.focusRing",
			"--code-block-line-number-margin": "spacing.4",
			"--code-block-line-number-width": "sizes.3",
			"--code-block-max-height": "320px",
			"--code-block-obscured-blur": "1px",
			"--code-block-obscured-opacity": "0.5",
			bg: "bg",
			borderWidth: "1px",
			color: "fg",
			colorPalette: "gray",
			overflow: "hidden",
			rounded: "var(--code-block-radius)",
		},
		title: {
			alignItems: "center",
			color: "fg.muted",
			display: "inline-flex",
			flex: "1",
			gap: "1.5",
		},
	},
	className: "code-block",
	defaultVariants: {
		size: "md",
	},
	slots: [
		"root",
		"content",
		"title",
		"header",
		"footer",
		"control",
		"overlay",
		"code",
		"codeText",
		"copyTrigger",
		"copyIndicator",
		"collapseTrigger",
		"collapseIndicator",
		"collapseText",
	],
	variants: {
		size: {
			lg: {
				code: {
					fontSize: "sm",
				},
				root: {
					"--code-block-header-height": "sizes.12",
					"--code-block-padding": "spacing.5",
					"--code-block-radius": "radii.xl",
				},
				title: {
					textStyle: "sm",
				},
			},
			md: {
				code: {
					fontSize: "sm",
				},
				root: {
					"--code-block-header-height": "sizes.10",
					"--code-block-padding": "spacing.4",
					"--code-block-radius": "radii.lg",
				},
				title: {
					textStyle: "xs",
				},
			},
			sm: {
				code: {
					fontSize: "xs",
				},
				root: {
					"--code-block-header-height": "sizes.8",
					"--code-block-padding": "spacing.4",
					"--code-block-radius": "radii.md",
				},
				title: {
					textStyle: "xs",
				},
			},
		},
	},
});
