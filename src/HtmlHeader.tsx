import type { FunctionComponent } from "react"

interface HtmlHeaderProps {}

const HtmlHeader: FunctionComponent<HtmlHeaderProps> = () => {
	return (
		<>
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
			<link
				href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap"
				rel="stylesheet"
			/>

			{/*  */}
			<meta charSet="utf-8" />
			<meta
				content="width=device-width, initial-scale=1, maximum-scale=1"
				name="viewport"
			/>
		</>
	)
}

export default HtmlHeader
