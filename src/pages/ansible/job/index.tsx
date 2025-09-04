import { Box } from "@chakra-ui/react"
import type { FunctionComponent } from "react"
import ShellPreview from "@/pages/ansible/job/ShellPreview"

interface AnsibleJobPageProps {}

const AnsibleJobPage: FunctionComponent<AnsibleJobPageProps> = () => {
	return (
		<>
			<Box h={"100%"}>
				<ShellPreview />
			</Box>
		</>
	)
}

export default AnsibleJobPage
