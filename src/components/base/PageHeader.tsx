import { Heading, HStack, Stack, type StackProps } from "@chakra-ui/react"
import type { FunctionComponent, ReactNode } from "react"
import Caption from "@/components/base/Caption"

interface PageHeaderProps extends StackProps {
	title: string
	description?: string
	children?: ReactNode
}

const PageHeader: FunctionComponent<PageHeaderProps> = ({
	title,
	description,
	children,
	...rest
}) => {
	return (
		<>
			<HStack {...rest}>
				<Stack mr={"auto"}>
					<Stack gap={1} mr="auto">
						<Heading size={"3xl"}>{title}</Heading>
						<Caption>{description}</Caption>
					</Stack>
				</Stack>

				{children}
			</HStack>
		</>
	)
}

export default PageHeader
