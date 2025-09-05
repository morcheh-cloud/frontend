import {
	Box,
	Heading,
	HStack,
	IconButton,
	ScrollArea,
	Separator,
	Stack,
} from "@chakra-ui/react"
import {
	FileText,
	Flag,
	Play,
	RotateCcw,
	Square,
	Timer,
	User,
} from "lucide-react"
import type { FunctionComponent } from "react"
import InfoCard from "@/components/base/InfoCard"
import { Tooltip } from "@/components/snippet/tooltip"

interface JobInfoProps {}

const JobInfo: FunctionComponent<JobInfoProps> = () => {
	return (
		<>
			<Stack h={"100%"} p={4} gap={4}>
				<HStack>
					<Heading mr={"auto"} size={"lg"}>
						Job Details
					</Heading>

					<Tooltip content="start">
						<IconButton size={"xs"} variant={"ghost"}>
							<Play />
						</IconButton>
					</Tooltip>

					<Tooltip content="relaunch">
						<IconButton size={"xs"} variant={"ghost"}>
							<RotateCcw />
						</IconButton>
					</Tooltip>

					<Tooltip content="stop">
						<IconButton color={"red"} size={"xs"} variant={"ghost"}>
							<Square />
						</IconButton>
					</Tooltip>
				</HStack>

				<InfoCard
					title="install-docker.yml"
					caption="Playbook"
					icon={<FileText />}
				/>

				<InfoCard
					title="2025-09-05 13:09:05"
					caption="Started at"
					icon={<Play />}
				/>

				<InfoCard
					title="2025-09-05 13:09:05"
					caption="Stopped at"
					icon={<Square />}
				/>

				<InfoCard title="Ali Marefati" caption="Executed by" icon={<User />} />
				<InfoCard title="45 seconds" caption="Duration" icon={<Timer />} />
				<InfoCard title="Success" caption="status" icon={<Flag />} />

				<Separator />

				<Heading size={"md"}>Inventories</Heading>

				<Box className="scroll-container" h={"100%"}>
					<ScrollArea.Root height={325}>
						<ScrollArea.Viewport>
							<ScrollArea.Content>
								{new Array(50).fill(0).map((_, index) => (
									<InfoCard
										key={index}
										title={`inventory-${index + 1}`}
										caption="Inventory"
										icon={<Flag />}
									/>
								))}
							</ScrollArea.Content>
						</ScrollArea.Viewport>

						<ScrollArea.Scrollbar>
							<ScrollArea.Thumb />
						</ScrollArea.Scrollbar>

						<ScrollArea.Corner />
					</ScrollArea.Root>
				</Box>
			</Stack>
		</>
	)
}

export default JobInfo
