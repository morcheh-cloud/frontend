import { Heading, HStack, Stack, type StackProps } from "@chakra-ui/react"
import type { FunctionComponent, ReactNode } from "react"

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
					<HStack gap={0}>
						{/* <IconButton opacity={0.5} variant={"plain"}>
							<ArrowLeft />
						</IconButton> */}
						<Heading size={"2xl"}>Add new playbook</Heading>
					</HStack>
				</Stack>

				{children}
			</HStack>
		</>
	)
}

export default PageHeader
