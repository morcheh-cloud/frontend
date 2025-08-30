import { Badge, Button, IconButton, Text } from "@chakra-ui/react"
import { EllipsisVertical } from "lucide-react"
import type { FunctionComponent } from "react"
import { FaFolder } from "react-icons/fa6"

interface PlaybookFolderProps {}

const PlaybookFolder: FunctionComponent<PlaybookFolderProps> = () => {
	return (
		<>
			<Button
				_hover={{
					bg: "gray.200",
				}}
				bg={"gray.100"}
				justifyContent={"start"}
				rounded={"lg"}
				size={"xl"}
				variant={"plain"}
			>
				<FaFolder />

				<Text fontSize={14} mr={"auto"}>
					Ansible
				</Text>

				<Badge variant={"subtle"}>12</Badge>
				<IconButton rounded={"full"} size={"xs"} variant={"ghost"}>
					<EllipsisVertical />
				</IconButton>
			</Button>
		</>
	)
}

export default PlaybookFolder
