import {
	Heading,
	HStack,
	IconButton,
	SimpleGrid,
	Stack,
} from "@chakra-ui/react"
import { Settings } from "lucide-react"
import type { FunctionComponent } from "react"
import { LuPlus } from "react-icons/lu"
import { NavLink } from "react-router"
import Caption from "@/components/base/Caption"
import PageContainer from "@/components/base/PageContainer"
import PlayBookCard from "@/pages/ansible/components/PlayBookCard"
import PlaybookFolder from "@/pages/ansible/components/PlaybookFolder"

interface AnsiblePageProps {}

const AnsiblePage: FunctionComponent<AnsiblePageProps> = () => {
	return (
		<>
			<PageContainer>
				<HStack>
					<Stack mr="auto">
						<Heading size={"3xl"}>PlayBooks</Heading>
						<Caption>
							Distribute traffic across servers to reduce server strain and
							latency and improve end user experience.
						</Caption>
					</Stack>

					<NavLink to={"/ansible/123"}>
						<IconButton variant="ghost">
							<LuPlus />
						</IconButton>
					</NavLink>

					<IconButton variant={"ghost"}>
						<Settings />
					</IconButton>
				</HStack>

				{/* folders */}
				<SimpleGrid autoColumns={4} columns={4} gap={5} mt={8}>
					{new Array(6).fill(0).map((_, i) => {
						return <PlaybookFolder key={i} />
					})}
				</SimpleGrid>

				{/* playbooks */}
				<SimpleGrid autoColumns={4} columns={4} gap={5} mt={8}>
					{new Array(5).fill(0).map((_, i) => {
						return <PlayBookCard key={i.toString()} />
					})}
				</SimpleGrid>
			</PageContainer>
		</>
	)
}

export default AnsiblePage
