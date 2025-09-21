import { Flex, Stack } from "@chakra-ui/react"
import type { FunctionComponent } from "react"
import SFTPContent from "@/pages/servers/[id]/SFTP/content"
import SFTPInformation from "@/pages/servers/[id]/SFTP/information"
import SFTPList from "@/pages/servers/[id]/SFTP/List"

interface SFTPProps {}

const SFTP: FunctionComponent<SFTPProps> = () => {
	return (
		<>
			<Flex h={"full"}>
				{/*  */}
				<Stack h={"full"} w={300} overflow={"hidden"}>
					<SFTPList />
				</Stack>

				<Stack h={"full"} flex={1} overflow={"hidden"}>
					<SFTPContent />
				</Stack>

				<Stack h={"full"} w={300} overflow={"hidden"}>
					<SFTPInformation />
				</Stack>
			</Flex>
		</>
	)
}

export default SFTP
