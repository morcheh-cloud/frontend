import { defineSlotRecipe } from "@chakra-ui/react"

export const breadcrumbSlotRecipe = defineSlotRecipe({
	base: {
		ellipsis: {
			_icon: {
				boxSize: "1em",
			},
			alignItems: "center",
			display: "inline-flex",
			justifyContent: "center",
		},
		item: {
			alignItems: "center",
			display: "inline-flex",
		},
		link: {
			alignItems: "center",
			borderRadius: "l1",
			display: "inline-flex",
			focusRing: "outside",
			gap: "2",
			outline: "0",
			textDecoration: "none",
		},
		list: {
			alignItems: "center",
			color: "fg.muted",
			display: "flex",
			listStyle: "none",
			wordBreak: "break-word",
		},
		separator: {
			_icon: {
				boxSize: "1em",
			},
			_rtl: {
				rotate: "180deg",
			},
			color: "fg.muted",
			opacity: "0.8",
		},
	},
	className: "chakra-breadcrumb",
	defaultVariants: {
		size: "md",
		variant: "plain",
	},
	slots: [
		"link",
		"currentLink",
		"item",
		"list",
		"root",
		"ellipsis",
		"separator",
	],
	variants: {
		size: {
			lg: {
				list: {
					gap: "2",
					textStyle: "md",
				},
			},
			md: {
				list: {
					gap: "1.5",
					textStyle: "sm",
				},
			},
			sm: {
				list: {
					gap: "1",
					textStyle: "xs",
				},
			},
		},
		variant: {
			plain: {
				currentLink: {
					color: "fg",
				},
				link: {
					_hover: {
						color: "fg",
					},
					color: "fg.muted",
				},
			},
			underline: {
				currentLink: {
					color: "colorPalette.fg",
				},
				link: {
					color: "colorPalette.fg",
					textDecoration: "underline",
					textDecorationColor: "colorPalette.muted",
					textUnderlineOffset: "0.2em",
				},
			},
		},
	},
})
