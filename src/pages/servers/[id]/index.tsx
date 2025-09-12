import { Box, IconButton, Tabs } from "@chakra-ui/react"
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
import type { FunctionComponent } from "react"
import PageContainer from "@/components/base/PageContainer"
import PageHeader from "@/components/base/PageHeader"

type TabType =
	| "overview"
	| "setting"
	| "firewall"
	| "network"
	| "event"
	| "log"
	| "terminal"
	| "config"
	| "files"

interface ServerDetailsProps {}

const ServerDetails: FunctionComponent<ServerDetailsProps> = () => {
	return (
		<>
			<PageContainer>
				<PageHeader
					title="Production Cb-1 w-2"
					borderBottom={1}
					borderStyle={"solid"}
					borderColor={"gray.200"}
				>
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

				<Box mt={8} h="100%">
					<Tabs.Root h={"100%"} defaultValue={"overview"} variant={"outline"}>
						{/*  */}
						<Tabs.List>
							<Tabs.Trigger value="overview">
								<ChartPie />
								overview
							</Tabs.Trigger>

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

							<Tabs.Trigger value="sftb">
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

						<Box
							borderLeft={1}
							borderStyle={"solid"}
							borderColor={"gray.200"}
							h={"100%"}
							px={4}
						>
							<Tabs.Content value="setting">ali</Tabs.Content>
						</Box>
					</Tabs.Root>
				</Box>
			</PageContainer>
		</>
	)
}

export default ServerDetails
