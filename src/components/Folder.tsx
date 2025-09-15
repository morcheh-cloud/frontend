import { Button, type ButtonProps, IconButton, Text } from "@chakra-ui/react"
import { EllipsisVertical } from "lucide-react"
import type { FunctionComponent } from "react"
import { FaFolder } from "react-icons/fa6"

interface FolderProps extends ButtonProps {
	name?: string
	onClick?: () => void
	isSelected?: boolean
}

const Folder: FunctionComponent<FolderProps> = (props) => {
	const { name, isSelected, ...rest } = props

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
				{...(isSelected && {
					_hover: { bg: "blue.200" },
					bg: "blue.100",
					border: "1px solid",
					borderColor: "blue.500",
				})}
				{...rest}
			>
				<FaFolder />

				<Text fontSize={14} fontWeight={400} mr={"auto"}>
					{name || "-"}
				</Text>

				<IconButton rounded={"full"} size={"xs"} variant={"ghost"}>
					<EllipsisVertical />
				</IconButton>
			</Button>
		</>
	)
}

export default Folder
