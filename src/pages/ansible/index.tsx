import {
	Heading,
	HStack,
	IconButton,
	SimpleGrid,
	Stack,
} from "@chakra-ui/react";
import { Settings } from "lucide-react";
import type { FunctionComponent } from "react";
import { LuPlus } from "react-icons/lu";
import Caption from "@/components/base/Caption";
import PageContainer from "@/components/base/PageContainer";
import PlayBookCard from "@/pages/ansible/PlayBookCard";

interface AnsiblePageProps {}

const AnsiblePage: FunctionComponent<AnsiblePageProps> = () => {
	return (
		<>
			<PageContainer>
				<HStack>
					<Stack mr="auto">
						<Heading size={"3xl"}>Play Books</Heading>
						<Caption>
							Distribute traffic across servers to reduce server strain and
							latency and improve end user experience.
						</Caption>
					</Stack>

					<IconButton variant="ghost">
						<LuPlus />
					</IconButton>

					<IconButton variant={"ghost"}>
						<Settings />
					</IconButton>
				</HStack>

				<SimpleGrid columns={4} gap={5} mt={8}>
					{new Array(10).fill(0).map((_, i) => {
						return <PlayBookCard key={i.toString()} />;
					})}
				</SimpleGrid>
			</PageContainer>
		</>
	);
};

export default AnsiblePage;
