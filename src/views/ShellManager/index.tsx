import { CloseButton, HStack, IconButton, Tabs } from "@chakra-ui/react"
import { Maximize } from "lucide-react"
import { type FunctionComponent, useState } from "react"
import ShellDrawer from "@/views/ShellManager/ShellDrawer"

interface TerminalViewProps {}

const TerminalView: FunctionComponent<TerminalViewProps> = () => {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<>
			<ShellDrawer>
				<HStack borderBottom={"1px solid"} borderColor={"border"}>
					<Tabs.Root variant={"line"}>
						<Tabs.List borderBottom={"none"}>
							<Tabs.Trigger value="1">
								server 1
								<CloseButton size={"2xs"} />
							</Tabs.Trigger>

							<Tabs.Trigger value="2">
								server 2
								<CloseButton size={"2xs"} />
							</Tabs.Trigger>

							<Tabs.Trigger value="3">
								server 3
								<CloseButton size={"2xs"} />
							</Tabs.Trigger>

							<Tabs.Trigger value="4">
								server 4
								<CloseButton size={"2xs"} />
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>

					<HStack ml={"auto"} my={"auto"} height={"100%"} pr={2}>
						<IconButton variant={"ghost"}>
							<Maximize />
						</IconButton>
					</HStack>
				</HStack>
			</ShellDrawer>
		</>
	)
}

export default TerminalView
