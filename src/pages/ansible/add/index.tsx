import {
	Box,
	Button,
	Field,
	GridItem,
	Input,
	SimpleGrid,
	Stack,
	Tabs,
	Textarea,
} from "@chakra-ui/react"
import { type FunctionComponent, useState } from "react"
import { LuCode, LuFolder, LuGitPullRequestArrow, LuSave } from "react-icons/lu"
import PageContainer from "@/components/base/PageContainer"
import PageHeader from "@/components/base/PageHeader"
import PlaybookEditor from "@/pages/ansible/add/PlaybookEditor"

type Tab = "file" | "editor" | "git"

interface AddPlaybookProps {}

const AddPlaybook: FunctionComponent<AddPlaybookProps> = () => {
	const [tab, setTab] = useState<Tab>("editor")

	return (
		<>
			<PageContainer>
				<PageHeader title="Add new playbook">
					<Button size={"sm"}>
						<LuSave />
						Save
					</Button>
				</PageHeader>

				<Tabs.Root
					defaultValue="editor"
					mt={6}
					onValueChange={({ value }) => setTab(value as Tab)}
					value={tab}
					variant={"outline"}
				>
					<Tabs.List>
						<Tabs.Trigger value="editor">
							<LuCode />
							Editor
						</Tabs.Trigger>

						<Tabs.Trigger value="file">
							<LuFolder />
							Upload
						</Tabs.Trigger>

						<Tabs.Trigger value="git">
							<LuGitPullRequestArrow />
							Git
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>

				<SimpleGrid
					borderLeft={"1px solid #e4e4e4"}
					columns={12}
					gap={0}
					h={"100%"}
					py={4}
				>
					<GridItem colSpan={8}>
						{tab === "editor" && (
							<>
								<Box
									bg={"gray.100"}
									h={"70dvh"}
									overflow={"hidden"}
									// rounded={"lg"}
								>
									<PlaybookEditor />
								</Box>
							</>
						)}
					</GridItem>

					<GridItem colSpan={4}>
						<Stack gap={6} p={4} w={"100%"}>
							{/*  */}
							<Field.Root required>
								<Field.Label>
									Name <Field.RequiredIndicator />
								</Field.Label>
								<Input placeholder="Enter PlayBook Name" />
							</Field.Root>

							{/*  */}
							<Field.Root required>
								<Field.Label>
									Description <Field.RequiredIndicator />
								</Field.Label>
								<Textarea
									autoresize
									placeholder="short description for this playbook"
								/>
							</Field.Root>

							{/*  */}
						</Stack>
					</GridItem>
				</SimpleGrid>
			</PageContainer>
		</>
	)
}

export default AddPlaybook
