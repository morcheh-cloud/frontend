import { IconButton, Stack, Tabs, Text } from "@chakra-ui/react"
import {
	BrickWallFire,
	ChartPie,
	FileCog,
	FileJson2,
	Folder,
	HardDrive,
	MonitorCog,
	Network,
	Power,
	RotateCcw,
	Shield,
	SquareTerminal,
	Trash,
	Wrench,
} from "lucide-react"
import { type FunctionComponent, lazy, type ReactNode } from "react"
import PageContainer from "@/components/base/PageContainer"
import PageHeader from "@/components/base/PageHeader"

const SFTP = lazy(() => import("@/pages/servers/[id]/SFTP"))

type TabType = "overview" | "setting" | "firewall" | "network" | "event" | "log" | "terminal" | "config" | "files"

interface ITab {
	value: TabType
	title: string
	component?: ReactNode
	icon?: ReactNode
}

const tabs: ITab[] = [
	{
		icon: <ChartPie />,
		title: "Overview",
		value: "overview",
	},
]

interface ServerDetailsProps {}

const ServerDetails: FunctionComponent<ServerDetailsProps> = () => {
	return (
		<>
			<PageContainer maxW={"none"}>
				<PageHeader title="Production Cb-1 w-2" borderColor={"gray.200"}>
					<IconButton variant={"ghost"}>
						<Trash />
					</IconButton>

					<IconButton variant={"ghost"}>
						<RotateCcw />
					</IconButton>

					<IconButton variant={"ghost"}>
						<Power />
					</IconButton>
				</PageHeader>

				<Stack mt={2} h="100%">
					<Tabs.Root
						gap={2}
						display={"flex"}
						flexDir={"column"}
						h={"100%"}
						defaultValue={"overview"}
						variant={"subtle"}
					>
						<Tabs.List rounded={"sm"}>
							{tabs.map((item) => {
								return (
									<Tabs.Trigger key={item.value} value={item.value}>
										{item.icon}
										{item.title}
									</Tabs.Trigger>
								)
							})}

							<Tabs.Trigger value="setting">
								<MonitorCog />
								Setting
							</Tabs.Trigger>

							<Tabs.Trigger value="firewall">
								<BrickWallFire />
								Firewall
							</Tabs.Trigger>

							<Tabs.Trigger value="network">
								<Network />
								Network
							</Tabs.Trigger>

							<Tabs.Trigger value="events">
								<FileJson2 />
								events
							</Tabs.Trigger>

							<Tabs.Trigger value="terminal">
								<SquareTerminal />
								Terminal
							</Tabs.Trigger>

							<Tabs.Trigger value="Config">
								<FileCog />
								Config
							</Tabs.Trigger>

							<Tabs.Trigger value="sftp">
								<Folder />
								SFTP
							</Tabs.Trigger>

							<Tabs.Trigger value="tools">
								<Wrench />
								Tools
							</Tabs.Trigger>

							<Tabs.Trigger value="disk">
								<HardDrive />
								Disk
							</Tabs.Trigger>

							<Tabs.Trigger value="security">
								<Shield />
								Disk
							</Tabs.Trigger>
						</Tabs.List>

						<Stack h={"full"} border={"1px solid"} borderColor={"gray.200"} rounded={"sm"}>
							<Tabs.Content h={"full"} value="overview">
								<Text>ali</Text>
							</Tabs.Content>

							<Tabs.Content p={0} h={"full"} value="sftp">
								<SFTP />
							</Tabs.Content>
						</Stack>
					</Tabs.Root>
				</Stack>
			</PageContainer>
		</>
	)
}

export default ServerDetails
