import { Stack } from "@chakra-ui/react"
import type { FunctionComponent } from "react"

interface SFTPInformationProps {}

const SFTPInformation: FunctionComponent<SFTPInformationProps> = () => {
	return (
		<>
			<Stack h={"full"} borderLeft={1} borderStyle={"solid"} borderColor={"gray.200"}>
				information
			</Stack>
		</>
	)
}

export default SFTPInformation
