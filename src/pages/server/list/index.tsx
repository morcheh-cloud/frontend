import { IconButton, SimpleGrid, Stack } from "@chakra-ui/react"
import { Grid2X2, ListTree, Plus } from "lucide-react"
import type { FunctionComponent } from "react"
import PageContainer from "@/components/base/PageContainer"
import PageHeader from "@/components/base/PageHeader"
import Folder from "@/components/Folder"
import ServerCard from "@/pages/server/list/ServerCard"

interface ServerListPageProps {}

const ServerListPage: FunctionComponent<ServerListPageProps> = () => {
	return (
		<>
			<PageContainer>
				<PageHeader title="Servers" description="Manage your servers">
					<IconButton variant={"ghost"}>
						<Grid2X2 />
					</IconButton>

					<IconButton variant={"ghost"}>
						<ListTree />
					</IconButton>

					<IconButton variant={"ghost"}>
						<Plus />
					</IconButton>
				</PageHeader>

				<Stack h={"100%"} mt={8}>
					{/* folders */}
					<SimpleGrid autoColumns={4} columns={4} gap={4}>
						{new Array(6).fill(0).map((_, i) => {
							return <Folder key={i} />
						})}
					</SimpleGrid>

					<SimpleGrid minChildWidth={"xs"} columns={4} gap={4} mt={4}>
						{new Array(6).fill(0).map((_, i) => {
							return <ServerCard key={i} />
						})}
					</SimpleGrid>
				</Stack>
			</PageContainer>
		</>
	)
}

export default ServerListPage
