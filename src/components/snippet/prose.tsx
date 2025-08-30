"use client"

import { chakra } from "@chakra-ui/react"

const TRAILING_PSEUDO_REGEX = /(::?[\w-]+(?:\([^)]*\))?)+$/
const EXCLUDE_CLASSNAME = ".not-prose"
function inWhere<T extends string>(selector: T): T {
	const rebuiltSelector = selector.startsWith("& ")
		? selector.slice(2)
		: selector
	const match = selector.match(TRAILING_PSEUDO_REGEX)
	const pseudo = match ? match[0] : ""
	const base = match ? selector.slice(0, -match[0].length) : rebuiltSelector
	return `& :where(${base}):not(${EXCLUDE_CLASSNAME}, ${EXCLUDE_CLASSNAME} *)${pseudo}` as T
}

export const Prose = chakra("div", {
	base: {
		color: "fg.muted",
		fontSize: "sm",
		lineHeight: "1.7em",
		maxWidth: "65ch",
		[inWhere("& p")]: {
			marginBottom: "1em",
			marginTop: "1em",
		},
		[inWhere("& blockquote")]: {
			borderInlineStartWidth: "0.25em",
			color: "fg",
			marginBottom: "1.285em",
			marginTop: "1.285em",
			paddingInline: "1.285em",
		},
		[inWhere("& a")]: {
			color: "fg",
			fontWeight: "500",
			textDecoration: "underline",
			textDecorationColor: "border.muted",
			textDecorationThickness: "2px",
			textUnderlineOffset: "3px",
		},
		[inWhere("& strong")]: {
			fontWeight: "600",
		},
		[inWhere("& a strong")]: {
			color: "inherit",
		},
		[inWhere("& h1")]: {
			fontSize: "2.15em",
			letterSpacing: "-0.02em",
			lineHeight: "1.2em",
			marginBottom: "0.8em",
			marginTop: "0",
		},
		[inWhere("& h2")]: {
			fontSize: "1.4em",
			letterSpacing: "-0.02em",
			lineHeight: "1.4em",
			marginBottom: "0.8em",
			marginTop: "1.6em",
		},
		[inWhere("& h3")]: {
			fontSize: "1.285em",
			letterSpacing: "-0.01em",
			lineHeight: "1.5em",
			marginBottom: "0.4em",
			marginTop: "1.5em",
		},
		[inWhere("& h4")]: {
			letterSpacing: "-0.01em",
			lineHeight: "1.5em",
			marginBottom: "0.5em",
			marginTop: "1.4em",
		},
		[inWhere("& img")]: {
			borderRadius: "lg",
			boxShadow: "inset",
			marginBottom: "1.7em",
			marginTop: "1.7em",
		},
		[inWhere("& picture")]: {
			marginBottom: "1.7em",
			marginTop: "1.7em",
		},
		[inWhere("& picture > img")]: {
			marginBottom: "0",
			marginTop: "0",
		},
		[inWhere("& video")]: {
			marginBottom: "1.7em",
			marginTop: "1.7em",
		},
		[inWhere("& kbd")]: {
			"--shadow": "colors.border",
			borderRadius: "xs",
			boxShadow: "0 0 0 1px var(--shadow),0 1px 0 1px var(--shadow)",
			color: "fg.muted",
			fontFamily: "inherit",
			fontSize: "0.85em",
			paddingBottom: "0.15em",
			paddingInlineEnd: "0.35em",
			paddingInlineStart: "0.35em",
			paddingTop: "0.15em",
		},
		[inWhere("& code")]: {
			borderRadius: "md",
			borderWidth: "1px",
			fontSize: "0.925em",
			letterSpacing: "-0.01em",
			padding: "0.25em",
		},
		[inWhere("& pre code")]: {
			borderWidth: "inherit",
			fontSize: "inherit",
			letterSpacing: "inherit",
			padding: "0",
		},
		[inWhere("& h2 code")]: {
			fontSize: "0.9em",
		},
		[inWhere("& h3 code")]: {
			fontSize: "0.8em",
		},
		[inWhere("& pre")]: {
			backgroundColor: "bg.subtle",
			borderRadius: "md",
			fontSize: "0.9em",
			fontWeight: "400",
			marginBottom: "1.6em",
			marginTop: "1.6em",
			overflowX: "auto",
			paddingBottom: "0.65em",
			paddingInlineEnd: "1em",
			paddingInlineStart: "1em",
			paddingTop: "0.65em",
		},
		[inWhere("& ol")]: {
			marginBottom: "1em",
			marginTop: "1em",
			paddingInlineStart: "1.5em",
		},
		[inWhere("& ul")]: {
			marginBottom: "1em",
			marginTop: "1em",
			paddingInlineStart: "1.5em",
		},
		[inWhere("& li")]: {
			marginBottom: "0.285em",
			marginTop: "0.285em",
		},
		[inWhere("& ol > li")]: {
			"&::marker": {
				color: "fg.muted",
			},
			listStyleType: "decimal",
			paddingInlineStart: "0.4em",
		},
		[inWhere("& ul > li")]: {
			"&::marker": {
				color: "fg.muted",
			},
			listStyleType: "disc",
			paddingInlineStart: "0.4em",
		},
		[inWhere("& > ul > li p")]: {
			marginBottom: "0.5em",
			marginTop: "0.5em",
		},
		[inWhere("& > ul > li > p:first-of-type")]: {
			marginTop: "1em",
		},
		[inWhere("& > ul > li > p:last-of-type")]: {
			marginBottom: "1em",
		},
		[inWhere("& > ol > li > p:first-of-type")]: {
			marginTop: "1em",
		},
		[inWhere("& > ol > li > p:last-of-type")]: {
			marginBottom: "1em",
		},
		[inWhere("& ul ul, ul ol, ol ul, ol ol")]: {
			marginBottom: "0.5em",
			marginTop: "0.5em",
		},
		[inWhere("& dl")]: {
			marginBottom: "1em",
			marginTop: "1em",
		},
		[inWhere("& dt")]: {
			fontWeight: "600",
			marginTop: "1em",
		},
		[inWhere("& dd")]: {
			marginTop: "0.285em",
			paddingInlineStart: "1.5em",
		},
		[inWhere("& hr")]: {
			marginBottom: "2.25em",
			marginTop: "2.25em",
		},
		[inWhere("& :is(h1,h2,h3,h4,h5,hr) + *")]: {
			marginTop: "0",
		},
		[inWhere("& table")]: {
			lineHeight: "1.5em",
			marginBottom: "2em",
			marginTop: "2em",
			tableLayout: "auto",
			textAlign: "start",
			width: "100%",
		},
		[inWhere("& thead")]: {
			borderBottomWidth: "1px",
			color: "fg",
		},
		[inWhere("& tbody tr")]: {
			borderBottomColor: "border",
			borderBottomWidth: "1px",
		},
		[inWhere("& thead th")]: {
			fontWeight: "medium",
			paddingBottom: "0.65em",
			paddingInlineEnd: "1em",
			paddingInlineStart: "1em",
			textAlign: "start",
		},
		[inWhere("& thead th:first-of-type")]: {
			paddingInlineStart: "0",
		},
		[inWhere("& thead th:last-of-type")]: {
			paddingInlineEnd: "0",
		},
		[inWhere("& tbody td, tfoot td")]: {
			paddingBottom: "0.65em",
			paddingInlineEnd: "1em",
			paddingInlineStart: "1em",
			paddingTop: "0.65em",
		},
		[inWhere("& tbody td:first-of-type, tfoot td:first-of-type")]: {
			paddingInlineStart: "0",
		},
		[inWhere("& tbody td:last-of-type, tfoot td:last-of-type")]: {
			paddingInlineEnd: "0",
		},
		[inWhere("& figure")]: {
			marginBottom: "1.625em",
			marginTop: "1.625em",
		},
		[inWhere("& figure > *")]: {
			marginBottom: "0",
			marginTop: "0",
		},
		[inWhere("& figcaption")]: {
			color: "fg.muted",
			fontSize: "0.85em",
			lineHeight: "1.25em",
			marginTop: "0.85em",
		},
		[inWhere("& h1, h2, h3, h4")]: {
			color: "fg",
			fontWeight: "600",
		},
	},
	defaultVariants: {
		size: "md",
	},
	variants: {
		size: {
			lg: {
				fontSize: "md",
			},
			md: {
				fontSize: "sm",
			},
		},
	},
})
