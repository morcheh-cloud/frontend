import {
	Avatar,
	Button,
	HStack,
	Icon,
	Kbd,
	Menu,
	Portal,
	Text,
} from "@chakra-ui/react"
import { ChevronUp, Plus } from "lucide-react"
import { type FunctionComponent, useState } from "react"
import useAuth from "@/hooks/useAuth"
import useWorkspace from "@/hooks/useWorkspace"

interface SelectWorkspaceProps {}

const SelectWorkspace: FunctionComponent<SelectWorkspaceProps> = () => {
	const { user, changeWorkspace } = useAuth()
	const workspaces = user?.workspaces || []
	const workspace = useWorkspace()
	const [open, setOpen] = useState(false)

	return (
		<>
			<Menu.Root
				open={open}
				onOpenChange={(e) => setOpen(e.open)}
				positioning={{ placement: "bottom-start" }}
			>
				<Menu.Trigger asChild>
					<Button variant="plain" size="sm" w={"100%"} justifyContent={"start"}>
						<Avatar.Root size={"xs"} rounded={"lg"}>
							<Avatar.Image />
						</Avatar.Root>

						<Text fontWeight={400}>{workspace?.name}</Text>

						<Icon ml={"auto"}>
							<ChevronUp
								style={{
									transform: open ? "rotate(180deg)" : "rotate(0deg)",
									transition: "transform 0.2s",
								}}
							/>
						</Icon>
					</Button>
				</Menu.Trigger>

				<Portal>
					<Menu.Positioner>
						<Menu.Content width={300}>
							{workspaces.map((workspace, index) => (
								<Menu.Item
									cursor={"pointer"}
									key={workspace.id}
									value={workspace.id || ""}
									onClick={() => {
										if (workspace.id) {
											changeWorkspace(workspace.id)
											setOpen(false)
										}
									}}
								>
									<HStack w="100%">
										<Avatar.Root size={"xs"} rounded={"lg"}>
											<Avatar.Fallback name={workspace.name} />
											<Avatar.Image />
										</Avatar.Root>

										<Text lineClamp={1}>{workspace.name}</Text>

										<Kbd ml={"auto"} fontWeight={600} fontSize={10}>
											Ctrl + {index + 1}
										</Kbd>
									</HStack>
								</Menu.Item>
							))}

							<Menu.Separator />

							<Menu.Item cursor={"pointer"} value="add">
								<Icon size={"sm"}>
									<Plus />
								</Icon>
								Add Workspace
							</Menu.Item>

							{/*  */}
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu.Root>
		</>
	)
}

export default SelectWorkspace
