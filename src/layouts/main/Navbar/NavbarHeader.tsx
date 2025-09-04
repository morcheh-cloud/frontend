import { Avatar, Flex, IconButton, Stack, Text } from "@chakra-ui/react"
import type { FunctionComponent } from "react"
import { CgArrowsExchangeV } from "react-icons/cg"

interface NavbarHeaderProps {}

const NavbarHeader: FunctionComponent<NavbarHeaderProps> = () => {
	return (
		<>
			<Flex gap={2} mb={2} p={4}>
				<Avatar.Root shape={"rounded"}>
					<Avatar.Image alt="Avatar" src="https://bit.ly/broken-link" />
					<Avatar.Fallback>AB</Avatar.Fallback>
				</Avatar.Root>

				<Stack gap={0}>
					<Text fontSize={14} fontWeight={600}>
						Ahanonline
					</Text>
					<Text fontSize={11} fontStyle={"italic"}>
						ID: 1451245
					</Text>
				</Stack>

				<IconButton ml={"auto"} size={"xs"} variant={"ghost"}>
					<CgArrowsExchangeV />
				</IconButton>
			</Flex>
		</>
	)
}

export default NavbarHeader
