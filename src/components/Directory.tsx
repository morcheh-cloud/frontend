import { Button, type ButtonProps, IconButton, Menu, Portal, Text } from "@chakra-ui/react"
import { EllipsisVertical } from "lucide-react"
import { type FunctionComponent, memo } from "react"
import { FaFolder } from "react-icons/fa6"
import { LuPencil, LuTrash } from "react-icons/lu"

interface FolderProps extends ButtonProps {
	name?: string
	onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
	isSelected?: boolean
}

const Directory: FunctionComponent<FolderProps> = (props) => {
	const { name, isSelected, ...rest } = props

	return (
		<>
			<Menu.Root>
				<Menu.ContextTrigger w="full">
					<Button
						_hover={{
							bg: "gray.200",
						}}
						w={"full"}
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
				</Menu.ContextTrigger>

				<Portal>
					<Menu.Positioner>
						<Menu.Content>
							<Menu.Item value="open">Open</Menu.Item>
							<Menu.Item value="rename">
								<LuPencil />
								Rename
							</Menu.Item>

							<Menu.Item value="delete" color={"fg.error"} _hover={{ bg: "bg.error" }} onClick={() => {}}>
								<LuTrash />
								Delete
							</Menu.Item>
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu.Root>
		</>
	)
}

export default memo(Directory)
