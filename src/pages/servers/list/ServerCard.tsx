import {
	Badge,
	FormatByte,
	Group,
	Heading,
	HStack,
	Icon,
	IconButton,
	Menu,
	Portal,
	Stack,
	Status,
	Text,
} from "@chakra-ui/react"
import { Cpu, EllipsisVertical, HardDrive, MemoryStick, PcCase, Terminal } from "lucide-react"
import { type FunctionComponent, memo } from "react"
import { LuBugPlay, LuLockKeyhole, LuPencil, LuTerminal, LuTrash } from "react-icons/lu"
import Caption from "@/components/base/Caption"
import type { ServerModel } from "@/lib/services"

interface ServerCardProps {
	data: ServerModel
	onDelete?: (data: ServerModel) => void
}

const ServerCard: FunctionComponent<ServerCardProps> = ({ data, onDelete }) => {
	return (
		<>
			<Menu.Root>
				<Menu.ContextTrigger w="full">
					<Stack
						_hover={{
							borderColor: "black",
						}}
						w={"100%"}
						border={"1px solid"}
						borderColor={"gray.200"}
						borderRadius={8}
						cursor={"pointer"}
						gap={0}
						py={4}
					>
						<HStack alignItems={"start"} pl={4} pr={2}>
							<Stack alignItems={"start"} gap={1}>
								<Heading size={"md"} fontWeight={500} lineClamp={1}>
									{data.name}
								</Heading>
								<Caption fontSize={13}>{data.address}</Caption>
							</Stack>

							<IconButton ml={"auto"} rounded={"full"} variant={"ghost"} size={"sm"}>
								<EllipsisVertical />
							</IconButton>
						</HStack>

						<HStack mt={6} px={4}>
							<Icon size={"sm"}>
								<PcCase />
							</Icon>
							<Text fontSize={14}>Ubuntu 22.04</Text>

							<Badge ml={"auto"} variant={"plain"} colorPalette={"teal"}>
								<Status.Root fontSize={13} fontWeight={500}>
									<Status.Indicator />
									online
								</Status.Root>
							</Badge>
						</HStack>

						<HStack px={4} mt={2.5} justify={"space-between"}>
							<Group gap={1}>
								<Text>16</Text>
								<Icon size={"md"}>
									<Cpu />
								</Icon>
							</Group>

							<Group gap={2}>
								<FormatByte value={400000000} />
								<Icon size={"md"}>
									<HardDrive />
								</Icon>
							</Group>

							<Group gap={1}>
								<FormatByte value={16000000000} />
								<Icon size={"md"}>
									<MemoryStick />
								</Icon>
							</Group>

							<Group gap={1}>
								<Icon size={"md"}>
									<Terminal />
								</Icon>
								<Text>ssh</Text>
							</Group>
						</HStack>
					</Stack>
				</Menu.ContextTrigger>

				<Portal>
					<Menu.Positioner>
						<Menu.Content minW={180}>
							<Menu.Item value="rename">
								<LuPencil />
								Rename
							</Menu.Item>

							<Menu.Item value="secret">
								<LuLockKeyhole />
								Secret
							</Menu.Item>

							<Menu.Item value="terminal">
								<LuTerminal />
								Terminal
							</Menu.Item>

							<Menu.Item value="debug">
								<LuBugPlay />
								Debug
							</Menu.Item>
							<Menu.Item
								value="delete"
								color={"fg.error"}
								_hover={{ bg: "bg.error" }}
								onClick={() => {
									onDelete?.(data)
								}}
							>
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

export default memo(ServerCard)
