import { CloseButton, Stack, Tabs } from "@chakra-ui/react"
import Editor from "@monaco-editor/react"
import type { FunctionComponent } from "react"

interface SFTPContentProps {}

const text = `
PRETTY_NAME="Ubuntu 24.04.3 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"
VERSION="24.04.3 LTS (Noble Numbat)"
VERSION_CODENAME=noble
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
UBUNTU_CODENAME=noble
LOGO=ubuntu-logo

`

const SFTPContent: FunctionComponent<SFTPContentProps> = () => {
	return (
		<>
			<Stack h={"full"}>
				<Tabs.Root variant={"outline"} borderTop={0}>
					<Tabs.List>
						<Tabs.Trigger borderTop={"0px !important"} rounded={"none"} value="ali">
							os-release
							<CloseButton size={"2xs"} />
						</Tabs.Trigger>

						<Tabs.Trigger borderTop={"0px !important"} rounded={"none"} value="2564">
							hostname.yml
							<CloseButton size={"2xs"} />
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>

				<Stack h={"full"}>
					<Editor
						// defaultLanguage="yaml"
						value={text}
						height="99%"
						options={{ automaticLayout: true, minimap: { enabled: false } }}
						theme="github-light"
					/>
				</Stack>
			</Stack>
		</>
	)
}

export default SFTPContent
