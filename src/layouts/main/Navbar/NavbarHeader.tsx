import {
	Avatar,
	Box,
	Heading,
	HStack,
	Separator,
	Stack,
} from "@chakra-ui/react"
import type { FunctionComponent } from "react"
import Caption from "@/components/base/Caption"
import SelectWorkspace from "@/layouts/main/Navbar/SelectWorkspace"

interface NavbarHeaderProps {}

const NavbarHeader: FunctionComponent<NavbarHeaderProps> = () => {
	return (
		<>
			<Box mb={4}>
				<HStack gap={2} mb={2} p={2} px={3}>
					<Avatar.Root rounded={"lg"}>
						<Avatar.Fallback name="ali" />
						<Avatar.Image />
					</Avatar.Root>

					<Stack gap={0}>
						<Heading fontWeight={500}>Morcheh</Heading>
						<Caption mt={-1} fontSize={12}>
							admin
						</Caption>
					</Stack>
				</HStack>

				<Separator my={2} />

				<SelectWorkspace />

				<Separator m={2} mb={0} />
			</Box>
		</>
	)
}

export default NavbarHeader
