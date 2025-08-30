import { Text, type TextProps } from "@chakra-ui/react"
import type { FunctionComponent } from "react"

interface CaptionProps extends TextProps {}

const Caption: FunctionComponent<CaptionProps> = (props) => {
	const { children, ...rest } = props

	return (
		<>
			<Text fontSize={14} opacity={0.5} {...rest}>
				{children}
			</Text>
		</>
	)
}

export default Caption
