import { Box } from "@chakra-ui/react"
import type { FunctionComponent } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import JobInfo from "@/pages/ansible/job/JobInfo"
import ShellPreview from "@/pages/ansible/job/ShellPreview"

interface AnsibleJobPageProps {}

const AnsibleJobPage: FunctionComponent<AnsibleJobPageProps> = () => {
	const editorWidth = 75

	return (
		<>
			<Box h={"100%"}>
				<PanelGroup direction="horizontal">
					<Panel
						style={{ backgroundColor: "red" }}
						defaultSize={90}
						minSize={10}
					>
						<ShellPreview />
					</Panel>

					<PanelResizeHandle />

					<Panel defaultSize={100 - editorWidth} minSize={100 - editorWidth}>
						<JobInfo />
					</Panel>
				</PanelGroup>
			</Box>
		</>
	)
}

export default AnsibleJobPage
