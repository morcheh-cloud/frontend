import {
	Badge,
	Box,
	Button,
	Group,
	Heading,
	HStack,
	Icon,
	Image,
	Stack,
	Text,
} from "@chakra-ui/react"
import { Clock, Play, ShieldCheck } from "lucide-react"
import type { FunctionComponent } from "react"
import Caption from "@/components/base/Caption"

interface PlayBookCardProps {}

const PlayBookCard: FunctionComponent<PlayBookCardProps> = () => {
	return (
		<>
			<Stack
				_hover={{
					borderColor: "black",
				}}
				border={"1px solid"}
				borderColor={"gray.200"}
				borderRadius={8}
				gap={4}
				p={4}
			>
				<HStack gap={1}>
					<Image
						fit={"cover"}
						h={50}
						rounded={"full"}
						src="https://www.svgrepo.com/show/452192/docker.svg"
					/>

					<Stack gap={1}>
						<Heading size={"md"}>Install Docker</Heading>
						<HStack fontSize={11} gap={1} opacity={0.5}>
							<Icon size={"sm"}>
								<Clock />
							</Icon>
							<Text>last update: 20m ago</Text>
						</HStack>
					</Stack>

					<Badge colorPalette={"teal"} ml="auto">
						web
					</Badge>
				</HStack>

				<Box>
					<Caption fontSize={12} lineClamp={2}>
						Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quod
						necessitatibus dolores fugiat non corporis amet quibusdam laudantium
						suscipit? Nobis unde cupiditate earum incidunt ut ab facilis
						repudiandae. Sed, culpa inventore.
					</Caption>
				</Box>

				<Group mt={2}>
					<Button size={"xs"}>
						<Play /> Run
					</Button>

					<Button size={"xs"} variant={"outline"}>
						<ShieldCheck /> Dry Run
					</Button>
				</Group>
			</Stack>
		</>
	)
}

export default PlayBookCard
