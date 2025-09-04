import { Box, HStack, IconButton } from "@chakra-ui/react"
import { Bell, Bot, LayoutGrid, Search, Terminal } from "lucide-react"
import type { FunctionComponent } from "react"
import Back from "@/components/base/Back"
import { Tooltip } from "@/components/base/Tooltip"

interface HeaderProps {
	height: string | number
}

const Header: FunctionComponent<HeaderProps> = () => {
	return (
		<>
			<HStack
				bgColor={"white"}
				borderBottom={"1px solid"}
				borderColor={"gray.200"}
				p={1}
				pos={"sticky"}
				px={4}
				top={0}
				w={"100%"}
				zIndex={1}
			>
				<Back />

				<Box mr={"auto"} />

				<Tooltip content="Menu">
					<IconButton variant={"ghost"}>
						<LayoutGrid />
					</IconButton>
				</Tooltip>

				<Tooltip content="Notifications">
					<IconButton variant={"ghost"}>
						<Bell />
					</IconButton>
				</Tooltip>

				<Tooltip content="Chatbot">
					<IconButton variant={"ghost"}>
						<Bot />
					</IconButton>
				</Tooltip>

				<Tooltip content="Cloud Shell">
					<IconButton variant={"ghost"}>
						<Terminal />
					</IconButton>
				</Tooltip>

				<Tooltip content="Search">
					<IconButton variant={"ghost"}>
						<Search />
					</IconButton>
				</Tooltip>
			</HStack>
		</>
	)
}

export default Header
