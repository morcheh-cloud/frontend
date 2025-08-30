import { Stack, type StackProps } from "@chakra-ui/react"
import type { FunctionComponent } from "react"

interface PageContainerProps extends StackProps {}

const PageContainer: FunctionComponent<PageContainerProps> = (props) => {
	const { children, ...rest } = props

	return (
		<>
			<Stack
				display={"flex"}
				flexDirection={"column"}
				gap={0}
				height={"100%"}
				maxW={"8xl"}
				mx={"auto"}
				p={4}
				w={"100%"}
				{...rest}
			>
				{children}
			</Stack>
		</>
	)
}

export default PageContainer
