import { defineSlotRecipe } from "@chakra-ui/react"

export const cardSlotRecipe = defineSlotRecipe({
	base: {
		body: {
			display: "flex",
			flex: "1",
			flexDirection: "column",
			padding: "var(--card-padding)",
		},
		description: {
			color: "fg.muted",
			fontSize: "sm",
		},
		footer: {
			alignItems: "center",
			display: "flex",
			gap: "2",
			paddingBottom: "var(--card-padding)",
			paddingInline: "var(--card-padding)",
		},
		header: {
			display: "flex",
			flexDirection: "column",
			gap: "1.5",
			paddingInline: "var(--card-padding)",
			paddingTop: "var(--card-padding)",
		},
		root: {
			borderRadius: "l3",
			color: "fg",
			display: "flex",
			flexDirection: "column",
			minWidth: "0",
			position: "relative",
			textAlign: "start",
			wordWrap: "break-word",
		},
		title: {
			fontWeight: "semibold",
		},
	},
	className: "chakra-card",
	defaultVariants: {
		size: "md",
		variant: "outline",
	},
	slots: ["root", "header", "body", "footer", "title", "description"],
	variants: {
		size: {
			lg: {
				root: {
					"--card-padding": "spacing.7",
				},
				title: {
					textStyle: "xl",
				},
			},
			md: {
				root: {
					"--card-padding": "spacing.6",
				},
				title: {
					textStyle: "lg",
				},
			},
			sm: {
				root: {
					"--card-padding": "spacing.4",
				},
				title: {
					textStyle: "md",
				},
			},
		},
		variant: {
			elevated: {
				root: {
					bg: "bg.panel",
					boxShadow: "md",
				},
			},
			outline: {
				root: {
					bg: "bg.panel",
					borderColor: "border",
					borderWidth: "1px",
				},
			},
			subtle: {
				root: {
					bg: "bg.muted",
				},
			},
		},
	},
})
